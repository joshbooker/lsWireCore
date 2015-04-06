/// <reference path="../GeneratedArtifacts/viewModel.js" />
/// <reference path="../../../lswires/lswires.js" />

myapp.UserPicker.created = function (screen) {

	lsWire.initializeCore(screen, false);

};

myapp.UserPicker.beforeOk = function (screen) {
	screen.selected = screen.UserRegistrations.selectedItem;
};
myapp.UserPicker.SearchUsers_Tap_execute = function (screen) {

	lsWire.toggleSearchInput("UserRegistrations");

};
