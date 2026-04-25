"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { useDeviceTier } from "@/lib/use-device-tier";

/**
 * NeutronStarField — full-screen ray-cast neutron star & pulsar.
 *
 * # The physical story we render
 *
 * A neutron star is a ~20 km ball of degenerate nuclear matter left
 * behind by a supernova. Three things make it visually unmistakable
 * and deliberately different from the black hole / wormhole pages:
 *
 *   1. **A hard surface**. Light does not fall in — it reflects and
 *      thermally emits. We ray-hit a sphere at r = r*, shade it as a
 *      blackbody at a few million kelvin (colour pushed to white-blue),
 *      and paint two hot polar caps where magnetic field lines funnel
 *      infalling plasma onto the crust. Latitude bands carry through
 *      the rotation so motion is readable from any angle.
 *
 *   2. **A dipole magnetosphere**. We ray-march a short distance around
 *      the star and accumulate a soft glow whose intensity follows the
 *      dipole field magnitude, `|B| ∝ √(1 + 3cos²θ) / r³`, with θ
 *      measured from the magnetic axis. Closed field lines dominate
 *      inside the light cylinder; outside it, the shader dims the
 *      contribution smoothly because field lines there must open up.
 *
 *   3. **Two relativistic beams**. Plasma accelerated along open field
 *      lines at the magnetic poles radiates in a narrow cone. The
 *      magnetic axis is tilted from the rotation axis (we use ~25°),
 *      so as the star spins the beams sweep through space — the
 *      lighthouse effect that defines a pulsar. We evaluate each beam
 *      analytically per ray (closest approach to the beam axis ×
 *      gaussian × distance falloff).
 *
 * The scene is animated by one thing: the rotation phase. Real pulsars
 * spin in milliseconds; we use a cinematic ~8 s period so the sweep is
 * legible to the human eye. That slowdown is noted on the page copy so
 * the product stays honest.
 *
 * # Why this shader, not a mesh
 *
 * Beams and magnetosphere are volumetric — they don't have surfaces,
 * they have density. A mesh version would be billboarded quads fighting
 * the camera; a ray-march renders correctly from every orbit pose, just
 * like the black-hole disk lens and the wormhole throat.
 *
 * # Performance
 *
 * One surface intersection (analytic). Two beam-axis tests (analytic).
 * A short magnetosphere march: 8 steps low tier, 14 medium, 22 high —
 * only invoked when the ray passes close enough to the star to matter.
 * Sky is the same procedural field used on the black-hole page, so bloom
 * and tone mapping composite identically across the three concepts.
 */

export interface NeutronStarFieldProps {
  timelineT?: number;
  /** Stellar radius in scene units. Sets the scene scale. */
  starRadius?: number;
  /** Magnetic-axis inclination from the rotation axis, in radians. */
  magneticInclination?: number;
  /**
   * Angular rotation rate (rad/s). Cinematic, not physical: a real
   * pulsar would strobe at 60–700 Hz which is illegible; we slow it
   * to a human-watchable cadence.
   */
  rotationRate?: number;
  /** Light-cylinder radius as a multiple of r*. */
  lightCylinderRs?: number;
}

export function NeutronStarField({
  timelineT = 0,
  starRadius = 1.0,
  magneticInclination = 0.44, // ~25°
  rotationRate = 0.78, // ~8 s per rotation
  lightCylinderRs = 15.0,
}: NeutronStarFieldProps) {
  const tier = useDeviceTier();
  const { camera, size } = useThree();

  const material = useMemo(() => buildMaterial({ quality: tier }), [tier]);
  const materialRef = useRef<THREE.ShaderMaterial>(material);

  useFrame((_, delta) => {
    const u = material.uniforms as Record<string, THREE.IUniform>;
    u.uTime!.value = (u.uTime!.value as number) + delta;
    u.uTimelineT!.value = timelineT;
    (u.uResolution!.value as THREE.Vector2).set(size.width, size.height);

    camera.updateMatrixWorld();
    (u.uCameraPos!.value as THREE.Vector3).copy(camera.position);
    (u.uInvProjection!.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.uInvView!.value as THREE.Matrix4).copy(camera.matrixWorld);

    u.uStarR!.value = starRadius;
    u.uMagIncl!.value = magneticInclination;
    u.uRotRate!.value = rotationRate;
    u.uLightCyl!.value = starRadius * lightCylinderRs;
  });

  return (
    <mesh renderOrder={-1000} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3]}
        />
      </bufferGeometry>
      <primitive object={material} attach="material" ref={materialRef} />
    </mesh>
  );
}

interface MaterialOptions {
  quality: "low" | "medium" | "high";
}

function buildMaterial({ quality }: MaterialOptions): THREE.ShaderMaterial {
  const magnetoSteps = quality === "low" ? 8 : quality === "medium" ? 14 : 22;
  const useGravBend = quality === "low" ? 0 : 1;

  return new THREE.ShaderMaterial({
    transparent: false,
    depthTest: false,
    depthWrite: false,
    toneMapped: true,

    uniforms: {
      uTime: { value: 0 },
      uTimelineT: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },

      uCameraPos: { value: new THREE.Vector3() },
      uInvProjection: { value: new THREE.Matrix4() },
      uInvView: { value: new THREE.Matrix4() },

      uStarR: { value: 1.0 },
      uMagIncl: { value: 0.44 },
      uRotRate: { value: 0.78 },
      uLightCyl: { value: 15.0 },

      uMagnetoSteps: { value: magnetoSteps },
      uUseGravBend: { value: useGravBend },
    },

    vertexShader: /* glsl */ `
      varying vec2 vNdc;
      void main() {
        vNdc = position.xy;
        gl_Position = vec4(position.xy, 0.9999, 1.0);
      }
    `,

    fragmentShader: /* glsl */ `
      precision highp float;

      varying vec2 vNdc;

      uniform float uTime;
      uniform float uTimelineT;
      uniform vec2 uResolution;

      uniform vec3 uCameraPos;
      uniform mat4 uInvProjection;
      uniform mat4 uInvView;

      uniform float uStarR;
      uniform float uMagIncl;
      uniform float uRotRate;
      uniform float uLightCyl;

      uniform int uMagnetoSteps;
      uniform int uUseGravBend;

      // =========================================================
      // Utility noise (shared vocabulary with the BH / WH shaders)
      // =========================================================
      float hash21(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }
      float hash31(vec3 p) {
        p = fract(p * vec3(443.8975, 397.2973, 491.1871));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }
      float noise3(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        vec3 u = f * f * (3.0 - 2.0 * f);
        float n000 = hash31(i);
        float n100 = hash31(i + vec3(1,0,0));
        float n010 = hash31(i + vec3(0,1,0));
        float n110 = hash31(i + vec3(1,1,0));
        float n001 = hash31(i + vec3(0,0,1));
        float n101 = hash31(i + vec3(0,0,1) + vec3(1,0,0));
        float n011 = hash31(i + vec3(0,0,1) + vec3(0,1,0));
        float n111 = hash31(i + vec3(1,1,1));
        return mix(
          mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
          mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
          u.z
        );
      }
      float fbm3(vec3 p) {
        float a = 0.5;
        float f = 0.0;
        for (int i = 0; i < 5; i++) {
          f += a * noise3(p);
          p *= 2.03;
          a *= 0.52;
        }
        return f;
      }

      // =========================================================
      // Procedural sky — starfield + faint supernova-remnant wash.
      //
      // Neutron stars are born in supernovae, and most young pulsars
      // still sit inside the glowing wreckage of the star that made
      // them. We paint a very dim, cool-cyan filamented backdrop to
      // carry that context without stealing attention from the hero.
      // =========================================================
      vec3 sky(vec3 dir) {
        vec3 d = normalize(dir);
        vec3 col = vec3(0.0);

        // Dense star field, four octaves, blue-biased palette.
        vec3 q = d * 150.0;
        for (int i = 0; i < 4; i++) {
          vec3 p = q + float(i) * 17.31;
          vec3 g = floor(p);
          vec3 f = fract(p) - 0.5;
          float h = hash31(g);
          float bright = smoothstep(0.9935, 1.0, h);
          float faint = smoothstep(0.982, 0.994, h) * 0.26;
          float d2 = dot(f, f);
          vec3 tint = mix(
            vec3(0.80, 0.92, 1.10),
            vec3(0.95, 0.86, 0.74),
            hash31(g + 11.1)
          );
          col += (bright * exp(-d2 * 180.0) + faint * exp(-d2 * 120.0)) * tint;
          q *= 2.07;
        }

        // Supernova-remnant filaments — bluey-cyan filigree with a
        // touch of warm oxygen tint. Modulated by a bandpass on fBm so
        // it reads as stringy, not as a flat glow.
        float neb = fbm3(d * 2.3 + vec3(0.0, 0.0, uTime * 0.006));
        float filaments = smoothstep(0.48, 0.72, neb) * smoothstep(0.90, 0.62, neb);
        col += vec3(0.08, 0.18, 0.22) * filaments * 0.7;
        float warm = fbm3(d * 3.9 + vec3(uTime * 0.004, 0.0, 0.0));
        col += vec3(0.18, 0.10, 0.05) * smoothstep(0.72, 0.92, warm) * 0.35;

        return col * 1.5;
      }

      // =========================================================
      // Rotation / magnetic geometry
      //
      // Star spins around world-Y. Magnetic axis is tilted from Y by
      // uMagIncl and carried around with the rotation, so the beams
      // sweep through space. Rotation phase is a continuous function
      // of time; callers see smooth motion regardless of frame rate.
      // =========================================================
      vec3 magAxisWorld(float phase, float incl) {
        float c = cos(phase), s = sin(phase);
        float si = sin(incl), ci = cos(incl);
        // Star-frame mag axis = (si, ci, 0). Rotate around Y by phase.
        return vec3(c * si, ci, -s * si);
      }

      // Rotate a world-space point into the star's own frame (used to
      // paint latitude/longitude features on the surface so they
      // travel with rotation).
      vec3 worldToStar(vec3 p, float phase) {
        float c = cos(-phase), s = sin(-phase);
        return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
      }

      // =========================================================
      // Surface shading
      //
      // The neutron star is a hard ball. We shade it as a hot blackbody
      // with:
      //   - a base thermal gradient (white-blue core, subtle limb
      //     darkening toward the edges),
      //   - two hot polar caps where the magnetic axis pierces the
      //     crust — the canonical pulsar "hotspot" (NICER has
      //     resolved these on J0030+0451),
      //   - faint latitude bands anchored in the star frame so
      //     rotation is visible from any orbit pose,
      //   - a very mild rim emission to sell the atmosphere.
      // =========================================================
      vec3 shadeSurface(vec3 hitWorld, vec3 rayDir, vec3 mAxis, float rotPhase) {
        vec3 n = normalize(hitWorld);
        float viewDot = max(0.0, dot(n, -rayDir));

        // Base blackbody — pushed blue because real neutron star
        // thermal emission peaks in the X-ray; in visible light it
        // reads as a fierce, almost UV white-blue.
        vec3 basePhot = vec3(0.82, 0.92, 1.10);
        float limb = pow(viewDot, 0.35);
        vec3 base = basePhot * limb;

        // Two polar caps — where |n · mAxis| ≈ 1. A sharp exponential
        // centred on each pole, pushed to ~6× local luminance. The
        // cap tilted toward the camera blooms; the one tilted away is
        // dimmed by the view-dot naturally.
        float capAlign = abs(dot(n, mAxis));
        float capMask = smoothstep(0.86, 0.995, capAlign);
        vec3 capCol = vec3(1.10, 0.95, 0.78); // hotter, slightly X-ray-peaked
        vec3 caps = capCol * capMask * viewDot * 6.0;

        // Latitude bands & tiny-scale surface roughness, painted in
        // the rotating star frame so they advect with rotation.
        vec3 ps = worldToStar(n, rotPhase);
        float lat = ps.y; // [-1,1]
        float lon = atan(ps.z, ps.x);
        float bands = 0.04 * sin(lat * 14.0)
                    + 0.025 * sin(lat * 33.0 + lon * 4.0);
        float roughness = (fbm3(ps * 6.0) - 0.5) * 0.05;
        base *= 1.0 + bands + roughness;

        // Very subtle atmospheric rim, blue-shifted.
        float rim = pow(1.0 - viewDot, 5.0);
        base += vec3(0.35, 0.55, 0.85) * rim * 0.35;

        return base + caps;
      }

      // =========================================================
      // Ray-sphere intersection — returns nearest positive hit.
      // =========================================================
      bool intersectSphere(vec3 O, vec3 D, float radius, out float tHit) {
        float b = dot(O, D);
        float c = dot(O, O) - radius * radius;
        float disc = b * b - c;
        if (disc < 0.0) return false;
        float s = sqrt(disc);
        float t = -b - s;
        if (t < 0.0) t = -b + s;
        if (t < 0.0) return false;
        tHit = t;
        return true;
      }

      // =========================================================
      // Magnetosphere volumetric accumulation
      //
      // Short ray-march around the star. At each step we evaluate the
      // dipole field strength modulated by an angular factor peaked
      // near the magnetic poles, and accumulate a blue-violet glow
      // that fades inside the light cylinder. Closed-field-line
      // regions dominate the visual; outside the light cylinder the
      // intensity rolls off because field lines would need to open up.
      //
      // This is an illustrative integration, not a physics solver —
      // enough to sell "the space around this object is charged".
      // =========================================================
      vec3 sampleMagnetosphere(vec3 O, vec3 D, vec3 mAxis, float tNearExit) {
        // Find interval around closest approach.
        float tClose = -dot(O, D);
        float rMin = length(O + D * tClose);
        // If the ray misses the star's vicinity by a huge margin, skip.
        float maxReach = uLightCyl * 1.2;
        if (rMin > maxReach) return vec3(0.0);

        float tA = max(0.0, min(tNearExit, tClose - maxReach));
        float tB = min(tNearExit, tClose + maxReach);
        if (tB <= tA) return vec3(0.0);

        float span = tB - tA;
        int steps = uMagnetoSteps;
        float dt = span / float(steps);

        vec3 accum = vec3(0.0);
        float rStar = uStarR;

        // Offset per-ray so the march doesn't show banding.
        float jitter = hash21(gl_FragCoord.xy + uTime * 0.31);
        float t = tA + dt * jitter;

        for (int i = 0; i < 64; i++) {
          if (i >= steps) break;
          vec3 p = O + D * t;
          float r = length(p);
          if (r > rStar * 0.98) {
            // Angular dipole factor |B| ∝ √(1 + 3 cos²θ).
            float cosTheta = dot(p / max(r, 1e-4), mAxis);
            float angular = sqrt(1.0 + 3.0 * cosTheta * cosTheta);

            // 1/r³ falloff with a soft cap so the near-star region
            // doesn't blow out beyond the surface highlights.
            float rInStar = r / rStar;
            float inv = 1.0 / max(rInStar * rInStar * rInStar, 0.25);

            // Light-cylinder falloff — closed field line density
            // drops sharply as we approach the cylinder radius.
            float rCyl = length(p.xz);
            float cylFade = 1.0 - smoothstep(uLightCyl * 0.85, uLightCyl * 1.15, rCyl);

            // A bit of animated turbulence so the plasma "breathes".
            float turb = fbm3(vec3(p * 1.4) + vec3(0.0, uTime * 0.25, 0.0));

            // Violet-blue palette, cooler than the surface,
            // unambiguously different from BH disk orange.
            vec3 magCol = mix(
              vec3(0.24, 0.36, 0.88),
              vec3(0.55, 0.82, 1.10),
              smoothstep(0.6, 1.6, angular)
            );

            float density = angular * inv * cylFade * (0.55 + 0.45 * turb);
            accum += magCol * density;
          }
          t += dt;
        }

        return accum * dt * 0.18;
      }

      // =========================================================
      // Relativistic polar beams
      //
      // Each beam is a half-line from origin along ±mAxis. We compute,
      // for this ray, the closest-approach distance to each half-line
      // and a parameter along the beam axis; combine into a gaussian
      // around the axis plus a longitudinal falloff. Two beams summed.
      //
      // Because the beams point along the magnetic axis (which is
      // tilted from the rotation axis) and rotate with the star, they
      // sweep through space — the lighthouse effect.
      // =========================================================
      vec3 sampleBeams(vec3 O, vec3 D, vec3 mAxis, float tNearExit) {
        // A beam is emitted from the surface outward along ±mAxis,
        // so the "effective origin" is the star centre for our
        // closest-approach analytics.
        vec3 result = vec3(0.0);
        float rStar = uStarR;

        float beamOpen = 0.28;   // lateral half-width in scene units
        float beamReach = rStar * 11.0;

        for (int side = 0; side < 2; side++) {
          vec3 axis = (side == 0 ? mAxis : -mAxis);

          // Sample a small number of points along the ray interval
          // that sits inside the beam's reach. This gives the beam a
          // volumetric feel without a full march.
          // Restrict to t > 0 and well-bounded.
          float tCloseOnRay = -dot(O, D);
          float tA = max(0.0, min(tNearExit, tCloseOnRay - beamReach * 1.2));
          float tB = min(tNearExit, tCloseOnRay + beamReach * 1.2);
          if (tB <= tA) continue;

          float span = tB - tA;
          const int BEAM_STEPS = 10;
          float dt = span / float(BEAM_STEPS);
          float jitter = hash21(gl_FragCoord.xy + float(side) * 13.1);
          float t = tA + dt * jitter;

          float accum = 0.0;
          for (int i = 0; i < BEAM_STEPS; i++) {
            vec3 p = O + D * t;

            // Project p onto axis (only the half starting at origin).
            float along = dot(p, axis);
            if (along > 0.0) {
              // Lateral distance from the beam axis line.
              vec3 lateralVec = p - axis * along;
              float lat = length(lateralVec);

              // Gaussian around the axis, tightening with distance
              // (the cone narrows slightly — real pulsar beams widen
              // with altitude but the visual reads better narrow).
              float sigma = beamOpen * (0.55 + 0.45 * smoothstep(0.0, beamReach, along));
              float gauss = exp(-(lat * lat) / (sigma * sigma));

              // Start right at the surface, fade out toward beamReach.
              float emerge = smoothstep(rStar * 0.95, rStar * 1.1, along);
              float reach = 1.0 - smoothstep(beamReach * 0.4, beamReach, along);

              // Plasma filaments along the field lines — high-freq
              // noise in the beam frame gives a striated, "alive" feel.
              float beamPhase = along * 1.8 - uTime * 3.2;
              float filament = 0.55 + 0.45 * sin(beamPhase + hash31(vec3(lat * 9.0, along, 0.0)) * 6.28318);

              accum += gauss * emerge * reach * filament;
            }
            t += dt;
          }

          // Cool-white beam, pushed bright enough to bloom hard.
          vec3 beamCol = vec3(0.80, 0.94, 1.20);
          result += beamCol * accum * dt * 0.85;
        }

        return result;
      }

      // =========================================================
      // Near-star gravitational deflection
      //
      // Neutron-star surface gravity is strong enough that ~30% of
      // the hemisphere behind the star is visible from the front,
      // and beams are bent noticeably. We apply a light Schwarzschild-
      // style deflection to the ray before all further shading.
      //
      // For r_star = 1 in scene units we use a Schwarzschild radius
      // of ~0.4 — a typical compactness (r_s / r_*) ≈ 0.4 for a
      // 1.4 M☉ neutron star with a 12 km radius.
      // =========================================================
      vec3 deflectRay(vec3 O, vec3 D) {
        if (uUseGravBend == 0) return D;
        float rs = uStarR * 0.40;
        vec3 toStar = -O;
        float dAlong = dot(toStar, D);
        vec3 closest = O + D * dAlong;
        float b = length(closest);
        if (b < uStarR * 1.001) return D; // will hit the surface anyway
        vec3 radial = normalize(-closest);
        float alpha = min(0.9, 2.0 * rs / b);
        return normalize(D * cos(alpha) + radial * sin(alpha));
      }

      // =========================================================
      // main
      // =========================================================
      void main() {
        // Reconstruct world-space ray from NDC.
        vec4 clipPos = vec4(vNdc, 1.0, 1.0);
        vec4 viewPos = uInvProjection * clipPos;
        viewPos /= viewPos.w;
        vec3 worldRayEnd = (uInvView * vec4(viewPos.xyz, 1.0)).xyz;
        vec3 O = uCameraPos;
        vec3 D0 = normalize(worldRayEnd - O);

        float rotPhase = uTime * uRotRate;
        vec3 mAxis = magAxisWorld(rotPhase, uMagIncl);

        // Gravitationally deflect the ray used for sky/beam lookups so
        // the backdrop curves near the surface — cheap but convincing.
        vec3 D = deflectRay(O, D0);

        // Surface hit test. If we hit, we stop the magnetosphere march
        // at the surface so glow doesn't bleed through the body.
        float tHit = 1e9;
        bool hitStar = intersectSphere(O, D0, uStarR, tHit);

        // Background sky — always sampled, even if we hit, because the
        // surface shading is additive with a rim.
        vec3 skyCol = sky(D);

        // Magnetosphere accumulation (clipped to the surface or to a
        // generous far plane).
        float tMagCap = hitStar ? tHit : 1e6;
        vec3 magnet = sampleMagnetosphere(O, D0, mAxis, tMagCap);

        // Polar beams — beams live outside the star, so we clip to
        // either surface-hit or far plane, same as the magnetosphere.
        vec3 beams = sampleBeams(O, D0, mAxis, tMagCap);

        // Surface shading, if applicable.
        vec3 surfCol = vec3(0.0);
        if (hitStar) {
          vec3 hit = O + D0 * tHit;
          surfCol = shadeSurface(hit, D0, mAxis, rotPhase);
        }

        // Compose. Hit: sky is hidden behind the surface (sky is only
        // visible OUTSIDE the silhouette). No-hit: sky + magnetosphere
        // + beams additively blend.
        vec3 col;
        if (hitStar) {
          // Surface replaces the sky, but magnetosphere and beams in
          // front of the surface still contribute (their march stops
          // at tHit, so by construction they sit between camera and
          // surface).
          col = surfCol + magnet + beams;
        } else {
          col = skyCol + magnet + beams;
        }

        // Bright halo right at the silhouette — reads as the thermal
        // edge + magnetospheric plasma piling up along the limb.
        if (hitStar) {
          vec3 limbVec = normalize(O + D0 * tHit);
          float limb = 1.0 - max(0.0, dot(limbVec, -D0));
          col += vec3(0.70, 0.88, 1.10) * pow(limb, 3.0) * 0.45;
        } else {
          // Soft "angular glow" near the star, visible only when the
          // silhouette is small on screen — gives the object weight
          // without forcing surface detail.
          float tClose = max(0.0, -dot(O, D0));
          float rMin = length(O + D0 * tClose);
          float glow = exp(-pow((rMin / uStarR - 1.0) * 3.5, 2.0));
          col += vec3(0.55, 0.80, 1.15) * glow * 0.35;
        }

        // Gentle overall "hot core" pulse — synchronised with the
        // rotation so the lighthouse cadence is felt across the whole
        // frame, not just through the beams themselves.
        float pulse = 0.96 + 0.04 * sin(rotPhase * 2.0);
        col *= pulse;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
