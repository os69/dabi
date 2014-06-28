/* global d3 */
/* global alert */
/* global window */
/* global document */
/* global dobi */
/* global $ */

(function () {

    window.obo = window.obo || {};
    var odata = window.obo.odata;
    var nodes = window.obo.nodes;

    var Viewer = function () {
        this.init.apply(this, arguments);
    };

    Viewer.prototype = {

        init: function (parentNode) {

            var self = this;

            // node display
            var nodeDisplayNode = document.createElement('div');
            parentNode.appendChild(nodeDisplayNode);
            this.nodeDisplay = new nodes.NodeDisplay({
                parentDomNode: nodeDisplayNode,
                width: 600,
                height: 600,
                getId: function (obj) {
                    return obj.__metadata.id;
                },
                getType: function (obj) {
                    return obj.__metadata.type;
                },
                getRelationTypes: function (obj) {
                    var types = [];
                    for (var propertyName in obj) {
                        var propertyValue = obj[propertyName];
                        if (!propertyValue || !propertyValue.__deferred || !propertyValue.__deferred.uri) continue;
                        types.push(propertyName);
                    }
                    return types;
                },
                getRelatedObjects: function (obj, type) {
                    var result = $.Deferred();
                    var parser = document.createElement('a');
                    parser.href = obj[type].__deferred.uri;
                    var path = parser.pathname;
                    return self.oDataService.getData(path);
                },
                click: function (node) {
                    self.click(node);
                },
                mouseover: function (node) {
                    self.mouseover(node);
                }
            });

            // node detail viewer
            this.detailModel = {
                detailFields: [],
                detailObject: null,
                navigate: function (event, obj) {
                    event.preventDefault();
                    this.detailObject.node.toggle(obj.name);
                }
            };
            var detailNode = document.createElement('div');
            parentNode.appendChild(detailNode);
            dobi.binding.run(self.detailModel, document.getElementById('templates'), detailNode);

            // odata service
            this.oDataService = new odata.ODataService('/V3/Northwind/Northwind.svc');
            this.oDataService.getData('/V3/Northwind/Northwind.svc/Products(1)').done(function (objects) {
                self.nodeDisplay.addNode(objects[0]);
                self.nodeDisplay.update();
            });

        },

        click: function (node) {
            var self = this;
            node.toggleAll();
        },

        mouseover: function (node) {
            var self = this;

            var detailFields = [];
            self.detailModel.detailObject = {
                type: node.obj.__metadata.type,
                links: [],
                node: node
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
                    self.detailModel.detailObject.links.push({
                        name: propertyName,
                        uri: propertyValue.__deferred.uri
                    });
                    continue;
                }
                if (dobi.binding.getType(propertyValue) !== 'simple') continue;
                self.detailModel.detailObject[propertyName] = propertyValue;
                detailFields.push({
                    name: propertyName,
                    template: 'simple'
                });
            }
            self.detailModel.setDetailFields(detailFields);
        },

        followLink: function (node, uri, type, mode) {

            // check if already link type has been loaded
            if (!node.__links) node.__links = {};
            var status = node.__links[type];
            if (status) {
                switch (mode) {
                case 'expand':
                    if (!status.expanded) {
                        status.expanded = true;
                        node.expand(type);
                        this.nodeDisplay.update();
                    }
                    break;
                case 'collapse':
                    if (status.expanded) {
                        status.expanded = false;
                        node.collapse(type);
                        this.nodeDisplay.update();
                    }
                    break;
                case 'toggle':
                    if (status.expanded) {
                        status.expanded = false;
                        node.collapse(type);
                        this.nodeDisplay.update();
                        return;
                    } else {
                        status.expanded = true;
                        node.expand(type);
                        this.nodeDisplay.update();
                        return;
                    }
                    break;
                }
                return;
            }

            if (mode === 'collapse') return;

            // load links via odata service
            var self = this;
            var parser = document.createElement('a');
            parser.href = uri;
            var path = parser.pathname;

            this.oDataService.getData(path).done(function (objects) {
                for (var i = 0; i < objects.length; i++) {
                    var object = objects[i];
                    self.nodeDisplay.addNode(object);
                    self.nodeDisplay.addLink(node.obj, object, type);
                }
                self.nodeDisplay.update();
            });

            //mark link type as loaded + expanded
            node.__links[type] = {
                expanded: true
            };
        }

    };

    var viewer = new Viewer(document.getElementById('target'));
    $(document).foundation();

})();