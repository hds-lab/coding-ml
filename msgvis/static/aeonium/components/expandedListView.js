(function () {
    'use strict';

    var module = angular.module('Aeonium.components');

    var ExpandedListViewController = function ($scope, Style) {
        $scope.Style = Style;
    };

    ExpandedListViewController.$inject = [
        '$scope',
        'Aeonium.models.Style'
    ];

    module.directive('expandedListView', function expandedListView() {
        return {
            scope: {
                allMessages: '=allMessages',
            },
            controller: ExpandedListViewController,
            templateUrl: 'static/aeonium/components/expandedListView.html'
        };
    });

})();