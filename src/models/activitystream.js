module.exports = function(emResourceFactory) {
  var ActivityStream = emResourceFactory({
    default: '/activityStream',
    get: true,
    query: true,
    put: false,
    post: false,
    delete: false
  });

  return ActivityStream;
};
