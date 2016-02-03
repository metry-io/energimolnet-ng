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
