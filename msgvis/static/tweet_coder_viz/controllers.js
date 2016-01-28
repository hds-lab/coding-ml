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

        var sortOption_None = 0;
        var sortOption_Ascending = 1;
        var sortOption_Descending = 2;

        var toggleSort = function(previousSortOption){
            return (previousSortOption+1) % 3;
        };

        $scope.fullColors =
            [["#f6faea","#e5f1c0","#d4e897","#bada58","#98bc29","#769220","#556817","#333f0e","#222a09"],
            ["#f4eef6","#dfcde4","#bf9cc9","#aa7bb7","#865195","#683f74","#4a2d53","#35203b","#1e1221"],
            ["#fce8f1","#f7bbd4","#f28db7","#ec5f9a","#e41b6e","#b71558","#911146","#720d37","#440821"],
            ["#e9f0fb","#bed1f4","#92b3ed","#5185e1","#2361cf","#1a4899","#12336d","#0b1f41","#07142c"],
            ["#fff5eb","#fee6ce","#fdd0a2","#fdae6b","#fd8d3c","#f16913","#d94801","#a63603","#7f2704"]];

        $scope.spinnerOptions = {
            radius: 20,
            width: 6,
            length: 10,
            color: "#000000"
        };

        // Labeling pane
        $scope.currentMessage = undefined;
        $scope.currentLabel = undefined;
        $scope.isCurrentMessageAmbiguous = false;
        $scope.codes = undefined;

        // review pane
        $scope.submittedLabels = undefined;
        $scope.selectedLabelFilter = undefined;
        $scope.filteredLabels = undefined;

        // feature pane
        $scope.features = undefined;
        $scope.userFeatureSortKey = undefined;
        $scope.userFeatureSortOption = sortOption_None;

        // Feature selection logic and states
        $scope.hoveredCharStart = -1;
        $scope.hoveredCharEnd = -1;
        $scope.clickStartTokenItem = undefined;
        $scope.selectedTokens = undefined;
        $scope.selectedTokenIndices = new Map();

        var load = function(){
            var request = SVMResult.load(Dictionary.id);
            if (request) {
                usSpinnerService.spin('table-spinner');
                request.then(function() {
                    usSpinnerService.stop('table-spinner');
                    $scope.codes = SVMResult.data.codes;
                    $scope.submittedLabels = [];

                    // Fake labels for now
                    for (var i = 0; i < 100; i++){
                        var codeIndex = Math.floor(Math.random() * ($scope.codes.length + 1));
                        var ambiguous = Math.random() < 0.5;
                        var partnerIndex = (Math.random() < 0.5) ? Math.floor(Math.random() * ($scope.codes.length + 1)) : -1;
                        var label = {
                            id: i,
                            text: i + "@HopeForBoston: R.I.P. to the 8 year-old girl who died in Bostons explosions, while running for the Sandy @PeytonsHead RT for spam please",
                            mine: { code : codeIndex, ambiguous: ambiguous },
                            partner: partnerIndex > 0 ? { code : partnerIndex, ambiguous: (Math.random() < 0.5) } : null
                        };

                        $scope.submittedLabels.push(label);
                    }

                    $scope.filterLabels("all");

                    $scope.features = {
                        user: [],
                        system: []
                    };

                    // Fake features for now
                    for (var i = 0; i < 10; i++){
                        var feature = {
                            word: "feature" + i,
                            count: Math.floor(Math.random() * 30) + 1,
                            codes: [],
                            index: i
                        };

                        $scope.codes.forEach(function(c) {
                            feature.codes[c.text] = {
                                weight: Math.random() * Number(Math.random() < 0.5),
                                order: Math.floor(Math.random() * 10)
                            };
                        });

                        $scope.features.user.push(feature);
                    }
                });
            }
        };

        var getMessage = function(){
            var request = FeatureVector.load(128);
            if (request) {
            usSpinnerService.spin('label-spinner');
                request.then(function() {
                    usSpinnerService.stop('label-spinner');

                    var text = FeatureVector.data.message.text;
                    var characters = text.split("");
                    var tokens = FeatureVector.data.tokens;

                    var tokenItems = [];
                    var charToToken = [];

                    var lowerText = text.toLowerCase();
                    var currentIndex = 0;
                    for (var i = 0; i < tokens.length / 2; i++)
                    {
                        var token = tokens[i];
                        if (token != null && token.length > 0)
                        {
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

                            for (var j = tokenItem.startIndex; j <= tokenItem.endIndex; j++)
                            {
                                charToToken[j] = i;
                            }
                        }
                    }

                    $scope.currentMessage = {
                        text: text,
                        tokens: tokenItems,
                        characters: characters,
                        charToToken: charToToken
                    };
                    $scope.selectLabel(null);
                    $scope.isCurrentMessageAmbiguous = false;
                });
            }
        };

        $scope.selectLabel = function(label){
            $scope.currentLabel = label;
        };

        $scope.submitLabel = function(){
            $scope.getMessage();
        };

        $scope.sortUserFeatures = function(key){
            // Check if the sort key has changed
            if ($scope.userFeatureSortKey == key){
                $scope.userFeatureSortOption = toggleSort($scope.userFeatureSortOption);
            }
            else {
                $scope.userFeatureSortKey = key;
                $scope.userFeatureSortOption = sortOption_Ascending;
            }

            if ($scope.userFeatureSortOption == sortOption_None) {
                $scope.userFeatureSortKey = undefined;
                $scope.features.user.sort(function (a, b) {
                    return a.index - b.index;
                });
            }
            else {
                $scope.features.user.sort(function (a, b) {
                    var sign = $scope.userFeatureSortOption == sortOption_Ascending ? 1 : -1;
                    switch ($scope.userFeatureSortKey) {
                        case "word":
                            return sign * ((a.word.toLowerCase() <= b.word.toLowerCase()) ? -1 : 1);
                        case "count":
                            return sign * (a.count - b.count);
                        default:
                            return sign * (a.codes[$scope.userFeatureSortKey].weight - b.codes[$scope.userFeatureSortKey].weight);
                    }
                });
            }
        }

        $scope.filterLabels = function(filter) {
            if ($scope.selectedLabelFilter != filter) {
                $scope.selectedLabelFilter = filter;
                $scope.filteredLabels = $scope.submittedLabels.filter(function (label) {
                    switch (filter) {
                        case "all":
                            return true;
                        case "gold":
                            return label.gold != null;
                        case "ambiguous":
                            return label.mine != null && label.mine.ambiguous;
                        case "disagreement":
                            var good = label.mine != null && label.partner != null && label.mine.code != label.partner.code;
                            if (good){
                                console.log(label.partner.code + " " + label.mine.code);
                            }
                            return good;
                        default:
                            return label.mine != null && label.mine.code == filter;
                    }
                });
            }
        };

        var updateSelection = function(startIndex, endIndex, isSelected, shouldClear) {
            if (shouldClear) {
                $scope.selectedTokenIndices.clear();
            }

            for (var i = startIndex; i <= endIndex; i++) {
                var existing = $scope.selectedTokenIndices.get(i);
                if (existing == i && !isSelected) {
                    $scope.selectedTokenIndices.delete(i);
                }
                else if (existing != i && isSelected) {
                    $scope.selectedTokenIndices.set(i, i);
                }
            }
        };

        var isTokenSelectedAtCharIndex = function (charIndex){
            if ($scope.currentMessage) {
                var tokenIndex = $scope.currentMessage.charToToken[charIndex];
                if (tokenIndex != undefined && $scope.selectedTokenIndices.get(tokenIndex) == tokenIndex) {
                    return true;
                }
            }

            return false;
        };

        $scope.onCharMouseEnter = function(charIndex){
            //console.log("onCharMouseEnter:" + charIndex);

            if ($scope.currentMessage){
                var tokenIndex = $scope.currentMessage.charToToken[charIndex];

                if (tokenIndex != undefined && $scope.currentMessage.tokens[tokenIndex] != undefined) {
                    var tokenItem = $scope.currentMessage.tokens[tokenIndex];
                    $scope.hoveredCharStart = tokenItem.startIndex;
                    $scope.hoveredCharEnd = tokenItem.endIndex;

                    // If we're in the middle of selection, update selected char indices
                    if ($scope.clickStartTokenItem != undefined) {

                        var ctrlClick = event.ctrlKey || (event.metaKey && !event.ctrlKey);

                        if (tokenIndex < $scope.clickStartTokenItem.index) {
                            updateSelection(tokenIndex, $scope.clickStartTokenItem.index, true, !ctrlClick);
                        }
                        else if (tokenIndex > $scope.clickStartTokenItem.index) {
                            updateSelection($scope.clickStartTokenItem.index, tokenIndex, true, !ctrlClick);
                        }
                    }
                }
                else {
                    $scope.hoveredCharStart = -1;
                    $scope.hoveredCharEnd = -1;
                }
            }
        };

        $scope.onCharMouseLeave = function(charIndex){
            //console.log("onCharMouseLeave:" + charIndex);

            $scope.hoveredCharStart = -1;
            $scope.hoveredCharEnd = -1;
        };

        $scope.onCharMouseDown = function(charIndex, event){
            //console.log("onCharMouseDown:" + charIndex);

            if ($scope.currentMessage) {

                var tokenIndex = $scope.currentMessage.charToToken[charIndex];

                if (tokenIndex != undefined && $scope.currentMessage.tokens[tokenIndex] != undefined) {

                    var tokenItem = $scope.currentMessage.tokens[tokenIndex];

                    var ctrlClick = event.ctrlKey || (event.metaKey && !event.ctrlKey);

                    // if there was a selection at this tokenIndex and mouse was clicked with command/ctrl button,
                    // clear the selection on this token index
                    if ($scope.selectedTokenIndices.get(tokenIndex) == tokenIndex && ctrlClick) {
                        $scope.clickStartTokenItem = undefined;
                        updateSelection(tokenIndex, tokenIndex, false, false);
                    }
                    else {
                        $scope.clickStartTokenItem = tokenItem;
                        updateSelection(tokenIndex, tokenIndex, true, !ctrlClick);
                    }
                }
                else {
                    $scope.clickStartTokenItem = undefined;
                    $scope.selectedTokenIndices.clear();
                }
            }
        };

        $scope.onCharMouseUp = function(charIndex) {
            $scope.clickStartTokenItem = undefined;
            $scope.selectedTokens = undefined;

            if ($scope.selectedTokenIndices.size > 0) {
                if ($scope.currentMessage) {

                    // Get sorted list of selected token indices
                    var indices = [];
                    $scope.selectedTokenIndices.forEach(function (val) {
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
                            tokens.push($scope.currentMessage.tokens[tokenIndex].text);
                            currentTokenIndex = tokenIndex;
                        }
                    }

                    $scope.selectedTokens = tokens;
                }
            }
        };

        $scope.charStyle = function(charIndex) {
            var style = {};
            if (charIndex >= $scope.hoveredCharStart && charIndex <= $scope.hoveredCharEnd) {
                style["background"] = "#ffcc99";
            }


            if (isTokenSelectedAtCharIndex(charIndex) || (isTokenSelectedAtCharIndex(charIndex - 1) && isTokenSelectedAtCharIndex(charIndex + 1))) {
                style["background"] = "#ff6600";
            }
            return style;
        };

        $scope.codeStyle = function(codeIndex, code, selected){

            var colorIndex = 0;
            if (codeIndex < $scope.fullColors.length) { colorIndex = codeIndex;}
            var colors = $scope.fullColors[colorIndex];

            var css = {
                'background-color' : '#eee',
                'color': '#eee'
            };

            if (code != null) {
                var code_order = (Math.floor(code.order / 2));
                if (code_order < colors.length) {
                    css['background-color'] = colors[colors.length - code_order - 1];
                    css['color'] = colors[colors.length - code_order - 1];
                }
            }
            else {
                css['background-color'] = colors[colors.length - 5];
                css['color'] = colors[colors.length - 5];
            }

            return css;
        };

        $scope.buttonStyle = function(code){

            var colorIndex = 0;
            if (code.index < $scope.fullColors.length) { colorIndex = code.index;}
            var colors = $scope.fullColors[colorIndex];
            var color = colors[colors.length - 5];

            var css = {
                border: 'solid 1px ' + color
            };

            if (code.text == $scope.currentLabel){
                css['background-color'] = color;
            }
            else {
                css['color'] = color;
            }

            return css;
        };

        $scope.labelStyle = function(label) {

            if (label) {
                var colorIndex = 0;
                if (label.code < $scope.fullColors.length) {
                    colorIndex = label.code;
                }
                var colors = $scope.fullColors[colorIndex];
                var color = colors[colors.length - 5];

                var css = {
                    'background-color': color,
                    'color': label.ambiguous ? 'white' : color
                };

                return css;
            }
            return "";
        };

        $scope.boxColor = function(code) {

            var colorIndex = 0;
            if (code.index < $scope.fullColors.length) {
                colorIndex = code.index;
            }
            var colors = $scope.fullColors[colorIndex];
            var color = colors[colors.length - 5];

            return color;
        };

        // load the svm results
        load();

        // fetch a message to label
        getMessage();
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

    module.directive('tweetItems', function () {
         var TweetItems = function (scope, $element, attrs) {

            var DEFAULT_VALUE_KEY = 'value';

            var width = 300;
            var height = 300;
            var heightPerCode = height / scope.codes.length;
             var margin = 5;

            var self = this;
            var codes = scope.codes;
            var boxColor = scope.boxColor;
            var svg = d3.select($element[0]).append('svg')
                .attr('width', width)
                .attr('height', height);

            var codeBox = svg.selectAll('.code')
                .data(codes)
                .enter()
                .append('g')
                .attr('class', 'code')
                .attr('transform', function(c,i) { return 'translate(0,'+ (i * heightPerCode + margin) + ')';})
                .attr('width', width)
                .attr('height', heightPerCode - 2 * margin);

            self.render = function (data) {
                if (!data) {
                    return;
                }

                var boxSize = 10;
                var boxSpacing = 2;
                var colCount = Math.floor((heightPerCode - 2 * margin) / (boxSize + boxSpacing));

                codeBox.each(function(code){
                    var box = d3.select(this);

                    var labels = data.filter(function(d) { return d.mine.code == code.index; });
                    var i = 0;
                    var tweets = box.selectAll('.tweet-box')
                        .data(labels, function(l) {
                            l.index = i++;
                            return l.id;
                        });

                    tweets.enter().append("rect")
                        .attr("class", "tweet-box")
                        .attr("x", function(l) {
                            var row = Math.floor(l.index / colCount);
                            return row * (boxSize + boxSpacing); })
                        .attr("y", function(l) {
                            var col = l.index % colCount;
                            return col * (boxSize + boxSpacing);
                        })
                        .attr("width", boxSize)
                        .attr("height", boxSize)
                        .attr("fill", boxColor(code))
                        .attr("data-item", function(l) { return JSON.stringify(l); });

                    tweets.exit().remove();
                });
            };
        };

        return {
            restrict: 'EA',
            scope: {
                data: '=',
                codes: '=',
                boxColor: "="
            },
            link: function (scope, element, attrs) {

                if (!scope._TweetItems) {
                    var vis = scope._TweetItems = new TweetItems(scope, element, attrs);

                    // Watch for changes to the data
                    scope.$watch('data', function (newVals, oldVals) {
                        return vis.render(scope.data);
                    }, false);

                } else {
                    throw("What is this madness");
                }
            }
        };
    });
})();
