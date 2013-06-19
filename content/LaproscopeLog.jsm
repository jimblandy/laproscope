// Logging for Laproscope.
"use strict";

var EXPORTED_SYMBOLS = [ 'LaproscopeLog' ];

let consoleService = (Components.classes["@mozilla.org/consoleservice;1"]
                      .getService(Components.interfaces.nsIConsoleService));

let enabled = new Set();
enabled.add(true);

function LaproscopeLog() {
  var topic = Array.prototype.shift.call(arguments);
  if (!enabled.has(topic)) {
    return;
  }

  var message = Array.prototype.join.call(arguments, "");
  consoleService.logStringMessage(message + "\n");
}

LaproscopeLog.enable = (topic) => { enabled.add(topic); }
LaproscopeLog.disable = (topic) => { enabled.delete(topic); }
