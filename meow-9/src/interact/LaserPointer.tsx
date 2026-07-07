import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Quaternion, Raycaster, Vector2, Vector3 } from "three";
import { create } from "zustand";
import { laserSurfaces } from "../station/surfaces";

// The caretaker drone's laser pointer. A plain mutable channel (dofChannel
// pattern — zero React churn): cats read it every frame from their own
// useFrame loops. The pointer is ARMED via the pill button in App.tsx; while
// armed, OrbitControls are disabled so dragging paints the dot instead of
// orbiting — on mouse and touch alike.

export const laserChannel = {
  active: false,
  point: new Vector3(),
  normal: new Vector3(0, 1, 0),
};

interface LaserUIState {
  armed: boolean;
  setArmed: (armed: boolean) => void;
  toggle: () => void;
}

export const useLaser = create<LaserUIState>((set) => ({
  armed: false,
  setArmed: (armed) => set({ armed }),
  toggle: () => set((s) => ({ armed: !s.armed })),
}));

const UP = new Vector3(0, 1, 0);

export function LaserPointer() {
  const { camera, gl } = useThree();
  const armed = useLaser((s) => s.armed);
  const dot = useRef<Group>(null);

  const scratch = useMemo(
    () => ({
      ray: new Raycaster(),
      ndc: new Vector2(),
      has: false,
      quat: new Quaternion(),
      normal: new Vector3(),
    }),
    []
  );

  useEffect(() => {
    if (!armed) {
      laserChannel.active = false;
      scratch.has = false;
      return;
    }
    const el = gl.domElement;
    el.style.cursor = "crosshair";
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      scratch.ndc.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -(((e.clientY - r.top) / r.height) * 2 - 1)
      );
      scratch.has = true;
    };
    const onLeave = () => {
      scratch.has = false;
      laserChannel.active = false;
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.style.cursor = "";
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onMove);
      el.removeEventListener("pointerleave", onLeave);
      laserChannel.active = false;
      scratch.has = false;
    };
  }, [armed, gl, scratch]);

  useFrame(({ clock }) => {
    const d = dot.current;
    if (!armed || !scratch.has) {
      laserChannel.active = false;
      if (d) d.visible = false;
      return;
    }
    scratch.ray.setFromCamera(scratch.ndc, camera);
    const hits = scratch.ray.intersectObjects(laserSurfaces, false);
    const hit = hits[0];
    if (!hit) {
      laserChannel.active = false;
      if (d) d.visible = false;
      return;
    }
    if (hit.face) {
      hit.object.getWorldQuaternion(scratch.quat);
      scratch.normal.copy(hit.face.normal).applyQuaternion(scratch.quat).normalize();
    } else {
      scratch.normal.copy(UP);
    }
    // A little handheld jitter — nobody holds a laser still, least of all a drone.
    const t = clock.elapsedTime;
    laserChannel.point
      .copy(hit.point)
      .addScaledVector(scratch.normal, 0.02);
    laserChannel.point.x += Math.sin(t * 9.3) * 0.012;
    laserChannel.point.y += Math.sin(t * 11.7) * 0.012;
    laserChannel.active = true;
    if (d) {
      d.visible = true;
      d.position.copy(laserChannel.point);
    }
  });

  return (
    <group ref={dot} visible={false}>
      <mesh>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshStandardMaterial color="#200004" emissive="#ff2244" emissiveIntensity={3.2} />
      </mesh>
      <pointLight color="#ff3355" intensity={2.5} distance={2.4} decay={2} />
    </group>
  );
}
