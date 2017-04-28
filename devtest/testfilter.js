/* global dobi, document, console */
(function () {


	var model = {};

	model.table = [{
		a: 1,
		b: 10
	}, {
		a: 2,
		b: 20
	}, {
		a: 3,
		b: 30
	}];

	model.filter = function (row) {
		if (row.a >= 2) {
			return true;
		}
		return false;
	};


	var filteredTableProperty = dobi.property.calculatedProperty(function () {
		console.log('a');
	}, [dobi.property.objectProperty(model, 'filter'), dobi.property.objectProperty(model, 'table')]);


	dobi.binding.run(model);

	model.table.push({
		a: 4,
		b: 40
	});

})();