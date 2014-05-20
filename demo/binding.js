/*global require */
/*global requirejs */
/*global console*/
/*global document*/
/*global window*/

requirejs.config({
    baseUrl: '..',
});


require(['dobi/binding', 'dobi/list', 'dobi/property'], function (bindingModule, listModule, propertyModule) {
    "use strict";

    // =======================================================================
    // helper
    // =======================================================================
    var helper = {

        heading: function (text) {
            var h = document.createElement('h1');
            document.body.appendChild(h);
            h.appendChild(document.createTextNode(text));
        },

        createInputField: function (parentNode, label) {

            var container = document.createElement('tr');
            parentNode.appendChild(container);

            var cell = document.createElement('td');
            container.appendChild(cell);
            cell.appendChild(document.createTextNode(label));

            cell = document.createElement('td');
            container.appendChild(cell);
            var inputNode = document.createElement('input');
            cell.appendChild(inputNode);

            return inputNode;
        }

    };

    // =======================================================================
    // bind list to dom
    // =======================================================================
    var listBinding1 = function () {

        helper.heading('Bind List to Dom');

        // model: create a list
        var list = [];

        // view: creatw a list
        var listNode = document.createElement('ul');
        document.body.appendChild(listNode);

        // transformation model list item -> view list item
        var trans = function (item, parentNode, refNode) {
            var itemNode = document.createElement('li');
            bindingModule.insertNode(itemNode, parentNode, refNode);
            itemNode.appendChild(document.createTextNode(item.value()));
        };

        // bind model to view
        bindingModule.bindList(list, listNode, trans);

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
        listModule.deltaSet(list, list2);

    };

    // =======================================================================
    // bind string property to dom
    // =======================================================================
    var stringBinding1 = function () {

        helper.heading('Bind String Property to Dom');

        // model: create a sales order
        var salesOrder = {
            id: 'Order 1'
        };

        // view: create an input field for the id
        var idNode1 = document.createElement('input');
        document.body.appendChild(idNode1);

        // view: create display field for the id
        var idNode2 = document.createElement('div');
        document.body.appendChild(idNode2);

        // bind salesOrder.id to idNode1, idNode2
        bindingModule.bindString(propertyModule.objectProperty(salesOrder, 'id'), idNode1);
        bindingModule.bindString(propertyModule.objectProperty(salesOrder, 'id'), idNode2);

    };

    // =======================================================================
    // bind string in deep object hierarchy to dom
    // =======================================================================
    var stringBinding2 = function () {

        helper.heading('Bind String Property to Object Hierarchy');

        // status released
        var statusReleased = {
            code: 'REL',
            description: 'Released'
        };

        // status locked
        var statusLocked = {
            code: 'LOCK',
            description: 'Locked'
        };

        // model: sales order with staus
        var salesOrder = {
            status: statusReleased
        };

        // view: two output nodes for the status
        var statusDescriptionNode1 = document.createElement('div');
        document.body.appendChild(statusDescriptionNode1);
        var statusDescriptionNode2 = document.createElement('div');
        document.body.appendChild(statusDescriptionNode2);

        // bind description 
        bindingModule.bindString(propertyModule.objectProperty(salesOrder.status, 'description'), statusDescriptionNode1);
        bindingModule.bindString(propertyModule.objectProperty(salesOrder, 'status/description'), statusDescriptionNode2);

        // change status
        salesOrder.setStatus(statusLocked);
    };

    // =======================================================================
    // bind list property
    // =======================================================================
    var listBinding2 = function () {

        helper.heading('Bind List Property to Dom');

        // model: sales order with items
        var salesOrder = {
            items: ['iPad', 'iPhone', 'iMac']
        };

        // view: create list node
        var listNode = document.createElement('ul');
        document.body.appendChild(listNode);

        // transformation model item -> view item
        var trans = function (item, parentNode, refNode) {
            var liNode = document.createElement('li');
            bindingModule.insertNode(liNode, parentNode, refNode);
            liNode.appendChild(document.createTextNode(item.value()));
        };

        // bind model to view
        bindingModule.bindList(propertyModule.objectProperty(salesOrder, 'items'), listNode, trans);

        // modify list
        salesOrder.items.push('iWatch');

        // assign new list
        var items2 = ['Galaxy S4', 'Galaxy Note'];
        salesOrder.setItems(items2);

    };

    // =======================================================================
    // bind object property
    // =======================================================================
    var objectBinding1 = function () {

        helper.heading('Bind Object Property to Dom');

        // run template parser (for parsing the status template)
        bindingModule.run(window, document.getElementById('templates'));

        // -------------------------------------------------------------------
        // model
        // -------------------------------------------------------------------
        var world = {

            salesOrder: {
                id: '4711',
                owner: 'Tebart-van Elst',
                description: 'Kleiner Einkauf',
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

        // -------------------------------------------------------------------
        // transformation model sales order -> view sales order
        // -------------------------------------------------------------------
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
            bindingModule.insertNode(containerNode, parentNode, refNode);

            // heading
            var headingNode = document.createElement('h2');
            containerNode.appendChild(headingNode);
            headingNode.appendChild(document.createTextNode('Sales Order'));
            var idHeading = document.createTextNode('');
            headingNode.appendChild(idHeading);
            bindingModule.bindString(salesOrderProperty.resolve('id'), idHeading);

            // table
            var table = document.createElement('table');
            containerNode.appendChild(table);

            // id
            var idNode = helper.createInputField(table, 'id:');
            var idProperty = salesOrderProperty.resolve('id');
            bindingModule.bindString(idProperty, idNode);

            //owner
            var ownerNode = helper.createInputField(table, 'owner:');
            var ownerProperty = salesOrderProperty.resolve('owner');
            bindingModule.bindString(ownerProperty, ownerNode);

            // description
            var descriptionNode = helper.createInputField(table, 'description:');
            var descriptionProperty = salesOrderProperty.resolve('description');
            bindingModule.bindString(descriptionProperty, descriptionNode);

            // status
            bindingModule.bindObject(salesOrderProperty.resolve('status'), containerNode, bindingModule.transformations.status);

            // items
            var itemsNode = document.createElement('ul');
            containerNode.appendChild(itemsNode);
            var itemsProperty = salesOrderProperty.resolve('items');
            bindingModule.bindList(itemsProperty, itemsNode, itemsTrans);

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

        // -------------------------------------------------------------------
        // transformation model item -> view item
        // -------------------------------------------------------------------
        var itemsTrans = function (itemProperty, parentNode, refNode) {
            var liNode = document.createElement('li');
            bindingModule.insertNode(liNode, parentNode, refNode);

            var posNode = document.createElement('span');
            liNode.appendChild(posNode);
            bindingModule.bindString(itemProperty.resolve('pos'), posNode);

            var descriptionNode = document.createElement('input');
            liNode.appendChild(descriptionNode);
            bindingModule.bindString(itemProperty.resolve('description'), descriptionNode);

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

        // -------------------------------------------------------------------
        // display sales order
        // -------------------------------------------------------------------
        var salesOrderNode = document.createElement('div');
        document.body.appendChild(salesOrderNode);
        bindingModule.bindObject(propertyModule.objectProperty(world, 'salesOrder'), salesOrderNode, salesOrderTrans);

        salesOrderNode = document.createElement('div');
        document.body.appendChild(salesOrderNode);
        bindingModule.bindObject(propertyModule.objectProperty(world, 'salesOrder'), salesOrderNode, salesOrderTrans);

    };

    // =======================================================================
    // start demos
    // =======================================================================

    listBinding1();
    stringBinding1();
    stringBinding2();
    listBinding2();
    objectBinding1();

});