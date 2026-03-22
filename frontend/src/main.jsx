import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import axios from 'axios';

// Configure axios base
axios.defaults.baseURL = 'http://localhost:5000';
axios.defaults.withCredentials = true;

// Override fetch to include credentials by default for proxy
const originalFetch = window.fetch;
window.fetch = function() {
    let [resource, config] = arguments;
    if(resource.startsWith('/api')) {
        resource = 'http://localhost:5000' + resource;
    }
    if(!config) {
        config = {};
    }
    config.credentials = 'include';
    return originalFetch(resource, config);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
