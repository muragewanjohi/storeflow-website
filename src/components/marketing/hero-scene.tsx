'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 120;
const BRAND_COLOR = new THREE.Color('#0B33B7');

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const mouse = useRef({ x: 0, y: 0 });

  const { positions, linePositions } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const lines: number[] = [];
    const coords: THREE.Vector3[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 14;
      const y = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 8;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      coords.push(new THREE.Vector3(x, y, z));
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        if (coords[i].distanceTo(coords[j]) < 2.2) {
          lines.push(coords[i].x, coords[i].y, coords[i].z);
          lines.push(coords[j].x, coords[j].y, coords[j].z);
        }
      }
    }

    return {
      positions: pos,
      linePositions: new Float32Array(lines),
    };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.04 + mouse.current.x * 0.15;
      pointsRef.current.rotation.x = Math.sin(t * 0.2) * 0.08 + mouse.current.y * 0.1;
    }
    if (linesRef.current) {
      linesRef.current.rotation.y = t * 0.04 + mouse.current.x * 0.15;
      linesRef.current.rotation.x = Math.sin(t * 0.2) * 0.08 + mouse.current.y * 0.1;
    }
  });

  return (
    <group
      onPointerMove={(e) => {
        mouse.current.x = (e.pointer.x - 0.5) * 2;
        mouse.current.y = (e.pointer.y - 0.5) * 2;
      }}
    >
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color={BRAND_COLOR}
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={BRAND_COLOR} transparent opacity={0.12} />
      </lineSegments>
    </group>
  );
}

export function HeroScene() {
  return (
    <div className="absolute inset-0 -z-10 opacity-60">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.4} />
        <ParticleField />
      </Canvas>
    </div>
  );
}
