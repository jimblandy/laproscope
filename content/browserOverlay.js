"use strict";

var Laproscope = Laproscope || {};

(function () {
   Components.utils.import("chrome://laproscope/content/LaproscopeLog.jsm");
   Components.utils.import("chrome://laproscope/content/LaproscopeServer.jsm");
   Components.utils.import("chrome://laproscope/content/REPL.jsm");
   let server = new LaproscopeServer.Listener(17428, true, REPL.handlerForGlobal(window));

   Laproscope.BrowserOverlay = {
     enable: function(aEvent) {
       let value = aEvent.target.hasAttribute('checked');
       LaproscopeLog("BrowserOverlay", "Laproscope.BrowserOverlay.enable: " + uneval(value));
       server.enabled = value;
     }
   };
 }
)();

