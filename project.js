/*global Firebase: true */
/*
project {
    state:  [0:newly created, 1:done, 2:archieved]
}
*/
angular.module('project', ['ngRoute', 'firebase'])

.value('fbURL', 'https://boiling-heat-52.firebaseio.com/')

.factory('$Projects', function($firebase, fbURL) {
    return $firebase(new Firebase(fbURL)).$asArray();
})
.config(function($routeProvider) {
    $routeProvider
    .when('/', {
        controller:'ListCtrl',
        templateUrl:'list.html'
    })
    .when('/edit/:projectId', {
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

.controller('ListCtrl', function($scope, $Projects) {
    $scope.projects = $Projects;
    $scope.archive = function() {
      var oldProjects = $scope.projects;
      $scope.projects = [];
      angular.forEach(oldProjects, function(project) {
        if (!project.done) $scope.projects.push(project);
      });
    };

    $scope.remaining = function() {
      var count = 0;
      angular.forEach($scope.projects, function(project) {
        count += project.done ? 0 : 1;
      });
      return count;
    };
    $scope.updateDone = function(project){
        console.log($Projects);
        var item = $Projects.$getRecord( project.$id );
        item.done = project.done;
        $Projects.$save(item);
        //$Pro.update(project.$id, {done: project.done});
    };
})

.controller('CreateCtrl', function($scope, $location, $timeout, $Projects) {
    $scope.importances = [
        {name:'Extreme',    level:4},
        {name:'High',       level:3},
        {name:'Medium',     level:2},
        {name:'Low',        level:1}
    ];

    $scope.project = {importance: $scope.importances[2]};

    $scope.save = function() {
        console.log($Projects);
        $scope.project.done = false;
        $Projects.$add($scope.project).then(function(data) {
            $location.path('/');
        });
    };
})

.controller('EditCtrl',
            function($scope, $location, $routeParams, $Projects) {
                var projectId = $routeParams.projectId,
                projectIndex;

                $scope.projects = $Projects;
                projectIndex = $scope.projects.$indexFor(projectId);
                $scope.project = $scope.projects[projectIndex];

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
