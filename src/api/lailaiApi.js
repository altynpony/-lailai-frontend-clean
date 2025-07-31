import axios from 'axios';
import API_CONFIG from './config';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    console.log('Response data:', response.data);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to LaiLai API server. Please check if the backend is running.');
    }
    
    if (error.response?.status === 404) {
      throw new Error('API endpoint not found. Please check the backend configuration.');
    }
    
    if (error.response?.status >= 500) {
      const serverError = error.response?.data?.error || 'Server error occurred';
      throw new Error(`Server error (${error.response.status}): ${serverError}`);
    }
    
    throw error;
  }
);

export const lailaiApi = {
  // Health check
  async checkHealth() {
    const response = await api.get(API_CONFIG.ENDPOINTS.HEALTH);
    return response.data;
  },

  // Get supported export formats
  async getExportFormats() {
    const response = await api.get(API_CONFIG.ENDPOINTS.EXPORT_FORMATS);
    return response.data;
  },

  // Upload video file
  async uploadVideo(file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    };

    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      };
    }

    const response = await api.post(API_CONFIG.ENDPOINTS.UPLOAD, formData, config);
    return response.data;
  },

  // Process video with Whisper and PyAnnote
  async processVideo(filePath) {
    const requestData = {
      file_path: filePath
    };

    const response = await api.post(API_CONFIG.ENDPOINTS.PROCESS, requestData);
    return response.data;
  },

  // Export edited video
  async exportVideo(exportData) {
    const response = await api.post(API_CONFIG.ENDPOINTS.EXPORT, exportData);
    return response.data;
  },

  // Check export status
  async checkExportStatus(jobId) {
    const response = await api.get(`${API_CONFIG.ENDPOINTS.STATUS}/${jobId}`);
    return response.data;
  },

  // Download exported video
  async downloadVideo(jobId) {
    const response = await api.get(`${API_CONFIG.ENDPOINTS.DOWNLOAD}/${jobId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Validate file before upload
  validateFile(file) {
    const errors = [];

    // Check file size
    if (file.size > API_CONFIG.MAX_FILE_SIZE) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${API_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`);
    }

    // Check file type
    const isVideoSupported = API_CONFIG.SUPPORTED_VIDEO_TYPES.includes(file.type);
    const isAudioSupported = API_CONFIG.SUPPORTED_AUDIO_TYPES.includes(file.type);

    if (!isVideoSupported && !isAudioSupported) {
      errors.push(`File type ${file.type} is not supported. Supported formats: ${[...API_CONFIG.SUPPORTED_VIDEO_TYPES, ...API_CONFIG.SUPPORTED_AUDIO_TYPES].join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

export default lailaiApi;