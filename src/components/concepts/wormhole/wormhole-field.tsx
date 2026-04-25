"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { useDeviceTier } from "@/lib/use-device-tier";

/**
 * WormholeField — full-screen ray-cast wormhole.
 *
 * # How it works
 *
 * The throat is a real 3D sphere at the origin with radius `b0`. For
 * every pixel the fragment shader:
 *
 *   1. reconstructs the world-space ray from NDC via the camera's
 *      inverse projection/view matrices;
 *   2. tests ray vs. throat sphere. If the ray HITS the sphere and the
 *      camera is in front of it, the ray "enters" and we sample the
 *      FAR sky in the direction from the entry point through the
 *      throat — a second universe opens up;
 *   3. if the ray MISSES the sphere, we apply an Ellis-metric radial
 *      remap around the closest-approach axis and sample the NEAR sky
 *      — lensing around the rim;
 *   4. right at the rim we add an Einstein-ring highlight with
 *      chromatic dispersion for mid/high-tier devices.
 *
 * Unlike the original billboard, the throat is now genuinely spherical
 * — you can walk around it, fly over it, approach from below, enter it
 * — the shape stays a sphere and the far sky stays visible through the
 * same geometry.
 *
 * # Inside the throat
 *
 * When the camera is physically inside the throat sphere, the shader
 * treats every direction as a far-sky direction blended back toward
 * the rim — the classic "I'm in the tunnel" view. The tunnel walls are
 * the rim-lensed near-sky rolling past.
 *
 * # Scientific notes
 *
 * The Ellis metric (drainhole) is the simplest traversable wormhole
 * that Kip Thorne's team used as the starting point for Interstellar's
 * wormhole math. A proper integration of a null geodesic in that
 * metric is expensive; we approximate with a smooth radial remap that
 * matches the qualitative shape (sphere, rim, two skies). None of the
 * film's shots are used; the maths is public, the rendering is ours.
 */

export interface WormholeFieldProps {
  timelineT?: number;
  /** Throat radius in scene units. */
  throatRadius?: number;
}

export function WormholeField({
  timelineT = 0,
  throatRadius = 2.0,
}: WormholeFieldProps) {
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

    u.uThroatR!.value = throatRadius;
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
  const useChromatic = quality === "low" ? 0 : 1;
  const rimDetail = quality === "low" ? 0 : 1;

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

      uThroatR: { value: 2.0 },

      uUseChromatic: { value: useChromatic },
      uRimDetail: { value: rimDetail },
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

      uniform float uThroatR;

      uniform int uUseChromatic;
      uniform int uRimDetail;

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
        float n101 = hash31(i + vec3(1,0,1));
        float n011 = hash31(i + vec3(0,1,1));
        float n111 = hash31(i + vec3(1,1,1));
        return mix(
          mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
          mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
          u.z
        );
      }

      // Multi-octave fractal noise for rich nebular washes.
      float fbm3(vec3 p) {
        float a = 0.5; float f = 0.0;
        for (int i = 0; i < 5; i++) { f += a * noise3(p); p *= 2.03; a *= 0.52; }
        return f;
      }

      // Near sky — our own side. Cool palette, dense stars, hint of
      // a galactic plane so the rim clearly refracts a familiar sky.
      vec3 nearSky(vec3 dir) {
        vec3 d = normalize(dir);
        vec3 col = vec3(0.0);
        vec3 q = d * 140.0;
        for (int i = 0; i < 4; i++) {
          vec3 p = q + float(i) * 17.31;
          vec3 g = floor(p);
          vec3 f = fract(p) - 0.5;
          float h = hash31(g);
          float bright = smoothstep(0.9935, 1.0, h);
          float faint = smoothstep(0.982, 0.994, h) * 0.25;
          float d2 = dot(f, f);
          vec3 tint = mix(vec3(0.80, 0.90, 1.0), vec3(0.95, 0.95, 1.0), hash31(g + 11.1));
          col += (bright * exp(-d2 * 180.0) + faint * exp(-d2 * 120.0)) * tint;
          q *= 2.07;
        }
        float gp = smoothstep(0.55, 0.0, abs(d.y));
        col += vec3(0.10, 0.14, 0.22) * gp * 0.18;
        // Cool nebular dust so "home" reads as lived-in, not void.
        float dust = fbm3(d * 2.4 + vec3(0.0, 0.0, uTime * 0.006));
        col += vec3(0.06, 0.09, 0.14) * dust * 0.22;
        return col * 1.7;
      }

      // Far sky — the "other side". The portal reveals a clearly
      // ALIEN region of space: a visible warm spiral galaxy anchored
      // along a hero axis, with dense nebular bands and a bright core.
      // This is the cinematic payoff of looking through the throat —
      // the viewer can plainly see it is NOT the same sky we're in.
      vec3 farSky(vec3 dir) {
        vec3 d = normalize(dir);
        vec3 col = vec3(0.0);

        // --- hot star layer (denser than nearSky, slightly warmer) ---
        vec3 q = d * 115.0 + 19.3;
        for (int i = 0; i < 4; i++) {
          vec3 p = q + float(i) * 9.77;
          vec3 g = floor(p);
          vec3 f = fract(p) - 0.5;
          float h = hash31(g);
          float bright = smoothstep(0.9905, 1.0, h);
          float faint = smoothstep(0.980, 0.992, h) * 0.3;
          float d2 = dot(f, f);
          vec3 tint = mix(vec3(1.0, 0.82, 0.55), vec3(0.98, 0.55, 0.78), hash31(g + 7.7));
          col += (bright * exp(-d2 * 180.0) + faint * exp(-d2 * 130.0)) * tint;
          q *= 2.07;
        }

        // --- hero spiral galaxy ---
        // Anchored to a hero axis. We build two in-plane basis vectors
        // so we can compute a proper polar angle phi and a log-radial
        // coordinate — that gives a true spiral structure, not fog.
        vec3 heroAxis = normalize(vec3(0.35, 0.1, -0.93));
        vec3 t1 = normalize(abs(heroAxis.y) < 0.9
                            ? cross(heroAxis, vec3(0.0, 1.0, 0.0))
                            : cross(heroAxis, vec3(1.0, 0.0, 0.0)));
        vec3 t2 = normalize(cross(heroAxis, t1));
        float along = dot(d, heroAxis);
        vec3 inPlane = d - heroAxis * along;
        float rPlane = length(inPlane);
        float phi = atan(dot(inPlane, t2), dot(inPlane, t1));

        // Spiral mask: log-spiral arm pattern fades radially, brightest
        // near the galactic centre (rPlane -> 0, along -> 1).
        float armArg = 2.0 * phi + 5.5 * log(max(rPlane + 0.02, 0.02));
        float arms = 0.55 + 0.45 * cos(armArg);
        float radialFalloff = smoothstep(0.6, 0.0, rPlane) * smoothstep(0.2, 0.95, along);
        float diskShade = pow(arms, 2.2) * radialFalloff;

        // Warm inner core + cooler outer arms.
        vec3 coreCol = vec3(1.00, 0.85, 0.55);
        vec3 armCol  = vec3(1.00, 0.55, 0.70);
        col += coreCol * diskShade * 1.9;
        col += armCol  * diskShade * smoothstep(0.2, 0.55, rPlane) * 0.8;

        // Bright pinpoint galactic nucleus.
        float nucleus = exp(-pow((1.0 - along) * 32.0, 2.0));
        col += vec3(1.0, 0.86, 0.58) * nucleus * 2.8;

        // Faint nebular dust around the galaxy.
        float neb = fbm3(d * 2.0 + vec3(uTime * 0.008, 0.0, 0.0));
        col += vec3(0.40, 0.15, 0.24) * neb * radialFalloff * 0.35;

        // Background warm ambient so the far sky isn't stark black.
        float ambient = fbm3(d * 0.85 + vec3(7.7, 0.0, uTime * 0.004));
        col += vec3(0.30, 0.14, 0.20) * ambient * 0.22;

        return col * 1.8;
      }

      // Ray / origin-centred sphere intersection. Returns the near
      // intersection distance in tHit; returns false if miss or behind.
      bool raySphere(vec3 O, vec3 D, float R, out float tHit) {
        float b = dot(O, D);
        float c = dot(O, O) - R * R;
        float disc = b * b - c;
        if (disc < 0.0) return false;
        float s = sqrt(disc);
        float t0 = -b - s;
        float t1 = -b + s;
        // If both behind, miss.
        if (t1 < 0.0) return false;
        tHit = t0 > 0.0 ? t0 : t1;
        return true;
      }

      // Smooth Ellis-style radial remap for a ray that MISSES the
      // throat. Computes the ray's closest approach distance b to the
      // origin, and if b is close to throatR, pulls the outgoing
      // direction toward the radial axis so stars funnel toward the
      // rim. Physically motivated by the real Ellis metric's shape
      // function; mathematically the simplest remap that is smooth,
      // reversible at b = throatR, and vanishes far away.
      vec3 ellisDeflect(vec3 O, vec3 D) {
        float dAlong = dot(-O, D);
        vec3 closest = O + D * dAlong;
        float b = length(closest);
        if (b > uThroatR * 3.0) return D;
        vec3 radial = normalize(-closest);
        // Stronger bend near the rim so stars visibly curl inward
        // toward the opening, then taper smoothly to zero by 3×r_throat.
        // Power curve makes the effect gentle far, dramatic close.
        float t = smoothstep(uThroatR * 3.0, uThroatR, b);
        float scale = uThroatR / max(b, uThroatR * 0.55);
        float alpha = t * t * (0.35 + 1.10 * scale);
        return normalize(D * cos(alpha) + radial * sin(alpha));
      }

      void main() {
        // Reconstruct world ray.
        vec4 clipPos = vec4(vNdc, 1.0, 1.0);
        vec4 viewPos = uInvProjection * clipPos;
        viewPos /= viewPos.w;
        vec3 worldRayEnd = (uInvView * vec4(viewPos.xyz, 1.0)).xyz;
        vec3 O = uCameraPos;
        vec3 D = normalize(worldRayEnd - O);

        bool insideThroat = length(O) < uThroatR;

        vec3 col = vec3(0.0);
        float ringMask = 0.0;

        if (insideThroat) {
          // Inside: we've "entered" the tunnel. Every direction sees
          // the far sky, but blended toward near at the rim so the
          // walls of the tunnel read as the rolling outside.
          float tExit;
          if (raySphere(O, D, uThroatR, tExit)) {
            vec3 exitPt = O + D * tExit;
            vec3 farDir = normalize(exitPt);
            vec3 nearDir = -farDir;
            float toRim = 1.0 - clamp(length(O) / uThroatR, 0.0, 1.0);
            float blend = smoothstep(0.0, 0.6, toRim);
            col = mix(nearSky(nearDir), farSky(farDir), blend);

            // --- SWIRLING TUNNEL STREAKS ---
            // Build a pair of axes in the plane perpendicular to the
            // exit direction, then take an angular coordinate in that
            // plane. Streaks rotate with uTime and travel radially
            // outward from the tunnel centre — the classic movie
            // "vortex of light" read.
            vec3 axis = farDir;
            vec3 t1 = normalize(abs(axis.y) < 0.9 ? cross(axis, vec3(0.0, 1.0, 0.0))
                                                 : cross(axis, vec3(1.0, 0.0, 0.0)));
            vec3 t2 = normalize(cross(axis, t1));
            float rad = length(O - axis * dot(O, axis));
            float phi = atan(dot(O - axis * dot(O, axis), t2),
                             dot(O - axis * dot(O, axis), t1));
            float swirl = 0.55 + 0.45 * sin(12.0 * phi + uTime * 3.0 - rad * 4.0);
            float streaks = smoothstep(0.55, 0.92, swirl);
            col += vec3(1.0, 0.85, 0.60) * streaks * (1.0 - blend) * 0.9;

            ringMask = smoothstep(0.85, 1.0, length(O) / uThroatR);
          } else {
            col = farSky(D);
          }
        } else {
          // Outside: ray may hit the throat or miss it.
          float tHit;
          if (raySphere(O, D, uThroatR, tHit)) {
            // HIT → looking THROUGH the throat at the far sky.
            vec3 entry = O + D * tHit;
            vec3 farDir = normalize(D);
            col = farSky(farDir);

            // --- Inner-window vignette + swirling "spacetime grain" ---
            // Darken toward the rim a touch so the window has depth,
            // then add an angular swirl modulated by the radial
            // coordinate on the visible disc — reads as curved space.
            vec3 toEntry = normalize(entry);
            float rimT = clamp(dot(toEntry, -D), -1.0, 1.0);
            float centerT = smoothstep(0.3, 0.9, rimT);
            col *= mix(0.70, 1.05, centerT);

            // Angular swirl on the window surface: pick axes in the
            // plane perpendicular to the camera→throat line.
            vec3 axis = normalize(-O);
            vec3 t1 = normalize(abs(axis.y) < 0.9 ? cross(axis, vec3(0.0, 1.0, 0.0))
                                                 : cross(axis, vec3(1.0, 0.0, 0.0)));
            vec3 t2 = normalize(cross(axis, t1));
            vec3 rel = entry - axis * dot(entry, axis);
            float phi = atan(dot(rel, t2), dot(rel, t1));
            float rad = length(rel) / uThroatR;
            float swirl = 0.5 + 0.5 * sin(10.0 * phi + uTime * 1.6 - rad * 6.0);
            col += vec3(0.9, 0.75, 0.55) * pow(swirl, 3.0) * (1.0 - centerT) * 0.45;

            // Einstein ring.
            vec3 closest = O + D * dot(-O, D);
            float b = length(closest);
            ringMask = exp(-pow((b - uThroatR) * 7.5, 2.0));
          } else {
            // MISS → near sky, lensed around the rim.
            vec3 D2 = ellisDeflect(O, D);
            col = nearSky(D2);

            if (uUseChromatic == 1) {
              // Chromatic split: sample R/B with slightly larger/smaller
              // throat radius (fakes wavelength-dependent deflection).
              vec3 closest = O + D * dot(-O, D);
              float b = length(closest);
              if (b < uThroatR * 2.0) {
                float bias = 0.02;
                vec3 Dr = ellisDeflect(O, normalize(D + vec3(bias) * 0.0));
                // Simpler: shift deflection strength per channel via
                // tweaked impact params.
                float aR = 0.02 * uThroatR / max(b, 0.001);
                vec3 radial = normalize(-closest);
                vec3 Dplus = normalize(D2 * cos(aR) + radial * sin(aR));
                vec3 Dminus = normalize(D2 * cos(-aR) + radial * sin(-aR));
                col.r = nearSky(Dplus).r;
                col.b = nearSky(Dminus).b;
              }
            }

            // Einstein ring at the rim of the throat.
            vec3 closest = O + D * dot(-O, D);
            float b = length(closest);
            ringMask = exp(-pow((b - uThroatR) * 7.5, 2.0));
          }
        }

        // Add the ring highlight — pulsing, with a wider soft halo.
        float pulse = 0.88 + 0.12 * sin(uTime * 1.4);
        col += vec3(1.0, 0.94, 0.82) * ringMask * 1.8 * pulse;
        // Soft outer halo so the rim reads as a radiant band, not a line.
        vec3 closestAll = O + D * dot(-O, D);
        float bAll = length(closestAll);
        float halo = exp(-pow((bAll - uThroatR) * 1.6, 2.0));
        col += vec3(0.90, 0.70, 0.45) * halo * 0.30 * pulse;

        // Rim flecks — high-frequency detail so the ring doesn't look
        // synthetic at close range. Disabled on low-tier.
        if (uRimDetail == 1) {
          vec3 closest = O + D * dot(-O, D);
          float theta = atan(closest.y, closest.x);
          float flecks = noise3(vec3(theta * 12.0 + uTime * 0.4, length(closest) * 30.0, uTime * 0.1));
          col += vec3(1.0, 0.9, 0.72) * ringMask * smoothstep(0.55, 0.9, flecks) * 0.4;
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
