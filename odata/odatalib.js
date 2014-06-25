/* global OData */
/* global dobi */
/* global $ */
/* global window */
/* global document */
/* global alert */


(function () {

    window.obo = window.obo || {};
    var module = window.obo.odatalib = {};

    // ======================================================================= 
    // OData service
    // ======================================================================= 

    module.ODataService = function () {
        this.init.apply(this, arguments);
    };

    module.ODataService.prototype = {

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
        },

        getData: function (url) {
            var deferred = $.Deferred();
            OData.read(url, function (data) {
                var objects;
                if (data.results)
                    objects = data.results;
                else
                    objects = [data];
                deferred.resolve(objects);
            }, function (error) {
                deferred.reject(error);
            });
            return deferred;
        }

    };

})();