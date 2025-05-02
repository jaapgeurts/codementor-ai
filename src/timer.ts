/**
 * This class represents a timer that can be started, stopped, and reset.
 * 
 */

export class Timer {
    private duration: number; // Duration in milliseconds
    private intervalId: NodeJS.Timeout | null = null;
    private expiryCallback: () => void;

    constructor(duration: number, expiryCallback: () => void) {
        this.duration = duration;
        this.expiryCallback = expiryCallback;
    }

    // Start or restart the timer
    start(): void {
        this.clear(); // Clear any existing interval
        this.intervalId = setInterval(() => {
            this.clear();
            this.expiryCallback();
        }, this.duration);
    }

    // Clear the interval
    clear(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    // Reset the timer to its original duration
    reset(): void {
        this.start();
    }

    // Check if the timer is running
    isRunning(): boolean {
        return this.intervalId !== null;
    }
}