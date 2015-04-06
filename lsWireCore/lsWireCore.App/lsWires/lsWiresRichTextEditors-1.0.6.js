// *****************************************************************************************************
// *****************************************************************************************************
// This is just the start and will be rewritten shortly
// *****************************************************************************************************
// *****************************************************************************************************

lsWire.renderCkEditorInTextArea = function(contentItem, customToolbar, dirtyProperty, options) {

	// *****************************************************************************************************
	// *****************************************************************************************************
	/// <signature>
	/// <summary>
	/// Initialize a text area control as a Rich Text Editor using CkEditor
	/// </summary>
	/// <param name="contentItem" type="object" optional="false">contentItem of the control</param>
	/// </signature>
	/// <signature>
	/// <param name="contentItem" type="object" optional="false">contentItem of the control</param>
	/// <param name="customToolbar" type="object" optional="true">Optional - Array of strings on which tools to include on the toolbar</param>
	/// <param name="dirtyProperty" type="object" optional="true">Optional - pass the screen property to set when the editor is dirty</param>
	/// </signature>
	/// <signature>
	/// <param name="contentItem" type="object" optional="false">contentItem of the control</param>
	/// <param name="customToolbar" type="object" optional="true">Optional - Array of strings on which tools to include on the toolbar</param>
	/// <param name="dirtyProperty" type="object" optional="true">Optional - pass the screen property to set when the editor is dirty</param>
	/// </signature>
	/// <signature>
	/// <summary>
	/// Initialize a text area control as a Rich Text Editor using CkEditor, works on a textArea control
	/// .
	/// Options: optional can be of the following
	/// dirtyButtonCssClass: which button will be used to show content has been edited
	/// disableCtrlS: disable the ctrl-s for saving
	/// readOnly: make the editor readonly
	/// fileBrowseUrl: url for the file browser
	/// fileBrowseWidth: width of the window for the file browser
	/// fileBrowseHeight: height of the window for the file browser
	/// </summary>
	/// <param name="contentItem" type="object" optional="false">contentItem of the control</param>
	/// <param name="customToolbar" type="object" optional="true">Optional - Array of strings on which tools to include on the toolbar</param>
	/// <param name="dirtyProperty" type="object" optional="true">Optional - pass the screen property to set when the editor is dirty</param>
	/// <param name="options" type="object" optional="true">Optional - Set of additional options</param>
	/// </signature>
	// *****************************************************************************************************
	// *****************************************************************************************************

	if (contentItem == undefined) return;

	options = options == undefined ? {} : options;
	var dirtyButtonCssClass = options.dirtyButtonCssClass == undefined ? "lswire-dirty-editor-button" : options.dirtyButtonCssClass;
	var disableCtrlS = !!options.disableCtrlS;
	var readOnly = !!options.readOnly;
	var fileBrowseUrl = options.filebrowserBrowseUrl;
	var fileBrowseWidth = options.filebrowserWindowWidth;
	var fileBrowseHeight = options.filebrowserWindowHeight;


	// Wait for the our parent to get its dimensions
	contentItem.dataBind("_view.isRendered", function(isRendered) {

		if (isRendered) {

			// Go find our text area
			var txtArea = contentItem._view._contentContainer[0].getElementsByTagName('textarea')[0];

			// If not found... quit
			if (txtArea != undefined) {

				// Parent has been setup, so initialize the editor
				CKEDITOR.replace(txtArea.id, {
					filebrowserBrowseUrl: fileBrowseUrl,
					filebrowserWindowWidth: fileBrowseWidth,
					filebrowserWindowHeight: fileBrowseHeight,
					toolbar: customToolbar != undefined ? customToolbar : null,
					readOnly: readOnly,
					allowedContent: true,
					on: {
						save: function(e) {

							// If the save button is pressed, call our save function
							saveChanges(e.editor);

						},
						change: function(e) {

							if (!!e.editor.dirtyHasBeenSet == false) {
								e.editor.dirtyHasBeenSet = true;

								// If anything changes, set the passed property value for processing
								if (dirtyProperty != undefined)
									dirtyProperty.value = true;

								var saveButton = $(".cke_button__save", e.editor.container.$);
								if (saveButton != undefined)
									saveButton.addClass(dirtyButtonCssClass);
							}
						},
						instanceReady: function(e) {

							// Editor is ready... so lets now resize to our container
							setTimeout(function() {

								// Stuff the id of the editor into the contentItem
								contentItem.ckEditorId = txtArea.id;

								// Since the DOM has settled down, resize our editor to its desired state
								lsWire.resizeCkEditor(txtArea.id, null, e.sender.container.$.offsetWidth);

								// Since sometimes the DOM is flaky, we let the screen load, then force another resize, yep...HACK!
								setTimeout(function() {
									lsWire.resizeCkEditor(txtArea.id, null, e.sender.container.$.offsetWidth);
								}, 150);

							}, 250);

							// Bind for ctrl-s saving in the editor, Since the editor uses an iframe
							// the event binding will be destroyed when the iframe is destroyed, easy peasy!
							if (!disableCtrlS) {
								$(e.editor.window.$).bind('keydown', function(event) {
									if (event.ctrlKey || event.metaKey) {
										switch (String.fromCharCode(event.which).toLowerCase()) {
										case 's':
											// Call our save function
											saveChanges(e.editor);
											event.preventDefault();
											break;
										}
									}
								});
							}
						}
					}
				});

				// Save changes in the editor to our contentItem
				function saveChanges(editor) {
					contentItem.value = editor.getData();
					myapp.applyChanges().then(function() {
						editor.resetDirty();

						var saveButton = $(".cke_button__save", editor.container.$);
						if (saveButton != undefined)
							saveButton.removeClass(dirtyButtonCssClass);

						// If a dirty property was passed, set its value
						if (dirtyProperty != undefined)
							dirtyProperty.value = false;

						editor.dirtyHasBeenSet = false;
					});
				}
			}
		}
	});


};

lsWire.renderCkEditorInplace = function(contentItem, customToolbar, dirtyProperty, options) {

	// *****************************************************************************************************
	// *****************************************************************************************************
	/// <signature>
	/// <summary>
	/// Initialize a text area control as a Rich Text Editor using CkEditor, works on a textArea control
	/// </summary>
	/// <param name="contentItem" type="object" optional="false">contentItem of the control</param>
	/// </signature>
	/// <signature>
	/// <param name="contentItem" type="object" optional="false">contentItem of the control</param>
	/// <param name="customToolbar" type="object" optional="true">Optional - Array of strings on which tools to include on the toolbar</param>
	/// <param name="dirtyProperty" type="object" optional="true">Optional - pass the screen property to set when the editor is dirty</param>
	/// </signature>
	/// <signature>
	/// <param name="contentItem" type="object" optional="false">contentItem of the control</param>
	/// <param name="customToolbar" type="object" optional="true">Optional - Array of strings on which tools to include on the toolbar</param>
	/// <param name="dirtyProperty" type="object" optional="true">Optional - pass the screen property to set when the editor is dirty</param>
	/// </signature>
	/// <signature>
	/// <summary>
	/// Initialize a text area control as a Rich Text Editor using CkEditor, works on a textArea control
	/// .
	/// Options: optional can be of the following
	/// dirtyButtonCssClass: which button will be used to show content has been edited
	/// disableCtrlS: disable the ctrl-s for saving
	/// readOnly: make the editor readonly
	/// fileBrowseUrl: url for the file browser
	/// fileBrowseWidth: width of the window for the file browser
	/// fileBrowseHeight: height of the window for the file browser
	/// </summary>
	/// <param name="contentItem" type="object" optional="false">contentItem of the control</param>
	/// <param name="customToolbar" type="object" optional="true">Optional - Array of strings on which tools to include on the toolbar</param>
	/// <param name="dirtyProperty" type="object" optional="true">Optional - pass the screen property to set when the editor is dirty</param>
	/// <param name="options" type="object" optional="true">Optional - Set of additional options</param>
	/// </signature>
	// *****************************************************************************************************
	// *****************************************************************************************************
	options = options == undefined ? {} : options;
	var dirtyButtonCssClass = options.dirtyButtonCssClass == undefined ? "lswire-dirty-editor-button" : options.dirtyButtonCssClass;
	//var disableCtrlS = !!options.disableCtrlS;
	var readOnly = !!options.readOnly;
	var fileBrowseUrl = options.filebrowserBrowseUrl;
	var fileBrowseWidth = options.filebrowserWindowWidth;
	var fileBrowseHeight = options.filebrowserWindowHeight;


	// Wait for the our parent to get its dimensions
	contentItem.dataBind("_view.isRendered", function(isRendered) {

		if (isRendered) {

			// Go find our text area
			var txtArea = contentItem._view._contentContainer[0].getElementsByTagName('textarea')[0];
			$(txtArea).attr("contenteditable", "true");

			// If not found... quit
			if (txtArea != undefined) {

				// Parent has been setup, so initialize the editor
				CKEDITOR.inline(txtArea.id, {
					filebrowserBrowseUrl: fileBrowseUrl,
					filebrowserWindowWidth: fileBrowseWidth,
					filebrowserWindowHeight: fileBrowseHeight,
					toolbar: customToolbar != undefined ? customToolbar : null,
					readOnly: readOnly,
					allowedContent: true,
					on: {
						save: function(e) {

							// If the save button is pressed, call our save function
							saveChanges(e.editor);

						},
						change: function(e) {

							if (!!e.editor.dirtyHasBeenSet == false) {
								e.editor.dirtyHasBeenSet = true;

								// If anything changes, set the passed property value for processing
								if (dirtyProperty != undefined)
									dirtyProperty.value = true;

								var saveButton = $(".cke_button__save", e.editor.container.$);
								if (saveButton != undefined)
									saveButton.addClass(dirtyButtonCssClass);
							}
						},
						instanceReady: function(e) {

							// Editor is ready... so lets now resize to our container
							setTimeout(function() {

								// Stuff the id of the editor into the contentItem
								contentItem.ckEditorId = txtArea.id;

								// Since the DOM has settled down, resize our editor to its desired state
								lsWire.resizeCkEditor(txtArea.id, null, e.sender.container.$.offsetWidth);

								// Since sometimes the DOM is flaky, we let the screen load, then force another resize, yep...HACK!
								setTimeout(function() {
									lsWire.resizeCkEditor(txtArea.id, null, e.sender.container.$.offsetWidth);
								}, 150);

							}, 250);

						}
					}
				});

				// Save changes in the editor to our contentItem
				function saveChanges(editor) {
					contentItem.value = editor.getData();
					myapp.applyChanges().then(function() {
						editor.resetDirty();

						var saveButton = $(".cke_button__save", editor.container.$);
						if (saveButton != undefined)
							saveButton.removeClass(dirtyButtonCssClass);

						// If a dirty property was passed, set its value
						if (dirtyProperty != undefined)
							dirtyProperty.value = false;

						editor.dirtyHasBeenSet = false;
					});
				}
			}
		}
	});


};

lsWire.resizeCkEditor = function(editorId, height, width) {

	// *****************************************************************************************************
	// *****************************************************************************************************
	/// <signature>
	/// <summary>
	/// Wrapper to easily resize the ckEditor to its container, typically its textarea
	/// </summary>
	/// <param name="editorId" type="string">The id of the editor, typically the id assigned to the textarea</param>
	/// </signature>
	/// <signature>
	/// <param name="editorId" type="string">The id of the editor, typically the id assigned to the textarea</param>
	/// <param name="height" type="integer" optional="true">Height for the entire editor</param>
	/// </signature>
	/// <signature>
	/// <param name="editorId" type="string">The id of the editor, typically the id assigned to the textarea</param>
	/// <param name="height" type="integer" optional="true">Height for the entire editor</param>
	/// <param name="width" type="integer" optional="true">Width for the entire editor</param>
	/// </signature>
	// *****************************************************************************************************
	// *****************************************************************************************************

	if (editorId != undefined) {

		// Get the editor
		var editor = CKEDITOR.instances[editorId];

		if (editor != undefined) {
			if (height == undefined) {

				var t1 = lsWire.getParentByClassName(editor.container.$, "msls-ctl-text-area").offsetTop;
				var t2 = editor.element.$.parentElement.offsetTop;

				var h1 = $(".msls-footer", ".ui-page-active").height();
				var h2 = window.innerHeight;

				height = (h2 - (t1 + t2 + h1)) - 15;

			};

			if (width == undefined) {
				width = "100%";
			}

			$(editor.element.$.parentElement).height(height);

			editor.resize(width, height);
		}
	};

};

lsWire.destroyCkEditor = function(pageId, contentItemName) {

	// *****************************************************************************************************
	// *****************************************************************************************************
	/// <signature>
	/// <summary>
	/// Wrapper to destroy the ckEditor instance
	/// </summary>
	/// <param name="pageId" type="string" optional="false">Id of the page the editor is on</param>
	/// <param name="contentItemName" type="string" optional="false">Name of the contentItem the editor is rendered as</param>
	/// </signature>
	// *****************************************************************************************************
	// *****************************************************************************************************

	// Lets destroy the ckEditor for this screen
	if (pageId != undefined && contentItemName != undefined) {
		var editorId = pageId + "-" + contentItemName;
		if (CKEDITOR.instances[editorId] != undefined)
			CKEDITOR.instances[editorId].destroy();
	}

};

lsWire.getCkEditorData = function(contentItem) {

	// *****************************************************************************************************
	// *****************************************************************************************************
	/// <signature>
	/// <summary>
	/// Easily get the data out of the ckEditor instance associated with the passed contentItem
	/// </summary>
	/// <param name="contentItem" type="object" optional="false">ContentItem that the editor is rendered as</param>
	/// </signature>
	// *****************************************************************************************************
	// *****************************************************************************************************

	var editor = CKEDITOR.instances[contentItem.ckEditorId];
	contentItem.value = editor.getData();
};

lsWire.renderKendoEditorInCustomControl = function(element, contentItem, customToolbar, styleSheets, insertHtml) {

	// *****************************************************************************************************
	// *****************************************************************************************************
	/// <signature>
	/// <summary>
	/// Initialize a custom control as a Rich Text Editor using Kendo UI Editor
	/// </summary>
	/// <param name="element" type="object">DOM Element of the control</param>
	/// <param name="contentItem" type="object">contentItem of the control</param>
	/// </signature>
	/// <signature>
	/// <param name="element" type="object">DOM Element of the control</param>
	/// <param name="contentItem" type="object">contentItem of the control</param>
	/// <param name="customToolbar" type="object" optional="true">Optional - Array of strings on which tools to include on the toolbar</param>
	/// </signature>
	/// <signature>
	/// <param name="element" type="object">DOM Element of the control</param>
	/// <param name="contentItem" type="object">contentItem of the control</param>
	/// <param name="customToolbar" type="object" optional="true">Optional - Array of strings on which tools to include on the toolbar</param>
	/// <param name="styleSheets" type="string" optional="true">Optional = External style sheet to use within the editor</param>
	/// </signature>
	// *****************************************************************************************************
	// *****************************************************************************************************

	if (element == undefined || contentItem == undefined) return;

	var baseToolbar = [
		"bold", "italic", "underline",
		"justifyLeft", "justifyCenter", "justifyRight", "justifyFull",
		"insertUnorderedList", "insertOrderedList", "indent", "outdent",
		"createLink", "unlink", "insertImage",
		"createTable", "addRowAbove", "addRowBelow", "addColumnLeft", "addColumnRight", "deleteRow", "deleteColumn",
		"viewHtml",
		"insertHtml",
		"cleanFormatting",
		"foreColor",
		"backColor",
		"formatting",
		"fontName",
		"fontSize"
	];

	var stylesheets = styleSheets == undefined ? [] : styleSheets;

	var toolbar = customToolbar != undefined ? customToolbar : baseToolbar;

	// Initialzie the kendo editor, easy peasy!
	var editor = $(element).kendoEditor({
		encoded: false,
		value: contentItem.value,
		tools: toolbar,
		insertHtml: insertHtml,
		stylesheets: stylesheets,
		change: function() {
			contentItem.value = this.value();
		}
	}).data('kendoEditor');

	// Stuff the pointer to the editor into our contentItem
	contentItem.lsWire = contentItem.lsWire != undefined ? contentItem.lsWire : {};
	contentItem.lsWire.editor = editor;

};

lsWire.renderKendoEditorInTextArea = function(element, contentItem, customToolbar, styleSheets) {

	// *****************************************************************************************************
	// *****************************************************************************************************
	/// <signature>
	/// <summary>
	/// Initialize a text area control as a Rich Text Editor using Kendo UI Editor, works on a TextArea
	/// </summary>
	/// <param name="element" type="object">DOM Element of the control</param>
	/// <param name="contentItem" type="object">contentItem of the control</param>
	/// </signature>
	/// <signature>
	/// <param name="element" type="object">DOM Element of the control</param>
	/// <param name="contentItem" type="object">contentItem of the control</param>
	/// <param name="customToolbar" type="object" optional="true">Optional - Array of strings on which tools to include on the toolbar</param>
	/// </signature>
	/// <signature>
	/// <param name="element" type="object">DOM Element of the control</param>
	/// <param name="contentItem" type="object">contentItem of the control</param>
	/// <param name="customToolbar" type="object" optional="true">Optional - Array of strings on which tools to include on the toolbar</param>
	/// <param name="styleSheets" type="string" optional="true">Optional = External style sheet to use within the editor</param>
	/// </signature>
	// *****************************************************************************************************
	// *****************************************************************************************************

	if (element == undefined || contentItem == undefined) return;

	var baseToolbar = [
		"bold", "italic", "underline",
		"justifyLeft", "justifyCenter", "justifyRight", "justifyFull",
		"insertUnorderedList", "insertOrderedList", "indent", "outdent",
		"createLink", "unlink", "insertImage",
		"createTable", "addRowAbove", "addRowBelow", "addColumnLeft", "addColumnRight", "deleteRow", "deleteColumn",
		"viewHtml",
		"insertHtml",
		"cleanFormatting",
		"foreColor",
		"backColor",
		"formatting",
		"fontName",
		"fontSize"
	];

	var toolbar = customToolbar != undefined ? customToolbar : baseToolbar;

	// Wait for mobile to finish up
	contentItem.dataBind("_view.isRendered", function(isRendered) {

		if (isRendered) {

			lsWire.resizeTextAreaForKendoEditor(contentItem);

			setTimeout(function() {

				var stylesheets = styleSheets == undefined ? [] : styleSheets;

				var editor = $("textarea", element).kendoEditor({
					encoded: false,
					tools: toolbar,
					stylesheets: stylesheets,
					insertHtml: [
						{ text: "JavaScript", value: "<pre><code class='language-javascript'>// Code Start... <br><br>// Code End </code></pre> " },
						{ text: "StyleSheet", value: "<pre><code class='language-css'>// Code Start<br><br>// Code End </code></pre> " },
						{ text: "C#", value: "<pre><code class='language-csharp'>// Code Start<br><br>// Code End </code></pre> " }
					],
					value: contentItem.value,
					change: function() {
						contentItem.value = this.value();
					},
					keydown: function(event) {

						// Bind for ctrl-s saving in the editor, Since the editor uses an iframe
						// the event binding will be destroyed when the iframe is destroyed, easy peasy!
						if (true) {
							if (event.ctrlKey || event.metaKey) {
								switch (String.fromCharCode(event.which).toLowerCase()) {
								case 's':
									// Call our save function
									event.preventDefault();
									contentItem.value = this.value();
									myapp.applyChanges().then(function() {
										toastr.success('Page has been saved');
									});
									break;
								}
							}
						}

					}
				}).data('kendoEditor');

				// Stuff the pointer to the editor into our contentItem
				contentItem.lsWire = contentItem.lsWire != undefined ? contentItem.lsWire : {};
				contentItem.lsWire.editor = editor;

			}, 0);
		}

	});

};

lsWire.resizeKendoEditorTextAreaHeight = function(contentItem) {

	// *****************************************************************************************************
	// *****************************************************************************************************
	/// <signature>
	/// <summary>
	/// Wrapper to resize the height for the kendo editor.  Typically call this after the DOM has settled.
	/// This is not the same as resizing the textarea.
	/// </summary>
	/// <param name="contentItem" type="object" optional="false">The contentItem that the control was rendered for</param>
	/// </signature>
	// *****************************************************************************************************
	// *****************************************************************************************************

	lsWire.shell.finishNavigation().then(function() {

		if (contentItem == undefined) return;

		var editor = contentItem.lsWire.editor;
		var screenId = "#" + contentItem.screen.details._pageId;
		var viewPortHeight = document.documentElement.clientHeight;
		var headerHeight = $(".msls-header", screenId).outerHeight();
		var footerHeight = $(".msls-footer", screenId).outerHeight();

		var controlId = screenId + "-" + contentItem.name;
		var textArea = $(controlId);
		var ctrl = textArea.closest(".msls-ctl-text-area");
		var label = ctrl.find(".msls-label");
		var toolbarHeight = $('.k-editor-toolbar-wrap').height();
		var wrapper;

		// If this is an inline editor, things change
		if (editor.element.hasClass("k-editor-inline")) {
			ctrl = editor.element;
			label = editor.element.siblings('.msls-label');
			toolbarHeight = 0;
			wrapper = ctrl;
		} else {
			wrapper = editor.wrapper;
		}

		var availableHeight = viewPortHeight - headerHeight - footerHeight;

		// Inner before the textarea
		var labelHeight = contentItem.properties.attachedLabelPosition == "None"
			|| contentItem.properties.attachedLabelPosition == "Hidden" ? 15 : label.outerHeight() + 25;

		var containerHeight = contentItem._view._container.position().top;
		var wrapperTop = $(wrapper).position().top;

		var newHeight = viewPortHeight - footerHeight - containerHeight - toolbarHeight - wrapperTop - 25;

		$(wrapper).height(newHeight);

		$(ctrl)[0].classList.remove("msls-redraw");
		$(ctrl).css("height", "");
		$(ctrl).find('.msls-presenter-content').css("height", "");
		$(ctrl).closest('.msls-tab-content').css("height", "");

	});

};

lsWire.resizeKendoEditorCustomControlHeight = function(contentItem) {

	// *****************************************************************************************************
	// *****************************************************************************************************
	/// <signature>
	/// <summary>
	/// Wrapper to resize the height for the kendo editor when configured as an inline editor.  
	/// Typically call this after the DOM has settled.
	/// </summary>
	/// <param name="contentItem" type="object" optional="false">The contentItem that the control was rendered for</param>
	/// </signature>
	// *****************************************************************************************************
	// *****************************************************************************************************

	lsWire.shell.finishNavigation().then(function() {

		if (contentItem == undefined) return;

		var screenId = "#" + contentItem.screen.details._pageId;
		var editor = contentItem.lsWire.editor;
		var viewPortHeight = document.documentElement.clientHeight;
		var headerHeight = $(".msls-header", screenId).outerHeight();
		var footerHeight = $(".msls-footer", screenId).outerHeight();

		var ctrl = editor.element;
		var label = editor.element.siblings('.msls-label');

		var availableHeight = viewPortHeight - headerHeight - footerHeight;

		// Inner before the textarea
		var labelHeight = contentItem.properties.attachedLabelPosition == "None"
			|| contentItem.properties.attachedLabelPosition == "Hidden" ? 15 : label.outerHeight() + 25;

		var editorOffset = editor.body.offsetParent.offsetTop + editor.body.offsetTop;

		var editorHeight = (viewPortHeight - footerHeight - editorOffset - 25) + "px";

		ctrl[0].style.height = editorHeight;
		ctrl[0].style.maxHeight = editorHeight;

		ctrl[0].classList.remove("msls-vauto");
		ctrl[0].classList.add("msls-vscroll");

		// Remove the scrollbars around the screen
		$(ctrl).closest(".msls-content").height(availableHeight);
		$(ctrl).closest(".msls-tab-content").height(availableHeight);

	});

};

lsWire.renderTinyMCEInTextArea = function(element, contentItem, customToolbar) {

	// *****************************************************************************************************
	// *****************************************************************************************************
	/// <signature>
	/// <summary>
	/// Initialize a text area control as a Rich Text Editor using TinyMCE, works on a textArea control
	/// </summary>
	/// <param name="element" type="object" optional="false">DOM Element of the control</param>
	/// <param name="contentItem" type="object" optional="false">contentItem of the control</param>
	/// </signature>
	/// <signature>
	/// <param name="element" type="object" optional="false">DOM Element of the control</param>
	/// <param name="contentItem" type="object" optional="false">contentItem of the control</param>
	/// <param name="customToolbar" type="object" optional="true">Optional - Space seperated list of strings on which tools to include on the toolbar</param>
	/// </signature>
	// *****************************************************************************************************
	// *****************************************************************************************************

	if (element == undefined || contentItem == undefined) return;

	// Wait for the our parent to get its dimensions
	lsWire.onceElementAttrChange(element, "height", function() {

		// Get our text area, add a custom css class for our selector
		var txtArea = element.getElementsByTagName('textarea')[0];
		var mceClass = "tinymce_" + txtArea.id;
		txtArea.classList.add(mceClass);

		var toolbar = customToolbar != undefined ? customToolbar : "insertfile undo redo | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image";

		// Go initialize the editor on this text area
		tinymce.init({
			selector: 'textarea.' + mceClass,
			plugins: [
				"advlist autolink lists link image charmap print preview anchor",
				"searchreplace visualblocks code fullscreen",
				"insertdatetime media table contextmenu paste moxiemanager"
			],
			toolbar: toolbar,
			height: txtArea.parentElement.offsetHeight * parseInt(element.style.maxHeight) / 100,
			setup: function(editor) {

				// When user leaves the editor
				editor.on('blur', function(e) {

					// Did they do any edits?  If so, save to our contentItem
					if (e.target.isDirty()) {
						contentItem.value = e.target.getContent();
					}

				});

				// Stuff the pointer to the editor into our contentItem
				contentItem.lsWire = contentItem.lsWire != undefined ? contentItem.lsWire : {};
				contentItem.lsWire.editor = editor;

			}
		});

	});

};

