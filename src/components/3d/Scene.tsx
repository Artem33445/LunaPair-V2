import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { EtherealSilk } from './EtherealSilk';

interface SceneProps {
  intensity?: number;
  color?: string;
}

export function Scene({ intensity, color }: SceneProps) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-5, -5, 5]} intensity={1} color={color} />
        
        <EtherealSilk intensity={intensity} color={color} />
        
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
