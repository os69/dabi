require(["map", "eventing", "list"], function (map, eventing, list) {
    "use strict";

    var $ = window.$;
    var console = window.console;
    var document = window.document;

    var methodEventing = eventing.methodEventing;

    // =========================================================================
    //  animation
    // =========================================================================
    var fadeIn = function (element) {
        return;
        var listener = function (event) {
            if (event.animationName === 'fadeIn') {
                this.classList.remove('fadeIn');
                this.removeEventListener("animationend", listener, false);
            }
        };
        element.addEventListener("animationend", listener, false);
        element.classList.add('fadeIn');
    };

    var fadeOut = function (element) {
        element.parentNode.removeChild(element);
        return;
        var listener = function (event) {
            if (event.animationName === 'fadeOut') {
                this.classList.remove('fadeOut');
                this.removeEventListener("animationend", listener, false);
                this.parentNode.removeChild(this);
            }
        };
        element.addEventListener("animationend", listener, false);
        element.classList.add('fadeOut');
    };

    var testAnimation = function () {
        var div = document.createElement('div');
        document.body.appendChild(div);
        div.appendChild(document.createTextNode('Balduin'));
        div.addEventListener("animationend", function (event) {
            if (event.animationName === 'fadeIn') {
                fadeOut(div);
            }
        }, false);
        fadeIn(div);


    };

    // =========================================================================
    //  bind
    // =========================================================================

    var setterName = function (propertyName) {
        return 'set' + propertyName[0].toUpperCase() + propertyName.slice(1);
    };

    var generateSetter = function (obj, propertyName) {
        var setter = setterName(propertyName);
        if (obj[setter]) {
            return;
        }
        obj[setter] = function (value) {
            this[propertyName] = value;
        };
    };

    var bindListToDom = function (list, domList, trans) {

        methodEventing.connect(list, "push", domList, "appendChild", trans);

        methodEventing.connect(list, "splice", domList, "splice", function () {
            // parse arguments
            var index = arguments[0];
            var numberDel = arguments[1];
            var list = arguments[arguments.length - 2];
            var domList = arguments[arguments.length - 1];
            // delete
            var children = domList.children;
            for (i = 0; i < numberDel; ++i) {
                var element = children.item(index + i);
                fadeOut(element);
            }
            // insert
            var refElement = null;
            if (index > 0) {
                refElement = children.item(index - 1).nextSibling;
            } else {
                refElement = children.item(0);
            }
            for (var i = 2; i < arguments.length - 2; ++i) {
                var listElement = arguments[i];
                var transListElement = trans.apply(this, [listElement])[0];
                if (refElement) {
                    domList.insertBefore(transListElement, refElement);
                } else {
                    domList.appendChild(transListElement);
                }
                fadeIn(transListElement);
            }
            return methodEventing.noMethodCall;
        });

    };

    var bindTextToDom = function (obj, propertyName, inputField) {

        generateSetter(obj, propertyName);

        methodEventing.connect(obj, setterName(propertyName), inputField, "val", function (val) {
            inputField.value = val;
            return methodEventing.noMethodCall;
        }, true);

        inputField.addEventListener('change', function (event) {
            eventing.raiseMethodEvent(inputField, "val", [inputField.value]);
        });

    };


    // =========================================================================
    //  test ui 
    // =========================================================================
    var testUI1 = function () {

        // viewer
        var viewer = document.createElement('ul');
        document.body.appendChild(viewer);

        // model
        var model = [];

        // bind
        bindListToDom(model, viewer, function (element) {
            var li = document.createElement('li');
            li.appendChild(document.createTextNode(element));
            return [li];
        });

        model.push('Apfel');
        model.push('Banane');
        model.push('Orange');

        var button = document.createElement('button');
        document.body.appendChild(button);
        button.appendChild(document.createTextNode('Click'));
        button.addEventListener('click', function () {

            var newList = ["Esel", 'Apfel', 'Birne', 'Orange'];
            list.deltaSet(model, newList);

        }, false);


    };

    // =========================================================================
    //  test ui 2
    // =========================================================================
    var testUI2 = function () {

        // create order
        var transOrder = function (order) {

            // header
            var li = document.createElement('li');
            li.appendChild(document.createTextNode(order.label));

            // items
            var itemList = document.createElement('ul');
            li.appendChild(itemList);
            for (var i = 0; i < order.items.length; ++i) {
                var domItem = transItem(order.items[i], order.items, itemList)[0];
                itemList.appendChild(domItem);
            }
            bindListToDom(order.items, itemList, transItem);

            return [li];
        };

        // create item
        var transItem = function (item, items) {

            var self = this;

            var li = document.createElement('li');

            // input
            var input = document.createElement('input');
            input.setAttribute('type', 'text');
            input.value = item.label;
            li.appendChild(input);
            bindTextToDom(item, 'label', input);

            // del button
            var delButton = document.createElement('button');
            delButton.appendChild(document.createTextNode('Del'));
            delButton.addEventListener('click', function () {
                var index = items.indexOf(item);
                items.splice(index, 1);
            });
            li.appendChild(delButton);

            return [li];
        };

        // viewer 1
        var h1 = document.createElement('h1');
        h1.appendChild(document.createTextNode('View 1'));
        document.body.appendChild(h1);
        var viewer1 = document.createElement('ul');
        document.body.appendChild(viewer1);

        // viewer 2
        h1 = document.createElement('h1');
        h1.appendChild(document.createTextNode('View 2'));
        document.body.appendChild(h1);
        var viewer2 = document.createElement('ul');
        document.body.appendChild(viewer2);

        // model
        var model = [];

        // bind
        bindListToDom(model, viewer1, transOrder);
        bindListToDom(model, viewer2, transOrder);

        // add some elements
        model.push({
            label: 'Order 1',
            items: [{
                label: 'Apfel'
            }, {
                label: 'Birne'
            }]
        });
        model.push({
            label: 'Order 2',
            items: [{
                label: 'Tomate'
            }, {
                label: 'Gurke'
            }]
        });

        var button1 = document.createElement('button');
        document.body.appendChild(button1);
        button1.appendChild(document.createTextNode('Click'));
        button1.addEventListener('click', function () {

            model[0].items.push({
                label: 'Pfirsich'
            });

            model.push({
                label: 'Order 3',
                items: [{
                    label: 'Eiche'
                }, {
                    label: 'Birke'
                }]
            });

        }, false);

        var button2 = document.createElement('button');
        document.body.appendChild(button2);
        button2.appendChild(document.createTextNode('Click'));
        button2.addEventListener('click', function () {

            var model2 = [];
            model2.push({
                label: 'Order 1',
                items: [{
                    label: 'Apfel'
            }, {
                    label: 'Birne'
            }, {
                    label: 'Kirsche'
            }]
            });
            model2.push({
                label: 'Order 2',
                items: [{
                    label: 'Gurke'
            }]
            });
            model2.push({
                label: 'Order 3',
                items: [{
                    label: 'Birke'
            }, {
                    label: 'Esche'
            }]
            });

            list.deltaSet(model, model2, function (order1, order2) {
                return order1.label === order2.label;
            }, function (order1, order2) {
                list.deltaSet(order1.items, order2.items, function (item1,item2) {
                    return item1.label === item2.label;
                });
            });

        }, false);


    };

    // =========================================================================
    //  test ui 3
    // =========================================================================
    var testUI3 = function () {

        var input1 = document.createElement('input');
        input1.setAttribute('type', 'text');
        document.body.appendChild(input1);

        var input2 = document.createElement('input');
        input2.setAttribute('type', 'text');
        document.body.appendChild(input2);

        var obj = {
            value: 0
        };

        bindTextToDom(obj, "value", input1);
        bindTextToDom(obj, "value", input2);
    };

    // =========================================================================
    //  test ui 4
    // =========================================================================
    var testUI4 = function () {

        var Foo = function () {
            this.init.apply(this, arguments);
        };
        Foo.prototype = {
            init: function (name, number) {
                this.name = name;
                this.number = number;
            },
            setNumber: function (number) {
                this.number = number;
                console.log(this.name + "-->" + this.number);
            }
        };

        var f1 = new Foo('f1', 1);
        var f2 = new Foo('f2', 1);
        var f = new Foo('f', 1);
        methodEventing.connect(f1, 'setNumber', f, 'setNumber');
        methodEventing.connect(f2, 'setNumber', f, 'setNumber');

        f1.setNumber(10);

    };

    // =========================================================================
    //  main
    // =========================================================================
    testUI2();
    //testAnimation();

});