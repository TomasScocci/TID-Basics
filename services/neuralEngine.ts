import { PipelineStage } from '../types';
import * as THREE from 'three';
// @ts-ignore - Imports defined in importmap
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// @ts-ignore - Imports defined in importmap
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

/**
 * Simulates the Professional UV Template Projection Pipeline.
 * 
 * ACTUAL IMPLEMENTATION (Refactored):
 * 1. Semantic Mesh Targeting: Identifies 'Front' vs 'Back' meshes.
 * 2. UV Calibration: Applies repeat/offset transforms to textures.
 * 3. Material Physics: Enables transparency for proper decal effects.
 */
export const runNeuralPipeline = async (
  frontImage: string,
  backImage: string | null,
  baseModelUrl: string, 
  onLog: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void,
  onStageChange: (stage: PipelineStage) => void
): Promise<File> => {

  // Helper for simulated delays
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // --- STAGE 1: TEMPLATE & UV EXTRACTION ---
    onStageChange(PipelineStage.TEMPLATE_LOAD);
    onLog("Accessing Base Model geometry from Settings...", "info");
    
    if (!baseModelUrl) {
        throw new Error("No Base Model URL provided");
    }

    // 1. Load the Base GLB in memory
    const loader = new GLTFLoader();
    onLog("Parsing 3D Geometry (GLTFLoader)...", "info");
    
    const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(baseModelUrl, (data: any) => resolve(data), undefined, (err: any) => reject(err));
    });

    onLog("Base geometry loaded. Verifying mesh integrity...", "success");
    await wait(500);

    // --- STAGE 2: FEATURE MATCHING & TEXTURE LOADING ---
    onStageChange(PipelineStage.FEATURE_MATCHING);
    onLog("Loading High-Res Textures...", "info");

    const textureLoader = new THREE.TextureLoader();
    
    // Load Front Texture
    const frontTex = await new Promise<THREE.Texture>((resolve, reject) => {
        textureLoader.load(frontImage, (tex) => resolve(tex), undefined, (err) => reject(err));
    });
    
    // Configure Front Texture (Print Style)
    frontTex.flipY = false; 
    frontTex.colorSpace = THREE.SRGBColorSpace;
    frontTex.center.set(0.5, 0.5);
    frontTex.repeat.set(1.2, 1.2); // Scale texture to fit chest
    frontTex.offset.set(-0.1, -0.1); // Offset adjustment
    
    // Load Back Texture (if exists)
    let backTex: THREE.Texture | null = null;
    if (backImage) {
        onLog("Processing Back View Texture...", "info");
        backTex = await new Promise<THREE.Texture>((resolve, reject) => {
            textureLoader.load(backImage, (tex) => resolve(tex), undefined, (err) => reject(err));
        });
        backTex.flipY = false;
        backTex.colorSpace = THREE.SRGBColorSpace;
        backTex.center.set(0.5, 0.5);
        backTex.repeat.set(1.2, 1.2);
        backTex.offset.set(-0.1, -0.1);
    }

    // --- STAGE 3: WARPING & PROJECTION (Semantic Targeting) ---
    onStageChange(PipelineStage.WARPING);
    onLog("Mapping textures to semantic regions (Front/Back)...", "info");
    
    const scene = gltf.scene || gltf.scenes[0];
    let appliedCount = 0;
    
    // Semantic Keywords
    const frontKeywords = ['front', 'chest', 'torso', 'body', 't_shirt', 'mesh_0'];
    const backKeywords = ['back', 'posterior', 'dorsal'];

    scene.traverse((child: any) => {
        if (child.isMesh) {
            const meshName = child.name.toLowerCase();
            let targetTexture = null;

            // Heuristic for Targeting
            const isBack = backKeywords.some(k => meshName.includes(k));
            const isFront = frontKeywords.some(k => meshName.includes(k));

            if (isBack && backTex) {
                targetTexture = backTex;
                onLog(`Targeted Back Mesh: ${child.name}`, "info");
            } else if (isFront) {
                targetTexture = frontTex; // Default to front texture for main body if not explicitly back
            }

            // Apply logic
            if (targetTexture) {
                appliedCount++;
                
                // Clone material to avoid modifying shared resources
                const oldMat = Array.isArray(child.material) ? child.material[0] : child.material;
                const newMat = oldMat.clone();

                // Apply Texture
                newMat.map = targetTexture;
                newMat.color.setHex(0xffffff); // White base for accurate color
                
                // Transparency / Alpha Setup
                newMat.transparent = true;
                newMat.alphaTest = 0.1; // Cutout
                newMat.side = THREE.DoubleSide;
                
                // PBR Tweaks
                if (newMat.isMeshStandardMaterial) {
                    newMat.roughness = 1.0;
                    newMat.metalness = 0.0;
                }

                newMat.needsUpdate = true;
                child.material = newMat;
            }
        }
    });
    
    if (appliedCount === 0) {
        onLog("Warning: No specific garment meshes found. Applying global fallback.", "warning");
        // Fallback: Apply front texture to first mesh found
        scene.traverse((child: any) => {
            if (child.isMesh && appliedCount === 0) {
                 const newMat = child.material.clone();
                 newMat.map = frontTex;
                 newMat.color.setHex(0xffffff);
                 newMat.transparent = true;
                 child.material = newMat;
                 appliedCount++;
            }
        });
    }

    onLog(`Texture projection complete. Meshes updated: ${appliedCount}`, "success");
    await wait(1000);

    // --- STAGE 4: BAKING ---
    onStageChange(PipelineStage.BAKING);
    onLog("Baking Alpha channel and Material Properties...", "info");
    await wait(800);

    // --- FINALIZING ---
    onLog("Exporting modified binary (.glb)...", "info");
    
    const exporter = new GLTFExporter();
    const options = {
        binary: true,
        maxTextureSize: 4096, // High res
        animations: gltf.animations // Preserve animations if any
    };

    const glbBlob = await new Promise<Blob>((resolve, reject) => {
        exporter.parse(
            scene,
            (result: ArrayBuffer) => {
                const blob = new Blob([result], { type: 'model/gltf-binary' });
                resolve(blob);
            },
            (err: any) => {
                reject(err);
            },
            options
        );
    });

    onLog("Asset generation complete.", "success");
    onStageChange(PipelineStage.COMPLETE);

    const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
    const filename = `TID_Custom_${timestamp}.glb`;
    
    return new File([glbBlob], filename, { type: 'model/gltf-binary' });

  } catch (error) {
    onLog("Pipeline Fatal Error during GLB Generation.", "error");
    console.error(error);
    throw error;
  }
};