/// <reference path="../GeneratedArtifacts/viewModel.js" />
/// <reference path="../lswires/lswires.js" />

myapp.AddEditRole.created = function (screen) {

	lsWire.initializeCore(screen, false);

};

myapp.AddEditRole.beforeDiscard = function (screen) {

	return lsWire.showDiscardDialogBox();

};

myapp.AddEditRole.RoleName_postRender = function (element, contentItem) {

	contentItem.isVisible = contentItem.screen.Role.details.entityState == "added";

	contentItem.dataBind("value", function (roleName) {

		contentItem.screen.findContentItem("PermissionPicker_ButtonTap").isVisible = !!roleName;

		if (!!roleName) {
			contentItem.screen.details.displayName = "Role - " + roleName;
		};

	});
};

myapp.AddEditRole.DeleteRole_ButtonTap_execute = function (screen) {

	lsWire.showDeleteDialogBox("commit", screen.Role, "", "Delete Role?");

};

myapp.AddEditRole.PermissionPicker_ButtonTap_execute = function (screen) {

	// Lets show a permission picker
	myapp.showPermissionPicker(screen.Role, {

		// Make sure the picker knows what was selected before
		beforeShown: function (pickerScreen) {
			pickerScreen.originalSelects = _.map(screen.RolePermissionsByRoleName.data, function (p) {
				return p.PermissionId;
			});
		},

		afterClosed: function (pickerScreen, closeAction) {

			if (closeAction == "commit") {

				// Lets find the selections that were removed
				var removed = _.difference(pickerScreen.originalSelects, _.pluck(pickerScreen.selected, "Id"));

				// Lets delete the removed first
				removed.forEach(function (permissionId) {

					var rolePermission = _.find(screen.RolePermissionsByRoleName.data, function (rp) {
						return rp.PermissionId == permissionId;
					});

					rolePermission.deleteEntity();

				});

				// Now lets do any additions
				pickerScreen.selected.forEach(function (permission) {

					// Does this grade already exist?
					var permissionExists = _.find(screen.RolePermissionsByRoleName.data, function (rp) {
						return rp.PermissionId == permission.Id;
					});

					// Item is not currently part of the mix, so add it
					if (permissionExists == undefined) {
						var rolePermission = new myapp.RolePermission();
						rolePermission.Role = screen.Role;
						rolePermission.Permission = permission;
					};

				});

				// Save the changes
				myapp.applyChanges().then(function () {
					screen.RolePermissionsByRoleName.refresh();
					screen.findContentItem("RoleName").isVisible = false;
				});
			}
		}
	});


};
