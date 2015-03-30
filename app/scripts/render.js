$(app).on('app:dataReady', function (ev) {
	var _groups = app.mobile ? app.professions : app.professionColumns;
	
	

	// Render chart
	app.chart = new Livsloner(
		app.selector,
		app.mobile,
		app.data,
		_groups);

	// Render story points in desktop
	if (!app.mobile) {
		app.renderStoryPoints();
	};
});