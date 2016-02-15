module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/complaints',
    get: true,
    query: true,
    post: true,
    delete: true
  });
};
