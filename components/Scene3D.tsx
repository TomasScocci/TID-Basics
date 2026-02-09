import React, { Component, useRef, useEffect, useState, ReactNode, useMemo, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, OrbitControls, ContactShadows, Center } from '@react-three/drei';
import * as THREE from 'three';

// GROUND TRUTH: Base Model
export const DEFAULT_MODEL_URL = "/Assets/Remera-Gris-Textura-HD.glb";
const FALLBACK_URL = "/Assets/Remera-Gris-Textura-HD.glb";

interface ModelProps {
  url: string;
  textureUrl?: string | null;
}

const Model: React.FC<ModelProps> = ({ url, textureUrl }) => {
  const { scene } = useGLTF(url, true);
  
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const modelRef = useRef<THREE.Group>(null);
  const [scale, setScale] = useState<number>(1);
  const textureLoader = useRef(new THREE.TextureLoader());

  useLayoutEffect(() => {
    clonedScene.scale.set(1, 1, 1);
    clonedScene.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Auto-Fit Logic
    if (maxDim > 0) {
      setScale(1.8 / maxDim);
    }

    // --- GRAPHICS ENGINEER REFACTOR START ---
    // Targeted Texture Application & UV Alignment
    
    if (textureUrl) {
        const targetMeshNames = ['T_Shirt', 'Tshirt', 'Torso', 'Body', 'Front', 'Garment', 'SheenChair_Mesh']; 
        
        clonedScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const isGarmentPart = targetMeshNames.some(name => 
                mesh.name.toLowerCase().includes(name.toLowerCase())
            ) || mesh.userData?.target === 'garment';

            const shouldApply = isGarmentPart || true; 

            if (shouldApply && mesh.material) {
              const mat = Array.isArray(mesh.material) 
                ? mesh.material[0].clone() 
                : mesh.material.clone();

              // MATERIAL PHYSICS & CONTRAST
              // Instead of 1.0 (flat), we use 0.7 to allow specular highlights (Micro-contrast).
              if ('roughness' in mat) (mat as any).roughness = 0.7; 
              // Keep metalness low for fabric, unless specified otherwise
              if ('metalness' in mat) (mat as any).metalness = 0.1;
              // Boost Environment interaction for realism
              if ('envMapIntensity' in mat) (mat as any).envMapIntensity = 1.2;

              mat.transparent = true;
              mat.side = THREE.DoubleSide; 

              textureLoader.current.load(textureUrl, (texture) => {
                  // ACES Filmic Workflow requires correct color space on input textures
                  texture.colorSpace = THREE.SRGBColorSpace;
                  texture.flipY = false; 

                  texture.center.set(0.5, 0.5);
                  texture.repeat.set(1.2, 1.2); 
                  texture.offset.set(-0.1, -0.1); 

                  // Safe assignment for properties not on base Material type
                  (mat as any).map = texture;
                  // Reset color to white to allow texture true color + lighting
                  if ('color' in mat) (mat as any).color.setHex(0xffffff);
                  mat.needsUpdate = true;
              });

              mesh.material = mat;
            }
          }
        });
    } else {
        // Fallback for non-textured mode: Ensure good PBR response
        clonedScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                // Enhance base material if possible
                if (mesh.material) {
                    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
                    // Add slight sheen to base model for "Studio" look
                    if ('roughness' in mat) (mat as any).roughness = 0.6;
                    if ('envMapIntensity' in mat) (mat as any).envMapIntensity = 1.0;
                }
            }
        });
    }
  }, [clonedScene, url, textureUrl]);

  useFrame((state) => {
    if (modelRef.current) {
      modelRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      modelRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
    }
  });

  return (
    <Center>
      {/* @ts-ignore */}
      <primitive object={clonedScene} ref={modelRef} scale={scale} />
    </Center>
  );
};

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ModelErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    console.error("3D Model Loading Error:", error);
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface Scene3DProps {
  interactable?: boolean;
  modelUrl?: string;
  textureUrl?: string | null;
}

// Cinematic Lighting Rig
const StudioLighting = () => {
    return (
        <group>
            {/* Key Light: Warm, Directional, Casting Shadows. Defines the form. */}
            {/* Positioned high and to the right standard studio setup */}
            {/* @ts-ignore */}
            <spotLight 
                position={[5, 5, 5]} 
                angle={0.25} 
                penumbra={0.5} 
                intensity={2.5} 
                castShadow 
                shadow-bias={-0.0001}
                color="#fff0dd" // Warm Tone (3200K-ish imitation)
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />

            {/* Fill Light: Cool, Softer, Opposite to Key. Fills shadows without removing them. */}
            {/* @ts-ignore */}
            <pointLight 
                position={[-5, 0, 5]} 
                intensity={1.0} 
                color="#d1e8ff" // Cool Tone (Skylight)
            />

            {/* Rim Light / Back Light: Strong, Cool. Separates object from background. */}
            {/* @ts-ignore */}
            <spotLight 
                position={[0, 5, -5]} 
                intensity={3.0} 
                color="#ffffff"
                angle={0.5}
                penumbra={1}
            />
            
            {/* Low Ambient: Just enough to prevent pitch black crushed shadows */}
            {/* @ts-ignore */}
            <ambientLight intensity={0.2} />
        </group>
    );
};

const CameraHandler = () => {
    const { camera, controls } = useThree();
    useEffect(() => {
        // Set Z to 6 (matching maxDistance) to start fully zoomed out
        camera.position.set(0, 0, 6);
        camera.lookAt(0, 0, 0);
        // @ts-ignore
        if (controls) controls.reset();
    }, [camera, controls]);
    return null;
}

const Scene3D: React.FC<Scene3DProps> = ({ 
  interactable = true, 
  modelUrl = DEFAULT_MODEL_URL,
  textureUrl = null
}) => {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      // Set initial camera position to maximum distance
      camera={{ position: [0, 0, 6], fov: 35 }}
      gl={{ 
        // CONTRAST & COLOR MANAGEMENT
        // Switch to ACESFilmic for cinematographic dynamic range.
        // This prevents highlights from clipping and adds weight to shadows.
        toneMapping: THREE.ACESFilmicToneMapping, 
        toneMappingExposure: 1.1, // Slightly boosted to compensate for Filmic curve
        antialias: true,
        preserveDrawingBuffer: true,
        alpha: true
      }}
      className="w-full h-full"
    >
      {/* City preset has better High/Low contrast than Studio */}
      <Environment preset="city" environmentIntensity={0.6} blur={0.8} />
      
      <CameraHandler />
      <StudioLighting />
      
      {/* Removed SoftShadows due to shader compilation errors in latest Three.js (unpackRGBAToDepth) */}
      {/* We rely on standard PCFSoftShadowMap (enabled via shadows prop) and ContactShadows for grounding */}

      <ModelErrorBoundary fallback={
        <mesh>
             {/* @ts-ignore */}
            <boxGeometry args={[1, 1, 1]} />
             {/* @ts-ignore */}
            <meshStandardMaterial color="red" wireframe />
        </mesh>
      }>
        <Model url={modelUrl} textureUrl={textureUrl} />
      </ModelErrorBoundary>
      
      {/* Grounding Shadows: Darker, tighter opacity for better "contact" feel */}
      <ContactShadows 
        resolution={1024} 
        scale={10} 
        blur={1.5} 
        opacity={0.65} 
        far={10} 
        color="#000000" 
      />
      
      {interactable && (
        <OrbitControls 
          makeDefault
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.8}
          minDistance={2}
          maxDistance={6}
          autoRotate={false}
          rotateSpeed={0.5}
          dampingFactor={0.1}
        />
      )}
    </Canvas>
  );
};

export default Scene3D;
