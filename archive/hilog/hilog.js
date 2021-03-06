require.config({
    baseUrl: "../",
    paths: {
        "map": "map",
        "objectid": "objectid",
        "eventing": "eventing",
        "dombinding": "dombinding",
        "list": "list"
    },
});

define(["eventing", "dombinding", "list"], function (eventing, dombinding, list) {

    "use strict";

    var methodEventing = eventing.methodEventing;

    // =======================================================================
    // http get 
    // =======================================================================
    function httpGet(url, cb) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                cb(xmlhttp.responseText);
            }
        };
        xmlhttp.open("GET", url, true);
        xmlhttp.send();
    }

    // =======================================================================
    // extend
    // =======================================================================
    function extend(obj1, obj2) {
        for (var prop in obj2) {
            obj1[prop] = obj2[prop];
        }
        return obj1;
    }

    // =======================================================================
    // tokenizer
    // =======================================================================
    var tokenize = function (str) {
        var aStr = str.match(/\w+|"[^"]+"/g),
            i = aStr.length;
        while (i--) {
            aStr[i] = aStr[i].replace(/"/g, "");
        }
        return aStr;
    };

    // =======================================================================
    // transformation log entry
    // =======================================================================
    var transLogEntry = function (logEntry) {

        var node = document.createElement('li');

        var messageNode = document.createTextNode('');
        node.appendChild(messageNode);
        dombinding.bindText(logEntry, 'message', messageNode);

        var severityNode = document.createTextNode('');
        node.appendChild(severityNode);
        dombinding.bindText(logEntry, 'severity', severityNode);

        if (logEntry instanceof ProcessStepLogEntry) {

            var toggleNode = document.createElement('span');
            node.appendChild(toggleNode);
            toggleNode.addEventListener('click', function (event) {
                if (subList.style.display === 'none') {
                    subList.style.display = '';
                } else {
                    subList.style.display = 'none';
                }
                event.stopPropagation();
            });
            toggleNode.appendChild(document.createTextNode('o'));

            var subList = document.createElement('ul');
            node.appendChild(subList);
            dombinding.bindList(logEntry.children, subList, transLogEntry);
        }

        return node;
    };

    var SEVERITY_INFO = 1;
    var SEVERITY_WARNING = 2;
    var SEVERITY_ERROR = 3;

    // =======================================================================
    // log entry: base class
    // =======================================================================
    var LogEntry = function () {
        this.init.apply(this, arguments);
    };

    LogEntry.prototype = {

        init: function (properties) {
            properties = properties || {};
            this.message = properties.message || "";
            this.severity = SEVERITY_INFO;
            this.parent = null;
        },

        setMessage: function (message) {
            this.message = message;
        },

        setSeverity: function (severity) {
            if (severity < this.severity) return;
            this.severity = severity;
            if (this.parent && this.parent.severity < this.severity) this.parent.setSeverity(this.severity);
        },

        set: function (logEntry) {
            this.setMessage(logEntry.message);
            this.setSeverity(logEntry.severity);
        }

    };

    // =======================================================================
    // log entry:  simple log message
    // =======================================================================
    var MessageLogEntry = function () {
        this.init.apply(this, arguments);
    };

    MessageLogEntry.prototype = extend(new LogEntry(), {

        parse: function (line) {
            this.message = line.trim();
            if (line.indexOf('error') >= 0) this.setSeverity(SEVERITY_ERROR);
        }

    });

    // =======================================================================
    // log entry:  process step
    // =======================================================================
    var ProcessStepLogEntry = function (properties) {
        this.init.apply(this, arguments);
    };

    ProcessStepLogEntry.prototype = extend(new LogEntry(), {

        init: function (properties) {
            LogEntry.prototype.init.apply(this, arguments);
            this.children = [];
        },

        parse: function (line, tokens) {
            this.message = tokens[3];
        },

        append: function (logEntry) {
            this.children.push(logEntry);
            if (this.severity < logEntry.severity) this.setSeverity(logEntry.severity);
            logEntry.parent = this;
        },

        set: function (logEntry) {
            LogEntry.prototype.set.apply(this, arguments);
            list.deltaSet(this.children, logEntry.children, function (logEntry1, logEntry2) {
                return logEntry1.message === logEntry2.message;
            }, function (logEntry1, logEntry2) {
                logEntry1.set(logEntry2);
            });
        },

    });

    var COMMAND_PREFIX = "#log";

    // =======================================================================
    // log parser
    // =======================================================================
    var parseLogLine = function (parentLogEntry, line) {

        var logEntry;

        // no log command -> create message log entry
        if (line.indexOf(COMMAND_PREFIX) !== 0) {
            logEntry = new MessageLogEntry();
            logEntry.parse(line);
            parentLogEntry.append(logEntry);
            return parentLogEntry;
        }

        // parse log command
        var tokens = tokenize(line);

        // command: step start
        if (tokens[1] === 'step' && tokens[2] === 'start') {
            logEntry = new ProcessStepLogEntry();
            logEntry.parse(line, tokens);
            parentLogEntry.append(logEntry);
            return logEntry;
        }

        // command: step stop
        if (tokens[1] === 'step' && tokens[2] === 'end') {
            return parentLogEntry.parent;
        }

        // default: create message log entry
        logEntry = new MessageLogEntry();
        logEntry.parse(line, tokens);
        parentLogEntry.append(logEntry);
        return parentLogEntry;
    };

    var parseLog = function (content) {
        var rootLogEntry = new ProcessStepLogEntry();
        var parentLogEntry = rootLogEntry;
        var lines = content.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line === '') continue;
            parentLogEntry = parseLogLine(parentLogEntry, line);
        }
        return rootLogEntry;
    };

    // =======================================================================
    // main
    // =======================================================================

    var logs = ['test.log', 'test2.log'];
    var logIndex = 0;

    var rootLogEntry = new ProcessStepLogEntry();
    var rootNode = document.createElement('ul');
    document.body.appendChild(rootNode);
    dombinding.bindObject(rootLogEntry,rootNode,transLogEntry);

    var buttonNode = document.createElement('button');
    document.body.appendChild(buttonNode);
    buttonNode.appendChild(document.createTextNode('Continue'));
    buttonNode.addEventListener('click', function () {

        if (logIndex >= logs.length) return;

        httpGet(logs[logIndex], function (response) {
            var rootLogEntry2 = parseLog(response);
            rootLogEntry.set(rootLogEntry2);
        });

        logIndex++;
    });


});