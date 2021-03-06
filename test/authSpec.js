describe('Energimolnet Auth', function() {
  var $httpBackend, $rootScope, api, auth, $window;
  var BASE_URL = 'http://dummy.local';
  var refreshToken = 'refresh1234567890';
  var authConfig = {
    disabled: false,
    clientId: 'testClientID',
    clientSecret: 'testClientSecret',
    redirectUri: 'http://dummier.local/path'
  };

  beforeEach(module('energimolnet'));

  beforeEach(function() {
    angular.module('energimolnet')
      .constant('apiBaseUrl', BASE_URL)
      .value('authConfig', authConfig);
  });

  beforeEach(inject(function(_$httpBackend_, _$rootScope_, _$window_, energimolnetAPI, emAuth) {
    $httpBackend = _$httpBackend_;
    $window = _$window_;
    $rootScope = _$rootScope_;
    api = energimolnetAPI;
    auth = emAuth;

    $window.localStorage.removeItem('emPrivateToken');
    $window.localStorage.removeItem('emRefreshToken');
    $window.localStorage.removeItem('emAccessToken');
  }));

  afterEach(function () {
    $httpBackend.verifyNoOutstandingRequest();
    $httpBackend.verifyNoOutstandingExpectation();
  });

  it('should accept a private api token', function() {
    var token = 'mypriv-atetok-en1234-456789';

    auth.setPrivateToken(token);
    expect(auth.getPrivateToken()).toEqual(token);
  });

  it('should remove the private api token when set to null', function() {
    var token = 'mypriv-atetok-en1234-456789';

    auth.setPrivateToken(token);
    expect(auth.getPrivateToken()).toEqual(token);
    auth.setPrivateToken(null);
    expect(auth.getPrivateToken()).toEqual(null);
  });

  it('should accept a refresh token', function() {
    auth.setRefreshToken(refreshToken);
    expect(auth.getRefreshToken()).toEqual(refreshToken);
  });

  it('should remove a refresh token when set to null', function() {
    auth.setRefreshToken(refreshToken);
    expect(auth.getRefreshToken()).toEqual(refreshToken);
    auth.setRefreshToken(null);
    expect(auth.getRefreshToken()).toEqual(null);
  });

  it('should store refresh tokens in localStorage', function() {
    auth.setRefreshToken(refreshToken);
    expect($window.localStorage.getItem('emRefreshToken')).toEqual(refreshToken);
  });

  it('should use a stored refresh token', function() {
    $window.localStorage.setItem('emRefreshToken', refreshToken);
    expect(auth.getRefreshToken()).toEqual(refreshToken);
  });

  it('should say it is not authenticated when it has no refresh or private token', function() {
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('should say it is authenticated when it has a refresh token', function() {
    auth.setRefreshToken(refreshToken);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('should say it is authenticated when it has a private token', function() {
    auth.setPrivateToken('privateToken');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('should request access tokens when perfoming an api request and no access token is available', function() {
    auth.setRefreshToken(refreshToken);

    $httpBackend.expectPOST(BASE_URL + '/oauth/token', {
      client_id: 'testClientID',
      client_secret: 'testClientSecret',
      grant_type: 'refresh_token',
      scope: 'basic',
      refresh_token: refreshToken
    }).respond(200, {
      access_token: "130f6d30ef95d9c16a82d311fb32c852c8398cbb",
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: "basic",
      token_type: "Bearer"
    });

    $httpBackend.expectGET(BASE_URL + '/api/2.0/dummy').respond(400, {});

    api.request({url: '/dummy', method: 'GET'});

    $httpBackend.flush();
  });

  it('should queue multiple requests until token is fetched', function() {
    auth.setRefreshToken(refreshToken);

    $httpBackend.expectPOST(BASE_URL + '/oauth/token', {
      client_id: 'testClientID',
      client_secret: 'testClientSecret',
      grant_type: 'refresh_token',
      scope: 'basic',
      refresh_token: refreshToken
    }).respond(200, {
      access_token: "130f6d30ef95d9c16a82d311fb32c852c8398cbb",
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: "basic",
      token_type: "Bearer"
    });

    $httpBackend.expectGET(BASE_URL + '/api/2.0/dummy').respond(400, {});
    $httpBackend.expectGET(BASE_URL + '/api/2.0/dummy2').respond(400, {});

    api.request({url: '/dummy', method: 'GET'});
    api.request({url: '/dummy2', method: 'GET'});

    $httpBackend.flush();
  });

  it('should reuse an existing valid access token', function() {
    auth.setRefreshToken(refreshToken);

    // Inject a token into localStorage
    $window.localStorage.setItem('emAccessToken', JSON.stringify({
      access_token: "130f6d30ef95d9c16a82d311fb32c852c8398cbb",
      expires_at: 2146694400000,
      scope: "basic",
      token_type: "Bearer"
    }));

    $httpBackend.expectGET(BASE_URL + '/api/2.0/dummy').respond(400, {});

    api.request({url: '/dummy'});

    $httpBackend.flush();
  });

  it('should not use expired access tokens', function() {
    // NOTE: This test will fail if time machines are invented and a time
    // traveller runs this test before the mocked date.
    $window.localStorage.setItem('emAccessToken', JSON.stringify({
      access_token: "130f6d30ef95d9c16a82d311fb32c852c8398cbb",
      expires_at: 1432462188232,
      refresh_token: refreshToken,
      scope: "basic",
      token_type: "Bearer"
    }));

    auth.setRefreshToken(refreshToken);

    $httpBackend.expectPOST(BASE_URL + '/oauth/token', {
      client_id: 'testClientID',
      client_secret: 'testClientSecret',
      grant_type: 'refresh_token',
      scope: 'basic',
      refresh_token: refreshToken
    }).respond(200, {
      access_token: "130f6d30ef95d9c16a82d311fb32c852c8398cbb",
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: "basic",
      token_type: "Bearer"
    });

    $httpBackend.expectGET(BASE_URL + '/api/2.0/dummy').respond(400, {});

    api.request({url: '/dummy'});

    $httpBackend.flush();
  });

  it('should remove access tokens when refresh token is set', function() {
    $window.localStorage.setItem('emAccessToken', JSON.stringify({
      access_token: "130f6d30ef95d9c16a82d311fb32c852c8398cbb",
      expires_at: 2146694400000,
      scope: "basic",
      token_type: "Bearer"
    }));

    auth.setRefreshToken(refreshToken);

    expect($window.localStorage.getItem('emAccessToken')).toBe(null);
  });

  it('should create an authorization url that contains redirect uri', function() {
    var authUrl = auth.authorizeUrl();
    expect(authUrl.indexOf('redirect_uri=http%3A%2F%2Fdummier.local%2Fpath') > 0).toBe(true);
  });

  it('should create an authorization url that contains client id', function() {
    var authUrl = auth.authorizeUrl();
    expect(authUrl.indexOf('client_id=testClientID') > 0).toBe(true);
  });

  it('should create an authorization url that contains client secret', function() {
    var authUrl = auth.authorizeUrl();
    expect(authUrl.indexOf('client_secret=testClientSecret') > 0).toBe(true);
  });

  it('should fetch refresh token from authorization code', function() {
    var code = 'auth_me_12345';
    var refresh_token = 'refresh_12345';
    var access_token = 'access_12345';

    $httpBackend.expectPOST(BASE_URL + '/oauth/token', {
      grant_type: 'authorization_code',
      code: code,
      client_id: authConfig.clientId,
      client_secret: authConfig.clientSecret,
      state: 'emAuth',
      scope: 'basic',
      redirect_uri: authConfig.redirectUri
    }).respond(200, {
      refresh_token: refresh_token,
      access_token: access_token,
      expires_in: 3600,
      token_type: "Bearer",
      scope: 'basic'
    });

    auth.handleAuthCode(code);

    $httpBackend.flush();

    expect(auth.getRefreshToken()).toBe(refresh_token);
  });

  it('should fetch access token from authorization code', function() {
    var code = 'auth_me_12345';
    var refresh_token = 'refresh_12345';
    var access_token = 'access_12345';

    $httpBackend.expectPOST(BASE_URL + '/oauth/token', {
      grant_type: 'authorization_code',
      code: code,
      client_id: authConfig.clientId,
      client_secret: authConfig.clientSecret,
      state: 'emAuth',
      scope: 'basic',
      redirect_uri: authConfig.redirectUri
    }).respond(200, {
      refresh_token: refresh_token,
      access_token: access_token,
      expires_in: 3600,
      token_type: "Bearer",
      scope: 'basic'
    });

    auth.handleAuthCode(code);

    $httpBackend.flush();

    var config = {
      url: '/dummy',
      data: {test: true}
    };

    auth.authorize(config).then(function(authorizedConfig) {
      var authHeader = authorizedConfig.headers.Authorization;
      expect(authHeader).toBe('Bearer ' + access_token);
    });

    $rootScope.$digest();
  });

  it('should respect custom headers set', function() {
    var config = {
      headers: {
        CustomHeader: 'custom'
      }
    };

    auth.setRefreshToken(refreshToken);

    // Inject a token into localStorage
    $window.localStorage.setItem('emAccessToken', JSON.stringify({
      access_token: "130f6d30ef95d9c16a82d311fb32c852c8398cbb",
      expires_at: 2146694400000,
      scope: "basic",
      token_type: "Bearer"
    }));

    auth.authorize(config).then(function(authorizedConfig) {
      var customHeader = authorizedConfig.headers.CustomHeader;
      expect(customHeader).toBe('custom');
    });

    $rootScope.$digest();
  });

  it('should add subaccount headers to requests', function() {
    var config = {
      url: '/test'
    };

    auth.setRefreshToken(refreshToken);
    auth.setSubaccount('abc123');

    // Inject a token into localStorage
    $window.localStorage.setItem('emAccessToken', JSON.stringify({
      access_token: "130f6d30ef95d9c16a82d311fb32c852c8398cbb",
      expires_at: 2146694400000,
      scope: "basic",
      token_type: "Bearer"
    }));

    auth.authorize(config).then(function(authorizedConfig) {
      var customHeader = authorizedConfig.headers['X-Subaccount'];
      expect(customHeader).toBe('abc123');

      // Prevent screwing up next tests
      auth.setSubaccount(null);
    });

    $rootScope.$digest();
  });

  it('should not use subaccounts when preventSubaccount flag is present', function() {
    var config = {
      url: '/test',
      preventSubaccount: true
    };

    auth.setRefreshToken(refreshToken);
    auth.setSubaccount('abc123');

    // Inject a token into localStorage
    $window.localStorage.setItem('emAccessToken', JSON.stringify({
      access_token: "130f6d30ef95d9c16a82d311fb32c852c8398cbb",
      expires_at: 2146694400000,
      scope: "basic",
      token_type: "Bearer"
    }));

    auth.authorize(config).then(function(authorizedConfig) {
      var customHeader = authorizedConfig.headers['X-Subaccount'];
      expect(customHeader).toBe(undefined);

      // Prevent screwing up next tests
      auth.setSubaccount(null);
    });

    $rootScope.$digest();
  });
});
