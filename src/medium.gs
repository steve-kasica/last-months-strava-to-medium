//
// medium.gs
// ----------------------------------------------------------------------------------------------------------
// Use apps-script-oauth2 to connect to the Medium API
//
var medium = {};

/**
 * Configures the service
 */
medium.getService = function() {
  // Create a new service with the given name. The name will be used when
  // persisting the authorized token, so ensure it is unique within the
  // scope of the property store.

  var baseUrl = 'https://medium.com/m/oauth/authorize';
  var tokenUrl = 'https://api.medium.com/v1/tokens';
  var scriptId = '1uc6LvQ3BazVQqlakgS3e7vjyzf9VzIfeEVrewfxVxZ-YK4_rE9yhNSTw';
  var redirectUrl = Utilities.formatString('https://script.google.com/macros/d/%s/usercallback', scriptId);
  var stateToken = ScriptApp.newStateToken().withTimeout(60).withMethod('mediumAuthCallback').createToken();

  return OAuth2.OAuth2.createService('medium')
      .setAuthorizationBaseUrl(baseUrl)
      .setTokenUrl(tokenUrl)

      // Client id and client secret obtained from Strava
      .setClientId(MEDIUM_CLIENT_ID)
      .setClientSecret(MEDIUM_CLIENT_SECRET)

      // Set the name of the callback function in the script referenced
      // above that should be invoked to complete the OAuth flow.
      .setCallbackFunction('mediumAuthCallback')

      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties())

      // Set the scopes to request, separate with comma
      .setScope('basicProfile,publishPost')

      .setParam('state', stateToken)

      // The parameteris required and "must be code"
      .setParam('response_type', 'code');
};

/**
 * Authorizes and makes a request to the Strava API
 *
 */
medium.fetch = function(url, params) {
  var params = params || { headers: {} };
  var service = medium.getService();
  params.headers['Authorization'] = 'Bearer ' + service.getAccessToken();
  if (service.hasAccess()) {
    return UrlFetchApp.fetch(url, params);
  } else {
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s', authorizationUrl);
  }
};

medium.setUserId = function() {
  var url = 'https://api.medium.com/v1/me';
  var res = medium.fetch(url);
  var data = JSON.parse(res.getContentText()).data;
  PropertiesService.getScriptProperties().setProperty('MEDIUM_USER_ID', data.id);
};

medium.createPost = function(id, payload) {
  var url = Utilities.formatString('https://api.medium.com/v1/users/%s/posts', id);
  var res = this.fetch(url, {
    'contentType': 'application/json',
    'headers': {
      'Accept': 'application/json',
      'Accept-Charset': 'utf-8',
    },
    'method': 'post',
    'payload': JSON.stringify(payload),
  });
  return JSON.parse(res);
}

/**
 * Handles the OAuth callback.
 */
function mediumAuthCallback(request) {
  var service = medium.getService();
  var isAuthorized = service.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied. You can close this tab');
  }
};

function clearMediumService(){
  OAuth2.createService('medium')
      .setPropertyStore(PropertiesService.getUserProperties())
      .reset();
}
