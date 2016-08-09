(function () {
    'use strict';

    var module = angular.module('Aeonium.controllers');

    var CodingController = function ($scope, $timeout, Dictionary, Code, Message, Feature, History, Style, usSpinnerService) {
//1. get all messages and list on the left
//2. click on a message from the left list to show in the middle
//3. select a label and show details on the right

        // Helpers
        $scope.Style = Style;

        // View states
        $scope.allMessages = []; // Message[]
        $scope.selectedMessage = undefined; // Message
        $scope.selectedMessageDetail = undefined; // MessageDetail
        $scope.selectedMediaUrl = undefined; // string
        $scope.codeDefinitions = undefined; // Map<number, CodeDefinition>
        $scope.selectedCodeDefinition = undefined; // CodeDefinition

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
            if ($scope.selectedMessage.id == messageDetail.id){
                $scope.selectedMessageDetail = messageDetail;

                // If the message is already labeled, select the code
                if (messageDetail.label >= 0 && $scope.codeDefinitions[messageDetail.label]){
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
            if ($scope.selectedMessage.id == message.id){
                $scope.selectedMessageDetail = null;
                $scope.selectedMessage = null;
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
        });

        // View methods
        $scope.initializeController = function() {
            Message.getAllMessages();
            Code.loadCodeDefinitions();
        };

        $scope.viewMessageDetail = function (message) {
            if (!$scope.selectedMessage || $scope.selectedMessage.id != message.id) {
                $scope.selectedMessage = message;
                $scope.selectedMessageDetail = null;

                Message.getMessageDetail(message);
            }
        };

        $scope.openMedia = function(mediaUrl){
            History.add_record("selectMedia", {media_url: mediaUrl});
            $scope.selectedMediaUrl = mediaUrl;
        };

        $scope.selectCode = function(codeDefinition) {
            History.add_record("selectLabel", {code: codeDefinition});
            $scope.selectedCodeDefinition = codeDefinition;
        };

        $scope.submitLabel = function() {
            $scope.selectedMessageDetail.label = $scope.selectedCodeDefinition.codeId;
            Message.submitLabel($scope.selectedMessageDetail);
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
        'Aeonium.models.Style',
        'usSpinnerService'
    ];

    module.controller('Aeonium.controllers.CodingController', CodingController);

})();
