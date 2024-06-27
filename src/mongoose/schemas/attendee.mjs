import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// Attendee Schema
const AttendeeSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    event: {
        type: Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['registered', 'checked-in', 'cancelled'],
        default: 'registered'
    }
},{
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

export const Attendee = mongoose.model('Attendee', AttendeeSchema);