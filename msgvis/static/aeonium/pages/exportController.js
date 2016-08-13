(function () {
    'use strict';

    var module = angular.module('Aeonium.controllers');

    var ExportController = function ($scope, $timeout, Dictionary, Code, Message, Feature, History, usSpinnerService) {

        $scope.Message = Message;
        $scope.Code = Code;

        var sortOption_None = 0;
        var sortOption_Descending = 1;
        var sortOption_Ascending = 2;

        var toggleSort = function (previousSortOption) {
            return (previousSortOption + 1) % 3;
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
        $scope.exportPhase = undefined;
        $scope.currentMessage = undefined;
        $scope.selectedCode = undefined;
        $scope.codes = [];
        $scope.code_map = {};
        $scope.code_text_list = [];
        $scope.coded_messages = undefined;

        // Variables for ensuring a code definition is saved after the user edits it
        $scope.original_code_definition = undefined;
        $scope.is_editing_definition = false;
        $scope.ask_if_save_definition = false;

        // Tweets
        $scope.codeItems = undefined;
        $scope.selectedFilter = 'All';
        $scope.search = {text: "", feature: undefined};
        $scope.selectedMedia = undefined;

        $scope.allItems = undefined;
        $scope.allItemsMap = {};
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
            'D': 'Unsure',
            'P': 'My partner\'s code is correct'
        };

        /* Export Functions */
        $scope.saveSelections = function (save) {
            var code = $scope.selectedCode;
            if (save) {
                //save selections and navigate to next step
            }
            else {
                //do we even need this??? what's the point of the "Cancel" button?
            }
        };

        //create a blank array to store selected objects.
        $scope.selected = {
            codes: []
        };
        /* END Export Functions */

        /* General functions */
        $scope.code_map = function (distribution) {
            if ($scope.codes && distribution) {
                var dist = [];
                $scope.codes.forEach(function (code) {
                    dist.push(distribution[code.code_text]);
                });
                return dist;
            }
        };

        $scope.buttonStyle = function (code) {
            if (!code) return;

            var colorIndex = code.code_id;
            var color = $scope.colors[colorIndex % $scope.colors.length];
            var colorLight = $scope.colorsLight[colorIndex % $scope.colors.length];

            var css = {
                border: 'none',
                width: (100 / $scope.codes.length) + '%'
            };

            if ($scope.selectedCode == code) {
                css['background-color'] = color;
            }
            else {
                css['color'] = color;
                css['background-color'] = colorLight;

            }

            return css;
        };

        $scope.panelStyle = function (code) {
            if (!code) return;
            var colorIndex = code.code_id;
            var color = $scope.colorsLight[colorIndex % $scope.colorsLight.length];

            var css = {
                'background-color': color
            };
            return css;
        };

        $scope.distributionStyle = function (label, distribution) {
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
                'background-color': color,
                'width': width
            };

            return css;
        };

        $scope.charStyle = function (item, charIndex) {

            var tokenIndex = item.charToToken[charIndex];
            var filtered = item.message.fullToFiltered.get(tokenIndex);

            if (charIndex >= item.hoveredCharStart && charIndex <= item.hoveredCharEnd) {
                return {'background': "rgba(0,0,0,0.1)"};
            }
            else if (isTokenSelectedAtCharIndex(item, charIndex) || (isTokenSelectedAtCharIndex(item, charIndex - 1) && isTokenSelectedAtCharIndex(item, charIndex + 1))) {
                if (filtered) {
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
                        if (filtered) {
                            return {'background': $scope.colorsLight[feature.codeIndex % $scope.colors.length]};
                        }
                        else {
                            return {'background': $scope.colorsLighter[feature.codeIndex % $scope.colors.length]};
                        }
                    }
                }

                return {'background': 'transparent'};
            }
        };

        $scope.getAllMessages = function (updateFeaturesOnly) {
            History.add_record("getAllMessages:request-start", {updateFeaturesOnly: updateFeaturesOnly});
            var request = Message.load_all_coded_messages(/*"current"*/);
            if (request) {
                usSpinnerService.spin('submitted-label-spinner');
                request.then(function () {
                    usSpinnerService.stop('submitted-label-spinner');
                    History.add_record("getAllMessages:request-end", {updateFeaturesOnly: updateFeaturesOnly});

                    if (!updateFeaturesOnly) {
                        History.add_record("getAllMessages:initialize-all-message", {});
                        $scope.allItems = Message.all_coded_messages;
                        $scope.allItems.forEach(function (item) {
                            $scope.allItemsMap[item.message.id] = item;
                        });

                        $scope.normalized_code_distribution = Message.normalized_code_distribution;
                        $scope.code_distribution = Message.code_distribution;
                    }
                    else {
                        History.add_record("getAllMessages:update-features", {});
                        // Iterate through all messages and update the features
                        Message.all_coded_messages.forEach(function (item) {
                            if ($scope.allItemsMap.hasOwnProperty(item.message.id)) {
                                $scope.allItemsMap[item.message.id].feature_vector = item.feature_vector;
                                $scope.allItemsMap[item.message.id].active_features = item.active_features;
                            }
                        });
                    }
                });
            }
        };

        $scope.getCodeDetail = function () {
            History.add_record("getCodeDetail:request-start", {});
            var request = Code.init_load();
            if (request) {
                usSpinnerService.spin('page-spinner');
                request.then(function () {
                    usSpinnerService.stop('page-spinner');
                    History.add_record("getCodeDetail:request-end", {});
                    $scope.statusText = undefined;

                    $scope.codes = Code.codes;
                    $scope.selectedCode = $scope.codes[0];
                    $scope.load_distribution("user");
                    $scope.load_distribution("partner");
                    $scope.load_distribution("system");
                    $scope.load_pairwise_distribution();
                    $scope.getAllMessages();

                });
            }
        };

        var num_coded_message_requests = 0;
        $scope.getCodedMessages = function () {
            if ($scope.codes) {
                $scope.codes.forEach(function (code) {
                    var request = Message.load_coded_messages(code);
                    if (request) {
                        usSpinnerService.spin('code-detail-spinner');
                        History.add_record("getCodeMessages:request-start", {code: code});
                        num_coded_message_requests += 1;
                        request.then(function () {
                            num_coded_message_requests -= 1;
                            History.add_record("getCodeMessages:request-end", {code: code});
                            if (num_coded_message_requests == 0) {
                                usSpinnerService.stop('code-detail-spinner');
                                $scope.coded_messages = Message.coded_messages;
                            }

                        });
                    }
                });
            }
        };

        var num_distribution_queries = 0;
        $scope.load_distribution = function (source) {
            History.add_record("load_distribution:request-start", {source: source});
            var request = Feature.get_distribution(source);
            if (request) {
                usSpinnerService.spin('feature-spinner');
                num_distribution_queries += 1;
                request.then(function () {
                    num_distribution_queries -= 1;
                    if (num_distribution_queries <= 0)
                        usSpinnerService.stop('feature-spinner');
                    History.add_record("load_distribution:request-end", {source: source});
                    $scope.featureList[source] = Feature.distributions[source];
                });
            }

        };
        $scope.load_pairwise_distribution = function () {
            History.add_record("load_pairwise_distribution:request-start", {});
            var request = Code.get_pairwise();
            if (request) {
                usSpinnerService.spin('pairwise-spinner');
                request.then(function () {
                    usSpinnerService.stop('pairwise-spinner');
                    History.add_record("load_pairwise_distribution:request-end", {});
                    $scope.confusionPairs = Code.pairwise_distribution;
                });
            }

        };


        $scope.selectedCode = undefined;
        $scope.getCodeDetail();

        // Watchers

        // Specific event handlers
        /* $scope.$on('messages::load_coded_messages', function($event, data) {
         $scope.coded_messages = data;
         });*/
        // $scope.$on('definitions::updated', function ($event, data) {
        //     $scope.codes = data;
        //     $scope.code_text_list = [];
        //     $scope.codes.forEach(function (code) {
        //         $scope.code_map[code.code_text] = code;
        //         $scope.code_map[code.code_id] = code;
        //         $scope.code_text_list.push(code.code_text);
        //     });

        // });
        // $scope.$on('modal-hidden', function ($event) {
        //     if ($scope.is_definition_different()) {
        //         $('#code-definition').focus();
        //     }

        // });

    };

    ExportController.$inject = [
        '$scope',
        '$timeout',
        'Aeonium.services.Dictionary',
        'Aeonium.services.Code',
        'Aeonium.services.Message',
        'Aeonium.services.Feature',
        'Aeonium.services.ActionHistory',
        'usSpinnerService'
    ];

    module.controller('Aeonium.controllers.ExportController', ExportController);

})();
