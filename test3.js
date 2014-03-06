(function () {

    var define = window.define || function (deps, mod) {
            window.test3 = mod(window.eventing, window.dombinding, window.list);
        };

    define(["eventing", "dombinding", "list"], function (eventing, dombinding, list) {
        "use strict";

        var $ = window.$;
        var console = window.console;
        var document = window.document;

        // =========================================================================
        //  test UI 1
        // =========================================================================
        var testUI1 = function () {

            dombinding.onDocumentReady(function () {

                return;
                var templateInterpreter = new dombinding.TemplateInterpreter(document);
                templateInterpreter.run();

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
                            subitems: ['a', 'b', 'c']
                    },
                        {
                            description: 'item2',
                            subitems: ['x', 'y', 'z']
                    }
                ]
                };
                dombinding.bindObject(salesOrder, salesOrderNode, templateInterpreter.transformations.SalesOrder);
                templateInterpreter.executeScripts();

            });





        };


        // =========================================================================
        //  main
        // =========================================================================


        testUI1();

    });

})();