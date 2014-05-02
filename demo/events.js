/*global require */
/*global requirejs */
/*global define */
/*global console*/

requirejs.config({
    baseUrl: '..',
});


require(['dobi/eventing'], function (eventingModule) {
    "use strict";


    // =======================================================================
    // sender
    // =======================================================================
    var sender = {

        setValue: function (value) {
            this.value = value;
            eventingModule.raiseEvent(this, 'ValueChangedSignal', value);
        }

    };

    // =======================================================================
    // receiver
    // =======================================================================
    var receiver = {

        handler1: function (event) {
            console.log('handler1: received event', event.message);
        },

        handler2: function (event) {
            console.log('handler2: received event', event.message);
        }

    };

    // =======================================================================
    // subscription to events
    // =======================================================================
    eventingModule.subscribe(sender, 'ValueChangedSignal', receiver, receiver.handler1);
    eventingModule.subscribe(sender, 'ValueChangedSignal', receiver, 'handler2');
    eventingModule.subscribe(sender, 'ValueChangedSignal', receiver, function(event){
        console.log('handler3: received event', event.message); // this=receiver
    });

    sender.setValue(10);
    
    // =======================================================================
    // unsubscribe
    // =======================================================================
    eventingModule.unSubscribe(sender, 'ValueChangedSignal', receiver, receiver.handler1);
    sender.setValue(20);
    
    // =======================================================================
    // delete object:   delete subscriptions 
    //                + delete subscriptions of other objects to signals of this object
    // =======================================================================
    eventingModule.deleteSubscriptions(receiver);
    sender.setValue(30);
    
    // =======================================================================
    // global events (event bus)
    // =======================================================================
    eventingModule.subscribe(null,'GlobalSignal',receiver,'handler1');
    eventingModule.raiseEvent(null,'GlobalSignal',40);
    
});