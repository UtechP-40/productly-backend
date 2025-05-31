/**
 * Represents an API response.
 */
class ApiResponse {
    /**
     * Creates a new ApiResponse instance.
     * @param {number} statusCode - The status code of the response.
     * @param {any} data - The data returned by the API.
     * @param {string} [message="Success"] - The message associated with the response.
     */
    constructor(statusCode, data, message = "Success") {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;
    }
}

export { ApiResponse };
