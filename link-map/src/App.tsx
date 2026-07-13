import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PROFILE } from "./world/device";
import { LIVE } from "./world/palettes";
import { GroundPlane } from "./map/GroundPlane";
import { Water } from "./map/Water";
import { Parks } from "./map/Parks";
import { Roads } from "./map/Roads";
import { Landmarks } from "./map/Landmarks";
import { Ferries } from "./map/Ferries";
import { Seaplanes } from "./map/Seaplanes";
import { CityLights } from "./map/CityLights";
import { LineRibbons } from "./map/LineRibbons";
import { Trains } from "./trains/Trains";
import { TrainModel } from "./trains/TrainModel";
import { Trails } from "./trains/Trails";
import { Stations } from "./stations/Stations";
import { Labels } from "./stations/Labels";
import { CameraRig } from "./observer/CameraRig";
import { Composer } from "./fx/Composer";
import { WeatherOverlay } from "./fx/WeatherOverlay";
import { Hud } from "./ui/Hud";
import { StationPanel } from "./stations/StationPanel";
import { startPoller } from "./trains/poller";
import { startWeather } from "./world/weather";
import { installHandles, markFrame } from "./dev/handles";

/** Applies the live palette to scene background + fog, counts frames. */
function AtmosphereDriver() {
  const scene = useThree((s) => s.scene);
  const fogRef = useRef<THREE.FogExp2>();
  useEffect(() => {
    scene.background = LIVE.background;
    fogRef.current = new THREE.FogExp2(LIVE.fog, LIVE.fogDensity);
    // Sharing the palette's Color instance means the per-frame lerp in
    // updatePalette() recolors fog and background for free.
    fogRef.current.color = LIVE.fog;
    scene.fog = fogRef.current;
  }, [scene]);
  useFrame(() => {
    if (fogRef.current) fogRef.current.density = LIVE.fogDensity;
    markFrame();
  });
  return null;
}

export default function App() {
  const [hidden, setHidden] = useState(document.hidden);

  useEffect(() => {
    installHandles();
    const stop = startPoller();
    const stopWeather = startWeather();
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      stopWeather();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <>
      <Canvas
        dpr={PROFILE.dpr}
        frameloop={hidden ? "never" : "always"}
        gl={{
          antialias: PROFILE.composer === "off",
          powerPreference: "high-performance",
        }}
        camera={{ fov: PROFILE.baseFov, near: 0.1, far: 500, position: [0, 26, 18] }}
      >
        <AtmosphereDriver />
        <Parks />
        <Water />
        <GroundPlane />
        <Roads />
        <Landmarks />
        <Ferries />
        <Seaplanes />
        <CityLights />
        <LineRibbons />
        <Stations />
        <Trains />
        <TrainModel />
        <Trails />
        <Labels />
        <CameraRig />
        <Composer />
        <WeatherOverlay />
      </Canvas>
      <Hud />
      <StationPanel />
    </>
  );
}
