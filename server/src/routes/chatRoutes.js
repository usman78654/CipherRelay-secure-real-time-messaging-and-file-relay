import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { sendMessage, getMessages } from "../controllers/messageController.js";

const router = express.Router();

router.post("/send", authMiddleware, sendMessage);
router.get("/:chatId", authMiddleware, getMessages);

// Report that a client failed to decrypt a message (client-side only)
router.post("/report-decrypt-failure", authMiddleware, async (req, res) => {
	try {
		const { messageId, reason } = req.body;
		const { logEvent } = await import("../services/logger.js");
		await logEvent("failed-decryption", { messageId, reason, reporter: req.user ? req.user.id : null }, req.user ? req.user.id : null);
		res.json({ message: "Report logged." });
	} catch (err) {
		res.status(500).json({ error: "Failed to report decrypt failure." });
	}
});

export default router;
