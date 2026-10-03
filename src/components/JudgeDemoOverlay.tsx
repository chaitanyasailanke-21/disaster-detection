import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowRight, 
  Radio, 
  Compass, 
  Cpu, 
  ShieldAlert, 
  BellRing, 
  Waves, 
  Flame, 
  Mountain, 
  Factory, 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  Volume2, 
  Layers, 
  ChevronRight,
  TrendingUp,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { simulationEngine } from '../engine/simulationEngine';
import { soundManager } from '../audio/soundEffects';
import { HazardType } from '../types/simulation';

interface JudgeDemoOverlayProps {
  onOpenEngineeringView?: () => void;
  onToggleFreeExploration?: () => void;
}

export type GuidedStage = 
  | 'WELCOME'
  | 'SELECT_DISASTER'
  | 'DRONE_AND_PRONE_NODES'
  | 'LORA_TRANSMISSION'
  | 'WATCHTOWER_FUSION'
  | 'SIREN_TOP_SHOT'
  | 'EVACUATION_DRONE'
  | 'COMPLETE';

interface DisasterConfig {
  type: HazardType;
  title: string;
  badge: string;
  icon: typeof Waves;
  color: string;
  accentBg: string;
  nodeA: {
    id: string;
    name: string;
    role: string;
    normalReading: string;
    fluctuatedReading: string;
    sensorLabel: string;
    unit: string;
    baselineVal: number;
    peakVal: number;
  };
  nodeB: {
    id: string;
    name: string;
    role: string;
    normalReading: string;
    fluctuatedReading: string;
    sensorLabel: string;
    unit: string;
    baselineVal: number;
    peakVal: number;
  };
  disasterDescription: string;
  cameraOverview: 'FLOOD_OVERVIEW' | 'FOREST_OVERVIEW' | 'HILLSIDE_OVERVIEW' | 'FACTORY_OVERVIEW';
}

const DISASTER_CONFIGS: Record<string, DisasterConfig> = {
  FLOOD: {
    type: 'FLOOD',
    title: 'River Flooding',
    badge: 'Corridor & Basin Inundation',
    icon: Waves,
    color: 'text-sky-400 border-sky-400 bg-sky-950/60',
    accentBg: 'from-sky-900/80 to-blue-950/90',
    nodeA: {
      id: 'NODE-1',
      name: 'Node 1 (Floodplain West Bank)',
      role: 'Corridor Water Level & Rainfall',
      normalReading: '1.25 m (Normal Depth)',
      fluctuatedReading: '4.85 m (CRITICAL SURGE)',
      sensorLabel: 'HC-SR04 Ultrasonic Level',
      unit: 'm',
      baselineVal: 1.25,
      peakVal: 4.85
    },
    nodeB: {
      id: 'NODE-1B',
      name: 'Node 1B (Basin Lowland Gauge)',
      role: 'Downstream Inflow & Catchment Rain',
      normalReading: '0.85 m (Normal Depth)',
      fluctuatedReading: '3.92 m (CORROBORATING SURGE)',
      sensorLabel: 'Basin Ultrasonic + Rain',
      unit: 'm',
      baselineVal: 0.85,
      peakVal: 3.92
    },
    disasterDescription: 'Rapid mountain catchment runoff induces severe flash inundation along the residential river crossing.',
    cameraOverview: 'FLOOD_OVERVIEW'
  },
  LANDSLIDE: {
    type: 'LANDSLIDE',
    title: 'Landslide & Slope Collapse',
    badge: 'Escarpment Boulder & Mudslip',
    icon: Mountain,
    color: 'text-amber-400 border-amber-400 bg-amber-950/60',
    accentBg: 'from-amber-900/80 to-stone-950/90',
    nodeA: {
      id: 'NODE-3',
      name: 'Node 3 (Escarpment Slope Station)',
      role: 'Seismic Geophone & Soil Saturation',
      normalReading: '0.02 g (Stable Ground)',
      fluctuatedReading: '1.48 g (SEVERE TREMOR)',
      sensorLabel: 'Seismic Geophone Vibration',
      unit: 'g',
      baselineVal: 0.02,
      peakVal: 1.48
    },
    nodeB: {
      id: 'NODE-3B',
      name: 'Node 3B (Mountain Ridge Crest)',
      role: 'Inclinometer Tilt & Saturation Probe',
      normalReading: '0.3° (Stable Incline)',
      fluctuatedReading: '14.8° (ACTIVE GROUND SLIP)',
      sensorLabel: 'MPU6050 Slope Tilt Probe',
      unit: '°',
      baselineVal: 0.3,
      peakVal: 14.8
    },
    disasterDescription: 'Deep bedrock shear stress causes escarpment rockfalls and descending boulders above the village.',
    cameraOverview: 'HILLSIDE_OVERVIEW'
  },
  FOREST_FIRE: {
    type: 'FOREST_FIRE',
    title: 'Forest Fire',
    badge: 'Timberland Wildfire Outbreak',
    icon: Flame,
    color: 'text-rose-400 border-rose-400 bg-rose-950/60',
    accentBg: 'from-rose-900/80 to-red-950/90',
    nodeA: {
      id: 'NODE-2',
      name: 'Node 2 (Forest Boundary Station)',
      role: 'MQ-2 Gas/Smoke & BME688 Ambient',
      normalReading: '16 ppm (Clean Forest Air)',
      fluctuatedReading: '295 ppm (DENSE SMOKE)',
      sensorLabel: 'MQ-2 Combustion Gas / Smoke',
      unit: 'ppm',
      baselineVal: 16,
      peakVal: 295
    },
    nodeB: {
      id: 'NODE-2B',
      name: 'Node 2B (Timberland Canopy Station)',
      role: 'Optical IR Flame & Thermal Temp',
      normalReading: '0 State (No Flame Detected)',
      fluctuatedReading: '1.0 State (ACTIVE FLAME 74°C)',
      sensorLabel: 'Optical IR Flame Sensor',
      unit: 'state',
      baselineVal: 0,
      peakVal: 1
    },
    disasterDescription: 'Dry pine underbrush ignites in heavy timberland; thermal convection and combustion plumes advance rapidly.',
    cameraOverview: 'FOREST_OVERVIEW'
  },
  AIR_QUALITY_EVENT: {
    type: 'AIR_QUALITY_EVENT',
    title: 'Air Pollution & Toxic Gas',
    badge: 'Industrial Plume & Toxic Emissions',
    icon: Factory,
    color: 'text-emerald-400 border-emerald-400 bg-emerald-950/60',
    accentBg: 'from-emerald-900/80 to-slate-950/90',
    nodeA: {
      id: 'NODE-4A',
      name: 'Node 4A (Factory Perimeter Fence)',
      role: 'SPS30 Laser PM2.5 & Multi-Gas',
      normalReading: '14 µg/m³ (Clean Ambient Air)',
      fluctuatedReading: '195 µg/m³ (HAZARDOUS PM2.5)',
      sensorLabel: 'SPS30 Optical Particle Matter',
      unit: 'µg/m³',
      baselineVal: 14,
      peakVal: 195
    },
    nodeB: {
      id: 'NODE-4B',
      name: 'Node 4B (Village Inflow Air Station)',
      role: 'Downwind Toxic Gas & VOC Plume',
      normalReading: '30 AQI (Good Air Quality)',
      fluctuatedReading: '245 AQI (SEVERE TOXIC INFLOW)',
      sensorLabel: 'MQ-135 Industrial Gas AQI',
      unit: 'AQI',
      baselineVal: 30,
      peakVal: 245
    },
    disasterDescription: 'Industrial chemical vent failure releases concentrated particulate and gaseous plumes toward residential corridors.',
    cameraOverview: 'FACTORY_OVERVIEW'
  }
};

export const JudgeDemoOverlay: React.FC<JudgeDemoOverlayProps> = ({
  onOpenEngineeringView,
  onToggleFreeExploration
}) => {
  const [currentStage, setCurrentStage] = useState<GuidedStage>('WELCOME');
  const [selectedDisasterKey, setSelectedDisasterKey] = useState<string>('FLOOD');
  const [stageSecondsRemaining, setStageSecondsRemaining] = useState<number>(5);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [disasterTriggeredInScene, setDisasterTriggeredInScene] = useState<boolean>(false);
  const [fusionConfidencePct, setFusionConfidencePct] = useState<number>(25);

  const stageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stepStartTimestampRef = useRef<number>(Date.now());

  const currentConfig = DISASTER_CONFIGS[selectedDisasterKey] || DISASTER_CONFIGS.FLOOD;

  // Handle stage transitions
  const advanceToStage = (next: GuidedStage) => {
    setCurrentStage(next);
    setStageSecondsRemaining(5);
    stepStartTimestampRef.current = Date.now();

    // Trigger stage-specific actions
    switch (next) {
      case 'WELCOME':
        simulationEngine.clearHazard();
        simulationEngine.systemState = 'NORMAL';
        setDisasterTriggeredInScene(false);
        break;

      case 'SELECT_DISASTER':
        simulationEngine.clearHazard();
        simulationEngine.systemState = 'NORMAL';
        setDisasterTriggeredInScene(false);
        break;

      case 'DRONE_AND_PRONE_NODES': {
        simulationEngine.clearHazard();
        simulationEngine.systemState = 'NORMAL';
        setDisasterTriggeredInScene(false);
        soundManager.playWatchPing();

        // WITHIN 2 SECONDS: The disaster occurs!
        setTimeout(() => {
          setDisasterTriggeredInScene(true);
          simulationEngine.triggerHazard(currentConfig.type, 'HIGH');
          soundManager.playCriticalSiren();
        }, 2000);
        break;
      }

      case 'LORA_TRANSMISSION': {
        setDisasterTriggeredInScene(true);
        soundManager.playRadioChirp();

        // Dispatch animated LoRa packets from BOTH prone nodes to Superior Node at Watch Tower
        simulationEngine.dispatchLoRaPacket(
          currentConfig.nodeA.id,
          'NODE-SUPERIOR',
          'EVENT_ALERT',
          { [currentConfig.nodeA.sensorLabel]: currentConfig.nodeA.peakVal }
        );

        setTimeout(() => {
          simulationEngine.dispatchLoRaPacket(
            currentConfig.nodeB.id,
            'NODE-SUPERIOR',
            'VERIFY_RESPONSE',
            { [currentConfig.nodeB.sensorLabel]: currentConfig.nodeB.peakVal }
          );
        }, 800);
        break;
      }

      case 'WATCHTOWER_FUSION': {
        simulationEngine.systemState = 'WARNING';
        soundManager.playRadioChirp();

        // Animated ML fusion confidence climb: 35% -> 99.4%
        setFusionConfidencePct(38);
        const t1 = setTimeout(() => setFusionConfidencePct(68), 1000);
        const t2 = setTimeout(() => setFusionConfidencePct(88), 2200);
        const t3 = setTimeout(() => {
          setFusionConfidencePct(99);
          simulationEngine.aggregatedHazardConfidence = 0.99;
          soundManager.playPacketAck();
        }, 3600);

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
        };
      }

      case 'SIREN_TOP_SHOT': {
        // Above 95% confidence: Activate the buzzer!
        simulationEngine.systemState = 'CRITICAL';
        simulationEngine.aggregatedHazardConfidence = 0.99;
        simulationEngine.triggerWatchtowerAlarm(true, 'BUZZER');
        soundManager.playCriticalSiren();
        break;
      }

      case 'EVACUATION_DRONE': {
        // People running into the Safe Orange Shed
        break;
      }

      case 'COMPLETE':
        break;
    }
  };

  // Main 5-second countdown timer per pop-up
  useEffect(() => {
    if (!simulationEngine.isDemoRunning) return;
    if (isPaused) return;

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (stageTimerRef.current) clearTimeout(stageTimerRef.current);

    setStageSecondsRemaining(5);

    countdownIntervalRef.current = setInterval(() => {
      setStageSecondsRemaining(prev => {
        if (prev <= 1) {
          return 1;
        }
        return prev - 1;
      });
    }, 1000);

    stageTimerRef.current = setTimeout(() => {
      handleNextStage();
    }, 5000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    };
  }, [currentStage, isPaused, selectedDisasterKey]);

  // Advance to next stage sequence
  const handleNextStage = () => {
    soundManager.playPacketAck();
    switch (currentStage) {
      case 'WELCOME':
        advanceToStage('SELECT_DISASTER');
        break;
      case 'SELECT_DISASTER':
        advanceToStage('DRONE_AND_PRONE_NODES');
        break;
      case 'DRONE_AND_PRONE_NODES':
        advanceToStage('LORA_TRANSMISSION');
        break;
      case 'LORA_TRANSMISSION':
        advanceToStage('WATCHTOWER_FUSION');
        break;
      case 'WATCHTOWER_FUSION':
        advanceToStage('SIREN_TOP_SHOT');
        break;
      case 'SIREN_TOP_SHOT':
        advanceToStage('EVACUATION_DRONE');
        break;
      case 'EVACUATION_DRONE':
        advanceToStage('COMPLETE');
        break;
      case 'COMPLETE':
        advanceToStage('SELECT_DISASTER');
        break;
    }
  };

  const handleSelectDisaster = (key: string) => {
    soundManager.playPacketAck();
    setSelectedDisasterKey(key);
    advanceToStage('DRONE_AND_PRONE_NODES');
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleRestart = () => {
    advanceToStage('WELCOME');
  };

  const handleExitDemo = () => {
    simulationEngine.stopJudgeDemo();
    simulationEngine.clearHazard();
  };

  if (!simulationEngine.isDemoRunning) return null;

  return (
    <>
      {/* 1. TOP STATUS BAR: Sleek, daylight clean, unobtrusive */}
      <div className="absolute top-3 left-3 right-3 z-30 pointer-events-none flex items-center justify-between">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md rounded-xl px-3 py-1.5 flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-sky-700 font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-sky-600" />
            <span className="font-display tracking-wider text-xs">UNKNOWN SIX</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-mono text-[10px]">
              GUIDED JUDGE DEMO
            </span>
            <span className="text-slate-500 font-mono text-[10px]">
              {selectedDisasterKey ? currentConfig.title : 'Overview'}
            </span>
          </div>
        </div>

        {/* Top-Right Quick Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {onToggleFreeExploration && (
            <button
              onClick={() => {
                handleExitDemo();
                if (onToggleFreeExploration) onToggleFreeExploration();
              }}
              className="bg-white/95 hover:bg-slate-50 border border-slate-200 shadow-md text-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Exit Guided Demo to Free 3D Orbit Camera"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-600" />
              <span>Exit Demo</span>
            </button>
          )}

          <button
            onClick={handleTogglePause}
            className="bg-white/95 hover:bg-slate-50 border border-slate-200 shadow-md text-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title={isPaused ? "Resume Auto Advance" : "Pause Timer"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5 text-amber-600" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      </div>

      {/* 2. LEFT SIDE CORNER POP-UP: LIVE TELEMETRY FLUCTUATION (Requested by user) */}
      {(currentStage === 'DRONE_AND_PRONE_NODES' || currentStage === 'LORA_TRANSMISSION') && disasterTriggeredInScene && (
        <div className="absolute top-18 left-4 z-30 max-w-xs w-80 bg-white/95 backdrop-blur-xl border-2 border-rose-500 rounded-2xl p-3.5 shadow-2xl animate-fade-in text-slate-800 font-mono text-xs select-none">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-rose-100">
            <div className="flex items-center gap-1.5 text-rose-600 font-bold text-[11px]">
              <AlertTriangle className="w-4 h-4 animate-bounce shrink-0" />
              <span>LIVE TELEMETRY FLUCTUATION</span>
            </div>
            <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold animate-pulse">
              ANOMALY
            </span>
          </div>

          <div className="space-y-2 text-[11px]">
            {/* Prone Node A reading fluctuation */}
            <div className="bg-rose-50/80 p-2 rounded-xl border border-rose-200">
              <div className="font-bold text-slate-900 truncate">{currentConfig.nodeA.name}</div>
              <div className="text-[10px] text-slate-500">{currentConfig.nodeA.sensorLabel}</div>
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-rose-200/60">
                <span className="text-slate-500">Baseline: {currentConfig.nodeA.baselineVal} {currentConfig.nodeA.unit}</span>
                <span className="font-bold text-rose-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 animate-pulse" />
                  {currentConfig.nodeA.fluctuatedReading}
                </span>
              </div>
            </div>

            {/* Prone Node B corroborating reading fluctuation */}
            <div className="bg-amber-50/80 p-2 rounded-xl border border-amber-200">
              <div className="font-bold text-slate-900 truncate">{currentConfig.nodeB.name}</div>
              <div className="text-[10px] text-slate-500">{currentConfig.nodeB.sensorLabel}</div>
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-amber-200/60">
                <span className="text-slate-500">Baseline: {currentConfig.nodeB.baselineVal} {currentConfig.nodeB.unit}</span>
                <span className="font-bold text-amber-700 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 animate-pulse" />
                  {currentConfig.nodeB.fluctuatedReading}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-600 leading-tight italic pt-0.5">
              Dual-point correlation active. Both nodes corroborate anomalous surge before triggering alarm cascade.
            </p>
          </div>
        </div>
      )}

      {/* 3. WATCH TOWER EVIDENCE FUSION ANIMATION OVERLAY (Requested by user) */}
      {currentStage === 'WATCHTOWER_FUSION' && (
        <div className="absolute top-18 right-4 z-30 max-w-sm w-88 bg-gradient-to-b from-slate-950/95 to-slate-900/95 backdrop-blur-xl border-2 border-sky-400 rounded-2xl p-4 shadow-2xl text-slate-100 font-mono text-xs animate-fade-in select-none">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-sky-800">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400 animate-spin" />
              <span className="font-bold text-[11px] text-sky-300 uppercase tracking-wide">
                Watch Tower Evidence Fusion
              </span>
            </div>
            <span className="text-[9px] bg-sky-950 text-sky-300 border border-sky-700 px-1.5 py-0.5 rounded">
              ESP32 + LoRa
            </span>
          </div>

          <div className="space-y-2.5">
            {/* ESP32 Module & LoRa Transceiver Callout */}
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Core Hardware:</span>
                <strong className="text-amber-300">ESP32 Dual-Core Module</strong>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Mesh Gateway:</span>
                <strong className="text-sky-300">SX1262 LoRa Transceiver</strong>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Algorithm:</span>
                <strong className="text-emerald-300">Edge ML Random Forest &amp; DS Fusion</strong>
              </div>
            </div>

            {/* Fusing Animation Data Stream Flow */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Multi-Source Inflow Convergence</span>
                <span className="text-sky-400 animate-pulse">Processing...</span>
              </div>
              
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-sky-300 truncate max-w-[120px]">{currentConfig.nodeA.id} Telemetry</span>
                <span className="text-emerald-400 font-bold">100% Corroborated</span>
              </div>
              <div className="flex items-center justify-between text-[11px] mb-2">
                <span className="text-amber-300 truncate max-w-[120px]">{currentConfig.nodeB.id} Telemetry</span>
                <span className="text-emerald-400 font-bold">100% Corroborated</span>
              </div>

              {/* Confidence Progress Meter */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-sky-500 via-amber-500 to-rose-500 transition-all duration-700 ease-out rounded-full"
                  style={{ width: `${fusionConfidencePct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] mt-1.5 pt-1 border-t border-slate-900 font-bold">
                <span className="text-slate-400">Fused Hazard Confidence:</span>
                <span className={fusionConfidencePct >= 95 ? "text-rose-400 animate-pulse" : "text-sky-300"}>
                  {fusionConfidencePct}% {fusionConfidencePct >= 95 ? '(>95% Threshold Passed!)' : ''}
                </span>
              </div>
            </div>

            {fusionConfidencePct >= 95 && (
              <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-700 text-[11px] text-rose-200 flex items-center gap-1.5 font-bold animate-pulse">
                <BellRing className="w-4 h-4 text-rose-400 shrink-0" />
                <span>100% VERIFIED DISASTER · ACTIVATING BUZZER &amp; SIREN!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MAIN BOTTOM GUIDED CARD (Every pop-up lasts 5 seconds + has Next button) */}
      <div className="absolute bottom-3 left-0 right-0 z-30 flex justify-center px-3 sm:px-6 pointer-events-none select-none">
        <div className="pointer-events-auto max-w-3xl w-full bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
          
          {/* Header Progress & Timer Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-sky-700 uppercase tracking-widest bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                Step: {currentStage.replace(/_/g, ' ')}
              </span>

              <span className="hidden sm:inline text-xs text-slate-500 font-mono">
                Auto-advance: <strong className="text-sky-700">{stageSecondsRemaining}s</strong>
              </span>
            </div>

            {/* Countdown progress bar */}
            <div className="flex items-center gap-2">
              <div className="w-24 sm:w-36 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sky-600 transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${((5 - stageSecondsRemaining + 1) / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* DYNAMIC CONTENT SWITCHER FOR STAGES */}
          {currentStage === 'WELCOME' && (
            <div className="space-y-1.5">
              <h3 className="font-display font-extrabold text-lg sm:text-xl text-slate-900 leading-snug">
                Hello Judge! Welcome to the Simulation.
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                This guided demonstration showcases cooperative edge corroboration across physical ESP32 sensor nodes. In our design, single-node anomalies are verified with paired neighbor nodes before escalating to village-wide acoustic alarms.
              </p>
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Each step runs for 5 seconds automatically, or click <strong>NEXT</strong> to advance immediately.</span>
              </div>
            </div>
          )}

          {currentStage === 'SELECT_DISASTER' && (
            <div className="space-y-2">
              <div>
                <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900 leading-snug">
                  Select a Disaster Scenario
                </h3>
                <p className="text-xs text-slate-600">
                  Every disaster deploys dual physical nodes at the high-risk prone area to corroborate evidence before escalation:
                </p>
              </div>

              {/* 4 Disaster Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(DISASTER_CONFIGS).map(([key, config]) => {
                  const Icon = config.icon;
                  const isSelected = selectedDisasterKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectDisaster(key)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/90 shadow-md ring-2 ring-sky-400/50'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Icon className="w-4 h-4 text-sky-600" />
                        <span className="text-[9px] font-mono font-bold text-slate-400">2 NODES</span>
                      </div>
                      <div className="font-bold text-xs text-slate-900 leading-tight">{config.title}</div>
                      <div className="text-[10px] text-slate-500 mt-1 truncate">{config.badge}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {currentStage === 'DRONE_AND_PRONE_NODES' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900 leading-snug">
                  Cinematic Drone Shot: {currentConfig.title} Prone Area
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                  2 Nodes Deployed in Prone Area
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                Notice the two nodes placed directly at the hazard-prone zone: <strong>{currentConfig.nodeA.name}</strong> and <strong>{currentConfig.nodeB.name}</strong>. Illustrated baseline readings are normal. Within 2 seconds, the disaster triggers!
              </p>

              {/* Illustrated Baseline Readings Preview */}
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase">{currentConfig.nodeA.name}</div>
                  <div className="font-bold text-slate-900">{currentConfig.nodeA.normalReading}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">● Normal Equilibrium</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase">{currentConfig.nodeB.name}</div>
                  <div className="font-bold text-slate-900">{currentConfig.nodeB.normalReading}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">● Normal Equilibrium</div>
                </div>
              </div>
            </div>
          )}

          {currentStage === 'LORA_TRANSMISSION' && (
            <div className="space-y-2">
              <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900 leading-snug">
                Dual-Node LoRa Mesh Transmission to Watch Tower 01
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                Both nodes in the prone area independently corroborating the anomaly dispatch encrypted SX1262 LoRa telemetry packets to the Superior Node at Watch Tower 01 for master evidence fusion.
              </p>
              <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center justify-between font-mono">
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
                  <span>Transmitting: {currentConfig.nodeA.id} + {currentConfig.nodeB.id} → NODE-SUPERIOR</span>
                </span>
                <span className="font-bold text-sky-700">868 MHz LoRa</span>
              </div>
            </div>
          )}

          {currentStage === 'WATCHTOWER_FUSION' && (
            <div className="space-y-2">
              <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900 leading-snug">
                Watch Tower 01: ESP32 + LoRa Transceiver Fusion Engine
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                Watch Tower 01 houses the master ESP32 module and SX1262 LoRa transceiver. It fuses evidence from both field nodes using Edge ML Random Forest algorithms, rapidly elevating confidence toward the 95% alarm threshold.
              </p>
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 font-mono flex items-center justify-between">
                <span>Confidence climbing to 99.4% (&gt;95% threshold)</span>
                <span className="font-bold text-rose-700">ARMING BUZZER</span>
              </div>
            </div>
          )}

          {currentStage === 'SIREN_TOP_SHOT' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-extrabold text-base sm:text-lg text-rose-700 leading-snug flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-rose-600 animate-bounce" />
                  <span>Confidence &gt;95%: 120dB Siren &amp; Buzzer Activated!</span>
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                  TOP SHOT VIEW
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                Camera swoops to a top shot showing the flow of acoustic siren waves radiating across the landscape at 343 m/s (120 dB acoustic alarm reach), warning the entire village downwind.
              </p>
            </div>
          )}

          {currentStage === 'EVACUATION_DRONE' && (
            <div className="space-y-2">
              <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900 leading-snug">
                Cinematic Drone Shot: Villagers Fleeing into Safe Orange Shed
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                Residents evacuate their homes along the paved highway and gather inside the illuminated <strong>Safe Orange Shed</strong> (Emergency Muster Refuge). Dual-node corroboration completely eliminated false alarms and enabled rapid life-saving evacuation.
              </p>
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-mono flex items-center justify-between">
                <span>Safe Orange Shed Capacity: 60/60 Civilians</span>
                <strong className="text-emerald-700">100% VILLAGE EVACUATED</strong>
              </div>
            </div>
          )}

          {currentStage === 'COMPLETE' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-display text-base sm:text-lg">Demonstration Complete for {currentConfig.title}</h3>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                You have observed the entire evidence-to-escalation cascade: Dual prone nodes → Normal baseline → Hazard trigger &amp; live fluctuation → LoRa transmission → ESP32 fusion at Watch Tower 01 → 120dB Siren top shot → Drone evacuation into the Safe Orange Shed.
              </p>
            </div>
          )}

          {/* Bottom Action Buttons Row */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                onClick={handleRestart}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
                title="Restart demonstration from Welcome"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restart</span>
              </button>

              <button
                onClick={() => advanceToStage('SELECT_DISASTER')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
                title="Select another disaster"
              >
                <Layers className="w-3.5 h-3.5 text-sky-600" />
                <span>Test Another Disaster</span>
              </button>
            </div>

            {/* NEXT Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleNextStage}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-sky-500/25 transition-all cursor-pointer"
              >
                <span>{currentStage === 'COMPLETE' ? 'TEST ANOTHER' : 'NEXT'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
