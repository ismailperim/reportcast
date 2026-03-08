import { Router } from 'express';
import { db } from '../db/index.js';
import { reports } from '../db/schema.js';
import { authenticateUser } from '../middleware/auth.js';
import { eq, and, desc } from 'drizzle-orm';
import { getStorage } from '../storage/s3-storage.js';

const router = Router();

/**
 * GET /api/reports
 * 
 * List user's reports
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const userReports = await db
      .select()
      .from(reports)
      .where(eq(reports.userId, userId))
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      reports: userReports.map(r => ({
        id: r.id,
        filename: r.filename,
        pageCount: r.pageCount,
        tier: r.tier,
        status: r.status,
        audioUrl: r.audioUrl,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
      })),
      pagination: {
        limit,
        offset,
        hasMore: userReports.length === limit,
      },
    });
  } catch (error) {
    console.error('List reports error:', error);
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

/**
 * GET /api/reports/:reportId
 * 
 * Get report details and status
 */
router.get('/:reportId', authenticateUser, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user!.id;

    const [report] = await db
      .select()
      .from(reports)
      .where(and(
        eq(reports.id, reportId),
        eq(reports.userId, userId)
      ))
      .limit(1);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      id: report.id,
      filename: report.filename,
      pageCount: report.pageCount,
      tier: report.tier,
      status: report.status,
      audioUrl: report.audioUrl,
      audioSize: report.audioSize,
      audioDurationSeconds: report.audioDurationSeconds,
      processingTimeMs: report.processingTimeMs,
      aiCostCents: report.aiCostCents,
      ttsCostCents: report.ttsCostCents,
      errorMessage: report.errorMessage,
      createdAt: report.createdAt,
      completedAt: report.completedAt,
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

/**
 * GET /api/reports/:reportId/download
 * 
 * Download generated audio file
 */
router.get('/:reportId/download', authenticateUser, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user!.id;

    const [report] = await db
      .select()
      .from(reports)
      .where(and(
        eq(reports.id, reportId),
        eq(reports.userId, userId)
      ))
      .limit(1);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Report not ready',
        status: report.status,
      });
    }

    if (!report.s3Key) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Get file from S3 or local disk
    if (report.s3Key && process.env.S3_PROVIDER) {
      const storage = getStorage();
      const buffer = await storage.getBuffer(report.s3Key);

      const filename = `${report.filename.replace('.pdf', '')}.mp3`;
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      res.send(buffer);
    } else {
      // Serve from local disk
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join('/app/outputs', `${report.id}.mp3`);
      
      try {
        await fs.access(filePath);
        const filename = `${report.filename.replace('.pdf', '')}.mp3`;
        res.download(filePath, filename);
      } catch {
        return res.status(404).json({ error: 'Audio file not found on disk' });
      }
    }

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

/**
 * DELETE /api/reports/:reportId
 * 
 * Delete report and audio file
 */
router.delete('/:reportId', authenticateUser, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user!.id;

    const [report] = await db
      .select()
      .from(reports)
      .where(and(
        eq(reports.id, reportId),
        eq(reports.userId, userId)
      ))
      .limit(1);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Delete audio file from S3 or local disk
    if (report.s3Key && process.env.S3_PROVIDER) {
      const storage = getStorage();
      try {
        await storage.deleteFile(report.s3Key);
      } catch (error) {
        console.warn('Failed to delete audio file from S3:', error);
      }
    } else {
      // Delete from local disk
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join('/app/outputs', `${report.id}.mp3`);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn('Failed to delete local audio file:', error);
      }
    }

    // Delete from database
    await db.delete(reports).where(eq(reports.id, reportId));

    res.json({ message: 'Report deleted successfully' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
