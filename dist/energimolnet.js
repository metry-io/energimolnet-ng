(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Authentication
// --------------
// Setting the private token will override all other tokens

var makeUrl = require('./util/makeurl');

var PATH_TOKEN =          'oauth/token';
var PATH_AUTHORIZE =        'oauth/authorize';

var KEY_PRIVATE_TOKEN =   'emPrivateToken';
var KEY_REFRESH_TOKEN =   'emRefreshToken';
var KEY_ACCESS_TOKEN =    'emAccessToken';
var KEY_SUBACCOUNT =      'emSubaccount';

module.exports = function($window, $http, $q, authConfig, BASE_URL) {
  var requestQueue = [];
  var fetchingAccessToken = false;

  function getPrivateToken() { return getToken(KEY_PRIVATE_TOKEN); }
  function getRefreshToken() { return getToken(KEY_REFRESH_TOKEN); }
  function getAccessToken() { return getToken(KEY_ACCESS_TOKEN); }
  function getSubaccount() { return getToken(KEY_SUBACCOUNT); }

  function setPrivateToken(token) { setToken(token, KEY_PRIVATE_TOKEN); }
  function setSubaccount(account) { setToken(account, KEY_SUBACCOUNT); }

  function setRefreshToken(token) {
    setToken(token, KEY_REFRESH_TOKEN);
    setAccessToken(null);
  }

  function setAccessToken(token) {
    if (token !== null) {
      token.expires_at = Date.now() + token.expires_in * 1000;
    }

    setToken(token, KEY_ACCESS_TOKEN);
  }

  function getToken(key) {
    var value = $window.localStorage.getItem(key);

    if (value && (value.charAt(0) == '{' || value.charAt(0) == '[')) {
      return JSON.parse(value);
    }

    return value;
  }

  function setToken(token, key) {
    if (token) {
      var type = typeof token;

      if (type !== 'string' && type !== 'number') {
        token = JSON.stringify(token);
      }

      $window.localStorage.setItem(key, token);
    } else {
      $window.localStorage.removeItem(key);
    }
  }

  function isAuthenticated() {
    return (getPrivateToken() !== null || getRefreshToken() !== null);
  }

  function authorize(config) {
    return $q(function(resolve, reject) {
      var token = getPrivateToken();
      var subaccount = getSubaccount();

      // Add subaccount
      if (subaccount && !config.preventSubaccount) {
        config.headers = config.headers || {};
        config.headers['X-Subaccount'] = subaccount;
      }

      // Check for private api token
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = 'OAuth ' + token;
        resolve(config);
        return;
      }

      // Check if OAuth is disabled in config. In that case, browser needs to
      // manage the authentication using session cookies
      if (authConfig.disabled) {
        resolve(config);
        return;
      }

      // Check for OAuth refresh token
      var refreshToken = getRefreshToken();

      if (!refreshToken) {
        reject();
        return;
      }

      ensureAccessToken(refreshToken).then(function(accessToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = 'Bearer ' + accessToken.access_token;
        resolve(config);
      }, function() {
        reject();
      });
    });
  }

  function ensureAccessToken(refreshToken) {
    return $q(function(resolve, reject) {
      var accessToken = getAccessToken();

      if (isValidToken(accessToken)) {
        // User has a valid access token already, resolve with it
        resolve(accessToken);
      } else {
        // User has no valid token
        requestQueue.push(function(newAccessToken) {
          if (newAccessToken) {
            resolve(newAccessToken);
          } else {
            reject();
          }
        });

        // Only fetch token if we're not already fetching it
        if (!fetchingAccessToken) {
          fetchingAccessToken = true;

          fetchAccessToken(refreshToken).then(function(res) {
            var newToken = res.data;

            setAccessToken(newToken);
            fetchingAccessToken = false;

            // Process any pending requests
            requestQueue.forEach(function(queueFunc) {
              queueFunc(getAccessToken());
            });

            // Clear queue
            requestQueue = [];
          }, function(err) {
            setAccessToken(null);
            fetchingAccessToken = false;

            // Process any pending requests
            requestQueue.forEach(function(queueFunc) {
              queueFunc(null);
            });

            // Clear queue
            requestQueue = [];
          });
        }
      }
    });
  }

  function isValidToken(token) {
    return (token && token.expires_at > Date.now());
  }

  function fetchAccessToken(refreshToken) {
    return $http.post(makeUrl([BASE_URL, PATH_TOKEN]), {
      client_id: authConfig.clientId,
      client_secret: authConfig.clientSecret,
      grant_type: 'refresh_token',
      scope: authConfig.scope || 'basic',
      refresh_token: refreshToken
    });
  }

  function authorizeUrl() {
    var params = {
      client_secret: authConfig.clientSecret,
      client_id: authConfig.clientId,
      redirect_uri: authConfig.redirectUri,
      grant_type: 'authorization_code',
      response_type: 'code',
      state: 'emAuth',
      scope: authConfig.scope || 'basic'
    };

    return makeUrl([BASE_URL, PATH_AUTHORIZE], params);
  }

  function handleAuthCode(code) {
    return $http.post(makeUrl([BASE_URL, PATH_TOKEN]), {
      grant_type: 'authorization_code',
      code: code,
      client_id: authConfig.clientId,
      client_secret: authConfig.clientSecret,
      state: 'emAuth',
      scope: authConfig.scope || 'basic',
      redirect_uri: authConfig.redirectUri
    }).then(function(res) {
      var token = res.data;

      setRefreshToken(token.refresh_token);
      setAccessToken(token);
    });
  }

  return {
    getPrivateToken: getPrivateToken,
    setPrivateToken: setPrivateToken,
    getRefreshToken: getRefreshToken,
    setRefreshToken: setRefreshToken,
    getSubaccount: getSubaccount,
    setSubaccount: setSubaccount,
    isAuthenticated: isAuthenticated,
    authorizeUrl: authorizeUrl,
    handleAuthCode: handleAuthCode,
    authorize: authorize
  };
};

},{"./util/makeurl":41}],2:[function(require,module,exports){
/**
  DateUtil
  --------

  This module provides helper function to create request periods from
  Javascript date objects.

  Typically, you use the getPeriod(dates, granularity) function, which in
  its turn calls an appropriate function, depending on the granularity.

  The dates parameter can be either a single date, which returns a single
  period (e.g. YYYYMMDD), or an array with two Dates (range), which returns
  a period range, (e.g. YYYYMM-YYYYMM)

  To parse a period into a date, use the getDate(period) function. This will
  return a Date with the provided period. Periods without months or days will
  have the missing value set to 1, i.e. getDate("2004") will return a the Date
  2014-01-01.
**/

module.exports = {
  getDate: getDate,
  getHourPeriod: getHourPeriod,
  getDayPeriod: getDayPeriod,
  getMonthPeriod: getMonthPeriod,
  getPeriod: getPeriod,
  getYearPeriod: getYearPeriod,
  daysInMonth: daysInMonth,
  parseISO: parseISO,
};

function _zeroPaddedString(number) {
  if (number === null || number === undefined) { return ''; }

  return (number < 10 ? '0' : '') + number;
}

function _periodFormat(year, month, day, hour) {
  if (month !== null && month !== undefined) { month ++; }

  return _zeroPaddedString(year) +
         _zeroPaddedString(month) +
         _zeroPaddedString(day) +
         _zeroPaddedString(hour);
}

function periodsFormat(dates, func) {
  if (!angular.isArray(dates)) { return func(dates); }
  return dates.map(func).join('-');
}

function getYearPeriod(dates) {
  return periodsFormat(dates, function(date) {
    return _periodFormat(date.getFullYear());
  });
}

function getMonthPeriod(dates) {
  return periodsFormat(dates, function(date) {
    return _periodFormat(date.getFullYear(), date.getMonth());
  });
}

function getDayPeriod(dates) {
  return periodsFormat(dates, function(date) {
    return _periodFormat(date.getFullYear(), date.getMonth(), date.getDate());
  });
}

function getHourPeriod(dates) {
  return periodsFormat(dates, function(date) {
    return _periodFormat(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours()
    );
  });
}
// Returns a period for the provided date range, or single date.
// Will auto-calculate period style depending on granularity, unless force is
// set to true.
// E.g. when getting day granularity for a single date, the function will assume
// you want day values for the date's month.

function getPeriod(dates, granularity, forced) {
  var isArray = angular.isArray(dates);
  var isRange = (isArray && dates.length > 1);

  if ((isArray && dates.length === 0) || dates === null || dates === undefined) {
    return null;
  }

  if (granularity === 'month') {
    return (isRange || forced) ? getMonthPeriod(dates) : getYearPeriod(dates);
  }

  if (granularity === 'day') {
    return (isRange || forced) ? getDayPeriod(dates) : getMonthPeriod(dates);
  }

  if (granularity === 'week' && !isRange) {
    // Special case. Week is no actual granularity. This returns a week period
    // starting at the specified date. No checks are made to determine if the
    // provided date actually is the first day in a week.
    var start = (isArray) ? dates[0] : dates;
    var end = new Date(start.getTime());
    end.setDate(end.getDate() + 6);

    return getDayPeriod([start, end]);
  }

  return getDayPeriod(dates);
}

function getDate(period) {
  if (typeof period === 'number') { period = period.toString(); }
  if (period === null || period === undefined || period.length < 4) { return null; }

  var components = [parseInt(period.substr(0, 4), 10)];
  var i = 0, len = period.length;

  while (4 + (i * 2) < len) {
    components[i + 1] = parseInt(period.substr(4 + (2 * i), 2));
    i++;
  }

  return new Date(components[0],                          // hour
                  components[1] ? components[1] - 1 : 0,  // month
                  components[2] || 1,                     // day
                  components[3] || 0,                     // hour
                  components[4] || 0,                     // min
                  components[5] || 0);                    // second
}

// Helper function for returning the number of days in a month
function daysInMonth(date) {
  var d = new Date(date.getTime());
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);

  return d.getDate();
}

// IE and Safari fail at parsing ISO strings without : in time zone offset.
// This is a fix for that. This fix only accounts for whole hours in offset.
function parseISO(dateString) {
  var timestamp = Date.parse(dateString);

  if (!isNaN(timestamp)) {
    return new Date(timestamp);
  }

  var date, offsetString, offset;
  var components = dateString.slice(0,-5).split(/\D/).map(function(itm){
    return parseInt(itm, 10) || 0;
  });

  components[1]-= 1;
  offsetString = dateString.slice(-5);
  offset = parseInt(offsetString, 10) / 100;

  date = new Date(Date.UTC.apply(Date, components));
  date.setHours(date.getHours() - offset);
  return date;
}

},{}],3:[function(require,module,exports){
/*
 * This attaches an em object to window that can be used for testing
 * and debugging.
 *
 * The em function is used to log the data or error returned from the
 * promise that the collection models return.
 *
 * E.g.
 *
 *   em(em.Owners.query({name: 'Öresunds'}))
 *
 */

module.exports = function (
  $window,
  emAccounts,
  emApps,
  emClients,
  emComplaintCases,
  emComplaints,
  emCalculatedMetrics,
  emConsumptionStats,
  emConsumptions,
  emEdielJobs,
  emFeeds,
  emFileJobs,
  emFtpConnections,
  emInvitations,
  emLoginTokens,
  emMe,
  emMeters,
  emMeterStats,
  emMetricModels,
  emOwners,
  emPassword,
  emReadings,
  emRefreshTokens,
  emReports,
  emRobotJobs,
  emRobotStats,
  emRobots,
  emScrapers,
  emScraperTests,
  emSubaccounts,
  emSubscribers,
  emTokens,
  emDateUtil,
  energimolnetAPI,
  emAuth
) {
    function em(func, condensed) {
        func.then(function (res) {
            if (condensed === true) {
                $window.console.log('Response:\n', res);
            } else {
                $window.console.log('Response:\n', JSON.stringify(res, null, 2));
            }
        }, function (err) {
            $window.console.log('Error:\n', err);
        });
    }

    em.Accounts = emAccounts;
    em.Apps = emApps;
    em.Clients = emClients;
    em.ComplaintCases = emComplaintCases;
    em.Complaints = emComplaints;
    em.CalculatedMetrics = emCalculatedMetrics;
    em.ConsumptionStats = emConsumptionStats;
    em.Consumptions = emConsumptions;
    em.EdielJobs = emEdielJobs;
    em.Feeds = emFeeds;
    em.FileJobs = emFileJobs;
    em.FtpConnections = emFtpConnections;
    em.Invitations = emInvitations;
    em.LoginTokens = emLoginTokens;
    em.Me = emMe;
    em.Meters = emMeters;
    em.MeterStats = emMeterStats;
    em.MetricModels = emMetricModels;
    em.Owners = emOwners;
    em.Password = emPassword;
    em.Readings = emReadings;
    em.RefreshTokens = emRefreshTokens;
    em.Reports = emReports;
    em.RobotJobs = emRobotJobs;
    em.RobotStats = emRobotStats;
    em.Robots = emRobots;
    em.Scrapers = emScrapers;
    em.ScraperTests = emScraperTests;
    em.Subaccounts = emSubaccounts;
    em.Subscribers = emSubscribers;
    em.Tokens = emTokens;
    em.DateUtil = emDateUtil;
    em.api = energimolnetAPI;
    em.auth = emAuth;

    $window.em = em;
};

},{}],4:[function(require,module,exports){
/*
 * This service performs communication with Energimolnet API.
 * It formats requests to required format and parses the
 * responses in a suitable way.
 *
 * Unless needed, use the api models to communicate with the API
 * on a higher level.
 * I.e.:
 *
 * Do:
 *
 *   Owners.query({name: 'Halmstad'})
 *
 * Dont':
 *
 *   energimolnetAPI.request({url: '/owners', params:...})
 */
var makeUrl = require('./util/makeurl');

var PATH_API_VERSION =        'api/2.0';
var EVENT_LOGIN_NEEDED =      'em:loginNeeded';

module.exports = function($http, $q, $rootScope, Auth, BASE_URL) {
  function request(config) {
    return $q(function(resolve, reject) {
      config.url = makeUrl([BASE_URL, PATH_API_VERSION, config.url]);

      Auth.authorize(config).then(function(config) {
        $http(config).then(function(res) {
          resolve(parseResponse(res));
        }, function(res) {
          if (res.status === 401) {
            // Reset private token if it existed
            if (Auth.getPrivateToken()) {
              Auth.setPrivateToken(null);
              // TODO: Retry request
              loginNeeded();
            } else {
              loginNeeded();
            }
          }

          reject(res.data ? res.data.errors : {});
        });
      }, function() {
        loginNeeded();
        reject({});
      });
    });
  }

  function loginNeeded() {
    $rootScope.$broadcast(EVENT_LOGIN_NEEDED);
  }

  function parseResponse(res) {
    if (res.data.count == null || res.data.limit == null || res.data.skip == null) {
      return res.data.data;
    } else {
      return {
        data: res.data.data,
        pagination: {
          skip: res.data.skip,
          limit: res.data.limit,
          count: res.data.count,
          page: 1 + (res.data.skip / res.data.limit),
          from: (res.data.count === 0) ? 0 : res.data.skip + 1,
          to: (res.data.skip + res.data.limit > res.data.count) ? res.data.count : res.data.skip + res.data.limit
        }
      };
    }
  }

  return {
    request: request
  };
};

},{"./util/makeurl":41}],5:[function(require,module,exports){
/*
 * This file glues all the separate components together.
 * Angular needs to be globally available.
 */

var MODULE_NAME = 'energimolnet';
var ngModule = angular.module(MODULE_NAME, []);

if (typeof module === 'object') {
    module.exports = MODULE_NAME;
}

ngModule
    .factory('emDateUtil', function () {
        return require('./date-util');
    })
    .factory('emAuth', ['$window', '$http', '$q', 'authConfig', 'apiBaseUrl', require('./auth')])
    .factory('energimolnetAPI', ['$http', '$q', '$rootScope', 'emAuth', 'apiBaseUrl', require('./energimolnet-api')])
    .factory('emResourceFactory', ['energimolnetAPI', require('./resource-factory')])

    .factory('emAccounts', ['emResourceFactory', require('./models/accounts')])
    .factory('emActivityStreams', ['emResourceFactory', require('./models/activitystream')])
    .factory('emApps', ['emResourceFactory', require('./models/apps')])
    .factory('emBillableMeters', ['emResourceFactory', require('./models/billable-meters')])
    .factory('emCalculatedMetrics', ['emResourceFactory', require('./models/calculated-metrics')])
    .factory('emClients', ['emResourceFactory', require('./models/clients')])
    .factory('emComplaintCases', ['emResourceFactory', 'energimolnetAPI', require('./models/complaint-cases')])
    .factory('emComplaints', ['emResourceFactory', require('./models/complaints')])
    .factory('emConsumptionStats', ['emResourceFactory', require('./models/consumption-stats')])
    .factory('emConsumptions', ['emResourceFactory', 'energimolnetAPI', require('./models/consumptions')])
    .factory('emEdielJobs', ['emResourceFactory', require('./models/ediel-jobs')])
    .factory('emFeeds', ['emResourceFactory', require('./models/feeds')])
    .factory('emFileJobs', ['emResourceFactory', 'energimolnetAPI', require('./models/file-jobs')])
    .factory('emFtpConnections', ['emResourceFactory', require('./models/ftp-connections')])
    .factory('emInvitations', ['emResourceFactory', require('./models/invitations')])
    .factory('emLoginTokens', ['emResourceFactory', require('./models/logintokens')])
    .factory('emMe', ['emResourceFactory', require('./models/me')])
    .factory('emMeters', ['emResourceFactory', 'energimolnetAPI', require('./models/meters')])
    .factory('emMeterActivities', ['emResourceFactory', require('./models/meter-activities')])
    .factory('emMeterStats', ['emResourceFactory', require('./models/meter-stats')])
    .factory('emMetricModels', ['emResourceFactory', require('./models/metric-models')])
    .factory('emOwners', ['emResourceFactory', require('./models/owners')])
    .factory('emPassword', ['emResourceFactory', require('./models/password')])
    .factory('emReadings', ['emResourceFactory', 'energimolnetAPI', require('./models/readings')])
    .factory('emEdielJobs', ['emResourceFactory', require('./models/ediel-jobs')])
    .factory('emRefreshTokens', ['emResourceFactory', require('./models/refreshtokens')])
    .factory('emReports', ['emResourceFactory', require('./models/reports')])
    .factory('emRobotJobs', ['emResourceFactory', require('./models/robot-jobs')])
    .factory('emRobotStats', ['emResourceFactory', require('./models/robot-stats')])
    .factory('emRobots', ['emResourceFactory', 'energimolnetAPI', require('./models/robots')])
    .factory('emScrapers', ['emResourceFactory', require('./models/scrapers')])
    .factory('emScraperTests', ['emResourceFactory', require('./models/scraper-tests.js')])
    .factory('emSubaccounts', ['emResourceFactory', require('./models/subaccounts')])
    .factory('emSubscribers', ['emResourceFactory', 'energimolnetAPI', require('./models/subscribers')])
    .factory('emTokens', ['emResourceFactory', require('./models/tokens')])

    .run(['$window', 'emAccounts', 'emApps', 'emClients', 'emComplaintCases', 'emComplaints', 'emCalculatedMetrics', 'emConsumptionStats', 'emConsumptions', 'emEdielJobs', 'emFeeds', 'emFileJobs', 'emFtpConnections', 'emInvitations', 'emLoginTokens', 'emMe', 'emMeters', 'emMeterStats', 'emMetricModels', 'emOwners', 'emPassword', 'emReadings', 'emRefreshTokens', 'emReports', 'emRobotJobs', 'emRobotStats', 'emRobots', 'emScrapers', 'emScraperTests', 'emSubaccounts', 'emSubscribers', 'emTokens', 'emDateUtil', 'energimolnetAPI', 'emAuth', require('./debug-util')]);

},{"./auth":1,"./date-util":2,"./debug-util":3,"./energimolnet-api":4,"./models/accounts":6,"./models/activitystream":7,"./models/apps":8,"./models/billable-meters":9,"./models/calculated-metrics":10,"./models/clients":11,"./models/complaint-cases":12,"./models/complaints":13,"./models/consumption-stats":14,"./models/consumptions":15,"./models/ediel-jobs":16,"./models/feeds":17,"./models/file-jobs":18,"./models/ftp-connections":19,"./models/invitations":20,"./models/logintokens":21,"./models/me":22,"./models/meter-activities":23,"./models/meter-stats":24,"./models/meters":25,"./models/metric-models":26,"./models/owners":27,"./models/password":28,"./models/readings":29,"./models/refreshtokens":30,"./models/reports":31,"./models/robot-jobs":32,"./models/robot-stats":33,"./models/robots":34,"./models/scraper-tests.js":35,"./models/scrapers":36,"./models/subaccounts":37,"./models/subscribers":38,"./models/tokens":39,"./resource-factory":40}],6:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  var Accounts = emResourceFactory({
    default: '/accounts',
    get: true,
    query: true,
    put: true,
    post: true,
    delete: true
  });

  Accounts.exists = emResourceFactory({
    default: '/accounts/exists',
    get: false,
    query: true,
    put: false,
    post: false,
    delete: false
  });

  return Accounts;
};

},{}],7:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  var ActivityStream = emResourceFactory({
    default: '/activityStream',
    get: true,
    query: true,
    put: false,
    post: false,
    delete: false
  });

  return ActivityStream;
};

},{}],8:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    forAccount: {
      default: 'apps',
      get: true,
      query: true,
      delete: true
    }
  });
};

},{}],9:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    forAccount: {
      default: 'billing_summary',
      get: true,
      put: false,
      post: false,
      query: true,
      delete: false
    }
  });
};

},{}],10:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    forMeter: {
      default: 'calculated_metrics',
      get: true,
      put: true,
      post: true,
      query: true,
      delete: true
    }
  });
};

},{}],11:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/clients',
    get: true,
    put: true,
    post: true,
    query: true,
    delete: true,
    forAccount: {
      default: 'clients',
      get: true,
      put: true,
      post: true,
      query: true,
      delete: true
    }
  });
};

},{}],12:[function(require,module,exports){
module.exports = function(emResourceFactory, energimolnetAPI) {
  var ComplaintCases = emResourceFactory({
    default: '/complaint_cases',
    get: true,
    query: true,
    post: true
  });

  ComplaintCases.close = function(id) {
    return energimolnetAPI.request({
      url: '/complaint_cases/' + id + '/close',
      method: 'PUT'
    });
  };

  return ComplaintCases;
};

},{}],13:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/complaints',
    get: true,
    query: true,
    post: true,
    delete: true
  });
};

},{}],14:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/accounts/me/consumption_stats',
    get: true,
    forAccount: {
      default: 'consumption_stats',
      get: true
    }
  });
};

},{}],15:[function(require,module,exports){
module.exports = function(emResourceFactory, energimolnetAPI) {
  var Consumptions = emResourceFactory({
    default: '/consumptions',
    forAccount: {
      default: 'consumptions',
      put: true
    }
  });

  Consumptions.get = function get(id, granularity, ranges, metrics) {
    metrics = metrics || ['energy'];
    metrics = angular.isArray(metrics) ? metrics : [metrics];
    ranges = angular.isArray(ranges) ? ranges : [ranges];

    return energimolnetAPI.request({
      method: 'GET',
      url: [this._config.default, id, granularity, ranges.join('+')].join('/'),
      params: {
        metrics: metrics.join(',')
      }
    });
  };

  return Consumptions;
};

},{}],16:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/ediel_jobs',
    get: true,
    query: true,
    put: true,
    post: true,
    delete: true
  });
};

},{}],17:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  var Feeds = emResourceFactory({
    default: '/feeds',
    get: true,
    query: true,
    put: true,
    post: true,
    delete: true
  });

  return Feeds;
};

},{}],18:[function(require,module,exports){
module.exports = function(emResourceFactory, energimolnetAPI) {
  var FileJobs = emResourceFactory({
    default: '/file_jobs',
    get: true,
    query: true,
    put: true,
    save: true,
    delete: true
  });

  FileJobs.reRun = function (id) {
    return energimolnetAPI.request({
      method: 'PUT',
      url: '/file_jobs/' + id + '/release'
    });
  };

  return FileJobs;
};

},{}],19:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    forAccount: {
      default: 'ftp_connections',
      get: true,
      query: true,
      put: true,
      post: true,
      delete: true
    }
  });
};

},{}],20:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/invitations',
    get: true,
    query: true,
    put: true,
    post: true,
    delete: true
  });
};

},{}],21:[function(require,module,exports){
module.exports = function(emResourceFactory) {
    return emResourceFactory({
        forAccount: {
            default: 'login_tokens',
            get: false,
            put: false,
            post: true,
            query: true,
            delete: true
        }
    });
};

},{}],22:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/accounts/me',
    get: true,
    put: true
  });
};

},{}],23:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    forMeter: {
      default: 'activity',
      get: false,
      put: false,
      post: false,
      query: true,
      delete: false
    }
  });
};

},{}],24:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/stats/meters',
    get: false,
    query: true,
    put: false,
    post: false,
    delete: false
  });
};

},{}],25:[function(require,module,exports){
var PATH_ASSIGN = '/meters/many/assign_to';
var PATH_SHARE = '/meters/many/share_with';
var PATH_REVOKE = '/meters/many/revoke';

module.exports = function(emResourceFactory, energimolnetAPI) {
  var Meters = emResourceFactory({
    default: '/meters',
    get: true,
    query: true,
    put: true,
    post: true,
    delete: true,
    batch: true
  });

  Meters.assign = _emShareAssign(PATH_ASSIGN);
  Meters.share = _emShareAssign(PATH_SHARE);
  Meters.revoke = _emRevoke;

  return Meters;

  function _emShareAssign(url) {
    return function(meterIds, accountIds) {
      var data = [];

      var metersLength = meterIds.length;
      var accountsLength = accountIds.length;

      for (var i = 0; i < metersLength; i++) {
        var meterId = meterIds[i];

        for (var j = 0; j < accountsLength; j++) {
          var accountId = accountIds[j];

          data.push({
            _id: meterId,
            holder: accountId
          });
        }
      }

      return energimolnetAPI.request({
        url: url,
        method: 'POST',
        data: data
      });
    };
  }

  function _emRevoke(meterIds) {
    return energimolnetAPI.request({
      url: PATH_REVOKE,
      method: 'PUT',
      data: meterIds
    });
  }
};

},{}],26:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/metric_models',
    get: true,
    query: true,
    put: true,
    post: true,
    delete: true
  });
};

},{}],27:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/owners',
    get: true,
    query: true
  });
};

},{}],28:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/accounts/me/password',
    put: true
  });
};

},{}],29:[function(require,module,exports){
module.exports = function(emResourceFactory, energimolnetAPI) {
  var Readings = emResourceFactory({
    default: '/readings'
  });

  Readings.get = function get(id, granularity, ranges, metrics) {
    metrics = metrics || ['energy'];
    metrics = angular.isArray(metrics) ? metrics : [metrics];
    ranges = angular.isArray(ranges) ? ranges : [ranges];

    return energimolnetAPI.request({
      method: 'GET',
      url: [this._config.default, id, granularity, ranges.join('+')].join('/'),
      params: {
        metrics: metrics.join(',')
      }
    });
  };

  Readings.interpolate = function interpolate(id, options) {
    return energimolnetAPI.request({
      method: 'POST',
      url: [this._config.default, id, 'interpolate'].join('/'),
      data: options
    });
  };

  return Readings;
};

},{}],30:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/refreshtokens',
    query: true
  });
};

},{}],31:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/reports',
    post: true
  });
};

},{}],32:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/robot_jobs',
    get: true,
    query: true,
    put: true,
    post: true,
    delete: true
  });
};

},{}],33:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/stats/robots',
    get: false,
    query: true,
    put: false,
    post: false,
    delete: false
  });
};

},{}],34:[function(require,module,exports){
var makeUrl = require('../util/makeurl');

module.exports = function(emResourceFactory, energimolnetAPI) {
  var Robots = emResourceFactory({
    default: '/robots',
    get: true,
    query: true,
    put: true,
    post: true
  });

  Robots.run = function(robotId) {
    return energimolnetAPI.request({
      url: [this._config.default, robotId, 'run'].join('/'),
      method: 'POST'
    });
  };

  Robots.delete =  function(id, trashMeters) {
    var url = makeUrl([this._config.default, id]);

    if (trashMeters) {
      url += '/trash_meters';
    }

    return energimolnetAPI.request({
      method: 'DELETE',
      url: url
    });
  };

  return Robots;
};

},{"../util/makeurl":41}],35:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/scraper_tests',
    get: true,
    query: true
  });
};

},{}],36:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/scrapers',
    get: true,
    query: true
  });
};

},{}],37:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    forAccount: {
      default: 'subaccounts',
      get: '/accounts',
      put: true,
      post: true,
      query: true,
      delete: '/accounts'
    }
  });
};

},{}],38:[function(require,module,exports){
var makeUrl = require('../util/makeurl');

module.exports = function(emResourceFactory, Api) {
  var Subscribers = emResourceFactory({
    forAccount: {
      default: 'meter_subscribers',
      get: true,
      put: true,
      post: true,
      query: true,
      delete: false
    }
  });

  Subscribers._forAccount = Subscribers.forAccount;

  Subscribers.forAccount = function (account) {
    var SubscribersForAccount = Subscribers._forAccount(account);
    SubscribersForAccount.delete = _subscribersDelete;

    return SubscribersForAccount;
  };

  // Revoke meters argument determines whether the meters shared through a
  // subscription shouldshould be revoked. Default is false
  function _subscribersDelete(id, revokeMeters) {
    return Api.request({
      method: 'DELETE',
      url: makeUrl([this._config.default, id]),
      data: {
        revoke_meters: revokeMeters || false
      },
      headers: {
        'Content-Type': 'application/json;charset=UTF-8'
      }
    });
  }

  return Subscribers;
};

},{"../util/makeurl":41}],39:[function(require,module,exports){
module.exports = function(emResourceFactory) {
  return emResourceFactory({
    forAccount: {
      default: 'tokens',
      get: true,
      put: true,
      post: true,
      query: true,
      delete: true
    }
  });
};

},{}],40:[function(require,module,exports){
/*
 * This factory generates model collections for Metry (a.k.a. Energimolnet)
 * Use the models found in the models folder.
 */

var makeUrl = require('./util/makeurl');
var ACCOUNTS_PATH = '/accounts';

module.exports = function (Api) {
  function resourceFactory(config) {
    function Resource() {
      this._config = config;
    }

    if (config.get) {
      Resource.prototype.get = _emGetResource;
    }

    if (config.query) {
      Resource.prototype.query = _emQueryResource;
    }

    if (config.put || config.post) {
      Resource.prototype.save = _emSaveResource;
    }

    if (config.batch) {
      Resource.prototype.batchUpdate = _emBatchUpdateResources;
    }

    if (config.delete) {
      Resource.prototype.delete = _emDeleteResource;
    }

    if (config.forAccount) {
      Resource.prototype.forAccount = _emForResource('accounts', config.forAccount);
    }

    if (config.forMeter) {
      Resource.prototype.forMeter = _emForResource('meters', config.forMeter);
    }

    return new Resource();
  }

  function _emPath(config, method) {
    var value = config[method];
    return value === true ? config.default : value;

  }
  function _emGetResource(id, config) {
    var requestConfig = {
      method: 'GET',
      url: makeUrl([_emPath(this._config, 'get'), id])
    };

    if (typeof config === 'object') angular.extend(requestConfig, config);

    return Api.request(requestConfig);
  }

  function _emSaveResource(object, config) {
    var method;
    var data = object;
    var path;

    if (object._id !== undefined || !this._config.post) {
      method = 'PUT';
      path = _emPath(this._config, 'put') + '/' + object._id;
      data = angular.copy(object);
      delete data._id;
    } else {
      method = 'POST';
      path = _emPath(this._config, 'post');
    }

    var requestConfig = {
      method: method,
      url: path,
      data: data
    };

    if (typeof config === 'object') angular.extend(requestConfig, config);

    return Api.request(requestConfig);
  }

  function _emBatchUpdateResources(ids, properties, config) {
    var payload = [];

    for (var i = 0, len = ids.length; i < len; i++) {
      var update = angular.copy(properties);
      update._id = ids[i];
      payload.push(update);
    }

    var requestConfig = {
      method: 'PUT',
      url: _emPath(this._config, 'batch'),
      data: payload
    };

    if (typeof config === 'object') angular.extend(requestConfig, config);

    return Api.request(requestConfig);
  }

  function _emQueryResource(params, config) {
    var requestConfig = {
      method: 'GET',
      url: _emPath(this._config, 'query'),
      params: _removeEmpty(params)
    };

    if (config) angular.extend(requestConfig, config);

    return Api.request(requestConfig);
  }

  function _emDeleteResource(id, config) {
    var requestConfig = {
      method: 'DELETE',
      url: makeUrl([_emPath(this._config, 'delete'), id])
    };

    if (typeof config === 'object') angular.extend(requestConfig, config);

    return Api.request(requestConfig);
  }

  function _emForResource(resourceName, resourceConfig) {
    var _this = this;

    return function _forResource(id) {
      var config = angular.copy(resourceConfig);

      ['default', 'get', 'put', 'post', 'delete', 'query'].forEach(function(method) {
        var value = config[method];

        // Append resource/id/ to paths that don't start with /
        if (typeof value === 'string' && value[0] !== '/') {
          config[method] = '/' + resourceName + '/' + id + '/' + value;
        }
      });

      return resourceFactory(config);
    };
  }

  function _removeEmpty(object) {
    var params = {};

    for (var key in object) {
      if (!object.hasOwnProperty(key)) { continue; }

      var value = object[key];
      var isString = angular.isString(value);

      if (value != null && ((isString && value.length > 0) || !isString)) {
        params[key] = value;
      }
    }

    return params;
  }

  return resourceFactory;
};

},{"./util/makeurl":41}],41:[function(require,module,exports){
module.exports = function makeUrl(components, params) {
  components = components == null? [] : !angular.isArray(components) ? [components] : components;
  var fullPath = [];

  for (var i = 0, len = components.length; i < len; i++) {
    var component = components[i];

    if (component == null) {
      break;
    }

    fullPath.push(component.replace(/^\/|\/$/, ''));
  }

  var path = fullPath.join('/') + '?';

  if (typeof params === 'object') {
    for (var key in params) {
      var value = params[key];

      path += key + '=' + encodeURIComponent(value) + '&';
    }
  }

  return path.slice(0, -1);
};

},{}]},{},[5]);
