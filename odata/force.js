/* global d3 */
/* global alert */
/* global window */
/* global document */
/* global dobi */
/* global $ */

(function () {

    window.obo = window.obo || {};
    var module = window.obo.force = {};
    var odatalib = window.obo.odatalib;

    // ======================================================================= 
    // generate id
    // =======================================================================     
    var gId = 0;
    var generateId = function () {
        return gId++;
    };

    // ======================================================================= 
    // create tree
    // =======================================================================     
    var createTree = function (nodeDisplay, depth, numChilds) {

        var nodes = [];
        var links = [];

        var doCreate = function (d, parentObj) {
            if (d === 0) return;
            for (var i = 0; i < numChilds; ++i) {
                var childObj = generateId();
                nodeDisplay.addNode(childObj);
                nodeDisplay.addLink(parentObj, childObj);
                doCreate(d - 1, childObj);
            }
        };

        var rootObj = generateId();
        nodeDisplay.addNode(rootObj);
        doCreate(depth, rootObj);

    };

    // ======================================================================= 
    // color map
    // =======================================================================     
    var ColorMap = function () {
        this.init.apply(this, arguments);
    };

    ColorMap.prototype = {

        colors: ['red', 'green', 'blue', 'yellow', 'black'],

        init: function () {
            this.map = {};
            this.colorIndex = 0;
        },

        getColor: function (key) {
            var color = this.map[key];
            if (color) return color;
            color = ColorMap.prototype.colors[this.colorIndex++];
            if (this.colorIndex >= ColorMap.prototype.colors.length) this.colorIndex = 0;
            this.map[key] = color;
            return color;
        }
    };

    // ======================================================================= 
    // node display
    // =======================================================================     
    var NodeDisplay = function () {
        this.init.apply(this, arguments);
    };

    NodeDisplay.prototype = {

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
            this.colorMap = new ColorMap();
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

    // ======================================================================= 
    // test
    // =======================================================================     
    var test = function () {

        var nodeDisplay = new NodeDisplay('body', 600, 600);
        createTree(nodeDisplay, 2, 5);
        nodeDisplay.click = function (d) {
            var targetObj = generateId();
            nodeDisplay.addNode(targetObj);
            nodeDisplay.addLink(d.obj, targetObj);
            nodeDisplay.update();
        };
        nodeDisplay.update();
    };

    // ======================================================================= 
    // odata test
    // =======================================================================     
    var oDataTest = function () {

        var model = {
            detailFields: [],
            detailObject: null,

            navigate: function (event, obj) {
                event.preventDefault();
                followLink(model.detailObject.oDataObject, obj.uri, obj.name);
            }
        };

        var followLink = function (source, uri, type) {

            var parser = document.createElement('a');
            parser.href = uri;
            var path = parser.pathname;

            oDataService.getData(path).done(function (objects) {
                for (var i = 0; i < objects.length; i++) {
                    var object = objects[i];
                    nodeDisplay.addNode(object);
                    nodeDisplay.addLink(source, object, type);
                }
                nodeDisplay.update();
            });

        };

        dobi.binding.run(model, document.getElementById('templates'), document.getElementById('target'));
        $(document).foundation();

        var nodeDisplay = new NodeDisplay('#_nodeDisplay', 600, 600, function () {
            return this.__metadata.id;
        }, function () {
            return this.__metadata.type;
        });

        nodeDisplay.click = function (node) {
            for (var propertyName in node.obj) {
                var propertyValue = node.obj[propertyName];
                if (!propertyValue || !propertyValue.__deferred || !propertyValue.__deferred.uri) continue;
                followLink(node.obj, propertyValue.__deferred.uri, propertyName);
            }
        };

        nodeDisplay.mouseover = function (node) {
            var detailFields = [];
            model.detailObject = {
                type: node.obj.__metadata.type,
                links: [],
                oDataObject: node.obj
            };
            detailFields.push({
                name: 'type',
                template: 'simple'
            });
            detailFields.push({
                name: 'links',
                template: 'links'
            });
            for (var propertyName in node.obj) {
                var propertyValue = node.obj[propertyName];
                if (propertyValue && propertyValue.__deferred) {
                    model.detailObject.links.push({
                        name: propertyName,
                        uri: propertyValue.__deferred.uri
                    });
                    continue;
                }
                if (dobi.binding.getType(propertyValue) !== 'simple') continue;
                model.detailObject[propertyName] = propertyValue;
                detailFields.push({
                    name: propertyName,
                    template: 'simple'
                });
            }
            model.setDetailFields(detailFields);
        };

        var oDataService = new odatalib.ODataService('/V3/Northwind/Northwind.svc');
        oDataService.getData('/V3/Northwind/Northwind.svc/Products(1)').done(function (objects) {
            nodeDisplay.addNode(objects[0]);
            nodeDisplay.update();
        });


    };

    //test();
    oDataTest();

})();