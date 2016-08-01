(function () {
    'use strict';

    var module = angular.module('Aeonium.models');

    //A service for code definition
    module.factory('Aeonium.models.Utils', [
        function utilsFactory() {
            var Utils = function () {
                var self = this;
            };

            angular.extend(Utils.prototype, {
                // messageData: any
                // returns MessageDetail
                extractMessageDetail: function(messageData) {
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

                    return {
                        id: messageData.message.id,
                        label: messageData.message.code,
                        source: messageData.source,
                        isAmbiguous: (messageData.is_ambiguous || false),
                        isSaved: (messageData.is_saved || false),
                        isExample: (messageData.is_example || false),

                        text: text,
                        tokens: tokenItems,
                        filteredTokens: filtered_tokens,
                        filteredToFull: filteredToFull,
                        fullToFiltered: fullToFiltered,
                        featureHighlights: features,
                        characters: characters,
                        charToToken: charToToken,

                        // interaction
                        hoveredCharStart: -1,
                        hoveredCharEnd: -1,
                        clickStartTokenItem: undefined,
                        selectedTokens: undefined,
                        selectedTokenIndices: new Map()
                    };
                },


                // Searches the tokens for the given feature and returns the matched token indices
                //message: MessageDetail
                canMatchFeature: function(message, feature) {
                    var matchedTokenIndices = [];
                    var featureText = feature.text;

                    // If it's a user feature, split it on '&' and search within lemmatized_tokens
                    if (feature.source == "user" || feature.source == "partner") {
                        var ngrams = featureText.toLowerCase().split("&").filter(Boolean);

                        // iterate and search for tokens
                        var iNgram = 0;

                        var tempIndices = [];
                        for (var i = 0; i < message.filteredTokens.length; i++) {
                            var tokenText = message.filteredTokens[i].toLowerCase();
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
                // message: MessageDetail
                canMatchText: function(message, searchText) {
                    if (searchText && searchText.length > 0) {

                        // Search the text in the full text
                        var charIndex = message.text.toLowerCase().search(searchText.toLowerCase());

                        if (charIndex != -1) {
                            return true;
                        }
                    }

                    return false;
                },

                // previousSortOption: number
                // returns number
                toggleSort: function (previousSortOption) {
                    return (previousSortOption + 1) % 3;
                }
            });

            return new Utils();
        }
    ]);
})();
