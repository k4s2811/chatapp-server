// src/models/Message.js
import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["image", "video", "document", "audio"],
        required: true
    },
    url: {
        type: String,
        required: true
    },
    fileName: String,
    fileSize: Number
}, { _id: false });

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
        index: true
    },

    senderId: {
        type: String,
        required: true
    },
    content: {
        text: {
            type: String,
            default: ""
        },
        attachments: [attachmentSchema]
    },

    isDeleted: {
        type: Boolean,
        default: false
    },

    replyToMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null
    }
}, {
    timestamps: true
});

messageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);