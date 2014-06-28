/* global d3 */
/* global alert */
/* global window */
/* global document */
/* global dobi */
/* global $ */
/* global console */

(function () {

    var gId = 0;
    var generateId = function () {
        return gId++;
    };

    var createTree = function (nodeDisplay, depth, numChilds) {

        var nodes = [];
        var links = [];

        var doCreate = function (d, parentObj) {
            if (d === 0) return;
            for (var i = 0; i < numChilds; ++i) {
                var childObj = 'node' + generateId();
                nodeDisplay.addNode(childObj);
                nodeDisplay.addLink(parentObj, childObj);
                doCreate(d - 1, childObj);
            }
        };

        var rootObj = 'node' + generateId();
        nodeDisplay.addNode(rootObj);
        doCreate(depth, rootObj);

    };

    var nodes = window.obo.nodes;

    var nodeDisplay = new nodes.NodeDisplay('body', 600, 600);
    var currentNode = null;
    createTree(nodeDisplay, 2, 5);
    nodeDisplay.click = function (d) {
        currentNode = d;
    };
    nodeDisplay.mouseover = function(d){
        console.log(d.internalId);
    };
    nodeDisplay.update();

    document.getElementById('add').addEventListener('click', function () {
        var targetObj = 'node' + generateId();
        nodeDisplay.addNode(targetObj);
        nodeDisplay.addLink(currentNode.obj, targetObj);
        nodeDisplay.update();
    });

    document.getElementById('collapse').addEventListener('click', function () {
        currentNode.collapse();
        nodeDisplay.update();
    });

    document.getElementById('expand').addEventListener('click', function () {
        currentNode.expand();
        nodeDisplay.update();
    });


})();