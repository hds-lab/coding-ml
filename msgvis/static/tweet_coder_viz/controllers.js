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

    var ViewController = function ($scope, $timeout, Dictionary, SVMResult, FeatureVector, Coding, usSpinnerService) {

        $scope.state = 'none'; // options are 'none', 'code', 'review'

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

        $scope.allItems = undefined;
        $scope.hoveredItem = undefined;
        $scope.confusionPairs = undefined;
        $scope.distribution = undefined;
        $scope.selectedConfusion = undefined;
        $scope.featureList = {};

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
            var features = messageData.feature_vector;
            var featureCount = features.length;
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
                        var color = $scope.colorsLight[feature.codeIndex % $scope.colors.length];

                        var css = {
                            'background': color
                        };

                        return css;
                    }
                }
            };

            return {
                id: messageData.message.id,
                text: text,
                characters: characters.map(function(c, i) { return { char: c, style: charStyle(i) }}),
                charToToken: charToToken,
                tokens: tokenItems,
                charStyle: charStyle,
                ambiguous: messageData.ambiguous || false,
                saved: messageData.saved || false,
                example: messageData.example || false,
                gold: messageData.gold,
                label: messageData.label
            };
        };

        $scope.selectLabel = function(code){
            if ($scope.state == 'code'){
                $scope.currentMessage.label = code.code_text;
            }
            $scope.selectedCode = code;
        };

        $scope.selectFilter = function(filter){
            $scope.selectedFilter = filter;
        };

        $scope.selectConfusion = function(pair){
            if ($scope.selectedConfusion == pair){
                $scope.selectedConfusion = undefined;
            }
            else {
                $scope.selectedConfusion = pair;
            }
        };

        $scope.filterTweetsFlag = function(filter, searchText) {
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

        $scope.filterTweetsConfusion = function(confusion, searchText) {
            return function(item) {
                var flagged = !confusion || (item.label == confusion.label && item.partner == confusion.partner);
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

            if ($scope.selectedCode == code){
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
                $scope.selectedCode = undefined;
                $scope.$digest(); // manually update since this is timeout callback
            }, 1000);
        };

        $scope.submitLabel = function(){
            // Append item to the example list
            $scope.codeItems[$scope.currentMessage.label].user_ex.push($scope.currentMessage);

            // TODO: Make service call to submit
            var request = Coding.submit($scope.currentMessage, $scope.selectedCode.code_id);
            if (request) {
            usSpinnerService.spin('label-spinner');
                request.then(function() {
                    usSpinnerService.stop('label-spinner');
            //        $scope.getMessage();
                });
            }

            //setTimeout($scope.getMessage, 1000);
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
                        "text": "This tweet is unrelated to the event we are interested in.",
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
                });
                $scope.$apply();

            }, 1000);
            //}
        };

        $scope.getCodeDetail = function(){
            if ($scope.codeItems){
                return;
            }

            //GET /definition/?source=all
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
            usSpinnerService.spin('code-detail-spinner');
                //request.then(function() {
            setTimeout(function() {
                usSpinnerService.stop('code-detail-spinner');

                // TODO : Make up definitions
                var sourceData = [
                    {
                        "code_id": 1,
                        "code_text": "Unrelated",
                        "source": "master",
                        "text": "This tweet is unrelated to the event we interested in.",
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
                    },
                    {
                        "code_id": 1,
                        "code_text": "Unrelated",
                        "source": "user",
                        "text": "user def: This tweet is unrelated to the event we interested in.",
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
                    },
                    {
                        "code_id": 1,
                        "code_text": "Unrelated",
                        "source": "partner",
                        "text": "partner def: This tweet is unrelated to the event we interested in.",
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
                        "source": "partner",
                        "text": "partner def: This tweet affirms, supports, and functions to pass along the story.",
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
                        "source": "partner",
                        "text": "partner def: This tweet denies or questions all or part of the story.",
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
                        "source": "partner",
                        "text": "partner def: This tweet is not codable because the content is in a language that is not understandable.",
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
                        "source": "partner",
                        "text": "partner def: The tweet is exactly neutral (use sparingly). Be careful not to conflate with an implicit affirmation.",
                        "examples": [
                            {
                                "id": 504,
                                "text": "Neutral: @KevinZZ The hostage-taker has a bomb in his backpack. #Sydney #SydneySiege",
                                "example": true
                            }
                        ]
                    }
                ];

                // Group by code
                $scope.codeItems = [];
                sourceData.forEach(function(code) {
                    var codeItem = $scope.codeItems[code.code_text];
                    if (!codeItem){
                        codeItem = {
                        "code_id": code.code_id,
                        "code_text": code.code_text
                        };

                        $scope.codeItems[code.code_text] = codeItem;
                        $scope.codeItems.push(codeItem);
                    }

                    switch (code.source){
                        case "master":
                            codeItem.master_def = code.text;
                            codeItem.master_ex = code.examples;
                            break;
                        case "user":
                            codeItem.user_def = code.text;
                            codeItem.user_ex = code.examples;
                            break;
                        case "partner":
                            codeItem.partner_def = code.text;
                            codeItem.partner_ex = code.examples;
                            break;
                    }
                });

                $scope.$apply();
            }, 1000);
            //}
        };

        $scope.updateItem = function(item, saved, example, ambiguous){
            // TODO: Need service call
            item.saved = saved;
            item.example = example;
            item.ambiguous = ambiguous;
            //console.log("Item updated: " + JSON.stringify(item));
        };

        $scope.updateAnalysis = function(item, analysis){
            // TODO: Need service call
            item.analysis = analysis;
            //console.log("Item analyzed: " + item.analysis);
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

        $scope.getStageInfo = function(){
            // TODO: Which stage am I in? Coding or review?
            var coding = Math.random() > 0.5;

            usSpinnerService.spin('page-spinner');
            setTimeout(function(){
                    usSpinnerService.stop('page-spinner');
                //$scope.state = coding ? 'code' : 'review';
                $scope.state = 'code';
                $scope.$apply();
            }, 1000);
        };

        $scope.saveDefinition = function(code){
            // TODO: call service on every character change?? on focus out?
            console.log("saving definition for " + code.code_text);
            console.log("saving definition for " + code.user_def);
        };

        $scope.getAllMessages = function() {
            // TODO: Fake data
            var request = FeatureVector.load(123);
            if (request) {
                usSpinnerService.spin('label-spinner');
                request.then(function () {
                    usSpinnerService.stop('label-spinner');
                    $scope.allItems = [];
                    $scope.confusionPairs = [];

                    for (var i = 0; i < 200; i++) {
                        var prototype = tweetItem(FeatureVector.data);

                        var myLabel = Math.floor(Math.random() * $scope.codes.length);
                        var partnerLabel = Math.floor(Math.random() * $scope.codes.length);

                        // Update all message items
                        prototype.characters = prototype.text.split("");
                        prototype.label = $scope.codes[myLabel].code_text;
                        prototype.partner = $scope.codes[partnerLabel].code_text;
                        prototype.ambiguous = Math.random() < 0.5;
                        prototype.example = Math.random() < 0.5;
                        prototype.saved = Math.random() < 0.5;
                        prototype.gold = false;
                        prototype.id = i;
                        prototype.analysis = myLabel != partnerLabel ? "Who's right?" : undefined;

                        // Interaction states
                        prototype.hoveredCharStart = -1;
                        prototype.hoveredCharEnd = -1;
                        prototype.clickStartTokenItem = undefined;
                        prototype.selectedTokens = undefined;
                        prototype.selectedTokenIndices = new Map();

                        $scope.allItems.push(prototype);

                        // Update confusion pair
                        var pairKey = myLabel + "_" + partnerLabel;

                        var confusionPair = $scope.confusionPairs[pairKey];
                        if (confusionPair == undefined) {
                            confusionPair = [];
                            confusionPair.key = pairKey;
                            confusionPair.label = $scope.codes[myLabel].code_text;
                            confusionPair.partner = $scope.codes[partnerLabel].code_text;
                            $scope.confusionPairs[pairKey] = confusionPair;
                            $scope.confusionPairs.push(confusionPair);
                        }

                        $scope.confusionPairs[pairKey].push(prototype);
                    }
                });
            }
        };

        // Feature selection logic and states

        var updateSelection = function(item, startIndex, endIndex, isSelected, shouldClear) {
            if (shouldClear) {
                item.selectedTokenIndices.clear();
            }

            for (var i = startIndex; i <= endIndex; i++) {
                var existing = item.selectedTokenIndices.get(i);
                if (existing == i && !isSelected) {
                    item.selectedTokenIndices.delete(i);
                }
                else if (existing != i && isSelected) {
                    item.selectedTokenIndices.set(i, i);
                }
            }

            //var values = [];
            //item.selectedTokenIndices.forEach(function(key){ values.push(key);});
            //console.log("updateSelection: " + JSON.stringify(values));
        };

        var isTokenSelectedAtCharIndex = function (item, charIndex){
            if (item) {
                var tokenIndex = item.charToToken[charIndex];
                if (tokenIndex != undefined && item.selectedTokenIndices.get(tokenIndex) == tokenIndex) {
                    return true;
                }
            }

            return false;
        };

        $scope.onCharMouseEnter = function(item, charIndex){
            //console.log("onCharMouseEnter:" + charIndex);

            if (item){
                var tokenIndex = item.charToToken[charIndex];

                if (tokenIndex != undefined && item.tokens[tokenIndex] != undefined) {
                    var tokenItem = item.tokens[tokenIndex];
                    item.hoveredCharStart = tokenItem.startIndex;
                    item.hoveredCharEnd = tokenItem.endIndex;

                    // If we're in the middle of selection, update selected char indices
                    if (item.clickStartTokenItem != undefined) {

                        var ctrlClick = event.ctrlKey || (event.metaKey && !event.ctrlKey);

                        if (tokenIndex < item.clickStartTokenItem.index) {
                            updateSelection(item, tokenIndex, item.clickStartTokenItem.index, true, !ctrlClick);
                        }
                        else if (tokenIndex > item.clickStartTokenItem.index) {
                            updateSelection(item, item.clickStartTokenItem.index, tokenIndex, true, !ctrlClick);
                        }
                    }
                }
                else {
                    item.hoveredCharStart = -1;
                    item.hoveredCharEnd = -1;
                }
            }
        };

        $scope.onCharMouseLeave = function(item, charIndex){
            //console.log("onCharMouseLeave:" + charIndex);

            item.hoveredCharStart = -1;
            item.hoveredCharEnd = -1;
        };

        $scope.onCharMouseDown = function(item, charIndex, event){
            //console.log("onCharMouseDown:" + charIndex);

            if (item) {

                var tokenIndex = item.charToToken[charIndex];

                if (tokenIndex != undefined && item.tokens[tokenIndex] != undefined) {

                    var tokenItem = item.tokens[tokenIndex];

                    var ctrlClick = event.ctrlKey || (event.metaKey && !event.ctrlKey);

                    // if there was a selection at this tokenIndex and mouse was clicked with command/ctrl button,
                    // clear the selection on this token index
                    if (item.selectedTokenIndices.get(tokenIndex) == tokenIndex && ctrlClick) {
                        item.clickStartTokenItem = undefined;
                        updateSelection(item, tokenIndex, tokenIndex, false, false);
                    }
                    else {
                        item.clickStartTokenItem = tokenItem;
                        updateSelection(item, tokenIndex, tokenIndex, true, !ctrlClick);
                    }
                }
                else {
                    item.clickStartTokenItem = undefined;
                    item.selectedTokenIndices.clear();
                }
            }
        };

        $scope.onCharMouseUp = function(item, charIndex) {
            item.clickStartTokenItem = undefined;
            item.selectedTokens = undefined;

            if (item.selectedTokenIndices.size > 0) {
                if (item) {

                    // Get sorted list of selected token indices
                    var indices = [];
                    item.selectedTokenIndices.forEach(function (val) {
                        indices.push(val);
                    });
                    indices.sort(function (a, b) {
                        return a - b;
                    });

                    var tokens = [];
                    var currentTokenIndex = -1;
                    for (var i = 0; i < indices.length; i++) {
                        var tokenIndex = indices[i];

                        if (tokenIndex != currentTokenIndex) {
                            tokens.push(item.tokens[tokenIndex].text);
                            currentTokenIndex = tokenIndex;
                        }
                    }

                    item.selectedTokens = tokens;
                }
            }
        };

        $scope.onItemHover = function(item){
            if ($scope.hoveredItem && $scope.hoveredItem != item) {
                $scope.hoveredItem.selectedTokens = undefined;
                $scope.hoveredItem.selectedTokenIndices.clear();
            }

            if ($scope.hoveredItem != item) {
                $scope.hoveredItem = item;
                //console.log("onItemHover");
                if (item.submittedTokenIndices && item.submittedTokenIndices.size > 0) {
                    item.submittedTokenIndices.forEach(function (tokenIndex) {
                        updateSelection(item, tokenIndex, tokenIndex, true, false);
                    });
                }
            }
        };

        $scope.onItemLeave = function(item){
        };

        $scope.charStyle = function(item, charIndex) {
            var style = {};
            if (charIndex >= item.hoveredCharStart && charIndex <= item.hoveredCharEnd) {
                style["background"] = "#eee";
            }

            if (isTokenSelectedAtCharIndex(item, charIndex) || (isTokenSelectedAtCharIndex(item, charIndex - 1) && isTokenSelectedAtCharIndex(item, charIndex + 1))) {
                style["background"] = $scope.codeColorLight($scope.codes[item.label]);
            }
            return style;
        };

        $scope.addFeature = function(item){
            if (item && item.selectedTokens && item.selectedTokens.length > 0) {
                var tokens = item.selectedTokens;
                var key = item.id;
                console.log("addFeature for: " + key);

                // check if it already exists
                var existingTokens = $scope.featureList[key];

                if (existingTokens) {
                    delete $scope.featureList[key];
                }

                //var request = UserFeatures.add(tokens);
                //if (request) {
                //    usSpinnerService.spin('vector-spinner');
                //    request.then(function() {
                //        usSpinnerService.stop('vector-spinner');
                //        var featureId = UserFeatures.data;
                //        $scope.featureList[key] = {
                //            id: featureId,
                //            tokens: tokens,
                //            source: item
                //        };
                //    });
                //}
                $scope.featureList[key] = {
                    id: Math.floor(Math.random() * 1000),
                    tokens: tokens,
                    source: item
                };

                var newMap = {};

                item.submittedTokenIndices = new Map();
                item.selectedTokenIndices.forEach(function (val, key) {
                    item.submittedTokenIndices.set(key, val);
                });

                item.clickStartTokenItem = undefined;
            }
        };

        $scope.removeFeature = function(feature){
            if (feature){
                var key = feature.source.id;
                console.log("removeFeature for: " + key);

                // check if it already exists
                var existingTokens = $scope.featureList[key];

                if (existingTokens) {

                    //var request = UserFeatures.remove(feature.id);
                    //if (request) {
                    //    usSpinnerService.spin('vector-spinner');
                    //    request.then(function() {
                    //        usSpinnerService.stop('vector-spinner');
                    //        delete $scope.featureList[key];
                    //    });
                    //}

                    delete $scope.featureList[key];
                    feature.source.submittedTokenIndices.clear();
                }
                else {
                    console.log("feature does not exist: " + key);
                }
            }
        };

        // Watchers
        $scope.$watch('currentMessageId', function(newVal, oldVal) {
            if (newVal != oldVal && newVal) {
                $scope.getMessageDetail(newVal);
            }
        });

        $scope.$watch('selectedCode', function(newVal, oldVal) {
            if (newVal != oldVal && newVal) {
                $scope.getCodeDetail();
            }
        });

        $scope.$watch('state', function(newVal, oldVal) {
            if (newVal != oldVal && newVal) {
                switch (newVal) {
                    case 'code':
                        $scope.getMessage();
                        $scope.getMasterCodes();
                        break;
                    case 'review':
                        $scope.getMasterCodes();
                        break;
                }
            }
        });

        $scope.$watch('codes', function(newVal, oldVal) {
            if (newVal != oldVal && newVal) {
                if ($scope.state == 'review'){
                    $scope.selectedCode = $scope.codes[0];

                    $scope.getAllMessages();
                }
            }
        });

        // Initialize
        $scope.getStageInfo();
    };

    ViewController.$inject = [
        '$scope',
        '$timeout',
        'TweetCoderViz.services.Dictionary',
        'TweetCoderViz.services.SVMResult',
        'TweetCoderViz.services.FeatureVector',
        'TweetCoderViz.services.Coding',
        'usSpinnerService'
    ];
    module.controller('TweetCoderViz.controllers.ViewController', ViewController);

})();
