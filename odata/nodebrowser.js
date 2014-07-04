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
                        if (!propertyValue || !propertyValue.__deferred || !propertyValue.__deferred.uri)
                            continue;
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
                template: 'bold'
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
        }

    };

    var viewer = new Viewer(document.getElementById('target'));
    $(document).foundation();

})();