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

    var ViewController = function ($scope, $timeout, Dictionary, Code, Message, Feature, Progress, usSpinnerService) {

        $scope.Progress = Progress;
        $scope.Message = Message;
        $scope.Code = Code;

        $scope.is_status = function(status){
            return Progress.current_status == status
        };

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
        $scope.code_map = {};
        $scope.coded_messages = undefined;

        // Tweets
        $scope.codeItems = undefined;
        $scope.selectedFilter = 'All';
        $scope.search = {text: ""};
        $scope.selectedMedia = undefined;

        $scope.allItems = undefined;
        $scope.hoveredItem = undefined;
        $scope.confusionPairs = undefined;
        $scope.distribution = undefined;
        $scope.selectedConfusion = undefined;
        $scope.featureList = {
            system: {},
            user: {},
            partner: {}
        };

        $scope.indicators = ['N', 'U', 'D', 'P'];
        $scope.indicator_mapping = {
            'N': 'Not specified',
            'U': 'My code is correct',
            'D': 'My partner and I are both right',
            'P': 'My partner\'s code is correct'
        };

        $scope.stage_desc = {
            N: 'Not yet start',
            I: 'Initialization',
            C: 'Coding',
            W: 'Waiting',
            R: 'Review',
            S: 'Switching stage'
        };


        $scope.selectLabel = function(code){
            if ($scope.Progress.current_status == 'C'){
                //$scope.currentMessage.user_code.text = code.code_text;
            }
            $scope.selectedCode = code;

            // set hover state on the first tweet
            if ($scope.coded_messages && $scope.coded_messages['user'][code.code_text].length > 0){
                $scope.hoveredItem = $scope.coded_messages['user'][code.code_text][0];
            }
        };

        $scope.selectMedia = function(media_url){
            $scope.selectedMedia = media_url;
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

        $scope.searchFeature = function(feature_text) {
            if ($scope.search.text != feature_text) {
                $scope.search.text = feature_text;
            }
            else {
                $scope.search.text = undefined;
            }
        };

        $scope.filterTweetsFlag = function() {
            return function(item) {
                var searchText = $scope.search.text;
                var filter = $scope.selectedFilter;

                // Apply filters
                var flagged = false;
                switch (filter) {
                    case 'All':
                        flagged = true;
                        break;
                    case 'Example':
                        flagged = item.is_example;
                        break;
                    case 'Saved':
                        flagged = item.is_saved;
                        break;
                    case 'Ambiguous':
                        flagged = item.is_ambiguous;
                        break;
                }

                // Search for text
                var matched = $scope.matchText(item.message, searchText);

                return (!searchText || searchText.length == 0 || matched) && flagged;
            }
        };

        $scope.filterTweets = function(filter) {
            return function(item) {
                var searchText = $scope.search.text;

                // Apply filters
                var flagged = false;
                switch (filter) {
                    case 'All':
                        flagged = true;
                        break;
                    case 'Example':
                        flagged = item.is_example;
                        break;
                    case 'Saved':
                        flagged = item.is_saved;
                        break;
                    case 'Ambiguous':
                        flagged = item.is_ambiguous;
                        break;
                }

                return flagged;
            }
        };

        $scope.filterTweetsConfusion = function() {
            return function(item) {
                var confusion = $scope.selectedConfusion;
                var searchText = $scope.search.text;
                var flagged = !confusion || (item.user_code.text == confusion.user_code && item.partner_code.text == confusion.partner_code);

                // Search for text
                var matched = $scope.matchText(item.message, searchText);

                return (!searchText || searchText.length == 0 || matched) && flagged;
            }
        };

        $scope.matchText = function(message, searchText) {
            // Search for text
            var matched = false;
            if (searchText && searchText.length > 0) {
                if (message.text.toLowerCase().search(searchText.toLowerCase()) != -1) {
                    matched = true;
                }
                else if (searchText.indexOf("_") != -1) {
                    var ngrams = searchText.toLowerCase().split("_");

                    // iterate and search for continuous tokens
                    var iNgram = 0;
                    var iToken = -1;

                    for (var i = 0; i < message.lemmatized_tokens.length; i++) {
                        var tokenText = message.lemmatized_tokens[i].toLowerCase();
                        if (tokenText == ngrams[iNgram]) {
                            // Is it ontinuous?
                            if (iToken >= 0 && i != iToken + 1) {
                                break;
                            }

                            iNgram++;
                            iToken = i;

                            if (iNgram == ngrams.length) {
                                matched = true;
                                break;
                            }
                        }
                    }
                }
                else if (searchText.indexOf("&") != -1) {
                    var ngrams = searchText.toLowerCase().split("&");

                    // iterate and search for tokens
                    var iNgram = 0;

                    for (var i = 0; i < message.lemmatized_tokens.length; i++) {
                        var tokenText = message.lemmatized_tokens[i].toLowerCase();
                        if (tokenText == ngrams[iNgram]) {
                            iNgram++;

                            if (iNgram == ngrams.length) {
                                matched = true;
                                break;
                            }
                        }
                    }
                }
            }

            return matched;
        };

        $scope.filterFeatures = function(code){
            return function(feature){
                return feature.distribution[code.code_text] > 0;
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
            var colorLight = $scope.colorsLight[colorIndex % $scope.colors.length];

            var css = {
                border: 'none',
                width: (100 / $scope.codes.length) + '%'
            };

            if ($scope.selectedCode == code){
                css['background-color'] = color;
            }
            else {
                css['color'] = color;
                css['background-color'] = colorLight;

            }

            return css;
        };

        $scope.definitionStyle = function(code){

            var colorIndex = code.code_id;
            var color = $scope.colors[colorIndex % $scope.colors.length];
            var colorLight = $scope.colorsLight[colorIndex % $scope.colors.length];

            var css = {
                'background-color': colorLight,
                'border': 'solid 2px ' + color
            };

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

        $scope.distributionStyle = function(label, distribution){
            var color;
            var width;

            if (distribution > 0) {
                var colorIndex = $scope.code_map[label].code_id;
                color = $scope.colors[colorIndex % $scope.colorsLight.length];
                width = Math.round(distribution * 100) + "%";
            }
            else {
                color = "transparent";
                width = "0";
            }

            var css = {
                'background-color' : color,
                'width' : width
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

                    $scope.next_step();
                });
            }
        };

        $scope.next_step = function(){
            if (Progress.current_status == 'W'){
                var request = Progress.init_load();
                if (request) {
                    usSpinnerService.spin('page-spinner');
                    request.then(function() {
                        usSpinnerService.stop('page-spinner');
                    });
                }
            }
            else{
                var request = Progress.next_step();
                if (request) {
                    usSpinnerService.spin('page-spinner');
                    request.then(function() {
                        usSpinnerService.stop('page-spinner');
                    });
                }
            }

        };

        

        $scope.updateItem = function(item, is_saved, is_example, is_ambiguous){
            item.is_saved = is_saved;
            item.is_example = is_example;
            item.is_ambiguous = is_ambiguous;
            var request = Message.update_flags(item);
            if (request) {
                usSpinnerService.spin('submitted-label-spinner');
                request.then(function () {
                    usSpinnerService.stop('submitted-label-spinner');
                });
            }
        };

        $scope.updateIndicator = function(item, disagreement){

            if (disagreement) {
                item.disagreement_indicator = disagreement;
            }

            var request = Message.update_disagreement_indicator(item.message.id, item.disagreement_indicator);
            if (request) {
                usSpinnerService.spin('submitted-label-spinner');
                request.then(function () {
                    usSpinnerService.stop('submitted-label-spinner');
                });
            }

        };


        $scope.saveDefinition = function(code){
            if (Code.definitions_by_code[code.code_text]["user"]) {
                // TODO: call service on every character change?? on focus out?
                var request = Code.update_definition(code);
                if (request) {
                    usSpinnerService.spin('code-detail-spinner');
                    request.then(function () {
                        usSpinnerService.stop('code-detail-spinner');
                    });
                }
            }
        };

        $scope.getAllMessages = function() {

            var request = Message.load_all_coded_messages("current");
            if (request) {
                usSpinnerService.spin('label-spinner');
                request.then(function () {
                    usSpinnerService.stop('label-spinner');
                    $scope.allItems = Message.all_coded_messages;
                    $scope.normalized_code_distribution = Message.normalized_code_distribution;
                    $scope.code_distribution = Message.code_distribution;

                    for (var i = 0; i < $scope.allItems.length; i++) {
                        var prototype = $scope.allItems[i];
                        // Update all message items
                        prototype.characters = prototype.message.text.split("");
                        //prototype.analysis = myLabel != partnerLabel ? "Who's right?" : undefined;

                        // Interaction states
                        prototype.hoveredCharStart = -1;
                        prototype.hoveredCharEnd = -1;
                        prototype.clickStartTokenItem = undefined;
                        prototype.selectedTokens = undefined;
                        prototype.selectedTokenIndices = new Map();

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
                    $scope.codes = Code.codes;
                    if (Progress.current_status == 'R'){
                        $scope.selectedCode = $scope.codes[0];
                        $scope.load_distribution("user");
                        $scope.load_distribution("system");
                        $scope.load_pairwise_distribution();
                    }
                    else {
                        $scope.load_distribution("user");
                        $scope.load_distribution("system");
                    }
                });
            }
            
        };

        $scope.load_distribution = function(source){

            var request = Feature.get_distribution(source);
            if (request) {
                usSpinnerService.spin('feature-spinner');
                request.then(function() {
                    usSpinnerService.stop('feature-spinner');
                    $scope.featureList[source] = Feature.distributions[source];
                });
            }

        };
        $scope.load_pairwise_distribution = function(){

            var request = Code.get_pairwise();
            if (request) {
                usSpinnerService.spin('pairwise-spinner');
                request.then(function() {
                    usSpinnerService.stop('pairwise-spinner');
                    $scope.confusionPairs = Code.pairwise_distribution;
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
            if ($scope.hoveredItem && $scope.hoveredItem != item && $scope.hoveredItem.selectedTokenIndices) {
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
                style["background"] = "rgba(0,0,0,0.1)";
            }

            if (isTokenSelectedAtCharIndex(item, charIndex) || (isTokenSelectedAtCharIndex(item, charIndex - 1) && isTokenSelectedAtCharIndex(item, charIndex + 1))) {
                style["background"] = $scope.codeColorLight($scope.code_map[item.user_code.text]);
            }
            return style;
        };

        $scope.addFeature = function(item){
            if (item && item.selectedTokens && item.selectedTokens.length > 0) {
                var tokens = item.selectedTokens;
                var key = item.message.id;
                console.log("addFeature for: " + key);

                /*// check if it already exists
                var existingTokens = $scope.message_featureList[key];

                if (existingTokens) {
                    delete $scope.message_featureList[key];
                }*/

                var request = Feature.add(tokens);
                if (request) {
                    usSpinnerService.spin('submitted-label-spinner');
                    request.then(function() {
                        usSpinnerService.stop('submitted-label-spinner');
                    //    var feature = Feature.latest_data;
                   //     $scope.message_featureList[key] = feature; // TODO: make sure this is correct
                    });
                }


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
                //var existingTokens = $scope.featureList[key];

                //if (existingTokens) {

                    var request = Feature.remove(feature);
                    if (request) {
                        usSpinnerService.spin('vector-spinner');
                        request.then(function() {
                            usSpinnerService.stop('vector-spinner');
                    //        delete $scope.featureList[key];
                        });
                    }

                    //delete $scope.featureList[key];
                  //  feature.source.submittedTokenIndices.clear();
                //}
                //else {
                //    console.log("feature does not exist: " + key);
                //}
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

                        // TODO: Need to get codes before getting messages and features and others
                        $scope.getAllMessages();
                        break;
                }
            }
        });

        $scope.$on('messages::load_coded_messages', function($event, data) {
            $scope.coded_messages = data;
        });
        $scope.$on('definitions::updated', function($event, data) {
            $scope.codes = data;
            $scope.codes.forEach(function(code){
                $scope.code_map[code.code_text] = code;
            });

        });

    };

    ViewController.$inject = [
        '$scope',
        '$timeout',
        'TweetCoderViz.services.Dictionary',
        'TweetCoderViz.services.Code',
        'TweetCoderViz.services.Message',
        'TweetCoderViz.services.Feature',
        'TweetCoderViz.services.Progress',
        'usSpinnerService'
    ];
    module.controller('TweetCoderViz.controllers.ViewController', ViewController);

    module.directive('popover', function() {
        return function(scope, elem){
            elem.popover({ container: 'body' });
        }
    });

})();
