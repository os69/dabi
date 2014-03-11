/*global window */
/*global document */
/*global setTimeout */
/*global Node */

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
            if (node.nodeType === Node.TEXT_NODE) {
                module._bindText(obj, propertyName, node, trans1);
            } else {
                switch (node.tagName) {
                case 'INPUT':
                    module._bindInputField(obj, propertyName, node, trans1, trans2);
                    break;
                default:
                    module._bindText(obj, propertyName, node, trans1);
                    break;
                }
            }
        };

        // ===================================================================
        // bind attribute of object to a input field (bidirectional binding)
        // ===================================================================        
        module._bindInputField = function (obj, propertyName, inputField, trans1, trans2) {

            inputField.value = trans1 ? trans1(obj[propertyName]) : obj[propertyName];

            generateSetter(obj, propertyName);

            eventing.connect(obj, setterName(propertyName), inputField, "dummyVal", function (val) {
                inputField.value = trans1 ? trans1(val) : val;
                return eventing.noMethodCall;
            }, function (val) {
                return [trans2 ? trans2(val) : val];
            });

            inputField.addEventListener('change', function (event) {
                eventing.raiseMethodEvent(inputField, "dummyVal", [inputField.value]);
            });

        };

        // ===================================================================
        // bind attribute of object to a dom element (unidirectional binding)
        // ===================================================================        
        module._bindText = function (obj, propertyName, textNode, trans) {

            textNode.textContent = trans ? trans(obj[propertyName]) : obj[propertyName];

            generateSetter(obj, propertyName);

            eventing.connect(obj, setterName(propertyName), textNode, "dummyVal", function (val, obj, textNode) {
                val = trans ? trans(val) : val;
                if (textNode.nodeType === Node.TEXT_NODE)
                    textNode.nodeValue = val;
                else
                    textNode.textContent = val;
                return eventing.noMethodCall;
            }, false);

        };

        // ===================================================================
        // bind attribute of an object to an attribute of a dom element
        // ===================================================================        
        module.bindAttributeToElementAttribute = function (obj, propertyName, element, attributeName, trans) {


            var val = trans ? trans(obj[propertyName]) : obj[propertyName];
            if (val === '$remove')
                element.removeAttribute(attributeName);
            else
                element.setAttribute(attributeName, val);

            generateSetter(obj, propertyName);

            eventing.connect(obj, setterName(propertyName), element, 'dummy', function (val) {
                val = trans ? trans(val) : val;
                if (val === '$remove')
                    element.removeAttribute(attributeName);
                else
                    element.setAttribute(attributeName, val);
                return eventing.noMethodCall;
            }, false);

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
        // JS path resolver
        // ===================================================================        
        module.getByPath = function (obj, path) {

            var result = {
                value: obj,
                obj: null,
                attributeName: null,
                listIndex: 0
            };

            var parts = path.split(new RegExp("[\\.\\[\\]/]", "g"));
            for (var i = 0; i < parts.length; i++) {
                var part = parts[i];
                if (part.length === 0) continue;
                if (Object.prototype.toString.call(result.value) === '[object Array]') {
                    var listIndex = parseInt(part);
                    result.obj = result.value;
                    result.attributeName = null;
                    result.listIndex = listIndex;
                    result.value = result.obj[listIndex];
                } else {
                    result.obj = result.value;
                    result.attributeName = part;
                    result.listIndex = null;
                    result.value = result.obj[part];
                }
                if (result.value === undefined) return undefined;
            }

            return result;
        };

        module.testObj = {
            test1: {
                test2: 10,
                test3: {
                    test4: 20
                },
                list: [{
                        a: 1,
                        b: [1, 2]
                    },
                    [10, {
                        a: 1
                    }]]
            }
        };

        // ===================================================================
        // environment
        // ===================================================================        
        module.Environment = function () {
            this.init.apply(this, arguments);
        };

        module.Environment.prototype = {

            init: function () {
                this.stack = [];
            },

            pop: function () {
                return this.stack.pop();
            },

            getLast: function () {
                return this.stack[this.stack.length - 1];
            },

            push: function (args) {
                var obj = {};
                for (var i = 0; i < args.length; i++) {
                    var arg = args[i];
                    obj['$' + i] = arg;
                    switch (i) {
                    case 0:
                        obj.$self = arg;
                        obj.$item = arg;
                        break;
                    case 1:
                        obj.$list = arg;
                    }
                }
                this.stack.push(obj);
                return this;
            },

            determineStackIndex: function (path) {
                var index = this.stack.length - 1;
                while (path.indexOf("../") === 0) {
                    index--;
                    path = path.slice(3);
                }
                return {
                    index: index,
                    path: path
                };
            },

            resolvePath: function (path) {

                // determine stack index from "../" prefixes
                var stackIndex = this.determineStackIndex(path);
                path = stackIndex.path;

                // if no root attribute is specified -> use $self
                if (path[0] !== '$') path = '$self.' + path;

                // search stack starting from stack index
                for (var i = stackIndex.index; i >= 0; --i) {
                    var obj = this.stack[i];
                    var result = module.getByPath(obj, path);
                    // artifical root obj cannot be used for attribute binding -> clear
                    if (result && result.obj === obj) result.attributeName = null;
                    if (result) return result;
                }

                return null;
            },

            value: function (path) {
                return this.resolvePath(path).value;
            },

            clone: function () {
                var env = new module.Environment();
                env.stack = this.stack.slice(0);
                return env;
            }
        };

        // ===================================================================
        // get type
        // ===================================================================        
        module.getType = function (obj) {
            if (typeof (obj) === 'string') return 'simple';
            if (typeof (obj) === 'number') return 'simple';
            if (typeof (obj) === 'object') {
                if (Object.prototype.toString.call(obj) === '[object Array]') return 'array';
                return 'object';
            }
            throw "Not supported type:" + typeof (obj);
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
                this.env = new module.Environment();
            },

            cloneChildren: function (node, cloneNode, context, allowedTags) {
                for (var i = 0; i < node.childNodes.length; i++) {
                    var childNode = node.childNodes[i];
                    if (allowedTags) {
                        var tagName = childNode.tagName;
                        if (!tagName) continue;
                        if (allowedTags.indexOf(tagName) < 0) continue;
                    }
                    this.cloneNode(childNode, cloneNode, true, context);
                }
            },

            getTransformation: function (node, context) {
                if (node.hasAttribute('data-template')) {
                    var transformationName = node.getAttribute('data-template');
                    return this.transformations[transformationName];
                } else {
                    return this.parseTransformationFromTemplate(node, false, context.env);
                }
            },

            getListTransformation: function (node, context) {
                if (node.hasAttribute('data-template')) {
                    var transformationName = node.getAttribute('data-template');
                    return this.transformations[transformationName];
                } else {
                    return this.parseTransformationFromTemplate(node.firstElementChild, true, context.env);
                }
            },

            fillCloneNode: function (node, context, resolveResult) {
                if (node.tagName === 'INPUT') {
                    var item = context.env.value('$item');
                    var list = context.env.value('$list');
                    node.value = item;
                    node.setAttribute('type', 'text');
                    node.addEventListener('change', function (event) {
                        var index = list.indexOf(item);
                        if (index < 0) return;
                        list.splice(index, 1, node.value);
                    });
                } else {
                    node.appendChild(document.createTextNode(resolveResult.value));
                }
            },

            registerScript: function (node, context, parentNode) {

                var self = this;

                // script exists?
                if (!node.templateScript) return;

                // schedule delayed execution
                if (self.scripts.length === 0) {
                    setTimeout(function () {
                        self.executeScripts();
                    }, 0);
                }

                // register script
                self.scripts.push(function () {
                    var args = [];
                    var ctx = {
                        id: context.transId,
                        parentNode: parentNode,
                        env: context.env,
                        getElementById : function(id){
                            return document.getElementById(id+"#"+context.transId);
                        }
                    };
                    args.push(ctx);
                    var obj = context.env.getLast();
                    for(var i=0;i<9;++i){
                        var attrName = "$"+i;
                        if(obj[attrName]) args.push(obj[attrName]);
                    }
                    node.templateScript.apply(node, args);
                });
            },

            executeScripts: function () {
                for (var i = 0; i < this.scripts.length; i++) {
                    var script = this.scripts[i];
                    script();
                }
                this.scripts = [];
            },

            processElementAttributes: function (cloneNode, context) {
                if (!cloneNode.hasAttribute) return;
                var matcher = new RegExp("{{(.*)}}");
                for (var i = 0; i < cloneNode.attributes.length; i++) {
                    var attribute = cloneNode.attributes.item(i);
                    var match = matcher.exec(attribute.value);
                    if (!match) continue;
                    var bindName = match[1];
                    var resolveResult = context.env.resolvePath(bindName);
                    if (module.getType(resolveResult.value) !== 'simple') return;
                    var attrName;
                    if (cloneNode.tagName === 'IMG' && attribute.name === 'data-src') {
                        cloneNode.removeAttribute(attribute.name);
                        attrName = 'src';
                    } else {
                        attrName = attribute.name;
                    }
                    if (!resolveResult.attributeName) {
                        cloneNode.setAttribute(attrName, resolveResult.value);
                    } else {
                        module.bindAttributeToElementAttribute(resolveResult.obj, resolveResult.attributeName, cloneNode, attrName);
                    }
                }
            },

            processDefTemplate: function (node, context) {
                var transName = node.getAttribute('data-def-template');
                node.removeAttribute('data-def-template');
                this.transformations[transName] = this.parseTransformationFromTemplate(node, true, context.env);
                node.parentNode.removeChild(node);
            },

            processTextNode: function (node, cloneParentNode, context) {
                var parts = node.nodeValue.split(new RegExp("{{([^}]+)}}"));
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i];
                    if (i % 2 === 0) {
                        // no match
                        cloneParentNode.appendChild(document.createTextNode(part));
                    } else {
                        // match
                        var resolveResult = context.env.resolvePath(part);
                        if (module.getType(resolveResult.value) !== 'simple') continue;
                        var cloneNode = document.createTextNode("");
                        cloneParentNode.appendChild(cloneNode);
                        if (resolveResult.attributeName)
                            module.bindAttribute(resolveResult.obj, resolveResult.attributeName, cloneNode);
                        else
                            cloneNode.nodeValue = resolveResult.value;
                    }
                }
            },

            cloneNode: function (node, cloneParentNode, bindingActive, context) {

                if (node.getAttribute && node.getAttribute('data-def-template')) {
                    this.processDefTemplate(node, context);
                    return;
                }

                if (node.tagName === 'SCRIPT') {
                    this.registerScript(node, context, cloneParentNode);
                    return;
                }

                if (node.nodeType === Node.TEXT_NODE) {
                    this.processTextNode(node, cloneParentNode, context);
                    return;
                }

                var cloneNode = node.cloneNode(false);
                if (cloneNode.hasAttribute && cloneNode.hasAttribute('id'))
                    cloneNode.setAttribute('id', cloneNode.getAttribute('id') + '#' + context.transId);
                if (cloneParentNode) cloneParentNode.appendChild(cloneNode);

                var bindName = false;
                if (node.getAttribute) bindName = node.getAttribute('data-bind');

                if (!bindName || !bindingActive) {
                    this.cloneChildren(node, cloneNode, context);
                    this.processElementAttributes(cloneNode, context);
                    return cloneNode;
                }

                cloneNode.removeAttribute('data-bind');
                var resolveResult = context.env.resolvePath(bindName);
                switch (module.getType(resolveResult.value)) {
                case 'simple':
                    if (node.hasAttribute('data-template')) {
                        cloneNode = module.bindObject(resolveResult.value, cloneNode, this.getTransformation(node, context));
                    } else {
                        if (!resolveResult.attributeName) {
                            this.fillCloneNode(cloneNode, context, resolveResult);
                        } else {
                            module.bindAttribute(resolveResult.obj, resolveResult.attributeName, cloneNode);
                        }
                        this.processElementAttributes(cloneNode, context);
                        this.cloneChildren(node, cloneNode, context, ['SCRIPT']);
                    }
                    break;
                case 'object':
                    cloneNode = module.bindObject(resolveResult.value, cloneNode, this.getTransformation(node, context));
                    break;
                case 'array':
                    module.bindList(resolveResult.value, cloneNode, this.getListTransformation(node, context));
                    this.processElementAttributes(cloneNode, context);
                    break;
                }

                return cloneNode;
            },

            parseTransformationFromTemplate: function (node, bindingActive, env) {
                var self = this;
                var transformation = function () {
                    var context = {
                        transId: module.generateId(),
                        env: env.clone().push(arguments)
                    };
                    return self.cloneNode(node, null, bindingActive, context);
                };
                return transformation;
            },

            run: function () {
                var trans = this.parseTransformationFromTemplate(document.body, false, new module.Environment());
                module.bindObject(window, document.body, trans);
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
           // (new module.TemplateInterpreter(document)).run();
        });

        return module;
    });

})();