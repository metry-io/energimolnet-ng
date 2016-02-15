module.exports = function(emResourceFactory, energimolnetAPI) {
  var ComplaintCases = emResourceFactory({
    default: '/complaint_cases',
    get: true,
    query: true,
    post: true
  });

  ComplaintCases.close = function(id) {
    return energimolnetAPI.request({
      url: '/complaint_cases/' + id + '/close',
      method: 'PUT'
    });
  };

  return ComplaintCases;
};
