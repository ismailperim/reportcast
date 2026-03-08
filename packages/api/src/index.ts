import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { checkDatabaseConnection } from './db/index.js';
import { runMigrationsIfNeeded } from './db/auto-migrate.js';
import { initializeStorage } from './storage/s3-storage.js';
import uploadRouter from './routes/upload.js';
import reportsRouter from './routes/reports.js';
import authRouter from './routes/auth.js';
import shareRouter from './routes/share.js';
import adminRouter from './routes/admin.js';
import paymentsRouter from './routes/payments.js';
import pricingRouter from './routes/pricing.js';
import { getDeploymentConfig } from './config/deployment.js';

// Load environment variables
config();

// Get version from VERSION file
const VERSION = readFileSync('../../VERSION', 'utf-8').trim();

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

// Middleware
app.use(cors());

// Stripe webhook needs raw body
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// JSON parsing for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseConnection();
  const deploymentConfig = getDeploymentConfig();
  
  res.json({
    status: dbHealth.healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: dbHealth,
    version: VERSION,
    nodeEnv: process.env.NODE_ENV || 'development',
    deployment: {
      mode: deploymentConfig.mode,
      features: deploymentConfig.features,
    },
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/share', shareRouter);
app.use('/api/admin', adminRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/pricing', pricingRouter);

// Public routes (no /api prefix)
app.use('/listen', shareRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
async function startServer() {
  try {
    // Run database migrations first
    await runMigrationsIfNeeded();

    // Initialize S3 storage (if configured)
    if (process.env.S3_PROVIDER) {
      await initializeStorage();
    } else {
      console.log('💾 Storage: local disk (S3 disabled)');
    }

    // Then start server
    app.listen(PORT, '0.0.0.0', () => {
      const deploymentConfig = getDeploymentConfig();
      
      console.log(`🚀 ReportCast API v${VERSION} listening on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🏢 Deployment: ${deploymentConfig.mode.toUpperCase()}`);
      console.log(`💾 Storage: ${process.env.S3_PROVIDER || 'local'}`);
      
      if (deploymentConfig.mode === 'on-premise') {
        console.log('✨ On-Premise Mode: All features free, no limits');
      } else {
        console.log('💳 SaaS Mode: Pricing & payments enabled');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
