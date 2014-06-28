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
    var generateId = function () {
        return gId++;
    };

    var gLinkId = 0;
    var generateLinkId = function () {
        return gLinkId++;
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

            // forward link
            var linkObject = this.linkInternal(type, target);
            if (linkObject.backwardLink) return linkObject; // already existed            
            this.nodeDisplay.links.push(linkObject);

            // create backward link
            var backwardLinkObject = target.linkInternal('reverse_' + type, this);

            backwardLinkObject.forwardLink = linkObject;
            linkObject.backwardLink = backwardLinkObject;
            return linkObject;
        },

        linkInternal: function (type, target) {
            var links = this.linkMap[type];
            if (!links) this.linkMap[type] = links = {
                expanded: true,
                targets: {}
            };
            var linkObject = links.targets[target.internalId];
            if (linkObject) return linkObject; // link already has been there
            linkObject = {
                visible: true,
                source: this,
                target: target,
                type: type,
                internalId: generateLinkId()
            };
            links.targets[target.internalId] = linkObject;
            return linkObject;
        },

        getLinks: function (type) {
            var self = this;
            var result = $.Deferred();
            self.getLinksInternal(type).done(function (links) {
                var resultLinks = [];
                for (var internalTargetId in links.targets) {
                    var link = links.targets[internalTargetId];
                    resultLinks.push(link);
                }
                result.resolve(resultLinks);
            });
            return result;
        },

        getLinksInternal: function (type) {
            var self = this;
            var result = $.Deferred();
            var links = self.linkMap[type];
            if (links) {
                // links in memory
                result.resolve(links);
            } else {
                // load links by load service
                links = {
                    expanded: true,
                    targets: {}
                };
                self.linkMap[type] = links;
                self.getRelatedObjects(type).done(function (relatedObjects) {
                    for (var i = 0; i < relatedObjects.length; ++i) {
                        var relatedObject = relatedObjects[i];
                        var targetNode = self.nodeDisplay.addNode(relatedObject);
                        self.link(type, targetNode);
                    }
                    result.resolve(links);
                });
            }
            return result;
        },

        getNumberVisibleLinks: function () {
            var number = 0;
            for (var type in this.linkMap) {
                var links = this.linkMap[type];
                for (var internalTargetId in links.targets) {
                    var link = links.targets[internalTargetId];
                    var visible;
                    if (link.type.indexOf('reverse_') === 0)
                        visible = link.forwardLink.visible;
                    else
                        visible = link.visible;
                    if (visible) number++;
                }
            }
            return number;
        },

        getRelationTypes: function () {
            return this.nodeDisplay.getRelationTypes.apply(this.nodeDisplay, [this.obj]);
        },

        getRelatedObjects: function (type) {
            return this.nodeDisplay.getRelatedObjects.apply(this.nodeDisplay, [this.obj, type]);
        },

        collapseAll: function () {
            var deferreds = [];
            var types = this.getRelationTypes();
            for (var i = 0; i < types.length; ++i) {
                var type = types[i];
                deferreds.push(this.collapse(type));
            }
            return $.when.apply(null, deferreds);
        },

        collapse: function (type) {
            var result = $.Deferred();
            var self = this;
            type = type || '->';
            var links = self.linkMap[type];
            if (!links) return; // links not loaded -> return            
            self.getLinksInternal(type).done(function (links) {
                for (var internalTargetId in links.targets) {
                    var link = links.targets[internalTargetId];
                    if (link.visible) {
                        link.visible = false;
                        self.nodeDisplay.links.splice(self.nodeDisplay.links.indexOf(link), 1);
                        if (link.target.getNumberVisibleLinks() === 0) {
                            link.target.visible = false;
                            self.nodeDisplay.nodes.splice(self.nodeDisplay.nodes.indexOf(link.target), 1);
                        }
                    }
                }
                links.expanded = false;
                self.nodeDisplay.needUpdate = true;
                self.nodeDisplay.update();
                result.resolve();
            });
            return result;
        },

        expandAll: function () {
            var deferreds = [];
            var types = this.getRelationTypes();
            for (var i = 0; i < types.length; ++i) {
                var type = types[i];
                deferreds.push(this.expand(type));
            }
            return $.when.apply(null, deferreds);
        },

        expand: function (type) {
            var result = $.Deferred();
            var self = this;
            type = type || '->';
            self.getLinksInternal(type).done(function (links) {
                for (var internalTargetId in links.targets) {
                    var link = links.targets[internalTargetId];
                    if (!link.visible) {
                        link.visible = true;
                        self.nodeDisplay.links.push(link);
                        if (!link.target.visible) {
                            link.target.visible = true;
                            self.nodeDisplay.nodes.push(link.target);
                        }
                    }
                }
                links.expanded = true;
                self.nodeDisplay.needUpdate = true;
                self.nodeDisplay.update();
                result.resolve();
            });
            return result;
        },

        toggleAll: function () {
            if(this.getNumberVisibleLinks()>0){
                return this.collapseAll();
            }else{
                return this.expandAll();
            }
            /*var deferreds = [];
            var types = this.getRelationTypes();
            for (var i = 0; i < types.length; ++i) {
                var type = types[i];
                this.deferreds.push(this.toggle(type));
            }
            return $.when.apply(null, deferreds);*/
        },

        toggle: function (type) {
            var self = this;
            var links = self.linkMap[type];
            if (!links) {
                return self.expand(type);
            }
            if (links.expanded)
                return self.collapse(type);
            else
                return self.expand(type);
        }

    };


    // ======================================================================= 
    // node display
    // =======================================================================     
    module.NodeDisplay = function () {
        this.init.apply(this, arguments);
    };

    module.NodeDisplay.prototype = {

        init: function (options) {
            $.extend(this, options);
            var self = this;
            this.width = this.width || 300;
            this.height = this.height || 300;
            this.needUpdate = false;
            this.colorMap = new module.ColorMap();
            this.force = d3.layout
                .force()
                .on("tick", function () {
                    self.tick();
                })
                .size([this.width, this.height])
                .linkDistance(30)
                .charge(-200);
            //.linkStrength(0.9)

            this.minRad = 5;
            this.maxRad = 15;
            this.minLinks = 0;
            this.maxLinks = 20;
            this.deltaRad = (this.maxRad - this.minRad) / (this.maxLinks - this.minLinks);

            this.displayArea = d3.select(options.parentDomNode).append("svg:svg")
                .attr("width", this.width)
                .attr("height", this.height);

            this.nodeMap = {};

            this.nodes = [];
            this.links = [];

        },

        getId: function (obj) {
            return obj;
        },

        random: function (from, to) {
            return Math.floor((Math.random() * to) + from);
        },

        addNode: function (obj) {
            var id = this.getId(obj);
            var node = this.nodeMap[id];
            if (node) return node;
            node = new Node({
                x: this.random(0, this.width - 1),
                y: this.random(0, this.height - 1),
                obj: obj,
                internalId: generateId(),
                nodeDisplay: this,
            });
            this.nodeMap[id] = node;
            this.nodes.push(node);
            this.needUpdate = true;
            return node;
        },

        addLink: function (source, target, type) {

            // get source and target nodes
            type = type || '->';
            var sourceId = this.getId(source);
            var targetId = this.getId(target);
            var sourceNode = this.nodeMap[sourceId];
            if (!sourceNode) throw "Inconsistent, source node missing";
            var targetNode = this.nodeMap[targetId];
            if (!targetNode) throw "Inconsistent, target node missing";

            // create  link            
            sourceNode.link(type, targetNode);

        },


        update: function () {

            if (!this.needUpdate) return;
            this.needUpdate = false;

            var self = this;

            this.force.nodes(this.nodes)
                .links(this.links)
                .start();

            this.linkSel = this.displayArea.selectAll("line.link")
                .data(this.links, function (d) {
                    return d.internalId;
                });

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
                .data(this.nodes, function (d) {
                    return d.internalId;
                });

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
                    var type = self.getType(d.obj);
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
            
            var self = this;

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
            }).attr("r", function (d) {
                var number = d.getNumberVisibleLinks();
                var rad = self.minRad + self.deltaRad * (number - self.minLinks);
                if (rad < self.minRad) rad = self.minRad;
                if (rad > self.maxRad) rad = self.maxRad;
                return rad;
            });

        }

    };

})();