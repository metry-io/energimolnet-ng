module.exports = function(emResourceFactory, energimolnetAPI) {
  var Readings = emResourceFactory({
    default: '/readings',
    post: true,
    put: true
  });

  Readings.get = function get(id, granularity, ranges, metrics) {
    metrics = metrics || ['energy'];
    metrics = angular.isArray(metrics) ? metrics : [metrics];
    ranges = angular.isArray(ranges) ? ranges : [ranges];

    var url = [this._config.default, id, granularity, ranges.join('+')]
      .filter(function(c) { return c !== null && c !== undefined; })
      .join('/');

    return energimolnetAPI.request({
      method: 'GET',
      url: url,
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

  Readings.batch = function batch(data, id) {
    var url = this._config.default;

    if (id !== undefined) {
      url += '/' + id;
    }

    return energimolnetAPI.request({
      method: 'POST',
      url: url,
      data: data
    });
  };

  return Readings;
};
