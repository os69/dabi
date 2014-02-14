define(["map", "objectid"], function (map, objectid) {
    "use strict";

    var mapper = new objectid.Mapper();

    var module = {};

    // =======================================================================
    // Event
    // =======================================================================
    module.Event = function () {
        this.init.apply(this, arguments);
    };

    module.Event.prototype = {

        init: function (data) {
            $.extend(this, data);
            if (!this.processedObjects) {
                // new obj
                this.processedObjects = {};
            } else {
                // copy
                this.processedObjects = $.extend({}, this.processedObjects);
            }
        },

        addProcessedObject: function (obj, slot) {
            this.processedObjects[module.mapper.getId(obj) + slot] = null;
        },

        isProcessedObj: function (obj, slot) {
            if (this.processedObjects[module.mapper.getId(obj) + slot] !== undefined) {
                return true;
            }
            return false;
        }
    };

    // =======================================================================
    // eventing
    // =======================================================================
    $.extend(module, {

        mapper: mapper,

        senderMap: new map.Map({
            mapper: mapper
        }),

        receiverMap: new map.Map({
            mapper: mapper
        }),

        slotId: 0,

        generateSlot: function () {
            return "slot" + (module.slotId++);
        },

        subscribe: function (sender, signal, receiver, slot, handler) {

            // function is called with only 4 arguments sender,signal,receiver,handler -> reinit arguments
            if (arguments.length === 4) {
                if (typeof slot === 'function') {
                    handler = slot;
                    slot = module.generateSlot();
                } else {
                    handler = module.methodCallHandler;
                }
            }

            // register event handler
            module.receiverMap.put([sender, signal, receiver, slot], handler);
            module.senderMap.put([receiver, sender, signal, slot], handler);

        },

        unSubscribe: function (sender, signal, receiver, slot) {
            module.receiverMap.del([sender, signal, receiver, slot]);
            module.senderMap.del([receiver, sender, signal, slot]);
        },

        raiseEvent: function (sender, signal, message, processedObjects) {
            var event = new module.Event({
                sender: sender,
                signal: signal,
                message: message,
                processedObjects: processedObjects
            });
            var receivers = module.receiverMap.get([sender, signal]);
            for (var i = 0; i < receivers.length; ++i) {
                var receiverData = receivers[i];
                var receiver = receiverData.keys[0];
                var slot = receiverData.keys[1];
                var handler = receiverData.value;
                if (event.isProcessedObj(receiver, slot)) {
                    continue;
                }
                event.addProcessedObject(receiver, slot);
                handler.apply(receiver, [event, slot]);
            }
        },

        raiseMethodEvent: function (sender, signal, message, processedObjects) {
            if (!processedObjects) {
                var event = new module.Event({});
                event.addProcessedObject(sender, signal);
                processedObjects = event.processedObjects;
            }
            module.raiseEvent(sender, signal, message, processedObjects);
        },

        deleteObject: function (obj) {
            var sender, signal, slot, receiver;
            // obj as receiver
            receiver = obj;
            var senders = module.senderMap.get([receiver]);
            for (var i = 0; i < senders.length; ++i) {
                var senderData = senders[i];
                sender = senderData.keys[0];
                signal = senderData.keys[1];
                slot = senderData.keys[2];
                module.receiverMap.del([sender, signal, receiver, slot]);
            }
            module.senderMap.del([receiver]);
            // obj as sender
            sender = obj;
            var receivers = module.receiverMap.get([sender]);
            for (i = 0; i < receivers.length; ++i) {
                var receiverData = receivers[i];
                signal = receiverData.keys[0];
                receiver = receiverData.keys[1];
                slot = receiverData.keys[2];
                module.senderMap.del([receiver, sender, signal, slot]);
            }
            module.receiverMap.del([sender]);
            // delete obj from id mapper
            module.receiverMap.mapper.deleteObject(obj);
        },

        methodCallHandler: function (event, slot) {
            var method = this[slot];
            method.apply(this, [event, slot]);
        }

    });

    // =======================================================================
    // method eventing
    // =======================================================================

    module.methodEventing = {

        noMethodCall: {
            label: 'no method call'
        },

        generateHandler: function (transformation) {
            return function (event, slot) {

                var message = event.message;

                if (transformation) {
                    var transformationParams = [];
                    transformationParams.push.apply(transformationParams, event.message);
                    transformationParams.push(event.sender, this);
                    message = transformation.apply(null, transformationParams);
                }

                var method = this[slot];
                if (!method || message === module.methodEventing.noMethodCall) {
                    module.raiseMethodEvent(this, slot, event.message, event.processedObjects);
                    return;
                }

                if (method.__isDecorator__) {
                    method.processedObjects = event.processedObjects;
                }
                method.apply(this, message);
            };
        },

        decorate: function (obj, methodName) {
            var method = obj[methodName];
            if (!method) {
                return;
            }
            if (method.__isDecorator__) {
                return;
            }
            var decorator = function () {

                var processedObjects;
                if (decorator.processedObjects) {
                    processedObjects = decorator.processedObjects;
                    decorator.processedObjects = null;
                } else {
                    processedObjects = null;
                }

                var result = method.apply(this, arguments);

                if (arguments.length !== 0) {
                    module.raiseMethodEvent(this, methodName, arguments, processedObjects);
                }

                return result;
            };
            decorator.__isDecorator__ = true;
            decorator.originalMethod = method;
            obj[methodName] = decorator;
        },

        connect: function (sender, signal, receiver, slot, trans1, trans2) {
            if (arguments.length <= 4) {
                this.connectSingle(sender, signal, receiver, slot);
                this.connectSingle(receiver, slot, sender, signal);
            } else {
                if (trans1) {
                    if (trans1 instanceof Function) {
                        this.connectSingle(sender, signal, receiver, slot, trans1);
                    } else {
                        this.connectSingle(sender, signal, receiver, slot);
                    }

                }
                if (trans2) {
                    if (trans2 instanceof Function) {
                        this.connectSingle(receiver, slot, sender, signal, trans2);
                    } else {
                        this.connectSingle(receiver, slot, sender, signal);
                    }
                }
            }
        },

        connectSingle: function (sender, signal, receiver, slot, transformation) {
            this.decorate(sender, signal);
            this.decorate(receiver, slot);
            module.subscribe(sender, signal, receiver, slot, this.generateHandler(transformation));
        }

    };

    return module;
});