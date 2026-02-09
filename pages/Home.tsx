import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import Scene3D from '../components/Scene3D';

interface HomeProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  modelUrl: string;
  textureUrl?: string | null;
}

const Home: React.FC<HomeProps> = ({ isDarkMode, toggleTheme, modelUrl, textureUrl }) => {
  return (
    <div className="bg-marble bg-black text-white min-h-screen flex flex-col overflow-hidden selection:bg-white selection:text-black relative">
      
      {/* Lighting Overlay: Warm light from top, fading to dark at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-100/10 via-black/40 to-black/90 pointer-events-none z-0"></div>

      {/* Top Header Bar: Contains Title (Center) and Nav (Right) */}
      <header className="absolute top-0 left-0 w-full z-50 px-8 py-8 flex justify-between items-start pointer-events-none">
        
        {/* Left Spacer for Balance */}
        <div className="w-1/3 hidden md:block"></div>

        {/* Center: Main Title T.I.D */}
        <div className="w-full md:w-1/3 flex justify-center pointer-events-auto">
             <h1 className="font-serif font-bold text-5xl md:text-6xl tracking-widest text-chrome relative top-[-8px]">T.I.D</h1>
        </div>

        {/* Right: Asset Manager Button */}
        <div className="w-full md:w-1/3 flex justify-end pointer-events-auto absolute md:relative top-8 right-8 md:top-0 md:right-0">
            <Link 
                to="/admin"
                className="flex items-center gap-2 px-6 py-2 text-[10px] font-medium tracking-[0.2em] uppercase rounded-full border border-white/20 hover:bg-white hover:text-black transition-all duration-500 bg-black/20 backdrop-blur-sm"
            >
                Asset Manager
                <span className="material-icons text-sm">arrow_forward</span>
            </Link>
        </div>
      </header>

      {/* Main Content Layout - Flex Column for Strict Vertical Ordering */}
      <main className="relative z-10 flex-grow flex flex-col items-center w-full h-full pt-28 md:pt-32">
        
        {/* 1. Hero Text Block (Top Center - Below Title) */}
        <div className="flex flex-col items-center justify-center z-30 mb-2 text-center">
            {/* Sub-brand & Status - TIDbasics (Mixed Fonts, Chrome) */}
            <div className="flex flex-col items-center justify-center">
                <div className="flex items-baseline gap-1 text-chrome drop-shadow-2xl">
                    {/* TID: Sans-serif, Black Weight, Italic to match the heavy slant */}
                    <span className="font-body font-black italic text-5xl md:text-7xl tracking-tighter">TID</span>
                    {/* basics: Sans-serif, Regular weight */}
                    <span className="font-body font-normal text-5xl md:text-7xl tracking-tight">basics</span>
                </div>
                {/* SOON: Serif, Italic */}
                <span className="font-serif italic text-xl md:text-2xl mt-3 tracking-[0.1em] text-chrome opacity-90">SOON</span>
            </div>
        </div>

        {/* 2. 3D Viewer Container (Fills remaining space) */}
        <div className="flex-grow w-full relative z-20 flex items-center justify-center min-h-[400px]">
            {/* Pedestal Light Effect */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[400px] h-[50px] bg-white/5 blur-[40px] rounded-[100%] pointer-events-none"></div>
            
            {/* Scene Canvas */}
            <div className="w-full h-full absolute inset-0">
                <Suspense fallback={
                    <div className="w-full h-full flex items-center justify-center text-white/30 font-serif italic text-sm animate-pulse">
                    Loading Collection...
                    </div>
                }>
                    <Scene3D key={modelUrl} modelUrl={modelUrl} textureUrl={textureUrl} />
                </Suspense>
            </div>

            {/* 3. Bottom Pedestal Text Overlay - Moved inside relative container to sit on 3D Pedestal */}
            <div className="absolute bottom-[8%] md:bottom-[10%] left-0 w-full flex flex-col items-center justify-center z-20 pointer-events-none">
                <span className="text-[10px] md:text-xs font-semibold tracking-[0.3em] text-white/90 font-body drop-shadow-lg mb-2">
                    COLECCIÓN EXCLUSIVA
                </span>
                <div className="w-[260px] md:w-[320px] h-[1px] bg-white/40 shadow-sm mb-2"></div>
                <span className="text-[9px] md:text-[11px] font-medium tracking-[0.2em] text-white/70 font-body drop-shadow-md">
                    NO DUERMAS
                </span>
            </div>
        </div>

      </main>

    </div>
  );
};

export default Home;