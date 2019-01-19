// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const Cache = require('vscode-cache');
const fs = require('fs');
const path = require('path');

fs.readFileAsync = function (filename) {
    return new Promise(function (resolve, reject) {
        fs.readFile(filename, (err, text) => {
            if (text) {
                resolve({
                    filename,
                    text
                });  
            } else {
                resolve();
            }
        })
    });
};

const walk = function(dir, done) {
    let results = [];
    fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        let pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(file => {
            file = path.resolve(dir, file);
            fs.stat(file, (err, stat) => {
                if (stat && stat.isDirectory()) {
                    walk(file, (err, res) => {
                        results = results.concat(res);
                        if (!--pending) done(null, results);
                    });
                } else {
                    results.push(file);
                    if (!--pending) done(null, results);
                }
            })
        })
    })
}

exports.activate = context => {
    const config = vscode.workspace.getConfiguration();
    const ignoreNodeModules = config.get('findJSGlobals.ignoreNodeModules') || true;
    const ignoreGit = config.get('findJSGlobals.ignoreGit') || true;
    const ignoreBuildFiles = config.get('findJSGlobals.ignoreBuildFiles') || true;
    const customExcludes = config.get('findJSGlobals.ignorePatterns') || [];

    const filters = {
        isNotNodeModules: (name) => !/node_modules/.test(name),
        isJS: name => /\.(js|jsx)/.test(name),
        isNotBuildFile: name => !/\/build\//.test(name),
        isNotGit: name => !/\.git/.test(name)
    };

    const goodGlobal = /^[a-zA-Z$\_][^():~\-=@#%^&*+]+/;
    const regex = new RegExp(/(class|window\.|var|const|\(?\s?function)\s?([^\s]\.?[^\s]+)\s?(=|\((.+)?\)|\{)/, 'g');
    let resultsCache = new Cache(context);

    const refreshCache = vscode.commands.registerCommand('extension.refreshCache', function() {
        vscode.window.showInformationMessage('Flushing JS Globals cache and re-building...');
        resultsCache.flush();
        walk(vscode.workspace.rootPath, (err, results) => {
            let excludes = results.filter(filters.isJS);

            if (ignoreNodeModules) {
                excludes = excludes.filter(filters.isNotNodeModules);
            }

            if (ignoreGit) {
                excludes = excludes.filter(filters.isNotGit);
            }

            if (ignoreBuildFiles) {
                excludes = excludes.filter(filters.isNotBuildFile);
            }

            const formatted = excludes.map(filename => {
                return fs.readFileAsync(filename);    
            });
            
            Promise.all(formatted)
            .then(items => {
                const notNullItems = items.filter(item => item);
                const results = [];
                notNullItems.forEach(item => {
                    item.text.toString().split(/\n/).forEach((line, index)=>{
                        line.replace(regex, (x, y, foundGlobal) => {
                            if (foundGlobal) {
                                if (customExcludes.length && customExcludes.some(({pattern, flags}) => {
                                    const regexExclude = new RegExp(pattern, flags);
                                    return regexExclude.test(foundGlobal);
                                })) {
                                    // Do nothing this global should be ignored
                                } else {
                                    if (goodGlobal.test(foundGlobal)) {
                                        results.push(`${foundGlobal}: ${item.filename}: ${index}`)
                                    }
                                }
                            }    
                        });                        
                    })
                });
                resultsCache.put('JS', results, 21600);
                vscode.window.showInformationMessage('Find JS Globals cache refreshed!');
            });
        });
    });

    const attemptToResolve = vscode.commands.registerTextEditorCommand('extension.attemptToResolve', function() {
        const selection = vscode.window.activeTextEditor.selection;
        const text = vscode.window.activeTextEditor.document.getText(selection);
        const textRegex = new RegExp(`^${text}[\:\(]`);
        if (resultsCache.has('JS')) {
            let results = resultsCache.get('JS').filter(result => textRegex.test(result));
            results = results.map(res=>{
                const parse = res.split(':');
                return {
                    name: parse[0].trim(),
                    filename: parse[1].trim(),
                    line: Number(parse[2].trim())
                }
            });
            if (results.length > 1) {
                const findInFilename = new RegExp(text, 'i');
                results = results.sort((a, b) => {
                    if (findInFilename.test(a.filename) && !findInFilename.test(b.filename)) {
                        return -1;
                    } else if (findInFilename.test(a.filename) && findInFilename.test(b.filename)) {
                        return 0;
                    } else {
                        return 1;
                    }
                });
            }
            if (results[0]) {
                const fileToOpen = results[0];
                vscode.workspace.openTextDocument(fileToOpen.filename)
                .then((doc) => {
                    vscode.window.showTextDocument(doc)
                    .then((editor) => {
                        const position = editor.selection.active;
                        const newPosition = position.with(fileToOpen.line, 0);
                        const newSelection = new vscode.Selection(newPosition, newPosition);
                        editor.selection = newSelection;
                        vscode.commands.executeCommand('revealLine', {
                            lineNumber: fileToOpen.line,
                            at: 'center'
                        });
                    });
                });
            } else {
                vscode.window.showInformationMessage('Could not resolve global try command palette!');
            }
        } else {
            vscode.window.showInformationMessage('Re-building JS Globals Cache...');
            walk(vscode.workspace.rootPath, (err, results) => {
                let excludes = results.filter(filters.isJS);

                if (ignoreNodeModules) {
                    excludes = excludes.filter(filters.isNotNodeModules);
                }
    
                if (ignoreGit) {
                    excludes = excludes.filter(filters.isNotGit);
                }
    
                if (ignoreBuildFiles) {
                    excludes = excludes.filter(filters.isNotBuildFile);
                }

                const formatted = excludes.map(filename => {
                    return fs.readFileAsync(filename);    
                });
                Promise.all(formatted)
                .then(items => {
                    const notNullItems = items.filter(item => item);
                    const results = [];
                    notNullItems.forEach(item => {
                        item.text.toString().split(/\n/).forEach((line, index)=>{
                            line.replace(regex, (x, y, foundGlobal) => {
                                if (foundGlobal) {
                                    if (customExcludes.length && customExcludes.some(({pattern, flags}) => {
                                        const regexExclude = new RegExp(pattern, flags);
                                        return regexExclude.test(foundGlobal);
                                    })) {
                                        // Do nothing this global should be ignored
                                    } else {
                                        if (goodGlobal.test(foundGlobal)) {
                                            results.push(`${foundGlobal}: ${item.filename}: ${index}`)
                                        }
                                    }
                                }    
                            });                        
                        })
                    });
                    resultsCache.put('JS', results, 21600);
                    vscode.window.showInformationMessage('Find JS Globals cache refreshed!');
                    // Do stuff with results
                    const filteredResults = resultsCache.get('JS').filter(result => textRegex.test(result));
                    const filename = filteredResults[0].split(':')[1].trim();
                    const line = Number(filteredResults[0].split(':')[2].trim());        
                    if (filteredResults[0]) {
                        vscode.workspace.openTextDocument(filename)
                        .then((doc) => {
                            vscode.window.showTextDocument(doc)
                            .then((editor) => {
                                const position = editor.selection.active;
                                const newPosition = position.with(line, 0);
                                const newSelection = new vscode.Selection(newPosition, newPosition);
                                editor.selection = newSelection;
                                vscode.commands.executeCommand('revealLine', {
                                    lineNumber:line,
                                    at: 'center'
                                });
                            });
                        });        
                    } else {
                        vscode.window.showInformationMessage('Could not resolve global try command palette!');
                    }    
                });
            });
        }
    });

    const resolveGlobal = vscode.commands.registerTextEditorCommand('extension.resolveGlobal', function() {
        const selection = vscode.window.activeTextEditor.selection;
        const text = vscode.window.activeTextEditor.document.getText(selection);

        if (resultsCache.has('JS')) {
            const results = resultsCache.get('JS').filter(result => (new RegExp(`^${text}`)).test(result));
            vscode.window.showQuickPick(results, {
                placeHolder: ''
            })
            .then(selected => {
                const filename = selected.split(':')[1].trim();
                const line = Number(selected.split(':')[2].trim());            
                vscode.workspace.openTextDocument(filename)
                .then((doc) => {
                    vscode.window.showTextDocument(doc)
                    .then((editor) => {
                        const position = editor.selection.active;
                        const newPosition = position.with(line, 0);
                        const newSelection = new vscode.Selection(newPosition, newPosition);
                        editor.selection = newSelection;
                        vscode.commands.executeCommand('revealLine', {
                            lineNumber:line,
                            at: 'center'
                        });
                    });
                });        
            });
        } else {
            walk(vscode.workspace.rootPath, (err, results) => {
                let excludes = results.filter(filters.isJS);

                if (ignoreNodeModules) {
                    excludes = excludes.filter(filters.isNotNodeModules);
                }

                if (ignoreGit) {
                    excludes = excludes.filter(filters.isNotGit);
                }

                if (ignoreBuildFiles) {
                    excludes = excludes.filter(filters.isNotBuildFile);
                }    
                const formatted = excludes.map(filename => {
                    return fs.readFileAsync(filename);    
                });
                Promise.all(formatted)
                .then(items => {
                    const notNullItems = items.filter(item => item);
                    const results = [];
                    notNullItems.forEach(item => {
                        item.text.toString().split(/\n/).forEach((line, index)=>{
                            line.replace(regex, (x, y, foundGlobal) => {
                                if (foundGlobal) {
                                    if (customExcludes.length && customExcludes.some(({pattern, flags}) => {
                                        const regexExclude = new RegExp(pattern, flags);
                                        return regexExclude.test(foundGlobal);
                                    })) {
                                        // Do nothing this global should be ignored
                                    } else {
                                        if (goodGlobal.test(foundGlobal)) {
                                            results.push(`${foundGlobal}: ${item.filename}: ${index}`)
                                        }
                                    }
                                }    
                            });                        
                        })
                    });
                    resultsCache.put('JS', results, 21600);
                    // Do stuff with results
                    const filteredResults = resultsCache.get('JS').filter(result => (new RegExp(text)).test(result));
                    vscode.window.showQuickPick(filteredResults, {
                        placeHolder: ''
                    })
                    .then(selected => {
                        const filename = selected.split(':')[1].trim();
                        const line = Number(selected.split(':')[2].trim());            
                        vscode.workspace.openTextDocument(filename)
                        .then((doc) => {
                            vscode.window.showTextDocument(doc)
                            .then((editor) => {
                                const position = editor.selection.active;
                                const newPosition = position.with(line, 0);
                                const newSelection = new vscode.Selection(newPosition, newPosition);
                                editor.selection = newSelection;
                                vscode.commands.executeCommand('revealLine', {
                                    lineNumber:line,
                                    at: 'center'
                                });
                            });
                        });        
                    }); 
                });
            });
        }
    });

    const findGlobal = vscode.commands.registerCommand('extension.findGlobal', async function () {
        if (!resultsCache.has('JS')) {
            walk(vscode.workspace.rootPath, (err, results) => {
                let excludes = results.filter(filters.isJS);

                if (ignoreNodeModules) {
                    excludes = excludes.filter(filters.isNotNodeModules);
                }
    
                if (ignoreGit) {
                    excludes = excludes.filter(filters.isNotGit);
                }
    
                if (ignoreBuildFiles) {
                    excludes = excludes.filter(filters.isNotBuildFile);
                }
                const formatted = excludes.map(filename => {
                    return fs.readFileAsync(filename);    
                });
                Promise.all(formatted)
                .then(items => {
                    const notNullItems = items.filter(item => item);
                    const results = [];
                    notNullItems.forEach(item => {
                        item.text.toString().split(/\n/).forEach((line, index)=>{
                            line.replace(regex, (x, y, foundGlobal) => {
                                if (foundGlobal) {
                                    if (customExcludes.length && customExcludes.some(({pattern, flags}) => {
                                        const regexExclude = new RegExp(pattern, flags);
                                        return regexExclude.test(foundGlobal);
                                    })) {
                                        // Do nothing this global should be ignored
                                    } else {
                                        if (goodGlobal.test(foundGlobal)) {
                                            results.push(`${foundGlobal}: ${item.filename}: ${index}`)
                                        }
                                    }
                                }    
                            });                        
                        })
                    });
                    resultsCache.put('JS', results, 21600);
                    // Do stuff with results
                    vscode.window.showQuickPick(results, {
                        placeHolder: ''
                    })
                    .then(selected => {
                        const filename = selected.split(':')[1].trim();
                        const line = Number(selected.split(':')[2].trim());            
                        vscode.workspace.openTextDocument(filename)
                        .then((doc) => {
                            vscode.window.showTextDocument(doc)
                            .then((editor) => {
                                const position = editor.selection.active;
                                const newPosition = position.with(line, 0);
                                const newSelection = new vscode.Selection(newPosition, newPosition);
                                editor.selection = newSelection;
                                vscode.commands.executeCommand('revealLine', {
                                    lineNumber:line,
                                    at: 'center'
                                });
                            });
                        });                    
                    });
                });
            });
        } else {
            const results = resultsCache.get('JS');
            // Do stuff with results
            vscode.window.showQuickPick(results, {
                placeHolder: ''
            })
            .then(selected => {
                const filename = selected.split(':')[1].trim();
                const line = Number(selected.split(':')[2].trim());            
                vscode.workspace.openTextDocument(filename)
                .then((doc) => {
                    vscode.window.showTextDocument(doc)
                    .then((editor) => {
                        const position = editor.selection.active;
                        const newPosition = position.with(line, 0);
                        const newSelection = new vscode.Selection(newPosition, newPosition);
                        editor.selection = newSelection;
                        vscode.commands.executeCommand('revealLine', {
                            lineNumber:line,
                            at: 'center'
                        });
                    });
                });                    
            });        
        }
    });

    context.subscriptions.push(findGlobal, resolveGlobal, refreshCache, attemptToResolve);
}


// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;