const express = require('express');
const router = express.Router();
const {
  listInsights, getInsight, createInsight, updateInsight, deleteInsight,
} = require('../controllers/insightController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, listInsights);
router.get('/:id', authenticate, getInsight);
router.post('/', authenticate, requireAdmin, createInsight);
router.patch('/:id', authenticate, requireAdmin, updateInsight);
router.delete('/:id', authenticate, requireAdmin, deleteInsight);

module.exports = router;
