define([], function () {

    var module = {

        idPropertyName: '__id__',

        maxId: 0,

        generateId: function () {
            return "#"+module.maxId++;
        },

        maxMapperId : 0,
        
        generateMapperId : function(){
            return module.maxMapperId++;
        }
    };

    module.Mapper = function () {
        this.init.apply(this, arguments);
    };
    
    module.Mapper.prototype = {

        init : function(){
            this.objectMap = {};
            this.idPropertyName = module.idPropertyName+module.generateMapperId();
        },
        
        getId: function (obj) {
            var id = obj[this.idPropertyName];
            if (!id) {
                var id = module.generateId();
                obj[this.idPropertyName] = id;
            }
            this.objectMap[id] = obj;
            return id;
        },

        getObject: function (id) {
            return this.objectMap[id];
        },

        deleteObject: function (obj) {
            delete this.objectMap[this.getId(obj)];
        }

    };

    module.defaultMapper = new module.Mapper();
    
    return module;

});