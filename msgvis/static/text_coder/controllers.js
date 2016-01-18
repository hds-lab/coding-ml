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

    var ViewController = function ($scope, Dictionary, SVMResult, FeatureVector, usSpinnerService) {

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

        $scope.style = function(code, codeIndex){
            var fullColors = 
                [["#f6faea","#e5f1c0","#d4e897","#bada58","#98bc29","#769220","#556817","#333f0e","#222a09"],
                ["#f4eef6","#dfcde4","#bf9cc9","#aa7bb7","#865195","#683f74","#4a2d53","#35203b","#1e1221"],
                ["#fce8f1","#f7bbd4","#f28db7","#ec5f9a","#e41b6e","#b71558","#911146","#720d37","#440821"],
                ["#e9f0fb","#bed1f4","#92b3ed","#5185e1","#2361cf","#1a4899","#12336d","#0b1f41","#07142c"],
                ["#fff5eb","#fee6ce","#fdd0a2","#fdae6b","#fd8d3c","#f16913","#d94801","#a63603","#7f2704"]];
            
            var colorIndex = 0;
            if (codeIndex < fullColors.length) { colorIndex = codeIndex;}
            var colors = fullColors[colorIndex];

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
                });
            }
        };

        $scope.getter = {
            'vector': function(feature){
                return $scope.vector.feature_vector[feature.word_index];
            }
        }



    };
    ViewController.$inject = [
        '$scope',
        'TextCoder.services.Dictionary',
        'TextCoder.services.SVMResult',
        'TextCoder.services.FeatureVector',
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
