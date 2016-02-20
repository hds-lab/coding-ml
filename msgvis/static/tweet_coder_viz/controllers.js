(function () {
    'use strict';


    var module = angular.module('TweetCoderViz.controllers', [
        'TweetCoderViz.services',
        'angularSpinner',
        'angucomplete-alt',
        'smart-table'
    ]);

    module.config(['$interpolateProvider', function ($interpolateProvider) {
        $interpolateProvider.startSymbol('{$');
        $interpolateProvider.endSymbol('$}');
    }]);


    module.config(['usSpinnerConfigProvider', function (usSpinnerConfigProvider) {
        usSpinnerConfigProvider.setDefaults({
            color: '#111'
        });
    }]);

    var DictionaryController = function ($scope, Dictionary) {
        $scope.Dictionary = Dictionary;

    };
    DictionaryController.$inject = [
        '$scope',
        'TweetCoderViz.services.Dictionary'
    ];
    module.controller('TweetCoderViz.controllers.DictionaryController', DictionaryController);

    var ViewController = function ($scope, $timeout, Dictionary, SVMResult, FeatureVector, usSpinnerService) {

        $scope.showReview = { visible: true };

        var sortOption_None = 0;
        var sortOption_Descending = 1;
        var sortOption_Ascending = 2;

        var toggleSort = function(previousSortOption){
            return (previousSortOption+1) % 3;
        };

        $scope.colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
        $scope.colorsLight = ["rgba(31,119,180,0.15)", "rgba(255,127,14,0.15)", "rgba(44,160,44,0.15)", "rgba(214,39,40,0.15)",
            "rgba(148,103,189,0.15)", "rgba(140,86,75,0.15)", "rgba(227,119,194,0.15)", "rgba(127,127,127,0.15)", "rgba(188,189,34,0.15)",
            "rgba(23,190,207,0.15)"];

        $scope.spinnerOptions = {
            radius: 20,
            width: 6,
            length: 10,
            color: "#000000"
        };

        // Top pane
        $scope.currentMessageId = undefined;
        $scope.currentMessage = undefined;
        $scope.codes = undefined;
        $scope.selectedCode = undefined;

        // Tweets
        $scope.codeItems = undefined;
        $scope.selectedFilter = 'All';
        $scope.searchText = undefined;

        var tweetItem = function(messageData) {
            var text = messageData.message.text;
            var characters = text.split("");
            var tokens = messageData.tokens;

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

            // TODO: Integrate with service. Make up some user feature data
            var featureCount = Math.floor((Math.random() * $scope.codes.length));
            var features = [];
            for (var i = 0; i < featureCount; i++){
                var tokenIndex = Math.floor((Math.random() * (tokenItems.length - 1)) + 1);
                var codeIndex = Math.floor((Math.random() * ($scope.codes.length - 1)));

                features.push({
                    startCharIndex: tokenItems[tokenIndex - 1].startIndex,
                    endCharIndex: tokenItems[tokenIndex].endIndex,
                    codeIndex: codeIndex
                });
            }

            var charStyle = function(charIndex) {
                for (var i = 0; i < features.length; i++) {
                    var feature = features[i];
                    if (charIndex >= feature.startCharIndex && charIndex <= feature.endCharIndex) {
                        var color = $scope.colors[feature.codeIndex % $scope.colors.length];

                        var css = {
                            'border': 'solid 1px transparent',
                            'border-bottom-color': color
                        };

                        return css;
                    }
                }
            };

            return {
                id: messageData.message.id,
                text: text,
                characters: characters.map(function(c, i) { return { char: c, style: charStyle(i) }}),
                charStyle: charStyle,
                ambiguous: messageData.ambiguous,
                saved: messageData.saved,
                example: messageData.example,
                gold: messageData.gold,
                label: messageData.label
            };
        };

        $scope.selectLabel = function(code){
            $scope.currentMessage.label = code.code_text;
            $scope.selectedCode = code;
        };

        $scope.selectFilter = function(filter){
            $scope.selectedFilter = filter;
        };

        $scope.filterTweets = function(filter, searchText) {
            return function(item) {
                var flagged = false;
                switch (filter) {
                    case 'All':
                        flagged = true;
                        break;
                    case 'Gold':
                        flagged = item.gold;
                        break;
                    case 'Example':
                        flagged = item.example;
                        break;
                    case 'Saved':
                        flagged = item.saved;
                        break;
                    case 'Ambiguous':
                        flagged = item.ambiguous;
                        break;
                }

                return (!searchText || searchText.length == 0 || item.text.toLowerCase().search(searchText.toLowerCase()) != -1) && flagged;
            }
        };

        $scope.codeColor = function(code){
            var colorIndex = code.code_id;
            var color = $scope.colors[colorIndex % $scope.colors.length];
            return color;
        };

        $scope.codeColorLight = function(code){
            var colorIndex = code.code_id;
            var color = $scope.colorsLight[colorIndex % $scope.colorsLight.length];
            return color;
        };

        $scope.buttonStyle = function(code){

            var colorIndex = code.code_id;
            var color = $scope.colors[colorIndex % $scope.colors.length];

            var css = {
                border: 'solid 1px ' + color,
                width: 'calc(' + (100 / $scope.codes.length) + '% - 10px)'
            };

            if ($scope.currentMessage && code.code_text == $scope.currentMessage.label){
                css['background-color'] = color;
            }
            else {
                css['color'] = color;
            }

            return css;
        };


        $scope.panelStyle = function(code){

            var colorIndex = code.code_id;
            var color = $scope.colorsLight[colorIndex % $scope.colorsLight.length];

            var css = {
                'background-color' : color
            };
            return css;
        };

        // Service call methods
        $scope.getMessage = function() {
            var id = Math.floor((Math.random() * 200));
            //var request = FeatureVector.load(id);
            //if (request) {
            //usSpinnerService.spin('label-spinner');
            //    request.then(function() {
            //        usSpinnerService.stop('label-spinner');
            //        $scope.currentMessageId = id;
            //    });
            //}

            usSpinnerService.spin('label-spinner');
            setTimeout(function () {
                usSpinnerService.stop('label-spinner');
                $scope.currentMessageId = id;
                $scope.$digest(); // manually update since this is timeout callback
            }, 1000);
        };

        $scope.submitLabel = function(){
            // Append item to the example list
            $scope.codeItems[$scope.currentMessage.label].user_ex.push($scope.currentMessage);

            // TODO: Make service call to submit
            // var request = submit label request
            //if (request) {
            usSpinnerService.spin('label-spinner');
            //    request.then(function() {
            //        usSpinnerService.stop('label-spinner');
            //        $scope.getMessage();
            //    });
            //}

            setTimeout($scope.getMessage, 1000);
        };

        $scope.getMasterCodes = function(){
            //GET /definition/?source=master
            //[
            //{
            //    "code_id": code.id,
            //    "source": "master",
            //    "text": "master_def",
            //    "examples": [messages...]
            //},
            //{
            //    "code_id": code.id,
            //    "source": "user1",
            //    "text": "user1_def",
            //    "examples": [messages...]
            //}
            //]

            // var request = get definition request
            //if (request) {
            usSpinnerService.spin('code-spinner');
                //request.then(function() {
            setTimeout(function() {
                usSpinnerService.stop('code-spinner');

                // TODO : Make up definitions
                var sourceData = [
                    {
                        "code_id": 1,
                        "code_text": "Unrelated",
                        "source": "master",
                        "text": "This tweet is unrelated to the event we’re interested in.",
                        "examples": [
                            {
                                "text": "@KevinZZ The hostage-taker has a bomb in his backpack. #Sydney #SydneySiege",
                                "gold": true
                            }
                        ]
                    },
                    {
                        "code_id": 2,
                        "code_text": "Affirm",
                        "source": "master",
                        "text": "This tweet affirms, supports, and functions to pass along the story.",
                        "examples": [
                            {
                                "text": "@KevinZZ The hostage-taker has a bomb in his backpack. #Sydney #SydneySiege",
                                "gold": true
                            }
                        ]
                    },
                    {
                        "code_id": 3,
                        "code_text": "Deny",
                        "source": "master",
                        "text": "This tweet denies or questions all or part of the story.",
                        "examples": [
                            {
                                "text": "@KevinZZ The hostage-taker has a bomb in his backpack. #Sydney #SydneySiege",
                                "gold": true
                            }
                        ]
                    },
                    {
                        "code_id": 0,
                        "code_text": "Uncodable",
                        "source": "master",
                        "text": "This tweet is not codable because the content is in a language that is not understandable.",
                        "examples": [
                            {
                                "text": "@KevinZZ The hostage-taker has a bomb in his backpack. #Sydney #SydneySiege",
                                "gold": true
                            }
                        ]
                    },
                    {
                        "code_id": 4,
                        "code_text": "Neutral",
                        "source": "master",
                        "text": "The tweet is exactly neutral (use sparingly). Be careful not to conflate with an implicit affirmation.",
                        "examples": [
                            {
                                "text": "@KevinZZ The hostage-taker has a bomb in his backpack. #Sydney #SydneySiege",
                                "gold": true
                            }
                        ]
                    }
                ];

                // Take all codes with source = master
                var codes = sourceData.filter(function (c) {
                    return c.source == "master";
                });

                $scope.codes = codes;
                codes.forEach(function(code){
                    $scope.codes[code.code_text] = code;
                })

            }, 1000);
            //}
        };

        $scope.getCodeDetail = function(code){
            if ($scope.codeItems){
                return;
            }

            //GET /definition/?source=user
            //[
            //{
            //    "code_id": code.id,
            //    "source": "master",
            //    "text": "master_def",
            //    "examples": [messages...]
            //},
            //{
            //    "code_id": code.id,
            //    "source": "user1",
            //    "text": "user1_def",
            //    "examples": [messages...]
            //}
            //]

            // var request = get definition request
            //if (request) {
            usSpinnerService.spin('bottom-spinner');
                //request.then(function() {
            setTimeout(function() {
                usSpinnerService.stop('bottom-spinner');

                // TODO : Make up definitions
                var sourceData = [
                    {
                        "code_id": 1,
                        "code_text": "Unrelated",
                        "source": "user",
                        "text": "user def: This tweet is unrelated to the event we’re interested in.",
                        "examples": [
                            {
                                "id": 501,
                                "text": "Unrelated: @KevinZZ The hostage-taker has a bomb in his backpack. #Sydney #SydneySiege",
                                "example": true
                            }
                        ]
                    },
                    {
                        "code_id": 2,
                        "code_text": "Affirm",
                        "source": "user",
                        "text": "user def: This tweet affirms, supports, and functions to pass along the story.",
                        "examples": [
                            {
                                "id": 502,
                                "text": "Affirm: @KevinZZ The hostage-taker has a bomb in his backpack. #Sydney #SydneySiege",
                                "example": true
                            }
                        ]
                    },
                    {
                        "code_id": 3,
                        "code_text": "Deny",
                        "source": "user",
                        "text": "user def: This tweet denies or questions all or part of the story.",
                        "examples": [
                            {
                                "id": 503,
                                "text": "Deny: @KevinZZ The hostage-taker has a bomb in his backpack. #Sydney #SydneySiege",
                                "example": true
                            }
                        ]
                    },
                    {
                        "code_id": 0,
                        "code_text": "Uncodable",
                        "source": "user",
                        "text": "user def: This tweet is not codable because the content is in a language that is not understandable.",
                        "examples": [
                            {
                                "id": 500,
                                "text": "Uncodable: @KevinZZ The hostage-taker has a bomb in his backpack. #Sydney #SydneySiege",
                                "example": true
                            }
                        ]
                    },
                    {
                        "code_id": 4,
                        "code_text": "Neutral",
                        "source": "user",
                        "text": "user def: The tweet is exactly neutral (use sparingly). Be careful not to conflate with an implicit affirmation.",
                        "examples": [
                            {
                                "id": 504,
                                "text": "Neutral: @KevinZZ The hostage-taker has a bomb in his backpack. #Sydney #SydneySiege",
                                "example": true
                            }
                        ]
                    }
                ];

                // Merge with master codes
                $scope.codeItems = [];
                sourceData.forEach(function(code) {
                    var masterCode = $scope.codes[code.code_text];
                    var codeItem = {
                        "code_id": masterCode.code_id,
                        "code_text": masterCode.code_text,
                        "master_def": masterCode.text,
                        "master_ex": masterCode.examples,
                        "user_def": code.text,
                        "user_ex": code.examples
                    };

                    $scope.codeItems.push(codeItem);

                    $scope.codeItems[codeItem.code_text] = codeItem;
                });

                $scope.$apply();
            }, 1000);
            //}
        };

        $scope.updateItem = function(id, saved, example, ambiguous){
            // TODO: Need service call
        };

        $scope.getMessageDetail = function(id){
            var request = FeatureVector.load(id);
            if (request) {
                usSpinnerService.spin('label-spinner');
                request.then(function() {
                    usSpinnerService.stop('label-spinner');
                    $scope.currentMessage = tweetItem(FeatureVector.data);
                });
            }
        };

        // Watchers
        $scope.$watch('currentMessageId', function(newVal, oldVal) {
            if (newVal) {
                $scope.getMessageDetail(newVal);
            }
        });

        $scope.$watch('selectedCode', function(newVal, oldVal) {
            if (newVal) {
                $scope.getCodeDetail(newVal);
            }
        });

        $scope.getMessage();
        $scope.getMasterCodes();
    };

    ViewController.$inject = [
        '$scope',
        '$timeout',
        'TweetCoderViz.services.Dictionary',
        'TweetCoderViz.services.SVMResult',
        'TweetCoderViz.services.FeatureVector',
        'usSpinnerService'
    ];
    module.controller('TweetCoderViz.controllers.ViewController', ViewController);

})();
