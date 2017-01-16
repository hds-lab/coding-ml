(function () {
    'use strict';

    var module = angular.module('Aeonium.models');

    //A service for partners
    module.factory('Aeonium.models.Partner', [
        '$http', 'djangoUrl', '$rootScope',
        function partnerFactory($http, djangoUrl, $rootScope) {

            var Partner = function () {
                var self = this;
                self.currentUser = undefined; // User
                self.selectedPartner = undefined; // User
                self.partners = []; // User[]
            };

            //class User {
            //	id: number;
            //	username: string;
            //}

            angular.extend(Partner.prototype, {
                getCurrentUser: function () {
                  var self = this;

                    var apiUrl = djangoUrl.reverse('user');

                    var request = {
                        params: {
                        }
                    };

                    $rootScope.$broadcast("Partner::getCurrentUser::loading");

                    return $http.get(apiUrl, request)
                        .then(function (data) {
                            self.currentUser = data;

                            $rootScope.$broadcast("Partner::getCurrentUser::loaded", self.currentUser);
                        });
                },

                getPartners: function () {
                    var self = this;

                    if (self.partners.length > 0){
                        return;
                    }

                    var apiUrl = djangoUrl.reverse('partners');

                    var request = {
                        params: {

                        }
                    };

                    $rootScope.$broadcast("Partner::getPartners::loading");

                    return $http.get(apiUrl, request)
                        .then(function (response) {
                            //self.partners = data.map(function (d) {
                            //    return {
                            //        id: d.id,
                            //        username: d.username
                            //    };
                            //});
                            self.partners = response.data;

                            $rootScope.$broadcast("Partner::getPartners::loaded", self.partners);

                            if (self.partners && self.partners.length > 0) {
                                self.selectPartner(self.partners[0]);
                            }
                        });

                },

                // partner: User
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
