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

    var ViewController = function ($scope, $timeout, Dictionary, Code, Message, Progress, usSpinnerService) {

        $scope.Progress = Progress;
        $scope.Message = Message;
        $scope.Code = Code;

        $scope.is_status = function(status){
            return Progress.current_status == status
        }

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
        $scope.selectedCode = undefined;
        $scope.codes = undefined;
        $scope.coded_messages = undefined;

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



        $scope.selectLabel = function(code){
            if ($scope.Progress.current_status == 'C'){
                //$scope.currentMessage.label = code.code_text;
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

        $scope.getMessageDetail = function(){
            var request = Message.load_message_details();
            if (request) {
                usSpinnerService.spin('label-spinner');
                request.then(function() {
                    usSpinnerService.stop('label-spinner');
                    $scope.currentMessage = Message.current_message;
                });
            }
        };

        $scope.submitLabel = function(){

            var request = Message.submit($scope.selectedCode.code_id);
            if (request) {
                usSpinnerService.spin('label-spinner');
                request.then(function() {
                    usSpinnerService.stop('label-spinner');

                    // Save the submitted message to the list and reset selected code
                    var idx = $scope.coded_messages['user'][$scope.selectedCode.code_text]
                        .map(function(d){ return d.message.id; })
                        .indexOf(Message.last_message.message.id);
                    if (idx != -1){
                        $scope.coded_messages['user'][$scope.selectedCode.code_text].splice(idx, 1);
                    }
                    $scope.coded_messages['user'][$scope.selectedCode.code_text].push(Message.last_message);
                    $scope.selectedCode = undefined;

                    Progress.next_step();
                });
            }
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


        $scope.saveDefinition = function(code){
            // TODO: call service on every character change?? on focus out?
            console.log("saving definition for " + code.code_text);
            console.log("saving definition for " + code.user_def);
        };

        $scope.getAllMessages = function() {

            var request = Message.load_coded_messages();
            if (request) {
                usSpinnerService.spin('label-spinner');
                request.then(function () {
                    usSpinnerService.stop('label-spinner');
                    $scope.allItems = [];
                    $scope.confusionPairs = [];

                    // TODO: calculate pairs

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

        $scope.getCodeDetail = function(){

            var request = Code.init_load();
            if (request) {
                usSpinnerService.spin('code-detail-spinner');
                request.then(function() {
                    usSpinnerService.stop('code-detail-spinner');
                    Message.load_coded_messages();
                    $scope.codeItems = Code.codes;
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
        $scope.$watch('Progress.current_message_id', function(newVal, oldVal) {
            if (newVal && (newVal != oldVal)) {
                $scope.getMessageDetail();
            }
        });

        //$scope.$watch('selectedCode', function(newVal, oldVal) {
        //    if (newVal && (newVal !== oldVal)) {
        //        $scope.getCodeDetail();
        //    }
        //});

        $scope.$watch('Progress.current_status', function(newVal, oldVal) {
            if (newVal && (newVal != oldVal)) {
                switch (newVal) {
                    case 'C':  // coding
                        $scope.getMessageDetail();
                        $scope.getCodeDetail();
                        break;
                    case 'R':  // review
                        $scope.getCodeDetail();
                        break;
                }
            }
        });

        $scope.$on('messages::load_coded_messages', function($event, data) {
            $scope.coded_messages = data;
        });
        $scope.$on('definitions::updated', function($event, data) {
            $scope.codes = data;
        });

    };

    ViewController.$inject = [
        '$scope',
        '$timeout',
        'TweetCoderViz.services.Dictionary',
        'TweetCoderViz.services.Code',
        'TweetCoderViz.services.Message',
        'TweetCoderViz.services.Progress',
        'usSpinnerService'
    ];
    module.controller('TweetCoderViz.controllers.ViewController', ViewController);

})();
