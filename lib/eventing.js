/*global window */
/*global console*/

(function () {

    var define = window.define || function (deps, mod) {
        window.dobiRoot = window.dobiRoot || {};
        window.dobiRoot.eventing = mod();
    };

    define([], function () {
        "use strict";

        var module = {};

        window.eventing = module; // TODO: remove

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
        // Processed Objects
        // =======================================================================
        module.ProcessedObjects = function () {
            this.init.apply(this, arguments);
        };

        module.ProcessedObjects.prototype = {

            init: function (processedObjects) {
                this.processedObjects = [];
                if (processedObjects) {
                    for (var i = 0; i < processedObjects.length; i++) {
                        var processedObject = processedObjects[i];
                        this.processedObjects.push({
                            receiver: processedObject.receiver,
                            handlerName: processedObject.handlerName
                        });
                    }
                }
            },

            addProcessedObject: function (receiver, methodName) {
                if (this.isProcessedObject(receiver, methodName)) return;
                this.processedObjects.push({
                    receiver: receiver,
                    handlerName: methodName
                });
            },

            isProcessedObject: function (receiver, methodName) {
                for (var i = 0; i < this.processedObjects.length; i++) {
                    var processedObject = this.processedObjects[i];
                    if (processedObject.receiver === receiver && processedObject.handlerName === methodName) return true;
                }
                return false;
            }

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
            }

        };

        // =======================================================================
        // EventProperties
        // =======================================================================
        module.EventProperties = function () {
            this.init.apply(this, arguments);
        };

        module.EventProperties.prototype = {

            init: function (obj) {
                this.obj = obj;
                this.receivers = {};
                this.senders = {};
                this.decorators = {};
                this.autoDelete = false;
            },

            setAutoDelete: function (receiverLimit) {
                this.autoDelete = {
                    receiverLimit: receiverLimit
                };
            },

            addReceiver: function (signal, receiver, handler) {
                var receivers = this.receivers[signal];
                if (!receivers) {
                    receivers = [];
                    this.receivers[signal] = receivers;
                }
                for (var i = 0; i < receivers.length; i++) {
                    var receiverData = receivers[i];
                    if (receiverData.receiver === receiver && receiverData.handler === handler) return false;
                }
                receivers.push({
                    receiver: receiver,
                    handler: handler
                });
                return true;
            },

            removeReceiver: function (signal, receiver, handler) {
                var receivers = this.receivers[signal];
                if (!receivers) return;
                for (var i = 0; i < receivers.length; i++) {
                    var receiverData = receivers[i];
                    if (receiverData.receiver === receiver && receiverData.handler === handler) {
                        receivers.splice(i, 1);
                        return true;
                    }
                }
                return false;
            },

            getReceivers: function (signal) {
                var result = [];
                var receivers = this.receivers[signal];
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

            getNumberReceivers: function (signal) {
                var receivers = this.receivers[signal];
                if (!receivers) return 0;
                return receivers.length;
            },

            isReceiver: function (signal, receiver, handler) {
                var receivers = this.receivers[signal];
                if (!receivers) return false;
                for (var i = 0; i < receivers.length; i++) {
                    var receiverData = receivers[i];
                    if (receiverData.receiver === receiver && receiverData.handler === handler) return true;
                }
                return false;
            },

            getAllReceivers: function () {
                var result = [];
                for (var signal in this.receivers) {
                    var receivers = this.receivers[signal];
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

            getNumberAllReceivers: function () {
                var number = 0;
                for (var signal in this.receivers) {
                    var receivers = this.receivers[signal];
                    number += receivers.length;
                }
                return number;
            },

            addSender: function (sender, signal, handler) {
                var senders = this.senders[signal];
                if (!senders) {
                    senders = [];
                    this.senders[signal] = senders;
                }
                for (var i = 0; i < senders.length; i++) {
                    var senderData = senders[i];
                    if (senderData.sender === sender && senderData.handler === handler) return false;
                }
                senders.push({
                    sender: sender,
                    handler: handler
                });
                return true;
            },

            removeSender: function (sender, signal, handler) {
                var senders = this.senders[signal];
                if (!senders) return;
                for (var i = 0; i < senders.length; i++) {
                    var senderData = senders[i];
                    if (senderData.sender === sender && senderData.handler === handler) {
                        senders.splice(i, 1);
                        return true;
                    }
                }
                return false;
            },

            getAllSenders: function () {
                var result = [];
                for (var signal in this.senders) {
                    var senders = this.senders[signal];
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
            }

        };

        // =======================================================================
        // eventing (public eventing interface)
        // =======================================================================
        var EVENT_PROPERTY = '__eventing__';

        extend(module, {

            defaultSender: {},
            defaultReceiver: {},

            getEventProperties: function (obj) {
                var eventProperties = obj[EVENT_PROPERTY];
                if (!eventProperties) {
                    eventProperties = new module.EventProperties(obj);
                    obj[EVENT_PROPERTY] = eventProperties;
                }
                return eventProperties;
            },

            setAutoDelete: function (obj, receiverLimit) {
                this.getEventProperties(obj).setAutoDelete(receiverLimit);
            },

            scounter: 0,

            subscribe: function (sender, signal, receiver, handler) {

                // set defaults
                sender = sender || module.defaultSender;
                receiver = receiver || module.defaultReceiver;

                // register receiver in sender obj
                var r1 = this.getEventProperties(sender).addReceiver(signal, receiver, handler);

                // register sender in receiver obj
                var r2 = this.getEventProperties(receiver).addSender(sender, signal, handler);

                // statistic
                if (r1 !== r2) throw 'Inconsistency';
                if (r1 && r2) {
                    this.scounter++;
                    //console.log('sc',this.scounter);
                }

            },

            unSubscribe: function (sender, signal, receiver, handler) {

                // deregister receiver in sender obj
                var r1 = this.getEventProperties(sender).removeReceiver(signal, receiver, handler);

                // deregister sender in receiver obj
                var r2 = this.getEventProperties(receiver).removeSender(sender, signal, handler);

                // statistic
                if (r1 !== r2) throw 'Inconsicenty';
                if (r1 && r2) {
                    this.scounter--;
                    //console.log('sc:' + this.scounter);
                }

                // check autounsubscribe
                var autoDelete = this.getEventProperties(sender).autoDelete;
                if (autoDelete && this.getEventProperties(sender).getNumberAllReceivers() <= autoDelete.receiverLimit)
                    this.deleteSubscriptions(sender);

                // notify about unsubscribe
                if (sender.afterUnSubscribe)
                    sender.afterUnSubscribe(sender, signal, receiver, handler);

                // notifiy unsubscribe listeners
                for (var i = 0; i < this.unSubscribeListeners.length; ++i) {
                    var listener = this.unSubscribeListeners[i];
                    listener(sender, signal, receiver, handler);
                }

            },

            unSubscribeListeners: [],

            addUnSubscribeListener: function (listener) {
                this.unSubscribeListeners.push(listener);
            },

            removeUnSubscribeListener: function (listener) {
                var index = this.unSubscribeListeners.indexOf(listener);
                if (index >= 0)
                    this.unSubscribeListeners.splice(index, 1);
            },

            raiseEvent: function (sender, signal, message) {

                sender = sender || module.defaultSender;

                var event = new module.Event({
                    sender: sender,
                    signal: signal,
                    message: message
                });

                var unSubscribed = [];
                var unSubscribeListener = function (sender, signal, receiver, handler) {
                    if (sender === event.sender && signal === event.signal)
                        unSubscribed.push({
                            receiver: receiver,
                            handler: handler
                        });
                };
                this.addUnSubscribeListener(unSubscribeListener);

                var receivers = this.getEventProperties(sender).getReceivers(signal);
                for (var i = 0; i < receivers.length; i++) {
                    var receiverData = receivers[i];

                    var removed = false;
                    for (var j = 0; j < unSubscribed.length; ++j) {
                        var unSubscribedReceiver = unSubscribed[j];
                        if (unSubscribedReceiver.receiver === receiverData.receiver && unSubscribedReceiver.handler === receiverData.handler) removed = true;
                    }
                    if (removed) continue;

                    var handler = receiverData.handler;
                    if (typeof (handler) === 'string') handler = receiverData.receiver[handler];
                    try {
                        handler.apply(receiverData.receiver, [event]);
                    } catch (e) {
                        this.removeUnSubscribeListener(unSubscribeListener);
                        throw e;
                    }
                }

                this.removeUnSubscribeListener(unSubscribeListener);

            },

            deleteSubscriptions: function (obj) {
                if (!obj[EVENT_PROPERTY]) return;
                var receivers = this.getEventProperties(obj).getAllReceivers();
                for (var i = 0; i < receivers.length; i++) {
                    var receiverData = receivers[i];
                    this.unSubscribe(obj, receiverData.signal, receiverData.receiver, receiverData.handler);
                }
                var senders = this.getEventProperties(obj).getAllSenders();
                for (var j = 0; j < senders.length; j++) {
                    var senderData = senders[j];
                    this.unSubscribe(senderData.sender, senderData.signal, obj, senderData.handler);
                }
                if (obj.afterDeleteSubscriptions) obj.afterDeleteSubscriptions();
            }

        });

        // =======================================================================
        // method eventing (public methid eventing interface)
        // =======================================================================
        extend(module, {

            noMethodCall: {
                label: 'no method call'
            },

            generateHandler: function (receiverMethodName, transformation) {
                return function (event) {

                    // check whether object has been processed?
                    if (event.message.processedObjects.isProcessedObject(this, receiverMethodName)) return;
                    event.message.processedObjects.addProcessedObject(this, receiverMethodName);

                    // transform incomming method arguments
                    var args = event.message.args;
                    if (transformation) {
                        var transformationParams = [];
                        transformationParams.push.apply(transformationParams, event.message.args);
                        transformationParams.push(event.sender, this);
                        args = transformation.apply(null, transformationParams);
                    }

                    // do we need to call the method?
                    var method = this[receiverMethodName];
                    if (!method || args === module.noMethodCall) {
                        if (args === module.noMethodCall) args = event.message.args;
                        module.raiseEvent(this, receiverMethodName, {
                            args: args,
                            processedObjects: event.message.processedObjects
                        });
                        return;
                    }

                    // pass processed objects to decorator
                    var eventProperties = module.getEventProperties(this);
                    var decorator = eventProperties.decorators['event_' + receiverMethodName];
                    if (decorator) {
                        decorator.processedObjects = event.message.processedObjects;
                    }

                    // call method
                    method.apply(this, args);
                };
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
                        processedObjects = new module.ProcessedObjects();
                        processedObjects.addProcessedObject(this, methodName);
                    }

                    var result = method.apply(this, arguments);

                    if (arguments.length !== 0) {
                        module.raiseEvent(this, methodName, {
                            args: arguments,
                            processedObjects: processedObjects
                        });
                    }

                    return result;
                };

                // decorate
                decorator.originalMethod = method;
                obj[methodName] = decorator;
                eventProperties.decorators['event_' + methodName] = decorator;
            },

            connect: function (sender, senderMethodName, receiver, receiverMethodName, trans1, trans2) {
                if (arguments.length <= 4) {
                    this.connectSingle(sender, senderMethodName, receiver, receiverMethodName);
                    this.connectSingle(receiver, receiverMethodName, sender, senderMethodName);
                } else {
                    if (trans1) {
                        if (trans1 instanceof Function) {
                            this.connectSingle(sender, senderMethodName, receiver, receiverMethodName, trans1);
                        } else {
                            this.connectSingle(sender, senderMethodName, receiver, receiverMethodName);
                        }

                    }
                    if (trans2) {
                        if (trans2 instanceof Function) {
                            this.connectSingle(receiver, receiverMethodName, sender, senderMethodName, trans2);
                        } else {
                            this.connectSingle(receiver, receiverMethodName, sender, senderMethodName);
                        }
                    }
                }
            },

            connectSingle: function (sender, senderMethodName, receiver, receiverMethodName, transformation) {
                this.decorate(sender, senderMethodName);
                //this.decorate(receiver, receiverMethodName);
                module.subscribe(sender, senderMethodName, receiver, this.generateHandler(receiverMethodName, transformation));
            },

            subscribeToMethodCall: function (sender, senderMethodName, receiver, handler) {
                this.decorate(sender, senderMethodName);
                module.subscribe(sender, senderMethodName, receiver, handler);
            },

            unSubscribeToMethodCall: function (sender, senderMethodName, receiver, handler) {
                module.unSubscribe(sender, senderMethodName, receiver, handler);
            },

            raiseMethodEvent: function (sender, signal, args) {
                var processedObjects = new module.ProcessedObjects();
                processedObjects.addProcessedObject(sender, signal);
                module.raiseEvent(sender, signal, {
                    args: args,
                    processedObjects: processedObjects
                });
            }

        });

        return module;
    });

})();