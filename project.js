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

var app = angular.module('project', ['ngRoute', 'firebase', 'ui.bootstrap'])
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
            .when('/forgetpass', {
                controller:'forgetpassCtrl',
                templateUrl:'forgetpass.html'
            })
            .when('/message/:type', {
                controller:'messageCtrl',
                templateUrl:'message.html'
            })
            .when('/changepass', {
                controller:'changepassCtrl',
                templateUrl:'changepass.html'
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

            },
            $signout: function(){
                chrome.runtime.sendMessage({
                        type: "signout"
                    }, function(res){
                        console.log(res)
                    }
                )
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
    .factory('$jieauth', function($URL, $location, $message){
        return {
            $signin: function($scope){
                $URL.$firebaseRef().authWithPassword($scope.user, function(error, authData) {
                    if (error === null){
                        $message.$signin($location, $scope, authData.uid);
                    }else{
                        $scope.error = error
                        $scope.$apply();
                    }
                }, {
                    remember: "sessionOnly"
                });
            },
            $signout: function(){
                $URL.$firebaseRef().unauth();
                $message.$signout();
                $location.path('/');
            }
        }
    })
    .controller('messageCtrl', function($routeParams, $scope){
        var type2Mes = {
            passResetEmailSent: 'Password reset email sent successfully!',
            passChanged: "Password changed successfully"

        };
        $scope.message = type2Mes[$routeParams.type];
    })
    .controller('changepassCtrl', function($scope, $location, $URL){
        $scope.submit = function(){
            $URL.$firebaseRef().changePassword($scope.user, function(error) {
                if (error === null) {
                    gotoUrl($location, $scope, '/message/passChanged');
                } else {
                    $scope.error = error;
                    $scope.apply();
                }
            });

        }
    })
    .controller('forgetpassCtrl', function($scope, $URL, $location){
        $scope.sent = false;
        $scope.submit = function(){
            $URL.$firebaseRef().resetPassword($scope.user, function(error) {
                if (error === null) {
                    gotoUrl($location, $scope, '/message/passResetEmailSent');
                } else {
                    $scope.error = error;
                    $scope.$apply();
                }
            });

        }
    })
    .controller('signinCtrl', function($scope, $URL, $location, $jieauth){
        checkSignin(function(uid) {
                $URL.setUID(uid);
                gotoUrl($location,$scope,"/list");
        });
        $scope.type = "signin";
        $scope.submit = function(){
            $jieauth.$signin($scope);
        };
    })
    .controller('signupCtrl', function($scope, $URL, $jieauth){
        $scope.type = "signup";

        $scope.submit = function(){
            var login = $scope.user;
            $URL.$firebaseRef().createUser(login, function(error) {
                if (error === null){
                    $jieauth.$signin($scope);
                }else{
                    $scope.error = error;
                    $scope.$apply();
                }
            });
        };

    })
    .controller('ListCtrl', function($scope, $URL, $fbPatch, $sharedService) {
        $TODO =$URL.$TODOArray();
        $scope.todoProjects =  $TODO;
        $scope.archivedProjects = $URL.$ARCArray();
        $scope.showType = "TODO";
        $scope.$on('setFilterWord', function() {
            $scope.search = $sharedService.filterWord;
        });
        $scope.archive = function() {
            var archivedIds = [];
            angular.forEach($scope.todoProjects, function(todoP, key) {
                if (todoP.done)
                    archivedIds.push(todoP.$id);
            });
            angular.forEach(archivedIds, function(id, key) {
                var p = $TODO.$getRecord(id);
                $scope.todoProjects.$remove(p).then(function(data){
                    $URL.$ARCArray().$add($fbPatch.clearObj(project)).then(function(data) {
                        console.log(data);
                    });
                });
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

app.factory('$sharedService', function($rootScope){
    return{
        filterWord: '',
        broadcastFilterStr: function(word){
            this.filterWord = word;
            $rootScope.$broadcast('setFilterWord');
        }
    }
});
app.controller('appCtrl', function($scope, $jieauth, $sharedService){
    $scope.signout = function(){
        $jieauth.$signout();
    }
    $scope.filter = function(){
        $sharedService.broadcastFilterStr($scope.filterWord);
    }
})

app.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });
                event.preventDefault();
            }
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

