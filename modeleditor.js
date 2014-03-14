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
        }

    };

    // =======================================================================
    // main
    // =======================================================================

    repository.getModel('test', function (model) {
        
        var editor = window.editor = {};
        editor.model = model;
        editor.booleanDropdown = ['true','false'];
        new dobi.TemplateInterpreter(document.body).run();
    
    });

})(window, window.$, window.dobi);