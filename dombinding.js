(function () {

    var define = window.define || function (deps, mod) {
            window.dombinding = mod(window.eventing);
        };

    define(["eventing"], function (eventing) {

        var module = {};

        // ===================================================================
        // get setter name from property name
        // ===================================================================
        var setterName = function (propertyName) {
            return 'set' + propertyName[0].toUpperCase() + propertyName.slice(1);
        };

        // ===================================================================
        // generate setter method
        // ===================================================================
        var generateSetter = function (obj, propertyName) {
            var setter = setterName(propertyName);
            if (obj[setter]) {
                return;
            }
            obj[setter] = function (value) {
                this[propertyName] = value;
            };
        };

        // ===================================================================
        // bind object to dom element
        // ===================================================================        
        module.bindObject = function (obj, objNode, transObj) {
            var node = transObj(obj);
            objNode.parentNode.insertBefore(node, objNode);
            objNode.parentNode.removeChild(objNode);
            return node;
        };

        // ===================================================================
        // bind list to dom element (ul)
        // ===================================================================        
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

        // ===================================================================
        // bind attribute of object to a dom element
        // ===================================================================        
        module.bindAttribute = function (obj, propertyName, node, trans1, trans2) {
            switch (node.tagName) {
            case 'INPUT':
                module._bindInputField(obj, propertyName, node, trans1, trans2);
                break;
            default:
                module._bindText(obj, propertyName, node, trans1);
                break;
            }
        };

        // ===================================================================
        // bind attribute of object to a input field (bidirectional binding)
        // ===================================================================        
        module._bindInputField = function (obj, propertyName, inputField, trans1, trans2) {

            inputField.value = trans1 obj[propertyName];

            generateSetter(obj, propertyName);

            eventing.connect(obj, setterName(propertyName), inputField, "val", function (val) {
                inputField.value = trans1 ? trans1(val) : val;
                return eventing.noMethodCall;
            }, true);

            inputField.addEventListener('change', function (event) {
                var value = trans2 ? trans2(inputField.value) : inputField.value;
                eventing.raiseMethodEvent(inputField, "val", [value]);
            });

        };

        // ===================================================================
        // bind attribute of object to a dom element (unidirectional binding)
        // ===================================================================        
        module._bindText = function (obj, propertyName, textNode, trans) {

            textNode.textContent = trans ? trans(obj[propertyName]) : obj[propertyName];

            generateSetter(obj, propertyName);

            eventing.connect(obj, setterName(propertyName), textNode, "val", function (val, obj, textNode) {
                textNode.textContent = trans ? trans(val) : val;
                return eventing.noMethodCall;
            }, false);

        };

        // ===================================================================
        // bind attribute of an object to an attribute of a dom element
        // ===================================================================        
        module.bindAttributeToElementAttribute = function (obj, propertyName, element, attributeName) {

            element.setAttribute(attributeName, obj[propertyName]);

            generateSetter(obj, propertyName);

            eventing.connect(obj, setterName(propertyName), element, 'dummy', function (val) {
                element.setAttribute(attributeName, val);
                return eventing.noMethodCall;
            }, false)

        };

        // ===================================================================
        // id generator 
        // ===================================================================        
        module.maxId = 0;
        module.generateId = function () {
            return ++module.maxId;
        };

        // ===================================================================
        // connect template script function to script-dom-element (called during pageload)
        // ===================================================================        
        module.templateScript = function (script) {
            var scriptTags = document.getElementsByTagName('SCRIPT');
            var scriptTag = scriptTags.item(scriptTags.length - 1);
            scriptTag.templateScript = script;
        };

        // ===================================================================
        // template interpreter
        // ===================================================================        
        module.TemplateInterpreter = function () {
            this.init.apply(this, arguments);
        };

        module.TemplateInterpreter.prototype = {

            init: function (rootElement) {
                this.rootElement = rootElement;
                this.transformations = {};
                this.scripts = [];
            },

            getBindingyType: function (value, transArgs) {
                if (value === '$self')
                    return {
                        obj: transArgs[0],
                        parentObj: transArgs[1],
                        type: this.getType(transArgs[0])
                    };
                else
                    return {
                        obj: transArgs[0][value],
                        parentObj: transArgs[0],
                        type: this.getType(transArgs[0][value])
                    };
            },

            getType: function (obj) {
                if (typeof (obj) === 'string') return 'simple';
                if (typeof (obj) === 'number') return 'simple';
                if (typeof (obj) === 'object') {
                    if (Object.prototype.toString.call(obj) === '[object Array]') return 'array';
                    return 'object';
                }
                throw "Not supported type:" + typeof (obj);
            },

            cloneChildren: function (node, cloneNode, context) {
                for (var i = 0; i < node.childNodes.length; i++) {
                    var childNode = node.childNodes[i];
                    this.cloneNode(childNode, cloneNode, true, context);
                }
            },

            getTransformation: function (node) {
                if (node.hasAttribute('data-template')) {
                    var transformationName = node.getAttribute('data-template');
                    return this.transformations[transformationName];
                } else {
                    return this.parseTransformationFromTemplate(node, false);
                }
            },

            getListTransformation: function (node) {
                if (node.hasAttribute('data-template')) {
                    var transformationName = node.getAttribute('data-template');
                    return this.transformations[transformationName];
                } else {
                    return this.parseTransformationFromTemplate(node.firstElementChild, true);
                }
            },

            fillCloneNode: function (node, bindingType) {
                if (node.tagName === 'INPUT') {
                    var item = bindingType.obj;
                    var list = bindingType.parentObj;
                    node.value = item;
                    node.setAttribute('type', 'text');
                    node.addEventListener('change', function (event) {
                        var index = list.indexOf(item);
                        if (index < 0) return;
                        list.splice(index, 1, node.value);
                    });
                } else {
                    node.appendChild(document.createTextNode(bindingType.obj));
                }
            },

            registerScript: function (node, context) {
                if (!node.templateScript) return;
                this.scripts.push(function () {
                    var args = [];
                    args.push(context.transId);
                    for (var i = 0; i < context.transArgs.length; i++) {
                        var arg = context.transArgs[i];
                        args.push(arg);
                    }
                    node.templateScript.apply(node, args);
                });
            },

            executeScripts: function () {
                for (var i = 0; i < this.scripts.length; i++) {
                    var script = this.scripts[i];
                    script();
                }
            },

            processElementAttributes: function (cloneNode, context) {
                if (!cloneNode.hasAttribute) return;
                var matcher = new RegExp("{{(.*)}}");
                for (var i = 0; i < cloneNode.attributes.length; i++) {
                    var attribute = cloneNode.attributes.item(i);
                    var match = matcher.exec(attribute.value);
                    if (!match) continue;
                    var bindName = match[1];
                    var bindingType = this.getBindingyType(bindName, context.transArgs);
                    if (bindingType.type !== 'simple') return;
                    if (bindName === '$self') {
                        cloneNode.setAttribute(attribute.name, bindingType.obj);
                    } else {
                        module.bindAttributeToElementAttribute(bindingType.parentObj, bindName, cloneNode, attribute.name);
                    }
                }
            },

            cloneNode: function (node, parentNode, bindingActive, context) {

                var cloneNode = node.cloneNode(false);
                if (cloneNode.hasAttribute && cloneNode.hasAttribute('id'))
                    cloneNode.setAttribute('id', cloneNode.getAttribute('id') + '#' + context.transId);
                if (parentNode) parentNode.appendChild(cloneNode);

                if (node.tagName === 'SCRIPT') {
                    this.registerScript(node, context);
                    return cloneNode;
                }

                var bindName = false;
                if (node.getAttribute) bindName = node.getAttribute('data-bind');

                if (!bindName || !bindingActive) {
                    this.cloneChildren(node, cloneNode, context);
                    this.processElementAttributes(cloneNode, context);
                    return cloneNode;
                }

                cloneNode.removeAttribute('data-bind');
                var bindingType = this.getBindingyType(bindName, context.transArgs);
                switch (bindingType.type) {
                case 'simple':
                    if (node.hasAttribute('data-template')) {
                        cloneNode = module.bindObject(bindingType.obj, cloneNode, this.getTransformation(node));
                    } else {
                        if (bindName === '$self') {
                            this.fillCloneNode(cloneNode, bindingType);
                        } else {
                            module.bindAttribute(bindingType.parentObj, bindName, cloneNode);
                        }
                        this.processElementAttributes(cloneNode, context);
                    }
                    break;
                case 'object':
                    cloneNode = module.bindObject(bindingType.obj, cloneNode, this.getTransformation(node));
                    break;
                case 'array':
                    module.bindList(bindingType.obj, cloneNode, this.getListTransformation(node));
                    this.processElementAttributes(cloneNode, context);
                    break;
                }

                return cloneNode;
            },

            parseTransformationFromTemplate: function (node, bindingActive) {
                var self = this;
                return function () {
                    var context = {
                        transId: module.generateId(),
                        transArgs: arguments
                    };
                    return self.cloneNode(node, null, bindingActive, context);
                };
            },

            run: function () {
                var templateNodes = this.rootElement.querySelectorAll('[data-def-template]');
                for (var i = 0; i < templateNodes.length; i++) {
                    var templateNode = templateNodes.item(i);
                    var templateName = templateNode.getAttribute('data-def-template');
                    templateNode.removeAttribute('data-def-template');
                    this.transformations[templateName] = this.parseTransformationFromTemplate(templateNode, true);
                    templateNode.parentNode.removeChild(templateNode);
                }
                module.bindObject(window, document.body, this.parseTransformationFromTemplate(document.body));
                this.executeScripts();
            }

        };

        // ===================================================================
        //  registry for functions to be executed on document ready
        // ===================================================================        
        var onDocumentReadyListeners = [];
        module.onDocumentReady = function (listener) {

            var onLoaded = function () {
                document.removeEventListener('DOMContentLoaded', onLoaded, false);
                for (var i = 0; i < onDocumentReadyListeners.length; i++) {
                    var listener = onDocumentReadyListeners[i];
                    listener();
                }
            };

            if (document.readyState === 'complete') {
                listener();
                return;
            } else {
                if (onDocumentReadyListeners.length === 0) document.addEventListener('DOMContentLoaded', onLoaded, false);
                onDocumentReadyListeners.push(listener);
            }

        };

        // ===================================================================
        // call template interpreter on document ready
        // ===================================================================
        module.onDocumentReady(function () {
            (new module.TemplateInterpreter(document)).run();
        });

        return module;
    });

})();