/* global __dirname, module */
/* global require */
var path = require("path");
var config = {
    "port": 60005,
    "logEnabled": true,
    "services": [
        {
            "name": "fs",
            "type": "file",
            "alwaysActive": true,
            "urls": ["/"],
            "rewrite": {},
            "path": function () {
                return ".";
            }
        },
        {
            "proxyhost": "proxy",
            "proxyport": "8080",
            "name": "odata",
            "type": "proxy",
            "urls": ["/V2", "/V3", "/V4"],
            "rewrite": {},
            "host": "services.odata.org",
            "port": 80,
            "https": false
        },

    ]
};
module.exports = config;