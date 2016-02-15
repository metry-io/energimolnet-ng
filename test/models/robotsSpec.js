describe('Robots', function() {
  var Robots, $httpBackend;
  var BASE_URL = 'http://dummy.local';

  beforeEach(module('energimolnet'));

  beforeEach(inject(function(_$httpBackend_, emRobots) {
    angular.module('energimolnet')
      .constant('apiBaseUrl', BASE_URL)
      .value('authConfig', {disabled: true});

    Robots = emRobots;
    $httpBackend = _$httpBackend_;
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingRequest();
    $httpBackend.verifyNoOutstandingExpectation();
  });

  it('should query API with correct run parameters', function() {
    var robotId = 'abcd';
    var url = [BASE_URL, 'api/2.0', 'robots', robotId, 'run'].join('/');

    $httpBackend.expectPOST(url).respond(200, {});

    Robots.run(robotId);

    $httpBackend.flush();
  });

  it('should be able to delete a robot', function() {
    var robotId = 'abcd';
    var url = [BASE_URL, 'api/2.0', 'robots', robotId].join('/');

    $httpBackend.expectDELETE(url).respond(200, {});

    Robots.delete(robotId);

    $httpBackend.flush();
  });

  it('should be able to trash meters when deleting', function() {
    var robotId = 'abcd';
    var url = [BASE_URL, 'api/2.0', 'robots', robotId, 'trash_meters'].join('/');

    $httpBackend.expectDELETE(url).respond(200, {});

    Robots.delete(robotId, true);

    $httpBackend.flush();
  });
});
