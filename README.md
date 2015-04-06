# README - lsWireCore v1.0.6 #
April 2015 drop

We are excited about Bitbucket.org and all the features it provides, public AND private, without restriction or cost.

### What is this repository for? ###

* lsWireCore.js - A library of functions for developing applications with Visual Studio LightSwitch.
* Version 1.0.6
* Most likely there are breaking changes from 1.0.5.  We will try and get out the updated docs as soon as we can.

### How do I get set up? ###

* Clone the project
* Enable Security Administration in the project properties
* We now package all dependencies in the lsWireCore.js file itself.
* Press F5 - enjoy the ride!

### Requirements? ###

* We've changed things a little with this release in order for the library to be stable
* Edit msls-x.x.x.js.
* Search for and comment out: "use strict" (For IOS stability, not just for lsWireCore)
* Search for: function createScreenHashValue(screenDetails) 
* Change to reflect - if (screenDetails._dataUrl != undefined && screenDetails._dataUrl !== "" && !msls_appOptions.disableUrlScreenParameters)
* Search for: window.msls = Object.getPrototypeOf(msls) (comment it out) and add in its place: window.msls = msls
* When in doubt, do these searches on the msls-2.5.2.js in this repository and you'll see the changes
* Note that you will need to minify your msls-2.5.2.js if you don't use the one here, or if you are using 2.5.3.

### Documentation? ###

* Yes, sort of.
* http://lightswitch.codewriting.tips/
* http://blog.ofAnITGuy.com/
* We will be working on updating so please have patience

### Samples? ###

* They will be coming updated to the latest lsWireCore.js
* Priority... Documentation or Samples?
