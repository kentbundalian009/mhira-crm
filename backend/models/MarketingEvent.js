import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Event title is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Event description is required']
    },
    bannerImage: {
        type: String, // Store image URL / base64 / path
        default: ''
    },
    eventDate: {
        type: Date,
        default: Date.now
    },
    location: {
        type: String,
        default: 'Online / Main Store'
    },
    category: {
        type: String,
        default: 'Announcement'
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    isArchived: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// High-performance database query indexes
eventSchema.index({ isArchived: 1, isPublished: 1, eventDate: -1 });

const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
export default Event;
