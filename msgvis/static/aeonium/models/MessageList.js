(function () {
    'use strict';

    var module = angular.module('Aeonium.models');

    //A service for message
    module.factory('Aeonium.models.MessageList', [
        '$http', 'djangoUrl', '$rootScope',
        'Aeonium.models.Message',
        function messageListFactory($http, djangoUrl, $rootScope, Message) {

            var MessageList = function () {
                var self = this;
                self.listCache = {};
                self.listCache.time = {};
                self.listCache.last_updated = {};
                self.listCache.ambiguity = {};
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

            angular.extend(MessageList.prototype, {
                getList: function(order_by, page){
                    var self = this;
                    var apiUrl = djangoUrl.reverse('list');

                    var request = {
                        params: {
                            order_by: order_by || "time",
                            page: page || 1
                        }
                    };
                    if (self.listCache[order_by].hasOwnProperty(page)){
                        // TODO return and trigger broadcast event


                    }


                    return $http.get(apiUrl, request)
                        .success(function (data) {
                            // TODO update cache

                            $rootScope.$broadcast("list::getList", data);
                        });

                },

                // code: Code
                getCodedMessages: function(code){
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

                    return $http.get(apiUrl, request)
                        .success(function (data) {
                            self.userCodedMessages[code.name] = data.assignments.map(function(d){ return Utils.extractMessageDetail(d);});
                            $rootScope.$broadcast("messages::userCodedMessages::" + code.name, self.userCodedMessages);
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

                    return $http.get(apiUrl, request)
                        .success(function (data) {
                            var messageDetail = Utils.extractMessageDetail(data);
                            $rootScope.$broadcast("messages::messageDetail::" + message.id, messageDetail);
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


                    return $http.post(apiUrl, request)
                        .success(function (data) {
                            $rootScope.$broadcast("messages::submitLabel::" + message.id, message);
                        });

                },
            });

            return new Message();
        }
    ]);
})();
