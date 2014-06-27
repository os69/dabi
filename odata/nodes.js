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

    var Node = function () {
        this.init.apply(this, arguments);
    };

    // ======================================================================= 
    // node 
    // =======================================================================         
    Node.prototype = {

        init: function (params) {
            $.extend(this, params);
            this.visible = true;
            this.linkMap = {};
        },

        link: function (type, target) {
            var links = this.linkMap[type];
            if (!links) this.linkMap[type] = links = {};
            var linkObject = links[target.internalId];
            if (linkObject) return null; // link already has been there
            linkObject = {
                visible: true,
                source: this,
                target: target,
                type: type
            };
            links[target.internalId] = linkObject;
            return linkObject;
        },

        getLinks: function (type) {
            var result = [];
            var links = this.linkMap[type];
            if (!links) return result;
            for (var internalTargetId in links) {
                var link = links[internalTargetId];
                result.push(link);
            }
            return result;
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
            this.links = [];

        },

        random: function (from, to) {
            return Math.floor((Math.random() * to) + from);
        },

        addNode: function (obj) {
            var id = this.idFunction.apply(obj, [obj]);
            var node = this.nodeMap[id];
            if (node) return node;
            node = new Node({
                x: this.random(0, this.width - 1),
                y: this.random(0, this.height - 1),
                obj: obj,
                internalId: module.generateId()
            });
            this.nodeMap[id] = node;
            this.nodes.push(node);
            this.needUpdate = true;
            return node;
        },

        addLink: function (source, target, type) {

            // get source and target nodes
            type = type || '->';
            var sourceId = this.idFunction.apply(source, [source]);
            var targetId = this.idFunction.apply(target, [target]);
            var sourceNode = this.nodeMap[sourceId];
            if (!sourceNode) throw "Inconsistent, source node missing";
            var targetNode = this.nodeMap[targetId];
            if (!targetNode) throw "Inconsistent, target node missing";

            // create forward link
            var linkObject = sourceNode.link(type, targetNode);
            if (!linkObject) return null; // link alread has been there 
            if (linkObject) this.links.push(linkObject);

            // create backward link
            targetNode.link('reverse_' + type, sourceNode);

            this.needUpdate = true;
        },

        collapse: function (source, type) {
            type = type || '->';
            var sourceId = this.idFunction.apply(source, [source]);
            var sourceNode = this.nodeMap[sourceId];
            if (!sourceNode) throw "Inconsistent, source node missing";
            var links = sourceNode.getLinks(type);
            for (var i = 0; i < links.length; ++i) {
                var link = links[i];
                if (link.visible) {
                    link.visible = false;
                    this.links.splice(this.links.indexOf(link), 1);
                }
            }
            this.needUpdate = true;
        },

        expand: function (source, type) {
            type = type || '->';
            var sourceId = this.idFunction.apply(source, [source]);
            var sourceNode = this.nodeMap[sourceId];
            if (!sourceNode) throw "Inconsistent, source node missing";
            var links = sourceNode.getLinks(type);
            for (var i = 0; i < links.length; ++i) {
                var link = links[i];
                if (!link.visible) {
                    link.visible = true;
                    this.links.push(link);
                }
            }
            this.needUpdate = true;
        },

        update: function () {

            if (!this.needUpdate) return;
            this.needUpdate = false;

            var self = this;

            this.force.nodes(this.nodes)
                .links(this.links)
                .start();

            this.linkSel = this.displayArea.selectAll("line.link")
                .data(this.links);

            this.linkSel.enter().insert("svg:line", ".node")
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

            this.linkSel.exit().remove();

            this.nodeSel = this.displayArea.selectAll("circle.node")
                .data(this.nodes);

            this.nodeSel.enter().append("svg:circle")
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

            this.nodeSel.exit().remove();

        },

        tick: function () {

            this.linkSel.attr("x1", function (d) {
                return d.source.x;
            }).attr("y1", function (d) {
                return d.source.y;
            }).attr("x2", function (d) {
                return d.target.x;
            }).attr("y2", function (d) {
                return d.target.y;
            });

            this.nodeSel.attr("cx", function (d) {
                return d.x;
            }).attr("cy", function (d) {
                return d.y;
            });

        },

        click: function (d) {},

        dblclick: function (d) {
            alert('dbl');
        }

    };

})();