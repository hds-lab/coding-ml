(function () {
    'use strict';

    var module = angular.module('Aeonium.models');

    //class Feature {
    //    startCharIndex: number;
    //    endCharIndex: number;
    //    codeIndex: number;
    //    source: string;
    //}

    //A service for user defined features.
    module.factory('Aeonium.models.Feature', [
        '$http', 'djangoUrl',
        'Aeonium.models.Code',
        function scriptFactory($http, djangoUrl, Code) {

            var listApiUrl = djangoUrl.reverse('feature_list');

            var Feature = function () {
                var self = this;
                self.userFeatures = []; // Feature[]
            };

            angular.extend(Feature.prototype, {
                // source: string
                // returns Feature[]
                getFeatures: function (source) {
                    var self = this;

                    var request = {
                        params: {}
                    };
                    return $http.get(listApiUrl, request)
                        .success(function (data) {
                            var features = data.map(function(f) { return f; });
                            self.userFeatures = features;
                        });
                }
            });

            return new Feature();
        }
    ]);
})();
