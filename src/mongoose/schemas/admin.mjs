import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const AdminSchema = new mongoose.Schema({
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
    contact: {
        type: mongoose.Schema.Types.String,
        default: '',
    },
});

export const Admin = mongoose.model('Admin', AdminSchema);