"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// This must be the EXACT SAME secret key you used in your auth.ts file!
const JWT_SECRET = "knoxite_super_secret_key_2026";
const authenticateToken = (req, res, next) => {
    // 1. Look for the "Authorization" header in the incoming request
    const authHeader = req.header("Authorization");
    // The frontend will send the token like this: "Bearer eyJhbGciOiJIUzI1..."
    // We use .split(" ")[1] to grab just the token part
    const token = authHeader?.split(" ")[1];
    // 2. If the token is missing, the guard blocks the door
    if (!token) {
        return res.status(401).json({ error: "Access Denied. No security token provided." });
    }
    // 3. If the token exists, verify it hasn't been tampered with
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // 4. Attach the user's ID to the request. 
        // Now, every secure route will automatically know EXACTLY who is making the request!
        req.userId = decoded.userId;
        // 5. The token is valid. Open the door and let the request proceed to the route.
        next();
    }
    catch (error) {
        // If the token is expired or fake, block the door
        return res.status(403).json({ error: "Invalid or expired security token." });
    }
};
exports.authenticateToken = authenticateToken;
