// API Configuration for LaiLai
const API_CONFIG = {
  // Development: use local proxy in package.json
  // Production: use environment variable or default to localhost
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  
  // API endpoints
  ENDPOINTS: {
    HEALTH: '/health',
    UPLOAD: '/api/upload',
    PROCESS: '/api/process',
    EXPORT_FORMATS: '/api/video/export/formats',
    EXPORT: '/api/video/export',
    STATUS: '/api/video/export/status',
    DOWNLOAD: '/api/video/export/download'
  },
  
  // Request configuration
  TIMEOUT: 60000, // 60 seconds
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  
  // Supported file types
  SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/mov', 'video/avi', 'video/webm'],
  SUPPORTED_AUDIO_TYPES: ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac']
};

export default API_CONFIG;