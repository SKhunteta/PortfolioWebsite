// Nishita-style single-scattering atmosphere.
// This is the shader to get right — once it lands, everything downstream looks
// expensive. It ray-marches the view ray through the atmosphere, and at each step
// marches a secondary ray toward the sun for the light optical depth. Rayleigh +
// Mie phase functions give the blue sky, the golden horizon, and the twilight bands
// automatically as the WorldClock spirals the sun below the horizon.
//
// Tunables worth exposing to Leva later: uSunIntensity, uExposure, and the beta*
// coefficients / scale heights (edit below) for an alien-air look.

export const atmosphereVertex = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    // Direction from camera to this vertex on the (camera-centered) sky dome.
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vWorldDir = worldPos - cameraPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragment = /* glsl */ `
  precision highp float;

  varying vec3 vWorldDir;

  uniform vec3  uSunDir;       // normalized, world space, points TOWARD the sun
  uniform float uSunIntensity; // radiance multiplier
  uniform float uExposure;     // tonemap exposure
  uniform vec3  uNightColor;   // small ambient so the Dark reads indigo, not black

  const float PI = 3.141592653589793;

  // Scattering coefficients (Earth-like — nudge for alien air).
  const vec3  betaR = vec3(5.5e-6, 13.0e-6, 22.4e-6); // Rayleigh (RGB)
  const vec3  betaM = vec3(21e-6);                     // Mie
  const float Rp = 6360e3;   // planet radius
  const float Ra = 6420e3;   // atmosphere radius
  const float Hr = 7994.0;   // Rayleigh scale height
  const float Hm = 1200.0;   // Mie scale height
  const float g  = 0.76;     // Mie anisotropy

  const int PRIMARY = 16;
  const int LIGHT   = 8;

  // Far intersection of ray (o,d) with sphere radius r centered at origin.
  bool raySphere(vec3 o, vec3 d, float r, out float t0, out float t1) {
    float b = dot(o, d);
    float c = dot(o, o) - r * r;
    float disc = b * b - c;
    if (disc < 0.0) return false;
    disc = sqrt(disc);
    t0 = -b - disc;
    t1 = -b + disc;
    return true;
  }

  vec3 computeSky(vec3 dir, vec3 sunDir) {
    // Camera sits ~1km above the surface, along +y.
    vec3 origin = vec3(0.0, Rp + 1000.0, 0.0);

    float t0, t1;
    if (!raySphere(origin, dir, Ra, t0, t1) || t1 < 0.0) return uNightColor;
    t0 = max(t0, 0.0);

    // Clip against the planet surface so ground rays don't accumulate through rock.
    float p0, p1;
    if (raySphere(origin, dir, Rp, p0, p1) && p0 > 0.0) t1 = min(t1, p0);

    float segLen = (t1 - t0) / float(PRIMARY);
    float tCur = t0;

    vec3 sumR = vec3(0.0);
    vec3 sumM = vec3(0.0);
    float odR = 0.0;
    float odM = 0.0;

    float mu = dot(dir, sunDir);
    float phaseR = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
    float g2 = g * g;
    float phaseM = 3.0 / (8.0 * PI) *
      ((1.0 - g2) * (1.0 + mu * mu)) /
      ((2.0 + g2) * pow(1.0 + g2 - 2.0 * g * mu, 1.5));

    for (int i = 0; i < PRIMARY; i++) {
      vec3 sp = origin + dir * (tCur + segLen * 0.5);
      float h = length(sp) - Rp;
      float hr = exp(-h / Hr) * segLen;
      float hm = exp(-h / Hm) * segLen;
      odR += hr;
      odM += hm;

      // Secondary march toward the sun.
      float l0, l1;
      raySphere(sp, sunDir, Ra, l0, l1);
      float lSeg = l1 / float(LIGHT);
      float lt = 0.0;
      float lodR = 0.0;
      float lodM = 0.0;
      bool inShadow = false;

      for (int j = 0; j < LIGHT; j++) {
        vec3 lp = sp + sunDir * (lt + lSeg * 0.5);
        float lh = length(lp) - Rp;
        if (lh < 0.0) { inShadow = true; break; } // planet blocks the sun
        lodR += exp(-lh / Hr) * lSeg;
        lodM += exp(-lh / Hm) * lSeg;
        lt += lSeg;
      }

      if (!inShadow) {
        vec3 tau = betaR * (odR + lodR) + betaM * 1.1 * (odM + lodM);
        vec3 att = exp(-tau);
        sumR += att * hr;
        sumM += att * hm;
      }
      tCur += segLen;
    }

    vec3 col = uSunIntensity * (sumR * betaR * phaseR + sumM * betaM * phaseM);
    return col + uNightColor;
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    vec3 sky = computeSky(dir, normalize(uSunDir));

    // Exposure tonemap + gamma. (Full ACES + LUT grade comes in PostFX, Milestone 5.)
    vec3 mapped = vec3(1.0) - exp(-sky * uExposure);
    mapped = pow(mapped, vec3(1.0 / 2.2));
    gl_FragColor = vec4(mapped, 1.0);
  }
`;
