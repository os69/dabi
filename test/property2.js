/* global describe */
/* global it */
/* global expect */
/* global window */
/* global console */


var propertyModule = window.dobi.property;
var eventingModule = window.dobi.eventing;

propertyModule.PROP_EVENT_TYPES = propertyModule.PROP_EVENT_TYPES_ALL;

describe("Property Tests 2", function () {

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
	// test 1
	// =======================================================================
	it("test 1", function () {

		var root = {
			salesOrder: {
				status: 'Released',
				contact: {
					first: 'Sally',
					last: 'Spring',
					mail: {
						email: 'sally@spring.com'
					}
				}
			}
		};

		var p = new propertyModule.Property({
			object: root,
			path: 'salesOrder/contact/mail'
		});
		expect(p.value()).toBe(root.salesOrder.contact.mail);

		p.subscribe({}, function (e) {
			console.log(e);
		});

		root.salesOrder.setContact({
			first: 'Rudi',
			last: 'Ruessel',
			mail: {
				email: 'rudi@ruessel.com'
			}
		});
		root.salesOrder.contact.setMail({
			email: 'rudi@gmail.com'
		});


	});

	// =======================================================================
	// test 2
	// =======================================================================
	it("test 2", function () {

		var root = [[['1.1.1', '1.1.2'], ['1.2.1', '1.2.2']], [['2.1.1', '2.1.2'], ['2.2.1', '2.2.2']]];

		var p = new propertyModule.Property({
			object: root,
			path: '0/1'
		});
		expect(p.value()).toBe(root[0][1]);

		p.subscribe({}, function (e) {
			console.log(e);
		});

		console.log(p.value());
		root[0].splice(0, 1);
		console.log(p.value());
		root[0][0].splice(0, 1);
		console.log(p.value());




	});

});