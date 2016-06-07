/* global dobi, document, console */
(function () {

	var model = {
		n1: '10',
		n2: '20',
		res: 0
	};

	var tp = dobi.property.autoCalcProperty(model, ['n1', 'n2'], 'res', function (n1, n2) {
		return n1 + n2;
	});

	dobi.binding.run(model, document.getElementById('templates'), document.getElementById('target'));

	console.log('stat:', dobi.eventing.scounter);

	tp.delete();

	console.log('stat:', dobi.eventing.scounter);
})();