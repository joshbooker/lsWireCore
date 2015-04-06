/// <reference path="../GeneratedArtifacts/viewModel.js" />
/// <reference path="/lswires/lswires.js" />

myapp.PermissionPicker.created = function (screen) {

	lsWire.initializeCore(screen, false);

};

myapp.PermissionPicker.beforeOk = function (screen) {

	var permissionList = screen.findContentItem("Permissions");
	screen.selected = lsWire.getSelectedListItems(permissionList);

};

myapp.PermissionPicker.Permissions_postRender = function (element, contentItem) {

	lsWire.enableListToBeMultiSelect(contentItem);

	contentItem.dataBind("isLoading", function (isLoading) {

		if (!isLoading) {
			lsWire.selectListItems(contentItem, contentItem.screen.originalSelects);
		};

	});

};
