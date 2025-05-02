import { IDatadropFeedback } from "./datadropapi";
import { FeedbackResponse } from "./feedback";

/** Class to parse feedback responses from the json that's inside the LLM response.  */
export class FeedbackParser {

    /**
     * Filters out and parses JSON objects from the feedback from the stream and yields the object.
     * It checks the stream for complete json objects. Json objects are demarked by braces.
     * Handles nested json objects as well.
     * @param stream The stream to parse containing the feedback with json objects
     * @param feedback The feedback object to store the raw feedback
     */
    public async *parseResponseStream(stream: any, feedback: IDatadropFeedback) {
        // parse the response
        const parsedStream = await this.parseFeedback(stream);

        // set the feedback to empty
        feedback.feedbackraw = '';
        // process the response
        for await (const response of parsedStream) {
            // record the raw response
            feedback.feedbackraw += response.rawFeedback;
            // if there is a json response, process it
            if (response.parsedFeedback) {
                yield response.parsedFeedback;
            }
        }
    }

    /**
     * Filters out and parses JSON objects from the feedback from the stream and yields the object.
     * It checks the stream for complete json objects. Json objects are demarked by braces.
     * Handles nested json objects as well.
     * @param stream The stream to parse containing the feedback with json objects
     */
    private async *parseFeedback(stream: any) {

        let response : FeedbackResponse = new FeedbackResponse();
        let accumulatedResponse = '';

        // parse the stream
        // keep count of opening braces and start parsing when we found a complete json object
        for await (const chunk of stream) {

            // accumulate the response
            accumulatedResponse += chunk;
           
            // process a json response
            let jsonString = accumulatedResponse;

            // while there is a json object in the accumulated response
            const firstBracketIndex = accumulatedResponse.indexOf('{');
            let lastBracketIndex = -1;
            let openBraces = 1;
            let i = firstBracketIndex+1;
            while (openBraces > 0 && i < accumulatedResponse.length) {
                if (accumulatedResponse[i] === '{') {
                    openBraces++;
                } else if (accumulatedResponse[i] === '}') {
                    openBraces--;
                }
                if (openBraces === 0) {
                    lastBracketIndex = i;
                }
                i++;
            }
            // Continue accumulating until we have a complete json object
            if (lastBracketIndex === -1)
                continue;


            // extract the json string
            jsonString = accumulatedResponse.substring(firstBracketIndex, lastBracketIndex + 1);
            // store the raw feedback
            response.rawFeedback = accumulatedResponse.substring(0, lastBracketIndex + 1);
            // remove the json string from the accumulated response
            accumulatedResponse = accumulatedResponse.substring(lastBracketIndex + 1);
            try {
                let section = JSON.parse(jsonString);
                response.parsedFeedback = section;
            } catch (e) {
                console.log('error parsing json response: ', e);
                console.log('Ouput: ', jsonString);
                throw e;
            }
            console.log('Ouput: ', jsonString);
            yield response;
        }
    }
}