/* global d3 */


(function () {

    var node1 = {
        id: 1,
        x: 50,
        y: 50
    };
    var node2 = {
        id: 2,
        x: 100,
        y: 100
    };
    var nodes = [node1, node2];

    var links = [{
        source: node1,
        target: node2
    }];

    var force = d3.layout.force()
        .nodes(nodes)
        .links(links)
        .on("tick", tick)
        .size([300, 300])
        .linkDistance(100)
        //.linkStrength(0.9)
        .start();


    var displayArea = d3.select("body").append("svg:svg")
        .attr("width", 300)
        .attr("height", 300);


    var link = displayArea.selectAll("line.link")
        .data(links, function (d) {
            return d.target.id;
        });


    link.enter().insert("svg:line", ".node")
        .attr("class", "link")
        .attr("x1", function (d) {
            return d.source.x;
        })
        .attr("y1", function (d) {
            return d.source.y;
        })
        .attr("x2", function (d) {
            return d.target.x;
        })
        .attr("y2", function (d) {
            return d.target.y;
        });


    link.exit().remove();


    var node = displayArea.selectAll("circle.node")
        .data(nodes, function (d) {
            return d.id;
        });

    node.enter().append("svg:circle")
        .attr("class", "node")
        .attr("cx", function (d) {
            return d.x;
        })
        .attr("cy", function (d) {
            return d.y;
        })
        .attr("r", 5)
        .style("fill", "black");

    node.exit().remove();

    function tick() {

        link.attr("x1", function (d) {
            return d.source.x;
        }).attr("y1", function (d) {
            return d.source.y;
        }).attr("x2", function (d) {
            return d.target.x;
        }).attr("y2", function (d) {
            return d.target.y;
        });

        node.attr("cx", function (d) {
            return d.x;
        }).attr("cy", function (d) {
            return d.y;
        });

    }

})();