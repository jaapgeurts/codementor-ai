/** This class represents an error that occurs when a feedback is not valid. */
export class FeedbackError extends Error {
    
    public readonly cause?: Error;

    /**
     * Creates a new instance of the FeedbackError class.
     * @param message The error message
     * @param cause The cause of the error
     */
    constructor(message : string, cause?: Error) {
        super(message);
        this.name = 'FeedbackError';
        this.cause = cause;
    }
}