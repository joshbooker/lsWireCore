/// <reference path="../GeneratedArtifacts/viewModel.js" />
/// <reference path="../../../lswires/lswires.js" />

myapp.AddEditUserRegistration.created = function (screen) {

	lsWire.initializeCore(screen, false);

};

myapp.AddEditUserRegistration.beforeDiscard = function (screen) {

	return lsWire.showDiscardDialogBox();

};

myapp.AddEditUserRegistration.UserName_postRender = function (element, contentItem) {

	contentItem.dataBind("value", function (userName) {

		if (!!userName) {
			contentItem.screen.details.displayName = "User - " + userName;
		};

	});
};

myapp.AddEditUserRegistration.DeleteUserRegistration_ButtonTap_execute = function (screen) {

	lsWire.showDeleteDialogBox("commit", screen.UserRegistration, "", "Delete User?");

};

myapp.AddEditUserRegistration.RemoveRole_ButtonTap_canExecute = function (screen) {

	return !!screen.RoleAssignmentsByUserName.selectedItem;

};

myapp.AddEditUserRegistration.RemoveRole_ButtonTap_execute = function (screen) {

	lsWire.showDeleteDialogBox("apply", screen.RoleAssignmentsByUserName.selectedItem, "", "Remove Role Assignment?");

};


