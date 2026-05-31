import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getTripDays, getTodayISTString } from '../utils/tripDates';

const router = Router();

// GET /api/days - Get all days with their status
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const todayIST = getTodayISTString();
    const tripDays = getTripDays();

    // Fetch all entries
    const entries = await prisma.journalEntry.findMany({
      select: {
        dayNumber: true,
        title: true,
        description: true,
        imageUrl: true,
        uploadedAt: true,
        tripDate: true,
      },
    });

    const entryMap = new Map(entries.map(e => [e.dayNumber, e]));

    const days = tripDays.map(day => {
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
        tripDate: day.tripDate,
        dateString: day.dateString,
        status,
        entry: entry && (req.user?.role === 'ADMIN' || status === 'completed')
          ? {
              title: entry.title,
              description: entry.description,
              imageUrl: entry.imageUrl,
              uploadedAt: entry.uploadedAt,
            }
          : null,
      };
    });

    res.json({ days, todayIST });
  } catch (error) {
    console.error('Get days error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/days/:dayNumber - Get specific day
router.get('/:dayNumber', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const dayNumber = parseInt(req.params.dayNumber);

  if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 15) {
    res.status(400).json({ error: 'Invalid day number' });
    return;
  }

  try {
    const todayIST = getTodayISTString();
    const tripDays = getTripDays();
    const day = tripDays.find(d => d.dayNumber === dayNumber);

    if (!day) {
      res.status(404).json({ error: 'Day not found' });
      return;
    }

    const entry = await prisma.journalEntry.findUnique({
      where: { dayNumber },
      select: {
        dayNumber: true,
        title: true,
        description: true,
        imageUrl: true,
        uploadedAt: true,
        tripDate: true,
      },
    });

    let status: 'locked' | 'active' | 'completed' | 'missed';
    if (day.dateString === todayIST) {
      status = entry ? 'completed' : 'active';
    } else if (day.dateString < todayIST) {
      status = entry ? 'completed' : 'missed';
    } else {
      status = 'locked';
    }

    // Travelers can't access locked days
    if (req.user?.role === 'TRAVELER' && status === 'locked') {
      res.status(403).json({ error: 'This day is not yet unlocked' });
      return;
    }

    res.json({
      dayNumber: day.dayNumber,
      tripDate: day.tripDate,
      dateString: day.dateString,
      status,
      entry: entry || null,
    });
  } catch (error) {
    console.error('Get day error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
