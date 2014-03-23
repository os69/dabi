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

        module.Property = function () {
            this.init.apply(this, arguments);
        };

        module.Property.prototype = {

            init: function (parameter) {
                this.object = parameter.object;
                this.path = parameter.path;
                this.val = parameter.value;
                if (this.path)
                    this.pathParts = this.path.split(new RegExp("[\\.\\[\\]/]", "g")).filter(function (part) {
                        return part.length > 0;
                    });
                this.resolvePath = [];
                this.listening = false;
            },

            set: function (value) {
                if (!this.path) throw "Cannot set static property";
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
                    this.resolve();
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

            afterUnSubscribe: function (sender, signal, receiver, handler) {
                // delete all subscriptions if there are no more receivers
                if (eventing.getEventProperties(sender).getAllReceivers().length === 0) {
                    eventing.deleteSubscriptions(sender);
                    this.listening = false;
                }
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
                if (!this.path) return;
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
        module.makeProperty = function (object, propertyName) {
            return new module.Property({
                object: object,
                path: propertyName
            });
        };

        module.makeListItemProperty = function (item, list) {
            return new module.Property({
                object: list,
                value: item
            });
        };

        module.makeStaticProperty = function (value) {
            return new module.Property({
                value: value
            });
        };

        module.wrapAsProperty = function (obj) {
            if (obj instanceof module.Property)
                return obj;
            return module.makeStaticProperty(obj);
        };

        module.test = function () {

            var assert = function (cond, text) {
                if (!cond) console.log('ERROR ', text);
            };
            var compare = function (real, expected, text) {
                if (real !== expected) console.log('ERROR ', real, "!==", expected, text);
            };
            var checkException = function (job) {
                var except = false;
                try {
                    job();
                } catch (e) {
                    except = true;
                }
                if (!except) console.log('ERROR missing expected exception');
            };

            // ---------------------------------------------------------------
            // get tests
            // ---------------------------------------------------------------

            // test data
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

            // get 
            compare(new module.Property({
                object: salesOrder,
                path: 'status/subStatus/code'
            }).value(), 2);

            compare(new module.Property({
                object: salesOrder,
                path: 'status/code'
            }).value(), 1);

            compare(new module.Property({
                object: salesOrder,
                path: 'items/0/pos'
            }).value(), 10);

            compare(new module.Property({
                object: salesOrder,
                path: 'status'
            }).value(), salesOrder.status);

            compare(new module.Property({
                object: salesOrder,
                path: 'items/0'
            }).value(), salesOrder.items[0]);

            // ---------------------------------------------------------------
            // set/get tests
            // ---------------------------------------------------------------
            var p = new module.Property({
                object: salesOrder,
                path: 'status/code'
            });
            compare(p.value(), 1);
            p.value(10);
            compare(p.value(), 10);

            p = new module.Property({
                object: salesOrder,
                path: 'items/0/pos'
            });
            compare(p.value(), 10);
            p.value(15);
            compare(p.value(), 15);

            p = new module.Property({
                object: salesOrder,
                path: 'items/0'
            });
            compare(p.value(), salesOrder.items[0]);
            var item = {
                pos: 16
            };
            p.value(item);
            compare(p.value(), item);
            compare(new module.Property({
                object: salesOrder,
                path: 'items/0/pos'
            }).value(), 16);

            // ---------------------------------------------------------------
            // subscribe
            // ---------------------------------------------------------------

            // reset test data
            salesOrder = {
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

            p = new module.Property({
                object: salesOrder,
                path: 'status/subStatus/code'
            });

            var r = {
                message: null,
                listen: function (event) {
                    this.message = event.message;
                }
            };

            // subscribe
            p.subscribe(r, r.listen);

            // set
            p.set(3);
            compare(r.message, 3);

            var oldSubStatus = salesOrder.status.subStatus;
            var subStatus = {
                code: 4
            };
            compare(oldSubStatus.__eventing__.receivers.setCode.length, 1);

            // set substatus
            salesOrder.status.setSubStatus(subStatus);
            compare(r.message, 4);
            compare(oldSubStatus.__eventing__.receivers.setCode.length, 0);
            compare(subStatus.__eventing__.receivers.setCode.length, 1);

            // unsubcribe
            p.unSubscribe(r, r.listen);
            compare(subStatus.__eventing__.receivers.setCode.length, 0);

            // resubscribe
            p.subscribe(r, r.listen);
            compare(salesOrder.__eventing__.receivers.setStatus.length, 1);
            compare(salesOrder.status.__eventing__.receivers.setSubStatus.length, 1);
            compare(salesOrder.status.subStatus.__eventing__.receivers.setCode.length, 1);

            // change
            p.set(5);
            compare(r.message, 5);

            // delete target 
            eventing.deleteSubscriptions(r);
            compare(salesOrder.__eventing__.receivers.setStatus.length, 0);
            compare(salesOrder.status.__eventing__.receivers.setSubStatus.length, 0);
            compare(salesOrder.status.subStatus.__eventing__.receivers.setCode.length, 0);

            // ---------------------------------------------------------------
            // create property/ set list propr/ static prop
            // ---------------------------------------------------------------
            p = module.makeProperty(salesOrder, 'status/subStatus/code');
            compare(p.value(), 5);

            p = module.makeStaticProperty(3);
            compare(p.value(), 3);
            checkException(function () {
                p.set(5);
            });

            // ---------------------------------------------------------------
            // list change
            // ---------------------------------------------------------------
            // reset test data
            salesOrder = {
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

            p = module.makeProperty(salesOrder, 'items/1/pos');
            p.subscribe(r, r.listen);

            r.message = 'init';
            salesOrder.items.splice(0, 1, {
                pos: 5
            });
            compare(r.message, 'init');

            r.message = 'init';
            salesOrder.items.splice(1, 1, {
                pos: 15
            });
            compare(r.message, 15);

            r.message = 'init';
            salesOrder.items.splice(2, 1, {
                pos: 25
            });
            compare(r.message, 'init');

            console.log("ready");


        };

        return module;
    });

})();