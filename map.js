define(["objectid"], function (objectid) {

    module = {};

    module.Node = function (parent) {};

    module.Map = function () {
        this.init.apply(this, arguments);
    };

    module.Map.prototype = {

        init: function (properties) {
            this.node = new module.Node();
            properties = properties || {};
            this.mapper = properties.mapper || new objectid.Mapper();
        },

        put: function (keys, value) {
            var node = this.node;
            for (var i = 0; i < keys.length; ++i) {
                var key = this._getKey(keys[i]);
                var subNode = node[key];
                if (subNode === undefined) {
                    if (keys.length - 1 === i) {
                        subNode = value;
                    } else {
                        subNode = new module.Node();
                    }
                    node[key] = subNode;
                }
                node = subNode;
            }
        },

        get: function (keys) {
            try {
                var node = this._get(keys);
                var result = [];
                this._makeFlat(node, [], result);
                return result;
            } catch (e) {
                return [];
            }
        },

        del: function (keys) {

            // get path with nodes
            var path;
            try {
                path = this._getNodePath(keys);
            } catch (e) {
                return;
            }

            var keyIndex = keys.length - 1;
            var pathIndex = path.length - 2;

            // delete node
            var key = this._getKey(keys[keyIndex]);
            var node = path[pathIndex];
            delete node[key];

            // clean up empty nodes starting from current node up to root node
            while (true) {

                // if there is no parent node -> end
                pathIndex--;
                if (pathIndex < 0) {
                    return;
                }

                // is empty?
                for (var propertName in node) {
                    return;
                }

                // delete 
                node = path[pathIndex];
                keyIndex--;
                key = this._getKey(keys[keyIndex]);
                delete node[key];

            }

        },

        _getKey: function (obj) {
            switch (typeof (obj)) {
            case 'function':
            case 'object':
                return "o" + this.mapper.getId(obj);
            case 'string':
                return "s" + obj;
            default:
                throw "not supported type";
            }
        },

        _getObject: function (id) {
            var type = id[0];
            var key = id.slice(1);
            switch (type) {
            case 'o':
                return this.mapper.getObject(key);
            case 's':
                return key;
            }
        },

        _get: function (keys) {
            var node = this.node;
            for (var i = 0; i < keys.length; ++i) {
                var key = this._getKey(keys[i]);
                var subNode = node[key];
                if (subNode === undefined) {
                    throw "KeyError";
                }
                node = subNode;
            }
            return node;
        },

        _getNodePath: function (keys) {
            var path = [];
            var node = this.node;
            path.push(node);
            for (var i = 0; i < keys.length; ++i) {
                var key = this._getKey(keys[i]);
                var subNode = node[key];
                if (subNode === undefined) {
                    throw "KeyError";
                }
                node = subNode;
                path.push(node);
            }
            return path;
        },

        _hasChildNodes: function (node) {
            if (node instanceof module.Node) {
                return true;
            }
            return false;
        },

        _makeFlat: function (node, path, result) {
            if (!this._hasChildNodes(node)) {
                result.push({
                    keys: path,
                    value: node
                });
                return;
            }
            for (var propertyName in node) {
                var propertyValue = node[propertyName];
                var newPath = path.slice();
                newPath.push(this._getObject(propertyName));
                this._makeFlat(propertyValue, newPath, result);
            }
        }

    };

    return module;

});