module.exports = function(emResourceFactory) {
  return emResourceFactory({
    default: '/scraper_tests',
    get: true,
    query: true
  });
};
