(function () {
    'use strict';

    var module = angular.module('Aeonium.components');

    var KeywordsController = function ($scope, Style) {
        $scope.Style = Style;
    };

    KeywordsController.$inject = [
        '$scope',
        'Aeonium.models.Style'
    ];

    module.directive('keywords', function keywords() {
        return {
            scope: {
                codeName: '=codeName',
                codeDefinitions: '=codeDefinitions',
                systemKeywords: '=systemKeywords',
                myKeywords: '=myKeywords',
                partnerKeywords: '=partnerKeywords'
            },
            controller: KeywordsController,
            templateUrl: 'static/aeonium/components/keywords.html'
        };
    });

})();