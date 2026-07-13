// Station names in a quiet monospace, drawn to canvas textures (no external
// font fetches, no DOM overlay jitter) and shown as a single fading sprite
// for whichever station is hovered/tapped. Canvas label textures are cached
// per station.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { STATION_BY_ID } from "../map/network";
import { useUi } from "../trains/store";
import { CLOCK } from "../world/clock";

const FONT = '400 44px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const PAD = 26;
const cache = new Map<string, { texture: THREE.CanvasTexture; aspect: number }>();

function labelTexture(name: string) {
  let entry = cache.get(name);
  if (entry) return entry;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = FONT;
  const text = name.toUpperCase();
  const w = Math.ceil(ctx.measureText(text).width) + PAD * 2;
  const h = 88;
  canvas.width = w;
  canvas.height = h;
  ctx.font = FONT;
  ctx.textBaseline = "middle";
  // Soft dark backing so the name floats over glow without a hard box.
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "rgba(5,8,14,0)");
  grad.addColorStop(0.18, "rgba(5,8,14,0.72)");
  grad.addColorStop(0.82, "rgba(5,8,14,0.72)");
  grad.addColorStop(1, "rgba(5,8,14,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(196,214,232,0.92)";
  ctx.fillText(text, PAD, h / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  entry = { texture, aspect: w / h };
  cache.set(name, entry);
  return entry;
}

export function Labels() {
  const hoverId = useUi((s) => s.hoverStationId);
  const spriteRef = useRef<THREE.Sprite>(null);
  const materialRef = useRef<THREE.SpriteMaterial>(null);
  const fade = useRef(0);
  const lastId = useRef<string | null>(null);

  const material = useMemo(
    () =>
      new THREE.SpriteMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0,
      }),
    []
  );

  useFrame(() => {
    const sprite = spriteRef.current;
    if (!sprite) return;
    const station = hoverId ? STATION_BY_ID.get(hoverId) : null;

    if (station) {
      if (lastId.current !== station.id) {
        lastId.current = station.id;
        const { texture, aspect } = labelTexture(station.name);
        material.map = texture;
        material.needsUpdate = true;
        const h = 0.62;
        sprite.scale.set(h * aspect, h, 1);
      }
      sprite.position.set(station.x, 0.95, station.z);
      fade.current = Math.min(1, fade.current + CLOCK.dt * 6);
    } else {
      lastId.current = null;
      fade.current = Math.max(0, fade.current - CLOCK.dt * 4);
    }
    material.opacity = fade.current;
    sprite.visible = fade.current > 0.01;
  });

  return <sprite ref={spriteRef} renderOrder={11} material={material} visible={false} />;
}
