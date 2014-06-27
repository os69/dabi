/* global d3 */
/* global alert */
/* global window */
/* global document */
/* global dobi */
/* global $ */

(function () {

    window.obo = window.obo || {};
    var module = window.obo.nodes = {};

    // ======================================================================= 
    // generate id
    // =======================================================================     
    var gId = 0;
    module.generateId = function () {
        return gId++;
    };

    // ======================================================================= 
    // create tree
    // =======================================================================     
    module.createTree = function (nodeDisplay, depth, numChilds) {

        var nodes = [];
        var links = [];

        var doCreate = function (d, parentObj) {
            if (d === 0) return;
            for (var i = 0; i < numChilds; ++i) {
                var childObj = module.generateId();
                nodeDisplay.addNode(childObj);
                nodeDisplay.addLink(parentObj, childObj);
                doCreate(d - 1, childObj);
            }
        };

        var rootObj = module.generateId();
        nodeDisplay.addNode(rootObj);
        doCreate(depth, rootObj);

    };

    // ======================================================================= 
    // color map
    // =======================================================================     
    module.ColorMap = function () {
        this.init.apply(this, arguments);
    };

    module.ColorMap.prototype = {

        colors: ['red', 'green', 'blue', 'yellow', 'black'],

        init: function () {
            this.map = {};
            this.colorIndex = 0;
        },

        getColor: function (key) {
            var color = this.map[key];
            if (color) return color;
            color = module.ColorMap.prototype.colors[this.colorIndex++];
            if (this.colorIndex >= module.ColorMap.prototype.colors.length) this.colorIndex = 0;
            this.map[key] = color;
            return color;
        }
    };

    // ======================================================================= 
    // node display
    // =======================================================================     
    module.NodeDisplay = function () {
        this.init.apply(this, arguments);
    };

    module.NodeDisplay.prototype = {

        init: function (parentDomNode, width, height, idFunction, typeFunction) {
            var self = this;
            this.width = width;
            this.height = height;
            this.needUpdate = false;
            this.idFunction = idFunction || function () {
                return this;
            };
            this.typeFunction = typeFunction || function () {
                return '';
            };
            this.colorMap = new module.ColorMap();
            this.force = d3.layout
                .force()
                .on("tick", function () {
                    self.tick();
                })
                .size([width, height])
                .linkDistance(30)
                .charge(-200);
            //.linkStrength(0.9)

            this.displayArea = d3.select(parentDomNode).append("svg:svg")
                .attr("width", width)
                .attr("height", height);

            this.nodeMap = {};
            this.nodes = [];

            this.linkMap = {};
            this.links = [];

        },

        random: function (from, to) {
            return Math.floor((Math.random() * to) + from);
        },

        addNode: function (obj) {
            var id = this.idFunction.apply(obj, [obj]);
            var node = this.nodeMap[id];
            if (node) return node;
            node = {
                x: this.random(0, this.width - 1),
                y: this.random(0, this.height - 1),
                obj: obj
            };
            this.nodeMap[id] = node;
            this.nodes.push(node);
            this.needUpdate = true;
            return node;
        },

        addLink: function (source, target, type) {
            type = type || '->';
            var sourceId = this.idFunction.apply(source, [source]);
            var targetId = this.idFunction.apply(target, [target]);
            var linkId = '' + sourceId + type + targetId;
            var link = this.linkMap[linkId];
            if (link) return link;
            var sourceNode = this.nodeMap[sourceId];
            var targetNode = this.nodeMap[targetId];
            link = {
                source: sourceNode,
                target: targetNode
            };
            this.linkMap[linkId] = link;
            this.links.push(link);
            this.needUpdate = true;
            return link;
        },

        update: function () {

            if (!this.needUpdate) return;
            this.needUpdate = false;

            var self = this;

            this.force.nodes(this.nodes)
                .links(this.links)
                .start();

            this.link = this.displayArea.selectAll("line.link")
                .data(this.links);

            this.link.enter().insert("svg:line", ".node")
                .attr("class", "link")
                .attr("x1", function (d) {
                    return d.source.x;
                })
                .attr("y1", function (d) {
                    return d.source.y;
                })
                .attr("x2", function (d) {
                    return d.target.x;
                })
                .attr("y2", function (d) {
                    return d.target.y;
                });

            this.link.exit().remove();

            this.node = this.displayArea.selectAll("circle.node")
                .data(this.nodes);

            this.node.enter().append("svg:circle")
                .attr("class", "node")
                .attr("cx", function (d) {
                    return d.x;
                })
                .attr("cy", function (d) {
                    return d.y;
                })
                .attr("r", 5)
                .style("fill", function (d) {
                    var type = self.typeFunction.apply(d.obj, []);
                    return self.colorMap.getColor(type);
                })
                .on('click', function (d) {
                    if (d3.event.defaultPrevented) return;
                    self.click(d);
                })
                .on('mouseover', function (d) {
                    if (self.mouseover) self.mouseover(d);
                })
                .call(this.force.drag);

            this.node.exit().remove();

        },

        tick: function () {

            this.link.attr("x1", function (d) {
                return d.source.x;
            }).attr("y1", function (d) {
                return d.source.y;
            }).attr("x2", function (d) {
                return d.target.x;
            }).attr("y2", function (d) {
                return d.target.y;
            });

            this.node.attr("cx", function (d) {
                return d.x;
            }).attr("cy", function (d) {
                return d.y;
            });

        },

        click: function (d) {}

    };

})();