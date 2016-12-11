(function () {
    'use strict';

    var module = angular.module('Aeonium.controllers');

    var ReviewController = function ($scope, $timeout, Partner, Code, Message, Feature, History, Utils, Style, usSpinnerService) {

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

        $scope.$on('Partner::getPartners::loading', function ($event) {
            usSpinnerService.spin('page-spinner');
        });
        $scope.$on('Partner::selectedPartner', function ($event, partner) {
            usSpinnerService.stop('page-spinner');

            if (partner != null) {
                Code.loadCodeDefinitions(partner.username);
                Message.getAllMessages(partner.username);
            }
        });

        $scope.$on('Message::allMessages::loading', function ($event) {
            usSpinnerService.spin('page-spinner');
        });

        $scope.$on('Message::allMessages::loaded', function ($event, messages) {
            // Bin the messages per code and normalize
            $scope.totalItemCount = messages.length;

            $scope.codeDefinitions.forEach(function (codeDefinition) {
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

            Feature.getAllFeatures(Partner.selectedPartner.username);
            Code.getPairwiseComparison(Partner.selectedPartner.username);
        });

        $scope.$on('Feature::removeFeature::removing', function ($event) {
            usSpinnerService.spin('page-spinner');
        });

        $scope.$on('Feature::removeFeature::removed', function ($event, removedFeature) {
            usSpinnerService.stop('page-spinner');
            Message.getAllMessages(Partner.selectedPartner.username);
        });

        // View methods
        $scope.initializeController = function () {
            Partner.getPartners();
        };

        $scope.selectCode = function (codeDefinition) {
            $scope.selectedCodeDefinition = codeDefinition;
        };

        $scope.initializeController();
    };

    ReviewController.$inject = [
        '$scope',
        '$timeout',
        'Aeonium.models.Partner',
        'Aeonium.models.Code',
        'Aeonium.models.Message',
        'Aeonium.models.Feature',
        'Aeonium.services.ActionHistory',
        'Aeonium.models.Utils',
        'Aeonium.models.Style',
        'usSpinnerService'
    ];

    module.directive('reviewInterface', function reviewInterface() {
        return {
            scope: {
            },
            controller: ReviewController,
            templateUrl: 'static/aeonium/pages/review.html'
        }
    });
})();
