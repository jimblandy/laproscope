(function () {
   function onInput(string) {
     this.write(string.replace(/foo/, "bar"));
   }

   function handler(aConnection) {
     aConnection.onInput = onInput;
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

