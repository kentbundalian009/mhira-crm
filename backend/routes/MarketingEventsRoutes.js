import express from 'express';
import {
    getAllEvents,
    getPublicEvents,
    createEvent,
    updateEvent,
    deleteEvent
} from '../controllers/MarketingEventsController.js';

const router = express.Router();

// Public route (no auth needed)
router.get('/public', getPublicEvents);

// Admin/Marketing routes
router.get('/', getAllEvents);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router;