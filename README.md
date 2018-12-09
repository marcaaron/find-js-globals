# find-js-globals

## Features

Let's you quickly find and resolve global variables across your project in vs-code. Especially useful if you're not working with ES6 modules, but would still like a way to quickly jump to where an object, class or function got declared globally.

There's a few ways you can try to resolve a global.

1. Highlight some text and `shift+cmd+p` to bring up the command pallette and you'll be able to select `Find JS Globals: Resolve` from the menu. If this is the first time using the extension the cache will need to build first (takes a few seconds at least for very large projects). And they you'll be given a list of potential sources to pick from.
1. To access the first "potential" source for the global you can try highlighting the text right clicking and then selecting `Attempt to Resolve Global` from the right-click menu. This isn't guaranteed to work, but you'll get a notification if it failed. If it doesn't work try step 1 instead.
1. To bring up a list of all the globals the extension found (warning: it might be a LOT) you can `shift+cmd+p` and select `Find JS Globals: Search`. That'll bring up a filterable list of every single global. Not really recommended if you have a ton of globals, but still potentially useful if you're having trouble sourcing something.

The cache will stay good for 6 hrs after that you'll need to rebuild it again. But if you think a lot of code has changed or you're not seeing something you should be seeing then manually refresh the cache with `shift+cmd+p` then `Find JS Globals: Refresh`.

## Extension Settings

There are no settings at the moment. Future improvements would probably include setting expiration of the cache, adding your own exclude folders, etc.

## Known Issues

This extension indexes and caches file names and text within documents. Because of this `node_modules` and `git` directories are excluded by default for now. The code needs to be improved a lot as there's tons of duplication.