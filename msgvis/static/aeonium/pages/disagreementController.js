(function () {
    'use strict';

    var module = angular.module('Aeonium.controllers');

    var DisagreementController = function ($scope, $timeout, Partner, Code, Message, Feature, History, Utils, Style, usSpinnerService) {
        //1. get all messages and list on the left
        //2. click on a message from the left list to show in the middle
        //3. select a label and show details on the right

        // Helpers
        $scope.Style = Style;

        // View states
        $scope.allMessages = []; // Message[]
        $scope.userCodedMessages = {}; // Map<number, MessageDetail[]> keyed by codeId

        // Selected message
        $scope.selectedMessage = undefined; // Message
        $scope.selectedMessageDetail = undefined; // MessageDetail
        $scope.selectedMediaUrl = undefined; // string
        $scope.codeDefinitions = undefined; // Map<number, CodeDefinition>
        $scope.selectedCodeDefinition = undefined; // CodeDefinition
        $scope.selectedMessageComments = []; // Comment[]
        $scope.selectedCodeKeywords = undefined;

        // List view
        $scope.showExpandedListView = false;

        // Comment
        $scope.selectedMessageComment = undefined; // string
        $scope.showSaveComment = false; // boolean
        $scope.nextMessageOnSaveComment = undefined; // Message

        // Keywords
        $scope.userKeywords = undefined; // Feature[]
        $scope.systemKeywords = undefined; // Feature[]
        $scope.partnerKeywords = undefined; // Feature[]

        // Filter
        $scope.FILTER_ALL = 0;
        $scope.FILTER_EXAMPLE = 1;
        $scope.FILTER_SAVED = 2;
        $scope.FILTER_AMBIGUOUS = 3;

        $scope.availableFilters = {};
        $scope.availableFilters[$scope.FILTER_ALL] = 'All';
        $scope.availableFilters[$scope.FILTER_EXAMPLE] = 'Example';
        $scope.availableFilters[$scope.FILTER_SAVED] = 'Saved';
        $scope.availableFilters[$scope.FILTER_AMBIGUOUS] = 'Ambiguous';

        $scope.selectedFilter = $scope.FILTER_ALL;

        // Search
        $scope.searchModel = {value: undefined, keyword: undefined};

        // Handle events
        $scope.$on('Partner::getPartners::loading', function ($event) {
            usSpinnerService.spin('page-spinner');
        });
        $scope.$on('Partner::selectedPartner', function ($event, partner) {
            usSpinnerService.stop('page-spinner');

            if (partner != null) {
                Code.loadCodeDefinitions(partner.username);
            }
        });

        $scope.$on('Message::allMessages::loading', function ($event) {
            usSpinnerService.spin('list-view-spinner');
        });

        $scope.$on('Message::allMessages::loaded', function ($event, messages) {
            $scope.allMessages = messages; // Message[]
            usSpinnerService.stop('list-view-spinner');

            $scope.getNextMessageToLabel();
            //class Message {
            //	id: number;
            //	label: number;
            //	source: string;
            //	isAmbiguous: boolean;
            //	isSaved: boolean;
            //	isExample: boolean;
            //}
        });

        $scope.$on('Message::userCodedMessages::loading', function ($event) {
            usSpinnerService.spin('code-detail-view-spinner');
        });

        $scope.$on('Message::userCodedMessages::loaded', function ($event, codeId, messages) {
            $scope.userCodedMessages[codeId] = messages; // MessageDetail[]
            usSpinnerService.stop('code-detail-view-spinner');
        });

        $scope.$on('Message::messageDetail::loading', function ($event, messageDetail) {
            usSpinnerService.spin('labeling-view-spinner');
        });

        $scope.$on('Message::messageDetail::loaded', function ($event, messageDetail) {
            usSpinnerService.stop('labeling-view-spinner');
            if ($scope.selectedMessage.id == messageDetail.id) {
                $scope.selectedMessageDetail = messageDetail;
                $scope.selectedMessageComment = "";

                // If the message is already labeled, select the code
                if (messageDetail.label >= 0 && $scope.codeDefinitions[messageDetail.label]) {
                    $scope.selectedCodeDefinition = $scope.codeDefinitions[messageDetail.label];
                    $scope.selectedCodeKeywords = {
                        systemKeywords: $scope.getKeywordsForSelectedCode($scope.systemKeywords),
                        myKeywords: $scope.getKeywordsForSelectedCode($scope.userKeywords),
                        partnerKeywords: $scope.getKeywordsForSelectedCode($scope.partnerKeywords)
                    };
                }
                else {
                    $scope.selectedCodeDefinition = undefined;
                    $scope.selectedCodeKeywords = undefined;
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
                $scope.selectedMessageComments = [];

                $scope.getNextMessageToLabel();
            }
        });

        $scope.$on('Message::getComments::loaded', function ($event, messageId, comments) {
            if ($scope.selectedMessage && $scope.selectedMessage.id == messageId) {
                $scope.selectedMessageComments = comments;
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

            Message.getAllMessages(Partner.selectedPartner.username);
            Feature.getAllFeatures(Partner.selectedPartner.username);

            for (var codeId in codeDefinitions) {
                $scope.userCodedMessages[codeId] = [];
                Message.getCodedMessages(codeId, Partner.selectedPartner.username);
            }
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
            Partner.getPartners();
        };

        $scope.viewMessageDetail = function (message) {
            // Check to see if there's unsaved comment
            if ($scope.enableCommentSave()) {
                $scope.showSaveComment = true;
                $scope.nextMessageOnSaveComment = message;
            }
            else {
                $scope.selectedMessage = message;
                $scope.selectedMessageDetail = null;
                $scope.selectedMessageComment = null;

                Message.getMessageDetail(message, Partner.selectedPartner.username);
                Message.getComments(message);
            }
        };

        $scope.openMedia = function (mediaUrl) {
            History.add_record("selectMedia", {media_url: mediaUrl});
            $scope.selectedMediaUrl = mediaUrl;
        };

        $scope.selectCode = function (codeDefinition) {
            History.add_record("selectLabel", {code: codeDefinition});
            $scope.selectedCodeDefinition = codeDefinition;
            $scope.selectedCodeKeywords = {
                systemKeywords: $scope.getKeywordsForSelectedCode($scope.systemKeywords),
                myKeywords: $scope.getKeywordsForSelectedCode($scope.userKeywords),
                partnerKeywords: $scope.getKeywordsForSelectedCode($scope.partnerKeywords)
            };
        };

        $scope.submitLabel = function () {
            $scope.selectedMessageDetail.label = $scope.selectedCodeDefinition.codeId;
            Message.submitLabel($scope.selectedMessageDetail);
        };

        $scope.enableCommentSave = function () {
            return $scope.selectedMessage && !Utils.stringEquals($scope.selectedMessageComment, $scope.selectedMessage.comment);
        };

        $scope.saveMessageComment = function () {
            Message.saveComment($scope.selectedMessage, $scope.selectedMessageComment);

        };

        $scope.resetMessageComment = function () {
            $scope.selectedMessageComment = null;
            $scope.showSaveComment = false;

            if ($scope.nextMessageOnSaveComment) {
                $scope.viewMessageDetail($scope.nextMessageOnSaveComment);
                $scope.nextMessageOnSaveComment = null;
            }
        };

        $scope.getKeywordsForSelectedCode = function (features) {
            if ($scope.selectedCodeDefinition && features) {
                return features.filter(function (feature) {
                    return feature.distribution[$scope.selectedCodeDefinition.codeId].count > 0;
                });
            }

            return [];
        };

        $scope.getUserMessages = function () {
            if ($scope.selectedCodeDefinition) {
                return $scope.userCodedMessages[$scope.selectedCodeDefinition.codeId];
            }
            else {
                return [];
            }
        };

        $scope.getFilteredUserMessages = function () {
            return $scope.getUserMessages().filter($scope.filterMessages());
        };

        $scope.addSearchKeyword = function (feature) {
            $scope.searchModel.keyword = feature;
        };

        $scope.removeSearchKeyword = function () {
            $scope.searchModel.keyword = null;
        };

        $scope.selectFilter = function (filterId) {
            $scope.selectedFilter = +filterId;
        };

        $scope.filterMessages = function () {
            return function (message) {
                var filter = $scope.selectedFilter;

                // Apply filters
                var flagged = false;
                switch (filter) {
                    case $scope.FILTER_ALL:
                        flagged = true;
                        break;
                    case $scope.FILTER_EXAMPLE:
                        flagged = message.isExample;
                        break;
                    case $scope.FILTER_SAVED:
                        flagged = message.isSaved;
                        break;
                    case $scope.FILTER_AMBIGUOUS:
                        flagged = message.isAmbiguous;
                        break;
                }

                var matched = false;
                if ($scope.searchModel.keyword) {
                    matched = Utils.canMatchFeature(message, $scope.searchModel.keyword);
                }
                else {
                    matched = Utils.canMatchText(message, $scope.searchModel.value);
                }

                return matched && flagged;
            }
        };

        $scope.getNextMessageToLabel = function () {
            if ($scope.allMessages) {
                var uncodedMessages = $scope.allMessages.filter(function (message) {
                    return message.label == Utils.UNCODED_CODE_ID;
                });

                if (uncodedMessages.length > 0) {
                    $scope.viewMessageDetail(uncodedMessages[0]);
                }
            }
        };

        $scope.initializeController();
    };

    DisagreementController.$inject = [
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

    module.directive('disagreementInterface', function disagreementInterface() {
        return {
            scope: {
            },
            controller: DisagreementController,
            templateUrl: 'static/aeonium/pages/disagreement.html'
        }
    });

})();
