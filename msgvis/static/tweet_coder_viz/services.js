(function () {
    'use strict';

    var module = angular.module('TweetCoderViz.services', [
        'ng.django.urls',
        'TweetCoderViz.bootstrap',
        'ngSanitize'
    ]);

    module.factory('TweetCoderViz.services.Dictionary', [
        '$http', 'djangoUrl',
        'TweetCoderViz.bootstrap.dictionary',
        function datasetFactory($http, djangoUrl, dictionaryId) {
            var apiUrl = djangoUrl.reverse('dictionary');

            var Dictionary = function () {
                this.id = dictionaryId
            };

            var request = {
                params: {
                    id: dictionaryId
                }
            };
            $http.get(apiUrl, request)
                .success(function (data) {
                    angular.extend(Dictionary.prototype, data);
                });

            return new Dictionary();

        }
    ]);



    //A service for user defined features.
    module.factory('TweetCoderViz.services.Feature', [
        '$http', 'djangoUrl',
        'TweetCoderViz.services.Code',
        function scriptFactory($http, djangoUrl, Code) {

            var listApiUrl = djangoUrl.reverse('feature_list');

            var Feature = function () {
                var self = this;
                self.latest_data = undefined;
                self.distributions = {};
            };

            angular.extend(Feature.prototype, {
                load: function () {
                    var self = this;

                    var request = {
                        params: {}
                    };
                    return $http.get(listApiUrl, request)
                        .success(function (data) {
                            self.latest_data = data;
                        });
                },
                add: function (tokens, origin_message_id) {
                    var self = this;

                    var request = {
                        token_list: tokens,
                        origin: origin_message_id
                    };

                    return $http.post(listApiUrl, request)
                        .success(function (data) {
                            self.latest_data = data;
                            self.distributions["user"][data.feature_text] = data;
                        });

                },
                remove: function (feature) {
                    var self = this;

                    var request = {

                    };

                    var itemApiUrl = djangoUrl.reverse('feature', {feature_id: feature.feature_id});
                    return $http.delete(itemApiUrl, request)
                        .success(function (data) {
                            // Remove feature from list
                            delete self.distributions["user"][feature.feature_text];
                        });
                },
                get_distribution: function(source){
                    var self = this;
                    var request = {
                        params: {
                            feature_source: source || "user"
                        }
                    };

                    var apiUrl= djangoUrl.reverse('distribution');
                    return $http.get(apiUrl, request)
                        .success(function (data) {

                            self.distributions[source] = data;
                            data.forEach(function(feature){
                                // Add to the dict
                                self.distributions[source][feature.feature_text] = feature;
                            });

                        });
                }
            });

            return new Feature();
        }
    ]);


    //A service for message
    module.factory('TweetCoderViz.services.Message', [
        '$http', 'djangoUrl', '$rootScope',
        'TweetCoderViz.services.Code',
        'TweetCoderViz.services.Progress',
        function messageFactory($http, djangoUrl, $rootScope, Code, Progress) {

            var Message = function () {
                var self = this;
                self.last_message = undefined;
                self.current_message = undefined;
                self.coded_messages = {
                    master: {},
                    user: {},
                    partner: {}
                };
            };

            angular.extend(Message.prototype, {
                load_message_details: function (source, message_id) {
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
                    var lemmatized_tokens = messageData.message.lemmatized_tokens;
                    var feature_vector = messageData.feature_vector;

                    var tokenItems = [];
                    var charToToken = [];
                    var lemmatizedToFull = new Map(); // Mapping between lemmatized token id to full token id
                    var fullToLemmatized = new Map(); // Mapping between full token id to lemmatized token id

                    var lowerText = text.toLowerCase();
                    var currentIndex = 0;
                    var currentLemmatizedIndex = 0;
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

                        // Find the mapping between the token index and lemmatized token index
                        //if (token.toLowerCase() == lemmatized_tokens[currentLemmatizedIndex].toLowerCase()){
                        lemmatizedToFull.set(currentLemmatizedIndex, i);
                        fullToLemmatized.set(i, currentLemmatizedIndex);
                        currentLemmatizedIndex++;
                        //}
                    }

                    messageData.message.lemmatizedToFull = lemmatizedToFull;
                    messageData.message.fullToLemmatized = fullToLemmatized;

                    // Extract token level features
                    var features = [];
                    if (feature_vector && feature_vector.length > 0){
                        for (i = 0; i < messageData.feature_vector.length; i++) {
                            var feature_text = messageData.feature_vector[i].text;
                            var code_id = messageData.feature_vector[i].origin_code_id;

                            var matchedTokenIndices = self.match_text(messageData.message, feature_text, charToToken);

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
                        active_features: features
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
                update_code: function (message_id, code_id) {
                    var self = this;
                    var apiUrl = djangoUrl.reverse('assignment', {message_id: message_id});

                    // TODO: instead of setting all of them to be false, maybe taking flags from previous ones?
                    var request = {
                        code: code_id,
                        is_example: false,
                        is_ambiguous: false,
                        is_saved: false
                    };


                    return $http.put(apiUrl, request)
                        .success(function (data) {
                            //self.last_message = data;
                            // TODO: the data should be another assignment and need to use that for updating the interface
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
                load_coded_messages: function(source){
                    var self = this;
                    var param = {};
                    var source = source || "user";
                    if (source != "master")
                        param.stage = "current";

                    var apiUrl = djangoUrl.reverse('code_messages', param);

                    Code.codes.forEach(function(code){

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
                match_text: function(message, searchText, charToToken) {
                    // TODO: fix matching algorithm. It will be wrong when search key is aaa_bbb&ccc
                    // TODO: some system features are n-gram with stop words in between.
                    // TODO: Those should use filtered_tokens
                    // Search for text
                    var matchedTokenIndices = [];
                    if (searchText && searchText.length > 0) {

                        if (searchText.indexOf("_") != -1) {
                            var ngrams = searchText.toLowerCase().split("_").filter(Boolean);

                            // iterate and search for continuous tokens
                            var iNgram = 0;
                            var iToken = -1;

                            for (var i = 0; i < message.lemmatized_tokens.length; i++) {
                                var tokenText = message.lemmatized_tokens[i].toLowerCase();
                                if (tokenText == ngrams[iNgram]) {
                                    // Is it continuous?
                                    if (iToken >= 0 && i != iToken + 1) {
                                        matchedTokenIndices = [];
                                        break;
                                    }

                                    matchedTokenIndices.push(message.lemmatizedToFull.get(i));
                                    iNgram++;
                                    iToken = i;

                                    if (iNgram == ngrams.length) {
                                        break;
                                    }
                                }
                            }
                        }
                        else if (searchText.indexOf("&") != -1) {
                            var ngrams = searchText.toLowerCase().split("&").filter(Boolean);

                            // iterate and search for tokens
                            var iNgram = 0;

                            var tempIndices = [];
                            for (var i = 0; i < message.lemmatized_tokens.length; i++) {
                                var tokenText = message.lemmatized_tokens[i].toLowerCase();
                                if (tokenText == ngrams[iNgram]) {
                                    tempIndices.push(message.lemmatizedToFull.get(i));
                                    iNgram++;

                                    if (iNgram == ngrams.length) {
                                        matchedTokenIndices = tempIndices;
                                        break;
                                    }
                                }
                            }
                        }
                        else {
                            // Search the text in lemmetized tokens in case it's a unigram feature
                            message.lemmatized_tokens.forEach(function(t, i) {
                                if(t == searchText.toLowerCase()){
                                    matchedTokenIndices.push(message.lemmatizedToFull.get(i));
                                }
                            });

                            if (matchedTokenIndices.length == 0) {
                                // Then search the text in the full text
                                var charIndex = message.text.toLowerCase().search(searchText.toLowerCase());

                                if (charIndex != -1) {
                                    // A little hacky here. If charToToken is provided, return the token index.
                                    // If it's not provided, we just need to add something to the returned list to indicate we found the match
                                    matchedTokenIndices.push(charToToken ? charToToken[charIndex] : charIndex);
                                }
                            }
                        }
                    }

                    return matchedTokenIndices;
                }
            });

            return new Message();
        }
    ]);

    //A service for code definition
    module.factory('TweetCoderViz.services.Code', [
        '$http', 'djangoUrl', '$rootScope',
        function codeFactory($http, djangoUrl, $rootScope) {

            var Code = function () {
                var self = this;
                self.definitions_by_source = {
                    master: [],
                    user: [],
                    partner: []
                };
                self.definitions_by_code = {};
                self.codes = undefined;
                self.pairwise_distribution = [];
                self.pairwise_distribution_map = {};

            };

            angular.extend(Code.prototype, {
                init_load: function(){
                    var self = this;
                    self.definitions_by_source = {};
                    self.definitions_by_code = {};
                    return self.load_definitions(["master", "user", "partner"]);
                },

                load_definitions: function (sources) {
                    var self = this;
                    var apiUrl = djangoUrl.reverse('definitions');

                    var request = {
                        params: {
                            source: sources.join(" ")
                        }
                    };

                    return $http.get(apiUrl, request)
                        .success(function (def_sets) {
                            def_sets.forEach(function(def_set){
                                self.definitions_by_source[def_set.source] = def_set.definitions;
                                def_set.definitions.forEach(function(def){
                                    if (typeof(self.definitions_by_code[def.code_text]) === "undefined")
                                        self.definitions_by_code[def.code_text] = {master: "", user: "", partner: ""};
                                    self.definitions_by_code[def.code_text][def_set.source] = def.text;
                                });
                            });

                            self.codes = self.definitions_by_source.master;

                            $rootScope.$broadcast('definitions::updated', self.codes);
                        });

                },
                update_definition: function(code){
                    var self = this;
                    var apiUrl = djangoUrl.reverse('definition', {code_id: code.code_id});



                    var request = {
                        text: self.definitions_by_code[code.code_text]["user"].trim()
                    };


                    return $http.put(apiUrl, request)
                        .success(function (data) {
                            console.log("Update definition for ", code);
                        });


                },
                get_pairwise: function(use_current_stage){
                    var self = this;
                    var request = {
                        params: {
                            stage: use_current_stage || "current"
                        }
                    };

                    var apiUrl= djangoUrl.reverse('pairwise');
                    return $http.get(apiUrl, request)
                        .success(function (data) {
                            self.pairwise_distribution = data;
                            self.pairwise_distribution.forEach(function(pair){
                                var key = pair.user_code + "_" + pair.partner_code;
                                self.pairwise_distribution_map[key] = pair;
                            });
                        });
                }

            });

            return new Code();
        }
    ]);

    function getQueryVariable(variable){
           var query = window.location.search.substring(1);
           var vars = query.split("&");
           for (var i=0;i<vars.length;i++) {
                   var pair = vars[i].split("=");
                   if(pair[0] == variable){return pair[1];}
           }
           return(false);
    }

    //A service for progress
    module.factory('TweetCoderViz.services.Progress', [
        '$http', 'djangoUrl', '$rootScope',
        function progressFactory($http, djangoUrl, $rootScope) {



            var Progress = function () {
                var self = this;
                self.current_stage_index = 0;
                self.current_message_id = 0;
                self.current_status = undefined;
                self.current_message = undefined;

                self.init_load(); // initialization
            };

            angular.extend(Progress.prototype, {
                init_load: function(){
                    var self = this;

                    /*var request = {
                        params: {
                            stage_index: getQueryVariable('stage_index'),
                            target_status: getQueryVariable('target_status')
                        }
                    };*/


                    var apiUrl = djangoUrl.reverse('progress');

                    //return $http.get(apiUrl, request)
                    return $http.get(apiUrl)
                        .success(function (data) {
                            console.log(data);
                            self.current_stage_index = data.current_stage_index;
                            self.current_message_id = data.current_message_id;
                            self.current_status = data.current_status;
                        });
                },
                next_step: function(){
                    var self = this;

                    var apiUrl = djangoUrl.reverse('progress');


                    return $http.post(apiUrl)
                        .success(function (data) {
                            self.current_stage_index = data.current_stage_index;
                            self.current_message_id = data.current_message_id;
                            self.current_status = data.current_status;
                            self.is_finished = data.is_finished;
                        })

                },
            });

            return new Progress();
        }

    ]);


})();
