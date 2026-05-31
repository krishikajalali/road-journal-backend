import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../config/prisma';
import { upload } from '../config/cloudinary';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { getTripDays, getTodayISTString, isDayActive } from '../utils/tripDates';

const router = Router();

// POST /api/entries - Submit a journal entry
router.post(
  '/',
  authenticate,
  requireRole('TRAVELER'),
  (req: AuthRequest, res: Response, next: Function) => {
    upload.single('photo')(req as any, res as any, (err: any) => {
      if (err) {
        if (err.message === 'Only JPG, JPEG, and PNG files are allowed') {
          res.status(400).json({ error: err.message });
          return;
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'Image must be under 10MB' });
          return;
        }
        res.status(400).json({ error: err.message || 'Upload failed' });
        return;
      }
      next();
    });
  },
  [
    body('dayNumber')
      .isInt({ min: 1, max: 15 })
      .withMessage('Day number must be between 1 and 15'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 150 })
      .withMessage('Description must be 150 characters or less'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { dayNumber: dayNumberStr, title, description } = req.body;
    const dayNumber = parseInt(dayNumberStr);

    // Check photo was uploaded
    if (!(req as any).file) {
      res.status(400).json({ error: 'Photo is required' });
      return;
    }

    const imageUrl = (req as any).file.path;

    // Verify day is active (today in IST)
    if (!isDayActive(dayNumber)) {
      const todayIST = getTodayISTString();
      const tripDays = getTripDays();
      const day = tripDays.find(d => d.dayNumber === dayNumber);

      if (!day) {
        res.status(400).json({ error: 'Invalid day number' });
        return;
      }

      if (day.dateString > todayIST) {
        res.status(403).json({ error: 'This day has not started yet' });
        return;
      } else {
        res.status(403).json({ error: 'This day has already passed' });
        return;
      }
    }

    // Check for existing entry
    const existing = await prisma.journalEntry.findUnique({ where: { dayNumber } });
    if (existing) {
      res.status(409).json({ error: 'An entry already exists for this day' });
      return;
    }

    try {
      const tripDays = getTripDays();
      const day = tripDays.find(d => d.dayNumber === dayNumber)!;

      const entry = await prisma.journalEntry.create({
        data: {
          dayNumber,
          tripDate: day.tripDate,
          title: title.trim(),
          description: description.trim(),
          imageUrl,
          createdBy: req.user!.userId,
        },
      });

      res.status(201).json({
        message: 'Entry saved successfully',
        entry: {
          id: entry.id,
          dayNumber: entry.dayNumber,
          title: entry.title,
          description: entry.description,
          imageUrl: entry.imageUrl,
          uploadedAt: entry.uploadedAt,
        },
      });
    } catch (error: any) {
      // Unique constraint violation
      if (error.code === 'P2002') {
        res.status(409).json({ error: 'An entry already exists for this day' });
        return;
      }
      console.error('Create entry error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
