const express = require('express');
const { protectChild } = require('../middlewares/authMiddleware');
const {
  chatWithMentor,
  getConversationHistory,
  resetConversationHistory,
  startVoiceSession,
  saveVoiceTranscript,
  synthesizeText,
} = require('../controllers/mentorController');

const router = express.Router();

router.use(protectChild);

router.post('/chat', chatWithMentor);
router.get('/history', getConversationHistory);
router.post('/history/reset', resetConversationHistory);
router.post('/synthesize', synthesizeText);

// Ultravox Real-time Session Routes
router.get('/session', startVoiceSession);
router.post('/session/save', saveVoiceTranscript);

module.exports = router;
