(function () {
    'use strict';

    var module = angular.module('Aeonium.components');

    var CommentsController = function ($scope, Message) {
        $scope.comment = "";
        $scope.commentHistory = [];

        $scope.$on('Message::getComments::loaded', function ($event, messageId, comments) {
            if ($scope.message && $scope.message.id == messageId) {
                $scope.commentHistory = comments;
            }
        });

        $scope.$on('Message::saveComment::saving', function ($event) {
            //History.add_record("saveComment:request-start", {});
        });

        $scope.$on('Message::saveComment::saved', function ($event, message, comment) {
            //History.add_record("saveComment:request-end", {});

            $scope.comment = "";
            $scope.commentHistory.push(comment);
        });

        $scope.$watch('message', function (newVal, oldVal) {
            if (newVal) {
                Message.getComments(newVal);
            }
        });

        $scope.saveComment = function(){
            Message.saveComment($scope.message, $scope.comment);
        }
    };

    CommentsController.$inject = [
        '$scope',
        'Aeonium.models.Message'
    ];

    module.directive('comments', function comments() {
        return {
            scope: {
                message: '=message',
            },
            controller: CommentsController,
            templateUrl: 'static/aeonium/components/comments.html'
        };
    });

    module.directive('ngEnter', function () {
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if (event.which === 13) {
                    scope.$apply(function () {
                        scope.$eval(attrs.ngEnter);
                    });

                    event.preventDefault();
                }
            });
        };
    });

})();