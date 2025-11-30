import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { uploadEncryptedFile, downloadEncryptedFile } from "../controllers/fileController.js";

const router = express.Router();

router.post("/upload", authMiddleware, uploadEncryptedFile);
router.get("/download/:fileId", authMiddleware, downloadEncryptedFile);

export default router;
