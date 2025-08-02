const express = require('express');
const router = express.Router();
const TrainingTemplate = require('../models/TrainingTemplate');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// Get all training templates with filtering
router.get('/', protect, async (req, res) => {
  try {
    const { category, visibility, createdBy, tags, search, limit = 20, page = 1 } = req.query;
    const user = req.user;
    
    // Build filter query
    let filter = { isActive: true };
    
    // Visibility filter based on user permissions
    if (visibility) {
      filter.visibility = visibility;
    } else {
      // Default: show public templates and user's own templates and team templates
      filter.$or = [
        { visibility: 'public' },
        { createdBy: user._id },
        { visibility: 'team', teamId: { $in: user.teams || [] } }
      ];
    }
    
    if (category) filter.category = category;
    if (createdBy) filter.createdBy = createdBy;
    if (tags) filter.tags = { $in: tags.split(',') };
    
    // Search functionality
    if (search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      });
    }
    
    const skip = (page - 1) * limit;
    
    const templates = await TrainingTemplate.find(filter)
      .populate('createdBy', 'name email')
      .populate('teamId', 'name')
      .sort({ 'usage.rating': -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await TrainingTemplate.countDocuments(filter);
    
    res.json({
      templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Laden der Trainingsvorlagen', error: error.message });
  }
});

// Get single training template
router.get('/:id', protect, async (req, res) => {
  try {
    const template = await TrainingTemplate.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('teamId', 'name');
    
    if (!template) {
      return res.status(404).json({ message: 'Trainingsvorlage nicht gefunden' });
    }
    
    if (!template.canBeViewedBy(req.user)) {
      return res.status(403).json({ message: 'Keine Berechtigung für diese Vorlage' });
    }
    
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Laden der Trainingsvorlage', error: error.message });
  }
});

// Create new training template
router.post('/', protect, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      visibility = 'team',
      teamId,
      duration,
      phases,
      customizableParams,
      tags,
      targetLevel
    } = req.body;
    
    // Validation
    if (!name || !description || !category || !duration || !phases || !targetLevel) {
      return res.status(400).json({ 
        message: 'Pflichtfelder fehlen: Name, Beschreibung, Kategorie, Dauer, Phasen und Zielniveau sind erforderlich' 
      });
    }
    
    if (phases.length === 0) {
      return res.status(400).json({ message: 'Mindestens eine Trainingsphase ist erforderlich' });
    }
    
    // Check if user is trainer for creating templates
    if (req.user.role !== 'Trainer') {
      return res.status(403).json({ message: 'Nur Trainer können Trainingsvorlagen erstellen' });
    }
    
    const template = new TrainingTemplate({
      name,
      description,
      createdBy: req.user._id,
      category,
      visibility,
      teamId: visibility === 'team' ? teamId : undefined,
      duration,
      phases,
      customizableParams: customizableParams || [],
      tags: tags || [],
      targetLevel,
      usage: { count: 0, rating: 0, ratingCount: 0 }
    });
    
    await template.save();
    await template.populate('createdBy', 'name email');
    
    res.status(201).json({ message: 'Trainingsvorlage erfolgreich erstellt', template });
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Erstellen der Trainingsvorlage', error: error.message });
  }
});

// Update training template
router.put('/:id', protect, async (req, res) => {
  try {
    const template = await TrainingTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Trainingsvorlage nicht gefunden' });
    }
    
    if (!template.canBeEditedBy(req.user)) {
      return res.status(403).json({ message: 'Keine Berechtigung diese Vorlage zu bearbeiten' });
    }
    
    const updateFields = {
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      visibility: req.body.visibility,
      teamId: req.body.teamId,
      duration: req.body.duration,
      phases: req.body.phases,
      customizableParams: req.body.customizableParams,
      tags: req.body.tags,
      targetLevel: req.body.targetLevel
    };
    
    // Remove undefined fields
    Object.keys(updateFields).forEach(key => {
      if (updateFields[key] === undefined) {
        delete updateFields[key];
      }
    });
    
    // Increment version on content changes
    if (req.body.phases || req.body.customizableParams) {
      updateFields.version = template.version + 1;
    }
    
    const updatedTemplate = await TrainingTemplate.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');
    
    res.json({ message: 'Trainingsvorlage erfolgreich aktualisiert', template: updatedTemplate });
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Trainingsvorlage', error: error.message });
  }
});

// Clone training template
router.post('/:id/clone', protect, async (req, res) => {
  try {
    const originalTemplate = await TrainingTemplate.findById(req.params.id);
    
    if (!originalTemplate) {
      return res.status(404).json({ message: 'Trainingsvorlage nicht gefunden' });
    }
    
    if (!originalTemplate.canBeViewedBy(req.user)) {
      return res.status(403).json({ message: 'Keine Berechtigung für diese Vorlage' });
    }
    
    const { name, visibility = 'private', teamId } = req.body;
    
    // Increment usage count of original template
    await originalTemplate.incrementUsage();
    
    const clonedTemplate = new TrainingTemplate({
      name: name || `${originalTemplate.name} (Kopie)`,
      description: originalTemplate.description,
      createdBy: req.user._id,
      category: originalTemplate.category,
      visibility,
      teamId: visibility === 'team' ? teamId : undefined,
      duration: originalTemplate.duration,
      phases: originalTemplate.phases,
      customizableParams: originalTemplate.customizableParams,
      tags: originalTemplate.tags,
      targetLevel: originalTemplate.targetLevel,
      originalTemplate: originalTemplate._id,
      usage: { count: 0, rating: 0, ratingCount: 0 }
    });
    
    await clonedTemplate.save();
    await clonedTemplate.populate('createdBy', 'name email');
    
    res.status(201).json({ 
      message: 'Trainingsvorlage erfolgreich kopiert', 
      template: clonedTemplate 
    });
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Kopieren der Trainingsvorlage', error: error.message });
  }
});

// Rate training template
router.post('/:id/rate', protect, async (req, res) => {
  try {
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Bewertung muss zwischen 1 und 5 liegen' });
    }
    
    const template = await TrainingTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Trainingsvorlage nicht gefunden' });
    }
    
    if (!template.canBeViewedBy(req.user)) {
      return res.status(403).json({ message: 'Keine Berechtigung für diese Vorlage' });
    }
    
    await template.addRating(rating);
    
    res.json({ message: 'Bewertung erfolgreich hinzugefügt', averageRating: template.averageRating });
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Bewerten der Trainingsvorlage', error: error.message });
  }
});

// Delete training template (soft delete)
router.delete('/:id', protect, async (req, res) => {
  try {
    const template = await TrainingTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Trainingsvorlage nicht gefunden' });
    }
    
    if (!template.canBeEditedBy(req.user)) {
      return res.status(403).json({ message: 'Keine Berechtigung diese Vorlage zu löschen' });
    }
    
    template.isActive = false;
    await template.save();
    
    res.json({ message: 'Trainingsvorlage erfolgreich gelöscht' });
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Löschen der Trainingsvorlage', error: error.message });
  }
});

// Get template categories and statistics
router.get('/meta/categories', protect, async (req, res) => {
  try {
    const categories = await TrainingTemplate.distinct('category', { isActive: true });
    
    const stats = await TrainingTemplate.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$usage.rating' }
        }
      }
    ]);
    
    res.json({ categories, stats });
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Laden der Kategorien', error: error.message });
  }
});

module.exports = router;