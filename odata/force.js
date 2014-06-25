/* global d3 */
/* global alert */
/* global window */
/* global document */

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
    var createTree = function (depth, numChilds) {

        var nodes = [];
        var links = [];

        var doCreate = function (d, parent) {
            if (d === 0) return;
            for (var i = 0; i < numChilds; ++i) {
                var node = {
                    id: generateId(),
                    x: 100,
                    y: 100
                };
                nodes.push(node);
                var link = {
                    source: parent,
                    target: node,
                    id: generateId()
                };
                links.push(link);
                doCreate(d - 1, node);
            }
        };

        var root = {
            x: 100,
            y: 100,
            id: generateId()
        };
        nodes.push(root);
        doCreate(depth, root);

        return {
            nodes: nodes,
            links: links
        };

    };

    // ======================================================================= 
    // node display
    // =======================================================================     
    var NodeDisplay = function () {
        this.init.apply(this, arguments);
    };

    NodeDisplay.prototype = {

        init: function (parent, width, height) {
            var self = this;
            this.force = d3.layout
                .force()
                .on("tick", function () {
                    self.tick();
                })
                .size([width, height])
                .linkDistance(30)
                .charge(-200);
            //.linkStrength(0.9)

            this.displayArea = d3.select(parent).append("svg:svg")
                .attr("width", width)
                .attr("height", height);

        },

        update: function (nodes, links) {

            var self = this;

            this.force.nodes(nodes)
                .links(links)
                .start();

            this.link = this.displayArea.selectAll("line.link")
                .data(links, function (d) {
                    return d.id;
                });

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
                .data(nodes, function (d) {
                    return d.id;
                });

            this.node.enter().append("svg:circle")
                .attr("class", "node")
                .attr("cx", function (d) {
                    return d.x;
                })
                .attr("cy", function (d) {
                    return d.y;
                })
                .attr("r", 5)
                .style("fill", "black")
                .on('click', function (d) {
                    if (d3.event.defaultPrevented) return;
                    self.click(d);
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

        var tree = createTree(2, 5);
        var nodeDisplay = new NodeDisplay('body', 600, 600);
        nodeDisplay.click = function (d) {
            var node = {
                x: d.x + 50,
                y: d.y + 50,
                id: generateId()
            };
            tree.nodes.push(node);
            var link = {
                source: d,
                target: node,
                id: generateId()
            };
            tree.links.push(link);
            nodeDisplay.update(tree.nodes, tree.links);
        };
        nodeDisplay.update(tree.nodes, tree.links);
    };

    // ======================================================================= 
    // odata test
    // =======================================================================     
    var oDataTest = function () {
        var nodes = [];
        var links = [];

        var followLink = function (source, uri) {

            var parser = document.createElement('a');
            parser.href = uri;
            var path = parser.pathname;

            oDataService.getData(path).done(function (objects) {
                for (var i = 0; i < objects.length; i++) {
                    var object = objects[i];
                    var node = {
                        x: 300,
                        y: 300,
                        id: generateId(),
                        bo: object
                    };
                    nodes.push(node);
                    var link = {
                        source: source,
                        target: node,
                        id: generateId()
                    };
                    links.push(link);
                }
                nodeDisplay.update(nodes, links);
            });

        };

        var nodeDisplay = new NodeDisplay('body', 600, 600);
        nodeDisplay.click = function (node) {
            for (var propertyName in node.bo) {
                var propertyValue = node.bo[propertyName];
                if (!propertyValue.__deferred) continue;
                followLink(node, propertyValue.__deferred.uri);
            }
            nodeDisplay.update(nodes, links);
        };

        var oDataService = new odatalib.ODataService('/V3/Northwind/Northwind.svc');
        oDataService.getData('/V3/Northwind/Northwind.svc/Products(1)').done(function (objects) {
            var root = {
                x: 300,
                y: 300,
                id: generateId(),
                bo: objects[0]
            };
            nodes.push(root);
            nodeDisplay.update(nodes, links);
        });
    };

    //test();
    oDataTest();

})();