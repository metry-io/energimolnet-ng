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

module.exports = function(ngModule) {
  ngModule.run([
    '$window',
    'emConsumptionPreview',
    'emConsumptionStats',
    'emConsumptions',
    'emContracts',
    'emMe',
    'emOwners',
    'emPassword',
    'emReports',
    'emUsers',
    function($window, 
      ConsumptionPreview, 
      ConsumptionStats,
      Consumptions,
      Contracts,
      Me,
      Owners,
      Password,
      Reports,
      Users) {

        function em(func, condensed) {
          func.then(function(res) {
            if (condensed != null && condensed == true) {
              $window.console.log('Response:\n', res);
            } else {
              $window.console.log('Response:\n', JSON.stringify(res, null, 2));
            }
          }, function(err) {
            $window.console.log('Error:\n', err);
          });
        }

        em.ConsumptionPreview = ConsumptionPreview;
        em.ConsumptionStats = ConsumptionStats;
        em.Consumptions = Consumptions;
        em.Contracts = Contracts;
        em.Me = Me;
        em.Owners = Owners;
        em.Password = Password;
        em.Reports = Reports;
        em.Users = Users;

        $window.em = em;
    }
  ]);
};