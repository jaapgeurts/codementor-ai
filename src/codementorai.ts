/*
 * This is the main file for the CodeMentorAI extension.
 * It is responsible for setting up the extension and handling the webview.
 * Author: Jaap Geurts
 * Date: 2025-12-01
 */

import * as vscode from "vscode";
import * as fs from 'fs';

import { Timer } from "./timer";

import { FeedbackService } from "./feedbackservice";
import { FeedbackError } from "./feedbackerror";
import { IFeedbackAnnotation } from "./feedback";

const crypto = require("crypto");

export class CodeMentorAI implements vscode.WebviewViewProvider {

    public static readonly ViewType = 'codementor-ai-interaction';

    // This feature is currently disabled.
    // wait 10 seconds after the user stops typing before sending the text to the LLM
    private static TYPING_TIMEOUT = 10000;
    // colors for the decorations
    private static DECORATION_COLOR_POSITIVE = '#008000';
    private static DECORATION_COLOR_NEGATIVE = '#e19600';

    // The unique identifier for this instance of the extension
    public static UUID : string;

    public static OPENAI_APIKEY = "";
    public static ANTHROPIC_APIKEY = "";
    public static DATADROP_APIKEY = ""

    private view?: vscode.WebviewView;
    private context!: vscode.ExtensionContext;

    private feedbackService : FeedbackService;

    // Keep track of editor decorations so that they can be removed later
    private decorations: vscode.TextEditorDecorationType[] = [];

    // Currently not used because too many requests are sent to the LLM and it doesn't provide additional value
    private typingTimer : Timer | null = null;

    /** Initializes the CodeMentorAI extension.
     * @param context The vscode extension context
     */
    constructor(context: vscode.ExtensionContext) {

        this.context = context;

        // context.globalState is used to store data across sessions(start-close-start)
        var store = this.context.globalState;

        // check if store contains uuid, if so
        // assign it to the UUID variable
        // else generate a new uuid and store it
        // UUID is used to identify the user when recording the generated feedback
        let storedUUID = store.get("uuid") as string | undefined;
        if (storedUUID === undefined) {
            CodeMentorAI.UUID = crypto.randomUUID();
            store.update("uuid", CodeMentorAI.UUID);
        } else {
            CodeMentorAI.UUID = storedUUID;
        }

        vscode.window.onDidChangeActiveTextEditor((e) => {
            // console.log('active text editor changed');

            //  this.view?.webview.postMessage({ type: 'update-snippet', value: "ready to send feedback" });
            if (!e) {
                // clear all decorations since we can't easily know which editor was closed
                this.clearDecorations();
            }
        });

        const disposable = vscode.commands.registerTextEditorCommand(
            'codementor-ai.annotate',
            async (textEditor: vscode.TextEditor) => {
                const code = this.getVisibleCodeWithLineNumbers(textEditor);
                this.feedbackService.handleAnnotation(code.code, code.offset);
            }
        );
        context.subscriptions.push(disposable);

        //   // Setup a timer to send the text to the LLM after the user stops typing
        //   vscode.workspace.onDidChangeTextDocument( (e) => {
        //     console.log('text document changed');

        //   // this.startAnnotationTimer();

        //   });
        const configuration = vscode.workspace.getConfiguration("");
          
        this.feedbackService = new FeedbackService(this.context, configuration);


        // other initialization is in resolveWebviewView method
        // because it is called when the webview is created
    
    }

    /** Called by Visual Studio Code when the webview is created. 
     */
    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) { 
        // Keep a reference to the webview
        this.view = webviewView;
        // Enable scripts and set the local path
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri],
        };
        // Set the webview's initial html content
        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);        

                // 
        // Immediately invoked async function because we can't use await in this context
        (async () => { await this.feedbackService.loadPCKdata() } )().then(() => {
            console.log('All PCK data loaded');
            // Enable all buttons once PCK has loaded
            this.view?.webview.postMessage({ type: 'enable-buttons' });
        });

        // set the callback for messages sent from the webview
        this.view.webview.onDidReceiveMessage(this.handleWebviewRequest.bind(this), undefined);
    }

    /** Handle incoming messages from the webview 
     * @param message Message data from the webview.
     */
    private async handleWebviewRequest(message : any) {

        let stream = (async function* f<T>(): AsyncIterable<T>{})(); // empty generator stream

        try {
            switch (message.command) {
                case "alert":
                    vscode.window.showErrorMessage(message.text);
                    break;
                case "info":
                    vscode.window.showInformationMessage(message.text);
                    break;
                case "ask-feedback":
                        stream = await this.feedbackService.prepareFeedbackRequest(message, this.activeText());
                        for await (const section of stream) {
                            this.view?.webview.postMessage({ type: 'update-response-json', kind: message.feedbacktype, value: section });
                        }
                        break;
                case "ask-detailed-feedback":
                    // when someone clicked the link for more detailed feedback
                    stream = await this.feedbackService.handleDetailFeedback(message, this.activeText());
                    for await (const html of stream) {
                        this.view?.webview.postMessage({ type: 'detailed-feedback', value: html, num: message.num });
                    }
                    break;
                case "ask-meaning-feedback":
                    // when someone clicked the link for more detailed feedback
                    stream = await this.feedbackService.handleMeaningFeedback(message, this.activeText());
                    for await (const html of stream) {
                        this.view?.webview.postMessage({ type: 'meaning-feedback', value: html, num: message.num });
                    }
                    break;
                case "review-again":
                    stream = await this.feedbackService.handleAgainFeedback(message,this.activeText());
                    for await (const section of stream) {
                        this.view?.webview.postMessage({ type: 'update-response-json',kind: 'again', value: section });
                    }
                    break;
                case "ask-custom-feedback":
                    stream = await this.feedbackService.handleCustomFeedback(message, this.activeText());
                    for await (const html of stream) {
                        this.view?.webview.postMessage({ type: 'update-response', value: html });
                    }                   
                    break;
                case "ask-annotation":
                    const editor = vscode.window.activeTextEditor;
                    if (!editor)
                        throw new Error('No program text is open');
                
                    this.clearDecorations();

                    // Get the code with line numbers from the current editor
                    const code = this.getVisibleCodeWithLineNumbers(editor);
                    
                    const stream1 = await this.feedbackService.handleAnnotation(code.code, code.offset) as AsyncIterable<IFeedbackAnnotation>;
                    for await (const annotation of stream1) {
                        this.applyDecoration(editor, annotation.line, annotation.positive,  annotation.remark);
                    }
                    break;
                case "submit-rating": 
                    this.feedbackService.submitRating(message.rating, message.comment);
                    // Showing a lot of messages gets old quickly
                    // vscode.window.showInformationMessage('👍 Thank you for rating the feedback!');
                    break;
                default:
                    console.log('Unknown message from viewview: ', message);
            }
        }
        catch(e : any) {
            let msg : string = '';
            if (e instanceof FeedbackError) {
                if(e.cause)
                    msg = e.cause.message;
                else 
                    msg = e.message;
            } else {
                msg = e.message;
            }
            console.log(msg);
            this.view?.webview.postMessage({ type: 'error', value: 'Error in feedback request:<br/>Details: '+msg});
        }
        // Stop the spinner
        this.view?.webview.postMessage({ type: 'end-response', kind: message.feedbacktype }); 
    }

    /** Returns the text of the currently active editor. */
    private activeText() {
        const activeEditor = vscode.window.activeTextEditor;

        if (!activeEditor)
            throw new Error('No program text is open');
        
        let document = activeEditor.document;

        // Get the document text
        const documentText = document.getText();

        if (!documentText)
            throw new Error('Editor is empty. Please open a program.');

        return documentText;
    }

    /** Get the visible code from the active editor with line numbers. */
    private getVisibleCodeWithLineNumbers(textEditor: vscode.TextEditor) {
        // get the position of the first and last visible lines
        let currentLine = textEditor.visibleRanges[0].start.line;
        const endLine = textEditor.visibleRanges[0].end.line;
        
        let code = [];
        
        // get the text from the line at the current position.
        // The line number is 0-based, so we add 1 to it to make it 1-based.
        while (currentLine < endLine) {
            code.push(textEditor.document.lineAt(currentLine).text);
            // move to the next line position
            currentLine++;
        }
        return { code: code, offset: textEditor.visibleRanges[0].start.line};
    }

    /** Apply a decoration to the editor.
     * @param editor The text editor to apply the decoration to.
     * @param line The line number to apply the decoration to.
     * @param positive Whether the decoration is positive or negative, shows a smiley or a flag.
     * @param suggestion The suggestion text to show in the decoration.
     */
    private applyDecoration(editor: vscode.TextEditor, line: number, positive: boolean, suggestion: string) {
        const color = positive ? CodeMentorAI.DECORATION_COLOR_POSITIVE : CodeMentorAI.DECORATION_COLOR_NEGATIVE;
        const prefix = positive ? ' 🙂' : ' 🚩';
        const decorationType = vscode.window.createTextEditorDecorationType({
            after: {
            contentText: prefix+` ${suggestion.substring(0, 25) + '...'}`,
            color: color,
            }
        });

        this.decorations.push(decorationType);
        
        // get the end of the line with the specified line number
        const lineLength = editor.document.lineAt(line - 1).text.length;
        const range = new vscode.Range(
            new vscode.Position(line - 1, lineLength),
            new vscode.Position(line - 1, lineLength)
        );
        
        const decoration = { range: range, hoverMessage: suggestion };
        vscode.window.activeTextEditor?.setDecorations(decorationType, [decoration]);
    }

    /** Clear all decorations from the editor. */
    private clearDecorations() {
        // remove any previous decorations
        // TODO: technically decorations should be kept for each editor
        this.decorations.forEach((decoration) => {
            // dispose all the decorations
            decoration.dispose();
        });
        this.decorations = [];
    }

    /** Get the html content for the webview. */
    private getHtmlForWebview(webview: vscode.Webview) {
        const extensionUri = this.context.extensionUri;
        let src = this.context.workspaceState.get("src", "out");
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, src, "media", "main.js")
          );
          const htmlFilePath = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, src, "media", "ui.html")
          );
        const htmlContent = fs.readFileSync(htmlFilePath.fsPath, 'utf-8');
        return String(htmlContent).replace(/%SCRIPT_URI%/g, scriptUri.toString());
    }

    // Sanatize a html string
    private html(strings: TemplateStringsArray, ...values: any[]) {
        const parsedString = strings.reduce((acc, curr, index) => {
            // Concatenate the current string literal with its interpolated value
            return acc + curr + (index < values.length ? values[index] : "");
        }, "");
        return parsedString;
    }
}

export function deactivate() {}
