require(["map", "eventing", "list"], function (map, eventing, list) {
    "use strict";

    var $ = window.$;
    var console = window.console;
    var document = window.document;

    var methodEventing = eventing.methodEventing;

    function fadeIn(el) {
        el.style.opacity = 0;
        el.style.height = 0;
        var opacityVelocity = 1.0 / 1000;
        var heightVelocity = 15.0 / 1000;
        var height=0;
        var last = new Date();
        var tick = function () {
            var delta = new Date() - last;
            el.style.opacity = +el.style.opacity + delta * opacityVelocity;
            height = height + delta * heightVelocity;
            el.style.height=height+"px";
            console.log(height);
            last = new Date();

            if (el.style.opacity < 1) {
                (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 50)
            }
        };

        tick();
    }

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
        methodEventing.connect(model, "push", viewer, "appendChild", function (text) {
            var li = document.createElement('li');
            li.appendChild(document.createTextNode(text));
            return [li];
        });
        methodEventing.connect(model, "splice", viewer, "splice", function () {
            // parse arguments
            var index = arguments[0];
            var numberDel = arguments[1];
            // delete
            var children = this.receiver.querySelectorAll("li");
            for (i = 0; i < numberDel; ++i) {
                var element = children.item(index + i);
                this.receiver.removeChild(element);
            }
            // insert
            var refElement = null;
            if (index > 0) {
                refElement = children.item(index - 1).nextSibling;
            } else {
                refElement = this.receiver.querySelector("li");
            }
            for (var i = 2; i < arguments.length; ++i) {
                var text = arguments[i];
                var li = document.createElement('li');
                li.appendChild(document.createTextNode(text));
                this.receiver.insertBefore(li, refElement);
                li.style.opacity = 0;
                li.style.height = 0;
                fadeIn(li);
            }
            return methodEventing.noMethodCall;
        });


        model.push('Apfel');
        model.push('Banane');
        model.push('Orange');

        var button = document.createElement('button');
        document.body.appendChild(button);
        button.appendChild(document.createTextNode('Click'));
        button.addEventListener('click', function () {

            var newList = ["Esel",'Apfel', 'Banane', 'Birne', 'Orange'];
            list.deltaSet(model, newList);

        }, false);


    };


    // =========================================================================
    //  main
    // =========================================================================
    testUI();

});