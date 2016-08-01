(function () {
    'use strict';

    var module = angular.module('Aeonium.controllers');

    var CodingController = function ($scope, $timeout, Dictionary, Code, Message, Feature, History, usSpinnerService) {
//1. get all messages and list on the left
//2. click on a message from the left list to show in the middle
//3. select a label and show details on the right

        $scope.initializeController = function() {
            Message.getAllMessages();
        };

        // Handle events
        $scope.$on('messages::allMessages', function ($event, messages) {
            $scope.allMessages = messages; // Message[]

            //class Message {
            //	id: number;
            //	label: number;
            //	source: string;
            //	isAmbiguous: boolean;
            //	isSaved: boolean;
            //	isExample: boolean;
            //}
        });

        $scope.initializeController();
    };

    CodingController.$inject = [
        '$scope',
        '$timeout',
        'Aeonium.services.Dictionary',
        'Aeonium.models.Code',
        'Aeonium.models.Message',
        'Aeonium.models.Feature',
        'Aeonium.services.ActionHistory',
        'usSpinnerService'
    ];

    module.controller('Aeonium.controllers.CodingController', CodingController);

})();
