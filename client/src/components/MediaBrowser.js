import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { FaFolder, FaImage, FaVideo, FaPlay, FaPause, FaUpload, FaPlus, FaSignOutAlt, FaTimes, FaTrash, FaCheck, FaCheckSquare, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import MediaViewer from './MediaViewer';
import SlideshowControls from './SlideshowControls';

const MediaBrowser = ({ onLogout }) => {
  const [currentPath, setCurrentPath] = useState('');
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [slideshowInterval, setSlideshowInterval] = useState(5);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNotification, setUploadNotification] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  const loadContent = useCallback(async (path = '') => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/folders?path=${encodeURIComponent(path)}`);
      setFolders(response.data.folders);
      setFiles(response.data.files);
      setCurrentPath(response.data.currentPath);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();

    // Detect mobile device
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                           ('ontouchstart' in window) ||
                           (navigator.maxTouchPoints > 0);
      setIsMobile(isMobileDevice);
    };

    checkMobile();

    // Multiple mobile fallback methods for file selection
    let fileInputRef = null;
    let mobileCheckInterval = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMobile) {
        console.log('🔥 VISIBILITY: Page visible, checking for files');
        setTimeout(() => {
          const input = document.getElementById('mobile-file-input');
          console.log('🔥 VISIBILITY: Input element:', input);
          console.log('🔥 VISIBILITY: Input files:', input?.files);
          console.log('🔥 VISIBILITY: Files count:', input?.files?.length || 'NO FILES');

          if (input && input.files && input.files.length > 0) {
            console.log('🔥 VISIBILITY: Detected files on visibility change, count:', input.files.length);
            handleMobileFileSelect({ target: input });
          } else {
            console.log('🔥 VISIBILITY: No files found during visibility check');
          }
        }, 300);
      }
    };

    // Aggressive polling method for mobile browsers that don't trigger events properly
    const startMobilePolling = () => {
      if (!isMobile) return;
      console.log('🔥 POLLING: Starting mobile polling');

      mobileCheckInterval = setInterval(() => {
        const input = document.getElementById('mobile-file-input');
        console.log('🔥 POLLING: Checking input:', input);
        console.log('🔥 POLLING: Input files:', input?.files);
        console.log('🔥 POLLING: Files count:', input?.files?.length || 'NO FILES');

        if (input && input.files && input.files.length > 0) {
          console.log('🔥 POLLING: Detected files, count:', input.files.length);
          handleMobileFileSelect({ target: input });
          clearInterval(mobileCheckInterval);
        }
      }, 500);

      // Stop polling after 15 seconds
      setTimeout(() => {
        if (mobileCheckInterval) {
          console.log('🔥 POLLING: Stopping polling after 15 seconds');
          clearInterval(mobileCheckInterval);
        }
      }, 15000);
    };

    // Enhanced focus/blur detection
    const handleFocusEvents = () => {
      setTimeout(() => {
        const input = document.getElementById('mobile-file-input');
        if (input && input.files && input.files.length > 0) {
          console.log('Mobile: Focus event detected files');
          handleMobileFileSelect({ target: input });
        }
      }, 200);
    };

    if (isMobile) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleVisibilityChange);
      window.addEventListener('pageshow', handleVisibilityChange);
      window.addEventListener('blur', handleFocusEvents);
      startMobilePolling();
    }

    return () => {
      if (isMobile) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
        window.removeEventListener('pageshow', handleVisibilityChange);
        window.removeEventListener('blur', handleFocusEvents);
        if (mobileCheckInterval) {
          clearInterval(mobileCheckInterval);
        }
      }
    };
  }, [loadContent, isMobile]);

  const onDrop = useCallback(async (acceptedFiles) => {
    console.log('🔥 ONDROP: Function called with files:', acceptedFiles);
    console.log('🔥 ONDROP: Files count:', acceptedFiles?.length || 'NO FILES');
    console.log('🔥 ONDROP: File names:', acceptedFiles?.map(f => f.name) || 'NO NAMES');

    if (!acceptedFiles || acceptedFiles.length === 0) {
      console.log('🔥 ONDROP: No files provided, aborting');
      return;
    }

    console.log(`🔥 ONDROP: Starting upload of ${acceptedFiles.length} files`);

    // Show immediate feedback for mobile users
    setUploadNotification(`📁 Starting upload of ${acceptedFiles.length} files...`);
    setTimeout(() => setUploadNotification(''), 3000);

    // Create upload items with unique IDs
    const uploadItems = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'pending',
      progress: 0,
      folderPath: currentPath
    }));

    console.log('🔥 ONDROP: Upload items created:', uploadItems);

    // Add to queue
    console.log('🔥 ONDROP: Adding items to upload queue');
    setUploadQueue(prev => {
      const newQueue = [...prev, ...uploadItems];
      console.log('🔥 ONDROP: New queue:', newQueue);
      return newQueue;
    });

    // Initialize progress tracking
    const progressInit = {};
    uploadItems.forEach(item => {
      progressInit[item.id] = { progress: 0, status: 'pending' };
    });
    console.log('🔥 ONDROP: Initializing progress:', progressInit);
    setUploadProgress(prev => ({ ...prev, ...progressInit }));

    // Start background processing
    console.log('🔥 ONDROP: Calling processUploadQueue with:', uploadItems);
    processUploadQueue(uploadItems);
  }, [currentPath]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropAccepted: (files) => {
      console.log('Files accepted:', files.length);
    },
    onDropRejected: (rejectedFiles) => {
      console.log('Files rejected:', rejectedFiles);
    },
    onFileDialogCancel: () => {
      console.log('File dialog cancelled');
    },
    onFileDialogOpen: () => {
      console.log('File dialog opened');
    },
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp']
    },
    multiple: true,
    maxFiles: undefined,
    noClick: false,
    noKeyboard: false,
    disabled: false,
    preventDropOnDocument: true
  });

  const navigateToFolder = (folderPath) => {
    setCurrentPath(folderPath);
    loadContent(folderPath);
  };

  const navigateUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    navigateToFolder(parentPath);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      await axios.post('/api/folders', {
        name: newFolderName,
        parentPath: currentPath
      });
      setNewFolderName('');
      setShowCreateFolder(false);
      loadContent(currentPath);
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const openMedia = (media, index) => {
    setSelectedMedia({ ...media, index, allFiles: files });
  };

  const closeMedia = () => {
    setSelectedMedia(null);
    setSlideshowActive(false);
  };

  const toggleSlideshow = () => {
    setSlideshowActive(!slideshowActive);
  };

  const deleteFile = async (filePath) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await axios.delete('/api/files', {
        data: { filePath },
        headers: { Authorization: `Bearer 2536` }
      });
      loadContent(currentPath);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file');
    }
  };

  const deleteSelectedFiles = async () => {
    if (selectedFiles.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedFiles.length} selected files?`)) return;

    try {
      await axios.delete('/api/files/bulk', {
        data: { filePaths: selectedFiles },
        headers: { Authorization: `Bearer 2536` }
      });
      setSelectedFiles([]);
      setSelectionMode(false);
      loadContent(currentPath);
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('Failed to delete selected files');
    }
  };

  const deleteAllFiles = async () => {
    if (files.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ALL ${files.length} files in this folder?`)) return;

    try {
      await axios.delete('/api/files/all', {
        data: { folderPath: currentPath },
        headers: { Authorization: `Bearer 2536` }
      });
      loadContent(currentPath);
    } catch (error) {
      console.error('Delete all error:', error);
      alert('Failed to delete all files');
    }
  };

  const toggleSelection = (filePath) => {
    setSelectedFiles(prev =>
      prev.includes(filePath)
        ? prev.filter(path => path !== filePath)
        : [...prev, filePath]
    );
  };

  const selectAllFiles = () => {
    setSelectedFiles(files.map(file => file.path));
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  const processUploadQueue = async (items) => {
    console.log('🔥 PROCESS: Starting processUploadQueue with', items.length, 'items');
    setIsUploading(true);

    const uploadFile = async (item) => {
      console.log('🔥 UPLOAD: Starting upload for file:', item.file.name);
      const formData = new FormData();
      formData.append('files', item.file);
      formData.append('folderPath', item.folderPath);

      console.log('🔥 UPLOAD: FormData created, folder path:', item.folderPath);
      console.log('🔥 UPLOAD: File size:', item.file.size, 'bytes');

      try {
        // Update status to uploading
        console.log('🔥 UPLOAD: Setting progress to uploading for:', item.id);
        setUploadProgress(prev => ({
          ...prev,
          [item.id]: { progress: 0, status: 'uploading' }
        }));

        console.log('🔥 UPLOAD: Making API call to /api/upload');
        const response = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': 'Bearer 2536'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log('🔥 UPLOAD: Progress for', item.file.name, ':', percentCompleted + '%');
            setUploadProgress(prev => ({
              ...prev,
              [item.id]: { progress: percentCompleted, status: 'uploading' }
            }));
          }
        });

        console.log('🔥 UPLOAD: API response received:', response.status, response.data);

        // Success
        setUploadProgress(prev => ({
          ...prev,
          [item.id]: { progress: 100, status: 'completed' }
        }));

        return { success: true, item };
      } catch (error) {
        console.error('🔥 UPLOAD: Upload failed for', item.file.name, ':', error);
        console.error('🔥 UPLOAD: Error details:', error.response?.data || error.message);
        console.error('🔥 UPLOAD: Error status:', error.response?.status);

        setUploadProgress(prev => ({
          ...prev,
          [item.id]: { progress: 0, status: 'error' }
        }));
        return { success: false, item, error };
      }
    };

    // Process uploads with concurrency limit (5 at a time)
    const CONCURRENT_UPLOADS = 5;
    const chunks = [];
    for (let i = 0; i < items.length; i += CONCURRENT_UPLOADS) {
      chunks.push(items.slice(i, i + CONCURRENT_UPLOADS));
    }

    let completedCount = 0;
    for (const chunk of chunks) {
      const promises = chunk.map(uploadFile);
      const results = await Promise.all(promises);

      completedCount += results.length;
      console.log(`Completed ${completedCount}/${items.length} uploads`);
    }

    // Clean up completed uploads after 3 seconds
    setTimeout(() => {
      setUploadQueue(prev => prev.filter(item =>
        !items.some(uploadedItem => uploadedItem.id === item.id)
      ));

      // Remove completed progress entries
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        items.forEach(item => {
          delete newProgress[item.id];
        });
        return newProgress;
      });
    }, 3000);

    setIsUploading(false);
    loadContent(currentPath);
  };

  const clearUploadQueue = () => {
    setUploadQueue([]);
    setUploadProgress({});
  };

  // Enhanced mobile-specific file handler with extensive debugging
  const handleMobileFileSelect = (event) => {
    console.log('🔥 Mobile handleMobileFileSelect triggered, event:', event);
    console.log('🔥 Event target:', event.target);
    console.log('🔥 Event target files:', event.target.files);
    console.log('🔥 Files length:', event.target.files?.length || 'NO FILES');

    const files = Array.from(event.target.files || []);
    console.log('🔥 Converted files array:', files);
    console.log('🔥 Files array length:', files.length);

    if (files.length > 0) {
      console.log('🔥 MOBILE FILE SELECTION SUCCESS:', files.length, 'files');
      console.log('🔥 File names:', files.map(f => f.name));

      // Force immediate UI feedback with enhanced mobile notification
      setUploadNotification(`📱 Mobile Upload Started!\n${files.length} files selected\nStarting upload...`);

      // Force page to return to main view for mobile
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (e) {
        console.log('🔥 Fullscreen exit error:', e);
      }

      // Force focus back to main document
      window.focus();
      document.documentElement.focus();

      console.log('🔥 About to call onDrop with files:', files);

      // Trigger upload immediately and also with delay as backup
      try {
        onDrop(files);
        console.log('🔥 onDrop called successfully');
      } catch (error) {
        console.error('🔥 onDrop failed:', error);
      }

      // Backup upload trigger
      setTimeout(() => {
        console.log('🔥 Backup upload trigger');
        try {
          onDrop(files);
        } catch (error) {
          console.error('🔥 Backup onDrop failed:', error);
        }
      }, 100);

      // Clear the input so the same files can be selected again
      event.target.value = '';

      // Force UI updates
      setTimeout(() => {
        console.log('🔥 Forcing UI updates');
        setUploadQueue(prev => {
          console.log('🔥 Upload queue update, prev:', prev);
          return [...prev];
        });

        // Force window to scroll back to app content
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 200);

    } else {
      console.log('🔥 MOBILE: No files selected - this is the problem!');
      console.log('🔥 Event target files was:', event.target.files);

      // Set error notification
      setUploadNotification('❌ No files were selected\nPlease try again');
      setTimeout(() => setUploadNotification(''), 3000);
    }
  };

  const handleFileClick = (file, index) => {
    if (selectionMode) {
      toggleSelection(file.path);
    } else {
      openMedia(file, index);
    }
  };

  const pathParts = currentPath ? currentPath.split('/') : [];

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="header">
        <h1>Personal Media Server</h1>
        <div className="header-actions">
          <button className="btn" onClick={() => setShowCreateFolder(!showCreateFolder)}>
            <FaPlus /> New Folder
          </button>

          {files.length > 0 && (
            <>
              <button
                className={`btn ${selectionMode ? 'btn-secondary' : ''}`}
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  setSelectedFiles([]);
                }}
              >
                <FaCheck /> {selectionMode ? 'Cancel' : 'Select'}
              </button>

              {selectionMode && (
                <>
                  <button className="btn btn-secondary" onClick={selectAllFiles}>
                    <FaCheckSquare /> Select All
                  </button>
                  <button className="btn btn-secondary" onClick={clearSelection}>
                    Clear
                  </button>
                  {selectedFiles.length > 0 && (
                    <button className="btn btn-danger" onClick={deleteSelectedFiles}>
                      <FaTrash /> Delete Selected ({selectedFiles.length})
                    </button>
                  )}
                </>
              )}

              <button className="btn btn-danger" onClick={deleteAllFiles}>
                <FaTrash /> Delete All
              </button>
            </>
          )}

          <button className="btn btn-danger" onClick={onLogout}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </header>

      <nav className="breadcrumb">
        <span className="breadcrumb-item" onClick={() => navigateToFolder('')}>
          Home
        </span>
        {pathParts.map((part, index) => (
          <React.Fragment key={index}>
            <span className="breadcrumb-separator">/</span>
            <span
              className="breadcrumb-item"
              onClick={() => navigateToFolder(pathParts.slice(0, index + 1).join('/'))}
            >
              {part}
            </span>
          </React.Fragment>
        ))}
        {currentPath && (
          <>
            <span className="breadcrumb-separator">/</span>
            <button className="btn btn-secondary" onClick={navigateUp}>
              ← Back
            </button>
          </>
        )}
      </nav>

      {showCreateFolder && (
        <div className="create-folder">
          <input
            type="text"
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createFolder()}
          />
          <button className="btn" onClick={createFolder}>Create</button>
          <button className="btn btn-secondary" onClick={() => setShowCreateFolder(false)}>
            Cancel
          </button>
        </div>
      )}

      {/* TV/Consumer Friendly Instructions */}
      {files.length > 0 && (
        <div style={{
          background: 'rgba(0, 123, 255, 0.1)',
          border: '1px solid rgba(0, 123, 255, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          margin: '1rem 0',
          fontSize: '0.9rem',
          textAlign: 'center',
          color: '#87ceeb'
        }}>
          <strong>📺 TV Mode:</strong> Use ← → arrow keys to navigate • Press Enter to select •
          <strong> F</strong> for fullscreen • <strong>Space</strong> for slideshow • <strong>Esc</strong> to go back
        </div>
      )}

      {/* Mobile Upload Notification */}
      {uploadNotification && (
        <div style={{
          position: 'fixed',
          top: isMobile ? '50%' : '20px',
          left: '50%',
          transform: isMobile ? 'translate(-50%, -50%)' : 'translateX(-50%)',
          background: '#28a745',
          color: 'white',
          padding: isMobile ? '2rem' : '1rem 2rem',
          borderRadius: isMobile ? '12px' : '8px',
          zIndex: 9999,
          fontSize: isMobile ? '1.2rem' : '1rem',
          fontWeight: 'bold',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'slideIn 0.3s ease-out',
          minWidth: isMobile ? '80vw' : 'auto',
          textAlign: 'center',
          whiteSpace: 'pre-line'
        }}>
          {uploadNotification}
        </div>
      )}

      <div {...getRootProps()} className={`upload-area ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        <FaUpload size={48} style={{ color: '#007bff', marginBottom: '1rem' }} />
        <p>Drag & drop media files here, or click to select</p>
        <p>✨ <strong>Bulk Upload:</strong> Select hundreds of files at once!</p>
        <p>Supports: Images (JPG, PNG, GIF, HEIC) and Videos (MP4, AVI, MOV, etc.)</p>

        {/* Mobile-specific upload button with direct handler */}
        <div style={{ marginTop: '1rem' }}>
          <label htmlFor="mobile-file-input" className="btn" style={{
            display: 'inline-block',
            cursor: 'pointer',
            backgroundColor: '#28a745',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 'bold'
          }}>
            📱 Mobile Upload
          </label>
          <input
            id="mobile-file-input"
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => {
              console.log('🔥 DIRECT: Mobile file input onChange triggered');
              console.log('🔥 DIRECT: Event:', e);
              console.log('🔥 DIRECT: Files:', e.target.files);
              handleMobileFileSelect(e);
            }}
            onClick={(e) => {
              console.log('🔥 DIRECT: Mobile file input clicked');
              // Clear previous files to ensure fresh selection
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />

          {/* Alternative direct upload button for testing */}
          <div style={{ marginTop: '0.5rem' }}>
            <label htmlFor="direct-mobile-input" className="btn" style={{
              display: 'inline-block',
              cursor: 'pointer',
              backgroundColor: '#17a2b8',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold'
            }}>
              🔧 Direct Upload (Test)
            </label>
            <input
              id="direct-mobile-input"
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => {
                console.log('🔥 DIRECT TEST: Files selected:', e.target.files?.length || 0);
                if (e.target.files && e.target.files.length > 0) {
                  const filesArray = Array.from(e.target.files);
                  console.log('🔥 DIRECT TEST: Calling onDrop directly');
                  onDrop(filesArray);
                  e.target.value = '';
                }
              }}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>

      {/* Upload Progress Section */}
      {uploadQueue.length > 0 && (
        <div className="upload-progress-section" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '1rem',
          margin: '1rem 0',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
              {isUploading ? (
                <>
                  <FaSpinner className="fa-spin" style={{ marginRight: '0.5rem' }} />
                  Uploading {uploadQueue.length} files...
                </>
              ) : (
                <>Upload Queue ({uploadQueue.length} files)</>
              )}
            </h3>
            {!isUploading && (
              <button className="btn btn-secondary" onClick={clearUploadQueue}>
                Clear Queue
              </button>
            )}
          </div>

          <div className="upload-items">
            {uploadQueue.map(item => {
              const progress = uploadProgress[item.id] || { progress: 0, status: 'pending' };
              return (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.5rem',
                  borderBottom: '1px solid #333',
                  fontSize: '0.9rem'
                }}>
                  <div style={{ marginRight: '0.5rem' }}>
                    {progress.status === 'pending' && <FaUpload style={{ color: '#6c757d' }} />}
                    {progress.status === 'uploading' && <FaSpinner className="fa-spin" style={{ color: '#007bff' }} />}
                    {progress.status === 'completed' && <FaCheckCircle style={{ color: '#28a745' }} />}
                    {progress.status === 'error' && <FaExclamationTriangle style={{ color: '#dc3545' }} />}
                  </div>

                  <div style={{ flex: 1, marginRight: '1rem' }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {item.file.name}
                    </div>
                    <div style={{
                      background: '#333',
                      height: '6px',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        background: progress.status === 'error' ? '#dc3545' : '#007bff',
                        height: '100%',
                        width: `${progress.progress}%`,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>

                  <div style={{ minWidth: '60px', textAlign: 'right', fontSize: '0.8rem' }}>
                    {progress.status === 'pending' && 'Pending'}
                    {progress.status === 'uploading' && `${progress.progress}%`}
                    {progress.status === 'completed' && 'Done'}
                    {progress.status === 'error' && 'Failed'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="media-grid">
        {folders.map((folder) => (
          <div
            key={folder.path}
            className="media-item"
            onClick={() => navigateToFolder(folder.path)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigateToFolder(folder.path);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Open folder ${folder.name}`}
          >
            <div className="folder-icon">
              <FaFolder />
            </div>
            <div className="media-info">
              <div className="media-name">{folder.name}</div>
            </div>
          </div>
        ))}

        {files.map((file, index) => (
          <div
            key={file.path}
            className={`media-item ${selectedFiles.includes(file.path) ? 'selected' : ''}`}
            onClick={() => handleFileClick(file, index)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleFileClick(file, index);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`${file.type} ${file.name}${selectionMode ? (selectedFiles.includes(file.path) ? ' - selected' : ' - not selected') : ''}`}
            style={{ position: 'relative' }}
          >
            {selectionMode && (
              <div className="selection-checkbox" style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                zIndex: 1,
                background: selectedFiles.includes(file.path) ? '#007bff' : 'rgba(0,0,0,0.5)',
                color: 'white',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}>
                {selectedFiles.includes(file.path) ? '✓' : ''}
              </div>
            )}

            {!selectionMode && (
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFile(file.path);
                }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  zIndex: 1,
                  background: 'rgba(220, 53, 69, 0.8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  cursor: 'pointer',
                  opacity: 0,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.opacity = 1}
                onMouseLeave={(e) => e.target.style.opacity = 0}
              >
                <FaTrash />
              </button>
            )}

            {file.type === 'image' ? (
              <img
                src={file.url}
                alt={file.name}
                className="media-thumbnail"
                loading="lazy"
              />
            ) : (
              <div className="media-thumbnail" style={{
                background: 'linear-gradient(135deg, #dc3545, #c82333)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaVideo size={32} />
              </div>
            )}
            <div className="media-info">
              <div className="media-name">{file.name}</div>
            </div>
          </div>
        ))}
      </div>

      {files.length > 0 && (
        <SlideshowControls
          isActive={slideshowActive}
          interval={slideshowInterval}
          onToggle={toggleSlideshow}
          onIntervalChange={setSlideshowInterval}
        />
      )}

      {selectedMedia && (
        <MediaViewer
          media={selectedMedia}
          onClose={closeMedia}
          slideshowActive={slideshowActive}
          slideshowInterval={slideshowInterval}
          onToggleSlideshow={toggleSlideshow}
        />
      )}
    </div>
  );
};

export default MediaBrowser;