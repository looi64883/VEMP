import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: {
        type: mongoose.Schema.Types.String,
        required: true,
        unique: true,
    },

    email: {
        type: mongoose.Schema.Types.String,
        required: true,
        unique: true,
    },

    password: {
        type: mongoose.Schema.Types.String,
        required: true
    },

    organizationName: {
        type: mongoose.Schema.Types.String,
        required: true,
        unique: false,
    },

    contact: {
        type: mongoose.Schema.Types.String,
        default: '',
    },

    otpCode: {
        type: mongoose.Schema.Types.String,
        validate: {
            validator: function(v) {
                // Check if otpCode is null or a 6-digit numeric string
                return v === null || /^\d{6}$/.test(v);
            },
            message: props => `${props.value} is not a valid OTP code. OTP code must be a 6-digit number.`
        },
        default: null // Default value for otpCode
    }
});

export const User = mongoose.model('User', UserSchema);