(function () {
    'use strict';

    var module = angular.module('Aeonium.models');

    //A service for code definition
    module.factory('Aeonium.models.Color', [
        function colorFactory() {

            var Color = function () {
                var self = this;
                self.colors = ["#1f77b4", "#2ca02c", "#d62728", "#ff7f0e", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
                self.colorsLight = ["rgba(31,119,180,0.2)", "rgba(44,160,44,0.2)", "rgba(214,39,40,0.2)", "rgba(255,127,14,0.2)",
                    "rgba(148,103,189,0.2)", "rgba(140,86,75,0.2)", "rgba(227,119,194,0.2)", "rgba(127,127,127,0.2)", "rgba(188,189,34,0.2)",
                    "rgba(23,190,207,0.2)"];
                self.colorsLighter = ["rgba(31,119,180,0.1)", "rgba(44,160,44,0.1)", "rgba(214,39,40,0.1)", "rgba(255,127,14,0.1)",
                    "rgba(148,103,189,0.1)", "rgba(140,86,75,0.1)", "rgba(227,119,194,0.1)", "rgba(127,127,127,0.1)", "rgba(188,189,34,0.1)",
                    "rgba(23,190,207,0.1)"];
            };

            angular.extend(Code.prototype, {

            });

            return new Color();
        }
    ]);
})();
