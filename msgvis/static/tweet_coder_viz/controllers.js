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
        $scope.currentMessage = undefined;
        $scope.codes = undefined;

        // Tweets
        $scope.selectedFilter = 'All';

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

        // TODO: Need to get all labeled items (message text, id, label, all existing flags)
        var load = function(){
            var request = SVMResult.load(Dictionary.id);
            if (request) {
                usSpinnerService.spin('label-spinner');
                request.then(function() {
                    usSpinnerService.stop('label-spinner');
                    var modelData = SVMResult.data.results;
                    var messages = SVMResult.data.messages;

                    $scope.codes = modelData.codes;

                    // Map message id to model output
                    var modelOutputMap = new Map();
                    for (var i = 0; i < modelData.train_id.length; i++){
                        modelOutputMap.set(modelData.train_id[i], {
                            prediction: modelData.predictions[i],
                            probabilities: modelData.probabilities[i],
                            label: modelData.labels[i]
                        });
                    }

                    var tweetItems = {};

                    // Merge training result with messages
                    for (var i = 0; i < messages.length; i++) {
                        var message = messages[i];
                        var modelOutput = modelOutputMap.get(message.message.id);

                        if (modelOutput) {
                            var item = tweetItem(message);
                            item.prediction = modelOutput.prediction;
                            item.probabilities = modelOutput.probabilities;
                            item.label = modelOutput.label;

                            if (tweetItems[item.label] == undefined){
                                tweetItems[item.label] = [];
                            }
                            tweetItems[item.label].push(item);
                        }
                    }

                    // TODO: Make up definition and examples
                    $scope.codes = modelData.codes.map(function (code) {
                        code.definitionMaster = code.text + " Master Blah This tweet affirms, supports, and functions to pass along the story. Blah Blah";
                        code.definitionMine = code.text + " My Definition This tweet affirms, supports, and functions to pass along the story. Blah Blah";
                        code.example = code.text + "Blah Blah @KevinZZ The hostage-taker has a bomb in his backpack. #Sydney #SydneySiege. Blah Blah";
                        code.items = tweetItems[code.index];
                        code.filteredItems = code.items;

                        return code;
                    });

                    $scope.getMessage();
                });
            }
        };

        $scope.getMessage = function(){
            var request = FeatureVector.load(128);
            if (request) {
            usSpinnerService.spin('label-spinner');
                request.then(function() {
                    usSpinnerService.stop('label-spinner');
                    $scope.currentMessage = tweetItem(FeatureVector.data);
                });
            }
        };

        $scope.selectLabel = function(label){
            $scope.currentMessage.label = label;
        };

        $scope.selectFilter = function(filter){
            $scope.selectedFilter = filter;

            $scope.codes.forEach(function(code){
                code.filteredItems = code.items.filter(function(item){
                    switch (filter){
                        case 'All':
                            return true;
                        case 'Gold':
                            return item.gold;
                        case 'Example':
                            return item.example;
                        case 'Saved':
                            return item.saved;
                        case 'Ambiguous':
                            return item.ambiguous;
                        default:
                            return true;
                    }
                });
            })
        };

        $scope.submitLabel = function(){
            $scope.getMessage();
        };

        $scope.codeColor = function(code){
            var colorIndex = code.index;
            var color = $scope.colors[colorIndex % $scope.colors.length];
            return color;
        };

        $scope.codeColorLight = function(code){
            var colorIndex = code.index;
            var color = $scope.colorsLight[colorIndex % $scope.colorsLight.length];
            return color;
        };

        $scope.buttonStyle = function(code){

            var colorIndex = code.index;
            var color = $scope.colors[colorIndex % $scope.colors.length];

            var css = {
                border: 'solid 1px ' + color,
                width: 'calc(' + (100 / $scope.codes.length) + '% - 10px)'
            };

            if ($scope.currentMessage && code.text == $scope.currentMessage.label){
                css['background-color'] = color;
            }
            else {
                css['color'] = color;
            }

            return css;
        };


        $scope.panelStyle = function(code){

            var colorIndex = code.index;
            var color = $scope.colorsLight[colorIndex % $scope.colorsLight.length];

            var css = {
                'background-color' : color
            };
            return css;
        };

        // load the svm results
        load();
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
