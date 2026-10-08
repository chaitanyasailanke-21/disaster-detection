import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause,
  Radio,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen,
  BellRing,
  Cpu,
  Grid,
  CloudUpload,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { simulationEngine } from '../engine/simulationEngine';
import { cinematicDemoManager } from '../cinematic/CinematicDemoManager';

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenWelcome?: () => void;
  isWatchtowerOpen?: boolean;
  onToggleWatchtower?: () => void;
  isBottomStatusExpanded?: boolean;
  onToggleBottomStatus?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  onOpenWelcome,
  isWatchtowerOpen,
  onToggleWatchtower,
  isBottomStatusExpanded,
  onToggleBottomStatus
}) => {
  const [, setTick] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return simulationEngine.subscribe(() => {
      setTick(t => t + 1);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const stateColors = {
    NORMAL: 'text-emerald-400',
    WATCH: 'text-sky-400',
    WARNING: 'text-amber-400',
    CRITICAL: 'text-rose-400'
  };

  return (
    <header className="h-12 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-40 shrink-0 font-mono text-xs select-none">
      {/* 1. Title / Brand Identity ONLY */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-sm">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-display font-bold text-base tracking-wider text-slate-100">
            Unknown SIX
          </span>
          <span className="text-[10px] text-amber-300 font-semibold tracking-wider uppercase hidden md:inline border-l border-slate-700 pl-2">
            "Evidence Before Escalation"
          </span>
        </div>
      </div>

      {/* 2. 90-Sec Judge Demo Mode Button + Single Small Menu Button for Everything Else */}
      <div className="flex items-center gap-2" ref={menuRef}>
        <button
          onClick={() => {
            if (simulationEngine.isCinematicDemoActive || cinematicDemoManager.active) {
              cinematicDemoManager.stop();
            } else {
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

        {/* Single Small Button Containing All Other Controls & Status */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(prev => !prev)}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
              isMenuOpen || isSidebarOpen || isWatchtowerOpen || isBottomStatusExpanded
                ? 'bg-sky-600/30 border-sky-400 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-sky-400'
            }`}
            title="All Controls, Telemetry & Options"
            aria-label="Open Controls Menu"
          >
            <Sliders className="w-3.5 h-3.5" />
            {simulationEngine.isWatchtowerSirenActive && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>

          {/* Compact All-in-One Dropdown Panel (Hidden until clicked) */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-950/98 backdrop-blur-xl border border-slate-700/90 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-2.5 z-50 flex flex-col gap-1.5 text-xs">
              {/* Live System Status Summary */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 flex flex-col gap-1 mb-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold">SYSTEM STATE</span>
                  <strong className={stateColors[simulationEngine.systemState]}>
                    {simulationEngine.systemState}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold">HAZARD CONFIDENCE</span>
                  <strong className="text-sky-400">
                    {(simulationEngine.aggregatedHazardConfidence * 100).toFixed(0)}%
                  </strong>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold">DEPLOYMENT</span>
                  <strong className="text-slate-200">
                    {simulationEngine.virtualScaleCount === 2
                      ? '2 Prototype Nodes'
                      : `${simulationEngine.virtualScaleCount} Nodes`}
                  </strong>
                </div>
              </div>

              {/* 1. Mission Control & Views Sidebar */}
              <button
                onClick={() => {
                  onToggleSidebar();
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border font-bold transition-colors cursor-pointer ${
                  isSidebarOpen
                    ? 'bg-sky-600/25 border-sky-500 text-sky-300'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5 text-sky-400" /> : <PanelLeftOpen className="w-3.5 h-3.5 text-sky-400" />}
                  <span>Controls &amp; Views Panel</span>
                </span>
                <span className="text-[10px] text-slate-400">{isSidebarOpen ? 'OPEN' : 'CLOSED'}</span>
              </button>

              {/* 2. Watch Tower 01 Siren & Superior Node */}
              {onToggleWatchtower && (
                <button
                  onClick={() => {
                    onToggleWatchtower();
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border font-bold transition-colors cursor-pointer ${
                    isWatchtowerOpen
                      ? 'bg-rose-600/25 border-rose-500 text-rose-300'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <BellRing className="w-3.5 h-3.5 text-rose-400" />
                    <span>Watch Tower 01</span>
                  </span>
                  <span className="text-[10px] text-slate-400">{isWatchtowerOpen ? 'OPEN' : 'VIEW'}</span>
                </button>
              )}

              {/* 3. Post-Hazard Cloud Satellite Upload (Red Plasma Beam) */}
              <button
                onClick={() => {
                  simulationEngine.clearHazard(true);
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border font-bold transition-colors cursor-pointer ${
                  simulationEngine.isCloudUploading
                    ? 'bg-rose-600/30 border-rose-400 text-rose-200'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-rose-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CloudUpload className="w-3.5 h-3.5 text-rose-400" />
                  <span>Cloud Upload (Red Beam)</span>
                </span>
                <span className="text-[10px] text-rose-400 font-extrabold">
                  {simulationEngine.isCloudUploading ? 'UPLOADING' : 'SYNC'}
                </span>
              </button>

              {/* 4. Node Telemetry Drawer Toggle */}
              {onToggleBottomStatus && (
                <button
                  onClick={() => {
                    onToggleBottomStatus();
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border font-bold transition-colors cursor-pointer ${
                    isBottomStatusExpanded
                      ? 'bg-emerald-600/25 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Node Telemetry Matrix</span>
                  </span>
                  <span className="text-[10px] text-slate-400">{isBottomStatusExpanded ? 'HIDE' : 'SHOW'}</span>
                </button>
              )}

              {/* 5. Scale & Coordinate Graph Toggle */}
              <button
                onClick={() => {
                  simulationEngine.setCoordinateGrid(!simulationEngine.isCoordinateGridActive);
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border font-bold transition-colors cursor-pointer ${
                  simulationEngine.isCoordinateGridActive
                    ? 'bg-cyan-600/25 border-cyan-400 text-cyan-300'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Grid className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Scale &amp; Coordinate Graph</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {simulationEngine.isCoordinateGridActive ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* 6. Welcome Overview & Reset Row */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                {onOpenWelcome && (
                  <button
                    onClick={() => {
                      onOpenWelcome();
                      setIsMenuOpen(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Overview</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    simulationEngine.clearHazard(false);
                    simulationEngine.setWeather('CLEAR');
                    setIsMenuOpen(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                  <span>Reset Grid</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

