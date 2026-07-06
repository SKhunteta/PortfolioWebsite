import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BackSide, Color, Mesh, ShaderMaterial, Vector3 } from "three";
import { atmosphereFragment, atmosphereVertex } from "./shaders/atmosphere";
import { useWorldClock, selectPhase } from "../world/WorldClock";
import { sunDirection, dayness } from "../world/sun";
import { PALETTE } from "../world/palettes";
import { KETU } from "../world/config";

interface AtmosphereProps {
  sunIntensity?: number;
  exposure?: number;
  /** Primary/secondary ray-march step counts. Lower on mobile: the shader is
   *  per-pixel fill-rate bound and phones render at high devicePixelRatio. */
  primarySteps?: number;
  lightSteps?: number;
}

/**
 * A large inverted sphere, kept centered on the camera, rendered with the
 * scattering shader. Drives its sun direction from the WorldClock every frame.
 */
export function Atmosphere({
  sunIntensity = 22,
  exposure = 1.1,
  primarySteps = 16,
  lightSteps = 8,
}: AtmosphereProps) {
  const meshRef = useRef<Mesh>(null);
  const { camera } = useThree();

  const uniforms = useMemo(
    () => ({
      uSunDir: { value: new Vector3(0, 1, 0) },
      uSunIntensity: { value: sunIntensity },
      uExposure: { value: exposure },
      uNightColor: { value: new Color(0, 0, 0) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        defines: { PRIMARY_STEPS: primarySteps, LIGHT_STEPS: lightSteps },
        uniforms,
        side: BackSide,
        depthWrite: false,
      }),
    [uniforms, primarySteps, lightSteps]
  );

  const nightScratch = useMemo(() => new Color(), []);

  useFrame(() => {
    const phase = useWorldClock.getState().phase;
    uniforms.uSunDir.value.copy(sunDirection(phase));
    uniforms.uSunIntensity.value = sunIntensity;
    uniforms.uExposure.value = exposure;

    // A whisper of indigo when the sun is well below the horizon, so the Dark
    // reads as deep twilight rather than a black void. (Aurora lights it later.)
    const d = dayness(phase);
    nightScratch.copy(PALETTE.fogDark).multiplyScalar(0.14 * (1 - d));
    uniforms.uNightColor.value.copy(nightScratch);

    // Keep the dome centered on the camera.
    if (meshRef.current) meshRef.current.position.copy(camera.position);
  });

  // Read phase once so the component re-mounts cleanly on HMR; frame loop does the work.
  useWorldClock(selectPhase);

  return (
    <mesh ref={meshRef} material={material} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[KETU.skyDomeRadius, 64, 32]} />
    </mesh>
  );
}
