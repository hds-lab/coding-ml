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
                // partnerUserName: string
                // returns Feature[]
                getAllFeatures: function (partnerUserName) {
                    var self = this;
                    var sources = ["system", "user", "partner"];

                    var request = {
                        params: {
                            feature_source: sources.join(" "),
                            partner: partnerUserName
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

                            self.userFeatures = userFeatures;
                            self.systemFeatures = systemFeatures;
                            self.partnerFeatures = partnerFeatures;

                            $rootScope.$broadcast('Feature::allFeatures::loaded', self.systemFeatures, self.userFeatures, self.partnerFeatures);
                        });
                },

                // feature: Feature
                removeFeature: function (feature) {
                    var self = this;

                    var index = self.userFeatures.indexOf(feature);
                    if (index < 0) {
                        return;
                    }

                    var request = {};

                    var itemApiUrl = djangoUrl.reverse('feature', {feature_id: feature.id});
                    $rootScope.$broadcast('Feature::removeFeature::removing');
                    return $http.delete(itemApiUrl, request)
                        .success(function (data) {
                            // Remove feature from list;
                            self.userFeatures.splice(index, 1);
                            $rootScope.$broadcast('Feature::removeFeature::removed', feature);
                        });
                },

                // tokens: string[]
                // messageId: number
                addFeature: function (tokens, messageId) {
                    var self = this;

                    var request = {
                        token_list: tokens,
                        origin: messageId
                    };

                    var listApiUrl = djangoUrl.reverse('feature_list');
                    $rootScope.$broadcast('Feature::addFeature::adding');
                    return $http.post(listApiUrl, request)
                        .success(function (data) {
                            var feature = Utils.extractFeature(data);
                            self.userFeatures.unshift(feature);
                            $rootScope.$broadcast('Feature::addFeature::added', feature);
                        });
                }
            });

            return new Feature();
        }
    ]);
})();
