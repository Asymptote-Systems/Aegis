// FILE: src/main.jsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";
import './index.css';

// Import the Toaster component
import { Toaster } from "@/components/ui/sonner";

// We will put all the <Routes> inside this App component
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster richColors /> {/* ← Add this line */}
    </BrowserRouter>
  </StrictMode>,
);
