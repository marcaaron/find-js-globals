// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const Cache = require('vscode-cache');
const fs = require('fs');
const path = require('path');
const regex = new RegExp(/(class|window\.|var|const|\(?\s?function)\s?([^\s]\.?[^\s]+)\s?(=|\((.+)?\)|\{)/, 'g');

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

const isNotNodeModules= name => !/node_modules/.test(name);
const isJS = name => /\.(js|jsx)/.test(name);
const isNotBuildFile = name => !/\/build\//.test(name);
const isNotGit= name => !/\.git/.test(name);

exports.activate = context => {
    let resultsCache = new Cache(context);

    const refreshCache = vscode.commands.registerCommand('extension.refreshCache', function() {
        vscode.window.showInformationMessage('Flushing JS Globals cache and building...');
        resultsCache.flush();
        walk(vscode.workspace.rootPath, (err, results) => {
            const exludes = results.filter(isNotNodeModules).filter(isNotGit).filter(isNotBuildFile).filter(isJS);
            const formatted = exludes.map(filename => {
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
                                results.push(`${foundGlobal}: ${item.filename}: ${index}`)
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
            const results = resultsCache.get('JS').filter(result => textRegex.test(result));
            const filename = results[0].split(':')[1].trim();
            const line = Number(results[0].split(':')[2].trim());
            if (results[0]) {
                vscode.workspace.openTextDocument(filename)
                .then((doc) => {
                    vscode.window.showTextDocument(doc)
                    .then((editor) => {
                        const position = editor.selection.active;
                        const newPosition = position.with(line, 0);
                        const newSelection = new vscode.Selection(newPosition, newPosition);
                        editor.selection = newSelection;
                    });
                });
            } else {
                vscode.window.showInformationMessage('Could not resolve global try command palette!');
            }
        } else {
            vscode.window.showInformationMessage('Re-building JS Globals Cache...');
            walk(vscode.workspace.rootPath, (err, results) => {
                const exludes = results.filter(isNotNodeModules).filter(isNotGit).filter(isNotBuildFile).filter(isJS);
                const formatted = exludes.map(filename => {
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
                                    results.push(`${foundGlobal}: ${item.filename}: ${index}`)
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
                    });
                });        
            });
        } else {
            walk(vscode.workspace.rootPath, (err, results) => {
                const exludes = results.filter(isNotNodeModules).filter(isNotGit).filter(isNotBuildFile).filter(isJS);
                const formatted = exludes.map(filename => {
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
                                    results.push(`${foundGlobal}: ${item.filename}: ${index}`)
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
                const exludes = results.filter(isNotNodeModules).filter(isNotGit).filter(isNotBuildFile).filter(isJS);
                const formatted = exludes.map(filename => {
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
                                    results.push(`${foundGlobal}: ${item.filename}: ${index}`)
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