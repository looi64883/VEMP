import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// Budget Schema
const BudgetSchema = new Schema({
    item: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    }
}, { timestamps: true });

// Event Schema
const EventSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['conference', 'virtual', 'exhibit', 'webinar', 'other'],
        required: true
    },
    start: {
        type: Date,
        required: true
    },
    end: {
        type: Date,
        required: true
    },
    coverImage: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    budget: [BudgetSchema],
    registrationLimit: {
        type: Number,
        default: null
    },
    unlimitedRegistration: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: { 
        type: String, enum: ['live', 'draft', 'completed'], 
        default: 'live' 
    },
    welcomeHeadline: {
        type: String,
        default: "Welcome to our Virtual Event Lobby",
    },
    briefIntro: {
        type: String,
        default: "Here is the place where you interact with other attendees, watch sessions live."
    },
    eventLobbyCoverImage: {
        type: String,
    },
    eventLogo: {
        type: String,
    },
}, { timestamps: true });

export const Budget = mongoose.model('Budget', BudgetSchema);
export const Event = mongoose.model('Event', EventSchema);