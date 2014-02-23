define([], function () {
    "use strict";

    var module = {};

    // =======================================================================
    // extend
    // =======================================================================
    var extend = function (obj1, obj2) {
        for (var prop in obj2) {
            obj1[prop] = obj2[prop];
        }
        return obj1;
    };

    // =======================================================================
    // Event
    // =======================================================================
    module.Event = function () {
        this.init.apply(this, arguments);
    };

    module.Event.prototype = {

        init: function (data) {
            extend(this, data);
            if (!data.processedObjectsBySlot) {
                // new obj
                this.processedObjectsBySlot = {};
            } else {
                // copy
                this.processedObjectsBySlot = {};
                for (var slot in data.processedObjectsBySlot) {
                    this.processedObjectsBySlot[slot] = data.processedObjectsBySlot[slot].slice(0);
                }
            }
        },

        addProcessedObject: function (obj, slot) {
            var processedObjects = this.processedObjectsBySlot[slot];
            if (!processedObjects) {
                processedObjects = [];
                this.processedObjectsBySlot[slot] = processedObjects;
            }
            if (processedObjects.indexOf(obj) >= 0) return;
            processedObjects.push(obj);
        },

        isProcessedObj: function (obj, slot) {
            var processedObjects = this.processedObjectsBySlot[slot];
            if (!processedObjects) return false;
            if (processedObjects.indexOf(obj) < 0) return false;
            return true;
        }
    };

    // =======================================================================
    // eventing
    // =======================================================================
    var EVENT_PROPERTY = '__eventing__';

    extend(module, {

        slotId: 0,

        generateSlot: function () {
            return "slot" + (module.slotId++);
        },

        getEventProperties: function (obj) {
            var eventProperties = obj[EVENT_PROPERTY];
            if (!eventProperties) {
                eventProperties = {
                    receiversBySignal: {},
                    sendersBySignal: {}
                };
                obj[EVENT_PROPERTY] = eventProperties;
            }
            return eventProperties;
        },

        addReceiver: function (sender, signal, receiver, slot, handler) {
            var eventProperties = this.getEventProperties(sender);
            var receiversBySlot = eventProperties.receiversBySignal[signal];
            if (!receiversBySlot) {
                receiversBySlot = {};
                eventProperties.receiversBySignal[signal] = receiversBySlot;
            }
            var receivers = receiversBySlot[slot];
            if (!receivers) {
                receivers = [];
                receiversBySlot[slot] = receivers;
            }
            for (var i = 0; i < receivers.length; i++) {
                var receiverData = receivers[i];
                if (receiverData.receiver === receiver) return;
            }
            receivers.push({
                receiver: receiver,
                handler: handler
            });
        },

        removeReceiver: function (sender, signal, receiver, slot) {
            var eventProperties = this.getEventProperties(sender);
            var receiversBySlot = eventProperties.receiversBySignal[signal];
            if (!receiversBySlot) return;
            var receivers = receiversBySlot[slot];
            if (!receivers) return;
            for (var i = 0; i < receivers.length; i++) {
                var receiverData = receivers[i];
                if (receiverData.receiver === receiver) {
                    receivers.splice(i, 1);
                    return;
                }
            }
        },

        getReceivers: function (sender, signal) {
            var result = [];
            var eventProperties = this.getEventProperties(sender);
            var receiversBySlot = eventProperties.receiversBySignal[signal];
            if (!receiversBySlot) {
                return result;
            }
            for (var slot in receiversBySlot) {
                var receivers = receiversBySlot[slot];
                for (var i = 0; i < receivers.length; i++) {
                    var receiverData = receivers[i];
                    result.push({
                        receiver: receiverData.receiver,
                        slot: slot,
                        handler: receiverData.handler
                    });
                }
            }
            return result;
        },

        getAllReceivers: function (sender) {
            var result = [];
            var eventProperties = this.getEventProperties(sender);
            for (var signal in eventProperties.receiversBySignal) {
                var receiversBySlot = eventProperties.receiversBySignal[signal];
                for (var slot in receiversBySlot) {
                    var receivers = receiversBySlot[slot];
                    for (var i = 0; i < receivers.length; i++) {
                        var receiverData = receivers[i];
                        result.push({
                            signal: signal,
                            slot: slot,
                            receiver: receiverData.receiver
                        });
                    }
                }
            }
            return result;
        },

        addSender: function (sender, signal, receiver, slot) {
            var eventProperties = this.getEventProperties(receiver);
            var sendersBySlot = eventProperties.sendersBySignal[signal];
            if (!sendersBySlot) {
                sendersBySlot = {};
                eventProperties.sendersBySignal[signal] = sendersBySlot;
            }
            var senders = sendersBySlot[slot];
            if (!senders) {
                senders = [];
                sendersBySlot[slot] = senders;
            }
            if (senders.indexOf(sender) >= 0) return;
            senders.push(sender);
        },

        removeSender: function (sender, signal, receiver, slot) {
            var eventProperties = this.getEventProperties(receiver);
            var sendersBySlot = eventProperties.sendersBySignal[signal];
            if (!sendersBySlot) return;
            var senders = sendersBySlot[slot];
            if (!senders) return;
            var index = senders.indexOf(sender);
            if (index < 0) return;
            senders.splice(index, 1);
        },

        getAllSenders: function (receiver) {
            var result = [];
            var eventProperties = this.getEventProperties(receiver);
            for (var signal in eventProperties.sendersBySignal) {
                var sendersBySlot = eventProperties.sendersBySignal[signal];
                for (var slot in sendersBySlot) {
                    var senders = sendersBySlot[slot];
                    for (var i = 0; i < senders.length; i++) {
                        var sender = senders[i];
                        result.push({
                            sender: sender,
                            signal: signal,
                            slot: slot
                        });
                    }
                }
            }
            return result;
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

            // register receiver in sender obj
            this.addReceiver(sender, signal, receiver, slot, handler);

            // register sender in receiver obj
            this.addSender(sender, signal, receiver, slot, handler);

        },

        unSubscribe: function (sender, signal, receiver, slot) {

            // deregister receiver in sender obj
            this.removeReceiver(sender, signal, receiver, slot);

            // deregister sender in receiver obj
            this.removeSender(sender, signal, receiver, slot);

        },

        raiseEvent: function (sender, signal, message, processedObjectsBySlot) {

            var event = new module.Event({
                sender: sender,
                signal: signal,
                message: message,
                processedObjectsBySlot: processedObjectsBySlot
            });

            var receivers = this.getReceivers(sender, signal);
            for (var i = 0; i < receivers.length; i++) {
                var receiverData = receivers[i];
                if (event.isProcessedObj(receiverData.receiver, receiverData.slot)) {
                    continue;
                }
                event.addProcessedObject(receiverData.receiver, receiverData.slot);
                receiverData.handler.apply(receiverData.receiver, [event, receiverData.slot]);
            }

        },

        deleteObject: function (obj) {
            var receivers = this.getAllReceivers(obj);
            for (var i = 0; i < receivers.length; i++) {
                var receiverData = receivers[i];
                this.unSubscribe(obj, receiverData.signal, receiverData.receiver, receiverData.slot);
            }
            var senders = this.getAllSenders(obj);
            for (var j = 0; j < senders.length; j++) {
                var senderData = senders[j];
                this.unSubscribe(senderData.sender, senderData.signal, obj, senderData.slot);
            }
        },

        methodCallHandler: function (event, slot) {
            var method = this[slot];
            method.apply(this, [event, slot]);
        }

    });

    // =======================================================================
    // method eventing
    // =======================================================================

    extend(module, {

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
                if (!method || message === module.noMethodCall) {
                    module.raiseMethodEvent(this, slot, event.message, event.processedObjectsBySlot);
                    return;
                }

                if (method.__isDecorator__) {
                    method.processedObjectsBySlot = event.processedObjectsBySlot;
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

                var processedObjectsBySlot;
                if (decorator.processedObjectsBySlot) {
                    processedObjectsBySlot = decorator.processedObjectsBySlot;
                    decorator.processedObjectsBySlot = null;
                } else {
                    processedObjectsBySlot = null;
                }

                var result = method.apply(this, arguments);

                if (arguments.length !== 0) {
                    module.raiseMethodEvent(this, methodName, arguments, processedObjectsBySlot);
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
        },

        raiseMethodEvent: function (sender, signal, message, processedObjectsBySlot) {
            if (!processedObjectsBySlot) {
                var event = new module.Event({});
                event.addProcessedObject(sender, signal);
                processedObjectsBySlot = event.processedObjectsBySlot;
            }
            module.raiseEvent(sender, signal, message, processedObjectsBySlot);
        }

    });

    return module;
});