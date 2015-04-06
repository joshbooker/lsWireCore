/// <reference path="../GeneratedArtifacts/viewModel.js" />
/// <reference path="../../lswires/lswires.js" />

myapp.Security.created = function (screen) {

	screen.MenuId = "Security";

	lsWire.initializeCore(screen, false);

};

myapp.Security.beforeShown = function (screen) {

	lsWire.disableScreenNav(screen);

	lsWire.changeScreenHomeButton(screen, "ui-icon-msls-back", "Back", function () {
		lsWire.goBackOrHome();
	});

	var isScurityAdmin = lsWire.userHasPermission("SecurityAdministration");
	screen.findContentItem("AddTile").isVisible = isScurityAdmin;
	screen.findContentItem("EditTiles").isVisible = isScurityAdmin;

};

myapp.Security.AddTile_ButtonTap_execute = function (screen) {

	lsWire.addMenuTile(screen, screen.TilesByMenuId, "Security");

};

myapp.Security.EditTiles_ButtonTap_execute = function (screen) {

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

myapp.Security.TilesByMenuId_ItemTap_execute = function (screen) {

	lsWire.executeMenuTileTap(screen.TilesByMenuId, screen.EditingTiles, [
        { Id: "SecurityRoles", Tap: function () { myapp.showBrowseRoles(); } },
        { Id: "SecurityUsers", Tap: function () { myapp.showBrowseUserRegistrations(); } }
	]);

};

myapp.Security.TilesByMenuIdTemplate_postRender = function (element, contentItem) {

	lsWire.renderAsMenuTile(element, contentItem);

};
