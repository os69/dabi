/* global OData */
/* global dobi */
/* global $ */
/* global window */
/* global document */
/* global alert */

(function () {


    var model = window.model = {

        serviceUrl: '/V3/Northwind/Northwind.svc',

        metadata: null,

        entitySet: null,
        entitySets: [],
        entitySetsMeta: {
            key: 'entityType',
            description: 'name'
        },

        entityType: {
            property: [],
            navigationProperty: []
        },

        objects: [],
        objectFields: [],

        load: function () {
            var self = this;
            OData.read(
                this.serviceUrl + '/$metadata',
                function (data) {
                    self.metadata = data;
                    self.setEntitySets(data.dataServices.schema[1].entityContainer[0].entitySet);
                    self.setEntitySet(self.entitySets[0]);
                }, function (error) {
                    alert(error);
                }, OData.metadataHandler);
        },

        getEntityType: function (entityTypeName) {
            var entityType, found = false;
            for (var i = 0; i < this.metadata.dataServices.schema[0].entityType.length; ++i) {
                entityType = this.metadata.dataServices.schema[0].entityType[i];
                if (entityType.name === entityTypeName) {
                    found = true;
                    break;
                }
            }
            if (!found) return null;
            return entityType;
        },

        navigate: function (event, link) {
            var self = this;

            // prevent navigation
            event.preventDefault();

            // new entity set
            self.setEntitySet(this.getEntitySet(link.toRole));

            // get path (remove server prefix from uri)
            var parser = document.createElement('a');
            parser.href = link.uri;
            var path = parser.pathname;

            // do odata call
            OData.read(path, function (data) {
                self.setData(data);
            });

        },

        getEntitySet: function (entitySetName) {
            for (var i = 0; i < this.metadata.dataServices.schema[1].entityContainer[0].entitySet.length; ++i) {
                var entitySet = this.metadata.dataServices.schema[1].entityContainer[0].entitySet[i];
                if (entitySet.name === entitySetName) return entitySet;
            }
            return null;
        },

        setEntitySet: function (entitySet) {
            var self = this;
            this.entitySet = entitySet;
            self.setEntityType(self.getEntityType(entitySet.entityType.split('.')[1]));
        },

        loadObjects: function () {
            var self = this;
            OData.read(this.serviceUrl + '/' + this.entitySet.name, function (data) {
                self.setData(data);
            }, function (error) {
                alert(error);
            });
        },

        setData: function (data) {
            var self = this;

            // clear objects
            self.setObjects([]);

            // set object fields
            var objectFields = self.entityType.property.slice().filter(function (entityType, i) {
                return entityType.type !== 'Edm.Binary' && i < 10;
            });
            for (var i = 0; i < objectFields.length; ++i) {
                var field = objectFields[i];
                field.template = 'simpleField';
            }
            objectFields.push({
                name: 'Links',
                template: 'links'
            });
            self.setObjectFields(objectFields);

            // normalize objects
            var objects;
            if (data.results) 
                objects = data.results;
            else 
                objects = [data];
            
            // set objects
            $.each(objects, function (i, obj) {
                obj.Links = [];
                $.each(self.entityType.navigationProperty, function (i, navigationProperty) {
                    obj.Links.push({
                        name: navigationProperty.name,
                        uri: obj[navigationProperty.name].__deferred.uri,
                        toRole: navigationProperty.toRole
                    });
                });
            });
            self.setObjects(objects);

        }
    };

    dobi.binding.run(model, document.getElementById('templates'), document.getElementById('target'));
    $(document).foundation();


})();