import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause,
  Radio,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen,
  BellRing
} from 'lucide-react';
import { simulationEngine } from '../engine/simulationEngine';
import { cinematicDemoManager } from '../cinematic/CinematicDemoManager';

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenWelcome?: () => void;
  isWatchtowerOpen?: boolean;
  onToggleWatchtower?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  onOpenWelcome,
  isWatchtowerOpen,
  onToggleWatchtower
}) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    return simulationEngine.subscribe(() => {
      setTick(t => t + 1);
    });
  }, []);

  return (
    <header className="h-13 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-30 shrink-0 font-mono text-xs select-none">
      {/* Brand Identity: Unknown SIX */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleSidebar}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
            isSidebarOpen 
              ? 'bg-sky-600/30 border-sky-500 text-sky-300' 
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-sky-400'
          }`}
          title="Toggle Mission Control & Navigation Sidebar"
        >
          {isSidebarOpen ? <PanelLeftClose className="w-4 h-4 text-sky-400" /> : <PanelLeftOpen className="w-4 h-4 text-sky-400" />}
          <span className="hidden sm:inline">Controls &amp; Views</span>
        </button>

        {onToggleWatchtower && (
          <button
            onClick={onToggleWatchtower}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              isWatchtowerOpen
                ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-rose-400'
            }`}
            title="Toggle Watch Tower 01 ESP32 Superior Node & Siren Overlay"
          >
            <BellRing className={`w-3.5 h-3.5 ${simulationEngine.isWatchtowerSirenActive ? 'text-rose-400 animate-bounce' : 'text-rose-400'}`} />
            <span className="hidden md:inline">Watch Tower 01</span>
            {simulationEngine.isWatchtowerSirenActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping ml-0.5" />
            )}
          </button>
        )}

        <button 
          onClick={onOpenWelcome}
          className="flex items-center gap-2.5 text-left group hover:opacity-90 transition-opacity cursor-pointer bg-transparent border-0 p-0"
          title="View Welcome & Overview"
        >
          <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/40 group-hover:border-sky-400 flex items-center justify-center text-sky-400 shadow-sm transition-colors">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-base tracking-wider text-slate-100 flex items-center gap-1.5 group-hover:text-amber-200 transition-colors">
              Unknown SIX
            </span>
            <span className="text-[10px] text-amber-300 font-semibold tracking-wider uppercase hidden md:inline border-l border-slate-700 pl-2">
              "Evidence Before Escalation"
            </span>
          </div>
        </button>
      </div>

      {/* Hero Action: Run 90-Sec Judge Demo */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (simulationEngine.isCinematicDemoActive || cinematicDemoManager.active) {
              // Stop the cinematic and return to normal app
              cinematicDemoManager.stop();
            } else {
              // Stop any running judge demo first, then start the cinematic
              if (simulationEngine.isDemoRunning) simulationEngine.stopJudgeDemo();
              cinematicDemoManager.start();
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all shadow-md cursor-pointer ${
            simulationEngine.isCinematicDemoActive
              ? 'bg-amber-500/25 border border-amber-500/60 text-amber-300 animate-pulse'
              : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/30'
          }`}
          title="Start cinematic SIH disaster simulation demo"
        >
          {simulationEngine.isCinematicDemoActive ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>STOP DEMO</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RUN 90-SEC JUDGE DEMO</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

