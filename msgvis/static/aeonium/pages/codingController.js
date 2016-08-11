(function () {
    'use strict';

    var module = angular.module('Aeonium.controllers');

    var CodingController = function ($scope, $timeout, Dictionary, Code, Message, Feature, History, Utils, Style, usSpinnerService) {
//1. get all messages and list on the left
//2. click on a message from the left list to show in the middle
//3. select a label and show details on the right

        // Helpers
        $scope.Style = Style;

        // View states
        $scope.allMessages = []; // Message[]

        // Selected message
        $scope.selectedMessage = undefined; // Message
        $scope.selectedMessageDetail = undefined; // MessageDetail
        $scope.selectedMediaUrl = undefined; // string
        $scope.codeDefinitions = undefined; // Map<number, CodeDefinition>
        $scope.selectedCodeDefinition = undefined; // CodeDefinition

        // Comment
        $scope.selectedMessageComment = undefined; // string
        $scope.showSaveComment = false; // boolean
        $scope.nextMessageOnSaveComment = undefined; // Message

        // Keywords
        $scope.userKeywords = undefined; // Feature[]
        $scope.systemKeywords = undefined; // Feature[]
        $scope.partnerKeywords= undefined; // Feature[]

        $scope.spinnerOptions = {
            radius: 20,
            width: 6,
            length: 10,
            color: "#000000"
        };

        // Handle events
        $scope.$on('Message::allMessages::loading', function ($event) {
            usSpinnerService.spin('list-view-spinner');
        });

        $scope.$on('Message::allMessages::loaded', function ($event, messages) {
            $scope.allMessages = messages; // Message[]
            usSpinnerService.stop('list-view-spinner');

            //class Message {
            //	id: number;
            //	label: number;
            //	source: string;
            //	isAmbiguous: boolean;
            //	isSaved: boolean;
            //	isExample: boolean;
            //}
        });

        $scope.$on('Message::messageDetail::loading', function ($event, messageDetail) {
            usSpinnerService.spin('labeling-view-spinner');
        });

        $scope.$on('Message::messageDetail::loaded', function ($event, messageDetail) {
            usSpinnerService.stop('labeling-view-spinner');
            if ($scope.selectedMessage.id == messageDetail.id) {
                $scope.selectedMessageDetail = messageDetail;
                $scope.selectedMessageComment = messageDetail.comment;

                // If the message is already labeled, select the code
                if (messageDetail.label >= 0 && $scope.codeDefinitions[messageDetail.label]) {
                    $scope.selectedCodeDefinition = $scope.codeDefinitions[messageDetail.label];
                }
                else {
                    $scope.selectedCodeDefinition = undefined;
                }
            }
        });

        $scope.$on('Message::submitLabel::submitting', function ($event) {
            usSpinnerService.spin('labeling-view-spinner');
            History.add_record("submitLabel:request-start", {});
        });

        $scope.$on('Message::submitLabel::submitted', function ($event, message) {
            usSpinnerService.stop('labeling-view-spinner');
            History.add_record("submitLabel:request-end", {});
            if ($scope.selectedMessage.id == message.id) {
                $scope.selectedMessageDetail = null;
                $scope.selectedMessage = null;
            }
        });

        $scope.$on('Message::saveComment::saving', function ($event) {
            usSpinnerService.spin('labeling-view-spinner');
            History.add_record("saveComment:request-start", {});
            $scope.showSaveComment = false;
        });

        $scope.$on('Message::saveComment::saved', function ($event, message) {
            usSpinnerService.stop('labeling-view-spinner');
            History.add_record("saveComment:request-end", {});
            $scope.showSaveComment = false;

            if ($scope.nextMessageOnSaveComment) {
                $scope.viewMessageDetail($scope.nextMessageOnSaveComment);
                $scope.nextMessageOnSaveComment = null;
            }
        });

        $scope.$on('Code::codeDefinitions::loading', function ($event) {
            usSpinnerService.spin('code-detail-view-spinner');
            usSpinnerService.spin('page-spinner');
        });

        $scope.$on('Code::codeDefinitions::loaded', function ($event, codeDefinitions) {
            $scope.codeDefinitions = codeDefinitions;
            usSpinnerService.stop('code-detail-view-spinner');
            usSpinnerService.stop('page-spinner');

            Message.getAllMessages();
            Feature.getAllFeatures();
        });

        $scope.$on('Feature::allFeatures::loading', function ($event) {
        });

        $scope.$on('Feature::allFeatures::loaded', function ($event, systemFeatures, userFeatures, partnerFeatures) {
            $scope.systemKeywords = systemFeatures;
            $scope.userKeywords = userFeatures;
            $scope.partnerKeywords = partnerFeatures;
        });

        // View methods
        $scope.initializeController = function () {
            Code.loadCodeDefinitions();
        };

        $scope.viewMessageDetail = function (message) {
            if (!$scope.selectedMessage || $scope.selectedMessage.id != message.id) {

                // Check to see if there's unsaved comment
                if ($scope.enableCommentSave()) {
                    $scope.showSaveComment = true;
                    $scope.nextMessageOnSaveComment = message;
                }
                else {
                    $scope.selectedMessage = message;
                    $scope.selectedMessageDetail = null;
                    $scope.selectedMessageComment = null;

                    Message.getMessageDetail(message);
                }
            }
        };

        $scope.openMedia = function (mediaUrl) {
            History.add_record("selectMedia", {media_url: mediaUrl});
            $scope.selectedMediaUrl = mediaUrl;
        };

        $scope.selectCode = function (codeDefinition) {
            History.add_record("selectLabel", {code: codeDefinition});
            $scope.selectedCodeDefinition = codeDefinition;
        };

        $scope.submitLabel = function () {
            $scope.selectedMessageDetail.label = $scope.selectedCodeDefinition.codeId;
            Message.submitLabel($scope.selectedMessageDetail);
        };

        $scope.enableCommentSave = function () {
            return $scope.selectedMessage && !Utils.stringEquals($scope.selectedMessageComment, $scope.selectedMessage.comment);
        };

        $scope.saveMessageComment = function () {
            $scope.selectedMessage.comment = $scope.selectedMessageComment;
            Message.saveComment($scope.selectedMessage);

        };

        $scope.resetMessageComment = function () {
            $scope.selectedMessageComment = null;
            $scope.showSaveComment = false;

            if ($scope.nextMessageOnSaveComment) {
                $scope.viewMessageDetail($scope.nextMessageOnSaveComment);
                $scope.nextMessageOnSaveComment = null;
            }
        };

        $scope.getKeywordsForSelectedCode = function(features){
            if ($scope.selectedCodeDefinition && features){
                return features.filter(function(feature) {
                    return feature.distribution[$scope.selectedCodeDefinition.codeId].count > 0;
                });
            }

            return [];
        };

        $scope.initializeController();
    };

    CodingController.$inject = [
        '$scope',
        '$timeout',
        'Aeonium.services.Dictionary',
        'Aeonium.models.Code',
        'Aeonium.models.Message',
        'Aeonium.models.Feature',
        'Aeonium.services.ActionHistory',
        'Aeonium.models.Utils',
        'Aeonium.models.Style',
        'usSpinnerService'
    ];

    module.controller('Aeonium.controllers.CodingController', CodingController);

})();
