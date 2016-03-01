describe('ComplaintCases', function() {
  var ComplaintCases, $httpBackend, auth;
  var BASE_URL = 'http://dummy.local';

  beforeEach(module('energimolnet'));

  beforeEach(inject(function(_$httpBackend_, emComplaintCases, emAuth) {
    angular.module('energimolnet')
      .constant('apiBaseUrl', BASE_URL)
      .value('authConfig', {disabled: true});

    ComplaintCases = emComplaintCases;
    $httpBackend = _$httpBackend_;
    auth = emAuth;
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingRequest();
    $httpBackend.verifyNoOutstandingExpectation();
  });

  it('should be able to close a complaint case', function() {
    var complaintId = 'abcd1234';
    var url = [BASE_URL, 'api/2.0', 'complaint_cases', complaintId, 'close'].join('/');

    auth.setPrivateToken('testing');

    $httpBackend.expectPUT(url).respond(200, {});

    ComplaintCases.close(complaintId).then(function() {
      $httpBackend.flush();
    });
  });

  it('should call the checkup endpoint', function() {
    var complaintId = 'abcd1234';
    var url = [BASE_URL, 'api/2.0', 'complaint_cases', complaintId, 'checkup'].join('/');

    auth.setPrivateToken('testing');

    $httpBackend.expectGET(url).respond(200, {});

    ComplaintCases.checkup(complaintId).then(function() {
      $httpBackend.flush();
    });
  });
});
