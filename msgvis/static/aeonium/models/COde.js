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
            //	descriptions: CodeDescription[];
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
                self.definitionsByCodeName = {}; // Map<string, CodeDefinition>
                self.codeDefinitions = []; // CodeDefinition[]
            };

            angular.extend(Code.prototype, {
                // returns void
                loadCodeDefinitions: function(){
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

                    return $http.get(apiUrl, request)
                        .success(function (def_sets) {
                            def_sets.forEach(function(def_set){
                                def_set.definitions.forEach(function(def){
                                    if (!self.definitionsByCodeName[def.code_text]){
                                        self.definitionsByCodeName[def.code_text] = {
                                            codeId: def.code_id,
                                            name: def.code_text,
                                            descriptions: []
                                        }
                                    }

                                    self.definitionsByCodeName[def.code_text].descriptions.push({
                                        source: def.source,
                                        text: def.text,
                                        examples: def.examples
                                    });
                                });
                            });

                            self.codeDefinitions = self.definitionsByCodeName.map(function(codeName) { return self.definitionsByCodeName[codeName]; });

                            $rootScope.$broadcast('Code::codeDefinitions', self.codeDefinitions);
                        });

                },

                // codeDefinition: CodeDefinition
                // newDefinitionText: string
                // returns void
                updateDefinition: function(codeDefinition, newDefinitionText){
                    var self = this;
                    var apiUrl = djangoUrl.reverse('definition', {code_id: codeDefinition.codeId});

                    var request = {
                        text: newDefinitionText
                    };

                    return $http.put(apiUrl, request)
                        .success(function (data) {
                            console.log("Update definition for ", code);
                        });


                }

            });

            return new Code();
        }
    ]);
})();
