import express from "express";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";
import connectDB from "./config/db.js";
import config from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import keyExchangeRoutes from "./routes/keyExchangerputes.js";
import auditRoutes from "./routes/auditRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Connect to DB unless tests or explicit env disables it.
if (process.env.SKIP_DB !== '1') {
	connectDB();
} else {
	console.log('SKIP_DB set, skipping MongoDB connection (test mode).');
}

app.use(helmet());
app.use(cors());
// Capture raw body for better JSON parse error diagnostics
app.use(bodyParser.json({
	limit: '10mb',
	verify: (req, _res, buf) => {
		try {
			req.rawBody = buf.toString();
		} catch (e) {
			req.rawBody = undefined;
		}
	}
}));

app.use(bodyParser.urlencoded({
	extended: true,
	verify: (req, _res, buf) => {
		try {
			req.rawBody = buf.toString();
		} catch (e) {
			req.rawBody = undefined;
		}
	}
}));

app.get("/", (req, res) => res.json({ message: "Secure Chat Server running" }));

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/key-exchange", keyExchangeRoutes);
app.use("/api/audit", auditRoutes);

// Error handler
app.use(errorHandler);

export default app;
