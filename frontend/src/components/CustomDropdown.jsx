import React, { useState, useRef, useEffect } from 'react';

export default function CustomDropdown({ value, onChange, options, placeholder, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(option => option.value === value) || options[0];

  return (
    <div className={`custom-dropdown ${className || ''}`} ref={dropdownRef}>
      <div 
        className="custom-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
      </div>
      
      {isOpen && (
        <div className="custom-dropdown-options">
          {options.map(option => (
            <div
              key={option.value}
              className={`custom-dropdown-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
      
      </div>
  );
}
