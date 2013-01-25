"use strict";

(function () {

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
            * directly in the global object.
            */
           let value = (0,eval)(buffer.substr(0, end + 1));
           /*
            * Print the value helpfully. Don't print 'undefined' values;
            * show source form of everything; show string for objects (so
            * we can see their class, usually).
            */
           if (value !== undefined) {
             this.write(uneval(value) + '\n');
             if (typeof value === 'object') {
               this.write(value.toString() + '\n');
             }
           }
         } catch (x) {
           if (x instanceof Error) {
             this.write('Exception: ' + x + '\nStack:\n' + x.stack);
           } else {
             this.write('Exception: ' + uneval(x) + '\n');
           }
         }
         buffer = buffer.substr(end + 1);
       }
       this.write('l> ');
     }
   }

   let server = new Laproscope.Server(17428, true, handler);

   Laproscope.BrowserOverlay = {
     enable: function(aEvent) {
       let value = aEvent.target.hasAttribute('checked');
       Laproscope.log("Laproscope.BrowserOverlay.enable: " + uneval(value));
       server.enabled = value;
     }
   };
 }
)();

