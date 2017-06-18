//
// Code.gs
// -----------------------------------------------------------------------------------
//

// Script settings
var DEBUG = false;
var PERCENTILE = 0.70;  // 0 < PERCENTILE < 1
var DEBOUNCE = 1000 * 60 * 60;  // milliseconds / 1 hour
var ACTIVITY_TYPE = 'Run';
var STRAVA_URL = 'https://www.strava.com/athletes/458890';  // A link back to user's profile

// Medium API
var MEDIUM_ID = PropertiesService.getScriptProperties().getProperty('MEDIUM_USER_ID');
var MEDIUM_CLIENT_ID = PropertiesService.getScriptProperties().getProperty('MEDIUM_CLIENT_ID');
var MEDIUM_CLIENT_SECRET = PropertiesService.getScriptProperties().getProperty('MEDIUM_CLIENT_SECRET');
var POST_STATUS = 'draft';
var POST_TAGS = ['running', 'running log'];

// Email notifications
var MY_EMAIL = PropertiesService.getScriptProperties().getProperty('MY_EMAIL');

// Strava API
var ATHLETE_ID = PropertiesService.getScriptProperties().getProperty('STRAVA_ATHLETE_ID');
var STRAVA_CLIENT_ID = PropertiesService.getScriptProperties().getProperty('STRAVA_CLIENT_ID');
var STRAVA_CLIENT_SECRET = PropertiesService.getScriptProperties().getProperty('STRAVA_CLIENT_SECRET');

// The magic, as they say. This is the function to run with a trigger.

function lastMonthsStravaToMedium() {

  // Debounce function which is set to run once per month
  // Trigger runs on the frist of the month from midnight to one AM
  var lastRunStr = PropertiesService.getScriptProperties().getProperty('LAST_RUN_DATETIME');
  var lastRun = new Date(lastRunStr);
  var now = new Date();

  if (!DEBUG && now - lastRun <= DEBOUNCE) {
     return;
  }

  var lastMonth = now.getLastMonth();
  var url = Utilities.formatString('https://www.strava.com/api/v3/activities?after%s', lastMonth.getTime());
  var res = strava.fetch(url);

  if (res.getResponseCode() !== 200) {
    var errMsg = "Response from Strava was " + res.getResponseCode();
    throw new Error(errMsg);
  }

  var activities = JSON.parse(res.getContentText())
    .filter(function(activity) {
      // Only use runs that aren't commutes (it happens)
      return (activity.type == ACTIVITY_TYPE && !activity.commute);
    })
    .sort(function(a, b) {
      // Sort by kudos in descending order
      var output = 0;
      if (a.kudos_count < b.kudos_count) {
        output = 1;
      } else if (a.kudos_count > b.kudos_count) {
        output = -1;
      }
      return output;
    })
    .filter(function(el, i, arr) {
      // Only keep the top 25% of activities
      return (i <= (arr.length - 1) * (1 - PERCENTILE));
    })
    .map(function(activity) {
      // Whitelist and manipulate activity data, with description
      var data = strava.getActivityById(activity.id);
      var date = parseStravaDatetime(data.start_date_local);
      var timezone = data.timezone.substr(12);
      return {
        'description': parseDescription(data.description),
        'date': date.stringify('EEEEEE, MMM d', timezone),
        'time': date.stringify('hh:mm aa', timezone),
        'title': data.name,
        'images': getImages(data.photos, data.total_photo_count),
        'place': getPlace(data.start_latlng[0], data.start_latlng[1]),
      };
    });

  if (!activities.length) {
    // User didn't run at all last month? TODO is this an error?
    return;
  }

  var title = Utilities.formatString('The Top %d Posts From the Running Log, %s', activities.length, lastMonth.stringify('MMMM YYYY'));

  var postRes = medium.createPost(MEDIUM_ID, {
    title: title,
    contentFormat: 'html',
    content: (function(a, t) {
      var template = HtmlService.createTemplateFromFile('post');
      template.activities = a;
      template.title = t;
      template.stravaUrl = STRAVA_URL;
      template.themes = a.map(function(act){
        return act.title.toLowerCase()
      }).filter(function(act, i) {
        return ( i % 2);
      });
      var output = template.evaluate().getContent();
      return output;
    })(activities, title),
    tags: POST_TAGS,
    publishStatus: POST_STATUS,
  });

  // TODO, if the Medium post failed, then throw new error.

  var mailRes = MailApp.sendEmail(
    MY_EMAIL,
    Utilities.formatString('New %s post : %s', POST_STATUS, title),
    Utilities.formatString('A new Medium post from last month\'s Strava log was created at %s', postRes.data.url)
  );

  // Reset debounce value so this function doesn't run for an entire hour.
  var newLastRun = now.toISOString();
  var reset = PropertiesService.getScriptProperties().setProperty('LAST_RUN_DATETIME', newLastRun);

  return;
}
