(function () {
    'use strict';

    var module = angular.module('Aeonium.models');

    //A service for message
    module.factory('Aeonium.models.MessageList', [
        '$http', 'djangoUrl', '$rootScope',
        'Aeonium.models.Message',
        function messageListFactory($http, djangoUrl, $rootScope, Message) {

            var MessageList = function () {
                var self = this;
                self.listCache = {};
                self.listCache.time = {};
                self.listCache.last_updated = {};
                self.listCache.ambiguity = {};
            };

            // class MessageList {
            //     listCache: dict;
            //     listCache.time: dict;
            //     listCache.last_updated: dict;
            //     listCache.ambiguity: dict;
            // }


            angular.extend(MessageList.prototype, {
                getList: function(order_by, page){
                    var self = this;
                    var apiUrl = djangoUrl.reverse('list');

                    var request = {
                        params: {
                            order_by: order_by || "time",
                            page: page || 1
                        }
                    };
                    if (self.listCache[order_by].hasOwnProperty(page)){
                        var data = self.listCache[order_by][page];
                        $rootScope.$broadcast("list::getList", data);
                        return false;
                    }

                    return $http.get(apiUrl, request)
                        .success(function (data) {

                            self.listCache[order_by][page] = data;
                            $rootScope.$broadcast("list::getList", data);
                        });

                },

            });

            return new MessageList();
        }
    ]);
})();
