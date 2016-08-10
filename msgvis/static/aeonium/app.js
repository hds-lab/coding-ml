/**
 * Top level module for dimension application.
 */
(function () {
    'use strict';

    angular.module('Aeonium.bootstrap', []);

    // Declare app level module which depends on other modules
    var app = angular
        .module('Aeonium', [
            'Aeonium.controllers',
            'ngCookies',
            'ngDragDrop',
            'ngAnimate',
            'ngRoute'
        ]);

    // Routing
    app.config(function($routeProvider) {
        $routeProvider
            .when('/', {
                        templateUrl : 'static/aeonium/pages/home.html',
                        controller  : 'HomeController'
                        })
            .when('/coding', {
                        templateUrl : 'static/aeonium/pages/coding.html',
                        controller  : 'CodingController'
                        })
            .when('/review', {
                        templateUrl : 'static/aeonium/pages/review.html',
                        controller  : 'ReviewController'
                        })
            .when('/export', {
                        templateUrl : 'static/aeonium/pages/export.html',
                        controller  : 'ExportController'
                        })
            .otherwise({redirectTo: '/'});
    });

    //Fix CSRF
    //http://django-angular.readthedocs.org/en/latest/csrf-protection.html
    app.run(['$http', '$cookies', function ($http, $cookies) {
        $http.defaults.headers.common['X-CSRFToken'] = $cookies.csrftoken;
        $http.defaults.headers.post['X-CSRFToken'] = $cookies.csrftoken;
        $http.defaults.headers.put['X-CSRFToken'] = $cookies.csrftoken;
    }]);

    // Testing
    app.controller('HomeController', function($scope) {
        $scope.message = 'Hello from HomeController';
    });

    app.controller('CodingController', function($scope) {
        $scope.message = 'Hello from CodingController';
    });

    app.controller('ReviewController', function($scope) {
        $scope.message = 'Hello from ReviewController';
    });

    app.controller('ExportController', function($scope) {
        $scope.message = 'Hello from ExportController';
    });


})();
