/*global require */
/*global requirejs */
/*global console*/
/*global document*/
/*global window*/

requirejs.config({
    baseUrl: '..',
});


require(['lib/dobi', 'lib/list'], function (dobi, listLib) {
    "use strict";

    // =======================================================================
    // bind list to dom
    // =======================================================================
    var listBinding1 = function () {

        // model: create a list
        var list = [];

        // view: creatw a list
        var listNode = document.createElement('ul');
        document.body.appendChild(listNode);

        // transformation model list item -> view list item
        var trans = function (item, parentNode, refNode) {
            var itemNode = document.createElement('li');
            dobi.insertNode(itemNode, parentNode, refNode);
            itemNode.appendChild(document.createTextNode(item.value()));
        };

        // bind model to view
        dobi.bindList(list, listNode, trans);

        // fill list
        list.push('Hello');
        list.push('World!');

        // insert at beginning
        list.splice(0, 0, 'Hi!');

        // delete last
        list.splice(2, 1);

        // create second list
        var list2 = ['Hi!', 'World', 'Hello'];

        // delta update of list (list will be modified so that at the end list has elements+order identical to list2)
        listLib.deltaSet(list, list2);

    };

    // =======================================================================
    // bind string to dom
    // =======================================================================
    var stringBinding1 = function () {

        // create a sales order
        var salesOrder = {
            id: 'Order 1'
        };

        // create an input field for the id
        var idNode1 = document.createElement('input');
        document.body.appendChild(idNode1);

        // create an text field for the id
        var idNode2 = document.createElement('span');
        document.body.appendChild(idNode2);

        // bind salesOrder.id to idNode1, idNode2
        dobi.bindString(dobi.makeProperty(salesOrder, 'id'), idNode1);
        dobi.bindString(dobi.makeProperty(salesOrder, 'id'), idNode2);

    };

    // =======================================================================
    // bind string in deep object hierarchy to dom
    // =======================================================================
    var stringBinding2 = function () {

        var statusReleased = {
            code: 'REL',
            description: 'Released'
        };

        var statusLocked = {
            code: 'LOCK',
            description: 'Locked'
        };

        var salesOrder = {
            status: statusReleased
        };

        var statusDescriptionNode = document.createElement('span');
        document.body.appendChild(statusDescriptionNode);

        dobi.bindString(dobi.makeProperty(salesOrder, 'status/description'), statusDescriptionNode);

        salesOrder.setStatus(statusLocked);
    };

    // =======================================================================
    // bind list property
    // =======================================================================
    var listBinding2 = function () {

        var salesOrder = {
            items: ['iPad', 'iPhone', 'iMac']
        };

        var listNode = document.createElement('ul');
        document.body.appendChild(listNode);

        var trans = function (item, parentNode, refNode) {
            var liNode = document.createElement('li');
            dobi.insertNode(liNode, parentNode, refNode);
            liNode.appendChild(document.createTextNode(item.value()));
        };

        dobi.bindList(dobi.makeProperty(salesOrder, 'items'), listNode, trans);

        salesOrder.items.push('iWatch');

        var items2 = ['Galaxy S4', 'Galaxy Note'];

        salesOrder.setItems(items2);

    };

    // =======================================================================
    // bind object property
    // =======================================================================
    var objectBinding1 = function () {

        var world = {

            salesOrder: {
                id: '4711',
                description: 'Tebartz-van Elst (kleiner Einkauf)',
                status: {
                    code: 'REL',
                    description: 'Released'
                },
                items: [
                    {
                        pos: '10',
                        description: 'Goldener Wasserhahn'
                    },
                    {
                        pos: '20',
                        description: 'WC Sitz (golden, Modell Janukowitsch) '
                    }
                ]
            }
        };

        var salesOrderTrans = function (salesOrderProperty, parentNode, refNode) {

            // helper for add button
            var getMaxPos = function (items) {
                var maxPos = 0;
                for (var i = 0; i < items.length; ++i) {
                    var item = items[i];
                    var pos = parseInt(item.pos);
                    if (pos > maxPos)
                        maxPos = pos;
                }
                return "" + (maxPos + 10);
            };

            // container
            var containerNode = document.createElement('div');
            dobi.insertNode(containerNode, parentNode, refNode);

            // id
            var idNode = document.createElement('input');
            containerNode.appendChild(idNode);
            var idProperty = salesOrderProperty.resolve('id');
            dobi.bindString(idProperty, idNode);

            // description
            var descriptionNode = document.createElement('input');
            containerNode.appendChild(descriptionNode);
            var descriptionProperty = salesOrderProperty.resolve('description');
            dobi.bindString(descriptionProperty, descriptionNode);

            dobi.bindObject(salesOrderProperty.resolve('status'),containerNode,dobi.transformations.status);
            
            // items
            var itemsNode = document.createElement('ul');
            containerNode.appendChild(itemsNode);
            var itemsProperty = salesOrderProperty.resolve('items');
            dobi.bindList(itemsProperty, itemsNode, itemsTrans);

            // add button
            var addButton = document.createElement('button');
            containerNode.appendChild(addButton);
            addButton.appendChild(document.createTextNode('add'));
            var items = itemsProperty.value();
            addButton.addEventListener('click', function () {
                items.push({
                    pos: getMaxPos(items),
                    description: 'Irgendwas'
                });
            });

        };

        var itemsTrans = function (itemProperty, parentNode, refNode) {
            var liNode = document.createElement('li');
            dobi.insertNode(liNode, parentNode, refNode);

            var posNode = document.createElement('span');
            liNode.appendChild(posNode);
            dobi.bindString(itemProperty.resolve('pos'), posNode);

            var descriptionNode = document.createElement('input');
            liNode.appendChild(descriptionNode);
            dobi.bindString(itemProperty.resolve('description'), descriptionNode);

            var delButton = document.createElement('button');
            liNode.appendChild(delButton);
            delButton.appendChild(document.createTextNode('del'));
            var item = itemProperty.value();
            var items = itemProperty.object;
            delButton.addEventListener('click', function () {
                var index = items.indexOf(item);
                if (index >= 0) items.splice(index, 1);
            });

        };

        dobi.run(window, document.getElementById('templates'));
        
        var salesOrderNode = document.createElement('div');
        document.body.appendChild(salesOrderNode);
        dobi.bindObject(dobi.makeProperty(world, 'salesOrder'), salesOrderNode, salesOrderTrans);

        salesOrderNode = document.createElement('div');
        document.body.appendChild(salesOrderNode);
        dobi.bindObject(dobi.makeProperty(world, 'salesOrder'), salesOrderNode, salesOrderTrans);

        
    };

    listBinding1();
    stringBinding1();
    stringBinding2();
    listBinding2();
    objectBinding1();
});