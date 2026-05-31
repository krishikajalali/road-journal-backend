import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { getTripDays, getTodayISTString } from '../utils/tripDates';

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// GET /api/admin/overview - Full stats and timeline
router.get('/overview', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const todayIST = getTodayISTString();
    const tripDays = getTripDays();

    const entries = await prisma.journalEntry.findMany({
      orderBy: { dayNumber: 'asc' },
      select: {
        id: true,
        dayNumber: true,
        tripDate: true,
        title: true,
        description: true,
        imageUrl: true,
        uploadedAt: true,
      },
    });

    const entryMap = new Map(entries.map(e => [e.dayNumber, e]));

    const timeline = tripDays.map(day => {
      const entry = entryMap.get(day.dayNumber);
      let status: 'locked' | 'active' | 'completed' | 'missed';

      if (day.dateString === todayIST) {
        status = entry ? 'completed' : 'active';
      } else if (day.dateString < todayIST) {
        status = entry ? 'completed' : 'missed';
      } else {
        status = 'locked';
      }

      return {
        dayNumber: day.dayNumber,
        dateString: day.dateString,
        tripDate: day.tripDate,
        status,
        entry: entry || null,
      };
    });

    const pastDays = tripDays.filter(d => d.dateString <= todayIST);
    const completedCount = entries.length;
    const missedCount = pastDays.filter(d => !entryMap.has(d.dayNumber) && d.dateString < todayIST).length;
    const completionPercentage = pastDays.length > 0
      ? Math.round((completedCount / pastDays.length) * 100)
      : 0;

    res.json({
      timeline,
      stats: {
        totalDays: 15,
        completedCount,
        missedCount,
        remainingDays: tripDays.filter(d => d.dateString > todayIST).length,
        completionPercentage,
      },
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/gallery - All photos
router.get('/gallery', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const entries = await prisma.journalEntry.findMany({
      orderBy: { dayNumber: 'asc' },
      select: {
        id: true,
        dayNumber: true,
        tripDate: true,
        title: true,
        description: true,
        imageUrl: true,
        uploadedAt: true,
      },
    });

    res.json({ entries });
  } catch (error) {
    console.error('Gallery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
