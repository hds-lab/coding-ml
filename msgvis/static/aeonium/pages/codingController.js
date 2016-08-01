(function () {
    'use strict';

    var module = angular.module('Aeonium.controllers');

    var CodingController = function ($scope, $timeout, Dictionary, Code, Message, Feature, History, usSpinnerService) {

        $scope.Message = Message;
        $scope.Code = Code;

        var sortOption_None = 0;
        var sortOption_Descending = 1;
        var sortOption_Ascending = 2;

        $scope.spinnerOptions = {
            radius: 20,
            width: 6,
            length: 10,
            color: "#000000"
        };

        // Top panel
        $scope.currentMessage = undefined;
        $scope.selectedCode = undefined;
        //$scope.codes = [];
        //$scope.code_map = {};
        //$scope.code_text_list = [];
        //$scope.coded_messages = undefined;

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

        $scope.stage_desc = {
            N: 'Not yet start',
            I: 'Initialization',
            C: 'Coding',
            W: 'Waiting',
            R: 'Review',
            S: 'Switching stage'
        };

        $scope.code_map = function (distribution) {
            if ($scope.codes && distribution) {
                var dist = [];
                $scope.codes.forEach(function (code) {
                    dist.push(distribution[code.code_text]);
                });
                return dist;
            }
        };

        $scope.selectLabel = function (code) {
            History.add_record("selectLabel", {code: code});
            $scope.selectedCode = code;
            $scope.search = {text: "", feature: undefined};

            // set hover state on the first tweet
            if ($scope.coded_messages && $scope.coded_messages['user'][code.code_text] &&
                $scope.coded_messages['user'][code.code_text].length > 0) {
                $scope.hoveredItem = $scope.coded_messages['user'][code.code_text][0];
            }
        };

        $scope.selectMedia = function (media_url) {
            History.add_record("selectMedia", {media_url: media_url});
            $scope.selectedMedia = media_url;
        };

        $scope.selectFilter = function (filter) {
            History.add_record("selectFilter", {filter: filter});
            $scope.selectedFilter = filter;
        };

        $scope.selectConfusion = function (pair) {
            if ($scope.selectedConfusion == pair) {
                History.add_record("selectConfusion:deselect", {pair: pair});
                $scope.selectedConfusion = undefined;
            }
            else {
                History.add_record("selectConfusion:select", {pair: pair});
                $scope.selectedConfusion = pair;
            }
        };

        $scope.searchFeature = function (feature) {
            // Check if the previous feature matches the current one
            if ($scope.search.feature != feature) {
                History.add_record("selectFeature:select", {feature: feature});
                $scope.search.feature = feature;
            }
            else {
                History.add_record("selectFeature:deselect", {feature: feature});
                $scope.search.feature = undefined;
            }

            $scope.search.text = undefined;
        };

        $scope.removeSearchFeature = function () {
            History.add_record("removeSearchFeature", {});
            $scope.search.feature = undefined;
            $scope.search.text = undefined;
        };

        $scope.filterTweetsFlag = function () {
            return function (item) {
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

                var matched = $scope.searchTweets(item.message, $scope.search);

                return matched && flagged;
            }
        };

        $scope.filterTweets = function (filter) {
            return function (item) {
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

        $scope.filterTweetsConfusion = function (item) {
            if (item) {
                var confusion = $scope.selectedConfusion;
                var searchText = $scope.search.text;
                var flagged = !confusion || (item.user_code.text == confusion.user_code && item.partner_code.text == confusion.partner_code);

                var matched = $scope.searchTweets(item.message, $scope.search);

                return matched && flagged;
            }
        };

        $scope.hasTweet = function () {
            return ($scope.allItems && $scope.allItems.filter($scope.filterTweetsByConfusionAndCode).length > 0)
        };

        $scope.filterTweetsByConfusionAndCode = function (item) {
            if (item) {
                var confusion = $scope.selectedConfusion;
                var flagged = !confusion || (item.user_code.text == confusion.user_code && item.partner_code.text == confusion.partner_code);
                var rightCode = ($scope.selectedCode) && (item.user_code.id == $scope.selectedCode.code_id);

                var matched = $scope.searchTweets(item.message, $scope.search);
                return matched && flagged && rightCode;
            }


        };

        $scope.searchTweets = function (message, search) {
            var matched = false;

            // Are we searching for text or features?
            if (search.feature) {
                //History.add_record("searchTweets:feature", {message: message, search: search});
                var matchedTokenIndices = Message.match_feature(message, search.feature);
                matched = matchedTokenIndices && matchedTokenIndices.length > 0;
            }
            else {
                //History.add_record("searchTweets:text", {message: message, search: search});
                var searchText = search.text;
                matched = (!searchText || searchText.length == 0 || Message.match_text(message, searchText));
            }

            return matched;
        };

        $scope.hasConfusion = function () {
            return ($scope.confusionPairs && ($scope.confusionPairs.filter($scope.filterConfusionByCode).length > 0));
        };

        $scope.filterConfusionByCode = function (confusion) {
            if (confusion) {
                return confusion.count > 0 && $scope.selectedCode && confusion.user_code == $scope.selectedCode.code_text;
            }
            return false;
        };

        $scope.filterFeatures = function (code, feature) {
            if (code && feature) {
                return feature.distribution && feature.distribution[code.code_text] > 0;
            }
            return false;
        };

        $scope.hasFeatureOfCode = function (code, featureList) {
            if (code && featureList) {
                var count = 0;
                for (var key in featureList) {
                    if (featureList.hasOwnProperty(key)) {
                        count += ($scope.filterFeatures(code, featureList[key]) == true);
                    }
                }
                return count > 0;
            }
            return false;
        };

        $scope.pillColor = function (code_id) {
            if (code_id) {
                return $scope.colors[code_id % $scope.colors.length];
            }
            else {
                return "#aaa";
            }
        };

        $scope.myKeywordStyle = function (feature) {
            if (feature && feature.source != "system") {
                var color = $scope.colors[feature.origin_code_id % $scope.colors.length];
                return {'border': '1px solid ' + color};
            }
            else {
                return {};
            }
        };

        $scope.codeColor = function (code) {
            if (!code) return;
            var colorIndex = code.code_id;
            var color = $scope.colors[colorIndex % $scope.colors.length];
            return color;
        };

        $scope.codeColorLight = function (code) {
            if (!code) return;
            var colorIndex = code.code_id;
            var color = $scope.colorsLight[colorIndex % $scope.colorsLight.length];
            return color;
        };

        $scope.codeColorLighter = function (code) {
            if (!code) return;
            var colorIndex = code.code_id;
            var color = $scope.colorsLighter[colorIndex % $scope.colorsLighter.length];
            return color;
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

        $scope.definitionStyle = function (code) {
            if (!code) return;

            var colorIndex = code.code_id;
            var color = $scope.colors[colorIndex % $scope.colors.length];
            var colorLight = $scope.colorsLight[colorIndex % $scope.colors.length];

            var css = {
                'background-color': colorLight,
                'border': 'solid 2px ' + color
            };

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

        $scope.getMessageDetail = function (messageId) {
            History.add_record("getMessageDetail:request-start", {});

            var request = Message.load_message_details("user", messageId);
            if (request) {
                usSpinnerService.spin('label-spinner');
                request.then(function () {
                    usSpinnerService.stop('label-spinner');
                    History.add_record("getMessageDetail:request-end", {});
                    $scope.currentMessage = Message.current_message;
                });
            }
        };

        $scope.submitLabel = function () {
            History.add_record("submitLabel:request-start", {});

            var request = Message.submit($scope.selectedCode.code_id);
            if (request) {
                usSpinnerService.spin('label-spinner');
                request.then(function () {
                    usSpinnerService.stop('label-spinner');
                    History.add_record("submitLabel:request-end", {});

                    // Save the submitted message to the list and reset selected code
                    var idx = $scope.coded_messages['user'][$scope.selectedCode.code_text]
                        .map(function (d) {
                            return d.message.id;
                        })
                        .indexOf(Message.last_message.message.id);
                    if (idx != -1) {
                        $scope.coded_messages['user'][$scope.selectedCode.code_text].splice(idx, 1);
                    }
                    $scope.coded_messages['user'][$scope.selectedCode.code_text].unshift(Message.last_message);
                    $scope.selectedCode = undefined;

                    // TODO: Get next thing to label????
                    var messageId = Math.floor(Math.random() * 3900);
                    $scope.getMessageDetail(messageId);
                });
            }
        };

        $scope.processing = false;

        $scope.updateItem = function (item, is_saved, is_example, is_ambiguous) {
            item.is_saved = is_saved;
            item.is_example = is_example;
            item.is_ambiguous = is_ambiguous;
            History.add_record("updateItem:request-start", {item: item});
            var request = Message.update_flags(item);
            if (request) {
                usSpinnerService.spin('submitted-label-spinner');
                request.then(function () {
                    usSpinnerService.stop('submitted-label-spinner');
                    History.add_record("updateItem:request-end", {item: item});
                });
            }
        };


        $scope.ask_if_change_code = false;
        $scope.message_for_change = undefined;
        $scope.showIndicator = function (item) {
            return item.disagreement_indicator;
        };
        $scope.updateIndicator = function (item, disagreement) {

            if (disagreement && item.disagreement_indicator != disagreement) {
                History.add_record("updateIndicator:request-start", {item: item, disagreement: disagreement});
                var request = Message.update_disagreement_indicator(item.message.id, disagreement);
                if (request) {
                    usSpinnerService.spin('submitted-label-spinner');
                    request.then(function () {
                        usSpinnerService.stop('submitted-label-spinner');
                        item.disagreement_indicator = disagreement;
                        History.add_record("updateIndicator:request-end", {item: item, disagreement: disagreement});
                        if (disagreement == 'P') {
                            History.add_record("updateIndicator:show-dialog", {item: item, disagreement: disagreement});
                            $scope.ask_if_change_code = true;
                            $scope.message_for_change = item;

                        }
                    });
                }
            }
        };

        $scope.changeCode = function () {

            History.add_record("changeCode:request-start", {
                message_for_change: $scope.message_for_change,
                partner_code: $scope.message_for_change.partner_code.id
            });
            var request = Message.update_code($scope.message_for_change,
                $scope.message_for_change.partner_code.id);
            if (request) {
                usSpinnerService.spin('submitted-label-spinner');
                request.then(function () {
                    usSpinnerService.stop('submitted-label-spinner');
                    History.add_record("changeCode:request-end", {
                        message_for_change: $scope.message_for_change,
                        partner_code: $scope.message_for_change.partner_code.id
                    });

                    // TODO: rewrite to avoid reloading whole; but need to go through all messages for feature color
                    $scope.load_distribution('user');

                    var id_list = $scope.allItems.map(function (d) {
                        return d.message.id;
                    });
                    var idx = id_list.indexOf($scope.message_for_change.message.id);
                    $scope.allItems[idx].user_code = $scope.allItems[idx].partner_code;

                    if ($scope.selectedConfusion && $scope.selectedConfusion.count == 0) {
                        // Unselected confusion pair
                        $scope.selectedConfusion = undefined;
                        History.add_record("changeCode:deselect-no-longer-existed-confusion",
                            {selectedConfusion: $scope.selectedConfusion});
                    }


                    // Update the active features for messages whose feature_vector contains this message id
                    var effectedMessages = $scope.allItems.filter(function (m) {
                        return m.feature_vector.filter(function (f) {
                                return f.origin_message_id == $scope.message_for_change.message.id;
                            }).length > 0;
                    });

                    for (var i = 0; i < effectedMessages.length; i++) {
                        var messageItem = effectedMessages[i];
                        var features = [];
                        for (i = 0; i < messageItem.feature_vector.length; i++) {
                            var feature = messageItem.feature_vector[i];
                            if (feature.origin_message_id == $scope.message_for_change.message.id) {
                                feature.origin_code_id = $scope.message_for_change.partner_code.id;
                            }

                            var matchedTokenIndices = Message.match_feature(messageItem.message, feature);

                            matchedTokenIndices.forEach(function (tokenIndex) {
                                var tokenItem = messageItem.tokens[tokenIndex];
                                features.push({
                                    startCharIndex: tokenItem.startIndex,
                                    endCharIndex: tokenItem.endIndex,
                                    codeIndex: feature.origin_code_id
                                });
                            });
                        }

                        messageItem.active_features = features;
                    }


                    $scope.ask_if_change_code = false;


                });
            }

        };


        /** Functions for handling definitions start */

        $scope.hasDefinition = function (code, source) {
            if (!code) return false;
            return Code.definitions_by_code && Code.definitions_by_code[code.code_text][source] &&
                Code.definitions_by_code[code.code_text][source].hasOwnProperty('text') &&
                Code.definitions_by_code[code.code_text][source].text.trim().length > 0;
        };

        $scope.hasExample = function (code, source) {
            if (!code) return false;
            return Code.definitions_by_code && Code.definitions_by_code[code.code_text][source] &&
                Code.definitions_by_code[code.code_text][source].hasOwnProperty('examples') &&
                Code.definitions_by_code[code.code_text][source].examples.length > 0;
        };

        $scope.saveDefinition = function () {
            var code = $scope.selectedCode;
            if (code && $scope.hasDefinition(code, "user")) {
                History.add_record("saveDefinition:request-start", {
                    code: code,
                    definition: Code.definitions_by_code[code.code_text]["user"].text
                });
                var request = Code.update_definition(code);
                if (request) {
                    usSpinnerService.spin('code-detail-spinner');
                    request.then(function () {
                        usSpinnerService.stop('code-detail-spinner');
                        History.add_record("saveDefinition:request-end", {
                            code: code,
                            definition: Code.definitions_by_code[code.code_text]["user"].text
                        });

                        $scope.original_code_definition = Code.definitions_by_code[code.code_text]["user"].text.trim();
                    });
                }
            }
        };

        $scope.is_definition_different = function () {
            var code = $scope.selectedCode;
            return ($scope.is_editing_definition && (typeof($scope.original_code_definition) !== "undefined") &&
            ($scope.original_code_definition.trim() !== Code.definitions_by_code[code.code_text]["user"].text.trim()) );
        };

        $scope.startEditing = function () {
            var code = $scope.selectedCode;
            if ($scope.is_editing_definition == false) {
                History.add_record("definition:startEditing", {code: code});
                $scope.is_editing_definition = true;
                $scope.original_code_definition = Code.definitions_by_code[code.code_text]["user"].text.trim();
            }
        };

        $scope.finishEditing = function () {
            var code = $scope.selectedCode;
            if ($scope.is_definition_different()) {
                History.add_record("definition:finishEditing:handle-unsaved-definition", {code: code});
                $scope.ask_if_save_definition = true;
            }
            else {
                History.add_record("definition:finishEditing:end", {code: code});
                $scope.original_code_definition = undefined;
                $scope.is_editing_definition = false;
            }

        };

        $scope.handleDefinitionChanges = function (save) {
            var code = $scope.selectedCode;
            if (save) {
                History.add_record("definition:handleDefinitionChanges:save", {code: code});
                $scope.saveDefinition();
            }
            else {
                History.add_record("definition:handleDefinitionChanges:discard", {code: code});
                Code.definitions_by_code[code.code_text]["user"].text = $scope.original_code_definition;
            }
            $scope.original_code_definition = undefined;
            $scope.ask_if_save_definition = false;
            $scope.is_editing_definition = false;

        };
        /** Functions for handling definitions end */


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

                    $scope.load_distribution("user");
                    $scope.load_distribution("partner");
                    $scope.load_distribution("system");
                    $scope.getCodedMessages();
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


        // Feature selection logic and states

        var updateSelection = function (item, startIndex, endIndex, isSelected, shouldClear) {
            History.add_record("tokens:updateSelection", {
                item: item,
                startIndex: startIndex,
                endIndex: endIndex,
                isSelected: isSelected,
                shouldClear: shouldClear
            });
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

        var isTokenSelectedAtCharIndex = function (item, charIndex) {
            if (item && item.selectedTokenIndices) {
                var tokenIndex = item.charToToken[charIndex];
                if (tokenIndex != undefined && item.selectedTokenIndices.get(tokenIndex) == tokenIndex) {
                    return true;
                }
            }

            return false;
        };

        $scope.onCharMouseEnter = function (item, charIndex) {

            if (item) {
                History.add_record("tokens:onCharMouseEnter:item-exists", {item: item, charIndex: charIndex});
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
                    History.add_record("tokens:onCharMouseEnter:item-not-exists", {item: item, charIndex: charIndex});
                    item.hoveredCharStart = -1;
                    item.hoveredCharEnd = -1;
                }
            }
        };

        $scope.onCharMouseLeave = function (item, charIndex) {
            //console.log("onCharMouseLeave:" + charIndex);
            History.add_record("tokens:onCharMouseLeave", {item: item, charIndex: charIndex});
            item.hoveredCharStart = -1;
            item.hoveredCharEnd = -1;
        };

        $scope.onCharMouseDown = function (item, charIndex, event) {
            //console.log("onCharMouseDown:" + charIndex);

            if (item) {
                var tokenIndex = item.charToToken[charIndex];

                if (tokenIndex != undefined && item.tokens[tokenIndex] != undefined) {
                    History.add_record("tokens:onCharMouseDown:token-exists", {
                        item: item, charIndex: charIndex,
                        tokenIndex: tokenIndex
                    });

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
                    History.add_record("tokens:onCharMouseDown:token-clean", {item: item, charIndex: charIndex});
                    item.clickStartTokenItem = undefined;
                    item.selectedTokenIndices.clear();
                }
            }
        };

        $scope.onCharMouseUp = function (item, charIndex) {
            item.clickStartTokenItem = undefined;
            item.selectedTokens = undefined;

            if (item.selectedTokenIndices.size > 0) {
                if (item) {
                    History.add_record("tokens:onCharMouseUp:item-exists", {item: item, charIndex: charIndex});
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

        $scope.onItemHover = function (item) {
            if ($scope.hoveredItem && $scope.hoveredItem != item && $scope.hoveredItem.selectedTokenIndices) {
                $scope.hoveredItem.selectedTokens = undefined;
                $scope.hoveredItem.selectedTokenIndices.clear();
                History.add_record("messages:onItemHover:clearHover", {item: item});
            }

            if ($scope.hoveredItem != item) {
                $scope.hoveredItem = item;
                History.add_record("messages:onItemHover:hover", {item: item});
                //console.log("onItemHover");
                //if (item.submittedTokenIndices && item.submittedTokenIndices.size > 0) {
                //    item.submittedTokenIndices.forEach(function (tokenIndex) {
                //        updateSelection(item, tokenIndex, tokenIndex, true, false);
                //    });
                //}
            }
        };

        $scope.onItemLeave = function (item) {
        };
        $scope.stageSelectable = function (item) {
            return "pointer";
        };

        $scope.replaceFeature = function (featureConflict) {
            $scope.featureConflict = null;
            History.add_record("replaceFeature", {featureConflict: featureConflict});
            if (featureConflict) {
                if (featureConflict.existingFeatureText) {
                    $scope.removeFeature(featureConflict.existingFeatureText);
                }
                else if (featureConflict.existingMessageFeature) {
                    $scope.removeFeature(featureConflict.existingMessageFeature);
                }

                $scope.addFeature(featureConflict.item);
            }
        };

        $scope.addFeature = function (item) {
            if (item && item.selectedTokens && item.selectedTokens.length > 0) {
                History.add_record("addFeature", {item: item});
                var tokens = [];
                // selectedTokenIndices are ordered by the tokens added, not by their index
                var tokenIndices = [];
                item.selectedTokenIndices.forEach(function (value, key) {
                    tokenIndices.push(key);
                });

                tokenIndices.sort(function (a, b) {
                    return a - b;
                }).forEach(function (tokenIndex) {
                    tokens.push(item.message.lemmatized_tokens[tokenIndex]);
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

                    var request = Feature.add(tokens, item.message.id);
                    if (request) {
                        usSpinnerService.spin('submitted-label-spinner');
                        request.then(function () {
                            usSpinnerService.stop('submitted-label-spinner');
                            var feature = Feature.latest_data;

                            // Update the features (need to refresh the whole data so we can get the counts for this stage only)
                            //$scope.load_distribution('user'); // No need to reload as the distribution is return with the data

                            // add to the top of the list to update the UI
                            $scope.featureList.user.unshift(feature);
                            $scope.featureList.user["" + feature.feature_text] = feature;

                            // Update the message level features
                            $scope.getAllMessages(true);
                        });
                    }


                    //var newMap = {};

                    //item.submittedTokenIndices = new Map();
                    //item.selectedTokenIndices.forEach(function (val, key) {
                    //    item.submittedTokenIndices.set(key, val);
                    //});

                    item.clickStartTokenItem = undefined;
                }
            }
        };

        $scope.removeFeature = function (feature, $event) {
            if ($event) {
                $event.preventDefault();
                $event.stopPropagation();
            }

            if (feature) {
                History.add_record("removeFeature", {feature: feature});

                // Remove from list
                var index = $scope.featureList.user.indexOf(feature);
                if (index > -1) {
                    $scope.featureList.user.splice(index, 1);
                }

                delete $scope.featureList.user["" + feature.feature_text];

                if (feature.feature_id) {
                    History.add_record("removeFeature:request-start", {feature: feature});
                    var request = Feature.remove(feature);
                    if (request) {
                        usSpinnerService.spin('vector-spinner');
                        request.then(function () {
                            usSpinnerService.stop('vector-spinner');
                            History.add_record("removeFeature:request-end", {feature: feature});

                            // Update the message level features
                            $scope.getAllMessages(true);
                        });
                    }
                }
            }
        };

        // TODO: Get this information from the message list model

        $scope.selectedCode = undefined;
        $scope.getCodeDetail();


        // Watchers
        $scope.$watch('Code.codes', function (newVal, oldVal) {
            if (newVal && (newVal != oldVal)) {
                var messageId = Math.floor(Math.random() * 3900);
                $scope.getMessageDetail(messageId);
            }
        });

        // Specific event handlers
        /* $scope.$on('messages::load_coded_messages', function($event, data) {
         $scope.coded_messages = data;
         });*/
        $scope.$on('definitions::updated', function ($event, data) {
            $scope.codes = data;
            $scope.code_text_list = [];
            $scope.codes.forEach(function (code) {
                $scope.code_map[code.code_text] = code;
                $scope.code_map[code.code_id] = code;
                $scope.code_text_list.push(code.code_text);
            });

        });
        $scope.$on('modal-hidden', function ($event) {
            if ($scope.is_definition_different()) {
                $('#code-definition').focus();
            }

        });

    };

    CodingController.$inject = [
        '$scope',
        '$timeout',
        'Aeonium.services.Dictionary',
        'Aeonium.services.Code',
        'Aeonium.services.Message',
        'Aeonium.services.Feature',
        'Aeonium.services.ActionHistory',
        'usSpinnerService'
    ];

    module.controller('Aeonium.controllers.CodingController', CodingController);

})();
