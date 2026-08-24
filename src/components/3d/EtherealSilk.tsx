import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface EtherealSilkProps {
  intensity?: number;
  color?: string;
}

export function EtherealSilk({ intensity = 0.5, color = 'hsl(280, 50%, 50%)' }: EtherealSilkProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      pointer.current.y * 0.15,
      0.03
    );
    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      pointer.current.x * 0.15,
      0.03
    );
  });

  const speed = 0.4 + intensity * 0.3;
  const distort = 0.15 + intensity * 0.15;

  return (
    <mesh ref={meshRef} position={[0, 0, -2]}>
      <planeGeometry args={[35, 35, 64, 64]} />
      <MeshDistortMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.2}
        speed={speed}
        distort={distort}
        radius={1}
        roughness={0.7}
        metalness={0.1}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
