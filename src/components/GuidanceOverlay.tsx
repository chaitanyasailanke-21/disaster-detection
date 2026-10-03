import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowRight, Play, X, Sparkles } from 'lucide-react';

interface GuidanceOverlayProps {
  onStartDemo: () => void;
  onSkip: () => void;
}

export const GuidanceOverlay: React.FC<GuidanceOverlayProps> = ({ onStartDemo, onSkip }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Read from localStorage to only show once
  useEffect(() => {
    const hasSeen = localStorage.getItem('unknown_six_guidance_dismissed');
    if (hasSeen === 'true') {
      setIsVisible(false);
    }
  }, []);

  const handleSkip = () => {
    localStorage.setItem('unknown_six_guidance_dismissed', 'true');
    setIsVisible(false);
    onSkip();
  };

  const handleStart = () => {
    localStorage.setItem('unknown_six_guidance_dismissed', 'true');
    setIsVisible(false);
    onStartDemo();
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px] pointer-events-auto transition-opacity duration-500 animate-fade-in select-none"
      role="dialog"
      aria-label="Guided Demo Navigation Guidance"
    >
      {/* Visual Guidance Pointer anchored directly below the header's RUN 90-SEC JUDGE DEMO button */}
      <div className="absolute top-16 right-4 sm:right-6 flex flex-col items-end z-50">
        
        {/* Gently Animating Guidance Arrow */}
        <div className="flex items-center gap-2 mb-2 pr-6 animate-bounce">
          <span className="text-xs font-mono font-bold tracking-wider text-amber-300 bg-slate-900/90 px-2.5 py-1 rounded-full border border-amber-400/60 shadow-lg">
            CLICK HERE
          </span>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.6)] flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-amber-300 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Guidance Card with Plain-English Instruction and Buttons */}
        <div className="relative max-w-sm w-full bg-white/95 backdrop-blur-xl border-2 border-amber-400 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.25)] text-slate-800">
          
          {/* Subtle top indicator notch */}
          <div className="absolute -top-2 right-10 w-4 h-4 bg-white border-t-2 border-l-2 border-amber-400 rotate-45" />

          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs uppercase tracking-wider text-amber-900 font-mono">
                Judge Demonstration
              </span>
            </div>

            {/* Small SKIP Button */}
            <button
              onClick={handleSkip}
              className="text-[11px] font-mono font-semibold text-slate-500 hover:text-slate-900 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              title="Skip guided tour"
            >
              SKIP
            </button>
          </div>

          {/* Prompts requested: "Start here for the guided demonstration." */}
          <p className="text-sm font-semibold text-slate-900 leading-snug mb-3">
            Start here for the guided demonstration.
          </p>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Experience dual-node evidence corroboration, live telemetry fluctuation, ESP32 LoRa fusion, and community evacuation into the safe orange shed.
          </p>

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <button
              onClick={handleStart}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-md hover:shadow-sky-500/25 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RUN 90-SEC JUDGE DEMO</span>
            </button>

            <button
              onClick={handleSkip}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-mono text-xs font-semibold transition-colors cursor-pointer"
            >
              SKIP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
