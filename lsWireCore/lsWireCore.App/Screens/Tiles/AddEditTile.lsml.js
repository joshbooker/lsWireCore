/// <reference path="../GeneratedArtifacts/viewModel.js" />
/// <reference path="../../lswires/lswires.js" />

myapp.AddEditTile.created = function (screen) {

	lsWire.initializeCore(screen, false);

};

myapp.AddEditTile.ImageInput_render = function (element, contentItem) {

	lsWire.renderFileSelectorInCustomControl(element, contentItem);

};

myapp.AddEditTile.DeleteTile_ButtonTap_execute = function (screen) {

	lsWire.showDeleteDialogBox("commit", screen.Tile, "", "Delete Tile?");

};

myapp.AddEditTile.RemoveImage_ButtonTap_execute = function (screen) {

	screen.Tile.Image = null;

};
