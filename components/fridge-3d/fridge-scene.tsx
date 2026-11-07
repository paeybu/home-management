import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Bounds, Clone, Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { expiryStatus, sortByExpiry, type ExpiryStatus } from "@/lib/fridge";
import { modelUrl } from "@/lib/food-models";
import type { FridgeLocation, FridgeUnit } from "@/lib/types";

export type Item3D = {
  id: string;
  name: string;
  location: FridgeLocation;
  unit: FridgeUnit;
  quantity: number;
  expires_on: string | null;
  emoji: string;
  model: string | null;
};

export type DoorId = "fridgeL" | "fridgeR" | "freezerL" | "freezerR";

// ---------- Dimensions (scene units ≈ metres × 2) ----------
const W = 2.0; // cabinet width
const D = 1.3; // cabinet depth
const T = 0.05; // wall thickness
const FEET = 0.08;
const FREEZER_H = 1.3;
const DIVIDER = 0.08;
const FRIDGE_H = 2.3;
const FREEZER_Y0 = FEET; // bottom of freezer box
const FRIDGE_Y0 = FEET + FREEZER_H + DIVIDER; // bottom of fridge box
const TOTAL_H = FRIDGE_Y0 + FRIDGE_H;
const DOOR_T = 0.08;
const DOOR_W = W / 2 - 0.006;
const ITEM = 0.36; // max item size
const BIN_DEPTH = 0.18;

const STEEL = "#c3c8ce";
const INTERIOR = "#f3f5f7";
const STATUS_COLOR: Partial<Record<ExpiryStatus, string>> = { expired: "#dc2626", expiring_soon: "#f59e0b" };

// Shelf surfaces (y of the surface items stand on), listed top to bottom so the top shelf fills first.
const FRIDGE_LEVELS = [FRIDGE_Y0 + T + 1.65, FRIDGE_Y0 + T + 1.1, FRIDGE_Y0 + T + 0.55, FRIDGE_Y0 + T];
const FREEZER_LEVELS = [FREEZER_Y0 + T + 0.62, FREEZER_Y0 + T];
const BIN_LEVELS = [0.55, 0.0, -0.55]; // door bins, relative to the fridge door centre

type Placed = { item: Item3D; pos: [number, number, number]; size: number; door?: DoorId };

/** Assign every item a slot: liquids on the fridge door bins, everything else across shelves, soonest expiry first. */
function layout(items: Item3D[]): Placed[] {
  const placed: Placed[] = [];
  const sorted = sortByExpiry(items);

  /**
   * Spread items evenly over the shelves (top shelf first, soonest expiry first).
   * Each shelf fills a front row, then a back row offset by half a slot so nothing hides behind.
   */
  const shelves = (list: Item3D[], levels: number[]) => {
    if (!list.length) return;
    const innerW = W - 2 * T - 0.14;
    const perLevel = Math.ceil(list.length / levels.length);
    const cols = perLevel <= 5 ? Math.max(perLevel, 3) : Math.ceil(perLevel / 2);
    const step = innerW / cols;
    const size = Math.min(ITEM, step * 0.8);
    const zs = [0.1, -0.3]; // front row (clears the door bins), back row
    for (let l = 0; l < levels.length; l++) {
      const onLevel = list.slice(l * perLevel, (l + 1) * perLevel);
      [onLevel.slice(0, cols), onLevel.slice(cols)].forEach((row, r) => {
        row.forEach((item, j) => {
          const x = (j - (row.length - 1) / 2) * step + (r === 1 ? step / 2 : 0);
          placed.push({ item, pos: [Math.min(x, innerW / 2 - size / 2), levels[l], zs[r]], size });
        });
      });
    }
  };

  const fridge = sorted.filter((i) => i.location === "fridge");
  const liquids = fridge.filter((i) => i.unit === "ml" || i.unit === "l");
  const perBin = 3;
  const binSlots = BIN_LEVELS.length * perBin * 2;
  const onDoors = liquids.slice(0, binSlots);
  const binStep = (DOOR_W - 0.2) / perBin;
  onDoors.forEach((item, i) => {
    const door: DoorId = i % 2 === 0 ? "fridgeL" : "fridgeR";
    const k = Math.floor(i / 2);
    const bin = Math.floor(k / perBin);
    const slot = k % perBin;
    // Local to the door group (hinge at x=0, door extends towards the cabinet centre).
    const x = (door === "fridgeL" ? 1 : -1) * (0.1 + binStep * (slot + 0.5));
    placed.push({ item, door, pos: [x, BIN_LEVELS[bin] + 0.03, -BIN_DEPTH / 2 - 0.02], size: Math.min(ITEM * 0.85, binStep * 0.9) });
  });
  const doorIds = new Set(onDoors.map((i) => i.id));
  shelves(fridge.filter((i) => !doorIds.has(i.id)), FRIDGE_LEVELS);
  shelves(sorted.filter((i) => i.location === "freezer"), FREEZER_LEVELS);
  return placed;
}

// ---------- Item visuals ----------

const textureCache = new Map<string, THREE.CanvasTexture>();
function emojiTexture(emoji: string, ring: string | undefined) {
  const key = `${emoji}|${ring ?? ""}`;
  let tex = textureCache.get(key);
  if (tex) return tex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  if (ring) {
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fillStyle = ring + "33";
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = ring;
    ctx.stroke();
  }
  ctx.font = "84px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 64, 70);
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, tex);
  return tex;
}

function EmojiSprite({ emoji, size, ring }: { emoji: string; size: number; ring?: string }) {
  const map = useMemo(() => emojiTexture(emoji, ring), [emoji, ring]);
  return (
    <sprite position={[0, size / 2, 0]} scale={[size, size, 1]}>
      <spriteMaterial map={map} transparent depthWrite={false} />
    </sprite>
  );
}

/** A Kenney model scaled to fit a `size` cube, standing on y=0. */
function FoodModel({ model, size }: { model: string; size: number }) {
  const { scene } = useGLTF(modelUrl(model), false, false);
  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const dims = box.getSize(new THREE.Vector3());
    // Fit the footprint to `size` (so flat foods like bacon stay readable), but cap the height.
    const s = Math.min(size / Math.max(dims.x, dims.z, 1e-3), (size * 1.3) / Math.max(dims.y, 1e-3));
    const center = box.getCenter(new THREE.Vector3());
    return { scale: s, offset: [-center.x * s, -box.min.y * s, -center.z * s] as [number, number, number] };
  }, [scene, size]);
  return <Clone object={scene} scale={scale} position={offset} />;
}

const badgeCache = new Map<string, THREE.CanvasTexture>();
/** Small floating "!" / clock badge above a 3D model that is expired / expiring soon. */
function StatusBadge({ color, y, expired }: { color: string; y: number; expired: boolean }) {
  const map = useMemo(() => {
    const key = color + expired;
    let tex = badgeCache.get(key);
    if (tex) return tex;
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(expired ? "!" : "⏱", 32, 35);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    badgeCache.set(key, tex);
    return tex;
  }, [color, expired]);
  return (
    <sprite position={[0, y, 0.05]} scale={[0.13, 0.13, 1]}>
      <spriteMaterial map={map} transparent depthTest={false} />
    </sprite>
  );
}

function FoodItem({ placed, today, selected, onSelect }: { placed: Placed; today: string; selected: boolean; onSelect: (id: string) => void }) {
  const ref = useRef<THREE.Group>(null);
  const { item, pos, size } = placed;
  const { status } = expiryStatus(item.expires_on, today);
  const ring = STATUS_COLOR[status];

  useFrame((_, dt) => {
    if (!ref.current) return;
    const target = selected ? 1.3 : 1;
    const s = THREE.MathUtils.damp(ref.current.scale.x, target, 10, dt);
    ref.current.scale.setScalar(s);
    if (selected) ref.current.rotation.y += dt * 0.8;
    else ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, 0, 6, dt);
  });

  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(item.id); };

  return (
    <group position={pos}>
      <group ref={ref} onClick={click}>
        {item.model ? (
          <Suspense fallback={<EmojiSprite emoji={item.emoji} size={size} />}>
            <FoodModel model={item.model} size={size} />
          </Suspense>
        ) : (
          <EmojiSprite emoji={item.emoji} size={size} ring={ring} />
        )}
        {/* Invisible hit box: makes small models easy to tap. */}
        <mesh position={[0, size / 2, 0]} visible={false}>
          <boxGeometry args={[size, size, size]} />
        </mesh>
      </group>
      {item.model && ring && <StatusBadge color={ring} y={size * 1.15} expired={status === "expired"} />}
      {selected && (
        <Html position={[0, size * 1.45, 0]} center zIndexRange={[20, 0]}>
          <div className="pointer-events-none rounded-md bg-foreground px-2 py-0.5 text-xs font-medium whitespace-nowrap text-background shadow">
            {item.name}
          </div>
        </Html>
      )}
    </group>
  );
}

// ---------- Cabinet ----------

function Panel({ args, position, color = INTERIOR, ...rest }: { args: [number, number, number]; position: [number, number, number]; color?: string } & Partial<THREE.MeshStandardMaterialParameters>) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.85} {...rest} />
    </mesh>
  );
}

function Compartment({ y0, h }: { y0: number; h: number }) {
  const cy = y0 + h / 2;
  return (
    <group>
      <Panel args={[W, h, T]} position={[0, cy, -D / 2 + T / 2]} />
      <Panel args={[T, h, D]} position={[-W / 2 + T / 2, cy, 0]} />
      <Panel args={[T, h, D]} position={[W / 2 - T / 2, cy, 0]} />
      <Panel args={[W, T, D]} position={[0, y0 + T / 2, 0]} />
      <Panel args={[W, T, D]} position={[0, y0 + h - T / 2, 0]} />
    </group>
  );
}

function GlassShelf({ y }: { y: number }) {
  return (
    <mesh position={[0, y - 0.012, -0.1]}>
      <boxGeometry args={[W - 2 * T, 0.024, D - 0.45]} />
      <meshStandardMaterial color="#cfe6f7" transparent opacity={0.35} roughness={0.1} />
    </mesh>
  );
}

function Door({
  id, open, side, y, h, handleY, children, onToggle,
}: { id: DoorId; open: boolean; side: "L" | "R"; y: number; h: number; handleY: number; children?: React.ReactNode; onToggle: (id: DoorId) => void }) {
  const ref = useRef<THREE.Group>(null);
  const dir = side === "L" ? 1 : -1; // door extends +x from a left hinge, -x from a right hinge
  const openAngle = side === "L" ? -1.95 : 1.95;

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, open ? openAngle : 0, 5, dt);
  });

  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onToggle(id); };

  return (
    <group ref={ref} position={[-dir * (W / 2), y, D / 2]}>
      <mesh position={[dir * (DOOR_W / 2), 0, DOOR_T / 2]} onClick={click}>
        <boxGeometry args={[DOOR_W, h - 0.01, DOOR_T]} />
        <meshStandardMaterial color={STEEL} metalness={0.55} roughness={0.32} />
      </mesh>
      {/* inner liner */}
      <mesh position={[dir * (DOOR_W / 2), 0, -0.002]} onClick={click}>
        <boxGeometry args={[DOOR_W - 0.06, h - 0.07, 0.004]} />
        <meshStandardMaterial color={INTERIOR} roughness={0.9} />
      </mesh>
      {/* handle, near the centre seam */}
      <mesh position={[dir * (DOOR_W - 0.09), handleY, DOOR_T + 0.05]} onClick={click}>
        <boxGeometry args={[0.04, 0.5, 0.04]} />
        <meshStandardMaterial color="#8b9198" metalness={0.8} roughness={0.25} />
      </mesh>
      {children}
    </group>
  );
}

function DoorBins({ side }: { side: "L" | "R" }) {
  const dir = side === "L" ? 1 : -1;
  return (
    <>
      {BIN_LEVELS.map((by) => (
        <group key={by} position={[dir * (DOOR_W / 2), by, -BIN_DEPTH / 2 - 0.01]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[DOOR_W - 0.14, 0.02, BIN_DEPTH]} />
            <meshStandardMaterial color="#e4ebf0" />
          </mesh>
          <mesh position={[0, 0.07, -BIN_DEPTH / 2]}>
            <boxGeometry args={[DOOR_W - 0.14, 0.14, 0.012]} />
            <meshStandardMaterial color="#cfe6f7" transparent opacity={0.45} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function InteriorLight({ on, y }: { on: boolean; y: number }) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.intensity = THREE.MathUtils.damp(ref.current.intensity, on ? 2.2 : 0, 6, dt);
  });
  return <pointLight ref={ref} position={[0, y, 0.2]} distance={3} decay={1.5} color="#fffaf0" intensity={0} />;
}

// ---------- Scene ----------

export function FridgeScene({
  items, today, selectedId, onSelect, open, onToggleDoor,
}: {
  items: Item3D[];
  today: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  open: Record<DoorId, boolean>;
  onToggleDoor: (id: DoorId) => void;
}) {
  const placed = useMemo(() => layout(items), [items]);

  // Warm the model cache for everything on screen.
  useEffect(() => {
    for (const m of new Set(items.map((i) => i.model).filter(Boolean) as string[])) useGLTF.preload(modelUrl(m), false, false);
  }, [items]);

  const onShelves = placed.filter((p) => !p.door);
  const onDoor = (d: DoorId) => placed.filter((p) => p.door === d);
  const renderItem = (p: Placed) => (
    <FoodItem key={p.item.id} placed={p} today={today} selected={p.item.id === selectedId} onSelect={onSelect} />
  );

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 35, position: [0, TOTAL_H / 2 + 1.4, 9] }}
      onPointerMissed={() => onSelect(null)}
      className="touch-none"
    >
      <color attach="background" args={["#eef1f4"]} />
      <hemisphereLight args={["#ffffff", "#b8c0c8", 1.1]} />
      <directionalLight position={[3, 6, 6]} intensity={1.4} />
      <directionalLight position={[-4, 3, 4]} intensity={0.5} />
      <InteriorLight on={open.fridgeL || open.fridgeR} y={FRIDGE_Y0 + FRIDGE_H - 0.3} />
      <InteriorLight on={open.freezerL || open.freezerR} y={FREEZER_Y0 + FREEZER_H - 0.2} />

      <Bounds fit clip observe margin={1.02}>
        <group>
          {/* Fridge (top) and freezer (bottom) boxes, plus the outer steel shell */}
          <Compartment y0={FRIDGE_Y0} h={FRIDGE_H} />
          <Compartment y0={FREEZER_Y0} h={FREEZER_H} />
          <Panel args={[W, DIVIDER, D]} position={[0, FREEZER_Y0 + FREEZER_H + DIVIDER / 2, 0]} color={STEEL} metalness={0.5} roughness={0.35} />
          <Panel args={[W + 0.02, TOTAL_H - FEET, 0.02]} position={[0, FEET + (TOTAL_H - FEET) / 2, -D / 2 - 0.01]} color={STEEL} metalness={0.5} roughness={0.35} />
          {FRIDGE_LEVELS.slice(0, -1).map((y) => <GlassShelf key={y} y={y} />)}
          {FREEZER_LEVELS.slice(0, -1).map((y) => <GlassShelf key={y} y={y} />)}
        </group>
      </Bounds>

      {onShelves.map(renderItem)}

      <Door id="fridgeL" side="L" y={FRIDGE_Y0 + FRIDGE_H / 2} h={FRIDGE_H} handleY={-FRIDGE_H / 2 + 0.55} open={open.fridgeL} onToggle={onToggleDoor}>
        <DoorBins side="L" />
        {onDoor("fridgeL").map(renderItem)}
      </Door>
      <Door id="fridgeR" side="R" y={FRIDGE_Y0 + FRIDGE_H / 2} h={FRIDGE_H} handleY={-FRIDGE_H / 2 + 0.55} open={open.fridgeR} onToggle={onToggleDoor}>
        <DoorBins side="R" />
        {onDoor("fridgeR").map(renderItem)}
      </Door>
      <Door id="freezerL" side="L" y={FREEZER_Y0 + FREEZER_H / 2} h={FREEZER_H} handleY={FREEZER_H / 2 - 0.3} open={open.freezerL} onToggle={onToggleDoor} />
      <Door id="freezerR" side="R" y={FREEZER_Y0 + FREEZER_H / 2} h={FREEZER_H} handleY={FREEZER_H / 2 - 0.3} open={open.freezerR} onToggle={onToggleDoor} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        minAzimuthAngle={-0.7}
        maxAzimuthAngle={0.7}
        minPolarAngle={1.0}
        maxPolarAngle={1.85}
        minDistance={3}
        maxDistance={14}
      />
    </Canvas>
  );
}
