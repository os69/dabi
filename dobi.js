/*global window */
/*global document */
/*global setTimeout */
/*global Node */

/* sub / script */
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
            },

            value: function () {
                if (this.name)
                    return this.object[this.name];
                else
                    return this.initialValue;
            },

            subscribe: function (node, handler) {
                generateSetter(this.object, this.name);
                eventing.decorate(this.object, setterName(this.name));
                eventing.subscribe(this.object, setterName(this.name), node, handler);
            },

            resolve: function (path) {

                if (path === '.') return this;

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
                    newProperty = module.makeListItemPropertyProperty(obj[listIndex], obj, this);
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
                if (node.tagName === 'INPUT')
                    module.bindStringInput(property, node, trans1, trans2);
                else
                    module.bindStringElement(property, node, trans1);
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
                if (property.name) property.subscribe(node, function () {
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
        module.bindObject = function (property, node, trans) {
            property = module.wrapAsProperty(property);
            trans(property, node);
            if (property.name && module.getType(property.value()) !== 'simple') property.subscribe(node, function () {
                module.unbindChildren(node);
                node.innerHTML = "";
                trans(property, node);
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

                eventing.connect(list, "push", node, "appendChild", function (element) {
                    var elementProperty = module.makeListItemProperty(element, list, property);
                    transItem(elementProperty, node);
                    return eventing.noMethodCall;
                });

                eventing.connect(list, "splice", node, "splice", function () {
                    // parse arguments
                    var index = arguments[0];
                    var numberDel = arguments[1];
                    var list = arguments[arguments.length - 2];
                    var domList = arguments[arguments.length - 1];
                    // delete
                    var children = domList.children;
                    for (i = 0; i < numberDel; ++i) {
                        var element = children.item(index);
                        module.unbind(element);
                        element.parentNode.removeChild(element);
                    }
                    // insert
                    var refElement = children.item(index);
                    for (var i = 2; i < arguments.length - 2; ++i) {
                        var listElement = arguments[i];
                        var elementProperty = module.makeListItemProperty(listElement, list, property);
                        transItem(elementProperty, domList, refElement);
                    }
                    return eventing.noMethodCall;
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

            resolve: function (path) {
                for (var i = this.stack.length - 1; i >= 0; --i) {
                    var data = this.stack[i];
                    var result = data.self.resolve(path);
                    if (result) return result;
                }
                return null;
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
                        var bindProperty = this.env.resolve(part);
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
                    var property = this.env.resolve(bindName);
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

            processScript : function(node){
                if(!node.tagName || node.tagName!=='SCRIPT') return false;
                node.templateScript.apply(node,[this.env]);
                return true;
            },
            
            cloneNode: function (node, targetParentNode, targetRefNode) {

                if (this.processDefTemplate(node)) return;
                if (this.processTextNode(node, targetParentNode, targetRefNode)) return;
                if(this.processScript(node)) return;

                var cloneNode = node.cloneNode(false);
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

                if (binding.bindName === '.') {
                    var b;
                }
                var bindProperty = this.env.resolve(binding.bindName);
                if (!bindProperty) {
                    var a;
                }

                var trans = this.getTransformation(node);

                switch (binding.bindType || module.getType(bindProperty.value())) {
                case 'list':
                    module.bindList(bindProperty, cloneNode, trans);
                    break;
                case 'dict':
                    module.bindDict(bindProperty, cloneNode, trans);
                    break;
                case 'object':
                    module.bindObject(bindProperty, cloneNode, trans);
                    break;
                case 'simple':
                    if (trans)
                        module.bindObject(bindProperty, cloneNode, trans);
                    else
                        module.bindString(bindProperty, cloneNode);
                    break;
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



        };

        return module;
    });

})();