Laproscope: A Horrible Firefox Extension
========================================

Laproscope is the culmination of a series of ill-considered design choices,
brought together so as to make the worst possible outcomes all but certain.
Don't do something you'll regret.

Laproscope is a Firefox extension that adds a _Laproscope server_ checkbox
menu item to your _Tools_ menu. When that item is checked, Firefox listens
for TCP connections from the local machine on port 17428 (just because).
You can then connect to that port with a tool like _nc_ to get a prompt at
which you can evaluate JavaScript with chrome privileges.

For example:

    $ nc localhost 17428
    surely there are better alternatives
    l> 1+3
    4
    l> window
    ({})
    [object ChromeWindow]
    l> function f(n) { if (n > 0) f(n-1); else null.x; } 
    l> f(3)
    Exception: TypeError: null has no properties
    Stack:
    f@chrome://laproscope/content/browserOverlay.js:20
    f@chrome://laproscope/content/browserOverlay.js:20
    f@chrome://laproscope/content/browserOverlay.js:20
    f@chrome://laproscope/content/browserOverlay.js:20
    @chrome://laproscope/content/browserOverlay.js:20
    onInput@chrome://laproscope/content/browserOverlay.js:20
    Connection.prototype.onDataAvailable@chrome://laproscope/content/server.js:110
    l>

Now you can really hack on Firefox from within Emacs.

Please note: when the _Laproscope server_ menu item is checked, any process
on your machine can connect the port and do anything Firefox chrome code
can do: delete files, send sensitive data off to shady web servers, et
cetera. It's a terrible design. Honestly, why would you want to use such a
thing?

Building and installation
-------------------------

Running 'make' in the top of the source tree will produce a file named
'laproscope.xpi'. If you visit this file with Firefox, it will offer to
install it as an extension. In the name of good form, it will express a
reassuringly generic skepticism about the wisdom of doing so, which will
almost certainly fail to elicit the merited degree of hesitation on your
part.

Hacking
-------

I don't quite remember how I did it, but I managed to replace the _*.xpi_
file in the _extensions_ subdirectory of my Firefox profile with a symlink
to my source tree, so that simply restarting Firefox reloaded the current
sources. There's almost certainly a better way, but I don't know what it
is.

Spelling
--------

The word "Laproscope" is more commonly spelt "Laparoscope". That this
extension should use (what one might charitably call) a non-standard
spelling is fitting, and there are no plans to change the name.
