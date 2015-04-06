/// <reference path="../GeneratedArtifacts/viewModel.js" />
/// <reference path="../../../lswires/lswires.js" />

myapp.RolePicker.created = function (screen) {

	lsWire.initializeCore(screen, false);

};

myapp.RolePicker.beforeOk = function (screen) {

	// Make sure a role was selected on this screen
	if (!!screen.Roles.selectedItem) {

		// Notice assignment here is by another means, using the set function
		// If user pressed Ok, add this user account to the role assignement
		screen.pRoleAssignment.setUser(screen.pUserRegistration);

		// For some reason you have to also add this same reference to the Source Account
		screen.pRoleAssignment.setSourceAccount(screen.pUserRegistration);

		// Finally make sure the role assignment knows what role this is for
		screen.pRoleAssignment.setRole(screen.Roles.selectedItem);
	} else {

		// No role selected, delete the role assignment 
		screen.pRoleAssignment.deleteEntity();

	};

};
