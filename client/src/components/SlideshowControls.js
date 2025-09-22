import React from 'react';
import { FaPlay, FaPause, FaClock } from 'react-icons/fa';

const SlideshowControls = ({ 
  isActive, 
  interval, 
  onToggle, 
  onIntervalChange 
}) => {
  return (
    <div className="slideshow-controls">
      <button className="btn" onClick={onToggle}>
        {isActive ? <FaPause /> : <FaPlay />}
        {isActive ? 'Stop' : 'Start'} Slideshow
      </button>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <FaClock />
        <input
          type="number"
          min="1"
          max="60"
          value={interval}
          onChange={(e) => onIntervalChange(parseInt(e.target.value) || 5)}
        />
        <span style={{ fontSize: '0.8rem', color: '#ccc' }}>seconds</span>
      </div>
    </div>
  );
};

export default SlideshowControls;