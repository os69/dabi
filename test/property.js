/* global describe */
/* global it */
/* global expect */
/* global window */
/* global console */


var propertyModule = window.dobiRoot.property;
var eventingModule = window.dobiRoot.eventing;

describe("Property Tests", function () {

    // =======================================================================
    // Helper for checking events
    // =======================================================================    
    var event = null;
    var target = {};
    var subscribe = function (property) {
        property.subscribe(target, function (e) {
            event = e;
        });
    };
    var unSubscribe = function () {
        eventingModule.deleteSubscriptions(target);
    };
    var prepareEvent = function () {
        event = null;
    };

    // =======================================================================
    // Resolve Object Paths
    // =======================================================================
    it("Resolve Object Paths", function () {

        var salesOrder = {
            description: 'Sales Order',
            status: {
                code: 10,
                nullValue: null
            },
            nullValue: null
        };

        expect(new propertyModule.Property({
            object: salesOrder,
            path: 'description'
        }).value()).toBe(salesOrder.description);

        expect(new propertyModule.Property({
            object: salesOrder,
            path: 'status/code'
        }).value()).toBe(salesOrder.status.code);

        expect(new propertyModule.Property({
            object: salesOrder,
            path: 'status2'
        }).value()).toBe(undefined);

        expect(new propertyModule.Property({
            object: salesOrder,
            path: 'status/code2'
        }).value()).toBe(undefined);

        expect(new propertyModule.Property({
            object: salesOrder,
            path: 'status/nullValue'
        }).value()).toBe(null);

        expect(new propertyModule.Property({
            object: salesOrder,
            path: 'nullValue'
        }).value()).toBe(null);

    });

    // =======================================================================
    // Change Properties of Objects
    // =======================================================================
    it("Change Properties of Objects", function () {

        var scounter = eventingModule.scounter;

        // test data
        var salesOrder = {
            description: 'Sales Order',
            status: {
                code: 10,
                nullValue: null
            },
            nullValue: null
        };

        // property: description
        var p = new propertyModule.Property({
            object: salesOrder,
            path: 'description'
        });
        subscribe(p);

        prepareEvent();
        salesOrder.setDescription('Changed');
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_CHANGE);
        expect(event.message.value).toBe('Changed');

        prepareEvent();
        salesOrder.setDescription('Changed2');
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_CHANGE);
        expect(event.message.value).toBe('Changed2');

        prepareEvent();
        salesOrder.setDescription(null);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_CHANGE);
        expect(event.message.value).toBe(null);

        unSubscribe();
        expect(eventingModule.scounter).toBe(scounter);

        // property: status/code
        p = new propertyModule.Property({
            object: salesOrder,
            path: 'status/code'
        });
        subscribe(p);

        prepareEvent();
        salesOrder.status.setCode(20);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_CHANGE);
        expect(event.message.value).toBe(20);

        prepareEvent();
        salesOrder.setStatus({
            code: 30
        });
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_CHANGE);
        expect(event.message.value).toBe(30);

        prepareEvent();
        salesOrder.status.setCode(40);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_CHANGE);
        expect(event.message.value).toBe(40);

        unSubscribe();
        expect(eventingModule.scounter).toBe(scounter);

    });

    // =======================================================================
    // Resolve List Paths
    // =======================================================================

    it("Resolve List Paths", function () {

        var scounter = eventingModule.scounter;

        // simple list
        var list = [0, 10, 20, 30];

        expect(new propertyModule.Property({
            object: list,
            path: 0
        }).value()).toBe(0);

        expect(new propertyModule.Property({
            object: list,
            path: 1
        }).value()).toBe(10);

        // list in list
        list = [[10, 20], [100, 200]];

        expect(new propertyModule.Property({
            object: list,
            path: "0/0"
        }).value()).toBe(10);

        expect(new propertyModule.Property({
            object: list,
            path: "1/1"
        }).value()).toBe(200);

        expect(eventingModule.scounter).toBe(scounter);
    });

    // =======================================================================
    // Resolve Paths: Mixed Lists and Objects
    // =======================================================================

    it("Resolve Paths: Mixed Lists and Objects", function () {

        var scounter = eventingModule.scounter;

        var salesOrder = {
            items: [
                {
                    pos: 10,
                    tags: ['large', 'small']
                },
                {
                    pos: 20,
                    tags: ['big', 'small', null]
                }
            ]
        };

        expect(new propertyModule.Property({
            object: salesOrder,
            path: "items/0/pos"
        }).value()).toBe(10);
        expect(new propertyModule.Property({
            object: salesOrder,
            path: "items/0/tags"
        }).value()).toBe(salesOrder.items[0].tags);
        expect(new propertyModule.Property({
            object: salesOrder,
            path: "items/0/tags/1"
        }).value()).toBe('small');
        expect(new propertyModule.Property({
            object: salesOrder,
            path: "items/2/tags/1"
        }).value()).toBe(undefined);
        expect(new propertyModule.Property({
            object: salesOrder,
            path: "items/1/tags/2"
        }).value()).toBe(null);
        expect(new propertyModule.Property({
            object: salesOrder,
            path: "items/1/tags/3"
        }).value()).toBe(undefined);


        expect(eventingModule.scounter).toBe(scounter);
    });

    // =======================================================================
    // Change List and Watch List Item
    // =======================================================================

    it("Change List and Watch List Item ", function () {

        var scounter = eventingModule.scounter;
        var list = [0, 10, 20, 30];

        var p = new propertyModule.Property({
            object: list,
            path: 0
        });
        subscribe(p);

        prepareEvent();
        list.push(50);
        expect(event).toBeNull();
        expect(p.pathParts[0].propertyName).toBe('0');

        prepareEvent();
        list.splice(0, 0, 5);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_UPDATE_LIST_INDEX);
        expect(p.pathParts[0].propertyName).toBe('1');

        prepareEvent();
        list.splice(0, 1, "new");
        expect(event).toBeNull();
        expect(p.pathParts[0].propertyName).toBe('1');

        prepareEvent();
        list.splice(1, 1);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_DELETE);
        expect(eventingModule.scounter).toBe(scounter + 1);

        unSubscribe();
        expect(eventingModule.scounter).toBe(scounter);
    });

    // =======================================================================
    // Change List and Watch List 
    // =======================================================================

    it("Change List and Watch List", function () {

        var scounter = eventingModule.scounter;

        var list = [[100, 200], 10, 20, 30];

        var p = new propertyModule.Property({
            object: list,
            path: 0
        });
        subscribe(p);

        prepareEvent();
        list[0].push(300);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_CHANGE_PUSH);

        prepareEvent();
        list[0].splice(0, 1);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_CHANGE_SPLICE);

        prepareEvent();
        list.splice(0, 0, 5);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_UPDATE_LIST_INDEX);

        prepareEvent();
        list.splice(1, 1);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_DELETE);

        unSubscribe();
        expect(eventingModule.scounter).toBe(scounter);
    });

    // =======================================================================
    // Watch List Item
    // =======================================================================

    it("Watch List Item", function () {

        var scounter = eventingModule.scounter;

        var list = [[100, 200], 10, 20, 30];

        var p = new propertyModule.Property({
            object: list,
            path: "0/0"
        });
        subscribe(p);

        prepareEvent();
        list[0].splice(0, 0, 50);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_UPDATE_LIST_INDEX);

        prepareEvent();
        list.splice(0, 0, 5);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_UPDATE_LIST_INDEX);

        prepareEvent();
        p.set(101);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_DELETE);
        expect(list[1][1], 101);

        unSubscribe();
        expect(eventingModule.scounter).toBe(scounter);

        list = [[100, 200], 10, 20, 30];
        p = new propertyModule.Property({
            object: list,
            path: "0/0"
        });
        subscribe(p);

        prepareEvent();
        list.splice(0, 1);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_DELETE);

        unSubscribe();
        expect(eventingModule.scounter).toBe(scounter);

    });

    // =======================================================================
    // List Tests
    // =======================================================================

    it("List Tests", function () {

        var scounter = eventingModule.scounter;

        var salesOrder = {
            items: [
                {
                    pos: 10,
                    tags:[1,2]
                }, {
                    pos: 20,
                    tags:[3,4]
                }
            ]
        };

        var p = new propertyModule.Property({
            object: salesOrder,
            path: "items/0/tags"
        });
        subscribe(p);

        expect(p.value()).toBe(salesOrder.items[0].tags);
        expect(p.pathParts[1].propertyName).toBe('0');
        
        prepareEvent();
        salesOrder.items.splice(0,0,{pos:5});
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_UPDATE_LIST_INDEX);
        expect(p.pathParts[1].propertyName).toBe('1');
        
        prepareEvent();
        var scounter1 = eventingModule.scounter;
        p.set([10,20]);
        expect(eventingModule.scounter).toBe(scounter1);
        expect(event.message.type).toBe(propertyModule.PROP_EVENT_TYPE_CHANGE);
        
        unSubscribe();
        expect(eventingModule.scounter).toBe(scounter);

    });


});