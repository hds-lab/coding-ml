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

            var Code = function () {
                var self = this;
                self.codeDefinitions = {}; // Map<number, CodeDefinition> keyed by codeId
            };

            angular.extend(Code.prototype, {
                // returns void
                loadCodeDefinitions: function () {
                    var self = this;

                    var sources = ["master", "user", "partner"];
                    var apiUrl = djangoUrl.reverse('definitions');

                    var request = {
                        params: {
                            source: sources.join(" ")
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
                        .success(function (def_sets) {
                            def_sets.forEach(function (def_set) {
                                def_set.definitions.forEach(function (def) {
                                    if (!self.codeDefinitions[def.code_id]) {
                                        self.codeDefinitions[def.code_id] = {
                                            codeId: def.code_id,
                                            name: def.code_text,
                                            masterDescription: {},
                                            userDescription: {},
                                            partnerDescription: {}
                                        }
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
                    var apiUrl = djangoUrl.reverse('definition', {code_id: codeDefinition.codeId});

                    var request = {
                        text: newDefinitionText
                    };

                    $rootScope.$broadcast('Code::codeDefinitions::updating');
                    return $http.put(apiUrl, request)
                        .success(function (data) {
                            console.log("Update definition for ", code);
                            $rootScope.$broadcast('Code::codeDefinitions::updated', self.codeDefinitions);
                        });


                }

            });

            return new Code();
        }
    ]);
})();
