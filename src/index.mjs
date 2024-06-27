import express from 'express';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';
import { User } from './mongoose/schemas/user.mjs';
import { validationResult, body } from 'express-validator';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import "./strategies/local-strategy.mjs";
import nodemailer from 'nodemailer';
import multer from 'multer';
import { Event, Budget } from './mongoose/schemas/event.mjs'
import router from './routers/index.mjs';
import { Attendee } from './mongoose/schemas/attendee.mjs';
import http from 'http';
import { Server } from 'socket.io';
import { ExpressPeerServer } from 'peer';
import { Admin } from './mongoose/schemas/admin.mjs';
import { hashPassword } from './utils/helpers.mjs';

// Set up multer for image uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Define a validation schema for the event form
const eventFormValidationSchema = [
    body('title').notEmpty().withMessage('\nEvent name is required'),
    body('type').notEmpty().withMessage('\nEvent type is required'),
    body('start').notEmpty().withMessage('\nEvent start date is required'),
    body('end').notEmpty().withMessage('\nEvent end date is required'),
    body('description').notEmpty().withMessage('\nEvent description is required'),
    body('coverImage').custom((value, { req }) => {
        if (!req.file) {
            throw new Error('\nEvent cover image is required');
        }
        return true;
    })
];

const joinEventValidationSchema = [
    body('email').isEmail().withMessage('\nEmail is required and in correct format'),
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const server = http.createServer(app);

const io = new Server(server); // Initialize socket.io

// Socket.IO events
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('join-room', (roomId, userId, userName) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId, userName);

        // Handle chat messages
        socket.on('message', (message) => {
            io.to(roomId).emit('createMessage', message, userName);
        });

        // Handle user disconnection
        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId, userName);
        });

        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
    });
});

const peerServer = ExpressPeerServer(server, { debug: true });

app.use('/peerjs', peerServer);

const PORT = process.env.PORT || 3000;

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static('uploads'));

// Serve static files from the './src/public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser("helloworld"));

// secret need to be unique so somebody hard to decode
app.use(session({
    secret: "kitty boom",
    saveUninitialized: false,
    resave: false,
    cookie: {
        maxAge: 60000 * 60 * 2,
    },
})
);

app.use(passport.initialize());
app.use(passport.session());

// Connect to project database
mongoose.connect('mongodb://localhost/virtumeet')
    .then(() => console.log('Connected to Database'))
    .catch((err) => console.log(`Error: ${err}`));

app.use(express.static('./src/public'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.use(router);


app.get("/cookies", (request, response) => {
    response.cookie("hello", "world", {maxAge: 60000, signed: true});
    console.log(request.session);
    console.log(request.session.id);
    request.session.visited = true;
    // signed:true means need to set secret for cookieParser
    response.sendStatus(201);
});

app.get('/auth/cookies', (request, response) => {
    console.log(request.headers.cookie);
    console.log(request.cookies);
    console.log(request.signedCookies.hello);
    if (request.signedCookies.hello && request.signedCookies.hello === 'world') 
      return response.json({ success: true, message: 'User login successful', redirect: '/login_signup' });

    return response.status(403).send({message: "Sorry. You need the correct cookie"});
});


// Check authenticate status
app.get('/api/auth/status', (request, response) => {
    console.log(`Inside /auth/status endpoint`);
    console.log(request.user);
    console.log(request.session);
    return request.user ? response.send(request.user) : response.redirect('/login_signup');
});


// Endpoint to handle profile update
app.post('/api/update/profile', async (req, res) => {
    try {
      // Extract updated data from the request body
      const { organizationName, contact } = req.body;
  
      // Find the user by their username and update their organization name and contact information
      const updatedUser = await User.findOneAndUpdate(
        { username: req.user.username }, // Assuming req.user contains user information
        { organizationName, contact },
        { new: true } // Return the updated document
      );
  
      if (updatedUser) {
        // Send a success response with the updated user data
        res.json({ success: true, message: 'Profile updated successfully', user: updatedUser });
      } else {
        // Send an error response if the user was not found
        res.status(404).json({ success: false, message: 'User not found' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      // Send an error response if an error occurred during the update process
      res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// Define a route to save the event
app.post('/api/save_event', upload.single('coverImage'), async (req, res) => {
    try {
        const { title, type, start, end, description } = req.body;
        const coverImage = req.file ? `/uploads/${req.file.filename}` : null;
        const userId = req.session.passport.user;

        if (!title || !type || !start || !end || !description || !coverImage) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const event = new Event({
            title,
            type,
            start: new Date(start),
            end: new Date(end),
            coverImage,
            description,
            createdBy: userId
        });

        await event.save();
        res.status(201).json({ message: 'Event saved successfully' });
    } catch (error) {
        console.error('Error saving event:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/save-event', upload.single('uploaded_file'), eventFormValidationSchema, async (req, res) => {
    console.log('POST request to /save-event received');

    console.log(req.body)

    // Validate the request body
    const errors = validationResult(req.body);
    if (!errors.isEmpty()) {
        // If validation fails, return a 400 Bad Request response with specific error messages
        const validationErrors = errors.array().map(error => error.msg);
        return res.status(400).json({ success: false, message: `${validationErrors}`, errors: validationErrors });
    }

    try {
        // Assuming you have a middleware to authenticate the user and store their information in req.user
        const userId = req.session.passport.user;

        // Create a new event using the data from the request body and the user's ID
        const eventData = { ...req.body, createdBy: userId };

        // If a cover image was uploaded, store its path in the eventData
        if (req.file) {
            eventData.coverImage = req.file.path;
        }

        // Create a new event instance
        const event = new Event(eventData);

        // Save the event to the database
        await event.save();

        // Send a success response
        res.sendStatus(200);
    } catch (error) {
        // Send an error response
        console.error('Error saving event:', error);
        res.sendStatus(500);
    }
});

app.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find({ createdBy: req.session.passport.user });
        res.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Endpoint to get event details by ID
app.get('/api/events/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.put('/api/events/:eventId/publish', async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        event.status = 'live'; // Change status to live
        await event.save();

        res.json({ message: "Event published successfully", event });
    } catch (error) {
        console.error('Error publishing event:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.put('/api/events/:eventId/unpublish', async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        event.status = 'draft'; // Change status to draft
        await event.save();

        res.json({ message: "Event unpublished successfully", event });
    } catch (error) {
        console.error('Error unpublishing event:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// PUT route to update event status
app.put('/api/events/:eventId/status', async (req, res) => {
    console.log(req.body)

    const eventId = req.params.eventId;
    const newStatus = req.body.status;

    try {
        // Find the event by ID
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Update the event status
        event.status = newStatus;
        await event.save();

        // Send the updated event as response
        res.json(event);
    } catch (error) {
        console.error('Error updating event status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// // Logout
// app.post('/api/auth/logout', (request, response) => {
//     if (!request.user) return response.sendStatus(401);

//     request.logout((err) => {
//         if(err) return response.sendStatus(400);
//         response.sendFile(path.join(__dirname, 'public', 'user_login_signup_form.html'));
//     });
// });


// Logout
app.post('/logout', (request, response) => {
    if (!request.user) return response.sendStatus(401);

    request.logout((err) => {
        if(err) return response.sendStatus(400);
        response.sendFile(path.join(__dirname, 'public', 'user_login_signup_form.html'));
    });
});

// const normalizedFilePath = path.normalize(originalFilePath);

app.put('/api/events/:id/customize', upload.fields([
    { name: 'eventLobbyCoverImage', maxCount: 1 },
    { name: 'eventLogo', maxCount: 1 }
]), async (req, res) => {
    try {
        const { welcomeHeadline, briefIntro } = req.body;
        const coverImage = req.files['eventLobbyCoverImage'] ? `/uploads/${req.files['eventLobbyCoverImage'][0].filename}` : null;
        const logo = req.files['eventLogo'] ? `/uploads/${req.files['eventLogo'][0].filename}` : null;

        console.log(coverImage);
        console.log(logo);

        const updateData = {
            welcomeHeadline,
            briefIntro,
            eventLobbyCoverImage: coverImage, // Use file path directly
            eventLogo: logo // Use file path directly
        };

        const event = await Event.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.status(200).json(event);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail', // or any email service you use
    auth: {
        user: 'looientertaincw@gmail.com',
        pass: 'oovb bjdx dbry eknv',
    }
});

// Define a validation schema for login (email and password only)
const registerEventValidationSchema = [
    body('email').isEmail().withMessage('\nEmail is required and must be in correct format'),
    body('name').notEmpty().withMessage('\nName is required')
];

// Registration endpoint
app.post('/api/register/event', registerEventValidationSchema, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const validationErrors = errors.array().map(error => error.msg);
        return res.status(400).json({ success: false, message: `${validationErrors}`, errors: validationErrors });
    }

    req.body.email = req.body.email.toLowerCase();

    const { name, email, eventId } = req.body;

    try {
        // Check for duplicate email
        const existingAttendee = await Attendee.findOne({ email, event: eventId });

        if (existingAttendee) {
            return res.status(400).json({ success: false, message: 'This email address has already register the event. Please try another or check your email.' });
        }

        // Create a new attendee
        const newAttendee = new Attendee({
            name,
            email,
            event: eventId
        });

        await newAttendee.save();

        // Send confirmation email
        const mailOptions = {
            from: 'looientertaincw@gmail.com',
            to: email,
            subject: 'Event Registration Confirmation',
            text: `Hello ${name},\n\nYou have successfully registered for the event. We look forward to seeing you there!\n\nBest regards,\nEvent Team`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ success: false, message: 'Registration successful, but failed to send confirmation email' });
            }

            res.status(200).json({ success: true, message: 'Congratulations! Your registration was successfully processed. Your ticket/confirmation receipt will be emailed to you within the next 5 to 10 minutes.' });
        });

        io.emit('new-attendee', newAttendee);

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Update the endpoint to handle retrieving attendee's name
app.post('/api/check-registration/:eventId', joinEventValidationSchema, async (req, res) => {

    req.body.email = req.body.email.toLowerCase();

    const { eventId } = req.params;
    const { email } = req.body;

    console.log('received', email); // Logging the entire request body for debugging

    try {
        // Check if the attendee is registered based on email and event ID
        const attendee = await Attendee.findOne({ email, event: eventId });
        if (attendee) {
            // If attendee is found, respond with registered status and attendee's name
            return res.json({ registered: true, displayName: attendee.name });
        }

        // If attendee is not found in the Attendee collection, check if the user is the organizer of the event
        const event = await Event.findById(eventId).populate('createdBy');
        if (event && event.createdBy.email === email) {
            // If user is the organizer, respond with registered status and username as displayName
            return res.json({ registered: true, displayName: event.createdBy.username });
        }

        // If neither attendee nor organizer is found, respond with registered status as false
        res.json({ registered: false });
    } catch (error) {
        console.error('Error checking registration', error);
        res.status(500).json({ registered: false, error: 'Internal Server Error' });
    }
});

// const db = mongoose.connection;

// // Check for database connection errors
// db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// // Once the database connection is open, add admin data
// db.once('open', async () => {
//     try {
//         // Check if there are existing admins in the database
//         const existingAdmins = await Admin.find();
//         if (existingAdmins.length === 0) {
//             // If no admins exist, add admin data with hashed passwords
//             const adminData = [
//                 {
//                     username: 'admin',
//                     email: 'katiejane2000@gmail.com',
//                     password: hashPassword('katiejane123up@'), // Hash the password before saving
//                     contact: ''
//                 }
//                 // Add more admin data objects as needed
//             ];

//             // Insert admin data into the Admin collection
//             await Admin.insertMany(adminData);
//             console.log('Admin data added successfully.');
//         } else {
//             console.log('Admin data already exists in the database.');
//         }
//     } catch (error) {
//         console.error('Error adding admin data:', error);
//     } finally {
//         // Close the database connection
//         db.close();
//     }
// });


app.listen(PORT, () => {
    console.log(`Running on Port ${PORT}`);
});

const peerServerPort = process.env.PEER_SERVER_PORT || 8383; // Choose a different port for the peer server

peerServer.listen(peerServerPort, () => {
    console.log(`Peer server is running on port ${peerServerPort}`);
});