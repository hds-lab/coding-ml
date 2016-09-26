(function () {
    'use strict';


    var module = angular.module('Aeonium.controllers', [
        'Aeonium.services',
        'Aeonium.models',
        'angularSpinner',
        'angucomplete-alt',
        'smart-table'
    ]);

    module.config(['$interpolateProvider', function ($interpolateProvider) {
        $interpolateProvider.startSymbol('{$');
        $interpolateProvider.endSymbol('$}');
    }]);


    module.config(['usSpinnerConfigProvider', function (usSpinnerConfigProvider) {
        usSpinnerConfigProvider.setDefaults({
            color: '#111'
        });
    }]);

    var DictionaryController = function ($scope, Dictionary, Partner) {

        // Helpers
        $scope.Dictionary = Dictionary;
        $scope.partners = [];
        $scope.selectedPartner = undefined;

        // Event handlers
        $scope.$on('Partner::getPartners::loaded', function ($event, partners) {
            $scope.partners = partners;
        });

        $scope.$on('Partner::selectedPartner', function ($event, partner) {
            $scope.selectedPartner = partner;
        });

        // View methods
        $scope.initializeController = function () {
            Partner.getPartners();
        };

        $scope.selectPartner = function (partner) {
            Partner.selectPartner(partner);
        };

        $scope.initializeController();

    };

    DictionaryController.$inject = [
        '$scope',
        'Aeonium.services.Dictionary',
        'Aeonium.models.Partner'
    ];

    module.controller('Aeonium.controllers.DictionaryController', DictionaryController);


    module.directive('popover', function () {
        return function (scope, elem) {
            elem.popover({container: 'body'});
        }
    });

    module.directive('modal', function () {
        var link = function (scope, elem) {
            elem.on('hidden.bs.modal', function () {
                scope.showModal = false;
                scope.$parent.$broadcast("modal-hidden");
            });

            scope.$watch('showModal', function (newVals, oldVals) {
                if (newVals)
                    elem.modal('show');
                else
                    elem.modal('hide');
            }, false);
        };

        return {
            //Use as a tag only
            restrict: 'E',
            replace: false,

            //Directive's inner scope
            scope: {
                showModal: '=showModal'
            },
            link: link
        };
    });

})();
