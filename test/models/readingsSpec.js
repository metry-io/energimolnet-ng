describe('Readings', function() {
  var Readings, $httpBackend, auth;
  var BASE_URL = 'http://dummy.local';

  beforeEach(module('energimolnet'));

  beforeEach(inject(function(_$httpBackend_, emAuth, emReadings) {
    angular.module('energimolnet')
      .constant('apiBaseUrl', BASE_URL)
      .value('authConfig', {disabled: true});

    Readings = emReadings;
    $httpBackend = _$httpBackend_;
    auth = emAuth;
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingRequest();
    $httpBackend.verifyNoOutstandingExpectation();
  });

  it('should assume electricity metric unless specified', function() {
    var dummyId = 'id12345';
    var url = [BASE_URL, 'api/2.0', 'readings', dummyId, 'day', '20150101'].join('/');
    var urlElectricity = url + '?metrics=energy';

    auth.setPrivateToken('testing');

    $httpBackend.expectGET(urlElectricity).respond(200, {});

    Readings.get(dummyId, 'day', '20150101');

    $httpBackend.flush();
  });

  it('should respect the provided metrics', function() {
    var dummyId = 'id12345';
    var url = [BASE_URL, 'api/2.0', 'readings', dummyId, 'day', '20150101'].join('/');
    var urlFlow = url + '?metrics=flow';

    auth.setPrivateToken('testing');

    $httpBackend.expectGET(urlFlow).respond(200, {});

    Readings.get(dummyId, 'day', '20150101', 'flow');

    $httpBackend.flush();
  });

  it('should allow fetching multiple metrics', function() {
    var dummyId = 'id12345';
    var url = [BASE_URL, 'api/2.0', 'readings', dummyId, 'day', '20150101'].join('/');
    var urlFlow = url + '?metrics=flow,energy';

    auth.setPrivateToken('testing');

    $httpBackend.expectGET(urlFlow).respond(200, {});

    Readings.get(dummyId, 'day', '20150101', ['flow', 'energy']);

    $httpBackend.flush();
  });

  it('should let a user interpolate reading for a meter', function() {
    var dummyId = 'id12345';
    var url = [BASE_URL, 'api/2.0', 'readings', dummyId, 'interpolate'].join('/');
    var options = {
      granularity: 'month',
      period: 201602,
      max_distance: 20
    };

    $httpBackend.expectPOST(url, options).respond(200, {});

    Readings.interpolate(dummyId, options);

    $httpBackend.flush();
  });
});
