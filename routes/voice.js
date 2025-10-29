const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voice');

// @route   POST /api/voice/transcribe
// @desc    Convert speech to text using OpenAI Whisper
// @access  Public
router.post('/transcribe', voiceController.uploadAudio, voiceController.transcribeAudio);

// @route   POST /api/voice/speak
// @desc    Convert text to speech using OpenAI TTS
// @access  Public
router.post('/speak', voiceController.textToSpeech);

// @route   POST /api/voice/speak-enhanced
// @desc    Convert text to speech with voice selection
// @access  Public
router.post('/speak-enhanced', voiceController.enhancedTextToSpeech);

// @route   GET /api/voice/voices
// @desc    Get available voices for TTS
// @access  Public
router.get('/voices', voiceController.getVoices);

module.exports = router;
