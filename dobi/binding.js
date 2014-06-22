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
        window.dobi = window.dobi || {};
        window.dobi.binding = mod(window.dobi.eventing, window.dobi.property);
    };

    define(["dobi/eventing", "dobi/property"], function (eventingModule, propertyModule) {

        var module = {};

        // =======================================================================
        // simple parser
        // =======================================================================
        module.parseGroups = function (text) {
            var MATCH_OPEN_BRACE = 1;
            var MATCH_CLOSE_BRACE = 2;
            var OPEN_BRACE = '(';
            var CLOSE_BRACE = ')';
            var mode = MATCH_OPEN_BRACE;
            var tokens = [];
            var start = 0;
            var braceCounter = 0;
            for (var index = 0; index < text.length; index++) {
                var char = text[index];
                switch (mode) {
                case MATCH_OPEN_BRACE:
                    if (char === OPEN_BRACE) {
                        braceCounter++;
                        tokens.push({
                            text: text.slice(start, index),
                            type: 'text'
                        });
                        start = index + 1;
                        mode = MATCH_CLOSE_BRACE;
                    }
                    break;
                case MATCH_CLOSE_BRACE:
                    if (char === OPEN_BRACE) {
                        braceCounter++;
                        continue;
                    }
                    if (char === CLOSE_BRACE) {
                        braceCounter--;
                        if (braceCounter < 0) throw "matching brace error";
                        if (braceCounter > 0) continue;
                        tokens.push({
                            text: text.slice(start, index),
                            type: 'gtext'
                        });
                        start = index + 1;
                        mode = MATCH_OPEN_BRACE;
                        continue;
                    }
                    break;
                }
            }
            if (index > start) {
                tokens.push({
                    text: text.slice(start, index),
                    type: 'text'
                });
            }
            return tokens;
        };

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
            eventingModule.deleteSubscriptions(node);
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
        // helper: convert obj to string
        // ===================================================================        
        module.toString = function (obj) {
            if (module.getType(obj) !== 'simple') return JSON.stringify(obj);
            return obj;
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
            property = propertyModule.wrapAsProperty(property);
            node.nodeValue = module.toString(property.value());
            property.subscribe(node, function () {
                node.nodeValue = property.value();
            });
        };

        module.bindStringInput = function (property, node, trans1, trans2) {
            property = propertyModule.wrapAsProperty(property);
            node.value = module.toString(property.value());
            property.subscribe(node, function () {
                node.value = property.value();
            });
            node.addEventListener('change', function (e) {
                property.set(node.value);
            });
        };

        module.bindStringElement = function (property, node, trans1) {
            property = propertyModule.wrapAsProperty(property);
            node.textContent = module.toString(property.value());
            property.subscribe(node, function () {
                node.textContent = property.value();
            });
        };

        module.bindCheckbox = function (property, node, trans1, trans2) {
            property = propertyModule.wrapAsProperty(property);
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

            property.subscribe(node, function () {
                bind();
            });

        };

        // ===================================================================
        // bind attribute of an object to css class dom element
        // ===================================================================        
        module.bindAttributeToCssClass = function (property, node, trans) {

            var classMap = {};

            var checkCssClass = function (node, classx) {
                var r = new RegExp('(?:^|\\s)' + classx + '(?!\\S)');
                return node.className.match(r);
            };

            var addCssClass = function (node, classx) {
                if (checkCssClass(node, classx)) return;
                node.className += ' ' + classx;
            };

            var removeCssClass = function (node, classx) {
                if (!checkCssClass(node, classx)) return;
                var r = new RegExp('(?:^|\\s)' + classx + '(?!\\S)', 'g');
                node.className = node.className.replace(r, '');
            };

            var bind = function () {
                var val = trans ? trans(property.value()) : property.value();
                var classes = val.split(' ');
                for (var classx in classMap) {
                    if (classMap[classx]) {
                        if (classes.indexOf(classx) < 0) {
                            classMap[classx] = false;
                            removeCssClass(node, classx);
                        }
                    }
                }
                for (var i = 0; i < classes.length; ++i) {
                    classx = classes[i];
                    if (!classMap[classx]) {
                        classMap[classx] = true;
                        addCssClass(node, classx);
                    }
                }
            };

            bind();

            property.subscribe(node, function () {
                bind();
            });

        };

        // ===================================================================
        // bind object
        // ===================================================================        
        module.bindObject = function (property, node, trans, parameters) {

            property = propertyModule.wrapAsProperty(property);

            var getTrans = function () {
                if (trans instanceof propertyModule.Property)
                    return module.transformations[trans.value()];
                else
                    return trans;
            };

            var bind = function () {
                module.unbindChildren(node);
                node.innerHTML = "";
                var t = getTrans();
                /*if (property.value() !== null)*/
                t(property, node, null, parameters);
            };

            // register for property change
            // for simple types the binding is done within the object template
            if (module.getType(property.value()) !== 'simple') property.subscribe(node, bind);

            // register for change of transforation name
            if (trans instanceof propertyModule.Property) trans.subscribe(node, bind);

            bind();
        };

        // ===================================================================
        // bind list to dom element (ul)
        // ===================================================================        
        module.bindList = function (property, node, transItem) {
            property = propertyModule.wrapAsProperty(property);

            var dummy = function () {};

            var getTransItem = function () {
                if (transItem instanceof propertyModule.Property)
                    return module.transformations[transItem.value()];
                else
                    return transItem;
            };

            var createItem = function (list, listIndex, parentNode, refNode) {
                var elementProperty = propertyModule.listItemProperty(list, listIndex);
                var t = getTransItem();
                try {
                    t(elementProperty, parentNode, refNode);
                } catch (e) {
                    throw e;
                }
                elementProperty.subscribe(parentNode.children.item(listIndex), dummy); // TODO
            };

            var bind = function (list) {

                // clean up
                module.unbindChildren(node);
                node.innerHTML = "";

                // check for empty list
                if (!list) return;

                // initial fill
                for (var j = 0; j < list.length; j++) {
                    createItem(list, j, node, null);
                }

            };

            // initial bind
            bind(property.value());

            // register for propert changes
            property.subscribe(node, function (e) {
                var list = property.value();
                switch (e.message.type) {
                case propertyModule.PROP_EVENT_TYPE_CHANGE:
                    bind(property.value());
                    break;
                case propertyModule.PROP_EVENT_TYPE_CHANGE_PUSH:
                    createItem(list, list.length - 1, node, null);
                    break;
                case propertyModule.PROP_EVENT_TYPE_CHANGE_SPLICE:
                    // parse arguments
                    var args = e.message.originalEvent.message.args;
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
                    break;
                }
            });
            
            // register for transformation change
            if (transItem instanceof propertyModule.Property) transItem.subscribe(node, function(){
                bind(property.value());
            });

        };

        // ===================================================================
        // bind dic to dom element 
        // ===================================================================        
        module.bindDict = function (property, node, transItem) {
            property = propertyModule.wrapAsProperty(property);

            // generate item
            // ---------------------------------------------------------------
            var generateItem = function (obj, propertyName, value) {
                var item = {
                    key: propertyName,
                    origKey: propertyName,
                    value: value
                };
                eventingModule.setAutoDelete(item, 2);
                propertyModule.generateSetter(item, 'key');
                propertyModule.generateSetter(item, 'value');
                eventingModule.subscribe(item, 'setValue', item, function (event) {
                    obj.dictSet(item.key, event.message.args[0]);
                });
                eventingModule.subscribe(item, 'setKey', item, function (event) {
                    obj.dictDel(item.origKey);
                    obj.dictSet(item.key, item.value);
                });
                eventingModule.subscribe(obj, 'ValueChanged', item, function (event) {
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
                        eventingModule.raiseEvent(this, 'ValueChanged', {
                            key: key,
                            value: value
                        });
                    } else {
                        this[key] = value;
                        eventingModule.raiseEvent(this, 'KeyAdded', {
                            key: key,
                            value: value
                        });
                    }
                };

                // service for deleting a key in the dict
                obj.dictDel = obj.dictDel || function (key) {
                    delete this[key];
                    eventingModule.raiseEvent(this, 'KeyDeleted', key);
                };

                // create list from dict
                var list = [];
                eventingModule.setAutoDelete(list, 0);

                for (var propertyName in obj) {
                    if (!obj.hasOwnProperty(propertyName)) continue;
                    var value = obj[propertyName];
                    if (typeof (value) === 'function') continue;
                    if (propertyName[0] === '_') continue;
                    list.push(generateItem(obj, propertyName, value));
                }

                // bind list
                var listProperty = propertyModule.staticProperty(list);
                module.bindList(listProperty, node, transItem);

                eventingModule.subscribe(obj, 'KeyAdded', list, function (event) {
                    var key = event.message.key;
                    var value = event.message.value;
                    list.push(generateItem(obj, key, value));
                });

                eventingModule.subscribe(obj, 'KeyDeleted', list, function (event) {
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
            property.subscribe(node, function () {
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
        };
        window.dobi = window.dobi || {};
        window.dobi.script = module.script;

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
                this.adjustData();
            },

            adjustData: function () {
                if (this.stack.length === 0) return;
                this.data = this.stack[this.stack.length - 1];
            },

            clone: function () {
                var env = new module.Environment();
                env.stack = this.stack.slice(0);
                env.adjustData();
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
        // global transformations
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

            processElementAttribute: function (attribute, cloneNode) {

                // split attribute value into parts and create property for part
                var parts = attribute.value.split(new RegExp("{{([^}]+)}}"));
                var properties = [];
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i];
                    if (i % 2 === 0) {
                        // no match -> simple string value -> create static string property
                        if (part.length === 0) continue;
                        properties.push(propertyModule.staticProperty(part));
                    } else {
                        // match -> resolve binding
                        properties.push(this.resolveBinding(part));
                    }
                }

                // no properties -> return
                if (properties.length === 0) return;

                // if only one property use this one for binding otherwise create calculated property 
                var property;
                if (properties.length === 1) {
                    property = properties[0];
                    if (property.type === propertyModule.PROPERTY_TYPE_STATIC) return;
                } else {
                    property = propertyModule.calculatedProperty(function () {
                        var result = "";
                        for (var j = 0; j < properties.length; ++j) {
                            var prop = properties[j];
                            result += prop.value();
                        }
                        return result;
                    }, properties);
                }

                // bind css class attribute
                if (attribute.name === 'data-class') {
                    module.bindAttributeToCssClass(property, cloneNode);
                    return;
                }

                // bind addtribute
                var attrName;
                if (cloneNode.tagName === 'IMG' && attribute.name === 'data-src') {
                    cloneNode.removeAttribute(attribute.name);
                    attrName = 'src';
                } else {
                    attrName = attribute.name;
                }
                module.bindAttributeToElementAttribute(property, attrName, cloneNode);

            },

            processElementAttributes: function (cloneNode) {
                if (!cloneNode.hasAttribute) return;
                for (var i = 0; i < cloneNode.attributes.length; i++) {
                    var attribute = cloneNode.attributes.item(i);
                    this.processElementAttribute(attribute, cloneNode);
                }
            },

            createScriptInfo: function (targetNode, targetParentNode, targetRefNode) {
                var self = this;
                return {
                    env: self.env,
                    node: targetNode,
                    parentNode: targetParentNode,
                    refNode: targetRefNode,
                    self: self.env.data.self.value(),
                    getElementById: function (id) {
                        return document.getElementById(id + "_" + self.env.data.transId);
                    },
                    resolve: function (path) {
                        return self.resolveBinding(path);
                    },
                    resolveValue: function (path) {
                        return this.resolve(path).value();
                    }
                };
            },

            processScript: function (node, targetParentNode, targetRefNode) {
                var self = this;
                if (!node.tagName || node.tagName !== 'SCRIPT' || !node.templateScript) return false;
                var info = self.createScriptInfo(null, targetParentNode, targetRefNode);
                node.templateScript.apply(node, [info]);
                return true;
            },

            processEventScriptAttribute: function (attribute, cloneNode, targetParentNode, targetRefNode) {
                var self = this;
                var event = attribute.name.split('-')[2];
                cloneNode.addEventListener(event, function (event) {
                    var info = self.createScriptInfo(cloneNode, targetParentNode, targetRefNode);
                    eval(attribute.value); // jshint ignore:line
                });
            },

            processScriptAttributes: function (cloneNode, targetParentNode, targetRefNode) {
                if (!cloneNode.hasAttribute) return;
                for (var i = 0; i < cloneNode.attributes.length; i++) {
                    var attribute = cloneNode.attributes.item(i);
                    if (attribute.name.indexOf('data-event') >= 0)
                        this.processEventScriptAttribute(attribute, cloneNode, targetParentNode, targetRefNode);
                }
            },

            cloneNode: function (node, targetParentNode, targetRefNode) {

                if (this.processDefTemplate(node)) return;
                if (this.processTextNode(node, targetParentNode, targetRefNode)) return;
                if (this.processScript(node, targetParentNode, targetRefNode)) return;

                var cloneNode = node.cloneNode(false);
                if (cloneNode.hasAttribute && cloneNode.hasAttribute('id'))
                    cloneNode.setAttribute('id', cloneNode.getAttribute('id') + '_' + this.env.data.transId);
                this.processElementAttributes(cloneNode);
                module.insertNode(cloneNode, targetParentNode, targetRefNode);
                this.processScriptAttributes(cloneNode, targetParentNode, targetRefNode);

                var binding = this.parseBindAttribute(node);
                if (!binding) {
                    this.cloneChildrenNodes(node, cloneNode);
                    return;
                }

                if (!binding.property) return;

                var trans = this.getTransformation(node);

                if (!trans) {
                    module.bindString(binding.property, cloneNode);
                    return;
                }

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

            resolveGroups: function (path) {
                var texts = [];
                var parts = module.parseGroups(path);
                for (var i = 0; i < parts.length; ++i) {
                    var part = parts[i];
                    if (part.type === 'gtext') {
                        var property = this.resolveBinding(part.text);
                        texts.push(property.value());
                    } else {
                        texts.push(part.text);
                    }
                }
                return texts.join('');
            },

            resolveBinding: function (path) {

                // resolve {} groups in path
                var newPath = this.resolveGroups(path);

                // resolve path
                return this.doResolveBinding(newPath);
            },

            doResolveBinding: function (path) {

                var self = this;

                if (path === 'Name') {
                    var dummy;
                }

                var moveUp = function (path) {
                    var parentLevel = 0;
                    while (path.indexOf("..") === 0) {
                        parentLevel++;
                        if (path.indexOf("../") === 0)
                            path = path.slice(3);
                        else
                            path = path.slice(2);
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
                        if (!(property instanceof propertyModule.Property))
                            property = propertyModule.staticProperty(property);

                        // resolve path
                        if (!path) {
                            return property;
                        } else {
                            return propertyModule.objectProperty(property.value(), path);
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

                // check for self prefix
                if (path.slice(0, 2) === './') path = path.slice(2);

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
                    var r = new RegExp("{{([^}]+)}}");
                    var match = r.exec(transformationName);
                    if (match) {
                        var bindName = match[1];
                        var property = this.resolveBinding(bindName);
                        return property;
                    } else {
                        return module.transformations[transformationName];
                    }
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