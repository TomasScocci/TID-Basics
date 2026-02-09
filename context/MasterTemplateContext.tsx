
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  saveMasterModel, getMasterModel, clearMasterModel,
  saveCurrentModel, getCurrentModel
} from '../utils/storage';
import { DEFAULT_MODEL_URL } from '../components/Scene3D';

interface MasterTemplateContextType {
  // Master Template (For AI Pipeline)
  masterTemplateUrl: string;
  isCustom: boolean; 
  isLoading: boolean;
  uploadMasterTemplate: (file: File) => Promise<void>;
  resetMasterTemplate: () => Promise<void>;
  
  // Current Display Model (For Viewer)
  currentModelUrl: string;
  updateCurrentModel: (file: File) => Promise<void>;
}

const MasterTemplateContext = createContext<MasterTemplateContextType | undefined>(undefined);

export const MasterTemplateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // AI Template State
  const [masterTemplateUrl, setMasterTemplateUrl] = useState<string>(DEFAULT_MODEL_URL);
  const [isCustom, setIsCustom] = useState<boolean>(false);
  
  // Viewer Display State
  const [currentModelUrl, setCurrentModelUrl] = useState<string>(DEFAULT_MODEL_URL);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load from DB on mount
  useEffect(() => {
    const initDatabases = async () => {
      try {
        // 1. Load Master Template (AI)
        const masterBlob = await getMasterModel();
        if (masterBlob) {
          setMasterTemplateUrl(URL.createObjectURL(masterBlob));
          setIsCustom(true);
        } else {
          setMasterTemplateUrl(DEFAULT_MODEL_URL);
          setIsCustom(false);
        }

        // 2. Load Current Active Model (Viewer)
        const currentBlob = await getCurrentModel();
        if (currentBlob) {
          setCurrentModelUrl(URL.createObjectURL(currentBlob));
        } else {
          setCurrentModelUrl(DEFAULT_MODEL_URL);
        }

      } catch (error) {
        console.error("Failed to load assets from DB:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initDatabases();
  }, []);

  // --- AI MASTER TEMPLATE ACTIONS ---
  const uploadMasterTemplate = async (file: File) => {
    setIsLoading(true);
    try {
      await saveMasterModel(file);
      const objectUrl = URL.createObjectURL(file);
      if (isCustom && masterTemplateUrl.startsWith('blob:')) URL.revokeObjectURL(masterTemplateUrl);
      setMasterTemplateUrl(objectUrl);
      setIsCustom(true);
    } catch (error) {
      console.error("Failed to save master model:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetMasterTemplate = async () => {
    setIsLoading(true);
    try {
      await clearMasterModel();
      if (isCustom && masterTemplateUrl.startsWith('blob:')) URL.revokeObjectURL(masterTemplateUrl);
      setMasterTemplateUrl(DEFAULT_MODEL_URL);
      setIsCustom(false);
    } catch (error) {
      console.error("Failed to reset master model:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- CURRENT VIEWER MODEL ACTIONS ---
  const updateCurrentModel = async (file: File) => {
    // Optimistic UI update could go here, but we wait for DB to be safe
    try {
      await saveCurrentModel(file);
      const objectUrl = URL.createObjectURL(file);
      
      // Cleanup previous blob if exists
      if (currentModelUrl.startsWith('blob:') && currentModelUrl !== DEFAULT_MODEL_URL) {
        URL.revokeObjectURL(currentModelUrl);
      }
      
      setCurrentModelUrl(objectUrl);
    } catch (error) {
      console.error("Failed to save current model:", error);
      throw error;
    }
  };

  return (
    <MasterTemplateContext.Provider 
      value={{ 
        masterTemplateUrl, 
        isCustom, 
        isLoading, 
        uploadMasterTemplate, 
        resetMasterTemplate,
        currentModelUrl,
        updateCurrentModel
      }}
    >
      {children}
    </MasterTemplateContext.Provider>
  );
};

export const useMasterTemplate = () => {
  const context = useContext(MasterTemplateContext);
  if (!context) {
    throw new Error('useMasterTemplate must be used within a MasterTemplateProvider');
  }
  return context;
};
