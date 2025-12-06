import { ShapeType } from '../types';
import * as THREE from 'three';

// Generate a random seed based on a string (song name)
export const generateSeed = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getShapePositions = (
  type: ShapeType,
  count: number,
  radius: number = 20
): Float32Array => {
  const positions = new Float32Array(count * 3);
  const n = count;

  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = 0;
    const t = i / n; // Normalized 0 to 1
    const phi = Math.acos(-1 + (2 * i) / n);
    const theta = Math.sqrt(n * Math.PI) * phi;

    switch (type) {
      case ShapeType.SPHERE: {
        x = radius * Math.sin(phi) * Math.cos(theta);
        y = radius * Math.sin(phi) * Math.sin(theta);
        z = radius * Math.cos(phi);
        break;
      }
      case ShapeType.GALAXY: {
        const spiral = i * 0.1;
        const r = (i / n) * radius * 2;
        // Add some random noise for "cloud" look
        const noise = (Math.random() - 0.5) * 5;
        x = Math.cos(spiral) * r + noise;
        y = (Math.random() - 0.5) * (radius * 0.2); // Flat disc
        z = Math.sin(spiral) * r + noise;
        break;
      }
      case ShapeType.LORENZ: {
        // Iterative generation
        // Sigma=10, Rho=28, Beta=8/3
        let lx = 0.1, ly = 0, lz = 0;
        // We need to trace the path, so we simulate steps
        // To make it fill the array, we simulate 'i' steps
        // This is computationally consistent but simple
        const dt = 0.01;
        // Pre-warm
        for(let k=0; k<i; k++) {
             let dx = 10 * (ly - lx) * dt;
             let dy = (lx * (28 - lz) - ly) * dt;
             let dz = (lx * ly - (8/3) * lz) * dt;
             lx += dx; ly += dy; lz += dz;
             // Reset if it goes to infinity (rare) or just loop
             if (k > 5000) { lx=0.1; ly=0; lz=0; } 
        }
        // Scale it up
        const scale = 0.8;
        x = lx * scale;
        y = ly * scale;
        z = (lz - 25) * scale; 
        break;
      }
      case ShapeType.MOBIUS: {
        const u = t * Math.PI * 4; // 0 to 4PI
        const v = (Math.random() * 2 - 1) * 0.3 * radius; // Width
        x = (1 * radius + v * Math.cos(u / 2)) * Math.cos(u);
        y = (1 * radius + v * Math.cos(u / 2)) * Math.sin(u);
        z = v * Math.sin(u / 2);
        break;
      }
      case ShapeType.HEART: {
        // Heart surface parametric approximate
        // Or simple 2D extrusion rotated
        const tVal = t * Math.PI * 2;
        // 3D Heart formula
        // (x^2 + 9/4y^2 + z^2 - 1)^3 - x^2z^3 - 9/20y^2z^3 = 0
        // Parametric approach is cleaner for particles
        const hphi = Math.random() * Math.PI * 2;
        const htheta = Math.random() * Math.PI;
        // Use a simpler parametric heart curve rotated
        const scale = radius * 0.05;
        const t2 = Math.random() * Math.PI * 2;
        // x = 16sin^3(t)
        // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
        // Extrude z
        x = scale * 16 * Math.pow(Math.sin(t2), 3);
        y = scale * (13 * Math.cos(t2) - 5 * Math.cos(2*t2) - 2 * Math.cos(3*t2) - Math.cos(4*t2));
        z = (Math.random() - 0.5) * radius * 0.5;
        
        // Let's try to inflate it to 3D
        z *= (1 - Math.abs(y)/(radius)); // Taper at bottom
        break;
      }
      case ShapeType.MENGER: {
         // Random points inside a cube, filtering out removed sections
         // Simplified: Just a cube with holes
         const size = radius * 1.5;
         let valid = false;
         while(!valid) {
             const tx = (Math.random() - 0.5) * 2 * size;
             const ty = (Math.random() - 0.5) * 2 * size;
             const tz = (Math.random() - 0.5) * 2 * size;
             
             // Check if point is in a hole (Level 1 Menger)
             // Divide into 3x3x3. Middle block is empty.
             // Middle of faces is empty.
             const ax = Math.abs(tx);
             const ay = Math.abs(ty);
             const az = Math.abs(tz);
             
             // One third size
             const s3 = size / 3;
             const oneThird = size / 3;
             
             // Check standard Menger logic (approximate for efficiency)
             // Remove middle cross
             let inHole = 0;
             if (ax < oneThird && ay < oneThird) inHole++;
             if (ay < oneThird && az < oneThird) inHole++;
             if (ax < oneThird && az < oneThird) inHole++;
             
             if (inHole === 0) {
                 x = tx; y = ty; z = tz;
                 valid = true;
             }
         }
         break;
      }
      case ShapeType.TORUS: {
         const tubularRadius = radius * 0.3;
         const mainRadius = radius;
         const u = Math.random() * Math.PI * 2;
         const v = Math.random() * Math.PI * 2;
         x = (mainRadius + tubularRadius * Math.cos(v)) * Math.cos(u);
         y = (mainRadius + tubularRadius * Math.cos(v)) * Math.sin(u);
         z = tubularRadius * Math.sin(v);
         break;
      }
      case ShapeType.DNA: {
        const helicalRadius = radius * 0.4;
        const height = radius * 2.5;
        const turns = 4;
        const progress = (i/n); // 0 to 1
        const angle = progress * Math.PI * 2 * turns;
        
        // Strand 1
        if (i % 2 === 0) {
            x = helicalRadius * Math.cos(angle);
            z = helicalRadius * Math.sin(angle);
        } else {
            // Strand 2 (offset by PI)
            x = helicalRadius * Math.cos(angle + Math.PI);
            z = helicalRadius * Math.sin(angle + Math.PI);
        }
        y = (progress - 0.5) * height;
        
        // Add noise to make it thicker
        x += (Math.random() - 0.5) * 1;
        y += (Math.random() - 0.5) * 0.5;
        z += (Math.random() - 0.5) * 1;
        break;
      }
      default: {
        x = (Math.random() - 0.5) * radius * 2;
        y = (Math.random() - 0.5) * radius * 2;
        z = (Math.random() - 0.5) * radius * 2;
      }
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return positions;
};
