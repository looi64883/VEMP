import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema({
    title: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    description: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    submitDate: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true,
    },
});

export const Feedback = mongoose.model('Feedback', FeedbackSchema);
