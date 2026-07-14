import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PROFILE } from "./world/device";
import { LIVE } from "./world/palettes";
import { useUi } from "./trains/store";
import { GroundPlane } from "./map/GroundPlane";
import { Water } from "./map/Water";
import { Parks } from "./map/Parks";
import { Roads } from "./map/Roads";
import { Cars } from "./map/Cars";
import { Forest } from "./map/Forest";
import { Buildings } from "./map/Buildings";
import { Landmarks } from "./map/Landmarks";
import { Kasumi } from "./map/Kasumi";
import { Ferries } from "./map/Ferries";
import { Cyclists } from "./map/Cyclists";
import { Seaplanes } from "./map/Seaplanes";
import { Airliners } from "./map/Airliners";
import { Wakes } from "./map/Wakes";
import { Birds } from "./map/Birds";
import { CityLights } from "./map/CityLights";
import { Reflections } from "./map/Reflections";
import { LineRibbons } from "./map/LineRibbons";
import { Trains } from "./trains/Trains";
import { TrainModel } from "./trains/TrainModel";
import { Trails } from "./trains/Trails";
import { Stations } from "./stations/Stations";
import { PlatformLife } from "./stations/PlatformLife";
import { Labels } from "./stations/Labels";
import { CameraRig } from "./observer/CameraRig";
import { Composer } from "./fx/Composer";
import { WeatherOverlay } from "./fx/WeatherOverlay";
import { SkyBokashi } from "./fx/SkyBokashi";
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
        // Tap/click anywhere off a station closes its open card — the easy way
        // out for the tap-to-open panel (stations stopPropagation, so a real
        // hit never reaches here).
        onPointerMissed={() => useUi.getState().setHoverStation(null)}
      >
        <AtmosphereDriver />
        <SkyBokashi />
        <Parks />
        <Water />
        <GroundPlane />
        <Roads />
        <Cars />
        <Forest />
        <Buildings />
        <Landmarks />
        <Kasumi />
        <Wakes />
        <Ferries />
        <Cyclists />
        <Seaplanes />
        <Airliners />
        <Birds />
        <CityLights />
        <Reflections />
        <LineRibbons />
        <Stations />
        <PlatformLife />
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
