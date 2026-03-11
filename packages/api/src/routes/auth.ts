import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production';
const JWT_EXPIRES_IN = '7d';

/**
 * POST /api/auth/register
 * 
 * Register new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'validation_error',
        message: 'Email and password required' 
      });
    }

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return res.status(409).json({ 
        error: 'user_exists',
        message: 'User already exists' 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash,
        provider: 'email',
        plan: 'free',
        creditsRemaining: 15, // Free tier: 15 credits (Phase 3 pricing)
      })
      .returning();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        plan: user.plan,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        creditsRemaining: user.creditsRemaining,
      },
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Registration failed. Please try again.' 
    });
  }
});

/**
 * POST /api/auth/login
 * 
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'validation_error',
        message: 'Email and password required' 
      });
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.passwordHash) {
      return res.status(401).json({ 
        error: 'invalid_credentials',
        message: 'Invalid email or password' 
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ 
        error: 'invalid_credentials',
        message: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        plan: user.plan,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        creditsRemaining: user.creditsRemaining,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Login failed. Please try again.' 
    });
  }
});

/**
 * GET /api/auth/me
 * 
 * Get current user (requires Bearer token)
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'no_token',
        message: 'No token provided' 
      });
    }

    const token = authHeader.substring(7);

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return res.status(401).json({ 
        error: 'invalid_token',
        message: 'Invalid or expired token' 
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ 
        error: 'user_not_found',
        message: 'User not found' 
      });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      creditsRemaining: user.creditsRemaining,
      createdAt: user.createdAt,
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Failed to get user. Please try again.' 
    });
  }
});

export default router;
