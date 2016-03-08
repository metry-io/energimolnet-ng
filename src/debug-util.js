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
  emComplaintHandlers,
  emComplaints,
  emCalculatedMetrics,
  emConsumptionStats,
  emConsumptions,
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
    em.ComplainHandlers = emComplaintHandlers;
    em.Complaints = emComplaints;
    em.CalculatedMetrics = emCalculatedMetrics;
    em.ConsumptionStats = emConsumptionStats;
    em.Consumptions = emConsumptions;
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
