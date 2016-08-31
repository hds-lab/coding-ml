(function () {
    'use strict';

    var module = angular.module('Aeonium.models');

    //A service for partners
    module.factory('Aeonium.models.Partner', [
        '$http', 'djangoUrl', '$rootScope',
        function partnerFactory($http, djangoUrl, $rootScope) {

            var Partner = function () {
                var self = this;
                self.selectedPartner = undefined; // Partner
                self.partners = []; // Partner[]
            };

            //class Partner {
            //	id: number;
            //	username: string;
            //}

            angular.extend(Partner.prototype, {
                getPartners: function () {
                    var self = this;

                    var apiUrl = djangoUrl.reverse('all_coded_messages');

                    var request = {
                        params: {
                            stage: undefined
                        }
                    };

                    $rootScope.$broadcast("Partner::getPartners::loading");

                    window.setTimeout(function () {
                        var partners = [];
                        for (var i = 0; i < 5; i++) {
                            partners.push({
                                id: i,
                                username: "foobar_" + i
                            });
                        }

                        self.partners = partners;
                        $rootScope.$broadcast("Partner::getPartners::loaded", self.partners);

                        self.selectPartner(partners[0]);
                    }, 500);

                    //return $http.get(apiUrl, request)
                    //    .success(function (data) {
                    //        self.partners = data.map(function (d) {
                    //            return {
                    //                id: d.id,
                    //                username: d.username
                    //            };
                    //        });
                    //
                    //        $rootScope.$broadcast("Partner::getPartners::loaded", self.partners);
                    //
                    //        if (self.partners && self.partners.length > 0) {
                    //            self.selectPartner(self.partners[0]);
                    //        }
                    //    });

                },

                // partner: Partner
                selectPartner: function (partner) {
                    var self = this;
                    if (self.partners && self.selectPartner != partner) {
                        var found = self.partners.filter(function (p) {
                            return p.id == partner.id;
                        });

                        if (found.length > 0) {
                            self.selectedPartner = partner;

                            $rootScope.$broadcast("Partner::selectedPartner", self.selectedPartner);
                        }
                    }
                }
            });

            return new Partner();
        }
    ]);
})();
