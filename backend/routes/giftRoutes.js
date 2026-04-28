const express = require('express');
const router = express.Router();
const { unboxGift, getChildGifts } = require('../controllers/giftController');
const { protectChild } = require('../middlewares/authMiddleware');

router.post('/unbox', protectChild, unboxGift);
router.get('/list', protectChild, getChildGifts);

module.exports = router;
