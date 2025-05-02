/*
 * This file contains the classes and interfaces for feedback
 */

/** This class represents a feedback request. */
export class FeedbackRequest {
    kind: string = "unknown";
    program: string;
    prompt: string;
    ragQuery?: string = '';
    // It's possible to provide custom prompt context (i.e. RAG context)
    context?: string;
    maxResults? : number = 10; // Use the top 10 results from the vector store

    /**
     * Creates a new instance of the FeedbackRequest class.
     * @param program The program for which the feedback is requested
     * @param prompt The LLM prompt for which the feedback is requested
     * @param ragQuery The RAG query to select the PCK context
     * @param context The context for the feedback
     * @param maxResults The maximum number of results to return
     */
    constructor(program: string, prompt: string, ragQuery? : string, context?: string, maxResults?: number) {
        this.program = program;
        this.prompt = prompt;
        this.context = context;
        this.ragQuery = ragQuery;
        if (maxResults) {
            this.maxResults = maxResults;
        }
    }
}

export interface IFeedbackOutcome {
    remark: string;
    ismet: boolean;
    extrainfo: boolean;
}


export interface IFeedbackImprove {
    remark: string;
    praise: string;
    extrainfo: boolean;
}

export interface IFeedbackUnderstand {
    question: string;
    answer: string;
}

export interface IFeedbackAnnotation {
    line: number;
    remark: string;
    positive: boolean;
}

export interface IFeedbackAgain {
    remark: string;
    improved: boolean;
    extrainfo: boolean;
    next_step: string;
    nextstep: string;
    hint: string;
}

export class FeedbackResponse {
    kind: string = "unknown";
    rawFeedback: string = '';
    parsedFeedback : IFeedbackOutcome | IFeedbackImprove | IFeedbackUnderstand | IFeedbackAnnotation | IFeedbackAgain | null = null;
}