(function () {
    'use strict';

    var module = angular.module('Aeonium.models');

    //A service for code definition
    module.factory('Aeonium.models.Utils', [
        'Aeonium.models.Code',
        function utilsFactory(Code) {
            var Utils = function () {
                var self = this;

                self.UNCODED_CODE_ID = 9999;
                self.UNCODED_CODE_NAME = "Uncoded";
            };

            angular.extend(Utils.prototype, {
                // messageData: any
                // returns MessageDetail
                extractMessageDetail: function (messageData) {
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

                    var messageDetail = {
                        id: messageData.message.id,
                        label: messageData.code,
                        partnerLabel: messageData.partner_code ? messageData.partner_code.id: -1,
                        source: messageData.source,
                        isAmbiguous: (messageData.is_ambiguous || false),
                        isSaved: (messageData.is_saved || false),
                        isExample: (messageData.is_example || false),

                        html: messageData.message.embedded_html,
                        mediaUrl: messageData.message.media_url,
                        text: text,
                        tokens: tokenItems,
                        filteredTokens: filtered_tokens,
                        filteredToFull: filteredToFull,
                        fullToFiltered: fullToFiltered,
                        featureHighlights: [],
                        characters: characters,
                        charToToken: charToToken,

                        // interaction
                        hoveredCharStart: -1,
                        hoveredCharEnd: -1,
                        clickStartTokenItem: undefined,
                        selectedTokens: undefined,
                        selectedTokenIndices: new Map()
                    };

                    // Extract token level features
                    if (feature_vector && feature_vector.length > 0) {
                        for (i = 0; i < messageData.feature_vector.length; i++) {
                            var feature = messageData.feature_vector[i];
                            var code_id = feature.origin_code_id;

                            var matchedTokenIndices = self.getMatchedTokenIndices(messageDetail, feature);

                            // TODO: For now, treat all as non-continuous token features
                            matchedTokenIndices.forEach(function (tokenIndex) {
                                var tokenItem = tokenItems[tokenIndex];
                                messageDetail.featureHighlights.push({
                                    startCharIndex: tokenItem.startIndex,
                                    endCharIndex: tokenItem.endIndex,
                                    codeIndex: code_id
                                });
                            });
                        }
                    }

                    return messageDetail;
                },

                // Searches the tokens for the given feature and returns the matched token indices
                //message: MessageDetail
                getMatchedTokenIndices: function (message, feature) {
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
                        for (var i = 0; i < message.filteredTokens.length; i++) {
                            var tokenText = message.filteredTokens[i].toLowerCase();
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

                canMatchFeature: function (message, feature) {
                    var self = this;
                    var matchedTokenIndices = self.getMatchedTokenIndices(message, feature);

                    return matchedTokenIndices && matchedTokenIndices.length > 0;
                },

                // Searches the full message text for the given search text and returns a boolean
                // message: MessageDetail
                canMatchText: function (message, searchText) {
                    if (!searchText || searchText.length == 0) {
                        return true;
                    }
                    else if (searchText && searchText.length > 0) {

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
                },

                // messageDetail: MessageDetail
                // charIndex: character index
                // returns boolean
                isTokenSelectedAtCharIndex: function (messageDetail, charIndex) {
                    if (messageDetail && messageDetail.selectedTokenIndices) {
                        var tokenIndex = messageDetail.charToToken[charIndex];
                        if (tokenIndex != undefined && messageDetail.selectedTokenIndices.get(tokenIndex) == tokenIndex) {
                            return true;
                        }
                    }

                    return false;
                },

                // string1: string
                // string2: string
                // returns boolean
                stringEquals: function (string1, string2) {
                    if (string1 == null && string2 == null) {
                        return true;
                    }
                    else if (string1 == null && string2 != null) {
                        return string2.trim().length == 0;
                    }
                    else if (string2 == null && string1 != null){
                        return string1.trim().length == 0;
                    }
                    else {
                        return string1.trim() === string2.trim();
                    }
                },

                // featureData: any
                // return Feature
                extractFeature: function (featureData) {
                    //class Feature {
                    //    id: number;
                    //    index: number;
                    //    text: string;
                    //    source: string;
                    //    distribution: Map<number, FeatureDistribution>; // keyed by codeId
                    //    totalCount: number;
                    //    entropy: number;
                    //    messageId: number;
                    //    codeId: number;
                    //}

                    //class FeatureDistribution {
                    //    distribution: number;
                    //    count: number;
                    //}

                    var distributions = {};
                    for (var prop in featureData.distribution) {
                        var codeName = prop;
                        var codeId = Code.getCodeIdFromCodeName(codeName);

                        if (codeId >= 0) {
                            distributions[codeId] = {
                                distribution: featureData.normalized_distribution[prop],
                                count: featureData.distribution[prop]
                            };
                        }
                    }

                    var item = {
                        id: featureData.feature_id,
                        index: featureData.feature_index,
                        text: featureData.feature_text,
                        source: featureData.source,
                        distribution: distributions,
                        totalCount: featureData.total_count,
                        entropy: featureData.entropy,
                        messageId: featureData.origin_message_id ? featureData.origin_message_id : -1,
                        codeId: featureData.origin_code_id ? featureData.origin_code_id : -1,
                    };

                    return item;
                }
            });

            return new Utils();
        }
    ]);
})();
