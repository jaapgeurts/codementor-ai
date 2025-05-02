/*
 * This is the main feedback service that handles the feedback requests and responses to and from the LLM provider
 * It also keeps track of the feedback requests and responses and stores them in the experience tracker
 * Author: Jaap Geurts
 * Date: 2025-12-01
 */


import * as vscode from 'vscode';

import { FeedbackRequest, FeedbackResponse, IFeedbackImprove, IFeedbackOutcome, IFeedbackUnderstand, IFeedbackAnnotation, IFeedbackAgain } from "./feedback";
import { ExperienceTracker } from "./experiencetracker";
import { ContextSelector } from "./contextselector";
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { OpenAIEmbeddings } from '@langchain/openai';
import { CodeMentorAI } from './codementorai';
import { ChatAnthropic } from '@langchain/anthropic';
import { DatadropApi, IDatadropFeedback } from './datadropapi';
import { FeedbackError } from './feedbackerror';
import { FeedbackParser } from './feedbackparser';

var showdown  = require('showdown');

/** This class handles the feedback requests and responses to and from the LLM provider
 * It also keeps track of the feedback requests and responses and stores them in the experience tracker
 * The Claude sonnet model from Anthropic to provide feedback
 * The OpenAI embeddings model is used to generate embeddings for recording feedback in the experience tracker
 * 
 */
export class FeedbackService {

    private context : vscode.ExtensionContext;

    // private model = new ChatOpenAI({
    //         model: "gpt-4",
    //         apiKey: CodeMentorAI.OPENAI_APIKEY,
    //         temperature: 0.2,
    //     });

    private model = new ChatAnthropic({
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.2,
        apiKey: CodeMentorAI.ANTHROPIC_APIKEY,
        });

    private embeddings = new OpenAIEmbeddings({
        apiKey: CodeMentorAI.OPENAI_APIKEY,
        // use the large model. the small model returns low quality results
        model: "text-embedding-3-large" 
    });

    private experienceTracker : ExperienceTracker;
    private contextSelector : ContextSelector | null = null;
    private feedbackParser : FeedbackParser;

    // markdown to html converter
    private converter;

    private promptTemplate : any = "";
    private system_instructions : string;

    // a list of the prompts that are used to ask the user for feedback
    private prompts: { [key: string]: string } = {};

    private datadropApi : DatadropApi;
    // Not good style, because could be overwritten by another request,
    // But the extension is single user and can't make two requests at the same time so won't be a problem
    private lastFeedback : IDatadropFeedback | undefined;

    /** Initializes this class.
     * Call loadPCK() to finalize construction.
     * @param context The vscode extension context
     * @param configuration The vscode workspace configuration used to load the configuration settings
     */
    constructor(context: vscode.ExtensionContext, configuration: vscode.WorkspaceConfiguration) {
    
        this.context = context;

        this.experienceTracker = new ExperienceTracker(this.context, this.embeddings);
        this.contextSelector = new ContextSelector(this.context, this.embeddings);
        this.feedbackParser = new FeedbackParser();

        this.datadropApi = new DatadropApi(CodeMentorAI.UUID,CodeMentorAI.DATADROP_APIKEY, context.extension.packageJSON.version);

        this.converter = new showdown.Converter();
        this.converter.setOption('disableForced4SpacesIndentedSublists',true);

        this.system_instructions = configuration.get("codementor-ai.systemInstructions") as string;

        // load prompt questions from configuration
        this.prompts["outcome"] = configuration.get("codementor-ai.promptOutcome") as string;
        this.prompts["improve"] = configuration.get("codementor-ai.promptImprove") as string;
        this.prompts["understand"] = configuration.get("codementor-ai.promptUnderstand") as string;
        this.prompts["custom"] = configuration.get("codementor-ai.promptCustomQuestion") as string;
        this.prompts["annotation"] = configuration.get("codementor-ai.promptAnnotation") as string;
        this.prompts["again"] = configuration.get("codementor-ai.promptReviewAgain") as string;
        this.prompts["detail"] = configuration.get("codementor-ai.promptDetail") as string;
        this.prompts["meaning"] = configuration.get("codementor-ai.promptMeaning") as string;


        // setup the prompt template
        this.promptTemplate = ChatPromptTemplate.fromMessages([
            ["system",this.system_instructions],
            ["user","{question}\n\n{program}"]
        ]);

    }

    /**    
    /* Load the PCK data from the media folder 
     * Must be called before using the feedback service.
     * Note: these are split because loading the PCK data is async while the constructor is not
     */
    public async loadPCKdata() {
        // load all the PCK data from the media folder
        await this.contextSelector!.loadPCKdata();
    };

    /**
     *  Prepare the feedback request for the preset feedback types 
     * @param message The prepared message with data for the feedback request
     * @param program The program code that is used to generate the feedback
     * @returns An async iterable that yields the feedback responses
    */
    public prepareFeedbackRequest(message:any, program: string)  {
        let kind = message.feedbacktype;
        let request : FeedbackRequest = {
            kind: kind,
            program: program,
            prompt: '',
            ragQuery: ''
            // it is possible to provide a custom prompt context. when empty raqQuery is used
        };
        switch(kind) {
            case 'outcome':
                request.prompt = this.prompts["outcome"];
                request.ragQuery = 'learning outcomes';
                return this.handleOutcomeFeedback(request);
            case 'improve':
                request.prompt = this.prompts["improve"];
                request.ragQuery = 'comment on difficulties, mistakes, and misconceptions students make';
                return this.handleImproveFeedback(request);
            case 'understand':
                request.prompt = this.prompts["understand"];
                request.ragQuery = 'comment on how to assess';
                return this.handleUnderstandFeedback(request);
        }       
        return (async function* f<T>(): AsyncIterable<T>{})();        
    }

    /** Handle feedback request for learning outcomes 
     * @param message The prepared message with data for the feedback request
     * @returns An async iterable that yields the feedback responses as IFeedbackOutcome objects
     */
    private async *handleOutcomeFeedback(request: FeedbackRequest) {
        let finalFeedback = '';

        // read incoming json objects and process them
        let responses : IFeedbackOutcome[] = [];

        let feedback = await this.startRequestFeedback(request);
        let hasRemark = false;

        try {
            const rawStream = await this.requestFeedback(request);
            const stream = await this.feedbackParser.parseResponseStream(rawStream, feedback) as AsyncIterable<IFeedbackOutcome>;

            for await (let section of stream) {
                // sometimes the LLM buries the feedback in a nested object
                section = this.findObjectWithRemark(section);
                if (!section) {
                    console.log('No remark found in feedback');
                    continue;
                }
                hasRemark = true;
                // check if the remark is related to the PCK
                if (await this.contextSelector?.isFeedbackRelatedToPCK(section.remark)) {
                    responses.push(section);
                    finalFeedback += JSON.stringify(section);
                    // check if the negative feedback has been received before
                    if (!section.ismet) {
                        section.extrainfo = await this.experienceTracker.hasReceivedFeedbackBefore(section.remark);
                    }
                    yield section;
                }
                if (!section.ismet) {
                    // keep track of last feedback for improvement suggestions
                    this.experienceTracker.addFeedback(section.remark); 
                }
            }
        } catch (e : any) {
            console.log('Error in feedback request: ', e);
            feedback.errormessage = e.message;
            throw new FeedbackError('Error in feedback request', e);
        } finally {
            // store feedback in the experience tracker
            await this.experienceTracker.recordFeedbackResponse('outcome', responses);
            feedback.feedbackfinal = finalFeedback;
            await this.endRequestFeedback(feedback); 
        }
        if (!hasRemark) {
            throw new FeedbackError('No feedback found.');
        }
    }

    /** Handle feedback request for improvement suggestions
     * @param message The prepared message with data for the feedback request
     * @returns An async iterable that yields the feedback responses as IFeedbackImprove objects
     */
    private async *handleImproveFeedback(request: FeedbackRequest) {
        let finalFeedback = '';

        let feedback = await this.startRequestFeedback(request);

        try {
            const rawStream = await this.requestFeedback(request);
            const stream = await this.feedbackParser.parseResponseStream(rawStream, feedback) as AsyncIterable<IFeedbackImprove>;
            // read incoming json objects and process them
            for await (let section of stream) {
                // check if the remark is related to the PCK
                if (section.praise) {
                    section.remark = section.praise;
                }
                if (await this.contextSelector?.isFeedbackRelatedToPCK(section.remark)) {
                    finalFeedback += JSON.stringify(section);
                    // check if the negative feedback has been received before
                    section.extrainfo = await this.experienceTracker.hasReceivedFeedbackBefore(section.remark);
                    yield section;
                }
            }
        } catch (e : any) {
            console.log('Error in feedback request: ', e);
            feedback.errormessage = e.message;
            throw new FeedbackError('Error in feedback request', e);
        } finally {
            feedback.feedbackfinal = finalFeedback;
            await this.endRequestFeedback(feedback); 
        }
    }

    /** Handle feedback request for generating questions
     * @param message The prepared message with data for the feedback request
     * @returns An async iterable that yields the feedback responses as IFeedbackUnderstand objects
     */
    private async *handleUnderstandFeedback(request: FeedbackRequest) {
        let finalFeedback = '';

        let feedback = await this.startRequestFeedback(request);

        try {
            const rawStream = await this.requestFeedback(request);
            const stream = await this.feedbackParser.parseResponseStream(rawStream, feedback) as AsyncIterable<IFeedbackUnderstand>;
            // read incoming json objects and process them
            for await (let section of stream) {
                // check if the question is related to the PCK, if not discard
                if (await this.contextSelector?.isFeedbackRelatedToPCK(section.question)) {
                    finalFeedback += JSON.stringify(section);
                    yield section;
                }
            }
        }
        catch (e : any) {
            console.log('Error in feedback request: ', e);
            feedback.errormessage = e.message;
            throw new FeedbackError('Error in feedback request', e);
        } finally {
            feedback.feedbackfinal = finalFeedback;
            await this.endRequestFeedback(feedback); 
        }
    }

    /** Handle feedback request for custom questions
     * @param message The prepared message with data for the feedback request
     * @param program The program code that is used to generate the feedback
     * @returns An async iterable that yields the feedback responses as html strings
     */
    public async *handleCustomFeedback(message: any, program: string) {
        let finalFeedback = '';

        let feedbackCustom : FeedbackRequest = {
            kind: 'custom',
            program: program,
            prompt: this.prompts["custom"] + ' ' + message.question,
            ragQuery: message.question
            // it is possible to provide a custom prompt context. when empty raqQuery is used
        };

        let feedback = await this.startRequestFeedback(feedbackCustom);

        try {
            
            const rawStream = await this.requestFeedback(feedbackCustom);
    
            // read incoming lines and convert them to html
            const chunks : any[] = [];
            for await (const line of rawStream) {
                chunks.push(line);
                const html = this.converter.makeHtml(chunks.join(''));
                finalFeedback += html;
                yield html;
            }
        }
        catch (e : any) {
            console.log('Error in feedback request: ', e);
            feedback.errormessage = e.message;
            throw new FeedbackError('Error in feedback request', e);
        }
        finally {
            // store the feedback on the server
            feedback.feedbackraw = finalFeedback;
            feedback.feedbackfinal = finalFeedback;
            await this.endRequestFeedback(feedback); 
        }

    }

    /** Handle feedback request for detail feedback
     * @param message The prepared message with data for the feedback request
     * @param program The program code that is used to generate the feedback
     * @returns An async iterable that yields the feedback responses as html strings
     */
    public async *handleDetailFeedback(message: any, program: string) {
        let finalFeedback = '';

        let feedbackCustom : FeedbackRequest = {
            kind: 'detail',
            program: program,
            prompt: this.prompts["detail"] + ' ' + message.remark,
            ragQuery: 'The importantance for students to learn variables'
            // context: '*' // use a asterisk to prevent if (context) from failing
        };


        let feedback = await this.startRequestFeedback(feedbackCustom);

        try {
            const rawStream = await this.requestFeedback(feedbackCustom);
    
            // read incoming lines and convert them to html
            const chunks : any[] = [];
            for await (const line of rawStream) {
                chunks.push(line);
                const html = this.converter.makeHtml(chunks.join(''));
                yield html;
            }
            finalFeedback += chunks.join('');
        }
        catch (e : any) {
            console.log('Error in feedback request: ', e);
            feedback.errormessage = e.message;
            throw new FeedbackError('Error in feedback request', e);
        }
        finally {
            // store the feedback on the server
            feedback.feedbackraw = finalFeedback;
            feedback.feedbackfinal = finalFeedback;
            await this.endRequestFeedback(feedback); 
        }

    }

    // TODO: merge the handleMeaningFeedback and handleDetailFeedback functions
    /** Handle feedback request for meaning feedback
     * @param message The prepared message with data for the feedback request
     * @param program The program code that is used to generate the feedback
     * @returns An async iterable that yields the feedback responses as html strings
     */
    public async *handleMeaningFeedback(message: any, program: string) {
        let finalFeedback = '';
        
        let levelprompt = this.experienceTracker.getExperienceInstruction(); 

        let feedbackCustom : FeedbackRequest = {
            kind: 'meaning',
            program: program,
            prompt: this.prompts["meaning"] + ' "' + message.remark + '"\n\n' + levelprompt + '\n\n',
            // ragQuery: 'The meaning of learning goals'
            context: '*' // use a asterisk to prevent if (context) from failing
        };

        let feedback = await this.startRequestFeedback(feedbackCustom);

        try {
            const rawStream = await this.requestFeedback(feedbackCustom);
    
            // read incoming lines and convert them to html
            const chunks : any[] = [];
            for await (const line of rawStream) {
                chunks.push(line);
                const html = this.converter.makeHtml(chunks.join(''));
                yield html;
            }
            finalFeedback += chunks.join('');

        }
        catch (e : any) {
            console.log('Error in feedback request: ', e);
            feedback.errormessage = e.message;
            throw new FeedbackError('Error in feedback request', e);
        }
        finally {
            // store the feedback on the server
            feedback.feedbackraw = finalFeedback;
            feedback.feedbackfinal = finalFeedback;
            await this.endRequestFeedback(feedback); 
        }

    }

    /** Handle feedback request for review again feedback
     * @param message The prepared message with data for the feedback request
     * @param program The program code that is used to generate the feedback   
     * @returns An async iterable that yields the feedback responses as IFeedbackAgain objects
     */
    public async *handleAgainFeedback(message: any, program: string) {
        let finalFeedback = '';
        let responses : IFeedbackAgain[] = [];

        let request : FeedbackRequest = { 
            kind: 'again',
            program: program,
            prompt: this.prompts["again"] + '\n\n' + this.experienceTracker.getFeedback().map(s=>'* ' + s).join('\n'),
            ragQuery: 'learning outcomes'
            // it is possible to provide a custom prompt context. when empty raqQuery is used
        };
        
        let feedback = await this.startRequestFeedback(request);

        try {
            
            const rawStream = await this.requestFeedback(request);
            const stream = await this.feedbackParser.parseResponseStream(rawStream, feedback) as AsyncIterable<IFeedbackAgain>;

            // read incoming json objects and process them
            for await (let section of stream) {

                // check if the section has a remark skip if not relevant
                if (section.remark && await this.contextSelector?.isFeedbackRelatedToPCK(section.remark)) {
                    responses.push(section);
                    finalFeedback += JSON.stringify(section);
                    // check if the negative feedback has been received before
                    if (!section.improved) {
                        section.extrainfo = await this.experienceTracker.hasReceivedFeedbackBefore(section.remark);
                    }
                    yield section;
                }
                // check if there is a next step or hint
                if (section.next_step) {
                    yield { nextstep: section.next_step, improved: true};
                } else if (section.hint) {
                    yield { nextstep: section.hint, improved: true};
                }
                if (!section.improved) {
                    // keep track of last feedback for improvement suggestions
                    this.experienceTracker.addFeedback(section.remark); 
                }
            }
        } catch (e : any) {
            console.log('Error in feedback request: ', e);
            feedback.errormessage = e.message;
            throw new FeedbackError('Error in feedback request', e);
        } finally {
            // store feedback in the experience tracker
            await this.experienceTracker.recordFeedbackResponse('outcome', responses);
            feedback.feedbackfinal = finalFeedback;
            await this.endRequestFeedback(feedback); 
        }
    }

    /** Handle feedback request for annotation feedback 
     * @param code The program code(array of lines of code) that is used to generate the feedback
     * @param offset The line number where the code starts in the editor
     * @returns An async iterable that yields the feedback responses as IFeedbackAnnotation objects
     */
    public async *handleAnnotation(code: string[], offset: number) {
    

        let finalFeedback = '';
        let responses : IFeedbackAnnotation[] = [];

        let feedbackRequest : FeedbackRequest = {
            kind: 'annotation',
            program: code.map((str,idx) => `${offset+idx+1}. ${str}`).join('\n'),
            prompt: this.prompts["annotation"],
            ragQuery: 'comment on difficulties, mistakes, and misconceptions students make',
            // it is possible to provide a custom prompt context. when empty raqQuery is used
        };

        let feedback = await this.startRequestFeedback(feedbackRequest);

        try {
            const rawStream = await this.requestFeedback(feedbackRequest);
            const jsonStream = await this.feedbackParser.parseResponseStream(rawStream, feedback) as AsyncIterable<IFeedbackAnnotation>;

            // read incoming json objects and process them

            for await (const annotation of jsonStream) {
                responses.push(annotation);
                finalFeedback += JSON.stringify(annotation);
                yield annotation;
            }
        }
        catch (e : any) {
            console.log('Error in feedback request: ', e);
            feedback.errormessage = e.message;
            throw new FeedbackError('Error in feedback request', e);
        }
        finally {
            // store feedback in the experience tracker
            await this.experienceTracker.recordFeedbackResponse('annotation', responses);
            feedback.feedbackfinal = finalFeedback;
            await this.endRequestFeedback(feedback); 
        }
    }

    /** Start a feedback request which will be logged on the datadrop api server
     * and return the feedback object which must be used later to update and finalize the feedback
     * @param request The feedback request object
     * @returns The feedback object that must be used to update and finalize the feedback
     */
    private async startRequestFeedback(request: FeedbackRequest) : Promise<IDatadropFeedback> {

        // start by creating a new feedback object
        const feedback = this.datadropApi.newFeedback(request.program,request.prompt);
        this.lastFeedback = feedback;
    
        // record the request for the experience tracker.
        this.experienceTracker.recordFeedbackRequest(request);

        // if there is no context, get it from the vector store
        if (!request.context) {
            console.log('Question: ', request.ragQuery!);
            const {srcnames, context} = await this.contextSelector!.retrieveContext(request.ragQuery!, request.maxResults);
            feedback.context = '(' + srcnames.join(',') + ')'; // ( ... ) indicates a list of filenames
            request.context = context;
        } else {
            feedback.context = request.context;
        }

        // Query the experience tracker
        const instruction = this.experienceTracker.getExperienceInstruction();
        if (instruction) {
            // add the learning goals order and instruction to the context
            // not sure if PCK_ORDER has already been added to the listthis.pckDocuments[CodeMentorAI.PCK_ORDER]
            request.context = request.context + '\n\n';
            request.prompt = instruction + '\n\n' + request.prompt + '\n\n';
        }

        // console.log('Selected context: ', request.context);

        // send the feedback to the server
        await this.datadropApi.send(feedback);
        return feedback;
    }

    /**
     * Performs the feedback request and returns the feedback responses as an async iterable
     * @param request The feedback request object
     * @returns An async iterable that yields the feedback responses
     */
    private async *requestFeedback(request: FeedbackRequest) {

        this.experienceTracker.clearFeedback();

        // create the prompt
        const promptValue = await this.promptTemplate.invoke({
            context: request.context,
            question: request.prompt,
            program:  request.program
        });

        // convert the prompt to chat
        const messages = await promptValue.toChatMessages();
        console.log('messages: ', messages);

        // get the response from the model
        const stream = await this.model.stream(messages);

        for await (const message of stream) {
            yield message.content;
        }
    }

    /** Finalizes the feedback request by updating the feedback object with the final feedback 
     * Sends the feedback to the datadrop api server
     * @param feedback The feedback object
     */
    private async endRequestFeedback(feedback?: IDatadropFeedback) {
        
        if (!feedback)
            return;
        this.datadropApi.update(feedback);
    }

    public async submitRating(rating: number, comment: string) {
        if (this.lastFeedback) {
            this.lastFeedback.rating = rating;
            if (comment && comment.trim().length > 0) // ignore empty comments
                this.lastFeedback.comment = comment.trim();
            await this.datadropApi.update(this.lastFeedback);
        }
    }

    /** Recursively find an object with the fieldname 'remark'
     * @param obj The object to search
     * @returns The object with the fieldname 'remark' or null if not found
     */
    private findObjectWithRemark(obj : any) : any {
        // Check if the current object contains the 'remark' field
        if (obj && typeof obj === 'object' && 'remark' in obj) {
            return obj;
        }

        // Iterate through object properties
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];

                // If the value is an object, search recursively
                if (value && typeof value === 'object') {
                    const result = this.findObjectWithRemark(value);
                    if (result) {
                        return result; // Return the object if found
                    }
                }
            }
        }

        // Return null if no object with 'remark' is found
        return null;
    }
          
}
