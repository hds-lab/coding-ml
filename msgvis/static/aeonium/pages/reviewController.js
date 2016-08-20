(function () {
    'use strict';

    var module = angular.module('Aeonium.controllers');

    var ReviewController = function ($scope, $timeout, Code, Message, Feature, History, Utils, Style, usSpinnerService) {

        // Helpers
        $scope.Style = Style;

        /////////////////////////
        ////// View states //////
        /////////////////////////

        // Code definitions
        $scope.codeDefinitions = []; //CodeDefinition[]
        $scope.selectedCodeDefinition = undefined; // CodeDefinition

        // Distribution
        $scope.totalItemCount = 0;
        $scope.codeDistribution = {}; // Map<number, number>
        $scope.normalizedCodeDistribution = {}; // Map<number, number>

        ////////////////////////////
        ////// Event Handlers //////
        ////////////////////////////


        $scope.$on('Message::allMessages::loading', function ($event) {
            usSpinnerService.spin('page-spinner');
        });

        $scope.$on('Message::allMessages::loaded', function ($event, messages) {
            // Bin the messages per code and normalize
            $scope.totalItemCount = messages.length;

            $scope.codeDefinitions.forEach(function(codeDefinition) {
                $scope.codeDistribution[codeDefinition.codeId] = messages.filter(function (message) {
                    return message.label == codeDefinition.codeId;
                }).length;
                $scope.normalizedCodeDistribution[codeDefinition.codeId] = $scope.codeDistribution[codeDefinition.codeId] / $scope.totalItemCount;
            });

            usSpinnerService.stop('page-spinner');
        });

        $scope.$on('Code::codeDefinitions::loading', function ($event) {
            usSpinnerService.spin('page-spinner');
        });

        $scope.$on('Code::codeDefinitions::loaded', function ($event, codeDefinitions) {

            // Append the uncoded
            var codes = [];
            for (var codeId in codeDefinitions) {
                codes.push(codeDefinitions[codeId]);
            }

            codes.push({
                codeId: Utils.UNCODED_CODE_ID,
                name: Utils.UNCODED_CODE_NAME,
                masterDescription: {},
                userDescription: {},
                partnerDescription: {}
            });

            $scope.codeDefinitions = codes;
            $scope.selectedCodeDefinition = codes[0];
            usSpinnerService.stop('page-spinner');

            Feature.getAllFeatures();
            Code.getPairwiseComparison();
        });

        $scope.$on('Feature::removeFeature::removing', function ($event) {
            usSpinnerService.spin('page-spinner');
        });

        $scope.$on('Feature::removeFeature::removed', function ($event, removedFeature) {
            usSpinnerService.stop('page-spinner');
            Message.getAllMessages();
        });

        // View methods
        $scope.initializeController = function () {
            Code.loadCodeDefinitions();
            Message.getAllMessages();
        };

        $scope.selectCode = function (codeDefinition) {
            $scope.selectedCodeDefinition = codeDefinition;
        };

        $scope.initializeController();
    };

    ReviewController.$inject = [
        '$scope',
        '$timeout',
        'Aeonium.models.Code',
        'Aeonium.models.Message',
        'Aeonium.models.Feature',
        'Aeonium.services.ActionHistory',
        'Aeonium.models.Utils',
        'Aeonium.models.Style',
        'usSpinnerService'
    ];

    module.controller('Aeonium.controllers.ReviewController', ReviewController);

})();
