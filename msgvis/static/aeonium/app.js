/**
 * Top level module for dimension application.
 */
(function () {
    'use strict';

    angular.module('Aeonium.bootstrap', []);
    angular.module('Aeonium.components', []);

    // Declare app level module which depends on other modules
    var app = angular
        .module('Aeonium', [
            'Aeonium.controllers',
            'Aeonium.charts',
            'Aeonium.components',
            'ngCookies',
            'ngDragDrop',
            'ngAnimate',
            'ngRoute'
        ]);

    //Fix CSRF
    //http://django-angular.readthedocs.org/en/latest/csrf-protection.html
    app.run(['$http', '$cookies', function ($http, $cookies) {
        $http.defaults.headers.common['X-CSRFToken'] = $cookies.csrftoken;
        $http.defaults.headers.post['X-CSRFToken'] = $cookies.csrftoken;
        $http.defaults.headers.put['X-CSRFToken'] = $cookies.csrftoken;
    }]);

    // App controller
    var AppController = function ($scope, Dictionary, Partner) {

        // Helpers
        $scope.Dictionary = Dictionary;
        $scope.partners = [];
        $scope.selectedPartner = undefined;
        $scope.currentUser = undefined;

        $scope.CODING_INTERFACE_ID = 1;
        $scope.REVIEW_INTERFACE_ID = 2;
        $scope.FEATURE_INTERFACE_ID = 3;
        $scope.DISAGREEMENT_INTERFACE_ID = 4;

        $scope.availableInterfaces = [
            {
                name: "Coding",
                id: $scope.CODING_INTERFACE_ID
            },
            {
                name: "Review",
                id: $scope.REVIEW_INTERFACE_ID
            },
            {
                name: "Features",
                id: $scope.FEATURE_INTERFACE_ID
            },
            {
                name: "Disagreements",
                id: $scope.DISAGREEMENT_INTERFACE_ID
            }
        ];

        $scope.selectedInterfaceId = $scope.LABELING_INTERFACE_ID;

        // Event handlers
        $scope.$on('Partner::getCurrentUser::loaded', function ($event, user) {
            $scope.currentUser = user;
        });

        $scope.$on('Partner::getPartners::loaded', function ($event, partners) {
            $scope.partners = partners;
        });

        $scope.$on('Partner::selectedPartner', function ($event, partner) {
            $scope.selectedPartner = partner;
        });

        // View methods
        $scope.initializeController = function () {
            Partner.getPartners();
            Partner.getCurrentUser();
        };

        $scope.selectPartner = function (partner) {
            Partner.selectPartner(partner);
        };

        $scope.selectInterface = function(interfaceId) {
            $scope.selectedInterfaceId = interfaceId;
        };

        $scope.initializeController();

    };

    AppController.$inject = [
        '$scope',
        'Aeonium.services.Dictionary',
        'Aeonium.models.Partner'
    ];

    app.controller('Aeonium.controllers.AppController', AppController);
})();
