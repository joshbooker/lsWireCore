/*
============================================================================================
============================================================================================

lsWireCore.js

Version: 1.0.6

A libray of functions to help with Microsoft Visual Studio LightSwitch projects.

Dependencies:  
    
    jQuery

Documentation: 
    
    http://github.com/dwm9100b
    http://lightswitch.codewriting.tips
    http://blog.ofAnITGuy.com

License:

    Copyright (c) 2013, 2014 Dale Morrison, Interbay Technology Group.  All rights reserved.

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.

============================================================================================
============================================================================================
*/


// Does our namespace exist
window.lsWire = window.lsWire || {};

(function () {

    // Nice little function to allow multiline text in code
    // var t1 = function() {/*! text */}.getMLT(true);
    // Pass true if you want to strip tabs, linefeeds
    Function.prototype.getMLS = function (strip) {

        var str = this.toString().
			replace(/^[^\/]+\/\*!?/, '').
			replace(/\*\/[^\/]+$/, '');

        if (strip)
            str = str.replace(/[\n\t\r]/g, '');

        return str.trim();
    };

    window.lsWire = {
        eventObjects: [],
        keyboardShortcuts: {},
        webApiPath: undefined,
		version: "1.0.6",

        // #region Core - 17 functions
    	// ==========================================================

        initializeCore: function (screen, directLinkingAllowed, callBack) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            ///     <summary>Initializes the lsWire system.  All possible direct entry points should call this in the screen created method.</summary>
            ///     <param name="screen" type="object" optional="false">Screen object</param>
            /// </signature>
            /// <signature>
            ///     <param name="screen" type="object" optional="false">Screen object</param>
            ///     <param name="directLinkingAllowed" type="boolean" optional="true">Defaults to true, is direct linking to this screen allowed</param>
            /// </signature>
            /// <signature>
            ///     <param name="screen" type="object" optional="false">Screen object</param>
            ///     <param name="directLinkingAllowed" type="boolean" optional="true">Defaults to true, is direct linking to this screen allowed</param>
            ///     <param name="screenPropertyName" type="string" optional="true">Name of a screen property that will be set to true when initialization is complete</param>
            /// </signature>
            /// <signature>
            ///     <param name="screen" type="object" optional="false">Screen object</param>
            ///     <param name="directLinkingAllowed" type="boolean" optional="true">Defaults to true, is direct linking to this screen allowed</param>
            ///     <param name="screenPropertyName" type="string" optional="true">Name of a screen property that will be set to true when initialization is complete</param>
            ///     <param name="callBack" type="function" optional="true">Method to execute after core has been initialized</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (lsWire.webApiPath == undefined) {
                lsWire.webApiPath = $.mobile.path.documentUrl.directory + "../api/";
            };

            lsWire.initializeShell(screen);

            lsWire.initializeScreenSignals(screen);

            // Do we have toastr, if so change default to bottom-left
            if (!!window["toastr"]) {
                toastr.options.positionClass = "toast-bottom-left";
            }

            // If this is the first time run, go do our initialization
            if (!!!lsWire.hasBeenInitialized) {

                window.document.body.classList.add('msls-collapsed');

                // setup a global catch
                $(window).on("error", function (e) {
                    msls.showMessageBox("There was a fatal error: " + e.originalEvent.message, {
                        title: "Big Error!"
                    });
                });

                // Add to our jquery ajax for auth errors
                $(document).ajaxError(function (event, jqXHR, ajaxSettings) {
                    if (jqXHR.status === 401) {
                        location.reload();
                    };
                });

                // If no direct linking
                if (directLinkingAllowed === false) {
                    lsWire.noDirectLinking();
                    return;
                }


                // Modify the core commands of LightSwitch allowing for before hooks
                // Modified -- 1/17/2015
                lsWire.initializeBackCommand();
                lsWire.initializeCancelCommand();
                lsWire.initializeCloseCommand();
                lsWire.initializeDiscardCommand();
                lsWire.initializeHomeCommand();
                lsWire.initializeLogoutCommand();
                lsWire.initializeOkCommand();
                lsWire.initializeSaveCommand();

                // Get information about the user
                lsWire.getUserInfo();

                // Get information about the app configuration
                lsWire.getAppConfig();

                // If this was a direct link... but they got back home, remove the flag
                if (lsWire.shell._homeScreen.id != screen.details._modelId) {
                    myapp.directLinked = true;
                }
            }

            // Make sure the tab commands are updated for each screen
            lsWire.initializeTabCommand();

            // If a function was passed, run it
            if (callBack != undefined)
                callBack();

            // Set our own internal flag
            lsWire.hasBeenInitialized = true;

            // Ok to show our document again as all the changes have taken place
            window.document.body.classList.remove("msls-collapsed");

        },

        initializeScreenSignals: function (screen) {
            /// <summary>
            /// Initializes the jQuery Mobile events to work with Signals
            /// Will only run once per application
            /// </summary>
            /// <param name="screen">Screen</param>

            var screenId = screen.details._modelId;
            var events = ["afterCreated", "beforeShown", "afterShown", "beforeHide", "afterHide", "beforeChange", "afterChange"];

            screen.on = {};

            _.forEach(events, function (eventId) {

                screen[eventId] = function () {
                    var fn = myapp[screenId][eventId];
                    if (!!fn)
                        fn(screen);
                }

                screen.on[eventId] = new signals();
                screen.on[eventId].add(screen[eventId]);

            });


            if (!!!lsWire.signalsInitialized) {

                // Clean everything up!
                window.onbeforeunload = function (e) {

                };


                // ==========================================================================
                // This event is triggered prior to any page loading or transition
                // data contains:  toPage & options
                // ==========================================================================

                $(document.body).on('pagebeforechange', function (event, data) {

                    var page = getScreen("from", data);

                    if (!!page && !!page.on && !!page.on.beforeChange) {
                        if (!page.on.beforeChange.active) {
                            page.on.beforeChange.active = true;
                        }
                        page.on.beforeChange.dispatch();
                    }

                });


                // ==========================================================================
                // This event is triggered after the request has finished loading the page 
                // into the DOM and all page transition animations have completed.
                // data contains: toPage & options
                // ==========================================================================

                $(document.body).on('pagechange', function (event, data) {

                    var page = getScreen("to", data);

                    if (!!page && !!page.on && !!page.on.afterChange) {
                        if (!page.on.afterChange.active) {
                            page.on.afterChange.active = true;
                        }
                        page.on.afterChange.dispatch();
                    }

                });


                // ==========================================================================
                // Triggered on the "toPage" we are transitioning to, before the actual 
                // transition animation is kicked off
                // data contains: prevPage, if first page, there will be no prevPage
                // ==========================================================================

                $(document.body).on('pagebeforeshow', function (event, data) {

                    var page = getScreen("target", event);
                    if (page == undefined)
                        page = getScreen("first", data);

                    if (!!page && !!page.on && !!page.on.beforeShown) {
                        if (!page.on.beforeShown.active)
                            page.on.beforeShown.active = true;

                        lsWire.screen = page;
                        page.on.beforeShown.dispatch();
                    }

                });


                // ==========================================================================
                // Triggered on the "toPage" after the transition animation has completed
                // data contains: prevPage
                // ==========================================================================

                $(document.body).on('pageshow', function (event, data) {

                    var page = getScreen("target", event);
                    if (page == undefined)
                        page = getScreen("first", data);

                    if (!!page && !!page.on && !!page.on.afterShown) {
                        if (!page.on.afterShown.active)
                            page.on.afterShown.active = true;

                        page.on.afterShown.dispatch();
                    };

                });


                // ==========================================================================
                // Triggered on the "fromPage" we are transitioning away from, before 
                // the actual transition animation is kicked off
                // data contains: nextPage
                // ==========================================================================

                $(document.body).on('pagebeforehide', function (event, data) {

                    var page = getScreen("target", event);

                    if (!!page && !!page.on && !!page.on.beforeHide) {
                        if (!page.on.beforeHide.active)
                            page.on.beforeHide.active = true;

                        page.on.beforeHide.dispatch();
                    };

                });


                // ==========================================================================
                // Triggered on the "fromPage" after the transition animation has completed
                // data contains: nextPage
                // ==========================================================================

                $(document.body).on('pagehide', function (event, data) {

                    var page = getScreen("target", event);

                    if (!!page && !!page.on && !!page.on.afterHide)
                        page.on.afterHide.dispatch();

                });


                // ==========================================================================
                // This event is dispatched just before the framework attempts 
                // to remove the a page from the DOM
                // ==========================================================================

                $(document.body).on('pageremove', function (event, data) {

                });


                // ==========================================================================
                // Triggered on the page being initialized, after initialization occurs
                // ==========================================================================

                $(document.body).on('pageinit', function (event, data) {
                    //var page = getScreen("target", event);


                });


                // ==========================================================================
                // Triggered on the page being initialized, before most plugin auto-initialization occurs
                // you can manipulate markup before jQuery Mobile's default widgets are auto-initialized
                // ==========================================================================

                $(document.body).on('pagebeforecreate', function (event, data) {
                    //var page = getScreen("target", event);

                });

                $(document.body).on('pagecreate', function (event, data) {
                    var page = getScreen("target", event);

                    if (!!page && !!page.on && !!page.on.afterCreated) {
                        if (!page.on.afterCreated.active)
                            page.on.afterCreated.active = true;

                        page.on.afterCreated.dispatch();
                    }

                });

                $(document.body).on('updatelayout', function (e, f) {

                });

                $(document.body).on('pageload', function (e) {

                });

                lsWire.signalsInitialized = true;
            };

			// Internal function
            function getScreen(type, data) {

                var pageId = null;
                var scrn = null;

                if (_.isObject(data)) {
                    switch (type) {

                        case "to":
                            if (data.toPage != undefined && _.isObject(data.toPage) && data.toPage.length > 0) {
                                pageId = data.toPage[0].id;
                            };
                            break;

                        case "prev":
                            if (data.prevPage != undefined && _.isObject(data.prevPage) && data.prevPage.length > 0) {
                                pageId = data.prevPage[0].id;
                            };
                            break;

                        case "next":
                            if (data.nextPage != undefined && _.isObject(data.nextPage) && data.nextPage.length > 0) {
                                pageId = data.nextPage[0].id;
                            };
                            break;

                        case "from":
                            if (data.options != undefined && _.isObject(data.options) && data.options.fromPage != undefined && data.options.fromPage.length > 0) {
                                pageId = data.options.fromPage[0].id;
                            }

                            break;

                        case "first":
                            pageId = lsWire.getShell().shellView._firstPageId;

                            break;

                        case "target":
                            pageId = data.target.id;
                            break;

                        default:
                            pageId = lsWire.getShell().activeNavigationUnit.screen.details._pageId;

                    }
                }

                if (pageId != undefined) {

                    var page = lsWire.getShell().shellView._pageIdMapping[pageId];

                    if (page != undefined && page.unit != undefined && page.unit.screen != undefined)
                        scrn = page.unit.screen;
                }
                return scrn;
            };

        },

        initializeAfterShown: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initializes monitoring/calling of myapp.{screenName}.afterShown(screen) 
            /// .afterShown is called right after the visual screen has been displayed
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************
            var shell = lsWire.getShell();

            if (shell != undefined) {
                shell.onchange = function (e) {
                    if (e.detail === "activeNavigationUnit" && e.type === "change") {
                        shell.finishNavigation().then(function () {
                            var anu = shell.activeNavigationUnit;
                            var init = myapp[anu.screen.details._modelId]["afterShown"];
                            if (init != undefined) {
                                init(anu.screen);
                                $("#" + anu.screen.details._pageId).focus();
                            }
                        });
                    }
                }
            }

        },

        initializeBeforeShown: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initializes monitoring/calling of myapp.{screenName}.beforeShown(screen)
            /// Will only be called once, when the screen has been initialized.
            /// Will not be called when a back button is used, etc.
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            $(window).on("pagebeforechange", function (e, navigationData) {

                var shell = lsWire.getShell();

                var pageId = null;

                if (typeof (navigationData.toPage) == "object") {

                    pageId = navigationData.toPage[0].id;
                    var page = shell.shellView._pageIdMapping[pageId];
                    if (page != undefined) {

                        var nextScreen = page.unit.screen;

                        var modelId = nextScreen.details._modelId;
                        var screenMethod = myapp[modelId]["beforeShown"];

                        if (screenMethod != undefined) {

                            // If this was a direct link... but they got back home, remove the flag
                            if (!!myapp.directLinked && lsWire.shell._homeScreen.id == modelId) {
                                delete myapp.directLinked;
                            }

                            screenMethod(nextScreen, navigationData);
                        };

                        // Run our after rendered call
                        setTimeout(function () {

                            var screenAfterRenderedMethod = myapp[modelId]["afterRendered"];

                            if (screenAfterRenderedMethod != undefined) {
                                screenAfterRenderedMethod(nextScreen, navigationData);
                            };

                        }, 0);


                    };

                };

            });

        },

        initializeTabCommand: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initializes monitoring/calling of myapp.{screenName}.beforeTabChange(screen, currentTabName, nextTabName)
            /// .beforeTabChange will be called when a user clicks on a tab, before screen changes
            /// If you return false, no navigation will occur, if you return a function, that will execute before navigation
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var shell = lsWire.getShell();

            if (shell != undefined) {
                shell.finishNavigation().then(function () {
                    var anu = shell.activeNavigationUnit;
                    var screen = anu.screen;
                    var tabCommands = anu.task.tabCommands;

                    _.forEach(tabCommands, function (tabCommand) {

                        tabCommand.command.___method = function (n, t) {

                            var beforeTabChange = myapp[screen.details._modelId]["beforeTabChange"];
                            var result;

                            if (_.isFunction(beforeTabChange)) {
                                result = beforeTabChange(screen, anu.pageName, n);
                            }

                            if (_.isBoolean(result) && !result) {
                                return false;
                            } else {

                                if ((t == undefined || t.beforeShown == undefined) && _.isFunction(result)) {
                                    t = { beforeShown: result(screen, anu.pageName, n) }
                                }

                                var i = t ? t.beforeShown : null;
                                return shell.showTab(n, null, i);
                            };

                        };

                    });

                });
            }


        },

        initializeDiscardCommand: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initializes monitoring/calling of myapp.{screenName}.beforeDiscard(screen)
            /// .beforeDiscard is called before the native discard gets called, pass false to stop the discard
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var shell = lsWire.getShell();

            if (shell != undefined) {

                shell.discardCommand.command.___method = function () {

                    // Current screen we are working with
                    var scrn = shell.activeNavigationUnit.screen;

                    // Get our modelId
                    var modelId = scrn.details._modelId;

                    // What is our navigate back method
                    var navigateBackOption = "beforeSaveBoundary";

                    // Call our before boundary 
                    var beforeDiscardCommand = myapp[modelId]["beforeDiscard"];

                    if (beforeDiscardCommand != undefined) {
                        var beforeDiscardCommandResult = beforeDiscardCommand(scrn);

                        if (beforeDiscardCommandResult != undefined && beforeDiscardCommandResult.done != undefined) {

                            return beforeDiscardCommandResult.done(function (result) {

                                if (result) {
                                    if (shell.canCancelNestedChanges) {
                                        return shell.cancelNestedChanges();
                                    } else {
                                        return shell.discardChanges(navigateBackOption);
                                    }
                                } else {
                                    return false;
                                }

                            });

                        } else {

                            if (beforeDiscardCommandResult == undefined || beforeDiscardCommandResult) {
                                if (shell.canCancelNestedChanges) {
                                    return shell.cancelNestedChanges();
                                } else {
                                    return shell.discardChanges(navigateBackOption);
                                }
                            } else {
                                return false;
                            }
                        }
                    } else {
                        if (shell.canCancelNestedChanges) {
                            return shell.cancelNestedChanges();
                        } else {
                            return shell.discardChanges(navigateBackOption);
                        }
                    }
                }
            }
        },

        initializeSaveCommand: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initializes monitoring/calling of myapp.{screenName}.beforeSave(screen)
            /// .beforeSave gets called right before the native save, return false to cancel the save operation
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var shell = lsWire.getShell();

            if (shell != undefined) {

                shell.saveCommand.command.___method = function () {

                    // Current screen we are working with
                    var scrn = shell.activeNavigationUnit.screen;

                    // Get our modelId
                    var modelId = scrn.details._modelId;

                    // What is our navigate back method
                    //var navigateBackOption = "beforeSaveBoundary";
                    var navigateBackOption = "beforeSaveBoundary";

                    // Call our before boundary 
                    var beforeSaveCommand = myapp[modelId]["beforeSave"];

                    if (beforeSaveCommand != undefined) {
                        var beforeSaveCommandResult = beforeSaveCommand(scrn);

                        if (beforeSaveCommandResult != undefined && beforeSaveCommandResult.done != undefined) {

                            return beforeSaveCommandResult.done(function (result) {

                                if (result) {
                                    if (shell.canApplyNestedChanges) {
                                        return shell.applyNestedChanges(navigateBackOption);
                                    } else {
                                        return shell.saveChanges(navigateBackOption);
                                    }
                                } else {
                                    return shell.cancelChanges();
                                }

                            });

                        } else {
                            if (beforeSaveCommandResult !== false) {
                                if (shell.canApplyNestedChanges) {
                                    return shell.applyNestedChanges(navigateBackOption);
                                } else {
                                    return shell.saveChanges(navigateBackOption);
                                }
                            } else {
                                return false;
                            }
                        }
                    } else {
                        if (shell.canApplyNestedChanges) {
                            return shell.applyNestedChanges(navigateBackOption);
                        } else {
                            return shell.saveChanges(navigateBackOption);
                        }
                    }
                }
            }
        },

        initializeBackCommand: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initializes monitoring/calling of myapp.{screenName}.beforeBack(screen)
            /// .beforeBack gets call right before navigation takes blace to the previous screen, return false to cancel the operation
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var shell = lsWire.getShell();

            if (shell != undefined) {

                shell.backCommand.command.___method = function (distance) {

                    // Current screen we are working with
                    var scrn = shell.activeNavigationUnit.screen;

                    // Get our modelId
                    var modelId = scrn.details._modelId;

                    // Call our before boundary 
                    var beforeBackCommand = myapp[modelId]["beforeBack"];

                    if (beforeBackCommand != undefined) {

                        // Execute the callback
                        var beforeBackCommandResult = beforeBackCommand(scrn);

                        // If its a promise, do not navigate back until done
                        if (beforeBackCommandResult != undefined && beforeBackCommandResult.done != undefined) {

                            beforeBackCommandResult.done(function (result) {

                                // If success, navigate back
                                if (result) {
                                    return shell.navigateBack(distance);
                                }
                            });

                        } else {

                            if (beforeBackCommandResult !== false) {
                                return shell.navigateBack(distance);
                            }

                        }

                    } else {
                        return shell.navigateBack(distance);
                    }
                }
            }
        },

        initializeHomeCommand: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initializes monitoring/calling of myapp.{screenName}.beforeHome(screen)
            /// .beforeHome gets called right before a navigateHome takes place, return a false to cancel the operation
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var shell = lsWire.getShell();

            if (shell != undefined) {

                shell.homeCommand.command.___method = function () {

                    // Current screen we are working with
                    var scrn = shell.activeNavigationUnit.screen;

                    // Get our modelId
                    var modelId = scrn.details._modelId;

                    // Call our before boundary 
                    var beforeHomeCommand = myapp[modelId]["beforeHome"];

                    if (beforeHomeCommand != undefined) {

                        // Execute the callback
                        var beforeHomeCommandResult = beforeHomeCommand(scrn);

                        // If its a promise, do not navigate back until done
                        if (beforeHomeCommandResult != undefined && beforeHomeCommandResult.done != undefined) {

                            beforeHomeCommandResult.done(function (result) {

                                // If success, navigate back
                                if (result) {
                                    return shell.navigateHome();
                                }
                            });

                        } else {

                            if (beforeHomeCommandResult !== false) {
                                return shell.navigateHome();
                            }

                        }

                    } else {
                        return shell.navigateHome();
                    }
                }
            }
        },

        initializeCloseCommand: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initializes monitoring/calling of myapp.{screenName}.beforeClose(screen)
            /// .beforeClose gets called before a screen actually gets closed (popup), return a false to cancel the operation
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var shell = lsWire.getShell();

            if (shell != undefined) {

                shell.closeCommand.command.___method = function (distance) {

                    // Current screen we are working with
                    var scrn = shell.activeNavigationUnit.screen;

                    // Get our modelId
                    var modelId = scrn.details._modelId;

                    // Call our before boundary 
                    var beforeCloseCommand = myapp[modelId]["beforeClose"];

                    if (beforeCloseCommand != undefined) {

                        // Execute the callback
                        var beforeCloseCommandResult = beforeCloseCommand(scrn);

                        // If its a promise, do not navigate back until done
                        if (beforeCloseCommandResult != undefined && beforeCloseCommandResult.done != undefined) {

                            beforeCloseCommandResult.done(function (result) {

                                // If success, navigate back
                                if (result) {
                                    shell.navigateBack(distance);
                                }
                            });

                        } else {

                            if (beforeCloseCommandResult !== false) {
                                shell.navigateBack(distance);
                            }

                        }

                    } else {
                        shell.navigateBack(distance);
                    }
                }
            }
        },

        initializeOkCommand: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initializes monitoring/calling of myapp.{screenName}.beforeOk(screen)
            /// .beforeOk gets called right before executing the native Ok command, return a false to cancel the operation
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var shell = lsWire.getShell();

            if (shell != undefined) {

                shell.okCommand.command.___method = function () {

                    // Current screen we are working with
                    var scrn = shell.activeNavigationUnit.screen;

                    // Get our modelId
                    var modelId = scrn.details._modelId;

                    // What is our navigate back method
                    var navigateBackOption = "beforeSaveBoundary";

                    // Call our before boundary 
                    var beforeOkCommand = myapp[modelId]["beforeOk"];

                    if (beforeOkCommand != undefined) {
                        var beforeOkCommandResult = beforeOkCommand(scrn);

                        if (beforeOkCommandResult != undefined && beforeOkCommandResult.done != undefined) {

                            return beforeOkCommandResult.done(function (result) {

                                if (result) {
                                    if (shell.canApplyNestedChanges) {
                                        return shell.applyNestedChanges(navigateBackOption);
                                    } else {
                                        return shell.saveChanges(navigateBackOption);
                                    }
                                } else {
                                    return shell.cancelChanges();
                                }

                            });

                        } else {
                            if (beforeOkCommandResult !== false) {
                                if (shell.canApplyNestedChanges) {
                                    return shell.applyNestedChanges(navigateBackOption);
                                } else {
                                    return shell.saveChanges(navigateBackOption);
                                }
                            } else {
                                return false;
                            }
                        }
                    } else {
                        if (shell.canApplyNestedChanges) {
                            return shell.applyNestedChanges(navigateBackOption);
                        } else {
                            return shell.saveChanges(navigateBackOption);
                        }
                    }
                }
            }
        },

        initializeCancelCommand: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initializes monitoring/calling of myapp.{screenName}.beforeCancel(screen)
            /// .beforeCancel gets called right before executing the native Cancel command, return a false to cancel the operation
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var shell = lsWire.getShell();

            if (shell != undefined) {

                shell.cancelCommand.command.___method = function () {

                    // Current screen we are working with
                    var scrn = shell.activeNavigationUnit.screen;

                    // Get our modelId
                    var modelId = scrn.details._modelId;

                    // What is our navigate back method
                    var navigateBackOption = "beforeSaveBoundary";

                    // Call our before boundary 
                    var beforeCancelCommand = myapp[modelId]["beforeCancel"];

                    if (beforeCancelCommand != undefined) {
                        var beforeCancelCommandResult = beforeCancelCommand(scrn);

                        if (beforeCancelCommandResult != undefined && beforeCancelCommandResult.done != undefined) {

                            return beforeCancelCommandResult.done(function (result) {

                                if (result) {
                                    if (shell.canCancelNestedChanges) {
                                        return shell.cancelNestedChanges();
                                    } else {
                                        return shell.discardChanges(navigateBackOption);
                                    }
                                } else {
                                    return false;
                                }

                            });

                        } else {

                            if (beforeCancelCommandResult == undefined || beforeCancelCommandResult) {
                                if (shell.canCancelNestedChanges) {
                                    return shell.cancelNestedChanges();
                                } else {
                                    return shell.discardChanges(navigateBackOption);
                                }
                            } else {
                                return false;
                            }
                        }
                    } else {
                        if (shell.canCancelNestedChanges) {
                            return shell.cancelNestedChanges();
                        } else {
                            return shell.discardChanges(navigateBackOption);
                        }
                    }
                }
            }
        },

        initializeLogoutCommand: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initializes monitoring/calling of myapp.{screenName}.beforeLogout(screen)
            /// .beforeLogout gets called right before executing the native Logout command, return a false to cancel the operation
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var shell = lsWire.getShell();

            if (shell != undefined) {

                if (shell._isFormsAuthEnabled) {
                    shell.logoutCommand.command.___method = function () {

                        // Current screen we are working with
                        var scrn = shell.activeNavigationUnit.screen;

                        // Get our modelId
                        var modelId = scrn.details._modelId;

                        // Call our before boundary 
                        var beforeLogoutCommand = myapp[modelId]["beforeLogout"];

                        if (beforeLogoutCommand != undefined) {

                            // Execute the callback
                            var beforeLogoutCommandResult = beforeLogoutCommand(scrn);

                            // If its a promise, do not navigate back until done
                            if (beforeLogoutCommandResult != undefined && beforeLogoutCommandResult.done != undefined) {

                                beforeLogoutCommandResult.done(function (result) {

                                    // If success, navigate back
                                    if (result) {
                                        shell.shellView.logout();
                                    }
                                });

                            } else {

                                if (beforeLogoutCommandResult !== false) {
                                    shell.shellView.logout();
                                }

                            }

                        } else {
                            shell.shellView.logout();
                        }

                    };
                };
            }
        },

        initializeAfterClosed: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>)
            /// <summary>
            /// Initializes monitoring/calling of myapp.{screenName}.afterClosed(screen)
            /// .afterClosed gets called after a screen gets closed, but before it gets destroyed
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Get our shell
            var shell = lsWire.getShell();

            if (shell != undefined) {

                // Typically we should be navigating
                if (shell.navigationInProgress) {

                    // And if we are, make sure we finish our navigation
                    shell.finishNavigation().then(function () {

                        // Get our modelId
                        var modelId = shell.activeNavigationUnit.screen.details._modelId;

                        // Look for the method 
                        var afterClosedCommand = myapp[modelId]["afterClosed"];

                        if (afterClosedCommand != undefined) {

                            // Execute the callback then the passed one
                            var passedClosed = shell.activeNavigationUnit.afterClosed;
                            shell.activeNavigationUnit.afterClosed = function (s, a) {
                                afterClosedCommand(s, a);
                                passedClosed(s, a);
                            }

                        }

                    });

                }


            }

        },

        initializeShell: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initialize/Get a hook into the application shell object
            /// This not the visual shell, but application shell where all the functionality lives
            /// </summary>
            /// <param name="screen" type="object">Screen object</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Has the shell been initialized already?  If so return it
            if (lsWire.shell === undefined) {

                if (msls.shell !== undefined) {
                    lsWire.shell = msls.shell;
                } else {

                    // Shortcut to our dependents
                    var dependents = screen.details.startPage._dependents;

                    // As look as we have dependents (no empty screen)
                    if (dependents !== undefined) {

                        // Get a property that has tracking info
                        var tracker = dependents['isVisible'];

                        // Now go grab a hook to the shell and stuff it
                        if (tracker[0] !== undefined)
                            lsWire.shell = tracker[0].trackingStub.o.task.shell;
                    }
                }
            }

            // return the shell
            return lsWire.shell;
        },

        getShell: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// A wrapper to get a hook into the application shell object.  Use this most of the time as it will make
            /// sure the shell exists.
            /// </summary>
            /// <param name="screen" type="object" optional="false">Screen object</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            return lsWire.initializeShell(screen);

        },

        activateAllPages: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Activate all pages (tabs) of a screen, works well to get the system to start getting additional data
            /// </summary>
            /// <param name="screen" type="object" optional="false">Screen object</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (screen == undefined) return;

            var screenPages = screen.details.pages;

            for (var i = 0; i < screenPages.length; i++) {
                if (screenPages[i]._isActivated === undefined) screenPages[i]._activate();
            }

        },

        activatePage: function (screen, pageName) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Activate a particular page (tab) of a screen
            /// </summary>
            /// <param name="screen" type="object" optional="false">Screen object</param>
            /// <param name="pageName" type="string" optional="false">Page (tab) name</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (screen == undefined || pageName == undefined) return;

            // Get the screen page of this tab
            var page = lsWire.getPage(pageName, screen);

            // Are we showing as being activated?  If not, activate it
            // This will allow the visual collections to load their data
            if (page._isActivated === undefined) page._activate();

        },

        // #endregion


        // #region Utility - 39 functions
        // ==========================================================

        getCustomResourceString: function (jsonString, key) {
            var result;

            // Is this a valid JSON object?
            try {
                var parsed = JSON.parse(jsonString);
                result = parsed[key];
            } catch (e) {
                result = undefined;
            }

            return result;
        },

        getDataItemCount: function (screenDataItem, async) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get an item count for the passed screen data query/item.  Will use jquery ajax call to ask the
            /// server for a total item count based on the query.
            /// </summary>
            /// <param name="screenDataItem" type="object" optional="false">Data item (query/table)</param>
            /// <returns type=""></returns>
            /// </signature>
            /// <signature>
            /// <param name="screenDataItem" type="object" optional="false">Data item (query/table)</param>
            /// <param name="async" type="boolean" optional="true">Use async or not?  Defaults to true</param>
            /// <returns type=""></returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // This is a non async function... so be aware

            var result = null;
            var ajaxCall = null;
            async = async == undefined ? true : async;

            // If there is no screenQuery item, or its a root item, then return undefined
            if (screenDataItem == undefined || screenDataItem._loader == undefined) return result;

            // If the data has already been loaded, ie by going "back", just returh the count
            if (screenDataItem.isLoaded) {
                result = screenDataItem.count;
            } else {

                // Get our query, add in that we only want a count, but need at least one field
                var url = screenDataItem._loader._baseQuery._requestUri;
                url += "&$select=Id&$inlinecount=allpages";

                // Do our call to the server, but not async, as we need to know now before continuing
                ajaxCall = $.ajax({
                    async: async,
                    dataType: "json",
                    url: url,
                    success: function (data) {
                        result = parseInt(data["odata.count"]);
                    }
                });

            };

            return async ? ajaxCall : parseInt(result);

        },

        noDirectLinking: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Wrapper to force a user from the current page and to the root of the application
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Hide any visual of where we are
            window.document.body.classList.add("msls-collapsed");

            // Now force the user to the root of the app
            window.location.replace(myapp.rootUri);

        },

        goBackOrHome: function (e, options) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Wrapper that, based on the navigation stack, will either take the user back to the previous screen or to the home screen.
            /// </summary>
            /// </signature>
            /// <signature>
            /// <param name="e" type="object" optional="true">Event object</param>
            /// </signature>
            /// <signature>
            /// <param name="e" type="object" optional="true">Event object</param>
            /// <param name="callBack" type="function" optional="true">Function to run before navigation actually takes place</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // if we have an event object, prevent the obvious
            if (e != undefined && e["preventDefault"] != undefined) {
                e.preventDefault();
                e.stopPropagation();
            }

            if (options == undefined) options = {};

            // If navigation is still in progress we can't move, so show message and return
            if (lsWire.getShell().navigationInProgress) {
                msls.showMessageBox("There is a problem navigating back... \nTry again or you will need to refresh your browser... my appologies.");
            } else {

                var beforeNavigationResult;
                var canGoBack = _.size(lsWire.getShell().navigationStack) > 1;

                // Run user passed method/function
                if (options.beforeNavigation != undefined) {
                    beforeNavigationResult = options.beforeNavigation(canGoBack);
                }

                beforeNavigationResult = beforeNavigationResult == undefined ? true : beforeNavigationResult;

                // Finally make decision of whether we can go back to need to just go home
                if (beforeNavigationResult) {

                    var replaceNavigationResult = false;

                    // If a replacement navigation logic was passed, run it
                    if (options.replaceNavigation != undefined) {

                        replaceNavigationResult = options.replaceNavigation(e, canGoBack);
                        replaceNavigationResult = replaceNavigationResult == undefined ? true : replaceNavigationResult;

                    }

                    // If result from replacement nav was false, go run the default 
                    if (!replaceNavigationResult) {
                        if (canGoBack) {
                            myapp.navigateBack();
                        } else {
                            myapp.navigateHome();
                        }
                    }
                }
            }
        },

        getStyleSheet: function (sheetId) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Retrieve a style sheet based on its Id or Title
            /// </summary>
            /// <param name="sheetId" type="string" optional="false">sheetId can be either an ID property or Title property</param>
            /// <returns type="object">Stylesheet object</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Lets look for the sheet
            for (var i = 0; i < document.styleSheets.length; i++) {
                var sheet = document.styleSheets[i];
                if (sheet.title === sheetId || sheet.id === sheetId) {
                    return sheet;
                }
            }

            return undefined;
        },

        getStyleRule: function (sheet, ruleSelector) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get a Style Rule, from which you can manipulate
            /// </summary>
            /// <param name="sheet" type="object" optional="false">Stylesheet object</param>
            /// <param name="ruleSelector" type="string" optional="false">CSS Rule selector</param>
            /// <returns type="object">Style rule</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Our return value
            var rule = undefined;

            if (sheet !== undefined && sheet !== null) {
                // Find our rule based on its selector

                var rules = sheet.cssRules == undefined ? sheet.rules : sheet.cssRules;

                _.find(rules, function (r, v) {

                    if (r.selectorText === ruleSelector) {
                        rule = { index: v, rule: r }
                        return true;
                    } else {
                        return false;
                    }

                });

            }

            return rule;
        },

        changeStyleRule: function (sheetId, ruleSelector, styleProperties) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Add/change a style rule
            /// </summary>
            /// <param name="sheetId" type="string" optional="false">sheetId can be either an ID property or Title property</param>
            /// <param name="ruleSelector" type="string" optional="false">CSS rule selector, ie: .msls-tabs-bar (with period) If styleProperties is null or undefined, the rule will be deleted</param>
            /// </signature>
            /// <signature>
            /// <param name="sheetId" type="string" optional="false">sheetId can be either an ID property or Title property</param>
            /// <param name="ruleSelector" type="string" optional="false">CSS rule selector, ie: .msls-tabs-bar (with period)</param>
            /// <param name="styleProperties" optional="true">Properties for the rule, ie: {max-width: '100px', color: 'red'}. If styleProperties is null or undefined, the rule will be deleted</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Get our style sheet
            var sheet = lsWire.getStyleSheet(sheetId);

            // Get our rule from the sheet
            var ruleObj = lsWire.getStyleRule(sheet, ruleSelector);

            // If no style properties, delete the rule
            if (styleProperties !== undefined && styleProperties !== null) {

                // It does not exist, so lets go add it
                if (ruleObj === undefined || ruleObj === null) {

                    // Stringify our properties
                    var styleString = ruleSelector + " { ";

                    _.forEach(styleProperties, function (value, key) {
                        styleString += (key + ":" + value + ";");
                    });

                    styleString += " }";

                    var ruleLocation = sheet.cssRules == undefined ? sheet.rules.length : sheet.cssRules.length;

                    sheet.insertRule(styleString, ruleLocation);

                    // It does exist, so lets update the properties only
                } else {

                    _.forEach(styleProperties, function (value, key) {
                        ruleObj.rule.style[key] = value;
                    });

                }
            } else {
                if (ruleObj !== undefined && ruleObj !== null) {
                    sheet.deleteRule(ruleObj.index);
                }

            }

        },

        getParentByTagName: function (element, tagName) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Find the parent of an element that matches a tag name, non jQuery
            /// </summary>
            /// <param name="element" type="object" optional="false">DOM Element</param>
            /// <param name="tagName" type="string" optional="false">Tag name to locate</param>
            /// <returns type="object">DOM element or null if not found</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (element == undefined || tagName == undefined) return null;

            var foundElement = element;
            tagName = tagName.toUpperCase();

            while (foundElement && foundElement.tagName !== tagName) {
                foundElement = foundElement.parentElement;
            }

            return foundElement;

        },

        getParentByClassName: function (element, className) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Find the parent of an element that matches a class name, non jQuery.
            /// </summary>
            /// <param name="element" type="object" optional="false">DOM Element</param>
            /// <param name="className" type="string" optional="false">Class name to locate</param>
            /// <returns type="object">DOM element or null if not found</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (element == undefined || className == undefined) return null;

            var foundElement = element;

            while (foundElement && !foundElement.classList.contains(className)) {
                foundElement = foundElement.parentElement;
            }

            return foundElement;

        },

        onceElementAttrChange: function (element, attrName, method) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Monitor the attribute of a DOM element, when it changes, fire off the method
            /// </summary>
            /// <param name="element" type="object" optional="false">DOM Element of the control</param>
            /// <param name="attrName" type="string" optional="false">Name of the attribute to monitor</param>
            /// <param name="method" type="object" optional="false">Method to execute when the attribute changes</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (element == undefined || attrName == undefined || method == undefined) return null;

            var $element = $(element);
            var origValue = $element.css(attrName);
            monitorAttr();

            function monitorAttr() {
                if ($element.css(attrName) !== origValue) {
                    $element.trigger(attrName + 'Change');
                    method();
                    return null;
                }

                setTimeout(monitorAttr, 50);
                return null;
            }

            return null;

        },

        createUid: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Generate unique id's... we only care about session based
            /// Could also use the function available in lodash
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        fixMetadataHandlerForEtag1: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Fix for issues around ETag, still exists as of March 2014 update. Call this one first. Then call
            /// fixJsonHandlerForEtag2
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // *****************************************************************************************************
            // *****************************************************************************************************
            // Low level fix for issues around ETag missing in properties
            // You can review this fix from a Microsoft TechNet article at:
            // http://social.technet.microsoft.com/wiki/contents/articles/20718.the-etag-value-in-the-request-header-does-not-match-with-the-current-etag-of-the-object.aspx
            // I have done a few changes from the original article so that it works
            // across all feeds.  Original article missed an important piece and is noted 
            // in the code below
            // *****************************************************************************************************
            // *****************************************************************************************************


            window.origMetadataReadFunc = window.OData.metadataHandler.read;
            window.OData.metadataHandler.read = function (response, context) {
                origMetadataReadFunc.call(window.OData.metadataHandler, response, context);
                var data = response.data,
					schema = data && data.dataServices && data.dataServices.schema && data.dataServices.schema[0],
					entities = schema && schema.entityType || [];
                entities.forEach(function (entity) {
                    var i,
						properties = entity.property || [];
                    for (i = properties.length - 1; i >= 0; i--) {
                        var property = properties[i];
                        if (property.name === "Microsoft_LightSwitch_ETag") {
                            property.type = "Edm.String";
                            break;
                        }
                    }
                });
            };
        },

        fixJsonHandlerForEtag2: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Fix for issues around ETag, still exists as of March 2014 update. Call fixMetadataHandlerForEtag1 first.
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            window.origJsonReadFunc = window.OData.jsonHandler.read;
            window.OData.jsonHandler.read = function (response, context) {
                var result = origJsonReadFunc.call(window.OData.jsonHandler, response, context);

                var data = response.data, results = data.results;
                if (results) {
                    results.forEach(function (entity) {
                        if (entity.__metadata.etag) {
                            var etag = entity.__metadata.etag,
								firstIndex = etag.indexOf("'"),
								lastIndex = etag.lastIndexOf("'"),
								coreEtag = "";
                            for (var i = firstIndex + 1; i < lastIndex; i++) {
                                var chr = etag[i];
                                coreEtag += chr;
                                if (chr == "'") {
                                    coreEtag += "'";
                                    if (etag[i + 1] == "'") {
                                        i++;
                                    }
                                }
                            }
                            // Missing from the original TechNet article.  Only do the fix if
                            // the remote service actually sent an ETag
                            if (firstIndex > 0) {
                                entity.__metadata.etag = etag.substr(0, firstIndex + 1) + coreEtag + etag.substr(lastIndex);
                            }
                        }
                    });
                }

                return result;
            };
        },

        getUrlParameterByName: function (name) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get URL Parameter by its name
            /// </summary>
            /// <param name="name" type="string" optional="false">Name of the parameter to fetch</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (name == undefined) return null;

            name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
            var regexS = "[\\?&]" + name + "=([^&#]*)";
            var regex = new RegExp(regexS);
            var results = regex.exec(window.location);
            if (results == null)
                return "";
            else
                return decodeURIComponent(results[1].replace(/\+/g, " "));

        },

        roundUp: function (value, precision) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Rounds a number up to a certain precision
            /// </summary>
            /// <param name="value" type="number" optional="false">Number to round up</param>
            /// <returns type="number">Result of the rounding</returns>
            /// </signature>
            /// <signature>
            /// <param name="value" type="number" optional="false">Number to round up</param>
            /// <param name="precision" type="number" optional="true">Number of decimal places, defaults to 2</param>
            /// <returns type="number">Result of the rounding</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            precision = precision == undefined ? 2 : precision;

            var power = Math.pow(10, precision);
            var poweredValue = Math.ceil(value * power);

            return poweredValue / power;

        },

        nbSpaces: function (count) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Creates a string with HTML non breaking spaces
            /// </summary>
            /// <param name="count" type="number" optional="false">Length</param>
            /// <returns type="string">String containing the specified number of non breaking spaces</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (count == undefined) return "";

            var text = "";

            for (var i = 0; i < count - 1; i++) {
                text += "&nbsp;";
            }

            return text;
        },

        iterateOverChildren: function (parent, callBack, propertyName) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Iterate over children until no children are left, executing passed function for each child object. 
            /// </summary>
            /// <param name="parent" type="object" optional="false">Top level object to start</param>
            /// <param name="callBack" type="function" optional="false">Method to call on each child object</param>	
            /// </signature>
            /// <signature>
            /// <param name="parent" type="object" optional="false">Top level object to start</param>
            /// <param name="callBack" type="function" optional="false">Method to call on each child object</param>	
            /// <param name="propertyName" type="string" optional="true">Name of the property to iterate over, defaults to "children"</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (parent == undefined || callBack == undefined) return;

            propertyName = propertyName == undefined ? "children" : propertyName;

            if (parent) {

                _.each(parent[propertyName], function (child) {

                    callBack(child);

                    lsWire.iterateOverChildren(child, callBack);
                });

            }

        },

        getNestedPropertyValue: function (parent, bindingPath) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Iterate over the passed binding path to get the value of the property.  Allows getting by string.
            /// </summary>
            /// <param name="parent" type="object" optional="false">Top level object to start</param>
            /// <param name="bindingPath" type="string" optional="false">What binding path are we looking for</param>	
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var result;

            if (bindingPath != undefined) {
                var pathElements = bindingPath.split('.');

                if (pathElements) {

                    _.each(pathElements, function (property, index) {

                        if (parent[property] != undefined) {
                            if (pathElements.length - 1 == index) {
                                result = parent[property];
                            } else {
                                parent = parent[property];
                            }
                        }

                    });

                }
            }

            return result;

        },

        sendGoogleAnalyticsScreenHit: function (title) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Send page information to google analytics if configured and enabled
            /// </summary>
            /// </signature>
            /// <signature>
            /// <param name="title" type="string" optional="true">Title you would like to use for googles dashboard</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (window.ga != undefined) {
                title = title == undefined ? lsWire.getActiveScreen().details._modelId : title;

                ga('send', {
                    'hitType': 'pageview',
                    'page': '' + window.location.hash.split('[')[0],
                    'title': title
                });
            }
        },

        browserIsIE: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Is the browser we are in, Internet Explorer
            /// </summary>
            /// <returns type="boolean">true if the browser is IS else false</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            return _.contains(window.navigator.userAgent.toLowerCase(), "msie");
        },

        browserIsSafari: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Is the browser we are in, Safari
            /// </summary>
            /// <returns type="boolean">true if its Safari else false</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var userAgent = window.navigator.userAgent.toLowerCase();

            return (!_.contains(userAgent, "chrome") && _.contains(userAgent, "safari"));
        },

        dataHasChanges: function (modelId, typeOfChange) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Does any of the data changes belong to the passed modelId, can also pass an optional type of change
            /// </summary>
            /// <param name="modelId" type="string" optional="false">Model Id we want to search for changes</param>
            /// <returns type="boolean">true if any changes/edits belong to the model</returns>
            /// </signature>
            /// <signature>
            /// <param name="modelId" type="string" optional="false">Model Id we want to search for changes</param>
            /// <param name="typeOfChange" type="string" optional="true">What type of change are you looking for, deleted, edited, added</param>
            /// <returns type="boolean">true if any changes/edits belong to the model</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (modelId == undefined) return null;

            // Search thru the data changes for items belonging to the passed model
            var changes = myapp.activeDataWorkspace.ApplicationData.details.getChanges();

            return _.any(changes, function (entity) {
                return (entity.details._model.id == modelId)
					&& (typeOfChange == undefined ? true : entity.details.entityState == typeOfChange);
            });

        },

        changeDocumentTitle: function (title) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Wrapper to change the title of our HTML document.  This directly will show as the title on the browser tab
            /// </summary>
            /// <param name="title" type="string" optional="false">Title to use for the document</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            setTimeout(function () {
                document.title = title;
            }, 0);
        },

        mergeTemplateWithData: function (template, screen, entity) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Merges data with a handlbar'ish template string, allows for dynamic merging based only on the template
            /// </summary>
            /// <param name="template" type="string" optional="false">Our template with the handlebars</param>
            /// <returns type="string">A string with the merged data</returns>
            /// </signature>
            /// <signature>
            /// <param name="template" type="string" optional="false">Our template with the handlebars</param>
            /// <param name="screen" type="object" optional="true">The screen we will look for properties as the data fields</param>
            /// <returns type="string">A string with the merged data</returns>
            /// </signature>
            /// <signature>
            /// <param name="template" type="string" optional="false">Our template with the handlebars</param>
            /// <param name="screen" type="object" optional="true">The screen we will look for properties as the data fields</param>
            /// <param name="entity" type="object" optional="true">The entity we will look into for the data fields</param>
            /// <returns type="string">A string with the merged data</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // If template is null or undefined return
            if (template == undefined) return undefined;

            // Split the newTabName into pieces and return only the ones with a handlebar
            var mergeFields = _.filter(template.split(" "), function (e) {
                return _.contains(e, "{{" && "}}");
            });

            // Next remove the handlebars totally, giving us our actual property names
            mergeFields = _.map(mergeFields, function (field) {
                return {
                    token: field,
                    property: field.replace(/[{}]/g, ""),
                    value: null
                }
            });

            // Now for each property name
            _.forEach(mergeFields, function (field) {

                // Priority are screen contentItems, but if no screen, skip
                if (screen != undefined) {
                    var foundItem = screen.findContentItem(field.property);

                    // If found, get its value
                    if (foundItem) {
                        field.value = foundItem.value != undefined ? foundItem.value.toString() : "";
                    }
                }

                // If no entity, skip
                if (entity != undefined) {
                    // If value is still null, lets check for an entity property
                    if (lsWire.isEmpty(field.value)) {
                        field.value = entity[field.property] != undefined ? entity[field.property].toString() : "";
                    }
                }

                // Replace our value into the text
                if (field.value != undefined) {
                    template = template.replace(field.token, field.value);
                }
            });

            return template;
        },

        on: function (parentObject, eventName, callBack) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Easily create an event handler on the object
            /// </summary>
            /// <param name="parentObject" type="object" optional="false">The parent object that we will add our listener</param>
            /// <param name="eventName" type="string" optional="false">What event do we want to listen for</param>
            /// <param name="callBack" type="function" optional="false">Function to call once the event gets fired</param>
            /// <returns type="object">Our event object.  Use for removing the listener when you are done</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var eventObject = null;

            if (parentObject != undefined && parentObject.addEventListener != undefined && eventName != undefined && callBack != undefined) {
                parentObject.addEventListener(eventName, callBack);

                eventObject = { object: parentObject, event: eventName, callBack: callBack };

                var anu = lsWire.getShell().activeNavigationUnit;

                if (anu.lsWireEventObjects == undefined)
                    anu.lsWireEventObjects = [];

                anu.lsWireEventObjects.push(eventObject);
            }

            return eventObject;
        },

        off: function (eventObject) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Removes an event listener.
            /// </summary>
            /// <param name="eventObject">Event object that gets created with the on function</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (eventObject.object != undefined && eventObject.event != undefined && eventObject.callBack != undefined) {

                eventObject.removeEventListener(eventObject.event, eventObject.callBack);

                var anu = lsWire.getShell().activeNavigationUnit;

                if (anu.lsWireEventObjects != undefined && anu.lsWireEventObjects.length > 0) {

                    anu.lsWireEventObjects = _.remove(anu.lsWireEventObjects, function (e) {
                        return (eventObject.object == e.object && eventObject.event == e.event && eventObject.callBack == e.callBack);
                    });

                }
            }

        },

        allOff: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Removes all active listeners we've created.  Good cleanup for after a screen gets closed.
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var anu = lsWire.getShell().activeNavigationUnit;

            if (anu.lsWireEventObjects != undefined && anu.lsWireEventObjects.length > 0) {

                _.forEach(anu.lsWireEventObjects, function (e) {
                    e.object.removeEventListener(e.event, e.callBack);
                });

            }
        },

        isEmpty: function (obj) {
            return obj == undefined || obj.length == 0;
        },

        resolveKeyCode: function (keyOrCode) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Resolve an integer to its keyboard key equivalant
            /// </summary>
            /// <param name="keyOrCode" type="integer" optional="false">Number to resolve to its keyboard key</param>
            /// <returns type="string">Keyboard key</returns>
            /// </signature>
            /// <signature>
            /// <summary>
            /// Resolve a keyboard key string to its key code equivalant
            /// </summary>
            /// <param name="keyOrCode" type="string" optional="false">String representing the keyboard key</param>
            /// <returns type="integer">Keyboard key code</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var map = [
				{ key: "backspace", code: 8 },
				{ key: "tab", code: 9 },
				{ key: "enter", code: 13 },
				{ key: "shift", code: 16 },
				{ key: "ctrl", code: 17 },
				{ key: "alt", code: 18 },
				{ key: "break", code: 19 },
				{ key: "caps lock", code: 20 },
				{ key: "escape", code: 27 },
				{ key: "page up", code: 33 },
				{ key: "page down", code: 34 },
				{ key: "end", code: 35 },
				{ key: "home", code: 36 },
				{ key: "left arrow", code: 37 },
				{ key: "up arrow", code: 38 },
				{ key: "right arrow", code: 39 },
				{ key: "down arrow", code: 40 },
				{ key: "insert", code: 45 },
				{ key: "delete", code: 46 },
				{ key: "0", code: 48 },
				{ key: "1", code: 49 },
				{ key: "2", code: 50 },
				{ key: "3", code: 51 },
				{ key: "4", code: 52 },
				{ key: "5", code: 53 },
				{ key: "6", code: 54 },
				{ key: "7", code: 55 },
				{ key: "8", code: 56 },
				{ key: "9", code: 57 },
				{ key: "a", code: 65 },
				{ key: "b", code: 66 },
				{ key: "c", code: 67 },
				{ key: "d", code: 68 },
				{ key: "e", code: 69 },
				{ key: "f", code: 70 },
				{ key: "g", code: 71 },
				{ key: "h", code: 72 },
				{ key: "i", code: 73 },
				{ key: "j", code: 74 },
				{ key: "k", code: 75 },
				{ key: "l", code: 76 },
				{ key: "m", code: 77 },
				{ key: "n", code: 78 },
				{ key: "o", code: 79 },
				{ key: "p", code: 80 },
				{ key: "q", code: 81 },
				{ key: "r", code: 82 },
				{ key: "s", code: 83 },
				{ key: "t", code: 84 },
				{ key: "u", code: 85 },
				{ key: "v", code: 86 },
				{ key: "w", code: 87 },
				{ key: "x", code: 88 },
				{ key: "y", code: 89 },
				{ key: "z", code: 90 },
				{ key: "left window key", code: 91 },
				{ key: "right window key", code: 92 },
				{ key: "select key", code: 93 },
				{ key: "numpad 0", code: 96 },
				{ key: "numpad 1", code: 97 },
				{ key: "numpad 2", code: 98 },
				{ key: "numpad 3", code: 99 },
				{ key: "numpad 4", code: 100 },
				{ key: "numpad 5", code: 101 },
				{ key: "numpad 6", code: 102 },
				{ key: "numpad 7", code: 103 },
				{ key: "numpad 8", code: 104 },
				{ key: "numpad 9", code: 105 },
				{ key: "multiply", code: 106 },
				{ key: "add", code: 107 },
				{ key: "subtract", code: 109 },
				{ key: "decimal point", code: 110 },
				{ key: "divide", code: 111 },
				{ key: "f1", code: 112 },
				{ key: "f2", code: 113 },
				{ key: "f3", code: 114 },
				{ key: "f4", code: 115 },
				{ key: "f5", code: 116 },
				{ key: "f6", code: 117 },
				{ key: "f7", code: 118 },
				{ key: "f8", code: 119 },
				{ key: "f9", code: 120 },
				{ key: "f10", code: 121 },
				{ key: "f11", code: 122 },
				{ key: "f12", code: 123 },
				{ key: "num lock", code: 144 },
				{ key: "scroll lock", code: 145 },
				{ key: ";", code: 186 },
				{ key: "=", code: 187 },
				{ key: ",", code: 188 },
				{ key: "-", code: 189 },
				{ key: ".", code: 190 },
				{ key: "/", code: 191 },
				{ key: "`", code: 192 },
				{ key: "[", code: 219 },
				{ key: "\\", code: 220 },
				{ key: "]", code: 221 },
				{ key: "'", code: 222 }
            ];

            var result;

            if (typeof keyOrCode == "string") {
                result = _.find(map, { key: keyOrCode });
            } else {
                result = _.find(map, { code: keyOrCode });
            }

            return result;

        },

        enableKeyboardShortcut: function (screen, ctrlOrAlt, key, callBack, stopPropagation) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Enable a keyboard shortcut.  Great for opening search (alt-s), saving data (ctrl-s), etc
            /// </summary>
            /// <param name="screen" type="object" optional="false">Screen object</param>
            /// <param name="ctrlOrAlt" type="string" optional="false">Either ctrl or alt keys will be accepted</param>
            /// <param name="key" type="string/integer" optional="false">What actual key or keycode are we listening for, combined with ctrl/alt</param>
            /// <param name="callBack" type="function" optional="false">Function to call when the key combination is hit</param>
            /// <returns type="string">The id we assign to this shortcut, used for disabling</returns>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="false">Screen object</param>
            /// <param name="ctrlOrAlt" type="string" optional="false">Either ctrl or alt keys will be accepted</param>
            /// <param name="key" type="string/integer" optional="false">What actual key or keycode are we listening for, combined with ctrl/alt</param>
            /// <param name="callBack" type="function" optional="false">Function to call when the key combination is hit</param>
            /// <param name="stopPropagation" type="boolean" optional="true">Stop all propagation/bubbling of the event</param>
            /// <returns type="string">The id we assign to this shortcut, used for disabling</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // If any parameter is missing, return... we need them all
            if (screen == undefined || ctrlOrAlt == undefined || key == undefined)
                return null;

            // Do we have a structure to store our shortcuts, if not create it
            if (lsWire.keyboardShortcuts == undefined) lsWire.keyboardShortcuts = {};

            // We are going to resolve by keycode and not actual character
            if (typeof key == "string") {
                var keyObj = lsWire.resolveKeyCode(key.toLowerCase());
                if (keyObj != undefined) {
                    key = keyObj.code;
                } else {
                    return null;
                }
            }

            // Create the id for the shortcut
            var guid = lsWire.createUid();
            var shortcutId = "keydown.lsWire_" + guid;
            var screenId = "#" + screen.details._pageId;

            // If the shortcut does not exist in our storage, put it there
            if (lsWire.keyboardShortcuts[shortcutId] == undefined) {

                // Create our object to track internally
                lsWire.keyboardShortcuts[shortcutId] = {
                    screenId: screenId,
                    shortcutId: shortcutId,
                    specialKey: ctrlOrAlt,
                    key: key,
                    callBack: function (event) {

                        // If we have a match for this binding, execute our callback
                        if (event[ctrlOrAlt] && event.keyCode == key) {
                            if (stopPropagation) {
                                event.stopPropagation();
                                event.preventDefault();
                            };
                            callBack(event);
                        }

                    }
                };
            };


            // First... Do we need to get rid of any non lsWire shortcut?
            var handlers = lsWire.getAllDOMHandlers($(screenId)[0], "keydown");
            if (!_.any(handlers, function (h) { return _.contains(h.namespace, "lsWire"); })) {
                $(screenId).off("keydown");
            };

            // We got this far, so we should be good to do our binding
            if (lsWire.keyboardShortcuts[shortcutId] != undefined) {
                $(screenId).on(shortcutId, lsWire.keyboardShortcuts[shortcutId].callBack);
            }

            return shortcutId;

        },

        removeKeyboardShortcut: function (shortcutId) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Removes a keyboard shortcut handler based on the passed Id
            /// </summary>
            /// <param name="shortcutId" type="string" optional="false">The Id that gets assigned when created</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (shortcutId == undefined) return;

            var shortcut = lsWire.keyboardShortcuts[shortcutId];

            if (shortcut != undefined) {
                $(shortcut.screenId).off(shortcutId, lsWire.keyboardShortcuts[shortcutId].callBack);
                delete lsWire.keyboardShortcuts[shortcutId];
            }
        },

        removeAllKeyboardShortcuts: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Remove all keyboard shortcuts that we create
            /// </summary>
            /// <param name="screen" type="object" optional="true">Screen object</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // If we have any shortcuts to work
            if (_.size(lsWire.keyboardShortcuts) == 0) return;

            // Default to all shortcuts
            var shortcuts = lsWire.keyboardShortcuts;

            // If a screen was passed... only delete the shortcuts for that screen
            if (screen != undefined) {
                var screenId = "#" + screen.details._pageId;
                shortcuts = _.filter(lsWire.keyboardShortcuts, function (e) { return e.screenId == screenId; });
            }

            // Go thru each stored handler, and unbind
            _.forEach(shortcuts, function (e) {
                $(e.screenId).off(e.shortcutId);
                delete lsWire.keyboardShortcuts[e.shortcutId];
            });

        },

        getAllDOMHandlers: function (element, trigger, namespace) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Wrapper to get all the active handlers in the DOM for a particular trigger.  Tuff to find this!
            /// </summary>
            /// <param name="element" type="HTMLElement" optional="false">What element shall we start looking from, document, body, etc.</param>
            /// <returns type="array">Array of matching handlers</returns>
            /// </signature>
            /// <signature>
            /// <param name="element" type="HTMLElement" optional="false">What element shall we start looking from, document, body, etc.</param>
            /// <param name="trigger" type="string" optional="true">What trigger (event) are you looking for, if not passed, returns them all</param>
            /// <returns type="array">Array of matching handlers</returns>
            /// </signature>
            /// <signature>
            /// <param name="element" type="HTMLElement" optional="false">What element shall we start looking from, document, body, etc.</param>
            /// <param name="trigger" type="string" optional="true">What trigger (event) are you looking for, if not passed, returns them all</param>
            /// <param name="namespace" type="string" optional="true">Is there a namespace for the trigger?  And yes, they can have namespaces assigned!</param>
            /// <returns type="array">Array of matching handlers</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var triggerHandlers = [];

            // Get all the events assigned for this element, not a jQuery element btw
            var events = $._data(element, "events");

            // If there are events for this element
            if (!!events) {

                // See if there is one with the name of our trigger, get the handlers if so
                triggerHandlers = events[trigger];

                // If we were asked to check for a namespace, go find them
                if (!!namespace) {
                    triggerHandlers = _.filter(triggerHandlers, function (handler) {
                        return handler.namespace == namespace;
                    });
                }
            }

            // Return an array of our handlers, or empty array
            return triggerHandlers;
        },

        removeDisplayNameListener: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Wrapper to remove the listener on the displayName property.  Lightswitch automatically does this.
            /// And it messes up with updating of the document title that we use for SEO, Analytics and bookmarking
            /// </summary>
            /// <param name="screen" type="object" optional="false">Screen object</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (screen == undefined) return;

            screen.details.removeChangeListener("displayName", screen.details._listeners.displayName_change[0].listener);
        },

        getWhatsChanged: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Just a good to have function to help with debugging.  Gets exactly what has changed in the data.
            /// </summary>
            /// <returns type="array">Array that identifies exactly what has changed in the data.  Including original/current values.
            /// All in a nice package vs the buried LightSwitch way.</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var changes = myapp.activeDataWorkspace.details.getChanges();
            var changeSummary = [];

            _.forEach(changes, function (e) {
                var summary = {
                    entityId: e.Id,
                    modelId: e.details._model.id,
                    state: e.details.entityState,
                    whatChanged: [],
                };

                var keys = _.keys(e.details._);
                keys = _.filter(keys, function (key) { return _.contains(key, "IsEdited"); });

                _.forEach(keys, function (property) {
                    property = property.replace("_IsEdited", "").replace(/_/g, "");
                    var changed = {
                        propertyName: property,
                        valueBefore: e.details._.__original[property],
                        valueNow: e.details._[property]
                    }

                    summary.whatChanged.push(changed);

                });

                changeSummary.push(summary);
            });

            return changeSummary;
        },

        saveToLocalStorage: function (key, value, useSession) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Save data to the local data store
            /// </summary>
            /// <param name="key" type="string" optional="false">What key name shall we assign this value too</param>
            /// <param name="value" type="object" optional="false">Value we will be storing</param>
            /// <returns type="boolean">True if saved successfully else false</returns>
            /// </signature>
            /// <signature>
            /// <param name="key" type="string" optional="false">What key name shall we assign this value too</param>
            /// <param name="value" type="object" optional="false">Value we will be storing</param>
            /// <param name="useSession" type="boolean" optional="true">Only store for this session? Send true if so</param>
            /// <returns type="boolean">True if saved successfully else false</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var result = false;

            if (typeof (Storage) !== "undefined") {

                var storageType = !!useSession ? "sessionStorage" : "localStorage";

                try {
                    window[storageType].setItem(key, value);
                    result = true;
                } catch (e) {
                    result = false;
                }

            }

            return result;

        },

        getFromLocalStorage: function (key, useSession) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get the value from local store based on the passed key
            /// </summary>
            /// <param name="key" type="string" optional="false">What is the key name we are looking for</param>
            /// <returns type="object">If key is found, the value stored, else null</returns>
            /// </signature>
            /// <signature>
            /// <param name="key" type="string" optional="false">What is the key name we are looking for</param>
            /// <param name="useSession" type="boolean" optional="true">Are we to retrieve from session store?</param>
            /// <returns type="object">If key is found, the value stored, else null</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var result = null;

            if (typeof (Storage) !== "undefined") {

                var storageType = !!useSession ? "sessionStorage" : "localStorage";

                try {
                    result = window[storageType].getItem(key);
                } catch (e) {
                    result = null;
                }

            }

            return result;
        },

        removeFromLocalStorage: function (key, useSession) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Remove a key and its associated value from local store
            /// </summary>
            /// <param name="key" type="string" optional="false">Name of the key to remove</param>
            /// <returns type="boolean">True if successful removal, else null</returns>
            /// </signature>
            /// <signature>
            /// <param name="key" type="string" optional="false">Name of the key to remove</param>
            /// <param name="useSession" type="boolean" optional="true">Remove from session store?</param>
            /// <returns type="boolean">True if successful removal, else null</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var result = null;

            if (typeof (Storage) !== "undefined") {

                var storageType = !!useSession ? "sessionStorage" : "localStorage";

                try {
                    window[storageType].removeItem(key);
                    result = true;
                } catch (e) {
                    result = null;
                }

            }

            return result;
        },

        removeAllFromLocalStorage: function (useSession) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Removes all items from our local store for this app
            /// </summary>
            /// <returns type="boolean">True if successful removal, else null</returns>
            /// </signature>
            /// <signature>
            /// <param name="useSession" type="boolean" optional="true">Remove from session?</param>
            /// <returns type="boolean">True if successful removal, else null</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var result = null;

            if (typeof (Storage) !== "undefined") {

                var storageType = !!useSession ? "sessionStorage" : "localStorage";

                try {
                    window[storageType].clear();
                    result = true;
                } catch (e) {
                    result = null;
                }

            }

            return result;
        },

        changeTheme: function (currentThemeName, newThemeName) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Wrapper to easily change the stylesheet theme for the application
            /// </summary>
            /// <param name="currentThemeName" type="string" optional="false">Current 'color/theme' name</param>
            /// <param name="newThemeName" type="string" optional="false">New 'color/theme' name</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (currentThemeName == undefined || newThemeName == undefined) return;

            var themeCss = _.filter(window.document.head.getElementsByTagName("link"), function (link) {
                return _.contains(link.href.toLowerCase(), "theme");
            });

            _.forEach(themeCss, function (e) {
                var href = e.href.toLowerCase();

                // Break the url up to url and filename
                var splitAt = href.lastIndexOf('/');
                var domain = href.substring(0, splitAt);
                var file = href.substr(splitAt);

                // Now replace the color for the theme
                file = file.replace(currentThemeName, newThemeName);

                // Add them back together
                href = domain + file;

                // And reset the url for the stylesheet
                e.href = href;
            });

        },

        changeDisplayValue: function (element, contentItem, method) {

            contentItem.dataBind("value", function (newValue) {
                if (newValue != undefined) {
                    var displayValue = method != undefined ? method() : newValue;
                    element.getElementsByClassName("id-element")[0].innerHTML = displayValue;
                }
            });

        },

        detailsPickerDisplayValue: function (element, contentItem, callBack) {

            contentItem.dataBind("_view.isRendered", function (isRendered) {

                if (isRendered && contentItem.value != undefined) {

                    setTimeout(function () {
                        var inputElement = $(element).find("input").first();

                        if (inputElement != null) {

                            $("input.ui-input-text", element).val(callBack());

                            $("input.ui-input-text", element).off("focusout").on("focusout", function (e) {
                                if (contentItem.value != null) {
                                    $("input.ui-input-text", element).val(callBack(e));
                                };

                            });

                        }
                    }, 200);

                }


                contentItem.dataBind("value", function (newValue) {

                    if (contentItem._view.isRendered && newValue != undefined) {
                        var inputElement = $(element).find("input").first();
                        if (inputElement != null) {
                            $("input.ui-input-text", element).val(callBack());

                        }
                    }
                });
            });

        },


        // #endregion


        // #region Security - 11 functions 
        // ==========================================================


        userHasPermission: function (permissionId, useLocal) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Check with Web.Api if the current user has a certain permission
            /// </summary>
            /// <param name="permissionId" type="string" optiona="false">LightSwitch PermissionId</param>
            /// <returns type="boolean">true/false</returns>
            /// </signature>
            /// <signature>
            /// <param name="permissionId" type="string" optiona="false">LightSwitch PermissionId</param>
            /// <param name="useLocal" type="boolean" optional="true">Use the local user cache</param>
            /// <returns type="boolean">true/false</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (permissionId == undefined) return false;

            var results = false;

            var split = permissionId.split(':');
            permissionId = split[1] || permissionId;

            if (!!useLocal && lsWire.userInfo != undefined) {
                results = _.contains(lsWire.userInfo.Permissions, permissionId);
            } else {
                $.ajax({
                    async: false,
                    url: lsWire.webApiPath + "security/userHasPermission/" + permissionId,
                    success: function (data) {
                        results = data;
                    }
                });
            }

            return results;

        },

        userHasRole: function (roleId, useLocal) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Check with Web.Api if the current user has a certain role assignment
            /// </summary>
            /// <param name="roleId" type="string">Name of the role</param>
            /// <returns type="boolean">true/false</returns>
            /// </signature>
            /// <signature>
            /// <param name="roleId" type="string">Name of the role</param>
            /// <param name="useLocal" type="boolean" optional="true">Use the local user cache</param>
            /// <returns type="boolean">true/false</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (roleId == undefined) return false;

            var results = false;

            if (!!useLocal && lsWire.userInfo != undefined) {
                results = _.contains(lsWire.userInfo.Roles, roleId);
            } else {
                $.ajax({
                    async: false,
                    url: lsWire.webApiPath + "security/userHasRole/" + roleId,
                    success: function (data) {
                        results = data;
                    },
                    error: function () {
                    }
                });
            }

            return results;
        },

        getUserInfo: function (forceUpdate) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get information about the current user, based on a Web.Api call
            /// Stores the result in lsWire.userInfo
            /// </summary>
            /// <returns type="object">Object holding information about the user</returns>
            /// </signature>
            /// <signature>
            /// <param name="forceUpdate" type="boolean" optional="true">Force update from the server</param>
            /// <returns type="object">Object holding information about the user</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (lsWire.userInfo == undefined || forceUpdate) {
                $.ajax({
                    async: false,
                    url: lsWire.webApiPath + "security/GetUserInfo",
                    success: function (data) {
                        lsWire.userInfo = data;
                    },
                    error: function () {
                        lsWire.userInfo = null;
                    }
                });
            }

            if (lsWire.userInfo === undefined)
                lsWire.userInfo = null;

            return lsWire.userInfo;

        },

        getSecurityInfo: function (forceUpdate) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Retrieves from Web.Api application Roles and Permissions
            /// Stored in lsWire.appRoles and lsWire.appPermissions
            /// </summary>
            /// <returns type="object">Object holding application roles and permissions</returns>
            /// </signature>
            /// <signature>
            /// <param name="forceUpdate" type="boolean" optional="true">Force update from the server</param>
            /// <returns type="object">Object holding application roles and permissions</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (lsWire.appRoles == undefined || lsWire.appPermissions == undefined || forceUpdate) {
                $.ajax({
                    async: false,
                    url: lsWire.webApiPath + "security/GetAppSecurityObjects",
                    success: function (data) {
                        lsWire.appRoles = data.Roles;
                        lsWire.appPermissions = data.Permissions;
                    },
                    error: function () {
                        lsWire.appRoles = null;
                        lsWire.appPermissions = null;
                    }
                });
            }

            if (lsWire.appRoles === undefined)
                lsWire.appRoles = null;

            if (lsWire.appPermissions === undefined)
                lsWire.appPermissions = null;

            return { appRoles: lsWire.appRoles, appPermissions: lsWire.appPermissions };

        },

        getAppConfig: function (forceUpdate) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Retrieves any application configuration data from Web.Api
            /// Stored in lsWire.appConfig
            /// </summary>
            /// <returns type="object">Object holding application configuration information</returns>
            /// </signature>
            /// <signature>
            /// <param name="forceUpdate" type="boolean" optional="true">Force update from the server</param>
            /// <returns type="object">Object holding application configuration information</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (lsWire.appConfig == undefined || forceUpdate) {
                $.ajax({
                    async: false,
                    url: lsWire.webApiPath + "file/getAppConfig/",
                    success: function (data) {
                        lsWire.appConfig = data;
                    },
                    error: function () {
                        lsWire.appConfig = {};
                    }
                });
            }

            if (lsWire.appConfig === undefined)
                lsWire.appConfig = {};

            return lsWire.appConfig;

        },

        passwordValidator: function (element, passwordContentItem, confirmContentItem) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initialize an Element for password entry and validation
            /// </summary>
            /// <param name="element" type="HTMLElement" optional="false">Element for the password input</param>
            /// <param name="passwordContentItem" type="object" optional="false">ContentItem of our password field</param>
            /// </signature>
            /// <signature>
            /// <param name="element" type="HTMLElement" optional="false">Element for the password input</param>
            /// <param name="passwordContentItem" type="object" optional="false">ContentItem of our password field</param>
            /// <param name="confirmContentItem" type="object" optional="true">Optional - ContentItem of our confirm password field</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (element == undefined || passwordContentItem == undefiend) return;

            // Lets make sure passwords are not viewable
            lsWire.changeInputToPassword(element);

            // Bind to the value property of our password field, so we can implement validation 
            passwordContentItem.dataBind("value", function (pwdValue) {

                // Go validate the password, returns true/false
                var validated = lsWire.validatePassword(passwordContentItem);

                // If we were passed a confirmPassword field and the password passed validation
                if (confirmContentItem !== undefined && confirmContentItem !== null && validated) {

                    // Force the validation of the confirmPassword field
                    // We've put it here also in case things get out of sequence
                    lsWire.validateConfirmPassword(confirmContentItem, pwdValue);

                }

            });


        },

        confirmPasswordValidator: function (element, confirmContentItem, passwordContentItem) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>Initialize an Element as a password confirmation</summary>
            /// <param name="element" type="HTMLElement" optional="false">Element for the confirm password input</param>
            /// <param name="confirmContentItem" type="object" optional="false">ContentItem of our confirm password field</param>
            /// </signature>
            /// <signature>
            /// <param name="element" type="HTMLElement" optional="false">Element for the confirm password input</param>
            /// <param name="confirmContentItem" type="object" optional="false">ContentItem of our confirm password field</param>
            /// <param name="passwordContentItem" type="object" optional="true">ContentItem of our password field</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (element == undefined || passwordContentItem == undefiend) return;

            // Lets make sure passwords are not viewable
            lsWire.changeInputToPassword(element);

            // Bind to the value property of our confirmPassword field, for our custom validation
            confirmContentItem.dataBind("value", function () {

                // Go run the validation test, we also pass thru the value we are testing against
                lsWire.validateConfirmPassword(confirmContentItem, passwordContentItem.value);

            });

        },

        changeInputToPassword: function (element) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Self explanatory, change the input element to be of a password type
            /// Which will hide the characters, good for any data you want to hide
            /// </summary>
            /// <param name="element" type="HTMLElement" optional="false">DOM Element to convert</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (element == undefined) return;

            $(element).find(".id-element").attr("type", "password");
        },

        validatePassword: function (contentItem) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Validate our password field (contentItem)
            /// If it does not pass, we'll show the native LightSwitch error 
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem that that we will validate</param>
            /// <returns type="boolean">true/false</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined) return false;

            var valid = true;

            // Make sure any validation errors will be displayed
            contentItem._alwaysShowValidationResults = true;

            // Get our data for the pwd
            var pwdValue = contentItem.value;

            // Does the field have data, if not bypass
            if (pwdValue !== undefined && pwdValue !== null) {

                // Check to see if we have a valid password
                if (!lsWire.isValidPassword(pwdValue)) {

                    // The password is not valid, add a validation exception to the contentItem
                    contentItem.validationResults = [new msls.ValidationResult(contentItem, "Not a valid password!")];
                    valid = false;
                }
                    // else validation passed!  So empty the exception queue
                else if (contentItem.validationResults.length > 0) {
                    contentItem.validationResults = [];
                }
            }
            return valid;
        },

        validateConfirmPassword: function (contentItem, pwdValue) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Validate our confirmPassword field (contentItem)
            /// We really only care if it matches the password, if not, show the error
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem that we will validate</param>
            /// <param name="pwdValue" type="string" optional="false">Value from the master password input</param>
            /// <returns type="boolean">true/false</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined || pwdValue == undefined) return false;

            var valid = true;

            // Make sure any validation errors will be displayed
            contentItem._alwaysShowValidationResults = true;

            // Get the value to compare with the pwd
            var confirmPwdValue = contentItem.value;

            // Does the field have data
            if (confirmPwdValue !== undefined && confirmPwdValue !== null) {

                // Check to see if the values do not match
                if (confirmPwdValue !== pwdValue) {

                    // Not a match, so display a validation error
                    contentItem.validationResults = [new msls.ValidationResult(contentItem, "Passwords do not match!")];
                    valid = false;
                }
                    // else validation passed!  So empty the exception queue
                else if (contentItem.validationResults.length > 0) {
                    contentItem.validationResults = [];
                }
            }

            return valid;
        },

        isValidPassword: function (pwd) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Simple function to test whether a string fits our password requirements
            /// </summary>
            /// <param name="pwd" type="string" optional="false">Password string to validate</param>
            /// <returns type="boolean">true/false</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (pwd == undefined) return false;

            // Yes... this can be one big ass RegEx... but at the cost of readability
            // So I've purposely broken it up so folks can understand it a bit more

            // Should be alpha numaric with at least one special character.
            if (!(null !== pwd.match(/[@+#$]/))) return false;

            // No spaces allowed
            if (!(null !== pwd.match(/^\S+$/))) return false;

            // Should be minimum 8 chars and max 20 chars.
            if (!(null !== pwd.match(/^.{8,20}$/))) return false;

            // No repeat of a character more than 2 times. 
            if (!(null === pwd.match(/(.)(.*\1){2}/))) return false;

            // ~,'.:;^| are not allowed
            if (!(null !== pwd.match(/^[^~,'.:;^|]+$/))) return false;

            return true;
        },


        // #endregion


        // #region Screen - 22 functions
        // ==========================================================


        getScreenInternalDetails: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get a handle to the internal details of a screen... lots of functionality here!
            /// </summary>
            /// <returns type="object">Properties that are not normally exposed</returns>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// <returns type="object">Properties that are not normally exposed</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var details = null;

            try {
                if (screen == undefined)
                    screen = lsWire.getActiveScreen();

                if (screen != undefined) {
                    var o = _.find(screen.details.startPage._dependents.isVisible, function (ef) { return !!ef.trackingStub.o["_buttons"]; });
                    if (o != undefined) {
                        details = o.trackingStub.o;
                    }
                }

            } catch (e) {
                return details;
            }

            return details;

        },

        hideScreenButton: function (screen, type, yesNo) {

            var buttonClass;
            var page = "#" + screen.details._pageId;

            switch (type) {
                case "save":
                    buttonClass = ".msls-save-button";
                    break;

                case "cancel":
                    buttonClass = ".msls-cancel-button";
                    break;

                case "discard":
                    buttonClass = ".msls-discard-button";
                    break;

                case "ok":
	                buttonClass = ".msls-ok-button";
                    break;

                default:
                    return;
            };

            if (yesNo == undefined || yesNo == true) {
	            $(buttonClass, page).addClass("msls-collapsed");
            } else {
                $(buttonClass, page).removeClass("msls-collapsed");
            };

        },

        changeScreenHomeButton: function (screen, iconClass, title, callBack) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Change the home button on a screen
            /// </summary>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// <param name="iconClass" type="string" optional="true">Optional - CSS Class for the button</param>
            /// <param name="title" type="string" optional="true">Optional - Title to be used when hovered on</param>
            /// <param name="callBack" type="function" optional="true">Optional - Function/Method to execute on click</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            setTimeout(function () {
                // Make sure we have a screen object
                screen = screen == undefined ? lsWire.getActiveScreen() : screen;

                // Get our back button container
                var selector = "#" + screen.details._pageId + " .titles-bar .msls-back-button-contain";
                var container = document.querySelector(selector);

                if (container == null) return;

                // Update the title if passed
                if (title != undefined)
                    container.getElementsByClassName('subControl')[0].title = title;

                // Update our icon, if passed
                if (iconClass != undefined) {
                    var iconElement = container.querySelector('.msls-home-button .ui-icon');

                    if (iconElement != undefined) {
                        iconElement.classList.remove('ui-icon-msls-home');
                        iconElement.classList.add(iconClass);
                        container.style.paddingRight = '10px';
                    }
                };

                // Change the click functionality to be our own, this time showing the sidebar help
                if (callBack != undefined) {
                    $('.msls-home-button').off('vclick');
                    $(container).off('vclick').on('vclick', callBack);
                }

            }, 0);
        },

        changeScreenButton: function (screen, buttonType, iconClass, title) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Change the properties of a screen button
            /// </summary>
            /// <param name="screen" type="object" optional="true">Screen the button is on</param>
            /// <param name="buttonType" type="string" optional="false">Type of button we are changing: ok, save, discard, cancel</param>
            /// <param name="iconClass" type="string" optional="true">New icon class for the button</param>
            /// <param name="title" type="string" optional="true">What title/tip to use</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            setTimeout(function () {
                if (buttonType == undefined) return;
                buttonType = buttonType.toLowerCase();

                var button = _.find(lsWire.getScreenInternalDetails(screen).parent._subControls, function (s) {
                    var buttonFound = false;
                    if (s.content != undefined) {
                        buttonFound = s.content.toLowerCase() == buttonType;
                    };
                    return buttonFound;
                });

                if (button != undefined) {

                    var view = button.getView();

                    if (view != undefined) {

                        if (title != undefined) view[0].title = title;

                        if (iconClass != undefined) {
                            iconClass = _.contains(iconClass, "ui-icon-") ? iconClass : "ui-icon-" + iconClass;
                            var iconElement = view.find(".ui-icon");
                            if (iconElement != undefined) {

                                var oldIcon = _.find(iconElement[0].classList, function (c) {
                                    return _.contains(c, "ui-icon-msls-");
                                });

                                $(iconElement).removeClass(oldIcon).addClass(iconClass);

                            };

                        }

                    }


                }

            }, 0);

        },

        addScreenHomeButton: function (screen, iconClass, title, callBack) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Add a home button to screens that don't already have one
            /// </summary>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// <param name="iconClass" type="string" optional="true">Optional - CSS Class for the button</param>
            /// <param name="title" type="string" optional="true">Optional - Title to be used when hovered on</param>
            /// <param name="callBack" type="function" optional="true">Optional - Function/Method to execute on click</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            // See if we already have the container/button
            var selector = "#" + screen.details._pageId + " .titles-bar .msls-back-button-contain";
            var container = document.querySelector(selector);

            // If we do have it... return
            if (container != null) return;

            // Create our elements, yes I know there are faster/optimized way of doing this.
            // But for folks learning and for readable, this is better for now
            var mostInnerUiBtnText = $('<span class="ui-btn-text">Home</span>');
            var mostInnerUiBtnInner = $('<span class="ui-btn-inner"></span>');
            var idElement = $('<a class="id-element ui-btn ui-btn-up-a ui-shadow ui-btn-corner-all ui-mini" data-role="button" data-theme="a" data-mini="true" data-corners="true" data-shadow="true" data-iconshadow="true" data-wrapperEls="span"></a>');
            var outerUiBtnText = $('<span class="ui-btn-text"></span>');
            var uiIcon = $('<span class="ui-icon"></span>');
            var outerUiBtnInner = $('<span class="ui-btn-inner" style="padding-right: 10px;"></span>');
            var subControl = $('<div tabindex="0" title="" class="subControl msls-home-button msls-large-icon msls-tap ui-btn ui-btn-up-a ui-shadow ui-btn-corner-all ui-btn-icon-notext" data-role="button" data-theme="a" data-ls-tap="tap:{data.shell.homeCommand.command}" data-ls-isenabled="isEnabled:{tap.canExecute}" data-ls-content="content:{data.shell.homeCommand.displayName}" data-iconpos="notext" data-icon="msls-home" data-corners="true" data-shadow="true" data-iconshadow="true" data-wrapperEls="span"></div>');
            var outerDiv = $('<div class="msls-back-button-contain"></div>');

            // What icon and title shall we use for the button
            iconClass = iconClass == undefined ? "ui-icon-msls-home" : iconClass;
            title = title == undefined ? "Home" : title;

            $(uiIcon).addClass(iconClass).addClass("ui-icon-shadow");
            $(subControl).attr("title", title);

            // Now lets add all the elements together
            mostInnerUiBtnInner.append(mostInnerUiBtnText);
            idElement.append(mostInnerUiBtnInner);
            outerUiBtnText.append(idElement);
            outerUiBtnInner.append(outerUiBtnText);
            outerUiBtnInner.append(uiIcon);
            subControl.append(outerUiBtnInner);
            outerDiv.append(subControl);

            // Add the button to the title bar
            $("#" + screen.details._pageId + " .titles-bar").prepend($(outerDiv));

            // If no callback was sent, create the default
            if (callBack == undefined)
                callBack = function (e) {
                    if (e != undefined && e["preventDefault"] != undefined) {
                        e.preventDefault();
                        e.stopPropagation();
                    }

                    lsWire.getShell().finishNavigation().then(function () {
                        lsWire.getShell().navigateHome();
                    });
                };

            // Add the callback to the button click
            $(outerDiv).on('vclick', callBack);

        },

        addTabBarButton: function (screen, iconClass, title, callBack) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Add a button into the tab bar for screens that don't normally have it
            /// </summary>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// <param name="iconClass" type="string" optional="true">Optional - CSS Class for the button</param>
            /// <param name="title" type="string" optional="true">Optional - Title to be used when hovered on</param>
            /// <param name="callBack" type="function" optional="true">Optional - Function/Method to execute on click</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            // See if we already have the container/button
            var selector = "#" + screen.details._pageId + " .msls-tabs-bar .msls-back-button-contain";
            var container = document.querySelector(selector);

            // If we do have it... return
            if (container != null) return;

            // Create our elements, yes I know there are faster/optimized way of doing this.
            // But for folks learning and for readable, this is better for now
            var mostInnerUiBtnText = $('<span class="ui-btn-text">Home</span>');
            var mostInnerUiBtnInner = $('<span class="ui-btn-inner"></span>');
            var idElement = $('<a class="id-element ui-btn ui-btn-up-a ui-shadow ui-btn-corner-all ui-mini" data-role="button" data-theme="a" data-mini="true" data-corners="true" data-shadow="true" data-iconshadow="true" data-wrapperEls="span"></a>');
            var outerUiBtnText = $('<span class="ui-btn-text"></span>');
            var uiIcon = $('<span class="ui-icon"></span>');
            var outerUiBtnInner = $('<span class="ui-btn-inner" style="padding-right: 10px;"></span>');
            var subControl = $('<div tabindex="0" title="" class="subControl msls-home-button msls-large-icon msls-tap ui-btn ui-btn-up-a ui-shadow ui-btn-corner-all ui-btn-icon-notext" data-role="button" data-theme="a" data-ls-tap="tap:{data.shell.homeCommand.command}" data-ls-isenabled="isEnabled:{tap.canExecute}" data-ls-content="content:{data.shell.homeCommand.displayName}" data-iconpos="notext" data-icon="msls-home" data-corners="true" data-shadow="true" data-iconshadow="true" data-wrapperEls="span"></div>');
            var outerDiv = $('<div class="msls-back-button-contain"></div>');

            // What icon and title shall we use for the button
            iconClass = iconClass == undefined ? "ui-icon-msls-home" : iconClass;
            title = title == undefined ? "Home" : title;

            $(uiIcon).addClass(iconClass).addClass("ui-icon-shadow");
            $(subControl).attr("title", title);

            // Now lets add all the elements together
            mostInnerUiBtnInner.append(mostInnerUiBtnText);
            idElement.append(mostInnerUiBtnInner);
            outerUiBtnText.append(idElement);
            outerUiBtnInner.append(outerUiBtnText);
            outerUiBtnInner.append(uiIcon);
            subControl.append(outerUiBtnInner);
            outerDiv.append(subControl);

            // Add the button to the tab bar
            $("#" + screen.details._pageId + " .msls-tabs-bar").prepend($(outerDiv));

            // If no callback was sent, create the default
            if (callBack == undefined)
                callBack = function (e) {

                    if (e != undefined && e["preventDefault"] != undefined) {
                        e.preventDefault();
                        e.stopPropagation();
                    }

                    lsWire.getShell().finishNavigation().then(function () {
                        lsWire.getShell().navigateHome();
                    });
                };

            // Add the callback to the button click
            $(outerDiv).on('vclick', callBack);
            $(outerDiv).css("float", "left");
            $(outerDiv).css("padding-top", "5px");


        },

        hideScreenTitleBar: function (screen, hide) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Hide the title bar of the screen
            /// </summary>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// <param name="hide" type="boolean" optional="true">Defaults to true, pass a false to display (unhide)</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            screen = screen == undefined ? lsWire.getActiveScreen() : screen;
            hide = hide == undefined ? true : hide;

            if (screen.details._rootContentItem.kind != "Screen") return;

            // Get all the title for this screen
            var screenTitleBar = document.getElementById(screen.details._pageId).getElementsByClassName("titles-bar")[0];

            if (screenTitleBar != undefined) {
                if (hide) {
                    screenTitleBar.classList.add("msls-collapsed");
                } else {
                    screenTitleBar.classList.remove("msls-collapsed");
                }
            }

        },

        showDeleteDialogBox: function (saveType, entity, msg, title, callBack) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// High level function to prompt if its ok to delete the passed entity
            /// </summary>
            /// <param name="saveType" type="string" optional="true">Optional - Type of save, commit or apply, defaults to commit</param>
            /// <param name="entity" type="object" optional="false">Entity of what to delete</param>
            /// </signature>
            /// <signature>
            /// <param name="saveType" type="string" optional="true">Optional - Type of save, commit or apply, defaults to commit</param>
            /// <param name="entity" type="object" optional="false">Entity of what to delete</param>
            /// <param name="msg" type="string" optional="true">Optional - Message to display</param>
            /// </signature>
            /// <signature>
            /// <param name="saveType" type="string" optional="true">Optional - Type of save, commit or apply, defaults to commit</param>
            /// <param name="entity" type="object" optional="false">Entity of what to delete</param>
            /// <param name="msg" type="string" optional="true">Optional - Message to display</param>
            /// <param name="title" type="string" optional="true">Optional - Title on the popup</param>
            /// </signature>
            /// <signature>
            /// <param name="saveType" type="string" optional="true">Optional - Type of save, commit or apply, defaults to commit</param>
            /// <param name="entity" type="object" optional="false">Entity of what to delete</param>
            /// <param name="msg" type="string" optional="true">Optional - Message to display</param>
            /// <param name="title" type="string" optional="true">Optional - Title on the popup</param>
            /// <param name="callBack" type="object" optional="true">Optional - Your custom method vs standard entity.deleteEntity</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            title = title != undefined ? title : "Delete?";
            msg = msg != undefined ? msg : "";
            saveType = saveType != undefined ? saveType : "commit";

            if (entity != undefined) {

                msls.showMessageBox(msg, {
                    title: title,
                    buttons: msls.MessageBoxButtons.yesNo
                }).then(function (closeAction) {

                    if (closeAction === msls.MessageBoxResult.yes) {

                        if (callBack != undefined)
                            callBack(entity);
                        else {
                            entity.deleteEntity();

                            if (saveType.toLowerCase() === "apply")
                                myapp.applyChanges();
                            else
                                myapp.commitChanges();
                        }
                    }

                });
            }

        },

        showDiscardDialogBox: function (screen, title, text, yesCallBack, noCallBack) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// High level wrapper to ask the user permission to discard any changes, no parameters, global
            /// </summary>
            /// <returns type="boolean">True/False depending on user input</returns>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Optional - Screen to look for changes, else all will be looked at</param>
            /// <returns type="boolean">True/False depending on user input</returns>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Optional - Screen to look for changes, else all will be looked at</param>
            /// <param name="title" type="string" optional="true">Optional - Title for the popup</param>
            /// <returns type="boolean">True/False depending on user input</returns>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Optional - Screen to look for changes, else all will be looked at</param>
            /// <param name="title" type="string" optional="true">Optional - Title for the popup</param>
            /// <param name="text" type="string" optional="true">Optional - Additional message to display</param>
            /// <returns type="boolean">True/False depending on user input</returns>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Optional - Screen to look for changes, else all will be looked at</param>
            /// <param name="title" type="string" optional="true">Optional - Title for the popup</param>
            /// <param name="text" type="string" optional="true">Optional - Additional message to display</param>
            /// <param name="yesCallBack" type="function" optional="true">Optional - Function to run on a yes selection</param>
            /// <returns type="boolean">True/False depending on user input</returns>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Optional - Screen to look for changes, else all will be looked at</param>
            /// <param name="title" type="string" optional="true">Optional - Title for the popup</param>
            /// <param name="text" type="string" optional="true">Optional - Additional message to display</param>
            /// <param name="yesCallBack" type="function" optional="true">Optional - Function to run on a yes selection</param>
            /// <param name="noCallBack" type="function" optional="true">Optional - Function to run on a no selection</param>
            /// <returns type="boolean">True/False depending on user input</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Do we have any changes, either local or wide area
            var thereAreChanges = !!screen
				? lsWire.shell.anyNavigationUnitHasChanges()
				: lsWire.screenHasChanges();


            title = !!title ? title : "Discard your Changes?";
            text = !!text ? text : "";

            // If there are any changes, even nested, ask if its ok to discard/cancel 
            if (thereAreChanges) {

                // Make sure we return the promise from the showMessageBox to stop processing
                return msls.showMessageBox(text, {
                    title: title,
                    buttons: msls.MessageBoxButtons.yesNo
                }).then(function (result) {

                    if (result == msls.MessageBoxResult.yes) {
                        result = true;
                        if (yesCallBack != undefined) {
                            yesCallBack();
                        }
                    } else {
                        result = false;
                        if (noCallBack != undefined) {
                            noCallBack();
                        }
                    }

                    return result;
                });
            } else {

                // If no changes to the screen data, its ok to discard/cancel
                if (yesCallBack != undefined) {
                    yesCallBack();
                };

                return true;
            }

        },

        showPopup: function (name, top, left, className, screen, callBack) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Show a screen popup with custom top/left and a CSS class if passed
            /// </summary>
            /// <param name="name" type="string">Name of the popup</param>
            /// </signature>
            /// <signature>
            /// <param name="name" type="string">Name of the popup</param>
            /// <param name="top" type="string" optional="true">Optional - Top pixel location for your popup, ie: "10px", can also pass "centered"</param>
            /// </signature>
            /// <signature>
            /// <param name="name" type="string">Name of the popup</param>
            /// <param name="top" type="string" optional="true">Optional - Top pixel location for your popup, ie: "10px", can also pass "centered"</param>
            /// <param name="left" type="string" optional="true">Optional - Left pixel location for your popup, ie: "20px", can also pass "centered"</param>
            /// </signature>
            /// <signature>
            /// <param name="name" type="string">Name of the popup</param>
            /// <param name="top" type="string" optional="true">Optional - Top pixel location for your popup, ie: "10px", can also pass "centered"</param>
            /// <param name="left" type="string" optional="true">Optional - Left pixel location for your popup, ie: "20px", can also pass "centered"</param>
            /// <param name="className" type="string" optional="true">Optional - CSS Class for the popup</param>
            /// </signature>
            /// <signature>
            /// <param name="name" type="string">Name of the popup</param>
            /// <param name="top" type="string" optional="true">Optional - Top pixel location for your popup, ie: "10px", can also pass "centered"</param>
            /// <param name="left" type="string" optional="true">Optional - Left pixel location for your popup, ie: "20px", can also pass "centered"</param>
            /// <param name="className" type="string" optional="true">Optional - CSS Class for the popup</param>
            /// <param name="screen" type="object" optional="true">Optional - Screen object, if not passed, active screen will be used</param>
            /// </signature>
            /// <signature>
            /// <param name="name" type="string">Name of the popup</param>
            /// <param name="top" type="string" optional="true">Optional - Top pixel location for your popup, ie: "10px", can also pass "centered"</param>
            /// <param name="left" type="string" optional="true">Optional - Left pixel location for your popup, ie: "20px", can also pass "centered"</param>
            /// <param name="className" type="string" optional="true">Optional - CSS Class for the popup</param>
            /// <param name="screen" type="object" optional="true">Optional - Screen object, if not passed, active screen will be used</param>
            /// <param name="callBack" type="fuction" optional="true">Optional - Callback to execute after the popup is displayec</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            if (screen.findContentItem(name) != undefined && !lsWire.getShell().navigationInProgress) {;

                // Call the LightSwitch showPop, then lets customize its style and location
                screen.showPopup(name).then(function () {

                    // Get the popup container, active one
                    var container = document.getElementsByClassName('ui-popup-active')[0];

                    // Now change the styles as necessary
                    if (top != undefined) {

                        if (isNaN(top)) {
                            if (top == "centered") {
                                top = (window.innerHeight / 2) - (container.offsetHeight / 2);
                            }
                        }

                        container.style.top = _.contains(top, "px") ? top : top + "px";

                    }

                    if (left != undefined) {

                        if (isNaN(left)) {
                            if (left == "centered") {
                                left = (window.innerWidth / 2) - (container.offsetWidth / 2);
                            }
                        }

                        container.style.left = _.contains(left, "px") ? left : left + "px";

                    }

                    if (className != undefined)
                        container.classList.add(className);

                    if (callBack != undefined)
                        callBack(container);

                });
            }
        },

        renderMultiLineTabHeaders: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Render the top tab headers into multi-line, allowing for longer titles in a small column width
            /// </summary>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            if (screen.details._rootContentItem.kind != "Screen") return;

            // Get all the pages
            var pages = screen.details.pages;

            // Get all the tabs for this screen
            var selector = "#" + screen.details._pageId + " .msls-screen-tab";
            var tabs = document.querySelectorAll(selector);

            //var tabs = document.getElementById(lsWire.screen.active().details._pageId).getElementsByClassName('msls-screen-tab');

            // Loop over all the pages
            _.forEach(pages, function (page) {

                // If there is a break tag in the display name... lets render it
                if (page.displayName.indexOf("<br") !== -1) {

                    // Get the html element
                    var htmlElement = _.find(tabs, function (tab) {
                        return $(tab).data().mslsTabName == page.name;
                    });

                    var tabHeader1 = htmlElement.getElementsByClassName("id-element");
                    var spanElement = document.createElement("span");
                    spanElement.innerHTML = page.displayName;
                    tabHeader1[0].textContent = null;
                    tabHeader1[0].appendChild(spanElement);

                }
            });
        },

        
        disableAllChildren: function (contentItem) {

            lsWire.iterateOverChildren(contentItem, function (item) {

                lsWire.disableControl(item);

            });

        },

        disableControl: function (item) {

            var isPicker = (item.kind == "Details" && item.model.view.isPicker);

            if (item.kind == "Value" || isPicker) {

                item.isEnabled = false;

                if (item._view != undefined) {
                    item._view._contentContainer.attr("aria-disabled", "true");

                    if (isPicker) {
                        item._view._contentContainer.find(".id-modal-button.msls-has-search").hide();
                    };
                };

            };

        },

        disableAllControls: function (contentItem) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Disable all child HTML controls from the passed parent
            /// </summary>
            /// <param name="parentElement" type="HTMLElement">DOM Element to start looking for children to disable </param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************


            if (contentItem == undefined) return;

            lsWire.disableAllChildren(contentItem);

        },

        getPage: function (pageName, screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get the screen page (tab) for the passed name
            /// </summary>
            /// <param name="pageName" type="string" optional="false">Name of the page (tab)</param>
            /// <returns type="object">Page object</returns>
            /// </signature>
            /// <signature>
            /// <param name="pageName" type="string" optional="false">Name of the page (tab)</param>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// <returns type="object">Page object</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (pageName == undefined) return null;

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            var result = null;

            if (screen == undefined)
                return null;

            var screenPages = screen.details.pages;

            for (var i = 0; i < screenPages.length; i++) {

                // If a match, return the tab, else continue
                if (screenPages[i].name === pageName) {
                    result = screenPages[i];
                    break;
                }
            }

            return result;

        },

        hideScreenButtons: function (screen, hide) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>Hide the screen buttons that are on the top right, typically the save/discard/cancel/logout buttons</summary>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// <param name="hide" type="boolean" optional="true">Defaults to true, pass a false to display (unhide)</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;
            hide = hide == undefined ? true : hide;

            var selector = "#" + screen.details._pageId + " .titles-bar";

            if (hide) {
                document.querySelector(selector).getElementsByClassName('msls-screen-buttons')[0].style.display = "none";
            } else {
                document.querySelector(selector).getElementsByClassName('msls-screen-buttons')[0].style.display = "inline";
            }
        },

        screenHasValidationErrors: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Does the screen have any validation errors
            /// </summary>
            /// <returns type="boolean">true if screen has validation errors, else false</returns>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// <returns type="boolean">true if screen has validation errors, else false</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            var validationErrors = false;

            _.each(screen.details.pages, function (page) {

                if (!validationErrors) {
                    validationErrors = _.any(page.children, function (child) {
                        return child.hasValidationErrors(true);
                    });
                }

            });


            return validationErrors;

        },

        screenHasChanges: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Does the active screen have any changes to its data
            /// </summary>
            /// <returns type="boolean">true if screen has changes, else false</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var navUnit = lsWire.getShell().activeNavigationUnit;

            return navUnit.hasChanges
				|| navUnit.nestedChangeSet != undefined && navUnit.nestedChangeSet.hasNestedChanges;

        },

        clearScreenValidationErrors: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Clear all validation errors from the screeen.  Allows for saving with errors on the client.
            /// </summary>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            var contentItemTypes = [];
            contentItemTypes.push(msls.ContentItemKind.details);
            contentItemTypes.push(msls.ContentItemKind.value);
            contentItemTypes.push(msls.ContentItemKind.collection);

            // Find these content items starting from the children of the 'columns' content item 
            var matchingContentItems = findMatchingContentItems(contentItemTypes, screen.details.rootContentItem);

            var validationErrors = _.filter(matchingContentItems, function (item) {
                return item.validationResults.length > 0;
            });

            _.forEach(validationErrors, function (item) {
                item.validationResults = [];
            });


            function findMatchingContentItems(arrayOfTypes, parentContentItem) {
                var matches = [];

                if (parentContentItem.children.length == 0) {
                    return matches;
                }
                $.each(parentContentItem.children, function (i, contentItem) {
                    $.each(arrayOfTypes, function (j, type) {
                        if (contentItem.kind == type) {
                            matches.push(contentItem);
                        }
                    });
                    // Check the child's children for matches 
                    matches = matches.concat(findMatchingContentItems(arrayOfTypes, contentItem));
                });
                return matches;
            };
        },

        getActiveScreen: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get the active screen object, works from anywhere.
            /// </summary>
            /// <returns type="object">Screen object</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var shell = lsWire.getShell();
            var result = null;

            if (shell != undefined)
                result = shell.activeNavigationUnit.screen;

            return result;

        },

        allowScreenTitleToWrap: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Allows the title of the screen to wrap as the browser narrows
            /// </summary>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen that will hold the titles</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            if (screen.details._rootContentItem.kind != "Screen") return;

            // Get all the title for this screen
            var selector = "#" + screen.details._pageId + " h1.msls-title .msls-text";
            var screenTitle = document.querySelector(selector);

            if (screenTitle != undefined) {
                screenTitle.classList.add("lswire-text-allowwrap");
            }

        },

        changeScreenTitle: function (screen, title, subTitle, subTitleLocation, subTitleCssClass) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Change the title of the passed screen.  Allowing for an additional subtitle.
            /// </summary>
            /// <param name="screen" type="object" optional="true">Optional - Screen that houses the title we are about to change</param>
            /// <param name="title" type="string" optional="false">What the main title will be</param>
            /// <param name="subTitle" type="string" optional="true">Optional - What the subtitle will be</param>
            /// <param name="subTitleLocation" type="string" optional="true">Optional - Options can be above or below the main title</param>
            /// <param name="subTitleCssClass" type="string" optional="true">Optional - What CSS Class to give to the subtitle, defaults to lswire-screen-subtitle</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var newSubTitle;

            // Create the css class for the container object
            var containerCssClass = "lswire-title-container";

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            if (screen.details._rootContentItem.kind != "Screen") return;

            // Get the pageId
            var pageId = "#" + screen.details._pageId;

            var selector = "#" + screen.details._pageId + " h1.msls-title .msls-text .id-element";
            var screenTitle = $(selector);

            $(screenTitle).text(title);

            // If there is a subTitle
            if (subTitle != undefined) {

                // Find a location to put the subtitle
                subTitleLocation = subTitleLocation == undefined
					? "above"
					: _.contains("above below", subTitleLocation.toLowerCase()) ? subTitleLocation.toLowerCase() : "above";

                // Create the css class
                subTitleCssClass = subTitleCssClass == undefined
					? "lswire-screen-subtitle"
					: subTitleCssClass;


                // Add the container css class to give better accomadation for 2 lines
                $(pageId + " h1.msls-title").addClass(containerCssClass);

                // First lets see if we already have our tags
                var subTitleElement = $(pageId + " ." + subTitleCssClass);

                if (subTitleElement.length > 0) {
                    if (subTitleLocation == "above") {
                        $(subTitleElement).text(subTitle).append("<br>");
                    } else {
                        $(subTitleElement).text(subTitle).prepend("<br>");
                    }
                } else {

                    // Create our new tag for the subTitle
                    newSubTitle = $("<span></span").addClass(subTitleCssClass).text(subTitle);

                    // Append/prepend to the title
                    if (subTitleLocation == "above") {
                        $(newSubTitle.append("<br>"));
                        $(screenTitle).addClass("lswire-screen-title").parent().prepend(newSubTitle);
                    } else {
                        $(newSubTitle).prepend("<br>");
                        $(screenTitle).addClass("lswire-screen-title").parent().append(newSubTitle);

                    }
                }

                if (subTitleLocation == "above") {
                    $(".msls-navmenu-button", pageId).css("top", "30px");
                    $(".msls-back-button-contain", pageId).addClass("lswire-two-titles-button");
                }
            } else {
                $(".msls-back-button-contain", pageId).removeClass("lswire-two-titles-button");
                $(".lswire-screen-subtitle", pageId).html("");
            }

        },

        disableScreenPropertyBinding: function (screen, propertyName, disable) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Disable a binding on a particular property
            /// </summary>
            /// <param name="screen" type="object" optional="false">Screen object</param>
            /// <param name="propertyName" type="string" optional="false">Name of the property to disable binding</param>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="false">Screen object</param>
            /// <param name="propertyName" type="string" optional="false">Name of the property to disable binding</param>
            /// <param name="disable" type="boolean" optional="true">true to disable/false to enable</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // we have to have a screen and propertyName
            if (!!screen && !!propertyName) {

                // Get our page from the shellview, this holds our pre display items
                var shellViewPage = lsWire.shell.shellView._pageIdMapping[screen.details._pageId];

                if (!!shellViewPage) {

                    // Now get the unit
                    var unit = shellViewPage.unit;

                    if (!!unit) {

                        // Now look for our binding
                        var binding = _.find(unit.task.__dependencies, function (e) {
                            return e.bindingPath == propertyName;
                        });

                        // If we found one, what will we do with it
                        if (!!!disable) {
                            binding.deactivate();
                        } else {
                            binding.activate();
                        };

                    };

                };
            }
        },

        activateScreenHeaderDock: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <summary>
            /// Activate the ability of a screens title area (header) to remain fixed allowing for content
            /// to scroll under while remaining stable
            /// </summary>
            /// <param name="screen">Screen that you want the header to remain fixed</param>
            // *****************************************************************************************************
            // *****************************************************************************************************


            // Make sure we have an object created on this content Item
            screen.lsWire = screen.lsWire || {};
            var lsw = screen.lsWire;

            lsw.pageId = "#" + screen.details._pageId;
            lsw.fixedElement = $(".msls-header-area", lsw.pageId)[0];
            lsw.scrollingElement = $(".msls-content", lsw.pageId)[0];

            // Setup an object for tracking
            lsw.fixed = false;

            // Obviously we won't do anything unless we actually found the table
            if (lsw.scrollingElement != undefined) {

                // So we can track position, get the original 
                // top and bottom positon for the table
                lsw.bottom = lsw.fixedElement.getBoundingClientRect().bottom;
                lsw.scrollingItemTop = lsw.scrollingElement.getBoundingClientRect().top;

                lsw[lsw.pageId + "_catchScroll"] = function (e) {

                    // Get the current location of our scrolling item
                    var currentScrollingItemTop = lsw.scrollingElement.getBoundingClientRect().top;

                    // If the item is not already fixed and the scrolling item is underneath it
                    if (lsw.fixed == false && currentScrollingItemTop <= lsw.bottom) {

                        // Add our fixed element class item to the non scrolling item
                        $(lsw.fixedElement).addClass("lswire-fixed-element");

                        // Set our flag saying we are in fixed mode
                        lsw.fixed = true;

                    } else if (currentScrollingItemTop >= 0 && lsw.fixed == true) {

                        // So the scrolling item top is now within the window
                        // Remove our fixed element class
                        $(lsw.fixedElement).removeClass("lswire-fixed-element");

                        // Change our flag
                        lsw.fixed = false;
                    }

                };

                // Meat of our function monitor the scroll event
                $(document).on("scroll", lsw[lsw.pageId + "_catchScroll"]);

            };

        },

        disposeScreenHeaderDock: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <summary>
            /// Dispose of the particular screens scrolling handler
            /// </summary>
            /// <param name="screen" type="object" optional="false">Screen that the header is fixed</param>
            // *****************************************************************************************************
            // *****************************************************************************************************


            var lsw = screen.lsWire;

            // If the contentItem still has the scroll method, turn it off
            if (lsw && lsw[lsw.pageId + "_catchScroll"] != undefined) {
                $(document).off("scroll", lsw[lsw.pageId + "_catchScroll"]);
                lsw[lsw.pageId + "_catchScroll"] = null;
            }

        },

        sizeDialogScreen: function (screen, persistSetting) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <summary>
            /// Adjust the width of a dialog screen based on the Max Width setting of the first tab
            /// </summary>
            /// <param name="screen" type="object" optional="false">Screen object</param>
            /// <param name="persistSetting" type="boolean" optional="true">Keep the setting or revert back to default</param>
            // *****************************************************************************************************
            // *****************************************************************************************************


            if (screen != undefined) {

                if (persistSetting != undefined && !persistSetting) {
                    // Remove the bigger dialog width
                    lsWire.changeStyleRule("dynamicCss", ".msls-dialog-frame");
                    return;
                };


                var maxWidth = screen.details.startPage.properties.maxWidth;
                var asDialog = screen.details.rootContentItem.properties.showAsDialog;

                if (asDialog && maxWidth != undefined && maxWidth > 0) {
                    // Lots of content, so make our dialog window a bit wider
                    lsWire.changeStyleRule("dynamicCss", ".msls-dialog-frame", { "max-width": maxWidth + "px" });
                };
            };

        },

        // #endregion 


        // #region Screen Navigation - 6 functions
        // ==========================================================


        replaceScreenNav: function (items) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Relace a screen navigation menu with a custom one
            /// </summary>
            /// <param name="items" type="array" optional="false">Array of objects {displayName: string, callBack: function}</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (items == undefined) return;

            // First clear out the existing nav menu
            lsWire.clearScreenNav();

            // Now append the new items
            lsWire.appendToScreenNav(items);

        },

        appendToScreenNav: function (items) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Append an existing screen navigation menu with a custom items
            /// </summary>
            /// <param name="items" type="array" optional="false">Array of objects {displayName: string, callBack: function}</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (items == undefined) return;

            _.forEach(items, function (item) {
                lsWire.insertIntoScreenNav(item.displayName, item.callBack);
            });
        },

        clearScreenNav: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Clear/delete any existing screen navigation menu items
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var shell = lsWire.getShell();

            if (shell != undefined) {

                // Do we have a nav menu defined
                if (shell.hasNavigationMenu()) {

                    // Make sure we have a navigation menu
                    if (shell._navigationMenu === undefined)
                        shell.getNavigationMenu();

                    // Shortcut to the items
                    var navMenu = shell._navigationMenu.items;

                    // Pop all the items from the array
                    while (navMenu.length > 0) {
                        navMenu.pop();
                    }
                }
            }
        },

        disableScreenNav: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Disable the screen navigation menu.  
            /// If you pass a screen object scope will be limited to that screen.  
            /// If not, it will disable the navigation menu on all currently rendered screens.
            /// </summary>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen object</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var pageId = screen == undefined ? "" : "#" + screen.details._pageId + " ";
            var titleSelector = pageId + ".subControl.ui-title.msls-title .msls-text.msls-btn-title";
            var arrowSelector = pageId + ".subControl.ui-title.msls-title .msls-navmenu-button";

            var titles = document.querySelectorAll(titleSelector);
            var arrows = document.querySelectorAll(arrowSelector);

            // Over each one, add the collapsed class
            _.forEach(arrows, function (arrow) {
                arrow.classList.add("msls-collapsed");
            });

            _.forEach(titles, function (title) {
                $(title).off("vclick").removeClass("msls-btn-title");
            });


        },

        insertIntoScreenNav: function (displayName, callBack, index) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Insert a screen navigation item at a specific location in the list
            /// </summary>
            /// <param name="displayName" type="string" optional="false">Name to display</param>
            /// <param name="callBack" type="function" optional="false">function try execute</param>
            /// </signature>
            /// <signature>
            /// <param name="displayName" type="string" optional="false">Name to display</param>
            /// <param name="callBack" type="function" optional="false">function try execute</param>
            /// <param name="index" type="number" optional="true">Where in the menu to insert item, defaults to the last item</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // If no shell... return
            var shell = lsWire.getShell();

            if (displayName != undefined && callBack != undefined && shell != undefined && shell.hasNavigationMenu()) {

                // Make sure the nav menu has been initialized first
                if (shell._navigationMenu === undefined)
                    shell.getNavigationMenu();

                // Create a blank object
                var navItem = new Object();
                navItem._displayName = displayName;
                navItem.displayName = displayName;
                navItem._command = callBack;
                navItem.execute = function () { this._command(); };

                // if no location then make it a push vs splice
                if (index === undefined) {

                    // Add to the nav menu
                    shell._navigationMenu.items.push(navItem);

                } else {

                    // Insert into the nav menu
                    shell._navigationMenu.items.splice(index, 0, navItem);

                }
            }

        },

        removeScreenNavItem: function (displayName) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Remove a screen navigation item
            /// </summary>
            /// <param name="displayName" type="string" optional="false">Display name of item to remove</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // If no shell... return
            var shell = lsWire.getShell();

            if (displayName != undefined && shell != undefined && shell.hasNavigationMenu()) {

                // Make sure the nav menu has been initialized first
                if (shell._navigationMenu === undefined)
                    shell.getNavigationMenu();

                // Shortcut to the items
                var navMenu = shell._navigationMenu.items;

                _.remove(navMenu, function (navItem) {
                    return navItem._displayName == displayName;
                });
            }
        },

        // #endregion Screen Navigation Functions/Methods


        // #region Tab - 19 functions 
        // ==========================================================


        showTab: function (name, beforeShown, afterShown, screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Wrapper for showing a tab with options for before and after being shown
            /// </summary>
            /// <param name="name" type="string" optional="false">Name of the tab</param>
            /// </signature>
            /// <signature>
            /// <param name="name" type="string" optional="false">Name of the tab</param>
            /// <param name="beforeShown" type="function" optional="true">Optional - Function to execute before the tab is shown</param>
            /// </signature>
            /// <signature>
            /// <param name="name" type="string" optional="false">Name of the tab</param>
            /// <param name="beforeShown" type="function" optional="true">Optional - Function to execute before the tab is shown</param>
            /// <param name="afterShown" type="function" optional="true">Optional - Function to execute after the tab is shown</param>
            /// </signature>
            /// <signature>
            /// <param name="name" type="string" optional="false">Name of the tab</param>
            /// <param name="beforeShown" type="function" optional="true">Optional - Function to execute before the tab is shown</param>
            /// <param name="afterShown" type="function" optional="true">Optional - Function to execute after the tab is shown</param>
            /// <param name="screen" type="object" optional="true">Optional - Screen object, if not passed, active screen will be used</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (name == undefined) return;

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            // Wait for any navigation to finish
            lsWire.getShell().finishNavigation().then(function () {

                if (beforeShown == undefined && afterShown == undefined) {
                    screen.showTab(name);
                    return;
                }

                if (beforeShown == undefined && afterShown != undefined) {
                    screen.showTab(name).then(function () { afterShown(name); });
                    return;
                }

                if (beforeShown != undefined && afterShown == undefined) {
                    screen.showTab(name, { beforeShown: beforeShown(name) });
                    return;
                }

                if (beforeShown != undefined && afterShown != undefined)
                    screen.showTab(name, { beforeShown: beforeShown(name) }).then(function () { afterShown(name); });

            });

        },

        showFirstVisibleTab: function (screen) {
            var tabToShow = _.find(screen.details.pages, function (e) { return e.isVisible == true; });

            if (tabToShow != undefined) {
                lsWire.shell.finishNavigation().then(function () {
                    lsWire.showTab(tabToShow.name, null, null, screen);
                });
            }
        },

        getActiveTabName: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get the name of the active tab for a screen
            /// </summary>
            /// <returns type="string">Name of the active tab</returns>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// <returns type="string">Name of the active tab</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            return lsWire.getScreenInternalDetails(screen).activeTab;
        },

        hideTab: function (tabName, hide, screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Hide a tab for a screen
            /// </summary>
            /// <param name="tabName" type="string" optional="false">Name of the tab</param>
            /// </signature>
            /// <signature>
            /// <param name="tabName" type="string" optional="false">Name of the tab</param>
            /// <param name="hide" type="boolean" optional="true">True to hide (default) or False to unhide (show)</param>
            /// </signature>
            /// <signature>
            /// <param name="tabName" type="string" optional="false">Name of the tab</param>
            /// <param name="hide" type="boolean" optional="true">True to hide (default) or False to unhide (show)</param>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (tabName == undefined) return;

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            var tab = screen.findContentItem(tabName);

            if (tab != undefined)
                tab.isVisible = !!!hide;

            return;

        },

        hideTabs: function (screen) {
            /// <summary>
            /// Hide tabs on the screen based on convetion
            /// Tab description can hold a json object
            /// {"permission":"permissionId"}
            /// </summary>
            /// <param name="screen"></param>

            // Loop over all the pages (tabs)
            _.forEach(screen.details.pages, function (p) {

                var permission = JSON.parse(p.description).permission;

                if (permission != undefined && !lsWire.userHasPermission(permission)) {
                    p.isVisible = false;
                };

            });


        },

        getTabButtons: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get all the tab Buttons for a screen
            /// </summary>
            /// <returns type="array">Array of tab button objects</returns>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// <returns type="array">Array of tab button objects</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            var result = {};

            var tabHeaderButtons = lsWire.getScreenInternalDetails(screen)._buttons;

            for (var i = 0; i < tabHeaderButtons.length; i++) {
                result[tabHeaderButtons[i].data.name] = tabHeaderButtons[i];
            }

            return result;

        },

        addTabButtonClass: function (tabName, className, screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Add a css class to a tab button
            /// </summary>
            /// <param name="tabName" type="string" optional="false">Tab name</param>
            /// <param name="className" type="string" optional="false">Class name to add</param>
            /// </signature>
            /// <signature>
            /// <param name="tabName" type="string" optional="false">Tab name</param>
            /// <param name="className" type="string" optional="false">Class name to add</param>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (tabName == undefined) return;

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            var tabHeaderElement = lsWire.getTabButtonElement(tabName, screen);

            if (!tabHeaderElement.hasClass(className)) {
                tabHeaderElement.addClass(className);
            }

        },

        removeTabButtonClass: function (tabName, className, screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Remove a css class from a tab button
            /// </summary>
            /// <param name="tabName" type="string" optional="false">Tab name</param>
            /// <param name="className" type="string" optional="false">Class name to remove</param>
            /// </signature>
            /// <signature>
            /// <param name="tabName" type="string" optional="false">Tab name</param>
            /// <param name="className" type="string" optional="false">Class name to remove</param>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (tabName == undefined || className == undefined) return;

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            var tabHeaderElement = lsWire.getTabButtonElement(tabName, screen);

            if (tabHeaderElement.hasClass(className)) {
                tabHeaderElement.removeClass(className);
            }

        },

        getTabButtonElement: function (tabName, screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get an individual tab Button object 
            /// </summary>
            /// <param name="tabName" type="string" optional="false">Tab name</param>
            /// <returns type="HTMLElement">DOM Element for the tab button</returns>
            /// </signature>
            /// <signature>
            /// <param name="tabName" type="string" optional="false">Tab name</param>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// <returns type="HTMLElement">DOM Element for the tab button</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (tabName == undefined) return null;

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            var tabHeaderButtons = lsWire.getTabButtons(screen);

            var element = $(tabHeaderButtons[tabName]._element);
            var text = element.find('.ui-btn-text');

            return text.length != 0 ? text : element;

        },

        tabHasValidationErrors: function (tabName, screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Check to see if the tab has any validation errors
            /// </summary>
            /// <param name="tabName" type="string" optional="false">Name of the tab to check</param>
            /// <returns type="boolean">true/false</returns>
            /// </signature>
            /// <signature>
            /// <param name="tabName" type="string" optional="false">Name of the tab to check</param>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// <returns type="boolean">true/false</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (tabName == undefined) return false;

            var validationErrors = false;
            var thisTab;

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            var tabs = _.find(screen.details.rootContentItem.children, function (child) { return child.displayName == "Tabs"; });

            if (tabs != undefined) {

                thisTab = _.find(tabs.children, function (child) { return child.name == tabName; });

                validationErrors = thisTab.hasValidationErrors(true);

            }

            if (thisTab != undefined && validationErrors && thisTab._view != undefined)
                validationErrors = thisTab.validationResults.length > 0;

            return validationErrors;

        },

        getTabs: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get all the tab objects for a particular screen
            /// </summary>
            /// <returns type="array">Array of tab objects</returns>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// <returns type="array">Array of tab objects</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            return lsWire.getScreenInternalDetails(screen).children;

        },

        getActiveTab: function (screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get the active tab for a particular screen
            /// </summary>
            /// <returns type="object">Active tab object</returns>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// <returns type="object">Active tab object</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            // Get the name of the screens active tab
            var activeTabName = lsWire.getScreenInternalDetails(screen).activeTab;

            // Go get the tab and return it
            return lsWire.getTab(activeTabName, screen);
        },

        getTab: function (tabName, screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get a tab object by its name
            /// </summary>
            /// <param name="tabName" type="string" optional="false">Name of the tab to retrieve</param>
            /// <returns type="object">Tab object</returns>
            /// </signature>
            /// <signature>
            /// <param name="tabName" type="string" optional="false">Name of the tab to retrieve</param>
            /// <param name="screen" type="object" optional="true">Screen object, if not passed, active screen will be used</param>
            /// <returns type="object">Tab object</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (tabName == undefined) return null;

            var result = null;

            // Make sure we have a screen object
            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            // Go get all the tabs for the screen
            var screenTabs = lsWire.getTabs(screen);

            // Loop over them all
            for (var i = 0; i < screenTabs.length; i++) {

                // If a match, return the tab, else continue
                if (screenTabs[i].data.name === tabName) {
                    result = screenTabs[i];
                    break;
                }
            }
            return result;

        },

        getContentItemTab: function (contentItem) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get the tab object where the contentItem resides
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem</param>
            /// <returns type="object">Tab object</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined) return null;

            // Get the parent of our contentItem
            var tabObj = contentItem.parent;

            // Loop over the parents until a tab control is found
            while (tabObj != undefined && tabObj.kind != "Tab") {

                tabObj = tabObj.parent;

            }

            // If the tab is undefined return null else go get the tab from the pages object
            return tabObj == undefined ? undefined : lsWire.getTab(tabObj.name, contentItem.screen);

        },

        setTabValidationError: function (tabName, screen, cssClass) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Sets/Removes validation error class from tab headers
            /// </summary>
            /// <param name="tabName" type="string" optional="false">Name of the tab</param>
            /// </signature>
            /// <signature>
            /// <param name="tabName" type="string" optional="false">Name of the tab</param>
            /// <param name="screen" type="object" optional="true">Screen object that contains the tab header</param>
            /// </signature>
            /// <signature>
            /// <param name="tabName" type="string" optional="false">Name of the tab</param>
            /// <param name="screen" type="object" optional="true">Screen object that contains the tab header</param>
            /// <param name="cssClass" type="string" optional="true">CSS class to add/remove from the header element</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (tabName == undefined) return;

            var screenPage = lsWire.getPage(tabName, screen);

            cssClass = cssClass == undefined ? "validationErrors" : cssClass;

            if (screenPage != undefined) {
                if (_.any(screenPage.children, function (child) { return child.hasValidationErrors(true); })) {
                    lsWire.addTabButtonClass(tabName, cssClass, screen);
                } else {
                    lsWire.removeTabButtonClass(tabName, cssClass, screen);

                }
            }

        },

        changeActiveTabHeaderColor: function (color) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Set the color for the active tab button
            /// </summary>
            /// <param name="color" type="string" optional="false">Any type of valid CSS color</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (color != undefined) {
                lsWire.changeStyleRule('dynamicCss', '.msls-screen-tab-active .ui-btn-text', { "color": color });
            }
        },

        changeTabHeaderToDoubleLine: function (option) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Adjust the style for a tab header to be double line
            /// </summary>
            /// <param name="option" type="object">false to remove the dynamic style, else object of style properties</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // If you pass false, it will remove the styles

            var classProperties = {
                "height": "5.5em",
                "margin-top": "-7px",
                "padding-top": "0px"
            };

            if (option !== undefined && option !== null && option === false) {
                classProperties = undefined;
            }

            lsWire.changeStyleRule('dynamicCss', '.msls-header .msls-tabs-bar', classProperties);
        },

        tabHeaderScrollFix: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Fix for the scrollbar cutting into the header area
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (lsWire.tabHeaderScrollFixApplied) return;

            //var classProperties = [];

            var containerHeight = $(".msls-tabs-bar").height();
            containerHeight += 10;
            var classProperties = { 'height': containerHeight + 'px' };

            lsWire.changeStyleRule('dynamicCss', '.msls-header .msls-tabs-bar', classProperties);
            lsWire.tabHeaderScrollFixApplied = true;

        },

        changeTabDisplayName: function (tabName, text, screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Set the display name for the tab with the passed tab name
            /// </summary>
            /// <param name="tabName" typ="string" optional="false">Name of the tab</param>
            /// </signature>
            /// <signature>
            /// <param name="tabName" typ="string" optional="false">Name of the tab</param>
            /// <param name="text" type="string" optional="true">New text to display, no content resets to original</param>
            /// </signature>
            /// <signature>
            /// <param name="tabName" typ="string" optional="false">Name of the tab</param>
            /// <param name="text" type="string" optional="true">New text to display, no content resets to original</param>
            /// <param name="screen" type="object" optional = "true">Screen that contains the tab header</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (lsWire.isEmpty(tabName)) return;

            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            var pageId = "#" + screen.details._pageId;

            var tabButton = _.find($(".msls-screen-tab", pageId), function (e) {
                return $(e).data().mslsTabName == tabName;
            });

            if (lsWire.isEmpty(text)) {

                text = "";
                var page = _.find(screen.details.pages, function (p) {
                    return p.name == tabName;
                });

                if (page != undefined) {
                    text = page.displayName;
                }

            }

            var textElement = $(".ui-btn-text", tabButton);
            if (textElement.length == 0)
                textElement = $('.id-element', tabButton);

            if (textElement.length > 0)
                $(textElement)[0].textContent = text;


        },

        appendToTabDisplayName: function (tabName, text, screen) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Append to the original display name
            /// </summary>
            /// <param name="tabName" type="string" optional="false">Name of the tab</param>
            /// </signature>
            /// <signature>
            /// <param name="tabName" type="string" optional="false">Name of the tab</param>
            /// <param name="text" type="string" optional="true">Text to append to the display name, no content resets to original</param>			
            /// </signature>
            /// <signature>
            /// <param name="tabName" type="string" optional="false">Name of the tab</param>
            /// <param name="text" type="string" optional="true">Text to append to the display name, no content resets to original</param>			
            /// <param name="screen" type="object" optional = "true">Screen that contains the tab header</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (lsWire.isEmpty(tabName)) return;

            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            var pageId = "#" + screen.details._pageId;

            var tabButton = _.find($(".msls-screen-tab", pageId), function (e) {
                return $(e).data().mslsTabName == tabName;
            });

            var page = _.find(screen.details.pages, function (p) {
                return p.name == tabName;
            });

            if (page != undefined) {
                if (lsWire.isEmpty(text)) {
                    text = page.displayName;
                } else {
                    text = page.displayName + " " + text;
                }
            } else {
                text = "";
            }

            var textElement = $(".ui-btn-text", tabButton);
            if (textElement.length == 0)
                textElement = $('.id-element', tabButton);

            if (textElement.length > 0)
                $(textElement)[0].textContent = text;

        },

        hideTabsBar: function (screen, hide) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Hide the tabs bar
            /// </summary>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen object, defaults to active screen</param>
            /// </signature>
            /// <signature>
            /// <param name="screen" type="object" optional="true">Screen object, defaults to active screen</param>
            /// <param name="hide" type="boolean" optional="true">Defaults to true (hide), pass false to show</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            hide = hide == undefined ? true : hide;

            screen = screen == undefined ? lsWire.getActiveScreen() : screen;

            if (screen.details._rootContentItem.kind != "Screen") return;

            // Get all the title for this screen
            var screenTabsBar = document.getElementById(screen.details._pageId).getElementsByClassName("msls-tabs-bar")[0];

            if (screenTabsBar != undefined) {
                if (hide) {
                    screenTabsBar.classList.add("msls-collapsed");
                } else {
                    if (screenTabsBar.classList.contains("msls-collapsed")) {
                        screenTabsBar.classList.remove("msls-collapsed");
                    }
                }
            }
        },

        // #endregion Tab Methods


        // #region Control - 53 functions
        // ==========================================================

        addHeaderToLayout: function (contentItem, cssClass) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Add a header for a layout control
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the layout control</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the layout control</param>
            /// <param name="cssClass" type="string" optional="true">CSS Class for the header text - Defaults to msls-control-header</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined) return;

            cssClass = cssClass || "msls-control-header";

            var showLabel = contentItem.properties.attachedLabelPosition;

            if (showLabel !== "Hidden" && showLabel !== "None") {

                // Get the container element
                var container = contentItem._view._container[0];

                var div = document.createElement("div");
                var txt = document.createTextNode(contentItem.displayName);

                div.className = cssClass;
                div.style.marginLeft = '10px';
                div.appendChild(txt);

                container.insertBefore(div, container.firstChild);

            }
        },

        initializeTableControl: function (options) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initializes a LightSwitch Table for enhanced filtering/sorting
            /// .
            /// Option fields:
            /// contentItem: contentItem that will be our table
            /// element: Element that is used for the table control
            /// batchMode: Are we going to start in batch mode?
            /// filterDisabled: Are we going to disable the filter
            /// filterPopupName: Name of the popup holding the filter objects
            /// filterPopupColumnName: Name of the popup item for the columnName
            /// filterPopupOperatorName1: Name of the popup item for the first Operator
            /// filterPopupOperatorName2: Name of the popup item for the second Operator
            /// filterPopupConcatName: Name of the popup item for the concat dropdown
            /// filterPopupValueName1: Name of the popup item for the first value
            /// filterPopupValueName2: Name of the popup item for the second value
            /// </summary>
            /// <param name="options" type="object" optional="true">Properties to tweak the enhanced table</param>
            /// <returns type="object">Enhanced Table Object</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************


            // Private/Internal constructor
            var eht = function () {

                // Instance based properties
                var properties = {

                    // Obvious... pointers to our screen/contentItem objects
                    screen: options.contentItem.screen,
                    contentItem: options.contentItem,

                    // Define/default our filter popup items
                    filterPopupName: options.filterPopupName || "FilterPopup",
                    filterPopupColumnName: options.filterPopupColumnName || "ColumnName",
                    filterPopupOperatorName1: options.filterPopupOperatorName1 || "Operator1",
                    filterPopupOperatorName2: options.filterPopupOperatorName2 || "Operator2",
                    filterPopupConcatName: options.filterPopupConcatName || "Concat",
                    filterPopupValueName1: options.filterPopupValueName1 || "Value1",
                    filterPopupValueName2: options.fitlerPopupValueName2 || "Value2",

                    // Hold our big odata sort string
                    sortString: "",
                    sortColumns: [],

                    // Hold our big odata filter string
                    filterString: "",
                    filterColumns: [],

                    // Pointer to our array of table columns
                    tableColumns: options.contentItem.children[0].children,

                    // Pointer to the visual collection
                    visualCollection: options.contentItem._binding.value,

                    // Get the name of this controls data source, ie database name
                    dataSourceName: options.contentItem.model.dataSource.member.source.target.source.member.id.split('/')[0],

                    // Get the name of the data table associated with this control
                    dataTableName: options.contentItem.details._entry.name,

                    // Element is the HTML element that contains the table control
                    element: $(options.element),

                    // Are we going to be in batch mode or not
                    batchMode: options.batchMode || false,

                    // Are we going to disable filtering
                    filterDisabled: options.filterDisabled || false

                };

                function initialize() {

                    // Minimal requirements are the controls contentItem and element
                    if (properties.contentItem == undefined || properties.element == undefined) return;

                    // Update our query method for our dynamic sorting, only need to do this on initialize
                    // ==========================================================================================
                    var queryType = typeof myapp.activeDataWorkspace[properties.dataSourceName][properties.dataTableName];
                    options.contentItem.details._entry.simpleDescriptor.createQuery =
						function () {
						    if (queryType == "function") {
						        return this.dataWorkspace[properties.dataSourceName][properties.dataTableName]().filter(properties.filterString).orderBy(properties.sortString);
						    } else {
						        return this.dataWorkspace[properties.dataSourceName][properties.dataTableName].filter(properties.filterString).orderBy(properties.sortString);
						    }

						};


                    // Find and loop over each TH (header) element
                    $("th", properties.element).each(function (i) {

                        // Get the column header contentItem based on the index
                        var tableColumn = properties.tableColumns[i];

                        // Push the pointer onto our filter/sort arrays
                        properties.sortColumns.push(tableColumn);
                        properties.filterColumns.push(tableColumn);

                        // We only skip command (button) types, all others get passed for processing
                        if (tableColumn.kind === "Command") {
                            return;
                        }

                        // Initialize sort/filter property sets for this column
                        tableColumn.enhancedTable = {};
                        tableColumn.enhancedTable.sort = {};
                        tableColumn.enhancedTable.filter = {};

                        // Store the html element for ease of accessibility
                        tableColumn.enhancedTable.sort.element = $("<div class='lswire-sort-element'><span id='text'></span><span id='icon'></span><span id='iconText' class='lswire-sort-icon-text'></span></div>");
                        tableColumn.enhancedTable.filter.element = $("<div class='lswire-filter-element'><span id='text' class='lswire-filter-icon-text'></span><div id='icon' class='ui-btn-no-text ui-btn-inner ui-icon ui-icon-bars lswire-filter-icon-element'></div></div>");

                        // Reintroduce the table column name into our header element
                        $('#text', tableColumn.enhancedTable.sort.element).text(tableColumn.displayName);

                        // This is a hack to stop the propagation of the click on the parent element
                        $(this).off('vclick').on('vclick', function (e) { e.stopPropagation(); });

                        // Now replace the parent html with our new elements
                        $(this).html("");
                        $(this).append(tableColumn.enhancedTable.sort.element);
                        $(this).append(tableColumn.enhancedTable.filter.element);

                        // This property will hold which direction we are sorting, ASC, DESC, NULL
                        tableColumn.enhancedTable.sort.direction = null;

                        // Initialize the sort/filter position (ordering amongst themselvles)
                        tableColumn.enhancedTable.sort.position = null;
                        tableColumn.enhancedTable.filter.position = null;

                        // Initialize our odata compatible field name, accounts for navigational names
                        tableColumn.enhancedTable.odataName = (tableColumn.bindingPath.slice(5)).replace('.', '/');

                        // Add our own click handlers back in for each header part
                        initializeColumnSort(tableColumn);

                        // If we are disabling the filtering, don't initialize
                        if (!properties.filterDisabled) initializeColumnFilter(tableColumn);

                        // If we are to disable filtering, hide the element
                        if (properties.filterDisabled) $(tableColumn.enhancedTable.filter.element).hide();

                    });
                };


                // ///////////////////////////////////////////////////////////////////////////////////////////
                // ==========================================================================================
                // ==========================================================================================
                // Internal 
                // ==========================================================================================
                // ==========================================================================================
                // ///////////////////////////////////////////////////////////////////////////////////////////


                // Initializes a column for our version of sorting
                // ==========================================================================================
                function initializeColumnSort(tableColumn) {

                    var sort = tableColumn.enhancedTable.sort;

                    // Add the pointer style to the header element
                    $(sort.element).css('cursor', 'pointer');

                    $(sort.element).on("click", function (e) {

                        e.stopPropagation();

                        // Adjust the direction based on the previous direction
                        // Ordering flow is Ascending -> Descending -> no sort
                        switch (sort.direction) {
                            case "asc":
                                // We were ascending... so change to Descending
                                sort.direction = "desc";
                                break;

                            case "desc":
                                // We were descending... so change to NULL, no sort
                                sort.direction = null;
                                sort.position = null;

                                // Since we removed a sort item, re-sort the headers based on their sort position
                                properties.sortColumns = _.sortBy(properties.sortColumns, function (item) {
                                    return item.enhancedTable.sort.position == null ? 10000 : item.enhancedTable.sort.position;
                                });
                                break;

                            default:
                                // We were null or undefined, so we go to ascending now
                                sort.direction = "asc";
                                sort.position = 1000;

                                // Since we added a sort item, re-sort the fields based on their sort position
                                properties.sortColumns = _.sortBy(properties.sortColumns, function (item) {
                                    return item.enhancedTable.sort.position == null ? 10000 : item.enhancedTable.sort.position;
                                });
                                break;
                        }

                        // Recalculate the sortPosition property, for use in the header display
                        _.each(properties.sortColumns, function (item, index) {
                            if (item.enhancedTable.sort.position != null) {
                                item.enhancedTable.sort.position = index;
                            }
                        });

                        // If batchMode was sent as true, then don't set the sort, user will do this
                        if (!properties.batchMode) reQuery();

                        // Update the headers with the sort information (graphic, position)
                        updateTableHeaders();

                    });
                };

                // Initializes a column for individual filter capability
                // ==========================================================================================
                function initializeColumnFilter(tableColumn) {

                    var filter = tableColumn.enhancedTable.filter;

                    // A filter is: Operator: xxxx, Value: xxxx
                    filter.set = [];
                    filter.concatType = null;

                    var propertyType = tableColumn.valueModel.propertyType;

                    filter.dataType = propertyType.__isPrimitiveType
						? propertyType.id
						: propertyType.underlyingType.id;

                    // Add the pointer style to the header element
                    $(filter.element).css('cursor', 'pointer');

                    // Look for the filter popup
                    var filterPopup = properties.screen.findContentItem(properties.filterPopupName);

                    // If found, initialize the on click
                    if (filterPopup != undefined) {
                        $(filter.element).on("click", function (e) {

                            e.stopPropagation();

                            // Quick/Easy hack to make sure your dropdowns can be dynamic
                            // Remove our stale popup so we can populate with new dropdown values
                            $("div[data-msls-name*='" + properties.filterPopupName + "']").remove();

                            // Pointer to our active column
                            properties.activeColumn = tableColumn;

                            // Initialize our screen inputs
                            initializeFilterOperators();
                            initializeFilterConcats();
                            initializeFilterValues();

                            // Update our field/column name
                            properties.screen[properties.filterPopupColumnName] = tableColumn.displayName;

                            // Finally show the popup, DOM for the popup gets recreated dynamically
                            properties.screen.showPopup(properties.filterPopupName);

                        });
                    }

                };

                // Stuff the filter operator dropdowns with appropriate values
                // ==========================================================================================
                function initializeFilterOperators() {

                    // Get our current column filter property
                    var filter = properties.activeColumn.enhancedTable.filter;

                    // Get our operator contentItems
                    var operatorContentItems = [];
                    operatorContentItems.push(properties.screen.findContentItem(properties.filterPopupOperatorName1));
                    operatorContentItems.push(properties.screen.findContentItem(properties.filterPopupOperatorName2));

                    var operators;
                    var defaultValueIndex = 0;

                    if (filter.dataType.indexOf(":String") != -1) {

                        defaultValueIndex = 2;
                        operators = [
							{ stringValue: "Is equal to", value: "eq" },
							{ stringValue: "Is not equal to", value: "ne" },
							{ stringValue: "Starts with", value: "startswith" },
							{ stringValue: "Contains", value: "substringof" },
							{ stringValue: "Does not contain", value: "not substringof" },
							{ stringValue: "Ends with", value: "endswith" }
                        ];

                    } else if (filter.dataType.indexOf(":Date") != -1) {
                        operators = [
							{ stringValue: "Is equal to", value: "eq" },
							{ stringValue: "Is not equal to", value: "ne" },
							{ stringValue: "Is after or equal to", value: "ge" },
							{ stringValue: "Is after", value: "gt" },
							{ stringValue: "Is before or equal to", value: "le" },
							{ stringValue: "Is before", value: "lt" }
                        ];

                    } else {
                        operators = [
							{ stringValue: "Is equal to", value: "eq" },
							{ stringValue: "Is not equal to", value: "ne" },
							{ stringValue: "Is greater than or equal to", value: "ge" },
							{ stringValue: "Is greater than", value: "gt" },
							{ stringValue: "Is less than or equal to", value: "le" },
							{ stringValue: "Is less than", value: "lt" }
                        ];

                    }

                    for (var i = 0; i < operatorContentItems.length; i++) {
                        var defaultValue = operators[defaultValueIndex].value;
                        var defaultStringValue = operators[defaultValueIndex].stringValue;

                        // If there was a saved filter, get it
                        if (filter.set[i] != undefined && filter.set[i].operator != undefined) {
                            var savedFilter = _.find(operators, function (op) {
                                return op.value == filter.set[i].operator;
                            });

                            if (savedFilter) {
                                // Save our value into the screen property
                                defaultValue = savedFilter.value;
                                defaultStringValue = savedFilter.stringValue;
                            }

                        }

                        // Set our values
                        operatorContentItems[i].choiceList = operators;
                        operatorContentItems[i].value = defaultValue;
                        operatorContentItems[i].stringValue = defaultStringValue;
                        properties.screen[operatorContentItems[i].name] = defaultValue;
                    }

                };

                // Stuff the filter Concat dropdown with appropriate values
                // ==========================================================================================
                function initializeFilterConcats() {

                    // Get our current column filter property
                    var filter = properties.activeColumn.enhancedTable.filter;

                    var concat = properties.screen.findContentItem(properties.filterPopupConcatName);

                    concat.choiceList = [
						{ stringValue: "And", value: "and" },
						{ stringValue: "Or", value: "or" }
                    ];

                    properties.screen[concat.name] = filter.concatType || "or";

                };

                // Initialize popup filter value fields
                // ==========================================================================================
                function initializeFilterValues() {

                    // Get our current column filter property
                    var filter = properties.activeColumn.enhancedTable.filter;

                    // Get our value contentItems
                    var valueContentItems = [];
                    valueContentItems.push(properties.screen.findContentItem(properties.filterPopupValueName1));
                    valueContentItems.push(properties.screen.findContentItem(properties.filterPopupValueName2));

                    for (var i = 0; i < valueContentItems.length; i++) {

                        var defaultValue = null;

                        if (filter.set[i] != undefined && filter.set[i].value != undefined) {
                            defaultValue = filter.set[i].value;
                        }

                        properties.screen[valueContentItems[i].name] = defaultValue;


                    }

                };

                // Aggregate the column filter settings into a big string
                // ==========================================================================================
                function updateFilterString() {

                    // Create our a string that will be used for our sort
                    properties.filterString = "";

                    // If filters are enabled, go update, else string remains as empty
                    if (!properties.filterDisabled) {

                        // Loop over each of the filterable columns
                        _.each(properties.filterColumns, function (item) {

                            // If the column has a filter position, lets work it
                            if (item.enhancedTable.filter.position != undefined && item.enhancedTable.filter.position != null) {

                                // Go get the filter string for this column
                                var temp = getColumnFilterString(item.enhancedTable.filter, item.enhancedTable.odataName);

                                // If we have existing data in the string and we got a filter back for this column, add our and
                                if (properties.filterString.length > 0 && temp.length > 0) properties.filterString += " and ";

                                // Simple concat
                                properties.filterString += temp;

                            }
                        });
                    }
                };

                // Aggregate the column sort settings into a big string
                // ==========================================================================================
                function updateSortString() {

                    // Empty any existing sort definition
                    properties.sortString = "";

                    // Create an OData string that will be used for our sort
                    _.each(properties.sortColumns, function (item) {
                        if (item.enhancedTable.sort.position != undefined && item.enhancedTable.sort.position != null) {
                            properties.sortString += item.enhancedTable.odataName + " " + item.enhancedTable.sort.direction + ", ";
                        }
                    });

                    // Remove the last character, which is the last comma
                    properties.sortString = properties.sortString.slice(0, -2);

                };

                // Get a formatted filter string for an individual column
                // ==========================================================================================
                function getColumnFilterString(filter, dataField) {

                    var filterString = "";
                    var formatString;

                    // Only if we have at least one filter defined
                    if (filter.set[0] != undefined) {

                        // Lets go process the set
                        _.each(filter.set, function (item) {

                            var tempValue = item.value;

                            // Go get our format string for this item
                            formatString = getFilterFormatString(item.operator, filter.dataType);

                            // If this is a date data type, we need to preprocess the value for transport
                            if (filter.dataType.indexOf(":Date") != -1) {

                                tempValue = new Date(tempValue);

                            };

                            // If there is data in our filter string, add our concat before the next
                            if (filterString.length > 0) filterString += filter.concatType + " ";

                            // Add format to the filter and add to our bigger item
                            filterString += String.format(formatString, dataField, item.operator, msls._toODataString(tempValue, filter.dataType));

                        });

                    }

                    // Enclose this 'set' in parens
                    return filterString != "" ? "(" + filterString + ")" : filterString;
                };

                // Get the format template for a filter
                // ==========================================================================================
                function getFilterFormatString(operator, dataType) {

                    var result;

                    if (dataType.indexOf(":String") != -1) {
                        switch (operator) {
                            case "substringof":
                                result = "{1}({2}, {0}) ";
                                break;

                            case "not substringof":
                                result = "{1}({2}, {0}) ";
                                break;

                            case "startswith":
                                result = "{1}({0}, {2}) ";
                                break;

                            case "endswith":
                                result = "{1}({0}, {2}) ";
                                break;

                            default:
                                result = "{0} {1} {2} ";
                                break;
                        }

                    } else {
                        result = "{0} {1} {2} ";
                    }

                    return result;

                };


                // ///////////////////////////////////////////////////////////////////////////////////////////
                // ==========================================================================================
                // ==========================================================================================
                // External 
                // ==========================================================================================
                // ==========================================================================================
                // ///////////////////////////////////////////////////////////////////////////////////////////


                function reQuery() {

                    // *****************************************************************************************************
                    // *****************************************************************************************************
                    /// <summary>
                    /// Used to refresh the table, requeries
                    /// </summary>
                    // *****************************************************************************************************
                    // *****************************************************************************************************

                    // Update our different OData strings
                    updateFilterString();
                    updateSortString();

                    // Refresh the visual collection, resulting in the table refreshing
                    properties.visualCollection.refresh();

                };

                function clearAll() {

                    // *****************************************************************************************************
                    // *****************************************************************************************************
                    /// <summary>
                    /// Clears any sort and filters that have been set, call reQuery() after to refresh the table
                    /// </summary>
                    // *****************************************************************************************************
                    // *****************************************************************************************************

                    // Clear the sorts and filters, defer the query
                    clearAllSorts();
                    clearAllFilters();

                };

                function clearAllSorts() {

                    // *****************************************************************************************************
                    // *****************************************************************************************************
                    /// <summary>
                    /// Clear all sort items
                    /// </summary>
                    // *****************************************************************************************************
                    // *****************************************************************************************************

                    // Loop over all the columns, set sort properties to null
                    _.each(properties.sortColumns, function (item) {
                        item.enhancedTable.sort.position = null;
                        item.enhancedTable.sort.direction = null;
                    });

                    // Update the headers with the sort information (graphic, position)
                    updateTableHeaders();

                };

                function disableFilters(yes) {

                    // *****************************************************************************************************
                    // *****************************************************************************************************
                    /// <summary>
                    /// Ability to disable/enable filter capability after initialization
                    /// </summary>
                    /// <param name="yes" type="boolean">true/false</param>
                    // *****************************************************************************************************
                    // *****************************************************************************************************

                    // Make sure we have a value
                    if (yes == undefined) yes = true;

                    // If yes, go ahead and clear all the filters first
                    if (yes) {
                        clearAllFilters();
                    }

                    // Loop over the columns, and show/hide the filter icon, in essence removing filtering
                    _.each(properties.filterColumns, function (item) {
                        if (yes) {
                            $(item.enhancedTable.filter.element).hide();
                        } else {

                            // Look for the filter popup
                            var filterPopup = properties.screen.findContentItem(properties.filterPopupName);

                            // If found, go ahead and show the filter icon
                            if (filterPopup != undefined) $(item.enhancedTable.filter.element).show();
                        }
                    });

                };

                function setColumnFilter() {

                    // *****************************************************************************************************
                    // *****************************************************************************************************
                    /// <summary>
                    /// Set the filter for the individual column, called from the filter popup
                    /// </summary>
                    // *****************************************************************************************************
                    // *****************************************************************************************************

                    // Get the column filter object for this popup instance
                    var filter = properties.activeColumn.enhancedTable.filter;

                    // Make sure we start fresh
                    filter.set = [];

                    // Only proceed if there is a value in the first value input element
                    if (properties.screen[properties.filterPopupValueName1] != undefined && properties.screen[properties.filterPopupValueName1] != null) {

                        // Add this first key/value set into our filter set
                        filter.set.push({
                            operator: properties.screen[properties.filterPopupOperatorName1],
                            value: properties.screen[properties.filterPopupValueName1]
                        });

                        // If there is also data in the second value input element
                        if (properties.screen[properties.filterPopupValueName2] != undefined && properties.screen[properties.filterPopupValueName2] != null) {

                            // Add this second key/value into the set
                            filter.set.push({
                                operator: properties.screen[properties.filterPopupOperatorName2],
                                value: properties.screen[properties.filterPopupValueName2]
                            });

                        }

                    }


                    // Initialize the filter position for this column
                    if (filter.position == null)
                        filter.position = filter.set.length > 0 ? 1000 : null;

                    // Setup the concat field, regardless of values or not
                    filter.concatType = properties.screen[properties.filterPopupConcatName];

                    // Since we added/removed a filter item, re-sort the fields based on their filter position
                    properties.filterColumns = _.sortBy(properties.filterColumns, function (item) {
                        return item.enhancedTable.filter.position == null ? 10000 : item.enhancedTable.filter.position;
                    });

                    // Recalculate the filter position property, for use in the header display
                    _.each(properties.filterColumns, function (item, index) {
                        if (item.enhancedTable.filter.position != null) {
                            item.enhancedTable.filter.position = index;
                        }
                    });

                    // Get the data if we are not in batch mode
                    if (!properties.batchMode) reQuery();

                    // So now lets go update the column headers
                    updateTableHeaders();

                };

                function clearAllFilters() {

                    // *****************************************************************************************************
                    // *****************************************************************************************************
                    /// <summary>
                    /// Clear the filter fields, if in batchMode also execute the sort
                    /// </summary>
                    // *****************************************************************************************************
                    // *****************************************************************************************************

                    // Loop over the filter columns
                    _.each(properties.filterColumns, function (item) {
                        var filter = item.enhancedTable.filter;

                        // Set their individual data to null
                        filter.position = null;
                        filter.set = [];
                        filter.concatType = null;
                    });


                    // Update the headers with the filter information (graphic, position)
                    updateTableHeaders();

                };

                function clearColumnFilter() {

                    // *****************************************************************************************************
                    // *****************************************************************************************************
                    /// <summary>
                    /// Clear the filter fields, if in batchMode also executes the sort
                    /// </summary>
                    // *****************************************************************************************************
                    // *****************************************************************************************************

                    // Get the column filter object for this popup instance
                    var filter = properties.activeColumn.enhancedTable.filter;

                    // Nullify this individual columns filter data
                    filter.position = null;
                    filter.set = [];
                    filter.concatType = null;

                    // Re sort the filter columns, setting up for updating the header display
                    properties.filterColumns = _.sortBy(properties.filterColumns, function (item) {
                        return item.enhancedTable.filter.position == null ? 10000 : item.enhancedTable.filter.position;
                    });

                    // Recalculate the sortPosition property, for use in the header display
                    _.each(properties.filterColumns, function (item, index) {
                        if (item.enhancedTable.filter.position != null) {
                            item.enhancedTable.filter.position = index;
                        }
                    });

                    // Get the data if we are not in batch mode
                    if (!properties.batchMode) reQuery();

                    // Update the headers with the sort information (graphic, position)
                    updateTableHeaders();

                };

                function updateTableHeaders() {

                    // *****************************************************************************************************
                    // *****************************************************************************************************
                    /// <summary>
                    /// Update table column headers based on sort/filter properties
                    /// </summary>
                    // *****************************************************************************************************
                    // *****************************************************************************************************

                    // loop over our headers
                    _.each(properties.tableColumns, function (item) {

                        var showActive = true;
                        var parentElement = item.enhancedTable.sort.element.parent();
                        var sortElement = item.enhancedTable.sort.element;
                        var filterElement = item.enhancedTable.filter.element;

                        // If sort position is set, update the header
                        if (item.enhancedTable.sort.position != null) {
                            var graphic = item.enhancedTable.sort.direction == "asc" ? " - &#9650" : " - &#9660";
                            $('#iconText', sortElement).html(item.enhancedTable.sort.position + 1);
                            $('#icon', sortElement).html(graphic);
                        } else {

                            // No sort position, so showActive is a no, so far
                            showActive = false;

                            // No sort position, so just show the default text
                            $('#iconText', sortElement).html("");
                            $('#icon', sortElement).html("");
                        }


                        // Only update the filter items if filters are enabled
                        if (!properties.filterDisabled) {

                            // Now lets do the same for the filters, is there a sort position?
                            if (item.enhancedTable.filter.position != null) {

                                // If so, make sure our showActive is now also true
                                showActive = true;

                                // Update the screen with its position number
                                $('#text', filterElement).text(item.enhancedTable.filter.position + 1);
                            } else {

                                $('#text', filterElement).text("");
                            }
                        }

                        // Finally, if showActive, add a class to make pretty the parent element
                        if (showActive) {
                            $(parentElement).addClass('ui-btn-active');
                        } else {
                            $(parentElement).removeClass('ui-btn-active');
                        }


                    });
                };

                function setBatchMode(onOff) {

                    // *****************************************************************************************************
                    // *****************************************************************************************************
                    /// <summary>
                    /// Allow dynamically toggling batch mode
                    /// </summary>
                    /// <param name="onOff">true/off</param>
                    // *****************************************************************************************************
                    // *****************************************************************************************************

                    properties.batchMode = onOff || false;
                };

                function getBatchMode() {

                    // *****************************************************************************************************
                    // *****************************************************************************************************
                    /// <summary>
                    /// Is the table if batch mode or not
                    /// </summary>
                    /// <returns type="boolean">true/false</returns>
                    // *****************************************************************************************************
                    // *****************************************************************************************************

                    return properties.batchMode;
                };

                function closeFilterPopup() {

                    // *****************************************************************************************************
                    // *****************************************************************************************************
                    /// <summary>
                    /// Helper to make it easy to close the filter popup
                    /// </summary>
                    // *****************************************************************************************************
                    // *****************************************************************************************************

                    properties.screen.closePopup(properties.filterPopupName);
                };

                // Finally... our constructor
                // ==========================================================================================
                (function () {
                    initialize();
                })();

                // What do we want to expose to the outside
                // ==========================================================================================
                return {
                    reQuery: reQuery,
                    clearAll: clearAll,
                    clearAllSorts: clearAllSorts,
                    clearAllFilters: clearAllFilters,
                    clearColumnFilter: clearColumnFilter,
                    disableFilters: disableFilters,
                    setColumnFilter: setColumnFilter,
                    closeFilterPopup: closeFilterPopup,
                    setBatchMode: setBatchMode,
                    getBatchMode: getBatchMode
                };
            };

            // ============================================
            // ============================================
            return new eht(options);


        },

        activateTableHeaderDock: function (contentItem) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <summary>
            /// Activate a tables ability to dock its column headers at the top of the window
            /// when those headers touch the top
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">ContentItem of the table</param>
            // *****************************************************************************************************
            // *****************************************************************************************************


            // Make sure we have a rule that we will override dynamically
            lsWire.changeStyleRule("dynamicCss", ".lswire-fixed-element th", { "width": "auto" });

            // Make sure we have an object created on this content Item
            contentItem.lsWire = contentItem.lsWire || {};
            var lsw = contentItem.lsWire;

            // Get our table and header objects, and basic settings
            var container = contentItem._view._container[0];

            lsw.table = container.getElementsByTagName("table")[0];
            lsw.tableHead = container.getElementsByTagName("thead")[0];
            lsw.styleSheet = lsWire.getStyleSheet("dynamicCss");
            lsw.pageId = "#" + contentItem.screen.details._pageId;
            lsw.fixed = false;


            // *****************************************************************************************************
            // function that will be used to monitor the scrolling
            // giving it a unique name allows us to destroy easily
            // *****************************************************************************************************
            lsw[lsw.pageId + "_catchScroll"] = function (e) {

                // Get the current location of our header row
                var curBoundingRec = lsw.table.getBoundingClientRect();

                // If the row is not already fixed and its top is offscreen
                if (lsw.fixed == false && curBoundingRec.top <= 0) {

                    // Add our fixed element class to the head element
                    $(lsw.tableHead).addClass("lswire-fixed-element");

                    // Find the first cell on the page, so we can get the dom width
                    var firstCell = $("td", ".ui-page-active").first()[0];

                    if (firstCell != undefined) {

                        // Calculate and set the width of the header cells
                        setTableHeaderCellWidth(contentItem);

                        // Set our flag saying we are in fixed mode
                        lsw.fixed = true;
                    }

                } else if (curBoundingRec.top > 0 && lsw.fixed == true) {

                    // So the table top is now visible
                    // Remove our fixed element class
                    $(lsw.tableHead).removeClass("lswire-fixed-element");

                    // Change our flag
                    lsw.fixed = false;
                }

            };


            // Obviously we won't do anything unless we actually found the table
            if (lsw.table != undefined) {

                // So we can track position, get the original 
                // top and bottom positon for the table
                var boundingRec = lsw.table.getBoundingClientRect();
                lsw.originalTop = boundingRec.top;
                lsw.originalBottom = boundingRec.bottom;

                // Set a flag to identify if we are in a fixed mode.
                // Yes, another option would be to ck css.
                lsw.fixed = false;

                // Meat of our function monitor the scroll event
                $(document).on("scroll", lsw[lsw.pageId + "_catchScroll"]);


                // *****************************************************************************************************
                // Monitor the resize event for the window
                // *****************************************************************************************************
                $(window).resizeEnd({
                    delay: 150
                }, function () {

                    // When window is resized, recalculate table cell width
                    if (lsw.table) {

                        // Calculate and set the width of the header cells
                        setTableHeaderCellWidth(contentItem);

                    }
                });
            };


            // *****************************************************************************************************
            // Set the width of the column headers based on the width of the actual content cells
            // *****************************************************************************************************
            function setTableHeaderCellWidth(_contentItem) {

                var _lsw = _contentItem.lsWire;

                // Find the first cell on the page, so we can get the dom width
                var firstCell = $("td", ".ui-page-active").first()[0];

                if (firstCell != undefined) {

                    // Calculate the width our header cells should be, based on width
                    // of the cells holding the content
                    var padding = parseInt($(firstCell).css("padding-left")) * 2;
                    var width = firstCell.getBoundingClientRect().width;
                    lsw.cellWidth = width - padding;

                    var cssRule = lsWire.getStyleRule(_lsw.styleSheet, ".lswire-fixed-element th");
                    cssRule.rule.style.cssText = "width: " + _lsw.cellWidth + "px !important; ";

                }
            }


        },

        disposeTableHeaderDock: function (contentItem) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <summary>
            /// Dispose of the table header scrolling handler
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">ContentItem of the table</param>
            // *****************************************************************************************************
            // *****************************************************************************************************


            var lsw = contentItem.lsWire;

            // If the contentItem still has the scroll method, turn it off
            if (lsw && lsw[lsw.pageId + "_catchScroll"] != undefined) {
                $(document).off("scroll", lsw[lsw.pageId + "_catchScroll"]);
                lsw[lsw.pageId + "_catchScroll"] = null;
            }

        },

        renderHtmlInCustomControl: function (contentItem, cssClass) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Render an HTML string within a custom control
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the control</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the control</param>
            /// <param name="cssClass" type="string" optional="true">cssClass to use for the control</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined) return;

            var id = "htmlRenderFor-" + contentItem.name;

            contentItem.dataBind("_view.isRendered", function (isRendered) {

                if (isRendered) {

                    // Create our container
                    var htmlContainer = document.createElement("DIV");
                    var customClass = cssClass != undefined ? cssClass : "lswire-render-html";
                    htmlContainer.className = "ui-input-text ui-shadow-inset ui-corner-all ui-btn-shadow ui-body-a ui-mini " + customClass;
                    htmlContainer.id = id;
                    htmlContainer.innerHTML = contentItem.value;

                    contentItem._view._contentContainer[0].appendChild(htmlContainer);
                }
            });

            contentItem.dataBind("_view.isRendered", function (isRendered) {

                if (isRendered) {

                    contentItem.dataBind("value", function (newValue) {

                        if (newValue == undefined) {
                            newValue = "";
                        }

                        if (contentItem._view.isRendered) {
                            var element = contentItem._view._contentContainer[0].querySelector("#" + id);
                            element.innerHTML = newValue;
                        }

                    });

                }
            });

        },

        changeButtonIcon: function (contentItem, currentIconClass, newIconClass) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Change the icon of a button
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem of the standard button</param>
            /// <param name="currentIconClass" type="string" optional="false">Class name of the current icon</param>
            /// <param name="newIconClass" type="string" optional="false">Class name of the new icon</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined || currentIconClass == undefined || newIconClass == undefined) return;

            // Get the container element
            var container = contentItem._view._container[0];

            var element = container.getElementsByClassName("ui-icon")[0];

            if (element) {
                element.classList.remove(currentIconClass);
                element.classList.add(newIconClass);
            };

        },

        toggleButtonClass: function (contentItem, cssClass) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Toggle a cssClass for a button
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem of the standard button</param>
            /// <param name="cssClass" type="string" optional="false">Class name to toggle</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined || cssClass == undefined) return;

            // Get the container element
            var container = contentItem._view._container[0];

            var element = container.getElementsByClassName("ui-icon")[0];

            if (element) {
                element.classList.toggle(cssClass);
            };

        },

        removeButtonClass: function (contentItem, cssClass) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Remove a cssClass for a button
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem of the standard button</param>
            /// <param name="cssClass" type="string" optional="false">Class name to toggle</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined || cssClass == undefined) return;

            // Get the container element
            var container = contentItem._view._container[0];

            var element = container.getElementsByClassName("ui-icon")[0];

            if (element) {
                element.classList.remove(cssClass);
            };

        },

        addButtonClass: function (contentItem, cssClass) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Add a cssClass for a button
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem of the standard button</param>
            /// <param name="cssClass" type="string" optional="false">Class name to toggle</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined || cssClass == undefined) return;

            // Get the container element
            var container = contentItem._view._container[0];

            var element = container.getElementsByClassName("ui-icon")[0];

            if (element) {
                element.classList.add(cssClass);
            };

        },

        renderButtonAsIcon: function (contentItem, icon, noText) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Render a standard button as an icon button
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem of the standard button</param>
            /// <param name="icon" type="string" optional="false">Class name of the icon - 
            /// ok, cancel, discard, decline, save, logout, back, search, camera, trash, add, remove,
            /// video, tag, gear, contacts, edit, question, refreesh, list, folder, move, text, attachment,
            /// warning, star, addfavorite, filter, sort, addpicture, document, download, calendar, dropdown
            /// </param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">contentItem of the standard button</param>
            /// <param name="icon" type="string" optional="false">Class name of the icon - 
            /// ok, cancel, discard, decline, save, logout, back, search, camera, trash, add, remove,
            /// video, tag, gear, contacts, edit, question, refreesh, list, folder, move, text, attachment,
            /// warning, star, addfavorite, filter, sort, addpicture, document, download, calendar, dropdown
            /// </param>
            /// <param name="noText" type="boolean" optional="true">Show button text or not, defaults to false</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined || icon == undefined) return;

            var div = document.createElement("div");
            var btnSpan = document.createElement("span");
            var txtSpan = document.createElement("span");
            var txt = document.createTextNode(contentItem.displayName);
            var iconSpan = document.createElement("span");

            div.className = "id-element msls-large-icon ui-btn ui-shadow ui-mini ui-btn-icon-top ui-btn-up-a";
            div.style.boxShadow = "none";
            div.setAttribute("data-theme", "a");

            btnSpan.className = "ui-btn-inner";

            txtSpan.className = "ui-btn-text";
            txtSpan.appendChild(txt);

            iconSpan.className = "ui-icon " + icon + " ui-icon-shadow";

            // Default noText to false (show text)
            noText = noText || false;

            if (noText == true) {

                // Add all of our items under the big div
                btnSpan.appendChild(iconSpan);

            } else {

                // Add all of our items under the big div
                btnSpan.appendChild(txtSpan);
                btnSpan.appendChild(iconSpan);

                // Bind to the displayName so the text can be dynamically changed
                contentItem.dataBind('displayName', function (newValue) {
                    txtSpan.textContent = newValue;
                });

            }

            // Add the button to the div
            div.appendChild(btnSpan);

            // Get the container element
            var container = contentItem._view._container[0];

            // Add our new button to the element
            container.replaceChild(div, container.firstChild);

            // Removing the msls-leaf will drop the big padding typically used
            var parent = lsWire.getParentByClassName(container, "msls-leaf");
            parent.classList.remove('msls-leaf');

        },

        limitNumberOfCharacters: function (contentItem, maxLength, showCount, labelTemplate) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>Enhance an Input control to limit the number of allowed characters.<br/>
            /// Also will update the associated label to show a realtime character count</summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the input control</param>
            /// <param name="maxLength" type="integer" optional="false">Maximum number of characters allowed</param>
            /// <param name="showCount" type="boolean" optional="true">Show the count on the label?</param>
            /// <param name="labelTemplate" type="string" optional="true">"{{displayName}} ({{count}} of {{max}} characters left)}</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the input control</param>
            /// <param name="maxLength" type="integer" optional="false">Maximum number of characters allowed</param>
            /// <param name="showCount" type="boolean" optional="true">Show the count on the label?</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the input control</param>
            /// <param name="maxLength" type="integer" optional="false">Maximum number of characters allowed</param>
            /// <param name="showCount" type="boolean" optional="true">Show the count on the label?</param>
            /// <param name="labelTemplate" type="string" optional="true">"{{displayName}} ({{count}} of {{max}} characters left)}</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined || maxLength == undefined) return;

            labelTemplate = labelTemplate || "{{displayName}} ({{count}} of {{max}} characters left)";
            showCount = showCount === undefined ? true : showCount;

            // Bind to the isRendered property so we know when its safe
            contentItem.dataBind("_view.isRendered", function (isRendered) {

                if (isRendered) {

                    // If no label... do nothing except return
                    if (contentItem.properties.attachedLabelPosition === "None" || contentItem.properties.attachedLabelPosition === "Hidden")
                        showCount = false;

                    // Get the label element to hold the messaging
                    var label = contentItem._view._container[0].getElementsByTagName('label')[0];
                    var input = contentItem._view._container[0].getElementsByClassName('id-element')[0];

                    // Get our text area
                    var displayName = contentItem.displayName;

                    contentItem.dataBind("value", function () {
                        if (showCount) {
                            var currentLength = contentItem.stringValue == undefined ? 0 : contentItem.stringValue.length;
                            updateCharacterCountLabel(label, displayName, currentLength, maxLength, labelTemplate);
                        }
                    });


                    // Setup listener number 1...  for pasted text
                    // =================================================================================================
                    input.onpaste = function (e) {

                        // As usual, don't let the default happen
                        e.preventDefault();
                        var pastedText = undefined;

                        // Differences between IE and others, get the pasted text
                        if (window.clipboardData && window.clipboardData.getData) {
                            pastedText = window.clipboardData.getData('Text');
                        } else if (e.clipboardData && e.clipboardData.getData) {
                            pastedText = e.clipboardData.getData('text/plain');
                        }

                        // Add existing text with pasted text, then truncate to the max allowed
                        contentItem.value = (input.value + pastedText).substring(0, maxLength);

                        // Update the label with the new counts
                        if (showCount) {
                            var currentLength = contentItem.stringValue == undefined ? 0 : contentItem.stringValue.length;
                            updateCharacterCountLabel(label, displayName, currentLength, maxLength, labelTemplate);
                        }

                    };

                    // Setup listener number 2...  for keydowns
                    // =================================================================================================
                    input.onkeydown = function (e) {

                        // Going forward with new character or backspacing, don't process if just arrow keys or the tab key
                        if (e.keyCode !== 37 && e.keyCode !== 38 && e.keyCode !== 39 && e.keyCode !== 40 && e.keyCode != 9) {

                            // keycode 8 is backspace
                            var nextLength = e.keyCode === 8
								? e.target.value.length - 1
								: e.target.value.length + 1;

                            // Make sure we don't go over our boundries
                            if (nextLength < 0 || (nextLength > maxLength && e.keyCode)) {
                                e.preventDefault();
                                return false;
                            };

                            // Update our label with new counts
                            if (showCount)
                                updateCharacterCountLabel(label, displayName, nextLength, maxLength, labelTemplate);
                        }
                        return true;
                    };
                }
            });


            // =================================================================================================
            // Helper function to update an input elements label with our character count template
            // =================================================================================================
            var updateCharacterCountLabel = function (label, displayName, value, maxLen, template) {

                // Get the initial number of characters left
                var whatsLeft = maxLen - value;

                // Add the messaging
                var countText = template.replace("{{displayName}}", displayName);
                countText = countText.replace("{{count}}", whatsLeft);
                countText = countText.replace("{{max}}", maxLen);
                label.innerText = countText;

            };

        },

        enableListToBeMultiSelect: function (contentItem, totalAllowedSelections, persistSelections) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>Enable Multi-Item selection on a list/table</summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the list/table control</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the list/table control</param>
            /// <param name="totalAllowedSelections" type="integer" optional="true">Maximum number of items that can be selected</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the list/table control</param>
            /// <param name="totalAllowedSelections" type="integer" optional="true">Maximum number of items that can be selected</param>
            /// <param name="persistSelections" type="boolean" optional="true">Whether to persist selections for this session</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure there is a contentItem
            if (contentItem != undefined && contentItem._view != null && contentItem._view._container != null) {

                // Make sure we have a properties location
                contentItem.lsWire = contentItem.lsWire || {};
                var lsw = contentItem.lsWire;

                // Setup our properties making it easier to work with selections
                var controlId = contentItem.model.view.id;
                lsw.controlClass = controlId === ":Table" ? ".msls-table tbody" : ".msls-listview";
                lsw.itemTagName = controlId === ":Table" ? "tr" : "li";
                lsw.lsWireSelectedClass = "lswire-selected-item";
                lsw.lsWireSelector = controlId === ":Table" ? "tbody tr.lswire-selected-item" : "ul li.lswire-selected-item";
                lsw.lsSelector = controlId === ":Table" ? "tbody tr.ui-btn-active" : "ul li.ui-btn-active";
                lsw.listView = contentItem._view._container[0].querySelector(lsw.controlClass);

                // Default our passed options
                lsw.totalSelectionsAllowed = totalAllowedSelections || null;

                // Look for an existing persistence setting... create our Id
                lsw.persistId = contentItem.screen.details._modelId + "_Persist" + contentItem.name + "Selections";

                // Do we have one set already?
                if (lsWire[lsw.persistId] === undefined) {
                    lsWire[lsw.persistId] = persistSelections == undefined
						? false
						: persistSelections;
                }

                lsw.persistSelections = lsWire[lsw.persistId];

                // Setup our listener for item taps
                lsw.listView.addEventListener('click', clickHandler);

                // Now be a good citizen, destroy the handler when screen is destroyed
                contentItem.screen.details.pages[0].handleViewDispose(function () {

                    lsw.listView.removeEventListener('click', clickHandler);

                });

                // ============================================================================================
                // Internal - Meat of the functionality, pass the list contentItem and tapped item
                // ============================================================================================
                function clickHandler(event) {

                    // Get the container tag
                    var itemElement = lsWire.getParentByTagName(event.target, lsw.itemTagName);

                    // If no parent match, we are done
                    if (itemElement != undefined) {

                        // Don't allow default handling
                        event.stopPropagation();

                        // Execute our own itemTap
                        itemTap(contentItem, itemElement);

                        // Execute the users itemTap
                        if (contentItem._view.underlyingControl.itemTap != undefined)
                            contentItem._view.underlyingControl.itemTap.execute();
                    };
                };


            };


            // ============================================================================================
            // Internal - Meat of the functionality, pass the list contentItem and tapped item
            // ============================================================================================
            function itemTap(ci, item) {

                // *****************************************************************************************************
                // *****************************************************************************************************
                /// <summary>Enhance a list/table item tap to allow multi-item selection</summary>
                /// <param name="contentItem" type="object">Screen contentItem of the list/table control</param>
                /// <param name="totalSelectionsAllowed" type="integer">Optional<br />
                /// Maximum number of items that can be selected<br />
                /// Defaults to unlimited<br/>
                /// null or undefined will allow for unlimited selections.
                /// </param>
                // *****************************************************************************************************
                // *****************************************************************************************************

                // Get the hook into our data for this item
                var itemData = $.cache[item[$.expando]].data.__entity;

                // If number of selects is multiple, then go!
                if (lsw.totalSelectionsAllowed === null || lsw.totalSelectionsAllowed > 1) {

                    // If the selected item already was selected, unselect (nullify) the item
                    if (item.classList.contains(lsw.lsWireSelectedClass)) {

                        ci.screen[ci.name].selectedItem = null;
                        item.classList.remove(lsw.lsWireSelectedClass);
                        item.classList.remove('ui-focus');
                        if (lsw.persistSelections)
                            itemData[lsw.persistId] = false;

                        // If the tapped item does not have our custom class showing selected, add it
                    } else {

                        // Get the current count of selected items if we are showing a limit
                        var selectedCount = lsw.totalSelectionsAllowed == undefined
							? 0
							: lsw.listView.querySelectorAll(lsw.lsWireSelector).length;

                        // If less than the total allowed add the class
                        if (lsw.totalSelectionsAllowed == undefined || selectedCount < lsw.totalSelectionsAllowed) {

                            ci.screen[ci.name].selectedItem = itemData;
                            item.classList.add(lsw.lsWireSelectedClass);
                            if (lsw.persistSelections)
                                itemData[lsw.persistId] = true;

                            // Already hit the limit, unselect this item
                        } else {

                            ci.screen[ci.name].selectedItem = null;
                            item.classList.remove('ui-focus');
                            if (lsw.persistSelections)
                                itemData[lsw.persistId] = false;
                        }
                    }

                    // Only 1 selection is allowed, so its more of a toggle, and no we are not going DRY
                } else {

                    // If the selected item already was selected, unselect (nullify) the item
                    if (item.classList.contains(lsw.lsWireSelectedClass)) {

                        ci.screen[ci.name].selectedItem = null;
                        item.classList.remove(lsw.lsWireSelectedClass);
                        item.classList.remove('ui-focus');
                        if (lsw.persistSelections)
                            itemData[lsw.persistId] = false;

                        // Not selected so remove any previous selection, and add to this one
                    } else {

                        var prevItem = listView.querySelector(lsw.lsWireSelector);
                        if (prevItem != undefined) {
                            prevItem.classList.remove(lsw.lsWireSelectedClass);
                            if (lsw.persistSelections)
                                itemData[lsw.persistId] = false;
                        }

                        item.classList.add(lsw.lsWireSelectedClass);
                        ci.screen[ci.name].selectedItem = itemData;
                        if (lsw.persistSelections)
                            itemData[lsw.persistId] = true;
                    }
                }


            };


        },

        reselectListItems: function (contentItem, force) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Reselect a previously selected item in a list. Typically used in the post render of a row, per item.
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem of the actual list/table item</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">contentItem of the actual list/table item</param>
            /// <param name="force" type="boolean" optional="true">If true, will select the item regardless of its previous state</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have an item and our variables
            if (contentItem != undefined && contentItem.parent.lsWire !== undefined) {

                // Get our variables
                var lsw = contentItem.parent.lsWire;

                // If we are to persist selections and the item was previously selected
                //if ((lsw.persistSelections && contentItem.value.lsWireSelected) || force) {
                if ((lsw.persistSelections && contentItem.value[lsw.persistId]) || force) {

                    // Get the items container
                    var item = contentItem._view._container[0];

                    // We need the parent when dealing with lists
                    if (contentItem.parent.model.view.id !== ":Table")
                        item = item.parentElement;

                    // Add back our selected class
                    item.classList.add(lsw.lsWireSelectedClass);

                    // If force was passed and true, make sure we persist
                    if (force)
                        contentItem.value[lsw.persistId] = true;

                };
            };

        },

        getSelectedListItems: function (contentItem) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get all the selected items from a list/table
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the the list/table</param>
            /// <returns type="array">An array of data entities</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Array to hold the data
            var data = [];

            if (contentItem != undefined && contentItem.lsWire !== undefined) {

                var lsw = contentItem.lsWire;

                // Get all the items that have our custom class signifying selection
                var selected = contentItem._view._container[0].querySelectorAll(lsw.lsWireSelector);

                // Go get the entity data for each selected item, add to the data array
                _.forEach(selected, function (item) {

                    // Get our data out of the jQuery cache
                    var entity = $.cache[item[$.expando]].data.__entity;
                    if (entity !== undefined)
                        data.push(entity);

                });
            }

            // Return our data array
            return data;

        },

        selectAllListItems: function (contentItem, yesNo) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Select all items in a list/table if unlimited selections are allowed
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the the list/table</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the the list/table</param>
            /// <param name="yesNo" type="boolean">true (default) Select all, false Unselect all</param> 
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem != undefined && contentItem.lsWire !== undefined) {

                var lsw = contentItem.lsWire;
                var allItems;

                // Default is to select all, false is passed to unselect
                if (yesNo === undefined || yesNo === true) {

                    if (lsw.totalSelectionsAllowed === undefined || lsw.totalSelectionsAllowed === null) {

                        // What is the control type... which drives how the items are created
                        var selector = contentItem.model.view.id === ":Table"
							? "tbody tr"
							: "ul li";

                        // Get the listview container... then query for all items
                        allItems = contentItem._view._container[0].querySelectorAll(selector);

                        // Add our selected class to all the items
                        _.forEach(allItems, function (item) {

                            // If the item has not already been selected, add the class
                            if (!item.classList.contains(lsw.lsWireSelectedClass)) {
                                item.classList.add(lsw.lsWireSelectedClass);
                                if (lsw.persistSelections)
                                    $.cache[item[$.expando]].data.__entity[lsw.persistId] = true;

                            }
                        });
                    }
                } else {

                    // Get all the items that have our selected class
                    allItems = contentItem._view._container[0].querySelectorAll(lsw.lsWireSelector);

                    // Loop over them all and remove our class
                    _.forEach(allItems, function (item) {
                        item.classList.remove(lsw.lsWireSelectedClass);
                        item.classList.remove('ui-focus');
                        if (lsw.persistSelections)
                            $.cache[item[$.expando]].data.__entity[lsw.persistId] = false;
                    });

                    // Nullify the selected item property
                    contentItem.screen[contentItem.name].selectedItem = null;
                }

            }
        },

        countOfSelectedListItems: function (contentItem) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get a count of how many items have been selected
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the the list/table</param>
            /// <returns type="integer">Count of the selected items</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var count = 0;

            if (contentItem != undefined && contentItem.lsWire !== undefined) {

                // Get the listview container... allowing independent lists on the same screen
                count = contentItem._view._container[0].querySelectorAll(contentItem.lsWire.lsWireSelector).length;

            }

            return count;

        },

        totalListSelectionsAllowed: function (contentItem, number) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Returns the total number of selections allowed
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the list/table</param>
            /// <returns type="integer">Number of selections allowed or null</returns>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the list/table</param>
            /// <param name="number" type="integer" optional="true">Number of allowed selctions. Pass a null or 0 to remove limits, undefined to retrieve</param>
            /// <returns type="integer">Number of selections allowed or null</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined) return null;

            contentItem.lsWire = contentItem.lsWire || {};

            // if no number, just return the value of
            if (number !== undefined) {

                contentItem.lsWire.totalSelectionsAllowed = number === null || number === 0
					? null
					: number;
            }

            // Always return the count
            return contentItem.lsWire.totalSelectionsAllowed || null;
        },

        persistListSelections: function (contentItem, persist) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Get the flag of whether to persist selections for this session
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the list/table</param>
            /// <returns type="string">Id of the persist object</returns>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the list/table</param>
            /// <param name="persist" type="boolean" optional="true">Persist selections, undefined will retrieve the current settings</param>
            /// <returns type="string">Id of the persist object</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined) return null;

            contentItem.lsWire = contentItem.lsWire || {};
            var lsw = contentItem.lsWire;

            // What is our id for the cache
            var persistId = contentItem.screen.details._modelId + "_Persist" + contentItem.name + "Selections";

            if (persist !== undefined) {
                if (persist !== lsWire[persistId]) {
                    lsw.persistSelections = persist;
                    lsWire[persistId] = persist;
                    if (lsw.listView !== undefined)
                        updateSelected(contentItem, persist);
                }
            }

            // Simple, return any value if exists, undefined if not 
            return lsWire[persistId];

            // Update all selected items with persist
            function updateSelected(ci, persistSelection) {

                var allSelected = lsWire.list.selected(ci);

                _.forEach(allSelected, function (item) {
                    item[lsw.persistId] = persistSelection;
                });

            }

        },

        reorderTheList: function (contentItem, orderProperty) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Loop over a list and reset the defined displayOrder column
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem of the List</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">contentItem of the List</param>
            /// <param name="orderProperty" type="string" optional="true">Name of the property holding the sort order,defaults to DisplayOrder</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have a contentItem and it has been rendered
            if (contentItem != undefined && contentItem._view != undefined) {

                // Grab the DOM list items, which actually hold our entities also
                var listItems = contentItem._view._contentContainer[0].getElementsByTagName("LI");

                // Make sure there is an order property
                orderProperty = orderProperty == undefined ? "DisplayOrder" : orderProperty;

                // Loop over the items
                for (var i = 0; i < listItems.length; i++) {

                    if (listItems[i] != undefined && $(listItems[i]).data().__entity != undefined) {

                        // Set the entity property to be the index, 1 based
                        $(listItems[i]).data().__entity[orderProperty] = i + 1;

                    }

                }
            }

        },

        changeListItemDisplayOrder: function (contentItem, item, increment, orderProperty) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Allowing a list item to move up or down the list
            /// </summary>
            /// <param name="contentItem" type="object" optiona="false">contentItem of the list</param>
            /// <param name="item" type="object" optional="false">Item in the list to use as start</param>
            /// <param name="increment" type="integer" optional="false">How far to increment the order number</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optiona="false">contentItem of the list</param>
            /// <param name="item" type="object" optional="false">Item in the list to use as start</param>
            /// <param name="increment" type="integer" optional="false">How far to increment the order number</param>
            /// <param name="orderProperty" type="string" optional="true">Name of the property holding the sort order,defaults to DisplayOrder</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem != undefined && contentItem.value != undefined && increment != undefined && item != undefined) {

                var list = contentItem.value;

                orderProperty = orderProperty == undefined ? "DisplayOrder" : orderProperty;

                // Loop over all the items in the list
                for (var i = 0; i < list.data.length; i++) {

                    // Get the list items Order number
                    var itemDisplayOrder = list.data[i][orderProperty];

                    // Is this the one we are swapping with?
                    if (itemDisplayOrder === item[orderProperty] + increment) {
                        list.data[i][orderProperty] = item[orderProperty];
                        item[orderProperty] = itemDisplayOrder;
                        return;
                    }

                }
            }

        },

        selectListItem: function (contentItem, id) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Function that will select a list item based on its ID
            /// </summary>
            /// <param name="contentItem" type="function" optional="false">contentItem for the list</param>
            /// <param name="id" type="number" optional="false">Id number of the item to select</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Make sure we have a contentItem and it has value
            if (contentItem != undefined && contentItem.value != undefined && id != undefined) {

                var value = contentItem.value;

                for (var i = 0; i < value.data.length; i++) {
                    if (value.data[i].Id === id) {
                        value.selectedItem = value.data[i];
                    }
                }
            }

        },

        selectListItems: function (contentItem, arrayOfIds, yesNo) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Select all items in a list/table if unlimited selections are allowed
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the the list/table</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the the list/table</param>
            /// <param name="yesNo" type="boolean">true (default) Select all, false Unselect all</param> 
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem != undefined && contentItem.lsWire !== undefined) {

                var lsw = contentItem.lsWire;
                var allItems;

                // Default is to select all, false is passed to unselect
                if (yesNo === undefined || yesNo === true) {

                    if (lsw.totalSelectionsAllowed === undefined || lsw.totalSelectionsAllowed === null) {

                        // What is the control type... which drives how the items are created
                        var selector = contentItem.model.view.id === ":Table"
							? "tbody tr"
							: "ul li";

                        // Get the listview container... then query for all items
                        allItems = contentItem._view._container[0].querySelectorAll(selector);

                        // Add our selected class to all the items
                        _.forEach(allItems, function (item) {

                            var entity = $(item).data().__entity;

                            if (_.contains(arrayOfIds, entity.Id)) {

                                // If the item has not already been selected, add the class
                                if (!item.classList.contains(lsw.lsWireSelectedClass)) {
                                    item.classList.add(lsw.lsWireSelectedClass);
                                    if (lsw.persistSelections)
                                        $.cache[item[$.expando]].data.__entity[lsw.persistId] = true;

                                }
                            }
                        });
                    }
                } else {

                    // Get all the items that have our selected class
                    allItems = contentItem._view._container[0].querySelectorAll(lsw.lsWireSelector);

                    // Loop over them all and remove our class
                    _.forEach(allItems, function (item) {
                        item.classList.remove(lsw.lsWireSelectedClass);
                        item.classList.remove('ui-focus');
                        if (lsw.persistSelections)
                            $.cache[item[$.expando]].data.__entity[lsw.persistId] = false;
                    });

                    // Nullify the selected item property
                    contentItem.screen[contentItem.name].selectedItem = null;
                }

            }

        },

        renderCheckboxInCustomControl: function (contentItem, options) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Render a custom control as a checkbox
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the custom control</param>
            /// </signature>
            /// <signature>
            /// <summary>
            /// Render a custom control as a checkbox
            /// .
            /// Options: Optional that can be set for the checkbox: 
            ///  {text: Text you want to display to the right of the checkbox 
            /// textCssClass: CSS class you want to have the text displayed as 
            /// cssClass: Parent CSS class you want for the checkbox 
            /// onChange: UDF for when the control is clicked 
            /// initialValue: boolean} UDF gets passed 2 parameters: isChecked and the eventObect
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the custom control</param>
            /// <param name="options" type="object" optional="true">Set of properties to customize the checkbox</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined) return;

            // Make a spot for our data
            var modelId = contentItem.screen.details._modelId;

            // Get the container element
            var container = contentItem._view._container[0];

            contentItem.lsWire = contentItem.lsWire || {};
            contentItem.lsWire.checkbox = contentItem.lsWire.checkbox || {};

            // Shortcut to our data in the contentItem
            var ckBox = contentItem.lsWire.checkbox;

            // Stuff the passed options into our contentItem properties
            options = options || {};
            ckBox.cssClass = options.cssClass || "lswire-checkbox";
            ckBox.checkedCssClassForText = options.checkedCssClassForText;
            ckBox.uncheckedCssClassForText = options.uncheckedCssClassForText;
            ckBox.text = options.text;

            // Set the default value for the checkbox
            if (options.initialValue !== undefined) contentItem.value = options.initialValue;

            // Make sure we have a default change handler, we pass a boolean for checked/unchecked
            ckBox.onChange = options.onChange || function (isChecked) {
                if (contentItem.isEnabled)
                    contentItem.value = isChecked;
            };

            // Create a unique ID for our control, we don't consistently know the pageId until later, so we can't use that
            ckBox.controlId = modelId + "-" + contentItem.name;

            // We use the following to create our accompaning label/text, if any
            // 1. text property in passed options takes priority, pass an empty string for no label
            // 2. if no text property, look at the description field of the contentItem
            // 3. if no description text, use displayName, only if label position is None
            if (ckBox.text === undefined) {
                if (contentItem.description == undefined) {
                    ckBox.text = contentItem.properties.attachedLabelPosition == "None" ? contentItem.displayName : "&nbsp;";
                } else {
                    ckBox.text = contentItem.description;
                }
            }

            // Make sure we're all trimmed up
            ckBox.text = ckBox.text.trim();

            // Create the HTML for the Wrapper, Input and Label controls
            var $wrapper = $('<div class="msls-clear msls-vauto">');
            var $checkBoxInput = $('<input type="checkbox" id="' + ckBox.controlId + '" />');
            var $label = $('<label for="' + ckBox.controlId + '">' + ckBox.text + '</label>');

            // Add our checkbox and label to the container, then the container to the element
            $checkBoxInput.appendTo($wrapper);
            $label.appendTo($wrapper);
            $wrapper.appendTo(container);

            // Add the passed cssClass to the parent, else we use the default
            if (ckBox.cssClass) $(container).addClass(ckBox.cssClass);

            // if there is no text to display, tell the parent, make sure there is a space for the label, for sizing
            if (_.contains(contentItem.displayName, "&nbsp;")) {
                contentItem._view._container.find(".msls-label label").html("&nbsp;");
            } else if (ckBox.text == "") {
                $label[0].innerHTML = "&nbsp;";
                $(container).addClass("noLabelCheckbox");
            }

            // Make sure our events don't bubble up
            $checkBoxInput.on('click', function (eventObj) {
                eventObj.stopPropagation();
            });

            // Add the UDF to the change event of the checkbox, passed values: checked or not, event obj
            $checkBoxInput.change(function (eventObj) {
                ckBox.onChange($checkBoxInput[0].checked, eventObj);
            });

            // Now lets add the container to our contentItem for the ability to reference later
            ckBox.wrapper = $wrapper;


            // ============================================================================================
            // Make sure our styles get applied before the page is shown
            // ============================================================================================
            $(document).one('pagebeforeshow', function () {
                lsWire.updateCheckboxTextCssClasses(contentItem);
            });


            // ============================================================================================
            // Lets do a dataBind so the UI gets updated if underlying value changes
            // ============================================================================================
            contentItem.dataBind("value", function (isChecked) {

                if (isChecked !== undefined) {
                    // Stuff our HTML input control with the new value
                    $checkBoxInput[0].checked = isChecked;

                    // Make sure the control has been rendered, then refresh the UI
                    if (contentItem._view.isRendered) {
                        $checkBoxInput.checkboxradio("refresh");
                        lsWire.updateCheckboxTextCssClasses(contentItem);
                    }
                }

            });

        },

        updateCheckboxTextCssClasses: function (contentItem) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Change/Update the CSS class for the checkbox text
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the custom control</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined) return;

            // Shortcut to our data in the contentItem
            var ckBox = contentItem.lsWire.checkbox;

            // Do we have our text element, if not go find it, once
            if (ckBox.btnTextElement == undefined)
                ckBox.btnTextElement = $(ckBox.wrapper).parent().find(".ui-btn-text");

            // Update the text css as defined previously
            if (contentItem.value) {
                $(ckBox.btnTextElement).removeClass(ckBox.uncheckedCssClassForText);
                $(ckBox.btnTextElement).addClass(ckBox.checkedCssClassForText);
            } else {
                $(ckBox.btnTextElement).removeClass(ckBox.checkedCssClassForText);
                $(ckBox.btnTextElement).addClass(ckBox.uncheckedCssClassForText);
            }

        },

        setCheckboxText: function (contentItem, text, classToAdd, classToRemove) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Change the text and CSS Class of the checkbox
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the custom control</param>
            /// <param name="text" type="string" optional="false">Text you want to display</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the custom control</param>
            /// <param name="text" type="string" optional="false">Text you want to display</param>
            /// <param name="classToAdd" type="string" optional="true">Optional CSS class to add for the text</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the custom control</param>
            /// <param name="text" type="string" optional="false">Text you want to display</param>
            /// <param name="classToAdd" type="string" optional="true">Optional CSS class to add for the text</param>
            /// <param name="classToRemove" type="string" optional="true">Optional CSS class to remove from the text</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined || text == undefined) return;

            // Shortcut to our data
            var ckBox = contentItem.lsWire.checkbox;

            // Do we have our text element, if not go find it, once
            if (ckBox.btnTextElement == undefined)
                ckBox.btnTextElement = $(ckBox.wrapper).parent().find(".ui-btn-text");

            if (ckBox.btnTextElement.length > 0) {
                ckBox.btnTextElement[0].innerHTML = text;

                if (classToRemove)
                    $(ckBox.btnTextElement).removeClass(classToRemove);

                if (classToAdd)
                    $(ckBox.btnTextElement).addClass(classToAdd);
            }
        },

        addCssClassForCheckboxText: function (contentItem, cssClass) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Add a CSS class for the text
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the custom control</param>
            /// <param name="cssClass" type="string" optional="false">CSS class name</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined || cssClass == undefined) return;

            // Shortcut to our data
            var ckBox = contentItem.lsWire.checkbox;

            // Do we have our text element, if not go find it, once
            if (ckBox.btnTextElement == undefined)
                ckBox.btnTextElement = $(ckBox.wrapper).parent().find(".ui-btn-text");

            if (ckBox.btnTextElement.length > 0)
                $(ckBox.btnTextElement).addClass(cssClass);

        },

        removeCssClassForCheckboxText: function (contentItem, cssClass) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Remove a CSS class from the text
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Screen contentItem of the custom control</param>
            /// <param name="cssClass" type="string" optional="false">CSS class name</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined || cssClass == undefined) return;

            // Shortcut to our data
            var ckBox = contentItem.lsWire.checkbox;

            // Do we have our text element, if not go find it, once
            if (ckBox.btnTextElement == undefined)
                ckBox.btnTextElement = $(ckBox.wrapper).parent().find(".ui-btn-text");

            if (ckBox.btnTextElement.length > 0)
                $(ckBox.btnTextElement).removeClass(cssClass);

        },

        initializeCheckboxCss: function (element, css) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initializes the checkbox styles
            /// </summary>
            /// <param name="element" type="object" optional="false">Element of the checkbox custom control</param>
            /// <param name="css" type="string" optional="false">CSS values (not classes) to be applied</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (element == undefined || css == undefined) return;

            $(document).one('pagebeforeshow', function () {
                $("div", element).css(css);
            });

        },

        disableCheckbox: function (contentItem, state) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Enable/Disable a checkbox
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">ContentItem for the checkbox</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">ContentItem for the checkbox</param>
            /// <param name="state" type="boolean" optional="true">Setting of false enables</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined) return;

            var element = contentItem._view._container[0].getElementsByTagName('input')[0];

            // State of false will enable
            if (state === undefined)
                state = true;

            element.disabled = state;
            element.parentNode.disabled = state;

            if (state)
                element.parentNode.classList.add('ui-disabled');
            else
                element.parentNode.classList.remove('ui-disabled');


        },

        clearDetailsPicker: function (contentItem) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Clear (nullify) a details picker.  LightSwitch does not handle this well in code so we fixed it.
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem of the picker</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem != undefined && contentItem._view != undefined) {
                $("input", contentItem._view._container[0]).val(null);
                contentItem.value = null;
            }

        },

        cleanDetailsPicker: function (contentItem) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Clean a details picker html element, when you nullify it, for whatever reason Ls doesnt do this
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem of the picker</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem != undefined && contentItem._view != undefined) {

                if (contentItem.value == null) {
                    $("input", contentItem._view._container[0]).val(null);
                }
            }

        },

        enableDetailsPickerView: function (contentItem, screenMethod) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Enable the search icon to be used to call a custom method, like show a view screen of the item
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem of the picker</param>
            /// <param name="screenMethod" type="object" optional="false">Method to be called with the items value</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            setTimeout(function () {
                $(".ui-icon-searchfield", contentItem._view._container[0]).css("cursor", "pointer").on('click', function (e) {
                    e.preventDefault();
                    if (e.target.nodeName != "INPUT" && contentItem.value != undefined) {
                        myapp[screenMethod](contentItem.value);
                    }
                });
            });

        },

        initializeValidator: function (options) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Set up a validator {contentItem, controlName, method}
            /// </summary>
            /// <param name="options">Object of properties</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Get the contentItem
            var contentItem = options.tab.findItem(options.controlName);

            // Bind to the isChanged property, only fires if data was changed
            contentItem.dataBind('value', function () {

                // If its screen start or data changed, fire our method, else skip
                options.method(contentItem);
            });

        },

        setValidationError: function (contentItem, validationPassed, validationMessage) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Set/Remove validation error on a contentItem
            /// </summary>
            /// <param name="contentItem" optional="false">contentItem to set/remove the error</param>
            /// <param name="validationPassed" type="boolean" optional="false">true/false</param>
            /// <param name="validationMessage" type="string" optional="false">Text to display for the error</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined || validationPassed == undefined) return;

            // See if our tabs exist
            var screen = contentItem.screen;
            var tab = lsWire.getContentItemTab(contentItem);
            var tabName = tab.data.name;

            if (!validationPassed) {
                contentItem.validationResults = [
					new msls.ValidationResult(contentItem.details, validationMessage)
                ];

            } else {

                contentItem.validationResults = null;

            }

            // Lets go see if we need to change change our tab header
            //if (setTabError !== false)
            lsWire.setTabValidationError(tabName, screen);

        },

        renderEmbedInCustomControl: function (contentItem, height) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Render an Embed within a custom control
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Custom control contentItem</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">Custom control contentItem</param>
            /// <param name="height" type="number" optional="true">Optional: height to set the video element for mp4 only</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined) return;

            contentItem.dataBind("value", function (embedCode) {


                if (embedCode != undefined) {
                    var embedId = "embed_" + lsWire.createUid();
                    var embedContainerId = "embedContainer" + "_" + embedId;
                    var element = contentItem._view._contentContainer;

                    if (element[0].id == "")
                        $(element).attr("id", embedContainerId);

                    switch (lsWire.getEmbedType(embedCode)) {
                        case "iframe":

                            // Create our iframe element
                            var iframe = $(embedCode);
                            $(iframe).attr("id", embedId);

                            // Add the fix for the zIndex issue
                            $(iframe).on("load", null, null, function () {
                                lsWire.fixzIndexAfterEmbedRender();
                            });

                            if (contentItem.embedId == undefined) {
                                $(element).append(iframe);
                            } else {
                                $("#" + contentItem.embedId).replaceWith(iframe);
                            }
                            contentItem.embedId = embedId;

                            break;

                        case "mp4":

                            // Do we already have a player?
                            if (contentItem.embedId == undefined) {
                                // Create our video element
                                // Is there a height set
                                var videoPlayer = $('<video controls><source type="video/mp4" src="' + embedCode + '"></video>');
                                $(videoPlayer).attr("id", embedId);
                                contentItem.embedId = embedId;

                                if (height != undefined && height > 0) {
                                    $(videoPlayer).height(height).width(height * 1.78);
                                }

                                $(element).append(videoPlayer);
                            }

                            break;

                        default:
                    }
                }
            });

        },

        fixzIndexAfterEmbedRender: function () {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Fix zIndexing after an embedded iframe gets rendered, typically call from the iframes onload handler.
            /// for example:  <iframe onload="fixzIndexAfterEmbedRender()"></iframe>
            /// </summary>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Lets use time as our randomizer
            var dt = new Date();

            return;

            // Make sure the frame has been rendered
            setTimeout(function () {

                // Reset the zIndex of all content and footers, quite a hack to get it to work
                $(".msls-content").css("z-index", 10100 + dt.getMinutes() + dt.getSeconds());
                $(".msls-footer").css("z-index", 10200 + dt.getMinutes() + dt.getSeconds());

                // Lets do it again
                setTimeout(function () {
                    // Reset the zIndex of all content and footers, quite a hack to get it to work
                    $(".msls-content").css("z-index", 10100 + dt.getMinutes() + dt.getSeconds());
                    $(".msls-footer").css("z-index", 10200 + dt.getMinutes() + dt.getSeconds());
                }, 200);

            }, 200);

        },

        resizeEmbed: function (contentItem, height, multiplier) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Resize an embedded item
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem that is doing the rendering of the embedded item</param>
            /// <param name="height" type="integer" optional="false">New height to render as</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">contentItem that is doing the rendering of the embedded item</param>
            /// <param name="height" type="integer" optional="false">New height to render as</param>
            /// <param name="multiplier" type="float" optional="true">The aspect ratio that will muliply with height to get the width</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined || height == undefined) return;

            var embedCode = contentItem.value;

            switch (lsWire.getEmbedType(embedCode)) {

                // iframe and youtube are the same
                case "iframe":

                    var oldEmbedCode = $(embedCode);

                    // Only rezise if we have a multiplier, else just render the embed code
                    if (multiplier != undefined) {

                        // Now go and adjust the height/width keeping the correct aspect ratio
                        var oldHeight = oldEmbedCode[0].height;

                        if (height != oldHeight) {
                            var width = height * multiplier;
                            var oldWidth = oldEmbedCode[0].width;

                            oldEmbedCode[0].height = height;
                            oldEmbedCode[0].width = width;
                            oldEmbedCode[0].style.height = height + "px";
                            oldEmbedCode[0].style.width = width + "px";

                            // Need to check the source for hidden item variables for height/width
                            // Channel 9 has this problem
                            var src = oldEmbedCode[0].src.split('?');

                            if (src.length > 1) {
                                src[1] = src[1].replace(oldHeight, height).replace(oldWidth, width);
                                oldEmbedCode[0].src = src[0] + "?" + src[1];
                            }
                            contentItem.value = oldEmbedCode[0].outerHTML;
                        }
                    }

                    break;

                case "mp4":

                    // HTML 5 will keep the aspect, so no calculation neeeded
                    if (contentItem.embedId != undefined) {
                        $("#" + contentItem.embedId).height(height).width(height * 1.78);
                    }

                    break;

                default:
            }

        },

        getEmbedAspectMultiplier: function (embedCode) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Find the current Aspect multiplier (ratio) from the passed embed code
            /// </summary>
            /// <param name="embedCode" type="string" optional="false">Code to embed the item, ie: iframe</param>
            /// <returns type="float">The multiplier that is used to calculate width</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Default to standard
            var multiplier = 1.78;

            if (embedCode != undefined && lsWire.getEmbedType(embedCode) == "iframe") {

                var tempElement = $(embedCode);
                var attrWidth = $(tempElement).width();
                var attrHeight = $(tempElement).height();
                var styleWidth = $(tempElement).css("width").replace("px", "");
                var styleHeight = $(tempElement).css("height").replace("px", "");

                var iWidth = attrWidth == styleWidth ? attrWidth : parseInt(styleWidth);
                var iHeight = attrHeight == styleHeight ? attrHeight : parseInt(styleHeight);

                multiplier = iWidth / iHeight;
            }

            return parseFloat(multiplier.toFixed(8));

        },

        openEmbedInWindow: function (embedCode) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Wrapper to use within a buttons custom method to open an embed in a separate tab/window in full screen
            /// </summary>
            /// <param name="embedCode" type="string" optional="false">Embed code that we will parse</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (embedCode == undefined) return;

            switch (lsWire.getEmbedType(embedCode)) {
                case "iframe":

                    // Get the source from the embed code
                    var source = $(embedCode).attr("src");

                    // is this youtube, change the embed to full window display
                    if (_.contains(source, "youtube") && _.contains(source, "embed")) {
                        source = source.replace("embed", "v");
                    }

                    // Now open up a new window/tab
                    window.open(source);
                    break;

                case "mp4":
                    window.open(embedCode);
                    break;

                default:
            }


        },

        destroyEmbed: function (contentItem) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Wrapper to destroy the embedded item, typically use before you navigate from the screen
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">Custom controls contentItem that housed the embedded item</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined) return;

            var embedCode = contentItem.value;

            switch (lsWire.getEmbedType(embedCode)) {
                case "iframe":
                    var view = contentItem._view._container;
                    $(view).remove("iframe");
                    break;

                case "mp4":
                    break;

                default:
            }

        },

        getEmbedType: function (embedCode) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// What type of code is this, iframe?  mp4 url?
            /// </summary>
            /// <param name="embedCode" type="string" optional="false">Actual embed code to parse</param>
            /// <returns type="string">iframe/mp4 at this stage, more to come</returns>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var typeOfEmbed = null;

            if (embedCode != undefined) {
                var testCode = embedCode.toLowerCase();
                if (_.contains(testCode, "iframe")) typeOfEmbed = "iframe";
                if (typeOfEmbed == undefined && _.contains(testCode, "mp4")) typeOfEmbed = "mp4";
            }

            return typeOfEmbed;

        },

        enableListToBeSortable: function (contentItem, callBack) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initialize a list to be sortable by dragging/dropping, downside is, if other than list items are dragged
            /// the entire list is dragged.  Also need to be aware of the length of the list and if it can scroll
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem of the list</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">contentItem of the list</param>
            /// <param name="callBack" type="function" optional="true">Function to execute when an item is dropped</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined) return;


            // Make sure the visual has been loaded
            contentItem.dataBind("_visualState", function (state) {

                if (state != "loading") {
                    // Get the element/container for the list
                    var element = contentItem._view._container[0];

                    // Set the list and items as sortable along with draggable for touch
                    $("ul", element).sortable({
                        update: function (e, f) {

                            // Call the users function after an item is dropped
                            if (callBack != undefined)
                                callBack($(f.item).data().__entity);

                        }
                    }).draggable();

                }
            });

        },

        toggleListToBeSortable: function (contentItem, activeCssClass, buttonName, callBack) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Initialize a list to be sortable by dragging/dropping, downside is, if other than list items are dragged
            /// the entire list is dragged.  Also need to be aware of the length of the list and if it can scroll
            /// </summary>
            /// <param name="contentItem" type="object" optional="false">contentItem of the list</param>
            /// </signature>
            /// <signature>
            /// <param name="contentItem" type="object" optional="false">contentItem of the list</param>
            /// <param name="callBack" type="function" optional="true">Function to execute when an item is dropped</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (contentItem == undefined) return;


            // Make sure the visual has been loaded
            contentItem.dataBind("_visualState", function (state) {

                if (state != "loading") {
                    // Get the element/container for the list
                    var element = $("ul", contentItem._view._container[0]);

                    // Are we already sortable?
                    var sortable = element.sortable("instance");
                    var draggable = element.draggable("instance");

                    // Set the list and items as sortable along with draggable for touch
                    if (sortable == undefined) {
                        element.sortable({
                            update: function (e, f) {

                                // Call the users function after an item is dropped
                                if (callBack != undefined)
                                    callBack($(f.item).data().__entity);

                            }
                        });

                        contentItem.sortEnabled = true;

                    } else {
                        if (!!element.sortable("option", "disabled")) {
                            contentItem.sortEnabled = true;
                            element.sortable("enable");
                        } else {
                            contentItem.sortEnabled = false;
                            element.sortable("disable");
                        }
                    }

                    if (activeCssClass != undefined) {
                        if (!!contentItem.sortEnabled) {
                            $("li", element).addClass(activeCssClass);
                        } else {
                            $("li", element).removeClass(activeCssClass);
                        }
                    };

                    setTimeout(function () {
                        if (buttonName != undefined) {
                            var button = contentItem.screen.findContentItem(buttonName);
                            if (!!contentItem.sortEnabled) {
                                lsWire.addButtonClass(button, activeCssClass);

                            } else {
                                lsWire.removeButtonClass(button, activeCssClass);
                            };

                        };
                    }, 0);
                }
            });

        },

        toggleSearchInput: function (queryName, maxWidth) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Toggle the search input to be shown or hidden
            /// </summary>
            /// <param name="screenQuery" type="object" optional="false">The screen query object we will be searching thru</param>
            /// </signature>
            /// <signature>
            /// <param name="screenQuery" type="object" optional="false">The screen query object we will be searching thru</param>
            /// <param name="maxWidth" type="string" optional="true">CSS setting for the maximum width of the input element
            /// ... defaults to be the width of the list items.  Format: "300px" </param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            if (queryName == undefined) return;

            // Make sure we have a query object
            var screenQuery = lsWire.getActiveScreen()[queryName];

            if (screenQuery != undefined && typeof (screenQuery) == "object" && screenQuery["enableSearch"] != undefined) {

                // Get the search control for this screen
                var searchControl = $(".msls-control-search", ".ui-page-active");

                if (searchControl != undefined) {
                    // If a width was passed, use it, else the list item width
                    maxWidth = maxWidth != undefined
						? maxWidth
						: $(".msls-listview", '.ui-page-active').find("li.ui-first-child").outerWidth();

                    // Set the max width of the input element
                    if (searchControl.css("max-width") != maxWidth)
                        searchControl.css("max-width", maxWidth);

                    // Now toggle the input to be hidden/visible
                    if (screenQuery.enableSearch) {
                        searchControl.find('input').blur();
                        $(".ui-page-active").focus();
                    }

                    screenQuery.enableSearch = !screenQuery.enableSearch;
                }
            }
        },

        renderFileSelectorInCustomControl: function (element, contentItem, acceptableTypes, callBack) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <signature>
            /// <summary>
            /// Renders a file input in a custom control, for adding files to a table/upload
            /// </summary>
            /// <param name="element" type="HTMLElement" optional="false">Element of the custom control</param>
            /// <param name="contentItem" type="object" optional="false">ContentItem of the custom control</param>
            /// </signature>
            /// <signature>
            /// <param name="element" type="HTMLElement" optional="false">Element of the custom control</param>
            /// <param name="contentItem" type="object" optional="false">ContentItem of the custom control</param>
            /// <param name="acceptableTypes" type="string" optional="true">List of file types allowed for selection</param>
            /// </signature>
            /// <signature>
            /// <param name="element" type="HTMLElement" optional="false">Element of the custom control</param>
            /// <param name="contentItem" type="object" optional="false">ContentItem of the custom control</param>
            /// <param name="acceptableTypes" type="string" optional="true">List of file types allowed for selection</param>
            /// <param name="callBack" type="function" optional="true">Function to execute after file is selected, passing the file object</param>
            /// </signature>
            // *****************************************************************************************************
            // *****************************************************************************************************

            // Create our input for file selection and append it to our container
            var fileInput = $('<input name="file" accept="' + acceptableTypes + '" type="file" style="margin-bottom: 10px;" />');
            $(element).append(fileInput);

            // Add an onchange handler for file selection
            fileInput.bind('change', function onInputChange(event) {

                var files = event.target.files;
                if (files.length == 1) {

                    // We have a file selected, so create our reader
                    var reader = new FileReader();

                    // Add a handler for when the data has been loaded successfully
                    reader.onload = function (e) {

                        // Get the raw data that was loaded
                        var splitData;
                        var loadedData = e.target.result;

                        // If its empty, set our contentItem value to null also
                        if (lsWire.isEmpty(loadedData)) {
                            contentItem.value = null;
                        } else {

                            // We have data, so lets split it into data type and data
                            splitData = loadedData.split(',');
                            if (splitData.length > 1) {

                                // If we in fact have data, add it to the contentItem
                                contentItem.value = loadedData.split(',')[splitData.length - 1];
                            }
                        }

                        // Call the users passed method if there is one, with the files object we worked on
                        if (callBack != undefined) {
                            callBack(files[0]);
                        }

                    };

                    // Now that all has been setup for reading, go and attempt to read the file
                    reader.readAsDataURL(files[0]);

                } else {

                    // We did not work on any file, so just call the users method, no parameters
                    callBack();
                }


            });
        },

        renderAsMenuTile: function (element, contentItem) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <summary>
            /// Render a standard Tile as a Menu Tile
            /// </summary>
            /// <param name="element">Element</param>
            /// <param name="contentItem">ContentItem</param>
            // *****************************************************************************************************
            // *****************************************************************************************************

            contentItem.dataBind("data.Size", function (size) {
                var td = contentItem.data;
                var isVisible = (td.Permission_Id == undefined
                    || lsWire.userHasPermission(td.Permission_Id)
                    || lsWire.userHasPermission("SecurityAdministration"));

                contentItem.isVisible = isVisible;

                var li = $(element).closest("li");
                var width = size == 2 ? "290px" : "140px";

                li.css({
                    "max-width": width,
                    "min-width": width,
                    "background": td.BackgroundColor,
                    "color": td.TextColor
                });

                var img = $(element).closest("li").find(".msls-ctl-image");

                if (td.Image == undefined) {
                    img.css("display", "none");
                } else {
                    img.css({
                        "margin-left": td.Size == 2 ? "100px" : "30px",
                        "margin-top": "20px"

                    });
                }

            });
        },

        addMenuTile: function (screen, querySource, menuId) {

            if (myapp.showAddEditTile != undefined && myapp.Tile != undefined && screen != undefined && querySource != undefined && menuId != undefined) {

                // Create the new tile, show the edit screen
                myapp.showAddEditTile(null, {
                    beforeShown: function (editScreen) {
                        var newTile = new myapp.Tile();
                        newTile.MenuId = menuId;
                        editScreen.Tile = newTile;
                    },
                    afterClosed: function (editScreen, commitAction) {
                        if (commitAction == "commit") {
                            querySource.refresh();
                            lsWire.tileAdded = true;
                        }
                    }
                });
            }

        },

        executeMenuTileTap: function (querySource, editTile, options) {

            // *****************************************************************************************************
            // *****************************************************************************************************
            /// <summary>
            /// Wrapper to help execute tile menu functions after clicking
            /// </summary>
            /// <param name="selectedTile">Tile that was clicked</param>
            /// <param name="options">[{Id: "xyz", Permission: "permission", Fn: function() {stuff}}]</param>
            // *****************************************************************************************************
            // *****************************************************************************************************

            var selectedTile = querySource.selectedItem;

            if (editTile == undefined || !editTile) {

                var option = _.find(options, function (e) { return e.Id == selectedTile.TileId; });

                if (option != undefined && option.Tap != undefined) {
                    if (option.Permission != undefined && lsWire.userHasPermission(option.Permission)) {
                        option.Tap();
                    } else {
                        option.Tap();
                    };
                }
            } else {
                // If edit flag is set, show the edit screen
                if (myapp.showAddEditTile != undefined && myapp.Tile != undefined) {
                    myapp.showAddEditTile(selectedTile, {
                        afterClosed: function (editScreeen, commitAction) {
                            if (commitAction == "commit") {
                                //querySource.refresh();
                            }
                        }
                    });
                }
            }

        }



        // #endregion

    };

})();

// ============================================================
// ============================================================
// ============================================================
// ============================================================
// Supporting Libraries
// We are doing to make things one stop
// ============================================================
// ============================================================
// ============================================================
// ============================================================

// ============================================================
// ResizeEnd.js
(function ($, window, document) {
    var ResizeEnd, defaults, plugin;
    plugin = 'resizeEnd';
    defaults = {
        delay: 250
    };
    ResizeEnd = function (element, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        callback = callback || null;
        this.element = element;
        this.settings = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = plugin;
        this._timeout = false;
        this._callback = callback;
        return this.init();
    };
    ResizeEnd.prototype = {
        init: function () {
            var $el, _this;
            _this = this;
            $el = $(this.element);
            return $el.on('resize', function () {
                return _this.initResize();
            });
        },
        getUTCDate: function (d) {
            var curdate;
            d = d || new Date();
            curdate = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
            return curdate;
        },
        initResize: function () {
            var _this;
            _this = this;
            _this.controlTime = _this.getUTCDate();
            if (_this._timeout === false) {
                _this._timeout = true;
                return setTimeout(function () {
                    return _this.runCallback(_this);
                }, _this.settings.delay);
            }
        },
        runCallback: function (_this) {
            var nowTime;
            nowTime = _this.getUTCDate();
            if (nowTime - _this.controlTime < _this.settings.delay) {
                return setTimeout(function () {
                    return _this.runCallback(_this);
                }, _this.settings.delay);
            } else {
                _this._timeout = false;
                return _this._callback();
            }
        }
    };
    return $.fn[plugin] = function (options, callback) {
        return this.each(function () {
            if (!$.data(this, 'plugin_' + plugin)) {
                return $.data(this, 'plugin_' + plugin, new ResizeEnd(this, options, callback));
            }
        });
    };
})(jQuery, window, document);


// ============================================================
// Signals.js
/*jslint onevar:true, undef:true, newcap:true, regexp:true, bitwise:true, maxerr:50, indent:4, white:false, nomen:false, plusplus:false */
/*global define:false, require:false, exports:false, module:false, signals:false */

/** @license
 * JS Signals <http://millermedeiros.github.com/js-signals/>
 * Released under the MIT license
 * Author: Miller Medeiros
 * Version: 1.0.0 - Build: 268 (2012/11/29 05:48 PM)
 */

(function (global) {

    // SignalBinding -------------------------------------------------
    //================================================================

    /**
     * Object that represents a binding between a Signal and a listener function.
     * <br />- <strong>This is an internal constructor and shouldn't be called by regular users.</strong>
     * <br />- inspired by Joa Ebert AS3 SignalBinding and Robert Penner's Slot classes.
     * @author Miller Medeiros
     * @constructor
     * @internal
     * @name SignalBinding
     * @param {Signal} signal Reference to Signal object that listener is currently bound to.
     * @param {Function} listener Handler function bound to the signal.
     * @param {boolean} isOnce If binding should be executed just once.
     * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
     * @param {Number} [priority] The priority level of the event listener. (default = 0).
     */
    function SignalBinding(signal, listener, isOnce, listenerContext, priority) {

        /**
         * Handler function bound to the signal.
         * @type Function
         * @private
         */
        this._listener = listener;

        /**
         * If binding should be executed just once.
         * @type boolean
         * @private
         */
        this._isOnce = isOnce;

        /**
         * Context on which listener will be executed (object that should represent the `this` variable inside listener function).
         * @memberOf SignalBinding.prototype
         * @name context
         * @type Object|undefined|null
         */
        this.context = listenerContext;

        /**
         * Reference to Signal object that listener is currently bound to.
         * @type Signal
         * @private
         */
        this._signal = signal;

        /**
         * Listener priority
         * @type Number
         * @private
         */
        this._priority = priority || 0;
    }

    SignalBinding.prototype = {

        /**
         * If binding is active and should be executed.
         * @type boolean
         */
        active: true,

        /**
         * Default parameters passed to listener during `Signal.dispatch` and `SignalBinding.execute`. (curried parameters)
         * @type Array|null
         */
        params: null,

        /**
         * Call listener passing arbitrary parameters.
         * <p>If binding was added using `Signal.addOnce()` it will be automatically removed from signal dispatch queue, this method is used internally for the signal dispatch.</p>
         * @param {Array} [paramsArr] Array of parameters that should be passed to the listener
         * @return {*} Value returned by the listener.
         */
        execute: function (paramsArr) {
            var handlerReturn, params;
            if (this.active && !!this._listener) {
                params = this.params ? this.params.concat(paramsArr) : paramsArr;
                handlerReturn = this._listener.apply(this.context, params);
                if (this._isOnce) {
                    this.detach();
                }
            }
            return handlerReturn;
        },

        /**
         * Detach binding from signal.
         * - alias to: mySignal.remove(myBinding.getListener());
         * @return {Function|null} Handler function bound to the signal or `null` if binding was previously detached.
         */
        detach: function () {
            return this.isBound() ? this._signal.remove(this._listener, this.context) : null;
        },

        /**
         * @return {Boolean} `true` if binding is still bound to the signal and have a listener.
         */
        isBound: function () {
            return (!!this._signal && !!this._listener);
        },

        /**
         * @return {boolean} If SignalBinding will only be executed once.
         */
        isOnce: function () {
            return this._isOnce;
        },

        /**
         * @return {Function} Handler function bound to the signal.
         */
        getListener: function () {
            return this._listener;
        },

        /**
         * @return {Signal} Signal that listener is currently bound to.
         */
        getSignal: function () {
            return this._signal;
        },

        /**
         * Delete instance properties
         * @private
         */
        _destroy: function () {
            delete this._signal;
            delete this._listener;
            delete this.context;
        },

        /**
         * @return {string} String representation of the object.
         */
        toString: function () {
            return '[SignalBinding isOnce:' + this._isOnce + ', isBound:' + this.isBound() + ', active:' + this.active + ']';
        }

    };


    /*global SignalBinding:false*/

    // Signal --------------------------------------------------------
    //================================================================

    function validateListener(listener, fnName) {
        if (typeof listener !== 'function') {
            throw new Error('listener is a required param of {fn}() and should be a Function.'.replace('{fn}', fnName));
        }
    }

    /**
     * Custom event broadcaster
     * <br />- inspired by Robert Penner's AS3 Signals.
     * @name Signal
     * @author Miller Medeiros
     * @constructor
     */
    function Signal() {
        /**
         * @type Array.<SignalBinding>
         * @private
         */
        this._bindings = [];
        this._prevParams = null;

        // enforce dispatch to aways work on same context (#47)
        var self = this;
        this.dispatch = function () {
            Signal.prototype.dispatch.apply(self, arguments);
        };
    }

    Signal.prototype = {

        /**
         * Signals Version Number
         * @type String
         * @const
         */
        VERSION: '1.0.0',

        /**
         * If Signal should keep record of previously dispatched parameters and
         * automatically execute listener during `add()`/`addOnce()` if Signal was
         * already dispatched before.
         * @type boolean
         */
        memorize: false,

        /**
         * @type boolean
         * @private
         */
        _shouldPropagate: true,

        /**
         * If Signal is active and should broadcast events.
         * <p><strong>IMPORTANT:</strong> Setting this property during a dispatch will only affect the next dispatch, if you want to stop the propagation of a signal use `halt()` instead.</p>
         * @type boolean
         */
        active: true,

        /**
         * @param {Function} listener
         * @param {boolean} isOnce
         * @param {Object} [listenerContext]
         * @param {Number} [priority]
         * @return {SignalBinding}
         * @private
         */
        _registerListener: function (listener, isOnce, listenerContext, priority) {

            var prevIndex = this._indexOfListener(listener, listenerContext),
                binding;

            if (prevIndex !== -1) {
                binding = this._bindings[prevIndex];
                if (binding.isOnce() !== isOnce) {
                    throw new Error('You cannot add' + (isOnce ? '' : 'Once') + '() then add' + (!isOnce ? '' : 'Once') + '() the same listener without removing the relationship first.');
                }
            } else {
                binding = new SignalBinding(this, listener, isOnce, listenerContext, priority);
                this._addBinding(binding);
            }

            if (this.memorize && this._prevParams) {
                binding.execute(this._prevParams);
            }

            return binding;
        },

        /**
         * @param {SignalBinding} binding
         * @private
         */
        _addBinding: function (binding) {
            //simplified insertion sort
            var n = this._bindings.length;
            do { --n; } while (this._bindings[n] && binding._priority <= this._bindings[n]._priority);
            this._bindings.splice(n + 1, 0, binding);
        },

        /**
         * @param {Function} listener
         * @return {number}
         * @private
         */
        _indexOfListener: function (listener, context) {
            var n = this._bindings.length,
                cur;
            while (n--) {
                cur = this._bindings[n];
                if (cur._listener === listener && cur.context === context) {
                    return n;
                }
            }
            return -1;
        },

        /**
         * Check if listener was attached to Signal.
         * @param {Function} listener
         * @param {Object} [context]
         * @return {boolean} if Signal has the specified listener.
         */
        has: function (listener, context) {
            return this._indexOfListener(listener, context) !== -1;
        },

        /**
         * Add a listener to the signal.
         * @param {Function} listener Signal handler function.
         * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
         * @param {Number} [priority] The priority level of the event listener. Listeners with higher priority will be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added. (default = 0)
         * @return {SignalBinding} An Object representing the binding between the Signal and listener.
         */
        add: function (listener, listenerContext, priority) {
            validateListener(listener, 'add');
            return this._registerListener(listener, false, listenerContext, priority);
        },

        /**
         * Add listener to the signal that should be removed after first execution (will be executed only once).
         * @param {Function} listener Signal handler function.
         * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
         * @param {Number} [priority] The priority level of the event listener. Listeners with higher priority will be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added. (default = 0)
         * @return {SignalBinding} An Object representing the binding between the Signal and listener.
         */
        addOnce: function (listener, listenerContext, priority) {
            validateListener(listener, 'addOnce');
            return this._registerListener(listener, true, listenerContext, priority);
        },

        /**
         * Remove a single listener from the dispatch queue.
         * @param {Function} listener Handler function that should be removed.
         * @param {Object} [context] Execution context (since you can add the same handler multiple times if executing in a different context).
         * @return {Function} Listener handler function.
         */
        remove: function (listener, context) {
            validateListener(listener, 'remove');

            var i = this._indexOfListener(listener, context);
            if (i !== -1) {
                this._bindings[i]._destroy(); //no reason to a SignalBinding exist if it isn't attached to a signal
                this._bindings.splice(i, 1);
            }
            return listener;
        },

        /**
         * Remove all listeners from the Signal.
         */
        removeAll: function () {
            var n = this._bindings.length;
            while (n--) {
                this._bindings[n]._destroy();
            }
            this._bindings.length = 0;
        },

        /**
         * @return {number} Number of listeners attached to the Signal.
         */
        getNumListeners: function () {
            return this._bindings.length;
        },

        /**
         * Stop propagation of the event, blocking the dispatch to next listeners on the queue.
         * <p><strong>IMPORTANT:</strong> should be called only during signal dispatch, calling it before/after dispatch won't affect signal broadcast.</p>
         * @see Signal.prototype.disable
         */
        halt: function () {
            this._shouldPropagate = false;
        },

        /**
         * Dispatch/Broadcast Signal to all listeners added to the queue.
         * @param {...*} [params] Parameters that should be passed to each handler.
         */
        dispatch: function (params) {
            if (!this.active) {
                return;
            }

            var paramsArr = Array.prototype.slice.call(arguments),
                n = this._bindings.length,
                bindings;

            if (this.memorize) {
                this._prevParams = paramsArr;
            }

            if (!n) {
                //should come after memorize
                return;
            }

            bindings = this._bindings.slice(); //clone array in case add/remove items during dispatch
            this._shouldPropagate = true; //in case `halt` was called before dispatch or during the previous dispatch.

            //execute all callbacks until end of the list or until a callback returns `false` or stops propagation
            //reverse loop since listeners with higher priority will be added at the end of the list
            do { n--; } while (bindings[n] && this._shouldPropagate && bindings[n].execute(paramsArr) !== false);
        },

        /**
         * Forget memorized arguments.
         * @see Signal.memorize
         */
        forget: function () {
            this._prevParams = null;
        },

        /**
         * Remove all bindings from signal and destroy any reference to external objects (destroy Signal object).
         * <p><strong>IMPORTANT:</strong> calling any method on the signal instance after calling dispose will throw errors.</p>
         */
        dispose: function () {
            this.removeAll();
            delete this._bindings;
            delete this._prevParams;
        },

        /**
         * @return {string} String representation of the object.
         */
        toString: function () {
            return '[Signal active:' + this.active + ' numListeners:' + this.getNumListeners() + ']';
        }

    };


    // Namespace -----------------------------------------------------
    //================================================================

    /**
     * Signals namespace
     * @namespace
     * @name signals
     */
    var signals = Signal;

    /**
     * Custom event broadcaster
     * @see Signal
     */
    // alias for backwards compatibility (see #gh-44)
    signals.Signal = Signal;



    //exports to multiple environments
    if (typeof define === 'function' && define.amd) { //AMD
        define(function () { return signals; });
    } else if (typeof module !== 'undefined' && module.exports) { //node
        module.exports = signals;
    } else { //browser
        //use string because of Google closure compiler ADVANCED_MODE
        /*jslint sub:true */
        global['signals'] = signals;
    }

}(this));

// ==================================
// lodash.js
/**
 * @license
 * Lo-Dash 3.0.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern -o ./lodash.js`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.7.0 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
; (function () {

    /** Used as a safe reference for `undefined` in pre ES5 environments. */
    var undefined;

    /** Used as the semantic version number. */
    var VERSION = '3.0.0';

    /** Used to compose bitmasks for wrapper metadata. */
    var BIND_FLAG = 1,
        BIND_KEY_FLAG = 2,
        CURRY_BOUND_FLAG = 4,
        CURRY_FLAG = 8,
        CURRY_RIGHT_FLAG = 16,
        PARTIAL_FLAG = 32,
        PARTIAL_RIGHT_FLAG = 64,
        REARG_FLAG = 128,
        ARY_FLAG = 256;

    /** Used as default options for `_.trunc`. */
    var DEFAULT_TRUNC_LENGTH = 30,
        DEFAULT_TRUNC_OMISSION = '...';

    /** Used to detect when a function becomes hot. */
    var HOT_COUNT = 150,
        HOT_SPAN = 16;

    /** Used to indicate the type of lazy iteratees. */
    var LAZY_FILTER_FLAG = 0,
        LAZY_MAP_FLAG = 1,
        LAZY_WHILE_FLAG = 2;

    /** Used as the `TypeError` message for "Functions" methods. */
    var FUNC_ERROR_TEXT = 'Expected a function';

    /** Used as the internal argument placeholder. */
    var PLACEHOLDER = '__lodash_placeholder__';

    /** `Object#toString` result references. */
    var argsTag = '[object Arguments]',
        arrayTag = '[object Array]',
        boolTag = '[object Boolean]',
        dateTag = '[object Date]',
        errorTag = '[object Error]',
        funcTag = '[object Function]',
        mapTag = '[object Map]',
        numberTag = '[object Number]',
        objectTag = '[object Object]',
        regexpTag = '[object RegExp]',
        setTag = '[object Set]',
        stringTag = '[object String]',
        weakMapTag = '[object WeakMap]';

    var arrayBufferTag = '[object ArrayBuffer]',
        float32Tag = '[object Float32Array]',
        float64Tag = '[object Float64Array]',
        int8Tag = '[object Int8Array]',
        int16Tag = '[object Int16Array]',
        int32Tag = '[object Int32Array]',
        uint8Tag = '[object Uint8Array]',
        uint8ClampedTag = '[object Uint8ClampedArray]',
        uint16Tag = '[object Uint16Array]',
        uint32Tag = '[object Uint32Array]';

    /** Used to match empty string literals in compiled template source. */
    var reEmptyStringLeading = /\b__p \+= '';/g,
        reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
        reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

    /** Used to match HTML entities and HTML characters. */
    var reEscapedHtml = /&(?:amp|lt|gt|quot|#39|#96);/g,
        reUnescapedHtml = /[&<>"'`]/g,
        reHasEscapedHtml = RegExp(reEscapedHtml.source),
        reHasUnescapedHtml = RegExp(reUnescapedHtml.source);

    /** Used to match template delimiters. */
    var reEscape = /<%-([\s\S]+?)%>/g,
        reEvaluate = /<%([\s\S]+?)%>/g,
        reInterpolate = /<%=([\s\S]+?)%>/g;

    /**
     * Used to match ES6 template delimiters.
     * See the [ES6 spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-template-literal-lexical-components)
     * for more details.
     */
    var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

    /** Used to match `RegExp` flags from their coerced string values. */
    var reFlags = /\w*$/;

    /** Used to detect named functions. */
    var reFuncName = /^\s*function[ \n\r\t]+\w/;

    /** Used to detect hexadecimal string values. */
    var reHexPrefix = /^0[xX]/;

    /** Used to detect host constructors (Safari > 5). */
    var reHostCtor = /^\[object .+?Constructor\]$/;

    /** Used to match latin-1 supplementary letters (excluding mathematical operators). */
    var reLatin1 = /[\xc0-\xd6\xd8-\xde\xdf-\xf6\xf8-\xff]/g;

    /** Used to ensure capturing order of template delimiters. */
    var reNoMatch = /($^)/;

    /**
     * Used to match `RegExp` special characters.
     * See this [article on `RegExp` characters](http://www.regular-expressions.info/characters.html#special)
     * for more details.
     */
    var reRegExpChars = /[.*+?^${}()|[\]\/\\]/g,
        reHasRegExpChars = RegExp(reRegExpChars.source);

    /** Used to detect functions containing a `this` reference. */
    var reThis = /\bthis\b/;

    /** Used to match unescaped characters in compiled string literals. */
    var reUnescapedString = /['\n\r\u2028\u2029\\]/g;

    /** Used to match words to create compound words. */
    var reWords = (function () {
        var upper = '[A-Z\\xc0-\\xd6\\xd8-\\xde]',
            lower = '[a-z\\xdf-\\xf6\\xf8-\\xff]+';

        return RegExp(upper + '{2,}(?=' + upper + lower + ')|' + upper + '?' + lower + '|' + upper + '+|[0-9]+', 'g');
    }());

    /** Used to detect and test for whitespace. */
    var whitespace = (
      // Basic whitespace characters.
      ' \t\x0b\f\xa0\ufeff' +

      // Line terminators.
      '\n\r\u2028\u2029' +

      // Unicode category "Zs" space separators.
      '\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000'
    );

    /** Used to assign default `context` object properties. */
    var contextProps = [
      'Array', 'ArrayBuffer', 'Date', 'Error', 'Float32Array', 'Float64Array',
      'Function', 'Int8Array', 'Int16Array', 'Int32Array', 'Math', 'Number',
      'Object', 'RegExp', 'Set', 'String', '_', 'clearTimeout', 'document',
      'isFinite', 'parseInt', 'setTimeout', 'TypeError', 'Uint8Array',
      'Uint8ClampedArray', 'Uint16Array', 'Uint32Array', 'WeakMap',
      'window', 'WinRTError'
    ];

    /** Used to make template sourceURLs easier to identify. */
    var templateCounter = -1;

    /** Used to identify `toStringTag` values of typed arrays. */
    var typedArrayTags = {};
    typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
    typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
    typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
    typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
    typedArrayTags[uint32Tag] = true;
    typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
    typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
    typedArrayTags[dateTag] = typedArrayTags[errorTag] =
    typedArrayTags[funcTag] = typedArrayTags[mapTag] =
    typedArrayTags[numberTag] = typedArrayTags[objectTag] =
    typedArrayTags[regexpTag] = typedArrayTags[setTag] =
    typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;

    /** Used to identify `toStringTag` values supported by `_.clone`. */
    var cloneableTags = {};
    cloneableTags[argsTag] = cloneableTags[arrayTag] =
    cloneableTags[arrayBufferTag] = cloneableTags[boolTag] =
    cloneableTags[dateTag] = cloneableTags[float32Tag] =
    cloneableTags[float64Tag] = cloneableTags[int8Tag] =
    cloneableTags[int16Tag] = cloneableTags[int32Tag] =
    cloneableTags[numberTag] = cloneableTags[objectTag] =
    cloneableTags[regexpTag] = cloneableTags[stringTag] =
    cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
    cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
    cloneableTags[errorTag] = cloneableTags[funcTag] =
    cloneableTags[mapTag] = cloneableTags[setTag] =
    cloneableTags[weakMapTag] = false;

    /** Used as an internal `_.debounce` options object by `_.throttle`. */
    var debounceOptions = {
        'leading': false,
        'maxWait': 0,
        'trailing': false
    };

    /** Used to map latin-1 supplementary letters to basic latin letters. */
    var deburredLetters = {
        '\xc0': 'A', '\xc1': 'A', '\xc2': 'A', '\xc3': 'A', '\xc4': 'A', '\xc5': 'A',
        '\xe0': 'a', '\xe1': 'a', '\xe2': 'a', '\xe3': 'a', '\xe4': 'a', '\xe5': 'a',
        '\xc7': 'C', '\xe7': 'c',
        '\xd0': 'D', '\xf0': 'd',
        '\xc8': 'E', '\xc9': 'E', '\xca': 'E', '\xcb': 'E',
        '\xe8': 'e', '\xe9': 'e', '\xea': 'e', '\xeb': 'e',
        '\xcC': 'I', '\xcd': 'I', '\xce': 'I', '\xcf': 'I',
        '\xeC': 'i', '\xed': 'i', '\xee': 'i', '\xef': 'i',
        '\xd1': 'N', '\xf1': 'n',
        '\xd2': 'O', '\xd3': 'O', '\xd4': 'O', '\xd5': 'O', '\xd6': 'O', '\xd8': 'O',
        '\xf2': 'o', '\xf3': 'o', '\xf4': 'o', '\xf5': 'o', '\xf6': 'o', '\xf8': 'o',
        '\xd9': 'U', '\xda': 'U', '\xdb': 'U', '\xdc': 'U',
        '\xf9': 'u', '\xfa': 'u', '\xfb': 'u', '\xfc': 'u',
        '\xdd': 'Y', '\xfd': 'y', '\xff': 'y',
        '\xc6': 'Ae', '\xe6': 'ae',
        '\xde': 'Th', '\xfe': 'th',
        '\xdf': 'ss'
    };

    /** Used to map characters to HTML entities. */
    var htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#96;'
    };

    /** Used to map HTML entities to characters. */
    var htmlUnescapes = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&#96;': '`'
    };

    /** Used to determine if values are of the language type `Object`. */
    var objectTypes = {
        'function': true,
        'object': true
    };

    /** Used to escape characters for inclusion in compiled string literals. */
    var stringEscapes = {
        '\\': '\\',
        "'": "'",
        '\n': 'n',
        '\r': 'r',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
    };

    /**
     * Used as a reference to the global object.
     *
     * The `this` value is used if it is the global object to avoid Greasemonkey's
     * restricted `window` object, otherwise the `window` object is used.
     */
    var root = (objectTypes[typeof window] && window !== (this && this.window)) ? window : this;

    /** Detect free variable `exports`. */
    var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

    /** Detect free variable `module`. */
    var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

    /** Detect free variable `global` from Node.js or Browserified code and use it as `root`. */
    var freeGlobal = freeExports && freeModule && typeof global == 'object' && global;
    if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal)) {
        root = freeGlobal;
    }

    /** Detect the popular CommonJS extension `module.exports`. */
    var moduleExports = freeModule && freeModule.exports === freeExports && freeExports;

    /*--------------------------------------------------------------------------*/

    /**
     * The base implementation of `compareAscending` which compares values and
     * sorts them in ascending order without guaranteeing a stable sort.
     *
     * @private
     * @param {*} value The value to compare to `other`.
     * @param {*} other The value to compare to `value`.
     * @returns {number} Returns the sort order indicator for `value`.
     */
    function baseCompareAscending(value, other) {
        if (value !== other) {
            var valIsReflexive = value === value,
                othIsReflexive = other === other;

            if (value > other || !valIsReflexive || (typeof value == 'undefined' && othIsReflexive)) {
                return 1;
            }
            if (value < other || !othIsReflexive || (typeof other == 'undefined' && valIsReflexive)) {
                return -1;
            }
        }
        return 0;
    }

    /**
     * The base implementation of `_.indexOf` without support for binary searches.
     *
     * @private
     * @param {Array} array The array to search.
     * @param {*} value The value to search for.
     * @param {number} [fromIndex=0] The index to search from.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */
    function baseIndexOf(array, value, fromIndex) {
        if (value !== value) {
            return indexOfNaN(array, fromIndex);
        }
        var index = (fromIndex || 0) - 1,
            length = array.length;

        while (++index < length) {
            if (array[index] === value) {
                return index;
            }
        }
        return -1;
    }

    /**
     * The base implementation of `_.sortBy` and `_.sortByAll` which uses `comparer`
     * to define the sort order of `array` and replaces criteria objects with their
     * corresponding values.
     *
     * @private
     * @param {Array} array The array to sort.
     * @param {Function} comparer The function to define sort order.
     * @returns {Array} Returns `array`.
     */
    function baseSortBy(array, comparer) {
        var length = array.length;

        array.sort(comparer);
        while (length--) {
            array[length] = array[length].value;
        }
        return array;
    }

    /**
     * Converts `value` to a string if it is not one. An empty string is returned
     * for `null` or `undefined` values.
     *
     * @private
     * @param {*} value The value to process.
     * @returns {string} Returns the string.
     */
    function baseToString(value) {
        if (typeof value == 'string') {
            return value;
        }
        return value == null ? '' : (value + '');
    }

    /**
     * Used by `_.max` and `_.min` as the default callback for string values.
     *
     * @private
     * @param {string} string The string to inspect.
     * @returns {number} Returns the code unit of the first character of the string.
     */
    function charAtCallback(string) {
        return string.charCodeAt(0);
    }

    /**
     * Used by `_.trim` and `_.trimLeft` to get the index of the first character
     * of `string` that is not found in `chars`.
     *
     * @private
     * @param {string} string The string to inspect.
     * @param {string} chars The characters to find.
     * @returns {number} Returns the index of the first character not found in `chars`.
     */
    function charsLeftIndex(string, chars) {
        var index = -1,
            length = string.length;

        while (++index < length && chars.indexOf(string.charAt(index)) > -1) { }
        return index;
    }

    /**
     * Used by `_.trim` and `_.trimRight` to get the index of the last character
     * of `string` that is not found in `chars`.
     *
     * @private
     * @param {string} string The string to inspect.
     * @param {string} chars The characters to find.
     * @returns {number} Returns the index of the last character not found in `chars`.
     */
    function charsRightIndex(string, chars) {
        var index = string.length;

        while (index-- && chars.indexOf(string.charAt(index)) > -1) { }
        return index;
    }

    /**
     * Used by `_.sortBy` to compare transformed elements of a collection and stable
     * sort them in ascending order.
     *
     * @private
     * @param {Object} object The object to compare to `other`.
     * @param {Object} other The object to compare to `object`.
     * @returns {number} Returns the sort order indicator for `object`.
     */
    function compareAscending(object, other) {
        return baseCompareAscending(object.criteria, other.criteria) || (object.index - other.index);
    }

    /**
     * Used by `_.sortByAll` to compare multiple properties of each element
     * in a collection and stable sort them in ascending order.
     *
     * @private
     * @param {Object} object The object to compare to `other`.
     * @param {Object} other The object to compare to `object`.
     * @returns {number} Returns the sort order indicator for `object`.
     */
    function compareMultipleAscending(object, other) {
        var index = -1,
            objCriteria = object.criteria,
            othCriteria = other.criteria,
            length = objCriteria.length;

        while (++index < length) {
            var result = baseCompareAscending(objCriteria[index], othCriteria[index]);
            if (result) {
                return result;
            }
        }
        // Fixes an `Array#sort` bug in the JS engine embedded in Adobe applications
        // that causes it, under certain circumstances, to provide the same value
        // for `object` and `other`. See https://github.com/jashkenas/underscore/pull/1247.
        //
        // This also ensures a stable sort in V8 and other engines.
        // See https://code.google.com/p/v8/issues/detail?id=90.
        return object.index - other.index;
    }

    /**
     * Used by `_.deburr` to convert latin-1 supplementary letters to basic latin letters.
     *
     * @private
     * @param {string} letter The matched letter to deburr.
     * @returns {string} Returns the deburred letter.
     */
    function deburrLetter(letter) {
        return deburredLetters[letter];
    }

    /**
     * Used by `_.escape` to convert characters to HTML entities.
     *
     * @private
     * @param {string} chr The matched character to escape.
     * @returns {string} Returns the escaped character.
     */
    function escapeHtmlChar(chr) {
        return htmlEscapes[chr];
    }

    /**
     * Used by `_.template` to escape characters for inclusion in compiled
     * string literals.
     *
     * @private
     * @param {string} chr The matched character to escape.
     * @returns {string} Returns the escaped character.
     */
    function escapeStringChar(chr) {
        return '\\' + stringEscapes[chr];
    }

    /**
     * Gets the index at which the first occurrence of `NaN` is found in `array`.
     * If `fromRight` is provided elements of `array` are iterated from right to left.
     *
     * @private
     * @param {Array} array The array to search.
     * @param {number} [fromIndex] The index to search from.
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {number} Returns the index of the matched `NaN`, else `-1`.
     */
    function indexOfNaN(array, fromIndex, fromRight) {
        var length = array.length,
            index = fromRight ? (fromIndex || length) : ((fromIndex || 0) - 1);

        while ((fromRight ? index-- : ++index < length)) {
            var other = array[index];
            if (other !== other) {
                return index;
            }
        }
        return -1;
    }

    /**
     * Checks if `value` is object-like.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     */
    function isObjectLike(value) {
        return (value && typeof value == 'object') || false;
    }

    /**
     * Used by `trimmedLeftIndex` and `trimmedRightIndex` to determine if a
     * character code is whitespace.
     *
     * @private
     * @param {number} charCode The character code to inspect.
     * @returns {boolean} Returns `true` if `charCode` is whitespace, else `false`.
     */
    function isSpace(charCode) {
        return ((charCode <= 160 && (charCode >= 9 && charCode <= 13) || charCode == 32 || charCode == 160) || charCode == 5760 || charCode == 6158 ||
          (charCode >= 8192 && (charCode <= 8202 || charCode == 8232 || charCode == 8233 || charCode == 8239 || charCode == 8287 || charCode == 12288 || charCode == 65279)));
    }

    /**
     * Replaces all `placeholder` elements in `array` with an internal placeholder
     * and returns an array of their indexes.
     *
     * @private
     * @param {Array} array The array to modify.
     * @param {*} placeholder The placeholder to replace.
     * @returns {Array} Returns the new array of placeholder indexes.
     */
    function replaceHolders(array, placeholder) {
        var index = -1,
            length = array.length,
            resIndex = -1,
            result = [];

        while (++index < length) {
            if (array[index] === placeholder) {
                array[index] = PLACEHOLDER;
                result[++resIndex] = index;
            }
        }
        return result;
    }

    /**
     * An implementation of `_.uniq` optimized for sorted arrays without support
     * for callback shorthands and `this` binding.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {Function} [iteratee] The function invoked per iteration.
     * @returns {Array} Returns the new duplicate-value-free array.
     */
    function sortedUniq(array, iteratee) {
        var seen,
            index = -1,
            length = array.length,
            resIndex = -1,
            result = [];

        while (++index < length) {
            var value = array[index],
                computed = iteratee ? iteratee(value, index, array) : value;

            if (!index || seen !== computed) {
                seen = computed;
                result[++resIndex] = value;
            }
        }
        return result;
    }

    /**
     * Used by `_.trim` and `_.trimLeft` to get the index of the first non-whitespace
     * character of `string`.
     *
     * @private
     * @param {string} string The string to inspect.
     * @returns {number} Returns the index of the first non-whitespace character.
     */
    function trimmedLeftIndex(string) {
        var index = -1,
            length = string.length;

        while (++index < length && isSpace(string.charCodeAt(index))) { }
        return index;
    }

    /**
     * Used by `_.trim` and `_.trimRight` to get the index of the last non-whitespace
     * character of `string`.
     *
     * @private
     * @param {string} string The string to inspect.
     * @returns {number} Returns the index of the last non-whitespace character.
     */
    function trimmedRightIndex(string) {
        var index = string.length;

        while (index-- && isSpace(string.charCodeAt(index))) { }
        return index;
    }

    /**
     * Used by `_.unescape` to convert HTML entities to characters.
     *
     * @private
     * @param {string} chr The matched character to unescape.
     * @returns {string} Returns the unescaped character.
     */
    function unescapeHtmlChar(chr) {
        return htmlUnescapes[chr];
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Create a new pristine `lodash` function using the given `context` object.
     *
     * @static
     * @memberOf _
     * @category Utility
     * @param {Object} [context=root] The context object.
     * @returns {Function} Returns a new `lodash` function.
     * @example
     *
     * _.mixin({ 'add': function(a, b) { return a + b; } });
     *
     * var lodash = _.runInContext();
     * lodash.mixin({ 'sub': function(a, b) { return a - b; } });
     *
     * _.isFunction(_.add);
     * // => true
     * _.isFunction(_.sub);
     * // => false
     *
     * lodash.isFunction(lodash.add);
     * // => false
     * lodash.isFunction(lodash.sub);
     * // => true
     *
     * // using `context` to mock `Date#getTime` use in `_.now`
     * var mock = _.runInContext({
     *   'Date': function() {
     *     return { 'getTime': getTimeMock };
     *   }
     * });
     *
     * // or creating a suped-up `defer` in Node.js
     * var defer = _.runInContext({ 'setTimeout': setImmediate }).defer;
     */
    function runInContext(context) {
        // Avoid issues with some ES3 environments that attempt to use values, named
        // after built-in constructors like `Object`, for the creation of literals.
        // ES5 clears this up by stating that literals must use built-in constructors.
        // See http://es5.github.io/#x11.1.5.
        context = context ? _.defaults(root.Object(), context, _.pick(root, contextProps)) : root;

        /** Native constructor references. */
        var Array = context.Array,
            Date = context.Date,
            Error = context.Error,
            Function = context.Function,
            Math = context.Math,
            Number = context.Number,
            Object = context.Object,
            RegExp = context.RegExp,
            String = context.String,
            TypeError = context.TypeError;

        /** Used for native method references. */
        var arrayProto = Array.prototype,
            objectProto = Object.prototype;

        /** Used to detect DOM support. */
        var document = (document = context.window) && document.document;

        /** Used to resolve the decompiled source of functions. */
        var fnToString = Function.prototype.toString;

        /** Used to the length of n-tuples for `_.unzip`. */
        var getLength = baseProperty('length');

        /** Used to check objects for own properties. */
        var hasOwnProperty = objectProto.hasOwnProperty;

        /** Used to generate unique IDs. */
        var idCounter = 0;

        /**
         * Used to resolve the `toStringTag` of values.
         * See the [ES6 spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.prototype.tostring)
         * for more details.
         */
        var objToString = objectProto.toString;

        /** Used to restore the original `_` reference in `_.noConflict`. */
        var oldDash = context._;

        /** Used to detect if a method is native. */
        var reNative = RegExp('^' +
          escapeRegExp(objToString)
          .replace(/toString|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
        );

        /** Native method references. */
        var ArrayBuffer = isNative(ArrayBuffer = context.ArrayBuffer) && ArrayBuffer,
            bufferSlice = isNative(bufferSlice = ArrayBuffer && new ArrayBuffer(0).slice) && bufferSlice,
            ceil = Math.ceil,
            clearTimeout = context.clearTimeout,
            floor = Math.floor,
            getPrototypeOf = isNative(getPrototypeOf = Object.getPrototypeOf) && getPrototypeOf,
            push = arrayProto.push,
            propertyIsEnumerable = objectProto.propertyIsEnumerable,
            Set = isNative(Set = context.Set) && Set,
            setTimeout = context.setTimeout,
            splice = arrayProto.splice,
            Uint8Array = isNative(Uint8Array = context.Uint8Array) && Uint8Array,
            unshift = arrayProto.unshift,
            WeakMap = isNative(WeakMap = context.WeakMap) && WeakMap;

        /** Used to clone array buffers. */
        var Float64Array = (function () {
            // Safari 5 errors when using an array buffer to initialize a typed array
            // where the array buffer's `byteLength` is not a multiple of the typed
            // array's `BYTES_PER_ELEMENT`.
            try {
                var func = isNative(func = context.Float64Array) && func,
                    result = new func(new ArrayBuffer(10), 0, 1) && func;
            } catch (e) { }
            return result;
        }());

        /* Native method references for those with the same name as other `lodash` methods. */
        var nativeIsArray = isNative(nativeIsArray = Array.isArray) && nativeIsArray,
            nativeCreate = isNative(nativeCreate = Object.create) && nativeCreate,
            nativeIsFinite = context.isFinite,
            nativeKeys = isNative(nativeKeys = Object.keys) && nativeKeys,
            nativeMax = Math.max,
            nativeMin = Math.min,
            nativeNow = isNative(nativeNow = Date.now) && nativeNow,
            nativeNumIsFinite = isNative(nativeNumIsFinite = Number.isFinite) && nativeNumIsFinite,
            nativeParseInt = context.parseInt,
            nativeRandom = Math.random;

        /** Used as references for `-Infinity` and `Infinity`. */
        var NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY,
            POSITIVE_INFINITY = Number.POSITIVE_INFINITY;

        /** Used as references for the maximum length and index of an array. */
        var MAX_ARRAY_LENGTH = Math.pow(2, 32) - 1,
            MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1,
            HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;

        /** Used as the size, in bytes, of each `Float64Array` element. */
        var FLOAT64_BYTES_PER_ELEMENT = Float64Array ? Float64Array.BYTES_PER_ELEMENT : 0;

        /**
         * Used as the maximum length of an array-like value.
         * See the [ES6 spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength)
         * for more details.
         */
        var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;

        /** Used to store function metadata. */
        var metaMap = WeakMap && new WeakMap;

        /*------------------------------------------------------------------------*/

        /**
         * Creates a `lodash` object which wraps `value` to enable intuitive chaining.
         * Methods that operate on and return arrays, collections, and functions can
         * be chained together. Methods that return a boolean or single value will
         * automatically end the chain returning the unwrapped value. Explicit chaining
         * may be enabled using `_.chain`. The execution of chained methods is lazy,
         * that is, execution is deferred until `_#value` is implicitly or explicitly
         * called.
         *
         * Lazy evaluation allows several methods to support shortcut fusion. Shortcut
         * fusion is an optimization that merges iteratees to avoid creating intermediate
         * arrays and reduce the number of iteratee executions.
         *
         * Chaining is supported in custom builds as long as the `_#value` method is
         * directly or indirectly included in the build.
         *
         * In addition to Lo-Dash methods, wrappers also have the following `Array` methods:
         * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`, `splice`,
         * and `unshift`
         *
         * The wrapper functions that support shortcut fusion are:
         * `drop`, `dropRight`, `dropRightWhile`, `dropWhile`, `filter`, `first`,
         * `initial`, `last`, `map`, `pluck`, `reject`, `rest`, `reverse`, `slice`,
         * `take`, `takeRight`, `takeRightWhile`, `takeWhile`, and `where`
         *
         * The chainable wrapper functions are:
         * `after`, `ary`, `assign`, `at`, `before`, `bind`, `bindAll`, `bindKey`,
         * `callback`, `chain`, `chunk`, `compact`, `concat`, `constant`, `countBy`,
         * `create`, `curry`, `debounce`, `defaults`, `defer`, `delay`, `difference`,
         * `drop`, `dropRight`, `dropRightWhile`, `dropWhile`, `filter`, `flatten`,
         * `flattenDeep`, `flow`, `flowRight`, `forEach`, `forEachRight`, `forIn`,
         * `forInRight`, `forOwn`, `forOwnRight`, `functions`, `groupBy`, `indexBy`,
         * `initial`, `intersection`, `invert`, `invoke`, `keys`, `keysIn`, `map`,
         * `mapValues`, `matches`, `memoize`, `merge`, `mixin`, `negate`, `noop`,
         * `omit`, `once`, `pairs`, `partial`, `partialRight`, `partition`, `pick`,
         * `pluck`, `property`, `propertyOf`, `pull`, `pullAt`, `push`, `range`,
         * `rearg`, `reject`, `remove`, `rest`, `reverse`, `shuffle`, `slice`, `sort`,
         * `sortBy`, `sortByAll`, `splice`, `take`, `takeRight`, `takeRightWhile`,
         * `takeWhile`, `tap`, `throttle`, `thru`, `times`, `toArray`, `toPlainObject`,
         * `transform`, `union`, `uniq`, `unshift`, `unzip`, `values`, `valuesIn`,
         * `where`, `without`, `wrap`, `xor`, `zip`, and `zipObject`
         *
         * The wrapper functions that are **not** chainable by default are:
         * `attempt`, `camelCase`, `capitalize`, `clone`, `cloneDeep`, `deburr`,
         * `endsWith`, `escape`, `escapeRegExp`, `every`, `find`, `findIndex`, `findKey`,
         * `findLast`, `findLastIndex`, `findLastKey`, `findWhere`, `first`, `has`,
         * `identity`, `includes`, `indexOf`, `isArguments`, `isArray`, `isBoolean`,
         * `isDate`, `isElement`, `isEmpty`, `isEqual`, `isError`, `isFinite`,
         * `isFunction`, `isMatch` , `isNative`, `isNaN`, `isNull`, `isNumber`,
         * `isObject`, `isPlainObject`, `isRegExp`, `isString`, `isUndefined`,
         * `isTypedArray`, `join`, `kebabCase`, `last`, `lastIndexOf`, `max`, `min`,
         * `noConflict`, `now`, `pad`, `padLeft`, `padRight`, `parseInt`, `pop`,
         * `random`, `reduce`, `reduceRight`, `repeat`, `result`, `runInContext`,
         * `shift`, `size`, `snakeCase`, `some`, `sortedIndex`, `sortedLastIndex`,
         * `startsWith`, `template`, `trim`, `trimLeft`, `trimRight`, `trunc`,
         * `unescape`, `uniqueId`, `value`, and `words`
         *
         * The wrapper function `sample` will return a wrapped value when `n` is provided,
         * otherwise an unwrapped value is returned.
         *
         * @name _
         * @constructor
         * @category Chain
         * @param {*} value The value to wrap in a `lodash` instance.
         * @returns {Object} Returns a `lodash` instance.
         * @example
         *
         * var wrapped = _([1, 2, 3]);
         *
         * // returns an unwrapped value
         * wrapped.reduce(function(sum, n) { return sum + n; });
         * // => 6
         *
         * // returns a wrapped value
         * var squares = wrapped.map(function(n) { return n * n; });
         *
         * _.isArray(squares);
         * // => false
         *
         * _.isArray(squares.value());
         * // => true
         */
        function lodash(value) {
            if (isObjectLike(value) && !isArray(value)) {
                if (value instanceof LodashWrapper) {
                    return value;
                }
                if (hasOwnProperty.call(value, '__wrapped__')) {
                    return new LodashWrapper(value.__wrapped__, value.__chain__, arrayCopy(value.__actions__));
                }
            }
            return new LodashWrapper(value);
        }

        /**
         * The base constructor for creating `lodash` wrapper objects.
         *
         * @private
         * @param {*} value The value to wrap.
         * @param {boolean} [chainAll] Enable chaining for all wrapper methods.
         * @param {Array} [actions=[]] Actions to peform to resolve the unwrapped value.
         */
        function LodashWrapper(value, chainAll, actions) {
            this.__actions__ = actions || [];
            this.__chain__ = !!chainAll;
            this.__wrapped__ = value;
        }

        /**
         * An object environment feature flags.
         *
         * @static
         * @memberOf _
         * @type Object
         */
        var support = lodash.support = {};

        (function (x) {

            /**
             * Detect if functions can be decompiled by `Function#toString`
             * (all but Firefox OS certified apps, older Opera mobile browsers, and
             * the PlayStation 3; forced `false` for Windows 8 apps).
             *
             * @memberOf _.support
             * @type boolean
             */
            support.funcDecomp = !isNative(context.WinRTError) && reThis.test(runInContext);

            /**
             * Detect if `Function#name` is supported (all but IE).
             *
             * @memberOf _.support
             * @type boolean
             */
            support.funcNames = typeof Function.name == 'string';

            /**
             * Detect if the DOM is supported.
             *
             * @memberOf _.support
             * @type boolean
             */
            try {
                support.dom = document.createDocumentFragment().nodeType === 11;
            } catch (e) {
                support.dom = false;
            }

            /**
             * Detect if `arguments` object indexes are non-enumerable.
             *
             * In Firefox < 4, IE < 9, PhantomJS, and Safari < 5.1 `arguments` object
             * indexes are non-enumerable. Chrome < 25 and Node.js < 0.11.0 treat
             * `arguments` object indexes as non-enumerable and fail `hasOwnProperty`
             * checks for indexes that exceed their function's formal parameters with
             * associated values of `0`.
             *
             * @memberOf _.support
             * @type boolean
             */
            try {
                support.nonEnumArgs = !propertyIsEnumerable.call(arguments, 1);
            } catch (e) {
                support.nonEnumArgs = true;
            }
        }(0, 0));

        /**
         * By default, the template delimiters used by Lo-Dash are like those in
         * embedded Ruby (ERB). Change the following template settings to use
         * alternative delimiters.
         *
         * @static
         * @memberOf _
         * @type Object
         */
        lodash.templateSettings = {

            /**
             * Used to detect `data` property values to be HTML-escaped.
             *
             * @memberOf _.templateSettings
             * @type RegExp
             */
            'escape': reEscape,

            /**
             * Used to detect code to be evaluated.
             *
             * @memberOf _.templateSettings
             * @type RegExp
             */
            'evaluate': reEvaluate,

            /**
             * Used to detect `data` property values to inject.
             *
             * @memberOf _.templateSettings
             * @type RegExp
             */
            'interpolate': reInterpolate,

            /**
             * Used to reference the data object in the template text.
             *
             * @memberOf _.templateSettings
             * @type string
             */
            'variable': '',

            /**
             * Used to import variables into the compiled template.
             *
             * @memberOf _.templateSettings
             * @type Object
             */
            'imports': {

                /**
                 * A reference to the `lodash` function.
                 *
                 * @memberOf _.templateSettings.imports
                 * @type Function
                 */
                '_': lodash
            }
        };

        /*------------------------------------------------------------------------*/

        /**
         * Creates a lazy wrapper object which wraps `value` to enable lazy evaluation.
         *
         * @private
         * @param {*} value The value to wrap.
         */
        function LazyWrapper(value) {
            this.actions = null;
            this.dir = 1;
            this.dropCount = 0;
            this.filtered = false;
            this.iteratees = null;
            this.takeCount = POSITIVE_INFINITY;
            this.views = null;
            this.wrapped = value;
        }

        /**
         * Creates a clone of the lazy wrapper object.
         *
         * @private
         * @name clone
         * @memberOf LazyWrapper
         * @returns {Object} Returns the cloned `LazyWrapper` object.
         */
        function lazyClone() {
            var actions = this.actions,
                iteratees = this.iteratees,
                views = this.views,
                result = new LazyWrapper(this.wrapped);

            result.actions = actions ? arrayCopy(actions) : null;
            result.dir = this.dir;
            result.dropCount = this.dropCount;
            result.filtered = this.filtered;
            result.iteratees = iteratees ? arrayCopy(iteratees) : null;
            result.takeCount = this.takeCount;
            result.views = views ? arrayCopy(views) : null;
            return result;
        }

        /**
         * Reverses the direction of lazy iteration.
         *
         * @private
         * @name reverse
         * @memberOf LazyWrapper
         * @returns {Object} Returns the new reversed `LazyWrapper` object.
         */
        function lazyReverse() {
            var filtered = this.filtered,
                result = filtered ? new LazyWrapper(this) : this.clone();

            result.dir = this.dir * -1;
            result.filtered = filtered;
            return result;
        }

        /**
         * Extracts the unwrapped value from its lazy wrapper.
         *
         * @private
         * @name value
         * @memberOf LazyWrapper
         * @returns {*} Returns the unwrapped value.
         */
        function lazyValue() {
            var array = this.wrapped.value();
            if (!isArray(array)) {
                return baseWrapperValue(array, this.actions);
            }
            var dir = this.dir,
                isRight = dir < 0,
                length = array.length,
                view = getView(0, length, this.views),
                start = view.start,
                end = view.end,
                dropCount = this.dropCount,
                takeCount = nativeMin(end - start, this.takeCount - dropCount),
                index = isRight ? end : start - 1,
                iteratees = this.iteratees,
                iterLength = iteratees ? iteratees.length : 0,
                resIndex = 0,
                result = [];

            outer:
                while (length-- && resIndex < takeCount) {
                    index += dir;

                    var iterIndex = -1,
                        value = array[index];

                    while (++iterIndex < iterLength) {
                        var data = iteratees[iterIndex],
                            iteratee = data.iteratee,
                            computed = iteratee(value, index, array),
                            type = data.type;

                        if (type == LAZY_MAP_FLAG) {
                            value = computed;
                        } else if (!computed) {
                            if (type == LAZY_FILTER_FLAG) {
                                continue outer;
                            } else {
                                break outer;
                            }
                        }
                    }
                    if (dropCount) {
                        dropCount--;
                    } else {
                        result[resIndex++] = value;
                    }
                }
            return isRight ? result.reverse() : result;
        }

        /*------------------------------------------------------------------------*/

        /**
         * Creates a cache object to store key/value pairs.
         *
         * @private
         * @static
         * @name Cache
         * @memberOf _.memoize
         */
        function MapCache() {
            this.__data__ = {};
        }

        /**
         * Removes `key` and its value from the cache.
         *
         * @private
         * @name delete
         * @memberOf _.memoize.Cache
         * @param {string} key The key of the value to remove.
         * @returns {boolean} Returns `true` if the entry was removed successfully, else `false`.
         */
        function mapDelete(key) {
            return this.has(key) && delete this.__data__[key];
        }

        /**
         * Gets the cached value for `key`.
         *
         * @private
         * @name get
         * @memberOf _.memoize.Cache
         * @param {string} key The key of the value to get.
         * @returns {*} Returns the cached value.
         */
        function mapGet(key) {
            return key == '__proto__' ? undefined : this.__data__[key];
        }

        /**
         * Checks if a cached value for `key` exists.
         *
         * @private
         * @name has
         * @memberOf _.memoize.Cache
         * @param {string} key The key of the entry to check.
         * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
         */
        function mapHas(key) {
            return key != '__proto__' && hasOwnProperty.call(this.__data__, key);
        }

        /**
         * Adds `value` to `key` of the cache.
         *
         * @private
         * @name set
         * @memberOf _.memoize.Cache
         * @param {string} key The key of the value to cache.
         * @param {*} value The value to cache.
         * @returns {Object} Returns the cache object.
         */
        function mapSet(key, value) {
            if (key != '__proto__') {
                this.__data__[key] = value;
            }
            return this;
        }

        /*------------------------------------------------------------------------*/

        /**
         *
         * Creates a cache object to store unique values.
         *
         * @private
         * @param {Array} [values] The values to cache.
         */
        function SetCache(values) {
            var length = values ? values.length : 0;

            this.data = { 'hash': nativeCreate(null), 'set': new Set };
            while (length--) {
                this.push(values[length]);
            }
        }

        /**
         * Checks if `value` is in `cache` mimicking the return signature of
         * `_.indexOf` by returning `0` if the value is found, else `-1`.
         *
         * @private
         * @param {Object} cache The cache to search.
         * @param {*} value The value to search for.
         * @returns {number} Returns `0` if `value` is found, else `-1`.
         */
        function cacheIndexOf(cache, value) {
            var data = cache.data,
                result = (typeof value == 'string' || isObject(value)) ? data.set.has(value) : data.hash[value];

            return result ? 0 : -1;
        }

        /**
         * Adds `value` to the cache.
         *
         * @private
         * @name push
         * @memberOf SetCache
         * @param {*} value The value to cache.
         */
        function cachePush(value) {
            var data = this.data;
            if (typeof value == 'string' || isObject(value)) {
                data.set.add(value);
            } else {
                data.hash[value] = true;
            }
        }

        /*------------------------------------------------------------------------*/

        /**
         * Copies the values of `source` to `array`.
         *
         * @private
         * @param {Array} source The array to copy values from.
         * @param {Array} [array=[]] The array to copy values to.
         * @returns {Array} Returns `array`.
         */
        function arrayCopy(source, array) {
            var index = -1,
                length = source.length;

            array || (array = Array(length));
            while (++index < length) {
                array[index] = source[index];
            }
            return array;
        }

        /**
         * A specialized version of `_.forEach` for arrays without support for callback
         * shorthands or `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Array} Returns `array`.
         */
        function arrayEach(array, iteratee) {
            var index = -1,
                length = array.length;

            while (++index < length) {
                if (iteratee(array[index], index, array) === false) {
                    break;
                }
            }
            return array;
        }

        /**
         * A specialized version of `_.forEachRight` for arrays without support for
         * callback shorthands or `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Array} Returns `array`.
         */
        function arrayEachRight(array, iteratee) {
            var length = array.length;

            while (length--) {
                if (iteratee(array[length], length, array) === false) {
                    break;
                }
            }
            return array;
        }

        /**
         * A specialized version of `_.every` for arrays without support for callback
         * shorthands or `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} predicate The function invoked per iteration.
         * @returns {boolean} Returns `true` if all elements pass the predicate check,
         *  else `false`.
         */
        function arrayEvery(array, predicate) {
            var index = -1,
                length = array.length;

            while (++index < length) {
                if (!predicate(array[index], index, array)) {
                    return false;
                }
            }
            return true;
        }

        /**
         * A specialized version of `_.filter` for arrays without support for callback
         * shorthands or `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} predicate The function invoked per iteration.
         * @returns {Array} Returns the new filtered array.
         */
        function arrayFilter(array, predicate) {
            var index = -1,
                length = array.length,
                resIndex = -1,
                result = [];

            while (++index < length) {
                var value = array[index];
                if (predicate(value, index, array)) {
                    result[++resIndex] = value;
                }
            }
            return result;
        }

        /**
         * A specialized version of `_.map` for arrays without support for callback
         * shorthands or `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Array} Returns the new mapped array.
         */
        function arrayMap(array, iteratee) {
            var index = -1,
                length = array.length,
                result = Array(length);

            while (++index < length) {
                result[index] = iteratee(array[index], index, array);
            }
            return result;
        }

        /**
         * A specialized version of `_.max` for arrays without support for iteratees.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @returns {*} Returns the maximum value.
         */
        function arrayMax(array) {
            var index = -1,
                length = array.length,
                result = NEGATIVE_INFINITY;

            while (++index < length) {
                var value = array[index];
                if (value > result) {
                    result = value;
                }
            }
            return result;
        }

        /**
         * A specialized version of `_.min` for arrays without support for iteratees.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @returns {*} Returns the minimum value.
         */
        function arrayMin(array) {
            var index = -1,
                length = array.length,
                result = POSITIVE_INFINITY;

            while (++index < length) {
                var value = array[index];
                if (value < result) {
                    result = value;
                }
            }
            return result;
        }

        /**
         * A specialized version of `_.reduce` for arrays without support for callback
         * shorthands or `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @param {*} [accumulator] The initial value.
         * @param {boolean} [initFromArray] Specify using the first element of `array`
         *  as the initial value.
         * @returns {*} Returns the accumulated value.
         */
        function arrayReduce(array, iteratee, accumulator, initFromArray) {
            var index = -1,
                length = array.length;

            if (initFromArray && length) {
                accumulator = array[++index];
            }
            while (++index < length) {
                accumulator = iteratee(accumulator, array[index], index, array);
            }
            return accumulator;
        }

        /**
         * A specialized version of `_.reduceRight` for arrays without support for
         * callback shorthands or `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @param {*} [accumulator] The initial value.
         * @param {boolean} [initFromArray] Specify using the last element of `array`
         *  as the initial value.
         * @returns {*} Returns the accumulated value.
         */
        function arrayReduceRight(array, iteratee, accumulator, initFromArray) {
            var length = array.length;
            if (initFromArray && length) {
                accumulator = array[--length];
            }
            while (length--) {
                accumulator = iteratee(accumulator, array[length], length, array);
            }
            return accumulator;
        }

        /**
         * A specialized version of `_.some` for arrays without support for callback
         * shorthands or `this` binding.
         *
         * @private
         * @param {Array} array The array to iterate over.
         * @param {Function} predicate The function invoked per iteration.
         * @returns {boolean} Returns `true` if any element passes the predicate check,
         *  else `false`.
         */
        function arraySome(array, predicate) {
            var index = -1,
                length = array.length;

            while (++index < length) {
                if (predicate(array[index], index, array)) {
                    return true;
                }
            }
            return false;
        }

        /**
         * Used by `_.defaults` to customize its `_.assign` use.
         *
         * @private
         * @param {*} objectValue The destination object property value.
         * @param {*} sourceValue The source object property value.
         * @returns {*} Returns the value to assign to the destination object.
         */
        function assignDefaults(objectValue, sourceValue) {
            return typeof objectValue == 'undefined' ? sourceValue : objectValue;
        }

        /**
         * Used by `_.template` to customize its `_.assign` use.
         *
         * **Note:** This method is like `assignDefaults` except that it ignores
         * inherited property values when checking if a property is `undefined`.
         *
         * @private
         * @param {*} objectValue The destination object property value.
         * @param {*} sourceValue The source object property value.
         * @param {string} key The key associated with the object and source values.
         * @param {Object} object The destination object.
         * @returns {*} Returns the value to assign to the destination object.
         */
        function assignOwnDefaults(objectValue, sourceValue, key, object) {
            return (typeof objectValue == 'undefined' || !hasOwnProperty.call(object, key))
              ? sourceValue
              : objectValue;
        }

        /**
         * The base implementation of `_.assign` without support for argument juggling,
         * multiple sources, and `this` binding `customizer` functions.
         *
         * @private
         * @param {Object} object The destination object.
         * @param {Object} source The source object.
         * @param {Function} [customizer] The function to customize assigning values.
         * @returns {Object} Returns the destination object.
         */
        function baseAssign(object, source, customizer) {
            var props = keys(source);
            if (!customizer) {
                return baseCopy(source, object, props);
            }
            var index = -1,
                length = props.length

            while (++index < length) {
                var key = props[index],
                    value = object[key],
                    result = customizer(value, source[key], key, object, source);

                if ((result === result ? result !== value : value === value) ||
                    (typeof value == 'undefined' && !(key in object))) {
                    object[key] = result;
                }
            }
            return object;
        }

        /**
         * The base implementation of `_.at` without support for strings and individual
         * key arguments.
         *
         * @private
         * @param {Array|Object} collection The collection to iterate over.
         * @param {number[]|string[]} [props] The property names or indexes of elements to pick.
         * @returns {Array} Returns the new array of picked elements.
         */
        function baseAt(collection, props) {
            var index = -1,
                length = collection.length,
                isArr = isLength(length),
                propsLength = props.length,
                result = Array(propsLength);

            while (++index < propsLength) {
                var key = props[index];
                if (isArr) {
                    key = parseFloat(key);
                    result[index] = isIndex(key, length) ? collection[key] : undefined;
                } else {
                    result[index] = collection[key];
                }
            }
            return result;
        }

        /**
         * Copies the properties of `source` to `object`.
         *
         * @private
         * @param {Object} source The object to copy properties from.
         * @param {Object} [object={}] The object to copy properties to.
         * @param {Array} props The property names to copy.
         * @returns {Object} Returns `object`.
         */
        function baseCopy(source, object, props) {
            if (!props) {
                props = object;
                object = {};
            }
            var index = -1,
                length = props.length;

            while (++index < length) {
                var key = props[index];
                object[key] = source[key];
            }
            return object;
        }

        /**
         * The base implementation of `_.bindAll` without support for individual
         * method name arguments.
         *
         * @private
         * @param {Object} object The object to bind and assign the bound methods to.
         * @param {string[]} methodNames The object method names to bind.
         * @returns {Object} Returns `object`.
         */
        function baseBindAll(object, methodNames) {
            var index = -1,
                length = methodNames.length;

            while (++index < length) {
                var key = methodNames[index];
                object[key] = createWrapper(object[key], BIND_FLAG, object);
            }
            return object;
        }

        /**
         * The base implementation of `_.callback` which supports specifying the
         * number of arguments to provide to `func`.
         *
         * @private
         * @param {*} [func=_.identity] The value to convert to a callback.
         * @param {*} [thisArg] The `this` binding of `func`.
         * @param {number} [argCount] The number of arguments to provide to `func`.
         * @returns {Function} Returns the callback.
         */
        function baseCallback(func, thisArg, argCount) {
            var type = typeof func;
            if (type == 'function') {
                return (typeof thisArg != 'undefined' && isBindable(func))
                  ? bindCallback(func, thisArg, argCount)
                  : func;
            }
            if (func == null) {
                return identity;
            }
            // Handle "_.property" and "_.matches" style callback shorthands.
            return type == 'object'
              ? baseMatches(func, !argCount)
              : baseProperty(argCount ? baseToString(func) : func);
        }

        /**
         * The base implementation of `_.clone` without support for argument juggling
         * and `this` binding `customizer` functions.
         *
         * @private
         * @param {*} value The value to clone.
         * @param {boolean} [isDeep] Specify a deep clone.
         * @param {Function} [customizer] The function to customize cloning values.
         * @param {string} [key] The key of `value`.
         * @param {Object} [object] The object `value` belongs to.
         * @param {Array} [stackA=[]] Tracks traversed source objects.
         * @param {Array} [stackB=[]] Associates clones with source counterparts.
         * @returns {*} Returns the cloned value.
         */
        function baseClone(value, isDeep, customizer, key, object, stackA, stackB) {
            var result;
            if (customizer) {
                result = object ? customizer(value, key, object) : customizer(value);
            }
            if (typeof result != 'undefined') {
                return result;
            }
            if (!isObject(value)) {
                return value;
            }
            var isArr = isArray(value);
            if (isArr) {
                result = initCloneArray(value);
                if (!isDeep) {
                    return arrayCopy(value, result);
                }
            } else {
                var tag = objToString.call(value),
                    isFunc = tag == funcTag;

                if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
                    result = initCloneObject(isFunc ? {} : value);
                    if (!isDeep) {
                        return baseCopy(value, result, keys(value));
                    }
                } else {
                    return cloneableTags[tag]
                      ? initCloneByTag(value, tag, isDeep)
                      : (object ? value : {});
                }
            }
            // Check for circular references and return corresponding clone.
            stackA || (stackA = []);
            stackB || (stackB = []);

            var length = stackA.length;
            while (length--) {
                if (stackA[length] == value) {
                    return stackB[length];
                }
            }
            // Add the source value to the stack of traversed objects and associate it with its clone.
            stackA.push(value);
            stackB.push(result);

            // Recursively populate clone (susceptible to call stack limits).
            (isArr ? arrayEach : baseForOwn)(value, function (subValue, key) {
                result[key] = baseClone(subValue, isDeep, customizer, key, value, stackA, stackB);
            });
            return result;
        }

        /**
         * The base implementation of `_.create` without support for assigning
         * properties to the created object.
         *
         * @private
         * @param {Object} prototype The object to inherit from.
         * @returns {Object} Returns the new object.
         */
        var baseCreate = (function () {
            function Object() { }
            return function (prototype) {
                if (isObject(prototype)) {
                    Object.prototype = prototype;
                    var result = new Object;
                    Object.prototype = null;
                }
                return result || context.Object();
            };
        }());

        /**
         * The base implementation of `_.delay` and `_.defer` which accepts an index
         * of where to slice the arguments to provide to `func`.
         *
         * @private
         * @param {Function} func The function to delay.
         * @param {number} wait The number of milliseconds to delay invocation.
         * @param {Object} args The `arguments` object to slice and provide to `func`.
         * @returns {number} Returns the timer id.
         */
        function baseDelay(func, wait, args, fromIndex) {
            if (!isFunction(func)) {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            return setTimeout(function () { func.apply(undefined, baseSlice(args, fromIndex)); }, wait);
        }

        /**
         * The base implementation of `_.difference` which accepts a single array
         * of values to exclude.
         *
         * @private
         * @param {Array} array The array to inspect.
         * @param {Array} values The values to exclude.
         * @returns {Array} Returns the new array of filtered values.
         */
        function baseDifference(array, values) {
            var length = array ? array.length : 0,
                result = [];

            if (!length) {
                return result;
            }
            var index = -1,
                indexOf = getIndexOf(),
                isCommon = indexOf == baseIndexOf,
                cache = isCommon && values.length >= 200 && createCache(values),
                valuesLength = values.length;

            if (cache) {
                indexOf = cacheIndexOf;
                isCommon = false;
                values = cache;
            }
            outer:
                while (++index < length) {
                    var value = array[index];

                    if (isCommon && value === value) {
                        var valuesIndex = valuesLength;
                        while (valuesIndex--) {
                            if (values[valuesIndex] === value) {
                                continue outer;
                            }
                        }
                        result.push(value);
                    }
                    else if (indexOf(values, value) < 0) {
                        result.push(value);
                    }
                }
            return result;
        }

        /**
         * The base implementation of `_.forEach` without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Array|Object|string} Returns `collection`.
         */
        function baseEach(collection, iteratee) {
            var length = collection ? collection.length : 0;
            if (!isLength(length)) {
                return baseForOwn(collection, iteratee);
            }
            var index = -1,
                iterable = toObject(collection);

            while (++index < length) {
                if (iteratee(iterable[index], index, iterable) === false) {
                    break;
                }
            }
            return collection;
        }

        /**
         * The base implementation of `_.forEachRight` without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Array|Object|string} Returns `collection`.
         */
        function baseEachRight(collection, iteratee) {
            var length = collection ? collection.length : 0;
            if (!isLength(length)) {
                return baseForOwnRight(collection, iteratee);
            }
            var iterable = toObject(collection);
            while (length--) {
                if (iteratee(iterable[length], length, iterable) === false) {
                    break;
                }
            }
            return collection;
        }

        /**
         * The base implementation of `_.every` without support for callback
         * shorthands or `this` binding.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} predicate The function invoked per iteration.
         * @returns {boolean} Returns `true` if all elements pass the predicate check,
         *  else `false`
         */
        function baseEvery(collection, predicate) {
            var result = true;
            baseEach(collection, function (value, index, collection) {
                result = !!predicate(value, index, collection);
                return result;
            });
            return result;
        }

        /**
         * The base implementation of `_.filter` without support for callback
         * shorthands or `this` binding.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} predicate The function invoked per iteration.
         * @returns {Array} Returns the new filtered array.
         */
        function baseFilter(collection, predicate) {
            var result = [];
            baseEach(collection, function (value, index, collection) {
                if (predicate(value, index, collection)) {
                    result.push(value);
                }
            });
            return result;
        }

        /**
         * The base implementation of `_.find`, `_.findLast`, `_.findKey`, and `_.findLastKey`,
         * without support for callback shorthands and `this` binding, which iterates
         * over `collection` using the provided `eachFunc`.
         *
         * @private
         * @param {Array|Object|string} collection The collection to search.
         * @param {Function} predicate The function invoked per iteration.
         * @param {Function} eachFunc The function to iterate over `collection`.
         * @param {boolean} [retKey] Specify returning the key of the found element
         *  instead of the element itself.
         * @returns {*} Returns the found element or its key, else `undefined`.
         */
        function baseFind(collection, predicate, eachFunc, retKey) {
            var result;
            eachFunc(collection, function (value, key, collection) {
                if (predicate(value, key, collection)) {
                    result = retKey ? key : value;
                    return false;
                }
            });
            return result;
        }

        /**
         * The base implementation of `_.flatten` with added support for restricting
         * flattening and specifying the start index.
         *
         * @private
         * @param {Array} array The array to flatten.
         * @param {boolean} [isDeep] Specify a deep flatten.
         * @param {boolean} [isStrict] Restrict flattening to arrays and `arguments` objects.
         * @param {number} [fromIndex=0] The index to start from.
         * @returns {Array} Returns the new flattened array.
         */
        function baseFlatten(array, isDeep, isStrict, fromIndex) {
            var index = (fromIndex || 0) - 1,
                length = array.length,
                resIndex = -1,
                result = [];

            while (++index < length) {
                var value = array[index];

                if (isObjectLike(value) && isLength(value.length) && (isArray(value) || isArguments(value))) {
                    if (isDeep) {
                        // Recursively flatten arrays (susceptible to call stack limits).
                        value = baseFlatten(value, isDeep, isStrict);
                    }
                    var valIndex = -1,
                        valLength = value.length;

                    result.length += valLength;
                    while (++valIndex < valLength) {
                        result[++resIndex] = value[valIndex];
                    }
                } else if (!isStrict) {
                    result[++resIndex] = value;
                }
            }
            return result;
        }

        /**
         * The base implementation of `baseForIn` and `baseForOwn` which iterates
         * over `object` properties returned by `keysFunc` invoking `iteratee` for
         * each property. Iterator functions may exit iteration early by explicitly
         * returning `false`.
         *
         * @private
         * @param {Object} object The object to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @param {Function} keysFunc The function to get the keys of `object`.
         * @returns {Object} Returns `object`.
         */
        function baseFor(object, iteratee, keysFunc) {
            var index = -1,
                iterable = toObject(object),
                props = keysFunc(object),
                length = props.length;

            while (++index < length) {
                var key = props[index];
                if (iteratee(iterable[key], key, iterable) === false) {
                    break;
                }
            }
            return object;
        }

        /**
         * This function is like `baseFor` except that it iterates over properties
         * in the opposite order.
         *
         * @private
         * @param {Object} object The object to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @param {Function} keysFunc The function to get the keys of `object`.
         * @returns {Object} Returns `object`.
         */
        function baseForRight(object, iteratee, keysFunc) {
            var iterable = toObject(object),
                props = keysFunc(object),
                length = props.length;

            while (length--) {
                var key = props[length];
                if (iteratee(iterable[key], key, iterable) === false) {
                    break;
                }
            }
            return object;
        }

        /**
         * The base implementation of `_.forIn` without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Object} object The object to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Object} Returns `object`.
         */
        function baseForIn(object, iteratee) {
            return baseFor(object, iteratee, keysIn);
        }

        /**
         * The base implementation of `_.forOwn` without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Object} object The object to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Object} Returns `object`.
         */
        function baseForOwn(object, iteratee) {
            return baseFor(object, iteratee, keys);
        }

        /**
         * The base implementation of `_.forOwnRight` without support for callback
         * shorthands and `this` binding.
         *
         * @private
         * @param {Object} object The object to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Object} Returns `object`.
         */
        function baseForOwnRight(object, iteratee) {
            return baseForRight(object, iteratee, keys);
        }

        /**
         * The base implementation of `_.functions` which creates an array of
         * `object` function property names filtered from those provided.
         *
         * @private
         * @param {Object} object The object to inspect.
         * @param {Array} props The property names to filter.
         * @returns {Array} Returns the new array of filtered property names.
         */
        function baseFunctions(object, props) {
            var index = -1,
                length = props.length,
                resIndex = -1,
                result = [];

            while (++index < length) {
                var key = props[index];
                if (isFunction(object[key])) {
                    result[++resIndex] = key;
                }
            }
            return result;
        }

        /**
         * The base implementation of `_.invoke` which requires additional arguments
         * to be provided as an array of arguments rather than individually.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|string} methodName The name of the method to invoke or
         *  the function invoked per iteration.
         * @param {Array} [args] The arguments to invoke the method with.
         * @returns {Array} Returns the array of results.
         */
        function baseInvoke(collection, methodName, args) {
            var index = -1,
                isFunc = typeof methodName == 'function',
                length = collection ? collection.length : 0,
                result = isLength(length) ? Array(length) : [];

            baseEach(collection, function (value) {
                var func = isFunc ? methodName : (value != null && value[methodName]);
                result[++index] = func ? func.apply(value, args) : undefined;
            });
            return result;
        }

        /**
         * The base implementation of `_.isEqual` without support for `this` binding
         * `customizer` functions.
         *
         * @private
         * @param {*} value The value to compare.
         * @param {*} other The other value to compare.
         * @param {Function} [customizer] The function to customize comparing values.
         * @param {boolean} [isWhere] Specify performing partial comparisons.
         * @param {Array} [stackA] Tracks traversed `value` objects.
         * @param {Array} [stackB] Tracks traversed `other` objects.
         * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
         */
        function baseIsEqual(value, other, customizer, isWhere, stackA, stackB) {
            // Exit early for identical values.
            if (value === other) {
                // Treat `+0` vs. `-0` as not equal.
                return value !== 0 || (1 / value == 1 / other);
            }
            var valType = typeof value,
                othType = typeof other;

            // Exit early for unlike primitive values.
            if ((valType != 'function' && valType != 'object' && othType != 'function' && othType != 'object') ||
                value == null || other == null) {
                // Return `false` unless both values are `NaN`.
                return value !== value && other !== other;
            }
            return baseIsEqualDeep(value, other, baseIsEqual, customizer, isWhere, stackA, stackB);
        }

        /**
         * A specialized version of `baseIsEqual` for arrays and objects which performs
         * deep comparisons and tracks traversed objects enabling objects with circular
         * references to be compared.
         *
         * @private
         * @param {Object} object The object to compare.
         * @param {Object} other The other object to compare.
         * @param {Function} equalFunc The function to determine equivalents of values.
         * @param {Function} [customizer] The function to customize comparing objects.
         * @param {boolean} [isWhere] Specify performing partial comparisons.
         * @param {Array} [stackA=[]] Tracks traversed `value` objects.
         * @param {Array} [stackB=[]] Tracks traversed `other` objects.
         * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
         */
        function baseIsEqualDeep(object, other, equalFunc, customizer, isWhere, stackA, stackB) {
            var objIsArr = isArray(object),
                othIsArr = isArray(other),
                objTag = arrayTag,
                othTag = arrayTag;

            if (!objIsArr) {
                objTag = objToString.call(object);
                if (objTag == argsTag) {
                    objTag = objectTag;
                } else if (objTag != objectTag) {
                    objIsArr = isTypedArray(object);
                }
            }
            if (!othIsArr) {
                othTag = objToString.call(other);
                if (othTag == argsTag) {
                    othTag = objectTag;
                } else if (othTag != objectTag) {
                    othIsArr = isTypedArray(other);
                }
            }
            var objIsObj = objTag == objectTag,
                othIsObj = othTag == objectTag,
                isSameTag = objTag == othTag;

            if (isSameTag && !(objIsArr || objIsObj)) {
                return equalByTag(object, other, objTag);
            }
            var valWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
                othWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

            if (valWrapped || othWrapped) {
                return equalFunc(valWrapped ? object.value() : object, othWrapped ? other.value() : other, customizer, isWhere, stackA, stackB);
            }
            if (!isSameTag) {
                return false;
            }
            // Assume cyclic structures are equal.
            // The algorithm for detecting cyclic structures is adapted from ES 5.1
            // section 15.12.3, abstract operation `JO` (http://es5.github.io/#x15.12.3).
            stackA || (stackA = []);
            stackB || (stackB = []);

            var length = stackA.length;
            while (length--) {
                if (stackA[length] == object) {
                    return stackB[length] == other;
                }
            }
            // Add `object` and `other` to the stack of traversed objects.
            stackA.push(object);
            stackB.push(other);

            var result = (objIsArr ? equalArrays : equalObjects)(object, other, equalFunc, customizer, isWhere, stackA, stackB);

            stackA.pop();
            stackB.pop();

            return result;
        }

        /**
         * The base implementation of `_.isMatch` without support for callback
         * shorthands or `this` binding.
         *
         * @private
         * @param {Object} source The object to inspect.
         * @param {Array} props The source property names to match.
         * @param {Array} values The source values to match.
         * @param {Array} strictCompareFlags Strict comparison flags for source values.
         * @param {Function} [customizer] The function to customize comparing objects.
         * @returns {boolean} Returns `true` if `object` is a match, else `false`.
         */
        function baseIsMatch(object, props, values, strictCompareFlags, customizer) {
            var length = props.length;
            if (object == null) {
                return !length;
            }
            var index = -1,
                noCustomizer = !customizer;

            while (++index < length) {
                if ((noCustomizer && strictCompareFlags[index])
                      ? values[index] !== object[props[index]]
                      : !hasOwnProperty.call(object, props[index])
                    ) {
                    return false;
                }
            }
            index = -1;
            while (++index < length) {
                var key = props[index];
                if (noCustomizer && strictCompareFlags[index]) {
                    var result = hasOwnProperty.call(object, key);
                } else {
                    var objValue = object[key],
                        srcValue = values[index];

                    result = customizer ? customizer(objValue, srcValue, key) : undefined;
                    if (typeof result == 'undefined') {
                        result = baseIsEqual(srcValue, objValue, customizer, true);
                    }
                }
                if (!result) {
                    return false;
                }
            }
            return true;
        }

        /**
         * The base implementation of `_.map` without support for callback shorthands
         * or `this` binding.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @returns {Array} Returns the new mapped array.
         */
        function baseMap(collection, iteratee) {
            var result = [];
            baseEach(collection, function (value, key, collection) {
                result.push(iteratee(value, key, collection));
            });
            return result;
        }

        /**
         * The base implementation of `_.matches` which supports specifying whether
         * `source` should be cloned.
         *
         * @private
         * @param {Object} source The object of property values to match.
         * @param {boolean} [isCloned] Specify cloning the source object.
         * @returns {Function} Returns the new function.
         */
        function baseMatches(source, isCloned) {
            var props = keys(source),
                length = props.length;

            if (length == 1) {
                var key = props[0],
                    value = source[key];

                if (isStrictComparable(value)) {
                    return function (object) {
                        return object != null && value === object[key] && hasOwnProperty.call(object, key);
                    };
                }
            }
            if (isCloned) {
                source = baseClone(source, true);
            }
            var values = Array(length),
                strictCompareFlags = Array(length);

            while (length--) {
                value = source[props[length]];
                values[length] = value;
                strictCompareFlags[length] = isStrictComparable(value);
            }
            return function (object) {
                return baseIsMatch(object, props, values, strictCompareFlags);
            };
        }

        /**
         * The base implementation of `_.merge` without support for argument juggling,
         * multiple sources, and `this` binding `customizer` functions.
         *
         * @private
         * @param {Object} object The destination object.
         * @param {Object} source The source object.
         * @param {Function} [customizer] The function to customize merging properties.
         * @param {Array} [stackA=[]] Tracks traversed source objects.
         * @param {Array} [stackB=[]] Associates values with source counterparts.
         * @returns {Object} Returns the destination object.
         */
        function baseMerge(object, source, customizer, stackA, stackB) {
            var isSrcArr = isLength(source.length) && (isArray(source) || isTypedArray(source));

            (isSrcArr ? arrayEach : baseForOwn)(source, function (srcValue, key, source) {
                if (isObjectLike(srcValue)) {
                    stackA || (stackA = []);
                    stackB || (stackB = []);
                    return baseMergeDeep(object, source, key, baseMerge, customizer, stackA, stackB);
                }
                var value = object[key],
                    result = customizer ? customizer(value, srcValue, key, object, source) : undefined,
                    isCommon = typeof result == 'undefined';

                if (isCommon) {
                    result = srcValue;
                }
                if ((isSrcArr || typeof result != 'undefined') &&
                    (isCommon || (result === result ? result !== value : value === value))) {
                    object[key] = result;
                }
            });
            return object;
        }

        /**
         * A specialized version of `baseMerge` for arrays and objects which performs
         * deep merges and tracks traversed objects enabling objects with circular
         * references to be merged.
         *
         * @private
         * @param {Object} object The destination object.
         * @param {Object} source The source object.
         * @param {string} key The key of the value to merge.
         * @param {Function} mergeFunc The function to merge values.
         * @param {Function} [customizer] The function to customize merging properties.
         * @param {Array} [stackA=[]] Tracks traversed source objects.
         * @param {Array} [stackB=[]] Associates values with source counterparts.
         * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
         */
        function baseMergeDeep(object, source, key, mergeFunc, customizer, stackA, stackB) {
            var length = stackA.length,
                srcValue = source[key];

            while (length--) {
                if (stackA[length] == srcValue) {
                    object[key] = stackB[length];
                    return;
                }
            }
            var value = object[key],
                result = customizer ? customizer(value, srcValue, key, object, source) : undefined,
                isCommon = typeof result == 'undefined';

            if (isCommon) {
                result = srcValue;
                if (isLength(srcValue.length) && (isArray(srcValue) || isTypedArray(srcValue))) {
                    result = isArray(value)
                      ? value
                      : (value ? arrayCopy(value) : []);
                }
                else if (isPlainObject(srcValue) || isArguments(srcValue)) {
                    result = isArguments(value)
                      ? toPlainObject(value)
                      : (isPlainObject(value) ? value : {});
                }
            }
            // Add the source value to the stack of traversed objects and associate
            // it with its merged value.
            stackA.push(srcValue);
            stackB.push(result);

            if (isCommon) {
                // Recursively merge objects and arrays (susceptible to call stack limits).
                object[key] = mergeFunc(result, srcValue, customizer, stackA, stackB);
            } else if (result === result ? result !== value : value === value) {
                object[key] = result;
            }
        }

        /**
         * The base implementation of `_.property` which does not coerce `key` to a string.
         *
         * @private
         * @param {string} key The key of the property to get.
         * @returns {Function} Returns the new function.
         */
        function baseProperty(key) {
            return function (object) {
                return object == null ? undefined : object[key];
            };
        }

        /**
         * The base implementation of `_.pullAt` without support for individual
         * index arguments.
         *
         * @private
         * @param {Array} array The array to modify.
         * @param {number[]} indexes The indexes of elements to remove.
         * @returns {Array} Returns the new array of removed elements.
         */
        function basePullAt(array, indexes) {
            var length = indexes.length,
                result = baseAt(array, indexes);

            indexes.sort(baseCompareAscending);
            while (length--) {
                var index = parseFloat(indexes[length]);
                if (index != previous && isIndex(index)) {
                    var previous = index;
                    splice.call(array, index, 1);
                }
            }
            return result;
        }

        /**
         * The base implementation of `_.random` without support for argument juggling
         * and returning floating-point numbers.
         *
         * @private
         * @param {number} min The minimum possible value.
         * @param {number} max The maximum possible value.
         * @returns {number} Returns the random number.
         */
        function baseRandom(min, max) {
            return min + floor(nativeRandom() * (max - min + 1));
        }

        /**
         * The base implementation of `_.reduce` and `_.reduceRight` without support
         * for callback shorthands or `this` binding, which iterates over `collection`
         * using the provided `eachFunc`.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @param {*} accumulator The initial value.
         * @param {boolean} initFromCollection Specify using the first or last element
         *  of `collection` as the initial value.
         * @param {Function} eachFunc The function to iterate over `collection`.
         * @returns {*} Returns the accumulated value.
         */
        function baseReduce(collection, iteratee, accumulator, initFromCollection, eachFunc) {
            eachFunc(collection, function (value, index, collection) {
                accumulator = initFromCollection
                  ? (initFromCollection = false, value)
                  : iteratee(accumulator, value, index, collection)
            });
            return accumulator;
        }

        /**
         * The base implementation of `setData` without support for hot loop detection.
         *
         * @private
         * @param {Function} func The function to associate metadata with.
         * @param {*} data The metadata.
         * @returns {Function} Returns `func`.
         */
        var baseSetData = !metaMap ? identity : function (func, data) {
            metaMap.set(func, data);
            return func;
        };

        /**
         * The base implementation of `_.slice` without an iteratee call guard.
         *
         * @private
         * @param {Array} array The array to slice.
         * @param {number} [start=0] The start position.
         * @param {number} [end=array.length] The end position.
         * @returns {Array} Returns the slice of `array`.
         */
        function baseSlice(array, start, end) {
            var index = -1,
                length = array.length;

            start = start == null ? 0 : (+start || 0);
            if (start < 0) {
                start = -start > length ? 0 : (length + start);
            }
            end = (typeof end == 'undefined' || end > length) ? length : (+end || 0);
            if (end < 0) {
                end += length;
            }
            length = start > end ? 0 : (end - start);

            var result = Array(length);
            while (++index < length) {
                result[index] = array[index + start];
            }
            return result;
        }

        /**
         * The base implementation of `_.some` without support for callback shorthands
         * or `this` binding.
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} predicate The function invoked per iteration.
         * @returns {boolean} Returns `true` if any element passes the predicate check,
         *  else `false`.
         */
        function baseSome(collection, predicate) {
            var result;

            baseEach(collection, function (value, index, collection) {
                result = predicate(value, index, collection);
                return !result;
            });
            return !!result;
        }

        /**
         * The base implementation of `_.uniq` without support for callback shorthands
         * and `this` binding.
         *
         * @private
         * @param {Array} array The array to inspect.
         * @param {Function} [iteratee] The function invoked per iteration.
         * @returns {Array} Returns the new duplicate-value-free array.
         */
        function baseUniq(array, iteratee) {
            var index = -1,
                indexOf = getIndexOf(),
                length = array.length,
                isCommon = indexOf == baseIndexOf,
                isLarge = isCommon && length >= 200,
                seen = isLarge && createCache(),
                result = [];

            if (seen) {
                indexOf = cacheIndexOf;
                isCommon = false;
            } else {
                isLarge = false;
                seen = iteratee ? [] : result;
            }
            outer:
                while (++index < length) {
                    var value = array[index],
                        computed = iteratee ? iteratee(value, index, array) : value;

                    if (isCommon && value === value) {
                        var seenIndex = seen.length;
                        while (seenIndex--) {
                            if (seen[seenIndex] === computed) {
                                continue outer;
                            }
                        }
                        if (iteratee) {
                            seen.push(computed);
                        }
                        result.push(value);
                    }
                    else if (indexOf(seen, computed) < 0) {
                        if (iteratee || isLarge) {
                            seen.push(computed);
                        }
                        result.push(value);
                    }
                }
            return result;
        }

        /**
         * The base implementation of `_.values` and `_.valuesIn` which creates an
         * array of `object` property values corresponding to the property names
         * returned by `keysFunc`.
         *
         * @private
         * @param {Object} object The object to query.
         * @param {Array} props The property names to get values for.
         * @returns {Object} Returns the array of property values.
         */
        function baseValues(object, props) {
            var index = -1,
                length = props.length,
                result = Array(length);

            while (++index < length) {
                result[index] = object[props[index]];
            }
            return result;
        }

        /**
         * The base implementation of `wrapperValue` which returns the result of
         * performing a sequence of actions on the unwrapped `value`, where each
         * successive action is supplied the return value of the previous.
         *
         * @private
         * @param {*} value The unwrapped value.
         * @param {Array} actions Actions to peform to resolve the unwrapped value.
         * @returns {*} Returns the resolved unwrapped value.
         */
        function baseWrapperValue(value, actions) {
            var result = value;
            if (result instanceof LazyWrapper) {
                result = result.value();
            }
            var index = -1,
                length = actions.length;

            while (++index < length) {
                var args = [result],
                    action = actions[index];

                push.apply(args, action.args);
                result = action.func.apply(action.thisArg, args);
            }
            return result;
        }

        /**
         * Performs a binary search of `array` to determine the index at which `value`
         * should be inserted into `array` in order to maintain its sort order.
         *
         * @private
         * @param {Array} array The sorted array to inspect.
         * @param {*} value The value to evaluate.
         * @param {boolean} [retHighest] Specify returning the highest, instead
         *  of the lowest, index at which a value should be inserted into `array`.
         * @returns {number} Returns the index at which `value` should be inserted
         *  into `array`.
         */
        function binaryIndex(array, value, retHighest) {
            var low = 0,
                high = array ? array.length : low;

            if (typeof value == 'number' && value === value && high <= HALF_MAX_ARRAY_LENGTH) {
                while (low < high) {
                    var mid = (low + high) >>> 1,
                        computed = array[mid];

                    if (retHighest ? (computed <= value) : (computed < value)) {
                        low = mid + 1;
                    } else {
                        high = mid;
                    }
                }
                return high;
            }
            return binaryIndexBy(array, value, identity, retHighest);
        }

        /**
         * This function is like `binaryIndex` except that it invokes `iteratee` for
         * `value` and each element of `array` to compute their sort ranking. The
         * iteratee is invoked with one argument; (value).
         *
         * @private
         * @param {Array} array The sorted array to inspect.
         * @param {*} value The value to evaluate.
         * @param {Function} iteratee The function invoked per iteration.
         * @param {boolean} [retHighest] Specify returning the highest, instead
         *  of the lowest, index at which a value should be inserted into `array`.
         * @returns {number} Returns the index at which `value` should be inserted
         *  into `array`.
         */
        function binaryIndexBy(array, value, iteratee, retHighest) {
            value = iteratee(value);

            var low = 0,
                high = array ? array.length : 0,
                valIsNaN = value !== value,
                valIsUndef = typeof value == 'undefined';

            while (low < high) {
                var mid = floor((low + high) / 2),
                    computed = iteratee(array[mid]),
                    isReflexive = computed === computed;

                if (valIsNaN) {
                    var setLow = isReflexive || retHighest;
                } else if (valIsUndef) {
                    setLow = isReflexive && (retHighest || typeof computed != 'undefined');
                } else {
                    setLow = retHighest ? (computed <= value) : (computed < value);
                }
                if (setLow) {
                    low = mid + 1;
                } else {
                    high = mid;
                }
            }
            return nativeMin(high, MAX_ARRAY_INDEX);
        }

        /**
         * A specialized version of `baseCallback` which only supports `this` binding
         * and specifying the number of arguments to provide to `func`.
         *
         * @private
         * @param {Function} func The function to bind.
         * @param {*} thisArg The `this` binding of `func`.
         * @param {number} [argCount] The number of arguments to provide to `func`.
         * @returns {Function} Returns the callback.
         */
        function bindCallback(func, thisArg, argCount) {
            if (typeof func != 'function') {
                return identity;
            }
            if (typeof thisArg == 'undefined') {
                return func;
            }
            switch (argCount) {
                case 1: return function (value) {
                    return func.call(thisArg, value);
                };
                case 3: return function (value, index, collection) {
                    return func.call(thisArg, value, index, collection);
                };
                case 4: return function (accumulator, value, index, collection) {
                    return func.call(thisArg, accumulator, value, index, collection);
                };
                case 5: return function (value, other, key, object, source) {
                    return func.call(thisArg, value, other, key, object, source);
                };
            }
            return function () {
                return func.apply(thisArg, arguments);
            };
        }

        /**
         * Creates a clone of the given array buffer.
         *
         * @private
         * @param {ArrayBuffer} buffer The array buffer to clone.
         * @returns {ArrayBuffer} Returns the cloned array buffer.
         */
        function bufferClone(buffer) {
            return bufferSlice.call(buffer, 0);
        }
        if (!bufferSlice) {
            // PhantomJS has `ArrayBuffer` and `Uint8Array` but not `Float64Array`.
            bufferClone = !(ArrayBuffer && Uint8Array) ? constant(null) : function (buffer) {
                var byteLength = buffer.byteLength,
                    floatLength = Float64Array ? floor(byteLength / FLOAT64_BYTES_PER_ELEMENT) : 0,
                    offset = floatLength * FLOAT64_BYTES_PER_ELEMENT,
                    result = new ArrayBuffer(byteLength);

                if (floatLength) {
                    var view = new Float64Array(result, 0, floatLength);
                    view.set(new Float64Array(buffer, 0, floatLength));
                }
                if (byteLength != offset) {
                    view = new Uint8Array(result, offset);
                    view.set(new Uint8Array(buffer, offset));
                }
                return result;
            };
        }

        /**
         * Creates an array that is the composition of partially applied arguments,
         * placeholders, and provided arguments into a single array of arguments.
         *
         * @private
         * @param {Array|Object} args The provided arguments.
         * @param {Array} partials The arguments to prepend to those provided.
         * @param {Array} holders The `partials` placeholder indexes.
         * @returns {Array} Returns the new array of composed arguments.
         */
        function composeArgs(args, partials, holders) {
            var holdersLength = holders.length,
                argsIndex = -1,
                argsLength = nativeMax(args.length - holdersLength, 0),
                leftIndex = -1,
                leftLength = partials.length,
                result = Array(argsLength + leftLength);

            while (++leftIndex < leftLength) {
                result[leftIndex] = partials[leftIndex];
            }
            while (++argsIndex < holdersLength) {
                result[holders[argsIndex]] = args[argsIndex];
            }
            while (argsLength--) {
                result[leftIndex++] = args[argsIndex++];
            }
            return result;
        }

        /**
         * This function is like `composeArgs` except that the arguments composition
         * is tailored for `_.partialRight`.
         *
         * @private
         * @param {Array|Object} args The provided arguments.
         * @param {Array} partials The arguments to append to those provided.
         * @param {Array} holders The `partials` placeholder indexes.
         * @returns {Array} Returns the new array of composed arguments.
         */
        function composeArgsRight(args, partials, holders) {
            var holdersIndex = -1,
                holdersLength = holders.length,
                argsIndex = -1,
                argsLength = nativeMax(args.length - holdersLength, 0),
                rightIndex = -1,
                rightLength = partials.length,
                result = Array(argsLength + rightLength);

            while (++argsIndex < argsLength) {
                result[argsIndex] = args[argsIndex];
            }
            var pad = argsIndex;
            while (++rightIndex < rightLength) {
                result[pad + rightIndex] = partials[rightIndex];
            }
            while (++holdersIndex < holdersLength) {
                result[pad + holders[holdersIndex]] = args[argsIndex++];
            }
            return result;
        }

        /**
         * Creates a function that aggregates a collection, creating an accumulator
         * object composed from the results of running each element in the collection
         * through an iteratee. The `setter` sets the keys and values of the accumulator
         * object. If `initializer` is provided initializes the accumulator object.
         *
         * @private
         * @param {Function} setter The function to set keys and values of the accumulator object.
         * @param {Function} [initializer] The function to initialize the accumulator object.
         * @returns {Function} Returns the new aggregator function.
         */
        function createAggregator(setter, initializer) {
            return function (collection, iteratee, thisArg) {
                var result = initializer ? initializer() : {};
                iteratee = getCallback(iteratee, thisArg, 3);

                if (isArray(collection)) {
                    var index = -1,
                        length = collection.length;

                    while (++index < length) {
                        var value = collection[index];
                        setter(result, value, iteratee(value, index, collection), collection);
                    }
                } else {
                    baseEach(collection, function (value, key, collection) {
                        setter(result, value, iteratee(value, key, collection), collection);
                    });
                }
                return result;
            };
        }

        /**
         * Creates a function that assigns properties of source object(s) to a given
         * destination object.
         *
         * @private
         * @param {Function} assigner The function to assign values.
         * @returns {Function} Returns the new assigner function.
         */
        function createAssigner(assigner) {
            return function () {
                var length = arguments.length,
                    object = arguments[0];

                if (length < 2 || object == null) {
                    return object;
                }
                if (length > 3 && isIterateeCall(arguments[1], arguments[2], arguments[3])) {
                    length = 2;
                }
                // Juggle arguments.
                if (length > 3 && typeof arguments[length - 2] == 'function') {
                    var customizer = bindCallback(arguments[--length - 1], arguments[length--], 5);
                } else if (length > 2 && typeof arguments[length - 1] == 'function') {
                    customizer = arguments[--length];
                }
                var index = 0;
                while (++index < length) {
                    var source = arguments[index];
                    if (source) {
                        assigner(object, source, customizer);
                    }
                }
                return object;
            };
        }

        /**
         * Creates a function that wraps `func` and invokes it with the `this`
         * binding of `thisArg`.
         *
         * @private
         * @param {Function} func The function to bind.
         * @param {*} [thisArg] The `this` binding of `func`.
         * @returns {Function} Returns the new bound function.
         */
        function createBindWrapper(func, thisArg) {
            var Ctor = createCtorWrapper(func);

            function wrapper() {
                return (this instanceof wrapper ? Ctor : func).apply(thisArg, arguments);
            }
            return wrapper;
        }

        /**
         * Creates a `Set` cache object to optimize linear searches of large arrays.
         *
         * @private
         * @param {Array} [values] The values to cache.
         * @returns {null|Object} Returns the new cache object if `Set` is supported, else `null`.
         */
        var createCache = !(nativeCreate && Set) ? constant(null) : function (values) {
            return new SetCache(values);
        };

        /**
         * Creates a function that produces compound words out of the words in a
         * given string.
         *
         * @private
         * @param {Function} callback The function to combine each word.
         * @returns {Function} Returns the new compounder function.
         */
        function createCompounder(callback) {
            return function (string) {
                var index = -1,
                    array = words(deburr(string)),
                    length = array.length,
                    result = '';

                while (++index < length) {
                    result = callback(result, array[index], index);
                }
                return result;
            };
        }

        /**
         * Creates a function that produces an instance of `Ctor` regardless of
         * whether it was invoked as part of a `new` expression or by `call` or `apply`.
         *
         * @private
         * @param {Function} Ctor The constructor to wrap.
         * @returns {Function} Returns the new wrapped function.
         */
        function createCtorWrapper(Ctor) {
            return function () {
                var thisBinding = baseCreate(Ctor.prototype),
                    result = Ctor.apply(thisBinding, arguments);

                // Mimic the constructor's `return` behavior.
                // See http://es5.github.io/#x13.2.2.
                return isObject(result) ? result : thisBinding;
            };
        }

        /**
         * Creates a function that gets the extremum value of a collection.
         *
         * @private
         * @param {Function} arrayFunc The function to get the extremum value from an array.
         * @param {boolean} [isMin] Specify returning the minimum, instead of the maximum,
         *  extremum value.
         * @returns {Function} Returns the new extremum function.
         */
        function createExtremum(arrayFunc, isMin) {
            return function (collection, iteratee, thisArg) {
                if (thisArg && isIterateeCall(collection, iteratee, thisArg)) {
                    iteratee = null;
                }
                var func = getCallback(),
                    noIteratee = iteratee == null;

                if (!(func === baseCallback && noIteratee)) {
                    noIteratee = false;
                    iteratee = func(iteratee, thisArg, 3);
                }
                if (noIteratee) {
                    var isArr = isArray(collection);
                    if (!isArr && isString(collection)) {
                        iteratee = charAtCallback;
                    } else {
                        return arrayFunc(isArr ? collection : toIterable(collection));
                    }
                }
                return extremumBy(collection, iteratee, isMin);
            };
        }

        /**
         * Creates a function that wraps `func` and invokes it with optional `this`
         * binding of, partial application, and currying.
         *
         * @private
         * @param {Function|string} func The function or method name to reference.
         * @param {number} bitmask The bitmask of flags. See `createWrapper` for more details.
         * @param {*} [thisArg] The `this` binding of `func`.
         * @param {Array} [partials] The arguments to prepend to those provided to the new function.
         * @param {Array} [holders] The `partials` placeholder indexes.
         * @param {Array} [partialsRight] The arguments to append to those provided to the new function.
         * @param {Array} [holdersRight] The `partialsRight` placeholder indexes.
         * @param {Array} [argPos] The argument positions of the new function.
         * @param {number} [ary] The arity cap of `func`.
         * @param {number} [arity] The arity of `func`.
         * @returns {Function} Returns the new wrapped function.
         */
        function createHybridWrapper(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity) {
            var isAry = bitmask & ARY_FLAG,
                isBind = bitmask & BIND_FLAG,
                isBindKey = bitmask & BIND_KEY_FLAG,
                isCurry = bitmask & CURRY_FLAG,
                isCurryBound = bitmask & CURRY_BOUND_FLAG,
                isCurryRight = bitmask & CURRY_RIGHT_FLAG;

            var Ctor = !isBindKey && createCtorWrapper(func),
                key = func;

            function wrapper() {
                // Avoid `arguments` object use disqualifying optimizations by
                // converting it to an array before providing it to other functions.
                var length = arguments.length,
                    index = length,
                    args = Array(length);

                while (index--) {
                    args[index] = arguments[index];
                }
                if (partials) {
                    args = composeArgs(args, partials, holders);
                }
                if (partialsRight) {
                    args = composeArgsRight(args, partialsRight, holdersRight);
                }
                if (isCurry || isCurryRight) {
                    var placeholder = wrapper.placeholder,
                        argsHolders = replaceHolders(args, placeholder);

                    length -= argsHolders.length;
                    if (length < arity) {
                        var newArgPos = argPos ? arrayCopy(argPos) : null,
                            newArity = nativeMax(arity - length, 0),
                            newsHolders = isCurry ? argsHolders : null,
                            newHoldersRight = isCurry ? null : argsHolders,
                            newPartials = isCurry ? args : null,
                            newPartialsRight = isCurry ? null : args;

                        bitmask |= (isCurry ? PARTIAL_FLAG : PARTIAL_RIGHT_FLAG);
                        bitmask &= ~(isCurry ? PARTIAL_RIGHT_FLAG : PARTIAL_FLAG);

                        if (!isCurryBound) {
                            bitmask &= ~(BIND_FLAG | BIND_KEY_FLAG);
                        }
                        var result = createHybridWrapper(func, bitmask, thisArg, newPartials, newsHolders, newPartialsRight, newHoldersRight, newArgPos, ary, newArity);
                        result.placeholder = placeholder;
                        return result;
                    }
                }
                var thisBinding = isBind ? thisArg : this;
                if (isBindKey) {
                    func = thisBinding[key];
                }
                if (argPos) {
                    args = reorder(args, argPos);
                }
                if (isAry && ary < args.length) {
                    args.length = ary;
                }
                return (this instanceof wrapper ? (Ctor || createCtorWrapper(func)) : func).apply(thisBinding, args);
            }
            return wrapper;
        }

        /**
         * Creates the pad required for `string` based on the given padding length.
         * The `chars` string may be truncated if the number of padding characters
         * exceeds the padding length.
         *
         * @private
         * @param {string} string The string to create padding for.
         * @param {number} [length=0] The padding length.
         * @param {string} [chars=' '] The string used as padding.
         * @returns {string} Returns the pad for `string`.
         */
        function createPad(string, length, chars) {
            var strLength = string.length;
            length = +length;

            if (strLength >= length || !nativeIsFinite(length)) {
                return '';
            }
            var padLength = length - strLength;
            chars = chars == null ? ' ' : baseToString(chars);
            return repeat(chars, ceil(padLength / chars.length)).slice(0, padLength);
        }

        /**
         * Creates a function that wraps `func` and invokes it with the optional `this`
         * binding of `thisArg` and the `partials` prepended to those provided to
         * the wrapper.
         *
         * @private
         * @param {Function} func The function to partially apply arguments to.
         * @param {number} bitmask The bitmask of flags. See `createWrapper` for more details.
         * @param {*} thisArg The `this` binding of `func`.
         * @param {Array} partials The arguments to prepend to those provided to the new function.
         * @returns {Function} Returns the new bound function.
         */
        function createPartialWrapper(func, bitmask, thisArg, partials) {
            var isBind = bitmask & BIND_FLAG,
                Ctor = createCtorWrapper(func);

            function wrapper() {
                // Avoid `arguments` object use disqualifying optimizations by
                // converting it to an array before providing it `func`.
                var argsIndex = -1,
                    argsLength = arguments.length,
                    leftIndex = -1,
                    leftLength = partials.length,
                    args = Array(argsLength + leftLength);

                while (++leftIndex < leftLength) {
                    args[leftIndex] = partials[leftIndex];
                }
                while (argsLength--) {
                    args[leftIndex++] = arguments[++argsIndex];
                }
                return (this instanceof wrapper ? Ctor : func).apply(isBind ? thisArg : this, args);
            }
            return wrapper;
        }

        /**
         * Creates a function that either curries or invokes `func` with optional
         * `this` binding and partially applied arguments.
         *
         * @private
         * @param {Function|string} func The function or method name to reference.
         * @param {number} bitmask The bitmask of flags.
         *  The bitmask may be composed of the following flags:
         *     1 - `_.bind`
         *     2 - `_.bindKey`
         *     4 - `_.curry` or `_.curryRight` of a bound function
         *     8 - `_.curry`
         *    16 - `_.curryRight`
         *    32 - `_.partial`
         *    64 - `_.partialRight`
         *   128 - `_.rearg`
         *   256 - `_.ary`
         * @param {*} [thisArg] The `this` binding of `func`.
         * @param {Array} [partials] The arguments to be partially applied.
         * @param {Array} [holders] The `partials` placeholder indexes.
         * @param {Array} [argPos] The argument positions of the new function.
         * @param {number} [ary] The arity cap of `func`.
         * @param {number} [arity] The arity of `func`.
         * @returns {Function} Returns the new wrapped function.
         */
        function createWrapper(func, bitmask, thisArg, partials, holders, argPos, ary, arity) {
            var isBindKey = bitmask & BIND_KEY_FLAG;
            if (!isBindKey && !isFunction(func)) {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            var length = partials ? partials.length : 0;
            if (!length) {
                bitmask &= ~(PARTIAL_FLAG | PARTIAL_RIGHT_FLAG);
                partials = holders = null;
            }
            length -= (holders ? holders.length : 0);
            if (bitmask & PARTIAL_RIGHT_FLAG) {
                var partialsRight = partials,
                    holdersRight = holders;

                partials = holders = null;
            }
            var data = !isBindKey && getData(func),
                newData = [func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity];

            if (data && data !== true) {
                mergeData(newData, data);
                bitmask = newData[1];
                arity = newData[9];
            }
            newData[9] = arity == null
              ? (isBindKey ? 0 : func.length)
              : (nativeMax(arity - length, 0) || 0);

            if (bitmask == BIND_FLAG) {
                var result = createBindWrapper(newData[0], newData[2]);
            } else if ((bitmask == PARTIAL_FLAG || bitmask == (BIND_FLAG | PARTIAL_FLAG)) && !newData[4].length) {
                result = createPartialWrapper.apply(null, newData);
            } else {
                result = createHybridWrapper.apply(null, newData);
            }
            var setter = data ? baseSetData : setData;
            return setter(result, newData);
        }

        /**
         * A specialized version of `baseIsEqualDeep` for arrays with support for
         * partial deep comparisons.
         *
         * @private
         * @param {Array} array The array to compare.
         * @param {Array} other The other array to compare.
         * @param {Function} equalFunc The function to determine equivalents of values.
         * @param {Function} [customizer] The function to customize comparing arrays.
         * @param {boolean} [isWhere] Specify performing partial comparisons.
         * @param {Array} [stackA] Tracks traversed `value` objects.
         * @param {Array} [stackB] Tracks traversed `other` objects.
         * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
         */
        function equalArrays(array, other, equalFunc, customizer, isWhere, stackA, stackB) {
            var index = -1,
                arrLength = array.length,
                othLength = other.length,
                result = true;

            if (arrLength != othLength && !(isWhere && othLength > arrLength)) {
                return false;
            }
            // Deep compare the contents, ignoring non-numeric properties.
            while (result && ++index < arrLength) {
                var arrValue = array[index],
                    othValue = other[index];

                result = undefined;
                if (customizer) {
                    result = isWhere
                      ? customizer(othValue, arrValue, index)
                      : customizer(arrValue, othValue, index);
                }
                if (typeof result == 'undefined') {
                    // Recursively compare arrays (susceptible to call stack limits).
                    if (isWhere) {
                        var othIndex = othLength;
                        while (othIndex--) {
                            othValue = other[othIndex];
                            result = (arrValue && arrValue === othValue) || equalFunc(arrValue, othValue, customizer, isWhere, stackA, stackB);
                            if (result) {
                                break;
                            }
                        }
                    } else {
                        result = (arrValue && arrValue === othValue) || equalFunc(arrValue, othValue, customizer, isWhere, stackA, stackB);
                    }
                }
            }
            return !!result;
        }

        /**
         * A specialized version of `baseIsEqualDeep` for comparing objects of
         * the same `toStringTag`.
         *
         * **Note:** This function only supports comparing values with tags of
         * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
         *
         * @private
         * @param {Object} value The object to compare.
         * @param {Object} other The other object to compare.
         * @param {string} tag The `toStringTag` of the objects to compare.
         * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
         */
        function equalByTag(object, other, tag) {
            switch (tag) {
                case boolTag:
                case dateTag:
                    // Coerce dates and booleans to numbers, dates to milliseconds and booleans
                    // to `1` or `0` treating invalid dates coerced to `NaN` as not equal.
                    return +object == +other;

                case errorTag:
                    return object.name == other.name && object.message == other.message;

                case numberTag:
                    // Treat `NaN` vs. `NaN` as equal.
                    return (object != +object)
                      ? other != +other
                      // But, treat `-0` vs. `+0` as not equal.
                      : (object == 0 ? ((1 / object) == (1 / other)) : object == +other);

                case regexpTag:
                case stringTag:
                    // Coerce regexes to strings (http://es5.github.io/#x15.10.6.4) and
                    // treat strings primitives and string objects as equal.
                    return object == baseToString(other);
            }
            return false;
        }

        /**
         * A specialized version of `baseIsEqualDeep` for objects with support for
         * partial deep comparisons.
         *
         * @private
         * @param {Object} object The object to compare.
         * @param {Object} other The other object to compare.
         * @param {Function} equalFunc The function to determine equivalents of values.
         * @param {Function} [customizer] The function to customize comparing values.
         * @param {boolean} [isWhere] Specify performing partial comparisons.
         * @param {Array} [stackA] Tracks traversed `value` objects.
         * @param {Array} [stackB] Tracks traversed `other` objects.
         * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
         */
        function equalObjects(object, other, equalFunc, customizer, isWhere, stackA, stackB) {
            var objProps = keys(object),
                objLength = objProps.length,
                othProps = keys(other),
                othLength = othProps.length;

            if (objLength != othLength && !isWhere) {
                return false;
            }
            var hasCtor,
                index = -1;

            while (++index < objLength) {
                var key = objProps[index],
                    result = hasOwnProperty.call(other, key);

                if (result) {
                    var objValue = object[key],
                        othValue = other[key];

                    result = undefined;
                    if (customizer) {
                        result = isWhere
                          ? customizer(othValue, objValue, key)
                          : customizer(objValue, othValue, key);
                    }
                    if (typeof result == 'undefined') {
                        // Recursively compare objects (susceptible to call stack limits).
                        result = (objValue && objValue === othValue) || equalFunc(objValue, othValue, customizer, isWhere, stackA, stackB);
                    }
                }
                if (!result) {
                    return false;
                }
                hasCtor || (hasCtor = key == 'constructor');
            }
            if (!hasCtor) {
                var objCtor = object.constructor,
                    othCtor = other.constructor;

                // Non `Object` object instances with different constructors are not equal.
                if (objCtor != othCtor && ('constructor' in object && 'constructor' in other) &&
                    !(typeof objCtor == 'function' && objCtor instanceof objCtor && typeof othCtor == 'function' && othCtor instanceof othCtor)) {
                    return false;
                }
            }
            return true;
        }

        /**
         * Gets the extremum value of `collection` invoking `iteratee` for each value
         * in `collection` to generate the criterion by which the value is ranked.
         * The `iteratee` is invoked with three arguments; (value, index, collection).
         *
         * @private
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} iteratee The function invoked per iteration.
         * @param {boolean} [isMin] Specify returning the minimum, instead of the
         *  maximum, extremum value.
         * @returns {*} Returns the extremum value.
         */
        function extremumBy(collection, iteratee, isMin) {
            var exValue = isMin ? POSITIVE_INFINITY : NEGATIVE_INFINITY,
                computed = exValue,
                result = computed;

            baseEach(collection, function (value, index, collection) {
                var current = iteratee(value, index, collection);
                if ((isMin ? current < computed : current > computed) || (current === exValue && current === result)) {
                    computed = current;
                    result = value;
                }
            });
            return result;
        }

        /**
         * Gets the appropriate "callback" function. If the `_.callback` method is
         * customized this function returns the custom method, otherwise it returns
         * the `baseCallback` function. If arguments are provided the chosen function
         * is invoked with them and its result is returned.
         *
         * @private
         * @returns {Function} Returns the chosen function or its result.
         */
        function getCallback(func, thisArg, argCount) {
            var result = lodash.callback || callback;
            result = result === callback ? baseCallback : result;
            return argCount ? result(func, thisArg, argCount) : result;
        }

        /**
         * Gets metadata for `func`.
         *
         * @private
         * @param {Function} func The function to query.
         * @returns {*} Returns the metadata for `func`.
         */
        var getData = !metaMap ? noop : function (func) {
            return metaMap.get(func);
        };

        /**
         * Gets the appropriate "indexOf" function. If the `_.indexOf` method is
         * customized this function returns the custom method, otherwise it returns
         * the `baseIndexOf` function. If arguments are provided the chosen function
         * is invoked with them and its result is returned.
         *
         * @private
         * @returns {Function|number} Returns the chosen function or its result.
         */
        function getIndexOf(collection, target, fromIndex) {
            var result = lodash.indexOf || indexOf;
            result = result === indexOf ? baseIndexOf : result;
            return collection ? result(collection, target, fromIndex) : result;
        }

        /**
         * Gets the view, applying any `transforms` to the `start` and `end` positions.
         *
         * @private
         * @param {number} start The start of the view.
         * @param {number} end The end of the view.
         * @param {Array} [transforms] The transformations to apply to the view.
         * @returns {Object} Returns an object containing the `start` and `end`
         *  positions of the view.
         */
        function getView(start, end, transforms) {
            var index = -1,
                length = transforms ? transforms.length : 0;

            while (++index < length) {
                var data = transforms[index],
                    size = data.size;

                switch (data.type) {
                    case 'drop': start += size; break;
                    case 'dropRight': end -= size; break;
                    case 'take': end = nativeMin(end, start + size); break;
                    case 'takeRight': start = nativeMax(start, end - size); break;
                }
            }
            return { 'start': start, 'end': end };
        }

        /**
         * Initializes an array clone.
         *
         * @private
         * @param {Array} array The array to clone.
         * @returns {Array} Returns the initialized clone.
         */
        function initCloneArray(array) {
            var length = array.length,
                result = new array.constructor(length);

            // Add array properties assigned by `RegExp#exec`.
            if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
                result.index = array.index;
                result.input = array.input;
            }
            return result;
        }

        /**
         * Initializes an object clone.
         *
         * @private
         * @param {Object} object The object to clone.
         * @returns {Object} Returns the initialized clone.
         */
        function initCloneObject(object) {
            var Ctor = object.constructor;
            if (!(typeof Ctor == 'function' && Ctor instanceof Ctor)) {
                Ctor = Object;
            }
            return new Ctor;
        }

        /**
         * Initializes an object clone based on its `toStringTag`.
         *
         * **Note:** This function only supports cloning values with tags of
         * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
         *
         *
         * @private
         * @param {Object} object The object to clone.
         * @param {string} tag The `toStringTag` of the object to clone.
         * @param {boolean} [isDeep] Specify a deep clone.
         * @returns {Object} Returns the initialized clone.
         */
        function initCloneByTag(object, tag, isDeep) {
            var Ctor = object.constructor;
            switch (tag) {
                case arrayBufferTag:
                    return bufferClone(object);

                case boolTag:
                case dateTag:
                    return new Ctor(+object);

                case float32Tag: case float64Tag:
                case int8Tag: case int16Tag: case int32Tag:
                case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
                    var buffer = object.buffer;
                    return new Ctor(isDeep ? bufferClone(buffer) : buffer, object.byteOffset, object.length);

                case numberTag:
                case stringTag:
                    return new Ctor(object);

                case regexpTag:
                    var result = new Ctor(object.source, reFlags.exec(object));
                    result.lastIndex = object.lastIndex;
            }
            return result;
        }

        /**
         * Checks if `func` is eligible for `this` binding.
         *
         * @private
         * @param {Function} func The function to check.
         * @returns {boolean} Returns `true` if `func` is eligible, else `false`.
         */
        function isBindable(func) {
            var support = lodash.support,
                result = !(support.funcNames ? func.name : support.funcDecomp);

            if (!result) {
                var source = fnToString.call(func);
                if (!support.funcNames) {
                    result = !reFuncName.test(source);
                }
                if (!result) {
                    // Check if `func` references the `this` keyword and store the result.
                    result = reThis.test(source) || isNative(func);
                    baseSetData(func, result);
                }
            }
            return result;
        }

        /**
         * Checks if `value` is a valid array-like index.
         *
         * @private
         * @param {*} value The value to check.
         * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
         * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
         */
        function isIndex(value, length) {
            value = +value;
            length = length == null ? MAX_SAFE_INTEGER : length;
            return value > -1 && value % 1 == 0 && value < length;
        }

        /**
         * Checks if the provided arguments are from an iteratee call.
         *
         * @private
         * @param {*} value The potential iteratee value argument.
         * @param {*} index The potential iteratee index or key argument.
         * @param {*} object The potential iteratee object argument.
         * @returns {boolean} Returns `true` if the arguments are from an iteratee call, else `false`.
         */
        function isIterateeCall(value, index, object) {
            if (!isObject(object)) {
                return false;
            }
            var type = typeof index;
            if (type == 'number') {
                var length = object.length,
                    prereq = isLength(length) && isIndex(index, length);
            } else {
                prereq = type == 'string' && index in value;
            }
            return prereq && object[index] === value;
        }

        /**
         * Checks if `value` is a valid array-like length.
         *
         * @private
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
         */
        function isLength(value) {
            return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
        }

        /**
         * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
         *
         * @private
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` if suitable for strict
         *  equality comparisons, else `false`.
         */
        function isStrictComparable(value) {
            return value === value && (value === 0 ? ((1 / value) > 0) : !isObject(value));
        }

        /**
         * Merges the function metadata of `source` into `data`.
         *
         * Merging metadata reduces the number of wrappers required to invoke a function.
         * This is possible because methods like `_.bind`, `_.curry`, and `_.partial`
         * may be applied regardless of execution order. Methods like `_.ary` and `_.rearg`
         * augment function arguments, making the order in which they are executed important,
         * preventing the merging of metadata. However, we make an exception for a safe
         * common case where curried functions have `_.ary` and or `_.rearg` applied.
         *
         * @private
         * @param {Array} data The destination metadata.
         * @param {Array} source The source metadata.
         * @returns {Array} Returns `data`.
         */
        function mergeData(data, source) {
            var bitmask = data[1],
                srcBitmask = source[1],
                newBitmask = bitmask | srcBitmask;

            var arityFlags = ARY_FLAG | REARG_FLAG,
                bindFlags = BIND_FLAG | BIND_KEY_FLAG,
                comboFlags = arityFlags | bindFlags | CURRY_BOUND_FLAG | CURRY_RIGHT_FLAG;

            var isAry = bitmask & ARY_FLAG && !(srcBitmask & ARY_FLAG),
                isRearg = bitmask & REARG_FLAG && !(srcBitmask & REARG_FLAG),
                argPos = (isRearg ? data : source)[7],
                ary = (isAry ? data : source)[8];

            var isCommon = !(bitmask >= REARG_FLAG && srcBitmask > bindFlags) &&
              !(bitmask > bindFlags && srcBitmask >= REARG_FLAG);

            var isCombo = (newBitmask >= arityFlags && newBitmask <= comboFlags) &&
              (bitmask < REARG_FLAG || ((isRearg || isAry) && argPos.length <= ary));

            // Exit early if metadata can't be merged.
            if (!(isCommon || isCombo)) {
                return data;
            }
            // Use source `thisArg` if available.
            if (srcBitmask & BIND_FLAG) {
                data[2] = source[2];
                // Set when currying a bound function.
                newBitmask |= (bitmask & BIND_FLAG) ? 0 : CURRY_BOUND_FLAG;
            }
            // Compose partial arguments.
            var value = source[3];
            if (value) {
                var partials = data[3];
                data[3] = partials ? composeArgs(partials, value, source[4]) : arrayCopy(value);
                data[4] = partials ? replaceHolders(data[3], PLACEHOLDER) : arrayCopy(source[4]);
            }
            // Compose partial right arguments.
            value = source[5];
            if (value) {
                partials = data[5];
                data[5] = partials ? composeArgsRight(partials, value, source[6]) : arrayCopy(value);
                data[6] = partials ? replaceHolders(data[5], PLACEHOLDER) : arrayCopy(source[6]);
            }
            // Use source `argPos` if available.
            value = source[7];
            if (value) {
                data[7] = arrayCopy(value);
            }
            // Use source `ary` if it's smaller.
            if (srcBitmask & ARY_FLAG) {
                data[8] = data[8] == null ? source[8] : nativeMin(data[8], source[8]);
            }
            // Use source `arity` if one is not provided.
            if (data[9] == null) {
                data[9] = source[9];
            }
            // Use source `func` and merge bitmasks.
            data[0] = source[0];
            data[1] = newBitmask;

            return data;
        }

        /**
         * A specialized version of `_.pick` that picks `object` properties specified
         * by the `props` array.
         *
         * @private
         * @param {Object} object The source object.
         * @param {string[]} props The property names to pick.
         * @returns {Object} Returns the new object.
         */
        function pickByArray(object, props) {
            object = toObject(object);

            var index = -1,
                length = props.length,
                result = {};

            while (++index < length) {
                var key = props[index];
                if (key in object) {
                    result[key] = object[key];
                }
            }
            return result;
        }

        /**
         * A specialized version of `_.pick` that picks `object` properties `predicate`
         * returns truthy for.
         *
         * @private
         * @param {Object} object The source object.
         * @param {Function} predicate The function invoked per iteration.
         * @returns {Object} Returns the new object.
         */
        function pickByCallback(object, predicate) {
            var result = {};
            baseForIn(object, function (value, key, object) {
                if (predicate(value, key, object)) {
                    result[key] = value;
                }
            });
            return result;
        }

        /**
         * Reorder `array` according to the specified indexes where the element at
         * the first index is assigned as the first element, the element at
         * the second index is assigned as the second element, and so on.
         *
         * @private
         * @param {Array} array The array to reorder.
         * @param {Array} indexes The arranged array indexes.
         * @returns {Array} Returns `array`.
         */
        function reorder(array, indexes) {
            var arrLength = array.length,
                length = nativeMin(indexes.length, arrLength),
                oldArray = arrayCopy(array);

            while (length--) {
                var index = indexes[length];
                array[length] = isIndex(index, arrLength) ? oldArray[index] : undefined;
            }
            return array;
        }

        /**
         * Sets metadata for `func`.
         *
         * **Note:** If this function becomes hot, i.e. is invoked a lot in a short
         * period of time, it will trip its breaker and transition to an identity function
         * to avoid garbage collection pauses in V8. See https://code.google.com/p/v8/issues/detail?id=2070.
         *
         * @private
         * @param {Function} func The function to associate metadata with.
         * @param {*} data The metadata.
         * @returns {Function} Returns `func`.
         */
        var setData = (function () {
            var count = 0,
                lastCalled = 0;

            return function (key, value) {
                var stamp = now(),
                    remaining = HOT_SPAN - (stamp - lastCalled);

                lastCalled = stamp;
                if (remaining > 0) {
                    if (++count >= HOT_COUNT) {
                        return key;
                    }
                } else {
                    count = 0;
                }
                return baseSetData(key, value);
            };
        }());

        /**
         * A fallback implementation of `_.isPlainObject` which checks if `value`
         * is an object created by the `Object` constructor or has a `[[Prototype]]`
         * of `null`.
         *
         * @private
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
         */
        function shimIsPlainObject(value) {
            var Ctor,
                support = lodash.support;

            // Exit early for non `Object` objects.
            if (!(isObjectLike(value) && objToString.call(value) == objectTag) ||
                (!hasOwnProperty.call(value, 'constructor') &&
                  (Ctor = value.constructor, typeof Ctor == 'function' && !(Ctor instanceof Ctor)))) {
                return false;
            }
            // IE < 9 iterates inherited properties before own properties. If the first
            // iterated property is an object's own property then there are no inherited
            // enumerable properties.
            var result;
            // In most environments an object's own properties are iterated before
            // its inherited properties. If the last iterated property is an object's
            // own property then there are no inherited enumerable properties.
            baseForIn(value, function (subValue, key) {
                result = key;
            });
            return typeof result == 'undefined' || hasOwnProperty.call(value, result);
        }

        /**
         * A fallback implementation of `Object.keys` which creates an array of the
         * own enumerable property names of `object`.
         *
         * @private
         * @param {Object} object The object to inspect.
         * @returns {Array} Returns the array of property names.
         */
        function shimKeys(object) {
            var props = keysIn(object),
                propsLength = props.length,
                length = propsLength && object.length,
                support = lodash.support;

            var allowIndexes = length && isLength(length) &&
              (isArray(object) || (support.nonEnumArgs && isArguments(object)));

            var index = -1,
                result = [];

            while (++index < propsLength) {
                var key = props[index];
                if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
                    result.push(key);
                }
            }
            return result;
        }

        /**
         * Converts `value` to an array-like object if it is not one.
         *
         * @private
         * @param {*} value The value to process.
         * @returns {Array|Object} Returns the array-like object.
         */
        function toIterable(value) {
            if (value == null) {
                return [];
            }
            if (!isLength(value.length)) {
                return values(value);
            }
            return isObject(value) ? value : Object(value);
        }

        /**
         * Converts `value` to an object if it is not one.
         *
         * @private
         * @param {*} value The value to process.
         * @returns {Object} Returns the object.
         */
        function toObject(value) {
            return isObject(value) ? value : Object(value);
        }

        /*------------------------------------------------------------------------*/

        /**
         * Creates an array of elements split into groups the length of `size`.
         * If `collection` can't be split evenly, the final chunk will be the remaining
         * elements.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to process.
         * @param {numer} [size=1] The length of each chunk.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Array} Returns the new array containing chunks.
         * @example
         *
         * _.chunk(['a', 'b', 'c', 'd'], 2);
         * // => [['a', 'b'], ['c', 'd']]
         *
         * _.chunk(['a', 'b', 'c', 'd'], 3);
         * // => [['a', 'b', 'c'], ['d']]
         */
        function chunk(array, size, guard) {
            if (guard ? isIterateeCall(array, size, guard) : size == null) {
                size = 1;
            } else {
                size = nativeMax(+size || 1, 1);
            }
            var index = 0,
                length = array ? array.length : 0,
                resIndex = -1,
                result = Array(ceil(length / size));

            while (index < length) {
                result[++resIndex] = baseSlice(array, index, (index += size));
            }
            return result;
        }

        /**
         * Creates an array with all falsey values removed. The values `false`, `null`,
         * `0`, `""`, `undefined`, and `NaN` are falsey.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to compact.
         * @returns {Array} Returns the new array of filtered values.
         * @example
         *
         * _.compact([0, 1, false, 2, '', 3]);
         * // => [1, 2, 3]
         */
        function compact(array) {
            var index = -1,
                length = array ? array.length : 0,
                resIndex = -1,
                result = [];

            while (++index < length) {
                var value = array[index];
                if (value) {
                    result[++resIndex] = value;
                }
            }
            return result;
        }

        /**
         * Creates an array excluding all values of the provided arrays using
         * `SameValueZero` for equality comparisons.
         *
         * **Note:** `SameValueZero` comparisons are like strict equality comparisons,
         * e.g. `===`, except that `NaN` matches `NaN`. See the
         * [ES6 spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         * for more details.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to inspect.
         * @param {...Array} [values] The arrays of values to exclude.
         * @returns {Array} Returns the new array of filtered values.
         * @example
         *
         * _.difference([1, 2, 3], [5, 2, 10]);
         * // => [1, 3]
         */
        function difference() {
            var index = -1,
                length = arguments.length;

            while (++index < length) {
                var value = arguments[index];
                if (isArray(value) || isArguments(value)) {
                    break;
                }
            }
            return baseDifference(value, baseFlatten(arguments, false, true, ++index));
        }

        /**
         * Creates a slice of `array` with `n` elements dropped from the beginning.
         *
         * @static
         * @memberOf _
         * @type Function
         * @category Array
         * @param {Array} array The array to query.
         * @param {number} [n=1] The number of elements to drop.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.drop([1, 2, 3]);
         * // => [2, 3]
         *
         * _.drop([1, 2, 3], 2);
         * // => [3]
         *
         * _.drop([1, 2, 3], 5);
         * // => []
         *
         * _.drop([1, 2, 3], 0);
         * // => [1, 2, 3]
         */
        function drop(array, n, guard) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (guard ? isIterateeCall(array, n, guard) : n == null) {
                n = 1;
            }
            return baseSlice(array, n < 0 ? 0 : n);
        }

        /**
         * Creates a slice of `array` with `n` elements dropped from the end.
         *
         * @static
         * @memberOf _
         * @type Function
         * @category Array
         * @param {Array} array The array to query.
         * @param {number} [n=1] The number of elements to drop.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.dropRight([1, 2, 3]);
         * // => [1, 2]
         *
         * _.dropRight([1, 2, 3], 2);
         * // => [1]
         *
         * _.dropRight([1, 2, 3], 5);
         * // => []
         *
         * _.dropRight([1, 2, 3], 0);
         * // => [1, 2, 3]
         */
        function dropRight(array, n, guard) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (guard ? isIterateeCall(array, n, guard) : n == null) {
                n = 1;
            }
            n = length - (+n || 0);
            return baseSlice(array, 0, n < 0 ? 0 : n);
        }

        /**
         * Creates a slice of `array` excluding elements dropped from the end.
         * Elements are dropped until `predicate` returns falsey. The predicate is
         * bound to `thisArg` and invoked with three arguments; (value, index, array).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @type Function
         * @category Array
         * @param {Array} array The array to query.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per element.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.dropRightWhile([1, 2, 3], function(n) { return n > 1; });
         * // => [1]
         *
         * var users = [
         *   { 'user': 'barney',  'status': 'busy', 'active': false },
         *   { 'user': 'fred',    'status': 'busy', 'active': true },
         *   { 'user': 'pebbles', 'status': 'away', 'active': true }
         * ];
         *
         * // using the "_.property" callback shorthand
         * _.pluck(_.dropRightWhile(users, 'active'), 'user');
         * // => ['barney']
         *
         * // using the "_.matches" callback shorthand
         * _.pluck(_.dropRightWhile(users, { 'status': 'away' }), 'user');
         * // => ['barney', 'fred']
         */
        function dropRightWhile(array, predicate, thisArg) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            predicate = getCallback(predicate, thisArg, 3);
            while (length-- && predicate(array[length], length, array)) { }
            return baseSlice(array, 0, length + 1);
        }

        /**
         * Creates a slice of `array` excluding elements dropped from the beginning.
         * Elements are dropped until `predicate` returns falsey. The predicate is
         * bound to `thisArg` and invoked with three arguments; (value, index, array).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @type Function
         * @category Array
         * @param {Array} array The array to query.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per element.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.dropWhile([1, 2, 3], function(n) { return n < 3; });
         * // => [3]
         *
         * var users = [
         *   { 'user': 'barney',  'status': 'busy', 'active': true },
         *   { 'user': 'fred',    'status': 'busy', 'active': false },
         *   { 'user': 'pebbles', 'status': 'away', 'active': true }
         * ];
         *
         * // using the "_.property" callback shorthand
         * _.pluck(_.dropWhile(users, 'active'), 'user');
         * // => ['fred', 'pebbles']
         *
         * // using the "_.matches" callback shorthand
         * _.pluck(_.dropWhile(users, { 'status': 'busy' }), 'user');
         * // => ['pebbles']
         */
        function dropWhile(array, predicate, thisArg) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            var index = -1;
            predicate = getCallback(predicate, thisArg, 3);
            while (++index < length && predicate(array[index], index, array)) { }
            return baseSlice(array, index);
        }

        /**
         * This method is like `_.find` except that it returns the index of the first
         * element `predicate` returns truthy for, instead of the element itself.
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to search.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {number} Returns the index of the found element, else `-1`.
         * @example
         *
         * var users = [
         *   { 'user': 'barney',  'age': 36, 'active': false },
         *   { 'user': 'fred',    'age': 40, 'active': true },
         *   { 'user': 'pebbles', 'age': 1,  'active': false }
         * ];
         *
         * _.findIndex(users, function(chr) { return chr.age < 40; });
         * // => 0
         *
         * // using the "_.matches" callback shorthand
         * _.findIndex(users, { 'age': 1 });
         * // => 2
         *
         * // using the "_.property" callback shorthand
         * _.findIndex(users, 'active');
         * // => 1
         */
        function findIndex(array, predicate, thisArg) {
            var index = -1,
                length = array ? array.length : 0;

            predicate = getCallback(predicate, thisArg, 3);
            while (++index < length) {
                if (predicate(array[index], index, array)) {
                    return index;
                }
            }
            return -1;
        }

        /**
         * This method is like `_.findIndex` except that it iterates over elements
         * of `collection` from right to left.
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to search.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {number} Returns the index of the found element, else `-1`.
         * @example
         *
         * var users = [
         *   { 'user': 'barney',  'age': 36, 'active': true },
         *   { 'user': 'fred',    'age': 40, 'active': false },
         *   { 'user': 'pebbles', 'age': 1,  'active': false }
         * ];
         *
         * _.findLastIndex(users, function(chr) { return chr.age < 40; });
         * // => 2
         *
         * // using the "_.matches" callback shorthand
         * _.findLastIndex(users, { 'age': 40 });
         * // => 1
         *
         * // using the "_.property" callback shorthand
         * _.findLastIndex(users, 'active');
         * // => 0
         */
        function findLastIndex(array, predicate, thisArg) {
            var length = array ? array.length : 0;
            predicate = getCallback(predicate, thisArg, 3);
            while (length--) {
                if (predicate(array[length], length, array)) {
                    return length;
                }
            }
            return -1;
        }

        /**
         * Gets the first element of `array`.
         *
         * @static
         * @memberOf _
         * @alias head
         * @category Array
         * @param {Array} array The array to query.
         * @returns {*} Returns the first element of `array`.
         * @example
         *
         * _.first([1, 2, 3]);
         * // => 1
         *
         * _.first([]);
         * // => undefined
         */
        function first(array) {
            return array ? array[0] : undefined;
        }

        /**
         * Flattens a nested array. If `isDeep` is `true` the array is recursively
         * flattened, otherwise it is only flattened a single level.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to flatten.
         * @param {boolean} [isDeep] Specify a deep flatten.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Array} Returns the new flattened array.
         * @example
         *
         * _.flatten([1, [2], [3, [[4]]]]);
         * // => [1, 2, 3, [[4]]];
         *
         * // using `isDeep`
         * _.flatten([1, [2], [3, [[4]]]], true);
         * // => [1, 2, 3, 4];
         */
        function flatten(array, isDeep, guard) {
            var length = array ? array.length : 0;
            if (guard && isIterateeCall(array, isDeep, guard)) {
                isDeep = false;
            }
            return length ? baseFlatten(array, isDeep) : [];
        }

        /**
         * Recursively flattens a nested array.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to recursively flatten.
         * @returns {Array} Returns the new flattened array.
         * @example
         *
         * _.flattenDeep([1, [2], [3, [[4]]]]);
         * // => [1, 2, 3, 4];
         */
        function flattenDeep(array) {
            var length = array ? array.length : 0;
            return length ? baseFlatten(array, true) : [];
        }

        /**
         * Gets the index at which the first occurrence of `value` is found in `array`
         * using `SameValueZero` for equality comparisons. If `fromIndex` is negative,
         * it is used as the offset from the end of `array`. If `array` is sorted
         * providing `true` for `fromIndex` performs a faster binary search.
         *
         * **Note:** `SameValueZero` comparisons are like strict equality comparisons,
         * e.g. `===`, except that `NaN` matches `NaN`. See the
         * [ES6 spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         * for more details.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to search.
         * @param {*} value The value to search for.
         * @param {boolean|number} [fromIndex=0] The index to search from or `true`
         *  to perform a binary search on a sorted array.
         * @returns {number} Returns the index of the matched value, else `-1`.
         * @example
         *
         * _.indexOf([1, 2, 3, 1, 2, 3], 2);
         * // => 1
         *
         * // using `fromIndex`
         * _.indexOf([1, 2, 3, 1, 2, 3], 2, 3);
         * // => 4
         *
         * // performing a binary search
         * _.indexOf([4, 4, 5, 5, 6, 6], 5, true);
         * // => 2
         */
        function indexOf(array, value, fromIndex) {
            var length = array ? array.length : 0;
            if (!length) {
                return -1;
            }
            if (typeof fromIndex == 'number') {
                fromIndex = fromIndex < 0 ? nativeMax(length + fromIndex, 0) : (fromIndex || 0);
            } else if (fromIndex) {
                var index = binaryIndex(array, value),
                    other = array[index];

                return (value === value ? value === other : other !== other) ? index : -1;
            }
            return baseIndexOf(array, value, fromIndex);
        }

        /**
         * Gets all but the last element of `array`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to query.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.initial([1, 2, 3]);
         * // => [1, 2]
         */
        function initial(array) {
            return dropRight(array, 1);
        }

        /**
         * Creates an array of unique values in all provided arrays using `SameValueZero`
         * for equality comparisons.
         *
         * **Note:** `SameValueZero` comparisons are like strict equality comparisons,
         * e.g. `===`, except that `NaN` matches `NaN`. See the
         * [ES6 spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         * for more details.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {...Array} [arrays] The arrays to inspect.
         * @returns {Array} Returns the new array of shared values.
         * @example
         *
         * _.intersection([1, 2, 3], [5, 2, 1, 4], [2, 1]);
         * // => [1, 2]
         */
        function intersection() {
            var args = [],
                argsIndex = -1,
                argsLength = arguments.length,
                caches = [],
                indexOf = getIndexOf(),
                isCommon = indexOf == baseIndexOf;

            while (++argsIndex < argsLength) {
                var value = arguments[argsIndex];
                if (isArray(value) || isArguments(value)) {
                    args.push(value);
                    caches.push(isCommon && value.length >= 120 && createCache(argsIndex && value));
                }
            }
            argsLength = args.length;
            var array = args[0],
                index = -1,
                length = array ? array.length : 0,
                result = [],
                seen = caches[0];

            outer:
                while (++index < length) {
                    value = array[index];
                    if ((seen ? cacheIndexOf(seen, value) : indexOf(result, value)) < 0) {
                        argsIndex = argsLength;
                        while (--argsIndex) {
                            var cache = caches[argsIndex];
                            if ((cache ? cacheIndexOf(cache, value) : indexOf(args[argsIndex], value)) < 0) {
                                continue outer;
                            }
                        }
                        if (seen) {
                            seen.push(value);
                        }
                        result.push(value);
                    }
                }
            return result;
        }

        /**
         * Gets the last element of `array`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to query.
         * @returns {*} Returns the last element of `array`.
         * @example
         *
         * _.last([1, 2, 3]);
         * // => 3
         */
        function last(array) {
            var length = array ? array.length : 0;
            return length ? array[length - 1] : undefined;
        }

        /**
         * This method is like `_.indexOf` except that it iterates over elements of
         * `array` from right to left.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to search.
         * @param {*} value The value to search for.
         * @param {boolean|number} [fromIndex=array.length-1] The index to search from
         *  or `true` to perform a binary search on a sorted array.
         * @returns {number} Returns the index of the matched value, else `-1`.
         * @example
         *
         * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2);
         * // => 4
         *
         * // using `fromIndex`
         * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2, 3);
         * // => 1
         *
         * // performing a binary search
         * _.lastIndexOf([4, 4, 5, 5, 6, 6], 5, true);
         * // => 3
         */
        function lastIndexOf(array, value, fromIndex) {
            var length = array ? array.length : 0;
            if (!length) {
                return -1;
            }
            var index = length;
            if (typeof fromIndex == 'number') {
                index = (fromIndex < 0 ? nativeMax(length + fromIndex, 0) : nativeMin(fromIndex || 0, length - 1)) + 1;
            } else if (fromIndex) {
                index = binaryIndex(array, value, true) - 1;
                var other = array[index];
                return (value === value ? value === other : other !== other) ? index : -1;
            }
            if (value !== value) {
                return indexOfNaN(array, index, true);
            }
            while (index--) {
                if (array[index] === value) {
                    return index;
                }
            }
            return -1;
        }

        /**
         * Removes all provided values from `array` using `SameValueZero` for equality
         * comparisons.
         *
         * **Notes:**
         *  - Unlike `_.without`, this method mutates `array`.
         *  - `SameValueZero` comparisons are like strict equality comparisons, e.g. `===`,
         *    except that `NaN` matches `NaN`. See the [ES6 spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         *    for more details.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to modify.
         * @param {...*} [values] The values to remove.
         * @returns {Array} Returns `array`.
         * @example
         *
         * var array = [1, 2, 3, 1, 2, 3];
         * _.pull(array, 2, 3);
         * console.log(array);
         * // => [1, 1]
         */
        function pull() {
            var array = arguments[0];
            if (!(array && array.length)) {
                return array;
            }
            var index = 0,
                indexOf = getIndexOf(),
                length = arguments.length;

            while (++index < length) {
                var fromIndex = 0,
                    value = arguments[index];

                while ((fromIndex = indexOf(array, value, fromIndex)) > -1) {
                    splice.call(array, fromIndex, 1);
                }
            }
            return array;
        }

        /**
         * Removes elements from `array` corresponding to the given indexes and returns
         * an array of the removed elements. Indexes may be specified as an array of
         * indexes or as individual arguments.
         *
         * **Note:** Unlike `_.at`, this method mutates `array`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to modify.
         * @param {...(number|number[])} [indexes] The indexes of elements to remove,
         *  specified as individual indexes or arrays of indexes.
         * @returns {Array} Returns the new array of removed elements.
         * @example
         *
         * var array = [5, 10, 15, 20];
         * var evens = _.pullAt(array, [1, 3]);
         *
         * console.log(array);
         * // => [5, 15]
         *
         * console.log(evens);
         * // => [10, 20]
         */
        function pullAt(array) {
            return basePullAt(array || [], baseFlatten(arguments, false, false, 1));
        }

        /**
         * Removes all elements from `array` that `predicate` returns truthy for
         * and returns an array of the removed elements. The predicate is bound to
         * `thisArg` and invoked with three arguments; (value, index, array).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * **Note:** Unlike `_.filter`, this method mutates `array`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to modify.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the new array of removed elements.
         * @example
         *
         * var array = [1, 2, 3, 4];
         * var evens = _.remove(array, function(n) { return n % 2 == 0; });
         *
         * console.log(array);
         * // => [1, 3]
         *
         * console.log(evens);
         * // => [2, 4]
         */
        function remove(array, predicate, thisArg) {
            var index = -1,
                length = array ? array.length : 0,
                result = [];

            predicate = getCallback(predicate, thisArg, 3);
            while (++index < length) {
                var value = array[index];
                if (predicate(value, index, array)) {
                    result.push(value);
                    splice.call(array, index--, 1);
                    length--;
                }
            }
            return result;
        }

        /**
         * Gets all but the first element of `array`.
         *
         * @static
         * @memberOf _
         * @alias tail
         * @category Array
         * @param {Array} array The array to query.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.rest([1, 2, 3]);
         * // => [2, 3]
         */
        function rest(array) {
            return drop(array, 1);
        }

        /**
         * Creates a slice of `array` from `start` up to, but not including, `end`.
         *
         * **Note:** This function is used instead of `Array#slice` to support node
         * lists in IE < 9 and to ensure dense arrays are returned.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to slice.
         * @param {number} [start=0] The start position.
         * @param {number} [end=array.length] The end position.
         * @returns {Array} Returns the slice of `array`.
         */
        function slice(array, start, end) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (end && typeof end != 'number' && isIterateeCall(array, start, end)) {
                start = 0;
                end = length;
            }
            return baseSlice(array, start, end);
        }

        /**
         * Uses a binary search to determine the lowest index at which `value` should
         * be inserted into `array` in order to maintain its sort order. If an iteratee
         * function is provided it is invoked for `value` and each element of `array`
         * to compute their sort ranking. The iteratee is bound to `thisArg` and
         * invoked with one argument; (value).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The sorted array to inspect.
         * @param {*} value The value to evaluate.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {number} Returns the index at which `value` should be inserted
         *  into `array`.
         * @example
         *
         * _.sortedIndex([30, 50], 40);
         * // => 1
         *
         * _.sortedIndex([4, 4, 5, 5, 6, 6], 5);
         * // => 2
         *
         * var dict = { 'data': { 'thirty': 30, 'forty': 40, 'fifty': 50 } };
         *
         * // using an iteratee function
         * _.sortedIndex(['thirty', 'fifty'], 'forty', function(word) {
         *   return this.data[word];
         * }, dict);
         * // => 1
         *
         * // using the "_.property" callback shorthand
         * _.sortedIndex([{ 'x': 30 }, { 'x': 50 }], { 'x': 40 }, 'x');
         * // => 1
         */
        function sortedIndex(array, value, iteratee, thisArg) {
            var func = getCallback(iteratee);
            return (func === baseCallback && iteratee == null)
              ? binaryIndex(array, value)
              : binaryIndexBy(array, value, func(iteratee, thisArg, 1));
        }

        /**
         * This method is like `_.sortedIndex` except that it returns the highest
         * index at which `value` should be inserted into `array` in order to
         * maintain its sort order.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The sorted array to inspect.
         * @param {*} value The value to evaluate.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {number} Returns the index at which `value` should be inserted
         *  into `array`.
         * @example
         *
         * _.sortedLastIndex([4, 4, 5, 5, 6, 6], 5);
         * // => 4
         */
        function sortedLastIndex(array, value, iteratee, thisArg) {
            var func = getCallback(iteratee);
            return (func === baseCallback && iteratee == null)
              ? binaryIndex(array, value, true)
              : binaryIndexBy(array, value, func(iteratee, thisArg, 1), true);
        }

        /**
         * Creates a slice of `array` with `n` elements taken from the beginning.
         *
         * @static
         * @memberOf _
         * @type Function
         * @category Array
         * @param {Array} array The array to query.
         * @param {number} [n=1] The number of elements to take.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.take([1, 2, 3]);
         * // => [1]
         *
         * _.take([1, 2, 3], 2);
         * // => [1, 2]
         *
         * _.take([1, 2, 3], 5);
         * // => [1, 2, 3]
         *
         * _.take([1, 2, 3], 0);
         * // => []
         */
        function take(array, n, guard) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (guard ? isIterateeCall(array, n, guard) : n == null) {
                n = 1;
            }
            return baseSlice(array, 0, n < 0 ? 0 : n);
        }

        /**
         * Creates a slice of `array` with `n` elements taken from the end.
         *
         * @static
         * @memberOf _
         * @type Function
         * @category Array
         * @param {Array} array The array to query.
         * @param {number} [n=1] The number of elements to take.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.takeRight([1, 2, 3]);
         * // => [3]
         *
         * _.takeRight([1, 2, 3], 2);
         * // => [2, 3]
         *
         * _.takeRight([1, 2, 3], 5);
         * // => [1, 2, 3]
         *
         * _.takeRight([1, 2, 3], 0);
         * // => []
         */
        function takeRight(array, n, guard) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            if (guard ? isIterateeCall(array, n, guard) : n == null) {
                n = 1;
            }
            n = length - (+n || 0);
            return baseSlice(array, n < 0 ? 0 : n);
        }

        /**
         * Creates a slice of `array` with elements taken from the end. Elements are
         * taken until `predicate` returns falsey. The predicate is bound to `thisArg`
         * and invoked with three arguments; (value, index, array).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @type Function
         * @category Array
         * @param {Array} array The array to query.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per element.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.takeRightWhile([1, 2, 3], function(n) { return n > 1; });
         * // => [2, 3]
         *
         * var users = [
         *   { 'user': 'barney',  'status': 'busy', 'active': false },
         *   { 'user': 'fred',    'status': 'busy', 'active': true },
         *   { 'user': 'pebbles', 'status': 'away', 'active': true }
         * ];
         *
         * // using the "_.property" callback shorthand
         * _.pluck(_.takeRightWhile(users, 'active'), 'user');
         * // => ['fred', 'pebbles']
         *
         * // using the "_.matches" callback shorthand
         * _.pluck(_.takeRightWhile(users, { 'status': 'away' }), 'user');
         * // => ['pebbles']
         */
        function takeRightWhile(array, predicate, thisArg) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            predicate = getCallback(predicate, thisArg, 3);
            while (length-- && predicate(array[length], length, array)) { }
            return baseSlice(array, length + 1);
        }

        /**
         * Creates a slice of `array` with elements taken from the beginning. Elements
         * are taken until `predicate` returns falsey. The predicate is bound to
         * `thisArg` and invoked with three arguments; (value, index, array).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @type Function
         * @category Array
         * @param {Array} array The array to query.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per element.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the slice of `array`.
         * @example
         *
         * _.takeWhile([1, 2, 3], function(n) { return n < 3; });
         * // => [1, 2]
         *
         * var users = [
         *   { 'user': 'barney',  'status': 'busy', 'active': true },
         *   { 'user': 'fred',    'status': 'busy', 'active': false },
         *   { 'user': 'pebbles', 'status': 'away', 'active': true }
         * ];
         *
         * // using the "_.property" callback shorthand
         * _.pluck(_.takeWhile(users, 'active'), 'user');
         * // => ['barney']
         *
         * // using the "_.matches" callback shorthand
         * _.pluck(_.takeWhile(users, { 'status': 'busy' }), 'user');
         * // => ['barney', 'fred']
         */
        function takeWhile(array, predicate, thisArg) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            var index = -1;
            predicate = getCallback(predicate, thisArg, 3);
            while (++index < length && predicate(array[index], index, array)) { }
            return baseSlice(array, 0, index);
        }

        /**
         * Creates an array of unique values, in order, of the provided arrays using
         * `SameValueZero` for equality comparisons.
         *
         * **Note:** `SameValueZero` comparisons are like strict equality comparisons,
         * e.g. `===`, except that `NaN` matches `NaN`. See the
         * [ES6 spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         * for more details.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {...Array} [arrays] The arrays to inspect.
         * @returns {Array} Returns the new array of combined values.
         * @example
         *
         * _.union([1, 2, 3], [5, 2, 1, 4], [2, 1]);
         * // => [1, 2, 3, 5, 4]
         */
        function union() {
            return baseUniq(baseFlatten(arguments, false, true));
        }

        /**
         * Creates a duplicate-value-free version of an array using `SameValueZero`
         * for equality comparisons. Providing `true` for `isSorted` performs a faster
         * search algorithm for sorted arrays. If an iteratee function is provided it
         * is invoked for each value in the array to generate the criterion by which
         * uniqueness is computed. The `iteratee` is bound to `thisArg` and invoked
         * with three arguments; (value, index, array).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * **Note:** `SameValueZero` comparisons are like strict equality comparisons,
         * e.g. `===`, except that `NaN` matches `NaN`. See the
         * [ES6 spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         * for more details.
         *
         * @static
         * @memberOf _
         * @alias unique
         * @category Array
         * @param {Array} array The array to inspect.
         * @param {boolean} [isSorted] Specify the array is sorted.
         * @param {Function|Object|string} [iteratee] The function invoked per iteration.
         *  If a property name or object is provided it is used to create a "_.property"
         *  or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Array} Returns the new duplicate-value-free array.
         * @example
         *
         * _.uniq([1, 2, 1]);
         * // => [1, 2]
         *
         * // using `isSorted`
         * _.uniq([1, 1, 2], true);
         * // => [1, 2]
         *
         * // using an iteratee function
         * _.uniq([1, 2.5, 1.5, 2], function(n) { return this.floor(n); }, Math);
         * // => [1, 2.5]
         *
         * // using the "_.property" callback shorthand
         * _.uniq([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
         * // => [{ 'x': 1 }, { 'x': 2 }]
         */
        function uniq(array, isSorted, iteratee, thisArg) {
            var length = array ? array.length : 0;
            if (!length) {
                return [];
            }
            // Juggle arguments.
            if (typeof isSorted != 'boolean' && isSorted != null) {
                thisArg = iteratee;
                iteratee = isIterateeCall(array, isSorted, thisArg) ? null : isSorted;
                isSorted = false;
            }
            var func = getCallback();
            if (!(func === baseCallback && iteratee == null)) {
                iteratee = func(iteratee, thisArg, 3);
            }
            return (isSorted && getIndexOf() == baseIndexOf)
              ? sortedUniq(array, iteratee)
              : baseUniq(array, iteratee);
        }

        /**
         * This method is like `_.zip` except that it accepts an array of grouped
         * elements and creates an array regrouping the elements to their pre `_.zip`
         * configuration.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array of grouped elements to process.
         * @returns {Array} Returns the new array of regrouped elements.
         * @example
         *
         * var zipped = _.zip(['fred', 'barney'], [30, 40], [true, false]);
         * // => [['fred', 30, true], ['barney', 40, false]]
         *
         * _.unzip(zipped);
         * // => [['fred', 'barney'], [30, 40], [true, false]]
         */
        function unzip(array) {
            var index = -1,
                length = (array && array.length && arrayMax(arrayMap(array, getLength))) >>> 0,
                result = Array(length);

            while (++index < length) {
                result[index] = arrayMap(array, baseProperty(index));
            }
            return result;
        }

        /**
         * Creates an array excluding all provided values using `SameValueZero` for
         * equality comparisons.
         *
         * **Note:** `SameValueZero` comparisons are like strict equality comparisons,
         * e.g. `===`, except that `NaN` matches `NaN`. See the
         * [ES6 spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         * for more details.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {Array} array The array to filter.
         * @param {...*} [values] The values to exclude.
         * @returns {Array} Returns the new array of filtered values.
         * @example
         *
         * _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
         * // => [2, 3, 4]
         */
        function without(array) {
            return baseDifference(array, baseSlice(arguments, 1));
        }

        /**
         * Creates an array that is the symmetric difference of the provided arrays.
         * See [Wikipedia](http://en.wikipedia.org/wiki/Symmetric_difference) for
         * more details.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {...Array} [arrays] The arrays to inspect.
         * @returns {Array} Returns the new array of values.
         * @example
         *
         * _.xor([1, 2, 3], [5, 2, 1, 4]);
         * // => [3, 5, 4]
         *
         * _.xor([1, 2, 5], [2, 3, 5], [3, 4, 5]);
         * // => [1, 4, 5]
         */
        function xor() {
            var index = -1,
                length = arguments.length;

            while (++index < length) {
                var array = arguments[index];
                if (isArray(array) || isArguments(array)) {
                    var result = result
                      ? baseDifference(result, array).concat(baseDifference(array, result))
                      : array;
                }
            }
            return result ? baseUniq(result) : [];
        }

        /**
         * Creates an array of grouped elements, the first of which contains the first
         * elements of the given arrays, the second of which contains the second elements
         * of the given arrays, and so on.
         *
         * @static
         * @memberOf _
         * @category Array
         * @param {...Array} [arrays] The arrays to process.
         * @returns {Array} Returns the new array of grouped elements.
         * @example
         *
         * _.zip(['fred', 'barney'], [30, 40], [true, false]);
         * // => [['fred', 30, true], ['barney', 40, false]]
         */
        function zip() {
            var length = arguments.length,
                array = Array(length);

            while (length--) {
                array[length] = arguments[length];
            }
            return unzip(array);
        }

        /**
         * Creates an object composed from arrays of property names and values. Provide
         * either a single two dimensional array, e.g. `[[key1, value1], [key2, value2]]`
         * or two arrays, one of property names and one of corresponding values.
         *
         * @static
         * @memberOf _
         * @alias object
         * @category Array
         * @param {Array} props The property names.
         * @param {Array} [values=[]] The property values.
         * @returns {Object} Returns the new object.
         * @example
         *
         * _.zipObject(['fred', 'barney'], [30, 40]);
         * // => { 'fred': 30, 'barney': 40 }
         */
        function zipObject(props, values) {
            var index = -1,
                length = props ? props.length : 0,
                result = {};

            if (length && !values && !isArray(props[0])) {
                values = [];
            }
            while (++index < length) {
                var key = props[index];
                if (values) {
                    result[key] = values[index];
                } else if (key) {
                    result[key[0]] = key[1];
                }
            }
            return result;
        }

        /*------------------------------------------------------------------------*/

        /**
         * Creates a `lodash` object that wraps `value` with explicit method
         * chaining enabled.
         *
         * @static
         * @memberOf _
         * @category Chain
         * @param {*} value The value to wrap.
         * @returns {Object} Returns the new `lodash` object.
         * @example
         *
         * var users = [
         *   { 'user': 'barney',  'age': 36 },
         *   { 'user': 'fred',    'age': 40 },
         *   { 'user': 'pebbles', 'age': 1 }
         * ];
         *
         * var youngest = _.chain(users)
         *   .sortBy('age')
         *   .map(function(chr) { return chr.user + ' is ' + chr.age; })
         *   .first()
         *   .value();
         * // => 'pebbles is 1'
         */
        function chain(value) {
            var result = lodash(value);
            result.__chain__ = true;
            return result;
        }

        /**
         * This method invokes `interceptor` and returns `value`. The interceptor is
         * bound to `thisArg` and invoked with one argument; (value). The purpose of
         * this method is to "tap into" a method chain in order to perform operations
         * on intermediate results within the chain.
         *
         * @static
         * @memberOf _
         * @category Chain
         * @param {*} value The value to provide to `interceptor`.
         * @param {Function} interceptor The function to invoke.
         * @param {*} [thisArg] The `this` binding of `interceptor`.
         * @returns {*} Returns `value`.
         * @example
         *
         * _([1, 2, 3])
         *  .tap(function(array) { array.pop(); })
         *  .reverse()
         *  .value();
         * // => [2, 1]
         */
        function tap(value, interceptor, thisArg) {
            interceptor.call(thisArg, value);
            return value;
        }

        /**
         * This method is like `_.tap` except that it returns the result of `interceptor`.
         *
         * @static
         * @memberOf _
         * @category Chain
         * @param {*} value The value to provide to `interceptor`.
         * @param {Function} interceptor The function to invoke.
         * @param {*} [thisArg] The `this` binding of `interceptor`.
         * @returns {*} Returns the result of `interceptor`.
         * @example
         *
         * _([1, 2, 3])
         *  .last()
         *  .thru(function(value) { return [value]; })
         *  .value();
         * // => [3]
         */
        function thru(value, interceptor, thisArg) {
            return interceptor.call(thisArg, value);
        }

        /**
         * Enables explicit method chaining on the wrapper object.
         *
         * @name chain
         * @memberOf _
         * @category Chain
         * @returns {*} Returns the `lodash` object.
         * @example
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36 },
         *   { 'user': 'fred',   'age': 40 }
         * ];
         *
         * // without explicit chaining
         * _(users).first();
         * // => { 'user': 'barney', 'age': 36 }
         *
         * // with explicit chaining
         * _(users).chain()
         *   .first()
         *   .pick('user')
         *   .value();
         * // => { 'user': 'barney' }
         */
        function wrapperChain() {
            return chain(this);
        }

        /**
         * Reverses the wrapped array so the first element becomes the last, the
         * second element becomes the second to last, and so on.
         *
         * **Note:** This method mutates the wrapped array.
         *
         * @name reverse
         * @memberOf _
         * @category Chain
         * @returns {Object} Returns the new reversed `lodash` object.
         * @example
         *
         * var array = [1, 2, 3];
         *
         * _(array).reverse().value()
         * // => [3, 2, 1]
         *
         * console.log(array);
         * // => [3, 2, 1]
         */
        function wrapperReverse() {
            var value = this.__wrapped__;
            if (value instanceof LazyWrapper) {
                return new LodashWrapper(value.reverse());
            }
            return this.thru(function (value) {
                return value.reverse();
            });
        }

        /**
         * Produces the result of coercing the unwrapped value to a string.
         *
         * @name toString
         * @memberOf _
         * @category Chain
         * @returns {string} Returns the coerced string value.
         * @example
         *
         * _([1, 2, 3]).toString();
         * // => '1,2,3'
         */
        function wrapperToString() {
            return (this.value() + '');
        }

        /**
         * Executes the chained sequence to extract the unwrapped value.
         *
         * @name value
         * @memberOf _
         * @alias toJSON, valueOf
         * @category Chain
         * @returns {*} Returns the resolved unwrapped value.
         * @example
         *
         * _([1, 2, 3]).value();
         * // => [1, 2, 3]
         */
        function wrapperValue() {
            return baseWrapperValue(this.__wrapped__, this.__actions__);
        }

        /*------------------------------------------------------------------------*/

        /**
         * Creates an array of elements corresponding to the given keys, or indexes,
         * of `collection`. Keys may be specified as individual arguments or as arrays
         * of keys.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {...(number|number[]|string|string[])} [props] The property names
         *  or indexes of elements to pick, specified individually or in arrays.
         * @returns {Array} Returns the new array of picked elements.
         * @example
         *
         * _.at(['a', 'b', 'c', 'd', 'e'], [0, 2, 4]);
         * // => ['a', 'c', 'e']
         *
         * _.at(['fred', 'barney', 'pebbles'], 0, 2);
         * // => ['fred', 'pebbles']
         */
        function at(collection) {
            var length = collection ? collection.length : 0;
            if (isLength(length)) {
                collection = toIterable(collection);
            }
            return baseAt(collection, baseFlatten(arguments, false, false, 1));
        }

        /**
         * Checks if `value` is in `collection` using `SameValueZero` for equality
         * comparisons. If `fromIndex` is negative, it is used as the offset from
         * the end of `collection`.
         *
         * **Note:** `SameValueZero` comparisons are like strict equality comparisons,
         * e.g. `===`, except that `NaN` matches `NaN`. See the
         * [ES6 spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
         * for more details.
         *
         * @static
         * @memberOf _
         * @alias contains, include
         * @category Collection
         * @param {Array|Object|string} collection The collection to search.
         * @param {*} target The value to search for.
         * @param {number} [fromIndex=0] The index to search from.
         * @returns {boolean} Returns `true` if a matching element is found, else `false`.
         * @example
         *
         * _.includes([1, 2, 3], 1);
         * // => true
         *
         * _.includes([1, 2, 3], 1, 2);
         * // => false
         *
         * _.includes({ 'user': 'fred', 'age': 40 }, 'fred');
         * // => true
         *
         * _.includes('pebbles', 'eb');
         * // => true
         */
        function includes(collection, target, fromIndex) {
            var length = collection ? collection.length : 0;
            if (!isLength(length)) {
                collection = values(collection);
                length = collection.length;
            }
            if (!length) {
                return false;
            }
            if (typeof fromIndex == 'number') {
                fromIndex = fromIndex < 0 ? nativeMax(length + fromIndex, 0) : (fromIndex || 0);
            } else {
                fromIndex = 0;
            }
            return (typeof collection == 'string' || !isArray(collection) && isString(collection))
              ? (fromIndex < length && collection.indexOf(target, fromIndex) > -1)
              : (getIndexOf(collection, target, fromIndex) > -1);
        }

        /**
         * Creates an object composed of keys generated from the results of running
         * each element of `collection` through `iteratee`. The corresponding value
         * of each key is the number of times the key was returned by `iteratee`.
         * The `iteratee` is bound to `thisArg` and invoked with three arguments;
         * (value, index|key, collection).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns the composed aggregate object.
         * @example
         *
         * _.countBy([4.3, 6.1, 6.4], function(n) { return Math.floor(n); });
         * // => { '4': 1, '6': 2 }
         *
         * _.countBy([4.3, 6.1, 6.4], function(n) { return this.floor(n); }, Math);
         * // => { '4': 1, '6': 2 }
         *
         * _.countBy(['one', 'two', 'three'], 'length');
         * // => { '3': 2, '5': 1 }
         */
        var countBy = createAggregator(function (result, value, key) {
            hasOwnProperty.call(result, key) ? ++result[key] : (result[key] = 1);
        });

        /**
         * Checks if `predicate` returns truthy for **all** elements of `collection`.
         * The predicate is bound to `thisArg` and invoked with three arguments;
         * (value, index|key, collection).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @alias all
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {boolean} Returns `true` if all elements pass the predicate check,
         *  else `false`.
         * @example
         *
         * _.every([true, 1, null, 'yes']);
         * // => false
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36 },
         *   { 'user': 'fred',   'age': 40 }
         * ];
         *
         * // using the "_.property" callback shorthand
         * _.every(users, 'age');
         * // => true
         *
         * // using the "_.matches" callback shorthand
         * _.every(users, { 'age': 36 });
         * // => false
         */
        function every(collection, predicate, thisArg) {
            var func = isArray(collection) ? arrayEvery : baseEvery;
            if (typeof predicate != 'function' || typeof thisArg != 'undefined') {
                predicate = getCallback(predicate, thisArg, 3);
            }
            return func(collection, predicate);
        }

        /**
         * Iterates over elements of `collection`, returning an array of all elements
         * `predicate` returns truthy for. The predicate is bound to `thisArg` and
         * invoked with three arguments; (value, index|key, collection).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @alias select
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the new filtered array.
         * @example
         *
         * var evens = _.filter([1, 2, 3, 4], function(n) { return n % 2 == 0; });
         * // => [2, 4]
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36, 'active': false },
         *   { 'user': 'fred',   'age': 40, 'active': true }
         * ];
         *
         * // using the "_.property" callback shorthand
         * _.pluck(_.filter(users, 'active'), 'user');
         * // => ['fred']
         *
         * // using the "_.matches" callback shorthand
         * _.pluck(_.filter(users, { 'age': 36 }), 'user');
         * // => ['barney']
         */
        function filter(collection, predicate, thisArg) {
            var func = isArray(collection) ? arrayFilter : baseFilter;
            predicate = getCallback(predicate, thisArg, 3);
            return func(collection, predicate);
        }

        /**
         * Iterates over elements of `collection`, returning the first element
         * `predicate` returns truthy for. The predicate is bound to `thisArg` and
         * invoked with three arguments; (value, index|key, collection).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @alias detect
         * @category Collection
         * @param {Array|Object|string} collection The collection to search.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {*} Returns the matched element, else `undefined`.
         * @example
         *
         * var users = [
         *   { 'user': 'barney',  'age': 36, 'active': false },
         *   { 'user': 'fred',    'age': 40, 'active': true },
         *   { 'user': 'pebbles', 'age': 1,  'active': false }
         * ];
         *
         * _.result(_.find(users, function(chr) { return chr.age < 40; }), 'user');
         * // => 'barney'
         *
         * // using the "_.matches" callback shorthand
         * _.result(_.find(users, { 'age': 1 }), 'user');
         * // => 'pebbles'
         *
         * // using the "_.property" callback shorthand
         * _.result(_.find(users, 'active'), 'user');
         * // => 'fred'
         */
        function find(collection, predicate, thisArg) {
            if (isArray(collection)) {
                var index = findIndex(collection, predicate, thisArg);
                return index > -1 ? collection[index] : undefined;
            }
            predicate = getCallback(predicate, thisArg, 3);
            return baseFind(collection, predicate, baseEach);
        }

        /**
         * This method is like `_.find` except that it iterates over elements of
         * `collection` from right to left.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to search.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {*} Returns the matched element, else `undefined`.
         * @example
         *
         * _.findLast([1, 2, 3, 4], function(n) { return n % 2 == 1; });
         * // => 3
         */
        function findLast(collection, predicate, thisArg) {
            predicate = getCallback(predicate, thisArg, 3);
            return baseFind(collection, predicate, baseEachRight);
        }

        /**
         * Performs a deep comparison between each element in `collection` and the
         * source object, returning the first element that has equivalent property
         * values.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to search.
         * @param {Object} source The object of property values to match.
         * @returns {*} Returns the matched element, else `undefined`.
         * @example
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36, 'status': 'busy' },
         *   { 'user': 'fred',   'age': 40, 'status': 'busy' }
         * ];
         *
         * _.result(_.findWhere(users, { 'status': 'busy' }), 'user');
         * // => 'barney'
         *
         * _.result(_.findWhere(users, { 'age': 40 }), 'user');
         * // => 'fred'
         */
        function findWhere(collection, source) {
            return find(collection, matches(source));
        }

        /**
         * Iterates over elements of `collection` invoking `iteratee` for each element.
         * The `iteratee` is bound to `thisArg` and invoked with three arguments;
         * (value, index|key, collection). Iterator functions may exit iteration early
         * by explicitly returning `false`.
         *
         * **Note:** As with other "Collections" methods, objects with a `length` property
         * are iterated like arrays. To avoid this behavior `_.forIn` or `_.forOwn`
         * may be used for object iteration.
         *
         * @static
         * @memberOf _
         * @alias each
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Array|Object|string} Returns `collection`.
         * @example
         *
         * _([1, 2, 3]).forEach(function(n) { console.log(n); });
         * // => logs each value from left to right and returns the array
         *
         * _.forEach({ 'one': 1, 'two': 2, 'three': 3 }, function(n, key) { console.log(n, key); });
         * // => logs each value-key pair and returns the object (iteration order is not guaranteed)
         */
        function forEach(collection, iteratee, thisArg) {
            return (typeof iteratee == 'function' && typeof thisArg == 'undefined' && isArray(collection))
              ? arrayEach(collection, iteratee)
              : baseEach(collection, bindCallback(iteratee, thisArg, 3));
        }

        /**
         * This method is like `_.forEach` except that it iterates over elements of
         * `collection` from right to left.
         *
         * @static
         * @memberOf _
         * @alias eachRight
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Array|Object|string} Returns `collection`.
         * @example
         *
         * _([1, 2, 3]).forEachRight(function(n) { console.log(n); }).join(',');
         * // => logs each value from right to left and returns the array
         */
        function forEachRight(collection, iteratee, thisArg) {
            return (typeof iteratee == 'function' && typeof thisArg == 'undefined' && isArray(collection))
              ? arrayEachRight(collection, iteratee)
              : baseEachRight(collection, bindCallback(iteratee, thisArg, 3));
        }

        /**
         * Creates an object composed of keys generated from the results of running
         * each element of `collection` through `iteratee`. The corresponding value
         * of each key is an array of the elements responsible for generating the key.
         * The `iteratee` is bound to `thisArg` and invoked with three arguments;
         * (value, index|key, collection).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns the composed aggregate object.
         * @example
         *
         * _.groupBy([4.2, 6.1, 6.4], function(n) { return Math.floor(n); });
         * // => { '4': [4.2], '6': [6.1, 6.4] }
         *
         * _.groupBy([4.2, 6.1, 6.4], function(n) { return this.floor(n); }, Math);
         * // => { '4': [4.2], '6': [6.1, 6.4] }
         *
         * // using the "_.property" callback shorthand
         * _.groupBy(['one', 'two', 'three'], 'length');
         * // => { '3': ['one', 'two'], '5': ['three'] }
         */
        var groupBy = createAggregator(function (result, value, key) {
            if (hasOwnProperty.call(result, key)) {
                result[key].push(value);
            } else {
                result[key] = [value];
            }
        });

        /**
         * Creates an object composed of keys generated from the results of running
         * each element of `collection` through `iteratee`. The corresponding value
         * of each key is the last element responsible for generating the key. The
         * iteratee function is bound to `thisArg` and invoked with three arguments;
         * (value, index|key, collection).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns the composed aggregate object.
         * @example
         *
         * var keyData = [
         *   { 'dir': 'left', 'code': 97 },
         *   { 'dir': 'right', 'code': 100 }
         * ];
         *
         * _.indexBy(keyData, 'dir');
         * // => { 'left': { 'dir': 'left', 'code': 97 }, 'right': { 'dir': 'right', 'code': 100 } }
         *
         * _.indexBy(keyData, function(object) { return String.fromCharCode(object.code); });
         * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
         *
         * _.indexBy(keyData, function(object) { return this.fromCharCode(object.code); }, String);
         * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
         */
        var indexBy = createAggregator(function (result, value, key) {
            result[key] = value;
        });

        /**
         * Invokes the method named by `methodName` on each element in `collection`,
         * returning an array of the results of each invoked method. Any additional
         * arguments are provided to each invoked method. If `methodName` is a function
         * it is invoked for, and `this` bound to, each element in `collection`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|string} methodName The name of the method to invoke or
         *  the function invoked per iteration.
         * @param {...*} [args] The arguments to invoke the method with.
         * @returns {Array} Returns the array of results.
         * @example
         *
         * _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
         * // => [[1, 5, 7], [1, 2, 3]]
         *
         * _.invoke([123, 456], String.prototype.split, '');
         * // => [['1', '2', '3'], ['4', '5', '6']]
         */
        function invoke(collection, methodName) {
            return baseInvoke(collection, methodName, baseSlice(arguments, 2));
        }

        /**
         * Creates an array of values by running each element in `collection` through
         * `iteratee`. The `iteratee` is bound to `thisArg` and invoked with three
         * arguments; (value, index|key, collection).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @alias collect
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Array} Returns the new mapped array.
         * @example
         *
         * _.map([1, 2, 3], function(n) { return n * 3; });
         * // => [3, 6, 9]
         *
         * _.map({ 'one': 1, 'two': 2, 'three': 3 }, function(n) { return n * 3; });
         * // => [3, 6, 9] (iteration order is not guaranteed)
         *
         * var users = [
         *   { 'user': 'barney' },
         *   { 'user': 'fred' }
         * ];
         *
         * // using the "_.property" callback shorthand
         * _.map(users, 'user');
         * // => ['barney', 'fred']
         */
        function map(collection, iteratee, thisArg) {
            var func = isArray(collection) ? arrayMap : baseMap;
            iteratee = getCallback(iteratee, thisArg, 3);
            return func(collection, iteratee);
        }

        /**
         * Gets the maximum value of `collection`. If `collection` is empty or falsey
         * `-Infinity` is returned. If an iteratee function is provided it is invoked
         * for each value in `collection` to generate the criterion by which the value
         * is ranked. The `iteratee` is bound to `thisArg` and invoked with three
         * arguments; (value, index, collection).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [iteratee] The function invoked per iteration.
         *  If a property name or object is provided it is used to create a "_.property"
         *  or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {*} Returns the maximum value.
         * @example
         *
         * _.max([4, 2, 8, 6]);
         * // => 8
         *
         * _.max([]);
         * // => -Infinity
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36 },
         *   { 'user': 'fred',   'age': 40 }
         * ];
         *
         * _.max(users, function(chr) { return chr.age; });
         * // => { 'user': 'fred', 'age': 40 };
         *
         * // using the "_.property" callback shorthand
         * _.max(users, 'age');
         * // => { 'user': 'fred', 'age': 40 };
         */
        var max = createExtremum(arrayMax);

        /**
         * Gets the minimum value of `collection`. If `collection` is empty or falsey
         * `Infinity` is returned. If an iteratee function is provided it is invoked
         * for each value in `collection` to generate the criterion by which the value
         * is ranked. The `iteratee` is bound to `thisArg` and invoked with three
         * arguments; (value, index, collection).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [iteratee] The function invoked per iteration.
         *  If a property name or object is provided it is used to create a "_.property"
         *  or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {*} Returns the minimum value.
         * @example
         *
         * _.min([4, 2, 8, 6]);
         * // => 2
         *
         * _.min([]);
         * // => Infinity
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36 },
         *   { 'user': 'fred',   'age': 40 }
         * ];
         *
         * _.min(users, function(chr) { return chr.age; });
         * // => { 'user': 'barney', 'age': 36 };
         *
         * // using the "_.property" callback shorthand
         * _.min(users, 'age');
         * // => { 'user': 'barney', 'age': 36 };
         */
        var min = createExtremum(arrayMin, true);

        /**
         * Creates an array of elements split into two groups, the first of which
         * contains elements `predicate` returns truthy for, while the second of which
         * contains elements `predicate` returns falsey for. The predicate is bound
         * to `thisArg` and invoked with three arguments; (value, index|key, collection).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the array of grouped elements.
         * @example
         *
         * _.partition([1, 2, 3], function(n) { return n % 2; });
         * // => [[1, 3], [2]]
         *
         * _.partition([1.2, 2.3, 3.4], function(n) { return this.floor(n) % 2; }, Math);
         * // => [[1, 3], [2]]
         *
         * var users = [
         *   { 'user': 'barney',  'age': 36, 'active': false },
         *   { 'user': 'fred',    'age': 40, 'active': true },
         *   { 'user': 'pebbles', 'age': 1,  'active': false }
         * ];
         *
         * // using the "_.matches" callback shorthand
         * _.map(_.partition(users, { 'age': 1 }), function(array) { return _.pluck(array, 'user'); });
         * // => [['pebbles'], ['barney', 'fred']]
         *
         * // using the "_.property" callback shorthand
         * _.map(_.partition(users, 'active'), function(array) { return _.pluck(array, 'user'); });
         * // => [['fred'], ['barney', 'pebbles']]
         */
        var partition = createAggregator(function (result, value, key) {
            result[key ? 0 : 1].push(value);
        }, function () { return [[], []]; });

        /**
         * Gets the value of `key` from all elements in `collection`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {string} key The key of the property to pluck.
         * @returns {Array} Returns the property values.
         * @example
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36 },
         *   { 'user': 'fred',   'age': 40 }
         * ];
         *
         * _.pluck(users, 'user');
         * // => ['barney', 'fred']
         *
         * var userIndex = _.indexBy(users, 'user');
         * _.pluck(userIndex, 'age');
         * // => [36, 40] (iteration order is not guaranteed)
         */
        function pluck(collection, key) {
            return map(collection, property(key));
        }

        /**
         * Reduces `collection` to a value which is the accumulated result of running
         * each element in `collection` through `iteratee`, where each successive
         * invocation is supplied the return value of the previous. If `accumulator`
         * is not provided the first element of `collection` is used as the initial
         * value. The `iteratee` is bound to `thisArg`and invoked with four arguments;
         * (accumulator, value, index|key, collection).
         *
         * @static
         * @memberOf _
         * @alias foldl, inject
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [accumulator] The initial value.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {*} Returns the accumulated value.
         * @example
         *
         * var sum = _.reduce([1, 2, 3], function(sum, n) { return sum + n; });
         * // => 6
         *
         * var mapped = _.reduce({ 'a': 1, 'b': 2, 'c': 3 }, function(result, n, key) {
         *   result[key] = n * 3;
         *   return result;
         * }, {});
         * // => { 'a': 3, 'b': 6, 'c': 9 } (iteration order is not guaranteed)
         */
        function reduce(collection, iteratee, accumulator, thisArg) {
            var func = isArray(collection) ? arrayReduce : baseReduce;
            return func(collection, getCallback(iteratee, thisArg, 4), accumulator, arguments.length < 3, baseEach);
        }

        /**
         * This method is like `_.reduce` except that it iterates over elements of
         * `collection` from right to left.
         *
         * @static
         * @memberOf _
         * @alias foldr
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [accumulator] The initial value.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {*} Returns the accumulated value.
         * @example
         *
         * var array = [[0, 1], [2, 3], [4, 5]];
         * _.reduceRight(array, function(flattened, other) { return flattened.concat(other); }, []);
         * // => [4, 5, 2, 3, 0, 1]
         */
        function reduceRight(collection, iteratee, accumulator, thisArg) {
            var func = isArray(collection) ? arrayReduceRight : baseReduce;
            return func(collection, getCallback(iteratee, thisArg, 4), accumulator, arguments.length < 3, baseEachRight);
        }

        /**
         * The opposite of `_.filter`; this method returns the elements of `collection`
         * that `predicate` does **not** return truthy for.
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Array} Returns the new filtered array.
         * @example
         *
         * var odds = _.reject([1, 2, 3, 4], function(n) { return n % 2 == 0; });
         * // => [1, 3]
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36, 'active': false },
         *   { 'user': 'fred',   'age': 40, 'active': true }
         * ];
         *
         * // using the "_.property" callback shorthand
         * _.pluck(_.reject(users, 'active'), 'user');
         * // => ['barney']
         *
         * // using the "_.matches" callback shorthand
         * _.pluck(_.reject(users, { 'age': 36 }), 'user');
         * // => ['fred']
         */
        function reject(collection, predicate, thisArg) {
            var func = isArray(collection) ? arrayFilter : baseFilter;
            predicate = getCallback(predicate, thisArg, 3);
            return func(collection, function (value, index, collection) {
                return !predicate(value, index, collection);
            });
        }

        /**
         * Gets a random element or `n` random elements from a collection.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to sample.
         * @param {number} [n] The number of elements to sample.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {*} Returns the random sample(s).
         * @example
         *
         * _.sample([1, 2, 3, 4]);
         * // => 2
         *
         * _.sample([1, 2, 3, 4], 2);
         * // => [3, 1]
         */
        function sample(collection, n, guard) {
            if (guard ? isIterateeCall(collection, n, guard) : n == null) {
                collection = toIterable(collection);
                var length = collection.length;
                return length > 0 ? collection[baseRandom(0, length - 1)] : undefined;
            }
            var result = shuffle(collection);
            result.length = nativeMin(n < 0 ? 0 : (+n || 0), result.length);
            return result;
        }

        /**
         * Creates an array of shuffled values, using a version of the Fisher-Yates
         * shuffle. See [Wikipedia](http://en.wikipedia.org/wiki/Fisher-Yates_shuffle)
         * for more details.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to shuffle.
         * @returns {Array} Returns the new shuffled array.
         * @example
         *
         * _.shuffle([1, 2, 3, 4]);
         * // => [4, 1, 3, 2]
         */
        function shuffle(collection) {
            collection = toIterable(collection);

            var index = -1,
                length = collection.length,
                result = Array(length);

            while (++index < length) {
                var rand = baseRandom(0, index);
                if (index != rand) {
                    result[index] = result[rand];
                }
                result[rand] = collection[index];
            }
            return result;
        }

        /**
         * Gets the size of `collection` by returning `collection.length` for
         * array-like values or the number of own enumerable properties for objects.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to inspect.
         * @returns {number} Returns the size of `collection`.
         * @example
         *
         * _.size([1, 2]);
         * // => 2
         *
         * _.size({ 'one': 1, 'two': 2, 'three': 3 });
         * // => 3
         *
         * _.size('pebbles');
         * // => 7
         */
        function size(collection) {
            var length = collection ? collection.length : 0;
            return isLength(length) ? length : keys(collection).length;
        }

        /**
         * Checks if `predicate` returns truthy for **any** element of `collection`.
         * The function returns as soon as it finds a passing value and does not iterate
         * over the entire collection. The predicate is bound to `thisArg` and invoked
         * with three arguments; (value, index|key, collection).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @alias any
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {boolean} Returns `true` if any element passes the predicate check,
         *  else `false`.
         * @example
         *
         * _.some([null, 0, 'yes', false], Boolean);
         * // => true
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36, 'active': false },
         *   { 'user': 'fred',   'age': 40, 'active': true }
         * ];
         *
         * // using the "_.property" callback shorthand
         * _.some(users, 'active');
         * // => true
         *
         * // using the "_.matches" callback shorthand
         * _.some(users, { 'age': 1 });
         * // => false
         */
        function some(collection, predicate, thisArg) {
            var func = isArray(collection) ? arraySome : baseSome;
            if (typeof predicate != 'function' || typeof thisArg != 'undefined') {
                predicate = getCallback(predicate, thisArg, 3);
            }
            return func(collection, predicate);
        }

        /**
         * Creates an array of elements, sorted in ascending order by the results of
         * running each element in a collection through `iteratee`. This method performs
         * a stable sort, that is, it preserves the original sort order of equal elements.
         * The `iteratee` is bound to `thisArg` and invoked with three arguments;
         * (value, index|key, collection).
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {Array|Function|Object|string} [iteratee=_.identity] The function
         *  invoked per iteration. If a property name or an object is provided it is
         *  used to create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Array} Returns the new sorted array.
         * @example
         *
         * _.sortBy([1, 2, 3], function(n) { return Math.sin(n); });
         * // => [3, 1, 2]
         *
         * _.sortBy([1, 2, 3], function(n) { return this.sin(n); }, Math);
         * // => [3, 1, 2]
         *
         * var users = [
         *   { 'user': 'fred' },
         *   { 'user': 'pebbles' },
         *   { 'user': 'barney' }
         * ];
         *
         * // using the "_.property" callback shorthand
         * _.pluck(_.sortBy(users, 'user'), 'user');
         * // => ['barney', 'fred', 'pebbles']
         */
        function sortBy(collection, iteratee, thisArg) {
            var index = -1,
                length = collection ? collection.length : 0,
                result = isLength(length) ? Array(length) : [];

            if (thisArg && isIterateeCall(collection, iteratee, thisArg)) {
                iteratee = null;
            }
            iteratee = getCallback(iteratee, thisArg, 3);
            baseEach(collection, function (value, key, collection) {
                result[++index] = { 'criteria': iteratee(value, key, collection), 'index': index, 'value': value };
            });
            return baseSortBy(result, compareAscending);
        }

        /**
         * This method is like `_.sortBy` except that it sorts by property names
         * instead of an iteratee function.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to iterate over.
         * @param {...(string|string[])} props The property names to sort by,
         *  specified as individual property names or arrays of property names.
         * @returns {Array} Returns the new sorted array.
         * @example
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36 },
         *   { 'user': 'fred',   'age': 40 },
         *   { 'user': 'barney', 'age': 26 },
         *   { 'user': 'fred',   'age': 30 }
         * ];
         *
         * _.map(_.sortByAll(users, ['user', 'age']), _.values);
         * // => [['barney', 26], ['barney', 36], ['fred', 30], ['fred', 40]]
         */
        function sortByAll(collection) {
            var args = arguments;
            if (args.length > 3 && isIterateeCall(args[1], args[2], args[3])) {
                args = [collection, args[1]];
            }
            var index = -1,
                length = collection ? collection.length : 0,
                props = baseFlatten(args, false, false, 1),
                result = isLength(length) ? Array(length) : [];

            baseEach(collection, function (value, key, collection) {
                var length = props.length,
                    criteria = Array(length);

                while (length--) {
                    criteria[length] = value == null ? undefined : value[props[length]];
                }
                result[++index] = { 'criteria': criteria, 'index': index, 'value': value };
            });
            return baseSortBy(result, compareMultipleAscending);
        }

        /**
         * Performs a deep comparison between each element in `collection` and the
         * source object, returning an array of all elements that have equivalent
         * property values.
         *
         * @static
         * @memberOf _
         * @category Collection
         * @param {Array|Object|string} collection The collection to search.
         * @param {Object} source The object of property values to match.
         * @returns {Array} Returns the new filtered array.
         * @example
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36, 'status': 'busy', 'pets': ['hoppy'] },
         *   { 'user': 'fred',   'age': 40, 'status': 'busy', 'pets': ['baby puss', 'dino'] }
         * ];
         *
         * _.pluck(_.where(users, { 'age': 36 }), 'user');
         * // => ['barney']
         *
         * _.pluck(_.where(users, { 'pets': ['dino'] }), 'user');
         * // => ['fred']
         *
         * _.pluck(_.where(users, { 'status': 'busy' }), 'user');
         * // => ['barney', 'fred']
         */
        function where(collection, source) {
            return filter(collection, matches(source));
        }

        /*------------------------------------------------------------------------*/

        /**
         * Gets the number of milliseconds that have elapsed since the Unix epoch
         * (1 January 1970 00:00:00 UTC).
         *
         * @static
         * @memberOf _
         * @category Date
         * @example
         *
         * _.defer(function(stamp) { console.log(_.now() - stamp); }, _.now());
         * // => logs the number of milliseconds it took for the deferred function to be invoked
         */
        var now = nativeNow || function () {
            return new Date().getTime();
        };

        /*------------------------------------------------------------------------*/

        /**
         * The opposite of `_.before`; this method creates a function that invokes
         * `func` once it is called `n` or more times.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {number} n The number of calls before `func` is invoked.
         * @param {Function} func The function to restrict.
         * @returns {Function} Returns the new restricted function.
         * @example
         *
         * var saves = ['profile', 'settings'];
         *
         * var done = _.after(saves.length, function() {
         *   console.log('done saving!');
         * });
         *
         * _.forEach(saves, function(type) {
         *   asyncSave({ 'type': type, 'complete': done });
         * });
         * // => logs 'done saving!' after the two async saves have completed
         */
        function after(n, func) {
            if (!isFunction(func)) {
                if (isFunction(n)) {
                    var temp = n;
                    n = func;
                    func = temp;
                } else {
                    throw new TypeError(FUNC_ERROR_TEXT);
                }
            }
            n = nativeIsFinite(n = +n) ? n : 0;
            return function () {
                if (--n < 1) {
                    return func.apply(this, arguments);
                }
            };
        }

        /**
         * Creates a function that accepts up to `n` arguments ignoring any
         * additional arguments.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to cap arguments for.
         * @param {number} [n=func.length] The arity cap.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Function} Returns the new function.
         * @example
         *
         * _.map(['6', '8', '10'], _.ary(parseInt, 1));
         * // => [6, 8, 10]
         */
        function ary(func, n, guard) {
            if (guard && isIterateeCall(func, n, guard)) {
                n = null;
            }
            n = n == null ? func.length : (+n || 0);
            return createWrapper(func, ARY_FLAG, null, null, null, null, n);
        }

        /**
         * Creates a function that invokes `func`, with the `this` binding and arguments
         * of the created function, while it is called less than `n` times. Subsequent
         * calls to the created function return the result of the last `func` invocation.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {number} n The number of calls at which `func` is no longer invoked.
         * @param {Function} func The function to restrict.
         * @returns {Function} Returns the new restricted function.
         * @example
         *
         * jQuery('#add').on('click', _.before(5, addContactToList));
         * // => allows adding up to 4 contacts to the list
         */
        function before(n, func) {
            var result;
            if (!isFunction(func)) {
                if (isFunction(n)) {
                    var temp = n;
                    n = func;
                    func = temp;
                } else {
                    throw new TypeError(FUNC_ERROR_TEXT);
                }
            }
            return function () {
                if (--n > 0) {
                    result = func.apply(this, arguments);
                } else {
                    func = null;
                }
                return result;
            };
        }

        /**
         * Creates a function that invokes `func` with the `this` binding of `thisArg`
         * and prepends any additional `_.bind` arguments to those provided to the
         * bound function.
         *
         * The `_.bind.placeholder` value, which defaults to `_` in monolithic builds,
         * may be used as a placeholder for partially applied arguments.
         *
         * **Note:** Unlike native `Function#bind` this method does not set the `length`
         * property of bound functions.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to bind.
         * @param {*} thisArg The `this` binding of `func`.
         * @param {...*} [args] The arguments to be partially applied.
         * @returns {Function} Returns the new bound function.
         * @example
         *
         * var greet = function(greeting, punctuation) {
         *   return greeting + ' ' + this.user + punctuation;
         * };
         *
         * var object = { 'user': 'fred' };
         *
         * var bound = _.bind(greet, object, 'hi');
         * bound('!');
         * // => 'hi fred!'
         *
         * // using placeholders
         * var bound = _.bind(greet, object, _, '!');
         * bound('hi');
         * // => 'hi fred!'
         */
        function bind(func, thisArg) {
            var bitmask = BIND_FLAG;
            if (arguments.length > 2) {
                var partials = baseSlice(arguments, 2),
                    holders = replaceHolders(partials, bind.placeholder);

                bitmask |= PARTIAL_FLAG;
            }
            return createWrapper(func, bitmask, thisArg, partials, holders);
        }

        /**
         * Binds methods of an object to the object itself, overwriting the existing
         * method. Method names may be specified as individual arguments or as arrays
         * of method names. If no method names are provided all enumerable function
         * properties, own and inherited, of `object` are bound.
         *
         * **Note:** This method does not set the `length` property of bound functions.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Object} object The object to bind and assign the bound methods to.
         * @param {...(string|string[])} [methodNames] The object method names to bind,
         *  specified as individual method names or arrays of method names.
         * @returns {Object} Returns `object`.
         * @example
         *
         * var view = {
         *   'label': 'docs',
         *   'onClick': function() { console.log('clicked ' + this.label); }
         * };
         *
         * _.bindAll(view);
         * jQuery('#docs').on('click', view.onClick);
         * // => logs 'clicked docs' when the element is clicked
         */
        function bindAll(object) {
            return baseBindAll(object,
              arguments.length > 1
                ? baseFlatten(arguments, false, false, 1)
                : functions(object)
            );
        }

        /**
         * Creates a function that invokes the method at `object[key]` and prepends
         * any additional `_.bindKey` arguments to those provided to the bound function.
         *
         * This method differs from `_.bind` by allowing bound functions to reference
         * methods that may be redefined or don't yet exist.
         * See [Peter Michaux's article](http://michaux.ca/articles/lazy-function-definition-pattern)
         * for more details.
         *
         * The `_.bindKey.placeholder` value, which defaults to `_` in monolithic
         * builds, may be used as a placeholder for partially applied arguments.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Object} object The object the method belongs to.
         * @param {string} key The key of the method.
         * @param {...*} [args] The arguments to be partially applied.
         * @returns {Function} Returns the new bound function.
         * @example
         *
         * var object = {
         *   'user': 'fred',
         *   'greet': function(greeting, punctuation) {
         *     return greeting + ' ' + this.user + punctuation;
         *   }
         * };
         *
         * var bound = _.bindKey(object, 'greet', 'hi');
         * bound('!');
         * // => 'hi fred!'
         *
         * object.greet = function(greeting, punctuation) {
         *   return greeting + 'ya ' + this.user + punctuation;
         * };
         *
         * bound('!');
         * // => 'hiya fred!'
         *
         * // using placeholders
         * var bound = _.bindKey(object, 'greet', _, '!');
         * bound('hi');
         * // => 'hiya fred!'
         */
        function bindKey(object, key) {
            var bitmask = BIND_FLAG | BIND_KEY_FLAG;
            if (arguments.length > 2) {
                var partials = baseSlice(arguments, 2),
                    holders = replaceHolders(partials, bindKey.placeholder);

                bitmask |= PARTIAL_FLAG;
            }
            return createWrapper(key, bitmask, object, partials, holders);
        }

        /**
         * Creates a function that accepts one or more arguments of `func` that when
         * called either invokes `func` returning its result, if all `func` arguments
         * have been provided, or returns a function that accepts one or more of the
         * remaining `func` arguments, and so on. The arity of `func` may be specified
         * if `func.length` is not sufficient.
         *
         * The `_.curry.placeholder` value, which defaults to `_` in monolithic builds,
         * may be used as a placeholder for provided arguments.
         *
         * **Note:** This method does not set the `length` property of curried functions.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to curry.
         * @param {number} [arity=func.length] The arity of `func`.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Function} Returns the new curried function.
         * @example
         *
         * var abc = function(a, b, c) {
         *   return [a, b, c];
         * };
         *
         * var curried = _.curry(abc);
         *
         * curried(1)(2)(3);
         * // => [1, 2, 3]
         *
         * curried(1, 2)(3);
         * // => [1, 2, 3]
         *
         * curried(1, 2, 3);
         * // => [1, 2, 3]
         *
         * // using placeholders
         * curried(1)(_, 3)(2);
         * // => [1, 2, 3]
         */
        function curry(func, arity, guard) {
            if (guard && isIterateeCall(func, arity, guard)) {
                arity = null;
            }
            var result = createWrapper(func, CURRY_FLAG, null, null, null, null, null, arity);
            result.placeholder = curry.placeholder;
            return result;
        }

        /**
         * This method is like `_.curry` except that arguments are applied to `func`
         * in the manner of `_.partialRight` instead of `_.partial`.
         *
         * The `_.curryRight.placeholder` value, which defaults to `_` in monolithic
         * builds, may be used as a placeholder for provided arguments.
         *
         * **Note:** This method does not set the `length` property of curried functions.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to curry.
         * @param {number} [arity=func.length] The arity of `func`.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Function} Returns the new curried function.
         * @example
         *
         * var abc = function(a, b, c) {
         *   return [a, b, c];
         * };
         *
         * var curried = _.curryRight(abc);
         *
         * curried(3)(2)(1);
         * // => [1, 2, 3]
         *
         * curried(2, 3)(1);
         * // => [1, 2, 3]
         *
         * curried(1, 2, 3);
         * // => [1, 2, 3]
         *
         * // using placeholders
         * curried(3)(1, _)(2);
         * // => [1, 2, 3]
         */
        function curryRight(func, arity, guard) {
            if (guard && isIterateeCall(func, arity, guard)) {
                arity = null;
            }
            var result = createWrapper(func, CURRY_RIGHT_FLAG, null, null, null, null, null, arity);
            result.placeholder = curryRight.placeholder;
            return result;
        }

        /**
         * Creates a function that delays invoking `func` until after `wait` milliseconds
         * have elapsed since the last time it was invoked. The created function comes
         * with a `cancel` method to cancel delayed invocations. Provide an options
         * object to indicate that `func` should be invoked on the leading and/or
         * trailing edge of the `wait` timeout. Subsequent calls to the debounced
         * function return the result of the last `func` invocation.
         *
         * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
         * on the trailing edge of the timeout only if the the debounced function is
         * invoked more than once during the `wait` timeout.
         *
         * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
         * for details over the differences between `_.debounce` and `_.throttle`.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to debounce.
         * @param {number} wait The number of milliseconds to delay.
         * @param {Object} [options] The options object.
         * @param {boolean} [options.leading=false] Specify invoking on the leading
         *  edge of the timeout.
         * @param {number} [options.maxWait] The maximum time `func` is allowed to be
         *  delayed before it is invoked.
         * @param {boolean} [options.trailing=true] Specify invoking on the trailing
         *  edge of the timeout.
         * @returns {Function} Returns the new debounced function.
         * @example
         *
         * // avoid costly calculations while the window size is in flux
         * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
         *
         * // invoke `sendMail` when the click event is fired, debouncing subsequent calls
         * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
         *   'leading': true,
         *   'trailing': false
         * }));
         *
         * // ensure `batchLog` is invoked once after 1 second of debounced calls
         * var source = new EventSource('/stream');
         * jQuery(source).on('message', _.debounce(batchLog, 250, {
         *   'maxWait': 1000
         * }));
         *
         * // cancel a debounced call
         * var todoChanges = _.debounce(batchLog, 1000);
         * Object.observe(models.todo, todoChanges);
         *
         * Object.observe(models, function(changes) {
         *   if (_.find(changes, { 'user': 'todo', 'type': 'delete'})) {
         *     todoChanges.cancel();
         *   }
         * }, ['delete']);
         *
         * // ...at some point `models.todo` is changed
         * models.todo.completed = true;
         *
         * // ...before 1 second has passed `models.todo` is deleted
         * // which cancels the debounced `todoChanges` call
         * delete models.todo;
         */
        function debounce(func, wait, options) {
            var args,
                maxTimeoutId,
                result,
                stamp,
                thisArg,
                timeoutId,
                trailingCall,
                lastCalled = 0,
                maxWait = false,
                trailing = true;

            if (!isFunction(func)) {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            wait = wait < 0 ? 0 : wait;
            if (options === true) {
                var leading = true;
                trailing = false;
            } else if (isObject(options)) {
                leading = options.leading;
                maxWait = 'maxWait' in options && nativeMax(+options.maxWait || 0, wait);
                trailing = 'trailing' in options ? options.trailing : trailing;
            }

            function cancel() {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                if (maxTimeoutId) {
                    clearTimeout(maxTimeoutId);
                }
                maxTimeoutId = timeoutId = trailingCall = undefined;
            }

            function delayed() {
                var remaining = wait - (now() - stamp);
                if (remaining <= 0 || remaining > wait) {
                    if (maxTimeoutId) {
                        clearTimeout(maxTimeoutId);
                    }
                    var isCalled = trailingCall;
                    maxTimeoutId = timeoutId = trailingCall = undefined;
                    if (isCalled) {
                        lastCalled = now();
                        result = func.apply(thisArg, args);
                        if (!timeoutId && !maxTimeoutId) {
                            args = thisArg = null;
                        }
                    }
                } else {
                    timeoutId = setTimeout(delayed, remaining);
                }
            }

            function maxDelayed() {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                maxTimeoutId = timeoutId = trailingCall = undefined;
                if (trailing || (maxWait !== wait)) {
                    lastCalled = now();
                    result = func.apply(thisArg, args);
                    if (!timeoutId && !maxTimeoutId) {
                        args = thisArg = null;
                    }
                }
            }

            function debounced() {
                args = arguments;
                stamp = now();
                thisArg = this;
                trailingCall = trailing && (timeoutId || !leading);

                if (maxWait === false) {
                    var leadingCall = leading && !timeoutId;
                } else {
                    if (!maxTimeoutId && !leading) {
                        lastCalled = stamp;
                    }
                    var remaining = maxWait - (stamp - lastCalled),
                        isCalled = remaining <= 0 || remaining > maxWait;

                    if (isCalled) {
                        if (maxTimeoutId) {
                            maxTimeoutId = clearTimeout(maxTimeoutId);
                        }
                        lastCalled = stamp;
                        result = func.apply(thisArg, args);
                    }
                    else if (!maxTimeoutId) {
                        maxTimeoutId = setTimeout(maxDelayed, remaining);
                    }
                }
                if (isCalled && timeoutId) {
                    timeoutId = clearTimeout(timeoutId);
                }
                else if (!timeoutId && wait !== maxWait) {
                    timeoutId = setTimeout(delayed, wait);
                }
                if (leadingCall) {
                    isCalled = true;
                    result = func.apply(thisArg, args);
                }
                if (isCalled && !timeoutId && !maxTimeoutId) {
                    args = thisArg = null;
                }
                return result;
            }
            debounced.cancel = cancel;
            return debounced;
        }

        /**
         * Defers invoking the `func` until the current call stack has cleared. Any
         * additional arguments are provided to `func` when it is invoked.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to defer.
         * @param {...*} [args] The arguments to invoke the function with.
         * @returns {number} Returns the timer id.
         * @example
         *
         * _.defer(function(text) { console.log(text); }, 'deferred');
         * // logs 'deferred' after one or more milliseconds
         */
        function defer(func) {
            return baseDelay(func, 1, arguments, 1);
        }

        /**
         * Invokes `func` after `wait` milliseconds. Any additional arguments are
         * provided to `func` when it is invoked.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to delay.
         * @param {number} wait The number of milliseconds to delay invocation.
         * @param {...*} [args] The arguments to invoke the function with.
         * @returns {number} Returns the timer id.
         * @example
         *
         * _.delay(function(text) { console.log(text); }, 1000, 'later');
         * // => logs 'later' after one second
         */
        function delay(func, wait) {
            return baseDelay(func, wait, arguments, 2);
        }

        /**
         * Creates a function that returns the result of invoking the provided
         * functions with the `this` binding of the created function, where each
         * successive invocation is supplied the return value of the previous.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {...Function} [funcs] Functions to invoke.
         * @returns {Function} Returns the new function.
         * @example
         *
         * function add(x, y) {
         *   return x + y;
         * }
         *
         * function square(n) {
         *   return n * n;
         * }
         *
         * var addSquare = _.flow(add, square);
         * addSquare(1, 2);
         * // => 9
         */
        function flow() {
            var funcs = arguments,
                length = funcs.length;

            if (!length) {
                return function () { };
            }
            if (!arrayEvery(funcs, isFunction)) {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            return function () {
                var index = 0,
                    result = funcs[index].apply(this, arguments);

                while (++index < length) {
                    result = funcs[index].call(this, result);
                }
                return result;
            };
        }

        /**
         * This method is like `_.flow` except that it creates a function that
         * invokes the provided functions from right to left.
         *
         * @static
         * @memberOf _
         * @alias backflow, compose
         * @category Function
         * @param {...Function} [funcs] Functions to invoke.
         * @returns {Function} Returns the new function.
         * @example
         *
         * function add(x, y) {
         *   return x + y;
         * }
         *
         * function square(n) {
         *   return n * n;
         * }
         *
         * var addSquare = _.flowRight(square, add);
         * addSquare(1, 2);
         * // => 9
         */
        function flowRight() {
            var funcs = arguments,
                fromIndex = funcs.length - 1;

            if (fromIndex < 0) {
                return function () { };
            }
            if (!arrayEvery(funcs, isFunction)) {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            return function () {
                var index = fromIndex,
                    result = funcs[index].apply(this, arguments);

                while (index--) {
                    result = funcs[index].call(this, result);
                }
                return result;
            };
        }

        /**
         * Creates a function that memoizes the result of `func`. If `resolver` is
         * provided it determines the cache key for storing the result based on the
         * arguments provided to the memoized function. By default, the first argument
         * provided to the memoized function is coerced to a string and used as the
         * cache key. The `func` is invoked with the `this` binding of the memoized
         * function.
         *
         * **Note:** The cache is exposed as the `cache` property on the memoized
         * function. Its creation may be customized by replacing the `_.memoize.Cache`
         * constructor with one whose instances implement the ES6 `Map` method interface
         * of `get`, `has`, and `set`. See the
         * [ES6 spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-properties-of-the-map-prototype-object)
         * for more details.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to have its output memoized.
         * @param {Function} [resolver] The function to resolve the cache key.
         * @returns {Function} Returns the new memoizing function.
         * @example
         *
         * var upperCase = _.memoize(function(string) {
         *   return string.toUpperCase();
         * });
         *
         * upperCase('fred');
         * // => 'FRED'
         *
         * // modifying the result cache
         * upperCase.cache.set('fred, 'BARNEY');
         * upperCase('fred');
         * // => 'BARNEY'
         *
         * // replacing `_.memoize.Cache`
         * var object = { 'user': 'fred' };
         * var other = { 'user': 'barney' };
         * var identity = _.memoize(_.identity);
         *
         * identity(object);
         * // => { 'user': 'fred' }
         * identity(other);
         * // => { 'user': 'fred' }
         *
         * _.memoize.Cache = WeakMap;
         * var identity = _.memoize(_.identity);
         *
         * identity(object);
         * // => { 'user': 'fred' }
         * identity(other);
         * // => { 'user': 'barney' }
         */
        function memoize(func, resolver) {
            if (!isFunction(func) || (resolver && !isFunction(resolver))) {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            var memoized = function () {
                var cache = memoized.cache,
                    key = resolver ? resolver.apply(this, arguments) : arguments[0];

                if (cache.has(key)) {
                    return cache.get(key);
                }
                var result = func.apply(this, arguments);
                cache.set(key, result);
                return result;
            };
            memoized.cache = new memoize.Cache;
            return memoized;
        }

        /**
         * Creates a function that negates the result of the predicate `func`. The
         * `func` predicate is invoked with the `this` binding and arguments of the
         * created function.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} predicate The predicate to negate.
         * @returns {Function} Returns the new function.
         * @example
         *
         * function isEven(n) {
         *   return n % 2 == 0;
         * }
         *
         * _.filter([1, 2, 3, 4, 5, 6], _.negate(isEven));
         * // => [1, 3, 5]
         */
        function negate(predicate) {
            if (!isFunction(predicate)) {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            return function () {
                return !predicate.apply(this, arguments);
            };
        }

        /**
         * Creates a function that is restricted to invoking `func` once. Repeat calls
         * to the function return the value of the first call. The `func` is invoked
         * with the `this` binding of the created function.
         *
         * @static
         * @memberOf _
         * @type Function
         * @category Function
         * @param {Function} func The function to restrict.
         * @returns {Function} Returns the new restricted function.
         * @example
         *
         * var initialize = _.once(createApplication);
         * initialize();
         * initialize();
         * // `initialize` invokes `createApplication` once
         */
        function once(func) {
            return before(func, 2);
        }

        /**
         * Creates a function that invokes `func` with `partial` arguments prepended
         * to those provided to the new function. This method is like `_.bind` except
         * it does **not** alter the `this` binding.
         *
         * The `_.partial.placeholder` value, which defaults to `_` in monolithic
         * builds, may be used as a placeholder for partially applied arguments.
         *
         * **Note:** This method does not set the `length` property of partially
         * applied functions.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to partially apply arguments to.
         * @param {...*} [args] The arguments to be partially applied.
         * @returns {Function} Returns the new partially applied function.
         * @example
         *
         * var greet = function(greeting, name) {
         *   return greeting + ' ' + name;
         * };
         *
         * var sayHelloTo = _.partial(greet, 'hello');
         * sayHelloTo('fred');
         * // => 'hello fred'
         *
         * // using placeholders
         * var greetFred = _.partial(greet, _, 'fred');
         * greetFred('hi');
         * // => 'hi fred'
         */
        function partial(func) {
            var partials = baseSlice(arguments, 1),
                holders = replaceHolders(partials, partial.placeholder);

            return createWrapper(func, PARTIAL_FLAG, null, partials, holders);
        }

        /**
         * This method is like `_.partial` except that partially applied arguments
         * are appended to those provided to the new function.
         *
         * The `_.partialRight.placeholder` value, which defaults to `_` in monolithic
         * builds, may be used as a placeholder for partially applied arguments.
         *
         * **Note:** This method does not set the `length` property of partially
         * applied functions.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to partially apply arguments to.
         * @param {...*} [args] The arguments to be partially applied.
         * @returns {Function} Returns the new partially applied function.
         * @example
         *
         * var greet = function(greeting, name) {
         *   return greeting + ' ' + name;
         * };
         *
         * var greetFred = _.partialRight(greet, 'fred');
         * greetFred('hi');
         * // => 'hi fred'
         *
         * // using placeholders
         * var sayHelloTo = _.partialRight(greet, 'hello', _);
         * sayHelloTo('fred');
         * // => 'hello fred'
         */
        function partialRight(func) {
            var partials = baseSlice(arguments, 1),
                holders = replaceHolders(partials, partialRight.placeholder);

            return createWrapper(func, PARTIAL_RIGHT_FLAG, null, partials, holders);
        }

        /**
         * Creates a function that invokes `func` with arguments arranged according
         * to the specified indexes where the argument value at the first index is
         * provided as the first argument, the argument value at the second index is
         * provided as the second argument, and so on.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to rearrange arguments for.
         * @param {...(number|number[])} indexes The arranged argument indexes,
         *  specified as individual indexes or arrays of indexes.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var rearged = _.rearg(function(a, b, c) {
         *   return [a, b, c];
         * }, 2, 0, 1);
         *
         * rearged('b', 'c', 'a')
         * // => ['a', 'b', 'c']
         *
         * var map = _.rearg(_.map, [1, 0]);
         * map(function(n) { return n * 3; }, [1, 2, 3]);
         * // => [3, 6, 9]
         */
        function rearg(func) {
            var indexes = baseFlatten(arguments, false, false, 1);
            return createWrapper(func, REARG_FLAG, null, null, null, indexes);
        }

        /**
         * Creates a function that only invokes `func` at most once per every `wait`
         * milliseconds. The created function comes with a `cancel` method to cancel
         * delayed invocations. Provide an options object to indicate that `func`
         * should be invoked on the leading and/or trailing edge of the `wait` timeout.
         * Subsequent calls to the throttled function return the result of the last
         * `func` call.
         *
         * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
         * on the trailing edge of the timeout only if the the throttled function is
         * invoked more than once during the `wait` timeout.
         *
         * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
         * for details over the differences between `_.throttle` and `_.debounce`.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {Function} func The function to throttle.
         * @param {number} wait The number of milliseconds to throttle invocations to.
         * @param {Object} [options] The options object.
         * @param {boolean} [options.leading=true] Specify invoking on the leading
         *  edge of the timeout.
         * @param {boolean} [options.trailing=true] Specify invoking on the trailing
         *  edge of the timeout.
         * @returns {Function} Returns the new throttled function.
         * @example
         *
         * // avoid excessively updating the position while scrolling
         * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
         *
         * // invoke `renewToken` when the click event is fired, but not more than once every 5 minutes
         * var throttled =  _.throttle(renewToken, 300000, { 'trailing': false })
         * jQuery('.interactive').on('click', throttled);
         *
         * // cancel a trailing throttled call
         * jQuery(window).on('popstate', throttled.cancel);
         */
        function throttle(func, wait, options) {
            var leading = true,
                trailing = true;

            if (!isFunction(func)) {
                throw new TypeError(FUNC_ERROR_TEXT);
            }
            if (options === false) {
                leading = false;
            } else if (isObject(options)) {
                leading = 'leading' in options ? !!options.leading : leading;
                trailing = 'trailing' in options ? !!options.trailing : trailing;
            }
            debounceOptions.leading = leading;
            debounceOptions.maxWait = +wait;
            debounceOptions.trailing = trailing;
            return debounce(func, wait, debounceOptions);
        }

        /**
         * Creates a function that provides `value` to the wrapper function as its
         * first argument. Any additional arguments provided to the function are
         * appended to those provided to the wrapper function. The wrapper is invoked
         * with the `this` binding of the created function.
         *
         * @static
         * @memberOf _
         * @category Function
         * @param {*} value The value to wrap.
         * @param {Function} wrapper The wrapper function.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var p = _.wrap(_.escape, function(func, text) {
         *   return '<p>' + func(text) + '</p>';
         * });
         *
         * p('fred, barney, & pebbles');
         * // => '<p>fred, barney, &amp; pebbles</p>'
         */
        function wrap(value, wrapper) {
            wrapper = wrapper == null ? identity : wrapper;
            return createWrapper(wrapper, PARTIAL_FLAG, null, [value], []);
        }

        /*------------------------------------------------------------------------*/

        /**
         * Creates a clone of `value`. If `isDeep` is `true` nested objects are cloned,
         * otherwise they are assigned by reference. If `customizer` is provided it is
         * invoked to produce the cloned values. If `customizer` returns `undefined`
         * cloning is handled by the method instead. The `customizer` is bound to
         * `thisArg` and invoked with two argument; (value [, index|key, object]).
         *
         * **Note:** This method is loosely based on the structured clone algorithm.
         * The enumerable properties of `arguments` objects and objects created by
         * constructors other than `Object` are cloned to plain `Object` objects. An
         * empty object is returned for uncloneable values such as functions, DOM nodes,
         * Maps, Sets, and WeakMaps. See the [HTML5 specification](http://www.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm)
         * for more details.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to clone.
         * @param {boolean} [isDeep] Specify a deep clone.
         * @param {Function} [customizer] The function to customize cloning values.
         * @param {*} [thisArg] The `this` binding of `customizer`.
         * @returns {*} Returns the cloned value.
         * @example
         *
         * var users = [
         *   { 'user': 'barney' },
         *   { 'user': 'fred' }
         * ];
         *
         * var shallow = _.clone(users);
         * shallow[0] === users[0];
         * // => true
         *
         * var deep = _.clone(users, true);
         * deep[0] === users[0];
         * // => false
         *
         * // using a customizer callback
         * var body = _.clone(document.body, function(value) {
         *   return _.isElement(value) ? value.cloneNode(false) : undefined;
         * });
         *
         * body === document.body
         * // => false
         * body.nodeName
         * // => BODY
         * body.childNodes.length;
         * // => 0
         */
        function clone(value, isDeep, customizer, thisArg) {
            // Juggle arguments.
            if (typeof isDeep != 'boolean' && isDeep != null) {
                thisArg = customizer;
                customizer = isIterateeCall(value, isDeep, thisArg) ? null : isDeep;
                isDeep = false;
            }
            customizer = typeof customizer == 'function' && bindCallback(customizer, thisArg, 1);
            return baseClone(value, isDeep, customizer);
        }

        /**
         * Creates a deep clone of `value`. If `customizer` is provided it is invoked
         * to produce the cloned values. If `customizer` returns `undefined` cloning
         * is handled by the method instead. The `customizer` is bound to `thisArg`
         * and invoked with two argument; (value [, index|key, object]).
         *
         * **Note:** This method is loosely based on the structured clone algorithm.
         * The enumerable properties of `arguments` objects and objects created by
         * constructors other than `Object` are cloned to plain `Object` objects. An
         * empty object is returned for uncloneable values such as functions, DOM nodes,
         * Maps, Sets, and WeakMaps. See the [HTML5 specification](http://www.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm)
         * for more details.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to deep clone.
         * @param {Function} [customizer] The function to customize cloning values.
         * @param {*} [thisArg] The `this` binding of `customizer`.
         * @returns {*} Returns the deep cloned value.
         * @example
         *
         * var users = [
         *   { 'user': 'barney' },
         *   { 'user': 'fred' }
         * ];
         *
         * var deep = _.cloneDeep(users);
         * deep[0] === users[0];
         * // => false
         *
         * // using a customizer callback
         * var el = _.cloneDeep(document.body, function(value) {
         *   return _.isElement(value) ? value.cloneNode(true) : undefined;
         * });
         *
         * body === document.body
         * // => false
         * body.nodeName
         * // => BODY
         * body.childNodes.length;
         * // => 20
         */
        function cloneDeep(value, customizer, thisArg) {
            customizer = typeof customizer == 'function' && bindCallback(customizer, thisArg, 1);
            return baseClone(value, true, customizer);
        }

        /**
         * Checks if `value` is classified as an `arguments` object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * (function() { return _.isArguments(arguments); })();
         * // => true
         *
         * _.isArguments([1, 2, 3]);
         * // => false
         */
        function isArguments(value) {
            var length = isObjectLike(value) ? value.length : undefined;
            return (isLength(length) && objToString.call(value) == argsTag) || false;
        }

        /**
         * Checks if `value` is classified as an `Array` object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isArray([1, 2, 3]);
         * // => true
         *
         * (function() { return _.isArray(arguments); })();
         * // => false
         */
        var isArray = nativeIsArray || function (value) {
            return (isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag) || false;
        };

        /**
         * Checks if `value` is classified as a boolean primitive or object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isBoolean(false);
         * // => true
         *
         * _.isBoolean(null);
         * // => false
         */
        function isBoolean(value) {
            return (value === true || value === false || isObjectLike(value) && objToString.call(value) == boolTag) || false;
        }

        /**
         * Checks if `value` is classified as a `Date` object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isDate(new Date);
         * // => true
         *
         * _.isDate('Mon April 23 2012');
         * // => false
         */
        function isDate(value) {
            return (isObjectLike(value) && objToString.call(value) == dateTag) || false;
        }

        /**
         * Checks if `value` is a DOM element.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is a DOM element, else `false`.
         * @example
         *
         * _.isElement(document.body);
         * // => true
         *
         * _.isElement('<body>');
         * // => false
         */
        function isElement(value) {
            return (value && value.nodeType === 1 && isObjectLike(value) &&
              objToString.call(value).indexOf('Element') > -1) || false;
        }
        // Fallback for environments without DOM support.
        if (!support.dom) {
            isElement = function (value) {
                return (value && value.nodeType === 1 && isObjectLike(value) && !isPlainObject(value)) || false;
            };
        }

        /**
         * Checks if a value is empty. A value is considered empty unless it is an
         * `arguments` object, array, string, or jQuery-like collection with a length
         * greater than `0` or an object with own enumerable properties.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {Array|Object|string} value The value to inspect.
         * @returns {boolean} Returns `true` if `value` is empty, else `false`.
         * @example
         *
         * _.isEmpty(null);
         * // => true
         *
         * _.isEmpty(true);
         * // => true
         *
         * _.isEmpty(1);
         * // => true
         *
         * _.isEmpty([1, 2, 3]);
         * // => false
         *
         * _.isEmpty({ 'a': 1 });
         * // => false
         */
        function isEmpty(value) {
            if (value == null) {
                return true;
            }
            var length = value.length;
            if (isLength(length) && (isArray(value) || isString(value) || isArguments(value) ||
                (isObjectLike(value) && isFunction(value.splice)))) {
                return !length;
            }
            return !keys(value).length;
        }

        /**
         * Performs a deep comparison between two values to determine if they are
         * equivalent. If `customizer` is provided it is invoked to compare values.
         * If `customizer` returns `undefined` comparisons are handled by the method
         * instead. The `customizer` is bound to `thisArg` and invoked with three
         * arguments; (value, other [, index|key]).
         *
         * **Note:** This method supports comparing arrays, booleans, `Date` objects,
         * numbers, `Object` objects, regexes, and strings. Functions and DOM nodes
         * are **not** supported. Provide a customizer function to extend support
         * for comparing other values.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to compare.
         * @param {*} other The other value to compare.
         * @param {Function} [customizer] The function to customize comparing values.
         * @param {*} [thisArg] The `this` binding of `customizer`.
         * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
         * @example
         *
         * var object = { 'user': 'fred' };
         * var other = { 'user': 'fred' };
         *
         * object == other;
         * // => false
         *
         * _.isEqual(object, other);
         * // => true
         *
         * // using a customizer callback
         * var array = ['hello', 'goodbye'];
         * var other = ['hi', 'goodbye'];
         *
         * _.isEqual(array, other, function(value, other) {
         *   return _.every([value, other], RegExp.prototype.test, /^h(?:i|ello)$/) || undefined;
         * });
         * // => true
         */
        function isEqual(value, other, customizer, thisArg) {
            customizer = typeof customizer == 'function' && bindCallback(customizer, thisArg, 3);
            if (!customizer && isStrictComparable(value) && isStrictComparable(other)) {
                return value === other;
            }
            var result = customizer ? customizer(value, other) : undefined;
            return typeof result == 'undefined' ? baseIsEqual(value, other, customizer) : !!result;
        }

        /**
         * Checks if `value` is an `Error`, `EvalError`, `RangeError`, `ReferenceError`,
         * `SyntaxError`, `TypeError`, or `URIError` object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is an error object, else `false`.
         * @example
         *
         * _.isError(new Error);
         * // => true
         *
         * _.isError(Error);
         * // => false
         */
        function isError(value) {
            return (isObjectLike(value) && typeof value.message == 'string' && objToString.call(value) == errorTag) || false;
        }

        /**
         * Checks if `value` is a finite primitive number.
         *
         * **Note:** This method is based on ES6 `Number.isFinite`. See the
         * [ES6 spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.isfinite)
         * for more details.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is a finite number, else `false`.
         * @example
         *
         * _.isFinite(10);
         * // => true
         *
         * _.isFinite('10');
         * // => false
         *
         * _.isFinite(true);
         * // => false
         *
         * _.isFinite(Object(10));
         * // => false
         *
         * _.isFinite(Infinity);
         * // => false
         */
        var isFinite = nativeNumIsFinite || function (value) {
            return typeof value == 'number' && nativeIsFinite(value);
        };

        /**
         * Checks if `value` is classified as a `Function` object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isFunction(_);
         * // => true
         *
         * _.isFunction(/abc/);
         * // => false
         */
        function isFunction(value) {
            // Avoid a Chakra JIT bug in compatibility modes of IE 11.
            // See https://github.com/jashkenas/underscore/issues/1621.
            return typeof value == 'function' || false;
        }
        // Fallback for environments that return incorrect `typeof` operator results.
        if (isFunction(/x/) || (Uint8Array && !isFunction(Uint8Array))) {
            isFunction = function (value) {
                // The use of `Object#toString` avoids issues with the `typeof` operator
                // in older versions of Chrome and Safari which return 'function' for regexes
                // and Safari 8 equivalents which return 'object' for typed array constructors.
                return objToString.call(value) == funcTag;
            };
        }

        /**
         * Checks if `value` is the language type of `Object`.
         * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
         *
         * **Note:** See the [ES5 spec](http://es5.github.io/#x8) for more details.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is an object, else `false`.
         * @example
         *
         * _.isObject({});
         * // => true
         *
         * _.isObject([1, 2, 3]);
         * // => true
         *
         * _.isObject(1);
         * // => false
         */
        function isObject(value) {
            // Avoid a V8 JIT bug in Chrome 19-20.
            // See https://code.google.com/p/v8/issues/detail?id=2291.
            var type = typeof value;
            return type == 'function' || (value && type == 'object') || false;
        }

        /**
         * Performs a deep comparison between `object` and `source` to determine if
         * `object` contains equivalent property values. If `customizer` is provided
         * it is invoked to compare values. If `customizer` returns `undefined`
         * comparisons are handled by the method instead. The `customizer` is bound
         * to `thisArg` and invoked with three arguments; (value, other, index|key).
         *
         * **Note:** This method supports comparing properties of arrays, booleans,
         * `Date` objects, numbers, `Object` objects, regexes, and strings. Functions
         * and DOM nodes are **not** supported. Provide a customizer function to extend
         * support for comparing other values.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {Object} source The object to inspect.
         * @param {Object} source The object of property values to match.
         * @param {Function} [customizer] The function to customize comparing values.
         * @param {*} [thisArg] The `this` binding of `customizer`.
         * @returns {boolean} Returns `true` if `object` is a match, else `false`.
         * @example
         *
         * var object = { 'user': 'fred', 'age': 40 };
         *
         * _.isMatch(object, { 'age': 40 });
         * // => true
         *
         * _.isMatch(object, { 'age': 36 });
         * // => false
         *
         * // using a customizer callback
         * var object = { 'greeting': 'hello' };
         * var source = { 'greeting': 'hi' };
         *
         * _.isMatch(object, source, function(value, other) {
         *   return _.every([value, other], RegExp.prototype.test, /^h(?:i|ello)$/) || undefined;
         * });
         * // => true
         */
        function isMatch(object, source, customizer, thisArg) {
            var props = keys(source),
                length = props.length;

            customizer = typeof customizer == 'function' && bindCallback(customizer, thisArg, 3);
            if (!customizer && length == 1) {
                var key = props[0],
                    value = source[key];

                if (isStrictComparable(value)) {
                    return object != null && value === object[key] && hasOwnProperty.call(object, key);
                }
            }
            var values = Array(length),
                strictCompareFlags = Array(length);

            while (length--) {
                value = values[length] = source[props[length]];
                strictCompareFlags[length] = isStrictComparable(value);
            }
            return baseIsMatch(object, props, values, strictCompareFlags, customizer);
        }

        /**
         * Checks if `value` is `NaN`.
         *
         * **Note:** This method is not the same as native `isNaN` which returns `true`
         * for `undefined` and other non-numeric values. See the [ES5 spec](http://es5.github.io/#x15.1.2.4)
         * for more details.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
         * @example
         *
         * _.isNaN(NaN);
         * // => true
         *
         * _.isNaN(new Number(NaN));
         * // => true
         *
         * isNaN(undefined);
         * // => true
         *
         * _.isNaN(undefined);
         * // => false
         */
        function isNaN(value) {
            // An `NaN` primitive is the only value that is not equal to itself.
            // Perform the `toStringTag` check first to avoid errors with some host objects in IE.
            return isNumber(value) && value != +value;
        }

        /**
         * Checks if `value` is a native function.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
         * @example
         *
         * _.isNative(Array.prototype.push);
         * // => true
         *
         * _.isNative(_);
         * // => false
         */
        function isNative(value) {
            if (value == null) {
                return false;
            }
            if (objToString.call(value) == funcTag) {
                return reNative.test(fnToString.call(value));
            }
            return (isObjectLike(value) && reHostCtor.test(value)) || false;
        }

        /**
         * Checks if `value` is `null`.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is `null`, else `false`.
         * @example
         *
         * _.isNull(null);
         * // => true
         *
         * _.isNull(void 0);
         * // => false
         */
        function isNull(value) {
            return value === null;
        }

        /**
         * Checks if `value` is classified as a `Number` primitive or object.
         *
         * **Note:** To exclude `Infinity`, `-Infinity`, and `NaN`, which are classified
         * as numbers, use the `_.isFinite` method.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isNumber(8.4);
         * // => true
         *
         * _.isNumber(NaN);
         * // => true
         *
         * _.isNumber('8.4');
         * // => false
         */
        function isNumber(value) {
            return typeof value == 'number' || (isObjectLike(value) && objToString.call(value) == numberTag) || false;
        }

        /**
         * Checks if `value` is a plain object, that is, an object created by the
         * `Object` constructor or one with a `[[Prototype]]` of `null`.
         *
         * **Note:** This method assumes objects created by the `Object` constructor
         * have no inherited enumerable properties.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
         * @example
         *
         * function Foo() {
         *   this.a = 1;
         * }
         *
         * _.isPlainObject(new Foo);
         * // => false
         *
         * _.isPlainObject([1, 2, 3]);
         * // => false
         *
         * _.isPlainObject({ 'x': 0, 'y': 0 });
         * // => true
         *
         * _.isPlainObject(Object.create(null));
         * // => true
         */
        var isPlainObject = !getPrototypeOf ? shimIsPlainObject : function (value) {
            if (!(value && objToString.call(value) == objectTag)) {
                return false;
            }
            var valueOf = value.valueOf,
                objProto = isNative(valueOf) && (objProto = getPrototypeOf(valueOf)) && getPrototypeOf(objProto);

            return objProto
              ? (value == objProto || getPrototypeOf(value) == objProto)
              : shimIsPlainObject(value);
        };

        /**
         * Checks if `value` is classified as a `RegExp` object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isRegExp(/abc/);
         * // => true
         *
         * _.isRegExp('/abc/');
         * // => false
         */
        function isRegExp(value) {
            return (isObjectLike(value) && objToString.call(value) == regexpTag) || false;
        }

        /**
         * Checks if `value` is classified as a `String` primitive or object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isString('abc');
         * // => true
         *
         * _.isString(1);
         * // => false
         */
        function isString(value) {
            return typeof value == 'string' || (isObjectLike(value) && objToString.call(value) == stringTag) || false;
        }

        /**
         * Checks if `value` is classified as a typed array.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
         * @example
         *
         * _.isTypedArray(new Uint8Array);
         * // => true
         *
         * _.isTypedArray([]);
         * // => false
         */
        function isTypedArray(value) {
            return (isObjectLike(value) && isLength(value.length) && typedArrayTags[objToString.call(value)]) || false;
        }

        /**
         * Checks if `value` is `undefined`.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to check.
         * @returns {boolean} Returns `true` if `value` is `undefined`, else `false`.
         * @example
         *
         * _.isUndefined(void 0);
         * // => true
         *
         * _.isUndefined(null);
         * // => false
         */
        function isUndefined(value) {
            return typeof value == 'undefined';
        }

        /**
         * Converts `value` to an array.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to convert.
         * @returns {Array} Returns the converted array.
         * @example
         *
         * (function() { return _.toArray(arguments).slice(1); })(1, 2, 3);
         * // => [2, 3]
         */
        function toArray(value) {
            var length = value ? value.length : 0;
            if (!isLength(length)) {
                return values(value);
            }
            if (!length) {
                return [];
            }
            return arrayCopy(value);
        }

        /**
         * Converts `value` to a plain object flattening inherited enumerable
         * properties of `value` to own properties of the plain object.
         *
         * @static
         * @memberOf _
         * @category Lang
         * @param {*} value The value to convert.
         * @returns {Object} Returns the converted plain object.
         * @example
         *
         * function Foo() {
         *   this.b = 2;
         * }
         *
         * Foo.prototype.c = 3;
         *
         * _.assign({ 'a': 1 }, new Foo);
         * // => { 'a': 1, 'b': 2 }
         *
         * _.assign({ 'a': 1 }, _.toPlainObject(new Foo));
         * // => { 'a': 1, 'b': 2, 'c': 3 }
         */
        function toPlainObject(value) {
            return baseCopy(value, keysIn(value));
        }

        /*------------------------------------------------------------------------*/

        /**
         * Assigns own enumerable properties of source object(s) to the destination
         * object. Subsequent sources overwrite property assignments of previous sources.
         * If `customizer` is provided it is invoked to produce the assigned values.
         * The `customizer` is bound to `thisArg` and invoked with five arguments;
         * (objectValue, sourceValue, key, object, source).
         *
         * @static
         * @memberOf _
         * @alias extend
         * @category Object
         * @param {Object} object The destination object.
         * @param {...Object} [sources] The source objects.
         * @param {Function} [customizer] The function to customize assigning values.
         * @param {*} [thisArg] The `this` binding of `customizer`.
         * @returns {Object} Returns `object`.
         * @example
         *
         * _.assign({ 'user': 'barney' }, { 'age': 40 }, { 'user': 'fred' });
         * // => { 'user': 'fred', 'age': 40 }
         *
         * // using a customizer callback
         * var defaults = _.partialRight(_.assign, function(value, other) {
         *   return typeof value == 'undefined' ? other : value;
         * });
         *
         * defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
         * // => { 'user': 'barney', 'age': 36 }
         */
        var assign = createAssigner(baseAssign);

        /**
         * Creates an object that inherits from the given `prototype` object. If a
         * `properties` object is provided its own enumerable properties are assigned
         * to the created object.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} prototype The object to inherit from.
         * @param {Object} [properties] The properties to assign to the object.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Object} Returns the new object.
         * @example
         *
         * function Shape() {
         *   this.x = 0;
         *   this.y = 0;
         * }
         *
         * function Circle() {
         *   Shape.call(this);
         * }
         *
         * Circle.prototype = _.create(Shape.prototype, { 'constructor': Circle });
         *
         * var circle = new Circle;
         * circle instanceof Circle;
         * // => true
         *
         * circle instanceof Shape;
         * // => true
         */
        function create(prototype, properties, guard) {
            var result = baseCreate(prototype);
            if (guard && isIterateeCall(prototype, properties, guard)) {
                properties = null;
            }
            return properties ? baseCopy(properties, result, keys(properties)) : result;
        }

        /**
         * Assigns own enumerable properties of source object(s) to the destination
         * object for all destination properties that resolve to `undefined`. Once a
         * property is set, additional defaults of the same property are ignored.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The destination object.
         * @param {...Object} [sources] The source objects.
         * @returns {Object} Returns `object`.
         * @example
         *
         * _.defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
         * // => { 'user': 'barney', 'age': 36 }
         */
        function defaults(object) {
            if (object == null) {
                return object;
            }
            var args = arrayCopy(arguments);
            args.push(assignDefaults);
            return assign.apply(undefined, args);
        }

        /**
         * This method is like `_.findIndex` except that it returns the key of the
         * first element `predicate` returns truthy for, instead of the element itself.
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to search.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {string|undefined} Returns the key of the matched element, else `undefined`.
         * @example
         *
         * var users = {
         *   'barney':  { 'age': 36, 'active': true },
         *   'fred':    { 'age': 40, 'active': false },
         *   'pebbles': { 'age': 1,  'active': true }
         * };
         *
         * _.findKey(users, function(chr) { return chr.age < 40; });
         * // => 'barney' (iteration order is not guaranteed)
         *
         * // using the "_.matches" callback shorthand
         * _.findKey(users, { 'age': 1 });
         * // => 'pebbles'
         *
         * // using the "_.property" callback shorthand
         * _.findKey(users, 'active');
         * // => 'barney'
         */
        function findKey(object, predicate, thisArg) {
            predicate = getCallback(predicate, thisArg, 3);
            return baseFind(object, predicate, baseForOwn, true);
        }

        /**
         * This method is like `_.findKey` except that it iterates over elements of
         * a collection in the opposite order.
         *
         * If a property name is provided for `predicate` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `predicate` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to search.
         * @param {Function|Object|string} [predicate=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {string|undefined} Returns the key of the matched element, else `undefined`.
         * @example
         *
         * var users = {
         *   'barney':  { 'age': 36, 'active': true },
         *   'fred':    { 'age': 40, 'active': false },
         *   'pebbles': { 'age': 1,  'active': true }
         * };
         *
         * _.findLastKey(users, function(chr) { return chr.age < 40; });
         * // => returns `pebbles` assuming `_.findKey` returns `barney`
         *
         * // using the "_.matches" callback shorthand
         * _.findLastKey(users, { 'age': 36 });
         * // => 'barney'
         *
         * // using the "_.property" callback shorthand
         * _.findLastKey(users, 'active');
         * // => 'pebbles'
         */
        function findLastKey(object, predicate, thisArg) {
            predicate = getCallback(predicate, thisArg, 3);
            return baseFind(object, predicate, baseForOwnRight, true);
        }

        /**
         * Iterates over own and inherited enumerable properties of an object invoking
         * `iteratee` for each property. The `iteratee` is bound to `thisArg` and invoked
         * with three arguments; (value, key, object). Iterator functions may exit
         * iteration early by explicitly returning `false`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns `object`.
         * @example
         *
         * function Foo() {
         *   this.a = 1;
         *   this.b = 2;
         * }
         *
         * Foo.prototype.c = 3;
         *
         * _.forIn(new Foo, function(value, key) {
         *   console.log(key);
         * });
         * // => logs 'a', 'b', and 'c' (iteration order is not guaranteed)
         */
        function forIn(object, iteratee, thisArg) {
            if (typeof iteratee != 'function' || typeof thisArg != 'undefined') {
                iteratee = bindCallback(iteratee, thisArg, 3);
            }
            return baseFor(object, iteratee, keysIn);
        }

        /**
         * This method is like `_.forIn` except that it iterates over properties of
         * `object` in the opposite order.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns `object`.
         * @example
         *
         * function Foo() {
         *   this.a = 1;
         *   this.b = 2;
         * }
         *
         * Foo.prototype.c = 3;
         *
         * _.forInRight(new Foo, function(value, key) {
         *   console.log(key);
         * });
         * // => logs 'c', 'b', and 'a' assuming `_.forIn ` logs 'a', 'b', and 'c'
         */
        function forInRight(object, iteratee, thisArg) {
            iteratee = bindCallback(iteratee, thisArg, 3);
            return baseForRight(object, iteratee, keysIn);
        }

        /**
         * Iterates over own enumerable properties of an object invoking `iteratee`
         * for each property. The `iteratee` is bound to `thisArg` and invoked with
         * three arguments; (value, key, object). Iterator functions may exit iteration
         * early by explicitly returning `false`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns `object`.
         * @example
         *
         * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(n, key) {
         *   console.log(key);
         * });
         * // => logs '0', '1', and 'length' (iteration order is not guaranteed)
         */
        function forOwn(object, iteratee, thisArg) {
            if (typeof iteratee != 'function' || typeof thisArg != 'undefined') {
                iteratee = bindCallback(iteratee, thisArg, 3);
            }
            return baseForOwn(object, iteratee);
        }

        /**
         * This method is like `_.forOwn` except that it iterates over properties of
         * `object` in the opposite order.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns `object`.
         * @example
         *
         * _.forOwnRight({ '0': 'zero', '1': 'one', 'length': 2 }, function(n, key) {
         *   console.log(key);
         * });
         * // => logs 'length', '1', and '0' assuming `_.forOwn` logs '0', '1', and 'length'
         */
        function forOwnRight(object, iteratee, thisArg) {
            iteratee = bindCallback(iteratee, thisArg, 3);
            return baseForRight(object, iteratee, keys);
        }

        /**
         * Creates an array of function property names from all enumerable properties,
         * own and inherited, of `object`.
         *
         * @static
         * @memberOf _
         * @alias methods
         * @category Object
         * @param {Object} object The object to inspect.
         * @returns {Array} Returns the new array of property names.
         * @example
         *
         * _.functions(_);
         * // => ['all', 'any', 'bind', ...]
         */
        function functions(object) {
            return baseFunctions(object, keysIn(object));
        }

        /**
         * Checks if `key` exists as a direct property of `object` instead of an
         * inherited property.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to inspect.
         * @param {string} key The key to check.
         * @returns {boolean} Returns `true` if `key` is a direct property, else `false`.
         * @example
         *
         * _.has({ 'a': 1, 'b': 2, 'c': 3 }, 'b');
         * // => true
         */
        function has(object, key) {
            return object ? hasOwnProperty.call(object, key) : false;
        }

        /**
         * Creates an object composed of the inverted keys and values of `object`.
         * If `object` contains duplicate values, subsequent values overwrite property
         * assignments of previous values unless `multiValue` is `true`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to invert.
         * @param {boolean} [multiValue] Allow multiple values per key.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Object} Returns the new inverted object.
         * @example
         *
         * _.invert({ 'first': 'fred', 'second': 'barney' });
         * // => { 'fred': 'first', 'barney': 'second' }
         *
         * // without `multiValue`
         * _.invert({ 'first': 'fred', 'second': 'barney', 'third': 'fred' });
         * // => { 'fred': 'third', 'barney': 'second' }
         *
         * // with `multiValue`
         * _.invert({ 'first': 'fred', 'second': 'barney', 'third': 'fred' }, true);
         * // => { 'fred': ['first', 'third'], 'barney': ['second'] }
         */
        function invert(object, multiValue, guard) {
            if (guard && isIterateeCall(object, multiValue, guard)) {
                multiValue = null;
            }
            var index = -1,
                props = keys(object),
                length = props.length,
                result = {};

            while (++index < length) {
                var key = props[index],
                    value = object[key];

                if (multiValue) {
                    if (hasOwnProperty.call(result, value)) {
                        result[value].push(key);
                    } else {
                        result[value] = [key];
                    }
                }
                else {
                    result[value] = key;
                }
            }
            return result;
        }

        /**
         * Creates an array of the own enumerable property names of `object`.
         *
         * **Note:** Non-object values are coerced to objects. See the
         * [ES6 spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.keys)
         * for more details.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to inspect.
         * @returns {Array} Returns the array of property names.
         * @example
         *
         * function Foo() {
         *   this.a = 1;
         *   this.b = 2;
         * }
         *
         * Foo.prototype.c = 3;
         *
         * _.keys(new Foo);
         * // => ['a', 'b'] (iteration order is not guaranteed)
         *
         * _.keys('hi');
         * // => ['0', '1']
         */
        var keys = !nativeKeys ? shimKeys : function (object) {
            if (object) {
                var Ctor = object.constructor,
                    length = object.length;
            }
            if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
               (typeof object != 'function' && (length && isLength(length)))) {
                return shimKeys(object);
            }
            return isObject(object) ? nativeKeys(object) : [];
        };

        /**
         * Creates an array of the own and inherited enumerable property names of `object`.
         *
         * **Note:** Non-object values are coerced to objects.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to inspect.
         * @returns {Array} Returns the array of property names.
         * @example
         *
         * function Foo() {
         *   this.a = 1;
         *   this.b = 2;
         * }
         *
         * Foo.prototype.c = 3;
         *
         * _.keysIn(new Foo);
         * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
         */
        function keysIn(object) {
            if (object == null) {
                return [];
            }
            if (!isObject(object)) {
                object = Object(object);
            }
            var length = object.length;
            length = (length && isLength(length) &&
              (isArray(object) || (support.nonEnumArgs && isArguments(object))) && length) || 0;

            var Ctor = object.constructor,
                index = -1,
                isProto = typeof Ctor == 'function' && Ctor.prototype == object,
                result = Array(length),
                skipIndexes = length > 0;

            while (++index < length) {
                result[index] = (index + '');
            }
            for (var key in object) {
                if (!(skipIndexes && isIndex(key, length)) &&
                    !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
                    result.push(key);
                }
            }
            return result;
        }

        /**
         * Creates an object with the same keys as `object` and values generated by
         * running each own enumerable property of `object` through `iteratee`. The
         * iteratee function is bound to `thisArg` and invoked with three arguments;
         * (value, key, object).
         *
         * If a property name is provided for `iteratee` the created "_.property"
         * style callback returns the property value of the given element.
         *
         * If an object is provided for `iteratee` the created "_.matches" style
         * callback returns `true` for elements that have the properties of the given
         * object, else `false`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to iterate over.
         * @param {Function|Object|string} [iteratee=_.identity] The function invoked
         *  per iteration. If a property name or object is provided it is used to
         *  create a "_.property" or "_.matches" style callback respectively.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Object} Returns the new mapped object.
         * @example
         *
         * _.mapValues({ 'a': 1, 'b': 2, 'c': 3} , function(n) { return n * 3; });
         * // => { 'a': 3, 'b': 6, 'c': 9 }
         *
         * var users = {
         *   'fred':    { 'user': 'fred',    'age': 40 },
         *   'pebbles': { 'user': 'pebbles', 'age': 1 }
         * };
         *
         * // using the "_.property" callback shorthand
         * _.mapValues(users, 'age');
         * // => { 'fred': 40, 'pebbles': 1 } (iteration order is not guaranteed)
         */
        function mapValues(object, iteratee, thisArg) {
            var result = {};
            iteratee = getCallback(iteratee, thisArg, 3);

            baseForOwn(object, function (value, key, object) {
                result[key] = iteratee(value, key, object);
            });
            return result;
        }

        /**
         * Recursively merges own enumerable properties of the source object(s), that
         * don't resolve to `undefined` into the destination object. Subsequent sources
         * overwrite property assignments of previous sources. If `customizer` is
         * provided it is invoked to produce the merged values of the destination and
         * source properties. If `customizer` returns `undefined` merging is handled
         * by the method instead. The `customizer` is bound to `thisArg` and invoked
         * with five arguments; (objectValue, sourceValue, key, object, source).
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The destination object.
         * @param {...Object} [sources] The source objects.
         * @param {Function} [customizer] The function to customize merging properties.
         * @param {*} [thisArg] The `this` binding of `customizer`.
         * @returns {Object} Returns `object`.
         * @example
         *
         * var users = {
         *   'data': [{ 'user': 'barney' }, { 'user': 'fred' }]
         * };
         *
         * var ages = {
         *   'data': [{ 'age': 36 }, { 'age': 40 }]
         * };
         *
         * _.merge(users, ages);
         * // => { 'data': [{ 'user': 'barney', 'age': 36 }, { 'user': 'fred', 'age': 40 }] }
         *
         * // using a customizer callback
         * var object = {
         *   'fruits': ['apple'],
         *   'vegetables': ['beet']
         * };
         *
         * var other = {
         *   'fruits': ['banana'],
         *   'vegetables': ['carrot']
         * };
         *
         * _.merge(object, other, function(a, b) {
         *   return _.isArray(a) ? a.concat(b) : undefined;
         * });
         * // => { 'fruits': ['apple', 'banana'], 'vegetables': ['beet', 'carrot'] }
         */
        var merge = createAssigner(baseMerge);

        /**
         * The opposite of `_.pick`; this method creates an object composed of the
         * own and inherited enumerable properties of `object` that are not omitted.
         * Property names may be specified as individual arguments or as arrays of
         * property names. If `predicate` is provided it is invoked for each property
         * of `object` omitting the properties `predicate` returns truthy for. The
         * predicate is bound to `thisArg` and invoked with three arguments;
         * (value, key, object).
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The source object.
         * @param {Function|...(string|string[])} [predicate] The function invoked per
         *  iteration or property names to omit, specified as individual property
         *  names or arrays of property names.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Object} Returns the new object.
         * @example
         *
         * var object = { 'user': 'fred', 'age': 40 };
         *
         * _.omit(object, 'age');
         * // => { 'user': 'fred' }
         *
         * _.omit(object, _.isNumber);
         * // => { 'user': 'fred' }
         */
        function omit(object, predicate, thisArg) {
            if (object == null) {
                return {};
            }
            if (typeof predicate != 'function') {
                var props = arrayMap(baseFlatten(arguments, false, false, 1), String);
                return pickByArray(object, baseDifference(keysIn(object), props));
            }
            predicate = bindCallback(predicate, thisArg, 3);
            return pickByCallback(object, function (value, key, object) {
                return !predicate(value, key, object);
            });
        }

        /**
         * Creates a two dimensional array of the key-value pairs for `object`,
         * e.g. `[[key1, value1], [key2, value2]]`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to inspect.
         * @returns {Array} Returns the new array of key-value pairs.
         * @example
         *
         * _.pairs({ 'barney': 36, 'fred': 40 });
         * // => [['barney', 36], ['fred', 40]] (iteration order is not guaranteed)
         */
        function pairs(object) {
            var index = -1,
                props = keys(object),
                length = props.length,
                result = Array(length);

            while (++index < length) {
                var key = props[index];
                result[index] = [key, object[key]];
            }
            return result;
        }

        /**
         * Creates an object composed of the picked `object` properties. Property
         * names may be specified as individual arguments or as arrays of property
         * names. If `predicate` is provided it is invoked for each property of `object`
         * picking the properties `predicate` returns truthy for. The predicate is
         * bound to `thisArg` and invoked with three arguments; (value, key, object).
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The source object.
         * @param {Function|...(string|string[])} [predicate] The function invoked per
         *  iteration or property names to pick, specified as individual property
         *  names or arrays of property names.
         * @param {*} [thisArg] The `this` binding of `predicate`.
         * @returns {Object} Returns the new object.
         * @example
         *
         * var object = { 'user': 'fred', 'age': 40 };
         *
         * _.pick(object, 'user');
         * // => { 'user': 'fred' }
         *
         * _.pick(object, _.isString);
         * // => { 'user': 'fred' }
         */
        function pick(object, predicate, thisArg) {
            if (object == null) {
                return {};
            }
            return typeof predicate == 'function'
              ? pickByCallback(object, bindCallback(predicate, thisArg, 3))
              : pickByArray(object, baseFlatten(arguments, false, false, 1));
        }

        /**
         * Resolves the value of property `key` on `object`. If the value of `key` is
         * a function it is invoked with the `this` binding of `object` and its result
         * is returned, else the property value is returned. If the property value is
         * `undefined` the `defaultValue` is used in its place.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to query.
         * @param {string} key The key of the property to resolve.
         * @param {*} [defaultValue] The value returned if the property value
         *  resolves to `undefined`.
         * @returns {*} Returns the resolved value.
         * @example
         *
         * var object = { 'user': 'fred', 'age': _.constant(40) };
         *
         * _.result(object, 'user');
         * // => 'fred'
         *
         * _.result(object, 'age');
         * // => 40
         *
         * _.result(object, 'status', 'busy');
         * // => 'busy'
         *
         * _.result(object, 'status', _.constant('busy'));
         * // => 'busy'
         */
        function result(object, key, defaultValue) {
            var value = object == null ? undefined : object[key];
            if (typeof value == 'undefined') {
                value = defaultValue;
            }
            return isFunction(value) ? value.call(object) : value;
        }

        /**
         * An alternative to `_.reduce`; this method transforms `object` to a new
         * `accumulator` object which is the result of running each of its own enumerable
         * properties through `iteratee`, with each invocation potentially mutating
         * the `accumulator` object. The `iteratee` is bound to `thisArg` and invoked
         * with four arguments; (accumulator, value, key, object). Iterator functions
         * may exit iteration early by explicitly returning `false`.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Array|Object} object The object to iterate over.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [accumulator] The custom accumulator value.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {*} Returns the accumulated value.
         * @example
         *
         * var squares = _.transform([1, 2, 3, 4, 5, 6], function(result, n) {
         *   n *= n;
         *   if (n % 2) {
         *     return result.push(n) < 3;
         *   }
         * });
         * // => [1, 9, 25]
         *
         * var mapped = _.transform({ 'a': 1, 'b': 2, 'c': 3 }, function(result, n, key) {
         *   result[key] = n * 3;
         * });
         * // => { 'a': 3, 'b': 6, 'c': 9 }
         */
        function transform(object, iteratee, accumulator, thisArg) {
            var isArr = isArray(object) || isTypedArray(object);
            iteratee = getCallback(iteratee, thisArg, 4);

            if (accumulator == null) {
                if (isArr || isObject(object)) {
                    var Ctor = object.constructor;
                    if (isArr) {
                        accumulator = isArray(object) ? new Ctor : [];
                    } else {
                        accumulator = baseCreate(typeof Ctor == 'function' && Ctor.prototype);
                    }
                } else {
                    accumulator = {};
                }
            }
            (isArr ? arrayEach : baseForOwn)(object, function (value, index, object) {
                return iteratee(accumulator, value, index, object);
            });
            return accumulator;
        }

        /**
         * Creates an array of the own enumerable property values of `object`.
         *
         * **Note:** Non-object values are coerced to objects.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to query.
         * @returns {Array} Returns the array of property values.
         * @example
         *
         * function Foo() {
         *   this.a = 1;
         *   this.b = 2;
         * }
         *
         * Foo.prototype.c = 3;
         *
         * _.values(new Foo);
         * // => [1, 2] (iteration order is not guaranteed)
         *
         * _.values('hi');
         * // => ['h', 'i']
         */
        function values(object) {
            return baseValues(object, keys(object));
        }

        /**
         * Creates an array of the own and inherited enumerable property values
         * of `object`.
         *
         * **Note:** Non-object values are coerced to objects.
         *
         * @static
         * @memberOf _
         * @category Object
         * @param {Object} object The object to query.
         * @returns {Array} Returns the array of property values.
         * @example
         *
         * function Foo() {
         *   this.a = 1;
         *   this.b = 2;
         * }
         *
         * Foo.prototype.c = 3;
         *
         * _.valuesIn(new Foo);
         * // => [1, 2, 3] (iteration order is not guaranteed)
         */
        function valuesIn(object) {
            return baseValues(object, keysIn(object));
        }

        /*------------------------------------------------------------------------*/

        /**
         * Produces a random number between `min` and `max` (inclusive). If only one
         * argument is provided a number between `0` and the given number is returned.
         * If `floating` is `true`, or either `min` or `max` are floats, a floating-point
         * number is returned instead of an integer.
         *
         * @static
         * @memberOf _
         * @category Number
         * @param {number} [min=0] The minimum possible value.
         * @param {number} [max=1] The maximum possible value.
         * @param {boolean} [floating] Specify returning a floating-point number.
         * @returns {number} Returns the random number.
         * @example
         *
         * _.random(0, 5);
         * // => an integer between 0 and 5
         *
         * _.random(5);
         * // => also an integer between 0 and 5
         *
         * _.random(5, true);
         * // => a floating-point number between 0 and 5
         *
         * _.random(1.2, 5.2);
         * // => a floating-point number between 1.2 and 5.2
         */
        function random(min, max, floating) {
            if (floating && isIterateeCall(min, max, floating)) {
                max = floating = null;
            }
            var noMin = min == null,
                noMax = max == null;

            if (floating == null) {
                if (noMax && typeof min == 'boolean') {
                    floating = min;
                    min = 1;
                }
                else if (typeof max == 'boolean') {
                    floating = max;
                    noMax = true;
                }
            }
            if (noMin && noMax) {
                max = 1;
                noMax = false;
            }
            min = +min || 0;
            if (noMax) {
                max = min;
                min = 0;
            } else {
                max = +max || 0;
            }
            if (floating || min % 1 || max % 1) {
                var rand = nativeRandom();
                return nativeMin(min + (rand * (max - min + parseFloat('1e-' + ((rand + '').length - 1)))), max);
            }
            return baseRandom(min, max);
        }

        /*------------------------------------------------------------------------*/

        /**
         * Converts `string` to camel case.
         * See [Wikipedia](http://en.wikipedia.org/wiki/CamelCase) for more details.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to convert.
         * @returns {string} Returns the camel cased string.
         * @example
         *
         * _.camelCase('Foo Bar');
         * // => 'fooBar'
         *
         * _.camelCase('--foo-bar');
         * // => 'fooBar'
         *
         * _.camelCase('__foo_bar__');
         * // => 'fooBar'
         */
        var camelCase = createCompounder(function (result, word, index) {
            word = word.toLowerCase();
            return index ? (result + word.charAt(0).toUpperCase() + word.slice(1)) : word;
        });

        /**
         * Capitalizes the first character of `string`.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to capitalize.
         * @returns {string} Returns the capitalized string.
         * @example
         *
         * _.capitalize('fred');
         * // => 'Fred'
         */
        function capitalize(string) {
            string = baseToString(string);
            return string && (string.charAt(0).toUpperCase() + string.slice(1));
        }

        /**
         * Deburrs `string` by converting latin-1 supplementary letters to basic latin letters.
         * See [Wikipedia](http://en.wikipedia.org/wiki/Latin-1_Supplement_(Unicode_block)#Character_table)
         * for more details.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to deburr.
         * @returns {string} Returns the deburred string.
         * @example
         *
         * _.deburr('déjà vu');
         * // => 'deja vu'
         */
        function deburr(string) {
            string = baseToString(string);
            return string && string.replace(reLatin1, deburrLetter);
        }

        /**
         * Checks if `string` ends with the given target string.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to search.
         * @param {string} [target] The string to search for.
         * @param {number} [position=string.length] The position to search from.
         * @returns {boolean} Returns `true` if `string` ends with `target`, else `false`.
         * @example
         *
         * _.endsWith('abc', 'c');
         * // => true
         *
         * _.endsWith('abc', 'b');
         * // => false
         *
         * _.endsWith('abc', 'b', 2);
         * // => true
         */
        function endsWith(string, target, position) {
            string = baseToString(string);
            target = (target + '');

            var length = string.length;
            position = (typeof position == 'undefined' ? length : nativeMin(position < 0 ? 0 : (+position || 0), length)) - target.length;
            return position >= 0 && string.indexOf(target, position) == position;
        }

        /**
         * Converts the characters "&", "<", ">", '"', "'", and '`', in `string` to
         * their corresponding HTML entities.
         *
         * **Note:** No other characters are escaped. To escape additional characters
         * use a third-party library like [_he_](http://mths.be/he).
         *
         * Though the ">" character is escaped for symmetry, characters like
         * ">" and "/" don't require escaping in HTML and have no special meaning
         * unless they're part of a tag or unquoted attribute value.
         * See [Mathias Bynens's article](http://mathiasbynens.be/notes/ambiguous-ampersands)
         * (under "semi-related fun fact") for more details.
         *
         * Backticks are escaped because in Internet Explorer < 9, they can break out
         * of attribute values or HTML comments. See [#102](http://html5sec.org/#102),
         * [#108](http://html5sec.org/#108), and [#133](http://html5sec.org/#133) of
         * the [HTML5 Security Cheatsheet](http://html5sec.org/) for more details.
         *
         * When working with HTML you should always quote attribute values to reduce
         * XSS vectors. See [Ryan Grove's article](http://wonko.com/post/html-escaping)
         * for more details.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to escape.
         * @returns {string} Returns the escaped string.
         * @example
         *
         * _.escape('fred, barney, & pebbles');
         * // => 'fred, barney, &amp; pebbles'
         */
        function escape(string) {
            // Reset `lastIndex` because in IE < 9 `String#replace` does not.
            string = baseToString(string);
            return (string && reHasUnescapedHtml.test(string))
              ? string.replace(reUnescapedHtml, escapeHtmlChar)
              : string;
        }

        /**
         * Escapes the `RegExp` special characters "\", "^", "$", ".", "|", "?", "*",
         * "+", "(", ")", "[", "]", "{" and "}" in `string`.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to escape.
         * @returns {string} Returns the escaped string.
         * @example
         *
         * _.escapeRegExp('[lodash](https://lodash.com/)');
         * // => '\[lodash\]\(https://lodash\.com/\)'
         */
        function escapeRegExp(string) {
            string = baseToString(string);
            return (string && reHasRegExpChars.test(string))
              ? string.replace(reRegExpChars, '\\$&')
              : string;
        }

        /**
         * Converts `string` to kebab case (a.k.a. spinal case).
         * See [Wikipedia](http://en.wikipedia.org/wiki/Letter_case#Computers) for
         * more details.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to convert.
         * @returns {string} Returns the kebab cased string.
         * @example
         *
         * _.kebabCase('Foo Bar');
         * // => 'foo-bar'
         *
         * _.kebabCase('fooBar');
         * // => 'foo-bar'
         *
         * _.kebabCase('__foo_bar__');
         * // => 'foo-bar'
         */
        var kebabCase = createCompounder(function (result, word, index) {
            return result + (index ? '-' : '') + word.toLowerCase();
        });

        /**
         * Pads `string` on the left and right sides if it is shorter then the given
         * padding length. The `chars` string may be truncated if the number of padding
         * characters can't be evenly divided by the padding length.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to pad.
         * @param {number} [length=0] The padding length.
         * @param {string} [chars=' '] The string used as padding.
         * @returns {string} Returns the padded string.
         * @example
         *
         * _.pad('abc', 8);
         * // => '  abc   '
         *
         * _.pad('abc', 8, '_-');
         * // => '_-abc_-_'
         *
         * _.pad('abc', 3);
         * // => 'abc'
         */
        function pad(string, length, chars) {
            string = baseToString(string);
            length = +length;

            var strLength = string.length;
            if (strLength >= length || !nativeIsFinite(length)) {
                return string;
            }
            var mid = (length - strLength) / 2,
                leftLength = floor(mid),
                rightLength = ceil(mid);

            chars = createPad('', rightLength, chars);
            return chars.slice(0, leftLength) + string + chars;
        }

        /**
         * Pads `string` on the left side if it is shorter then the given padding
         * length. The `chars` string may be truncated if the number of padding
         * characters exceeds the padding length.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to pad.
         * @param {number} [length=0] The padding length.
         * @param {string} [chars=' '] The string used as padding.
         * @returns {string} Returns the padded string.
         * @example
         *
         * _.padLeft('abc', 6);
         * // => '   abc'
         *
         * _.padLeft('abc', 6, '_-');
         * // => '_-_abc'
         *
         * _.padLeft('abc', 3);
         * // => 'abc'
         */
        function padLeft(string, length, chars) {
            string = baseToString(string);
            return string && (createPad(string, length, chars) + string);
        }

        /**
         * Pads `string` on the right side if it is shorter then the given padding
         * length. The `chars` string may be truncated if the number of padding
         * characters exceeds the padding length.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to pad.
         * @param {number} [length=0] The padding length.
         * @param {string} [chars=' '] The string used as padding.
         * @returns {string} Returns the padded string.
         * @example
         *
         * _.padRight('abc', 6);
         * // => 'abc   '
         *
         * _.padRight('abc', 6, '_-');
         * // => 'abc_-_'
         *
         * _.padRight('abc', 3);
         * // => 'abc'
         */
        function padRight(string, length, chars) {
            string = baseToString(string);
            return string && (string + createPad(string, length, chars));
        }

        /**
         * Converts `string` to an integer of the specified radix. If `radix` is
         * `undefined` or `0`, a `radix` of `10` is used unless `value` is a hexadecimal,
         * in which case a `radix` of `16` is used.
         *
         * **Note:** This method aligns with the ES5 implementation of `parseInt`.
         * See the [ES5 spec](http://es5.github.io/#E) for more details.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} string The string to convert.
         * @param {number} [radix] The radix to interpret `value` by.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {number} Returns the converted integer.
         * @example
         *
         * _.parseInt('08');
         * // => 8
         *
         * _.map(['6', '08', '10'], _.parseInt);
         * // => [6, 8, 10]
         */
        function parseInt(string, radix, guard) {
            if (guard && isIterateeCall(string, radix, guard)) {
                radix = 0;
            }
            return nativeParseInt(string, radix);
        }
        // Fallback for environments with pre-ES5 implementations.
        if (nativeParseInt(whitespace + '08') != 8) {
            parseInt = function (string, radix, guard) {
                // Firefox < 21 and Opera < 15 follow ES3 for `parseInt` and
                // Chrome fails to trim leading <BOM> whitespace characters.
                // See https://code.google.com/p/v8/issues/detail?id=3109.
                if (guard ? isIterateeCall(string, radix, guard) : radix == null) {
                    radix = 0;
                } else if (radix) {
                    radix = +radix;
                }
                string = trim(string);
                return nativeParseInt(string, radix || (reHexPrefix.test(string) ? 16 : 10));
            };
        }

        /**
         * Repeats the given string `n` times.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to repeat.
         * @param {number} [n=0] The number of times to repeat the string.
         * @returns {string} Returns the repeated string.
         * @example
         *
         * _.repeat('*', 3);
         * // => '***'
         *
         * _.repeat('abc', 2);
         * // => 'abcabc'
         *
         * _.repeat('abc', 0);
         * // => ''
         */
        function repeat(string, n) {
            var result = '';
            string = baseToString(string);
            n = +n;
            if (n < 1 || !string || !nativeIsFinite(n)) {
                return result;
            }
            // Leverage the exponentiation by squaring algorithm for a faster repeat.
            // See http://en.wikipedia.org/wiki/Exponentiation_by_squaring.
            do {
                if (n % 2) {
                    result += string;
                }
                n = floor(n / 2);
                string += string;
            } while (n);

            return result;
        }

        /**
         * Converts `string` to snake case.
         * See [Wikipedia](http://en.wikipedia.org/wiki/Snake_case) for more details.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to convert.
         * @returns {string} Returns the snake cased string.
         * @example
         *
         * _.snakeCase('Foo Bar');
         * // => 'foo_bar'
         *
         * _.snakeCase('--foo-bar');
         * // => 'foo_bar'
         *
         * _.snakeCase('fooBar');
         * // => 'foo_bar'
         */
        var snakeCase = createCompounder(function (result, word, index) {
            return result + (index ? '_' : '') + word.toLowerCase();
        });

        /**
         * Checks if `string` starts with the given target string.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to search.
         * @param {string} [target] The string to search for.
         * @param {number} [position=0] The position to search from.
         * @returns {boolean} Returns `true` if `string` starts with `target`, else `false`.
         * @example
         *
         * _.startsWith('abc', 'a');
         * // => true
         *
         * _.startsWith('abc', 'b');
         * // => false
         *
         * _.startsWith('abc', 'b', 1);
         * // => true
         */
        function startsWith(string, target, position) {
            string = baseToString(string);
            position = position == null ? 0 : nativeMin(position < 0 ? 0 : (+position || 0), string.length);
            return string.lastIndexOf(target, position) == position;
        }

        /**
         * Creates a compiled template function that can interpolate data properties
         * in "interpolate" delimiters, HTML-escape interpolated data properties in
         * "escape" delimiters, and execute JavaScript in "evaluate" delimiters. Data
         * properties may be accessed as free variables in the template. If a setting
         * object is provided it takes precedence over `_.templateSettings` values.
         *
         * **Note:** In the development build `_.template` utilizes sourceURLs for easier debugging.
         * See the [HTML5 Rocks article on sourcemaps](http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl)
         * for more details.
         *
         * For more information on precompiling templates see
         * [Lo-Dash's custom builds documentation](https://lodash.com/custom-builds).
         *
         * For more information on Chrome extension sandboxes see
         * [Chrome's extensions documentation](https://developer.chrome.com/extensions/sandboxingEval).
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The template string.
         * @param {Object} [options] The options object.
         * @param {RegExp} [options.escape] The HTML "escape" delimiter.
         * @param {RegExp} [options.evaluate] The "evaluate" delimiter.
         * @param {Object} [options.imports] An object to import into the template as free variables.
         * @param {RegExp} [options.interpolate] The "interpolate" delimiter.
         * @param {string} [options.sourceURL] The sourceURL of the template's compiled source.
         * @param {string} [options.variable] The data object variable name.
         * @param- {Object} [otherOptions] Enables the legacy `options` param signature.
         * @returns {Function} Returns the compiled template function.
         * @example
         *
         * // using the "interpolate" delimiter to create a compiled template
         * var compiled = _.template('hello <%= user %>!');
         * compiled({ 'user': 'fred' });
         * // => 'hello fred!'
         *
         * // using the HTML "escape" delimiter to escape data property values
         * var compiled = _.template('<b><%- value %></b>');
         * compiled({ 'value': '<script>' });
         * // => '<b>&lt;script&gt;</b>'
         *
         * // using the "evaluate" delimiter to execute JavaScript and generate HTML
         * var compiled = _.template('<% _.forEach(users, function(user) { %><li><%- user %></li><% }); %>');
         * compiled({ 'users': ['fred', 'barney'] });
         * // => '<li>fred</li><li>barney</li>'
         *
         * // using the internal `print` function in "evaluate" delimiters
         * var compiled = _.template('<% print("hello " + user); %>!');
         * compiled({ 'user': 'barney' });
         * // => 'hello barney!'
         *
         * // using the ES6 delimiter as an alternative to the default "interpolate" delimiter
         * var compiled = _.template('hello ${ user }!');
         * compiled({ 'user': 'pebbles' });
         * // => 'hello pebbles!'
         *
         * // using custom template delimiters
         * _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;
         * var compiled = _.template('hello {{ user }}!');
         * compiled({ 'user': 'mustache' });
         * // => 'hello mustache!'
         *
         * // using backslashes to treat delimiters as plain text
         * var compiled = _.template('<%= "\\<%- value %\\>" %>');
         * compiled({ 'value': 'ignored' });
         * // => '<%- value %>'
         *
         * // using the `imports` option to import `jQuery` as `jq`
         * var text = '<% jq.each(users, function(user) { %><li><%- user %></li><% }); %>';
         * var compiled = _.template(text, { 'imports': { 'jq': jQuery } });
         * compiled({ 'users': ['fred', 'barney'] });
         * // => '<li>fred</li><li>barney</li>'
         *
         * // using the `sourceURL` option to specify a custom sourceURL for the template
         * var compiled = _.template('hello <%= user %>!', { 'sourceURL': '/basic/greeting.jst' });
         * compiled(data);
         * // => find the source of "greeting.jst" under the Sources tab or Resources panel of the web inspector
         *
         * // using the `variable` option to ensure a with-statement isn't used in the compiled template
         * var compiled = _.template('hi <%= data.user %>!', { 'variable': 'data' });
         * compiled.source;
         * // => function(data) {
         *   var __t, __p = '';
         *   __p += 'hi ' + ((__t = ( data.user )) == null ? '' : __t) + '!';
         *   return __p;
         * }
         *
         * // using the `source` property to inline compiled templates for meaningful
         * // line numbers in error messages and a stack trace
         * fs.writeFileSync(path.join(cwd, 'jst.js'), '\
         *   var JST = {\
         *     "main": ' + _.template(mainText).source + '\
         *   };\
         * ');
         */
        function template(string, options, otherOptions) {
            // Based on John Resig's `tmpl` implementation (http://ejohn.org/blog/javascript-micro-templating/)
            // and Laura Doktorova's doT.js (https://github.com/olado/doT).
            var settings = lodash.templateSettings;

            if (otherOptions && isIterateeCall(string, options, otherOptions)) {
                options = otherOptions = null;
            }
            string = baseToString(string);
            options = baseAssign(baseAssign({}, otherOptions || options), settings, assignOwnDefaults);

            var imports = baseAssign(baseAssign({}, options.imports), settings.imports, assignOwnDefaults),
                importsKeys = keys(imports),
                importsValues = baseValues(imports, importsKeys);

            var isEscaping,
                isEvaluating,
                index = 0,
                interpolate = options.interpolate || reNoMatch,
                source = "__p += '";

            // Compile the regexp to match each delimiter.
            var reDelimiters = RegExp(
              (options.escape || reNoMatch).source + '|' +
              interpolate.source + '|' +
              (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' +
              (options.evaluate || reNoMatch).source + '|$'
            , 'g');

            // Use a sourceURL for easier debugging.
            // See http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl.
            var sourceURL = '//# sourceURL=' +
              ('sourceURL' in options
                ? options.sourceURL
                : ('lodash.templateSources[' + (++templateCounter) + ']')
              ) + '\n';

            string.replace(reDelimiters, function (match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
                interpolateValue || (interpolateValue = esTemplateValue);

                // Escape characters that can't be included in string literals.
                source += string.slice(index, offset).replace(reUnescapedString, escapeStringChar);

                // Replace delimiters with snippets.
                if (escapeValue) {
                    isEscaping = true;
                    source += "' +\n__e(" + escapeValue + ") +\n'";
                }
                if (evaluateValue) {
                    isEvaluating = true;
                    source += "';\n" + evaluateValue + ";\n__p += '";
                }
                if (interpolateValue) {
                    source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
                }
                index = offset + match.length;

                // The JS engine embedded in Adobe products requires returning the `match`
                // string in order to produce the correct `offset` value.
                return match;
            });

            source += "';\n";

            // If `variable` is not specified wrap a with-statement around the generated
            // code to add the data object to the top of the scope chain.
            var variable = options.variable;
            if (!variable) {
                source = 'with (obj) {\n' + source + '\n}\n';
            }
            // Cleanup code by stripping empty strings.
            source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
              .replace(reEmptyStringMiddle, '$1')
              .replace(reEmptyStringTrailing, '$1;');

            // Frame code as the function body.
            source = 'function(' + (variable || 'obj') + ') {\n' +
              (variable
                ? ''
                : 'obj || (obj = {});\n'
              ) +
              "var __t, __p = ''" +
              (isEscaping
                 ? ', __e = _.escape'
                 : ''
              ) +
              (isEvaluating
                ? ', __j = Array.prototype.join;\n' +
                  "function print() { __p += __j.call(arguments, '') }\n"
                : ';\n'
              ) +
              source +
              'return __p\n}';

            var result = attempt(function () {
                return Function(importsKeys, sourceURL + 'return ' + source).apply(undefined, importsValues);
            });

            // Provide the compiled function's source by its `toString` method or
            // the `source` property as a convenience for inlining compiled templates.
            result.source = source;
            if (isError(result)) {
                throw result;
            }
            return result;
        }

        /**
         * Removes leading and trailing whitespace or specified characters from `string`.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to trim.
         * @param {string} [chars=whitespace] The characters to trim.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {string} Returns the trimmed string.
         * @example
         *
         * _.trim('  abc  ');
         * // => 'abc'
         *
         * _.trim('-_-abc-_-', '_-');
         * // => 'abc'
         *
         * _.map(['  foo  ', '  bar  '], _.trim);
         * // => ['foo', 'bar]
         */
        function trim(string, chars, guard) {
            var value = string;
            string = baseToString(string);
            if (!string) {
                return string;
            }
            if (guard ? isIterateeCall(value, chars, guard) : chars == null) {
                return string.slice(trimmedLeftIndex(string), trimmedRightIndex(string) + 1);
            }
            chars = baseToString(chars);
            return string.slice(charsLeftIndex(string, chars), charsRightIndex(string, chars) + 1);
        }

        /**
         * Removes leading whitespace or specified characters from `string`.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to trim.
         * @param {string} [chars=whitespace] The characters to trim.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {string} Returns the trimmed string.
         * @example
         *
         * _.trimLeft('  abc  ');
         * // => 'abc  '
         *
         * _.trimLeft('-_-abc-_-', '_-');
         * // => 'abc-_-'
         */
        function trimLeft(string, chars, guard) {
            var value = string;
            string = baseToString(string);
            if (!string) {
                return string;
            }
            if (guard ? isIterateeCall(value, chars, guard) : chars == null) {
                return string.slice(trimmedLeftIndex(string))
            }
            return string.slice(charsLeftIndex(string, baseToString(chars)));
        }

        /**
         * Removes trailing whitespace or specified characters from `string`.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to trim.
         * @param {string} [chars=whitespace] The characters to trim.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {string} Returns the trimmed string.
         * @example
         *
         * _.trimRight('  abc  ');
         * // => '  abc'
         *
         * _.trimRight('-_-abc-_-', '_-');
         * // => '-_-abc'
         */
        function trimRight(string, chars, guard) {
            var value = string;
            string = baseToString(string);
            if (!string) {
                return string;
            }
            if (guard ? isIterateeCall(value, chars, guard) : chars == null) {
                return string.slice(0, trimmedRightIndex(string) + 1)
            }
            return string.slice(0, charsRightIndex(string, baseToString(chars)) + 1);
        }

        /**
         * Truncates `string` if it is longer than the given maximum string length.
         * The last characters of the truncated string are replaced with the omission
         * string which defaults to "...".
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to truncate.
         * @param {Object|number} [options] The options object or maximum string length.
         * @param {number} [options.length=30] The maximum string length.
         * @param {string} [options.omission='...'] The string to indicate text is omitted.
         * @param {RegExp|string} [options.separator] The separator pattern to truncate to.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {string} Returns the truncated string.
         * @example
         *
         * _.trunc('hi-diddly-ho there, neighborino');
         * // => 'hi-diddly-ho there, neighbo...'
         *
         * _.trunc('hi-diddly-ho there, neighborino', 24);
         * // => 'hi-diddly-ho there, n...'
         *
         * _.trunc('hi-diddly-ho there, neighborino', { 'length': 24, 'separator': ' ' });
         * // => 'hi-diddly-ho there,...'
         *
         * _.trunc('hi-diddly-ho there, neighborino', { 'length': 24, 'separator': /,? +/ });
         * //=> 'hi-diddly-ho there...'
         *
         * _.trunc('hi-diddly-ho there, neighborino', { 'omission': ' [...]' });
         * // => 'hi-diddly-ho there, neig [...]'
         */
        function trunc(string, options, guard) {
            if (guard && isIterateeCall(string, options, guard)) {
                options = null;
            }
            var length = DEFAULT_TRUNC_LENGTH,
                omission = DEFAULT_TRUNC_OMISSION;

            if (options != null) {
                if (isObject(options)) {
                    var separator = 'separator' in options ? options.separator : separator;
                    length = 'length' in options ? +options.length || 0 : length;
                    omission = 'omission' in options ? baseToString(options.omission) : omission;
                } else {
                    length = +options || 0;
                }
            }
            string = baseToString(string);
            if (length >= string.length) {
                return string;
            }
            var end = length - omission.length;
            if (end < 1) {
                return omission;
            }
            var result = string.slice(0, end);
            if (separator == null) {
                return result + omission;
            }
            if (isRegExp(separator)) {
                if (string.slice(end).search(separator)) {
                    var match,
                        newEnd,
                        substring = string.slice(0, end);

                    if (!separator.global) {
                        separator = RegExp(separator.source, (reFlags.exec(separator) || '') + 'g');
                    }
                    separator.lastIndex = 0;
                    while ((match = separator.exec(substring))) {
                        newEnd = match.index;
                    }
                    result = result.slice(0, newEnd == null ? end : newEnd);
                }
            } else if (string.indexOf(separator, end) != end) {
                var index = result.lastIndexOf(separator);
                if (index > -1) {
                    result = result.slice(0, index);
                }
            }
            return result + omission;
        }

        /**
         * The inverse of `_.escape`; this method converts the HTML entities
         * `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, and `&#96;` in `string` to their
         * corresponding characters.
         *
         * **Note:** No other HTML entities are unescaped. To unescape additional HTML
         * entities use a third-party library like [_he_](http://mths.be/he).
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to unescape.
         * @returns {string} Returns the unescaped string.
         * @example
         *
         * _.unescape('fred, barney, &amp; pebbles');
         * // => 'fred, barney, & pebbles'
         */
        function unescape(string) {
            string = baseToString(string);
            return (string && reHasEscapedHtml.test(string))
              ? string.replace(reEscapedHtml, unescapeHtmlChar)
              : string;
        }

        /**
         * Splits `string` into an array of its words.
         *
         * @static
         * @memberOf _
         * @category String
         * @param {string} [string=''] The string to inspect.
         * @param {RegExp|string} [pattern] The pattern to match words.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Array} Returns the words of `string`.
         * @example
         *
         * _.words('fred, barney, & pebbles');
         * // => ['fred', 'barney', 'pebbles']
         *
         * _.words('fred, barney, & pebbles', /[^, ]+/g);
         * // => ['fred', 'barney', '&', 'pebbles']
         */
        function words(string, pattern, guard) {
            if (guard && isIterateeCall(string, pattern, guard)) {
                pattern = null;
            }
            string = baseToString(string);
            return string.match(pattern || reWords) || [];
        }

        /*------------------------------------------------------------------------*/

        /**
         * Attempts to invoke `func`, returning either the result or the caught
         * error object.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {*} func The function to attempt.
         * @returns {*} Returns the `func` result or error object.
         * @example
         *
         * // avoid throwing errors for invalid selectors
         * var elements = _.attempt(function() {
         *   return document.querySelectorAll(selector);
         * });
         *
         * if (_.isError(elements)) {
         *   elements = [];
         * }
         */
        function attempt(func) {
            try {
                return func();
            } catch (e) {
                return isError(e) ? e : Error(e);
            }
        }

        /**
         * Creates a function bound to an optional `thisArg`. If `func` is a property
         * name the created callback returns the property value for a given element.
         * If `func` is an object the created callback returns `true` for elements
         * that contain the equivalent object properties, otherwise it returns `false`.
         *
         * @static
         * @memberOf _
         * @alias iteratee
         * @category Utility
         * @param {*} [func=_.identity] The value to convert to a callback.
         * @param {*} [thisArg] The `this` binding of `func`.
         * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
         * @returns {Function} Returns the callback.
         * @example
         *
         * var users = [
         *   { 'user': 'barney', 'age': 36 },
         *   { 'user': 'fred',   'age': 40 }
         * ];
         *
         * // wrap to create custom callback shorthands
         * _.callback = _.wrap(_.callback, function(callback, func, thisArg) {
         *   var match = /^(.+?)__([gl]t)(.+)$/.exec(func);
         *   if (!match) {
         *     return callback(func, thisArg);
         *   }
         *   return function(object) {
         *     return match[2] == 'gt' ? object[match[1]] > match[3] : object[match[1]] < match[3];
         *   };
         * });
         *
         * _.filter(users, 'age__gt36');
         * // => [{ 'user': 'fred', 'age': 40 }]
         */
        function callback(func, thisArg, guard) {
            if (guard && isIterateeCall(func, thisArg, guard)) {
                thisArg = null;
            }
            return baseCallback(func, thisArg);
        }

        /**
         * Creates a function that returns `value`.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {*} value The value to return from the new function.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var object = { 'user': 'fred' };
         * var getter = _.constant(object);
         * getter() === object;
         * // => true
         */
        function constant(value) {
            return function () {
                return value;
            };
        }

        /**
         * This method returns the first argument provided to it.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {*} value Any value.
         * @returns {*} Returns `value`.
         * @example
         *
         * var object = { 'user': 'fred' };
         * _.identity(object) === object;
         * // => true
         */
        function identity(value) {
            return value;
        }

        /**
         * Creates a function which performs a deep comparison between a given object
         * and `source`, returning `true` if the given object has equivalent property
         * values, else `false`.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {Object} source The object of property values to match.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var users = [
         *   { 'user': 'fred',   'age': 40 },
         *   { 'user': 'barney', 'age': 36 }
         * ];
         *
         * var matchesAge = _.matches({ 'age': 36 });
         *
         * _.filter(users, matchesAge);
         * // => [{ 'user': 'barney', 'age': 36 }]
         *
         * _.find(users, matchesAge);
         * // => { 'user': 'barney', 'age': 36 }
         */
        function matches(source) {
            return baseMatches(source, true);
        }

        /**
         * Adds all own enumerable function properties of a source object to the
         * destination object. If `object` is a function then methods are added to
         * its prototype as well.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {Function|Object} [object=this] object The destination object.
         * @param {Object} source The object of functions to add.
         * @param {Object} [options] The options object.
         * @param {boolean} [options.chain=true] Specify whether the functions added
         *  are chainable.
         * @returns {Function|Object} Returns `object`.
         * @example
         *
         * function vowels(string) {
         *   return _.filter(string, function(v) {
         *     return /[aeiou]/i.test(v);
         *   });
         * }
         *
         * _.mixin({ 'vowels': vowels });
         * _.vowels('fred');
         * // => ['e']
         *
         * _('fred').vowels().value();
         * // => ['e']
         *
         * _.mixin({ 'vowels': vowels }, { 'chain': false });
         * _('fred').vowels();
         * // => ['e']
         */
        function mixin(object, source, options) {
            if (options == null) {
                var isObj = isObject(source),
                    props = isObj && keys(source),
                    methodNames = props && props.length && baseFunctions(source, props);

                if (!(methodNames ? methodNames.length : isObj)) {
                    methodNames = false;
                    options = source;
                    source = object;
                    object = this;
                }
            }
            if (!methodNames) {
                methodNames = baseFunctions(source, keys(source));
            }
            var chain = true,
                index = -1,
                isFunc = isFunction(object),
                length = methodNames.length;

            if (options === false) {
                chain = false;
            } else if (isObject(options) && 'chain' in options) {
                chain = options.chain;
            }
            while (++index < length) {
                var methodName = methodNames[index],
                    func = source[methodName];

                object[methodName] = func;
                if (isFunc) {
                    object.prototype[methodName] = (function (func) {
                        return function () {
                            var chainAll = this.__chain__;
                            if (chain || chainAll) {
                                var result = object(this.__wrapped__);
                                (result.__actions__ = arrayCopy(this.__actions__)).push({ 'func': func, 'args': arguments, 'thisArg': object });
                                result.__chain__ = chainAll;
                                return result;
                            }
                            var args = [this.value()];
                            push.apply(args, arguments);
                            return func.apply(object, args);
                        };
                    }(func));
                }
            }
            return object;
        }

        /**
         * Reverts the `_` variable to its previous value and returns a reference to
         * the `lodash` function.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @returns {Function} Returns the `lodash` function.
         * @example
         *
         * var lodash = _.noConflict();
         */
        function noConflict() {
            context._ = oldDash;
            return this;
        }

        /**
         * A no-operation function.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @example
         *
         * var object = { 'user': 'fred' };
         * _.noop(object) === undefined;
         * // => true
         */
        function noop() {
            // No operation performed.
        }

        /**
         * Creates a function which returns the property value of `key` on a given object.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {string} key The key of the property to get.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var users = [
         *   { 'user': 'fred' },
         *   { 'user': 'barney' }
         * ];
         *
         * var getName = _.property('user');
         *
         * _.map(users, getName);
         * // => ['fred', barney']
         *
         * _.pluck(_.sortBy(users, getName), 'user');
         * // => ['barney', 'fred']
         */
        function property(key) {
            return baseProperty(key + '');
        }

        /**
         * The inverse of `_.property`; this method creates a function which returns
         * the property value of a given key on `object`.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {Object} object The object to inspect.
         * @returns {Function} Returns the new function.
         * @example
         *
         * var object = { 'user': 'fred', 'age': 40, 'active': true };
         * _.map(['active', 'user'], _.propertyOf(object));
         * // => [true, 'fred']
         *
         * var object = { 'a': 3, 'b': 1, 'c': 2 };
         * _.sortBy(['a', 'b', 'c'], _.propertyOf(object));
         * // => ['b', 'c', 'a']
         */
        function propertyOf(object) {
            return function (key) {
                return object == null ? undefined : object[key];
            };
        }

        /**
         * Creates an array of numbers (positive and/or negative) progressing from
         * `start` up to, but not including, `end`. If `start` is less than `end` a
         * zero-length range is created unless a negative `step` is specified.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {number} [start=0] The start of the range.
         * @param {number} end The end of the range.
         * @param {number} [step=1] The value to increment or decrement by.
         * @returns {Array} Returns the new array of numbers.
         * @example
         *
         * _.range(4);
         * // => [0, 1, 2, 3]
         *
         * _.range(1, 5);
         * // => [1, 2, 3, 4]
         *
         * _.range(0, 20, 5);
         * // => [0, 5, 10, 15]
         *
         * _.range(0, -4, -1);
         * // => [0, -1, -2, -3]
         *
         * _.range(1, 4, 0);
         * // => [1, 1, 1]
         *
         * _.range(0);
         * // => []
         */
        function range(start, end, step) {
            if (step && isIterateeCall(start, end, step)) {
                end = step = null;
            }
            start = +start || 0;
            step = step == null ? 1 : (+step || 0);

            if (end == null) {
                end = start;
                start = 0;
            } else {
                end = +end || 0;
            }
            // Use `Array(length)` so engines like Chakra and V8 avoid slower modes.
            // See http://youtu.be/XAqIpGU8ZZk#t=17m25s.
            var index = -1,
                length = nativeMax(ceil((end - start) / (step || 1)), 0),
                result = Array(length);

            while (++index < length) {
                result[index] = start;
                start += step;
            }
            return result;
        }

        /**
         * Invokes the iteratee function `n` times, returning an array of the results
         * of each invocation. The `iteratee` is bound to `thisArg` and invoked with
         * one argument; (index).
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {number} n The number of times to invoke `iteratee`.
         * @param {Function} [iteratee=_.identity] The function invoked per iteration.
         * @param {*} [thisArg] The `this` binding of `iteratee`.
         * @returns {Array} Returns the array of results.
         * @example
         *
         * var diceRolls = _.times(3, _.partial(_.random, 1, 6, false));
         * // => [3, 6, 4]
         *
         * _.times(3, function(n) { mage.castSpell(n); });
         * // => invokes `mage.castSpell(n)` three times with `n` of `0`, `1`, and `2` respectively
         *
         * _.times(3, function(n) { this.cast(n); }, mage);
         * // => also invokes `mage.castSpell(n)` three times
         */
        function times(n, iteratee, thisArg) {
            n = +n;

            // Exit early to avoid a JSC JIT bug in Safari 8
            // where `Array(0)` is treated as `Array(1)`.
            if (n < 1 || !nativeIsFinite(n)) {
                return [];
            }
            var index = -1,
                result = Array(nativeMin(n, MAX_ARRAY_LENGTH));

            iteratee = bindCallback(iteratee, thisArg, 1);
            while (++index < n) {
                if (index < MAX_ARRAY_LENGTH) {
                    result[index] = iteratee(index);
                } else {
                    iteratee(index);
                }
            }
            return result;
        }

        /**
         * Generates a unique ID. If `prefix` is provided the ID is appended to it.
         *
         * @static
         * @memberOf _
         * @category Utility
         * @param {string} [prefix] The value to prefix the ID with.
         * @returns {string} Returns the unique ID.
         * @example
         *
         * _.uniqueId('contact_');
         * // => 'contact_104'
         *
         * _.uniqueId();
         * // => '105'
         */
        function uniqueId(prefix) {
            var id = ++idCounter;
            return baseToString(prefix) + id;
        }

        /*------------------------------------------------------------------------*/

        // Ensure `new LodashWrapper` is an instance of `lodash`.
        LodashWrapper.prototype = lodash.prototype;

        // Add functions to the `Map` cache.
        MapCache.prototype['delete'] = mapDelete;
        MapCache.prototype.get = mapGet;
        MapCache.prototype.has = mapHas;
        MapCache.prototype.set = mapSet;

        // Add functions to the `Set` cache.
        SetCache.prototype.push = cachePush;

        // Assign cache to `_.memoize`.
        memoize.Cache = MapCache;

        // Add functions that return wrapped values when chaining.
        lodash.after = after;
        lodash.ary = ary;
        lodash.assign = assign;
        lodash.at = at;
        lodash.before = before;
        lodash.bind = bind;
        lodash.bindAll = bindAll;
        lodash.bindKey = bindKey;
        lodash.callback = callback;
        lodash.chain = chain;
        lodash.chunk = chunk;
        lodash.compact = compact;
        lodash.constant = constant;
        lodash.countBy = countBy;
        lodash.create = create;
        lodash.curry = curry;
        lodash.curryRight = curryRight;
        lodash.debounce = debounce;
        lodash.defaults = defaults;
        lodash.defer = defer;
        lodash.delay = delay;
        lodash.difference = difference;
        lodash.drop = drop;
        lodash.dropRight = dropRight;
        lodash.dropRightWhile = dropRightWhile;
        lodash.dropWhile = dropWhile;
        lodash.filter = filter;
        lodash.flatten = flatten;
        lodash.flattenDeep = flattenDeep;
        lodash.flow = flow;
        lodash.flowRight = flowRight;
        lodash.forEach = forEach;
        lodash.forEachRight = forEachRight;
        lodash.forIn = forIn;
        lodash.forInRight = forInRight;
        lodash.forOwn = forOwn;
        lodash.forOwnRight = forOwnRight;
        lodash.functions = functions;
        lodash.groupBy = groupBy;
        lodash.indexBy = indexBy;
        lodash.initial = initial;
        lodash.intersection = intersection;
        lodash.invert = invert;
        lodash.invoke = invoke;
        lodash.keys = keys;
        lodash.keysIn = keysIn;
        lodash.map = map;
        lodash.mapValues = mapValues;
        lodash.matches = matches;
        lodash.memoize = memoize;
        lodash.merge = merge;
        lodash.mixin = mixin;
        lodash.negate = negate;
        lodash.omit = omit;
        lodash.once = once;
        lodash.pairs = pairs;
        lodash.partial = partial;
        lodash.partialRight = partialRight;
        lodash.partition = partition;
        lodash.pick = pick;
        lodash.pluck = pluck;
        lodash.property = property;
        lodash.propertyOf = propertyOf;
        lodash.pull = pull;
        lodash.pullAt = pullAt;
        lodash.range = range;
        lodash.rearg = rearg;
        lodash.reject = reject;
        lodash.remove = remove;
        lodash.rest = rest;
        lodash.shuffle = shuffle;
        lodash.slice = slice;
        lodash.sortBy = sortBy;
        lodash.sortByAll = sortByAll;
        lodash.take = take;
        lodash.takeRight = takeRight;
        lodash.takeRightWhile = takeRightWhile;
        lodash.takeWhile = takeWhile;
        lodash.tap = tap;
        lodash.throttle = throttle;
        lodash.thru = thru;
        lodash.times = times;
        lodash.toArray = toArray;
        lodash.toPlainObject = toPlainObject;
        lodash.transform = transform;
        lodash.union = union;
        lodash.uniq = uniq;
        lodash.unzip = unzip;
        lodash.values = values;
        lodash.valuesIn = valuesIn;
        lodash.where = where;
        lodash.without = without;
        lodash.wrap = wrap;
        lodash.xor = xor;
        lodash.zip = zip;
        lodash.zipObject = zipObject;

        // Add aliases.
        lodash.backflow = flowRight;
        lodash.collect = map;
        lodash.compose = flowRight;
        lodash.each = forEach;
        lodash.eachRight = forEachRight;
        lodash.extend = assign;
        lodash.iteratee = callback;
        lodash.methods = functions;
        lodash.object = zipObject;
        lodash.select = filter;
        lodash.tail = rest;
        lodash.unique = uniq;

        // Add functions to `lodash.prototype`.
        mixin(lodash, lodash);

        /*------------------------------------------------------------------------*/

        // Add functions that return unwrapped values when chaining.
        lodash.attempt = attempt;
        lodash.camelCase = camelCase;
        lodash.capitalize = capitalize;
        lodash.clone = clone;
        lodash.cloneDeep = cloneDeep;
        lodash.deburr = deburr;
        lodash.endsWith = endsWith;
        lodash.escape = escape;
        lodash.escapeRegExp = escapeRegExp;
        lodash.every = every;
        lodash.find = find;
        lodash.findIndex = findIndex;
        lodash.findKey = findKey;
        lodash.findLast = findLast;
        lodash.findLastIndex = findLastIndex;
        lodash.findLastKey = findLastKey;
        lodash.findWhere = findWhere;
        lodash.first = first;
        lodash.has = has;
        lodash.identity = identity;
        lodash.includes = includes;
        lodash.indexOf = indexOf;
        lodash.isArguments = isArguments;
        lodash.isArray = isArray;
        lodash.isBoolean = isBoolean;
        lodash.isDate = isDate;
        lodash.isElement = isElement;
        lodash.isEmpty = isEmpty;
        lodash.isEqual = isEqual;
        lodash.isError = isError;
        lodash.isFinite = isFinite;
        lodash.isFunction = isFunction;
        lodash.isMatch = isMatch;
        lodash.isNaN = isNaN;
        lodash.isNative = isNative;
        lodash.isNull = isNull;
        lodash.isNumber = isNumber;
        lodash.isObject = isObject;
        lodash.isPlainObject = isPlainObject;
        lodash.isRegExp = isRegExp;
        lodash.isString = isString;
        lodash.isTypedArray = isTypedArray;
        lodash.isUndefined = isUndefined;
        lodash.kebabCase = kebabCase;
        lodash.last = last;
        lodash.lastIndexOf = lastIndexOf;
        lodash.max = max;
        lodash.min = min;
        lodash.noConflict = noConflict;
        lodash.noop = noop;
        lodash.now = now;
        lodash.pad = pad;
        lodash.padLeft = padLeft;
        lodash.padRight = padRight;
        lodash.parseInt = parseInt;
        lodash.random = random;
        lodash.reduce = reduce;
        lodash.reduceRight = reduceRight;
        lodash.repeat = repeat;
        lodash.result = result;
        lodash.runInContext = runInContext;
        lodash.size = size;
        lodash.snakeCase = snakeCase;
        lodash.some = some;
        lodash.sortedIndex = sortedIndex;
        lodash.sortedLastIndex = sortedLastIndex;
        lodash.startsWith = startsWith;
        lodash.template = template;
        lodash.trim = trim;
        lodash.trimLeft = trimLeft;
        lodash.trimRight = trimRight;
        lodash.trunc = trunc;
        lodash.unescape = unescape;
        lodash.uniqueId = uniqueId;
        lodash.words = words;

        // Add aliases.
        lodash.all = every;
        lodash.any = some;
        lodash.contains = includes;
        lodash.detect = find;
        lodash.foldl = reduce;
        lodash.foldr = reduceRight;
        lodash.head = first;
        lodash.include = includes;
        lodash.inject = reduce;

        mixin(lodash, (function () {
            var source = {};
            baseForOwn(lodash, function (func, methodName) {
                if (!lodash.prototype[methodName]) {
                    source[methodName] = func;
                }
            });
            return source;
        }()), false);

        /*------------------------------------------------------------------------*/

        // Add functions capable of returning wrapped and unwrapped values when chaining.
        lodash.sample = sample;

        lodash.prototype.sample = function (n) {
            if (!this.__chain__ && n == null) {
                return sample(this.value());
            }
            return this.thru(function (value) {
                return sample(value, n);
            });
        };

        /*------------------------------------------------------------------------*/

        /**
         * The semantic version number.
         *
         * @static
         * @memberOf _
         * @type string
         */
        lodash.VERSION = VERSION;

        // Assign default placeholders.
        arrayEach(['bind', 'bindKey', 'curry', 'curryRight', 'partial', 'partialRight'], function (methodName) {
            lodash[methodName].placeholder = lodash;
        });

        // Add `LazyWrapper` methods that accept an `iteratee` value.
        arrayEach(['filter', 'map', 'takeWhile'], function (methodName, index) {
            var isFilter = index == LAZY_FILTER_FLAG;

            LazyWrapper.prototype[methodName] = function (iteratee, thisArg) {
                var result = this.clone(),
                    filtered = result.filtered,
                    iteratees = result.iteratees || (result.iteratees = []);

                result.filtered = filtered || isFilter || (index == LAZY_WHILE_FLAG && result.dir < 0);
                iteratees.push({ 'iteratee': getCallback(iteratee, thisArg, 3), 'type': index });
                return result;
            };
        });

        // Add `LazyWrapper` methods for `_.drop` and `_.take` variants.
        arrayEach(['drop', 'take'], function (methodName, index) {
            var countName = methodName + 'Count',
                whileName = methodName + 'While';

            LazyWrapper.prototype[methodName] = function (n) {
                n = n == null ? 1 : nativeMax(+n || 0, 0);

                var result = this.clone();
                if (result.filtered) {
                    var value = result[countName];
                    result[countName] = index ? nativeMin(value, n) : (value + n);
                } else {
                    var views = result.views || (result.views = []);
                    views.push({ 'size': n, 'type': methodName + (result.dir < 0 ? 'Right' : '') });
                }
                return result;
            };

            LazyWrapper.prototype[methodName + 'Right'] = function (n) {
                return this.reverse()[methodName](n).reverse();
            };

            LazyWrapper.prototype[methodName + 'RightWhile'] = function (predicate, thisArg) {
                return this.reverse()[whileName](predicate, thisArg).reverse();
            };
        });

        // Add `LazyWrapper` methods for `_.first` and `_.last`.
        arrayEach(['first', 'last'], function (methodName, index) {
            var takeName = 'take' + (index ? 'Right' : '');

            LazyWrapper.prototype[methodName] = function () {
                return this[takeName](1).value()[0];
            };
        });

        // Add `LazyWrapper` methods for `_.initial` and `_.rest`.
        arrayEach(['initial', 'rest'], function (methodName, index) {
            var dropName = 'drop' + (index ? '' : 'Right');

            LazyWrapper.prototype[methodName] = function () {
                return this[dropName](1);
            };
        });

        // Add `LazyWrapper` methods for `_.pluck` and `_.where`.
        arrayEach(['pluck', 'where'], function (methodName, index) {
            var operationName = index ? 'filter' : 'map',
                createCallback = index ? matches : property;

            LazyWrapper.prototype[methodName] = function (value) {
                return this[operationName](createCallback(value));
            };
        });

        LazyWrapper.prototype.dropWhile = function (iteratee, thisArg) {
            var done,
                lastIndex,
                isRight = this.dir < 0;

            iteratee = getCallback(iteratee, thisArg, 3);
            return this.filter(function (value, index, array) {
                done = done && (isRight ? index < lastIndex : index > lastIndex);
                lastIndex = index;
                return done || (done = !iteratee(value, index, array));
            });
        };

        LazyWrapper.prototype.reject = function (iteratee, thisArg) {
            iteratee = getCallback(iteratee, thisArg, 3);
            return this.filter(function (value, index, array) {
                return !iteratee(value, index, array);
            });
        };

        LazyWrapper.prototype.slice = function (start, end) {
            start = start == null ? 0 : (+start || 0);
            var result = start < 0 ? this.takeRight(-start) : this.drop(start);

            if (typeof end != 'undefined') {
                end = (+end || 0);
                result = end < 0 ? result.dropRight(-end) : result.take(end - start);
            }
            return result;
        };

        // Add `LazyWrapper` methods to `lodash.prototype`.
        baseForOwn(LazyWrapper.prototype, function (func, methodName) {
            var retUnwrapped = /^(?:first|last)$/.test(methodName);

            lodash.prototype[methodName] = function () {
                var value = this.__wrapped__,
                    args = arguments,
                    chainAll = this.__chain__,
                    isHybrid = !!this.__actions__.length,
                    isLazy = value instanceof LazyWrapper,
                    onlyLazy = isLazy && !isHybrid;

                if (retUnwrapped && !chainAll) {
                    return onlyLazy
                      ? func.call(value)
                      : lodash[methodName](this.value());
                }
                var interceptor = function (value) {
                    var otherArgs = [value];
                    push.apply(otherArgs, args);
                    return lodash[methodName].apply(lodash, otherArgs);
                };
                if (isLazy || isArray(value)) {
                    var wrapper = onlyLazy ? value : new LazyWrapper(this),
                        result = func.apply(wrapper, args);

                    if (!retUnwrapped && (isHybrid || result.actions)) {
                        var actions = result.actions || (result.actions = []);
                        actions.push({ 'func': thru, 'args': [interceptor], 'thisArg': lodash });
                    }
                    return new LodashWrapper(result, chainAll);
                }
                return this.thru(interceptor);
            };
        });

        // Add `Array.prototype` functions to `lodash.prototype`.
        arrayEach(['concat', 'join', 'pop', 'push', 'shift', 'sort', 'splice', 'unshift'], function (methodName) {
            var func = arrayProto[methodName],
                chainName = /^(?:push|sort|unshift)$/.test(methodName) ? 'tap' : 'thru',
                retUnwrapped = /^(?:join|pop|shift)$/.test(methodName);

            lodash.prototype[methodName] = function () {
                var args = arguments;
                if (retUnwrapped && !this.__chain__) {
                    return func.apply(this.value(), args);
                }
                return this[chainName](function (value) {
                    return func.apply(value, args);
                });
            };
        });

        // Add functions to the lazy wrapper.
        LazyWrapper.prototype.clone = lazyClone;
        LazyWrapper.prototype.reverse = lazyReverse;
        LazyWrapper.prototype.value = lazyValue;

        // Add chaining functions to the lodash wrapper.
        lodash.prototype.chain = wrapperChain;
        lodash.prototype.reverse = wrapperReverse;
        lodash.prototype.toString = wrapperToString;
        lodash.prototype.toJSON = lodash.prototype.valueOf = lodash.prototype.value = wrapperValue;

        // Add function aliases to the lodash wrapper.
        lodash.prototype.collect = lodash.prototype.map;
        lodash.prototype.head = lodash.prototype.first;
        lodash.prototype.select = lodash.prototype.filter;
        lodash.prototype.tail = lodash.prototype.rest;

        return lodash;
    }

    /*--------------------------------------------------------------------------*/

    // Export Lo-Dash.
    var _ = runInContext();

    // Some AMD build optimizers like r.js check for condition patterns like the following:
    if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
        // Expose Lo-Dash to the global object when an AMD loader is present to avoid
        // errors in cases where Lo-Dash is loaded by a script tag and not intended
        // as an AMD module. See http://requirejs.org/docs/errors.html#mismatch.
        root._ = _;

        // Define as an anonymous module so, through path mapping, it can be
        // referenced as the "underscore" module.
        define(function () {
            return _;
        });
    }
        // Check for `exports` after `define` in case a build optimizer adds an `exports` object.
    else if (freeExports && freeModule) {
        // Export for Node.js or RingoJS.
        if (moduleExports) {
            (freeModule.exports = _)._ = _;
        }
            // Export for Narwhal or Rhino -require.
        else {
            freeExports._ = _;
        }
    }
    else {
        // Export for a browser or Rhino.
        root._ = _;
    }
}.call(this));



