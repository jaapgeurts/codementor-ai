import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { ExperienceTracker } from '../experiencetracker';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ContextSelector } from '../contextselector';
// import * as myExtension from '../../extension';


export function activate(_context: vscode.ExtensionContext) {
    // Set context as a global as some tests depend on it
    (global as any).testExtensionContext = _context;
}

suite('Extension Test Suite', () => {
	let extensionContext: vscode.ExtensionContext;
	suiteSetup(async () => {
        // Trigger extension activation and grab the context as some tests depend on it
        await vscode.extensions.getExtension('vscode.vscode-api-tests')?.activate();
        extensionContext = (global as any).testExtensionContext;
    });

	vscode.window.showInformationMessage('Start all tests.');

	test('ContextSelector - select context',async () => {
		const OPENAI_APIKEY = "";

		let embeddings = new OpenAIEmbeddings({
				apiKey: OPENAI_APIKEY,
				// use the large model. the small model returns low quality results
				model: "text-embedding-3-large" 
			});

		let selector = new ContextSelector(extensionContext, embeddings);

		let result = await selector.retrieveContext("what are the naming conventions.");

		assert.strictEqual(result, "2. Understand and know naming conventions and meaningful/descriptive names are chosen.");

	});

	test('ContextSelector - feedback related to pck',async () => {
		const OPENAI_APIKEY = "";

		let embeddings = new OpenAIEmbeddings({
				apiKey: OPENAI_APIKEY,
				// use the large model. the small model returns low quality results
				model: "text-embedding-3-large" 
			});

		let selector = new ContextSelector(extensionContext, embeddings);



		let result = await selector.isFeedbackRelatedToPCK("The naming conventions are not clear.");

		assert.strictEqual(result,true);

	});

	// Experience tracker is difficult to test due to differences in interfaces of the dependencies.
	// Either build a new interface for the dependencies or mock
	// or provide an InMemory Vector store which supports the SaveVectorStore interface

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});
