/*global define */
/*global console*/

requirejs.config({
    baseUrl: '..',
});


require(['lib/eventing'], function (eventing) {
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
    
    eventing.connect(viewer1,'setValue',model,'setValue');
    eventing.connect(viewer2,'setValue',model,'setValue');

    model.setValue(10);
    viewer1.setValue(20);
    
});