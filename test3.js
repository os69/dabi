define(["map", "eventing", "list", "dombinding"], function (map, eventing, list, dombinding) {
    "use strict";

    var $ = window.$;
    var console = window.console;
    var document = window.document;

    // =========================================================================
    //  test UI 1
    // =========================================================================
    var testUI1 = function () {

        dombinding.parseDocument(function () {
            var salesOrderNode = document.createElement('div');
            document.body.appendChild(salesOrderNode);
            var salesOrder = {
                id: 10,
                description: 'Big Order',
                status: {
                    status: 1,
                    description: 'Status 1'
                },
                items: [
                    {
                        description: 'item1',
                        subitems: ['a','b','c']
                    },
                    {
                        description: 'item2',
                        subitems: ['x','y','z']
                    }
                ]
            };
            dombinding.bindObject(salesOrder, salesOrderNode, dombinding.transformations.SalesOrder);
        });

    };


    // =========================================================================
    //  main
    // =========================================================================


    testUI1();

});