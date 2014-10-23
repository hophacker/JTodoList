/*global Firebase: true */
/*
 project {
 state:  [0:newly created, 1:done, 2:archieved]
 }
 */
var port = chrome.extension.connect({name: "StorageConnection"});

var importances = [
    {level:0, name:'Low'     },
    {level:1, name:'Medium'  },
    {level:2, name:'High'    },
    {level:3, name:'Extreme' }],
    default_importance = importances[1];

function checkSignin(ifsigin){
    chrome.runtime.sendMessage(
        {type: "checkSignin"},
        function(res) {
            console.log(res);
            if (res.signin && res.uid){
                ifsigin(res.uid);
            }
    });
}
function gotoUrl($location, $scope, url){
    $location.url(url);
    if(!$scope.$$phase) $scope.$apply(); //important!!!
}

angular.module('project', ['ngRoute', 'firebase', 'ui.bootstrap'])
    .config(function($routeProvider) {
        $routeProvider
            .when('/list', {
                controller:'ListCtrl',
                templateUrl:'list.html'
            })
            .when('/', {
                controller: 'signinCtrl',
                templateUrl:'login.html'

            })
            .when('/signup', {
                controller: 'signupCtrl',
                templateUrl:'login.html'
            })
            .when('/edit/:showType/:projectId', {
                controller:'EditCtrl',
                templateUrl:'detail.html'
            })
            .when('/new', {
                controller:'CreateCtrl',
                templateUrl:'detail.html'
            })
            .otherwise({
                redirectTo:'/'
            });
    })
    .config( [ '$compileProvider', function( $compileProvider ) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
        // Angular before v1.2 uses $compileProvider.urlSanitizationWhitelist(...)
    }])
    .factory('$URL', function($firebase){
        return {
            firebaseURL :  'https://boiling-heat-52.firebaseio.com/',
            base        : '',
            todo        : '',
            finished    : '',
            todoArray   : null,
            arcArray    : null,
            setUID      : function(UID){
                console.log("setUID");
                this.base = this.firebaseURL + 'users/' + UID + "/";
                this.todo = this.base + "todo/";
                this.finished = this.base + "finished/";
            },
            $TODOArray  : function() {
                if (this.todoArray === null) this.todoArray = $firebase(new Firebase(this.todo)).$asArray();
                return this.todoArray;
            },
            $ARCArray   : function(){
                if (this.arcArray === null) this.arcArray = $firebase(new Firebase(this.finished)).$asArray();
                return this.arcArray;
            },
            $firebaseRef: function(){
                console.log(this.firebaseURL);
                return new Firebase(this.firebaseURL);
            }
        };
    })
    // factory for communication between front page and background.js
    .factory('$message', function($URL){
        return {
            $signin: function($location, $scope, uid){
                chrome.runtime.sendMessage({
                        type: "signin",
                        data: {uid: uid}
                    }, function(res){
                        $URL.setUID(uid);
                        gotoUrl($location, $scope, '/list');
                    }
                )

            }
        }
    })
    // factory for presenting error/warning message
    .factory('$error', function(){
        return {
           $loginError: function(error){
               if (error.code === "INVALID_EMAIL"){
                   console.log(error);
                   $('#email').val('').attr('placeholder', error.message);
               }else if (error.code === "INVALID_PASSWORD"){
                   $('#password').val('').attr('placeholder', error.message);
               }
           }
        }
    })
    .factory('$fbPatch', function(){
        this.clearObj = function(obj){
            delete obj.$id;
            delete obj.$priority;
            delete obj.$$hashKey;
            return obj;
        };
        return this;
    })
    .controller('signinCtrl', function($scope, $URL, $location, $message, $error){
        checkSignin(function(uid) {
                $URL.setUID(uid);
                gotoUrl($location,$scope,"/list");
        });
        $scope.type = "signin";
        $scope.submit = function(){
            var login = $scope.user;
            $URL.$firebaseRef().authWithPassword(login, function(error, authData) {
                if (error === null){
                    $message.$signin($location, $scope, authData.uid);
                }else{
                    $error.$loginError(error);
                }
            }, {
                remember: "sessionOnly"
            });
        };
    })
    .controller('signupCtrl', function($scope, $URL, $location, $message, $error){
        $scope.type = "signup";

        $scope.submit = function(){
            var login = $scope.user;
            $URL.$firebaseRef().createUser(login, function(error, authData) {
                if (error === null){
                    $message.$signin($location, $scope, authData.uid);
                }else{
                    $error.$loginError(error);
                }
            }, {
                remember: "sessionOnly"
            });
        };

    })
    .controller('ListCtrl', function($scope, $URL, $fbPatch, $location) {
        $scope.tabs = [
            { title:'Dynamic Title 1', content:'Dynamic content 1' },
            { title:'Dynamic Title 2', content:'Dynamic content 2', disabled: true }
        ];

        $scope.alertMe = function() {
            setTimeout(function() {
                alert('You\'ve selected the alert tab!');
            });
        };
        $TODO = $URL.$TODOArray();
        $scope.todoProjects = $TODO;
        $scope.archivedProjects = $URL.$ARCArray();
        $scope.showType = "TODO";
        $scope.archive = function() {
            angular.forEach($scope.todoProjects, function(project, key) {
                if (project.done){
                    var p = $TODO.$getRecord(project.$id);
                    $URL.$TODOArray().$remove(p).then(function(data){
                        $URL.$ARCArray().$add($fbPatch.clearObj(project)).then(function(data) {
                        });
                    });
                }
            });
        };
        $scope.remaining = function() {
            var count = 0;
            angular.forEach($scope.todoProjects, function(project) {
                count += project.done ? 0 : 1;
            });
            return count;
        };
        $scope.updateDone = function(project){
//            var item = $TODO.$getRecord( project.$id );
//            item.done = project.done;
//            $TODO.$save(item);
            //$Pro.update(project.$id, {done: project.done});
        };
    })

    .controller('CreateCtrl', function($scope, $location, $URL) {
        $scope.importances = importances;
        $scope.project = {importance: default_importance};

        $scope.save = function() {
            $scope.project.done = false;
            $URL.$TODOArray().$add($scope.project).then(function(data) {
                $location.path('/list');
            });
        };
    })

    .controller('EditCtrl', function($scope, $location, $routeParams, $URL) {
        var projectId = $routeParams.projectId,
            $TODO = $URL.$TODOArray();

        $scope.importances = importances;

        if (projectId === null){
            $scope.project = {importance: default_importance};
        }else{
            $scope.project = $TODO.$getRecord(projectId);
            var level = $scope.project.importance.level;
            $scope.project.importance = importances[level];
        }

        $scope.destroy = function() {
            $TODO.$remove($scope.project).then(function(data) {
                $location.path('/list');
            });
        };

        $scope.save = function() {
            $TODO.$save($scope.project).then(function(data) {
                $location.path('/list');
            });
        };
    });



//port.postMessage(JSON.stringify({
//    type: 'getData',
//    name: 'login'
//}));
//port.onMessage.addListener(function(msg) {
//    var data = JSON.parse(msg);
//    var login = data.result.login;
//    console.log($URL.$firebaseRef());
//    $URL.$firebaseRef().authWithPassword(login, function(error, authData) {
//        if (error === null){
//            chrome.runtime.sendMessage({
//                    type: "signin",
//                    data: {uid: authData.uid}
//                }, function(res){
//                    $URL.setUID(authData.uid);
//                    gotoUrl($location, $scope, '/list');
//                }
//            )
//        }else{
//            console.log(error);
//        }
//    }, {
//        remember: "sessionOnly"
//    });
//});
