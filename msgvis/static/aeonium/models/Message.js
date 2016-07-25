(function () {
    'use strict';

    var module = angular.module('Aeonium.models');

    //A service for message
    module.factory('Aeonium.models.Message', [
        '$http', 'djangoUrl', '$rootScope',
        'Aeonium.models.Code',
        function messageFactory($http, djangoUrl, $rootScope, Code) {

            var Message = function () {
                var self = this;
                self.allMessages = [];
                self.userCodedMessages = [];
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
            //	features: Feature[];
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

            angular.extend(Message.prototype, {
                getAllMessages: function(){
                    var self = this;

                    // TODO: this needs all messages, not just coded ones
                    var apiUrl = djangoUrl.reverse('all_coded_messages');

                    var request = {
                        params: {
                            stage: use_current_stage || undefined
                        }
                    };

                    return $http.get(apiUrl, request)
                        .success(function (data) {
                            self.all_coded_messages = data.map(function(d){ return self.format_tweet_item(d);});

                            // compute code distribution
                            self.normalized_code_distribution = {};
                            self.code_distribution = {};
                            self.all_coded_messages.forEach(function (item){
                               if (self.code_distribution[item.user_code.text] == undefined){
                                   self.code_distribution[item.user_code.text] = 0;
                               }

                                self.code_distribution[item.user_code.text]++;
                            });

                            for (var key in self.code_distribution){
                                self.normalized_code_distribution[key] = self.code_distribution[key] / self.all_coded_messages.length;
                            }

                            $rootScope.$broadcast("messages::load_all_coded_messages", data);
                        });

                },

                // source: string
                getCodedMessages: function(source){
                    var self = this;
                    var param = {};
                    var source = source || "user";
                    //if (source != "master")
                    //    param.stage = "current";

                    var apiUrl = djangoUrl.reverse('code_messages', param);


                    var request = {
                        params: {
                            code: code.code_id,
                            source: source
                        }
                    };

                    return $http.get(apiUrl, request)
                        .success(function (data) {
                            self.coded_messages[source][code.code_text] = data.assignments.map(function(d){ return self.format_tweet_item(d);});
                            $rootScope.$broadcast("messages::load_coded_messages", self.coded_messages);
                        });


                },

                // message: Message
                getMessageDetail: function (message) {
                    var self = this;

                    var request = {
                        message_id: message_id || Progress.current_message_id,
                        params: {
                            source: source || "user"
                        }
                    };

                    var apiUrl = djangoUrl.reverse('vector', request);

                    return $http.get(apiUrl, request)
                        .success(function (data) {
                            self.current_message = self.format_tweet_item(data);
                        });

                },


                format_tweet_item: function(messageData) {
                    var self = this;

                    var text = messageData.message.text;
                    //var characters = text.split("");
                    var characters = Array.from(text);
                    var tokens = messageData.message.tokens;
                    var filtered_tokens = messageData.message.lemmatized_tokens;
                    var feature_vector = messageData.feature_vector;

                    var tokenItems = [];
                    var charToToken = [];
                    var filteredToFull = new Map(); // Mapping between filtered token id to full token id
                    var fullToFiltered = new Map(); // Mapping between full token id to filtered token id

                    var lowerText = text.toLowerCase();
                    var currentIndex = 0;
                    var currentFilteredIndex = 0;
                    for (var i = 0; i < tokens.length; i++) {
                        var token = tokens[i];

                        // Find the character indices of the token
                        if (token != null && token.length > 0) {
                            var foundIndex = lowerText.substr(currentIndex).indexOf(token) + currentIndex;

                            var tokenItem = {
                                text: token,
                                index: i
                            };

                            currentIndex = foundIndex;
                            tokenItem.startIndex = currentIndex;
                            currentIndex += token.length - 1;
                            tokenItem.endIndex = currentIndex;

                            tokenItems.push(tokenItem);

                            for (var j = tokenItem.startIndex; j <= tokenItem.endIndex; j++) {
                                charToToken[j] = i;
                            }
                        }

                        // Find the mapping between the token index and filtered token index
                        if (token.toLowerCase() == filtered_tokens[currentFilteredIndex].toLowerCase()) {
                            filteredToFull.set(currentFilteredIndex, i);
                            fullToFiltered.set(i, currentFilteredIndex);
                            currentFilteredIndex++;
                        }
                    }

                    messageData.message.filteredToFull = filteredToFull;
                    messageData.message.fullToFiltered = fullToFiltered;

                    // Extract token level features
                    var features = [];
                    if (feature_vector && feature_vector.length > 0){
                        for (i = 0; i < messageData.feature_vector.length; i++) {
                            var feature = messageData.feature_vector[i];
                            var code_id = feature.origin_code_id;

                            var matchedTokenIndices = self.match_feature(messageData.message, feature);

                            // TODO: For now, treat all as non-continuous token features
                            matchedTokenIndices.forEach(function (tokenIndex) {
                                var tokenItem = tokenItems[tokenIndex];
                                features.push({
                                    startCharIndex: tokenItem.startIndex,
                                    endCharIndex: tokenItem.endIndex,
                                    codeIndex: code_id
                                });
                            });
                        }
                    }

                    return angular.extend(messageData, {
                        // id: messageData.message.id,
                        // text: text,
                        characters: characters,
                        charToToken: charToToken,
                        tokens: tokenItems,
                        is_ambiguous: (messageData.is_ambiguous || false),
                        is_saved: (messageData.is_saved || false),
                        is_example: (messageData.is_example || false),
                        active_features: features,
                        // Interaction states
                        hoveredCharStart: -1,
                        hoveredCharEnd: -1,
                        clickStartTokenItem: undefined,
                        selectedTokens: undefined,
                        selectedTokenIndices: new Map(),
                    });
                },
                submit: function (code_id) {
                    var self = this;
                    var apiUrl = djangoUrl.reverse('assignment', {message_id: self.current_message.message.id});

                    var request = {
                        code: code_id,
                        is_example: self.current_message.is_example,
                        is_ambiguous: self.current_message.is_ambiguous,
                        is_saved: self.current_message.is_saved
                    };


                    return $http.post(apiUrl, request)
                        .success(function (data) {
                            self.last_message = data;
                        });

                },
                update_code: function (original_item, code_id) {
                    var self = this;
                    var apiUrl = djangoUrl.reverse('assignment', {message_id: original_item.message.id});

                    // TODO: instead of setting all of them to be false, maybe taking flags from previous ones?
                    var request = {
                        code: code_id,
                        is_example: false,
                        is_ambiguous: false,
                        is_saved: false
                    };


                    return $http.put(apiUrl, request)
                        .success(function (new_item) {
                            //self.last_message = data;
                            new_item = self.format_tweet_item(new_item);
                            // TODO: the data should be another assignment and need to use that for updating the interface
                            if (Progress.current_status == 'R') {

                                // Remove the original item from list and add the new item

                                // Update the code distribution
                                if (self.code_distribution[new_item.user_code.text] == undefined) {
                                    self.code_distribution[new_item.user_code.text] = 0;
                                }
                                self.code_distribution[new_item.user_code.text]++;
                                self.code_distribution[original_item.user_code.text]--;

                                for (var key in self.code_distribution) {
                                    if (self.code_distribution.hasOwnProperty(key)) {
                                        self.normalized_code_distribution[key] = self.code_distribution[key];
                                        self.normalized_code_distribution[key] /= self.all_coded_messages.length;
                                    }
                                }

                                // Update pairwise comparison
                                Code.update_pairwise(original_item.user_code.text,
                                    new_item.user_code.text,
                                    new_item.partner_code.text);

                            }
                        });

                },
                update_flags: function (item) {
                    var self = this;
                    var apiUrl = djangoUrl.reverse('assignment', {message_id: item.message.id});

                    var request = {
                        code: item.code,
                        is_example: item.is_example,
                        is_ambiguous: item.is_ambiguous,
                        is_saved: item.is_saved
                    };


                    return $http.put(apiUrl, request)
                        .success(function (data) {
                            console.log("Update flags", data);
                        });

                },
                update_disagreement_indicator: function(message_id, type){
                    var self = this;
                    var apiUrl = djangoUrl.reverse('disagreement', {message_id: message_id});

                    var request = {
                        type: type
                    };


                    return $http.put(apiUrl, request)
                        .success(function (data) {
                            console.log("Update disagreement indicator", data);
                        });
                },
                load_coded_messages: function(code, source){
                    var self = this;
                    var param = {};
                    var source = source || "user";
                    //if (source != "master")
                    //    param.stage = "current";

                    var apiUrl = djangoUrl.reverse('code_messages', param);


                    var request = {
                        params: {
                            code: code.code_id,
                            source: source
                        }
                    };

                    return $http.get(apiUrl, request)
                        .success(function (data) {
                            self.coded_messages[source][code.code_text] = data.assignments.map(function(d){ return self.format_tweet_item(d);});
                            $rootScope.$broadcast("messages::load_coded_messages", self.coded_messages);
                        });


                },
                load_all_coded_messages: function(use_current_stage){
                    var self = this;


                    var apiUrl = djangoUrl.reverse('all_coded_messages');

                    var request = {
                        params: {
                            stage: use_current_stage || undefined
                        }
                    };

                    return $http.get(apiUrl, request)
                        .success(function (data) {
                            self.all_coded_messages = data.map(function(d){ return self.format_tweet_item(d);});

                            // compute code distribution
                            self.normalized_code_distribution = {};
                            self.code_distribution = {};
                            self.all_coded_messages.forEach(function (item){
                               if (self.code_distribution[item.user_code.text] == undefined){
                                   self.code_distribution[item.user_code.text] = 0;
                               }

                                self.code_distribution[item.user_code.text]++;
                            });

                            for (var key in self.code_distribution){
                                self.normalized_code_distribution[key] = self.code_distribution[key] / self.all_coded_messages.length;
                            }

                            $rootScope.$broadcast("messages::load_all_coded_messages", data);
                        });

                },
                // Searches the tokens for the given feature and returns the matched token indices
                match_feature: function(message, feature) {
                    var matchedTokenIndices = [];
                    var featureText = feature.text ? feature.text : feature.feature_text;

                    // If it's a user feature, split it on '&' and search within lemmatized_tokens
                    if (feature.source == "user" || feature.source == "partner") {
                        var ngrams = featureText.toLowerCase().split("&").filter(Boolean);

                        // iterate and search for tokens
                        var iNgram = 0;

                        var tempIndices = [];
                        for (var i = 0; i < message.lemmatized_tokens.length; i++) {
                            var tokenText = message.lemmatized_tokens[i].toLowerCase();
                            if (tokenText == ngrams[iNgram]) {
                                tempIndices.push(i);
                                iNgram++;

                                if (iNgram == ngrams.length) {
                                    matchedTokenIndices = tempIndices;
                                    break;
                                }
                            }
                        }
                    }
                    // If it's a system feature, split it on '&' and '_' and search within filtered_tokens
                    else if (feature.source == "system") {
                        var separators = ['\\\_', '\\\&'];
                        var ngrams = featureText.split(new RegExp(separators.join('|'), 'g')).filter(Boolean);

                        // iterate and search for tokens
                        var iNgram = 0;

                        var tempIndices = [];
                        for (var i = 0; i < message.filtered_tokens.length; i++) {
                            var tokenText = message.filtered_tokens[i].toLowerCase();
                            if (tokenText == ngrams[iNgram]) {
                                tempIndices.push(message.filteredToFull.get(i));
                                iNgram++;

                                if (iNgram == ngrams.length) {
                                    matchedTokenIndices = tempIndices;
                                    break;
                                }
                            }
                        }
                    }

                    return matchedTokenIndices;
                },
                // Searches the full message text for the given search text and returns a boolean
                match_text: function(message, searchText) {
                    if (searchText && searchText.length > 0) {

                        // Search the text in the full text
                        var charIndex = message.text.toLowerCase().search(searchText.toLowerCase());

                        if (charIndex != -1) {
                            return true;
                        }
                    }

                    return false;
                }
            });

            return new Message();
        }
    ]);
})();
