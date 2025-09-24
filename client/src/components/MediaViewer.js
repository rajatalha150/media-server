import React, { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaPlay, FaPause, FaChevronLeft, FaChevronRight, FaExpand, FaCompress } from 'react-icons/fa';

const MediaViewer = ({ 
  media, 
  onClose, 
  slideshowActive, 
  slideshowInterval, 
  onToggleSlideshow 
}) => {
  const [currentIndex, setCurrentIndex] = useState(media.index);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const currentMedia = media.allFiles[currentIndex];

  const nextMedia = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % media.allFiles.length);
  }, [media.allFiles.length]);

  const prevMedia = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + media.allFiles.length) % media.allFiles.length);
  }, [media.allFiles.length]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowRight':
          nextMedia();
          break;
        case 'ArrowLeft':
          prevMedia();
          break;
        case ' ':
          e.preventDefault();
          onToggleSlideshow();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullScreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClose, nextMedia, prevMedia, onToggleSlideshow]);

  useEffect(() => {
    let interval;
    if (slideshowActive && currentMedia.type === 'image') {
      interval = setInterval(() => {
        nextMedia();
      }, slideshowInterval * 1000);
    }
    return () => clearInterval(interval);
  }, [slideshowActive, slideshowInterval, nextMedia, currentMedia.type]);

  const handleVideoPlay = () => {
    setIsVideoPlaying(true);
  };

  const handleVideoPause = () => {
    setIsVideoPlaying(false);
  };

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullScreen(true);
      }).catch(err => {
        console.log('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullScreen(false);
      }).catch(err => {
        console.log('Error attempting to exit fullscreen:', err);
      });
    }
  }, []);

  // Listen for fullscreen changes (user pressing F11 or Esc)
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          <FaTimes />
        </button>

        {currentMedia.type === 'image' ? (
          <img
            src={currentMedia.url}
            alt={currentMedia.name}
            className="modal-media"
          />
        ) : (
          <video
            src={currentMedia.url}
            className="modal-media"
            controls
            autoPlay
            onPlay={handleVideoPlay}
            onPause={handleVideoPause}
          />
        )}

        <div className="modal-controls">
          <button className="btn" onClick={prevMedia}>
            <FaChevronLeft /> Previous
          </button>
          
          {currentMedia.type === 'image' && (
            <button className="btn" onClick={onToggleSlideshow}>
              {slideshowActive ? <FaPause /> : <FaPlay />}
              {slideshowActive ? 'Pause' : 'Slideshow'}
            </button>
          )}
          
          <button className="btn" onClick={toggleFullScreen}>
            {isFullScreen ? <FaCompress /> : <FaExpand />}
            {isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>

          <button className="btn" onClick={nextMedia}>
            Next <FaChevronRight />
          </button>
        </div>

        <div className="modal-info">
          <div>{currentMedia.name}</div>
          <div>{currentIndex + 1} of {media.allFiles.length}</div>
          {slideshowActive && currentMedia.type === 'image' && (
            <div>Slideshow: {slideshowInterval}s intervals</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaViewer;