import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { initiate, respond, confirm } from "../controllers/keyExchangeController.js";

const router = express.Router();

router.post("/initiate", authMiddleware, initiate);
router.post("/respond", authMiddleware, respond);
router.post("/confirm", authMiddleware, confirm);

export default router;
