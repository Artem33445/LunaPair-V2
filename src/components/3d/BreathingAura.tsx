import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface BreathingAuraProps {
  intensity?: number;
  color?: string;
}

export function BreathingAura({ intensity = 0.5, color = '#A78BFA' }: BreathingAuraProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 3000;

  const [positions] = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 2.5 * Math.cbrt(Math.random());
      
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi);
    }
    return [p];
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.elapsedTime;
    
    // Breathing effect
    const breathingSpeed = 0.5 + (intensity * 1.5);
    const scale = 1 + Math.sin(time * breathingSpeed) * 0.1 * (1 + intensity);
    pointsRef.current.scale.set(scale, scale, scale);
    
    // Rotation
    pointsRef.current.rotation.y = time * 0.1;
    pointsRef.current.rotation.z = time * 0.05;
  });

  return (
    <group>
      <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color={color}
          size={0.06}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.6 + (intensity * 0.4)}
        />
      </Points>
      
      {/* Outer invisible glass sphere for volume */}
      <mesh>
        <sphereGeometry args={[2.8, 64, 64]} />
        <meshPhysicalMaterial 
          transparent 
          opacity={0.15} 
          roughness={0.1} 
          transmission={0.9} 
          thickness={1.5}
          ior={1.2}
          color="#ffffff" 
        />
      </mesh>
    </group>
  );
}
