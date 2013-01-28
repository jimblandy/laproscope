/**
 * Simplified TCP server.
 *
 * LaproscopeServer.Listener and LaproscopeServer.Connection provide a
 * simple interface for creating TCP/IP servers in privileged Firefox
 * JavaScript code.
 */

"use strict";

var EXPORTED_SYMBOLS = ['LaproscopeServer'];

Components.utils.import('chrome://laproscope/content/LaproscopeLog.jsm');

var Cc = Components.classes;
var threadManager = Cc["@mozilla.org/thread-manager;1"].getService();
var ServerSocket = Components.Constructor("@mozilla.org/network/server-socket;1",
                                          "nsIServerSocket", "init");
var InputStreamPump = Components.Constructor("@mozilla.org/network/input-stream-pump;1",
                                             "nsIInputStreamPump", "init");
var ScriptableInputStream = Components.Constructor("@mozilla.org/scriptableinputstream;1",
                                                   "nsIScriptableInputStream", "init");

/**
 * A Connection represents a particular TCP connection made to a Listener.
 *
 * Each time a client establishes a connection with a Listener, the server
 * creates an instance of this class and passes it to its handler.
 *
 * Users should not call this directly; only the Listener class should
 * construct Connections.
 *
 * @param aTransport         An instance of nsISocketTransport representing
 *                           the new connection's socket.
 */
function Connection(aTransport) {
  let input = aTransport.openInputStream(0, 0, 0);
  let output = aTransport.openOutputStream(0, 0, 0);
  InputStreamPump(input, -1, -1, 0, 0, false).asyncRead(this, null);
  this._input = ScriptableInputStream(input);
  this._output = output;
  this._outputQueue = "";
}

Connection.prototype = {
  constructor: Connection,

  /**
   * Send |string| on the connection.
   *
   * The text is buffered and sent asynchronously; this method always returns
   * immediately.
   *
   * @param string           The data to be sent on the connection; a string.
   */
  write: function(string) {
    this._outputQueue += string;
    this._flush();
  },

  /**
   * Close this connection.
   */
  close: function() {
    this._output.close();
    this._input.close();
  },

  /**
   * Called when we have received data on the connection.
   *
   * The Connection's user should override this method with their own
   * handler.
   *
   * @param aInput   The data we have received from the connection; a string.
   */
  onInput: function(aInput) {
    LaproscopeLog("LaproscopeServer.Listener.Connection received: " + uneval(aInput));
    LaproscopeLog("(onInput method not overridden)");
  },

  /**
   * Called when the client closes their end of the connection.
   *
   * The Connection's user should override this method with their own handler.
   *
   * @param aStatus          An nsresult explaining why it stopped; NS_OK if
   *                         it completed successfully.
   */
  onClosed: function(aStatus) {
    LaproscopeLog("LaproscopeServer.Listener.Connection closed: " + uneval(aStatus));
  },

  /* Internal methods. */

  _flush: function() {
    if (this._outputQueue.length > 0) {
      this._output.asyncWait(this, 0, 0, threadManager.currentThread);
    }
  },

  // Connection implements nsIOutputStreamCallback.
  onOutputStreamReady: function(aStream) {
    // Because we call this._output.asyncWait only from _flush, we know
    // we only reach this point when we both have data to write, and the
    // socket is ready to send some more.
    let written = aStream.write(this._outputQueue, this._outputQueue.length);
    this._outputQueue = this._outputQueue.substring(written);
    this._flush();
  },

  // Connection implements nsIStreamListener.
  onStartRequest: function(aRequest, aContext) {},
  onStopRequest: function(aRequest, aContext, aStatusCode) {
    this.onClosed(aStatusCode);
  },
  onDataAvailable: function(aRequest, aContext, aStream, aOffset, aCount) {
    this.onInput(this._input.readBytes(this._input.available()));
  }
};

/**
 * A Listener listens on a TCP port, and reports connections to its user.
 *
 * Listen for connections on |port|; if |localOnly| is true, accept
 * connections only from the local host. When we get a connection, create a
 * Connection for it, and pass that to |handler|.
 *
 * Initially, the server is disabled. You can assign boolean values to
 * s.enabled to start it and stop it.
 *
 * @param aPort
 *        The TCP port number on which to listen for connections.
 *
 * @param aLocalOnly
 *        If true, accept connections only from this machine.
 *
 * @param aHandler
 *        A function which we call with a fresh Connection instance for each
 *        connection established to our TCP port. aHandler should replace the
 *        appropriate methods on Connection (onInput; onClosed; etc.) to
 *        implement its own server.
 */
function Listener(aPort, aLocalOnly, aHandler) {
  this._newSocket = function() {
    LaproscopeLog("ServerSocket = " + uneval(ServerSocket));
    return new ServerSocket(aPort, aLocalOnly, 4);
  };
  this._handler = aHandler;
  this._socket = null;
}

Listener.prototype = {
  constructor: Listener,

  get enabled() { return !!this._socket; },
  set enabled(v) { v ? this._start() : this._stop(); },

  /* Internal methods. */

  _start: function() {
    if (this.enabled) return;
    this._socket = this._newSocket();
    this._socket.asyncListen(this);
  },

  _stop: function() {
    if (!this.enabled) return;
    this._socket.close();
    this._socket = null;
  },

  onSocketAccepted: function (aServ, aTransport) {
    LaproscopeLog("LaproscopeServer.Listener: accepted connection: "
         + aTransport.host + ":" + aTransport.port);
    this._handler(new Connection(aTransport));
  },

  onStopListening: function (aServ, aStatus) {
    LaproscopeLog("LaproscopeServer.Listener: stop listening: " + aStatus);
  }
};

var LaproscopeServer = {
  Connection: Connection,
  Listener: Listener
};
