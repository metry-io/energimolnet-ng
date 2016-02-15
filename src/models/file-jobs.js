module.exports = function(emResourceFactory, energimolnetAPI) {
  var FileJobs = emResourceFactory({
    default: '/file_jobs',
    get: true,
    query: true,
    put: true,
    save: true,
    delete: true
  });

  FileJobs.reRun = function (id) {
    return energimolnetAPI.request({
      method: 'PUT',
      url: '/file_jobs/' + id + '/release'
    });
  };

  return FileJobs;
};
