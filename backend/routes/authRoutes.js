const express = require('express');
const { registerAdult, loginAdult, loginChild, getParentProfile, addChild, getChildProfile } = require('../controllers/authController');
const { protectParent, protectChild } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', registerAdult);
router.post('/login', loginAdult);
router.post('/child-login', loginChild);

// Protected routes for parent actions
router.get('/me', protectParent, getParentProfile);
router.post('/add-child', protectParent, addChild);
router.get('/child-me', protectChild, getChildProfile);

module.exports = router;