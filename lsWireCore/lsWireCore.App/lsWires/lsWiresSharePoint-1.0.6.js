// *****************************************************************************************************
// *****************************************************************************************************
// This is just the start and is pre Alpha
// *****************************************************************************************************
// *****************************************************************************************************

window.lsWire.sharePoint = {

	showUploadWindow: function (options) {

		// *****************************************************************************************************
		// *****************************************************************************************************
		/// <summary>
		/// Show a KendoUI window to upload files to SharePoint
		/// </summary>
		/// <param name="options" type="object">Object of properties</param>
		// *****************************************************************************************************
		// *****************************************************************************************************

		// getListUrl is a "GET"
		// removeUrl is a "POST"
		// saveUrl is a "POST"

		// If basic requirements are not met, gracefully return
		if (options == undefined || options.recordId == undefined || options.getListUrl == undefined || options.saveUrl == undefined || options.removeUrl == undefined)
			return;

		if (options.title == undefined) options.title = "File Upload";
		if (options.width == undefined) options.width = 400;
		if (options.top == undefined) options.top = 20;
		if (options.left == undefined) options.left = 20;
		if (options.autoUpload == undefined) options.autoUpload = true;
		if (options.baseControlName == undefined) options.baseControlName = "kFileUpload";
		if (options.fileList == undefined) options.fileList = [];

		// Wrap it all within a screen show progress
		msls.showProgress(
			msls.promiseOperation(function (operation) {

				// Go get the list of attachments for this LightSwitch record
				$.ajax({
					type: "GET",
					async: true,
					url: options.getListUrl + "/" + options.recordId,
					success: function (results) {

						// Success... get the file list if there, else its a null array
						operation.complete(results.FileList);
					},
					error: function (results) {

						// Error, so pass the error out of the promise
						operation.error(results);
					}
				});

			}).then(function (fileList) {

				// If there was a list of existing files, add it to our options
				if (fileList != undefined)
					options.fileList = fileList;

				// We were successful, so create the upload window
				lsWire.sharePoint.createUploadWindow(options);

				// Now create the actual upload widget within the window
				lsWire.sharePoint.createUploadWidget(options);

				// Window and upload control have been created, so now show them!
				$("#" + options.baseControlName + "Window").data("kendoWindow").open();

			})
		);


	},

	createUploadWindow: function (options) {

		// *****************************************************************************************************
		// *****************************************************************************************************
		/// <summary>
		/// Create a kendoWindow to house our upload control
		/// </summary>
		/// <param name="options" type="object">Object of properties</param>
		// *****************************************************************************************************
		// *****************************************************************************************************


		// Name our window for access later
		var windowName = options.baseControlName + "Window";
		var widgetName = options.baseControlName + "Widget";

		// Look for an upload control
		var kUpload = document.getElementById(widgetName);

		// If its there, destroy it
		if (kUpload != undefined)
			$(kUpload).data("kendoUpload").destroy();

		// Look for an existing window in the DOM
		var kWindow = document.getElementById(windowName);

		// If its there, destroy it also, cleans up memory issues
		if (kWindow != undefined)
			$(kWindow).data("kendoWindow").destroy();

		// Create/ReCreate an element for our new window
		var div = document.createElement("div");
		div.id = windowName;
		document.body.appendChild(div);

		// Finally, initialize the window control, initially hidden
		$("#" + windowName).kendoWindow({
			title: options.title,
			width: options.width,
			visible: false,
			position: {
				top: options.top,
				left: options.left
			}
		});

	},

	createUploadWidget: function (options) {

		// *****************************************************************************************************
		// *****************************************************************************************************
		/// <summary>
		/// Create the upload widget, enclosed in a kendoWindow
		/// </summary>
		/// <param name="options">Object of properties</param>
		// *****************************************************************************************************
		// *****************************************************************************************************

		// What are the names of our controls
		var windowName = options.baseControlName + "Window";
		var widgetName = options.baseControlName + "Widget";

		// Create an element for our upload widget
		var input = document.createElement("input");
		input.setAttribute("type", "file");
		input.id = widgetName;
		input.setAttribute("name", widgetName);

		// Add the upload widget to the window
		document.getElementById(windowName).appendChild(input);

		// Initialize the upload widget
		$("#" + widgetName).kendoUpload({
			async: {
				saveUrl: options.saveUrl + options.recordId,
				removeUrl: options.removeUrl + options.recordId,
				autoUpload: options.autoUpload
			},
			files: options.fileList,
			multiple: false,
			remove: function (eObj) {
				eObj.sender.options.async.removeUrl = options.removeUrl + options.recordId + "/" + eObj.files[0].name;
			},
			error: function (eObj) {

				if (eObj.XMLHttpRequest.status == 500) {
					var msg = "Error uploading " + eObj.files.length + " files";
					msg += "\n\n" + eObj.XMLHttpRequest.responseText;
					alert(msg);
				}

			}
		});
	},

	listItemAttachments: function (options) {

		// *****************************************************************************************************
		// *****************************************************************************************************
		/// <summary>
		/// Retrieve information on the attachments associated with a list item
		/// </summary>
		/// <param name="options">Object of properties</param>
		// *****************************************************************************************************
		// *****************************************************************************************************

		return msls.promiseOperation(function (operation) {

			if (options == undefined || options.url == undefined || options.lsId == undefined)
				operation.error({ errorText: "Invalid parameters" });
			else

				$.ajax({
					type: "GET",
					async: true,
					url: options.url + options.lsId,
					success: function (results) {

						if (results != undefined && results.FileList != undefined && results.FileList.length > 0) {

							_.forEach(results.FileList, function (file) {

								file.sizeString = (file.size > 1048576) ?
								(file.size / Math.pow(1024, 2)).toFixed(1) + " mb" :
								(file.size / 1024).toFixed(1) + " kb";

							});
						}

						operation.complete(results);

					},
					error: function (results) {

						operation.error(results);
					}
				});

		});

	}

};