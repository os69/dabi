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
            this.nodeDisplay = new nodes.NodeDisplay(nodeDisplayNode, 600, 600, function () {
                return this.__metadata.id;
            }, function () {
                return this.__metadata.type;
            });
            this.nodeDisplay.click = function (node) {
                self.click(node);
            };
            this.nodeDisplay.mouseover = function (node) {
                self.mouseover(node);
            };

            // node detail viewer
            this.detailModel = {
                detailFields: [],
                detailObject: null,
                navigate: function (event, obj) {
                    event.preventDefault();
                    self.followLink(this.detailObject.oDataObject, obj.uri, obj.name);
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
            for (var propertyName in node.obj) {
                var propertyValue = node.obj[propertyName];
                if (!propertyValue || !propertyValue.__deferred || !propertyValue.__deferred.uri) continue;
                this.followLink(node.obj, propertyValue.__deferred.uri, propertyName);
            }
        },

        mouseover: function (node) {
            var self = this;

            var detailFields = [];
            self.detailModel.detailObject = {
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

        followLink: function (source, uri, type) {

            var self = this;
            var parser = document.createElement('a');
            parser.href = uri;
            var path = parser.pathname;

            this.oDataService.getData(path).done(function (objects) {
                for (var i = 0; i < objects.length; i++) {
                    var object = objects[i];
                    self.nodeDisplay.addNode(object);
                    self.nodeDisplay.addLink(source, object, type);
                }
                self.nodeDisplay.update();
            });

        }

    };

    var viewer = new Viewer(document.getElementById('target'));
    $(document).foundation();

})();