/*global window */
/*global document */
/*global setTimeout */
/*global Node */

/* sub */
/* remove connect */

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
        // property
        // ===================================================================        
        module.Property = function () {
            this.init.apply(this, arguments);
        };

        module.Property.prototype = {

            init: function (parameter) {
                this.parent = parameter.parent;
                this.object = parameter.object;
                this.name = parameter.name;
                this.initialValue = parameter.value;
            },

            set: function (value) {
                this.object[setterName(this.name)].apply(this.object, [value]);
                return this;
            },

            get: function () {
                if (this.name)
                    return this.object[this.name];
                else
                    return this.initialValue;
            },

            value: function (val) {
                if (arguments.length === 0)
                    return this.get();
                else
                    return this.set(val);
            },

            subscribe: function (node, handler) {
                generateSetter(this.object, this.name);
                eventing.subscribeToMethodCall(this.object, setterName(this.name), node, handler);
                return this;
            },

            resolve: function (path) {

                // self
                if (path === '.') return this;

                // start from root
                if (path[0] === '/') {
                    if (this.parent)
                        return this.parent.resolve(path);
                    else
                        path = path.slice(1);
                }

                // nagivate to parent
                if (path.indexOf('../') === 0) {
                    if (!this.parent) return null;
                    return this.parent.resolve(path.slice(3));
                }

                // split into parts
                var parts = path.split(new RegExp("[\\.\\[\\]/]", "g")).filter(function (part) {
                    return part.length > 0;
                });

                // resolve parts recursively
                return this.resolveParts(parts, 0);
            },

            resolveParts: function (parts, pathIndex) {

                var part = parts[pathIndex];
                var obj = this.value();
                var newProperty;

                if (Object.prototype.toString.call(obj) === '[object Array]') {
                    var listIndex = parseInt(part);
                    if (!obj[listIndex]) return null;
                    newProperty = module.makeListItemProperty(obj[listIndex], obj, this);
                } else {
                    if (!obj[part]) return null;
                    newProperty = module.makeProperty(obj, part, this);
                }

                pathIndex++;
                if (pathIndex < parts.length)
                    return newProperty.resolveParts(parts, pathIndex);
                else
                    return newProperty;


            }
        };

        // ===================================================================
        // poperty factory
        // ===================================================================
        module.makeProperty = function (object, name, parent) {
            return new module.Property({
                parent: parent,
                object: object,
                name: name
            });
        };

        module.makeStaticProperty = function (value, parent) {
            return new module.Property({
                parent: parent,
                value: value
            });
        };

        module.makeListItemProperty = function (listItem, list, parent) {
            return new module.Property({
                parent: parent,
                object: list,
                value: listItem
            });
        };

        module.wrapAsProperty = function (obj) {
            if (obj instanceof module.Property)
                return obj;
            return module.makeStaticProperty(obj);
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
            if (property.name) property.subscribe(node, function () {
                node.nodeValue = property.value();
            });
        };

        module.bindStringInput = function (property, node, trans1, trans2) {
            property = module.wrapAsProperty(property);
            node.value = property.value();
            if (property.name) {
                property.subscribe(node, function () {
                    node.value = property.value();
                });
                node.addEventListener('change', function () {
                    property.set(node.value);
                });
            } else {
                node.addEventListener('change', function () {
                    var index = property.object.indexOf(property.value());
                    if (index < 0) return;
                    property.object.splice(index, 1, node.value);
                });
            }
        };

        module.bindStringElement = function (property, node, trans1) {
            property = module.wrapAsProperty(property);
            node.textContent = property.value();
            if (property.name) property.subscribe(node, function () {
                node.textContent = property.value();
            });
        };

        module.bindCheckbox = function (property, node, trans1, trans2) {
            property = module.wrapAsProperty(property);
            node.checked = trans1 ? trans1(property.value()) : property.value();
            if (property.name) {
                property.subscribe(node, function () {
                    node.checked = trans1 ? trans1(property.value()) : property.value();
                });
                node.addEventListener('change', function () {
                    property.set(trans2 ? trans2(node.checked) : node.checked);
                });
            } else {
                node.addEventListener('change', function () {
                    var index = property.object.indexOf(property.value());
                    if (index < 0) return;
                    property.object.splice(index, 1, trans2 ? trans2(node.checked) : node.checked);
                });
            }
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

            if (property.name) property.subscribe(node, function () {
                bind();
            });

        };

        // ===================================================================
        // bind object
        // ===================================================================        
        module.bindObject = function (property, node, trans, parameters) {
            property = module.wrapAsProperty(property);
            trans(property, node, null, parameters);
            if (property.name && module.getType(property.value()) !== 'simple') property.subscribe(node, function () {
                module.unbindChildren(node);
                node.innerHTML = "";
                trans(property, node, null, parameters);
            });
        };

        // ===================================================================
        // bind list to dom element (ul)
        // ===================================================================        
        module.bindList = function (property, node, transItem) {
            property = module.wrapAsProperty(property);

            var bind = function (list) {

                // initial fill
                for (var j = 0; j < list.length; j++) {
                    var element = list[j];
                    var elementProperty = module.makeListItemProperty(element, list, property);
                    transItem(elementProperty, node);
                }

                // subscribe to push
                eventing.subscribeToMethodCall(list, "push", node, function (event) {
                    var element = event.message.args[0];
                    var elementProperty = module.makeListItemProperty(element, list, property);
                    transItem(elementProperty, node);
                });

                // subscribe to splice
                eventing.subscribeToMethodCall(list, "splice", node, function (event) {
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
                        var listElement = args[i];
                        var elementProperty = module.makeListItemProperty(listElement, list, property);
                        transItem(elementProperty, domList, refElement);
                    }
                });

            };

            // initial bind
            bind(property.value());

            // register for propert changes
            if (property.name) property.subscribe(node, function () {
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

                for (var propertyName in obj) {
                    if (!obj.hasOwnProperty(propertyName)) continue;
                    var value = obj[propertyName];
                    if (typeof (value) === 'function') continue;
                    if (propertyName[0] === '_') continue;
                    list.push(generateItem(obj, propertyName, value));
                }

                // bind list
                var listProperty = module.makeStaticProperty(list, propertyName);
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
            if (property.name) property.subscribe(node, function () {
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
        module.script = function (script, delayed) {
            var scriptTags = document.getElementsByTagName('SCRIPT');
            var scriptTag = scriptTags.item(scriptTags.length - 1);
            scriptTag.templateScript = script;
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
            },

            set: function (name, value) {
                this.data[name] = value;
            },

            get: function (name) {
                for (var i = this.stack.length - 1; i >= 0; --i) {
                    var data = this.stack[i];
                    var value = data[name];
                    if (value) return value;
                }
                return null;
            }

            /*            set: function (path, value) {
                return this.resolve(path).set(value);
            },

            get: function (path) {
                return this.resolve(path).get();
            },

            value: function (path, value) {
                if (arguments.length === 1)
                    return this.get(path);
                else
                    return this.set(path, value);
            },

            resolve: function (path) {

                // split
                var splitted = this.splitParameter(path);
                var parameter = splitted.parameter;
                path = splitted.path;

                // resolve
                for (var i = this.stack.length - 1; i >= 0; --i) {
                    var data = this.stack[i];
                    var result = data[parameter].resolve(path);
                    if (result) return result;
                }

                return null;
            },

            splitParameter: function (path) {
                if (path[0] !== '$') {
                    return {
                        parameter: 'self',
                        path: path
                    };
                } else {
                    var parts = path.split(new RegExp("[:]", "g"));
                    if (parts.length === 1)
                        return {
                            parameter: parts[0].slice(1),
                            path: '.'
                        };
                    else
                        return {
                            parameter: parts[0].slice(1),
                            path: path.slice(parts[0].length + 1)
                        };
                }
            }*/

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
        module.parseTransformationFromTemplate = function (node, env) {

            return function () {
                new module.TemplateExecutor(node, env, arguments).execute();
            };

        };

        // ===================================================================
        // template transformation executor
        // ===================================================================        
        module.TemplateExecutor = function () {
            this.init.apply(this, arguments);
        };

        module.TemplateExecutor.prototype = {

            init: function (node, env, args) {

                this.node = node;

                if (env)
                    this.env = env.clone();
                else
                    this.env = new module.Environment();
                this.env.push({
                    'id': module.generateId(),
                    'self': args[0],
                    'node': args[1],
                    'refNode': args[2]
                });

                var parameters = args[3];
                if (parameters) {
                    for (var i = 0; i < parameters.length; ++i) {
                        var parameter = parameters[i];
                        this.env.data['param' + i] = parameter;
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

            processDefTemplate: function (node) {
                if (!node.getAttribute || !node.getAttribute('data-def-template')) return false;
                var transName = node.getAttribute('data-def-template');
                node.removeAttribute('data-def-template');
                module.transformations[transName] = module.parseTransformationFromTemplate(node, this.env);
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
                        return document.getElementById(id + "#" + this.env.data.id);
                    },
                    resolve: function (path) {
                        return self.resolveBinding(path);
                    }
                };
                node.templateScript.apply(node, [info]);
                return true;
            },

            cloneNode: function (node, targetParentNode, targetRefNode) {

                if (this.processDefTemplate(node)) return;
                if (this.processTextNode(node, targetParentNode, targetRefNode)) return;
                if (this.processScript(node, targetParentNode, targetRefNode)) return;

                var cloneNode = node.cloneNode(false);
                if (cloneNode.hasAttribute && cloneNode.hasAttribute('id'))
                    cloneNode.setAttribute('id', cloneNode.getAttribute('id') + '#' + this.env.data.id);
                this.processElementAttributes(cloneNode);
                if (targetRefNode)
                    targetParentNode.insertBefore(cloneNode, targetRefNode);
                else
                    targetParentNode.appendChild(cloneNode);

                var binding = this.parseBindAttribute(node);
                if (!binding) {
                    this.cloneChildrenNodes(node, cloneNode);
                    return;
                }

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
                    binding.type = module.getType(binding.property.value());
                    binding.path = bind;
                } else {
                    binding.property = this.resolveBinding(parts[1]);
                    binding.type = parts[0];
                    binding.path = bind;
                }

                return binding;
            },

            resolveBinding: function (path) {

                var self = this;

                if (path === 'param1/code') {
                    var dummy;
                }

                var splitPath = function (path) {
                    return path.split(new RegExp("[\\./]"), 2);
                };

                var resolve = function (propertyName, path) {
                    for (var i = self.env.stack.length - 1; i >= 0; --i) {
                        var data = self.env.stack[i];
                        var property = data[propertyName];
                        if (!(property instanceof module.Property)) continue;
                        property = property.resolve(path);
                        if (property) return property;
                    }
                    return null;
                };

                if (path[0] === '.' || path[0] === '/') {
                    return resolve('self', path);
                }

                var parts = splitPath(path);
                if (parts[0].indexOf('param') === 0) {
                    if (parts.length === 1) parts[1] = '.';
                    return resolve(parts[0], parts[1]);
                } else {
                    return resolve('self', path);
                }



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

        return module;
    });

})();