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

    // Adds forAccount, forMeter, forFeed etc
    for (var key in config) {
      if (config.hasOwnProperty(key) && key.indexOf('for') === 0) {
        var resourceName = key.slice(3).toLowerCase() + 's';

        Resource.prototype[key] = _emForResource(resourceName, config[key]);
      }
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

      if (value !== null && value !== undefined &&
          ((isString && value.length > 0) || !isString)) {
        params[key] = value;
      }
    }

    return params;
  }

  return resourceFactory;
};
