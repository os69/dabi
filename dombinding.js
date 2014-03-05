define(["eventing"], function (eventing) {

    var module = {};

    module.templateScript = function(script){
        var scriptTags = document.getElementsByTagName('SCRIPT');
        var scriptTag = scriptTags.item(scriptTags.length-1);
        scriptTag.templateScript = script;
    };
    
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

    module.cloneNode = function (node, parentNode, bindingActive, transArgs) {

        var getContext = function (value, transArgs) {
            if (value === '$self')
                return {
                    obj: transArgs[0],
                    parentObj: transArgs[1],
                    type: getType(transArgs[0])
                };
            else
                return {
                    obj: transArgs[0][value],
                    parentObj: transArgs[0],
                    type: getType(transArgs[0][value])
                };
        };

        var getType = function (obj) {
            if (typeof (obj) === 'string') return 'simple';
            if (typeof (obj) === 'number') return 'simple';
            if (typeof (obj) === 'object') {
                if (Object.prototype.toString.call(obj) === '[object Array]') return 'array';
                return 'object';
            }
            throw "Not supported type:" + typeof (obj);
        };

        var cloneChildren = function (node, cloneNode, transArgs) {
            for (var i = 0; i < node.childNodes.length; i++) {
                var childNode = node.childNodes[i];
                var cloneChildNode = module.cloneNode(childNode, cloneNode, true, transArgs);
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

        var fillCloneNode = function (node, context) {
            if (node.tagName === 'INPUT') {
                var item = context.obj;
                var list = context.parentObj;
                node.value = item;
                node.setAttribute('type', 'text');
                node.addEventListener('change', function (event) {
                    var index = list.indexOf(item);
                    if (index < 0) return;
                    list.splice(index, 1, node.value);
                });
            } else
                node.appendChild(document.createTextNode(context.obj));
        };

        var cloneNode = node.cloneNode();
        if (parentNode) parentNode.appendChild(cloneNode);

        if(node.tagName==='SCRIPT'){
            node.templateScript(cloneNode,transArgs[0],transArgs[1]);
            return cloneNode;
        }

        var attributeName = false;
        if (node.getAttribute) attributeName = node.getAttribute('data-bind');

        if (attributeName) {
            cloneNode.removeAttribute('data-bind');
            if (bindingActive) {
                var context = getContext(attributeName, transArgs);
                if (context.obj === 'x') {
                    var z = 1;
                }
                switch (context.type) {
                case 'simple':
                    if (node.hasAttribute('data-template')) {
                        module.bindObject(context.obj, cloneNode, getTransformation(node));
                    } else {
                        if (attributeName === '$self') {
                            fillCloneNode(cloneNode, context);
                        } else
                            module.bindAttribute(context.parentObj, attributeName, cloneNode);
                    }
                    break;
                case 'object':
                    module.bindObject(context.obj, cloneNode, getTransformation(node));
                    break;
                case 'array':
                    module.bindList(context.obj, cloneNode, getTransformation(node));
                    break;
                }
            } else {
                cloneChildren(node, cloneNode, transArgs);
            }
        } else {
            cloneChildren(node, cloneNode, transArgs);
        }

        return cloneNode;
    };

    module.parseTransformationFromTemplate = function (node, bindingActive) {
        return function () {
            return module.cloneNode(node, null, bindingActive, arguments);
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