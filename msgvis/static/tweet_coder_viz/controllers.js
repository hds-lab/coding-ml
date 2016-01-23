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

    var ViewController = function ($scope, $timeout, Dictionary, SVMResult, usSpinnerService) {
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

        $scope.currentMessage = undefined;
        $scope.currentLabel = undefined;
        $scope.isCurrentMessageAmbiguous = false;
        $scope.codes = undefined;
        $scope.submittedLabels = undefined;
        $scope.displayedLabels = [];

        $scope.load = function(){
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
                        var label = {
                            text: i + "@HopeForBoston: R.I.P. to the 8 year-old girl who died in Bostons explosions, while running for the Sandy @PeytonsHead RT for spam please",
                            ambiguous: ambiguous.toString()
                        };

                        $scope.codes.forEach(function(c) {
                            label[c.text] = (c.index == codeIndex ? "X" : "");
                        });

                        $scope.submittedLabels.push(label);
                    }

                    $scope.features = {
                        user: [],
                        system: []
                    };

                    // Fake features for now
                    for (var i = 0; i < 10; i++){
                        var feature = {
                            word: "feature" + i,
                            count: Math.floor(Math.random() * 30) + 1,
                            codes: []
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

        $scope.getMessage = function() {
            console.log("getMessage");
            usSpinnerService.spin('label-spinner');

            $timeout(function(){
                console.log("gotMessage");
                usSpinnerService.stop('label-spinner');
                $scope.currentMessage = (new Date()) + "@HopeForBoston: R.I.P. to the 8 year-old girl who died in Bostons explosions, while running for the Sandy @PeytonsHead RT for spam please";
                $scope.selectLabel(null);
                $scope.isCurrentMessageAmbiguous = false;
            }, 1000);
        };

        $scope.selectLabel = function(label){
            console.log("selectLabel " + label);
            $scope.currentLabel = label;
        };

        $scope.submitLabel = function(){
            console.log("submitLabel");
            $scope.getMessage();
        };

        $scope.codeStyle = function(codeIndex, code){

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

        // load the svm results
        $scope.load();

        // fetch a message to label
        $scope.getMessage();
    };

    ViewController.$inject = [
        '$scope',
        '$timeout',
        'TweetCoderViz.services.Dictionary',
        'TweetCoderViz.services.SVMResult',
        'usSpinnerService'
    ];
    module.controller('TweetCoderViz.controllers.ViewController', ViewController);


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
