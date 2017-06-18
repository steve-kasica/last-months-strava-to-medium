
// A Date instance wrapper for GAS Utilities.formatDate
Date.prototype.stringify = function(format, timezone) {
  timezone = timezone || 'GMT';
  return Utilities.formatDate(this, timezone, format);
};

// Returns a new date instance that is the first of the previous month
Date.prototype.getLastMonth = function() {
  var x = new Date(this.toISOString());
  x.setDate(1);
  x.setHours(0);
  x.setMinutes(0);
  x.setSeconds(0);
  x.setMonth(x.getMonth() - 1);
  return x;
};

// Format the Strava post description so anything below three hypens
// is not intended for Medium, e.g. workout notes, splits, etc.
function parseDescription(str) {
  var endOfDesc = str.indexOf('---');
  return (endOfDesc === -1) ? str : str.substring(0,endOfDesc).trim();
}

// Turn Strava dates, which are close to ISO 8601,
// into a JavaScript Date instance
// TODO Does GAS JavaScript not accept ISO 8601 in Date constructor!!???!
function parseStravaDatetime(dateStr) {
  var year = dateStr.substr(0,4);
  var month = parseInt(dateStr.substr(5,2), 10) - 1;
  var day = dateStr.substr(8,2);
  var hour = dateStr.substr(11,2);
  var minute = dateStr.substr(14,2);
  var date = new Date(year, month, day, hour, minute);
  return date;
}

// Get human readable location from lat-long coordinates via Google Maps
function getPlace(latitude, longitude) {
  var neighborhood, locality, state, country, output = '';

  Maps.newGeocoder()
      .reverseGeocode(latitude, longitude)
      .results[0].address_components.forEach(function(comp) {
        if (comp.types.indexOf('neighborhood') > -1)
          neighborhood = comp.long_name;
        else if (comp.types.indexOf('administrative_area_level_1') > -1)
          state = comp.long_name;
        else if (comp.types.indexOf('country') > -1)
          country = comp.long_name;
        else if (comp.types.indexOf('locality') > -1)
          locality = comp.long_name;
      });

  // use locality unless neighborhood exists.
  output += (neighborhood) ? neighborhood : locality;
  // add state
  output += ', ' + state;
  // add country if abroad
  output += (country != 'United States') ? ', ' + country : '';

  return output;
} // getPlace

// Get array of img urls from Strava API
// TODO: test for Instagram and more than 1 photo?
// Strava API docs are not clear.
function getImages(photos, count) {
  var output = [];

  if (count) {
    output.push(photos.primary.urls['600']);
  }

  return output;
}
