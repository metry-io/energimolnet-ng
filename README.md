# energimolnet-ng
Angular SDK for Metry/Energimolnet API v2

## Installation

Currently, we recommend installing via npm:
```
npm install energimolnet-ng
```

The SDK depends on Angular. However, it is not listed as a dependency which means you can choose where to get it from (i.e. bower/npm/other package manager). It has been tested with Angular 1.3. and 1.4.

Depending on how you build your app, you can either include it by requiring the module (with Browserify/webpack), or by including the `energimolnet-user.min.js` file in a `<script>` tag.

## Building

There should be little need for building the library yourself (except for when helping us fix bugs ;) ). Building requires node.js. Simply clone this repo, and run
```
npm install && npm start
```

This will output four files in the dist/ folder, `energimolnet.js`, `energimolnet-user.js`, and the minified versions `energimolnet.min.js`, and `energimolnet-user.min.js`.

The dist-files are available in the repo, so there should be no need to build in this way. Since angular uses its own module system, we have not provided node-style modules. Our intention for the future is to provide a pure JS version, however we currently depend too much on Angular's `$http` service and `$rootScope` for events.

## Usage example

Documentation regarding authentication, the available endpoints, and response data format can be found [at Apiary](http://docs.energimolnetv2.apiary.io/).

## Authenticating user

There are currently three ways of authenticating a user.

+ OAuth
+ Private token
+ Manual authentication

The `emAuth` service has a `isAuthenticated()` method that returns whether the user has either a private or refresh token set.

### Oauth

In order to use [OAuth](http://en.wikipedia.org/wiki/OAuth), you need to register a `client id` and `client secret` with Metry/Energimolnet. Contact [support@energimolnet.se](mailto:support@energimolnet.se) if you are interested in developing services on Metry.

When you have recieved your `client id` and `client secret` for your application, you need to configure the auth service to use these values.

```
angular.module('myModule').constant('authConfig', {
  disabled: false,
  clientId: <your client id>,
  clientSecret: <your client secret>,
  redirectUri: <the uri your app resides at, i.e. a web server or app url scheme>
});
```

Note that the redirectUri is specific for the client, so you'll need to update the client settings on Metry in order to change the URI of your app.

When the SDK detects unauthenticated api access, it will emit a `em:loginNeeded` event on `$rootScope`. You should listen to this event and redirect the user to the login URL.

```
angular.module('myApp').run([
  '$rootScope',
  '$window',
  'emAuth',
  function($rootScope, $window, Auth) {
    $rootScope.$on('em:loginNeeded', function() {
      $window.location.href = Auth.authorizeUrl();
    });
  }
]);
```

Once the authentication is completed, the user will be redirected to the provided `redirectUri`. The oAuth auth code will be appended as a `?code=<auth code>` to the uri. You need to define a state in your app that catches the refresh token and hands it over to the emAuth service. The emAuth service will then use this code to fetch a refresh and access token.

```
// Somewhere in your initial code where emAuth is injected.
// var authCode = // extract code from url, e.g. by using $location.search

emAuth.handleAuthCode(authCode).then(function() {
  // App is ready to request data from API
})
```

### Private token
While developing, it might be convenient to use your private developer key. This key can be injected using the `setPrivateToken` method on `emAuth`. Remember to keep it from being commited to public repos.

_In .gitignored config file_

```
angular.module('myConfig').constant('privateToken', 'myVerySecretTokenThatIShallNotCommitToPublicRepos');
```

_In main app_

```
angular.module('myApp').run([
  'emAuth',
  'privateToken'
  function(auth, privateToken) {
    auth.setPrivateToken(privateToken);
  }
]);
```

The private key will always be used when available, overriding any OAuth authorization. To remove the private token, simply call `setPrivateToken(null)` on the `emAuth` service.

### Manual authentication
If you manually want to handle OAuth tokens, you can configure the `emAuth` service to disable OAuth.

```
angular.module('myModule').constant('authConfig', {disabled: true});
```

## Collection model structure

Typically, you talk to the API using our collection models. For a list of what models are available in the SDK, check the `src/models` folder. The aim is that any public endpoint should have a matching collection model in the SDK.

The collections models have one or more of the following methods implemented:

+ `query(params)`
+ `get(modelId)`
+ `get(meterId, granularity, periods)`
+ `save(model)`
+ `forAccount(accountId)`

The returned objects from the first four methods are [promises](https://docs.angularjs.org/api/ng/service/$q). The promises either resolve to the requested object (when a *single object* is requested), or to an object of the following structure (when a *list of objects* is requested):

```
{
  data: [<response list, e.g. a list of the user´s available meters>],
  pagination: {
    skip: <index of first returned item>,
    limit: <number of items per result page>,
    count: <number of total items matching the query>,
    page: <current page, for use with pagination controls. NOTE: starts at index 1>,
    from: <same as skip, but with indexes starting at 1>,
    to: <index of last item, with indexes starting at 1>
  }
}
```

See below for response of `forAccount()` method.


#### query(params)

The query method is used to list all (or a subset of all) items of a type. A common example is to list all the meters a user can acess.

If `params` is undefined, the query will return all items of the collection type that the authenticated user has access to.

```
angular.module('myModule').controller('myMetersController', [
  'emMeters',
  function(Meters) {
    var vm = this;

    Meters.query().then(function(result) {
      vm.meters =  result.data;
      vm.pagination = result.pagination;
    }, function(error) {
      // "handle" error
      // i.e. log it to the console where the user never will see it.
      console.log(error);
    });
  }
]);

angular.module('myModule').controller('myMetersSearchController', [
  '$scope',
  'emMeters',
  function($scope, Meters) {
    var vm = this;

    $scope.$watch('metersSearch', function(newSearch, oldSearch) {
      if (newSearch === oldSearch) return;

      Meters.query({name: newSearch}).then(function(result) {
        vm.foundMeters =  result.data;
        vm.pagination = result.pagination;
      }, function(error) {
        console.log(error);
      });
    });
  }
]);
```

To request pages after the first, add a skip parameter to the query. I.e.:
```
Collection.query({skip: 50})
```

#### get(modelId)

This method fetches the object that has the provided `modelId`.

Some collection types, such as `Me` and `ConsumptionStats`, do not require `modelId` since there is only one possible item to return. Providing a `modelId` when fetching from these collections will make the request fail.

```
angular.module('myModule').controller('myMeController', [
  'emMe',
  function(Me) {
    var vm = this;

    Me.get().then(function(me) {
      vm.me = me;
    }, function(error) {
      console.log(error);
    });
  }
]);

angular.module('myModule').controller('myOwnersController', [
  'emOwners',
  function(Owners) {
    var vm = this;
    var ownerId = "5268c832dedcde9d1d0000df";

    Owners.get(ownerId).then(function(owner) {
      vm.owner = owner;
    }, function(error) {
      console.log(error);
    });
  }
]);
```

#### Consumptions.get(meterId, granularity, periods)

This method only exists on the Consumptions collection and replaces the `get(modelId)` method.

The `granularity` argument accepts a string, currenly 'hour', 'day', or 'month'. The granuliarity is the desired time unit for the consumptions. Note that some meters only have month values. Check the `consumption_stats` object on the meter to see what data is available to the user.

The `periods` argument should be an array of request periods. Periods are strings in the format "YYYYMMDDHHMM". The required date units depend on the granularity. The easiest way to create a period is by using `getPeriod(dates, granularity)` from the `DateUtil` module.

A period can either be a start and end date, or a single date. In the latter case, the period will be auto-calculated. Some examples of this are

+ `2014` = `20140101-20141231`
+ `201408` = `20140801-20140831`

```
angular.module('myModule').controller('myConsumptionsController', [
  'emConsumptions',
  'emDateUtil',
  function(Consumptions, DateUtil) {
    var vm = this;
    var meterId = '1234567890abcdef12345';

    // Request daily data 30 days back
    var granularity = 'day';
    var now = new Date();
    var thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Create a period with day granularity between 30 days ago and today
    var period = DateUtil.getPeriod([thirtyDaysAgo, now], granularity);

    Consumptions.get(meterId, granularity, [period]).then(function(consumptions) {
      vm.consumptions = consumptions;
    }, function(error) {
      console.log(error);
    );
  }
}]);
```

#### save(model)

This method saves a model object to a collection on the server. Depending on whether the item is new or already exists, the SDK decides wheter to make a `PUT`or `POST` request to the API server.

When updating an existing object, you only need to provide the changed keys and values, along with the `_id` of the object to update.

```
angular.module('myModule').controller('myNameChangeController', [
  'emMe',
  function(Me) {
    // This fetches the current user and appends ', ftw!' to his/her name

    Me.get().then(function(me) {
      me.name = (me.name != null ? me.name : 'Anonymous') ', ftw!';
      return Me.save(me);
    }).then(function(savedMe) {
      console.log('Saved me: ', savedMe);
    });
  }
}]);
```

#### forAccount(accountId)

This method is currently only available on `Subaccounts` and `Clients` collections. Calling `Subaccounts.forAccount(<id>)` returns a collection model that only returns subaccounts/clients for a given account. This model is then used as normal.

```
angular.module('myModule').controller('mySubaccountsController', [
  'emSubaccounts',
  'account',
  function(Subaccounts, account) {
    var mySubaccounts = Subaccounts.forAccount(account._id);
    var vm = this;

    mySubaccounts.save({name: 'managed account'}).then(function(subaccount) {
      mySubaccounts.query({name: 'managed'}).then(function(res) {
        vm.subaccounts = res.data;
      }, function(err) {
        console.log('Error: ', err);
      });
    });
  }
}]);
```
