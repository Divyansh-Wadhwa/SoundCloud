import React, { useState, useEffect } from 'react';
import './Modal.css';

export default function Modal() {
  const [active, setActive] = useState(false);
  const [options, setOptions] = useState({});
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // Expose globally so components can trigger it easily just like the old layout.ejs did
    window.showModal = (opts) => {
      setOptions(opts);
      setInputValue('');
      setActive(true);
    };
    window.closeModal = () => {
      setActive(false);
    };
    
    const handleEsc = (e) => { if (e.key === 'Escape') setActive(false); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  if (!active) return null;

  const handleConfirm = () => {
    if (options.input) {
      if (inputValue.trim() && options.onConfirm) {
        options.onConfirm(inputValue.trim());
      }
    } else if (options.onConfirm) {
      options.onConfirm();
    }
    setActive(false);
  };

  return (
    <div className="custom-modal active">
      <div className="modal-overlay" onClick={() => setActive(false)}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h3>{options.title || 'Confirm'}</h3>
          <button className="modal-close" onClick={() => setActive(false)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {options.message && <p>{options.message}</p>}
          {options.input && (
            <input 
              type="text" 
              className="modal-input" 
              placeholder={options.placeholder || ''}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              autoFocus
            />
          )}
        </div>
        <div className="modal-footer">
          {options.showCancel !== false && (
            <button className="modal-btn modal-btn-cancel" onClick={() => setActive(false)}>Cancel</button>
          )}
          <button 
            className={`modal-btn modal-btn-confirm ${options.danger ? 'danger' : ''}`} 
            onClick={handleConfirm}
          >
            {options.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
