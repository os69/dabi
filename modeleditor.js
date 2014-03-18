/* global window*/
/* global document*/
(function (global, $, dobi) {


    // =======================================================================
    // repository load & save
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

    var repository = {

        getModel: function (name, cb) {

            $.ajax({
                url: 'data2.js',
                dataType: 'text'
            }).done(function (data) {
                data = JSON.parse(data);
                cb(data.Model);
            });
        },

        getView: function (name, cb) {
            $.ajax({
                url: 'data1.js',
                dataType: 'text'
            }).done(function (data) {
                data = JSON.parse(data);
                cb(data.Cube);
            });

        }

    };

    // =======================================================================
    // main
    // =======================================================================

    repository.getModel('test', function (model) {
        repository.getView('test', function (cube) {

            var editor = window.editor = {};
            editor.model = model;
            editor.cube = cube;
             
            cube.currentDimension = cube.Dimensions[2];
            cube.dimensionDropdown = {
                valuePath : 'Name',
                descriptionPath : 'Name'
            };
            
            dobi.bindObject(window, document.getElementById('target'), dobi.parseTransformationFromTemplate(document.getElementById('templates')));
            document.getElementById('templates').parentNode.removeChild(document.getElementById('templates'));

        });
    });

})(window, window.$, window.dobi);