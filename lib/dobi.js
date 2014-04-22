/*global window */
/*global document */
/*global setTimeout */
/*global Node */
/*global XMLHttpRequest*/
/*global console*/

/* sub */
/* remove connect */

(function () {

    var define = window.define || function (deps, mod) {
            window.dobiRoot = window.dobiRoot || {};
            window.dobi = window.dobiRoot.dobi = mod(window.dobiRoot.eventing, window.dobiRoot.property);
        };

    define(["lib/eventing", "lib/property"], function (eventing, property) {

        var module = {};

        // ===================================================================
        // start template processor
        // ===================================================================
        module.run = function (rootScope, templateNode, targetNode) {
            if (!targetNode) {
                targetNode = document.createElement('div');
                document.body.appendChild(targetNode);
            }
            module.bindObject(rootScope, targetNode, module.parseTransformationFromTemplate(templateNode));
            templateNode.parentNode.removeChild(templateNode);
        };

        // ===================================================================
        // load html
        // ===================================================================
        module.loadHtml = function (path) {
            var request = new XMLHttpRequest();
            request.open('GET', path, false);
            request.send(null);
            if (request.status !== 200)
                throw "HTTP GET failed:" + path;
            document.write(request.responseText); // jshint ignore:line
        };


        // ===================================================================
        // unbind dom element
        // ===================================================================        
        module.unbind = function (node) {
            eventing.deleteSubscriptions(node);
            for (var i = 0; i < node.childNodes.length; ++i) {
                var child = node.childNodes.item(i);
                module.unbind(child);
            }
        };

        // ===================================================================
        // unbind children
        // ===================================================================        
        module.unbindChildren = function (node) {
            for (var i = 0; i < node.childNodes.length; ++i) {
                var child = node.childNodes.item(i);
                module.unbind(child);
            }
        };

        // ===================================================================
        // bind string
        // ===================================================================        
        module.bindString = function (property, node, trans1, trans2) {
            if (node.nodeType === Node.TEXT_NODE) {
                module.bindTextNode(property, node, trans1, trans2);
            } else {
                if (node.tagName === 'INPUT') {
                    if (node.getAttribute('type') === 'checkbox')
                        module.bindCheckbox(property, node, trans1, trans2);
                    else
                        module.bindStringInput(property, node, trans1, trans2);
                } else {
                    module.bindStringElement(property, node, trans1);
                }
            }
        };

        module.bindTextNode = function (property, node, trans1) {
            property = module.wrapAsProperty(property);
            node.nodeValue = property.value();
            property.subscribe(node, function () {
                node.nodeValue = property.value();
            });
        };

        module.bindStringInput = function (property, node, trans1, trans2) {
            property = module.wrapAsProperty(property);
            node.value = property.value();
            property.subscribe(node, function () {
                node.value = property.value();
            });
            node.addEventListener('change', function (e) {
                property.set(node.value);
            });
        };

        module.bindStringElement = function (property, node, trans1) {
            property = module.wrapAsProperty(property);
            node.textContent = property.value();
            property.subscribe(node, function () {
                node.textContent = property.value();
            });
        };

        module.bindCheckbox = function (property, node, trans1, trans2) {
            property = module.wrapAsProperty(property);
            node.checked = trans1 ? trans1(property.value()) : property.value();
            property.subscribe(node, function () {
                node.checked = trans1 ? trans1(property.value()) : property.value();
            });
            node.addEventListener('change', function () {
                property.set(trans2 ? trans2(node.checked) : node.checked);
            });
        };

        // ===================================================================
        // bind attribute of an object to an attribute of a dom element
        // ===================================================================        
        module.bindAttributeToElementAttribute = function (property, attributeName, node, trans) {

            var bind = function () {
                var val = trans ? trans(property.value()) : property.value();
                if (val === '$remove')
                    node.removeAttribute(attributeName);
                else
                    node.setAttribute(attributeName, val);
            };

            bind();

            if (property.path) property.subscribe(node, function () {
                bind();
            });

        };

        // ===================================================================
        // bind object
        // ===================================================================        
        module.bindObject = function (property, node, trans, parameters) {
            property = module.wrapAsProperty(property);
            if (property.value() !== null) trans(property, node, null, parameters);
            if (property.path && module.getType(property.value()) !== 'simple') property.subscribe(node, function () {
                module.unbindChildren(node);
                node.innerHTML = "";
                if (property.value() !== null) trans(property, node, null, parameters);
            });
        };

        // ===================================================================
        // bind list to dom element (ul)
        // ===================================================================        
        module.bindList = function (property, node, transItem) {
            property = module.wrapAsProperty(property);

            var dummy = function () {};

            var createItem = function (list, listIndex, parentNode, refNode) {
                var elementProperty = module.listItemProperty(list, listIndex);
                transItem(elementProperty, parentNode, refNode);
                elementProperty.subscribe(parentNode.children.item(listIndex), dummy);
            };

            var bind = function (list) {

                if (!list) return;

                // initial fill
                for (var j = 0; j < list.length; j++) {
                    createItem(list, j, node, null);
                }

                // event revceiver                
                property.listEventTarget = document.createTextNode('');
                node.appendChild(property.listEventTarget);

                // subscribe to push
                eventing.subscribeToMethodCall(list, "push", property.listEventTarget, function (event) {
                    createItem(list, list.length - 1, node, null);
                });

                // subscribe to splice
                eventing.subscribeToMethodCall(list, "splice", property.listEventTarget, function (event) {
                    // parse arguments
                    var args = event.message.args;
                    var index = args[0];
                    var numberDel = args[1];
                    var domList = node;
                    // delete
                    var children = domList.children;
                    for (i = 0; i < numberDel; ++i) {
                        var element = children.item(index);
                        module.unbind(element);
                        element.parentNode.removeChild(element);
                    }
                    // insert
                    var refElement = children.item(index);
                    for (var i = 2; i < args.length; ++i) {
                        createItem(list, index + i - 2, domList, refElement);
                    }
                });

            };

            // initial bind
            bind(property.value());

            // register for propert changes
            if (property.path) property.subscribe(node, function () {
                module.unbindChildren(node);
                node.innerHTML = "";
                bind(property.value());
            });

        };

        // ===================================================================
        // bind dic to dom element 
        // ===================================================================        
        module.bindDict = function (property, node, transItem) {
            property = module.wrapAsProperty(property);

            // generate item
            // ---------------------------------------------------------------
            var generateItem = function (obj, propertyName, value) {
                var item = {
                    key: propertyName,
                    origKey: propertyName,
                    value: value
                };
                eventing.setAutoDelete(item, 2);
                property.generateSetter(item, 'key');
                property.generateSetter(item, 'value');
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


            // bind
            // ---------------------------------------------------------------
            var bind = function () {

                var obj = property.value();

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

                // create list from dict
                var list = [];
                eventing.setAutoDelete(list, 0);

                for (var propertyName in obj) {
                    if (!obj.hasOwnProperty(propertyName)) continue;
                    var value = obj[propertyName];
                    if (typeof (value) === 'function') continue;
                    if (propertyName[0] === '_') continue;
                    list.push(generateItem(obj, propertyName, value));
                }

                // bind list
                var listProperty = module.staticProperty(list);
                module.bindList(listProperty, node, transItem);

                eventing.subscribe(obj, 'KeyAdded', list, function (event) {
                    var key = event.message.key;
                    var value = event.message.value;
                    list.push(generateItem(obj, key, value));
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

            // initial bind
            // ---------------------------------------------------------------
            bind();

            // register for property changes
            // ---------------------------------------------------------------
            if (property.path) property.subscribe(node, function () {
                module.unbindChildren(node);
                node.innerHTML = "";
                bind();
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
        module.script = function (script) {
            var scriptTags = document.getElementsByTagName('SCRIPT');
            var scriptTag = scriptTags.item(scriptTags.length - 1);
            scriptTag.templateScript = script;
            /*            if(module.scriptInfo)
                script(module.scriptInfo);*/
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

            push: function (data) {
                this.stack.push(data);
                this.data = this.stack[this.stack.length - 1];
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
                if (Object.prototype.toString.call(obj) === '[object Array]') return 'list';
                return 'object';
            }
            throw "Not supported type:" + typeof (obj);
        };

        // ===================================================================
        // global transformation
        // ===================================================================        
        module.transformations = {};

        // ===================================================================
        // create transformation function from template
        // ===================================================================        
        module.parseTransformationFromTemplate = function (node, env, parameterNames) {

            return function () {
                new module.TemplateExecutor(node, env, parameterNames, arguments).execute();
            };

        };

        // ===================================================================
        // insert node
        // ===================================================================        
        module.insertNode = function (node, parentNode, refNode) {
            if (refNode)
                parentNode.insertBefore(node, refNode);
            else
                parentNode.appendChild(node);
        };

        // ===================================================================
        // template transformation executor
        // ===================================================================        
        module.TemplateExecutor = function () {
            this.init.apply(this, arguments);
        };

        module.TemplateExecutor.prototype = {

            init: function (node, env, parameterNames, args) {

                this.node = node;

                if (env)
                    this.env = env.clone();
                else
                    this.env = new module.Environment();

                this.env.push({
                    'transId': module.generateId(),
                    'self': args[0],
                    'node': args[1],
                    'refNode': args[2]
                });

                var parameters = args[3];
                if (parameters) {
                    for (var i = 0; i < parameters.length; ++i) {
                        var parameter = parameters[i];
                        this.env.data['param' + i] = parameter;
                        var name = parameterNames[i];
                        if (name) this.env.data[name] = parameter;
                    }
                }

            },

            execute: function () {
                this.cloneChildrenNodes(this.node, this.env.data.node, this.env.data.refNode);
            },

            cloneChildrenNodes: function (parentNode, targetParentNode, targetRefNode) {
                for (var i = 0; i < parentNode.childNodes.length; ++i) {
                    var node = parentNode.childNodes.item(i);
                    this.cloneNode(node, targetParentNode, targetRefNode);
                }
            },

            parseTemplateDefAttribute: function (value) {

                var result = {
                    templateName: null,
                    parameterNames: []
                };

                // split into template name and parameters
                var parts = value.split(new RegExp("\\(([^\\)]+)\\)"));

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

            processDefTemplate: function (node) {
                if (!node.getAttribute || !node.getAttribute('data-def-template')) return false;
                var value = node.getAttribute('data-def-template');
                node.removeAttribute('data-def-template');
                var parseResult = this.parseTemplateDefAttribute(value);
                module.transformations[parseResult.templateName] = module.parseTransformationFromTemplate(node, this.env, parseResult.parameterNames);
                node.parentNode.removeChild(node);
                return true;
            },

            processTextNode: function (node, targetParentNode, targetRefNode) {
                if (node.nodeType !== Node.TEXT_NODE) return false;
                var parts = node.nodeValue.split(new RegExp("{{([^}]+)}}"));
                for (var i = 0; i < parts.length; i++) {
                    var cloneNode;
                    var part = parts[i];
                    if (i % 2 === 0) {
                        // no match
                        cloneNode = document.createTextNode(part);
                    } else {
                        // match
                        var bindProperty = this.resolveBinding(part);
                        if (module.getType(bindProperty.value()) !== 'simple') continue;
                        cloneNode = document.createTextNode("");
                        module.bindString(bindProperty, cloneNode);
                    }
                    if (targetRefNode)
                        targetParentNode.insertBefore(cloneNode, targetRefNode);
                    else
                        targetParentNode.appendChild(cloneNode);
                }
                return true;
            },

            processElementAttributes: function (cloneNode) {
                if (!cloneNode.hasAttribute) return;
                var matcher = new RegExp("{{(.*)}}");
                for (var i = 0; i < cloneNode.attributes.length; i++) {
                    var attribute = cloneNode.attributes.item(i);
                    var match = matcher.exec(attribute.value);
                    if (!match) continue;
                    var bindName = match[1];
                    var property = this.resolveBinding(bindName);
                    if (module.getType(property.value()) !== 'simple') return;
                    var attrName;
                    if (cloneNode.tagName === 'IMG' && attribute.name === 'data-src') {
                        cloneNode.removeAttribute(attribute.name);
                        attrName = 'src';
                    } else {
                        attrName = attribute.name;
                    }
                    module.bindAttributeToElementAttribute(property, attrName, cloneNode);
                }
            },

            processScript: function (node, targetParentNode, targetRefNode) {
                var self = this;
                if (!node.tagName || node.tagName !== 'SCRIPT' || !node.templateScript) return false;
                var info = {
                    env: this.env,
                    parentNode: targetParentNode,
                    refNode: targetRefNode,
                    getElementById: function (id) {
                        return document.getElementById(id + "#" + this.env.data.transId);
                    },
                    resolve: function (path) {
                        return self.resolveBinding(path);
                    },
                    resolveValue: function (path) {
                        return this.resolve(path).value();
                    }
                };
                //module.scriptInfo = info;
                // eval(node.textContent);
                //module.scriptInfo = null;
                node.templateScript.apply(node, [info]);
                return true;
            },

            cloneNode: function (node, targetParentNode, targetRefNode) {

                if (this.processDefTemplate(node)) return;
                if (this.processTextNode(node, targetParentNode, targetRefNode)) return;
                if (this.processScript(node, targetParentNode, targetRefNode)) return;

                var cloneNode = node.cloneNode(false);
                if (cloneNode.hasAttribute && cloneNode.hasAttribute('id'))
                    cloneNode.setAttribute('id', cloneNode.getAttribute('id') + '#' + this.env.data.transId);
                this.processElementAttributes(cloneNode);
                module.insertNode(cloneNode, targetParentNode, targetRefNode);

                var binding = this.parseBindAttribute(node);
                if (!binding) {
                    this.cloneChildrenNodes(node, cloneNode);
                    return;
                }

                if (!binding.property) return;

                var trans = this.getTransformation(node);

                switch (binding.type) {
                case 'list':
                    module.bindList(binding.property, cloneNode, trans);
                    break;
                case 'dict':
                    module.bindDict(binding.property, cloneNode, trans);
                    break;
                case 'object':
                    module.bindObject(binding.property, cloneNode, trans, this.getTransformationParameters(node));
                    break;
                case 'simple':
                    if (trans)
                        module.bindObject(binding.property, cloneNode, trans, this.getTransformationParameters(node));
                    else
                        module.bindString(binding.property, cloneNode);
                    break;
                }

            },

            parseBindAttribute: function (node) {

                if (!node.getAttribute) return false;

                var bind = node.getAttribute('data-bind');
                if (!bind) return false;

                var parts = bind.split(new RegExp(":"));
                var binding = {};

                if (parts.length === 1) {
                    binding.property = this.resolveBinding(parts[0]);
                    if (binding.property)
                        binding.type = module.getType(binding.property.value());
                    binding.path = bind;
                } else {
                    binding.property = this.resolveBinding(parts[1]);
                    binding.type = parts[0];
                    binding.path = bind;
                }

                if (binding.property === null)
                    throw "Cannot resolve binding:" + bind;

                return binding;
            },

            resolveBinding: function (path) {

                var self = this;

                if (path === 'Name') {
                    var dummy;
                }

                var moveUp = function (path) {
                    var parentLevel = 0;
                    while (path.indexOf("../") === 0) {
                        parentLevel++;
                        path = path.slice(3);
                    }
                    return {
                        parentLevel: parentLevel,
                        path: path
                    };
                };

                var resolve = function (index, name, path) {
                    for (var i = index; i >= 0; --i) {

                        // get property by name
                        var data = self.env.stack[i];
                        var property = data[name];
                        if (property === undefined) continue;

                        // make property if not
                        if (!(property instanceof module.Property))
                            property = module.staticProperty(property);

                        // resolve path
                        if (!path) {
                            return property;
                        } else {
                            property = module.property(property.value(), path);
                            if (property.isFullyResolved()) return property;
                        }
                    }

                    return null;
                };

                // move up in the stack according to '../' path prefixes
                var result = moveUp(path);
                var stackIndex = self.env.stack.length - result.parentLevel - 1;
                path = result.path;

                // check for root
                if (path[0] === '/') {
                    stackIndex = 0;
                    path = path.slice(1);
                }

                // check for self
                if (path === '' || path === '.') return self.env.stack[stackIndex].self;

                // split path into parameter and remaining path
                var parts = path.split(new RegExp("[/]"), 2);

                // resolve
                var property = resolve(stackIndex, parts[0], parts[1]);
                if (property) return property;
                property = resolve(stackIndex, 'self', path);
                return property;
            },

            getTransformation: function (node) {
                if (node.hasAttribute('data-template')) {
                    var transformationName = node.getAttribute('data-template');
                    return module.transformations[transformationName];
                } else {
                    if (node.childNodes.length > 0)
                        return module.parseTransformationFromTemplate(node, this.env);
                    else
                        return null;
                }
            },

            getTransformationParameters: function (node) {
                var args = [];
                if (!node.hasAttribute('data-template-parameters')) return args;
                var parameters = node.getAttribute('data-template-parameters').split(',');
                for (var i = 0; i < parameters.length; i++) {
                    var parameter = parameters[i];
                    args.push(this.resolveBinding(parameter));
                }
                return args;
            }

        };

        // ===================================================================
        // property unit tests
        // ===================================================================        
        module.testProperties = function () {

            var assert = function (cond, text) {
                if (!cond) console.log('ERROR ', text);
            };
            var compare = function (real, expected, text) {
                if (real !== expected) console.log('ERROR ', real, "!==", expected, text);
            };
            var checkException = function (job) {
                var except = false;
                try {
                    job();
                } catch (e) {
                    except = true;
                }
                if (!except) console.log('ERROR missing expected exception');
            };

            // ---------------------------------------------------------------
            // get tests
            // ---------------------------------------------------------------

            // test data
            var salesOrder = {
                status: {
                    code: 1,
                    subStatus: {
                        code: 2
                    }
                },
                items: [{
                    pos: 10
                }, {
                    pos: 20
                }]
            };

            // get 
            compare(new module.Property({
                object: salesOrder,
                path: 'status/subStatus/code'
            }).value(), 2);

            compare(new module.Property({
                object: salesOrder,
                path: 'status/code'
            }).value(), 1);

            compare(new module.Property({
                object: salesOrder,
                path: 'items/0/pos'
            }).value(), 10);

            compare(new module.Property({
                object: salesOrder,
                path: 'status'
            }).value(), salesOrder.status);

            compare(new module.Property({
                object: salesOrder,
                path: 'items/0'
            }).value(), salesOrder.items[0]);

            // ---------------------------------------------------------------
            // set/get tests
            // ---------------------------------------------------------------
            var p = new module.Property({
                object: salesOrder,
                path: 'status/code'
            });
            compare(p.value(), 1);
            p.value(10);
            compare(p.value(), 10);

            p = new module.Property({
                object: salesOrder,
                path: 'items/0/pos'
            });
            compare(p.value(), 10);
            p.value(15);
            compare(p.value(), 15);

            p = new module.Property({
                object: salesOrder,
                path: 'items/0'
            });
            compare(p.value(), salesOrder.items[0]);
            var item = {
                pos: 16
            };
            p.value(item);
            compare(p.value(), item);
            compare(new module.Property({
                object: salesOrder,
                path: 'items/0/pos'
            }).value(), 16);

            // ---------------------------------------------------------------
            // subscribe
            // ---------------------------------------------------------------

            // reset test data
            salesOrder = {
                status: {
                    code: 1,
                    subStatus: {
                        code: 2
                    }
                },
                items: [{
                    pos: 10
                }, {
                    pos: 20
                }]
            };

            p = new module.Property({
                object: salesOrder,
                path: 'status/subStatus/code'
            });

            var r = {
                message: null,
                listen: function (event) {
                    this.message = event.message;
                }
            };

            // subscribe
            p.subscribe(r, r.listen);

            // set
            p.set(3);
            compare(r.message, 3);

            var oldSubStatus = salesOrder.status.subStatus;
            var subStatus = {
                code: 4
            };
            compare(oldSubStatus.__eventing__.receivers.setCode.length, 1);

            // set substatus
            salesOrder.status.setSubStatus(subStatus);
            compare(r.message, 4);
            compare(oldSubStatus.__eventing__.receivers.setCode.length, 0);
            compare(subStatus.__eventing__.receivers.setCode.length, 1);

            // unsubcribe
            p.unSubscribe(r, r.listen);
            compare(subStatus.__eventing__.receivers.setCode.length, 0);

            // resubscribe
            p.subscribe(r, r.listen);
            compare(salesOrder.__eventing__.receivers.setStatus.length, 1);
            compare(salesOrder.status.__eventing__.receivers.setSubStatus.length, 1);
            compare(salesOrder.status.subStatus.__eventing__.receivers.setCode.length, 1);

            // change
            p.set(5);
            compare(r.message, 5);

            // delete target 
            eventing.deleteSubscriptions(r);
            compare(salesOrder.__eventing__.receivers.setStatus.length, 0);
            compare(salesOrder.status.__eventing__.receivers.setSubStatus.length, 0);
            compare(salesOrder.status.subStatus.__eventing__.receivers.setCode.length, 0);

            // ---------------------------------------------------------------
            // create property/ set list propr/ static prop
            // ---------------------------------------------------------------
            p = module.property(salesOrder, 'status/subStatus/code');
            compare(p.value(), 5);

            p = module.staticProperty(3);
            compare(p.value(), 3);
            checkException(function () {
                p.set(5);
            });

            // ---------------------------------------------------------------
            // list change
            // ---------------------------------------------------------------
            // reset test data
            salesOrder = {
                status: {
                    code: 1,
                    subStatus: {
                        code: 2
                    }
                },
                items: [{
                    pos: 10
                }, {
                    pos: 20
                }]
            };

            p = module.property(salesOrder, 'items/1/pos');
            p.subscribe(r, r.listen);

            r.message = 'init';
            salesOrder.items.splice(0, 1, {
                pos: 5
            });
            compare(r.message, 'init');

            r.message = 'init';
            salesOrder.items.splice(2, 1, {
                pos: 25
            });
            compare(r.message, 'init');

            r.message = 'init';
            salesOrder.items.splice(1, 1, {
                pos: 15
            });
            compare(p.path, "-1");

            console.log("unit ready");

        };

        // ===================================================================
        // list item property test
        // ===================================================================        
        module.listItemPropertyTest = function () {
            console.log('Test');

            var l = ['0', '1', '2'];

            var p = module.listItemProperty(l, 1);
            l.splice(0, 0, 'x');

            console.log("end");

        };

        return module;
    });

})();