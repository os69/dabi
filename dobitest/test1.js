/* global window*/
/* global require*/

require(["eventing"], function (eventing) {
    "use strict";

    var console = window.console;

    // =========================================================================
    //  test events
    // =========================================================================
    var testEvents = function () {

        var o1 = {};
        var o2 = {
            test: function (event, slot) {
                console.log(event, slot);
            },
            test2: function (event, slot) {
                console.log(event, slot);
            }
        };

        eventing.subscribe(o1, "o1_signal", o2, function (event, slot) {
            console.log(event, slot);
        });
        eventing.subscribe(o2, "o2_signal", o1, function (event, slot) {
            console.log(event, slot);
        });

        eventing.subscribe(o1, "o1_signal", o2, "test");
        eventing.subscribe(o1, "o1_signal", o2, "test");
        eventing.subscribe(o1, "o1_signal", o2, o2.test2);

        eventing.raiseEvent(o1, "o1_signal", "Hallo O2!");
        eventing.raiseEvent(o2, "o2_signal", "Hallo O1!");

        eventing.deleteSubscriptions(o1);
        eventing.deleteSubscriptions(o2);
    };

    // =========================================================================
    //  test classes
    // =========================================================================
    var testClasses = function () {

        // viewer
        var Viewer = function (name, model) {
            this.init.apply(this, arguments);
        };
        Viewer.prototype = {

            init: function (name, model) {
                this.name = name;
                this.model = model;
                this.counter = 0;
                eventing.subscribe(model, "setCounter", this, "handleSetCounter");
            },

            setCounter: function (counter) {
                this.counter = counter;
                console.log("viewer-" + this.name + "-set-counter", this.counter);
                this.model.setCounter(this.counter);
            },

            handleSetCounter: function (event) {
                if (this.counter !== event.message) {
                    this.setCounter(event.message);
                }
            }

        };

        // model
        var Model = function () {
            this.init.apply(this, arguments);
        };
        Model.prototype = {

            init: function () {
                this.counter = 0;
            },

            setCounter: function (counter) {
                if (this.counter === counter) {
                    return;
                }
                this.counter = counter;
                console.log("model-set-counter", counter);
                eventing.raiseEvent(this, "setCounter", counter);
            }
        };


        var model = new Model();
        var viewer1 = new Viewer("1", model);
        var viewer2 = new Viewer("2", model);

        model.setCounter(13);
        viewer1.setCounter(14);

    };

    // =========================================================================
    //  test methods
    // =========================================================================
    var testMethods = function () {

        // viewer
        var Viewer = function (name, model) {
            this.init.apply(this, arguments);
        };
        Viewer.prototype = {

            init: function (name, model) {
                this.name = name;
            },

            setCounter: function (counter) {
                this.counter = counter;
                console.log("viewer-" + this.name + "-set-counter", this.counter);
            },

            handleSetCounter: function (event) {
                this.setCounter(event.message);
            }

        };

        // model
        var Model = function () {
            this.init.apply(this, arguments);
        };
        Model.prototype = {

            init: function () {
                this.name = 'model';
                this.counter = 0;
            },

            setCounter: function (counter) {
                this.counter = counter;
                console.log("model-set-counter", counter);
            }
        };


        var model = new Model();
        var viewer1 = new Viewer("1", model);
        var viewer2 = new Viewer("2", model);

        eventing.connect(model, "setCounter", viewer1, "setCounter");
        eventing.connect(model, "setCounter", viewer2, "setCounter");


        viewer1.setCounter(13);
        viewer2.setCounter(14);

    };

    // =========================================================================
    //  test methods
    // =========================================================================
    var testWeak = function () {

        // o1 -> o2 -> o3
        //          -> o4

        var o1 = {};
        var o2 = {};
        var o3 = {};
        var o4 = {};

        eventing.subscribe(o1, 'sig1', o2, function (e) {
            console.log('o2 received event:', e.message);
            eventing.raiseEvent(o2, 'sig1', 'forward:' + e.message);
        });

        eventing.subscribe(o2, 'sig1', o3, function (e) {
            console.log('o3 received event:', e.message);
        });

        eventing.subscribe(o2, 'sig1', o4, function (e) {
            console.log('o4 received event:', e.message);
        });

        eventing.makeWeak(o2);

        eventing.raiseEvent(o1, 'sig1', 'Hi!');
        eventing.deleteSubscriptions(o3);
        eventing.deleteSubscriptions(o4);
        eventing.raiseEvent(o1, 'sig1', 'Hi!');
    };

    // =========================================================================
    //  main
    // =========================================================================

    console.log("--events");
    testEvents();
    console.log("--classes");
    testClasses();
    console.log("--methods");
    testMethods();
    console.log("--weak");
    testWeak();

});