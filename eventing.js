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
            if (!data.processedObjects) {
                // new obj
                this.processedObjects = [];
            } else {
                // copy
                this.processedObjects = [];
                for (var i = 0; i < data.processedObjects.length; i++) {
                    var processedObject = data.processedObjects[i];
                    this.processedObjects.push({
                        receiver: processedObject.receiver,
                        handler: processedObject.handler
                    });
                }
            }
        },

        getHandlerName : function(handler){
            if(handler.name)
                return handler.name;
            else
                return handler;
        },
        
        addProcessedObject: function (receiver, handler) {
            if (this.isProcessedObject(receiver, handler)) return;
            this.processedObjects.push({
                receiver: receiver,
                handler: this.getHandlerName(handler)
            });
        },

        isProcessedObject: function (receiver, handler) {
            var handlerName = this.getHandlerName(handler);
            for (var i = 0; i < this.processedObjects.length; i++) {
                var processedObject = this.processedObjects[i];
                if (processedObject.receiver === receiver && processedObject.handler === handlerName) return true;
            }
            return false;
        }
    };

    // =======================================================================
    // eventing
    // =======================================================================
    var EVENT_PROPERTY = '__eventing__';

    extend(module, {

        defaultSender: {},
        defaultReceiver: {},

        getEventProperties: function (obj) {
            var eventProperties = obj[EVENT_PROPERTY];
            if (!eventProperties) {
                eventProperties = {
                    receivers: {},
                    senders: {},
                    decorators: {},
                    handlers: {}
                };
                obj[EVENT_PROPERTY] = eventProperties;
            }
            return eventProperties;
        },

        addReceiver: function (sender, signal, receiver, handler) {
            var eventProperties = this.getEventProperties(sender);
            var receivers = eventProperties.receivers[signal];
            if (!receivers) {
                receivers = [];
                eventProperties.receivers[signal] = receivers;
            }
            for (var i = 0; i < receivers.length; i++) {
                var receiverData = receivers[i];
                if (receiverData.receiver === receiver && receiverData.handler === handler) return;
            }
            receivers.push({
                receiver: receiver,
                handler: handler
            });
        },

        removeReceiver: function (sender, signal, receiver, handler) {
            var eventProperties = this.getEventProperties(sender);
            var receivers = eventProperties.receivers[signal];
            if (!receivers) return;
            for (var i = 0; i < receivers.length; i++) {
                var receiverData = receivers[i];
                if (receiverData.receiver === receiver && receiverData.handler === handler) {
                    receivers.splice(i, 1);
                    return;
                }
            }
        },

        getReceivers: function (sender, signal) {
            var result = [];
            var eventProperties = this.getEventProperties(sender);
            var receivers = eventProperties.receivers[signal];
            if (!receivers) return result;
            for (var i = 0; i < receivers.length; i++) {
                var receiverData = receivers[i];
                result.push({
                    receiver: receiverData.receiver,
                    handler: receiverData.handler
                });
            }
            return result;
        },

        getAllReceivers: function (sender) {
            var result = [];
            var eventProperties = this.getEventProperties(sender);
            for (var signal in eventProperties.receivers) {
                var receivers = eventProperties.receivers[signal];
                for (var i = 0; i < receivers.length; i++) {
                    var receiverData = receivers[i];
                    result.push({
                        signal: signal,
                        receiver: receiverData.receiver,
                        handler: receiverData.handler
                    });
                }
            }
            return result;
        },

        addSender: function (sender, signal, receiver, handler) {
            var eventProperties = this.getEventProperties(receiver);
            var senders = eventProperties.senders[signal];
            if (!senders) {
                senders = [];
                eventProperties.senders[signal] = senders;
            }
            for (var i = 0; i < senders.length; i++) {
                var senderData = senders[i];
                if (senderData.sender === sender && senderData.handler === handler) return;
            }
            senders.push({
                sender: sender,
                handler: handler
            });
        },

        removeSender: function (sender, signal, receiver, handler) {
            var eventProperties = this.getEventProperties(receiver);
            var senders = eventProperties.senders[signal];
            if (!senders) return;
            for (var i = 0; i < senders.length; i++) {
                var senderData = senders[i];
                if (senderData.sender === sender && senderData.handler === handler) {
                    senders.splice(i, 1);
                    return;
                }
            }
        },

        getAllSenders: function (receiver) {
            var result = [];
            var eventProperties = this.getEventProperties(receiver);
            for (var signal in eventProperties.senders) {
                var senders = eventProperties.senders[signal];
                for (var i = 0; i < senders.length; i++) {
                    var senderData = senders[i];
                    result.push({
                        sender: senderData.sender,
                        signal: signal,
                        handler: senderData.handler
                    });
                }
            }
            return result;
        },

        subscribe: function (sender, signal, receiver, handler) {

            // set defaults
            sender = sender || module.defaultSender;
            receiver = receiver || module.defaultReceiver;

            // register receiver in sender obj
            this.addReceiver(sender, signal, receiver, handler);

            // register sender in receiver obj
            this.addSender(sender, signal, receiver, handler);

        },

        unSubscribe: function (sender, signal, receiver, handler) {

            // deregister receiver in sender obj
            this.removeReceiver(sender, signal, receiver, handler);

            // deregister sender in receiver obj
            this.removeSender(sender, signal, receiver, handler);

        },

        raiseEvent: function (sender, signal, message, processedObjects) {

            var event = new module.Event({
                sender: sender,
                signal: signal,
                message: message,
                processedObjects: processedObjects
            });

            var receivers = this.getReceivers(sender, signal);
            for (var i = 0; i < receivers.length; i++) {
                var receiverData = receivers[i];
                if (event.isProcessedObject(receiverData.receiver, receiverData.handler)) continue;
                event.addProcessedObject(receiverData.receiver, receiverData.handler);
                var handler = receiverData.handler;
                if (typeof (handler) === 'string') handler = receiverData.receiver[handler];
                handler.apply(receiverData.receiver, [event]);
            }

        },

        deleteObject: function (obj) {
            var receivers = this.getAllReceivers(obj);
            for (var i = 0; i < receivers.length; i++) {
                var receiverData = receivers[i];
                this.unSubscribe(obj, receiverData.signal, receiverData.receiver, receiverData.handler);
            }
            var senders = this.getAllSenders(obj);
            for (var j = 0; j < senders.length; j++) {
                var senderData = senders[j];
                this.unSubscribe(senderData.sender, senderData.signal, obj, senderData.handler);
            }
        }

    });

    // =======================================================================
    // method eventing
    // =======================================================================

    extend(module, {

        noMethodCall: {
            label: 'no method call'
        },

        wrapHandler: function (handler, transformation) {

            var wrappedHandler = function (event) {
                
                var eventProperties = module.getEventProperties(this);
                var decorator = eventProperties.decorators['event_' + handler];

                var message = event.message;

                if (transformation) {
                    var transformationParams = [];
                    transformationParams.push.apply(transformationParams, event.message);
                    transformationParams.push(event.sender, this);
                    message = transformation.apply(null, transformationParams);
                }

                var method = this[handler];
                if (!method || message === module.noMethodCall) {
                    module.raiseMethodEvent(this, handler, event.message, event.processedObjects);
                    return;
                }

                if (decorator) {
                    decorator.processedObjects = event.processedObjects;
                }
                method.apply(this, message);
            };
            wrappedHandler.name = handler;
            return wrappedHandler;
        },

        decorate: function (obj, methodName) {

            // check whether method exists
            var method = obj[methodName];
            if (!method) {
                return;
            }

            // check whether method already has been decorated
            var eventProperties = module.getEventProperties(obj);
            if (eventProperties.decorators['event_' + methodName]) return;

            // decorator function
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

            // decorate
            decorator.originalMethod = method;
            obj[methodName] = decorator;
            eventProperties.decorators['event_' + methodName] = decorator;
        },

        connect: function (sender, signal, receiver, handler, trans1, trans2) {
            if (arguments.length <= 4) {
                this.connectSingle(sender, signal, receiver, handler);
                this.connectSingle(receiver, handler, sender, signal);
            } else {
                if (trans1) {
                    if (trans1 instanceof Function) {
                        this.connectSingle(sender, signal, receiver, handler, trans1);
                    } else {
                        this.connectSingle(sender, signal, receiver, handler);
                    }

                }
                if (trans2) {
                    if (trans2 instanceof Function) {
                        this.connectSingle(receiver, handler, sender, signal, trans2);
                    } else {
                        this.connectSingle(receiver, handler, sender, signal);
                    }
                }
            }
        },

        connectSingle: function (sender, signal, receiver, handler, transformation) {
            this.decorate(sender, signal);
            this.decorate(receiver, handler);
            var wrappedHandler = this.wrapHandler(handler, transformation);
            module.subscribe(sender, signal, receiver, wrappedHandler);
        },

        raiseMethodEvent: function (sender, signal, message, processedObjects) {
            if (!processedObjects) {
                var event = new module.Event({});
                event.addProcessedObject(sender, signal);
                processedObjects = event.processedObjects;
            }
            module.raiseEvent(sender, signal, message, processedObjects);
        }

    });

    return module;
});