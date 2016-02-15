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
