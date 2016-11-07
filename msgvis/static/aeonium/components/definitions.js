(function () {
    'use strict';

    var module = angular.module('Aeonium.components');

    var DefinitionsController = function ($scope) {
    };

    DefinitionsController.$inject = [
        '$scope'
    ];

    module.directive('definitions', function definitions() {
        return {
            scope: {
                codeName: '=codeName',
                masterDefinition: '=masterDefinition',
                myDefinition: '=myDefinition',
                partnerDefinition: '=partnerDefinition'
            },
            controller: DefinitionsController,
            templateUrl: 'static/aeonium/components/definitions.html'
        };
    });

})();