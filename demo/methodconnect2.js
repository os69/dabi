/*global require */
/*global requirejs */
/*global console*/
/*global document*/

requirejs.config({
    baseUrl: '..',
});


require(['dobi/eventing'], function (eventingModule) {
    "use strict";

    // model: create a list
    var list = [];
    
    // view: create a list
    var listNode = document.createElement('ul');
    document.body.appendChild(listNode);
    
    // define a transformation:  element in list  of model -> element in list of view
    var trans = function(element){
        var elementNode = document.createElement('li');
        elementNode.appendChild(document.createTextNode(element));
        return [elementNode];
    };
    
    // connect model to view
    eventingModule.connect(list,'push',listNode,'appendChild',trans);
    
    // fill the model list
    list.push('Hello');
    list.push('World!');
    
    
});