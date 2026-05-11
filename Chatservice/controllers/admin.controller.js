import Conversation from "../models/ConversationDb.js"; 
import Message from "../models/MessageDb.js";         

export const clearAllDatabaseData = async (req, res) => {
    try {
        await Promise.all([
            Conversation.deleteMany({}),
            Message.deleteMany({})
        ]);

        return res.status(200).json({
            success: true,
            message: "Successfully deleted all conversations and messages from the database."
        });

    } catch (error) {
        console.error("Error wiping database:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while attempting to delete database data.",
            error: error.message
        });
    }
};