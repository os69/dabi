/* global window*/
/* global document*/
/* global alert*/

(function (global, $, dobi, list) {


    // =======================================================================
    // test repository (load, save models)
    // =======================================================================

    global.testRepository = {

        getModel: function (datasource, cb) {

            $.ajax({
                url: 'data2.js',
                dataType: 'text'
            }).done(function (data) {
                data = JSON.parse(data);
                cb(data.Model);
            });

        },

        getCube: function (datasource, cb) {
            var self = this;
            $.ajax({
                url: 'data1.js',
                dataType: 'text'
            }).done(function (data) {
                data = JSON.parse(data);
                global.realRepository.enhanceCube.apply(self, [data.Cube]);
                cb(data.Cube);
            });

        }

    };

    // =======================================================================
    // real repository (load & save models)
    // =======================================================================

    global.realRepository = {

        stringify: function (obj) {
            return JSON.stringify(obj, function (key, value) {
                if (key === '__eventing__') return undefined;
                return value;
            });
        },

        enhanceCube: function (cube) {
            for (var i = 0; i < cube.Dimensions.length; ++i) {
                var dimension = cube.Dimensions[i];
                for (var j = 0; j < dimension.Attributes.length; ++j) {
                    var attribute = dimension.Attributes[j];
                    attribute.selected = false;
                }
            }
        },

        getModel: function (datasource, cb) {

            var params = {
                "ModelPersistence": {
                    "DataSource": datasource,
                    "Action": "Get"
                }
            };

            $.get('/sap/bc/ina/service/v2/GetResponse', {
                "Request": this.stringify(params)
            }).done(function (data) {
                cb(data.Model);
            });

        },

        saveModel: function (datasource, model) {

            var params = {
                "ModelPersistence": {
                    "DataSource": datasource,
                    "Action": "Create",
                    "Model": model
                }
            };

            $.get('/sap/bc/ina/service/v2/GetResponse', {
                "Request": this.stringify(params)
            }).done(function () {
                alert('ok');
            });

        },

        getCube: function (datasource, cb) {

            var self = this;

            var params = {
                "DataSource": datasource,
                "Metadata": {
                    "Context": "Search",
                    "Expand": ["Cube"]
                },
                "Options": ["SynchronousRun"],
                "ServiceVersion": 204
            };

            $.get('/sap/bc/ina/service/v2/GetResponse', {
                "Request": this.stringify(params)
            }).done(function (data) {
                self.enhanceCube(data.Cube);
                cb(data.Cube);
            });

        }

    };

    global.repository = global.testRepository;

    global.dimensionDropdown = {
        valuePath: 'Name',
        descriptionPath: 'Name'
    };

    // =======================================================================
    // model editor
    // =======================================================================    
    var modelEditor = global.modelEditor = {

        DataSource: {
            "ObjectName": "INAM_LIQUID_SALES_OLI",
            "PackageName": "bics.basic",
            "Type": "InaSearch"
        },
        
        model: null,
        
        dimension: null,
        
        setModel: function (model) {
            this.model = model;
            this.setDimension(model.Dimensions[0]);
        },
        
        setDimension: function (dimension) {
            this.dimension = dimension;
        },
        
        transformAttribute: function (attribute) {
            var resultAttribute = {};
            resultAttribute.AccessUsage = {};
            resultAttribute.AccessUsage.FreestyleSearch = attribute.IsFreestyle;
            resultAttribute.Id = attribute.Name;
            resultAttribute.Name = attribute.Description;
            resultAttribute.PresentationUsage = {
                "Summary": 1,
                "Title": 1
            };
            return resultAttribute;
        },

        copyDimensions: function () {

            // determine attributes for insertion
            var attributes = [];
            var attribute;
            for (var i = 0; i < cubeEditor.dimension.Attributes.length; ++i) {
                attribute = cubeEditor.dimension.Attributes[i];
                if (!attribute.selected) continue;
                attributes.push(this.transformAttribute(attribute));
            }

            // insert
            var attributeMap = list.createMap(this.dimension.Attributes, function (attribute) {
                return attribute.Id;
            });
            for (i = 0; i < attributes.length; ++i) {
                attribute = attributes[i];
                if (attributeMap[attribute.Id]) continue;
                this.dimension.Attributes.push(attribute);
            }

        }
        
    };

    // =======================================================================
    // cube editor
    // =======================================================================
    global.cubeEditor = {};
    var cubeEditor = global.cubeEditor;
    cubeEditor.dimension = null;
    cubeEditor.cube = {
        "DataSource": {
            "PackageName": "liquid-sqe",
            "ObjectName": "LIQUID_SALES_AV1",
            "Type": "View"
        }
    };
    

    // =======================================================================
    // bind
    // =======================================================================
    dobi.run(window, document.getElementById('templates'), document.getElementById('target'));

})(window, window.$, window.dobi, window.list);