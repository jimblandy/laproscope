"use strict";

(function () {

   function handler(aConnection) {
     this.write('laproscope> ');
     aConnection.onInput = onInput;

     let buffer = "";
     function onInput(string) {
       buffer += string;
       let end;
       while ((end = buffer.indexOf('\n', start)) > 0) {
         try {
           this.write(uneval(eval(buffer.substr(start, end + 1))) + '\n');
         } catch (x) {
           this.write('Exception: ' + x + '\n');
         }
         buffer = buffer.substr(end + 1);
       }
       this.write('laproscope> ');
     }
   }

   Laproscope.log("Laproscope.BrowserOverlay: creating server");
   let server = new Laproscope.Server(17428, true, handler);
   Laproscope.log("Laproscope.BrowserOverlay: server created");

   Laproscope.BrowserOverlay = {
     enable: function(aEvent) {
       Laproscope.log("Laproscope.BrowserOverlay.enable(" + uneval(aEvent) + ")");
       Laproscope.log("Checked: " + aEvent.target.hasAttribute('checked'));
       Laproscope.log("Laproscope.BrowserOverlay.enable: setting server.enabled");
       server.enabled = aEvent.target.hasAttribute('checked');
       Laproscope.log("Laproscope.BrowserOverlay.enable: done setting server.enabled");
     }
   };
 }
)();

