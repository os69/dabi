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
        objNode.parentNode.insertBefore(transObj(obj), objNode);
        objNode.parentNode.removeChild(objNode);
        //objNode.appendChild(transObj(obj));
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

    module.bindAttribute = function (obj, propertyName, node) {
        switch (node.tagName) {
        case 'INPUT':
            module._bindInputField(obj, propertyName, node);
            break;
        default:
            module._bindText(obj, propertyName, node);
            break;
        }
    };

    module._bindInputField = function (obj, propertyName, inputField) {

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

    module._bindText = function (obj, propertyName, textNode) {

        textNode.textContent = obj[propertyName];

        generateSetter(obj, propertyName);

        eventing.connect(obj, setterName(propertyName), textNode, "val", function (val, obj, textNode) {
            textNode.textContent = val;
            return eventing.noMethodCall;
        }, false);

    };

    module.cloneNode = function (node, obj, parentNode, bindingActive) {

        var getBindingAttribute = function (node) {
            var bindingAttributes = ['data-bind-object', 'data-bind-attribute', 'data-bind-list'];
            if (!node.hasAttribute) return false;
            for (var i = 0; i < bindingAttributes.length; i++) {
                var bindingAttribute = bindingAttributes[i];
                if (node.hasAttribute(bindingAttribute)) return {
                    attributeName: bindingAttribute,
                    attributeValue: node.getAttribute(bindingAttribute)
                };
            }
            return false;
        };

        var cloneChildren = function (node, obj, cloneNode) {
            for (var i = 0; i < node.childNodes.length; i++) {
                var childNode = node.childNodes[i];
                var cloneChildNode = module.cloneNode(childNode, obj, cloneNode, true);
                cloneNode.appendChild(cloneChildNode);
            }
        };

        var getTransformation = function (node) {
            if (node.hasAttribute('data-template')) {
                var transformationName = node.getAttribute('data-template');
                return module.transformations[transformationName];
            } else {
                if (node.hasAttribute('data-bind-list'))
                    return module.parseTransformationFromTemplate(node.firstElementChild, false);
                else
                    return module.parseTransformationFromTemplate(node, false);
            }
        };

        var cloneNode = node.cloneNode();
        if (parentNode) parentNode.appendChild(cloneNode);

        var bindingAttribute = getBindingAttribute(node);
        if (bindingAttribute) {
            cloneNode.removeAttribute(bindingAttribute.attributeName);
            if (bindingActive) {
                switch (bindingAttribute.attributeName) {
                case 'data-bind-object':
                    module.bindObject(obj[node.getAttribute('data-bind-object')], cloneNode, getTransformation(node));
                    break;
                case 'data-bind-list':
                    module.bindList(obj[node.getAttribute('data-bind-list')], cloneNode, getTransformation(node));
                    break;
                case 'data-bind-attribute':
                    module.bindAttribute(obj, node.getAttribute('data-bind-attribute'), cloneNode);
                    break;
                }
            } else {
                cloneChildren(node, obj, cloneNode);
            }
        } else {
            cloneChildren(node, obj, cloneNode);
        }

        return cloneNode;
    };

    module.parseTransformationFromTemplate = function (node, bindingActive) {
        return function (obj) {
            return module.cloneNode(node, obj, null, bindingActive);
        };
    };

    module.runInterpreter = function () {
        // parse transformations
        module.transformations = {};
        var templateNodes = document.querySelectorAll('[data-def-template]');
        for (var i = 0; i < templateNodes.length; i++) {
            var templateNode = templateNodes.item(i);
            var templateName = templateNode.getAttribute('data-def-template');
            templateNode.removeAttribute('data-def-template');
            module.transformations[templateName] = module.parseTransformationFromTemplate(templateNode, true);
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