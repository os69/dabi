/* global OData */
/* global dobi */
/* global $ */
/* global window */
/* global document */
/* global alert */

(function () {

    var ODataService = function () {
        this.init.apply(this, arguments);
    };

    ODataService.prototype = {

        init: function (serviceUrl) {
            this.serviceUrl = serviceUrl;
        },

        loadMetadata: function () {
            var self = this;
            var deferred = $.Deferred();
            OData.read(this.serviceUrl + '/$metadata', function (data) {
                self.metadata = data;
                self.entityTypesMetadata = self.metadata.dataServices.schema[0].entityType;
                self.entitySetsMetadata = self.metadata.dataServices.schema[1].entityContainer[0].entitySet;
                deferred.resolve();
            }, function (error) {
                alert(error);
                deferred.reject(error);
            }, OData.metadataHandler);
            return deferred;
        },

        getEntitySetMetadata: function (entitySet) {
            for (var i = 0; i < this.entitySetsMetadata.length; ++i) {
                var entitySetMetadata = this.entitySetsMetadata[i];
                if (entitySetMetadata.name === entitySet) return entitySetMetadata;
            }
        },

        getEntityTypeMetadata: function (entityType) {
            for (var i = 0; i < this.entityTypesMetadata.length; ++i) {
                var entityTypeMetadata = this.entityTypesMetadata[i];
                if (entityTypeMetadata.name === entityType) return entityTypeMetadata;
            }
        }

    };

    var model = window.model = {

        serviceUrl: '/V3/Northwind/Northwind.svc',

        entitySet: null,
        entitySetsMetadata: [],
        entitySetsMetadataCheckbox: {
            key: 'name',
            description: 'name'
        },

        entityTypeMetadata: {
            property: [],
            navigationProperty: []
        },

        
        objects: [],
        objectFields: [],

        load: function () {
            var self = this;
            this.oDataService = new ODataService(this.serviceUrl);
            this.oDataService.loadMetadata().done(function () {
                self.setEntitySetsMetadata(self.oDataService.entitySetsMetadata);
                self.setEntitySet(self.oDataService.entitySetsMetadata[0].name);
            });
        },

        setEntitySet: function (entitySet) {
            this.entitySet = entitySet;
            var entitySetMetadata = this.oDataService.getEntitySetMetadata(entitySet);
            var entityType = entitySetMetadata.entityType.split('.')[1];
            var entityTypeMetadata = this.oDataService.getEntityTypeMetadata(entityType);
            this.setEntityTypeMetadata(entityTypeMetadata);
        },

        navigate: function (event, link) {
            var self = this;

            // prevent navigation
            event.preventDefault();

            // new entity set
            self.setEntitySet(link.toRole);

            // get path (remove server prefix from uri)
            var parser = document.createElement('a');
            parser.href = link.uri;
            var path = parser.pathname;

            // do odata call
            OData.read(path, function (data) {
                self.setData(data);
            });

        },

        loadObjects: function () {
            var self = this;
            OData.read(this.serviceUrl + '/' + this.entitySet, function (data) {
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
            var objectFields = self.entityTypeMetadata.property.slice().filter(function (entityType, i) {
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
                $.each(self.entityTypeMetadata.navigationProperty, function (i, navigationProperty) {
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