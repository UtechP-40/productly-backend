/**
 * Represents an API error.
 * @class
 * @extends Error
 */
class ApiError extends Error {
    /**
     * Creates an instance of ApiError.
     * @constructor
     * @param {number} statusCode - The HTTP status code of the error.
     * @param {string} [message="Something went wrong"] - The error message.
     * @param {Array} [errors=[]] - An array of error objects.
     * @param {string} [stack=""] - The stack trace of the error.
     */
    constructor(statusCode, message = "Something went wrong", errors = [], stack = "") {
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    } 
}

export  {ApiError};