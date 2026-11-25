import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

const container = document.getElementById('root')!;
const application = <React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>;
if (window.location.pathname === '/' && container.hasChildNodes()) hydrateRoot(container, application);
else createRoot(container).render(application);
