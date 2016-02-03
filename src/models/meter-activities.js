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
