/*global require */
/*global requirejs */
/*global console*/
/*global document*/

requirejs.config({
    baseUrl: '..',
});


require(['lib/dobi'], function (dobi) {
    "use strict";

    // model: list
    var list = [];

    // ui: list
    var listNode = document.createElement('ul');
    document.body.appendChild(listNode);
    
    // transformation model item -> ui item
    var trans = function(item,listNode,refNode){
        var itemNode = document.createElement('li');
        if(refNode)
            listNode.insertBefore(itemNode,refNode);
        else
            listNode.appendChild(itemNode);
        itemNode.appendChild(document.createTextNode(item.value()));        
    };
    
    // bind model to ui
    dobi.bindList(list,listNode,trans);
    
    // fill list
    list.push('Hello');
    list.push('World!');
    
    // insert at beginning
    list.splice(0,0,'Hi and');
    
    // delete last
    list.splice(2,1);
    
});