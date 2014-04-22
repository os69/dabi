/* global describe */
/* global it */
/* global expect */
/* global window */
/* global console */


var property = window.dobiRoot.property;
var eventing = window.dobiRoot.eventing;

describe("Property Tests", function () {

    it("Object Property Check Values", function () {

        var salesOrder = {
            description: 'Sales Order',
            status: {
                code: 10,
                nullValue: null
            },
            nullValue: null
        };

        expect(new property.Property({
            object: salesOrder,
            path: 'description'
        }).value()).toBe(salesOrder.description);

        expect(new property.Property({
            object: salesOrder,
            path: 'status/code'
        }).value()).toBe(salesOrder.status.code);

        expect(new property.Property({
            object: salesOrder,
            path: 'status2'
        }).value()).toBe(undefined);

        expect(new property.Property({
            object: salesOrder,
            path: 'status/code2'
        }).value()).toBe(undefined);

        expect(new property.Property({
            object: salesOrder,
            path: 'status/nullValue'
        }).value()).toBe(null);

        expect(new property.Property({
            object: salesOrder,
            path: 'nullValue'
        }).value()).toBe(null);

    });

    it("Object Property Check Value Change", function () {

        var scounter = eventing.scounter;

        var salesOrder = {
            description: 'Sales Order',
            status: {
                code: 10,
                nullValue: null
            },
            nullValue: null
        };

        var p = new property.Property({
            object: salesOrder,
            path: 'description'
        });
        var event = null;
        var target = {};
        p.subscribe(target, function (e) {
            event = e;
        });
        salesOrder.setDescription('Changed');
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(property.PROP_EVENT_TYPE_CHANGE);
        expect(event.message.value).toBe('Changed');
        eventing.deleteSubscriptions(target);
        expect(eventing.scounter).toBe(scounter);

        p = new property.Property({
            object: salesOrder,
            path: 'status/code'
        });
        event = null;
        target = {};
        p.subscribe(target, function (e) {
            event = e;
        });
        salesOrder.status.setCode(20);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(property.PROP_EVENT_TYPE_CHANGE);
        expect(event.message.value).toBe(20);

        event = null;
        salesOrder.setStatus({
            code: 30
        });
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(property.PROP_EVENT_TYPE_CHANGE);
        expect(event.message.value).toBe(30);

        event = null;
        salesOrder.status.setCode(40);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(property.PROP_EVENT_TYPE_CHANGE);
        expect(event.message.value).toBe(40);
        eventing.deleteSubscriptions(target);
        expect(eventing.scounter).toBe(scounter);

    });


    it("List Property Check Values", function () {

        var scounter = eventing.scounter;

        var list = [0, 10, 20, 30];

        expect(new property.Property({
            object: list,
            path: 0
        }).value(), 0);

        expect(new property.Property({
            object: list,
            path: 1
        }).value(), 10);

        list = [[10, 20], [100, 200]];

        expect(new property.Property({
            object: list,
            path: "0/0"
        }).value(), 10);

        expect(new property.Property({
            object: list,
            path: "1/1"
        }).value(), 200);

        expect(eventing.scounter).toBe(scounter);
    });

    it("List Property Check Value Change", function () {

        var scounter = eventing.scounter;
        var list = [0, 10, 20, 30];

        var p = new property.Property({
            object: list,
            path: 0
        });

        var target = {};
        var event = null;
        p.subscribe(target, function (e) {
            event = e;
        });

        list.push(50);
        expect(event).toBeNull();

        expect(p.pathParts[0].propertyName).toBe('0');
        event = null;
        list.splice(0, 0, 5);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(property.PROP_EVENT_TYPE_LIST_UPDATE_ITEM_INDEX);
        expect(p.pathParts[0].propertyName).toBe('1');

        event = null;
        list.splice(1, 1);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(property.PROP_EVENT_TYPE_LIST_DELETE_ITEM);
        expect(eventing.scounter).toBe(scounter + 1);

        eventing.deleteSubscriptions(target);
        expect(eventing.scounter).toBe(scounter);
    });

    it("List Property Check Value Change - Change Target List", function () {

        var scounter = eventing.scounter;

        var list = [[100,200], 10, 20, 30];

        var p = new property.Property({
            object: list,
            path: 0
        });
        
        var target = {};
        var event = null;
        p.subscribe(target, function (e) {
            event = e;
        });
        
        list[0].push(300);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(property.PROP_EVENT_TYPE_LIST_CHANGE);
        
        eventing.deleteSubscriptions(target);
        expect(eventing.scounter).toBe(scounter);
    });

    it("List Property Check Value Change - Deep Lists", function () {

        var scounter = eventing.scounter;

        var list = [[100,200], 10, 20, 30];

        var p = new property.Property({
            object: list,
            path: "0/0"
        });
        
        var target = {};
        var event = null;
        p.subscribe(target, function (e) {
            event = e;
        });
        
        list[0].splice(0,0,50);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(property.PROP_EVENT_TYPE_LIST_UPDATE_ITEM_INDEX);
        
        event = null;
        list.splice(0,0,5);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(property.PROP_EVENT_TYPE_LIST_UPDATE_ITEM_INDEX);

        event = null;
        p.set(101);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(property.PROP_EVENT_TYPE_LIST_DELETE_ITEM);
        expect(list[1][1],101);

        list = [[100,200], 10, 20, 30];
        p = new property.Property({
            object: list,
            path: "0/0"
        });
        event = null;
        p.subscribe(target, function (e) {
            event = e;
        });
        list.splice(0,1);
        expect(event).not.toBeNull();
        expect(event.message.type).toBe(property.PROP_EVENT_TYPE_LIST_DELETE_ITEM);

        eventing.deleteSubscriptions(target);
        expect(eventing.scounter).toBe(scounter);
        
    });



});