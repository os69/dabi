/*global window */
/*global document */
/*global setTimeout */
/*global Node */

/* unsubscribe on node delete  recursively*/


(function () {

    var define = window.define || function (deps, mod) {
            window.dobi = mod(window.eventing);
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
        // generic setter
        // ===================================================================
        module.setProperty = function (obj, propertyName) {
            var args = [];
            for (var i = 2; i < arguments.length; i++) {
                var arg = arguments[i];
                args.push(arg);
            }
            return obj[setterName(propertyName)].apply(obj, args);
        };

        // ===================================================================
        // unbind dom element
        // ===================================================================        
        module.unbind = function (node) {
            eventing.deleteSubscriptions(node);
            for (var i = 0; i < node.children.length; ++i) {
                var child = node.children.item(i);
                module.unbind(child);
            }
        };
        
        module.unbindChildren = function (node) {
            for (var i = 0; i < node.children.length; ++i) {
                var child = node.children.item(i);
                module.unbind(child);
            }
        };

        // ===================================================================
        // bind object to dom element
        // ===================================================================        
        module.bindObject = function (obj, objNode, transObj, objContext) {

            // assemble arguments for transformation
            var transArgs = [];
            transArgs.push(obj, objContext);
            for (var i = 4; i < arguments.length; i++) {
                var arg = arguments[i];
                transArgs.push(arg);
            }

            // call transformation
            var node = transObj.apply(null, transArgs);

            // append to objNode
            objNode.appendChild(node);

        };

        // ===================================================================
        // bind dic to dom element 
        // ===================================================================        
        module.bindDict = function (obj, node, transItem) {

            // service for setting key / value pair in dict
            obj.dictSet = obj.dictSet || function (key, value) {
                if (this[key] !== undefined) {
                    this[key] = value;
                    eventing.raiseEvent(this, 'ValueChanged', {
                        key: key,
                        value: value
                    });
                } else {
                    this[key] = value;
                    eventing.raiseEvent(this, 'KeyAdded', {
                        key: key,
                        value: value
                    });
                }
            };

            // service for deleting a key in the dict
            obj.dictDel = obj.dictDel || function (key) {
                delete this[key];
                eventing.raiseEvent(this, 'KeyDeleted', key);
            };

            // generate item
            var generateItem = function (property, value) {
                var item = {
                    key: property,
                    origKey: property,
                    value: value
                };
                generateSetter(item, 'key');
                generateSetter(item, 'value');
                eventing.subscribe(item, 'setValue', item, function (event) {
                    obj.dictSet(item.key, event.message.args[0]);
                });
                eventing.subscribe(item, 'setKey', item, function (event) {
                    obj.dictDel(item.origKey);
                    obj.dictSet(item.key, item.value);
                });
                eventing.subscribe(obj, 'ValueChanged', item, function (event) {
                    if (event.message.key === item.key && item.value !== event.message.value) item.setValue(event.message.value);
                });
                return item;
            };

            // create list from dict
            var list = [];
            for (var property in obj) {
                if (!obj.hasOwnProperty(property)) continue;
                var value = obj[property];
                if (typeof (value) === 'function') continue;
                if (property[0] === '_') continue;
                list.push(generateItem(property, value));
            }

            // bind list to node
            module.bindList(list, node, transItem);

            eventing.subscribe(obj, 'KeyAdded', list, function (event) {
                var key = event.message.key;
                var value = event.message.value;
                list.push(generateItem(key, value));
            });

            eventing.subscribe(obj, 'KeyDeleted', list, function (event) {
                var deletedKey = event.message;
                for (var i = 0; i < list.length; i++) {
                    var item = list[i];
                    if (item.origKey === deletedKey) {
                        list.splice(i, 1);
                        return;
                    }
                }
            });

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
                    module.unbind(element);
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
                    if (node.getAttribute('type') === 'checkbox')
                        module._bindCheckbox(obj, propertyName, node, trans1, trans2);
                    else
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
        // bind attribute of object to a checkox (bidirectional binding)
        // ===================================================================        
        module._bindCheckbox = function (obj, propertyName, inputField, trans1, trans2) {

            inputField.checked = !! (trans1 ? trans1(obj[propertyName]) : obj[propertyName]);

            generateSetter(obj, propertyName);

            eventing.connect(obj, setterName(propertyName), inputField, "dummyVal", function (val) {
                inputField.checked = !! (trans1 ? trans1(val) : val);
                return eventing.noMethodCall;
            }, function (val) {
                return [trans2 ? trans2(val) : val];
            });

            inputField.addEventListener('change', function (event) {
                eventing.raiseMethodEvent(inputField, "dummyVal", [inputField.checked]);
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

        module.bindAsProperty = function (obj, attributeName, node, bindFunction, bindArgs) {
            bindFunction.apply(null, bindArgs);
            generateSetter(obj, attributeName);
            eventing.connect(obj, setterName(attributeName), node, 'dummySet', function (value) {
                module.unbindChildren(node);
                node.innerHTML = "";
                bindArgs[0] = value;
                bindFunction.apply(null, bindArgs);
                return eventing.noMethodCall;
            });
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
        module.script = function (script, delayed) {
            var scriptTags = document.getElementsByTagName('SCRIPT');
            var scriptTag = scriptTags.item(scriptTags.length - 1);
            if (delayed === undefined) delayed = true;
            scriptTag.templateScript = script;
            scriptTag.templateScriptDelayed = delayed;
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

            push: function (args, parameterNames) {
                var obj = {};
                for (var i = 0; i < args.length; i++) {
                    var arg = args[i];
                    obj['$' + i] = arg;
                    var parameterName = parameterNames[i];
                    if (parameterName) obj[parameterName] = arg;
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

            doResolvePath: function (path, stackIndex) {

                // search stack starting from stack index
                for (var i = stackIndex; i >= 0; --i) {
                    var obj = this.stack[i];
                    var result = module.getByPath(obj, path);
                    if (result) {
                        // artifical root obj cannot be used for attribute binding -> clear
                        if (result.obj === obj) result.attributeName = null;
                        // for self we can get the resolve result by context
                        if (path === 'self' && obj.context) {
                            return obj.context;
                        }
                        return result;
                    }
                }

                // if nothing found -> try again with prefix self
                if (path.indexOf('self') !== 0) {
                    return this.doResolvePath('self.' + path, stackIndex);
                }

                // nothing found
                return null;

            },

            resolvePath: function (path) {

                // determine stack index from "../" prefixes
                var stackIndex = this.determineStackIndex(path);

                // resolve
                return this.doResolvePath(stackIndex.path, stackIndex.index);

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
            if (typeof (obj) === 'boolean') return 'simple';
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

            init: function (rootElement, targetElement) {
                this.rootElement = rootElement;
                this.targetElement = targetElement;
                this.transformations = {};
                this.scripts = [];
                this.env = new module.Environment();
                this.bindListParameters = ['self', 'list', 'domList'];
                this.bindObjectParameters = ['self', 'context'];
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
                    return this.parseTransformationFromTemplate(node, false, context.env, this.bindObjectParameters);
                }
            },

            getListTransformation: function (node, context) {
                if (node.hasAttribute('data-template')) {
                    var transformationName = node.getAttribute('data-template');
                    var transformation = this.transformations[transformationName];
                    transformation.parameterNames = this.bindListParameters;
                    return transformation;
                } else {
                    return this.parseTransformationFromTemplate(node.firstElementChild, true, context.env, this.bindListParameters);
                }
            },

            fillCloneNode: function (node, context, resolveResult) {
                if (node.tagName === 'INPUT') {
                    var item = context.env.value('$0');
                    var list = context.env.value('$1');
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

                // create script function
                var templateFunction = function () {

                    var parameters = {};

                    var info = {
                        id: context.transId,
                        parentNode: parentNode,
                        env: context.env,
                        getElementById: function (id) {
                            return document.getElementById(id + "#" + context.transId);
                        },
                        value: function (path) {
                            return context.env.value(path);
                        }
                    };

                    var obj = info.env.getLast();
                    for (var property in obj) {
                        parameters[property] = obj[property];
                    }

                    node.templateScript.apply(node, [info, parameters]);
                };

                // execute
                if (node.templateScriptDelayed) {
                    // schedule delayed execution
                    if (self.scripts.length === 0) {
                        setTimeout(function () {
                            self.executeScripts();
                        }, 0);
                    }
                    // register for delayed execution
                    self.scripts.push(templateFunction);
                } else {
                    // execute now
                    templateFunction();
                }
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
                var parseResult = this.parseTemplateName(transName);
                node.removeAttribute('data-def-template');
                this.transformations[parseResult.templateName] = this.parseTransformationFromTemplate(node, true, context.env, parseResult.parameterNames);
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

            parseBindAttribute: function (node) {

                if (!node.getAttribute) return false;

                var bind = node.getAttribute('data-bind');
                if (!bind) return false;

                var parts = bind.split(new RegExp(":"));
                if (parts.length === 1)
                    return {
                        bindType: null,
                        bindName: parts[0]
                    };
                else
                    return {
                        bindType: parts[0],
                        bindName: parts[1]
                    };
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

                var binding = this.parseBindAttribute(node);

                if (!binding || !bindingActive) {
                    this.cloneChildren(node, cloneNode, context);
                    this.processElementAttributes(cloneNode, context);
                    return cloneNode;
                }

                cloneNode.removeAttribute('data-bind');
                var resolveResult = context.env.resolvePath(binding.bindName);
                if (!resolveResult) {
                    throw "Cannot resolve " + binding.bindName;
                }

                if(binding.bindName==='items'){
                    console.log(1);
                }
                switch (binding.bindType || module.getType(resolveResult.value)) {
                case 'simple':
                    if (node.children.length > 0 || node.hasAttribute('data-template')) {
                        this.bindObject(resolveResult, node, cloneNode, context);
                    } else {
                        if (!resolveResult.attributeName) {
                            this.fillCloneNode(cloneNode, context, resolveResult);
                        } else {
                            module.bindAttribute(resolveResult.obj, resolveResult.attributeName, cloneNode);
                        }
                        this.processElementAttributes(cloneNode, context);
                    }
                    break;
                case 'object':
                    this.bindObject(resolveResult, node, cloneNode, context);
                    //this.processElementAttributes(cloneNode, context);
                    break;
                case 'array':
                    this.bindList(resolveResult, node, cloneNode, context);
                    this.processElementAttributes(cloneNode, context);
                    break;
                case 'dict':
                    module.bindDict(resolveResult.value, cloneNode, this.getListTransformation(node, context));
                    this.processElementAttributes(cloneNode, context);
                    break;
                }

                return cloneNode;
            },

            bindObject: function (resolveResult, node, cloneNode, context) {

                // argument list
                var args = [];

                // standard arguments
                args.push(resolveResult.value,
                    cloneNode,
                    this.getTransformation(node, context),
                    resolveResult);

                // aditional optional template parameters
                if (node.hasAttribute('data-template-parameters')) {
                    var parameters = node.getAttribute('data-template-parameters').split(',');
                    for (var i = 0; i < parameters.length; i++) {
                        var parameter = parameters[i];
                        args.push(context.env.resolvePath(parameter).value);
                    }
                }

                // call bind object
                if (resolveResult.attributeName)
                    module.bindAsProperty(resolveResult.obj, resolveResult.attributeName, cloneNode, module.bindObject, args);
                else
                    module.bindObject.apply(module, args);

            },
            
            bindList : function(resolveResult, node, cloneNode, context){
                
                var args=[];                
                
                args.push(resolveResult.value,node,this.getListTransformation(node,context));
                
                if (resolveResult.attributeName)
                    module.bindList.apply(module, args);
                    //module.bindAsProperty(resolveResult.obj, resolveResult.attributeName, cloneNode, module.bindList, args);
                else
                    module.bindList.apply(module, args);
                
            },

            parseTemplateName: function (templateName) {

                var result = {
                    templateName: null,
                    parameterNames: this.bindObjectParameters.slice(0)
                };

                // split into template name and parameters
                var parts = templateName.split(new RegExp("\\(([^\\)]+)\\)"));

                // 1) template name
                result.templateName = parts[0];

                // 2) user template parameters
                var parameters = parts[1];
                if (!parameters) return result;

                parameters = parameters.split(",");
                for (var i = 0; i < parameters.length; i++) {
                    var parameter = parameters[i];
                    result.parameterNames.push(parameter.trim());
                }
                return result;
            },

            parseTransformationFromTemplate: function (node, bindingActive, env, parameterNames) {
                var self = this;
                var transformation = function () {
                    var context = {
                        transId: module.generateId(),
                        env: env.clone().push(arguments, transformation.parameterNames)
                    };
                    return self.cloneNode(node, null, bindingActive, context);
                };
                transformation.parameterNames = parameterNames;
                return transformation;
            },

            run: function () {
                var trans = this.parseTransformationFromTemplate(this.rootElement, false, new module.Environment(), this.bindObjectParameters);
                module.bindObject(window, this.targetElement, trans);
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
            //(new module.TemplateInterpreter(document.body)).run();
        });


        return module;
    });

})();