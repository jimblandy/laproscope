// General utility bindings used elsewhere in the add-on.
"use strict";

{
  let CC = Components.Constructor;
  let CI = Components.interfaces;

  var Laproscope = {
    consoleService: (Components.classes["@mozilla.org/consoleservice;1"]
                     .getService(CI.nsIConsoleService)),
    log: function() {
      var message = Array.prototype.join.call(arguments, "");
      Laproscope.consoleService.logStringMessage(message + "\n");
    },

    threadManager: Cc["@mozilla.org/thread-manager;1"].getService(),

    ServerSocket: CC("@mozilla.org/network/server-socket;1",
                     "nsIServerSocket",
                     "init"),
    InputStreamPump: CC("@mozilla.org/network/input-stream-pump;1",
                        "nsIInputStreamPump",
                        "init"),
    ScriptableInputStream: CC("@mozilla.org/scriptableinputstream;1",
                              "nsIScriptableInputStream",
                              "init")
  };
}
