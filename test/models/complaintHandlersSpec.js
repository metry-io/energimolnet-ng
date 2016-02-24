describe('Complaint Handlers', function() {
  var ComplaintHandlers, $httpBackend, auth;
  var BASE_URL = 'http://dummy.local';

  beforeEach(module('energimolnet'));

  beforeEach(inject(function(_$httpBackend_, emAuth, emComplaintHandlers) {
    angular.module('energimolnet')
      .constant('apiBaseUrl', BASE_URL)
      .value('authConfig', {disabled: true});

    ComplaintHandlers = emComplaintHandlers;
    $httpBackend = _$httpBackend_;
    auth = emAuth;
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingRequest();
    $httpBackend.verifyNoOutstandingExpectation();
  });

  it('should query handlers for a feed', function() {
    var handler = ComplaintHandlers.forFeed('12345');
    var url = BASE_URL + '/api/2.0/feeds/12345/complaint_handlers';

    $httpBackend.expectGET(url).respond(200, {});

    handler.query();

    $httpBackend.flush();
  });
});
