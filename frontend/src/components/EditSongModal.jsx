import React, { useState } from 'react';
import axios from 'axios';
import CustomDropdown from './CustomDropdown';
import '../styles/admin.css';

export default function EditSongModal({ song, albums, onSave, onClose }) {
  const [formData, setFormData] = useState({
    title: song.title,
    artist: song.artist,
    albumId: song.albumId || '',
    language: song.language
  });
  const [audioFile, setAudioFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.artist) {
      setMessage('Please fill all required fields');
      return;
    }

    setIsSaving(true);
    setMessage('');

    const data = new FormData();
    data.append('title', formData.title);
    data.append('artist', formData.artist);
    data.append('albumId', formData.albumId);
    data.append('language', formData.language);
    
    if (audioFile) data.append('audio', audioFile);
    if (thumbnailFile) data.append('thumbnail', thumbnailFile);

    try {
      const response = await axios.put(`/api/admin/songs/${song.id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onSave(response.data.song);
      setMessage('Song updated successfully!');
    } catch (error) {
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Edit Song</h3>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-form">
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

          <div className="file-update-section">
            <h4>Update Files (Optional)</h4>
            <div className="file-inputs">
              <div className="file-input-group">
                <label>Audio File</label>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a"
                  onChange={(e) => setAudioFile(e.target.files[0])}
                />
                {audioFile && (
                  <div className="file-info">
                    <i className="fas fa-music"></i>
                    <span>{audioFile.name}</span>
                  </div>
                )}
                <small>Leave empty to keep current audio file</small>
              </div>

              <div className="file-input-group">
                <label>Thumbnail Image</label>
                <input
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={(e) => setThumbnailFile(e.target.files[0])}
                />
                {thumbnailFile && (
                  <div className="file-info">
                    <i className="fas fa-image"></i>
                    <span>{thumbnailFile.name}</span>
                  </div>
                )}
                <small>Leave empty to keep current thumbnail</small>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="save-btn"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Save Changes
                </>
              )}
            </button>
          </div>

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
