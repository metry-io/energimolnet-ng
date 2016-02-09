module.exports = function(emResourceFactory) {
  var ActivityStream = emResourceFactory({
    default: '/activity_stream',
    get: true,
    query: true,
    put: false,
    post: false,
    delete: false
  });

  return ActivityStream;
};
