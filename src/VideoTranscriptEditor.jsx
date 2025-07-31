import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, Trash2, Download, Settings, User, CreditCard, FileText, MessageSquare, Clock, Volume2, Edit3, Save, Filter, SortAsc, SortDesc, Folder, File, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import lailaiApi from './api/lailaiApi';

const VideoTranscriptEditor = () => {
  const [currentScreen, setCurrentScreen] = useState('upload'); // 'upload', 'editor', 'account'
  const [files, setFiles] = useState([]);
  const [processingFiles, setProcessingFiles] = useState([]);
  const [transcriptData, setTranscriptData] = useState([]);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [sortBy, setSortBy] = useState('time');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('sentences'); // 'words', 'sentences'
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [showTopics, setShowTopics] = useState(false);
  const [user, setUser] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('video'); // 'video', 'xml', 'srt', 'json'
  const [exportSettings, setExportSettings] = useState({
    includeTransitions: true,
    fadeInOut: true,
    removeGaps: true,
    exportQuality: 'high',
    outputFormat: 'mp4'
  });
  const [apiError, setApiError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Mock transcript data with extended timecodes and more speakers
  const mockTranscript = [
    {
      id: 1,
      text: "Welcome to our presentation about artificial intelligence.",
      start: 0.5,
      end: 4.2,
      speaker: "S1",
      speakerName: "John Smith",
      confidence: 0.95,
      topic: "Introduction"
    },
    {
      id: 2,
      text: "Today we'll explore machine learning applications.",
      start: 4.5,
      end: 8.1,
      speaker: "S1",
      speakerName: "John Smith",
      confidence: 0.92,
      topic: "Introduction"
    },
    {
      id: 3,
      text: "Can you tell us more about neural networks?",
      start: 8.5,
      end: 11.3,
      speaker: "S2",
      speakerName: "Sarah Wilson",
      confidence: 0.88,
      topic: "Technical Discussion"
    },
    {
      id: 4,
      text: "Neural networks are inspired by biological brain structures.",
      start: 11.8,
      end: 15.6,
      speaker: "S1",
      speakerName: "John Smith",
      confidence: 0.94,
      topic: "Technical Discussion"
    },
    {
      id: 5,
      text: "They consist of interconnected nodes that process information.",
      start: 16.0,
      end: 19.8,
      speaker: "S1",
      speakerName: "John Smith",
      confidence: 0.91,
      topic: "Technical Discussion"
    },
    {
      id: 6,
      text: "What about deep learning frameworks like TensorFlow?",
      start: 20.2,
      end: 23.7,
      speaker: "S3",
      speakerName: "Mike Johnson",
      confidence: 0.89,
      topic: "Technical Discussion"
    },
    {
      id: 7,
      text: "TensorFlow is one of the most popular frameworks for machine learning.",
      start: 24.1,
      end: 28.4,
      speaker: "S1",
      speakerName: "John Smith",
      confidence: 0.93,
      topic: "Technical Discussion"
    },
    {
      id: 8,
      text: "It provides both high-level and low-level APIs for developers.",
      start: 28.8,
      end: 32.5,
      speaker: "S1",
      speakerName: "John Smith",
      confidence: 0.96,
      topic: "Technical Discussion"
    }
  ];

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = (uploadedFiles) => {
    const newFiles = Array.from(uploadedFiles).map((file, index) => ({
      id: Date.now() + index,
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      status: 'uploaded'
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setApiError(null);
    
    try {
      // Process the first file for now (you can extend this for multiple files)
      const file = files[0];
      
      // Update UI to show upload progress
      setProcessingFiles([{ ...file, status: 'uploading', progress: 0 }]);
      
      // Step 1: Upload file to backend
      console.log('📤 Uploading file:', file.name);
      const uploadResult = await lailaiApi.uploadVideo(file.file, (progress) => {
        setProcessingFiles([{ ...file, status: 'uploading', progress: Math.round(progress) }]);
      });
      
      if (!uploadResult.success) {
        throw new Error('Upload failed');
      }
      
      // Step 2: Process with AI
      console.log('🤖 Processing with AI:', uploadResult.file_path);
      setProcessingFiles([{ ...file, status: 'processing', progress: 0 }]);
      
      const processResult = await lailaiApi.processVideo(uploadResult.file_path);
      
      // Detailed logging for debugging
      console.log('🔍 Full API Response:', processResult);
      console.log('🔍 Response type:', typeof processResult);
      console.log('🔍 Response keys:', Object.keys(processResult || {}));
      console.log('🔍 Success field:', processResult?.success);
      console.log('🔍 Error field:', processResult?.error);
      console.log('🔍 Transcript field:', processResult?.transcript);
      
      if (processResult?.success === false) {
        throw new Error('Processing failed: ' + (processResult.error || 'Unknown error'));
      }
      
      if (!processResult || (!processResult.transcript && !processResult.success)) {
        throw new Error('Invalid response from server: ' + JSON.stringify(processResult));
      }
      
      // Step 3: Update UI with real results
      const transcriptData = processResult.transcript || processResult || [];
      console.log('✅ Processing complete. Transcript data:', transcriptData);
      console.log('📊 Transcript array length:', Array.isArray(transcriptData) ? transcriptData.length : 'Not an array');
      
      setProcessingFiles([{ ...file, status: 'completed', progress: 100 }]);
      
      // Set the real transcript data from AI
      setTranscriptData(transcriptData);
      setCurrentScreen('editor');
      
    } catch (error) {
      console.error('❌ Processing error:', error);
      setApiError(error.message);
      setProcessingFiles(prev => 
        prev.map(f => ({ ...f, status: 'failed', progress: 0 }))
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    handleFileUpload(droppedFiles);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seekToTime = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleTimelineChange = (e) => {
    const newTime = parseFloat(e.target.value);
    seekToTime(newTime);
  };

  const deleteSelectedItems = () => {
    if (viewMode === 'sentences') {
      setTranscriptData(prev => prev.filter(item => !selectedItems.has(item.id)));
      setSelectedItems(new Set());
    } else {
      // Word-level deletion - remove selected words from segments
      setTranscriptData(prev => prev.map(segment => {
        if (segment.words && segment.words.length > 0) {
          const remainingWords = segment.words.filter(word => !selectedWords.has(`${segment.id}-${word.start}`));
          return {
            ...segment,
            words: remainingWords,
            text: remainingWords.map(w => w.word).join(' ')
          };
        }
        return segment;
      }).filter(segment => segment.words && segment.words.length > 0));
      setSelectedWords(new Set());
    }
  };

  const toggleItemSelection = (id) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleWordSelection = (segmentId, wordStart) => {
    const wordId = `${segmentId}-${wordStart}`;
    setSelectedWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };

  const getSpeakerColor = (speaker) => {
    const colors = {
      'SPEAKER_00': { bg: 'rgba(174, 109, 240, 0.2)', color: '#7c3aed' },
      'SPEAKER_01': { bg: 'rgba(175, 240, 109, 0.2)', color: '#65a30d' },
      'SPEAKER_02': { bg: 'rgba(109, 240, 240, 0.2)', color: '#0891b2' },
      'unknown': { bg: 'rgba(128, 128, 128, 0.2)', color: '#6b7280' }
    };
    return colors[speaker] || colors['unknown'];
  };

  // Render word-level view
  const renderWordView = () => {
    if (!transcriptData || transcriptData.length === 0) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          No transcript data available
        </div>
      );
    }

    return (
      <div style={{ padding: '20px', maxHeight: '500px', overflowY: 'auto' }}>
        {transcriptData.map((segment) => (
          <div key={segment.id} style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: selectedItems.has(segment.id) ? 'rgba(174, 109, 240, 0.1)' : '#f9f9f9',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <div className="flex items-center gap-3" style={{ marginBottom: '10px' }}>
              <input
                type="checkbox"
                checked={selectedItems.has(segment.id)}
                onChange={() => toggleItemSelection(segment.id)}
                style={{ accentColor: '#ae6df0' }}
              />
              <button
                onClick={() => seekToTime(segment.start)}
                style={{
                  color: '#ae6df0',
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {formatTime(segment.start)} → {formatTime(segment.end)}
              </button>
              <span style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '400',
                ...getSpeakerColor(segment.speaker)
              }}>
                {segment.speaker}
              </span>
            </div>
            
            <div style={{ lineHeight: '2', fontSize: '16px' }}>
              {segment.words && segment.words.length > 0 ? (
                segment.words.map((word, wordIndex) => {
                  const wordId = `${segment.id}-${word.start}`;
                  const isSelected = selectedWords.has(wordId);
                  const speakerColors = getSpeakerColor(word.speaker || segment.speaker);
                  
                  return (
                    <span
                      key={`${segment.id}-${wordIndex}`}
                      onClick={() => toggleWordSelection(segment.id, word.start)}
                      style={{
                        display: 'inline-block',
                        margin: '2px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        backgroundColor: isSelected ? '#ef4444' : speakerColors.bg,
                        color: isSelected ? 'white' : speakerColors.color,
                        border: isSelected ? '1px solid #dc2626' : '1px solid transparent',
                        transition: 'all 0.2s ease'
                      }}
                      title={`${formatTime(word.start)} - ${formatTime(word.end)} (${word.speaker || segment.speaker})`}
                    >
                      {word.word}
                    </span>
                  );
                })
              ) : (
                // Fallback for segments without word data
                <span style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: getSpeakerColor(segment.speaker).bg,
                  color: getSpeakerColor(segment.speaker).color
                }}>
                  {segment.text}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const exportVideo = (format = 'video') => {
    setExportFormat(format);
    setShowExportModal(true);
  };

  const handleExport = () => {
    const exportData = transcriptData.filter(item => !selectedItems.has(item.id));
    
    if (exportFormat === 'video') {
      console.log('Exporting edited video with segments:', exportData);
      console.log('Export settings:', exportSettings);
      alert('Video export started! Your edited video will be ready shortly.');
    } else if (exportFormat === 'xml') {
      const xmlContent = generateFinalCutXML(exportData);
      downloadFile(xmlContent, 'project.fcpxml', 'application/xml');
    } else if (exportFormat === 'srt') {
      const srtContent = generateSRT(exportData);
      downloadFile(srtContent, 'subtitles.srt', 'text/plain');
    } else if (exportFormat === 'json') {
      const jsonContent = JSON.stringify(exportData, null, 2);
      downloadFile(jsonContent, 'transcript.json', 'application/json');
    }
    
    setShowExportModal(false);
  };

  const generateFinalCutXML = (segments) => {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.10">
  <resources>
    <format id="r1" name="FFVideoFormat1080p30" frameDuration="1001/30000s" width="1920" height="1080" colorSpace="1-1-1 (Rec. 709)"/>
    <asset id="r2" name="source_video" uid="source_video_uid" start="0s" hasVideo="1" format="r1" hasAudio="1" audioSources="1" audioChannels="2" audioRate="48000">
      <media-rep kind="original-media" sig="source_video_signature"/>
    </asset>
  </resources>
  
  <library location="file:///Users/user/Movies/">
    <event name="LaiLai_Export_${new Date().toISOString().split('T')[0]}">
      <project name="LaiLai_Edited_Video">
        <sequence format="r1" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">
          <spine>`;

    const xmlSegments = segments.map((segment, index) => {
      const duration = segment.end - segment.start;
      return `
            <clip name="segment_${index + 1}" offset="${segment.start}s" duration="${duration}s" start="0s" format="r1">
              <asset-clip ref="r2" offset="${segment.start}s" duration="${duration}s" start="${segment.start}s" format="r1"/>
              <note>Speaker: ${segment.speaker} - ${segment.text}</note>
            </clip>`;
    }).join('');

    const xmlFooter = `
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;

    return xmlHeader + xmlSegments + xmlFooter;
  };

  const generateSRT = (segments) => {
    return segments.map((segment, index) => {
      const startTime = formatSRTTime(segment.start);
      const endTime = formatSRTTime(segment.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n[${segment.speaker}] ${segment.text}\n`;
    }).join('\n');
  };

  const formatSRTTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const sortTranscript = (field) => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(field);
    setSortOrder(newOrder);
    
    setTranscriptData(prev => [...prev].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      
      if (field === 'start' || field === 'end') {
        return newOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return newOrder === 'asc' 
        ? aVal.toString().localeCompare(bVal.toString())
        : bVal.toString().localeCompare(aVal.toString());
    }));
  };

  // Upload Screen Component
  const UploadScreen = () => (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@200;300;400;500&display=swap');
          
          body {
            font-family: 'Montserrat', sans-serif !important;
          }
          
          .hover-purple:hover {
            background-color: rgba(174, 109, 240, 0.1) !important;
            transition: background-color 0.3s ease;
          }
          
          .card-shadow {
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          
          .btn-primary {
            background-color: #ae6df0;
            border: none;
            transition: all 0.3s ease;
          }
          
          .btn-primary:hover {
            background-color: #9654e8;
            transform: translateY(-1px);
          }
          
          .btn-secondary {
            background-color: #aff06d;
            color: #333;
            border: none;
            transition: all 0.3s ease;
          }
          
          .btn-secondary:hover {
            background-color: #9de654;
            transform: translateY(-1px);
          }
        `}
      </style>
      
      <div style={{ 
        minHeight: '100vh',
        fontFamily: '"Montserrat", sans-serif',
        backgroundColor: '#f9f9f9',
        color: '#333'
      }}>
        <nav className="bg-white card-shadow" style={{ padding: '20px 40px', borderBottom: '1px solid #e0e0e0' }}>
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '200', 
              color: '#333',
              margin: 0
            }}>
              LaiLai Video Editor
            </h1>
            <button
              onClick={() => setCurrentScreen('account')}
              className="flex items-center gap-2 hover-purple"
              style={{ 
                padding: '12px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                fontWeight: '300',
                cursor: 'pointer'
              }}
            >
              <User size={20} />
              Account
            </button>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto" style={{ padding: '60px 40px' }}>
          <div className="text-center" style={{ marginBottom: '60px' }}>
            <h2 style={{ 
              fontSize: '42px', 
              fontWeight: '200', 
              color: '#333', 
              marginBottom: '20px',
              lineHeight: '1.2'
            }}>
              AI-Powered Video Transcription & Editing
            </h2>
            <p style={{ 
              fontSize: '20px', 
              fontWeight: '300', 
              color: '#666', 
              marginBottom: '0',
              lineHeight: '1.4'
            }}>
              Upload your videos, get instant transcription with speaker detection, and edit with precision
            </p>
          </div>

          {files.length === 0 && (
            <div 
              className="card-shadow hover-purple"
              style={{
                border: '2px dashed #ae6df0',
                borderRadius: '12px',
                padding: '60px 40px',
                textAlign: 'center',
                backgroundColor: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload size={64} style={{ margin: '0 auto 20px auto', color: '#ae6df0' }} />
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: '300', 
                color: '#333', 
                marginBottom: '12px' 
              }}>
                Drag & Drop Files or Folders
              </h3>
              <p style={{ 
                fontWeight: '300', 
                color: '#666', 
                marginBottom: '30px',
                fontSize: '16px'
              }}>
                Support for MP4, MOV, AVI, M4A, MP3, WAV files
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary flex items-center gap-2"
                  style={{
                    padding: '15px 30px',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '300',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  <File size={20} />
                  Select Files
                </button>
                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="btn-secondary flex items-center gap-2"
                  style={{
                    padding: '15px 30px',
                    borderRadius: '8px',
                    fontWeight: '300',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  <Folder size={20} />
                  Select Folder
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,audio/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory=""
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </div>
          )}

          {files.length > 0 && (
            <div className="bg-white card-shadow" style={{ borderRadius: '12px', padding: '30px' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: '30px' }}>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '400', 
                  color: '#333',
                  margin: 0
                }}>
                  Uploaded Files ({files.length})
                </h3>
                <button
                  onClick={processFiles}
                  className="btn-secondary"
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '300',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  Start Processing
                </button>
              </div>
              
              <div style={{ display: 'grid', gap: '15px' }}>
                {files.map(file => (
                  <div key={file.id} className="flex items-center gap-4 hover-purple" style={{
                    padding: '15px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease'
                  }}>
                    <FileText size={20} style={{ color: '#ae6df0' }} />
                    <div className="flex-1">
                      <p style={{ fontWeight: '400', margin: '0 0 4px 0', fontSize: '16px' }}>
                        {file.name}
                      </p>
                      <p style={{ 
                        fontSize: '14px', 
                        color: '#999', 
                        fontWeight: '300',
                        margin: 0
                      }}>
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    <CheckCircle size={20} style={{ color: '#aff06d' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {apiError && (
            <div className="bg-white card-shadow" style={{ 
              marginTop: '40px', 
              borderRadius: '12px', 
              padding: '30px',
              border: '1px solid #ef4444'
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '400', 
                marginBottom: '15px',
                color: '#ef4444'
              }}>
                Processing Error
              </h3>
              <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                {apiError}
              </p>
              <button
                onClick={() => setApiError(null)}
                style={{
                  marginTop: '15px',
                  padding: '8px 16px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          )}

          {processingFiles.length > 0 && (
            <div className="bg-white card-shadow" style={{ 
              marginTop: '40px', 
              borderRadius: '12px', 
              padding: '30px' 
            }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '400', 
                marginBottom: '30px',
                color: '#333'
              }}>
                {isProcessing ? 'Processing with AI...' : 'Processing Files'}
              </h3>
              <div style={{ display: 'grid', gap: '20px' }}>
                {processingFiles.map(file => (
                  <div key={file.id} style={{ display: 'grid', gap: '8px' }}>
                    <div className="flex justify-between items-center">
                      <span style={{ fontWeight: '400', fontSize: '16px' }}>
                        {file.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {file.status === 'uploading' && <Upload size={16} style={{ color: '#ae6df0' }} />}
                        {file.status === 'processing' && <AlertCircle size={16} style={{ color: '#ae6df0' }} />}
                        {file.status === 'completed' && <CheckCircle size={16} style={{ color: '#aff06d' }} />}
                        {file.status === 'failed' && <XCircle size={16} style={{ color: '#ef4444' }} />}
                        <span style={{ fontSize: '14px', fontWeight: '300' }}>
                          {file.status === 'uploading' ? 'Uploading...' : 
                           file.status === 'processing' ? 'AI Processing...' :
                           file.status === 'failed' ? 'Failed' : 
                           `${file.progress}%`}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div 
                        style={{
                          height: '100%',
                          backgroundColor: file.status === 'completed' ? '#aff06d' : '#ae6df0',
                          width: `${file.progress}%`,
                          transition: 'width 0.3s ease',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // Editor Screen Component
  const EditorScreen = () => (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@200;300;400;500&display=swap');
          
          body {
            font-family: 'Montserrat', sans-serif !important;
          }
          
          .hover-purple:hover {
            background-color: rgba(174, 109, 240, 0.1) !important;
            transition: background-color 0.3s ease;
          }
          
          .card-shadow {
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          
          .btn-primary {
            background-color: #ae6df0;
            border: none;
            transition: all 0.3s ease;
            color: white;
          }
          
          .btn-primary:hover {
            background-color: #9654e8;
          }
          
          .btn-secondary {
            background-color: #aff06d;
            color: #333;
            border: none;
            transition: all 0.3s ease;
          }
          
          .btn-secondary:hover {
            background-color: #9de654;
          }
          
          .timeline-slider {
            -webkit-appearance: none;
            appearance: none;
            height: 8px;
            border-radius: 4px;
            outline: none;
            cursor: pointer;
          }
          
          .timeline-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #ae6df0;
            cursor: pointer;
          }
          
          .timeline-slider::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #ae6df0;
            cursor: pointer;
            border: none;
          }
          
          .table-row:hover {
            background-color: rgba(174, 109, 240, 0.05) !important;
            transition: background-color 0.3s ease;
          }
        `}
      </style>
      
      <div style={{ 
        minHeight: '100vh',
        fontFamily: '"Montserrat", sans-serif',
        backgroundColor: '#f9f9f9'
      }}>
        <nav className="bg-white card-shadow" style={{ padding: '20px 40px', borderBottom: '1px solid #e0e0e0' }}>
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentScreen('upload')}
                style={{
                  color: '#ae6df0',
                  background: 'none',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '300',
                  cursor: 'pointer'
                }}
              >
                ← Back to Upload
              </button>
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: '400', 
                color: '#333',
                margin: 0
              }}>
                Video Editor
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowTopics(!showTopics)}
                className={showTopics ? 'btn-primary' : 'hover-purple'}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '300',
                  cursor: 'pointer',
                  color: showTopics ? 'white' : '#333',
                  backgroundColor: showTopics ? '#ae6df0' : 'transparent'
                }}
              >
                <MessageSquare size={16} style={{ marginRight: '8px', display: 'inline' }} />
                Topics
              </button>
              <button
                onClick={() => setCurrentScreen('account')}
                className="hover-purple"
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  fontWeight: '300',
                  cursor: 'pointer'
                }}
              >
                <User size={20} />
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto" style={{ padding: '30px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
            {/* Video Player */}
            <div>
              <div className="bg-white card-shadow" style={{ borderRadius: '12px', padding: '25px' }}>
                <div style={{
                  aspectRatio: '16/9',
                  backgroundColor: '#000',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <video
                    ref={videoRef}
                    src={currentVideoUrl}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                    onLoadedMetadata={(e) => setVideoDuration(e.target.duration)}
                    onEnded={() => setIsPlaying(false)}
                  />
                </div>
                
                {/* Video Controls */}
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={togglePlay} 
                      className="btn-primary"
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <span style={{ 
                      fontSize: '14px', 
                      fontFamily: 'monospace', 
                      minWidth: '80px',
                      fontWeight: '300'
                    }}>
                      {formatTime(currentTime)}
                    </span>
                    <Volume2 size={16} style={{ color: '#999' }} />
                  </div>
                  
                  {/* Timeline Slider */}
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <input
                      type="range"
                      min="0"
                      max={videoDuration || 100}
                      step="0.1"
                      value={currentTime}
                      onChange={handleTimelineChange}
                      className="timeline-slider"
                      style={{
                        width: '100%',
                        background: `linear-gradient(to right, #ae6df0 0%, #ae6df0 ${(currentTime / (videoDuration || 100)) * 100}%, #e5e7eb ${(currentTime / (videoDuration || 100)) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                    <div className="flex justify-between" style={{
                      fontSize: '12px',
                      color: '#999',
                      fontFamily: 'monospace',
                      fontWeight: '300'
                    }}>
                      <span>0:00.00</span>
                      <span>{formatTime(videoDuration)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transcript Editor */}
            <div>
              <div className="bg-white card-shadow" style={{ borderRadius: '12px' }}>
                <div style={{ padding: '25px', borderBottom: '1px solid #e0e0e0' }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
                    <h3 style={{ 
                      fontSize: '20px', 
                      fontWeight: '400', 
                      color: '#333',
                      margin: 0
                    }}>
                      Transcript Editor
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewMode('words')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '14px',
                          fontWeight: '300',
                          cursor: 'pointer',
                          backgroundColor: viewMode === 'words' ? '#ae6df0' : '#f0f0f0',
                          color: viewMode === 'words' ? 'white' : '#333'
                        }}
                      >
                        Words
                      </button>
                      <button
                        onClick={() => setViewMode('sentences')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '14px',
                          fontWeight: '300',
                          cursor: 'pointer',
                          backgroundColor: viewMode === 'sentences' ? '#ae6df0' : '#f0f0f0',
                          color: viewMode === 'sentences' ? 'white' : '#333'
                        }}
                      >
                        Sentences
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <button
                        onClick={() => sortTranscript('start')}
                        className="flex items-center gap-1 hover-purple"
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '14px',
                          fontWeight: '300',
                          cursor: 'pointer'
                        }}
                      >
                        <Clock size={14} />
                        Time
                        {sortBy === 'start' && (sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />)}
                      </button>
                      <button
                        onClick={() => sortTranscript('speaker')}
                        className="flex items-center gap-1 hover-purple"
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '14px',
                          fontWeight: '300',
                          cursor: 'pointer'
                        }}
                      >
                        <User size={14} />
                        Speaker
                        {sortBy === 'speaker' && (sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />)}
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      {(selectedItems.size > 0 || selectedWords.size > 0) && (
                        <button
                          onClick={deleteSelectedItems}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#dc2626',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: '300',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} style={{ marginRight: '4px', display: 'inline' }} />
                          Delete ({viewMode === 'sentences' ? selectedItems.size : selectedWords.size})
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setExportFormat('video');
                          setShowExportModal(true);
                        }}
                        className="btn-secondary"
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '300',
                          cursor: 'pointer'
                        }}
                      >
                        <Download size={14} style={{ marginRight: '4px', display: 'inline' }} />
                        Export Video
                      </button>
                      <button
                        onClick={() => {
                          setExportFormat('xml');
                          setShowExportModal(true);
                        }}
                        className="btn-primary"
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '300',
                          cursor: 'pointer'
                        }}
                      >
                        <FileText size={14} style={{ marginRight: '4px', display: 'inline' }} />
                        Final Cut XML
                      </button>
                    </div>
                  </div>
                </div>

                {viewMode === 'words' ? (
                  renderWordView()
                ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ 
                      backgroundColor: '#f9f9f9', 
                      position: 'sticky', 
                      top: 0,
                      borderBottom: '1px solid #e0e0e0'
                    }}>
                      <tr>
                        <th style={{ 
                          padding: '12px 15px', 
                          textAlign: 'left', 
                          width: '40px',
                          fontWeight: '400',
                          fontSize: '14px',
                          color: '#666'
                        }}>
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems(new Set(transcriptData.map(item => item.id)));
                              } else {
                                setSelectedItems(new Set());
                              }
                            }}
                            checked={transcriptData.length > 0 && selectedItems.size === transcriptData.length}
                            style={{ accentColor: '#ae6df0' }}
                          />
                        </th>
                        <th style={{ 
                          padding: '12px 15px', 
                          textAlign: 'left', 
                          width: '80px',
                          fontWeight: '400',
                          fontSize: '14px',
                          color: '#666'
                        }}>Start</th>
                        <th style={{ 
                          padding: '12px 15px', 
                          textAlign: 'left', 
                          width: '80px',
                          fontWeight: '400',
                          fontSize: '14px',
                          color: '#666'
                        }}>End</th>
                        <th style={{ 
                          padding: '12px 15px', 
                          textAlign: 'left', 
                          width: '60px',
                          fontWeight: '400',
                          fontSize: '14px',
                          color: '#666'
                        }}>Speaker</th>
                        <th style={{ 
                          padding: '12px 15px', 
                          textAlign: 'left',
                          fontWeight: '400',
                          fontSize: '14px',
                          color: '#666'
                        }}>Text</th>
                        {showTopics && (
                          <th style={{ 
                            padding: '12px 15px', 
                            textAlign: 'left', 
                            width: '120px',
                            fontWeight: '400',
                            fontSize: '14px',
                            color: '#666'
                          }}>Topic</th>
                        )}
                        <th style={{ 
                          padding: '12px 15px', 
                          textAlign: 'left', 
                          width: '60px',
                          fontWeight: '400',
                          fontSize: '14px',
                          color: '#666'
                        }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transcriptData && transcriptData.length > 0 ? transcriptData.map((item, index) => (
                        <tr 
                          key={item.id} 
                          className="table-row"
                          style={{
                            borderBottom: '1px solid #f0f0f0',
                            backgroundColor: selectedItems.has(item.id) ? 'rgba(174, 109, 240, 0.1)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '12px 15px' }}>
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id)}
                              onChange={() => toggleItemSelection(item.id)}
                              style={{ accentColor: '#ae6df0' }}
                            />
                          </td>
                          <td style={{ padding: '12px 15px' }}>
                            <button
                              onClick={() => seekToTime(item.start)}
                              style={{
                                color: '#ae6df0',
                                background: 'none',
                                border: 'none',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                fontWeight: '300',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                            >
                              {formatTime(item.start)}
                            </button>
                          </td>
                          <td style={{ padding: '12px 15px' }}>
                            <button
                              onClick={() => seekToTime(item.end)}
                              style={{
                                color: '#ae6df0',
                                background: 'none',
                                border: 'none',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                fontWeight: '300',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                            >
                              {formatTime(item.end)}
                            </button>
                          </td>
                          <td style={{ padding: '12px 15px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '400',
                              ...getSpeakerColor(item.speaker)
                            }}>
                              {item.speaker}
                            </span>
                          </td>
                          <td style={{ 
                            padding: '12px 15px',
                            fontSize: '14px',
                            fontWeight: '300',
                            lineHeight: '1.4'
                          }}>
                            <div style={{ position: 'relative' }}>
                              <p style={{ margin: 0, color: '#333' }}>{item.text}</p>
                              <div style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                opacity: 0,
                                transition: 'opacity 0.3s'
                              }}
                              onMouseEnter={(e) => e.target.style.opacity = 1}
                              onMouseLeave={(e) => e.target.style.opacity = 0}>
                                <button style={{
                                  padding: '4px',
                                  background: 'none',
                                  border: 'none',
                                  color: '#999',
                                  cursor: 'pointer'
                                }}>
                                  <Edit3 size={12} />
                                </button>
                              </div>
                            </div>
                          </td>
                          {showTopics && (
                            <td style={{ padding: '12px 15px' }}>
                              <span style={{
                                padding: '4px 8px',
                                backgroundColor: 'rgba(147, 51, 234, 0.1)',
                                color: '#7c3aed',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '300'
                              }}>
                                {item.topic}
                              </span>
                            </td>
                          )}
                          <td style={{ padding: '12px 15px' }}>
                            <button
                              onClick={() => toggleItemSelection(item.id)}
                              style={{
                                padding: '4px',
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                            No transcript data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}>
            <div className="bg-white card-shadow" style={{
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              margin: '20px',
              padding: '30px'
            }}>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: '400', 
                marginBottom: '20px',
                color: '#333'
              }}>
                Export Options
              </h3>
              
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '400',
                    color: '#666',
                    marginBottom: '8px'
                  }}>
                    Export Format
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '300',
                      fontFamily: '"Montserrat", sans-serif'
                    }}
                  >
                    <option value="video">Edited Video (MP4)</option>
                    <option value="xml">Final Cut Pro XML</option>
                    <option value="srt">SRT Subtitles</option>
                    <option value="json">JSON Transcript</option>
                  </select>
                </div>

                {exportFormat === 'video' && (
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '8px',
                    display: 'grid',
                    gap: '15px'
                  }}>
                    <h4 style={{ 
                      fontWeight: '400', 
                      color: '#333',
                      margin: 0,
                      fontSize: '16px'
                    }}>
                      Video Settings
                    </h4>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={exportSettings.includeTransitions}
                        onChange={(e) => setExportSettings(prev => ({...prev, includeTransitions: e.target.checked}))}
                        style={{ accentColor: '#ae6df0' }}
                      />
                      <span style={{ fontSize: '14px', fontWeight: '300' }}>
                        Include smooth transitions
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={exportSettings.fadeInOut}
                        onChange={(e) => setExportSettings(prev => ({...prev, fadeInOut: e.target.checked}))}
                        style={{ accentColor: '#ae6df0' }}
                      />
                      <span style={{ fontSize: '14px', fontWeight: '300' }}>
                        Add fade in/out effects
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={exportSettings.removeGaps}
                        onChange={(e) => setExportSettings(prev => ({...prev, removeGaps: e.target.checked}))}
                        style={{ accentColor: '#ae6df0' }}
                      />
                      <span style={{ fontSize: '14px', fontWeight: '300' }}>
                        Remove gaps between segments
                      </span>
                    </label>
                    
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '400',
                        color: '#666',
                        marginBottom: '4px'
                      }}>
                        Quality
                      </label>
                      <select
                        value={exportSettings.exportQuality}
                        onChange={(e) => setExportSettings(prev => ({...prev, exportQuality: e.target.value}))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #e0e0e0',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '300',
                          fontFamily: '"Montserrat", sans-serif'
                        }}
                      >
                        <option value="high">High (1080p)</option>
                        <option value="medium">Medium (720p)</option>
                        <option value="low">Low (480p)</option>
                      </select>
                    </div>
                  </div>
                )}

                {exportFormat === 'xml' && (
                  <div style={{
                    padding: '20px',
                    backgroundColor: 'rgba(174, 109, 240, 0.1)',
                    borderRadius: '8px'
                  }}>
                    <p style={{
                      fontSize: '14px',
                      color: '#7c3aed',
                      margin: 0,
                      fontWeight: '300',
                      lineHeight: '1.4'
                    }}>
                      📝 This will generate a Final Cut Pro XML file with your edited segments. 
                      Import it into Final Cut Pro for professional video editing.
                    </p>
                  </div>
                )}

                <div style={{
                  padding: '20px',
                  backgroundColor: 'rgba(175, 240, 109, 0.1)',
                  borderRadius: '8px'
                }}>
                  <p style={{
                    fontSize: '14px',
                    color: '#65a30d',
                    margin: 0,
                    fontWeight: '300',
                    lineHeight: '1.4'
                  }}>
                    📊 Export will include {transcriptData ? transcriptData.filter(item => !selectedItems.has(item.id)).length : 0} segments 
                    ({selectedItems.size} segments removed)
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3" style={{ marginTop: '30px' }}>
                <button
                  onClick={() => setShowExportModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    color: '#666',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    fontWeight: '300',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontFamily: '"Montserrat", sans-serif'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontWeight: '300',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontFamily: '"Montserrat", sans-serif'
                  }}
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

  // Account Screen Component (keeping it simple for now)
  const AccountScreen = () => (
    <div style={{ 
      minHeight: '100vh',
      fontFamily: '"Montserrat", sans-serif',
      backgroundColor: '#f9f9f9',
      padding: '40px'
    }}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setCurrentScreen('upload')}
          style={{
            color: '#ae6df0',
            background: 'none',
            border: 'none',
            fontSize: '16px',
            fontWeight: '300',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          ← Back to Upload
        </button>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '200', 
          color: '#333',
          marginBottom: '40px'
        }}>
          Account Settings
        </h1>
        
        <div className="bg-white card-shadow" style={{
          borderRadius: '12px',
          padding: '30px',
          textAlign: 'center'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '300',
            color: '#666',
            margin: 0
          }}>
            Account features coming soon...
          </h3>
        </div>
      </div>
    </div>
  );

  // Main render
  if (currentScreen === 'upload') {
    return <UploadScreen />;
  } else if (currentScreen === 'editor') {
    return <EditorScreen />;
  } else if (currentScreen === 'account') {
    return <AccountScreen />;
  }
};

export default VideoTranscriptEditor;