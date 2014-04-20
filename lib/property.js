
(function () {

    var define = window.define || function (deps, mod) {
            window.property = mod(window.eventing);
        };

    define(["lib/eventing"], function (eventing) {

        var module = {};


        // ===================================================================
        // get setter name from property name
        // ===================================================================
        var setterName = function (propertyName) {
            return 'set' + propertyName[0].toUpperCase() + propertyName.slice(1);
        };

        // ===================================================================
        // generate setter method
        // ===================================================================
        var generateSetter = function (obj, propertyName) {
            var setter = setterName(propertyName);
            if (obj[setter]) {
                return;
            }
            obj[setter] = function (value) {
                this[propertyName] = value;
            };
        };

        // ===================================================================
        // generic setter
        // ===================================================================
        module.setProperty = function (obj, propertyName, value) {
            if (value === obj[propertyName]) return;
            if (Object.prototype.toString.call(obj) === '[object Array]') {
                var index = parseInt(propertyName);
                obj.splice(index, 1, value);
            } else {
                generateSetter(obj, propertyName);
                obj[setterName(propertyName)].apply(obj, [value]);
            }
        };

        // ===================================================================
        // property
        // ===================================================================
        
        module.PROPERTY_TYPE_SIMPLE = 1;
        module.PROPERTY_TYPE_LISTITEM = 2;
        module.PROPERTY_TYPE_STATIC = 3;
        
        module.Property = function(){
          this.init.apply(this,arguments);
        };

        module.Property.prototype = {
        
            init : function(params){
                this.type      = params.type;
                this.object    = params.object;
                this.path      = params.path;
                this.pathParts = this.parsePath(this.object, this.path);
                this.listening = false;
                if (!this.type) this.type = module.PROPERTY_TYPE_SIMPLE;                            
                eventing.setAutoDelete(this, 0);                
            },
            
            parsePath : function(object,path){
                var parts = path.split('/');
                var pathParts = [];
                for(var i=0;i<parts.length;++i){
                  var part = parts[i];
                  if(!object) object=null;
                  pathParts.push({
                    object : object,
                    propertyName : part
                  });
                  if(object){
                     object = object[part];
                  }
                }
                return pathParts;
            },     
            
            get : function(){
                var pathPart = this.pathParts[this.pathParts.length-1];
                if(!pathPart.object) throw "Unresolved Property";
                return pathPart.object[pathPart.propertyName]
            },
            
            set : function(value){
                var pathPart = this.pathParts[this.pathParts.length-1];                
                if(!pathPart.object) throw "Unresolved Property";
                module.setProperty(pathPart.object,pathPart.propertyName,value);
            },
            
            value: function (value) {
                if (arguments.length === 0)
                    return this.get();
                else
                    return this.set(value);
            },
            
            subscribe: function (object, handler) {
                if (this.type === module.PROPERTY_TYPE_STATIC) return;
                eventing.subscribe(this, 'propertyChanged', object, handler);
                if(!this.listening){
                    this.pathParts = this.parsePath(this.object, this.path);
                    this.listenToObjects();
                }
                return this;
            },

            unSubscribe: function (node, handler) {
                if (this.type === module.PROPERTY_TYPE_STATIC) return;
                eventing.unSubscribe(this, 'propertyChanged', node, handler);
                return this;
            },
            
            afterDeleteSubscriptions: function () {
                this.listening = false;
            },
            
            listenToObjects: function () {
                for (var i = 0; i < this.pathParts.length; ++i) {
                    var pathPart = this.pathParts[i];
                    this.listenToObject(pathPart);
                }
                this.listening = true;
            },

            listenToObject: function (pathPart) {
                if (Object.prototype.toString.call(pathPart.object) === '[object Array]') {
                    eventing.subscribeToMethodCall(pathPart.object, 'push', this, this.attributeChanged);
                    eventing.subscribeToMethodCall(pathPart.object, 'splice', this, this.attributeChanged);
                } else {
                    generateSetter(pathPart.object, pathPart.propertyName);
                    eventing.subscribeToMethodCall(pathPart.object, setterName(pathPart.propertyName), this, this.attributeChanged);
                }
            },

            unListenToObject: function (pathPart) {
                if (Object.prototype.toString.call(resolvePart.object) === '[object Array]') {
                    eventing.unSubscribe(pathPart.object, 'push', this, this.attributeChanged);
                    eventing.unSubscribe(pathPart.object, 'splice', this, this.attributeChanged);
                } else {
                    eventing.unSubscribe(pathPart.object, setterName(pathPart.propertyName), this, this.attributeChanged);
                }
            },
            
            isChanged: function (index, event) {

                var pathPart = this.pathParts[index];
                

                switch (event.signal) {
                case 'push':
                    return false;
                case 'splice':
                    var spliceIndex = event.message.args[0];
                    var spliceNumDel = event.message.args[1];
                    var spliceNumAdd = event.message.args.length - 2;
                    if (listIndex < spliceIndex) return false;
                    if (spliceNumAdd === 0 && spliceNumDel === 0) return false;
                    if (spliceNumAdd === spliceNumDel && listIndex >= spliceIndex + spliceNumAdd) return false;
                    return true;
                default:
                    return true;
                }
            },
            
            attributeChanged: function (event) {
                var resolvePart;

                // identify sender in resolve path
                for (var i = 0; i < this.pathParts.length; ++i) {
                    pathPart = this.pathParts[i];
                    if (pathPart.object === event.sender) break;
                }
                if (i === this.pathParts.length)
                    throw "Error identifying sender";

                // check for change
                if (!this.isChanged(i, event)) return;

                // for list item properties: only adapt list index 
                if (Object.prototype.toString.call(resolvePart.object) === '[object Array]')
                    return this.adaptListIndex(i, event);

                // stop listening to objects below sender
                for (var j = i + 1; j < this.resolvePath.length; ++j) {
                    resolvePart = this.resolvePath[j];
                    this.unListenToObject(resolvePart);
                }

                // resolve again starting from sender
                this.resolvePath.splice(i, this.resolvePath.length - i);
                var object;
                if (i === 0)
                    object = this.object;
                else
                    object = this.resolvePath[i - 1].value;
                this.doCalculate(object, i);

                // listen to object below sender
                for (j = i + 1; j < this.resolvePath.length; ++j) {
                    resolvePart = this.resolvePath[j];
                    this.listenToObject(resolvePart);
                }

                // notify property listeners
                eventing.raiseEvent(this, 'propertyChanged', this.val);
            }

        };
     
        var test1 = function(){
        
            var salesOrder = {
                description : 'Order1',
                status : {
                  code : 1
                }
            };
            
            var p = new module.Property({object : salesOrder, 
                                         path   : 'status/code'});
                                         
            console.log(p.get());
            p.set(10);
            console.log(p.get());
                                         
        };
        
        test1();
     

         
        return module;
    });

})();
