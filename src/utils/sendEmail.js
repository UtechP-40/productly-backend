import nodemailer from "nodemailer" 
import { ApiError } from "./ApiError.js"

/**
 * Sends an email using the provided email, subject, and HTML content.
 * @param {string} email - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} htmlContent - The HTML content of the email.
 * @returns {Promise<Object>} - A promise that resolves to an object containing the sent email and a success message.
 * @throws {ApiError} - If there is an error sending the email.
 */
const sendEmail = async (email, subject, htmlContent) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.GMAIL_USER, 
                pass: process.env.GMAIL_PASS, 
            },
        });

        const mail = await transporter.sendMail({
            from: `"Your App Name" <${process.env.GMAIL_USER}>`, 
            to: email,
            subject,
            html: htmlContent, 
        });

        console.log("Email sent successfully");
        return {mail,message:"Email sent successfully"}
    } catch (error) {
        console.log("Email not sent:", error);
        throw new ApiError(500,error.message|| "Email not sent")
    }
};

export default sendEmail
