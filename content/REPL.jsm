var EXPORTED_SYMBOLS = ['REPL'];

// A Framer instance functions as a LaproscopeServer.Connection
// listener, parses the stream into units of text to be evaluated
// ("compilation units", hence the name), and passes them to its own
// listener.
//
// A Framer also handles writing output to a connection so that textual
// output, values, errors, stacks, and prompts can be reliably
// distinguished. The output is still legible when using 'nc' to talk to
// Laproscope.
//
// Our idiosyncratic definition of a unit:
//
// - Usually, each line (terminated by a newline) is a unit.
//
// - However, a sequence of lines beginning with a backslash and a space,
//   followed by a line that begins with a backslash and a period, are a
//   unit: the leading backslash-foo sequences are removed, and the lines
//   are concatenated together. Actually, any line that doesn't start with
//   a backslash and a space ends the unit; but only \. lines get the \.
//   trimmed.
//
// - If the stream doesn't end with a newline character, then any text
//   after the last newline is a unit.
//
// The idea here is to have something that's easy to type, but can also
// handle multi-line compilation units. The following sed command quotes a
// file as a single unit:
//
//      sed -e '$!s/^/\\ /' -e '$s/^/\\./'
//
// In the output, the first character of each line indicates what sort of
// output it is, and the second character distinguishes continuations from
// final lines. The first character of each line is one of the following:
//
//   =: A value printed as the result of evaluating a compilation unit.
//   (space): Textual output written by the expression using 'lap.write'.
//   !: An error message.
//   .: A stack trace.
//
// The second character of each line is either a space, indicating that
// it's the final (or only) line of that item, or '-', indicating that
// there are more lines to come in that item.
//
// As a special case, if the first three characters of a line are 'l> ',
// that's a prompt. There's no following newline.
//
// All output, other than prompts, is complete lines.
//
// The listener object stored as the 'listener' property of a Framer
// instance should have the following methods:
//
// - onUnit(unit, isFinal)
//   We've received a unit, whose text is |unit|. |isFinal| is a true value
//   if we know for sure this is the last unit we'll receive on the
//   connection. It may not always be true on the last unit actually
//   received; this is weak, but good enough for suppressing trailing
//   prompts.
//
// - onUnitsClosed(status)
//   The stream has been closed, with nsresult status |status|.
//
// The Framer instance itself has the methods needed to be a
// LaproscopeServer.Connection listener: onInput and onClosed. It provides
// the following methods for writing different items:
//
// - writeValue(text)
// - writeText(text)
// - writeErrorMessage(text)
// - writeStackTrace(text)
// - writePrompt()
//
// Framer constructor parameters:
//
// @param aConnection
//    A LaproscopeServer.Connection instance to use for output.
function Framer(aConnection) {
  this.connection = aConnection;
  this.buffer = '';
  this.unit = '';
  this.listener = null;
}

Framer.makeWriter = function(aPrefix) {
  return function (text) {
    let lines = text.split('\n');

    // If text was properly terminated by a newline, drop the final empty
    // string. Otherwise, treat the final non-newline-terminated fragment
    // as if it were a full line, simply by leaving it in the array.
    if (lines.length > 0 && lines[lines.length-1] == '') {
      lines.length--;
    }

    let i = 0;
    while (i < lines.length - 1) {
      this.connection.write(aPrefix + '-' + lines[i++] + '\n');
    }
    if (i < lines.length) {
      this.connection.write(aPrefix + ' ' + lines[i] + '\n');
    }
  }
};

Framer.prototype = {
  constructor: Framer,

  writeValue:           Framer.makeWriter('='),
  writeText:            Framer.makeWriter(' '),
  writeErrorMessage:    Framer.makeWriter('!'),
  writeStackTrace:      Framer.makeWriter('.'),

  writePrompt: function () {
    this.connection.write('l> ');
  },

  onInput: function(string) {
    this.buffer += string;
    let end;
    while ((end = this.buffer.indexOf('\n')) > 0) {
      let line = this.buffer.substr(0, end + 1);
      switch (line.substr(0,2)) {
        case '\\ ':
        this.unit += line.substr(2);
        break;

        case '\\.':
        this.listener.onUnit(this.unit + line.substr(2));
        this.unit = '';
        break;

        default:
        this.listener.onUnit(this.unit + line);
        this.unit = '';
        break;
      }
      this.buffer = this.buffer.substr(end + 1);
    }
  },

  onClosed: function(status) {
    if (this.unit || this.buffer) {
      this.listener.onUnit(this.unit + this.buffer, true);
    }
    this.unit = '';
    this.buffer = '';
    this.listener.onUnitsClosed(status);
    this.connection.close();
  }
};

// A Repl instance acts as a Framer listener, and runs a
// read-eval-print loop, using the Framer for output.
//
// @param aGlobal object
//    The global object in which this Repl should evaluate code.
//
// @param aFramer
//    A Framer instance to use for output.
function Repl(aGlobal, aFramer) {
  this.global = aGlobal;
  this.parser = aFramer;

  /* Utility object for the global. */
  this.lap = {
    write: (text) => { return this.parser.writeText(text); }
  };

  this.parser.writeText('surely there are better alternatives\n');
  this.parser.writePrompt();
}

Repl.prototype = {
  constructor: Repl,

  onUnit: function(unit, isFinal) {
    this._evalAndPrint(unit);
    if (!isFinal) {
      this.parser.writePrompt();
    }
  },

  onUnitsClosed: function(status) { },

  _evalAndPrint: function(code) {
    try {
      /* Reassign, in case other ReplS have set theirs. */
      this.global.lap = this.lap;

      let value = this.global.eval(code);
      /*
       * Print the value helpfully. Don't print 'undefined' values;
       * show source form of everything; show string for objects (so
       * we can see their class, usually).
       */
      if (value !== undefined) {
        let ue = uneval(value);
        /* Prefer toString to certain less-helpful results from uneval. */
        if (ue === '({})' || ue.indexOf('\n') != -1) {
          this.parser.writeValue("(toString) " + value.toString() + "\n");
        } else {
          this.parser.writeValue(ue + "\n");
        }
      }
    } catch (x) {
      this.parser.writeErrorMessage('Exception: ' + x + '\n');
      if (x.stack) {
        this.parser.writeStackTrace('Stack:\n' + x.stack);
      }
    }
  }
};

function handlerForGlobal(aGlobal) {
  return function(aConnection) {
    let up = new Framer(aConnection);
    aConnection.listener = up;

    let repl = new Repl(aGlobal, up);
    up.listener = repl;
  }
}

var REPL = { handlerForGlobal: handlerForGlobal };
