"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { useDeviceTier } from "@/lib/use-device-tier";

/**
 * BlackHoleField — full-screen ray-cast black hole.
 *
 * # What changed from the original billboard approach
 *
 * The first version put a single camera-facing quad at the origin and
 * did all the lensing in UV-space (`length(uv)`). That works only from
 * the front: move the camera sideways and you see a flat card rotating.
 * Not first-person. Not the feeling we want.
 *
 * This version draws a full-screen NDC triangle (one fragment per screen
 * pixel). For every pixel the fragment shader:
 *
 *   1. reconstructs the world-space ray direction from `gl_FragCoord`
 *      via `inverse(projection) × inverse(view)`;
 *   2. computes the ray's closest approach to the black hole at origin
 *      (impact parameter `b`);
 *   3. if `b` is below the photon-capture radius → the ray falls into
 *      the horizon, pixel is pure black;
 *   4. otherwise deflects the ray by `α ≈ 2 r_s / b` and rotates the
 *      direction toward the BH — Schwarzschild weak-field approximation;
 *   5. intersects the deflected ray with the equatorial disk plane
 *      `y = 0` and, if the hit is inside `[r_in, r_out]`, samples the
 *      disk with Doppler asymmetry (actual tangent velocity ⋅ view);
 *   6. otherwise samples a procedural starfield in the deflected
 *      direction — that's how the Einstein ring and the secondary
 *      image emerge naturally.
 *
 * The result: walk around the black hole, fly over, under, behind — the
 * lensing is correct from every pose, and the disk keeps its tilt.
 *
 * # Pedagogy (Thorne / EHT spirit, not a data product)
 *
 * Real Event Horizon Telescope images come from radiative transfer on
 * GRMHD — we do not claim that here. The look is tuned to the *same*
 * teaching goals Kip Thorne’s team used for Interstellar: clear
 * shadow, photon ring, Doppler-asymmetric disk, and honest weak-field
 * lensing limits in the fragment shader.
 *
 * # Performance
 *
 * One analytic deflection per pixel. No loops on low tier, one
 * refinement step on medium, two on high. Chromatic dispersion tier-
 * gated. No texture samples. Runs fine on integrated GPUs at 1× DPR.
 */

export interface BlackHoleFieldProps {
  /**
   * Normalized timeline position 0..1 from the cinematic controller.
   * We still accept it so the cinematic mode can time-vary parameters
   * (disk spin phase, subtle colour drift). In first-person mode the
   * caller passes a steady value.
   */
  timelineT?: number;
  /** Schwarzschild radius in scene units — defines the scale. */
  schwarzschildRadius?: number;
  /** Disk inner radius as a multiple of r_s. Physical ISCO is ~3 r_s. */
  diskInnerRs?: number;
  /** Disk outer radius as a multiple of r_s. */
  diskOuterRs?: number;
  /**
   * Scales the per-frame delta fed into the shader's time uniform.
   * 1.0 is cinematic default; a small non-zero value (e.g. 0.08) keeps
   * the scene from strobing for users who prefer reduced motion while
   * letting camera interaction still respond normally.
   */
  timeScale?: number;
}

export function BlackHoleField({
  timelineT = 0,
  schwarzschildRadius = 1.0,
  diskInnerRs = 3.0,
  diskOuterRs = 12.0,
  timeScale = 1.0,
}: BlackHoleFieldProps) {
  const tier = useDeviceTier();
  const { camera, size } = useThree();

  const material = useMemo(() => buildMaterial({ quality: tier }), [tier]);
  const materialRef = useRef<THREE.ShaderMaterial>(material);

  useFrame((_, delta) => {
    const u = material.uniforms as Record<string, THREE.IUniform>;
    u.uTime!.value = (u.uTime!.value as number) + delta * timeScale;
    u.uTimelineT!.value = timelineT;
    (u.uResolution!.value as THREE.Vector2).set(size.width, size.height);

    // Camera world transform — the shader reconstructs rays from this.
    camera.updateMatrixWorld();
    (u.uCameraPos!.value as THREE.Vector3).copy(camera.position);
    // Pre-compute inverse view-projection on CPU; GPU does one mat*vec
    // per pixel instead of inverting every frame.
    (u.uInvProjection!.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.uInvView!.value as THREE.Matrix4).copy(camera.matrixWorld);

    u.uSchwarzschild!.value = schwarzschildRadius;
    u.uDiskInner!.value = schwarzschildRadius * diskInnerRs;
    u.uDiskOuter!.value = schwarzschildRadius * diskOuterRs;
  });

  // One full-screen triangle. We render it behind everything (renderOrder
  // very negative, depth test disabled) so it acts as the universe view.
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
  const lensRefinementSteps = quality === "low" ? 0 : quality === "medium" ? 1 : 2;
  const useChromatic = quality === "low" ? 0 : 1;
  const diskArms = quality === "low" ? 4 : 6;

  return new THREE.ShaderMaterial({
    // Backdrop: we OWN the backdrop, so no transparency, no depth write,
    // and disable depth test so we always draw. Anything else in the
    // scene that happens to share the canvas draws on top normally.
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

      uSchwarzschild: { value: 1.0 },
      uDiskInner: { value: 3.0 },
      uDiskOuter: { value: 12.0 },

      uLensSteps: { value: lensRefinementSteps },
      uUseChromatic: { value: useChromatic },
      uDiskArms: { value: diskArms },
    },

    vertexShader: /* glsl */ `
      varying vec2 vNdc;
      void main() {
        // We pass the raw NDC xy to the fragment shader so it can
        // reconstruct the world-space ray per pixel. Position.z = 0 in
        // clip space puts the full-screen triangle right at the near
        // plane; we rely on depthTest: false to always draw.
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

      uniform float uSchwarzschild;  // r_s
      uniform float uDiskInner;      // r_in in world units
      uniform float uDiskOuter;      // r_out in world units

      uniform int uLensSteps;
      uniform int uUseChromatic;
      uniform int uDiskArms;

      // -------------------- utility noise --------------------
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
        float n101 = hash31(i + vec3(1,0,1));
        float n011 = hash31(i + vec3(0,1,1));
        float n111 = hash31(i + vec3(1,1,1));
        return mix(
          mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
          mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
          u.z
        );
      }

      // -------------------- fractal brownian motion (fBm) --------------------
      // Multi-octave noise for nebula texture. Used for "living" wash
      // so the backdrop doesn't look frozen when the camera is idle.
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

      // Hash-based spatial field of named "feature" galaxies. Returns
      // positive in a handful of sparse directions, zero elsewhere. We
      // look up a stable set of "bright galaxies" that the BH lenses
      // dramatically — the signature movie look.
      // Returns (brightness, bandPhase, colourKey) packed in a vec3.
      vec3 galaxyField(vec3 dir) {
        // Low-resolution cell noise so there are only a dozen candidates
        // across the whole sky. Each candidate rolls a 1-in-3 for being
        // a real galaxy.
        vec3 d = normalize(dir);
        vec3 q = d * 4.2;
        vec3 g = floor(q);
        vec3 f = fract(q) - 0.5;
        float h = hash31(g);
        if (h < 0.65) return vec3(0.0);
        // Position slightly randomized within the cell so features
        // don't sit on a regular grid.
        vec3 center = normalize(g + 0.5 + (vec3(hash31(g + 1.1), hash31(g + 2.2), hash31(g + 3.3)) - 0.5) * 0.7);
        float cosAng = dot(d, center);
        if (cosAng < 0.985) return vec3(0.0);
        // Angular distance from cell center (small-angle approx).
        float ang = acos(clamp(cosAng, -1.0, 1.0));
        // Angular scale per feature: a tight core with spiral bands.
        float coreSize = mix(0.015, 0.045, hash31(g + 5.5));
        float glow = exp(-pow(ang / coreSize, 1.6));
        // Phase for spiral-arm modulation: rotate around the feature
        // center, modulated by a hash-picked pitch angle.
        vec3 tangent = normalize(cross(center, vec3(0.0, 1.0, 0.0)));
        if (length(tangent) < 1e-3) tangent = normalize(cross(center, vec3(1.0, 0.0, 0.0)));
        vec3 bitangent = normalize(cross(center, tangent));
        float rx = dot(d - center * cosAng, tangent);
        float ry = dot(d - center * cosAng, bitangent);
        float phi = atan(ry, rx);
        float bandPhase = phi * (2.0 + 3.0 * hash31(g + 7.7))
                        + log(max(ang, 1e-4)) * (3.0 + 2.0 * hash31(g + 8.8));
        return vec3(glow, bandPhase, hash31(g + 11.1));
      }

      // -------------------- procedural sky in a direction --------------------
      // Returns an additive emission colour for stars + nebular wash +
      // occasional lensed galaxies. This is the SKY the black hole
      // lenses — rich enough to show the Einstein ring and the classic
      // "swirling galaxies around the hole" movie look.
      vec3 sky(vec3 dir) {
        vec3 d = normalize(dir);
        vec3 col = vec3(0.0);

        // ---- star field, 4 octaves ----
        vec3 q = d * 140.0;
        for (int i = 0; i < 4; i++) {
          vec3 p = q + float(i) * 17.31;
          vec3 g = floor(p);
          vec3 f = fract(p) - 0.5;
          float h = hash31(g);
          // Rare bright stars plus a secondary tier of mid-bright stars
          // so the field doesn't look binary (bright / empty).
          float bright = smoothstep(0.9935, 1.0, h);
          float faint = smoothstep(0.982, 0.994, h) * 0.25;
          float d2 = dot(f, f);
          vec3 tint = mix(vec3(0.82, 0.90, 1.0), vec3(1.0, 0.85, 0.66), hash31(g + 11.1));
          col += (bright * exp(-d2 * 180.0) + faint * exp(-d2 * 120.0)) * tint;
          q *= 2.07;
        }

        // ---- broad galactic plane wash ----
        float gp = smoothstep(0.55, 0.0, abs(d.y));
        col += vec3(0.10, 0.14, 0.22) * gp * 0.18;
        // Cross-plane strands of dust
        float strands = noise3(vec3(d.x * 12.0, d.y * 3.5, d.z * 12.0 + uTime * 0.01));
        col += vec3(0.18, 0.14, 0.10) * gp * pow(strands, 3.0) * 0.24;

        // ---- multi-scale nebular mist ----
        float neb1 = fbm3(d * 2.2 + vec3(0.0, 0.0, uTime * 0.008));
        float neb2 = fbm3(d * 4.7 + vec3(uTime * 0.006, 0.0, 0.0));
        col += mix(vec3(0.06, 0.04, 0.14), vec3(0.16, 0.07, 0.04), neb1) * neb1 * 0.18;
        col += vec3(0.10, 0.16, 0.22) * smoothstep(0.55, 0.9, neb2) * 0.20;

        // ---- hero "lensed" galaxies ----
        // A handful of bright feature galaxies give the backdrop the
        // "whole universe is bending around this hole" feel. Each has
        // a hot core, visible spiral bands, and a colour key that
        // decides the palette.
        vec3 gf = galaxyField(d);
        if (gf.x > 0.0001) {
          // Spiral band modulation — sin(bandPhase) gives alternating
          // bright/dark arms; the log-radius term makes them spiral.
          float arms = 0.55 + 0.45 * sin(gf.y);
          vec3 palette = mix(
            vec3(1.0, 0.78, 0.55),   // warm
            vec3(0.70, 0.88, 1.0),   // cool
            gf.z
          );
          vec3 core = palette * gf.x * 2.4;
          vec3 bands = palette * gf.x * arms * 1.2;
          col += core + bands;
        }

        return col * 1.7;
      }

      // -------------------- disk emission (cinematic) --------------------
      // Multi-layer turbulent accretion disk. Layers compose as:
      //   base temperature gradient (cool orange → white-hot inner)
      //   × Keplerian spiral arm pattern (rotation)
      //   × fine turbulence (plasma flickering)
      //   × radial streamers (vortex "inflow" streaks)
      //   × travelling hot spots (bright orbiting knots)
      //   × strong Doppler beaming (one side dramatically brighter).
      vec3 disk(vec3 hit, vec3 rayDir) {
        float r = length(hit.xz);
        if (r < uDiskInner || r > uDiskOuter) return vec3(0.0);

        // ---- Keplerian frame ----
        vec2 radial = normalize(hit.xz);
        vec2 tangent = vec2(-radial.y, radial.x);
        float vOrb = min(0.92, sqrt(uSchwarzschild / max(r, uSchwarzschild * 0.95)));

        // ---- Doppler beaming (stronger) ----
        // Real relativistic beaming scales like D^3..D^4. We push it
        // close to D^4 so one limb is cinema-bright and the other dim.
        float beamDot = dot(normalize(vec3(tangent.x, 0.0, tangent.y)), -rayDir);
        float dopFactor = 1.0 + beamDot * vOrb * 1.75;
        float doppler = pow(max(0.05, dopFactor), 3.85);

        // ---- Radial "vortex" coordinates ----
        float theta = atan(hit.z, hit.x);
        // Angular velocity is faster at the ISCO than at the outer edge,
        // so fix a per-radius spin rate — gas at the inside WHIPS around.
        float spin = uTime * 0.9 * pow(uSchwarzschild / max(r, uSchwarzschild * 0.5), 0.5);

        // ---- Spiral arms ----
        // Log-spiral arms with radial pitch so they wind toward the
        // centre, just like real accretion disks and galaxy photos.
        float pitch = 1.7;
        float spiralPhase = float(uDiskArms) * theta + pitch * log(max(r / uDiskInner, 1.0)) - spin;
        float arms = 0.55 + 0.45 * cos(spiralPhase);

        // ---- Turbulence, two scales ----
        float turbA = noise3(vec3(hit.x * 0.9, hit.z * 0.9, spin * 0.35));
        float turbB = noise3(vec3(hit.x * 3.2, hit.z * 3.2, spin * 0.9));
        float turb = turbA * 0.7 + turbB * 0.3;

        // ---- Radial streamers — the "vortex" visual ----
        // A high-frequency angular hash, modulated by radius, produces
        // short-lived radial streaks that travel with the spin. This is
        // the cue that reads as "gas falling in" rather than "ring".
        float streamerSeed = hash21(vec2(floor(theta * 30.0 + spin * 4.0), floor(r * 1.5)));
        float streamers = smoothstep(0.70, 0.95, streamerSeed);

        // ---- Travelling hot spots ----
        // A handful of bright blobs orbit at keplerian rates. Reads as
        // magnetic reconnection flares, which the real Sgr A* does.
        float hot1 = exp(-pow((theta - spin * 0.8 + 0.0 + 6.28318 * 0.0) * 2.0, 2.0))
                   * smoothstep(uDiskOuter * 0.6, uDiskInner * 1.4, r);
        float hot2 = exp(-pow((theta - spin * 0.8 + 2.1 + 6.28318 * 0.3) * 2.0, 2.0))
                   * smoothstep(uDiskOuter * 0.6, uDiskInner * 1.4, r);
        float hot3 = exp(-pow((theta - spin * 0.8 + 4.3 + 6.28318 * 0.6) * 2.0, 2.0))
                   * smoothstep(uDiskOuter * 0.6, uDiskInner * 1.4, r);
        float hotSpots = hot1 + hot2 * 0.8 + hot3 * 0.6;

        // ISCO “inner edge” — extra emissivity just outside r_in (EHT-
        // style: the ring’s brightness peaks near the last stable orbit).
        float iscoEdge = exp(-pow((r - uDiskInner) / max(uDiskInner * 0.055, 1e-4), 2.0));

        // ---- Compose intensity ----
        float intensity =
          arms * 0.55 + turb * 0.55 + streamers * 0.35 + hotSpots * 0.9 + iscoEdge * 0.55;

        // ---- Temperature-coloured base ----
        float tempT = clamp((r - uDiskInner) / (uDiskOuter - uDiskInner), 0.0, 1.0);
        vec3 hotCol = vec3(1.0, 0.97, 0.88);   // near ISCO — white-hot
        vec3 warmCol = vec3(1.0, 0.55, 0.20);  // mid — orange
        vec3 coolCol = vec3(0.70, 0.24, 0.10); // outer — dim red
        vec3 base = mix(hotCol, mix(warmCol, coolCol, tempT), tempT * 0.85);

        // ---- Edge fades ----
        float innerFade = smoothstep(uDiskInner, uDiskInner * 1.04, r);
        float outerFade = 1.0 - smoothstep(uDiskOuter * 0.9, uDiskOuter, r);

        // Final composition — pushed to ×4.0 so the bright limb blows
        // out into bloom. Hot spots approach 8× local brightness; ACES
        // tone mapping on the canvas compresses the highlights back
        // into the [0,1] range for a cinematic Hollywood finish.
        return base * intensity * doppler * innerFade * outerFade * 4.0;
      }

      // -------------------- Schwarzschild deflection --------------------
      // Given a ray (origin O, direction D, already normalized) and the
      // black-hole centre at origin, compute:
      //  - impact parameter b (closest approach in 3D),
      //  - capture test (b < b_crit ~ 2.6 r_s for Schwarzschild),
      //  - deflected direction D' obtained by rotating D by α=2r_s/b
      //    within the plane spanned by D and the radial-to-BH vector.
      //
      // Returns true and writes to Dout on a miss (light escapes);
      // returns false on capture (light falls into the horizon).
      bool deflectRay(vec3 O, vec3 D, out vec3 Dout, out float impactB) {
        vec3 toBH = -O;
        float dAlong = dot(toBH, D);
        vec3 closest = O + D * dAlong;
        float b = length(closest);

        float bCrit = 2.6 * uSchwarzschild;
        if (b < bCrit) {
          impactB = b;
          Dout = D;
          return false;
        }

        vec3 radial = normalize(-closest);
        // Weak-field deflection 2 r_s / b, but amplified near the photon
        // sphere so rays grazing b ~ 2.7 r_s loop almost all the way
        // around the hole — the Hollywood "stars stretched into arcs"
        // read. Physical weak-field gives alpha = 2 r_s / b, but that
        // looks timid on screen unless the camera is inside a few r_s.
        // We add a radial-squared term that spikes near b_crit.
        float x = uSchwarzschild / b;
        float alpha = min(2.6, 2.0 * x + 6.0 * x * x * x);

        float c = cos(alpha);
        float s = sin(alpha);
        Dout = normalize(D * c + radial * s);
        impactB = b;
        return true;
      }

      // -------------------- ray/disk intersection --------------------
      // Intersects the (deflected) ray with the equatorial plane y=0.
      // If the intersection is ahead of the camera (t > 0) and within
      // [r_in, r_out] we return its world-space position via hit.
      // We also return the plane hit regardless, so the caller can
      // decide how to treat it.
      bool intersectDisk(vec3 O, vec3 D, out vec3 hit) {
        // No hit if D has ~0 y component (ray is parallel to the plane).
        if (abs(D.y) < 1e-4) { hit = vec3(0.0); return false; }
        float t = -O.y / D.y;
        if (t <= 0.0) { hit = vec3(0.0); return false; }
        hit = O + D * t;
        return true;
      }

      // -------------------- main --------------------
      void main() {
        // Reconstruct a world-space ray from NDC.
        //   clipPos ∈ [-1,1]^3 at the near plane
        //   → eye space via invProjection
        //   → world space via invView
        vec4 clipPos = vec4(vNdc, 1.0, 1.0);
        vec4 viewPos = uInvProjection * clipPos;
        viewPos /= viewPos.w;
        vec3 worldRayEnd = (uInvView * vec4(viewPos.xyz, 1.0)).xyz;
        vec3 O = uCameraPos;
        vec3 D = normalize(worldRayEnd - O);

        // Deflect — black hole at origin.
        vec3 D2;
        float impactB;
        bool escaped = deflectRay(O, D, D2, impactB);

        vec3 col = vec3(0.0);

        if (!escaped) {
          // Captured — pure, committed blackness. The dark sphere is
          // the signature of the whole phenomenon; any colour inside
          // the silhouette would wash the contrast. Stars outside can
          // push hard against it.
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }

        vec3 skyCol = sky(D2);

        // Chromatic dispersion — splits R and B channel deflections
        // slightly to create a prismatic fringe around the rim. At the
        // Einstein ring this gives the shimmering colour-split that
        // reads as "extreme gravity" in movies.
        if (uUseChromatic == 1) {
          vec3 rad = normalize(-(O + D * dot(-O, D)));
          float aR =  0.045 * uSchwarzschild / max(impactB, 0.001);
          float aB = -aR;
          vec3 D2r = normalize(D2 * cos(aR) + rad * sin(aR));
          vec3 D2b = normalize(D2 * cos(aB) + rad * sin(aB));
          skyCol.r = sky(D2r).r;
          skyCol.b = sky(D2b).b;
        }

        // ---- Secondary "duplicated image" contribution ----
        // Light that loops the BH once and escapes on the OTHER side
        // creates a second image of the same source. This is the
        // Hollywood "duplicated stars ringing the hole" effect. We
        // approximate it cheaply by sampling the sky along the ray
        // deflected in the OPPOSITE direction (rotating radial away
        // from the BH instead of toward it), weighted by proximity to
        // the photon sphere.
        float bRs = impactB / uSchwarzschild;
        if (bRs < 6.0) {
          vec3 rad = normalize(-(O + D * dot(-O, D)));
          // Larger swing for the second image — nearly a full turn
          // around the hole. Near b_crit this is 2π; it fades out for
          // wider impact parameters.
          float beta = 1.0 / max(bRs - 2.55, 0.05);
          float alpha2 = clamp(2.0 * uSchwarzschild / impactB + beta * 0.55, 0.0, 3.0);
          vec3 Dsecond = normalize(D2 * cos(alpha2) + rad * sin(alpha2));
          float wSecond = smoothstep(5.5, 3.0, bRs);
          skyCol += sky(Dsecond) * wSecond * 0.75;
        }

        vec3 hit;
        vec3 diskCol = vec3(0.0);
        if (intersectDisk(O, D2, hit)) {
          diskCol = disk(hit, D2);
        }
        // Some light paths cross the disk twice after lensing — the
        // Gargantua "top and bottom" look. We probe the pre-deflection
        // ray too and weight it by proximity to the photon sphere.
        if (uLensSteps >= 1) {
          vec3 hit2;
          if (intersectDisk(O, D, hit2)) {
            float w = smoothstep(5.0, 2.6, bRs);
            diskCol += disk(hit2, D) * w * 0.9;
          }
        }

        col = skyCol + diskCol;

        // ---- Photon ring + Einstein halo ----
        // Three stacked gaussians:
        //   ringCore : the hair-thin photon ring, white-hot.
        //   ringWide : a medium-width Einstein ring around it.
        //   halo     : a wide soft glow that bleeds outward — the
        //              part bloom amplifies into a cinematic halo.
        float ringCore = exp(-pow((bRs - 2.62) * 6.0, 2.0));
        float ringWide = exp(-pow((bRs - 2.80) * 1.7, 2.0));
        float halo     = exp(-pow((bRs - 3.30) * 0.55, 2.0));
        float pulse = 0.94 + 0.06 * sin(uTime * 1.7);
        col += vec3(1.00, 0.95, 0.80) * ringCore * 4.1  * pulse;
        col += vec3(1.00, 0.82, 0.48) * ringWide * 1.28 * pulse;
        col += vec3(0.98, 0.70, 0.40) * halo     * 0.58 * pulse;

        // ---- Approach cue: gravitational redshift tint ----
        float camR = length(uCameraPos) / max(uSchwarzschild, 0.001);
        float approach = 1.0 - smoothstep(6.0, 20.0, camR);
        col = mix(col, col * vec3(1.20, 0.78, 0.62), approach * 0.38);

        // ---- Hard vignette right at the silhouette ----
        // Crush anything leaking inside 2.62 r_s — the shadow must
        // read as cleanly dark, with the photon ring drawn right up
        // against it. This is the sharp dark sphere outline.
        float shadowFalloff = smoothstep(2.70, 2.55, bRs);
        col *= 1.0 - shadowFalloff * 0.95;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
