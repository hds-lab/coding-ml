(function () {
    'use strict';


    var module = angular.module('TextCoder.controllers', [
        'TextCoder.services',
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
        'TextCoder.services.Dictionary'
    ];
    module.controller('TextCoder.controllers.DictionaryController', DictionaryController);

    var ViewController = function ($scope, Dictionary, SVMResult, FeatureVector, UserFeatures, usSpinnerService) {

        $scope.spinnerOptions = {
            radius: 20,
            width: 6,
            length: 10,
            color: "#000000"
        };
        var dist_max_height = 20; // in pixel

        $scope.svm_results = undefined;
        $scope.vector = undefined;
        $scope.features = [];

        $scope.load = function(){
            var request = SVMResult.load(Dictionary.id);
            if (request) {
                usSpinnerService.spin('table-spinner');
                request.then(function() {
                    usSpinnerService.stop('table-spinner');
                    SVMResult.dist_scale.range([0, dist_max_height]);
                    $scope.svm_results = SVMResult.data;
                });
            }

        };

        // load the svm results
        $scope.load();

        $scope.style = function(code){
            var colors = ["#fff5eb","#fee6ce","#fdd0a2","#fdae6b","#fd8d3c","#f16913","#d94801","#a63603","#7f2704"];
            var css = {
                'background-color' : 'none',
                'color': 'black'
            };
            var code_order = (Math.floor(code.order / 2));
            if (code_order  < colors.length ){
                css['background-color'] = colors[colors.length - code_order  - 1];
                if ( code_order  < 3)
                    css['color'] = '#ccc';
            }
            return css;
        };
        $scope.dist = function(code){
            var css = {
                'background-color': 'steelblue',
                'width' : 15,
                'height': SVMResult.dist_scale(code.train_count)
            };
            return css;
        };
        $scope.on_off = function(count){
            var css = {
                'background-color' : 'none',
                'color': 'black'
            };
            if (count > 0){
                css['background-color'] = "#fee0d2";
                //css['color'] = '#ccc';
            }
            return css;
        };
        $scope.active = function(tid){
            return ($scope.vector && $scope.vector.message.id == tid) ? "active" : "";
        };

        $scope.load_vector = function(tid){
            var request = FeatureVector.load(tid);
            if (request) {
                usSpinnerService.spin('vector-spinner');
                request.then(function() {
                    usSpinnerService.stop('vector-spinner');
                    $scope.vector = FeatureVector.data;

                    // TODO (jinasuh): Replace with actual data from service
                    var text = "RT @iNialls_Girl: R.I.P. to the 8 year old boy who died in Bostons explosions, while running for the Sandy Hook kids. #PrayForBoston ht ...";
                    var characters = text.split("");

                    var tokens = ["rt",
                                "@inialls_girl",
                                ":",
                                "r.i.p.",
                                "to",
                                "the",
                                "8",
                                "year",
                                "old",
                                "boy",
                                "who",
                                "died",
                                "in",
                                "bostons",
                                "explosions",
                                ",",
                                "while",
                                "running",
                                "for",
                                "the",
                                "sandy",
                                "hook",
                                "kids",
                                ".",
                                "#prayforboston",
                                "ht",
                                "..."];

                    var tokenItems = [];
                    var charToToken = [];

                    var lowerText = text.toLowerCase();
                    var currentIndex = 0;
                    for (var i = 0; i < tokens.length; i++)
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

                    $scope.vector.message.text = text;
                    $scope.vector.message.tokens = tokenItems;
                    $scope.vector.message.characters = characters;
                    $scope.vector.message.charToToken = charToToken;
                });
            }
        };

        $scope.getter = {
            'vector': function(feature){
                return $scope.vector.feature_vector[feature.word_index];
            }
        };

        // Feature selection logic and states
        $scope.selectedCharStart = -1;
        $scope.selectedCharEnd = -1;
        $scope.hoveredCharStart = -1;
        $scope.hoveredCharEnd = -1;
        $scope.clickStartTokenItem = undefined;
        $scope.selectedTokens = undefined;

        $scope.featureList = {};

        $scope.onCharMouseEnter = function(charIndex){
            //console.log("onCharMouseEnter:" + charIndex);

            if ($scope.vector && $scope.vector.message){
                var tokenIndex = $scope.vector.message.charToToken[charIndex];

                if (tokenIndex != undefined && $scope.vector.message.tokens[tokenIndex] != undefined) {
                    var tokenItem = $scope.vector.message.tokens[tokenIndex];
                    $scope.hoveredCharStart = tokenItem.startIndex;
                    $scope.hoveredCharEnd = tokenItem.endIndex;

                    // If we're in the middle of selection, update selected char indices
                    if ($scope.clickStartTokenItem != undefined){
                        if (tokenIndex < $scope.clickStartTokenItem.index){
                            $scope.selectedCharStart = tokenItem.startIndex;
                            $scope.selectedCharEnd = $scope.clickStartTokenItem.endIndex;
                        }
                        else if (tokenIndex > $scope.clickStartTokenItem.index){
                            $scope.selectedCharStart = $scope.clickStartTokenItem.startIndex;
                            $scope.selectedCharEnd = tokenItem.endIndex;
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

        $scope.onCharMouseDown = function(charIndex){
            //console.log("onCharMouseDown:" + charIndex);

            if ($scope.vector && $scope.vector.message) {

                var tokenIndex = $scope.vector.message.charToToken[charIndex];

                if (tokenIndex != undefined && $scope.vector.message.tokens[tokenIndex] != undefined) {

                    var tokenItem = $scope.vector.message.tokens[tokenIndex];

                    // if there was a selection at this tokenIndex, clear the selection
                    if (tokenItem.startIndex >= $scope.selectedCharStart && tokenItem.endIndex <= $scope.selectedCharEnd) {
                        $scope.clickStartTokenItem = undefined;
                        $scope.selectedCharStart = -1;
                        $scope.selectedCharEnd = -1;
                    }
                    else {
                        $scope.clickStartTokenItem = tokenItem;
                        $scope.selectedCharStart = tokenItem.startIndex;
                        $scope.selectedCharEnd = tokenItem.endIndex;
                    }
                }
                else {
                    $scope.clickStartTokenItem = undefined;
                    $scope.selectedCharStart = -1;
                    $scope.selectedCharEnd = -1;
                }
            }
        };

        $scope.onCharMouseUp = function(charIndex) {
            $scope.clickStartTokenItem = undefined;
            $scope.selectedTokens = undefined;

            if ($scope.selectedCharStart >= 0 && $scope.selectedCharEnd >= 0 && $scope.selectedCharStart <= $scope.selectedCharEnd) {
                if ($scope.vector && $scope.vector.message) {

                    var startTokenIndex = $scope.vector.message.charToToken[$scope.selectedCharStart];
                    var endTokenIndex = $scope.vector.message.charToToken[$scope.selectedCharEnd];

                    var tokens = [];
                    for (var i = startTokenIndex; i <= endTokenIndex; i++) {
                        tokens.push($scope.vector.message.tokens[i].text);
                    }

                    $scope.selectedTokens = tokens;
                }
            }
        };

        $scope.charStyle = function(charIndex){
            var style = {};
            if (charIndex >= $scope.hoveredCharStart && charIndex <= $scope.hoveredCharEnd){
                style["background"] = "#ffcc99";
            }

            if (charIndex >= $scope.selectedCharStart && charIndex <= $scope.selectedCharEnd){
                style["background"] = "#ff6600";
            }

            return style;
        };

        $scope.addFeature = function(tokens){
            if (tokens && tokens.length > 0){

                var key = tokens.join(" ");
                console.log("addFeature for: " + key);

                // check if it already exists
                var existingTokens = $scope.featureList[key];

                if (!existingTokens) {
                    var request = UserFeatures.add(tokens);
                    if (request) {
                        usSpinnerService.spin('vector-spinner');
                        request.then(function() {
                            usSpinnerService.stop('vector-spinner');
                            var featureId = UserFeatures.data;
                            $scope.featureList[key] = {
                                id: featureId,
                                tokens: tokens
                            };
                        });
                    }
                }
                else {
                    console.log("feature already exists: " + key);
                }

                $scope.clickStartTokenItem = undefined;
                $scope.selectedCharStart = -1;
                $scope.selectedCharEnd = -1;
                $scope.selectedTokens = null;
            }
        };

        $scope.removeFeature = function(feature){
            if (feature){
                var key = feature.tokens.join(" ");
                console.log("removeFeature for: " + key);

                // check if it already exists
                var existingTokens = $scope.featureList[key];

                if (existingTokens) {

                    var request = UserFeatures.remove(feature.id);
                    if (request) {
                        usSpinnerService.spin('vector-spinner');
                        request.then(function() {
                            usSpinnerService.stop('vector-spinner');
                            delete $scope.featureList[key];
                        });
                    }
                }
                else {
                    console.log("feature does not exist: " + key);
                }
            }
        }
    };

    ViewController.$inject = [
        '$scope',
        'TextCoder.services.Dictionary',
        'TextCoder.services.SVMResult',
        'TextCoder.services.FeatureVector',
        'TextCoder.services.UserFeatures',
        'usSpinnerService'
    ];
    module.controller('TextCoder.controllers.ViewController', ViewController);


    module.directive('datetimeFormat', function() {
      return {
        require: 'ngModel',
        link: function(scope, element, attrs, ngModelController) {
          ngModelController.$parsers.push(function(data) {
            //convert data from view format to model format
            data = moment.utc(data, "YYYY-MM-DD HH:mm:ss");
            if (data.isValid()) return data.toDate();
            else return undefined;
          });

          ngModelController.$formatters.push(function(data) {
            //convert data from model format to view format
              if (data !== undefined) return moment.utc(data).format("YYYY-MM-DD HH:mm:ss"); //converted
              return data;
          });
        }
      }
    });

    module.directive('whenScrolled', function() {
        return function(scope, element, attr) {
            var raw = element[0];

            var checkBounds = function(evt) {
                if (Math.abs(raw.scrollTop + $(raw).height() - raw.scrollHeight) < 10) {
                    scope.$apply(attr.whenScrolled);
                }

            };
            element.bind('scroll load', checkBounds);
        };
    });

    module.directive('ngEnter', function () {
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if(event.which === 13) {
                    scope.$apply(function (){
                        scope.$eval(attrs.ngEnter);
                    });

                    event.preventDefault();
                }
            });
        };
    });
})();
