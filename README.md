# find-js-globals

## Features

Let's you quickly find and resolve global variables across your project in vs-code. Especially useful if you're not working with ES6 modules, but would still like a way to quickly jump to where an object, class or function got declared globally.

**There are a few ways to resolve a global and jump to wherever it was declared:**

1. To access the first "potential" source for the global you can try highlighting the text right clicking and then selecting `Attempt to Resolve Global` from the right-click menu. This isn't guaranteed to work, but you'll get a notification if it failed. If it doesn't work try the following steps instead. You can also use the keybinding `shift+cmd+r` for quicker access (my preference).

<img src="https://raw.githubusercontent.com/marcaaron/find-js-globals/master/images/cmdshiftr.gif" alt="Text HighLight Jump To Definition"/>

2. Highlight some text and `shift+cmd+p` to bring up the command pallette and you'll be able to select `Find JS Globals: Resolve` from the menu. If this is the first time using the extension the cache will need to build first (warning can take a few seconds for very large projects). And then you'll be given a list of potential sources to pick from.

<img src="https://raw.githubusercontent.com/marcaaron/find-js-globals/master/images/showtime.gif" alt="Find JS Globals: Resolve"/>

3. To bring up a list of all the globals the extension found (warning: it might be a LOT so performance-wise this is the least preferable way to resolve) you can `shift+cmd+p` and select `Find JS Globals: Search`. That'll bring up a filterable list of every single global. Not really recommended if you have a ton of globals, but still potentially useful if you're just having trouble sourcing something and want to see your options.

The cache will stay good for 6 hrs after that you'll need to rebuild it again. But if you think a lot of code has changed or you're not seeing something you should be seeing then manually refresh the cache with `shift+cmd+p` then `Find JS Globals: Refresh`.

## Extension Settings

To exclude certain globals from appearing you can now add an ignore pattern flag. This will block any globals matching a certain regex pattern from showing up in your cache.

e.g. to your `settings.json` file add:
```
"findJSGlobals.ignorePatterns": [
    {
        "pattern":"_",
        "flags:"g"
    }
]
```

This will exclude any globals with underscores from your list of globals. This uses a `new RegExp()` constructor pattern so any rules that can be applied inside those will work here. You can add as many ignore patterns as you like, but the more you have may impact performance.

## Known Issues

This extension indexes and caches file names and text within documents. Because of this `node_modules` and `git` directories are excluded by default for now. The code still needs to be improved a lot as there's tons of duplication.