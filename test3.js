define(["map", "eventing", "list", "dombinding"], function (map, eventing, list, dombinding) {
    "use strict";

    var $ = window.$;
    var console = window.console;
    var document = window.document;

    // =========================================================================
    //  test UI 1
    // =========================================================================
    var testUI1 = function () {
        document.addEventListener('DOMContentLoaded', dombinding.runInterpreter);
        window.addEventListener('load', dombinding.runInterpreter);
    };


    // =========================================================================
    //  main
    // =========================================================================
    return {
        testUI1: testUI1
    }

});