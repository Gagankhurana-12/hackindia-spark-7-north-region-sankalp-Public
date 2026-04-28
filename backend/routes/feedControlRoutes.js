const express = require('express');
const { getThread, postMessage, addInterest, removeInterest } = require('../controllers/feedControlController');
const { protectParent } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/thread', protectParent, getThread);
router.post('/messages', protectParent, postMessage);
router.post('/interest', protectParent, addInterest);
router.delete('/interest', protectParent, removeInterest);

module.exports = router;
