module.exports = function(emResourceFactory) {
  var ActivityStream = emResourceFactory({
    default: '/activitystream',
    get: true,
    query: true,
    put: false,
    post: false,
    delete: false
  });

  return ActivityStream;
};
