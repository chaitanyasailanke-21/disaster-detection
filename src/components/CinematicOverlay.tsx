/**
 * CinematicOverlay
 *
 * Renders three layered overlays on top of the 3D scene:
 *
 *  1. Welcome Screen  — "WELCOME TO SIH" title + START DEMO button + X close
 *  2. Cloud Veil      — semi-opaque white fog layer during cloud descent
 *  3. Cinematic Fade  — black overlay for scene-to-scene fade transitions
 *  4. Skip Demo HUD   — small floating button during the active cinematic
 *
 * All opacity values are read from simulationEngine state and updated via
 * the engine's subscribe() observer pattern to avoid unnecessary re-renders.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { simulationEngine, NARRATIVE_FLOW_STEPS } from '../engine/simulationEngine';
import { cinematicDemoManager } from '../cinematic/CinematicDemoManager';

// ─────────────────────────────────────────────────────────────────────────────
// Phase display labels
// ─────────────────────────────────────────────────────────────────────────────
const PHASE_LABELS: Record<string, string> = {
  OVERVIEW:       'ENVIRONMENT OVERVIEW',
  LANDSLIDE:      'LANDSLIDE — HILLSIDE SECTOR',
  FLOOD:          'FLOOD — RIVER CORRIDOR',
  FOREST_FIRE:    'FOREST FIRE — SECTOR ALPHA',
  AIR_POLLUTION:  'AIR POLLUTION — INDUSTRIAL ZONE',
  HEAVY_RAIN:     'HEAVY RAIN — STORM SEQUENCE',
  MULTIHAZARD:    'MULTIHAZARD — ALL SECTORS',
  EVACUATION:     'EVACUATION — MOVING TO SHELTER',
  RETURN_HOME:    'ALL CLEAR — RETURNING HOME',
  FINAL_SHOT:     'RECOVERY — FINAL OVERVIEW',
};

const PHASE_ORDER = [
  'OVERVIEW',
  'LANDSLIDE',
  'FLOOD',
  'FOREST_FIRE',
  'AIR_POLLUTION',
  'HEAVY_RAIN',
  'MULTIHAZARD',
  'EVACUATION',
  'RETURN_HOME',
  'FINAL_SHOT',
];

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface CinematicOverlayProps {
  /** Controls visibility of the Welcome screen (owned by App) */
  showWelcome: boolean;
  onCloseWelcome: () => void;
  onStartDemo: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const CinematicOverlay: React.FC<CinematicOverlayProps> = ({
  showWelcome,
  onCloseWelcome,
  onStartDemo,
}) => {
  // ── Welcome screen entrance animation ──────────────────────────────────────
  const [titleVisible, setTitleVisible] = useState(false);
  const [btnVisible,   setBtnVisible]   = useState(false);

  useEffect(() => {
    if (!showWelcome) {
      setTitleVisible(false);
      setBtnVisible(false);
      return;
    }
    // Stagger fade-ins: title after 400 ms, button after 1.6 s
    const t1 = setTimeout(() => setTitleVisible(true),  400);
    const t2 = setTimeout(() => setBtnVisible(true),   1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [showWelcome]);

  // ── Welcome closing animation ───────────────────────────────────────────────
  const [welcomeFadingOut, setWelcomeFadingOut] = useState(false);

  const handleClose = useCallback(() => {
    setWelcomeFadingOut(true);
    setTimeout(() => {
      setWelcomeFadingOut(false);
      onCloseWelcome();
    }, 600);
  }, [onCloseWelcome]);

  const handleStartDemo = useCallback(() => {
    setWelcomeFadingOut(true);
    setTimeout(() => {
      setWelcomeFadingOut(false);
      onStartDemo();
    }, 600);
  }, [onStartDemo]);

  // ── Cinematic runtime state (read from engine each subscriber tick) ─────────
  const [isActive,       setIsActive]       = useState(simulationEngine.isCinematicDemoActive);
  const [cloudOpacity,   setCloudOpacity]   = useState(simulationEngine.cinematicCloudOpacity);
  const [phase,          setPhase]          = useState<string | null>(simulationEngine.cinematicPhase);
  const [narrativeIdx,   setNarrativeIdx]   = useState<number>(simulationEngine.currentNarrativeStepIndex);
  const [narrativeLabel, setNarrativeLabel] = useState<string>(simulationEngine.currentNarrativeStepLabel);

  useEffect(() => {
    return simulationEngine.subscribe(() => {
      setIsActive(simulationEngine.isCinematicDemoActive);
      setCloudOpacity(simulationEngine.cinematicCloudOpacity);
      setPhase(simulationEngine.cinematicPhase);
      setNarrativeIdx(simulationEngine.currentNarrativeStepIndex);
      setNarrativeLabel(simulationEngine.currentNarrativeStepLabel);
    });
  }, []);

  // ── Skip handler ────────────────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    cinematicDemoManager.stop();
  }, []);

  // ── Phase index for the progress dots ──────────────────────────────────────
  const phaseIndex = phase ? PHASE_ORDER.indexOf(phase) : -1;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── 1. CLOUD VEIL (white fog during cloud descent) ─────────────────── */}
      {cloudOpacity > 0.005 && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 55,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.92) 0%, rgba(220,235,255,0.88) 60%, rgba(180,210,255,0.75) 100%)',
            opacity: cloudOpacity,
            transition: 'opacity 0.1s linear',
          }}
        />
      )}

      {/* Black fade overlay REMOVED — no transitions between scenes */}

      {/* ── 3. WELCOME SCREEN ─────────────────────────────────────────────── */}
      {showWelcome && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to SIH"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(6px)',
            opacity: welcomeFadingOut ? 0 : 1,
            transition: 'opacity 0.6s ease-in-out',
          }}
        >
          {/* Close / X button — top-right */}
          <button
            onClick={handleClose}
            aria-label="Close welcome screen"
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.5rem',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#e2e8f0',
              width: '2.4rem',
              height: '2.4rem',
              borderRadius: '50%',
              fontSize: '1.1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, color 0.2s',
              zIndex: 61,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
              (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
            }}
          >
            ✕
          </button>

          {/* Content card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0',
              textAlign: 'center',
              maxWidth: '640px',
              padding: '0 2rem',
            }}
          >
            {/* Thin accent line */}
            <div style={{
              width: titleVisible ? '6rem' : '0',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
              marginBottom: '2rem',
              transition: 'width 1.2s ease-out',
            }} />

            {/* Badge — SMART INDIA HACKATHON (SIH) */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid rgba(56,189,248,0.45)',
                borderRadius: '9999px',
                padding: '0.35rem 1.1rem',
                marginBottom: '1.4rem',
                opacity: titleVisible ? 1 : 0,
                transition: 'opacity 0.9s ease-out 0.1s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
              </svg>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.18em',
                color: '#38bdf8',
                textTransform: 'uppercase',
                fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
              }}>
                Smart India Hackathon (SIH)
              </span>
            </div>

            {/* Main title — "Welcome to Simulation" */}
            <h1
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.2rem)',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: '#f8fafc',
                fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                opacity: titleVisible ? 1 : 0,
                transform: titleVisible ? 'translateY(0)' : 'translateY(18px)',
                transition: 'opacity 1.1s ease-out, transform 1.1s ease-out',
                lineHeight: 1.15,
                marginBottom: '0.75rem',
                textShadow: '0 0 48px rgba(56,189,248,0.35)',
              }}
            >
              Welcome to Simulation
            </h1>

            {/* Sub-brand line — Unknown SIX · Emergency Grid */}
            <p
              style={{
                fontSize: '0.88rem',
                fontWeight: 500,
                letterSpacing: '0.06em',
                color: '#38bdf8',
                fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                opacity: titleVisible ? 1 : 0,
                transition: 'opacity 1.2s ease-out 0.2s',
                marginBottom: '1.6rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{flexShrink: 0}}>
                <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
              </svg>
              <span>Unknown SIX</span>
              <span style={{ color: '#475569' }}>·</span>
              <span>Emergency Grid</span>
            </p>

            {/* Description paragraph */}
            <p
              style={{
                fontSize: 'clamp(0.82rem, 1.4vw, 0.95rem)',
                fontWeight: 400,
                lineHeight: 1.7,
                color: '#cbd5e1',
                fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                opacity: titleVisible ? 1 : 0,
                transition: 'opacity 1.3s ease-out 0.4s',
                marginBottom: '2.8rem',
                maxWidth: '520px',
                textAlign: 'center',
              }}
            >
              Thank you for reviewing our prototype. Experience cooperative edge
              corroboration across physical ESP32-S3 nodes with real-time smoke &amp; air
              pollution sensing and autonomous LoRa mesh failover.
            </p>

            {/* START DEMO button */}
            <button
              onClick={handleStartDemo}
              aria-label="Start cinematic demo"
              style={{
                position: 'relative',
                padding: '0.9rem 3.2rem',
                fontSize: 'clamp(0.85rem, 1.6vw, 1rem)',
                fontWeight: 600,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                color: '#e0f2fe',
                background: 'linear-gradient(135deg, rgba(14,165,233,0.18) 0%, rgba(56,189,248,0.08) 100%)',
                border: '1px solid rgba(56,189,248,0.45)',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                outline: 'none',
                overflow: 'hidden',
                opacity: btnVisible ? 1 : 0,
                transform: btnVisible ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.97)',
                transition: 'opacity 0.9s ease-out, transform 0.9s ease-out, background 0.25s, border-color 0.25s, box-shadow 0.25s',
                boxShadow: '0 0 28px rgba(56,189,248,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = 'linear-gradient(135deg, rgba(14,165,233,0.30) 0%, rgba(56,189,248,0.18) 100%)';
                b.style.borderColor = 'rgba(56,189,248,0.75)';
                b.style.boxShadow = '0 0 42px rgba(56,189,248,0.28), inset 0 1px 0 rgba(255,255,255,0.08)';
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = 'linear-gradient(135deg, rgba(14,165,233,0.18) 0%, rgba(56,189,248,0.08) 100%)';
                b.style.borderColor = 'rgba(56,189,248,0.45)';
                b.style.boxShadow = '0 0 28px rgba(56,189,248,0.15), inset 0 1px 0 rgba(255,255,255,0.06)';
              }}
            >
              {/* Animated shimmer sweep */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '60%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
                  animation: btnVisible ? 'cinematic-shimmer 2.8s infinite 1.2s' : 'none',
                }}
              />
              ▶ &nbsp; START DEMO
            </button>

            {/* "Or press X to explore freely" hint */}
            <p
              style={{
                marginTop: '1.4rem',
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
                color: '#475569',
                opacity: btnVisible ? 1 : 0,
                transition: 'opacity 0.8s ease-out 0.4s',
              }}
            >
              Press <kbd style={{ 
                padding: '0.1rem 0.35rem', 
                border: '1px solid #334155', 
                borderRadius: '3px',
                background: '#1e293b',
                color: '#94a3b8',
                fontSize: '0.72rem',
              }}>✕</kbd> to close and explore freely
            </p>

            {/* Bottom accent line */}
            <div style={{
              width: titleVisible ? '6rem' : '0',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
              marginTop: '2.5rem',
              transition: 'width 1.2s ease-out 0.3s',
            }} />
          </div>
        </div>
      )}

      {/* ── 4. ACTIVE CINEMATIC HUD — Skip button + Bold Phase Label + Narrative Flow ── */}
      {isActive && !showWelcome && (
        <>
          {/* Phase label & Narrative Flow — bottom center */}
          {phase && phase !== 'FADE_OUT' && PHASE_LABELS[phase] && (
            <div
              aria-live="polite"
              style={{
                position: 'fixed',
                bottom: '2.75rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 56,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.6rem',
                width: 'min(94vw, 860px)',
              }}
            >
              {/* High-visibility Bold Phase Title Card (ENVIRONMENT OVERVIEW, FLOOD, LANDSLIDE, etc.) */}
              <div
                key={phase}
                style={{
                  background: 'rgba(2, 6, 23, 0.92)',
                  border: '2px solid rgba(56, 189, 248, 0.85)',
                  borderRadius: '0.85rem',
                  padding: '0.65rem 1.6rem',
                  boxShadow: '0 0 28px rgba(14, 165, 233, 0.45), 0 8px 24px rgba(0, 0, 0, 0.85)',
                  backdropFilter: 'blur(12px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  animation: 'cinematic-label-in 0.5s ease-out',
                }}
              >
                <span
                  style={{
                    color: '#ffffff',
                    fontSize: 'clamp(1.05rem, 2.2vw, 1.45rem)',
                    fontWeight: 900,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    fontFamily: "'Chakra Petch', 'Plus Jakarta Sans', system-ui, sans-serif",
                    textShadow: '0 0 18px rgba(56, 189, 248, 0.75), 0 2px 6px rgba(0,0,0,0.95)',
                    textAlign: 'center',
                  }}
                >
                  {PHASE_LABELS[phase]}
                </span>

                {/* Active Narrative Step Callout */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      color: '#38bdf8',
                      textTransform: 'uppercase',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    STEP {narrativeIdx + 1}/{NARRATIVE_FLOW_STEPS.length}:
                  </span>
                  <span
                    style={{
                      fontSize: 'clamp(0.88rem, 1.6vw, 1.1rem)',
                      fontWeight: 900,
                      letterSpacing: '0.08em',
                      color: '#fde047',
                      textTransform: 'uppercase',
                      fontFamily: "'JetBrains Mono', monospace",
                      textShadow: '0 0 14px rgba(250, 204, 21, 0.6)',
                    }}
                  >
                    {narrativeLabel}
                  </span>
                </div>
              </div>

              {/* Progress dots */}
              <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', background: 'rgba(2,6,23,0.85)', padding: '0.35rem 0.85rem', borderRadius: '9999px', border: '1px solid rgba(56,189,248,0.35)' }}>
                {PHASE_ORDER.slice(0, -1).map((p, i) => (
                  <div
                    key={p}
                    style={{
                      width:  i === phaseIndex ? '2.0rem' : '0.5rem',
                      height: '0.4rem',
                      borderRadius: '9999px',
                      background: i <= phaseIndex
                        ? '#38bdf8'
                        : 'rgba(148,163,184,0.35)',
                      boxShadow: i === phaseIndex ? '0 0 10px rgba(56,189,248,0.8)' : 'none',
                      transition: 'width 0.4s ease, background 0.4s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Live 17-Step Vertical Narrative Flowchart Card — Left Side */}
          <div
            style={{
              position: 'fixed',
              top: '4.1rem',
              left: '0.85rem',
              zIndex: 56,
              pointerEvents: 'none',
              background: 'rgba(2, 6, 23, 0.90)',
              border: '2px solid rgba(56, 189, 248, 0.65)',
              borderRadius: '0.85rem',
              padding: '0.6rem 0.85rem',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
              maxHeight: 'calc(100vh - 8.5rem)',
              overflowY: 'auto',
              width: 'clamp(220px, 22vw, 290px)',
            }}
          >
            <div
              style={{
                fontSize: '0.76rem',
                fontWeight: 900,
                letterSpacing: '0.12em',
                color: '#38bdf8',
                textTransform: 'uppercase',
                borderBottom: '1px solid rgba(56, 189, 248, 0.35)',
                paddingBottom: '0.35rem',
                marginBottom: '0.4rem',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              DECISION NARRATIVE FLOW
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.08rem' }}>
              {NARRATIVE_FLOW_STEPS.map((stepText, idx) => {
                const isCurrent = idx === narrativeIdx;
                const isDone = idx < narrativeIdx;
                return (
                  <React.Fragment key={stepText}>
                    <div
                      style={{
                        width: '100%',
                        padding: isCurrent ? '0.24rem 0.5rem' : '0.12rem 0.45rem',
                        borderRadius: '0.35rem',
                        background: isCurrent
                          ? 'rgba(14, 165, 233, 0.32)'
                          : isDone
                          ? 'rgba(16, 185, 129, 0.14)'
                          : 'transparent',
                        border: isCurrent
                          ? '1.5px solid #38bdf8'
                          : isDone
                          ? '1px solid rgba(16, 185, 129, 0.35)'
                          : '1px solid transparent',
                        color: isCurrent
                          ? '#fef08a'
                          : isDone
                          ? '#6ee7b7'
                          : '#cbd5e1',
                        fontSize: isCurrent ? '0.76rem' : '0.68rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        textAlign: 'center',
                        fontFamily: "'JetBrains Mono', monospace",
                        boxShadow: isCurrent ? '0 0 12px rgba(56, 189, 248, 0.45)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {stepText}
                    </div>
                    {idx < NARRATIVE_FLOW_STEPS.length - 1 && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          lineHeight: 0.95,
                          color: idx < narrativeIdx ? '#34d399' : '#38bdf8',
                        }}
                      >
                        ↓
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Skip Demo button — top right */}
          <button
            onClick={handleSkip}
            aria-label="Skip cinematic demo"
            style={{
              position: 'fixed',
              top: '4.5rem',
              right: '1.25rem',
              zIndex: 65,
              padding: '0.55rem 1.25rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
              color: '#ffffff',
              background: 'rgba(15,23,42,0.92)',
              border: '2px solid rgba(56,189,248,0.6)',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
              transition: 'background 0.2s, border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = 'rgba(30,41,59,0.98)';
              b.style.borderColor = '#38bdf8';
              b.style.color = '#ffffff';
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = 'rgba(15,23,42,0.92)';
              b.style.borderColor = 'rgba(56,189,248,0.6)';
              b.style.color = '#ffffff';
            }}
          >
            SKIP DEMO  ✕
          </button>
        </>
      )}

      {/* ── Global keyframe styles ─────────────────────────────────────────── */}
      <style>{`
        @keyframes cinematic-shimmer {
          0%   { left: -100%; }
          50%  { left: 140%;  }
          100% { left: 140%;  }
        }
        @keyframes cinematic-label-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </>
  );
};

export default CinematicOverlay;
