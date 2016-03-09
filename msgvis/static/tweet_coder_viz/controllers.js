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

    var DictionaryController = function ($scope, Dictionary, Progress) {
        $scope.Dictionary = Dictionary;
        $scope.Progress = Progress;

    };
    DictionaryController.$inject = [
        '$scope',
        'TweetCoderViz.services.Dictionary',
        'TweetCoderViz.services.Progress'
    ];
    module.controller('TweetCoderViz.controllers.DictionaryController', DictionaryController);

    var ViewController = function ($scope, $timeout, Dictionary, Code, Message, Feature, Progress, usSpinnerService) {

        $scope.Progress = Progress;
        $scope.Message = Message;
        $scope.Code = Code;

        $scope.statusText = "Initializing...";

        $scope.is_status = function(status){
            return Progress.current_status == status
        };

        var sortOption_None = 0;
        var sortOption_Descending = 1;
        var sortOption_Ascending = 2;

        var toggleSort = function(previousSortOption){
            return (previousSortOption+1) % 3;
        };

        $scope.colors = ["#1f77b4", "#2ca02c", "#d62728", "#ff7f0e", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
        $scope.colorsLight = ["rgba(31,119,180,0.2)", "rgba(44,160,44,0.2)", "rgba(214,39,40,0.2)", "rgba(255,127,14,0.2)",
            "rgba(148,103,189,0.2)", "rgba(140,86,75,0.2)", "rgba(227,119,194,0.2)", "rgba(127,127,127,0.2)", "rgba(188,189,34,0.2)",
            "rgba(23,190,207,0.2)"];
        $scope.colorsLighter = ["rgba(31,119,180,0.1)", "rgba(44,160,44,0.1)", "rgba(214,39,40,0.1)", "rgba(255,127,14,0.1)",
            "rgba(148,103,189,0.1)", "rgba(140,86,75,0.1)", "rgba(227,119,194,0.1)", "rgba(127,127,127,0.1)", "rgba(188,189,34,0.1)",
            "rgba(23,190,207,0.1)"];

        $scope.spinnerOptions = {
            radius: 20,
            width: 6,
            length: 10,
            color: "#000000"
        };

        // Top panel
        $scope.currentMessage = undefined;
        $scope.selectedCode = undefined;
        $scope.codes = [];
        $scope.code_map = {};
        $scope.coded_messages = undefined;

        // Variables for ensuring a code definition is saved after the user edits it
        $scope.original_code_definition = undefined;
        $scope.is_editing_definition = false;
        $scope.ask_if_save_definition = false;

        // Tweets
        $scope.codeItems = undefined;
        $scope.selectedFilter = 'All';
        $scope.search = {text: ""};
        $scope.selectedMedia = undefined;

        $scope.allItems = undefined;
        $scope.allItemsMap = new Map();
        $scope.hoveredItem = undefined;
        $scope.confusionPairs = undefined;
        $scope.distribution = undefined;
        $scope.selectedConfusion = undefined;
        $scope.featureList = {
            system: {},
            user: {},
            partner: {}
        };
        $scope.featureConflict = undefined;

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
            if ($scope.Progress.current_status == 'R'){
                if ($scope.is_definition_different())
                    $scope.ask_if_save_definition = true;
            }
            $scope.selectedCode = code;
            $scope.search.text = "";

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

        $scope.filterTweetsByConfusionAndCode = function(){
            return function(item) {
                var confusion = $scope.selectedConfusion;
                var searchText = $scope.search.text;
                var flagged = !confusion || (item.user_code.text == confusion.user_code && item.partner_code.text == confusion.partner_code);
                var rightCode = item.user_code.id == $scope.selectedCode.code_id;

                // Search for text
                var matched = $scope.matchText(item.message, searchText);

                return (!searchText || searchText.length == 0 || matched) && flagged && rightCode;
            }
        };

        $scope.filterConfusionByCode = function() {
            return function(confusion){
                return confusion.count > 0 && confusion.user_code == $scope.selectedCode.code_text;
            }
        };

        $scope.matchText = function(message, searchText) {
            var matchedTokenIndices = Message.match_text(message, searchText);

            return (matchedTokenIndices && matchedTokenIndices.length > 0);
        };

        $scope.filterFeatures = function(code){
            return function(feature){
                return  feature.distribution && feature.distribution[code.code_text] > 0;
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

        $scope.codeColorLighter = function(code){
            var colorIndex = code.code_id;
            var color = $scope.colorsLighter[colorIndex % $scope.colorsLighter.length];
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
                width = Math.floor(distribution * 100) + "%";
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

        $scope.charStyle = function(item, charIndex) {

            var tokenIndex = item.charToToken[charIndex];
            var lemmatized = item.message.fullToLemmatized.get(tokenIndex);

            if (charIndex >= item.hoveredCharStart && charIndex <= item.hoveredCharEnd) {
                return { 'background' : "rgba(0,0,0,0.1)" };
            }
            else if (isTokenSelectedAtCharIndex(item, charIndex) || (isTokenSelectedAtCharIndex(item, charIndex - 1) && isTokenSelectedAtCharIndex(item, charIndex + 1))) {
                if (lemmatized) {
                    return {'background': $scope.codeColorLight($scope.code_map[item.user_code.text])};
                }
                else {
                    return {'background': $scope.codeColorLighter($scope.code_map[item.user_code.text])};
                }
            }
            else if (item.selectedTokens == undefined || item.selectedTokens.length == 0) {
                for (var i = 0; item.active_features && i < item.active_features.length; i++) {
                    var feature = item.active_features[i];
                    if (charIndex >= feature.startCharIndex && charIndex <= feature.endCharIndex) {
                        if (lemmatized) {
                            return {'background': $scope.colorsLight[feature.codeIndex % $scope.colors.length] };
                        }
                        else {
                            return {'background': $scope.colorsLighter[feature.codeIndex % $scope.colors.length] };
                        }
                    }
                }

                return { 'background': 'transparent' };
            }
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
            var request;
            if (Progress.current_status == 'W'){
                request = Progress.init_load();
                if (request) {
                    usSpinnerService.spin('page-spinner');
                    request.then(function() {
                        usSpinnerService.stop('page-spinner');
                    });
                }
            }
            else{
                request = Progress.next_step();
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


        $scope.ask_if_change_code = false;
        $scope.message_for_change = undefined;
        $scope.updateIndicator = function(item, disagreement){

            if (disagreement && item.disagreement_indicator != disagreement) {

                var request = Message.update_disagreement_indicator(item.message.id, disagreement);
                if (request) {
                    usSpinnerService.spin('submitted-label-spinner');
                    request.then(function () {
                        usSpinnerService.stop('submitted-label-spinner');
                        item.disagreement_indicator = disagreement;
                        if (disagreement == 'P'){
                            $scope.ask_if_change_code = true;
                            $scope.message_for_change = item;

                        }
                    });
                }
            }
        };

        $scope.changeCode = function(){

            console.log("change code");
            var request = Message.update_code($scope.message_for_change,
                                              $scope.message_for_change.partner_code.id);
            if (request) {
                usSpinnerService.spin('submitted-label-spinner');
                request.then(function() {
                    usSpinnerService.stop('submitted-label-spinner');

                    $scope.load_distribution('user');

                    $scope.ask_if_change_code = false;

                });
            }

        };


        /** Functions for handling definitions start */

        $scope.hasDefinition = function(code, source){
            return Code.definitions_by_code[code.code_text][source] &&
                   Code.definitions_by_code[code.code_text][source].trim().length > 0;
        };

        $scope.saveDefinition = function(){
            var code = $scope.selectedCode;
            if ($scope.hasDefinition(code, "user")) {
                var request = Code.update_definition(code);
                if (request) {
                    usSpinnerService.spin('code-detail-spinner');
                    request.then(function () {
                        usSpinnerService.stop('code-detail-spinner');
                        $scope.original_code_definition = Code.definitions_by_code[code.code_text]["user"].trim();
                    });
                }
            }
        };

        $scope.is_definition_different = function(){
            var code = $scope.selectedCode;
            return ($scope.is_editing_definition && (typeof($scope.original_code_definition) !== "undefined") &&
            ($scope.original_code_definition.trim() !== Code.definitions_by_code[code.code_text]["user"].trim()) );


        };

        $scope.startEditing = function(){
            var code = $scope.selectedCode;
            if ($scope.is_editing_definition == false){
                $scope.is_editing_definition = true;
                $scope.original_code_definition = Code.definitions_by_code[code.code_text]["user"].trim();
            }
        };

        $scope.finishEditing = function(){
            var code = $scope.selectedCode;
            if ( $scope.is_definition_different() ){
                $scope.ask_if_save_definition = true;
            }
            else {
                $scope.original_code_definition = undefined;
                $scope.is_editing_definition = false;
            }

        };

        $scope.handleDefinitionChanges = function(save){
            var code = $scope.selectedCode;
            if (save){
                $scope.saveDefinition();
            }
            else {
                Code.definitions_by_code[code.code_text]["user"] = $scope.original_code_definition;
            }
            $scope.original_code_definition = undefined;
            $scope.ask_if_save_definition = false;
            $scope.is_editing_definition = false;

        };
        /** Functions for handling definitions end */


        $scope.getAllMessages = function(updateFeaturesOnly) {

            var request = Message.load_all_coded_messages("current");
            if (request) {
                usSpinnerService.spin('label-spinner');
                request.then(function () {
                    usSpinnerService.stop('label-spinner');

                    if (!updateFeaturesOnly) {
                        $scope.allItems = Message.all_coded_messages;
                        $scope.allItems.forEach(function(item){
                            $scope.allItemsMap.set(item.id, item);
                        });

                        $scope.normalized_code_distribution = Message.normalized_code_distribution;
                        $scope.code_distribution = Message.code_distribution;

                        for (var i = 0; i < $scope.allItems.length; i++) {
                            var prototype = $scope.allItems[i];
                            // Update all message items
                            //prototype.characters = prototype.message.text.split("");
                            prototype.characters = Array.from(prototype.message.text); // make sure it works for unicode


                            // Interaction states
                            prototype.hoveredCharStart = -1;
                            prototype.hoveredCharEnd = -1;
                            prototype.clickStartTokenItem = undefined;
                            prototype.selectedTokens = undefined;
                            prototype.selectedTokenIndices = new Map();

                        }
                    }
                    else {
                        // Iterate through all messages and update the features
                        Message.all_coded_messages.forEach(function(newItem){
                            var item = $scope.allItemsMap.get(newItem.id);

                            if (item){
                                item.active_features = newItem.active_features;
                            }
                        });
                    }
                });
            }
        };

        $scope.getCodeDetail = function(){

            var request = Code.init_load();
            if (request) {
                usSpinnerService.spin('page-spinner');
                request.then(function() {
                    usSpinnerService.stop('page-spinner');
                    $scope.statusText = undefined;

                    Message.load_coded_messages();
                    $scope.codes = Code.codes;
                    if (Progress.current_status == 'R'){
                        $scope.selectedCode = $scope.codes[0];
                        $scope.load_distribution("user");
                        $scope.load_distribution("system");
                        $scope.load_pairwise_distribution();
                        $scope.getAllMessages();
                    }
                    else {
                        $scope.getMessageDetail();
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
            if (item && item.selectedTokenIndices) {
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
                //if (item.submittedTokenIndices && item.submittedTokenIndices.size > 0) {
                //    item.submittedTokenIndices.forEach(function (tokenIndex) {
                //        updateSelection(item, tokenIndex, tokenIndex, true, false);
                //    });
                //}
            }
        };

        $scope.onItemLeave = function(item){
        };

        $scope.replaceFeature = function(featureConflict){
            $scope.featureConflict = null;

            if (featureConflict) {
                if (featureConflict.existingFeatureText) {
                    $scope.removeFeature(featureConflict.existingFeatureText);
                }
                else if (featureConflict.existingMessageFeature){
                    $scope.removeFeature(featureConflict.existingMessageFeature);
                }

                $scope.addFeature(featureConflict.item);
            }
        };

        $scope.addFeature = function(item){
            if (item && item.selectedTokens && item.selectedTokens.length > 0) {

                var tokens = [];
                item.selectedTokenIndices.forEach(function (tokenIndex){
                    var lemIndex = item.message.fullToLemmatized.get(tokenIndex);
                    if (lemIndex){
                        tokens.push(item.message.lemmatized_tokens[lemIndex]);
                    }
                });

                var key = item.message.id;

                // Check if the feature already exists.
                var feature = {
                    feature_text: tokens.join("&"),
                    total_count: 0,
                    distribution: undefined,
                    origin_message_id: item.message.id
                };

                var existingFeatureText = undefined;
                var existingMessageFeature = [];

                existingFeatureText = $scope.featureList.user[feature.feature_text];
                if (!existingFeatureText) {
                    existingMessageFeature = $scope.featureList.user.filter(function (f) {
                        return f.origin_message_id == feature.origin_message_id;
                    });
                }

                if (existingFeatureText || existingMessageFeature.length > 0) {
                    $scope.featureConflict = {
                        existingFeatureText: existingFeatureText,
                        existingMessageFeature: existingMessageFeature.length > 0 ? existingMessageFeature[0] : undefined,
                        feature_text: feature.feature_text,
                        item: item
                    };
                }
                else {
                    // add to the top of the list to update the UI
                    $scope.featureList.user.unshift(feature);
                    $scope.featureList.user[feature.feature_text] = feature;

                    var request = Feature.add(tokens, item.message.id);
                    if (request) {
                        usSpinnerService.spin('submitted-label-spinner');
                        request.then(function () {
                            usSpinnerService.stop('submitted-label-spinner');
                            var feature = Feature.latest_data;

                            // Update the features (need to refresh the whole data so we can get the counts for this stage only)
                            //$scope.load_distribution('user');
                            // TODO: check why this is not enough for adding new feature
                            $scope.featureList.user[feature.feature_text] = feature;

                            // Update the message level features
                            $scope.getAllMessages(true);
                        });
                    }


                    var newMap = {};

                    //item.submittedTokenIndices = new Map();
                    //item.selectedTokenIndices.forEach(function (val, key) {
                    //    item.submittedTokenIndices.set(key, val);
                    //});

                    item.clickStartTokenItem = undefined;
                }
            }
        };

        $scope.removeFeature = function(feature, $event){
            if ($event){
                $event.preventDefault();
                $event.stopPropagation();
            }

            if (feature) {

                // Remove from list
                var index = $scope.featureList.user.indexOf(feature);
                if (index > -1){
                    $scope.featureList.user.splice(index, 1);
                }

                delete $scope.featureList.user[feature.feature_text];

                if (feature.feature_id) {
                    var request = Feature.remove(feature);
                    if (request) {
                        usSpinnerService.spin('vector-spinner');
                        request.then(function () {
                            usSpinnerService.stop('vector-spinner');

                            // Update the message level features
                            $scope.getAllMessages(true);
                        });
                    }
                }
            }
        };

        // Watchers
        $scope.$watch('Progress.current_message_id', function(newVal, oldVal) {
            if (newVal && (newVal != oldVal)) {
                $scope.getMessageDetail();
            }
        });

        $scope.$watch('Progress.current_status', function(newVal, oldVal) {
            if (newVal && (newVal != oldVal)) {
                switch (newVal) {
                    case 'C':  // coding
                        $scope.statusText = "Initializing coding interface...";
                        $scope.getCodeDetail();
                        break;
                    case 'R':  // review
                        $scope.statusText = "Initializing review interface...";
                        $scope.getCodeDetail();
                        break;
                    default:
                        $scope.statusText = undefined;
                }
            }
        });

        // Specific event handlers
        $scope.$on('messages::load_coded_messages', function($event, data) {
            $scope.coded_messages = data;
        });
        $scope.$on('definitions::updated', function($event, data) {
            $scope.codes = data;
            $scope.codes.forEach(function(code){
                $scope.code_map[code.code_text] = code;
            });

        });
        $scope.$on('modal-hidden', function($event) {
            if ($scope.is_definition_different()){
                $('#code-definition').focus();
            }

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

    module.directive('modal', function() {
        var link = function (scope, elem) {
            elem.on('hidden.bs.modal', function () {
                scope.showModal = false;
                scope.$parent.$broadcast("modal-hidden");
            });

            scope.$watch('showModal', function (newVals, oldVals) {
                if (newVals)
                    elem.modal('show');
                else
                    elem.modal('hide');
            }, false);
        };

        return {
            //Use as a tag only
            restrict: 'E',
            replace: false,

            //Directive's inner scope
            scope: {
                showModal: '=showModal'
            },
            link: link
        };
    });

})();
