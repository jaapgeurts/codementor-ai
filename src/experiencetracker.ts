// This class keeps track of user actions and attempts to assess what 
// the level of a student is.
import * as vscode from "vscode";

import { FeedbackRequest, IFeedbackAgain, IFeedbackAnnotation, IFeedbackOutcome } from "./feedback";

import { FaissStore } from "@langchain/community/vectorstores/faiss";
// import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "langchain/document";

export class ExperienceTracker {

    public static readonly LEVEL_BEGINNER = 0.50;
    // the values are pretty close since an LLM will often output positive and negative feedback
    public static readonly LEVEL_INTERMEDIATE = 0.55;
    // over 0.55 is considered proficient

    // Similarity cutoff for feedback similarity when suggesting more detail on a topic
    // FAISS uses euclidean distance
    private static FEEDBACK_SIMILARITY_CUTOFF = 0.3;

    private static STORAGE_PATH : vscode.Uri;

    private static readonly DB_PATH = 'feedback/store/faiss';

    private feedbackRequestCount : number = 0;
    // This is the ratio of negative feedback to positive feedback
    // keep moving average of the ratio
    private static MAX_HISTORY = 5;
    private ratioHistory : number[] = [];
    private ratioIndex : number = 0;

    private context: vscode.ExtensionContext;
    private store: vscode.Memento;

    // necessary because loading the vector store is async which is not allowed in the constructor
    private initialized : boolean = false;

    // keep a list of the last feedback request that were negative
    private lastFeedback : string[] = [];

    // private feedbackVectorStore : MemoryVectorStore;
    private feedbackVectorStore : FaissStore | undefined;

    private embeddings : OpenAIEmbeddings;

    /** Initializes this class. Call init() to finalize construction. 
     * These are separated because loading the vector store is async
     * @param context The vscode extension context
     * @param embeddings The embeddingsmodel to use for the vector store
     */
    constructor(context: vscode.ExtensionContext, embeddings: OpenAIEmbeddings) {
        this.context = context;
        this.store = context.globalState;
        this.embeddings = embeddings;

        this.feedbackRequestCount = this.store.get('feedbackRequestCount') as number || 0;
        // load the ratio history and convert from json string to array of number
        this.ratioHistory = JSON.parse(this.store.get('ratioHistory') as string || '[]');
        this.ratioIndex = this.store.get('ratioIndex') as number || 0;
        console.log('Loaded ratio history: ', this.ratioHistory);

        ExperienceTracker.STORAGE_PATH = vscode.Uri.joinPath(this.context.globalStorageUri!, ExperienceTracker.DB_PATH);
        

    }

    /** Initializes the vector store. Always call before using this class */
    public async init() {
        
        // load the vector store from disk
        // if the directory does not exist, create it
        // we can always create the directory. It has mkdir -p semanticsc
        vscode.workspace.fs.createDirectory(ExperienceTracker.STORAGE_PATH);
        try {
            this.feedbackVectorStore = await FaissStore.load(ExperienceTracker.STORAGE_PATH.fsPath, this.embeddings);
        } catch (e) {
            console.error('Error loading feedback store; creating new: ', e);
            // no store, create a new one
            this.feedbackVectorStore = new FaissStore(this.embeddings,{});
        }

    }

    /** Clears the feedback buffer */
    public clearFeedback() {
        this.lastFeedback = [];
    }

    /** Add feedback to the buffer */
    public addFeedback(feedback: string) {
        this.lastFeedback.push(feedback);
    }

    /** Get the feedback buffer */
    public getFeedback() : string[] {
        return this.lastFeedback;
    }

    /** Records a feedback request */
    public recordFeedbackRequest(request: FeedbackRequest) {
        this.feedbackRequestCount++;
        this.store.update('feedbackRequestCount', this.feedbackRequestCount);
    }

    /** Returns experience level as a number between 0 and 1.
     * use ExperienceTracker.LEVEL_BEGINNER, ExperienceTracker.LEVEL_INTERMEDIATE, ExperienceTracker.LEVEL_PROFICIENT
     * to interpret the result
     */
    public getExperienceLevel() : number {
        // return the average of the last 5 ratios
        return this.getAverageRatio();
    }

    /** Returns the average ratio of negative feedback to positive feedback. Value between 0and 1
     * 
     */
    private getAverageRatio() : number {
        return this.ratioHistory.reduce((a : number, b : number ) => a + b, 0) / ExperienceTracker.MAX_HISTORY;
    }

    /** Returns a prompt string depending on the experience level of the student and indicating language to use. */
    public getExperienceInstruction() : string {
        
        if (this.feedbackRequestCount === 0 || this.getAverageRatio() < ExperienceTracker.LEVEL_BEGINNER) {
            return "The student is an absolute beginner. Use language appropriate for a 16 year old. ";
        }
        else if (this.getAverageRatio() < ExperienceTracker.LEVEL_INTERMEDIATE) {
            return "The student is intermediate. Use common words and nomenclature. ";
        }
        else {
            return ''; // no instruction needed
        }
    }

    /** Records feedback response and updates the experience level.
     * 
     */
    public async recordFeedbackResponse(kind: string, response: IFeedbackOutcome[] | IFeedbackAnnotation[] | IFeedbackAgain[]) {

        let total = response.length;
        if (total === 0) {
            // no feedback, nothing to do
            return;
        }
        // count number of negative feedback
        let posRatio;
        let documents;
        switch (kind) {
            case 'outcome':
                posRatio = response.filter((x: any) => x.ismet).length / total; 
                // keep a running average of the positive ratio
                this.updateRatio(posRatio);
                // some code duplication here, but it's easier to read and maintainable, because the feedback types are different
                documents = response.filter((x: any) => !x.ismet).map((x: any) => new Document({pageContent: x.remark}));
                break;
            case 'annotation':
                posRatio = response.filter((x: any) => x.positive).length / total;
                // keep a running average of the positive ratio
                this.updateRatio(posRatio);
                documents = response.filter((x: any) => !x.positive).map((x: any) => new Document({pageContent: x.remark}));
                break;
            case 'again':
                posRatio = response.filter((x: any) => x.improved).length / total; 
                // keep a running average of the positive ratio
                this.updateRatio(posRatio);
                documents = response.filter((x: any) => !x.improved).map((x: any) => new Document({pageContent: x.remark}));
                break;
            default:
                console.log('This kind of feedback is not used for calculating experience level:', kind);
        }

        // record negative feedback in the store
        if (documents) {
            console.log('Adding feedback to store: ', documents);
            // await vectorStore.addDocuments(documents, { ids: ["1", "2", "3", "4"] });
            if (!this.initialized) {
                await this.init();
                this.initialized = true;
            }
            await this.feedbackVectorStore!.addDocuments(documents);
            await this.feedbackVectorStore!.save(ExperienceTracker.STORAGE_PATH.fsPath);
        }
    }

    /** Checks if similar feedback has been received before. 
     * Similarity is determined based on vector store similarity search and a cutoff value.
     */
    public async hasReceivedFeedbackBefore(remark: string) : Promise<boolean> {
        try {
            if (!this.initialized) {
                await this.init();
                this.initialized = true;
            }
            const results = await this.feedbackVectorStore!.similaritySearchWithScore(remark);
            if (results.length === 0) {
                return false;
            }
            // the results are sorted by similarity, most relevant first,
            // so we can just check the first one
            console.log('Feedback similarity "', remark, '" is ',results[0]);
            if (results[0][1] > ExperienceTracker.FEEDBACK_SIMILARITY_CUTOFF) {
                return false;
            }
            return true;
        } catch (e) {
            console.error('Error checking feedback similarity: ', e);
            return false;
        }
    }

    private updateRatio(posRatio: number) {
        this.ratioHistory[this.ratioIndex] = posRatio;
        this.ratioIndex = (this.ratioIndex + 1) % ExperienceTracker.MAX_HISTORY;
        // save updated history to the store
        this.store.update('ratioHistory', JSON.stringify(this.ratioHistory));
        this.store.update('ratioIndex', this.ratioIndex);

        console.log('Latest positive ratio: ', this.getAverageRatio());
    }

}