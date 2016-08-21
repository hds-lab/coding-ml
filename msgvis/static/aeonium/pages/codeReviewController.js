(function () {
    'use strict';

    var module = angular.module('Aeonium.controllers');

    var CodeReviewController = function ($scope, $timeout, Code, Message, Feature, History, Utils, Style, usSpinnerService) {

        // codeId and codeDefinition will be passed into this controller by its parent

        // Helpers
        $scope.Style = Style;
        $scope.Utils = Utils;

        /////////////////////////
        ////// View states //////
        /////////////////////////

        // Edit code definition
        $scope.editedCodeDefinitionText = undefined; // string
        $scope.showSaveCodeDefinition = false; // boolean

        // Code distribution

        // Messages
        $scope.codedMessages = []; // Message[]

        // Keywords
        $scope.userKeywords = []; // Feature[]
        $scope.systemKeywords = []; // Feature[]
        $scope.partnerKeywords = []; // Feature[]

        $scope.showExistingKeyword = false;
        $scope.showExistingKeywordInMessage = false;
        $scope.existingKeyword = undefined; // Feature
        $scope.keywordToAdd = undefined; // Feature

        // Confusion pairs
        $scope.pairwiseComparisons = []; // PairwiseComparison[]
        $scope.selectedPair = undefined; // PairwiseComparison

        // Search
        $scope.searchModel = {value: undefined, keyword: undefined};

        ////////////////////////////
        ////// Event Handlers //////
        ////////////////////////////
        $scope.$on('Message::userCodedMessages::loading', function ($event, codeId) {
            if (codeId == $scope.codeDefinition.codeId) {
                usSpinnerService.spin('code-detail-spinner');
            }
        });

        $scope.$on('Message::userCodedMessages::loaded', function ($event, codeId, messages) {
            if (codeId == $scope.codeDefinition.codeId) {
                $scope.codedMessages = messages; // MessageDetail[]
                usSpinnerService.stop('code-detail-spinner');
            }
        });

        $scope.$on('Code::codeDefinitions::updating', function ($event, codeId) {
            if (codeId == $scope.codeDefinition.codeId) {
                usSpinnerService.spin('code-detail-spinner');
            }
        });

        $scope.$on('Code::codeDefinitions::updated', function ($event, codeId, codeDefinition) {
            if (codeId == $scope.codeDefinition.codeId) {
                usSpinnerService.stop('code-detail-spinner');
                $scope.showSaveCodeDefinition = false;
            }
        });

        $scope.$on('Feature::allFeatures::loading', function ($event) {
            usSpinnerService.spin('code-detail-spinner');
        });

        $scope.$on('Feature::allFeatures::loaded', function ($event, systemFeatures, userFeatures, partnerFeatures) {
            var filterFeatures = function (feature) {
                var distribution = feature.distribution[$scope.codeDefinition.codeId];

                return distribution && distribution.count > 0;
            };

            $scope.systemKeywords = systemFeatures.filter(filterFeatures);
            $scope.userKeywords = userFeatures.filter(filterFeatures);
            $scope.partnerKeywords = partnerFeatures.filter(filterFeatures);
        });

        $scope.$on('Code::pairwiseComparison::loading', function ($event) {
            usSpinnerService.spin('code-detail-spinner');
        });

        $scope.$on('Code::pairwiseComparison::loaded', function ($event, pairwiseComparisons) {
            usSpinnerService.stop('code-detail-spinner');
            $scope.pairwiseComparisons = pairwiseComparisons.filter(function (comparison) {
                return comparison.userCodeId == $scope.codeDefinition.codeId;
            });
        });

        $scope.$on('Feature::removeFeature::removing', function ($event) {
            usSpinnerService.spin('code-detail-spinner');
        });

        $scope.$on('Feature::removeFeature::removed', function ($event, removedFeature) {
            usSpinnerService.stop('code-detail-spinner');
            Message.getCodedMessages($scope.codeDefinition.codeId);

            var index = $scope.userKeywords.indexOf(removedFeature);
            if (index >= 0) {
                $scope.userKeywords.splice(index, 1);
            }

            if ($scope.keywordToAdd) {
                Feature.addFeature($scope.keywordToAdd.tokens, $scope.keywordToAdd.messageId);
                $scope.keywordToAdd = undefined;
            }
        });

        $scope.$on('Feature::addFeature::adding', function ($event) {
            usSpinnerService.spin('code-detail-spinner');
        });

        $scope.$on('Feature::addFeature::added', function ($event, addedFeature) {
            usSpinnerService.stop('code-detail-spinner');
            Message.getCodedMessages($scope.codeDefinition.codeId);
            var distribution = addedFeature.distribution[$scope.codeDefinition.codeId];

            if (distribution && distribution.count > 0) {
                $scope.userKeywords.unshift(addedFeature);
            }

            $scope.showExistingKeyword = false;
            $scope.showExistingKeywordInMessage = false;
            $scope.existingKeyword = undefined;
            $scope.keywordToAdd = undefined;
        });

        ////////////////////////////////
        ////// Controller methods //////
        ////////////////////////////////
        $scope.initializeController = function () {
            // features and pairwise comparisons will be loaded by parent
            Message.getCodedMessages($scope.codeDefinition.codeId);
        };

        $scope.hasDefinitionChanged = function () {
            return !Utils.stringEquals($scope.editedCodeDefinitionText, $scope.codeDefinition.userDescription.text);
        };

        $scope.saveDefinition = function () {
            $scope.codeDefinition.userDescription.text = $scope.editedCodeDefinitionText;
            Code.updateDefinition($scope.codeDefinition, $scope.editedCodeDefinitionText);
        };

        $scope.resetDefinition = function () {
            $scope.$scope.editedCodeDefinitionText = $scope.codeDefinition.userDescription.text;
            $scope.showSaveCodeDefinition = false;
        };

        $scope.finishEditingDefinition = function () {
            if ($scope.hasDefinitionChanged()) {
                History.add_record("definition:finishEditing:handle-unsaved-definition", {code: code});
                $scope.showSaveCodeDefinition = true;
            }
            else {
                History.add_record("definition:finishEditing:end", {code: code});
                $scope.showSaveCodeDefinition = false;
            }
        };

        $scope.addSearchKeyword = function (feature) {
            $scope.searchModel.keyword = feature;
        };

        $scope.removeSearchKeyword = function () {
            $scope.searchModel.keyword = null;
        };

        $scope.addFeature = function (message) { // MessageDetail
            if (message && message.selectedTokens && message.selectedTokens.length > 0) {
                History.add_record("addFeature", {item: message});
                var tokens = [];
                // selectedTokenIndices are ordered by the tokens added, not by their index
                var tokenIndices = [];
                message.selectedTokenIndices.forEach(function (value, key) {
                    tokenIndices.push(key);
                });

                tokenIndices.sort(function (a, b) {
                    return a - b;
                }).forEach(function (tokenIndex) {
                    tokens.push(message.filteredTokens[tokenIndex]);
                });

                // Check if the feature already exists.
                var newKeyword = tokens.join("&");
                var existingKeywords = $scope.userKeywords.filter(function (feature) {
                    return feature.text == newKeyword;
                });

                var existingMessageKeywords = $scope.userKeywords.filter(function (feature) {
                    return feature.messageId == message.id;
                });

                $scope.showExistingKeyword = existingKeywords.length > 0;
                $scope.showExistingKeywordInMessage = !$scope.showExistingKeyword && existingMessageKeywords.length > 0;

                $scope.existingKeyword = $scope.showExistingKeyword ? existingKeywords[0] :
                    ($scope.showExistingKeywordInMessage ? existingMessageKeywords[0] : undefined);

                $scope.keywordToAdd = {
                    tokens: tokens,
                    messageId: message.id,
                    text: newKeyword
                };

                if (!$scope.showExistingKeyword && !$scope.showExistingKeywordInMessage) {
                    Feature.addFeature(tokens, message.id);

                    message.clickStartTokenItem = undefined;
                }
            }
        };

        $scope.removeFeature = function (feature, $event) { // Feature
            if ($event) {
                $event.preventDefault();
                $event.stopPropagation();
            }

            if (feature) {
                History.add_record("removeFeature", {feature: feature});
                Feature.removeFeature(feature);
            }
        };

        $scope.replaceFeature = function () {
            // Remove then add the feature in the callback
            if ($scope.existingKeyword) {
                $scope.removeFeature($scope.existingKeyword);

                $scope.showExistingKeyword = false;
                $scope.showExistingKeywordInMessage = false;
                $scope.existingKeyword = undefined;
            }
        };

        $scope.selectConfusionPair = function (pair) {
            if ($scope.selectedPair == pair) {
                History.add_record("selectConfusion:deselect", {pair: pair});
                $scope.selectedPair = undefined;
            }
            else {
                History.add_record("selectConfusion:select", {pair: pair});
                $scope.selectedPair = pair;
            }
        };

        $scope.filterMessagesByConfusion = function (message) { // MessageDetail
            if (message) {
                var selected = !$scope.selectedPair || (message.label == $scope.selectedPair.userCodeId && message.partnerLabel == confusion.partnerCodeId);

                var matched = false;
                if ($scope.searchModel.keyword) {
                    matched = Utils.canMatchFeature(message, $scope.searchModel.keyword);
                }
                else {
                    matched = Utils.canMatchText(message, $scope.searchModel.value);
                }

                return matched && selected;
            }
        };

        $scope.initializeController();
    };

    CodeReviewController.$inject = [
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

    module.controller('Aeonium.controllers.CodeReviewController', CodeReviewController);

})();
