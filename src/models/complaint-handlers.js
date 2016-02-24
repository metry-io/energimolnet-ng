module.exports = function(emResourceFactory) {
  return emResourceFactory({
    forFeed: {
      default: 'complaint_handlers',
      get: true,
      put: true,
      post: true,
      query: true,
      delete: true
    }
  });
};
