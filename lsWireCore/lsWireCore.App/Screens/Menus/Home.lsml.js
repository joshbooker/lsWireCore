/// <reference path="../GeneratedArtifacts/viewModel.js" />
/// <reference path="../../lswires/lswires.js" />
/// <reference path="../../scripts/jquery-1.9.1.js" />
/// <reference path="../../scripts/msls-2.5.3.js" />

myapp.Home.created = function (screen) {

	screen.MenuId = "Home";
	if (screen.details && screen.details.startPage) {
	    //screen.details.startPage.addChangeListener("_dependents", function () {
	        lsWire.initializeCore(screen, true);
	    //});
	}
	screen.canModify = lsWire.userHasPermission("SecurityAdministration");


};

myapp.Home.beforeShown = function (screen) {

	lsWire.disableScreenNav(screen);

	lsWire.changeScreenHomeButton(screen, null, "Home", function () {
		myapp.navigateHome();
	});

	if (!!lsWire.tileAdded) {
		screen.TilesByMenuId.refresh();
		lsWire.tileAdded = false;
	};

	screen.findContentItem("AddTile").isVisible = screen.canModify;
	screen.findContentItem("EditTiles").isVisible = screen.canModify;

};

myapp.Home.AddTile_ButtonTap_execute = function (screen) {

	lsWire.addMenuTile(screen, screen.TilesByMenuId, "Home");

};

myapp.Home.EditTiles_ButtonTap_execute = function (screen) {

	screen.EditingTiles = !!!screen.EditingTiles;

	var button = screen.findContentItem("EditTiles");

	if (screen.EditingTiles) {
		lsWire.addButtonClass(button, "tile-editing");
		screen.findContentItem("TilesByMenuId")._view._container.find("li").addClass("tile-editing");
	} else {
		lsWire.removeButtonClass(button, "tile-editing");
		screen.findContentItem("TilesByMenuId")._view._container.find("li").removeClass("tile-editing");
	}

};

myapp.Home.TilesByMenuIdTemplate_postRender = function (element, contentItem) {

	lsWire.renderAsMenuTile(element, contentItem);

};

myapp.Home.TilesByMenuId_ItemTap_execute = function (screen) {

	lsWire.executeMenuTileTap(screen.TilesByMenuId, screen.EditingTiles, [
        { Id: "Security", Tap: function () { myapp.showSecurity(); } }
	]);

};

myapp.Home.RefreshTiles_ButtonTap_canExecute = function (screen) {

	return screen.canModify;

};
myapp.Home.RefreshTiles_ButtonTap_execute = function (screen) {

	screen.TilesByMenuId.refresh();

	if (!!screen.EditingTiles) {
		myapp.Home.EditTiles_ButtonTap_execute(screen);
	};
};
