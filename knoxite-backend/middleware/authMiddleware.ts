import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// This must be the EXACT SAME secret key you used in your auth.ts file!
const JWT_SECRET = "knoxite_super_secret_key_2026";

// We have to tell TypeScript that our requests will now carry a custom 'userId'
export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): any => {
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
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // 4. Attach the user's ID to the request. 
    // Now, every secure route will automatically know EXACTLY who is making the request!
    req.userId = decoded.userId;
    
    // 5. The token is valid. Open the door and let the request proceed to the route.
    next();
  } catch (error) {
    // If the token is expired or fake, block the door
    return res.status(403).json({ error: "Invalid or expired security token." });
  }
};