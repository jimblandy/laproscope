const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

Cu.import("resource://gre/modules/Services.jsm");

function registerWindow(window) {
    let doc = window.document;

    let server = new LaproscopeServer.Listener(prefs.get("port"), true, REPL.handlerForGlobal(window));

    let menuitem = doc.createElement("menuitem");
    menuitem.id = "laproscope-enable-menu-item";
    menuitem.setAttribute("type", "checkbox");
    menuitem.setAttribute("checked", "false");
    menuitem.setAttribute("label", _("laproscope.enableServer.label"));
    menuitem.setAttribute("accesskey", _("laproscope.enableServer.accesskey"));
    menuitem.addEventListener("command", function oncommand(event) {
        let value = event.target.hasAttribute('checked');
        LaproscopeLog("BrowserOverlay", "Laproscope.BrowserOverlay.enable: " + uneval(value));
        server.enabled = value;
    });

    doc.getElementById("menu_ToolsPopup").appendChild(menuitem)
    onunload(() => {
        server.enabled = false;
        menuitem.parentNode.removeChild(menuitem);
    }, window);
}

var LaproscopeLog, LaproscopeServer, REPL, prefs, strings;

function _(string, ...args) {
    if (!args.length) {
        return strings.GetStringFromName(string);
    }
    return strings.formatStringFromName(string, args, args.length);
}

function startup(data, reason) {
    Services.scriptloader.loadSubScript("chrome://laproscope/content/utils.js", this);

    ({ LaproscopeLog })    = module("chrome://laproscope/content/LaproscopeLog.jsm");
    ({ LaproscopeServer }) = module("chrome://laproscope/content/LaproscopeServer.jsm");
    ({ REPL })             = module("chrome://laproscope/content/REPL.jsm");

    prefs = new Prefs("extensions.laproscope.");
    prefs.defaults.set("port", 17428);

    strings = Services.strings.createBundle("chrome://laproscope/locale/laproscope.properties");
    onunload(() => { Services.strings.flushBundles() });

    WindowWatcher.registerListener(registerWindow);
}

function shutdown(data, reason) {
    onunload(reasonToString(reason));
}

function install(data, reason) {}
function uninstall(data, reason) {}
