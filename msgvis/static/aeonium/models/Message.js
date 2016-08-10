(function () {
    'use strict';

    var module = angular.module('Aeonium.models');

    //A service for message
    module.factory('Aeonium.models.Message', [
        '$http', 'djangoUrl', '$rootScope',
        'Aeonium.models.Code', 'Aeonium.models.Utils',
        function messageFactory($http, djangoUrl, $rootScope, Code, Utils) {

            var Message = function () {
                var self = this;
                self.allMessages = []; // Message[]
                self.userCodedMessages = []; // Message[]
            };

            //class Message {
            //	id: number;
            //	label: number;
            //	source: string;
            //	isAmbiguous: boolean;
            //	isSaved: boolean;
            //	isExample: boolean;
            //}

            //class MessageDetail extends MessageData {
            //  mediaUrl: string;
            //	text: string;
            //	tokens: string[];
            //	filteredToFull: Map<number, number>;
            //	fullToFiltered: Map<number, number>;
            //	featureHighlights: FeatureHighlight[];
            //	characters: string[];
            //	charToToken: Map<number, number>;
            //
            //	// interaction
            //  hoveredCharStart: number;
            //  hoveredCharEnd: number;
            //  clickStartTokenItem: Token;
            //  selectedTokens: Token[];
            //  selectedTokenIndices: Map<number, number>;
            //}

            //class FeatureHighlight {
            //	startCharIndex: number;
            //	endCharIndex: number;
            //	codeIndex: number;
            //}


            angular.extend(Message.prototype, {
                getAllMessages: function () {
                    var self = this;

                    // TODO: this needs all messages, not just coded ones
                    var apiUrl = djangoUrl.reverse('all_coded_messages');

                    var request = {
                        params: {
                            stage: undefined
                        }
                    };

                    $rootScope.$broadcast("Message::allMessages::loading");
                    return $http.get(apiUrl, request)
                        .success(function (data) {
                            self.allMessages = data.map(function (d) {
                                return {
                                    id: d.message.id,
                                    label: d.code,
                                    source: d.source,
                                    isAmbiguous: d.is_ambiguous,
                                    isSaved: d.is_saved,
                                    isExample: d.is_example
                                };
                            });

                            $rootScope.$broadcast("Message::allMessages::loaded", self.allMessages);
                        });

                },

                // code: Code
                getCodedMessages: function (code) {
                    var self = this;
                    var param = {};
                    var source = "user";
                    //if (source != "master")
                    //    param.stage = "current";

                    var apiUrl = djangoUrl.reverse('code_messages', param);


                    var request = {
                        params: {
                            code: code.codeId,
                            source: source
                        }
                    };

                    $rootScope.$broadcast("Message::userCodedMessages::loading", code);
                    return $http.get(apiUrl, request)
                        .success(function (data) {
                            self.userCodedMessages[code.name] = data.assignments.map(function (d) {
                                return Utils.extractMessageDetail(d);
                            });
                            $rootScope.$broadcast("Message::userCodedMessages::loaded", self.userCodedMessages);
                        });

                },

                // message: Message
                getMessageDetail: function (message) {
                    var self = this;

                    var request = {
                        message_id: message.id,
                        params: {
                            source: "user"
                        }
                    };

                    var apiUrl = djangoUrl.reverse('vector', request);

                    $rootScope.$broadcast("Message::messageDetail::loading");
                    return $http.get(apiUrl, request)
                        .success(function (data) {
                            // Label information is in Message, and message detail only contains text info
                            var messageDetail = Utils.extractMessageDetail(data);
                            angular.extend(messageDetail, message);
                            $rootScope.$broadcast("Message::messageDetail::loaded", messageDetail);
                        });

                },

                // message: Message
                submitLabel: function (message) {
                    var self = this;
                    var apiUrl = djangoUrl.reverse('assignment', {message_id: message.id});

                    var request = {
                        code: message.label,
                        is_example: message.isExample,
                        is_ambiguous: message.isAmbiguous,
                        is_saved: message.isSaved
                    };

                    $rootScope.$broadcast("Message::submitLabel::submitting");
                    return $http.post(apiUrl, request)
                        .success(function (data) {
                            self.allMessages.filter(function(m) { return m.id == message.id; })
                                .forEach(function(m) {
                                    m.label = message.label;
                                    m.isExample = message.isExample;
                                    m.isAmbiguous = message.isAmbiguous;
                                    m.isSaved = message.isSaved;
                                });

                            $rootScope.$broadcast("Message::submitLabel::submitted", message);
                        });

                }
            });

            return new Message();
        }
    ]);
})();
