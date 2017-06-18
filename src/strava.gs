//
// strava.gs
// ----------------------------------------------------------------------------------------------------------
// Use apps-script-oauth2 to connect to the Strava API
//
var strava = {};

var STRAVA_ATHLETE_ID = PropertiesService.getScriptProperties().getProperty('STRAVA_ATHLETE_ID');
var STRAVA_CLIENT_ID = PropertiesService.getScriptProperties().getProperty('STRAVA_CLIENT_ID');
var STRAVA_CLIENT_SECRET = PropertiesService.getScriptProperties().getProperty('STRAVA_CLIENT_SECRET');

/**
 * Configures the service
 */
strava.getService = function() {
  // Create a new service with the given name. The name will be used when
  // persisting the authorized token, so ensure it is unique within the
  // scope of the property store.

  var baseUrl = 'https://www.strava.com/oauth/authorize';
  var tokenUrl = 'https://www.strava.com/oauth/token';
  var scriptId = '1uc6LvQ3BazVQqlakgS3e7vjyzf9VzIfeEVrewfxVxZ-YK4_rE9yhNSTw';
  var redirectUrl = Utilities.formatString('https://script.google.com/macros/d/%s/usercallback', scriptId);

  return OAuth2.OAuth2.createService('strava')
      .setAuthorizationBaseUrl(baseUrl)
      .setTokenUrl(tokenUrl)

      // Client id and client secret obtained from Strava
      .setClientId(STRAVA_CLIENT_ID)
      .setClientSecret(STRAVA_CLIENT_SECRET)

      // Set the name of the callback function in the script referenced
      // above that should be invoked to complete the OAuth flow.
      .setCallbackFunction('strava.authCallback')

      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties())

      // Set the scopes to request, separate with comma
      // options are (public, write, view_private)
      .setScope('public')

      .setParam('redirect_url', redirectUrl)

      // The parameteris required and "must be code"
      .setParam('response_type', 'code');
};

/**
 * Handles the OAuth callback.
 */
strava.authCallback = function(request) {
  var service = this.getService();
  var isAuthorized = service.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied. You can close this tab');
  }
};

/**
 * Authorizes and makes a request to the Strava API
 *
 */
strava.fetch = function(url) {
  var service = this.getService();
  if (service.hasAccess()) {
    return UrlFetchApp.fetch(url, {
      headers: {
        Authorization: ': Bearer ' + service.getAccessToken()
      }
    });
  } else {
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s', authorizationUrl);
  }
};

strava.getActivityById = function(id) {
  var url = Utilities.formatString('https://www.strava.com/api/v3/activities/%s', id);
  var res = strava.fetch(url);
  var data = JSON.parse(res.getContentText());
  return data;
};
