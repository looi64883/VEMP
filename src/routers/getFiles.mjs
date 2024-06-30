import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Event } from '../mongoose/schemas/event.mjs'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get('/', (request, response) => {
    // Send the file and status
    response.sendFile(path.join(__dirname, '..', 'public', 'user_login_signup_form.html'));
    response.status(200).send('OK');
});

router.get("/cookies", (request, response) => {
    response.cookie("hello", "world", {maxAge: 60000, signed: true});
    console.log(request.session);
    console.log(request.session.id);
    request.session.visited = true;
    // signed:true means need to set secret for cookieParser
    response.sendStatus(201);
});

router.get('/login_signup', (request, response) => {
    response.sendFile(path.join(__dirname, '..', 'public', 'user_login_signup_form.html'));
});

router.get('/term_privacy', (request, response) => {
    response.sendFile(path.join(__dirname, '..', 'public', 'terms_privacy.html'));
});

router.get('/user_dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'user_homepage.html'));
});


router.get('/user_profile', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'user_profile_info.html'));
});

router.get('/user_feedback', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'feedback_form.html'));
});

router.get('/forget_password', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'forgot_password.html'));
});

router.get('/create_event', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'event.html'));
});

router.get('/admin_login_page', (request, response) => {
    response.sendFile(path.join(__dirname,'..', 'public', 'admin_login_form.html'));
});

router.get('/admin_homepage', (request, response) => {
    response.sendFile(path.join(__dirname,'..', 'public', 'admin_homepage.html'));
});

// GET event detail by ID
router.get('/event_page/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).send('Event not found');
        }
        res.sendFile(path.join(__dirname, '..', 'public', 'event_page.html'));
    } catch (error) {
        res.status(500).send('An error occurred while fetching the event');
    }
});

router.get('/registration/:eventId', async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).send('Event not found');
        }
        res.sendFile(path.join(__dirname, '..', 'public', 'event_registration.html'));
    } catch (error) {
        res.status(500).send('An error occurred while fetching the event');
    }
});

// GET event lobby by ID
router.get('/event_lobby/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).send('Event not found');
        }
        res.sendFile(path.join(__dirname, '..', 'public', 'event_lobby.html'));
    } catch (error) {
        res.status(500).send('An error occurred while fetching the event');
    }
});

router.get('/join_event/:eventId', async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).send('Event not found');
        }
        res.sendFile(path.join(__dirname, '..', 'public', 'join_event.html'));
    } catch (error) {
        res.status(500).send('An error occurred while fetching the event');
    }
});

router.get('/video_conference/:eventId', async (req, res) => {
    const { eventId } = req.params;
    // Assuming you have a session middleware to check user session
    const event = await Event.findById(eventId);
    if (event) {
        res.sendFile(path.join(__dirname, '..', 'public', 'video_conference.html'));
    } else {
        res.status(404).send('Event not found');
    }
});


router.get('/auth/admin/login', async (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin_login_form.html'));
});

router.get('/admin/dashboard', async (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin_homepage.html'));
});

router.get('/admin/profile_info', async (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin_profile.html'));
});

router.get('/admin/manage/feedback', async (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'manage_feedback.html'));
});

router.get('/room.html', async (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'room.html'));
});

// Logout
router.post('/api/auth/logout', (request, response) => {
    if (!request.user) return response.sendStatus(401);

    request.logout((err) => {
        if(err) return response.sendStatus(400);
        response.sendFile(path.join(__dirname, '..', 'public', 'user_login_signup_form.html'));
    });
});

export default router;

