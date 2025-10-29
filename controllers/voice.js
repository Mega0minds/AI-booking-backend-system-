const OpenAI = require('openai');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/audio');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `audio-${uniqueSuffix}.webm`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// @desc    Convert speech to text using OpenAI Whisper
// @route   POST /api/voice/transcribe
// @access  Public
exports.transcribeAudio = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided'
      });
    }

    console.log('Transcribing audio file:', req.file.filename);

    // Create a readable stream from the uploaded file
    const audioFile = fs.createReadStream(req.file.path);

    // Use OpenAI Whisper API to transcribe the audio
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en", // You can make this dynamic based on user preference
      response_format: "text"
    });

    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      transcription: transcription.trim()
    });

  } catch (error) {
    console.error('Error transcribing audio:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to transcribe audio',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Convert text to speech using OpenAI TTS
// @route   POST /api/voice/speak
// @access  Public
exports.textToSpeech = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }

    console.log('Converting text to speech:', text.substring(0, 50) + '...');

    // Use OpenAI TTS API to convert text to speech
    const mp3 = await openai.audio.speech.create({
      model: "tts-1", // You can use "tts-1-hd" for higher quality
      voice: "alloy", // Options: alloy, echo, fable, onyx, nova, shimmer
      input: text,
      response_format: "mp3"
    });

    // Convert the response to a buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Set appropriate headers for audio response
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache'
    });

    // Send the audio buffer
    res.send(buffer);

  } catch (error) {
    console.error('Error converting text to speech:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to convert text to speech',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get available voices for TTS
// @route   GET /api/voice/voices
// @access  Public
exports.getVoices = async (req, res, next) => {
  try {
    const voices = [
      { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced voice' },
      { id: 'echo', name: 'Echo', description: 'Clear, confident voice' },
      { id: 'fable', name: 'Fable', description: 'Warm, storytelling voice' },
      { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative voice' },
      { id: 'nova', name: 'Nova', description: 'Bright, energetic voice' },
      { id: 'shimmer', name: 'Shimmer', description: 'Soft, gentle voice' }
    ];

    res.status(200).json({
      success: true,
      voices: voices
    });

  } catch (error) {
    console.error('Error getting voices:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get available voices',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Enhanced text to speech with voice selection
// @route   POST /api/voice/speak-enhanced
// @access  Public
exports.enhancedTextToSpeech = async (req, res, next) => {
  try {
    const { text, voice = 'alloy', speed = 1.0 } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }

    console.log('Converting text to speech with voice:', voice);

    // Use OpenAI TTS API with selected voice
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd", // Higher quality
      voice: voice,
      input: text,
      response_format: "mp3"
    });

    // Convert the response to a buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Set appropriate headers for audio response
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache'
    });

    // Send the audio buffer
    res.send(buffer);

  } catch (error) {
    console.error('Error with enhanced text to speech:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to convert text to speech',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export multer middleware for use in routes
exports.uploadAudio = upload.single('audio');

module.exports = {
  transcribeAudio: exports.transcribeAudio,
  textToSpeech: exports.textToSpeech,
  getVoices: exports.getVoices,
  enhancedTextToSpeech: exports.enhancedTextToSpeech,
  uploadAudio: exports.uploadAudio
};
