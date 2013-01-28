var EXPORTED_SYMBOLS = ['REPL'];

function handler(aConnection) {
  aConnection.write('surely there are better alternatives\n');
  aConnection.write('l> ');
  aConnection.onInput = onInput;

  let buffer = "";
  function onInput(string) {
    buffer += string;
    let end;
    while ((end = buffer.indexOf('\n')) > 0) {
      try {
        /*
         * (0,eval) is an indirect eval, and thus evaluates the code
         * directly in our global object.
         */
        let value = (0,eval)(buffer.substr(0, end + 1));
        /*
         * Print the value helpfully. Don't print 'undefined' values;
         * show source form of everything; show string for objects (so
         * we can see their class, usually).
         */
        if (value !== undefined) {
          let ue = uneval(value);
          /* Prefer toString to certain less-helpful results from uneval. */
          if (ue === '({})' || ue.indexOf('\n') != -1) {
            this.write("toString: " + value.toString() + "\n");
          } else {
            this.write(ue + "\n");
          }
        }
      } catch (x) {
        this.write('Exception: ' + x + '\n');
        if (x.stack) {
          this.write('Stack:\n' + x.stack);
        }
      }
      buffer = buffer.substr(end + 1);
    }
    this.write('l> ');
  }
}

var REPL = { handler: handler };
