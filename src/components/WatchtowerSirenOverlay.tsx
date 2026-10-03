import React, { useEffect, useRef, useState } from 'react';
import { simulationEngine, WATCHTOWER_POSITION } from '../engine/simulationEngine';
import { soundManager } from '../audio/soundEffects';
import { 
  Volume2, 
  VolumeX, 
  Radio, 
  Bell, 
  BellRing, 
  ShieldAlert, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Sliders, 
  Zap,
  Play,
  Square,
  Sparkles,
  X
} from 'lucide-react';

interface WatchtowerSirenOverlayProps {
  onFocusWatchtower?: () => void;
  onClose?: () => void;
}

export const WatchtowerSirenOverlay: React.FC<WatchtowerSirenOverlayProps> = ({ onFocusWatchtower, onClose }) => {
  const [isSirenActive, setIsSirenActive] = useState<boolean>(simulationEngine.isWatchtowerSirenActive);
  const [sirenMode, setSirenMode] = useState<'SIREN' | 'BUZZER'>(simulationEngine.watchtowerSirenMode);
  const [isMuted, setIsMuted] = useState<boolean>(simulationEngine.isWatchtowerAudioMuted);
  const [volume, setVolume] = useState<number>(soundManager.sirenVolume);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [systemState, setSystemState] = useState(simulationEngine.systemState);
  const [hazardConfidence, setHazardConfidence] = useState(simulationEngine.aggregatedHazardConfidence);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Subscribe to simulationEngine state
  useEffect(() => {
    return simulationEngine.subscribe(() => {
      setIsSirenActive(simulationEngine.isWatchtowerSirenActive);
      setSirenMode(simulationEngine.watchtowerSirenMode);
      setIsMuted(simulationEngine.isWatchtowerAudioMuted);
      setSystemState(simulationEngine.systemState);
      setHazardConfidence(simulationEngine.aggregatedHazardConfidence);

      // Auto-expand overlay when siren triggers during a disaster
      if (simulationEngine.isWatchtowerSirenActive) {
        setIsExpanded(true);
      }
    });
  }, []);

  // Live Oscilloscope Waveform Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      time += 0.04;

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Dark futuristic oscilloscope background
      ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
      ctx.fillRect(0, 0, width, height);

      // Oscilloscope grid lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Horizontal center line
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      // Vertical tick lines
      for (let x = 0; x < width; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();

      // Determine wave parameters
      const active = simulationEngine.isWatchtowerSirenActive;
      const mode = simulationEngine.watchtowerSirenMode;

      // Dynamic frequency modulation
      // In Siren mode: frequency rises and falls between 520Hz and 940Hz (cycle 2.4s)
      const lfo = Math.sin(time * 1.8);
      const currentFreq = mode === 'SIREN' 
        ? Math.round(730 + lfo * 210) 
        : (Math.sin(time * 8) > 0 ? 440 : 220);

      // Base amplitude (higher when active)
      const baseAmp = active ? (height * 0.38) : (height * 0.08);

      // 1. Draw Traveling Acoustic Wavefront Ripple (Fill / Glow)
      ctx.beginPath();
      ctx.strokeStyle = active 
        ? (mode === 'SIREN' ? '#ef4444' : '#f97316') 
        : '#0284c7';
      ctx.lineWidth = active ? 2.5 : 1.5;
      ctx.shadowColor = active ? 'rgba(239, 68, 68, 0.8)' : 'rgba(2, 132, 199, 0.3)';
      ctx.shadowBlur = active ? 12 : 2;

      for (let x = 0; x < width; x++) {
        // Distance decay factor: wave travels left (Tower: 120 dB) to right (Village: 88 dB)
        const distanceFactor = 1.0 - (x / width) * 0.28;
        const wavelength = mode === 'SIREN' ? (32 - lfo * 8) : 24;
        
        let y = centerY;
        if (mode === 'SIREN') {
          // Dual sine modulation with traveling wave term (kx - wt)
          const k = (2 * Math.PI) / wavelength;
          const omega = time * (active ? 7.0 : 2.0);
          const fundamental = Math.sin(k * x - omega);
          const harmonic = 0.32 * Math.sin(2 * (k * x - omega));
          const wail = fundamental + harmonic;
          y = centerY + wail * baseAmp * distanceFactor;
        } else {
          // Buzzer: Pulse train with high harmonic buzz
          const pulse = Math.sin(time * 9) > 0 ? 1 : 0.15;
          const buzz = Math.sin(x * 0.45 - time * 12) > 0 ? 1 : -1;
          const squareTerm = Math.sin(x * 0.15 - time * 8) * buzz * 0.6;
          y = centerY + squareTerm * baseAmp * distanceFactor * (active ? pulse : 0.2);
        }

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 2. Wavefront Peak Pulses / Crest Dots
      if (active) {
        ctx.fillStyle = '#ffffff';
        const numMarkers = 4;
        for (let i = 0; i < numMarkers; i++) {
          const markerProgress = ((time * 0.35 + i / numMarkers) % 1.0);
          const px = markerProgress * width;
          const wavelength = mode === 'SIREN' ? (32 - lfo * 8) : 24;
          const k = (2 * Math.PI) / wavelength;
          const omega = time * 7.0;
          const py = centerY + Math.sin(k * px - omega) * baseAmp * (1.0 - (px / width) * 0.28);

          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Annotations on Canvas: Source & Village decibel indicators
      ctx.font = '10px monospace';
      ctx.fillStyle = active ? '#fca5a5' : '#94a3b8';
      ctx.fillText('WATCH TOWER (120 dB)', 8, 14);

      ctx.fillStyle = active ? '#38bdf8' : '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText('VILLAGE ARRIVAL (88 dB)', width - 8, 14);
      ctx.textAlign = 'left';

      // Current instantaneous frequency readout
      ctx.fillStyle = active ? '#fef08a' : '#94a3b8';
      ctx.fillText(
        `f: ${currentFreq} Hz · λ: ${(343 / currentFreq).toFixed(2)}m · v: 343 m/s`, 
        8, 
        height - 8
      );
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const handleToggleSiren = () => {
    const next = !isSirenActive;
    simulationEngine.triggerWatchtowerAlarm(next, sirenMode);
    setIsSirenActive(next);
  };

  const handleToggleMute = () => {
    simulationEngine.toggleWatchtowerAudioMute();
    setIsMuted(simulationEngine.isWatchtowerAudioMuted);
  };

  const handleModeChange = (newMode: 'SIREN' | 'BUZZER') => {
    setSirenMode(newMode);
    simulationEngine.setWatchtowerSirenMode(newMode);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundManager.setSirenVolume(val);
  };

  return (
    <div className="absolute top-14 right-4 z-30 max-w-sm w-88 font-mono text-xs select-none">
      {/* Container Card with Sleek Neon Border */}
      <div className={`bg-slate-950/95 backdrop-blur-xl rounded-xl border transition-all shadow-2xl overflow-hidden ${
        isSirenActive
          ? 'border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.35)]'
          : 'border-slate-800 shadow-xl'
      }`}>
        {/* Header Bar */}
        <div className={`px-3 py-2 flex items-center justify-between border-b transition-colors ${
          isSirenActive ? 'bg-rose-950/70 border-rose-800/80 text-rose-200' : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center gap-2">
            {isSirenActive ? (
              <BellRing className="w-4 h-4 text-rose-400 animate-bounce shrink-0" />
            ) : (
              <Radio className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            <div>
              <div className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <span>Watch Tower 01</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  ESP32 Superior
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Position: [X: 42.5, Z: 2.5] · Elevation: 14.5m
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse Panel' : 'Expand Panel'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer ml-0.5"
                title="Collapse into Bar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status Callout Strip */}
        <div className={`px-3 py-1.5 text-[10px] flex items-center justify-between border-b ${
          isSirenActive 
            ? 'bg-rose-900/40 border-rose-800/60 text-rose-200' 
            : 'bg-slate-900/60 border-slate-800/60 text-slate-400'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              isSirenActive ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
            }`} />
            <strong className={isSirenActive ? 'text-rose-300' : 'text-emerald-400'}>
              {isSirenActive ? '🚨 120dB SIREN ACTIVE · VILLAGE ALERTED' : 'FUSION ENGINE STANDBY'}
            </strong>
          </div>
          <span className="text-[10px] text-slate-400">
            Confidence: <strong className={isSirenActive ? 'text-rose-300' : 'text-sky-400'}>{(hazardConfidence * 100).toFixed(0)}%</strong>
          </span>
        </div>

        {/* Expandable Body */}
        {isExpanded && (
          <div className="p-3 flex flex-col gap-2.5">
            {/* 1. Oscilloscope Traveling Siren Wave Canvas */}
            <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
              <canvas
                ref={canvasRef}
                width={330}
                height={95}
                className="w-full h-24 block"
              />
              {/* Traveling soundwave label overlay */}
              <div className="absolute bottom-1 right-2 text-[9px] text-slate-400 pointer-events-none flex items-center gap-1">
                <Activity className="w-2.5 h-2.5 text-rose-400 animate-pulse" />
                <span>Travelling Wavefront: 343 m/s</span>
              </div>
            </div>

            {/* 2. Siren Mode Switcher: Air-Raid Siren vs Industrial Red Buzzer */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => handleModeChange('SIREN')}
                className={`py-1 px-2 rounded flex items-center justify-center gap-1.5 transition-colors ${
                  sirenMode === 'SIREN'
                    ? 'bg-rose-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Wailing Pitch-Modulated Air-Raid Disaster Siren (520Hz - 940Hz)"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Wailing Siren</span>
              </button>

              <button
                onClick={() => handleModeChange('BUZZER')}
                className={`py-1 px-2 rounded flex items-center justify-center gap-1.5 transition-colors ${
                  sirenMode === 'BUZZER'
                    ? 'bg-amber-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Industrial High-Decibel Red Emergency Buzzer (Pulsed Horn)"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Red Buzzer</span>
              </button>
            </div>

            {/* 3. Audio Controls & Volume */}
            <div className="flex items-center justify-between gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 text-[11px]">
              <button
                onClick={handleToggleMute}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                  isMuted 
                    ? 'bg-slate-800 text-slate-400 hover:text-white' 
                    : 'bg-emerald-950/80 border border-emerald-700 text-emerald-300 hover:bg-emerald-900'
                }`}
                title={isMuted ? 'Unmute Audio to Hear Siren Voice' : 'Mute Siren Audio'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isMuted ? 'Muted' : 'Audible (Sound ON)'}</span>
              </button>

              <div className="flex items-center gap-1.5 flex-1 max-w-[140px]">
                <span className="text-[10px] text-slate-400">Vol:</span>
                <input
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.02"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  title="Adjust Siren Sound Volume"
                />
              </div>
            </div>

            {/* 4. Action Buttons: Manual Trigger & Camera Focus */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={handleToggleSiren}
                className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${
                  isSirenActive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
                title={isSirenActive ? 'Silence Alarm' : 'Manually Trigger Siren Test'}
              >
                {isSirenActive ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Silence Siren</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current text-rose-400" />
                    <span>Test Siren & Buzzer</span>
                  </>
                )}
              </button>

              {onFocusWatchtower && (
                <button
                  onClick={onFocusWatchtower}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-700/80 text-sky-300 hover:text-white transition-colors flex items-center gap-1"
                  title="Focus Camera on Watch Tower Observation Deck"
                >
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>Lookout</span>
                </button>
              )}
            </div>

            {/* 5. Superior Node Verification Specs Summary */}
            <div className="pt-2 border-t border-slate-900 text-[10px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>Hardware Gateway:</span>
                <strong className="text-slate-200">ESP32-S3 + Dual SX1262 LoRa</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Acoustic Reach:</span>
                <strong className="text-rose-300">120 dB SPL · 3.5 km Horizon</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Village Exposure:</span>
                <strong className="text-emerald-400">340 Homes in Downwind Path</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
