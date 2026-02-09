
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_MODEL_URL } from '../components/Scene3D';
import { useMasterTemplate } from '../context/MasterTemplateContext';
import { analyzeGarmentImages } from '../services/geminiService';
import { runNeuralPipeline } from '../services/neuralEngine';
import { PipelineStage, PipelineLog } from '../types';

interface AdminProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  // setModelUrl removed, now handled via Context
  setTextureUrl?: (url: string | null) => void;
}

interface UploadedFile {
  name: string;
  size: string;
  status: 'ready' | 'processing';
  file?: File; // Store the actual file object for local preview
}

const Admin: React.FC<AdminProps> = ({ 
    isDarkMode, 
    toggleTheme, 
    setTextureUrl, 
}) => {
  
  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'juandartes123') {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setPasswordInput('');
    }
  };

  const { masterTemplateUrl, isCustom, updateCurrentModel } = useMasterTemplate();
  
  // UI Tabs
  const [activeTab, setActiveTab] = useState<'library' | 'generator'>('library');

  // --- STATE: Asset Library ---
  const glbInputRef = useRef<HTMLInputElement>(null);
  const [recentUploads, setRecentUploads] = useState<UploadedFile[]>([
    { name: "TID_Basic_Tee_v4.glb", size: "12.4 MB", status: 'ready' },
    { name: "Cargo_Pants_Blk.glb", size: "8.2 MB", status: 'ready' }
  ]);
  const [selectedUploadIndex, setSelectedUploadIndex] = useState<number | null>(null);

  // --- STATE: AI Generator ---
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>(PipelineStage.IDLE);
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- HELPERS ---
  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message, type }]);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // --- HANDLERS: Asset Library ---
  const triggerGlbUpload = () => {
    glbInputRef.current?.click();
  };

  const process3DFile = (file: File) => {
    if (!file.name.match(/\.(glb|gltf|fbx)$/i)) {
      alert(`Invalid file format: ${file.name}. Please upload .glb, .gltf, or .fbx.`);
      return;
    }

    const fileSize = (file.size / (1024 * 1024)).toFixed(2) + " MB";

    // Simulate upload process
    setTimeout(() => {
      setRecentUploads(prev => [{
        name: file.name,
        size: fileSize,
        status: 'ready',
        file: file // Store the file for local preview
      }, ...prev]);
    }, 1000);
  };

  const handleGlbSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      process3DFile(file);
    }
  };

  const handleExecuteRender = async () => {
    if (selectedUploadIndex === null) return;
    
    const selectedFile = recentUploads[selectedUploadIndex];
    
    if (selectedFile.file) {
      try {
        // Save to Database via Context
        await updateCurrentModel(selectedFile.file);
        if (setTextureUrl) setTextureUrl(null); 
        alert(`Model "${selectedFile.name}" set as Active Render and saved to DB.`);
      } catch (e) {
        alert("Failed to save model to database.");
      }
    } else {
      // Fallback for demo static files
      alert(`Cannot load legacy asset "${selectedFile.name}" in demo mode. Please upload a real GLB file.`);
    }
  };

  const handleResetView = async () => {
    // Note: To fully reset to DEFAULT_MODEL_URL we would need a clearCurrentModel function exposed, 
    // but for now we just don't call updateCurrentModel to avoid overriding user selection logic too aggressively.
    // Ideally this would reset the context state.
    if (setTextureUrl) setTextureUrl(null);
    alert("Resetting Texture overlay only. To change model, select a new one from library.");
  };

  // --- HANDLERS: AI Generator ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (type === 'front') {
        setFrontImage(file);
        setFrontPreview(url);
      } else {
        setBackImage(file);
        setBackPreview(url);
      }
    }
  };

  const handleRunPipeline = async () => {
    if (!frontImage) return;

    setIsProcessing(true);
    setLogs([]);
    setPipelineStage(PipelineStage.IDLE);

    try {
      addLog("Initializing Neural Pipeline...", "info");
      
      // 1. Convert Images
      const frontB64 = await fileToBase64(frontImage);
      const backB64 = backImage ? await fileToBase64(backImage) : null;

      // 2. Gemini Analysis
      addLog("Sending image data to Gemini 2.5 Vision...", "info");
      const analysis = await analyzeGarmentImages(frontB64, backB64);
      addLog(`Gemini Analysis: ${analysis}`, "success");

      // 3. 3D Processing
      addLog("Starting UV Projection Engine...", "info");
      const generatedGlb = await runNeuralPipeline(
        frontB64,
        backB64,
        masterTemplateUrl,
        (msg, type) => addLog(msg, type),
        (stage) => setPipelineStage(stage)
      );

      // 4. Success
      const fileSize = (generatedGlb.size / (1024 * 1024)).toFixed(2) + " MB";
      const newFile: UploadedFile = {
        name: generatedGlb.name,
        size: fileSize,
        status: 'ready',
        file: generatedGlb
      };

      setRecentUploads(prev => [newFile, ...prev]);
      setActiveTab('library');
      setSelectedUploadIndex(0); // Select the new file
      addLog("Asset generated successfully. Redirecting to Library.", "success");

    } catch (error) {
      addLog("Critical Pipeline Failure.", "error");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag & Drop specific helpers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropLibrary = (e: React.DragEvent) => {
     e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) process3DFile(file);
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 font-body transition-colors duration-300 min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-[#171717]/70 glass-panel">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="material-icons text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">arrow_back</span>
              <span className="text-sm uppercase tracking-widest font-display text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors">Home</span>
            </Link>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display font-bold text-2xl italic tracking-tight">TID</span>
            <span className="font-display font-light text-2xl tracking-tight">basics</span>
            <span className="text-[0.6rem] font-bold uppercase tracking-wider relative -top-3 ml-1 text-indigo-500">Manager</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/settings" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" title="Settings">
                <span className="material-icons text-gray-600 dark:text-gray-300">settings</span>
            </Link>
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="material-icons text-gray-600 dark:text-gray-300">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-200 to-gray-400 dark:from-gray-700 dark:to-gray-600 border border-gray-300 dark:border-gray-500"></div>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <main className="flex-grow pt-24 pb-12 px-6 relative overflow-hidden">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px]"></div>
           <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.1]" style={{backgroundImage: 'radial-gradient(#999 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>
        </div>

        {/* --- LOCK SCREEN VS CONTENT --- */}
        {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center h-[60vh] relative z-10 animate-in fade-in duration-700">
                <div className="bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 p-10 rounded-sm shadow-2xl max-w-sm w-full text-center relative overflow-hidden group">
                    {/* Top red line for 'security' feel */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500 opacity-80"></div>
                    
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                       <span className="material-icons text-3xl text-gray-400">lock_person</span>
                    </div>
                    
                    <h2 className="text-lg font-display font-bold mb-2 uppercase tracking-[0.2em]">Restricted Access</h2>
                    <p className="text-gray-500 text-xs mb-8 font-mono leading-relaxed">
                       Security clearance required to access<br/>neural asset pipeline.
                    </p>
                    
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                       <div className="relative">
                           <input 
                               type="password" 
                               value={passwordInput}
                               onChange={(e) => setPasswordInput(e.target.value)}
                               placeholder="ACCESS KEY"
                               className={`w-full bg-transparent border-b-2 p-3 text-center tracking-widest font-mono text-sm outline-none transition-colors
                                   ${authError 
                                       ? 'border-red-500 text-red-500 placeholder-red-300' 
                                       : 'border-gray-300 dark:border-gray-700 focus:border-indigo-500 text-black dark:text-white'
                                   }`}
                               autoFocus
                           />
                           {authError && (
                               <span className="absolute -bottom-5 left-0 w-full text-[10px] text-red-500 font-mono uppercase">
                                   Invalid Credentials
                               </span>
                           )}
                       </div>
                       
                       <button 
                           type="submit" 
                           className="mt-6 bg-black dark:bg-white text-white dark:text-black py-3 text-xs font-bold uppercase tracking-widest hover:opacity-80 transition-all flex items-center justify-center gap-2 group-hover:shadow-lg"
                       >
                           <span className="material-icons text-sm">key</span>
                           Unlock
                       </button>
                    </form>
                </div>
                <div className="mt-8 text-[10px] font-mono text-gray-400">
                   TID BASICS SECURITY LAYER v1.0
                </div>
            </div>
        ) : (
            <div className="max-w-4xl mx-auto h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                <h1 className="text-4xl md:text-5xl font-display font-light mb-2">3D Asset Manager</h1>
                <p className="text-gray-500 dark:text-gray-400 font-mono text-sm">
                    Pipeline Mode: {activeTab === 'library' ? 'Direct Upload' : 'Neural Generation'}
                </p>
                </div>
                <div className="flex gap-2">
                <button 
                    onClick={handleResetView}
                    className="px-4 py-2 text-xs font-mono uppercase border border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white transition-colors bg-transparent text-gray-900 dark:text-gray-100 flex items-center gap-2"
                >
                    <span className="material-icons text-sm">restart_alt</span>
                    Reset Textures
                </button>
                </div>
            </header>

            {/* TABS */}
            <div className="flex gap-8 border-b border-gray-200 dark:border-gray-800 mb-8">
                <button 
                    onClick={() => setActiveTab('library')}
                    className={`pb-4 text-sm font-medium uppercase tracking-widest transition-all ${activeTab === 'library' ? 'text-black dark:text-white border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Asset Library
                </button>
                <button 
                    onClick={() => setActiveTab('generator')}
                    className={`pb-4 text-sm font-medium uppercase tracking-widest transition-all ${activeTab === 'generator' ? 'text-black dark:text-white border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    AI Generator <span className="ml-1 text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">BETA</span>
                </button>
            </div>

            <div className="w-full h-full">
                
                {/* VIEW 1: ASSET LIBRARY (Original) */}
                {activeTab === 'library' && (
                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 h-full p-1 relative group overflow-hidden shadow-xl rounded-sm">
                        <div className="absolute top-0 left-0 w-full h-1 bg-black dark:bg-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="p-8 md:p-12 h-full flex flex-col relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-display font-medium">Model Upload</h2>
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-[10px] font-mono uppercase tracking-wider text-gray-500 rounded">.GLB / .GLTF</span>
                        </div>
                        
                        <div className="flex-grow flex flex-col justify-center">
                            <div 
                                onClick={triggerGlbUpload}
                                onDragOver={handleDragOver}
                                onDrop={handleDropLibrary}
                                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-16 flex flex-col items-center justify-center text-center hover:border-black dark:hover:border-white hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer group/dropzone min-h-[200px]"
                            >
                            <input 
                                type="file" 
                                ref={glbInputRef}
                                onChange={handleGlbSelect}
                                accept=".glb,.gltf,.fbx"
                                className="hidden" 
                            />
                            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6 group-hover/dropzone:scale-110 transition-transform">
                                <span className="material-icons text-3xl text-gray-400 dark:text-gray-500">cloud_upload</span>
                            </div>
                            <h3 className="text-xl font-medium mb-3">Drag & Drop 3D Model</h3>
                            <p className="text-sm text-gray-500 max-w-[240px] mb-8 leading-relaxed">
                                Support for GLB, GLTF, FBX (Max 100MB). <br/>
                                Optimized for Three.js rendering.
                            </p>
                            <button className="bg-black text-white dark:bg-white dark:text-black px-8 py-3 text-sm font-medium uppercase tracking-wide hover:opacity-80 transition-opacity rounded pointer-events-none">
                                Browse Files
                            </button>
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xs font-mono uppercase text-gray-400">Asset Library</h4>
                                {selectedUploadIndex !== null && (
                                    <button 
                                        onClick={handleExecuteRender}
                                        className="text-[10px] font-bold uppercase tracking-wide bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                                    >
                                        <span className="material-icons text-[14px]">view_in_ar</span>
                                        Render Selected Asset
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3">
                            {recentUploads.map((file, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => setSelectedUploadIndex(idx)}
                                    className={`flex items-center justify-between p-4 border transition-all cursor-pointer rounded-lg ${
                                        selectedUploadIndex === idx 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500' 
                                        : 'bg-gray-50 dark:bg-gray-800/50 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                                    }`}
                                >
                                <div className="flex items-center gap-4">
                                    <span className={`material-icons text-lg ${selectedUploadIndex === idx ? 'text-indigo-500' : 'text-gray-400'}`}>
                                        {selectedUploadIndex === idx ? 'radio_button_checked' : 'inventory_2'}
                                    </span>
                                    <div className="flex flex-col text-left">
                                        <span className="text-sm font-medium">{file.name}</span>
                                        <span className="text-[10px] text-gray-500 font-mono">{file.size}</span>
                                    </div>
                                </div>
                                <span className={`w-2 h-2 rounded-full ${file.status === 'ready' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]' : 'bg-yellow-500 animate-pulse'}`}></span>
                                </div>
                            ))}
                            </div>
                        </div>
                        </div>
                    </div>
                    </div>
                )}

                {/* VIEW 2: AI GENERATOR */}
                {activeTab === 'generator' && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Input Area and Controls remain unchanged... */}
                         {/* Input Area */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Front View */}
                            <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 p-6 rounded-sm relative">
                                <h3 className="text-xs font-mono uppercase text-gray-500 mb-4 flex justify-between">
                                    Input Source A 
                                    <span className="text-indigo-500">*REQUIRED</span>
                                </h3>
                                <div 
                                    onClick={() => frontInputRef.current?.click()}
                                    className={`h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative
                                        ${frontPreview ? 'border-indigo-500' : 'border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white'}`}
                                >
                                    <input 
                                        type="file" 
                                        ref={frontInputRef}
                                        onChange={(e) => handleImageSelect(e, 'front')}
                                        accept="image/*"
                                        className="hidden" 
                                    />
                                    {frontPreview ? (
                                        <img src={frontPreview} alt="Front" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="text-center p-4">
                                            <span className="material-icons text-4xl text-gray-300 mb-2">add_a_photo</span>
                                            <p className="text-sm font-medium">Front View</p>
                                        </div>
                                    )}
                                    {frontPreview && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <span className="text-white text-xs uppercase tracking-widest">Replace Image</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Back View */}
                            <div className="bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 p-6 rounded-sm relative">
                                <h3 className="text-xs font-mono uppercase text-gray-500 mb-4 flex justify-between">
                                    Input Source B 
                                    <span className="text-gray-400">OPTIONAL</span>
                                </h3>
                                <div 
                                    onClick={() => backInputRef.current?.click()}
                                    className={`h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative
                                        ${backPreview ? 'border-indigo-500' : 'border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white'}`}
                                >
                                    <input 
                                        type="file" 
                                        ref={backInputRef}
                                        onChange={(e) => handleImageSelect(e, 'back')}
                                        accept="image/*"
                                        className="hidden" 
                                    />
                                    {backPreview ? (
                                        <img src={backPreview} alt="Back" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="text-center p-4">
                                            <span className="material-icons text-4xl text-gray-300 mb-2">add_a_photo</span>
                                            <p className="text-sm font-medium">Back View</p>
                                        </div>
                                    )}
                                    {backPreview && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <span className="text-white text-xs uppercase tracking-widest">Replace Image</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Controls & Terminal */}
                        <div className="bg-black text-green-500 font-mono text-xs p-6 rounded-sm border border-gray-800 shadow-2xl relative overflow-hidden">
                            
                            {/* Run Button */}
                            <div className="absolute top-4 right-4 z-10">
                                <button 
                                    onClick={handleRunPipeline}
                                    disabled={!frontImage || isProcessing}
                                    className={`px-6 py-2 uppercase font-bold tracking-widest text-xs rounded transition-all flex items-center gap-2
                                        ${!frontImage || isProcessing 
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                                            : 'bg-green-600 text-black hover:bg-green-500 hover:shadow-[0_0_15px_rgba(34,197,94,0.5)]'}`}
                                >
                                    {isProcessing ? (
                                        <span className="flex items-center gap-2">Processing <span className="animate-spin material-icons text-xs">autorenew</span></span>
                                    ) : (
                                        "Initialize Sequence"
                                    )}
                                </button>
                            </div>

                            <div className="mb-2 uppercase opacity-50 tracking-widest">Neural_Engine_Output // v2.5.0</div>
                            <div className="h-48 overflow-y-auto space-y-1 font-light scrollbar-thin scrollbar-thumb-gray-700 pr-2">
                                {logs.length === 0 && (
                                    <div className="text-gray-600 italic">Waiting for input stream...</div>
                                )}
                                {logs.map((log, i) => (
                                    <div key={i} className="flex gap-4">
                                        <span className="opacity-50 w-16 shrink-0">{log.timestamp}</span>
                                        <span className={`
                                            ${log.type === 'error' ? 'text-red-500 font-bold' : ''}
                                            ${log.type === 'success' ? 'text-white font-semibold' : ''}
                                            ${log.type === 'warning' ? 'text-yellow-500' : ''}
                                        `}>
                                            <span className="mr-2">{'>'}</span>{log.message}
                                        </span>
                                    </div>
                                ))}
                                {/* Auto-scroll anchor */}
                                <div ref={logsEndRef} />
                            </div>
                        </div>
                    </div>
                )}

            </div>
            
            <footer className="mt-12 border-t border-gray-200 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center text-sm text-gray-500">
                <div className="flex gap-8 mb-4 md:mb-0">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-mono uppercase tracking-wider mb-1">Storage Status</span>
                        <span className="text-green-600 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Local Ready</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-mono uppercase tracking-wider mb-1">AI Pipeline</span>
                        <span className={`font-medium flex items-center gap-1 ${process.env.API_KEY ? 'text-green-600' : 'text-yellow-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${process.env.API_KEY ? 'bg-green-500' : 'bg-yellow-500'}`}></span> 
                            {process.env.API_KEY ? 'Connected' : 'Simulation Mode'}
                        </span>
                    </div>
                </div>
                <div className="text-[10px] font-mono opacity-50">
                    ID: TID_VIEWER_LITE
                </div>
            </footer>
            </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
