define(["eventing"], function (eventing) {

    var module = {};

    var setterName = function (propertyName) {
        return 'set' + propertyName[0].toUpperCase() + propertyName.slice(1);
    };

    var generateSetter = function (obj, propertyName) {
        var setter = setterName(propertyName);
        if (obj[setter]) {
            return;
        }
        obj[setter] = function (value) {
            this[propertyName] = value;
        };
    };

    module.bindObject = function (obj, objNode, transObj) {
        objNode.appendChild(transObj(obj));
    };

    module.bindList = function (list, domList, transItem) {
        
        for (var j = 0; j < list.length; j++) {
            var element = list[j];
            domList.appendChild(transItem(element, list, domList));
        }

        eventing.connect(list, "push", domList, "appendChild", function () {
            return [transItem.apply(this, arguments)];
        });

        eventing.connect(list, "splice", domList, "splice", function () {
            // parse arguments
            var index = arguments[0];
            var numberDel = arguments[1];
            var list = arguments[arguments.length - 2];
            var domList = arguments[arguments.length - 1];
            // delete
            var children = domList.children;
            for (i = 0; i < numberDel; ++i) {
                var element = children.item(index);
                element.parentNode.removeChild(element);
            }
            // insert
            var refElement = children.item(index);
            for (var i = 2; i < arguments.length - 2; ++i) {
                var listElement = arguments[i];
                var transListElement = transItem.apply(this, [listElement, list, domList]);
                if (refElement) {
                    domList.insertBefore(transListElement, refElement);
                } else {
                    domList.appendChild(transListElement);
                }
            }
            return eventing.noMethodCall;
        });

    };

    module.bindInputField = function (obj, propertyName, inputField) {

        inputField.value = obj[propertyName];
        
        generateSetter(obj, propertyName);

        eventing.connect(obj, setterName(propertyName), inputField, "val", function (val) {
            inputField.value = val;
            return eventing.noMethodCall;
        }, true);

        inputField.addEventListener('change', function (event) {
            eventing.raiseMethodEvent(inputField, "val", [inputField.value]);
        });

    };

    module.bindText = function (obj, propertyName, textNode) {

        textNode.textContent = obj[propertyName];

        generateSetter(obj, propertyName);

        eventing.connect(obj, setterName(propertyName), textNode, "val", function (val, obj, textNode) {
            textNode.textContent = val;
            return eventing.noMethodCall;
        }, false);

    };

    module.runInterpreter = function(){
        alert("Hallo");    
    };
    
    return module;
});