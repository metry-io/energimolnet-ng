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
