/*
 * This file contains the DataDropApi class that is used to send feedback to the datadrop server.
 * Author: Jaap Geurts
 * Date: 2025-12-01
 */

import axios from "axios";

interface IDatadropFeedback{
    id : number | null;
    clientid: string;
    program: string;
    question: string;
    context: string | null;
    feedbackraw: string | null;
    feedbackfinal: string | null;
    errormessage: string | null;
    rating: number | null;
    comment: string | null;
    creationtime: Date | null;
    release: string;
};

/** This class is used to send feedback to the datadrop server.
 * 
 */
class DatadropApi {

    private static readonly API_URL = 'http://localhost:5000/api/v1';
    private readonly UUID : string; // can't make it readonly because it is set in the constructor and must be static 
    private feedbackKey : string;
    private version : string;

    /** Creates a new instance of the DatadropApi class.
     * @param clientuuid The UUID of the client, used to distinguish between different clients in the DB
     * @param feedbackApiKey The API key for the feedback server
     * @param version The version of the client software, used to track feedback for different versions of this extension
     */
    constructor(clientuuid : string, feedbackApiKey: string, version: string) {
        this.feedbackKey = feedbackApiKey;
        this.UUID = clientuuid;
        this.version = version;
    }

    /** Creates a new feedback object with the given program and question. 
     * @param program The program for which the feedback is given
     * @param question The question for which the feedback is given
     * @returns A new feedback object
     */
    public newFeedback(program: string, question: string) : IDatadropFeedback {
        return {
            id: null,
            clientid: this.UUID,
            program: program,
            question: question,
            context: null,
            feedbackraw: null,
            feedbackfinal: null,
            errormessage: null,
            rating: null,
            comment: null,
            creationtime: null,
            release: this.version
        };
    }

    /** Sends the feedback to the server. 
     * @param feedback The feedback object to send
     */
    public async send(feedback: IDatadropFeedback) {
        // const httpsAgent = new https.Agent({ rejectUnauthorized: false });
        // setup axios:
        // axios.defaults.baseURL = config.apiURL
        // NOT NEEDED axios.defaults.httpsAgent = httpsAgent;
        // Create a feedback object
        // send it to the server
        // update the feedback object with the response

        try {
            const response = await axios({
                method: 'post',
                url: DatadropApi.API_URL + '/feedbackrequest',
                timeout: 2000,
                headers: {
                    "Content-Type": "application/json",
                    // get hash key from configuration
                    "Authorization": "Basic " + this.feedbackKey
                },
                data: feedback
            });

            feedback.id = response.data.id;
            feedback.creationtime = response.data.creationtime;
        }
        catch( error: any) {
            // supress any errors so that the UI continues to work
            console.error('Error posting feedback: ', error.message);
            if (error.response) {
                console.error('Error from server: ', error.response.data);
                console.error('Error from server: ', error.response.status);
            } else if (error.request) {
                console.error('No response: ', error.request);
            } else {
                console.error('Unknown error posting feedback: ', error.message);
            }
        };
    }

    /** Updates the feedback on the server.
     * @param feedback The feedback object to update
     * @returns The updated feedback object
     */
    public async update(feedback: IDatadropFeedback) {
        // const httpsAgent = new https.Agent({ rejectUnauthorized: false });
        // setup axios:
        // axios.defaults.baseURL = config.apiURL
        // NOT NEEDED axios.defaults.httpsAgent = httpsAgent;

        try {
            const response = await axios({
                method: 'put',
                url: DatadropApi.API_URL + '/feedbackrequest/' + feedback.id,
                timeout: 2000,
                headers: {
                    "Content-Type": "application/json",
                    // get hash key from configuration
                    "Authorization": "Basic " + this.feedbackKey
                },
                data: feedback
            });
            feedback.id = response.data.id;
            feedback.creationtime = response.data.creationtime;
        }
        catch (error : any) {
            // supress any errors so that the UI continues to work
            console.error('Error posting feedback: ', error.message);
            if (error.response) {
                console.error('Error from server: ', error.response.data);
                console.error('Error from server: ', error.response.status);
            } else if (error.request) {
                console.error('No response: ', error.request);
            } else {
                console.error('Unknown error posting feedback: ', error.message);
            }
        }
    }
}

export { DatadropApi, IDatadropFeedback };
