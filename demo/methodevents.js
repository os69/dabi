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
        }

    };

    // =======================================================================
    // receiver
    // =======================================================================
    var receiver = {

        handler: function (event) {
            console.log('handler1: received event', event.message.args[0]);
        },

    };

    // =======================================================================
    // subscribe to method call
    // =======================================================================
    eventing.subscribeToMethodCall(sender,'setValue',receiver,'handler');
    sender.setValue(10);
    

});