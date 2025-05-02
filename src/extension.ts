// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { CodeMentorAI } from './codementorai.js';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Set the src variable to the correct folder based on the extension mode
	let src = vscode.ExtensionMode[context.extensionMode] === "Development" ? "src" : "out";
  	context.workspaceState.update("src", src);

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('"codementor-ai" extension is now active!');

	// create codementorai webviewprovider
	const codementorai = new CodeMentorAI(context);
	  
	// context.subscriptions.push(disposable);


	let viewProvider = vscode.window.registerWebviewViewProvider(
		CodeMentorAI.ViewType, codementorai, { webviewOptions: { retainContextWhenHidden: true } } );
	context.subscriptions.push(viewProvider);   

	// summon myself
	//vscode.commands.executeCommand(CodeMentorAI.ViewType);
}

// This method is called when your extension is deactivated
// Currently there is nothing to do
export function deactivate() {}
