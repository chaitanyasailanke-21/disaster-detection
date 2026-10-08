import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UnifiedSidebar } from './components/UnifiedSidebar';
import { ThreeScene } from './components/ThreeScene';
import { EngineeringView } from './components/EngineeringView';
import { NodeMatrix } from './components/NodeMatrix';
import { PacketInspectorModal } from './components/PacketInspectorModal';
import { NodeDetailModal } from './components/NodeDetailModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { AssumptionsModal } from './components/AssumptionsModal';
import { JudgeDemoOverlay } from './components/JudgeDemoOverlay';
import { WelcomeJudgePopup } from './components/WelcomeJudgePopup';
import { WatchtowerSirenOverlay } from './components/WatchtowerSirenOverlay';
import { CinematicOverlay } from './components/CinematicOverlay';
import { NodeId, LoRaPacket } from './types/simulation';
import { simulationEngine } from './engine/simulationEngine';
import { cinematicDemoManager } from './cinematic/CinematicDemoManager';
import { 
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  Cpu,
  Sliders,
  BellRing
} from 'lucide-react';

export default function App() {
  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null);
  const [selectedPacket, setSelectedPacket] = useState<LoRaPacket | null>(null);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isAssumptionsOpen, setIsAssumptionsOpen] = useState(false);
  const [isEngineeringView, setIsEngineeringView] = useState(false);

  // ── Cinematic / Welcome state ──────────────────────────────────────────────
  // showSIHWelcome: shows the "WELCOME TO SIH" cinematic welcome screen on load.
  // After user closes it (X) → go straight to app.
  // After user clicks START DEMO → run the cinematic sequence.
  const [showSIHWelcome, setShowSIHWelcome] = useState(true);
  // isWelcomeOpen: controls the legacy WelcomeJudgePopup (shown after cinematic ends
  // or if user opens it via header). Starts false since SIH welcome replaces it.
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);

  const handleCloseWelcome = React.useCallback(() => {
    // User pressed X — skip everything and open the app normally
    setShowSIHWelcome(false);
  }, []);

  const handleStartDemo = React.useCallback(() => {
    // User clicked START DEMO — dismiss welcome and launch cinematic
    setShowSIHWelcome(false);
    cinematicDemoManager.start();
  }, []);

  const handleSelectNode = React.useCallback((nodeId: NodeId | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleSelectPacket = React.useCallback((pkt: LoRaPacket | null) => {
    setSelectedPacket(pkt);
  }, []);

  // UNIFIED MISSION CONTROL SIDEBAR: Closed by default initially
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Watch Tower 01 Popup: Closed by default and integrated into collapse bar
  const [isWatchtowerOpen, setIsWatchtowerOpen] = useState(false);
  const [isWatchtowerSirenActive, setIsWatchtowerSirenActive] = useState(simulationEngine.isWatchtowerSirenActive);
  const [isBottomStatusExpanded, setIsBottomStatusExpanded] = useState(false);

  useEffect(() => {
    return simulationEngine.subscribe(() => {
      setIsWatchtowerSirenActive(simulationEngine.isWatchtowerSirenActive);
      // Auto-open watchtower overlay only when NOT in cinematic demo mode
      if (simulationEngine.isWatchtowerSirenActive && !simulationEngine.isCinematicDemoActive) {
        setIsWatchtowerOpen(true);
      }
    });
  }, []);

  const stateColors = {
    NORMAL: 'text-emerald-400',
    WATCH: 'text-sky-400',
    WARNING: 'text-amber-400',
    CRITICAL: 'text-rose-400'
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Sleek Command Center Top Bar: Displays Brand, 90-Sec Demo Button & Single Small Menu Button */}
      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenWelcome={() => setIsWelcomeOpen(true)}
        isWatchtowerOpen={isWatchtowerOpen}
        onToggleWatchtower={() => setIsWatchtowerOpen(!isWatchtowerOpen)}
        isBottomStatusExpanded={isBottomStatusExpanded}
        onToggleBottomStatus={() => setIsBottomStatusExpanded(!isBottomStatusExpanded)}
      />

      {/* 2. Interactive Main Workspace */}
      <div className="relative flex-1 w-full h-[calc(100vh-3rem)] overflow-hidden flex">
        
        {/* Unified Mission Control & Navigation Sidebar (Houses all controls requested by user) */}
        <UnifiedSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isEngineeringView={isEngineeringView}
          onToggleEngineeringView={() => setIsEngineeringView(!isEngineeringView)}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
          onOpenArchitecture={() => setIsArchitectureOpen(true)}
          onOpenAssumptions={() => setIsAssumptionsOpen(true)}
        />

        {/* Center HERO Area: 3D Digital Twin or Engineering View */}
        <main className="relative flex-1 h-full w-full overflow-hidden">
          {isEngineeringView ? (
            <EngineeringView />
          ) : (
            <ThreeScene
              onSelectNode={handleSelectNode}
              onSelectPacket={handleSelectPacket}
              selectedNodeId={selectedNodeId}
              onInspectNodeModal={handleSelectNode}
            />
          )}

          {/* Small Floating Draggable 90-Second Judge Demo Mini-Controller */}
          <JudgeDemoOverlay onOpenEngineeringView={() => setIsEngineeringView(true)} />

          {/* Watch Tower 01: ESP32 Superior Node & Village Emergency Siren / Soundwave Oscilloscope Controller */}
          {!isEngineeringView && isWatchtowerOpen && (
            <WatchtowerSirenOverlay
              onClose={() => setIsWatchtowerOpen(false)}
              onFocusWatchtower={() => {
                setSelectedNodeId('NODE-SUPERIOR');
                simulationEngine.setCameraMode('WATCHTOWER_FOCUS');
              }}
            />
          )}

          {/* Bottom Status Bar: Field Prototype Telemetry Drawer (Hidden until toggled from single small menu button) */}
          {!isEngineeringView && isBottomStatusExpanded && (
            <div className="absolute bottom-0 left-0 right-0 z-30 font-mono text-xs select-none">
              <div className="bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 p-3 max-h-[42vh] overflow-y-auto shadow-2xl animate-fade-in">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-slate-200">
                      Field Prototype Telemetry &amp; Decision Cascade
                    </span>
                  </div>
                  <button
                    onClick={() => setIsBottomStatusExpanded(false)}
                    className="flex items-center gap-1 text-slate-400 hover:text-white bg-slate-900 px-2 py-1 rounded border border-slate-800 cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Close</span>
                  </button>
                </div>

                <NodeMatrix
                  onSelectNode={handleSelectNode}
                  selectedNodeId={selectedNodeId}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. Detail Modals (Open only on user interaction) */}
      <NodeDetailModal
        nodeId={selectedNodeId}
        onClose={() => setSelectedNodeId(null)}
      />

      <PacketInspectorModal
        packet={selectedPacket}
        onClose={() => setSelectedPacket(null)}
      />

      {isArchitectureOpen && (
        <ArchitectureModal 
          onClose={() => setIsArchitectureOpen(false)}
          onFocusNode={(nId) => {
            setSelectedNodeId(nId);
            simulationEngine.setCameraMode('NODE_INSPECTION');
          }}
          onFocusComputer={() => {
            simulationEngine.setCameraMode('COMMAND_CENTER');
          }}
        />
      )}

      {isAssumptionsOpen && (
        <AssumptionsModal onClose={() => setIsAssumptionsOpen(false)} />
      )}

      {/* Welcome Popup (legacy — opened via header "?" button) */}
      {isWelcomeOpen && (
        <WelcomeJudgePopup onDismiss={() => setIsWelcomeOpen(false)} />
      )}

      {/* Cinematic Overlay — WELCOME TO SIH screen + cloud veil + fade + skip HUD */}
      <CinematicOverlay
        showWelcome={showSIHWelcome}
        onCloseWelcome={handleCloseWelcome}
        onStartDemo={handleStartDemo}
      />
    </div>
  );
}
