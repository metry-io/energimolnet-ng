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
    var url = [BASE_URL, 'api/2.0', 'readings', dummyId, 'day', '20150101']
      .join('/') + '?metrics=energy';

    auth.setPrivateToken('testing');

    $httpBackend.expectGET(url).respond(200, {});

    Readings.get(dummyId, 'day', '20150101');

    $httpBackend.flush();
  });

  it('should request plain readings when granularity is not specified', function() {
    var dummyId = 'id12345';
    var url = [BASE_URL, 'api/2.0', 'readings', dummyId, '20150101']
      .join('/') + '?metrics=energy';

    auth.setPrivateToken('testing');

    $httpBackend.expectGET(url).respond(200, {});

    Readings.get(dummyId, null, '20150101');

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

  it('should batch upload data for multiple meters', function() {
    var url = [BASE_URL, 'api/2.0', 'readings'].join('/');
    var data = [{
      meter_id: 'abc123',
      time: "2015-02-15T00:00:00+0100",
      value: 123,
      first_value: false,
      counter: "1"
    }, {
      meter_id: 'abc124',
      time: "2015-02-15T00:00:00+0100",
      value: 122,
      first_value: false
    }];

    $httpBackend.expectPOST(url, data).respond(200, {});
    Readings.batch(data);
    $httpBackend.flush();
  });

  it('should batch upload data for a single meter', function() {
    var meterId = 'abc123';
    var url = [BASE_URL, 'api/2.0', 'readings', meterId].join('/');
    var data = [{
      time: "2015-02-15T00:00:00+0100",
      value: 123,
      first_value: false,
      counter: "1"
    }, {
      time: "2015-02-15T00:00:00+0100",
      value: 122,
      first_value: false
    }];

    $httpBackend.expectPOST(url, data).respond(200, {});
    Readings.batch(data, meterId);
    $httpBackend.flush();
  });
});
