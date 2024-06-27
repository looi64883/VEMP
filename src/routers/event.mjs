import { Router } from "express";
import { Attendee } from "../mongoose/schemas/attendee.mjs";

const router = Router();

// Endpoint to get attendees for a specific event
router.get('/api/attendees/:eventId', async (req, res) => {
    console.log(`inside route`);
    const eventId = req.params.eventId;

    console.log(eventId);

    try {
        // Fetch attendees for the specified event from the database
        const attendees = await Attendee.find({ event: eventId });

        console.log(attendees)

        res.status(200).json(attendees); // Return the list of attendees
    } catch (error) {
        console.error('Error fetching attendees:', error);
        res.status(500).json({ message: 'Internal server error' }); // Return error response
    }
});

export default router;