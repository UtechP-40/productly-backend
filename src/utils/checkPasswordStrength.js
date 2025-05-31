import zxcvbn from "zxcvbn" // Importing the zxcvbn library for password strength checking

export default (password) => {
    const result = zxcvbn(password); // Running the zxcvbn function to check the password strength

    // Returning an object with the password score and feedback suggestions
    return {
        score: result.score, // The strength score of the password (0-4)
        feedback: result.feedback.suggestions, // Suggestions for improving the password strength
    };
};
