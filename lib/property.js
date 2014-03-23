/*global window */
/*global console*/

(function () {

    var define = window.define || function (deps, mod) {
            window.prop = mod(window.eventing);
        };

    define(["eventing"], function (eventing) {
        "use strict";

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
            generateSetter(obj, propertyName);
            obj[setterName(propertyName)].apply(obj, [value]);
        };

        // ===================================================================
        // property
        // ===================================================================

        module.Property = function () {
            this.init.apply(this, arguments);
        };

        module.Property.prototype = {

            init: function (parameter) {
                this.object = parameter.object;
                this.path = parameter.path;
                this.val = parameter.value;
                this.pathParts = this.path.split(new RegExp("[\\.\\[\\]/]", "g")).filter(function (part) {
                    return part.length > 0;
                });
                this.resolvePath = [];
                this.listening = false;
            },

            set: function (value) {
                this.resolve();
                if (this.resolvePath.length === this.pathParts.length) {
                    var resolvePart = this.resolvePath[this.resolvePath.length - 1];
                    module.setProperty(resolvePart.object, resolvePart.propertyName, value);
                } else {
                    throw "Cannot set unresolved property " + this.path;
                }
                return this;
            },

            get: function () {
                this.resolve();
                return this.val;
            },

            value: function (value) {
                if (arguments.length === 0)
                    return this.get();
                else
                    return this.set(value);
            },

            subscribe: function (node, handler) {
                if (!this.path) return;
                eventing.subscribe(this, 'propertyChanged', node, handler);
                if (!this.listening) {
                    this.listenToObjects();
                    this.listening = true;
                }
                return this;
            },

            unSubscribe: function (node, handler) {
                if (!this.path) return;
                eventing.unSubscribe(this, 'propertyChanged', node, handler);
                return this;
            },

            deleteSubscriptionsCleanup: function () {
                this.listening = false;
            },

            listenToObjects: function () {
                for (var i = 0; i < this.resolvePath.length; ++i) {
                    var resolvePart = this.resolvePath[i];
                    this.listenToObject(resolvePart);
                }
            },

            listenToObject: function (resolvePart) {
                if (Object.prototype.toString.call(resolvePart.object) === '[object Array]') {
                    eventing.subscribeToMethodCall(resolvePart.object, 'push', this, this.attributeChanged);
                    eventing.subscribeToMethodCall(resolvePart.object, 'splice', this, this.attributeChanged);
                } else {
                    generateSetter(resolvePart.object, resolvePart.propertyName);
                    eventing.subscribeToMethodCall(resolvePart.object, setterName(resolvePart.propertyName), this, this.attributeChanged);
                }
            },

            unListenToObject: function (resolvePart) {
                if (Object.prototype.toString.call(resolvePart.object) === '[object Array]') {
                    eventing.unSubscribe(resolvePart.object, 'push', this, this.attributeChanged);
                    eventing.unSubscribe(resolvePart.object, 'splice', this, this.attributeChanged);
                } else {
                    eventing.unSubscribe(resolvePart.object, setterName(resolvePart.propertyName), this, this.attributeChanged);
                }
            },

            isChanged: function (index, event) {
                var resolvePart = this.resolvePath[index];
                var part = this.pathParts[index];
                switch (event.signal) {
                case 'push':
                    if (parseInt(part) === resolvePart.object.length - 1) return true;
                    return false;
                case 'splice':
                    var listIndex = parseInt(part);
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
                for (var i = 0; i < this.resolvePath.length; ++i) {
                    resolvePart = this.resolvePath[i];
                    if (resolvePart.object === event.sender) break;
                }
                if (i === this.resolvePath.length)
                    throw "Error identifying sender";

                // check for change
                if (!this.isChanged(i, event)) return;

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
                this.doResolve(object, i);

                // listen to object below sender
                for (j = i + 1; j < this.resolvePath.length; ++j) {
                    resolvePart = this.resolvePath[j];
                    this.listenToObject(resolvePart);
                }

                // notify property listeners
                eventing.raiseEvent(this, 'propertyChanged', this.val);
            },

            resolve: function () {
                this.resolvePath = [];
                this.doResolve(this.object, 0);
            },

            doResolve: function (obj, pathIndex) {

                var part = this.pathParts[pathIndex];
                var newObj;

                if (Object.prototype.toString.call(obj) === '[object Array]') {
                    var listIndex = parseInt(part);
                    newObj = obj[listIndex];
                } else {
                    newObj = obj[part];
                }

                var resolvePart = {
                    object: obj,
                    propertyName: part,
                    value: newObj
                };
                this.resolvePath.push(resolvePart);

                pathIndex++;
                if (pathIndex < this.pathParts.length) {
                    if (newObj)
                        this.doResolve(newObj, pathIndex);
                    else
                        this.val = null;
                } else {
                    this.val = newObj;
                }


            }
        };

        // ===================================================================
        // poperty factory
        // ===================================================================
        module.makeProperty = function (object, name, parent) {
            return new module.Property({
                parent: parent,
                object: object,
                name: name
            });
        };

        module.makeStaticProperty = function (value, parent) {
            return new module.Property({
                parent: parent,
                value: value
            });
        };

        module.makeListItemProperty = function (listItem, list, parent) {
            return new module.Property({
                parent: parent,
                object: list,
                value: listItem
            });
        };

        module.wrapAsProperty = function (obj) {
            if (obj instanceof module.Property)
                return obj;
            return module.makeStaticProperty(obj);
        };

        module.test = function () {

            var salesOrder = {
                status: {
                    code: 1,
                    subStatus: {
                        code: 2
                    }
                },
                items: [{
                    pos: 10
                }, {
                    pos: 20
                }]
            };

            var p = new module.Property({
                object: salesOrder,
                path: 'status/subStatus/code'
            });

            console.log(p.get());
            p.set(13);
            console.log(p.get());

            p.subscribe({}, function (event) {
                console.log("p changed", event.message);
            });

            salesOrder.status.setSubStatus({
                code: 3
            });
            salesOrder.status.subStatus.setCode(13);

            console.log('list');

            p = new module.Property({
                object: salesOrder,
                path: 'items/2/pos'
            });

            console.log(p.value());

            p.subscribe({}, function (e) {
                console.log('list changed', e.message);
            });

            salesOrder.items.push({
                pos: 30
            });
            salesOrder.items.splice(2,1,{pos:15});
        };

        return module;
    });

})();