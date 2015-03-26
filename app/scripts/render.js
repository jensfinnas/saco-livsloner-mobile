$(app).on('app:dataReady', function (ev) {
	var _groups = app.mobile ? app.professions : app.professionColumns;
	app.chart = new Livsloner(
		app.selector,
		app.mobile,
		app.data,
		_groups);

});