/* global window */
/* global console */

(function () {

    var define = window.define || function (deps, mod) {
        window.dobiRoot = window.dobiRoot || {};
        window.dobiRoot.property = mod(window.dobiRoot.eventing);
    };

    define(["lib/eventing"], function (eventingModule) {

        var module = {};

        // ===================================================================
        // get setter name from property name
        // ===================================================================
        module.setterName = function (propertyName) {
            return 'set' + propertyName[0].toUpperCase() + propertyName.slice(1);
        };

        // ===================================================================
        // generate setter method
        // ===================================================================
        module.generateSetter = function (obj, propertyName) {
            var setter = module.setterName(propertyName);
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
                module.generateSetter(obj, propertyName);
                obj[module.setterName(propertyName)].apply(obj, [value]);
            }
        };

        // ===================================================================
        // check for list
        // ===================================================================
        module.isList = function (obj) {
            if (Object.prototype.toString.call(obj) === '[object Array]') return true;
            return false;
        };

        // ===================================================================
        // property types
        // ===================================================================
        module.PROPERTY_TYPE_SIMPLE = 1;
        module.PROPERTY_TYPE_STATIC = 2;

        // ===================================================================
        // property events
        // ===================================================================
        module.PROP_EVENT_TYPE_CHANGE = "property_change";
        module.PROP_EVENT_TYPE_CHANGE_PUSH = "property_change_push";
        module.PROP_EVENT_TYPE_CHANGE_SPLICE = "property_change_splice";
        module.PROP_EVENT_TYPE_DELETE = "delete";
        module.PROP_EVENT_TYPE_UPDATE_LIST_INDEX = "list_update_list_index";

        // ===================================================================
        // property 
        // ===================================================================
        module.Property = function () {
            this.init.apply(this, arguments);
        };

        module.Property.prototype = {

            init: function (params) {
                this.type = params.type;
                this.eventTypes = params.eventTypes;
                this.object = params.object;
                this.path = '' + params.path;
                this.listening = false;
                this.targetList = null;
                if (!this.type) this.type = module.PROPERTY_TYPE_SIMPLE;
                if (this.type === module.PROPERTY_TYPE_STATIC)
                    this.staticValue = params.value;
                else
                    this.pathParts = this.pathParts(this.object, this.path);
                if (!this.eventTypes) this.eventTypes = [module.PROP_EVENT_TYPE_CHANGE,
                                                         module.PROP_EVENT_TYPE_CHANGE_PUSH,
                                                         module.PROP_EVENT_TYPE_CHANGE_SPLICE,
                                                         module.PROP_EVENT_TYPE_DELETE,
                                                         module.PROP_EVENT_TYPE_UPDATE_LIST_INDEX];
                eventingModule.setAutoDelete(this, 0);
            },

            resolve: function (path) {
                if (path === '.') return this;
                return module.objectProperty(this.value(), path);
            },

            resolveValue: function (path) {
                return this.resolve(path).value();
            },

            listIndex : function(){
                var pathPart = this.pathParts[this.pathParts.length-1];
                return parseInt(pathPart.propertyName);
            },
            
            pathParts: function (object, path) {
                var parts = path.split('/');
                var pathParts = [];
                for (var i = 0; i < parts.length; ++i) {
                    var part = parts[i];
                    pathParts.push({
                        object: object,
                        propertyName: part
                    });
                    if (object)
                        object = object[part];
                    else
                        object = undefined;
                }
                return pathParts;
            },

            reParsePath: function (startIndex) {
                if (!startIndex) startIndex = 0;
                for (var index = startIndex; index < this.pathParts.length; ++index) {
                    var pathPart = this.pathParts[index];
                    if (index === 0) continue;
                    var prevPathPart = this.pathParts[index - 1];
                    if (prevPathPart.object)
                        pathPart.object = prevPathPart.object[prevPathPart.propertyName];
                    else
                        pathPart.object = undefined;
                }
            },

            get: function () {
                if (this.type === module.PROPERTY_TYPE_STATIC) return this.staticValue;
                var pathPart = this.pathParts[this.pathParts.length - 1];
                if (!pathPart.object) return undefined;
                return pathPart.object[pathPart.propertyName];
            },

            set: function (value) {
                if (this.type === module.PROPERTY_TYPE_STATIC) throw "Cannot change static property";
                var pathPart = this.pathParts[this.pathParts.length - 1];
                if (!pathPart.object) throw undefined;
                module.setProperty(pathPart.object, pathPart.propertyName, value);
            },

            value: function (value) {
                if (arguments.length === 0)
                    return this.get();
                else
                    return this.set(value);
            },

            subscribe: function (object, handler) {
                if (this.type === module.PROPERTY_TYPE_STATIC) {
                    if (!module.isList(this.staticValue)) return;
                    this.targetList = this.staticValue;
                    eventingModule.subscribeToMethodCall(this.targetList, 'push', this, this.attributeChanged);
                    eventingModule.subscribeToMethodCall(this.targetList, 'splice', this, this.attributeChanged);
                    eventingModule.subscribe(this, 'propertyChanged', object, handler);
                    return;
                }
                eventingModule.subscribe(this, 'propertyChanged', object, handler);
                if (!this.listening) {
                    this.reParsePath();
                    this.listenToObjects();
                }
                return this;
            },

            unSubscribe: function (node, handler) {
                if (this.type === module.PROPERTY_TYPE_STATIC) {
                    if (!module.isList(this.staticValue)) return;
                    this.targetList = null;
                    eventingModule.unSubscribeToMethodCall(this.targetList, 'push', this, this.attributeChanged);
                    eventingModule.unSubscribeToMethodCall(this.targetList, 'splice', this, this.attributeChanged);
                    eventingModule.unSubscribe(this, 'propertyChanged', node, handler);
                    return;
                }
                eventingModule.unSubscribe(this, 'propertyChanged', node, handler);
                return this;
            },

            afterDeleteSubscriptions: function () {
                this.listening = false;
            },

            listenToObjects: function (index) {
                var pathPart;

                if (!index) index = 0;

                for (var i = index; i < this.pathParts.length; ++i) {
                    pathPart = this.pathParts[i];
                    if (pathPart.object) this.listenToObject(pathPart);
                }

                pathPart = this.pathParts[this.pathParts.length-1];
                if (pathPart && pathPart.object) {
                    var value = pathPart.object[pathPart.propertyName];
                    if (module.isList(value)) {
                        this.targetList = value;
                        eventingModule.subscribeToMethodCall(this.targetList, 'push', this, this.attributeChanged);
                        eventingModule.subscribeToMethodCall(this.targetList, 'splice', this, this.attributeChanged);
                    }
                }

                this.listening = true;
            },

            unListenToObjects: function (index) {

                if (!index) index = 0;

                for (var i = index; i < this.pathParts.length; ++i) {
                    var pathPart = this.pathParts[i];
                    if (pathPart.object) this.unListenToObject(pathPart);
                }

                if (this.targetList) {
                    eventingModule.unSubscribeToMethodCall(this.targetList, 'push', this, this.attributeChanged);
                    eventingModule.unSubscribeToMethodCall(this.targetList, 'splice', this, this.attributeChanged);
                    this.targetList = null;
                }

                this.listening = false;
            },

            listenToObject: function (pathPart) {
                if (module.isList(pathPart.object)) {
                    eventingModule.subscribeToMethodCall(pathPart.object, 'push', this, this.attributeChanged);
                    eventingModule.subscribeToMethodCall(pathPart.object, 'splice', this, this.attributeChanged);
                } else {
                    module.generateSetter(pathPart.object, pathPart.propertyName);
                    eventingModule.subscribeToMethodCall(pathPart.object, module.setterName(pathPart.propertyName), this, this.attributeChanged);
                }
            },

            unListenToObject: function (pathPart) {
                if (module.isList(pathPart.object)) {
                    eventingModule.unSubscribe(pathPart.object, 'push', this, this.attributeChanged);
                    eventingModule.unSubscribe(pathPart.object, 'splice', this, this.attributeChanged);
                } else {
                    eventingModule.unSubscribe(pathPart.object, module.setterName(pathPart.propertyName), this, this.attributeChanged);
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
                    var listIndex = parseInt(pathPart.propertyName);
                    if (listIndex < spliceIndex) return false;
                    if (spliceNumAdd === 0 && spliceNumDel === 0) return false;
                    if (spliceNumAdd === spliceNumDel && listIndex >= spliceIndex + spliceNumAdd) return false;
                    return true;
                default:
                    return true;
                }
            },

            raisePropertyChanged: function (type, originalEvent) {
                if (this.eventTypes.indexOf(type) < 0) return;
                eventingModule.raiseEvent(this, 'propertyChanged', {
                    type: type,
                    value: this.value(),
                    originalEvent: originalEvent
                });
            },

            attributeChanged: function (event) {
                var pathPart;

                // check for target list change
                if (event.sender === this.targetList) {
                    switch (event.signal) {
                    case 'push':
                        this.raisePropertyChanged(module.PROP_EVENT_TYPE_CHANGE_PUSH, event);
                        break;
                    case 'splice':
                        this.raisePropertyChanged(module.PROP_EVENT_TYPE_CHANGE_SPLICE, event);
                        break;
                    }
                    return;
                }

                // identify sender in resolve path
                for (var i = 0; i < this.pathParts.length; ++i) {
                    pathPart = this.pathParts[i];
                    if (pathPart.object === event.sender) break;
                }
                if (i === this.pathParts.length)
                    throw "Error identifying sender";

                // check for change
                if (!this.isChanged(i, event)) return;

                // handle change
                if (module.isList(pathPart.object))
                    this.attributeChangedList(i, event);
                else
                    this.attributeChangedObject(i, event);

            },

            attributeChangedList: function (partIndex, event) {

                var pathPart = this.pathParts[partIndex];
                var listIndex = parseInt(pathPart.propertyName);

                switch (event.signal) {
                case 'splice':
                    var spliceIndex = event.message.args[0];
                    var spliceNumDel = event.message.args[1];
                    var spliceNumAdd = event.message.args.length - 2;
                    if (spliceIndex > listIndex) return;
                    if (listIndex >= spliceIndex && listIndex < spliceIndex + spliceNumDel) {
                        this.path += "!DELETED!";
                        pathPart.propertyName = "-1";
                        this.unListenToObjects();
                        this.raisePropertyChanged(module.PROP_EVENT_TYPE_DELETE, event);
                        return;
                    }
                    this.path = "!SEE_PATH_PARTS!";
                    var newIndex = listIndex - spliceNumDel + spliceNumAdd;
                    pathPart.propertyName = "" + newIndex;
                    this.raisePropertyChanged(module.PROP_EVENT_TYPE_UPDATE_LIST_INDEX, event);
                    break;
                default:
                    throw 'Not allowed method ' + event.signal;
                }

            },

            attributeChangedObject: function (partIndex, event) {

                var pathPart;

                // stop listening to objects below sender
                this.unListenToObjects(partIndex + 1);

                // resolve again starting from sender
                if ((partIndex + 1) < this.pathParts.length) {
                    this.pathParts[partIndex + 1].object = this.pathParts[partIndex].object[this.pathParts[partIndex].propertyName];
                    this.reParsePath(partIndex + 1);
                }

                // listen to object below sender
                this.listenToObjects(partIndex + 1);

                // notify property listeners
                this.raisePropertyChanged(module.PROP_EVENT_TYPE_CHANGE, event);

            }

        };

        // ===================================================================
        // poperty factory methods
        // ===================================================================

        module.objectProperty = function (object, path) {
            return new module.Property({
                object: object,
                path: path,
                type: module.PROPERTY_TYPE_SIMPLE
            });
        };

        module.listItemProperty = function (list, index) {
            return new module.Property({
                object: list,
                path: index,
                type: module.PROPERTY_TYPE_SIMPLE
            });
        };

        module.staticProperty = function (value) {
            return new module.Property({
                value: value,
                type: module.PROPERTY_TYPE_STATIC
            });
        };

        module.wrapAsProperty = function (obj) {
            if (obj instanceof module.Property)
                return obj;
            return module.staticProperty(obj);
        };

        return module;
    });

})();