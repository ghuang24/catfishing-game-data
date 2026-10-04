import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/alegreya/latin-400.css';
import '@fontsource/alegreya/latin-500.css';
import '@fontsource/alegreya-sans/latin-500.css';
import '@fontsource/alegreya-sans/latin-700.css';
import App from './App.jsx';
import './styles/base.css';
import './styles/answer-search.css';
import './styles/report-header.css';
import './styles/filters.css';
import './styles/results.css';
import './styles/page-rails.css';
import './styles/pagination.css';
import './styles/responsive.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
