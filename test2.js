/*global require */
/*global window */

require(["map", "eventing", "list", "dobi"], function (map, eventing, list, dombinding) {
    "use strict";

    var $ = window.$;
    var console = window.console;
    var document = window.document;

    // =========================================================================
    //  animation
    // =========================================================================
    //    var fadeIn = function (element) {
    //        return;
    //        var listener = function (event) {
    //            if (event.animationName === 'fadeIn') {
    //                this.classList.remove('fadeIn');
    //                this.removeEventListener("animationend", listener, false);
    //            }
    //        };
    //        element.addEventListener("animationend", listener, false);
    //        element.classList.add('fadeIn');
    //    };
    //
    //    var fadeOut = function (element) {
    //        element.parentNode.removeChild(element);
    //        return;
    //        var listener = function (event) {
    //            if (event.animationName === 'fadeOut') {
    //                this.classList.remove('fadeOut');
    //                this.removeEventListener("animationend", listener, false);
    //                this.parentNode.removeChild(this);
    //            }
    //        };
    //        element.addEventListener("animationend", listener, false);
    //        element.classList.add('fadeOut');
    //    };
    //
    //    var testAnimation = function () {
    //        var div = document.createElement('div');
    //        document.body.appendChild(div);
    //        div.appendChild(document.createTextNode('Balduin'));
    //        div.addEventListener("animationend", function (event) {
    //            if (event.animationName === 'fadeIn') {
    //                fadeOut(div);
    //            }
    //        }, false);
    //        fadeIn(div);
    //    };



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
        dombinding.bindList(model, viewer, function (element) {
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
    //  transformations
    // =========================================================================

    // order
    var transOrder = function (order) {

        // header
        var li = document.createElement('li');
        li.appendChild(document.createTextNode(order.label));

        // items
        var itemList = document.createElement('ul');
        li.appendChild(itemList);
        dombinding.bindList(order.items, itemList, transItem);

        // button for creating items
        var createButton = document.createElement('button');
        createButton.appendChild(document.createTextNode('create item'));
        li.appendChild(createButton);
        createButton.addEventListener('click', function () {
            order.items.push({
                label: 'new item'
            });
        });

        return li;
    };

    // item
    var transItem = function (item, items) {

        var self = this;

        var li = document.createElement('li');

        // input
        var input = document.createElement('input');
        input.setAttribute('type', 'text');
        li.appendChild(input);
        dombinding.bindAttribute(item, 'label', input);

        // del button
        var delButton = document.createElement('button');
        delButton.appendChild(document.createTextNode('Del'));
        delButton.addEventListener('click', function () {
            var index = items.indexOf(item);
            items.splice(index, 1);
        });
        li.appendChild(delButton);

        return li;
    };

    // =========================================================================
    //  test ui 2
    // =========================================================================
    var testUI2 = function () {

        // viewer 1
        var h1 = document.createElement('h1');
        h1.appendChild(document.createTextNode('View 1'));
        document.body.appendChild(h1);
        var viewer1 = document.createElement('div');
        document.body.appendChild(viewer1);

        // viewer 2
        h1 = document.createElement('h1');
        h1.appendChild(document.createTextNode('View 2'));
        document.body.appendChild(h1);
        var viewer2 = document.createElement('div');
        document.body.appendChild(viewer2);

        // order
        var order = {
            label: 'Order 2',
            items: [{
                label: 'Tomate'
            }, {
                label: 'Gurke'
            }]
        };

        // bind order to dom nodes
        dombinding.bindObject(order, viewer1, transOrder);
        dombinding.bindObject(order, viewer2, transOrder);

    };

    // =========================================================================
    //  test ui 3
    // =========================================================================
    var testUI3 = function () {

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

        // orders
        var orders = [{
            label: 'Order 1',
            items: [{
                label: 'Apfel'
            }, {
                label: 'Birne'
            }]
        }];

        // bind
        dombinding.bindList(orders, viewer1, transOrder);
        dombinding.bindList(orders, viewer2, transOrder);

        // add one more order
        orders.push({
            label: 'Order 2',
            items: [{
                label: 'Tomate'
            }, {
                label: 'Gurke'
            }]
        });

        // button 1
        var button1 = document.createElement('button');
        document.body.appendChild(button1);
        button1.appendChild(document.createTextNode('Click'));
        button1.addEventListener('click', function () {

            orders[0].items.push({
                label: 'Pfirsich'
            });

            orders.push({
                label: 'Order 3',
                items: [{
                    label: 'Eiche'
                }, {
                    label: 'Birke'
                }]
            });

        }, false);

        // button 2
        var button2 = document.createElement('button');
        document.body.appendChild(button2);
        button2.appendChild(document.createTextNode('Click'));
        button2.addEventListener('click', function () {

            var orders2 = [];
            orders2.push({
                label: 'Order 1',
                items: [{
                    label: 'Apfel'
            }, {
                    label: 'Birne'
            }, {
                    label: 'Kirsche'
            }]
            });
            orders2.push({
                label: 'Order 2',
                items: [{
                    label: 'Gurke'
            }]
            });
            orders2.push({
                label: 'Order 3',
                items: [{
                    label: 'Birke'
            }, {
                    label: 'Esche'
            }]
            });

            list.deltaSet(orders, orders2, function (order1, order2) {
                return order1.label === order2.label;
            }, function (order1, order2) {
                list.deltaSet(order1.items, order2.items, function (item1, item2) {
                    return item1.label === item2.label;
                });
            });

        }, false);


    };

    // =========================================================================
    //  test ui 4
    // =========================================================================
    var testUI4 = function () {

        var input1 = document.createElement('input');
        input1.setAttribute('type', 'text');
        document.body.appendChild(input1);

        var input2 = document.createElement('input');
        input2.setAttribute('type', 'text');
        document.body.appendChild(input2);

        var output1 = document.createElement('div');
        document.body.appendChild(output1);

        var output2 = document.createElement('div');
        document.body.appendChild(output2);

        var obj = {
            value: 0
        };

        dombinding.bindAttribute(obj, "value", input1);
        dombinding.bindAttribute(obj, "value", input2);
        dombinding.bindAttribute(obj, "value", output1);
        dombinding.bindAttribute(obj, "value", output2);
    };

    // =========================================================================
    //  test ui 5
    // =========================================================================
    var testUI5 = function () {

        var Foo = function () {
            this.init.apply(this, arguments);
        };
        Foo.prototype = {
            init: function (name, number) {
                this.name = name;
                this.number = number;
            },
            setNumber: function (number) {
                if (this.name === 'f' && number >= 10) {
                    throw "Number '" + number + "' exceeds 10!";
                }
                this.number = number;
                console.log(this.name + "-->" + this.number);
            }
        };

        var f1 = new Foo('f1', 1);
        var f2 = new Foo('f2', 1);
        var f = new Foo('f', 1);
        eventing.connect(f1, 'setNumber', f, 'setNumber');
        eventing.connect(f2, 'setNumber', f, 'setNumber');

        try {
            f1.setNumber(10);
        } catch (e) {
            console.log('Exception', e);
        }


    };

    // =========================================================================
    //  main
    // =========================================================================
    //testUI1();
    //testUI2();
    //testUI3();
    //testUI4();
    testUI5();

});