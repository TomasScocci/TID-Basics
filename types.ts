export enum PipelineStage {
  IDLE = 'IDLE',
  TEMPLATE_LOAD = 'TEMPLATE_LOAD',     // Extracting UVs from Base Model
  FEATURE_MATCHING = 'FEATURE_MATCHING', // Aligning Landmarks (Neck, Shoulders)
  WARPING = 'WARPING',                 // Deforming image to UV Space
  SEAM_BLENDING = 'SEAM_BLENDING',     // Merging Front/Back with gradient
  BAKING = 'BAKING',                   // Final Texture Injection
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface PipelineLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface ProcessingStats {
  vertices: number;
  faces: number;
  textureSize: string;
  inferenceTime: number;
}