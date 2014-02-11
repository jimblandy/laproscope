
onunload.windows = WeakMap();
onunload.cleanups = [];
function onunload(cleanup, window) {
    if (typeof cleanup != "function") {
        onunload.reason = cleanup;
        if (window) {
            onunload.onunload({ target: window });
        }
        else {
            for (let win of WindowWatcher.browserWindows) {
                onunload(cleanup, win);
            }
            onunload.cleanups.forEach(f => {
                f(onunload.reason);
            });
        }
        return;
    }

    if (!window) {
        onunload.cleanups.push(cleanup);
        return;
    }

    let cleanups = onunload.windows.get(window);
    if (!cleanups) {
        cleanups = [];
        onunload.windows.set(window, cleanups);
        window.addEventListener("unload", onunload.onunload);
    }

    cleanups.push(cleanup);
}
onunload.onunload = function onunload_(event) {
    let window = event.target;
    let cleanups = onunload.windows.get(window);

    window.removeEventListener("unload", onunload.onunload);

    if (cleanups) {
        cleanups.forEach(f => {
            f(window, onunload.reason || "unload");
        });
    }
}

module.urls = {};
function module(url) {
    module.urls[url] = true;

    let obj = {};
    Cu.import(url, obj)
    return obj;
}
onunload(() => {
    Object.keys(module.urls).forEach(m => {
        Cu.unload(m);
    });
});


var WindowWatcher = {
    WINDOW_TYPE: "navigator:browser",

    initialized: false,
    listeners: [],

    init: function init() {
        this.initialized = true;

        Services.wm.addListener(this);

        onunload(this.shutdown.bind(this));
    },

    shutdown: function shutdown() {
        Services.wm.removeListener(this);
    },

    registerListener: function registerListener(listener) {
        if (!this.initialized)
            this.init();

        this.listeners.push(listener);
        for (let win in this.browserWindows) {
            if (win.document.readyState == "complete") {
                listener(win);
            }
        }
    },

    get browserWindows() {
        let enumerator = Services.wm.getEnumerator(this.WINDOW_TYPE);
        while (enumerator.hasMoreElements()) {
            yield enumerator.getNext();
        }
    },

    onWindowLoaded: function onWindowLoaded(window) {
        this.listeners.forEach(listener => {
            listener(window);
        });
    },

    onOpenWindow: function onOpenWindow(xulWindow) {
        let window = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);

        window.addEventListener("load", function onload() {
            window.removeEventListener("load", onload);
            if (window.document.documentElement.getAttribute("windowtype") == this.WINDOW_TYPE) {
                this.onWindowLoaded(window);
            }
        }.bind(this));
    },

    onCloseWindow: function onCloseWindow(xulWindow) {},

    onWindowTitleChange: function onWindowTitleChange(window, title) {},
};


function reasonToString(reason) {
    for each (let name in ["disable", "downgrade", "enable",
                           "install", "shutdown", "startup",
                           "uninstall", "upgrade"])
        if (reason == global["ADDON_" + name.toUpperCase()] ||
            reason == global["APP_" + name.toUpperCase()])
            return name;
}


const XMLHttpRequest = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest", "open");
const SupportsString = Components.Constructor("@mozilla.org/supports-string;1", "nsISupportsString");

function Prefs(branch, defaults) {
    this.constructor = Prefs; // Ends up Object otherwise... Why?

    this.branch = Services.prefs[defaults ? "getDefaultBranch" : "getBranch"](branch || "");
    if (this.branch instanceof Ci.nsIPrefBranch2)
        this.branch.QueryInterface(Ci.nsIPrefBranch2);

    this.defaults = defaults ? this : new this.constructor(branch, true);
}
Prefs.prototype = {
    /**
     * Returns a new Prefs object for the sub-branch *branch* of this
     * object.
     *
     * @param {string} branch The sub-branch to return.
     */
    Branch: function Branch(branch) new this.constructor(this.root + branch),

    /**
     * Clears the entire branch.
     *
     * @param {string} name The name of the preference branch to delete.
     */
    clear: function clear(branch) {
        this.branch.deleteBranch(branch || "");
    },

    /**
     * Returns the full name of this object's preference branch.
     */
    get root() this.branch.root,

    /**
     * Returns the value of the preference *name*, or *defaultValue* if
     * the preference does not exist.
     *
     * @param {string} name The name of the preference to return.
     * @param {*} defaultValue The value to return if the preference has no value.
     * @optional
     */
    get: function get(name, defaultValue) {
        let type = this.branch.getPrefType(name);

        if (type === Ci.nsIPrefBranch.PREF_STRING)
            return this.branch.getComplexValue(name, Ci.nsISupportsString).data;

        if (type === Ci.nsIPrefBranch.PREF_INT)
            return this.branch.getIntPref(name);

        if (type === Ci.nsIPrefBranch.PREF_BOOL)
            return this.branch.getBoolPref(name);

        return defaultValue;
    },

    /**
     * Returns true if the given preference exists in this branch.
     *
     * @param {string} name The name of the preference to check.
     */
    has: function has(name) this.branch.getPrefType(name) !== 0,

    /**
     * Returns an array of all preference names in this branch or the
     * given sub-branch.
     *
     * @param {string} branch The sub-branch for which to return preferences.
     * @optional
     */
    getNames: function getNames(branch) this.branch.getChildList(branch || "", { value: 0 }),

    /**
     * Returns true if the given preference is set to its default value.
     *
     * @param {string} name The name of the preference to check.
     */
    isDefault: function isDefault(name) !this.branch.prefHasUserValue(name),

    /**
     * Sets the preference *name* to *value*. If the preference already
     * exists, it must have the same type as the given value.
     *
     * @param {name} name The name of the preference to change.
     * @param {string|number|boolean} value The value to set.
     */
    set: function set(name, value) {
        let type = typeof value;
        if (type === "string") {
            let string = SupportsString();
            string.data = value;
            this.branch.setComplexValue(name, Ci.nsISupportsString, string);
        }
        else if (type === "number")
            this.branch.setIntPref(name, value);
        else if (type === "boolean")
            this.branch.setBoolPref(name, value);
        else
            throw TypeError("Unknown preference type: " + type);
    },

    /**
     * Resets the preference *name* to its default value.
     *
     * @param {string} name The name of the preference to reset.
     */
    reset: function reset(name) {
        if (this.branch.prefHasUserValue(name))
            this.branch.clearUserPref(name);
    }
};
