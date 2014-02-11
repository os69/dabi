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

    var bindListToDom = function (list, domList, trans) {

        methodEventing.connect(list, "push", domList, "appendChild", trans);

        methodEventing.connect(list, "splice", domList, "splice", function () {
            // parse arguments
            var index = arguments[0];
            var numberDel = arguments[1];
            // delete
            var children = this.receiver.querySelectorAll("li");
            for (i = 0; i < numberDel; ++i) {
                var element = children.item(index + i);
                fadeOut(element);
            }
            // insert
            var refElement = null;
            if (index > 0) {
                refElement = children.item(index - 1).nextSibling;
            } else {
                refElement = this.receiver.querySelector("li");
            }
            for (var i = 2; i < arguments.length; ++i) {
                var listElement = arguments[i];
                var li = document.createElement('li');
                li.appendChild(trans(listElement));
                this.receiver.insertBefore(li, refElement);
                fadeIn(li);
            }
            return methodEventing.noMethodCall;
        });

    };

    var bindTextToDom = function (obj, property, inputField) {

        methodEventing.connect(obj, property, inputField, "val", function (val) {
            inputField.value = val;
            return methodEventing.noMethodCall;
        }, function (val) {
            obj[property] = val;
            return methodEventing.noMethodCall;
        });

        $(inputField).val(function () {
            methodEventing.raiseEvent(inputField, "val", [inputField.value]);
        });

    };


    // =========================================================================
    //  test ui 
    // =========================================================================
    var testUI = function () {

        // viewer
        var viewer = document.createElement('ul');
        document.body.appendChild(viewer);

        // model
        var model = [];

        // bind
        bindListToDom(model, viewer, function (element) {
            var li = document.createElement('li');
            li.appendChild(document.createTextNode(element));
            return li;
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

        // viewer
        var viewer = document.createElement('ul');
        document.body.appendChild(viewer);

        // model
        var model = [];

        var transOrder = function (order) {
            var li = document.createElement('li');
            li.appendChild(document.createTextNode(order.label));
            var itemList = document.createElement('ul');
            for (var i = 0; i < order.items.length; ++i) {
                var item = order.items[i];
                itemList.appendChild(transItem(item)[0]);
            }
            li.appendChild(itemList);
            bindListToDom(order.items, itemList, transItem);
            return [li];
        };

        var transItem = function (item) {
            var li = document.createElement('li');
            li.appendChild(document.createTextNode(item));
            return [li];
        };

        // bind
        bindListToDom(model, viewer, transOrder);

        model.push({
            label: 'Order 1',
            items: ['Apfel', 'Birne']
        });
        model.push({
            label: 'Order 2',
            items: ['Tomate', 'Kohlrabi']
        });

        var button = document.createElement('button');
        document.body.appendChild(button);
        button.appendChild(document.createTextNode('Click'));
        button.addEventListener('click', function () {

            model[0].items.push('Orange');
            model.push({
                label: 'Order 3',
                items: ['Esel']
            });

        }, false);


    };

    // =========================================================================
    //  test ui 2
    // =========================================================================
    var testUI3 = function () {

        var input = document.createElement('input');
        document.body.appendChild(input);

        var obj = {
            value: 0
        };

        bindTextToDom(obj, "value", input);
    };

    // =========================================================================
    //  main
    // =========================================================================
    testUI3();
    //testAnimation();

});