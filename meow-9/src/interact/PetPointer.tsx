import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Raycaster, Sphere, Vector2, Vector3 } from "three";
import { catBodies, directionFlags, useDirection } from "../cats/direction";
import { useLaser } from "./LaserPointer";

// Pet a cat: a quick tap (not an orbit drag) sphere-casts against the live
// catBodies registry — pure math, no scene raycast, no userData tagging.
// The nearest hit gets a "pet" cue on the same direction bus the Observer
// uses. Yields the pointer entirely to the laser when armed, and never
// interrupts a choreographed tour.

const TAP_MS = 300; // press-to-release budget for a tap
const TAP_PX = 8; // movement slop — beyond this it's an orbit drag
const HIT_R = 1.6; // hit-sphere inflation over the body radius (fat-finger pad)

export function PetPointer() {
  const { camera, gl } = useThree();

  const sc = useMemo(
    () => ({
      ray: new Raycaster(),
      ndc: new Vector2(),
      sphere: new Sphere(),
      hit: new Vector3(),
      center: new Vector3(),
      off: new Vector3(),
    }),
    []
  );

  useEffect(() => {
    const el = gl.domElement;
    let downX = 0;
    let downY = 0;
    let downT = -Infinity;
    let downId = -1;

    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      downT = performance.now();
      downId = e.pointerId;
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== downId) return;
      if (performance.now() - downT > TAP_MS) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_PX) return;
      // The laser owns the pointer while armed; tours are choreographed.
      if (useLaser.getState().armed || directionFlags.observing) return;

      const r = el.getBoundingClientRect();
      sc.ndc.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -(((e.clientY - r.top) / r.height) * 2 - 1)
      );
      sc.ray.setFromCamera(sc.ndc, camera);

      let bestIndex = -1;
      let bestDist = Infinity;
      let bestSide = 1;
      for (let i = 0; i < catBodies.length; i++) {
        const b = catBodies[i];
        if (!b) continue;
        // Body center sits about one radius above the root; the inflated
        // sphere covers head-height sits and low loafs alike.
        sc.center.copy(b.pos);
        sc.center.y += b.r;
        sc.sphere.set(sc.center, b.r * HIT_R);
        if (!sc.ray.ray.intersectSphere(sc.sphere, sc.hit)) continue;
        const d = sc.ray.ray.origin.distanceTo(sc.hit);
        if (d >= bestDist) continue;
        bestDist = d;
        bestIndex = i;
        // Which flank was tapped: the hit offset along the cat's local +X
        // (heading is yaw about +Y, so local +X = (cos h, 0, -sin h)).
        sc.off.copy(sc.hit).sub(sc.center);
        const flank = sc.off.x * Math.cos(b.heading) - sc.off.z * Math.sin(b.heading);
        bestSide = flank >= 0 ? 1 : -1;
      }
      if (bestIndex >= 0) {
        useDirection.getState().direct({ kind: "pet", index: bestIndex, side: bestSide });
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
    };
  }, [camera, gl, sc]);

  return null;
}
