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
  }, [loadContent]);

  const onDrop = useCallback(async (acceptedFiles) => {
    console.log(`Starting upload of ${acceptedFiles.length} files`);

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

    // Add to queue
    setUploadQueue(prev => [...prev, ...uploadItems]);

    // Initialize progress tracking
    const progressInit = {};
    uploadItems.forEach(item => {
      progressInit[item.id] = { progress: 0, status: 'pending' };
    });
    setUploadProgress(prev => ({ ...prev, ...progressInit }));

    // Start background processing
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
    setIsUploading(true);

    const uploadFile = async (item) => {
      const formData = new FormData();
      formData.append('files', item.file);
      formData.append('folderPath', item.folderPath);

      try {
        // Update status to uploading
        setUploadProgress(prev => ({
          ...prev,
          [item.id]: { progress: 0, status: 'uploading' }
        }));

        const response = await axios.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': 'Bearer 2536'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(prev => ({
              ...prev,
              [item.id]: { progress: percentCompleted, status: 'uploading' }
            }));
          }
        });

        // Success
        setUploadProgress(prev => ({
          ...prev,
          [item.id]: { progress: 100, status: 'completed' }
        }));

        return { success: true, item };
      } catch (error) {
        console.error(`Upload failed for ${item.file.name}:`, error);
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

  // Mobile-specific file handler
  const handleMobileFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      console.log('Mobile file selection:', files.length, 'files');
      onDrop(files);
      // Clear the input so the same files can be selected again
      event.target.value = '';
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
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#28a745',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          zIndex: 1000,
          fontSize: '1rem',
          fontWeight: 'bold',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          animation: 'slideIn 0.3s ease-out'
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

        {/* Mobile-specific upload button */}
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
            onChange={handleMobileFileSelect}
            style={{ display: 'none' }}
          />
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