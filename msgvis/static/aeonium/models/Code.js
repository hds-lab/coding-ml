(function () {
    'use strict';

    var module = angular.module('Aeonium.models');

    //A service for code definition
    module.factory('Aeonium.models.Code', [
        '$http', 'djangoUrl', '$rootScope',
        function codeFactory($http, djangoUrl, $rootScope) {

            //class CodeDefinition {
            //	codeId: number;
            //	name: string;
            //	masterDescription: CodeDescription;
            //	userDescription: CodeDescription;
            //	partnerDescription: CodeDescription;
            //}
            //
            //class CodeDescription {
            //	source: string;
            //	text: string;
            //	examples: CodeExample[];
            //}
            //
            //class CodeExample {
            //	code: number;
            //	source: string;
            //	text: string;
            //}

            //class PairwiseComparison {
            //    userCodeId: number;
            //    partnerCodeId: number;
            //    count: number;
            //}

            var Code = function () {
                var self = this;
                self.codeDefinitions = {}; // Map<number, CodeDefinition> keyed by codeId
                self.codeNameToId = {}; // Map<string, number> Mapping from code name to code id
                self.pairwiseComparisons = []; // PairwiseComparison[]
            };

            angular.extend(Code.prototype, {
                // partnerUserName: string
                // returns void
                loadCodeDefinitions: function (partnerUserName) {
                    var self = this;

                    var sources = ["master", "user", "partner"];
                    var apiUrl = djangoUrl.reverse('definitions');

                    var request = {
                        params: {
                            source: sources.join(" "),
                            partner: partnerUserName
                        }
                    };

                    // Returned data format
                    //"code_id": self.id,
                    //"code_text": self.text,
                    //"source": source,
                    //"text": definition.text,
                    //"examples": definition.examples

                    $rootScope.$broadcast('Code::codeDefinitions::loading');
                    return $http.get(apiUrl, request)
                        .then(function (response) {
                            response.data.forEach(function (def_set) {
                                def_set.definitions.forEach(function (def) {
                                    if (!self.codeDefinitions[def.code_id]) {
                                        self.codeDefinitions[def.code_id] = {
                                            codeId: def.code_id,
                                            name: def.code_text,
                                            masterDescription: {},
                                            userDescription: {},
                                            partnerDescription: {}
                                        };

                                        self.codeNameToId[def.code_text] = def.code_id;
                                    }

                                    var description;

                                    if (def_set.source == 'master') {
                                        description = self.codeDefinitions[def.code_id].masterDescription;
                                    }
                                    else if (def_set.source == 'user') {
                                        description = self.codeDefinitions[def.code_id].userDescription;
                                    }
                                    else {
                                        description = self.codeDefinitions[def.code_id].partnerDescription;
                                    }

                                    description.source = def.source;
                                    description.text = def.text;
                                    description.examples = def.examples;
                                });
                            });

                            $rootScope.$broadcast('Code::codeDefinitions::loaded', self.codeDefinitions);
                        });

                },

                // codeDefinition: CodeDefinition
                // newDefinitionText: string
                // returns void
                updateDefinition: function (codeDefinition, newDefinitionText) {
                    var self = this;
                    var codeId = codeDefinition.codeId;
                    var apiUrl = djangoUrl.reverse('definition', {code_id: codeId});

                    var request = {
                        text: newDefinitionText
                    };

                    $rootScope.$broadcast('Code::codeDefinitions::updating', codeId);
                    return $http.put(apiUrl, request)
                        .then(function (response) {
                            console.log("Update definition for ", code);
                            $rootScope.$broadcast('Code::codeDefinitions::updated', codeId, self.codeDefinitions[codeId]);
                        });
                },

                // codeName: string
                // return number
                getCodeIdFromCodeName: function (codeName) {
                    var self = this;
                    return self.codeNameToId[codeName];
                },

                // partnerUserName: string
                getPairwiseComparison: function (partnerUserName) {
                    var self = this;
                    var request = {
                        params: {
                            stage: undefined,
                            partner: partnerUserName
                        }
                    };

                    var apiUrl = djangoUrl.reverse('pairwise');

                    $rootScope.$broadcast('Code::pairwiseComparison::loading');

                    return $http.get(apiUrl, request)
                        .then(function (response) {
                            self.pairwiseComparisons = response.data.map(function (pair) {
                                //class PairwiseComparison {
                                //    userCodeId: number;
                                //    partnerCodeId: number;
                                //    count: number;
                                //}
                                return {
                                    userCodeId: self.getCodeIdFromCodeName(pair.user_code),
                                    partnerCodeId: self.getCodeIdFromCodeName(pair.partner_code),
                                    count: pair.count
                                };
                            });
                            $rootScope.$broadcast('Code::pairwiseComparison::loaded', self.pairwiseComparisons);
                        });
                }

            });

            return new Code();
        }
    ]);
})();
