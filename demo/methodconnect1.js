/*global define */
/*global console*/
/*global require */
/*global requirejs */

requirejs.config({
    baseUrl: '..',
});


require(['dobi/eventing'], function (eventingModule) {
    "use strict";

    // =======================================================================
    // viewer1 (with input field for value)
    // =======================================================================
    var viewer1 = {

        setValue: function (value) {
            this.value = value;
            console.log('viewer1 set:',value);
        }

    };

    // =======================================================================
    // viewer2 (with input field for value)
    // =======================================================================
    var viewer2 = {

        setValue: function (value) {
            this.value = value;
            console.log('viewer2 set:',value);
        }

    };

    // =======================================================================
    // model
    // =======================================================================
    var model = {

        setValue: function (value) {
            this.value = value;
            console.log('model set:',value);
        }

    };
    
    eventingModule.connect(viewer1,'setValue',model,'setValue');
    eventingModule.connect(viewer2,'setValue',model,'setValue');

    model.setValue(10);
    viewer1.setValue(20);
    
});