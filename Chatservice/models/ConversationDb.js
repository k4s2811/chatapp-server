import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ["admin", "member"],
        default: "member"
    },
    lastReadMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const conversationSchema = new mongoose.Schema({
    isGroup: {
        type: Boolean,
        default: false
    },
    groupName: {
        type: String,
        required: function () { return this.isGroup; }
    },
    groupAvatar: {
        type: String,
        default: null
    },

    participants: [participantSchema],

    lastMessage: {
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
        content: String,
        senderId: String,
        createdAt: Date
    }
}, {
    timestamps: true
});

conversationSchema.index({ "participants.userId": 1, updatedAt: -1 });

export default mongoose.model("Conversation", conversationSchema);