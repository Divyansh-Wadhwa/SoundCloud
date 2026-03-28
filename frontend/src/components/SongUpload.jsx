import React, { useState, useRef } from 'react';
import axios from 'axios';
import CustomDropdown from './CustomDropdown';
import '../styles/admin.css';

export default function SongUpload({ albums, onSongAdded }) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    albumId: '',
    language: 'English'
  });
  const [audioFile, setAudioFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [message, setMessage] = useState('');
  
  const audioInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.artist || !audioFile || !thumbnailFile) {
      setMessage('Please fill all fields and select both audio and thumbnail files');
      return;
    }

    setIsUploading(true);
    setMessage('');

    const data = new FormData();
    data.append('title', formData.title);
    data.append('artist', formData.artist);
    data.append('albumId', formData.albumId);
    data.append('language', formData.language);
    data.append('audio', audioFile);
    data.append('thumbnail', thumbnailFile);

    try {
      const response = await axios.post('/api/admin/songs', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        },
      });

      setMessage('Song uploaded successfully!');
      onSongAdded && onSongAdded(response.data.song);
      
      // Reset form
      setFormData({ title: '', artist: '', albumId: '', language: 'English' });
      setAudioFile(null);
      setThumbnailFile(null);
      setUploadProgress(0);
      
      if (audioInputRef.current) audioInputRef.current.value = '';
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
      
    } catch (error) {
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="song-upload-container">
      <div className="upload-card">
        <h3>Upload New Song</h3>
        
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-row">
            <div className="form-group">
              <label>Song Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter song title"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Artist *</label>
              <input
                type="text"
                name="artist"
                value={formData.artist}
                onChange={handleInputChange}
                placeholder="Enter artist name"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Album</label>
              <CustomDropdown
                value={formData.albumId}
                onChange={(value) => setFormData(prev => ({ ...prev, albumId: value }))}
                options={[
                  { value: '', label: 'No Album' },
                  ...albums.map(album => ({
                    value: album.id,
                    label: `${album.name} - ${album.artist}`
                  }))
                ]}
                placeholder="Select album"
              />
            </div>
            
            <div className="form-group">
              <label>Language</label>
              <CustomDropdown
                value={formData.language}
                onChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
                options={[
                  { value: 'English', label: 'English' },
                  { value: 'Hindi', label: 'Hindi' },
                  { value: 'Spanish', label: 'Spanish' },
                  { value: 'French', label: 'French' },
                  { value: 'German', label: 'German' },
                  { value: 'Japanese', label: 'Japanese' },
                  { value: 'Korean', label: 'Korean' },
                  { value: 'Other', label: 'Other' }
                ]}
                placeholder="Select language"
              />
            </div>
          </div>

          <div className="file-upload-section">
            <div className="file-inputs">
              <div className="file-input-group">
                <label>Audio File *</label>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a"
                  onChange={(e) => setAudioFile(e.target.files[0])}
                  required
                />
                {audioFile && (
                  <div className="file-info">
                    <i className="fas fa-music"></i>
                    <span>{audioFile.name}</span>
                  </div>
                )}
              </div>

              <div className="file-input-group">
                <label>Thumbnail Image *</label>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={(e) => setThumbnailFile(e.target.files[0])}
                  required
                />
                {thumbnailFile && (
                  <div className="file-info">
                    <i className="fas fa-image"></i>
                    <span>{thumbnailFile.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isUploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span>Uploading... {uploadProgress}%</span>
            </div>
          )}

          <button 
            type="submit" 
            className="upload-btn"
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Uploading...
              </>
            ) : (
              <>
                <i className="fas fa-upload"></i>
                Upload Song
              </>
            )}
          </button>

          {message && (
            <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
