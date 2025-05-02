import * as vscode from 'vscode';

import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from '@langchain/openai';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { CharacterTextSplitter } from 'langchain/text_splitter';


export class ContextSelector {

    // similarity cutoffs for the vector store
    // Similarity for context selection based on prompt
    private static INPUT_SIMILARITY_CUTOFF = 0.5;
    // Similarity for feedback selection based on PCK.
    // We want to filter out low quality feedback that is not related to the PCK at all
    private static OUTPUT_SIMILARITY_CUTOFF = 0.3;

    private static PCK_GOALS = 'PCK_GOALS';
    private static PCK_IMPORTANCE = 'PCK_IMPORTANCE';
    private static PCK_DIFFICULTIES = 'PCK_DIFFICULTIES';
    private static PCK_MISTAKES = 'PCK_MISTAKES';
    private static PCK_MISCONCEPTIONS = 'PCK_MISCONCEPTIONS';
    private static PCK_ORDER = 'PCK_ORDER';
    private static PCK_EXPLAIN = 'PCK_EXPLAIN';
    private static PCK_ASSESS = 'PCK_ASSESS';

    private static pckFilesNames = {
        PCK_GOALS: '1. pck-llm-input-learning-goals.md',
        // excluded goals are merged with learning goals
        PCK_IMPORTANCE: '2. pck-llm-input-importance.md',
        // '3. pck-llm-input-learning-goals-excluded.md',
        PCK_DIFFICULTIES: '4. pck-llm-input-learning-difficulties.md',
        PCK_MISTAKES: '5. pck-llm-input-mistakes-students-make.md',
        PCK_MISCONCEPTIONS: '6. pck-llm-input-misconceptions.md',
        PCK_ORDER: '7. pck-llm-input-learning-goals-order.md',
        PCK_EXPLAIN: '8. pck-llm-input-how-to-explain.md',
        PCK_ASSESS: '12. pck-llm-input-how-to-assess.md'
    };

    private context!: vscode.ExtensionContext;
    private pckVectorStore : MemoryVectorStore;
    private pckDocuments : { [key:string]: string; } = {};

    // setup vector store and embeddings
    
    private embeddings : OpenAIEmbeddings;

    /** Creates a new instance of the ContextSelector class. 
     * You must call loadPCKdata() to load the PCK data before using this class.
     * This is because loading the PCK data is async and cannot be done in the constructor.
     * @param context The vscode extension context
     * @param embeddings The embeddingsmodel to use for the vector store
     */
    constructor(context : vscode.ExtensionContext, embeddings : OpenAIEmbeddings) {

        this.context = context;
        this.embeddings = embeddings;

        // setup the vector store
        this.pckVectorStore = new MemoryVectorStore(this.embeddings);

    }

    /** Loads the PCK data from the media folder.
     * Make sure to call this before using the class.
     */
    public async loadPCKdata() {
        const resUri = vscode.Uri.joinPath(this.context.extensionUri,'resources');
        // select development or production path
        let docs : any[] = [];
        for (const [key,afile] of Object.entries(ContextSelector.pckFilesNames)) {
            const filePath = vscode.Uri.joinPath(resUri, afile);
            console.log('loading PCK file: ', filePath);
            const loader = new TextLoader(filePath.fsPath);
            const doc = await loader.load();
            docs = docs.concat(doc);
            this.pckDocuments[key] = doc[0].pageContent;
            // const pck_data = fs.readFileSync(htmlFilePath.fsPath, 'utf-8');
        }
        console.log('loaded PCK files: ', this.pckDocuments);
        // Split documents into small documents for review
        const textSplitter = new CharacterTextSplitter({separator:"\n" , chunkSize: 100, chunkOverlap: 0});
        // const textSplitter = new RecursiveCharacterTextSplitter({chunkSize: 2000, chunkOverlap: 0});
        const chunks = await textSplitter.splitDocuments(docs);
        await this.pckVectorStore!.addDocuments(chunks);
        
    }

    /** Retrieves the PCK context for the given prompt. 
     * Compare the prompt to the PCK data and return source file names and the content of the files for the most similar context.
     * @param custom The text for which to compare and select the most similar context
     * @param maxResults The maximum number of results to return
     * @returns An array of source file names and the content of the files as a string
     */
    public async retrieveContext(custom: string, maxResults: number = 10) {
        // improve similarity search
        let result = await this.pckVectorStore!.similaritySearchWithScore(custom);
        console.log('result: ', result);
        // ignore anything with scores lower than the cutoff
        const fileNames = result.filter((obj:any) => obj[1] > ContextSelector.INPUT_SIMILARITY_CUTOFF).map((obj:any) => {
            return obj[0].metadata.source.split('/').slice(-1)[0];
        });

        // make unique and take the first maxResults
        const uniqueFileNames = [...new Set(fileNames)].slice(0,maxResults);
        // find the documents that match the filenames
        console.log('Selected filenames: ', uniqueFileNames);
        let context = '';
        let srcnames = [];
        for (let target of uniqueFileNames) {
            // find the key that matches the filename
            // Windows and Linux have different paths
            target = target.split(/[/\\]/).pop();
            for (const [key,fname] of Object.entries(ContextSelector.pckFilesNames)) {
                
                if (target === fname) {
                    srcnames.push(key as string);
                    context += this.pckDocuments[key as string] + '\n\n';
                }
            }
        }

        // console.log('Recommended context: ', context);
        // console.log('Recommended files: ', uniqueFileNames);
        console.log('Recommended sources: ', srcnames);
        return {srcnames, context};
    }     
    
    /** Checks if the feedback is related to the PCK.
     * This is done by checking the similarity of the feedback to the PCK data.
     * If the similarity is below a certain threshold, the feedback is discarded.
     * @param remark The feedback to check
     * @returns True if the feedback is related to the PCK, false otherwise
     */
    public async isFeedbackRelatedToPCK(remark: string) : Promise<boolean> {
        const results = await this.pckVectorStore.similaritySearchWithScore(remark);
        if (results.length === 0) {
            console.log('Discarding feedback because no PCK results: ', remark);
            return false;
        }
        console.log(`Similarity of "${remark}" is `,results[0]);
        // the results are sorted by similarity, so we can just check the first one
        if (results[0][1] < ContextSelector.OUTPUT_SIMILARITY_CUTOFF) {
            console.log('Discarding feedback: ', remark);
            return false;
        }
        return true;
    }
}