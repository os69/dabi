/* global window*/
/* global document*/
(function (global, $, dobi) {


    // =======================================================================
    // load sve template
    // =======================================================================

    var getMetaData = function () {

        var params = {
            "DataSource": {
                "PackageName": "liquid-sqe",
                "ObjectName": "LIQUID_SALES_AV1",
                "Type": "View"
            },
            "Metadata": {
                "Context": "Search",
                "Expand": ["Cube"]
            },
            "Options": ["SynchronousRun"],
            "ServiceVersion": 204
        };

        params = {
            "ModelPersistence": {
                "DataSource": {
                    "PackageName": "bics.basic",
                    "ObjectName": "INAM_LIQUID_SALES_01",
                    "Type": "InaSearch"
                },
                "Action": "Get"
            }
        };


        $.get('/sap/bc/ina/service/v2/GetResponse', {
            "Request": JSON.stringify(params)
        }).done(function (data) {

        });

    };

    // =======================================================================
    // repository load & save
    // =======================================================================

    global.repository = {

        getModel: function (name, cb) {

            $.ajax({
                url: 'data2.js',
                dataType: 'text'
            }).done(function (data) {
                data = JSON.parse(data);
                cb(data.Model);
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

        getCube: function (name, cb) {
            var self = this;
            $.ajax({
                url: 'data1.js',
                dataType: 'text'
            }).done(function (data) {
                data = JSON.parse(data);
                self.enhanceCube(data.Cube);
                cb(data.Cube);
            });

        }

    };

    // =======================================================================
    // model editor
    // =======================================================================    
    global.modelEditor = {};
    var modelEditor = global.modelEditor;
    modelEditor.model = {
        "DataSource": {
            "ObjectName": "LIQUID_SALES_AV1",
            "PackageName": "liquid-sqe",
            "Type": "View"
        }
    };
    modelEditor.dimension = {};

    global.dimensionDropdown = {
        valuePath: 'Name',
        descriptionPath: 'Name'
    };



    // =======================================================================
    // cube editor
    // =======================================================================
    global.cubeEditor = {};
    var cubeEditor = global.cubeEditor;
    cubeEditor.cube = {
        "DataSource": {
            "InstanceId": "53215CD9D8817C7BE10000007F000002",
            "ObjectName": "LIQUID_SALES_AV1",
            "PackageName": "liquid-sqe",
            "SchemaName": "_SYS_BIC",
            "Type": "View"
        }
    };
    cubeEditor.dimension = {};

    global.cubeDimensionDropdown = {
        valuePath: 'Name',
        descriptionPath: 'Name'
    };

    // =======================================================================
    // bind
    // =======================================================================
    dobi.bindObject(global, document.getElementById('target'), dobi.parseTransformationFromTemplate(document.getElementById('templates')));
    document.getElementById('templates').parentNode.removeChild(document.getElementById('templates'));

})(window, window.$, window.dobi);