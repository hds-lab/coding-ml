(function () {
    'use strict';

    var module = angular.module('Aeonium.components');

    var LabelerController = function ($scope, Style) {

        $scope.Style = Style;

        $scope.selectCode = function (codeDefinition) {
            $scope.onCodeSelected({codeDefinition: codeDefinition});
        };

        $scope.submitLabel = function () {
            $scope.onSubmit();
        };

        $scope.openMedia = function (mediaUrl) {
            $scope.onOpenMedia({mediaUrl: mediaUrl});
        }
    };

    LabelerController.$inject = [
        '$scope',
        'Aeonium.models.Style'
    ];

    module.directive('labeler', function labeler() {
        return {
            scope: {
                codeDefinitions: '=codeDefinitions',
                selectedCodeDefinition: '=selectedCodeDefinition',
                messageDetail: '=messageDetail',
                onCodeSelected: '&onCodeSelected',
                onSubmit: '&onSubmit',
                onOpenMedia: '&onOpenMedia'
            },
            controller: LabelerController,
            templateUrl: 'static/aeonium/components/labeler.html'
        };
    });

})();