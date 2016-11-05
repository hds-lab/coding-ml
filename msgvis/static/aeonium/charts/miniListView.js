(function () {
    'use strict';

    var module = angular.module('Aeonium.charts', []);

    var miniListView = function module(Style) {
        var margin = {top: 20, right: 20, bottom: 40, left: 40},
            width = 200,
            height = 800,
            ease = 'cubic-in-out',
            color = Style.codeColor.bind(Style);

        var messages = [];
        var svg, duration = 500;
        var binCount = 10;
        var boxSize = 10;
        var boxSpacing = 2;
        var selectedMessage = null;
        var sortOrder = 0; // 0 means descending, 1 means ascending

        var dispatch = d3.dispatch('selectMessage', 'sortMessages');

        function exports(_selection) {
            _selection.each(function (_data) {

                if (!_data) {
                    return;
                }
                else if (messages == _data) {
                    return;
                }

                messages = _data;

                var chartW = width - margin.left - margin.right,
                    chartH = height - margin.top - margin.bottom;

                var y = d3.scale.linear()
                    .domain([0, 1])
                    .range([chartH, 0]);

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient('left');

                // bin data
                var bins = [];

                var boxItems = messages.map(function (message) {
                    var item = {
                        score: message.ambiguityScore,
                        label: message.label,
                        compareLabel: message.partnerLabel,
                        binId: 0,
                        binIndex: 0,
                        data: message
                    };

                    item.binId = Math.floor(item.score * binCount);

                    var bin = bins[item.binId];
                    if (!bin) {
                        bin = [];
                        bins[item.binId] = bin;
                    }

                    item.binIndex = bin.length;
                    bin.push(item);

                    return item;
                });

                var binHeight = chartH / binCount;
                var itemCountPerBinRow = (binHeight - boxSpacing) / (boxSpacing + boxSize);

                var itemX = function (item) {
                    var colId = Math.floor(item.binIndex / itemCountPerBinRow);
                    return ((colId + 1) * boxSpacing + boxSize * colId);
                };

                var itemY = function (item) {
                    var rowId = item.binIndex % itemCountPerBinRow;
                    return y(((rowId + 1) * boxSpacing + boxSize * rowId + item.binId * binHeight) / chartH);
                };

                if (!svg) {
                    svg = d3.select(this)
                        .append('svg')
                        .classed('mini-listview-chart', true);
                    var container = svg.append('g').classed('container-group', true);
                    container.append('g').classed('chart-group', true);
                    container.append('g').classed('y-axis-group axis', true);
                }

                svg.transition().duration(duration).attr({width: width, height: height});

                svg.select('.container-group')
                    .attr({transform: 'translate(' + margin.left + ',' + margin.top + ')'});

                svg.select('.y-axis-group.axis')
                    .transition()
                    .duration(duration)
                    .ease(ease)
                    .call(yAxis);

                var boxes = svg.select('.chart-group')
                    .attr({transform: 'translate(0,-10)'})
                    .selectAll('.box')
                    .data(boxItems);

                boxes.enter().append('rect')
                    .on('click', function (item) {
                        console.log(JSON.stringify(item));
                        dispatch.selectMessage(item.data);
                    });

                boxes.classed('box', true)
                    .attr('x', itemX)
                    .attr('width', boxSize)
                    .attr('y', itemY)
                    .attr('height', boxSize)
                    .attr('data-value', JSON.stringify)
                    .attr('fill', function (item) {
                        return color(item.label);
                    });

                boxes.exit().remove();

                duration = 500;

            });
        }

        exports.width = function (_x) {
            if (!arguments.length) return width;
            width = parseInt(_x);
            return this;
        };
        exports.height = function (_x) {
            if (!arguments.length) return height;
            height = parseInt(_x);
            duration = 0;
            return this;
        };
        exports.selectedMessage = function (_x) {
            if (!arguments.length) return selectedMessage;
            selectedMessage = _x;
            return this;
        };
        exports.ease = function (_x) {
            if (!arguments.length) return ease;
            ease = _x;
            return this;
        };

        d3.rebind(exports, dispatch, 'on');
        return exports;
    };

    var miniListViewDirective = function (Style) {

        var chart = miniListView(Style);

        return {
            restrict: 'E',
            replace: true,
            template: '<div class="mini-listview"></div>',
            scope: {
                height: '=height',
                messages: '=messages',
                selectedMessage: '=selectedMessage',
                sortMessages: '&sortMessages',
                selectMessage: '&selectMessage'
                // TODO (jinsuh): Add currently visible items
            },
            link: function (scope, element, attrs) {
                var chartElement = d3.select(element[0]);
                chart.on('selectMessage', function (d, i) {
                    scope.selectMessage({args: d});
                });

                chart.on('sortMessages', function (d, i) {
                    scope.sortMessages({args: d});
                });

                scope.$watch('messages', function (newVal, oldVal) {
                    chartElement.datum(newVal).call(chart);
                });

                scope.$watch('selectedMessage', function (newVal, oldVal) {
                    chartElement.call(chart.selectedMessage(scope.selectedMessage));
                });

                scope.$watch('height', function (d, i) {
                    chartElement.call(chart.height(scope.height));
                });
            }
        }
    };

    miniListViewDirective.$inject = [
        'Aeonium.models.Style'
    ];

    module.directive('miniListView', miniListViewDirective);
})();
