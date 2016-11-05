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
                self.userCodedMessages = {}; // Map<number, MessageDetail[]> keyed by codeId
            };

            //class Message {
            //	id: number;
            //	label: number;
            //	source: string;
            //	isAmbiguous: boolean;
            //	isSaved: boolean;
            //	isExample: boolean;
            //	comment: text;
            //  html: string;
            //  mediaUrl: string;
            //	text: string;
            //  time: Date;
            //}

            //class MessageDetail extends MessageData {
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
                // partnerUserName: string
                getAllMessages: function (partnerUserName) {
                    var self = this;

                    // TODO: this needs all messages, not just coded ones
                    var apiUrl = djangoUrl.reverse('all_coded_messages');

                    var request = {
                        params: {
                            stage: undefined,
                            partner: partnerUserName
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
                                    isExample: d.is_example,
                                    html: d.message.embedded_html,
                                    mediaUrl: d.message.media_url,
                                    text: d.message.text,
                                    time: Date.parse(d.message.time),

                                    // TODO (jinsuh): Get the real ambiguity score and partner label
                                    ambiguityScore: Math.random(),
                                    partnerLabel: Math.floor(Math.random() * 3)
                                };
                            });

                            // TODO (jinsuh): Need to get timestamp from service. Is the timestamp the time it was labeled or time the message was created?
                            // TODO (jinsuh): Add a bunch of unlabeled items

                            self.allMessages.sort(Utils.sortMessageByTime);
                            var minTime = self.allMessages[0].time;
                            var maxTime = self.allMessages[self.allMessages.length - 1].time;

                            var size = self.allMessages.length;
                            for (var i = 0; i < size; i++) {
                                self.allMessages.push({
                                    id: 123 + i,
                                    label: Utils.UNCODED_CODE_ID,
                                    source: null,
                                    isAmbiguous: false,
                                    isSaved: false,
                                    isExample: false,
                                    html: "testing",
                                    mediaUrl: null,
                                    text: "testing",
                                    time: Utils.getRandomNumber(minTime, maxTime),

                                    // TODO (jinsuh): Get the real ambiguity score and partner label
                                    ambiguityScore: Math.random(),
                                    partnerLabel: Math.floor(Math.random() * 3)
                                });
                            }

                            self.allMessages.sort(Utils.sortMessageByTime);

                            $rootScope.$broadcast("Message::allMessages::loaded", self.allMessages);
                        });

                },

                // partnerUserName: string
                // codeId: number
                getCodedMessages: function (codeId, partnerUserName) {
                    var self = this;
                    var param = {};
                    var source = "user";
                    //if (source != "master")
                    //    param.stage = "current";

                    var apiUrl = djangoUrl.reverse('code_messages', param);


                    var request = {
                        params: {
                            code: codeId,
                            source: source,
                            partner: partnerUserName
                        }
                    };

                    $rootScope.$broadcast("Message::userCodedMessages::loading", codeId);
                    return $http.get(apiUrl, request)
                        .success(function (data) {
                            self.userCodedMessages[codeId] = data.assignments.map(function (d) {
                                return Utils.extractMessageDetail(d);
                            });
                            $rootScope.$broadcast("Message::userCodedMessages::loaded", codeId, self.userCodedMessages[codeId]);
                        });

                },

                // partnerUserName: string
                // message: Message
                getMessageDetail: function (message, partnerUserName) {
                    var self = this;

                    var request = {
                        message_id: message.id,
                        params: {
                            source: "user",
                            partner: partnerUserName
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
                            self.allMessages.filter(function (m) {
                                    return m.id == message.id;
                                })
                                .forEach(function (m) {
                                    m.label = message.label;
                                    m.isExample = message.isExample;
                                    m.isAmbiguous = message.isAmbiguous;
                                    m.isSaved = message.isSaved;
                                });

                            $rootScope.$broadcast("Message::submitLabel::submitted", message);
                        });
                },

                saveComment: function (message) {
                    // TODO
                    $rootScope.$broadcast("Message::saveComment::saving");
                    setTimeout(function () {
                        $rootScope.$broadcast("Message::saveComment::saved", message);
                    }, 500);
                }
            });

            return new Message();
        }
    ]);
})();
