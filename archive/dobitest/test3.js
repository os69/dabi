(function () {

    var define = window.define || function (deps, mod) {
            window.test3 = mod(window.eventing, window.dobi, window.list);
        };

    define(["eventing", "dobi", "list"], function (eventing, dombinding, list) {
        "use strict";

        var $ = window.$;
        var console = window.console;
        var document = window.document;

     
    });

})();