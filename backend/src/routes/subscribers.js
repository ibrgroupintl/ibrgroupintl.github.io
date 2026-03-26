const express = require('express');
const router = express.Router();
const {
  listSubscribers, getSubscriber, createSubscriber, updateSubscriber, deleteSubscriber,
  substackWebhook, getStats,
} = require('../controllers/subscriberController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/stats', authenticate, requireAdmin, getStats);
router.get('/', authenticate, requireAdmin, listSubscribers);
router.get('/:id', authenticate, requireAdmin, getSubscriber);
router.post('/', authenticate, requireAdmin, createSubscriber);
router.patch('/:id', authenticate, requireAdmin, updateSubscriber);
router.delete('/:id', authenticate, requireAdmin, deleteSubscriber);
router.post('/webhook/substack', substackWebhook);

module.exports = router;
