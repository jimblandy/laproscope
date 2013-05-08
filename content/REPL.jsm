var EXPORTED_SYMBOLS = ['REPL'];

function handlerForGlobal(global) {
  return handler;

  function handler(aConnection) {
    aConnection.write('surely there are better alternatives\n');
    aConnection.write('l> ');

    let unitParser = new UnitParser(onUnit, onUnitsClosed);
    aConnection.onInput = unitParser.onInput.bind(unitParser);
    aConnection.onClosed = unitParser.onClosed.bind(unitParser);

    /* Utility object for the global. */
    let lap = {
      write: aConnection.write.bind(aConnection),
    };

    function evalAndPrint(code) {
      try {
        /* Reassign, in case other connections have set theirs. */
        global.lap = lap;

        let value = global.eval(code);
        /*
         * Print the value helpfully. Don't print 'undefined' values;
         * show source form of everything; show string for objects (so
         * we can see their class, usually).
         */
        if (value !== undefined) {
          let ue = uneval(value);
          /* Prefer toString to certain less-helpful results from uneval. */
          if (ue === '({})' || ue.indexOf('\n') != -1) {
            aConnection.write("(toString) " + value.toString() + "\n");
          } else {
            aConnection.write(ue + "\n");
          }
        }
      } catch (x) {
        aConnection.write('Exception: ' + x + '\n');
        if (x.stack) {
          aConnection.write('Stack:\n' + x.stack);
        }
      }
    }

    function onUnit(unit, isFinal) {
      evalAndPrint(unit);
      if (!isFinal) {
        aConnection.write('l> ');
      }
    }
    function onUnitsClosed(status) {
      aConnection.constructor.prototype.onClosed.call(aConnection, status);
    }
  }
}

// Given data in arbitrary chunks from the socket, a UnitParser instance
// parses them into units of code to be evaluated ("compilation units",
// hence the name), and passes those units to its |onUnit| handler.
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
// Instances have the following methods:
//
// - onInput(string)
// - onClosed(status)
//    These are what you'd plug in to a Connection's onInput and onClosed
//    hooks.
//
// Instances have the following handlers:
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
// Constructor parameters:
//
// @param aOnUnit function
// @param aOnUnitsClosed function
//    Initial values for onUnit and onUnitsClosed.

//    Called when the stream is closed, after all text has been passed to aOnUnit.
function UnitParser(aOnUnit, aOnUnitsClosed) {
  this.onUnit = aOnUnit;
  this.onUnitsClosed = aOnUnitsClosed;
  this.buffer = '';
  this.unit = '';
}

UnitParser.prototype = {
  constructor: UnitParser,
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
        this.onUnit(this.unit + line.substr(2));
        this.unit = '';
        break;

        default:
        this.onUnit(this.unit + line);
        this.unit = '';
        break;
      }
      this.buffer = this.buffer.substr(end + 1);
    }
  },
  onClosed: function(status) {
    if (this.unit || this.buffer) {
      this.onUnit(this.unit + this.buffer, true);
    }
    this.unit = '';
    this.buffer = '';
    this.onUnitsClosed(status);
  }
};

var REPL = { handlerForGlobal: handlerForGlobal };
