/**
 * QualityManager — detects device capability on first load and exposes
 * a single quality tier that the renderer and scene use to scale work.
 *
 * Tier detection heuristics (runs once, synchronous):
 *   HIGH   – discrete GPU or high-end iGPU, ≥8 logical cores, ≥6 GB memory
 *   MEDIUM – mid-range iGPU or moderate hardware
 *   LOW    – integrated graphics, older hardware, mobile
 *
 * Exposed config is read by ThreeScene to size particles, toggle shadows,
 * throttle water updates, etc.
 */

export type QualityTier = 'HIGH' | 'MEDIUM' | 'LOW';

interface QualityConfig {
  tier: QualityTier;
  /** WebGL antialias hint */
  antialias: boolean;
  /** Capped devicePixelRatio */
  pixelRatio: number;
  /** Shadow map resolution (0 = shadows off) */
  shadowMapSize: number;
  /** Shadow frustum half-size — smaller = cheaper */
  shadowFrustum: number;
  /** Scale applied to all particle counts (0–1) */
  particleScale: number;
  /** Water vertex-update frequency: 1 = every frame, 2 = every other frame */
  waterUpdateInterval: number;
  /** Max trees with castShadow */
  maxShadowCastingTrees: number;
}

function detectTier(): QualityTier {
  // Navigator concurrency
  const cores = navigator.hardwareConcurrency ?? 2;

  // Memory (Chrome/Edge only — undefined on Firefox/Safari)
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;

  // Canvas benchmark: attempt to create a webgl2 context with float textures
  let gpuScore = 0;
  try {
    const c = document.createElement('canvas');
    c.width = 1; c.height = 1;
    const gl = c.getContext('webgl2') as WebGL2RenderingContext | null
            || c.getContext('webgl') as WebGLRenderingContext | null;
    if (gl) {
      const ext = (gl as WebGL2RenderingContext).getExtension?.('EXT_texture_filter_anisotropic')
               || (gl as WebGL2RenderingContext).getExtension?.('WEBKIT_EXT_texture_filter_anisotropic');
      if (ext) gpuScore += 1;
      // Check max anisotropy as a proxy for GPU quality
      if (ext) {
        const max = (gl as WebGL2RenderingContext).getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        if (max >= 16) gpuScore += 2;
        else if (max >= 8) gpuScore += 1;
      }
      // WebGL2 = likely better GPU
      if (c.getContext('webgl2')) gpuScore += 1;
    }
  } catch (_) { /* ignore */ }

  if (cores >= 8 && mem >= 6 && gpuScore >= 3) return 'HIGH';
  if (cores >= 4 && mem >= 4 && gpuScore >= 1) return 'MEDIUM';
  return 'LOW';
}

function buildConfig(tier: QualityTier): QualityConfig {
  const dpr = window.devicePixelRatio || 1;

  switch (tier) {
    case 'HIGH':
      return {
        tier,
        antialias: true,
        pixelRatio: Math.min(dpr, 1.25),   // was 1.5 — saves ~36% fill pixels on HiDPI screens
        shadowMapSize: 512,                 // was 1024 — cuts shadow map cost by 4×
        shadowFrustum: 65,
        particleScale: 0.55,               // was 1.0 — 45% fewer particles at HIGH
        waterUpdateInterval: 1,
        maxShadowCastingTrees: 80,         // was 200
      };
    case 'MEDIUM':
      return {
        tier,
        antialias: false,
        pixelRatio: Math.min(dpr, 0.9),    // was 1.0
        shadowMapSize: 256,                // was 512
        shadowFrustum: 55,
        particleScale: 0.35,               // was 0.6
        waterUpdateInterval: 3,            // was 2
        maxShadowCastingTrees: 30,         // was 80
      };
    case 'LOW':
    default:
      return {
        tier,
        antialias: false,
        pixelRatio: Math.min(dpr, 0.75),   // was 0.85 — render at 75% res
        shadowMapSize: 0,                  // shadows OFF on low-end devices
        shadowFrustum: 40,
        particleScale: 0.18,               // was 0.35 — bare minimum particles
        waterUpdateInterval: 4,            // was 3
        maxShadowCastingTrees: 0,
      };
  }
}

class QualityManagerClass {
  public readonly config: QualityConfig;

  constructor() {
    const tier = detectTier();
    this.config = buildConfig(tier);
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[QualityManager] Tier: ${tier} | Cores: ${navigator.hardwareConcurrency} | DPR: ${window.devicePixelRatio}`);
    }
  }

  /** Scaled particle count — pass the full/ideal count */
  public particles(full: number): number {
    return Math.max(8, Math.round(full * this.config.particleScale));
  }
}

export const qualityManager = new QualityManagerClass();
