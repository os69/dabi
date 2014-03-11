/*global window */
/*global document */
/*global setTimeout */
/*global Node */
/*global console */

(function (eventing, Raphael, dombinding) {

    model = {

        setValue: function (value) {
            this.value = value;
            console.log('model-set-value', value);
        }
    };

    var view1 = {

        setValue: function (value) {
            this.value = value;
            console.log('view1-set-value', value);
        }

    };

    var view2 = {

        setValue: function (value) {
            this.value = value;
            console.log('view2-set-value', value);
        }
    };


    eventing.connect(model, 'setValue', view1, 'setValue');
    eventing.connect(model, 'setValue', view2, 'setValue', function (val) {
        return [2 * val];
    });



    model.setValue(13);

    view1.setValue(14);

   
    var paper = Raphael(10, 200, 320, 200);

   
    var circle = paper.circle(50, 40, 10);
   
   circle.attr("fill", "#f00");

   
    circle.attr("stroke", "#fff");

    // model
    model = [];

    // view 1
    var view1 = document.createElement('ul');
    document.body.appendChild(view1);

    eventing.connect(model, "push", view1, "appendChild", function (value) {
        var liNode = document.createElement('li');
        liNode.appendChild(document.createTextNode(value));
        return [liNode];
    });

    eventing.connect(model,"push",paper,"circle",function(val){
       return [50,40,val]; 
    });
    
    model.push(20);
    model.push(30);
    
})(window.eventing, window.Raphael, window.dombinding);
   