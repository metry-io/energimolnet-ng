// This spec only tests the share feature
// as the other methods should already be tested
// in the resource-factory spec.

describe('Meters', function() {
  var Meters, $httpBackend;
  var BASE_URL = 'http://dummy.local/';

  beforeEach(module('energimolnet'));

  beforeEach(inject(function(_$httpBackend_, emMeters) {
    angular.module('energimolnet')
      .constant('apiBaseUrl', BASE_URL)
      .value('authConfig', {disabled: true});

    Meters = emMeters;
    $httpBackend = _$httpBackend_;
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingRequest();
    $httpBackend.verifyNoOutstandingExpectation();
  });

  describe('assign', function() {
    it('should allow assigning of a single meter', function() {
      var meterId = '12345';
      var accountId = '67890';
      var url = BASE_URL + 'api/2.0/meters/many/assign_to';

      $httpBackend.expectPOST(url, '[{"_id":"12345","holder":"67890"}]').respond(200, {});

      Meters.assign([meterId], [accountId]);

      $httpBackend.flush();
    });

    it('should allow assigning of multiple meters', function() {
      var meterIds = ['12345', 'abcde', 'fghij'];
      var accountId = '67890';
      var url = BASE_URL + 'api/2.0/meters/many/assign_to';

      $httpBackend.expectPOST(url, '[{"_id":"12345","holder":"67890"},{"_id":"abcde","holder":"67890"},{"_id":"fghij","holder":"67890"}]').respond(200, {});

      Meters.assign(meterIds, [accountId]);

      $httpBackend.flush();
    });
  });

  describe('share', function() {
    it('should allow sharing of a single meter', function() {
      var meterId = '12345';
      var accountId = '67890';
      var url = BASE_URL + 'api/2.0/meters/many/share_with';

      $httpBackend.expectPOST(url, '[{"_id":"12345","holder":"67890"}]').respond(200, {});

      Meters.share([meterId], [accountId]);

      $httpBackend.flush();
    });

    it('should allow assigning of multiple meters', function() {
      var meterIds = ['12345', 'abcde', 'fghij'];
      var accountId = '67890';
      var url = BASE_URL + 'api/2.0/meters/many/share_with';

      $httpBackend.expectPOST(url, '[{"_id":"12345","holder":"67890"},{"_id":"abcde","holder":"67890"},{"_id":"fghij","holder":"67890"}]').respond(200, {});

      Meters.share(meterIds, [accountId]);

      $httpBackend.flush();
    });
  });

  describe('revoke', function() {
    it('should be able to revoke a single contract', function() {
      var meterId = 'abc123';
      var url = BASE_URL + 'api/2.0/meters/many/revoke';

      $httpBackend.expectPUT(url, '["abc123"]').respond(200, {});

     Meters.revoke([meterId]);

     $httpBackend.flush();
    });

    it('should be able to revoke multiple contracts', function() {
      var meterIds = ['abc123', '123abc'];
      var url = BASE_URL + 'api/2.0/meters/many/revoke';

      $httpBackend.expectPUT(url, '["abc123","123abc"]').respond(200, {});

     Meters.revoke(meterIds);

     $httpBackend.flush();
    });
  });

  describe('recalculate stats', function() {
    it('should request consumption stats recalculation with PUT request', function() {
      var meterId = 'abc123';
      var url = BASE_URL + 'api/2.0/meters/' + meterId + '/stats_recalc';

      $httpBackend.expectPUT(url).respond(200, {});

     Meters.recalculateStats(meterId);

     $httpBackend.flush();
    });
  });
});

