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

    module.bindObject = function (obj, objNode, transObj, parentObj) {
        objNode.parentNode.insertBefore(transObj(obj, parentObj), objNode);
        objNode.parentNode.removeChild(objNode);
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

    module.cloneNode = function (node, parentNode, bindingActive, transformationParameters) {

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

        var getContext = function (value, transformationParameters) {
            if (value === '$self')
                return {
                    obj: transformationParameters.obj,
                    parentObj: transformationParameters.parentObj,
                    type: 'object'
                };
            else
                return {
                    obj: transformationParameters.obj[value],
                    parentObj: transformationParameters.obj,
                    type: getType(transformationParameters.obj[value])
                };
        };

        var getType = function (obj) {
            if (typeof (obj) === 'string') return 'string';
            if (typeof (obj) === 'number') return 'number';
            if (typeof (obj) === 'object') {
                if (Object.prototype.toString.call(obj) === '[object Array]') return 'array';
                return 'object';
            }
            throw "Not supported type:" + typeof (obj);
        };

        var cloneChildren = function (node, cloneNode, transformationParameters) {
            for (var i = 0; i < node.childNodes.length; i++) {
                var childNode = node.childNodes[i];
                var cloneChildNode = module.cloneNode(childNode, cloneNode, true, transformationParameters);
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
                var context = getContext(bindingAttribute.attributeValue, transformationParameters);
                switch (context.type) {
                case 'string':
                case 'number':
                    module.bindAttribute(context.parentObj, bindingAttribute.attributeValue, cloneNode);
                    break;
                case 'object':
                    module.bindObject(context.obj, cloneNode, getTransformation(node), context.parentObj);
                    break;
                case 'array':
                    module.bindList(context.obj, cloneNode, getTransformation(node));
                    break;
                }
                /*    switch (bindingAttribute.attributeName) {
                case 'data-bind-object':
                    var bindObj, bindObjParent;
                    var attrName = node.getAttribute('data-bind-object');
                    if (attrName === '$self ') {
                        bindObj = transformationParameters.obj;
                        bindObjParent = transformationParameters.parentObj;
                    } else {
                        bindObj = transformationParameters.obj[attrName];
                        bindObjParent = transformationParameters.obj;
                    }
                    module.bindObject(bindObj, cloneNode, getTransformation(node), bindObjParent);
                    break;
                case 'data-bind-list':
                    module.bindList(transformationParameters.obj[node.getAttribute('data-bind-list')], cloneNode, getTransformation(node));
                    break;
                case 'data-bind-attribute':
                    module.bindAttribute(transformationParameters.obj, node.getAttribute('data-bind-attribute'), cloneNode);
                    break;
                }*/
            } else {
                cloneChildren(node, cloneNode, transformationParameters);
            }
        } else {
            cloneChildren(node, cloneNode, transformationParameters);
        }

        return cloneNode;
    };

    module.parseTransformationFromTemplate = function (node, bindingActive) {
        return function (obj, parentObj) {
            return module.cloneNode(node, null, bindingActive, {
                obj: obj,
                parentObj: parentObj
            });
        };
    };

    module.transformations = {

        "$identity": function (obj) {
            return document.createTextNode(obj);
        },

        "$changeableIdentity": function (item, list) {
            var inputNode = document.createElement('input');
            inputNode.value = item;
            inputNode.setAttribute('type', 'text');
            inputNode.addEventListener('change', function (event) {
                var index = list.indexOf(item);
                if (index < 0) return;
                list.splice(index, 1, inputNode.value);
            });
            return inputNode;
        }
    };

    module.runInterpreter = function () {
        // parse transformations
        var templateNodes = document.querySelectorAll('[data-def-template]');
        for (var i = 0; i < templateNodes.length; i++) {
            var templateNode = templateNodes.item(i);
            var templateName = templateNode.getAttribute('data-def-template');
            templateNode.removeAttribute('data-def-template');
            module.transformations[templateName] = module.parseTransformationFromTemplate(templateNode, true);
            templateNode.parentNode.removeChild(templateNode);
        }
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