import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { FaFolder, FaImage, FaVideo, FaPlay, FaPause, FaUpload, FaPlus, FaSignOutAlt, FaTimes } from 'react-icons/fa';
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
    const formData = new FormData();
    acceptedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('folderPath', currentPath);

    try {
      await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      loadContent(currentPath);
    } catch (error) {
      console.error('Upload error:', error);
    }
  }, [currentPath, loadContent]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp']
    }
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

      <div {...getRootProps()} className={`upload-area ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        <FaUpload size={48} style={{ color: '#007bff', marginBottom: '1rem' }} />
        <p>Drag & drop media files here, or click to select</p>
        <p>Supports: Images (JPG, PNG, GIF, HEIC) and Videos (MP4, AVI, MOV, etc.)</p>
      </div>

      <div className="media-grid">
        {folders.map((folder) => (
          <div
            key={folder.path}
            className="media-item"
            onClick={() => navigateToFolder(folder.path)}
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
            className="media-item"
            onClick={() => openMedia(file, index)}
          >
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