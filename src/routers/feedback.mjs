import { Router } from "express";
import { Feedback } from "../mongoose/schemas/feedback.mjs";
import { validationResult, body } from 'express-validator';


const router = Router();

// Define a validation schema for login (email and password only)
const createFeedbackValidationSchema = [
    body('title').notEmpty().withMessage('\ntitle is required'),
    body('description').notEmpty().withMessage('\ndescription is required')
];

// Route to handle feedback form submission
router.post('/api/submit/feedback', createFeedbackValidationSchema, async (req, res) => {
    console.log('POST request to /api/submit/feedback received');

    // Validate the request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // If validation fails, return a 400 Bad Request response with specific error messages
        const validationErrors = errors.array().map(error => error.msg);
        return res.status(400).json({ success: false, message: `${validationErrors}`, errors: validationErrors });
    }

    try {
        const { title, description } = req.body;
        const userId = req.session.passport.user; // Retrieve userId from session

        console.log('UserID:', userId); // Log userId for debugging

        // Create a new feedback object with userId
        const feedback = new Feedback({
            title,
            description,
            user: userId, // Pass the userId to the feedback table
        });

        // Save the feedback to the database
        await feedback.save();

        // Respond with success message
        res.status(201).json({ success: true, message: 'Feedback submitted successfully.' });
    } catch (error) {
        // Respond with error message
        console.error('Error submitting feedback:', error);
        res.status(500).json({ success: false, message: 'Internal server error. Feedback submission failed.' });
    }
});

export default router;