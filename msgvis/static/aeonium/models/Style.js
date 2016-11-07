(function () {
    'use strict';

    var module = angular.module('Aeonium.models');

    //A service for code definition
    module.factory('Aeonium.models.Style', [
        'Aeonium.models.Utils',
        function styleFactory(Utils) {

            var Style = function () {
                var self = this;
                self.colors = ["#1f77b4", "#2ca02c", "#d62728", "#ff7f0e", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
                self.colorsLight = ["rgba(31,119,180,0.2)", "rgba(44,160,44,0.2)", "rgba(214,39,40,0.2)", "rgba(255,127,14,0.2)",
                    "rgba(148,103,189,0.2)", "rgba(140,86,75,0.2)", "rgba(227,119,194,0.2)", "rgba(127,127,127,0.2)", "rgba(188,189,34,0.2)",
                    "rgba(23,190,207,0.2)"];
                self.colorsLighter = ["rgba(31,119,180,0.1)", "rgba(44,160,44,0.1)", "rgba(214,39,40,0.1)", "rgba(255,127,14,0.1)",
                    "rgba(148,103,189,0.1)", "rgba(140,86,75,0.1)", "rgba(227,119,194,0.1)", "rgba(127,127,127,0.1)", "rgba(188,189,34,0.1)",
                    "rgba(23,190,207,0.1)"];
                self.spinnerOptions = {
                    radius: 20,
                    width: 6,
                    length: 10,
                    color: "#000000"
                };
                self.uncodedColor = "#777";
                self.uncodedColorLight = "#ddd";
                self.uncodedColorLighter = "#eee";
            };

            angular.extend(Style.prototype, {
                // codeIndex: number
                // returns string
                codeColor: function (codeIndex) {
                    var self = this;
                    var color = codeIndex != Utils.UNCODED_CODE_ID ? self.colors[codeIndex % self.colors.length] : self.uncodedColor;
                    return color;
                },

                // codeIndex: number
                // returns string
                codeColorLight: function (codeIndex) {
                    var self = this;
                    var color = codeIndex != Utils.UNCODED_CODE_ID ? self.colorsLight[codeIndex % self.colorsLight.length] : self.uncodedColorLight;
                    return color;
                },

                // codeIndex: number
                // returns string
                codeColorLighter: function (codeIndex) {
                    var self = this;
                    var color = codeIndex != Utils.UNCODED_CODE_ID ? self.colorsLighter[codeIndex % self.colorsLighter.length] : self.uncodedColorLighter;
                    return color;
                },

                // messageDetail: MessageDetail
                // charIndex: character index
                // returns style object
                charStyle: function (messageDetail, charIndex) {

                    var self = this;

                    var tokenIndex = messageDetail.charToToken[charIndex];
                    var filtered = messageDetail.fullToFiltered.get(tokenIndex);

                    if (charIndex >= messageDetail.hoveredCharStart && charIndex <= messageDetail.hoveredCharEnd) {
                        return {'background': "rgba(0,0,0,0.1)"};
                    }
                    else if (Utils.isTokenSelectedAtCharIndex(messageDetail, charIndex) ||
                        (Utils.isTokenSelectedAtCharIndex(messageDetail, charIndex - 1) &&
                        Utils.isTokenSelectedAtCharIndex(messageDetail, charIndex + 1))) {
                        if (filtered) {
                            return {'background': self.codeColorLight(messageDetail.label)};
                        }
                        else {
                            return {'background': self.codeColorLighter(messageDetail.label)};
                        }
                    }
                    else if (messageDetail.selectedTokens == undefined || messageDetail.selectedTokens.length == 0) {
                        for (var i = 0; messageDetail.featureHighlights && i < messageDetail.featureHighlights.length; i++) {
                            var feature = messageDetail.featureHighlights[i];
                            if (charIndex >= feature.startCharIndex && charIndex <= feature.endCharIndex) {
                                if (filtered) {
                                    return {'background': self.codeColorLight(feature.codeIndex)};
                                }
                                else {
                                    return {'background': self.codeColorLighter(feature.codeIndex)};
                                }
                            }
                        }

                        return {'background': 'transparent'};
                    }
                },

                // codeId: number
                // returns style object
                buttonStyle: function (codeId, selectedCodeId) {
                    var self = this;
                    var color = self.codeColor(codeId);

                    var css = {
                        border: 'solid 1px transparent',
                        width: '100px'
                    };

                    if (selectedCodeId == codeId) {
                        css['background-color'] = color;
                        css['color'] = 'white';
                    }
                    else {
                        css['color'] = color;
                        css['background-color'] = 'white';
                        css['border-color'] = color;
                    }

                    return css;
                },

                // codeId: number
                // returns style object
                definitionStyle: function (codeId) {
                    var self = this;
                    var color = self.codeColor(codeId);
                    var colorLight = self.codeColorLight(codeId);

                    var css = {
                        'background-color': colorLight,
                        'border': 'solid 2px ' + color
                    };

                    return css;
                },

                // feature: Feature
                // returns style object
                keywordStyle: function (feature) {
                    var self = this;
                    var color = self.codeColor(feature.codeId);
                    return {'border': '1px solid ' + color};
                },

                // codeId: number
                // distribution: number
                // returns style object
                distributionStyle: function (codeId, distribution) {
                    var self = this;
                    var color;
                    var width;

                    if (distribution > 0) {
                        color = self.codeColor(codeId);
                        width = Math.floor(distribution * 100) + "%";
                    }
                    else {
                        color = "transparent";
                        width = "0";
                    }

                    var css = {
                        'background-color': color,
                        'width': width
                    };

                    return css;
                },

                pillColor: function (codeId) {
                    var self = this;
                    var color = codeId == Utils.UNCODED_CODE_ID ? 'white' : self.codeColor(codeId);
                    var css = {
                        'background-color': color
                    };

                    return css;
                }
            });

            return new Style();
        }
    ]);
})();
