angular.module('queup.factory', [])

.factory('queupFactory', function($http, $rootScope){

  $rootScope.serverURL = 'http://localhost:8000'; // 'http://queup.io';

  var addNewClass = function(newClassName){
    console.log(newClassName)
    var token = window.localStorage.getItem('clientToken');
    console.log(token,"TOKEN");
    return $http({
      method: 'POST',
      url: $rootScope.serverURL + '/api/teachers/addClass',
      headers: {
        user_role: 'teacher',
        access_token: token
      },
      dataType: 'JSON',
      data:{
        classTitle: newClassName
      }
    })
    .success(function(data){
      console.dir('add new class: success data below:');
      console.dir(data);
      return data;
    })
    .error(function(data){
      console.dir('error data below:');
      console.dir(data);
    })
  };

  return {
    addNewClass: addNewClass,
  }
})

.factory('auth', function($q) {
  var auth = {};
  auth.init = false;

  // if(!auth.init) {
  //   FB.init({
  //    appId      : '718396624937121', // '1425134197808858' localhost
  //    cookie     : true,  // enable cookies to allow the server to access the session
  //    xfbml      : true,  // parse social plugins on this page
  //    version    : 'v2.3' // use version 2.2
  //   });
  //   auth.init = true;
  // }

  // This function is called when someone finishes with the Login
  // Button.  See the onlogin handler attached to it in the sample
  // code below.
  auth.checkLoginState = function () {
    var deferred = $q.defer();
    FB.getLoginStatus(function(response) {
      if(response.status === 'connected') {
        console.log('facebook says you be logged in');
        deferred.resolve('Logged In');
      } else {
        console.log('facebook say you not logged in');
        deferred.reject(response.status)
      }
    });
    return deferred.promise;
  };

  auth.apiCall = function() {
    FB.api('/me', function(response) {
        console.log(JSON.stringify(response));
    });
  };

  return auth;
})

.factory('teacherData', function($http, queupFactory, $rootScope, $q) {
  // private data for teacher information (name, email, classes, etc.)
  var _data = {
    name: null,
    email: null,
    fbPicture: null,
    classes: [],
    currentClass: {id: null, name: null},
    loaded: false,
    loading: false
  };


  return {

    set: function(key, value) {
      _data[key] = value;
    },

    get: function(key) {
      var dataCopy;
      // if a key is supplied, return that value
      // if no argument supplied, just return a deep copy of all teacher data
      if(key) {
        // if value is an array, make a deep copy, otherwise make simple copy
        if(Array.isArray(_data[key]) || typeof _data[key] === 'object') {
          dataCopy = angular.copy(_data[key]);
        } else {
          dataCopy = _data[key];
        }
      } else {
        dataCopy = angular.copy(_data);
      }

      return dataCopy;
    },

    update: function(caller) {
      var token = window.localStorage.getItem('clientToken');

      var deferred = $q.defer();

      if(_data.loading === false) {
        _data.loading = deferred.promise;
        console.log('making get request thanks to:', caller)
        return $http({
          method: 'GET',
          url: $rootScope.serverURL + '/api/teachers/getTeacherData',
          headers: {
            user_role: 'teacher',
            access_token: token
          }
        })
        .success(function(data) {
          _data.name = data.name;
          _data.email = data.email;
          _data.fbPicture = data.fbPicture;
          _data.classes = data.classes;
          _data.loaded = true;
          deferred.resolve('loaded teacher data');
          _data.loading = false;
          console.log('successfully loaded teacherData', _data);
        })
        .error(function(data, status) {
          console.log('error in teacherData.update function');
          _data.loading.reject('failure to load teacher data');
          _data.loading = false;
        })
      } else {
        return _data.loading;
      }
    }
  }
})

.factory('queueList', function(socket) {
  socket.on('studentRaisedHand', function(data) {
    console.log('received student hand raise', data);
  })
});

// Socket Factory
// --------------
angular.module('socket.io', [])
.factory('socket', function($rootScope, teacherData) {

  // Create connection with server that is within the
  // factory (maintains connection across different views)
  // and send teacher email to associate with socketID on server
  var socketio = io.connect( $rootScope.serverURL );

  // Wrapped socket.IO methods (on, emit, removeListener(s))
  // so that they can be handled correctly within view scopes
  return {
    on: function(event, cb) {
      socketio.on(event, function() {
        var args = arguments;
        $rootScope.$apply(function() {
          cb.apply(socketio,args);
        })
      });
    },

    emit: function(event, data, cb) {
      if(typeof cb === 'function') {
        socketio.emit(event, data, function() {
          var args = arguments;
          $rootScope.$apply(function() {
            cb.apply(socketio, args);
          })
        })
      } else {
        socketio.emit(event, data);
      }
    },

    off: function(event, cb) {
      if(typeof cb === 'function') {
        socketio.removeListener(event, cb);
      } else {
        socketio.removeAllListeners(event);
      }
    }
  }
});

angular.module('queup.sinch', ['queup.factory'])
.factory('sinch', function(teacherData){

  var sinchClient = new SinchClient({
    applicationKey: 'ccdeeb0b-5733-4bcb-9f44-4b2a7a70dbfe',
    capabilities: {calling: true},
    startActiveConnection: true, /* NOTE: This is required if application is to receive calls / instant messages. */ 
    //Note: For additional loging, please uncomment the three rows below
    onLogMessage: function(message) {
      console.log(message);
    },
  });

  var signUpObj = {
    username: teacherData.get('email'),
    password: teacherData.get('email')
  }

  sinchClient.newUser(signUpObj).then(function(ticket){
    sinchClient.start(ticket);
    console.log('******sinch client ticket started******')
  }).fail(function(error){
    console.log('******* user may already exist, logging in with existing email *******');
  
    sinchClient.start(signUpObj)
      .then(function(){
        console.log('********** sinchClient started ********');
      })
      .fail(function(error){
        console.log('********** sinch failed to log in: *******', error)
      })
  });


  return {
    call: function(userID) {
      var callListeners = {
        onCallEstablished: function(currentCall) {
          $('audio').attr('src', currentCall.incomingStreamURL);
          currentCall.mute();
          console.log("******call established*******");
        }
      };
      
      var callClient = sinchClient.getCallClient();
      var newCall = callClient.callUser(userID);
      newCall.addEventListener(callListeners);
    }
  }  

})

