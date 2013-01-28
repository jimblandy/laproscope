// Logging for Laproscope.
"use strict";

var EXPORTED_SYMBOLS = [ 'LaproscopeLog' ];

let consoleService = (Components.classes["@mozilla.org/consoleservice;1"]
                      .getService(Components.interfaces.nsIConsoleService));

function LaproscopeLog() {
  var message = Array.prototype.join.call(arguments, "");
  consoleService.logStringMessage(message + "\n");
}
