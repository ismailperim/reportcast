import { Router } from 'express';
import { db } from '../db/index.js';
import { reports, listens } from '../db/schema.js';
import { authenticateUser } from '../middleware/auth.js';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { getStorage } from '../storage/s3-storage.js';

const router = Router();

/**
 * POST /api/share/:reportId
 * 
 * Enable public sharing for a report (generate share token)
 */
router.post('/:reportId', authenticateUser, async (req, res) => {
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
      return res.status(400).json({ error: 'Report not ready for sharing' });
    }

    // Generate share token if not exists
    let shareToken = report.shareToken;
    if (!shareToken) {
      shareToken = crypto.randomBytes(16).toString('hex');
    }

    // Update report
    await db
      .update(reports)
      .set({
        shareToken,
        isPublic: true,
      })
      .where(eq(reports.id, reportId));

    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/listen/${shareToken}`;

    res.json({
      shareToken,
      shareUrl,
      message: 'Public sharing enabled',
    });

  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: 'Failed to enable sharing' });
  }
});

/**
 * DELETE /api/share/:reportId
 * 
 * Disable public sharing
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

    // Disable sharing
    await db
      .update(reports)
      .set({ isPublic: false })
      .where(eq(reports.id, reportId));

    res.json({ message: 'Public sharing disabled' });

  } catch (error) {
    console.error('Unshare error:', error);
    res.status(500).json({ error: 'Failed to disable sharing' });
  }
});

/**
 * GET /api/share/:reportId/stats
 * 
 * Get listen statistics for a report
 */
router.get('/:reportId/stats', authenticateUser, async (req, res) => {
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

    // Get listen events
    const recentListens = await db
      .select()
      .from(listens)
      .where(eq(listens.reportId, reportId))
      .orderBy(desc(listens.listenedAt))
      .limit(100);

    // Aggregate stats
    const stats = {
      totalListens: report.listenCount || 0,
      lastListenedAt: report.lastListenedAt,
      isPublic: report.isPublic,
      shareToken: report.shareToken,
      recentListens: recentListens.map(l => ({
        listenedAt: l.listenedAt,
        ipAddress: l.ipAddress?.replace(/\.\d+$/, '.***'), // Mask last octet
        country: l.country,
        city: l.city,
      })),
    };

    res.json(stats);

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /listen/:shareToken
 * 
 * Public endpoint: Stream/download audio by share token (no auth required)
 */
router.get('/listen/:shareToken', async (req, res) => {
  try {
    const { shareToken } = req.params;
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || req.headers['referrer'] || '';
    const ipAddress = req.ip || req.socket.remoteAddress || '';

    // Get report by share token
    const [report] = await db
      .select()
      .from(reports)
      .where(and(
        eq(reports.shareToken, shareToken),
        eq(reports.isPublic, true)
      ))
      .limit(1);

    if (!report) {
      return res.status(404).json({ error: 'Podcast not found or not public' });
    }

    if (report.status !== 'completed') {
      return res.status(400).json({ error: 'Podcast not ready' });
    }

    if (!report.s3Key) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Track listen event (async, don't block response)
    db.insert(listens)
      .values({
        reportId: report.id,
        ipAddress,
        userAgent,
        referer,
        // TODO: GeoIP lookup for country/city
      })
      .then(async () => {
        // Update listen count
        await db
          .update(reports)
          .set({
            listenCount: (report.listenCount || 0) + 1,
            lastListenedAt: new Date(),
          })
          .where(eq(reports.id, report.id));
      })
      .catch(err => console.error('Failed to track listen:', err));

    // Get file from S3 or local disk
    if (report.s3Key && process.env.S3_PROVIDER) {
      const storage = getStorage();
      const buffer = await storage.getBuffer(report.s3Key);

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `inline; filename="${report.filename.replace('.pdf', '')}.mp3"`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000');

      res.send(buffer);
    } else {
      // Serve from local disk
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join('/app/outputs', `${report.id}.mp3`);
      
      try {
        const buffer = await fs.readFile(filePath);
        const filename = `${report.filename.replace('.pdf', '')}.mp3`;
        
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=31536000');

        res.send(buffer);
      } catch {
        return res.status(404).json({ error: 'Audio file not found on disk' });
      }
    }

  } catch (error) {
    console.error('Listen error:', error);
    res.status(500).json({ error: 'Failed to stream audio' });
  }
});

export default router;
