import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationEngine, EngineSnapshot, Direction, SimVehicle } from './engine';

const ROAD_HALF = 62;
const ROAD_WIDTH = 14;

function vehicleWorld(v: SimVehicle): [number, number, number] {
  switch (v.dir) {
    case 'N':
      return [v.lane * 2.2, 0, v.pos];
    case 'S':
      return [-v.lane * 2.2, 0, -v.pos];
    case 'E':
      return [v.pos, 0, v.lane * 2.2];
    case 'W':
      return [-v.pos, 0, -v.lane * 2.2];
  }
}

function vehicleRot(dir: Direction): number {
  // Models face local -Z (three.js forward). Rotate so -Z points along travel.
  switch (dir) {
    case 'N': return Math.PI; // moving toward +Z
    case 'S': return 0; // moving toward -Z
    case 'E': return -Math.PI / 2; // moving toward +X
    case 'W': return Math.PI / 2; // moving toward -X
  }
}

/* ---------------- road + environment ---------------- */
function Roads({ corridor }: { corridor: Direction | null }) {
  return (
    <group>
      {/* asphalt strips */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, ROAD_HALF * 2]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, ROAD_HALF * 2]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial color="#0b1f33" />
      </mesh>
      {/* lane dashes */}
      {Array.from({ length: 12 }).map((_, i) => (
        <group key={i}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -ROAD_HALF + 5 + i * 10]}>
            <planeGeometry args={[0.25, 3]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[-ROAD_HALF + 5 + i * 10, 0.02, 0]}>
            <planeGeometry args={[0.25, 3]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
        </group>
      ))}
      {/* pedestrian crossings */}
      {(['N', 'S', 'E', 'W'] as Direction[]).map((d) => {
        const pos: [number, number] =
          d === 'N' ? [0, -10.5] : d === 'S' ? [0, 10.5] : d === 'E' ? [10.5, 0] : [-10.5, 0];
        return (
          <group key={`cross-${d}`} position={[pos[0], 0.03, pos[1]]}>
            {[-4.5, -2.5, -0.5, 1.5, 3.5].map((o) => (
              <mesh
                key={o}
                rotation={[-Math.PI / 2, 0, d === 'E' || d === 'W' ? Math.PI / 2 : 0]}
                position={d === 'N' || d === 'S' ? [o, 0, 0] : [0, 0, o]}
              >
                <planeGeometry args={[0.8, 3.4]} />
                <meshStandardMaterial color="#cbd5e1" />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* emergency corridor highlight */}
      {corridor && (
        <mesh rotation={[-Math.PI / 2, 0, corridor === 'E' || corridor === 'W' ? Math.PI / 2 : 0]} position={[0, 0.04, 0]}>
          <planeGeometry args={[6, ROAD_HALF * 2]} />
          <meshBasicMaterial color="#22C55E" transparent opacity={0.22} />
        </mesh>
      )}
    </group>
  );
}

function Building({ x, z, w, h, d, color }: { x: number; z: number; w: number; h: number; d: number; color: string }) {
  return (
    <mesh position={[x, h / 2, z]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

function Buildings() {
  const buildings = useMemo(() => {
    const list: { x: number; z: number; w: number; h: number; d: number; color: string }[] = [];
    const spots: [number, number][] = [
      [-38, -38], [-24, -46], [38, -30], [26, -44], [44, 26], [30, 40], [-40, 32], [-26, 44],
    ];
    spots.forEach(([x, z], i) => {
      list.push({
        x,
        z,
        w: 10 + (i % 3) * 4,
        h: 8 + ((i * 7) % 22),
        d: 10 + ((i * 5) % 3) * 4,
        color: ['#0f2438', '#132c46', '#102a44'][i % 3],
      });
    });
    return list;
  }, []);
  return (
    <group>
      {buildings.map((b, i) => (
        <Building key={i} {...b} />
      ))}
    </group>
  );
}

function Tree({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 2, 6]} />
        <meshStandardMaterial color="#7c5a3a" />
      </mesh>
      <mesh position={[0, 2.8, 0]}>
        <coneGeometry args={[1.4, 2.6, 7]} />
        <meshStandardMaterial color="#166534" />
      </mesh>
    </group>
  );
}

function Trees() {
  const spots: [number, number][] = [
    [-18, -20], [18, -20], [-18, 20], [18, 20], [-20, -48], [20, -48], [-20, 48], [20, 48],
    [-48, -18], [-48, 18], [48, -18], [48, 18],
  ];
  return (
    <group>
      {spots.map(([x, z], i) => (
        <Tree key={i} x={x} z={z} />
      ))}
    </group>
  );
}

function StreetLight({ x, z, rotY }: { x: number; z: number; rotY: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 3.5, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 7, 6]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[0, 7, 1]}>
        <boxGeometry args={[0.4, 0.15, 1.4]} />
        <meshStandardMaterial color="#94a3b8" emissive="#FACC15" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

/* ---------------- signals ---------------- */
function SignalHead({ dir, state, position, rotY }: { dir: Direction; state: string; position: [number, number, number]; rotY: number }) {
  const colors = { red: '#EF4444', yellow: '#FACC15', green: '#22C55E' };
  const active = { red: state === 'red', yellow: state === 'yellow', green: state === 'green' };
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 5.2, 6]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[0, 5.6, 0]}>
        <boxGeometry args={[0.7, 2, 0.5]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {(['red', 'yellow', 'green'] as const).map((c, i) => (
        <mesh key={c} position={[0, 6.2 - i * 0.62, 0.28]}>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshStandardMaterial
            color={colors[c]}
            emissive={colors[c]}
            emissiveIntensity={active[c] ? 1.6 : 0.06}
          />
        </mesh>
      ))}
      <group name={`signal-${dir}`} />
    </group>
  );
}

function Signals({ snap }: { snap: EngineSnapshot }) {
  const cfg: { dir: Direction; pos: [number, number, number]; rotY: number }[] = [
    { dir: 'N', pos: [8.5, 0, -8.5], rotY: Math.PI },
    { dir: 'S', pos: [-8.5, 0, 8.5], rotY: 0 },
    { dir: 'E', pos: [8.5, 0, 8.5], rotY: -Math.PI / 2 },
    { dir: 'W', pos: [-8.5, 0, -8.5], rotY: Math.PI / 2 },
  ];
  return (
    <group>
      {cfg.map(({ dir, pos, rotY }) => (
        <SignalHead key={dir} dir={dir} state={snap.signals[dir].state} position={pos} rotY={rotY} />
      ))}
    </group>
  );
}

/* ---------------- CCTV cameras ---------------- */
function CctvCamera({ position, id }: { position: [number, number, number]; id: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.4 + id) * 0.6;
    }
  });
  return (
    <group position={position}>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 6, 6]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <group ref={ref} position={[0, 6, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.35, 0.8]} />
          <meshStandardMaterial color="#94a3b8" emissive="#0EA5E9" emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[0, -0.35, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#EF4444" emissive="#EF4444" emissiveIntensity={1.2} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------------- vehicles ---------------- */
function Wheel({ x, z, r = 0.32, w = 0.22 }: { x: number; z: number; r?: number; w?: number }) {
  return (
    <mesh position={[x, r, z]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[r, r, w, 12]} />
      <meshStandardMaterial color="#0d1520" roughness={0.85} />
    </mesh>
  );
}

function Lamp({ x, y, z, w = 0.28, color, intensity = 0.9 }: { x: number; y: number; z: number; w?: number; color: string; intensity?: number }) {
  return (
    <mesh position={[x, y, z]}>
      <boxGeometry args={[w, 0.12, 0.06]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} />
    </mesh>
  );
}

function EmergencyLightBar({ z }: { z: number }) {
  const red = useRef<THREE.MeshStandardMaterial>(null);
  const blue = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const phase = clock.elapsedTime % 1 < 0.5;
    if (red.current) red.current.emissiveIntensity = phase ? 3.2 : 0.12;
    if (blue.current) blue.current.emissiveIntensity = phase ? 0.12 : 3.2;
  });
  return (
    <group position={[0, 1.86, z]}>
      <mesh position={[0, -0.08, 0]}>
        <boxGeometry args={[1.3, 0.1, 0.42]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[-0.33, 0.08, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.34]} />
        <meshStandardMaterial ref={red} color="#EF4444" emissive="#EF4444" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.33, 0.08, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.34]} />
        <meshStandardMaterial ref={blue} color="#3B82F6" emissive="#3B82F6" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

/** Passenger car: body + glass cabin + roof + lights + 4 wheels. Front = local -Z. */
function CarModel({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.56, 0]}>
        <boxGeometry args={[1.7, 0.52, 3.6]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.25} />
      </mesh>
      {/* glass cabin + roof */}
      <mesh position={[0, 1.02, 0.15]}>
        <boxGeometry args={[1.55, 0.46, 1.8]} />
        <meshStandardMaterial color="#16283c" roughness={0.15} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.28, 0.15]}>
        <boxGeometry args={[1.5, 0.08, 1.7]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.25} />
      </mesh>
      {/* bumpers */}
      <mesh position={[0, 0.38, -1.84]}>
        <boxGeometry args={[1.72, 0.22, 0.12]} />
        <meshStandardMaterial color="#111c2c" />
      </mesh>
      <mesh position={[0, 0.38, 1.84]}>
        <boxGeometry args={[1.72, 0.22, 0.12]} />
        <meshStandardMaterial color="#111c2c" />
      </mesh>
      <Lamp x={-0.55} y={0.62} z={-1.82} color="#FFF3C4" />
      <Lamp x={0.55} y={0.62} z={-1.82} color="#FFF3C4" />
      <Lamp x={-0.55} y={0.62} z={1.82} color="#E11D48" intensity={0.8} />
      <Lamp x={0.55} y={0.62} z={1.82} color="#E11D48" intensity={0.8} />
      <Wheel x={-0.82} z={-1.15} />
      <Wheel x={0.82} z={-1.15} />
      <Wheel x={-0.82} z={1.15} />
      <Wheel x={0.82} z={1.15} />
    </group>
  );
}

/** City bus: tall body, window band, roof AC, 6 wheels. Front = local -Z. */
function BusModel({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[2.2, 2.1, 6.8]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.2} />
      </mesh>
      {/* window band + windshield */}
      <mesh position={[0, 1.9, 0]}>
        <boxGeometry args={[2.26, 0.68, 6.2]} />
        <meshStandardMaterial color="#14283c" roughness={0.15} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.95, -3.43]}>
        <boxGeometry args={[2.08, 0.75, 0.06]} />
        <meshStandardMaterial color="#14283c" roughness={0.15} />
      </mesh>
      {/* livery stripe */}
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[2.26, 0.14, 6.7]} />
        <meshStandardMaterial color="#0EA5E9" />
      </mesh>
      {/* roof AC */}
      <mesh position={[0, 2.5, 0.4]}>
        <boxGeometry args={[1.6, 0.2, 2.4]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.6} />
      </mesh>
      <Lamp x={-0.7} y={0.75} z={-3.43} w={0.34} color="#FFF3C4" />
      <Lamp x={0.7} y={0.75} z={-3.43} w={0.34} color="#FFF3C4" />
      <Lamp x={-0.7} y={0.75} z={3.43} w={0.34} color="#E11D48" intensity={0.8} />
      <Lamp x={0.7} y={0.75} z={3.43} w={0.34} color="#E11D48" intensity={0.8} />
      <Wheel x={-1} z={-2.3} r={0.42} w={0.3} />
      <Wheel x={1} z={-2.3} r={0.42} w={0.3} />
      <Wheel x={-1} z={0.3} r={0.42} w={0.3} />
      <Wheel x={1} z={0.3} r={0.42} w={0.3} />
      <Wheel x={-1} z={2.5} r={0.42} w={0.3} />
      <Wheel x={1} z={2.5} r={0.42} w={0.3} />
    </group>
  );
}

/** Motorcycle: frame + fuel tank + handlebar + 2 wheels. Front = local -Z. */
function BikeModel({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.66, 0]}>
        <boxGeometry args={[0.18, 0.3, 1.5]} />
        <meshStandardMaterial color="#1c2a3c" />
      </mesh>
      <mesh position={[0, 0.9, 0.02]}>
        <boxGeometry args={[0.32, 0.24, 0.72]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.72, 0.62]}>
        <boxGeometry args={[0.34, 0.14, 0.5]} />
        <meshStandardMaterial color="#0f1a28" />
      </mesh>
      <mesh position={[0, 1.02, -0.58]}>
        <boxGeometry args={[0.6, 0.06, 0.08]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.92, -0.66]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#FFF3C4" emissive="#FFF3C4" emissiveIntensity={0.9} />
      </mesh>
      <Wheel x={0} z={-0.62} r={0.3} w={0.14} />
      <Wheel x={0} z={0.66} r={0.3} w={0.14} />
    </group>
  );
}

/** Emergency van (ambulance / patient transport). Front = local -Z. */
function EmergencyVanModel({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[2, 1.5, 5]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.35} metalness={0.15} />
      </mesh>
      {/* windshield + cab windows */}
      <mesh position={[0, 1.3, -2.53]}>
        <boxGeometry args={[1.86, 0.55, 0.06]} />
        <meshStandardMaterial color="#14283c" roughness={0.15} />
      </mesh>
      <mesh position={[0, 1.38, 0.6]}>
        <boxGeometry args={[2.06, 0.42, 3.1]} />
        <meshStandardMaterial color="#14283c" roughness={0.15} metalness={0.3} />
      </mesh>
      {/* accent stripe */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.06, 0.3, 4.7]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      <EmergencyLightBar z={-0.5} />
      <Lamp x={-0.62} y={0.68} z={-2.53} w={0.32} color="#FFF3C4" />
      <Lamp x={0.62} y={0.68} z={-2.53} w={0.32} color="#FFF3C4" />
      <Lamp x={-0.62} y={0.68} z={2.53} w={0.32} color="#E11D48" intensity={0.8} />
      <Lamp x={0.62} y={0.68} z={2.53} w={0.32} color="#E11D48" intensity={0.8} />
      <Wheel x={-0.92} z={-1.6} r={0.36} w={0.26} />
      <Wheel x={0.92} z={-1.6} r={0.36} w={0.26} />
      <Wheel x={-0.92} z={1.6} r={0.36} w={0.26} />
      <Wheel x={0.92} z={1.6} r={0.36} w={0.26} />
    </group>
  );
}

function VehicleMesh({ v, engine }: { v: SimVehicle; engine: SimulationEngine }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const live = engine.liveVehicles.find((x) => x.id === v.id);
    if (!live || !ref.current) return;
    const [x, , z] = vehicleWorld(live);
    ref.current.position.set(x, 0, z);
    ref.current.rotation.y = vehicleRot(live.dir);
  });
  const isAmbulance = v.kind === 'ambulance';
  const isVan = isAmbulance || v.kind === 'patient_transport';
  return (
    <group ref={ref} position={vehicleWorld(v)} rotation={[0, vehicleRot(v.dir), 0]}>
      {v.kind === 'bus' ? (
        <BusModel color={v.color} />
      ) : v.kind === 'bike' ? (
        <BikeModel color={v.color} />
      ) : isVan ? (
        <EmergencyVanModel accent={isAmbulance ? '#E11D48' : '#0EA5E9'} />
      ) : (
        <CarModel color={v.color} />
      )}
    </group>
  );
}

/* ---------------- AI detection box ---------------- */
function DetectionBox({ engine }: { engine: SimulationEngine }) {
  const ref = useRef<THREE.LineSegments>(null);
  const geometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(5.2, 2.6, 2.6)), []);
  useFrame(() => {
    if (!ref.current) return;
    const e = engine.emergencyState.phase;
    const candidate = engine.emergencyState.selected ?? engine.emergencyState.queued[0];
    const live = candidate ? engine.liveVehicles.find((v) => v.id === 900000 + candidate.id) : undefined;
    if ((e === 'detecting' || e === 'verifying' || e === 'verified') && live) {
      const [x, , z] = vehicleWorld(live);
      ref.current.position.set(x, 0.9, z);
      ref.current.rotation.y = vehicleRot(live.dir);
      ref.current.visible = true;
      (ref.current.material as THREE.LineBasicMaterial).color.set(
        e === 'verified' ? '#22C55E' : '#FACC15'
      );
    } else {
      ref.current.visible = false;
    }
  });
  return (
    <lineSegments ref={ref} geometry={geometry} visible={false}>
      <lineBasicMaterial color="#FACC15" />
    </lineSegments>
  );
}

/* ---------------- scene root ---------------- */
function SceneContent({ engine, snap }: { engine: SimulationEngine; snap: EngineSnapshot }) {
  const corridor = snap.emergency.phase === 'priority' || snap.emergency.phase === 'crossing'
    ? snap.emergency.selected?.dir ?? null
    : null;
  return (
    <group>
      <ambientLight intensity={0.55} />
      <directionalLight position={[30, 50, 20]} intensity={0.9} />
      <Roads corridor={corridor} />
      <Buildings />
      <Trees />
      <StreetLight x={-16} z={-16} rotY={0.8} />
      <StreetLight x={16} z={16} rotY={0.8 + Math.PI} />
      <StreetLight x={16} z={-16} rotY={-0.8} />
      <StreetLight x={-16} z={16} rotY={Math.PI + 0.8} />
      <Signals snap={snap} />
      <CctvCamera position={[-9.5, 0, -9.5]} id={1} />
      <CctvCamera position={[9.5, 0, 9.5]} id={2} />
      <DetectionBox engine={engine} />
      {snap.vehicles.map((v) => (
        <VehicleMesh key={v.id} v={v} engine={engine} />
      ))}
      <OrbitControls
        enablePan={false}
        minDistance={28}
        maxDistance={140}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0, 0]}
      />
    </group>
  );
}

export function SimulationScene({ engine, snap, simplified = false }: { engine: SimulationEngine; snap: EngineSnapshot; simplified?: boolean }) {
  return (
    <Canvas
      camera={{ position: [46, 40, 46], fov: 45 }}
      dpr={simplified ? [0.8, 1] : [1, 1.6]}
      shadows={false}
      gl={{ antialias: !simplified, powerPreference: 'high-performance' }}
      aria-label="3D traffic intersection simulation"
      role="img"
    >
      <color attach="background" args={['#06111F']} />
      <fog attach="fog" args={['#06111F', 90, 190]} />
      <SceneContent engine={engine} snap={snap} />
    </Canvas>
  );
}
