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

    // transitem <-> trans li generator
    
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

    module.cloneNode = function (node, obj) {

        var transformationName;
        var cloneNode = node.cloneNode();

        if (cloneNode.hasAttribute) {
            if (node.hasAttribute('data-template')) cloneNode.removeAttribute('data-template');
            if (node.hasAttribute('data-bind-obj')) {
                cloneNode.removeAttribute('data-bind-obj');
                var objectName = node.getAttribute('data-bind-obj');
                transformationName = node.getAttribute('data-template');                
                module.bindObject(obj[objectName], cloneNode, module.transformations[transformationName]);
            }
            if(node.hasAttribute('data-bind-attr')){
                cloneNode.removeAttribute('data-bind-attr');
                var attributeName = node.getAttribute('data-bind-attr');
                module.bindText(obj,attributeName,cloneNode);
            }
            if(node.hasAttribute('data-bind-list')){
                cloneNode.removeAttribute('data-bind-list');
                var listName = node.getAttribute('data-bind-list');
                transformationName = node.getAttribute('data-template');                
                module.bindList(obj[listName],cloneNode, module.transformations[transformationName]);
            }            
        }

        for (var i = 0; i < node.childNodes.length; i++) {
            var childNode = node.childNodes[i];
            var cloneChildNode = module.cloneNode(childNode, obj);
            cloneNode.appendChild(cloneChildNode);
        }

        return cloneNode;
    };

    module.parseTransformationFromTemplate = function (node) {
        return function (obj) {
            return module.cloneNode(node, obj);
        };
    };

    module.runInterpreter = function () {
        // parse transformations
        module.transformations = {};
        var templateNodes = document.querySelectorAll('[data-template]:not([data-bind-obj]):not([data-bind-list])');
        for (var i = 0; i < templateNodes.length; i++) {
            var templateNode = templateNodes.item(i);
            module.transformations[templateNode.getAttribute('data-template')] = module.parseTransformationFromTemplate(templateNode);
            templateNode.parentNode.removeChild(templateNode);
        }

        //  
    };

    module.parseDocument = function (done) {
        var onLoaded = function () {
            document.removeEventListener('DOMContentLoaded', onLoaded, false);
            module.runInterpreter();
            done();
        };
        if (document.readyState === 'complete') {
            module.runInterpreter();
            done();
            return;
        }
        document.addEventListener('DOMContentLoaded', onLoaded, false);
    };

    return module;
});