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
        pixelRatio: Math.min(dpr, 1.5),
        shadowMapSize: 1024,
        shadowFrustum: 65,
        particleScale: 1.0,
        waterUpdateInterval: 1,
        maxShadowCastingTrees: 200,
      };
    case 'MEDIUM':
      return {
        tier,
        antialias: false,
        pixelRatio: Math.min(dpr, 1.0),
        shadowMapSize: 512,
        shadowFrustum: 55,
        particleScale: 0.6,
        waterUpdateInterval: 2,
        maxShadowCastingTrees: 80,
      };
    case 'LOW':
    default:
      return {
        tier,
        antialias: false,
        pixelRatio: Math.min(dpr, 0.85),
        shadowMapSize: 256,
        shadowFrustum: 45,
        particleScale: 0.35,
        waterUpdateInterval: 3,
        maxShadowCastingTrees: 30,
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
