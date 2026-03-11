import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        plan: string;
        creditsRemaining: number;
        isAdmin?: boolean;
      };
    }
  }
}

export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    // Try header first (Bearer token)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Fallback to query parameter (for download links)
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      plan: user.plan,
      creditsRemaining: user.creditsRemaining,
      isAdmin: user.plan === 'admin', // Simple admin check
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (!req.user.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

// Alias for consistency
export const authenticate = authenticateUser;
