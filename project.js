/*global Firebase: true */
/*
 project {
 state:  [0:newly created, 1:done, 2:archieved]
 }
 */
var importances = [
    {level:0, name:'Low'     },
    {level:1, name:'Medium'  },
    {level:2, name:'High'    },
    {level:3, name:'Extreme' }
],  default_importance = importances[1];
var firebaseURL = 'https://boiling-heat-52.firebaseio.com/',
    username = 'hophacker/',
    base = firebaseURL + username;

angular.module('project', ['ngRoute', 'firebase'])

    .config( [ '$compileProvider', function( $compileProvider ) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
        // Angular before v1.2 uses $compileProvider.urlSanitizationWhitelist(...)
    }])

    .value('URL', {
        firebaseURL: firebaseURL,
        base: base,
        todo: base + 'todo/',
        finished: base + 'finished/'
    })
    .factory('$TODO', function($firebase, URL) {
        return $firebase(new Firebase(URL.todo))
    })
    .factory('$FIN', function($firebase, URL) {
        return $firebase(new Firebase(URL.finished))
    })
    .factory('$TODOArray', function($firebase, URL) {
        return $firebase(new Firebase(URL.todo)).$asArray()
    })
    .factory('$FINArray', function($firebase, URL) {
        return $firebase(new Firebase(URL.finished)).$asArray()
    })
    .factory('$firebaseRef', function($firebase, URL){
        return new Firebase(URL.firebaseURL)
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
            .when('/', {
                controller:'ListCtrl',
                templateUrl:'list.html'
            })
            .when('/login', {
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
    .controller('LoginCtrl', function($scope, $firebaseRef){
        $scope.submit = function(){
            console.log($scope.user);
            $firebaseRef.createUser($scope.user, function(error) {
                if (error === null) {
                    console.log("User created successfully");
                } else {
                    console.log("Error creating user:", error);
                }
            });
        }
    })

    .controller('ListCtrl', function($scope, $TODOArray, $FINArray, $fbPatch, $location) {
        $location.path('/login');
        $scope.projects = $TODOArray;
        $scope.showType = "TODO";
        $scope.archive = function() {
            angular.forEach($scope.projects, function(project, key) {
                if (project.done){
                    $scope.projects.$remove(key).then(function(data){
                        $FINArray.$add($fbPatch.clearObj(project)).then(function(data) {
                        });
                    })
                }
            });
        };
        $scope.showFinished = function(){
            $scope.projects = $FINArray;
            $scope.showType = "FIN";
        }

        $scope.showTodo = function(){
            $scope.projects = $TODOArray;
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

    .controller('CreateCtrl', function($scope, $location, $timeout, $TODOArray) {
        $scope.importances = importances;
        $scope.project = {importance: default_importance};

        $scope.save = function() {
            $scope.project.done = false;
            $TODOArray.$add($scope.project).then(function(data) {
                $location.path('/');
            });
        };
    })

    .controller('EditCtrl', function($scope, $location, $routeParams, $TODOArray, $FINArray) {
        var projectId = $routeParams.projectId,
            showType = $routeParams.showType,
            projectIndex;

        switch(showType){
            case "TODO":
                $scope.projects = $TODOArray;
                break;
            case "FIN":
                $scope.projects = $FINArray;
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
                $location.path('/');
            });
        };

        $scope.save = function() {
            $scope.projects.$save($scope.project).then(function(data) {
                $location.path('/');
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
