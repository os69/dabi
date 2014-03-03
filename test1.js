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

        eventing.deleteObject(o1);
        eventing.deleteObject(o2);
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
    //  main
    // =========================================================================

    // testEvents();
    //   testClasses();
    testMethods();

});