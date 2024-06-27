import express from 'express';
import { body, validationResult } from 'express-validator';
import { Admin } from '../mongoose/schemas/admin.mjs';
import { comparePassword } from '../utils/helpers.mjs'; 
import { Feedback } from '../mongoose/schemas/feedback.mjs';

const router = express.Router();

// Define the validation rules for the login route
const loginValidationRules = [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

// Route to handle admin login
router.post('/api/admin/login', loginValidationRules, async (req, res) => {
    console.log('POST request to /api/admin/login received');

    // Validate the request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // If validation fails, return a 400 Bad Request response with specific error messages
        const validationErrors = errors.array().map(error => error.msg);
        return res.status(400).json({ success: false, message: `${validationErrors}`, errors: validationErrors });
    }

    const { username, password } = req.body;

    try {
        // Check if the admin exists in the database
        const admin = await Admin.findOne({ username: username.toLowerCase() });

        if (!admin) {
            // If admin does not exist, return an error message
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // Validate the password
        if (!comparePassword(password, admin.password)) {
            // If password does not match, return an error message
            return res.status(400).json({ success: false, message: 'Password Incorrect! Please retry or contact your team' });
        }

        // If credentials are valid, return a success message
        res.status(200).json({ success: true, message: 'Login successful' });
    } catch (error) {
        console.error('Error during admin login:', error);
        // If there's an error during login, send a generic error message
        res.status(500).json({ success: false, message: 'An error occurred during login' });
    }
});

// Route to fetch admin information
router.get('/api/admin', async (req, res) => {
    try {
      // Fetch admin data from the database
      const admin = await Admin.findOne();
  
      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }
  
      // If admin data is found, send it in the response
      res.status(200).json(admin);
    } catch (error) {
      console.error('Error retrieving admin data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
});

// Route to update admin contact
router.post('/api/admin/update-contact', async (req, res) => {
    const { username, contact } = req.body;

    try {
        // Find the admin by username and update the contact field
        const updatedAdmin = await Admin.findOneAndUpdate(
            { username: username },
            { contact: contact },
            { new: true } // Return the updated document
        );

        if (!updatedAdmin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Send the updated admin data in the response
        res.status(200).json(updatedAdmin);
    } catch (error) {
        console.error('Error updating admin contact:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route to fetch the latest five feedback submissions
router.get('/api/feedback/latest', async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .sort({ submitDate: -1 }) // Sort by submitDate in descending order
            .limit(5); // Limit to the latest 5 submissions
        
        res.status(200).json(feedbacks);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route to fetch feedback submissions with pagination
router.get('/api/feedback', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const feedbacks = await Feedback.find()
            .sort({ submitDate: -1 }) // Sort by submitDate in descending order
            .skip(skip)
            .limit(limit);

        const totalFeedbacks = await Feedback.countDocuments();

        res.status(200).json({
            feedbacks,
            totalPages: Math.ceil(totalFeedbacks / limit),
            currentPage: page,
        });
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Route to fetch a single feedback by its ID
router.get('/api/feedback/:id', async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }
        res.status(200).json(feedback);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;