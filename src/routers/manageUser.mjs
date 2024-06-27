import { Router } from "express";
import { User } from "../mongoose/schemas/user.mjs";
import { validationResult, body } from 'express-validator';
import { hashPassword, generateOTP } from "../utils/helpers.mjs";
import nodemailer from 'nodemailer';
import "../strategies/local-strategy.mjs";
import passport from 'passport';

const router = Router();

// Define a validation schema for all required fields
const createUserValidationSchema = [
    body('username').notEmpty().withMessage('\nUsername is required'),
    body('email').isEmail().withMessage('\nEmail is required and in correct format'),
    body('password').isLength({ min: 8 }).withMessage('\nPassword must be at least 8 characters long'),
    body('organizationName').notEmpty().withMessage('\nOrganization name is required')
];

// Define a validation schema for login (email and password only)
const loginValidationSchema = [
    body('email').isEmail().withMessage('\nEmail is required and must be in correct format'),
    body('password').notEmpty().withMessage('\nPassword is required')
];

// Define a validation schema for the email field
const forgotPasswordValidationSchema = [
    body('email').isEmail().withMessage('\nEmail is required and must be in correct format'),
];

// Define a validation schema for verifying OTP
const verifyOTPValidationSchema = [
    body('email').isEmail().withMessage('\nEmail is required and must be in correct format'),
    body('otp').notEmpty().isLength({ min: 6, max: 6 }).withMessage('\nOTP is required and must be in 6 digit')
];

// Define a validation schema for reseting password
const resetPasswordValidationSchema = [
    body('newPassword').isLength({ min: 8 }).withMessage('\nPassword must be at least 8 characters long'),
];

/// POST Signup Form
router.post('/api/signup', createUserValidationSchema, async (req, res) => {
    console.log('POST request to /api/signup received');

    // Validate the request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // If validation fails, return a 400 Bad Request response with specific error messages
        const validationErrors = errors.array().map(error => error.msg);
        return res.status(400).json({ success: false, message: `${validationErrors}`, errors: validationErrors });
    }

    // Convert email to lowercase
    req.body.email = req.body.email.toLowerCase();

    const { username, email, password, organizationName } = req.body;

    console.log(req.body);
    const hashedPassword = hashPassword(req.body.password);

    // If validation passes, create a new user
    try {
        // Check if username already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            // If username already exists, return error message
            return res.status(400).json({ success: false, message: 'Username already exists. Please try another username.' });
        } 

        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            // If email already exists, return error message
            return res.status(400).json({ success: false, message: 'Email has already registered. Please Sign In to this account or use a different email.' });
        } 

        // Create new user instance with hashed password
        const newUser = new User({ username, email, password: hashedPassword, organizationName });
        console.log('New user object:', newUser);
        
        // Save the user to the database
        await newUser.save();
        
        // If user is successfully created, send success message
        return res.status(200).json({ success: true, message: 'User created successfully', redirect: '/login_signup' });
    } catch (error) {
        console.error('Error saving user to database:', error);
        // If there's an error during user creation, send error message
        res.status(500).json({ success: false, message: 'An error occurred while creating the user' });
    }
});


// POST login
router.post('/api/auth', loginValidationSchema, (req, res, next) => {

    // Validate the request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // If validation fails, return a 400 Bad Request response with specific error messages
        const validationErrors = errors.array().map(error => error.msg);
        return res.status(400).json({ success: false, message: `${validationErrors}`, errors: validationErrors });
    }

    passport.authenticate('local', (err, user, info) => {
        if (err) {
            // If there's an error during authentication, return 500 status and error message
            console.error(err);
            return res.status(500).json({ success: false, message: `${err.message}` });
        }

        // If authentication is successful, log in the user
        req.login(user, (err) => {
            if (err) {
                // If there's an error during login, return 500 status and error message
                console.error('Error during login:', err);
                return res.status(500).json({ success: false, message: 'An error occurred during login' });
            }
            // If login is successful, return 200 status and success message
            return res.status(200).json({ success: true, message: 'Login successful', redirect: '/user_dashboard' });
        });
    })(req, res, next);
});

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'looientertaincw@gmail.com',
        pass: 'oovb bjdx dbry eknv',
    },
});

// POST route to handle "Forgot Password" form submission
router.post('/api/forgot_password', forgotPasswordValidationSchema, async (req, res) => {
    console.log('POST request to /api/forgot_password received');

    // Validate the request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // If validation fails, return a 400 Bad Request response with specific error messages
        const validationErrors = errors.array().map(error => error.msg);
        return res.status(400).json({ success: false, message: `${validationErrors}`, errors: validationErrors });
    }

    req.body.email = req.body.email.toLowerCase();

    const { email } = req.body;

    email.toLowerCase();
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Email not found. Please use another email address or create new account.' });
        }

        const otp = generateOTP();
        user.otpCode = otp;
        await user.save();

        const mailOptions = {
            from: 'looientertaincw@gmail.com',
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP code is ${otp}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ success: false, message: 'Error sending OTP' });
            } else {
                console.log('Email sent: ' + info.response);
                return res.status(200).json({ success: true, message: 'OTP sent to email. Please check your email.' });
            }
        });
    } catch (error) {
        console.error('Error during forgot password:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST route to handle OTP verification
router.post('/api/verify_otp', verifyOTPValidationSchema, async (req, res) => {
    console.log('POST request to /api/verify_otp received');

    // Validate the request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // If validation fails, return a 400 Bad Request response with specific error messages
        const validationErrors = errors.array().map(error => error.msg);
        return res.status(400).json({ success: false, message: `${validationErrors}`, errors: validationErrors });
    }
    
    req.body.email = req.body.email.toLowerCase();

    const { email, otp } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || user.otpCode !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        // Invalidate the OTP after use
        user.otpCode = null;
        await user.save();

        return res.status(200).json({ success: true, message: 'OTP verified. Proceed to reset password.' });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Endpoint to handle password reset
router.post('/api/reset_password', resetPasswordValidationSchema, async (req, res) => {

    console.log('POST request to /api/verify_otp received');

    // Validate the request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // If validation fails, return a 400 Bad Request response with specific error messages
        const validationErrors = errors.array().map(error => error.msg);
        return res.status(400).json({ success: false, message: `${validationErrors}`, errors: validationErrors });
    }

    try {
        req.body.email = req.body.email.toLowerCase();

        const { email, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Update user's password
        user.password = hashPassword(newPassword); 
        await user.save();

        return res.status(200).json({ success: true, message: 'You successfully reset the password. Please Sign In again.' });
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

export default router;