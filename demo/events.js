/*global define */
/*global console*/

requirejs.config({
    baseUrl: '..',
});


require(['lib/eventing'], function (eventing) {
    "use strict";


    // =======================================================================
    // sender
    // =======================================================================
    var sender = {

        setValue: function (value) {
            this.value = value;
            eventing.raiseEvent(this, 'ValueChangedSignal', value);
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
    eventing.subscribe(sender, 'ValueChangedSignal', receiver, receiver.handler1);
    eventing.subscribe(sender, 'ValueChangedSignal', receiver, 'handler2');
    eventing.subscribe(sender, 'ValueChangedSignal', receiver, function(event){
        console.log('handler3: received event', event.message); // this=receiver
    });

    sender.setValue(10);
    
    // =======================================================================
    // unsubscribe
    // =======================================================================
    eventing.unSubscribe(sender, 'ValueChangedSignal', receiver, receiver.handler1);
    sender.setValue(20);
    
    // =======================================================================
    // delete object:   delete subscriptions 
    //                + delete subscriptions of other objects to signals of this object
    // =======================================================================
    eventing.deleteSubscriptions(receiver);
    sender.setValue(30);
    
    // =======================================================================
    // global events (event bus)
    // =======================================================================
    eventing.subscribe(null,'GlobalSignal',receiver,'handler1');
    eventing.raiseEvent(null,'GlobalSignal',40);
    
    
    







});