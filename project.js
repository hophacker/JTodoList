/*Copyright (c) 2014 ICRL

See the file license.txt for copying permission.*/
/*global Firebase: true */
/*
 project {
 state:  [0:newly created, 1:done, 2:finhieved]
 }
 */
var port = chrome.extension.connect({name: "StorageConnection"});

var importances = [
    {value:0, text:'Low'     },
    {value:1, text:'Medium'  },
    {value:2, text:'High'    },
    {value:3, text:'Extreme' }],
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

var app = angular.module('project', ['ngRoute', 'firebase', 'ui.bootstrap', 'xeditable'])
    .run(function(editableOptions) {
        editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
    })
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
    .factory('$PROJECT', function($URL, $fbPatch){
        var  $scope =  null;
        var  $PROJECT = function($s){
            $scope =  $s;
        };
        $PROJECT.prototype = {
            getSource: function(type){
                switch(type){
                    case 'todo':
                        return $scope.todoProjects;
                    case 'finished':
                        return $scope.finishedProjects;
                    default:;
                }
            },
            finish: function (id) {
                var p = $URL.$TODOArray().$getRecord(id);
                $scope.todoProjects.$remove(p).then(function(){
                    $scope.finishedProjects.$add(p);
                })
            },
            remove: function(type, id){
                switch(type){
                    case 'todo':
                        var p = $URL.$TODOArray().$getRecord(id);
                        $scope.todoProjects.$remove(p);
                        break;
                    case 'finished':
                        var p = $URL.$FINArray().$getRecord(id);
                        $scope.finishedProjects.$remove(p);
                        break;
                    default:;
                }
            }
        }
        return $PROJECT;
    })
    .factory('$URL', function($firebase){
        return {
            firebaseURL :  'https://boiling-heat-52.firebaseio.com/',
            base        : '',
            todo        : '',
            finished    : '',
            todoArray   : null,
            finArray    : null,
            setUID      : function(UID){
                console.log("setUID");
                this.base = this.firebaseURL + 'users/' + UID + "/";
                this.todo = this.base + "todo/";
                this.finished = this.base + "finished/";
            },
            unsetUID    : function(){
                this.todoArray = null;
                this.finArray = null;
            },
            $TODOArray  : function() {
                if (this.todoArray === null) this.todoArray = $firebase(new Firebase(this.todo)).$asArray();
                return this.todoArray;
            },
            $FINArray   : function(){
                if (this.finArray === null) this.finArray = $firebase(new Firebase(this.finished)).$asArray();
                return this.finArray;
            },
            $firebaseRef: function(){
                console.log(this.firebaseURL);
                return new Firebase(this.firebaseURL);
            },
            getSource   : function(type){
                switch(type){
                    case 'todo':
                        return this.todoArray;
                        break;
                    case 'finished':
                        return this.finArray;
                        break;
                    default:;

                }

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
                $URL.unsetUID();
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
    .controller('ListCtrl', function($scope, $URL, $sharedService, $PROJECT) {
        var $project = new $PROJECT($scope);
        var defaultAddProject = {
            importance: 1
        };
        $scope.importances = importances;
        $scope.todoProjects = $URL.$TODOArray();
        $scope.finishedProjects = $URL.$FINArray();
        $scope.showType = "TODO";
        $scope.addProject = defaultAddProject;
        $scope.$on('setFilterWord', function() {
            $scope.search = $sharedService.filterWord;
        });
        $scope.finishAll = function() {
            var finishedIds = [];
            angular.forEach($scope.todoProjects, function(todoP, key) {
                if (todoP.done)
                    finishedIds.push(todoP.$id);
            });
            angular.forEach(finishedIds, function(id, key) {
                $project.finish(id);
            });
        };
        $scope.finish = function(id){
            $project.finish(id);
        };
        $scope.save = function(type, project, $data) {
            project.description = $data.description;
            project.importance = $data.importance;
            console.log(project);
            var projects = $project.getSource(type);
            projects.$save(project);
//            if (project.$id) projects.$save(project);
//            else projects.$save($data);
        };
        $scope.addTodoProject = function() {
            $scope.todoProjects.$add($scope.addProject);
            $scope.addProject.description = "";
        };

        $scope.remaining = function() {
            var count = 0;
            angular.forEach($scope.todoProjects, function(project) {
                count += project.done ? 0 : 1;
            });
            return count;
        };
        $scope.remove = function(type, id) {
            var sou = $project.getSource(type),
                project = sou.$getRecord(id);
            sou.$remove(project);
        };
        $scope.updateDone = function(project){
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

//            angular.extend(project, {'$id': $id})
