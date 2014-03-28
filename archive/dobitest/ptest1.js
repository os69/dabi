/*global window */
/*global document */
/*global setTimeout */
/*global Node */
/*global console */

(function (eventing) {

    // =======================================================================
    // model
    // =======================================================================
    var model = {

        setValue: function (value) {
            this.value = value;
            eventing.raiseEvent(this, 'changed', value);
        }

    };

    // =======================================================================
    // view 1
    // =======================================================================
    var view1 = {

        handleValueChanged: function (event) {
            console.log('received change event', event.message);
        }

    };

    // =======================================================================
    // view 2
    // =======================================================================
    var view2 = {

        handleValueChanged: function (event) {
            console.log('received change event', event.message);
        }

    };

    // =======================================================================
    // subscribe
    // =======================================================================

    eventing.subscribe(model, 'changed', view1, view1.handleValueChanged);
    eventing.subscribe(model, 'changed', view2, 'handleValueChanged');
    eventing.subscribe(model, 'changed', view2, function (event) {
        console.log(event);
    });
    eventing.subscribe(model, 'changed', null, function (event) {
        console.log(event);
    });

    //model.setValue(10);

    // =======================================================================
    // anon events / event bus
    // =======================================================================


    eventing.subscribe(null, 'changed', null, function (event) {
        console.log(event);
    });


    eventing.raiseEvent(null, 'changed', 13);

})(window.eventing);