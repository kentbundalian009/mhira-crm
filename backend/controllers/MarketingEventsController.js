import Event from '../models/MarketingEvent.js';

// Get All Events (For Admin/Marketing)
export const getAllEvents = async (req, res) => {
    try {
        const events = await Event.find().sort({ eventDate: -1, createdAt: -1 }).lean().maxTimeMS(5000);
        return res.status(200).json(events || []);
    } catch (error) {
        console.error('Error fetching events:', error.message);
        return res.status(200).json([]);
    }
};

// Get Only Active/Published Events (For Public Page & Announcements)
export const getPublicEvents = async (req, res) => {
    try {
        const events = await Event.find({
            isPublished: { $ne: false },
            isArchived: { $ne: true }
        }).sort({ eventDate: 1 }).lean().maxTimeMS(5000);
        return res.status(200).json(events || []);
    } catch (error) {
        console.error('Error fetching public events:', error.message);
        return res.status(200).json([]);
    }
};

// Create New Event
export const createEvent = async (req, res) => {
    try {
        const newEvent = new Event(req.body);
        const savedEvent = await newEvent.save();
        return res.status(201).json(savedEvent);
    } catch (error) {
        console.error('Error creating event:', error.message);
        return res.status(400).json({ message: 'Error creating event', error: error.message });
    }
};

// Update Event
export const updateEvent = async (req, res) => {
    try {
        const { _id, id, createdAt, updatedAt, __v, ...updateData } = req.body;
        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        if (!updatedEvent) {
            return res.status(404).json({ message: 'Event not found' });
        }
        return res.status(200).json(updatedEvent);
    } catch (error) {
        console.error('Error updating event:', error.message);
        return res.status(400).json({ message: error.message || 'Error updating event', error: error.message });
    }
};

// Toggle Archive Event
export const toggleArchiveEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        event.isArchived = !event.isArchived;
        if (event.isArchived) {
            event.isPublished = false; // When archived, unpublish from storefront
        }
        await event.save();
        return res.status(200).json({
            message: event.isArchived ? 'Announcement moved to Archive Vault' : 'Announcement restored to Active Broadcasts',
            event
        });
    } catch (error) {
        console.error('Error toggling archive status:', error.message);
        return res.status(500).json({ message: 'Error updating archive status', error: error.message });
    }
};

// Delete Event
export const deleteEvent = async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        return res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error.message);
        return res.status(500).json({ message: 'Error deleting event', error: error.message });
    }
};
