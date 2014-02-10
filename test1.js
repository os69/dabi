require(["map", "eventing"], function (map, eventing) {
    "use strict";

    var $ = window.$;
    var console = window.console;

    var methodEventing = eventing.methodEventing;
    var binding = eventing.binding;

    // =========================================================================
    //  test map
    // =========================================================================
    var testMap = function () {
        var t = new map.Map();
        t.put(["1", "10", {
            a: "100"
        }], "Hallo1");
        t.put(["1", "10", {
            a: "101"
        }], "Hallo2");
        t.put(["1", "20", {
            a: "200"
        }], "Hallo3");
        t.put(["1", "20", {
            a: "201"
        }], "Hallo4");
        var r = t.get(["1"]);
        t.del(["1", "10"]);
        t.del(["1", "20"]);
        r = t.get(["1"]);
    };


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

        eventing.subscribe(o1, "o1_signal", o2, "o2_slot", function (event, slot) {
            console.log(event, slot);
        });
        eventing.subscribe(o2, "o2_signal", o1, "o1_slot", function (event, slot) {
            console.log(event, slot);
        });

        eventing.subscribe(o1, "o1_signal", o2, "test");
        eventing.subscribe(o1, "o1_signal", o2, o2.test2);

        eventing.raiseEvent(o1, "o1_signal", "Hallo O2!");
        eventing.raiseEvent(o2, "o2_signal", "Hallo O1!");

        eventing.deleteObject(o1);
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

        methodEventing.connect(model, "setCounter", viewer1, "setCounter");
        methodEventing.connect(model, "setCounter", viewer2, "setCounter");


        viewer1.setCounter(13);
        viewer2.setCounter(14);

    };

    // =========================================================================
    //  test binding 1
    // =========================================================================
    var testBinding1 = function () {

        var obj1 = {
            text: 'Hallo',
            setText: function (text) {
                this.text = text;
                console.log("obj1->setText", text);
            }
        };

        var obj2 = {
            text: 'Hallo',
            setText: function (text) {
                this.text = text;
                console.log("obj2->setText", text);
            }
        };

        binding.bind(obj1, "text", obj2, "text");

        obj1.setText("Hallo1");
        obj2.setText("Hallo2");
    };

    // =========================================================================
    //  test binding 2
    // =========================================================================
    var testBinding2 = function () {

        var v1 = $("#v1");
        var v2 = $("#v2");

        binding.configure([v1, v2], {
            name: 'text',
            setter: 'val',
            getter: 'val',
            event: 'change'
        });

        binding.bind(v1, 'text', v2, 'text');

        v1.val('Kuckuck!');
    };

    // =========================================================================
    //  test binding 3
    // =========================================================================
    var testBinding3 = function () {

        var Item = function () {
            this.init.apply(this, arguments);
        };

        Item.prototype = {

            init: function (text) {
                this.text = text;
            },

            setText: function (text) {
                this.text = text;
            }

        };


        var model = {

            items: [],

            setItems: function (items) {
                this.items = items;
            }

        };

        var listTransformation = function (transItem, startResultList, appendFunction) {
            return function (list) {
                var resultList = startResultList;
                $.each(list, function (index, item) {
                    var resultItem = transItem(item);
                    resultList = appendFunction(resultList, resultItem);
                });
                return [resultList];
            };
        };

        var v1 = $("<ul></ul>");
        $("body").append(v1);
        var v2 = $("<ul></ul>");
        $("body").append(v2);

        binding.configure([v1, v2], {
            name: 'items',
            setter: 'html'
        });

        var transItem = function (item) {
            var inputNode = $("<input type='text'>");
            inputNode.val(item.text);
            binding.configure(inputNode, {
                name: 'text',
                setter: 'val',
                getter: 'val',
                event: 'change'
            });
            binding.bind(inputNode, 'text', item, 'text');
            return inputNode;
        };

        var transList = listTransformation(transItem, $(""), function (list, item) {
            return list.add($("<li></li>").append(item));
        });

        binding.bind(v1, "items", model, "items", null, transList);
        binding.bind(v2, "items", model, "items", null, transList);

        model.setItems([new Item('Apfel'), new Item('Birne')]);

        methodEventing.connect(v1, "val", model, "setText", {
            trans1: null,
            trans2: null,
            //            senderEvent : "change",
            //            senderGetter : "val"
        });

        v1.change(function () {
            //eventing.raiseEvent(v1, "val", v1.val(), pr);
        });

    };

    // =========================================================================
    //  test ui 1
    // =========================================================================
    var testUI1 = function () {

        var v1 = $("#v1");
        var v2 = $("#v2");

        var model = {
            text: 'test',
            setText: function (text) {
                this.text = text;
                console.log("model set text ->", text);
            }
        };


        $.each([v1, v2], function (i, o) {
            o.change(function () {
                methodEventing.raiseEvent(o, "val", [o.val()]);
            });
        });

        methodEventing.connect(v1, "val", model, "setText");
        methodEventing.connect(v2, "val", model, "setText");

        model.setText("Hallo");
        v1.val("Hallo2");

    };

    // =========================================================================
    //  test ui 2
    // =========================================================================
    var testUI2 = function () {

        var v1 = $("<ul></ul>");
        $("body").append(v1);

        var v2 = $("<ul></ul>");
        $("body").append(v2);

        var model = [];

        var genListTrans = function (transItem, appendFunction) {
            return function (list) {
                var transformedList = null;
                $.each(list, function (i, item) {
                    var transformedItem = transItem(item)[0];
                    transformedList = appendFunction(transformedList, transformedItem, item);
                });
                methodEventing.connect(list, "push", transformedList.children(), "append", transItem);
                return [transformedList];
            };
        };
        var transItemList2 = genListTrans(transItem, function (transformedList, transformedItem, item) {
            transformedList = transformedList || $("<li><ul></ul></li>");
            var ul = transformedList.children();
            ul.append(transformedItem);
            return transformedList;
        });

        var transItem = function (item) {
            return [$('<li>' + item + '</li>')];
        };

        var transItemList = function (itemList) {
            var transformedItemList = $("<ul></ul>");
            $.each(itemList, function (i, item) {
                transformedItemList.append(transItem(item)[0]);
            });
            methodEventing.connect(itemList, "push", transformedItemList, "append", transItem);
            return [$('<li></li>').append(transformedItemList)];
        };

        methodEventing.connect(model, "push", v1, "append", transItemList);
        methodEventing.connect(model, "push", v2, "append", transItemList);

        var l1 = ["Apfel", "Birne"];
        var l2 = ["Erbse", "Tomate"];
        model.push(l1);
        model.push(l2);
        l1.push("Kirsche");
    };


    // =========================================================================
    //  main
    // =========================================================================

    // testMap();
    //testEvents();
    //testClasses();
    //testMethods();    
    testUI2();
    //testBinding3();
});