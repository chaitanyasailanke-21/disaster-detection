import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sliders, 
  MapPin, 
  Zap, 
  Layers, 
  Laptop, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  RotateCw,
  Grid,
  Radio, 
  Cpu, 
  Globe, 
  WifiOff, 
  Camera, 
  BellRing, 
  Focus, 
  Compass, 
  TrendingUp, 
  Clock, 
  FileText, 
  Network,
  Activity,
  ShieldCheck,
  Flame,
  Droplets,
  Mountain,
  Wind
} from 'lucide-react';
import { simulationEngine } from '../engine/simulationEngine';
import { soundManager } from '../audio/soundEffects';
import { NodeId, CameraMode } from '../types/simulation';
import { ControlPanel } from './ControlPanel';
import { DeploymentPanel } from './DeploymentPanel';
import { ChaosTestPanel } from './ChaosTestPanel';
import { EvidenceLedger } from './EvidenceLedger';
import { EvidenceFusionPanel } from './EvidenceFusionPanel';
import { ConfidenceEvolutionGraph } from './ConfidenceEvolutionGraph';
import { FutureScaleView } from './FutureScaleView';
import { TimelineLog } from './TimelineLog';

interface UnifiedSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isEngineeringView: boolean;
  onToggleEngineeringView: () => void;
  selectedNodeId: NodeId | null;
  onSelectNode: (nodeId: NodeId) => void;
  onOpenArchitecture: () => void;
  onOpenAssumptions: () => void;
}

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
  isOpen,
  onClose,
  isEngineeringView,
  onToggleEngineeringView,
  selectedNodeId,
  onSelectNode,
  onOpenArchitecture,
  onOpenAssumptions
}) => {
  const [, setTick] = useState(0);
  const [isMuted, setIsMuted] = useState(soundManager.isMuted);

  // Main functional tabs in the sidebar
  const [activeTab, setActiveTab] = useState<'SCENARIOS' | 'GRID' | 'CHAOS' | 'LEDGER' | 'FUSION' | 'GRAPH' | 'SCALE' | 'LOG'>('SCENARIOS');

  useEffect(() => {
    return simulationEngine.subscribe(() => {
      setTick(t => t + 1);
    });
  }, []);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
  };

  const stateColors = {
    NORMAL: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
    WATCH: 'bg-sky-500/20 border-sky-500/40 text-sky-400',
    WARNING: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
    CRITICAL: 'bg-rose-500/25 border-rose-500/50 text-rose-400 animate-pulse'
  };

  const stateDot = {
    NORMAL: 'bg-emerald-400',
    WATCH: 'bg-sky-400',
    WARNING: 'bg-amber-400',
    CRITICAL: 'bg-rose-400'
  };

  const currentCamera = simulationEngine.cameraMode;

  const handleCameraChange = (mode: CameraMode) => {
    simulationEngine.setCameraMode(mode);
  };

  const handleDisasterFocus = () => {
    if (simulationEngine.activeHazard?.type === 'FOREST_FIRE') {
      simulationEngine.setCameraMode('FOREST_OVERVIEW');
    } else if (simulationEngine.activeHazard?.type === 'AIR_QUALITY_EVENT') {
      onSelectNode('NODE-4');
      simulationEngine.setCameraMode('NODE_INSPECTION');
    } else if (simulationEngine.activeHazard?.type === 'LANDSLIDE') {
      onSelectNode('NODE-3');
      simulationEngine.setCameraMode('NODE_INSPECTION');
    } else {
      simulationEngine.setCameraMode('FLOOD_OVERVIEW');
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="absolute top-0 bottom-0 left-0 w-88 sm:w-96 z-40 p-3 overflow-y-auto bg-slate-950/95 backdrop-blur-xl border-r border-slate-800 flex flex-col gap-3 font-mono shadow-2xl animate-fade-in select-none">
      
      {/* 1. Sidebar Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
            Mission Control &amp; Navigation
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Collapse Sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. System Status Badges (NORMAL, NODES: 2/2, LoRa: ONLINE, NET) */}
      <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800/80 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
            System Telemetry
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute tactical audio' : 'Mute tactical audio'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
            </button>
            <button
              onClick={() => {
                simulationEngine.stopJudgeDemo();
                simulationEngine.clearHazard();
                simulationEngine.resetSensorsToBaseline();
              }}
              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Reset simulation to baseline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {/* State Indicator */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border font-bold ${stateColors[simulationEngine.systemState]}`}>
            <span className={`w-2 h-2 rounded-full ${stateDot[simulationEngine.systemState]}`} />
            <span>STATE: {simulationEngine.systemState}</span>
          </div>

          {/* Nodes Online */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/70 border border-slate-700/60 rounded-md text-slate-200">
            <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">NODES: <strong className="text-emerald-400">2/2</strong></span>
          </div>

          {/* LoRa Online */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/70 border border-slate-700/60 rounded-md text-slate-200">
            <Radio className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">LoRa: <strong className="text-sky-400">ONLINE</strong></span>
          </div>

          {/* Internet Toggle */}
          <button
            onClick={() => simulationEngine.toggleInternet()}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer text-left ${
              simulationEngine.isInternetOnline
                ? 'bg-slate-800/70 border-slate-700/60 text-slate-200 hover:text-white'
                : 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
            }`}
            title="Toggle internet status"
          >
            {simulationEngine.isInternetOnline ? (
              <>
                <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">NET: <strong className="text-emerald-400">ONLINE</strong></span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">NET: <strong className="text-amber-400">OFFLINE</strong></span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Primary Mode Actions (Engineering View & Evidence & Ledger) */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={onToggleEngineeringView}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-semibold transition-all shadow-sm cursor-pointer ${
            isEngineeringView
              ? 'bg-purple-600 border-purple-400 text-white font-bold'
              : 'bg-slate-900 hover:bg-slate-850 border-slate-700 text-purple-300 hover:text-white'
          }`}
          title="Switch between 3D Digital Twin & Detailed Technical View"
        >
          <Laptop className="w-3.5 h-3.5 text-purple-400" />
          <span>{isEngineeringView ? '3D Digital Twin' : 'Engineering View'}</span>
        </button>

        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-semibold transition-all shadow-sm cursor-pointer ${
            activeTab === 'LEDGER'
              ? 'bg-sky-600 border-sky-400 text-white font-bold'
              : 'bg-slate-900 hover:bg-slate-850 border-slate-700 text-sky-300 hover:text-white'
          }`}
          title="View Evidence Ledger &amp; Cryptographic Trace"
        >
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>Evidence &amp; Ledger</span>
        </button>
      </div>

      {/* 4. Camera Navigation Toolbar (VIEW: Free Explore, Cinematic, Node 1, Node 2, Node 3, Watch Tower, Aerial Grid, Disaster Focus) */}
      <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800/80 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-300 font-bold">
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span>CAMERA &amp; SCENE VIEWS</span>
          </div>
          <span className="text-[10px] text-slate-400">Interactive</span>
        </div>

        {/* Global Camera Modes */}
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <button
            onClick={() => handleCameraChange('FREE_CAMERA')}
            className={`py-1.5 px-2 rounded-md border text-center transition-colors cursor-pointer ${
              currentCamera === 'FREE_CAMERA'
                ? 'bg-sky-600 border-sky-400 text-white font-bold shadow-sm'
                : 'bg-slate-800/70 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-750'
            }`}
            title="Full 360° Free Camera (Mouse Orbit/Pan)"
          >
            Free Explore
          </button>

          <button
            onClick={() => handleCameraChange('CINEMATIC')}
            className={`py-1.5 px-2 rounded-md border text-center transition-colors cursor-pointer ${
              currentCamera === 'CINEMATIC' || currentCamera === 'DISASTER_CINEMATIC'
                ? 'bg-amber-600 border-amber-400 text-white font-bold shadow-sm'
                : 'bg-slate-800/70 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-750'
            }`}
            title="Smooth automatic aerial orbit"
          >
            Cinematic
          </button>
        </div>

        {/* Node Focus Selectors: Flood 1 & 2, Fire 1 & 2, Landslide 1 & 2, Superior */}
        <div className="flex flex-col gap-1 text-[10px]">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => {
                onSelectNode('NODE-FLOOD-1');
                handleCameraChange('NODE_INSPECTION');
              }}
              className={`py-1 px-1 rounded border text-center transition-colors cursor-pointer ${
                selectedNodeId === 'NODE-FLOOD-1' && currentCamera === 'NODE_INSPECTION'
                  ? 'bg-sky-600 border-sky-400 text-white font-bold'
                  : 'bg-slate-800/70 border-slate-700/50 text-sky-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Focus Flood Node 1 (X: 17.6, Z: -53.3, Upstream Mountain Gorge)"
            >
              🌊 Flood Node 1
            </button>

            <button
              onClick={() => {
                onSelectNode('NODE-1');
                handleCameraChange('NODE_INSPECTION');
              }}
              className={`py-1 px-1 rounded border text-center transition-colors cursor-pointer ${
                selectedNodeId === 'NODE-1' && currentCamera === 'NODE_INSPECTION'
                  ? 'bg-sky-600 border-sky-400 text-white font-bold'
                  : 'bg-slate-800/70 border-slate-700/50 text-sky-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Focus Flood Node 2 (X: 42.5, Z: 2.5, Valley Embankment)"
            >
              🌊 Flood Node 2
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => {
                onSelectNode('NODE-2');
                handleCameraChange('NODE_INSPECTION');
              }}
              className={`py-1 px-1 rounded border text-center transition-colors cursor-pointer ${
                selectedNodeId === 'NODE-2' && currentCamera === 'NODE_INSPECTION'
                  ? 'bg-orange-600 border-orange-400 text-white font-bold'
                  : 'bg-slate-800/70 border-slate-700/50 text-orange-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Focus Forest Fire Node 1 (X: -16.0, Z: -12.0, Forest Boundary)"
            >
              🔥 Fire Node 1
            </button>

            <button
              onClick={() => {
                onSelectNode('NODE-FIRE-2');
                handleCameraChange('NODE_INSPECTION');
              }}
              className={`py-1 px-1 rounded border text-center transition-colors cursor-pointer ${
                selectedNodeId === 'NODE-FIRE-2' && currentCamera === 'NODE_INSPECTION'
                  ? 'bg-orange-600 border-orange-400 text-white font-bold'
                  : 'bg-slate-800/70 border-slate-700/50 text-orange-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Focus Forest Fire Node 2 (X: -41.6, Z: -38.8, Deep Timber)"
            >
              🔥 Fire Node 2
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => {
                onSelectNode('NODE-3');
                handleCameraChange('NODE_INSPECTION');
              }}
              className={`py-1 px-1 rounded border text-center transition-colors cursor-pointer ${
                selectedNodeId === 'NODE-3' && currentCamera === 'NODE_INSPECTION'
                  ? 'bg-amber-600 border-amber-400 text-white font-bold'
                  : 'bg-slate-800/70 border-slate-700/50 text-amber-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Focus Landslide Node 1 (X: -35.7, Z: 41.7, Escarpment)"
            >
              ⛰️ Landslide Node 1
            </button>

            <button
              onClick={() => {
                onSelectNode('NODE-LANDSLIDE-2');
                handleCameraChange('NODE_INSPECTION');
              }}
              className={`py-1 px-1 rounded border text-center transition-colors cursor-pointer ${
                selectedNodeId === 'NODE-LANDSLIDE-2' && currentCamera === 'NODE_INSPECTION'
                  ? 'bg-amber-600 border-amber-400 text-white font-bold'
                  : 'bg-slate-800/70 border-slate-700/50 text-amber-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Focus Landslide Node 2 (X: -9.0, Z: 34.7, Lower Slope Runout)"
            >
              ⛰️ Landslide Node 2
            </button>
          </div>

          <button
            onClick={() => {
              onSelectNode('NODE-SUPERIOR');
              handleCameraChange('WATCHTOWER_FOCUS');
            }}
            className={`py-1 px-2 rounded border text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              (selectedNodeId === 'NODE-SUPERIOR' && currentCamera === 'WATCHTOWER_FOCUS') || currentCamera === 'WATCHTOWER_FOCUS'
                ? 'bg-rose-600 border-rose-400 text-white font-bold shadow-sm'
                : 'bg-slate-800/70 border-slate-700/50 text-rose-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Focus Watch Tower 01 (ESP32 Superior Node & Siren Array)"
          >
            <BellRing className="w-3 h-3 text-rose-400 shrink-0" />
            <span className="font-semibold">Watch Tower 01 · Superior Node</span>
          </button>
        </div>

        {/* Aerial Grid & Disaster Focus */}
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <button
            onClick={() => handleCameraChange('DEPLOYMENT_AERIAL')}
            className={`py-1.5 px-2 rounded-md border text-center transition-colors cursor-pointer ${
              currentCamera === 'DEPLOYMENT_AERIAL'
                ? 'bg-purple-600 border-purple-400 text-white font-bold shadow-sm'
                : 'bg-slate-800/70 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-750'
            }`}
            title="High-altitude aerial view of targeted deployment zones"
          >
            Aerial Grid
          </button>

          <button
            onClick={handleDisasterFocus}
            className="py-1.5 px-2 rounded-md border border-rose-900/60 bg-rose-950/40 text-rose-300 hover:text-white hover:bg-rose-900/60 transition-colors text-center font-semibold cursor-pointer"
            title="Focus camera on active disaster zone"
          >
            Disaster Focus
          </button>
        </div>

        {/* Visitor View Navigation Controls (Hold Right Click / Hold Scroll Wheel) */}
        <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 flex flex-col gap-2 text-[11px]">
          <div className="flex items-center justify-between text-slate-300 font-bold text-[10px] uppercase">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              Visitor View Navigation
            </span>
            <span className="text-amber-400/90 text-[9px] font-mono">360° MOUSE</span>
          </div>

          <div className="space-y-1.5 text-[10px] text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800/70">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[9px] shrink-0">
                Hold Right Click
              </span>
              <span>Rotate &amp; orbit view 360°</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold text-[9px] shrink-0">
                Hold Scroll Wheel
              </span>
              <span>Move &amp; pan the view</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[9px] shrink-0">
                Both Buttons / Shift
              </span>
              <span className="font-semibold text-emerald-300">Rotate &amp; Move Simultaneously</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold text-[9px] shrink-0">
                Scroll Wheel
              </span>
              <span>Zoom in &amp; out</span>
            </div>
          </div>

          {/* Quick Manual View Control Triggers */}
          <div className="grid grid-cols-4 gap-1 pt-0.5 text-[10px]">
            <button
              onClick={() => simulationEngine.nudgeCamera('ROTATE_LEFT')}
              className="py-1 px-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 flex items-center justify-center gap-0.5 cursor-pointer transition-colors"
              title="Rotate view left"
            >
              <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
              <span>Rot L</span>
            </button>
            <button
              onClick={() => simulationEngine.nudgeCamera('RESET')}
              className="py-1 px-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 flex items-center justify-center gap-0.5 cursor-pointer transition-colors"
              title="Reset view to default angle"
            >
              <span>Reset</span>
            </button>
            <button
              onClick={() => simulationEngine.nudgeCamera('ROTATE_RIGHT')}
              className="py-1 px-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60 flex items-center justify-center gap-0.5 cursor-pointer transition-colors"
              title="Rotate view right"
            >
              <RotateCw className="w-2.5 h-2.5 text-amber-400" />
              <span>Rot R</span>
            </button>
            <button
              onClick={() => simulationEngine.toggleSimultaneousRotateMove()}
              className={`py-1 px-1 rounded border flex items-center justify-center gap-0.5 cursor-pointer transition-colors font-bold ${
                simulationEngine.isSimultaneousRotateMove
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-xs'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-emerald-300 border-slate-700/60'
              }`}
              title="Toggle automatic simultaneous rotate and move on drag"
            >
              <span>Dual: {simulationEngine.isSimultaneousRotateMove ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Scale Graph & Simulated Graph Quick Controls */}
        <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 flex flex-col gap-1.5 text-[11px]">
          <div className="flex items-center justify-between text-slate-300 font-bold text-[10px] uppercase">
            <span className="flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5 text-cyan-400" />
              Scale Graph &amp; Simulated Graph
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                simulationEngine.setCoordinateGrid(!simulationEngine.isCoordinateGridActive);
              }}
              className={`py-1.5 px-2 rounded-md border text-center transition-colors cursor-pointer text-[10px] font-semibold flex items-center justify-center gap-1 ${
                simulationEngine.isCoordinateGridActive
                  ? 'bg-cyan-600 border-cyan-400 text-white font-bold shadow-xs'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-750'
              }`}
              title="Toggle 1 Unit = 1 Metre Coordinate Scale Grid"
            >
              <Grid className="w-3 h-3 text-cyan-300" />
              <span>Scale Graph: {simulationEngine.isCoordinateGridActive ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setActiveTab('GRAPH')}
              className={`py-1.5 px-2 rounded-md border text-center transition-colors cursor-pointer text-[10px] font-semibold flex items-center justify-center gap-1 ${
                activeTab === 'GRAPH'
                  ? 'bg-sky-600 border-sky-400 text-white font-bold shadow-xs'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-750'
              }`}
              title="View Simulated Confidence Evolution Graph"
            >
              <TrendingUp className="w-3 h-3 text-sky-300" />
              <span>Simulated Graph</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Mission Workspace Navigation Tabs */}
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-4 bg-slate-900 p-1 rounded-lg border border-slate-800 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('SCENARIOS')}
            className={`py-1.5 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'SCENARIOS'
                ? 'bg-sky-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Disaster Simulation Scenarios"
          >
            <Sliders className="w-3 h-3" />
            <span>Scenarios</span>
          </button>

          <button
            onClick={() => setActiveTab('GRID')}
            className={`py-1.5 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'GRID'
                ? 'bg-purple-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Cost-Efficient Risk-Adaptive Deployment"
          >
            <MapPin className="w-3 h-3" />
            <span>Grid Plan</span>
          </button>

          <button
            onClick={() => setActiveTab('CHAOS')}
            className={`py-1.5 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'CHAOS'
                ? 'bg-amber-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Chaos Testing Suite"
          >
            <Zap className="w-3 h-3" />
            <span>Failures</span>
          </button>

          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`py-1.5 rounded flex items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'LEDGER' || activeTab === 'FUSION' || activeTab === 'GRAPH' || activeTab === 'SCALE' || activeTab === 'LOG'
                ? 'bg-teal-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Evidence & Analytics"
          >
            <Layers className="w-3 h-3" />
            <span>Analytics</span>
          </button>
        </div>

        {/* Sub-tabs for Analytics when open */}
        {(activeTab === 'LEDGER' || activeTab === 'FUSION' || activeTab === 'GRAPH' || activeTab === 'SCALE' || activeTab === 'LOG') && (
          <div className="grid grid-cols-5 bg-slate-900/80 p-0.5 rounded border border-slate-800 text-[10px]">
            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`py-1 rounded text-center transition-colors cursor-pointer ${
                activeTab === 'LEDGER' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ledger
            </button>
            <button
              onClick={() => setActiveTab('FUSION')}
              className={`py-1 rounded text-center transition-colors cursor-pointer ${
                activeTab === 'FUSION' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Fusion
            </button>
            <button
              onClick={() => setActiveTab('GRAPH')}
              className={`py-1 rounded text-center transition-colors cursor-pointer ${
                activeTab === 'GRAPH' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Graph
            </button>
            <button
              onClick={() => setActiveTab('SCALE')}
              className={`py-1 rounded text-center transition-colors cursor-pointer ${
                activeTab === 'SCALE' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Scale
            </button>
            <button
              onClick={() => setActiveTab('LOG')}
              className={`py-1 rounded text-center transition-colors cursor-pointer ${
                activeTab === 'LOG' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Log
            </button>
          </div>
        )}
      </div>

      {/* 6. Active Tab Panel Body */}
      <div className="flex-1">
        {activeTab === 'SCENARIOS' && <ControlPanel />}
        {activeTab === 'GRID' && <DeploymentPanel />}
        {activeTab === 'CHAOS' && <ChaosTestPanel />}
        {activeTab === 'LEDGER' && <EvidenceLedger />}
        {activeTab === 'FUSION' && <EvidenceFusionPanel />}
        {activeTab === 'GRAPH' && <ConfidenceEvolutionGraph />}
        {activeTab === 'SCALE' && <FutureScaleView />}
        {activeTab === 'LOG' && <TimelineLog />}
      </div>

      {/* 7. Bottom Footnote & Modals */}
      <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-[10px]">
        <button
          onClick={onOpenArchitecture}
          className="flex-1 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-sky-400 border border-slate-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          <Network className="w-3 h-3 text-sky-400" />
          <span>Architecture</span>
        </button>

        <button
          onClick={onOpenAssumptions}
          className="flex-1 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-sky-400 border border-slate-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          <FileText className="w-3 h-3 text-slate-400" />
          <span>Assumptions</span>
        </button>
      </div>
    </aside>
  );
};
