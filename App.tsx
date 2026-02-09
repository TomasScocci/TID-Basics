import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Settings from './pages/Settings';
import { MasterTemplateProvider } from './context/MasterTemplateContext';
import { DEFAULT_MODEL_URL } from './components/Scene3D';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Internal Layout component
const MainLayout: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  
  // Local state for the Viewer
  const [modelUrl, setModelUrl] = useState<string>(DEFAULT_MODEL_URL);
  const [textureUrl, setTextureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route 
          path="/" 
          element={
            <Home 
              isDarkMode={isDarkMode} 
              toggleTheme={toggleTheme} 
              modelUrl={modelUrl} 
              textureUrl={textureUrl}
            />
          } 
        />
        <Route 
          path="/admin" 
          element={
            <Admin 
              isDarkMode={isDarkMode} 
              toggleTheme={toggleTheme} 
              setModelUrl={setModelUrl} 
              setTextureUrl={setTextureUrl}
            />
          } 
        />
         <Route 
          path="/settings" 
          element={
            <Settings 
              isDarkMode={isDarkMode} 
              toggleTheme={toggleTheme} 
            />
          } 
        />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <MasterTemplateProvider>
      <MainLayout />
    </MasterTemplateProvider>
  );
};

export default App;