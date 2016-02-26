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
                self.distribution = [];
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
                add: function (tokens) {
                    var self = this;

                    var request = {
                        token_list: tokens
                    };

                    return $http.post(listApiUrl, request)
                        .success(function (data) {
                            self.latest_data = data;
                            self.distribution.push(data);
                        });

                },
                remove: function (id) {
                    var self = this;

                    var request = {

                    };

                    var itemApiUrl = djangoUrl.reverse('feature', {feature_id: id});
                    return $http.delete(itemApiUrl, request)
                        .success(function (data) {
                            self.latest_data = data;
                        });
                },
                get_distribution: function(sources){
                    var self = this;
                    var request = {
                        params: {
                            feature_source: sources || "system user"
                        }
                    };

                    var apiUrl= djangoUrl.reverse('distribution');
                    return $http.get(apiUrl, request)
                        .success(function (data) {
                            self.distribution = data;
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
                load_message_details: function (source) {
                    var self = this;

                    var request = {
                        message_id: Progress.current_message_id,
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
                    var text = messageData.message.text;
                    var characters = text.split("");
                    var tokens = messageData.message.tokens;

                    var tokenItems = [];
                    var charToToken = [];

                    var lowerText = text.toLowerCase();
                    var currentIndex = 0;
                    for (var i = 0; i < tokens.length; i++) {
                        var token = tokens[i];
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
                    }
                    var charStyle = function(charIndex) {
                        for (var i = 0; features && i < features.length; i++) {
                            var feature = features[i];
                            if (charIndex >= feature.startCharIndex && charIndex <= feature.endCharIndex) {
                                var color = $scope.colorsLight[feature.codeIndex % $scope.colors.length];

                                var css = {
                                    'background': color
                                };

                                return css;
                            }
                        }
                    };
                    // TODO: Integrate with service. Make up some user feature data
                    if (messageData.feature_vector && messageData.feature_vector.length > 0){
                        var features = messageData.feature_vector;
                        var featureCount = features.length;
                        for (i = 0; i < featureCount; i++){
                            var tokenIndex = Math.floor((Math.random() * (tokenItems.length - 1)) + 1);
                            var codeIndex = Math.floor((Math.random() * ($scope.codes.length - 1)));

                            features.push({
                                startCharIndex: tokenItems[tokenIndex - 1].startIndex,
                                endCharIndex: tokenItems[tokenIndex].endIndex,
                                codeIndex: codeIndex
                            });
                        }
                    }

                    return angular.extend(messageData, {
                       // id: messageData.message.id,
                       // text: text,
                        characters: characters.map(function(c, i) { return { char: c, style: charStyle(i) }}),
                        charToToken: charToToken,
                        tokens: tokenItems,
                        charStyle: charStyle,
                       // is_ambiguous: messageData.is_ambiguous || false,
                       // is_saved: messageData.is_saved || false,
                       // is_example: messageData.is_example || false
                    });
                },
                submit: function (code_id) {
                    var self = this;
                    var apiUrl = djangoUrl.reverse('assignment', {message_id: self.current_message.id});

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
                                self.coded_messages[source][code.code_text] = data.assignments;
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
                            $rootScope.$broadcast("messages::load_all_coded_messages", data);
                        });

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
                    var apiUrl = djangoUrl.reverse('definition');

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
                                        self.definitions_by_code[def.code_text] = {};
                                    self.definitions_by_code[def.code_text][def.source] = def;
                                });
                            });

                            self.codes = self.definitions_by_source.master;

                            $rootScope.$broadcast('definitions::updated', self.codes);
                        });

                },
                get_definitions: function(source){
                    var self = this;
                    if ( typeof(self.definitions[source]) !== "undefined" ){
                        return self.definitions[source];
                    }
                    return "Error: No definition has been loaded";


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

                    var apiUrl = djangoUrl.reverse('progress');

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
                        })
                        .error(function(err){
                            console.log(err);
                        });

                },
            });

            return new Progress();
        }

    ]);


})();
