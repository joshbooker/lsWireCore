/// <reference path="../GeneratedArtifacts/viewModel.js" />
/// <reference path="../../../lswires/lswires.js" />

myapp.BrowseRoles.created = function (screen) {

	lsWire.initializeCore(screen, false);

};

myapp.BrowseRoles.beforeShown = function (screen) {

	// If user does not have Security Admin permissions, force the user to go home
	if (!lsWire.userHasPermission("SecurityAdministration")) {
		lsWire.getShell().finishNavigation().then(function () {
			myapp.navigateHome();
		});
	}

	// We don't like the Out of the Box home button of LightSwitch
	// So change the home button into a back button, but still go home
	lsWire.changeScreenHomeButton(screen, "ui-icon-msls-back", "Back", function () {
		lsWire.goBackOrHome();
	});

	lsWire.disableScreenNav(screen);

};
