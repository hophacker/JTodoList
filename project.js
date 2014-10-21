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
    {level:3, name:'Extreme' }
],  default_importance = importances[1];

angular.module('project', ['ngRoute', 'firebase'])

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
            setUID      : function(UID){
                this.base = this.firebaseURL + 'users/' + UID + "/";
                this.todo = this.base + "todo/";
                this.finished = this.base + "finished/";
            },
            $TODOArray  : function() {
                console.log(this.todo);
                return $firebase(new Firebase(this.todo)).$asArray();
            },
            $FINArray   : function(){
                console.log(this.finished);
                return $firebase(new Firebase(this.finished)).$asArray();
            },
            $firebaseRef: function(){
                return new Firebase(this.firebaseURL);
            }
        }
    })
    .factory('$fbPatch', function(){
        this.clearObj = function(obj){
            delete obj.$id
            delete obj.$priority
            delete obj.$$hashKey
            return obj;
        }
        return this;
    })
    .config(function($routeProvider) {
        $routeProvider
            .when('/list', {
                controller:'ListCtrl',
                templateUrl:'list.html'
            })
            .when('/', {
                controller: 'LoginCtrl',
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
    .controller('LoginCtrl', function($scope, $URL, $location){
        port.postMessage(JSON.stringify({
            type: 'getData',
            name: 'login'
        }));
        port.onMessage.addListener(function(msg) {
            data = JSON.parse(msg);
            login = data.result.login;
            console.log(login);
            $URL.$firebaseRef().authWithPassword(login, function(error, authData) {
                console.log(error);
                console.log(authData);
                if (error !== null){
                }else{
                    $URL.setUID(authData.uid);
                    console.log($URL.$FINArray())
                    $location.path('/list');
                }
            }, {
                remember: "sessionOnly"
            });
        });

        $scope.submit = function(){
            port.postMessage(JSON.stringify({
                type: 'setData',
                data: {
                    login: $scope.user
                }
            }));
            port.onMessage.addListener(function(msg) {
                console.log(msg);
            });
        }
    })

    .controller('ListCtrl', function($scope, $URL, $fbPatch, $location) {
        $scope.projects = $URL.$TODOArray();
        $scope.showType = "TODO";
        $scope.archive = function() {
            angular.forEach($scope.projects, function(project, key) {
                if (project.done){
                    $scope.projects.$remove(key).then(function(data){
                        $URL.$FINArray().$add($fbPatch.clearObj(project)).then(function(data) {
                        });
                    })
                }
            });
        };
        $scope.showFinished = function(){
            $scope.projects = $URL.$FINArray();
            $scope.showType = "FIN";
        }

        $scope.showTodo = function(){
            $scope.projects = $URL.$TODOArray;
            $scope.showType = "TODO";
        }

        $scope.remaining = function() {
            var count = 0;
            angular.forEach($scope.projects, function(project) {
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
            showType = $routeParams.showType,
            projectIndex;

        switch(showType){
            case "TODO":
                $scope.projects = $URL.$TODOArray();
                break;
            case "FIN":
                $scope.projects = $URL.$FINArray();
                break;
            default:
        }
        $scope.importances = importances;

        if (projectId === null){
            $scope.project = {importance: default_importance};
        }else{
            projectIndex = $scope.projects.$indexFor(projectId);
            $scope.project = $scope.projects[projectIndex];
            var level = $scope.project.importance.level;
            $scope.project.importance = importances[level];
        }

        $scope.destroy = function() {
            $scope.projects.$remove($scope.project).then(function(data) {
                $location.path('/list');
            });
        };

        $scope.save = function() {
            $scope.projects.$save($scope.project).then(function(data) {
                $location.path('/list');
            });
        };
    });

/*.factory("simpleLogin", ["$firebaseSimpleLogin", 'URL', function($firebaseSimpleLogin, URL) {
 console.log(URL);
 var ref = new Firebase(URL);
 return $firebaseSimpleLogin(ref);
 }])
 // and use it in our controller
 .controller("SampleCtrl", ["$scope", "simpleLogin", function($scope, simpleLogin) {
 $scope.auth = simpleLogin;
 }]);*/
