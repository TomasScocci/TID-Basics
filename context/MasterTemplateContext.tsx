import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveMasterModel, getMasterModel, clearMasterModel } from '../utils/storage';
import { DEFAULT_MODEL_URL } from '../components/Scene3D';

interface MasterTemplateContextType {
  masterTemplateUrl: string;
  isCustom: boolean; // True if loaded from DB, False if using DEFAULT
  isLoading: boolean;
  uploadMasterTemplate: (file: File) => Promise<void>;
  resetMasterTemplate: () => Promise<void>;
}

const MasterTemplateContext = createContext<MasterTemplateContextType | undefined>(undefined);

export const MasterTemplateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [masterTemplateUrl, setMasterTemplateUrl] = useState<string>(DEFAULT_MODEL_URL);
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load from DB on mount
  useEffect(() => {
    const initMasterModel = async () => {
      try {
        const blob = await getMasterModel();
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          setMasterTemplateUrl(objectUrl);
          setIsCustom(true);
        } else {
          setMasterTemplateUrl(DEFAULT_MODEL_URL);
          setIsCustom(false);
        }
      } catch (error) {
        console.error("Failed to load master model from DB:", error);
        setMasterTemplateUrl(DEFAULT_MODEL_URL);
      } finally {
        setIsLoading(false);
      }
    };

    initMasterModel();
  }, []);

  const uploadMasterTemplate = async (file: File) => {
    setIsLoading(true);
    try {
      await saveMasterModel(file);
      const objectUrl = URL.createObjectURL(file);
      
      // Revoke old URL if it was a blob to avoid leaks (optional optimization)
      if (isCustom && masterTemplateUrl.startsWith('blob:')) {
        URL.revokeObjectURL(masterTemplateUrl);
      }

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
      if (isCustom && masterTemplateUrl.startsWith('blob:')) {
        URL.revokeObjectURL(masterTemplateUrl);
      }
      setMasterTemplateUrl(DEFAULT_MODEL_URL);
      setIsCustom(false);
    } catch (error) {
      console.error("Failed to reset master model:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MasterTemplateContext.Provider 
      value={{ 
        masterTemplateUrl, 
        isCustom, 
        isLoading, 
        uploadMasterTemplate, 
        resetMasterTemplate 
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
