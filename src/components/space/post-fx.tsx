"use client";

import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useMemo } from "react";
import { Vector2 } from "three";

import { useDeviceTier } from "@/lib/use-device-tier";

/**
 * Cinematic post-processing stack. Tier-gated: low-tier devices skip
 * postprocessing entirely and rely on the upgraded scene alone.
 *
 * Order matters — Bloom first (HDR-ish), then Vignette (frame), then
 * edge-only ChromaticAberration (lens), then fine film grain.
 */
export function PostFX() {
  const tier = useDeviceTier();
  const caOffset = useMemo(() => new Vector2(0.0002, 0.0002), []);

  if (tier === "low") return null;

  const bloomIntensity = tier === "medium" ? 0.55 : 0.75;
  const noiseOpacity = tier === "medium" ? 0.025 : 0.035;

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        luminanceThreshold={0.85}
        luminanceSmoothing={0.22}
        intensity={bloomIntensity}
        mipmapBlur
        radius={0.8}
      />
      <ChromaticAberration
        offset={caOffset}
        radialModulation
        modulationOffset={0.4}
        blendFunction={BlendFunction.NORMAL}
      />
      <Vignette
        offset={0.3}
        darkness={0.85}
        eskil={false}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise opacity={noiseOpacity} blendFunction={BlendFunction.OVERLAY} />
    </EffectComposer>
  );
}
