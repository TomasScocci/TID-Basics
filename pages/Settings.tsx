import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMasterTemplate } from '../context/MasterTemplateContext';

interface SettingsProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  isDarkMode, 
  toggleTheme, 
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Consumption of the Global Persistence Context
  const { 
    isCustom, 
    isLoading, 
    uploadMasterTemplate, 
    resetMasterTemplate 
  } = useMasterTemplate();

  const handleFileUpload = async (file: File) => {
    if (!file.name.match(/\.(glb|gltf)$/i)) {
      alert("Please upload a .glb or .gltf file.");
      return;
    }

    try {
      await uploadMasterTemplate(file);
      setStatusMsg(`Successfully cached: ${file.name}`);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e) {
      alert("Error saving model to database.");
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to revert to the factory default model? This will delete your custom .glb.")) {
        await resetMasterTemplate();
        setStatusMsg("Restored factory default model.");
        setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 font-body transition-colors duration-300 min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#171717]/70 glass-panel">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-2 group">
              <span className="material-icons text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">arrow_back</span>
              <span className="text-sm uppercase tracking-widest font-display text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors">Back to Admin</span>
            </Link>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display font-bold text-2xl italic tracking-tight">TID</span>
            <span className="font-display font-light text-2xl tracking-tight">settings</span>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="material-icons text-gray-600 dark:text-gray-300">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow pt-24 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-display font-light mb-2">Base Model Configuration</h1>
            <p className="text-gray-500 dark:text-gray-400 font-mono text-sm">Define the "Ground Truth" geometry for the AI Generation Pipeline.</p>
          </header>

          <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 p-8 rounded-sm shadow-xl relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full transition-colors duration-300 ${isLoading ? 'bg-yellow-500' : 'bg-indigo-500'}`}></div>
            
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-medium mb-2">Default 3D Asset</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                  This model is stored locally in your browser's database and persists across sessions. 
                  It acts as the canvas for all AI-generated textures.
                </p>
              </div>
              <div className="text-right">
                  <div className="text-[10px] uppercase font-mono tracking-wider mb-1 text-gray-500">Current Status</div>
                  <div className={`text-sm font-medium ${isCustom ? 'text-indigo-500' : 'text-gray-400'}`}>
                      {isCustom ? 'Custom Database Model' : 'Factory Default'}
                  </div>
              </div>
            </div>

            <div 
              onClick={() => !isLoading && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer group relative
                ${isDragging 
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                  : 'border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={onFileSelect}
                accept=".glb,.gltf"
                className="hidden" 
              />
              
              {isLoading ? (
                  <div className="flex flex-col items-center animate-pulse">
                      <span className="material-icons text-3xl text-indigo-500 mb-4 animate-spin">refresh</span>
                      <span className="text-sm font-mono uppercase">Writing to Database...</span>
                  </div>
              ) : (
                <>
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110
                     ${isCustom ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <span className={`material-icons text-3xl ${isCustom ? 'text-indigo-500' : 'text-gray-400'}`}>
                      {isCustom ? 'database' : 'view_in_ar'}
                    </span>
                  </div>
                  
                  {statusMsg ? (
                      <h3 className="text-lg font-medium text-green-500 mb-2">{statusMsg}</h3>
                  ) : (
                      <>
                        <h3 className="text-lg font-medium mb-2">{isCustom ? 'Replace Custom Model' : 'Upload Base .GLB'}</h3>
                        <p className="text-sm text-gray-500 max-w-[250px] mx-auto mb-6">Drag & drop your standard garment mesh here.</p>
                        <span className="bg-black text-white dark:bg-white dark:text-black px-6 py-2 text-xs font-medium uppercase tracking-wide rounded">Select File</span>
                      </>
                  )}
                </>
              )}
            </div>

            <div className="mt-8 flex justify-between items-center">
                 <div>
                    {isCustom && (
                        <button 
                            onClick={handleReset}
                            disabled={isLoading}
                            className="text-red-500 hover:text-red-400 text-xs font-mono uppercase tracking-wide border-b border-transparent hover:border-red-500 transition-all pb-0.5"
                        >
                            Reset to Default
                        </button>
                    )}
                 </div>
                 <button 
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-2 text-indigo-500 hover:text-indigo-400 font-medium text-sm transition-colors"
                 >
                    Return to Pipeline
                    <span className="material-icons text-sm">arrow_forward</span>
                 </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
