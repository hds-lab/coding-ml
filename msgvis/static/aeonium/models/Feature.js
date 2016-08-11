(function () {
    'use strict';

    var module = angular.module('Aeonium.models');

    //class Feature {
    //    id: number;
    //    index: number;
    //    text: string;
    //    source: string;
    //    distribution: Map<number, FeatureDistribution>; // keyed by codeId
    //    totalCount: number;
    //    entropy: number;
    //    messageId: number;
    //    codeId: number;
    //}

    //class FeatureDistribution {
    //    distribution: number;
    //    count: number;
    //}

    //A service for user defined features.
    module.factory('Aeonium.models.Feature', [
        '$http', 'djangoUrl', '$rootScope',
        'Aeonium.models.Utils',
        function scriptFactory($http, djangoUrl, $rootScope, Utils) {

            var listApiUrl = djangoUrl.reverse('feature_list');

            var Feature = function () {
                var self = this;
                self.userFeatures = undefined; // Feature[]
                self.systemFeatures = []; // Feature[]
                self.partnerFeatures = []; // Feature[]
            };

            angular.extend(Feature.prototype, {
                // returns Feature[]
                getAllFeatures: function () {
                    var self = this;
                    var sources = ["system", "user", "partner"];

                    var request = {
                        params: {
                            feature_source: sources.join(" ")
                        }
                    };


                    var apiUrl = djangoUrl.reverse('distribution');
                    $rootScope.$broadcast('Feature::allFeatures::loading');

                    return $http.get(apiUrl, request)
                        .success(function (data) {
                            // Returned data structure will be an array of {source, definitions array} for each source

                            var userFeatures = [];
                            var systemFeatures = [];
                            var partnerFeatures = [];

                            data.forEach(function (featureData) {
                                var feature = Utils.extractFeature(featureData);

                                if (feature.source == "user") {
                                    userFeatures.push(feature);
                                }
                                else if (feature.source == "partner") {
                                    partnerFeatures.push(feature);
                                }
                                else {
                                    systemFeatures.push(feature);
                                }
                            });

                            self.userFeatures = []; //userFeatures;
                            self.systemFeatures = [];//systemFeatures;
                            self.partnerFeatures = [];//partnerFeatures;

                            $rootScope.$broadcast('Feature::allFeatures::loaded', self.systemFeatures, self.userFeatures, self.partnerFeatures);
                        });
                }
            });

            return new Feature();
        }
    ]);
})();
