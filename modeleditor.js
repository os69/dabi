/* global window*/
(function ($) {


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

        var params = {
            "ModelPersistence": {
                "DataSource": {
                    "PackageName": "bics.basic",
                    "ObjectName": "INAM_LIQUID_SALES_01",
                    "Type": "InaSearch"
                },
                "Action": "Get"
            }
        }


        $.get('/sap/bc/ina/service/v2/GetResponse', {
            "Request": JSON.stringify(params)
        }).done(function (data) {
            alert("ok");
        });

    };


    getMetaData();

})(window.$);