module.exports = function(ngModule) {
  ngModule.factory('emConsumptionStats', [
    'emResourceFactory',
    function(resourceFactory) {
      return resourceFactory({
        default: '/accounts/me/consumption_stats',
        get: true,
        forAccount: {
          default: 'consumption_stats',
          get: true
        }
      });
    }
  ]);
};
