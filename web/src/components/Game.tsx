import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGameSounds } from "@freegamestore/games";
import * as THREE from "three";
import type { ShopItem, ItemKind } from "../types";
import {
  ARENA_HALF,
  PLAYER_SPEED,
  ROUND_SECONDS,
  ITEM_COUNT,
  ITEM_POINTS,
  ITEM_EMOJI,
  clampToArena,
  collides,
  randomItemPosition,
  randomKind,
} from "../lib/logic";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GameProps {
  onScore: (score: number) => void;
  onTime: (secondsLeft: number) => void;
  onGameOver: () => void;
}

type Dir = "left" | "right" | "up" | "down";

function mapKey(key: string): Dir | null {
  switch (key) {
    case "ArrowLeft":  case "a": case "A": return "left";
    case "ArrowRight": case "d": case "D": return "right";
    case "ArrowUp":    case "w": case "W": return "up";
    case "ArrowDown":  case "s": case "S": return "down";
    default: return null;
  }
}

// ─── Item colours ─────────────────────────────────────────────────────────────

const ITEM_COLOR: Record<ItemKind, string> = {
  apple:    "#ef4444",
  banana:   "#fde047",
  milk:     "#f0fdf4",
  cookie:   "#d97706",
  ice_cream:"#fbcfe8",
  star:     "#facc15",
};
const ITEM_EMISSIVE: Record<ItemKind, string> = {
  apple:    "#7f1d1d",
  banana:   "#713f12",
  milk:     "#bbf7d0",
  cookie:   "#78350f",
  ice_cream:"#f9a8d4",
  star:     "#f59e0b",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeItem(id: number, avoidX = 0, avoidZ = 0): ShopItem {
  const [x, z] = randomItemPosition(avoidX, avoidZ);
  const kind = randomKind();
  return { id, x, z, kind, points: ITEM_POINTS[kind] };
}

function initialItems(): ShopItem[] {
  const items: ShopItem[] = [];
  for (let i = 0; i < ITEM_COUNT; i++) items.push(makeItem(i));
  return items;
}

// ─── Pop-up score label (collected feedback) ──────────────────────────────────

interface PopLabel {
  id: number;
  x: number;
  z: number;
  text: string;
  age: number; // seconds alive
}

// ─── 3-D Components ───────────────────────────────────────────────────────────

/** Shopping cart — a boxy body with four wheels. */
function Cart({ posRef }: { posRef: React.RefObject<THREE.Vector3> }) {
  const group = useRef<THREE.Group>(null!);
  const wheelFL = useRef<THREE.Mesh>(null!);
  const wheelFR = useRef<THREE.Mesh>(null!);
  const wheelBL = useRef<THREE.Mesh>(null!);
  const wheelBR = useRef<THREE.Mesh>(null!);
  const lastPos = useRef(new THREE.Vector3());
  const bobPhase = useRef(0);

  useFrame((_, dt) => {
    if (!group.current || !posRef.current) return;
    const p = posRef.current;
    group.current.position.x = p.x;
    group.current.position.z = p.z;

    // Speed-based wheel spin
    const dx = p.x - lastPos.current.x;
    const dz = p.z - lastPos.current.z;
    const speed = Math.hypot(dx, dz) / dt;
    const spin = speed * dt * 3;
    for (const w of [wheelFL, wheelFR, wheelBL, wheelBR]) {
      if (w.current) w.current.rotation.x += spin;
    }
    lastPos.current.copy(p);

    // Gentle bob when moving
    if (speed > 0.5) {
      bobPhase.current += dt * 12;
      group.current.position.y = Math.abs(Math.sin(bobPhase.current)) * 0.04;
    }

    // Face direction of travel
    if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
      const angle = Math.atan2(dx, dz);
      group.current.rotation.y += (angle - group.current.rotation.y) * 0.18;
    }
  });

  const wheelArgs: [number, number, number] = [0.22, 0.22, 0.1];
  const wheelMat = <meshStandardMaterial color="#374151" />;
  const bodyMat  = <meshStandardMaterial color="#38bdf8" metalness={0.3} roughness={0.5} />;
  const rimMat   = <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.3} />;

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* Cart basket */}
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[0.9, 0.55, 1.2]} />
        {bodyMat}
      </mesh>
      {/* Basket front/back open — wire look via thin inner box */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.78, 0.42, 1.08]} />
        <meshStandardMaterial color="#7dd3fc" transparent opacity={0.3} side={THREE.BackSide} />
      </mesh>
      {/* Handle bar */}
      <mesh castShadow position={[0, 0.95, -0.55]}>
        <boxGeometry args={[0.95, 0.08, 0.08]} />
        {rimMat}
      </mesh>
      {/* Wheels */}
      <mesh ref={wheelFL} castShadow position={[ 0.45, 0.22,  0.45]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={wheelArgs} />
        {wheelMat}
      </mesh>
      <mesh ref={wheelFR} castShadow position={[-0.45, 0.22,  0.45]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={wheelArgs} />
        {wheelMat}
      </mesh>
      <mesh ref={wheelBL} castShadow position={[ 0.45, 0.22, -0.45]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={wheelArgs} />
        {wheelMat}
      </mesh>
      <mesh ref={wheelBR} castShadow position={[-0.45, 0.22, -0.45]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={wheelArgs} />
        {wheelMat}
      </mesh>
    </group>
  );
}

/** A collectible grocery item — spins and bobs. */
function ItemMesh({ item }: { item: ShopItem }) {
  const mesh = useRef<THREE.Mesh>(null!);
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame((_, dt) => {
    if (!mesh.current) return;
    phase.current += dt * 2.2;
    mesh.current.rotation.y += dt * 1.8;
    mesh.current.position.y = 0.65 + Math.sin(phase.current) * 0.14;
  });

  const color   = ITEM_COLOR[item.kind];
  const emissive = ITEM_EMISSIVE[item.kind];
  const isStar  = item.kind === "star";

  return (
    <mesh ref={mesh} position={[item.x, 0.65, item.z]} castShadow>
      {isStar
        ? <octahedronGeometry args={[0.45, 0]} />
        : <boxGeometry args={[0.6, 0.6, 0.6]} />}
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={isStar ? 1.2 : 0.5}
        metalness={isStar ? 0.4 : 0}
        roughness={0.4}
      />
    </mesh>
  );
}

/** Supermarket floor tiles with coloured border stripes. */
function StoreFloor() {
  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[ARENA_HALF * 2, ARENA_HALF * 2]} />
        <meshStandardMaterial color="#fef9f0" />
      </mesh>
      {/* Tile grid lines */}
      <gridHelper
        args={[ARENA_HALF * 2, ARENA_HALF * 2, "#e2d9c8", "#e2d9c8"]}
        position={[0, 0.01, 0]}
      />
      {/* Colourful border stripe */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.005, 0]}>
        <ringGeometry args={[ARENA_HALF - 0.5, ARENA_HALF, 4, 1, Math.PI / 4]} />
        <meshStandardMaterial color="#fb923c" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/** Colourful shelving units along the walls. */
function Shelves() {
  const shelfColor = "#d1fae5";
  const postColor  = "#6ee7b7";
  const positions: [number, number, number, number][] = [
    // [x, z, rotY, length]
    [ ARENA_HALF - 1, 0,    0,           ARENA_HALF * 1.6],
    [-ARENA_HALF + 1, 0,    0,           ARENA_HALF * 1.6],
    [0,  ARENA_HALF - 1, Math.PI / 2,   ARENA_HALF * 1.6],
    [0, -ARENA_HALF + 1, Math.PI / 2,   ARENA_HALF * 1.6],
  ];

  return (
    <group>
      {positions.map(([x, z, ry, len], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, ry, 0]}>
          {/* Back panel */}
          <mesh castShadow receiveShadow position={[0, 1.0, 0]}>
            <boxGeometry args={[len, 2.0, 0.3]} />
            <meshStandardMaterial color={shelfColor} />
          </mesh>
          {/* Shelves */}
          {[0.3, 1.0, 1.7].map((sy, j) => (
            <mesh key={j} position={[0, sy, 0.18]}>
              <boxGeometry args={[len, 0.08, 0.5]} />
              <meshStandardMaterial color={postColor} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Ceiling lights — rows of warm panels. */
function CeilingLights() {
  const xs = [-8, 0, 8];
  const zs = [-8, 0, 8];
  return (
    <group>
      {xs.flatMap((x) =>
        zs.map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 5.9, z]}>
            <boxGeometry args={[2.5, 0.12, 1.2]} />
            <meshStandardMaterial color="#fffde7" emissive="#fffde7" emissiveIntensity={1.5} />
          </mesh>
        ))
      )}
    </group>
  );
}

/** Smooth follow camera. */
function FollowCamera({ posRef }: { posRef: React.RefObject<THREE.Vector3> }) {
  const { camera } = useThree();
  useFrame(() => {
    const p = posRef.current;
    if (!p) return;
    camera.position.x += (p.x      - camera.position.x) * 0.07;
    camera.position.z += (p.z + 18 - camera.position.z) * 0.07;
    camera.position.y = 17;
    camera.lookAt(p.x, 0, p.z);
  });
  return null;
}

// ─── Main Scene ───────────────────────────────────────────────────────────────

function Scene({ onScore, onTime, onGameOver }: GameProps) {
  const posRef  = useRef(new THREE.Vector3(0, 0, 0));
  const keys    = useRef<Set<Dir>>(new Set());
  const [items, setItems]   = useState<ShopItem[]>(initialItems);
  const itemsRef            = useRef<ShopItem[]>(items);
  const [pops,  setPops]    = useState<PopLabel[]>([]);
  const popsRef             = useRef<PopLabel[]>([]);

  const scoreRef      = useRef(0);
  const timeRef       = useRef(ROUND_SECONDS);
  const lastSecRef    = useRef(ROUND_SECONDS);
  const nextIdRef     = useRef(ITEM_COUNT);
  const nextPopId     = useRef(0);
  const overRef       = useRef(false);

  const sounds    = useGameSounds();
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;
  const cbs = useRef({ onScore, onTime, onGameOver });
  cbs.current = { onScore, onTime, onGameOver };

  // Keyboard
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { const d = mapKey(e.key); if (d) { e.preventDefault(); keys.current.add(d); } };
    const up = (e: KeyboardEvent) => { const d = mapKey(e.key); if (d) keys.current.delete(d); };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  useFrame((_, delta) => {
    if (overRef.current) return;
    const dt = Math.min(delta, 0.05);

    // ── Timer ──
    timeRef.current -= dt;
    const secs = Math.max(0, Math.ceil(timeRef.current));
    if (secs !== lastSecRef.current) {
      lastSecRef.current = secs;
      cbs.current.onTime(secs);
    }
    if (timeRef.current <= 0) {
      overRef.current = true;
      soundsRef.current.playGameOver();
      cbs.current.onGameOver();
      return;
    }

    // ── Movement ──
    let vx = 0, vz = 0;
    if (keys.current.has("left"))  vx -= 1;
    if (keys.current.has("right")) vx += 1;
    if (keys.current.has("up"))    vz -= 1;
    if (keys.current.has("down"))  vz += 1;
    if (vx !== 0 || vz !== 0) {
      const len = Math.hypot(vx, vz) || 1;
      const p   = posRef.current;
      const [nx, nz] = clampToArena(
        p.x + (vx / len) * PLAYER_SPEED * dt,
        p.z + (vz / len) * PLAYER_SPEED * dt,
        ARENA_HALF - 1.2,
      );
      p.x = nx; p.z = nz;
    }

    // ── Collision / collect ──
    const p    = posRef.current;
    const list = itemsRef.current;
    let collected = 0;
    const newPops: PopLabel[] = [];

    for (let i = 0; i < list.length; i++) {
      const item = list[i]!;
      if (collides(p.x, p.z, item.x, item.z)) {
        collected += item.points;
        newPops.push({
          id: nextPopId.current++,
          x: item.x, z: item.z,
          text: `+${item.points} ${ITEM_EMOJI[item.kind]}`,
          age: 0,
        });
        const [nx, nz] = randomItemPosition(p.x, p.z);
        list[i] = {
          id:     nextIdRef.current++,
          x:      nx, z: nz,
          kind:   randomKind(),
          points: 0, // filled below
        };
        list[i]!.points = ITEM_POINTS[list[i]!.kind];
      }
    }

    if (collected > 0) {
      scoreRef.current += collected;
      cbs.current.onScore(scoreRef.current);
      soundsRef.current.playScore();
      setItems([...list]);
      // Add pop labels
      popsRef.current = [...popsRef.current, ...newPops];
      setPops([...popsRef.current]);
    }

    // Age pop labels
    if (popsRef.current.length > 0) {
      let changed = false;
      const alive: PopLabel[] = [];
      for (const pop of popsRef.current) {
        const aged = { ...pop, age: pop.age + dt };
        if (aged.age < 1.2) { alive.push(aged); changed = true; }
        else changed = true;
      }
      if (changed) { popsRef.current = alive; setPops([...alive]); }
    }
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[10, 18, 10]} intensity={0.7} castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-10, 12, -10]} intensity={0.4} />
      {/* Warm point lights for store feel */}
      <pointLight position={[0, 5, 0]}   intensity={0.6} color="#fff9e6" />
      <pointLight position={[12, 4, 12]} intensity={0.3} color="#fde68a" />
      <pointLight position={[-12,4,-12]} intensity={0.3} color="#fde68a" />

      {/* Background */}
      <color attach="background" args={["#e0f2fe"]} />
      <fog   attach="fog"        args={["#e0f2fe", 40, 80]} />

      <FollowCamera posRef={posRef} />
      <StoreFloor />
      <Shelves />
      <CeilingLights />
      <Cart posRef={posRef} />
      {items.map((item) => <ItemMesh key={item.id} item={item} />)}
    </>
  );
}

// ─── D-Pad ────────────────────────────────────────────────────────────────────

function press(dir: Dir, type: "keydown" | "keyup") {
  const key =
    dir === "left"  ? "ArrowLeft"  :
    dir === "right" ? "ArrowRight" :
    dir === "up"    ? "ArrowUp"    : "ArrowDown";
  window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
}

function DpadBtn({ dir, label }: { dir: Dir; label: string }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); press(dir, "keydown"); }}
      onPointerUp={(e)   => { e.preventDefault(); press(dir, "keyup");   }}
      onPointerCancel={() => press(dir, "keyup")}
      onPointerLeave={() =>  press(dir, "keyup")}
      aria-label={`Move ${dir}`}
      style={{
        width: 60, height: 60, borderRadius: "1rem",
        background: "rgba(255,255,255,0.22)",
        backdropFilter: "blur(6px)",
        border: "2px solid rgba(255,255,255,0.4)",
        color: "#1e3a5f", fontSize: 24,
        display: "flex", alignItems: "center", justifyContent: "center",
        touchAction: "none", userSelect: "none", cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
      }}
    >
      {label}
    </button>
  );
}

function MobileControls() {
  useEffect(() => () => {
    (["left", "right", "up", "down"] as Dir[]).forEach((d) => press(d, "keyup"));
  }, []);
  return (
    <div
      style={{
        position: "absolute", bottom: 20, left: 0, right: 0,
        display: "flex", justifyContent: "center",
        pointerEvents: "none", zIndex: 10,
      }}
    >
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 60px)",
        gridTemplateRows:    "repeat(2, 60px)",
        gap: 6,
        pointerEvents: "auto",
      }}>
        <span />
        <DpadBtn dir="up"    label="▲" />
        <span />
        <DpadBtn dir="left"  label="◀" />
        <DpadBtn dir="down"  label="▼" />
        <DpadBtn dir="right" label="▶" />
      </div>
    </div>
  );
}

// ─── HUD overlay: collected item pop labels ────────────────────────────────────

function PopLabels({ pops }: { pops: PopLabel[] }) {
  if (pops.length === 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}>
      {pops.map((pop) => (
        <div
          key={pop.id}
          style={{
            position: "absolute",
            left: "50%", top: "40%",
            transform: `translate(-50%, -${pop.age * 60}px)`,
            opacity: Math.max(0, 1 - pop.age / 1.2),
            fontSize: "1.4rem",
            fontWeight: 800,
            color: "#1e3a5f",
            textShadow: "0 2px 8px rgba(255,255,255,0.9)",
            transition: "none",
            whiteSpace: "nowrap",
          }}
        >
          {pop.text}
        </div>
      ))}
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function Game(props: GameProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [pops, setPops]         = useState<PopLabel[]>([]);

  useEffect(() => {
    const check = () =>
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // We need pops to bubble up from Scene → here for the DOM overlay.
  // We thread a setter down via a ref trick so Scene can call it without a prop.
  const setPopsRef = useRef(setPops);
  setPopsRef.current = setPops;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        shadows
        camera={{ position: [0, 17, 18], fov: 52, near: 0.1, far: 150 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene {...props} />
      </Canvas>
      <PopLabels pops={pops} />
      {isMobile && <MobileControls />}
    </div>
  );
}
