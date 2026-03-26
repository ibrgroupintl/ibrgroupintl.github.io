const express = require('express');
const router = express.Router();
const {
  listPeopleMoves, getPeopleMove, createPeopleMove, updatePeopleMove, deletePeopleMove,
} = require('../controllers/peopleMoveController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, listPeopleMoves);
router.get('/:id', authenticate, getPeopleMove);
router.post('/', authenticate, requireAdmin, createPeopleMove);
router.patch('/:id', authenticate, requireAdmin, updatePeopleMove);
router.delete('/:id', authenticate, requireAdmin, deletePeopleMove);

module.exports = router;
