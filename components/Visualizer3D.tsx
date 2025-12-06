import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { VisualizerConfig } from '../types';
import { getShapePositions } from '../utils/math';

interface Visualizer3DProps {
  analyser: AnalyserNode | null;
  config: VisualizerConfig;
  isPlaying: boolean;
}

const Visualizer3D: React.FC<Visualizer3DProps> = ({ analyser, config, isPlaying }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  const count = config.particleCount;
  
  // Calculate target positions based on selected shape
  const targetPositions = useMemo(() => {
    return getShapePositions(config.shape, count, 20); // Radius 20
  }, [config.shape, count]);

  // Initial random scatter
  const initialPositions = useMemo(() => {
    return new Float32Array(count * 3).map(() => (Math.random() - 0.5) * 100);
  }, [count]);

  // Current positions buffer
  const currentPositions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    arr.set(initialPositions);
    return arr;
  }, [count, initialPositions]);

  // Color buffer
  const colors = useMemo(() => {
    return new Float32Array(count * 3);
  }, [count]);

  // Frequency data container
  const dataArray = useMemo(() => new Uint8Array(128), []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    let bass = 0;
    let high = 0;

    // Analyze Audio
    if (analyser && isPlaying) {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate frequency bands
      // Bass: lower 20 bins
      for(let k=0; k<20; k++) bass += dataArray[k];
      bass = bass / 20 / 255; // Normalize 0-1

      // High: upper bins
      for(let k=100; k<128; k++) high += dataArray[k];
      high = high / 28 / 255; // Normalize 0-1
    }

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const colorAttribute = pointsRef.current.geometry.attributes.color.array as Float32Array;
    
    const themeColorObj1 = new THREE.Color(config.colorTheme[0]);
    const themeColorObj2 = new THREE.Color(config.colorTheme[1] || config.colorTheme[0]);

    // Animation Loop
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Target Coordinates (Shape)
      const tx = targetPositions[i3];
      const ty = targetPositions[i3 + 1];
      const tz = targetPositions[i3 + 2];

      // Current Coordinates
      let cx = positions[i3];
      let cy = positions[i3 + 1];
      let cz = positions[i3 + 2];

      // Distance to target
      const distSq = (tx - cx) ** 2 + (ty - cy) ** 2 + (tz - cz) ** 2;
      
      // 1. Physics / Morphing Logic
      // "Spring" force towards target shape.
      // We increase speed if bass is hitting to make it "dance"
      const baseSpeed = 3.0;
      const beatSpeed = bass * 4.0;
      const morphSpeed = (baseSpeed + beatSpeed) * delta;
      
      // Interpolate towards target (The "Restoring Force")
      cx += (tx - cx) * morphSpeed;
      cy += (ty - cy) * morphSpeed;
      cz += (tz - cz) * morphSpeed;

      // 2. Audio Reactivity (Displacement)
      if (isPlaying) {
        // Map particle to frequency index deterministically to create patterns
        // We iterate through frequency data 4 times across the particle count for density
        const freqIndex = Math.floor((i / count) * dataArray.length * 4) % dataArray.length;
        const freqVal = dataArray[freqIndex] / 255.0;

        // Calculate direction vector from center (0,0,0)
        // This ensures particles explode "outwards" nicely
        let dist = Math.sqrt(tx*tx + ty*ty + tz*tz);
        if (dist === 0) dist = 0.001;
        
        const nx = tx / dist;
        const ny = ty / dist;
        const nz = tz / dist;

        // Force Calculation
        // Bass creates a huge global expansion pulse
        // FreqVal creates local spikes
        // Sensitivity controls overall magnitude
        const pulseForce = (bass * 0.4 + freqVal * 0.6) * config.sensitivity * 12.0;

        // Apply force OUTWARDS
        // We add this to the current position. 
        // Since the morph logic above pulls it back to 'tx', this creates a vibrating equilibrium.
        cx += nx * pulseForce * delta * 5; 
        cy += ny * pulseForce * delta * 5;
        cz += nz * pulseForce * delta * 5;
      }

      // Update position buffer
      positions[i3] = cx;
      positions[i3 + 1] = cy;
      positions[i3 + 2] = cz;

      // 3. Coloring
      // Dynamic mix based on index and time
      const mixFactor = (Math.sin(i * 0.005 + state.clock.elapsedTime) + 1) / 2;
      
      let r = themeColorObj1.r * (1 - mixFactor) + themeColorObj2.r * mixFactor;
      let g = themeColorObj1.g * (1 - mixFactor) + themeColorObj2.g * mixFactor;
      let b = themeColorObj1.b * (1 - mixFactor) + themeColorObj2.b * mixFactor;
      
      // Flash on high frequencies / bass beat
      if (isPlaying) {
          const brightness = (bass * 0.6 + high * 0.8) * 3.0; // Intense flash
          r += brightness * 0.3;
          g += brightness * 0.3;
          b += brightness * 0.3;
      }

      colorAttribute[i3] = r;
      colorAttribute[i3 + 1] = g;
      colorAttribute[i3 + 2] = b;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;

    // Global Object Rotation
    // Rotate faster when bass is loud
    const rotSpeed = config.speed * delta * 0.1 * (1 + bass * 2);
    pointsRef.current.rotation.y += rotSpeed;
    pointsRef.current.rotation.z += rotSpeed * 0.5;
  });

  return (
    <>
      <Points ref={pointsRef} positions={currentPositions} colors={colors} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          vertexColors
          size={config.particleSize}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Points>
      
      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={config.bloomStrength} radius={0.6} />
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};

export default Visualizer3D;