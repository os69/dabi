require(["map", "eventing"], function (map, eventing) {
    "use strict";

    var $ = window.$;
    var console = window.console;

    var methodEventing = eventing.methodEventing;

    // =========================================================================
    //  test ui 
    // =========================================================================
    var testUI = function () {

        $("body").append("<h1>V1</h1>");
        var v1 = $("<ul></ul>");
        $("body").append(v1);

        $("body").append("<h1>V2</h1>");
        var v2 = $("<ul></ul>");
        $("body").append(v2);

        var model = [];

        var transItem = function (item) {
            
            var input = $("<input></input>");
            input.val(item.label);
            methodEventing.connect(item, "setLabel", input, "val");
            input.change(function () {
                methodEventing.raiseEvent(input, "val", [input.val()]);
            });

            var result = $("<li></li>");
            result.append(input);
            var delButton = $("<button>Delete</button>");
            delButton.click(function () {
                item.itemList.splice(item.itemList.indexOf(item), 1);
            });
            result.append(delButton);

            return [result];
        };

        var transItemList = function (itemList) {

            var transformedItemList = $("<ul></ul>");
            $.each(itemList, function (i, item) {
                item.itemList = itemList;
                transformedItemList.append(transItem(item)[0]);
            });
            methodEventing.connect(itemList, "push", transformedItemList, "append", transItem);
            methodEventing.connect(itemList, "splice", transformedItemList, "remove", function (from, howMany) {
                this.receiver.children().slice(from,from+howMany).remove();
                return methodEventing.noMethodCall;
            });


            var result = $("<li></li>");

            result.append(transformedItemList);

            var button = $("<button>Add</button>");
            result.append(button);
            button.click(function () {
                itemList.push(new Item("test"));
            });

            return [result];

        };

        methodEventing.connect(model, "push", v1, "append", transItemList);
        methodEventing.connect(model, "push", v2, "append", transItemList);

        var Item = function () {
            this.init.apply(this, arguments);
        };
        Item.prototype = {
            init: function (label) {
                this.label = label;
            },
            setLabel: function (label) {
                this.label = label;
            }
        };
        var l1 = [new Item("Apfel"), new Item("Birne")];
        var l2 = [new Item("Erbes"), new Item("Tomate")];
        model.push(l1);
        model.push(l2);
        l1.push(new Item("Kirsche"));

    };


    // =========================================================================
    //  main
    // =========================================================================
    testUI();

});