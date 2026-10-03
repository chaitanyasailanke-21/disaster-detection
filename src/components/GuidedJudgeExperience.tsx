import React, { useState, useEffect, useRef } from 'react';
import { 
  Waves, 
  Mountain, 
  Flame, 
  Wind, 
  Sun, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  Radio, 
  Cpu, 
  Layers, 
  RotateCcw, 
  X, 
  ChevronRight,
  ShieldCheck,
  Compass,
  Laptop,
  Volume2,
  BellRing,
  Activity,
  Play
} from 'lucide-react';
import { simulationEngine } from '../engine/simulationEngine';
import { soundManager } from '../audio/soundEffects';
import { CameraMode, HazardType } from '../types/simulation';

export type GuidedStage = 
  | 'WELCOME'
  | 'HAZARD_SELECTION'
  | 'DRONE_TRANSITION'
  | 'NORMAL_STATE'
  | 'HAZARD_ANOMALY'
  | 'LORA_CORROBORATION'
  | 'INDEPENDENT_VERIFICATION'
  | 'EVIDENCE_FUSION'
  | 'COMPLETE';

export interface HazardConfig {
  id: string;
  hazardType: HazardType;
  name: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
  description: string;
  cameraMode: CameraMode;
  isPhysicalPrototype: boolean;
  sensorsSummary: string[];
  node1Title: string;
  node1Pos: [number, number, number];
  node2Title: string;
  node2Pos: [number, number, number];
  node1SensorsNormal: { label: string; value: string; status: 'GOOD' | 'NORMAL' }[];
  node2SensorsNormal: { label: string; value: string; status: 'GOOD' | 'NORMAL' }[];
  node1SensorsAlert: { label: string; value: string; status: 'WARNING' | 'CRITICAL' | 'GOOD' | 'NORMAL' }[];
  node2SensorsAlert: { label: string; value: string; status: 'WARNING' | 'CRITICAL' | 'GOOD' | 'NORMAL' }[];
  anomalyExplanation: string;
  corroborationExplanation: string;
  verificationExplanation: string;
  escalationExplanation: string;
}

export const HAZARDS: HazardConfig[] = [
  {
    id: 'RIVER_FLOODING',
    hazardType: 'FLOOD',
    name: 'RIVER FLOODING',
    subtitle: 'Catchment Basin Surge & Overflow',
    icon: Waves,
    description: 'Rapid catchment rise inundates downstream bridge constriction and residential access roads.',
    cameraMode: 'FLOOD_OVERVIEW',
    isPhysicalPrototype: true,
    sensorsSummary: ['Water Level', 'Rainfall', 'Temperature / Humidity'],
    node1Title: 'NODE 1 · HYDROLOGICAL GAUGE',
    node1Pos: [10.6, -0.63, 17.9],
    node2Title: 'NODE 2 · RIVER BASIN MEANDER',
    node2Pos: [14.0, 0.6, -6.0],
    node1SensorsNormal: [
      { label: 'Water Level', value: '0.42 m (NORMAL)', status: 'NORMAL' },
      { label: 'Rainfall Rate', value: '0.0 mm/h (NORMAL)', status: 'NORMAL' },
      { label: 'Sensor Trust', value: '98% (HEALTHY)', status: 'GOOD' }
    ],
    node2SensorsNormal: [
      { label: 'Catchment Rain', value: '0.0 mm/h (NORMAL)', status: 'NORMAL' },
      { label: 'Environmental Cond.', value: 'Calm Baseline', status: 'NORMAL' },
      { label: 'Hazard Confidence', value: '4% (LOW)', status: 'NORMAL' }
    ],
    node1SensorsAlert: [
      { label: 'Water Level', value: '3.45 m (CRITICAL SURGE)', status: 'CRITICAL' },
      { label: 'Rainfall Rate', value: '72.0 mm/h (TORRENTIAL)', status: 'CRITICAL' },
      { label: 'Sensor Trust', value: '98% (VERIFIED)', status: 'GOOD' }
    ],
    node2SensorsAlert: [
      { label: 'Catchment Rain', value: '68.0 mm/h (CORROBORATED)', status: 'CRITICAL' },
      { label: 'Basin Moisture', value: '96% (SATURATED)', status: 'CRITICAL' },
      { label: 'Peer Agreement', value: '97% (CROSS-CONFIRMED)', status: 'CRITICAL' }
    ],
    anomalyExplanation: 'Node 1 detects a rapid 3.45m ultrasonic river level surge. Under "Evidence Before Escalation", Node 1 prevents false alarms by withholding public sirens until peer corroboration.',
    corroborationExplanation: 'Node 1 sends a SX1262 LoRa peer request packet across the terrain to Node 2. Zero internet or cellular network required.',
    verificationExplanation: 'Node 2 samples its independent rainfall and humidity sensors, cross-confirming upstream flood surge with 97% confidence.',
    escalationExplanation: 'Evidence fused at Watch Tower. Confidence exceeds 95% threshold -> Watch Tower triggers 120dB siren; 16 village residents evacuate along the designated highway!'
  },
  {
    id: 'LANDSLIDE',
    hazardType: 'LANDSLIDE',
    name: 'LANDSLIDE',
    subtitle: 'Escarpment Saturation & Slope Slip',
    icon: Mountain,
    description: 'Steep escarpment shale saturation and subterranean vibration causing sudden slope failure.',
    cameraMode: 'HILLSIDE_OVERVIEW',
    isPhysicalPrototype: false,
    sensorsSummary: ['Soil Moisture', 'IMU / Tilt', 'Vibration', 'Rainfall'],
    node1Title: 'NODE 3 · ESCARPMENT RIDGE STATION',
    node1Pos: [-35.7, 16.84, 41.7],
    node2Title: 'NODE 2 · PINNED CREST TILT & SEISMIC',
    node2Pos: [-36.0, 14.5, 38.0],
    node1SensorsNormal: [
      { label: 'Soil Moisture', value: '34% (NORMAL)', status: 'NORMAL' },
      { label: 'Vibration / Shock', value: '0.02 g (BASELINE)', status: 'NORMAL' },
      { label: 'Sensor Trust', value: '96% (HEALTHY)', status: 'GOOD' }
    ],
    node2SensorsNormal: [
      { label: 'IMU / Incline Tilt', value: '0.2° (STABLE)', status: 'NORMAL' },
      { label: 'Slope Precipitation', value: '0.0 mm/h (NORMAL)', status: 'NORMAL' },
      { label: 'Hazard Confidence', value: '3% (LOW)', status: 'NORMAL' }
    ],
    node1SensorsAlert: [
      { label: 'Soil Moisture', value: '94% (PORE SATURATION)', status: 'CRITICAL' },
      { label: 'Vibration / Shock', value: '1.48 g (SEISMIC SLIP)', status: 'CRITICAL' },
      { label: 'Sampling Burst', value: '5.0 Hz (ACTIVE RE-SENSE)', status: 'WARNING' }
    ],
    node2SensorsAlert: [
      { label: 'IMU / Incline Tilt', value: '14.8° (SHEAR FAILURE)', status: 'CRITICAL' },
      { label: 'Crest Vibration', value: '0.82 g (CORROBORATED)', status: 'CRITICAL' },
      { label: 'Peer Agreement', value: '95% (SHEAR CONFIRMED)', status: 'CRITICAL' }
    ],
    anomalyExplanation: 'Node 1 detects strong 1.48g seismic shock and 94% soil pore saturation inside the pinned landslide hazard zone. Single node holds off siren escalation to eliminate false tremors.',
    corroborationExplanation: 'Node 1 initiates immediate peer-to-peer LoRa query to Node 2 at the upper crest of the pinned escarpment.',
    verificationExplanation: 'Node 2 registers 14.8° shear angle displacement and independent vibration, confirming active rockfall.',
    escalationExplanation: 'Multi-sensor Bayesian corroboration confirms genuine slope failure across the pinned mountain face. Watch Tower sounds 120dB siren; village residents evacuate safely!'
  },
  {
    id: 'FOREST_FIRE',
    hazardType: 'FOREST_FIRE',
    name: 'FOREST FIRE',
    subtitle: 'Timberline Crown Fire Propagation',
    icon: Flame,
    description: 'Dry coniferous timberland ignition with prevailing seasonal winds driving rapid thermal smoke front.',
    cameraMode: 'FOREST_OVERVIEW',
    isPhysicalPrototype: true,
    sensorsSummary: ['Smoke / Gas', 'Flame', 'Temperature', 'Humidity'],
    node1Title: 'NODE 1 · PERIMETER SENSOR KNIGHT',
    node1Pos: [-16.0, 1.4, -12.0],
    node2Title: 'NODE 2 · CANOPY BOUNDARY STATION',
    node2Pos: [-21.0, 2.0, -6.0],
    node1SensorsNormal: [
      { label: 'Smoke / Gas (MQ-2)', value: '16 ppm (BASELINE)', status: 'NORMAL' },
      { label: 'Optical Flame IR', value: '0.0 (NO FLAME)', status: 'NORMAL' },
      { label: 'Ambient Temp', value: '24.2°C (NORMAL)', status: 'GOOD' }
    ],
    node2SensorsNormal: [
      { label: 'Canopy Smoke', value: '14 ppm (CLEAR)', status: 'NORMAL' },
      { label: 'Canopy Temp', value: '23.8°C (NORMAL)', status: 'NORMAL' },
      { label: 'Hazard Confidence', value: '2% (LOW)', status: 'NORMAL' }
    ],
    node1SensorsAlert: [
      { label: 'Smoke / Gas (MQ-2)', value: '215 ppm (SMOKE SPIKE)', status: 'CRITICAL' },
      { label: 'Optical Flame IR', value: '1.0 (FLAME DETECTED)', status: 'CRITICAL' },
      { label: 'Ambient Temp', value: '54.0°C (RAPID SURGE)', status: 'CRITICAL' }
    ],
    node2SensorsAlert: [
      { label: 'Canopy Smoke', value: '178 ppm (DOWNWIND SMOKE)', status: 'CRITICAL' },
      { label: 'Canopy Temp', value: '48.5°C (HEAT CORRIDOR)', status: 'CRITICAL' },
      { label: 'Peer Agreement', value: '98% (WILDFIRE CONFIRMED)', status: 'CRITICAL' }
    ],
    anomalyExplanation: 'Node 1 detects simultaneous MQ-2 smoke surge (215 ppm) and optical IR flame radiation.',
    corroborationExplanation: 'Node 1 transmits LoRa packet to downwind Node 2 to corroborate thermal plume and eliminate campfire or sensor glitch.',
    verificationExplanation: 'Node 2 confirms downwind smoke particulate drift (178 ppm) and temperature rise.',
    escalationExplanation: 'Gateway fuses dual-node flame and smoke signatures. Critical alarm dispatched; Watchtower siren alerts the village for immediate evacuation!'
  },
  {
    id: 'AIR_POLLUTION',
    hazardType: 'AIR_QUALITY_EVENT',
    name: 'AIR POLLUTION',
    subtitle: 'Chemical Stack Breach & Atmospheric Drift',
    icon: Wind,
    description: 'Industrial chemical stack emission breach and toxic particulate drift toward residential valley.',
    cameraMode: 'FACTORY_OVERVIEW',
    isPhysicalPrototype: true,
    sensorsSummary: ['Gas / Air Quality', 'Temperature', 'Humidity', 'Optional PM sensor'],
    node1Title: 'NODE 1 · FACTORY STACK MONITOR',
    node1Pos: [34.5, 1.8, -28.0],
    node2Title: 'NODE 2 · WATCH TOWER AIR STATION',
    node2Pos: [42.5, 14.5, 2.5],
    node1SensorsNormal: [
      { label: 'Gas / AQI (MQ-135)', value: '28 AQI (GOOD)', status: 'GOOD' },
      { label: 'SPS30 Laser PM2.5', value: '12 µg/m³ (CLEAN)', status: 'GOOD' },
      { label: 'Stack Humidity', value: '45% (NORMAL)', status: 'NORMAL' }
    ],
    node2SensorsNormal: [
      { label: 'Ambient SPS30 PM', value: '12 µg/m³ (CLEAN)', status: 'GOOD' },
      { label: 'Valley Multi-Gas', value: '28 AQI (GOOD)', status: 'GOOD' },
      { label: 'Hazard Confidence', value: '2% (LOW)', status: 'NORMAL' }
    ],
    node1SensorsAlert: [
      { label: 'Gas / AQI (MQ-135)', value: '285 AQI (HAZARDOUS PLUME)', status: 'CRITICAL' },
      { label: 'SPS30 Laser PM2.5', value: '168 µg/m³ (SEVERE PARTICULATE)', status: 'CRITICAL' },
      { label: 'Effluent Status', value: 'Chemical Discharge Active', status: 'WARNING' }
    ],
    node2SensorsAlert: [
      { label: 'Ambient SPS30 PM', value: '142 µg/m³ (DOWNWIND PLUME)', status: 'CRITICAL' },
      { label: 'Valley Multi-Gas', value: '195 AQI (UNHEALTHY)', status: 'CRITICAL' },
      { label: 'Peer Agreement', value: '96% (CORRIDOR CONFIRMED)', status: 'CRITICAL' }
    ],
    anomalyExplanation: 'Node 1 optical and electrochemical sensors at factory boundary detect severe 285 AQI toxic stack emission.',
    corroborationExplanation: 'Node 1 queries Superior Node 2 atop the Watch Tower to verify if plume is diffusing across residential valley.',
    verificationExplanation: 'Watch Tower Superior Node corroborates 142 µg/m³ laser particulate spike drifting toward the homes.',
    escalationExplanation: 'Evidence fused across industrial perimeter and village corridor. Siren triggers; village population safely routes away along evacuation road!'
  },
  {
    id: 'EXTREME_HEAT',
    hazardType: 'EXTREME_HEAT',
    name: 'EXTREME HEAT',
    subtitle: 'Thermal Inversion & Heat Stress Wave',
    icon: Sun,
    description: 'Dangerous micro-climate heat dome trapped in agricultural valley basin exceeding physiological thresholds.',
    cameraMode: 'HEAT_OVERVIEW',
    isPhysicalPrototype: false,
    sensorsSummary: ['Temperature', 'Humidity'],
    node1Title: 'NODE 1 · VALLEY BASIN METEOROLOGY',
    node1Pos: [18.0, 1.8, 12.0],
    node2Title: 'NODE 2 · RESIDENTIAL RIDGE WEATHER',
    node2Pos: [32.0, 1.8, 20.0],
    node1SensorsNormal: [
      { label: 'Ambient Temp (BME688)', value: '24.0°C (COMFORTABLE)', status: 'NORMAL' },
      { label: 'Relative Humidity', value: '45% (NORMAL)', status: 'NORMAL' },
      { label: 'Heat Index', value: 'LOW RISK', status: 'GOOD' }
    ],
    node2SensorsNormal: [
      { label: 'Ridge Temp', value: '23.5°C (NORMAL)', status: 'NORMAL' },
      { label: 'Solar Radiation', value: '650 W/m² (NORMAL)', status: 'NORMAL' },
      { label: 'Hazard Confidence', value: '3% (LOW)', status: 'NORMAL' }
    ],
    node1SensorsAlert: [
      { label: 'Ambient Temp (BME688)', value: '47.2°C (EXTREME DANGER)', status: 'CRITICAL' },
      { label: 'Relative Humidity', value: '13% (SEVERE DRY)', status: 'CRITICAL' },
      { label: 'Heat Index', value: 'CRITICAL STRESS (56°C)', status: 'CRITICAL' }
    ],
    node2SensorsAlert: [
      { label: 'Ridge Temp', value: '45.8°C (HEAT DOME)', status: 'CRITICAL' },
      { label: 'Solar Radiation', value: '1050 W/m² (EXTREME)', status: 'CRITICAL' },
      { label: 'Peer Agreement', value: '96% (HEATWAVE VALIDATED)', status: 'CRITICAL' }
    ],
    anomalyExplanation: 'Node 1 registers unprecedented 47.2°C ambient surge. LoRa peer validation ensures this is not an electronic thermal runaway.',
    corroborationExplanation: 'Node 1 requests corroborating solar insolation and temperature check from Node 2 on the ridge.',
    verificationExplanation: 'Node 2 validates widespread heat dome (45.8°C). System certifies valid multi-sensor meteorological heatwave.',
    escalationExplanation: 'Watch Tower sounds alert chime and activates municipal cooling & evacuation advisory for vulnerable residents!'
  },
  {
    id: 'MULTI_HAZARD',
    hazardType: 'MULTI_HAZARD',
    name: 'MULTI-HAZARD',
    subtitle: 'Cascading Catchment Deluge & Soil Slip',
    icon: AlertTriangle,
    description: 'Compound regional cloudburst triggering simultaneous flash river flooding and hillside slope shear.',
    cameraMode: 'DISASTER_CINEMATIC',
    isPhysicalPrototype: false,
    sensorsSummary: ['Water Level', 'Soil Moisture', 'Vibration', 'Rainfall'],
    node1Title: 'NODE 1 · HYDROLOGICAL GAUGE',
    node1Pos: [7.6, 0.8, -16.0],
    node2Title: 'NODE 2 · ESCARPMENT SLOPE STATION',
    node2Pos: [-8.4, 3.4, 10.5],
    node1SensorsNormal: [
      { label: 'River Water Level', value: '0.42 m (NORMAL)', status: 'NORMAL' },
      { label: 'Catchment Rainfall', value: '0.0 mm/h (NORMAL)', status: 'NORMAL' },
      { label: 'Hydrological Trust', value: '98% (HEALTHY)', status: 'GOOD' }
    ],
    node2SensorsNormal: [
      { label: 'Soil Saturation', value: '34% (NORMAL)', status: 'NORMAL' },
      { label: 'Seismic Geophone', value: '0.02 g (BASELINE)', status: 'NORMAL' },
      { label: 'Hazard Confidence', value: '4% (LOW)', status: 'NORMAL' }
    ],
    node1SensorsAlert: [
      { label: 'River Water Level', value: '4.80 m (TORRENTIAL FLOOD)', status: 'CRITICAL' },
      { label: 'Catchment Rainfall', value: '85.0 mm/h (CLOUDBURST)', status: 'CRITICAL' },
      { label: 'Sector Status', value: 'Flash Flood Overflow', status: 'CRITICAL' }
    ],
    node2SensorsAlert: [
      { label: 'Soil Saturation', value: '98% (LIQUEFACTION)', status: 'CRITICAL' },
      { label: 'Seismic Geophone', value: '1.62 g (ROCKFALL SHEAR)', status: 'CRITICAL' },
      { label: 'Cross-Sector Risk', value: '99% (COMPOUND DISASTER)', status: 'CRITICAL' }
    ],
    anomalyExplanation: 'Catchment cloudburst drives dual catastrophic vectors: 4.80m river overflow and sudden 1.62g slope shear.',
    corroborationExplanation: 'Off-grid LoRa mesh synchronizes river and escarpment nodes in under 1.2 seconds without cloud servers.',
    verificationExplanation: 'Cross-sector Bayesian engine confirms compound systemic hazard threatening both valley roads and residential hillsides.',
    escalationExplanation: 'Immediate maximum-severity watchtower alarm sounds. Evacuation road (x: 50 to 75) activates as 16 villagers flee toward x: 70, z: 30!'
  }
];

interface GuidedJudgeExperienceProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEngineeringView?: () => void;
}

export const GuidedJudgeExperience: React.FC<GuidedJudgeExperienceProps> = ({
  isOpen,
  onClose,
  onOpenEngineeringView
}) => {
  const [stage, setStage] = useState<GuidedStage>('WELCOME');
  const [selectedHazard, setSelectedHazard] = useState<HazardConfig>(HAZARDS[0]);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(5);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-advance 5 second timer handler (with interactive [NEXT] button bypass)
  useEffect(() => {
    if (!isOpen) return;

    // Drone transition has a fixed 2.8s flight time before reaching Normal State
    if (stage === 'DRONE_TRANSITION') {
      const flightTimer = setTimeout(() => {
        setStage('NORMAL_STATE');
        setSecondsRemaining(2); // Normal state waits ~2 seconds before introducing hazard
      }, 2800);
      return () => clearTimeout(flightTimer);
    }

    if (stage === 'COMPLETE') return;

    const initialSecs = stage === 'NORMAL_STATE' ? 2 : 5;
    setSecondsRemaining(initialSecs);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (isPaused) return;

      setSecondsRemaining(prev => {
        if (prev <= 1) {
          return 1;
        }
        return prev - 1;
      });
    }, 1000);

    const autoAdvanceTimeout = setTimeout(() => {
      if (!isPaused) {
        handleNextStage();
      }
    }, initialSecs * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearTimeout(autoAdvanceTimeout);
    };
  }, [isOpen, stage, isPaused, selectedHazard]);

  // Stage transition machine
  const handleNextStage = () => {
    soundManager.playPacketAck();

    if (stage === 'WELCOME') {
      setStage('HAZARD_SELECTION');
    } else if (stage === 'HAZARD_SELECTION') {
      startDroneTransition(selectedHazard);
    } else if (stage === 'DRONE_TRANSITION') {
      setStage('NORMAL_STATE');
    } else if (stage === 'NORMAL_STATE') {
      // 8. Hazard starts automatically
      triggerHazardAnomaly(selectedHazard);
      setStage('HAZARD_ANOMALY');
    } else if (stage === 'HAZARD_ANOMALY') {
      triggerLoRaCorroboration(selectedHazard);
      setStage('LORA_CORROBORATION');
    } else if (stage === 'LORA_CORROBORATION') {
      triggerVerification(selectedHazard);
      setStage('INDEPENDENT_VERIFICATION');
    } else if (stage === 'INDEPENDENT_VERIFICATION') {
      triggerEvidenceFusion(selectedHazard);
      setStage('EVIDENCE_FUSION');
    } else if (stage === 'EVIDENCE_FUSION') {
      setStage('COMPLETE');
    }
  };

  const startDroneTransition = (hazard: HazardConfig) => {
    setSelectedHazard(hazard);
    setStage('DRONE_TRANSITION');
    // Ensure calm baseline
    simulationEngine.resetSensorsToBaseline();
  };

  const triggerHazardAnomaly = (hazard: HazardConfig) => {
    soundManager.playWatchPing();
    simulationEngine.triggerHazard(hazard.hazardType, 'HIGH');
  };

  const triggerLoRaCorroboration = (hazard: HazardConfig) => {
    soundManager.playRadioChirp();
    simulationEngine.dispatchLoRaPacket('NODE-1', 'NODE-2', 'VERIFY_REQUEST', {
      hazard: hazard.id,
      stage: 'CORROBORATION_REQUEST'
    });
  };

  const triggerVerification = (hazard: HazardConfig) => {
    soundManager.playPacketAck();
    simulationEngine.dispatchLoRaPacket('NODE-2', 'NODE-SUPERIOR', 'VERIFY_RESPONSE', {
      hazard: hazard.id,
      stage: 'CORROBORATION_CONFIRMED',
      confidence: 0.96
    });
  };

  const triggerEvidenceFusion = (_hazard: HazardConfig) => {
    soundManager.playCriticalSiren();
    soundManager.startWatchtowerSiren('SIREN');
    simulationEngine.triggerWatchtowerAlarm(true);
  };

  if (!isOpen) return null;

  const progressPercent = ((5 - secondsRemaining) / 5) * 100;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-5 font-sans">
      
      {/* 1. TOP STATUS PILL (Clean Daylight HUD) */}
      <div className="pointer-events-auto flex items-center justify-between w-full max-w-4xl mx-auto">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md rounded-2xl px-4 py-2 flex items-center gap-3 text-slate-800">
          <div className="flex items-center gap-1.5 text-sky-700 font-bold font-mono text-xs">
            <Radio className="w-4 h-4 text-sky-600 animate-pulse" />
            <span>AEGIS-X EVALUATION</span>
          </div>

          <span className="text-slate-300">|</span>

          <span className="text-xs font-semibold text-slate-600">
            {stage === 'WELCOME' && '1. Welcome & Introduction'}
            {stage === 'HAZARD_SELECTION' && '2. Hazard Selection'}
            {stage === 'DRONE_TRANSITION' && '3. Cinematic Drone Transit'}
            {stage === 'NORMAL_STATE' && '4. Normal Baseline (2-Node Zone)'}
            {stage === 'HAZARD_ANOMALY' && '5. Stage 1: Anomaly Detected'}
            {stage === 'LORA_CORROBORATION' && '6. Stage 2: LoRa Corroboration'}
            {stage === 'INDEPENDENT_VERIFICATION' && '7. Stage 3: Peer Verification'}
            {stage === 'EVIDENCE_FUSION' && '8. Stage 4: Fusion & Siren Evacuation'}
            {stage === 'COMPLETE' && '9. Evaluation Complete'}
          </span>
        </div>

        {/* Top-Right Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="bg-white/95 hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono font-medium shadow-sm transition-colors cursor-pointer"
            title={isPaused ? "Resume auto-advance timer" : "Pause auto-advance timer"}
          >
            {isPaused ? 'Resume Timer' : `Auto-advancing (${secondsRemaining}s)`}
          </button>

          <button
            onClick={onClose}
            className="bg-white/95 hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 p-2 rounded-xl shadow-sm transition-colors cursor-pointer"
            title="Exit Guided Demonstration"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. CENTER CONTENT (Dynamic according to Stage) */}
      <div className="flex-1 flex items-center justify-center pointer-events-none my-auto">
        
        {/* ========================================== */}
        {/* SECTION 3: JUDGE WELCOME CARD              */}
        {/* ========================================== */}
        {stage === 'WELCOME' && (
          <div className="pointer-events-auto max-w-lg w-full bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-2xl rounded-3xl p-6 sm:p-8 text-center text-slate-800 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-mono text-xs font-bold tracking-wider uppercase mb-4 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              <span>SIH 2026 Evaluation Prototype</span>
            </div>

            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-950 tracking-tight mb-2 uppercase">
              HELLO JUDGE,<br />WELCOME TO THE AEGIS-X SIMULATION.
            </h2>

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Let's see how the system detects, verifies and responds to environmental hazards.
            </p>

            {/* Countdown Bar & Instant Next */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>Advancing in {secondsRemaining}s</span>
              </div>

              <button
                onClick={handleNextStage}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-sky-500/25 transition-all cursor-pointer"
              >
                <span>NEXT</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SECTION 4: HAZARD SELECTION GRID           */}
        {/* ========================================== */}
        {stage === 'HAZARD_SELECTION' && (
          <div className="pointer-events-auto max-w-4xl w-full bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-2xl rounded-3xl p-6 sm:p-7 text-slate-800 animate-fade-in">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-display font-extrabold text-lg sm:text-xl text-slate-950 uppercase tracking-tight">
                  SELECT A HAZARD TO EXPLORE
                </h3>
                <p className="text-xs text-slate-500">
                  Select a threat scenario to watch 2-node LoRa peer corroboration in action.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                  Auto-starts in {secondsRemaining}s
                </span>
                <button
                  onClick={handleNextStage}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <span>NEXT</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 6 Visual Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {HAZARDS.map(hazard => {
                const IconComponent = hazard.icon;
                const isSelected = selectedHazard.id === hazard.id;

                return (
                  <div
                    key={hazard.id}
                    onClick={() => {
                      setSelectedHazard(hazard);
                      startDroneTransition(hazard);
                    }}
                    className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                      isSelected 
                        ? 'border-sky-500 bg-sky-50/70 shadow-md ring-2 ring-sky-500/20' 
                        : 'border-slate-200/80 bg-white/80 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top Row: Icon & Prototype Badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className={`p-2 rounded-xl ${
                          isSelected ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          <IconComponent className="w-5 h-5" />
                        </div>

                        {hazard.isPhysicalPrototype ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-mono font-bold tracking-tight">
                            PHYSICAL PROTOTYPE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-600 text-[10px] font-mono font-semibold tracking-tight">
                            SIMULATED / FUTURE MODULE
                          </span>
                        )}
                      </div>

                      <h4 className="font-display font-bold text-sm text-slate-900 mb-0.5">
                        {hazard.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mb-2.5 line-clamp-2">
                        {hazard.description}
                      </p>
                    </div>

                    {/* Relevant Sensors List */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mb-1">
                        Relevant Sensors:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {hazard.sensorsSummary.map(s => (
                          <span 
                            key={s}
                            className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SECTION 5: DRONE TRANSITION OVERLAY        */}
        {/* ========================================== */}
        {stage === 'DRONE_TRANSITION' && (
          <div className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xl rounded-2xl px-6 py-4 flex items-center gap-4 text-slate-800 animate-pulse">
            <Compass className="w-6 h-6 text-sky-600 animate-spin" />
            <div>
              <div className="text-xs font-mono font-bold text-sky-700 uppercase tracking-wider">
                CINEMATIC DRONE TRANSIT
              </div>
              <div className="text-sm font-semibold text-slate-900">
                Approaching {selectedHazard.name} Sector...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM GUIDANCE & SENSOR PANEL (Daylight Clean Hero Card, 80-90% world visible) */}
      {(stage === 'NORMAL_STATE' || 
        stage === 'HAZARD_ANOMALY' || 
        stage === 'LORA_CORROBORATION' || 
        stage === 'INDEPENDENT_VERIFICATION' || 
        stage === 'EVIDENCE_FUSION' || 
        stage === 'COMPLETE') && (
        
        <div className="pointer-events-auto max-w-4xl w-full mx-auto bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl rounded-3xl p-4 sm:p-5 flex flex-col gap-3 text-slate-800 animate-fade-in">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-sky-100 border border-sky-200 text-sky-800 text-[11px] font-mono font-bold uppercase tracking-wider">
                2-NODE EVIDENCE ZONE · {selectedHazard.name}
              </span>

              {selectedHazard.isPhysicalPrototype ? (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-mono font-bold">
                  PHYSICAL PROTOTYPE (ESP32-S3 + LoRa)
                </span>
              ) : (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-600 text-[10px] font-mono font-semibold">
                  SIMULATED / FUTURE MODULE
                </span>
              )}
            </div>

            {/* Current State Indicator */}
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono ${
                stage === 'NORMAL_STATE'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : stage === 'EVIDENCE_FUSION'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {stage === 'NORMAL_STATE' ? 'NORMAL' : stage === 'EVIDENCE_FUSION' ? 'CRITICAL · EVACUATING' : 'VERIFYING HAZARD'}
              </span>
            </div>
          </div>

          {/* Side-by-Side: Sensor Readings (Left) + Plain-English Explanation (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            
            {/* Small Elegant Sensor Reading Panel (Only Relevant Sensors for this Hazard!) */}
            <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3 flex flex-col gap-2 font-mono text-[11px]">
              
              {/* NODE 1 Readings */}
              <div className="border-b border-slate-200/70 pb-2">
                <div className="flex items-center justify-between text-slate-800 font-bold mb-1">
                  <span>{selectedHazard.node1Title}</span>
                  <span className="text-[10px] text-slate-400">ESP32-S3</span>
                </div>
                <div className="space-y-0.5 text-slate-600">
                  {(stage === 'NORMAL_STATE' ? selectedHazard.node1SensorsNormal : selectedHazard.node1SensorsAlert).map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px]">
                      <span>{s.label}:</span>
                      <strong className={
                        s.status === 'CRITICAL' ? 'text-rose-600 font-bold' :
                        s.status === 'WARNING' ? 'text-amber-600 font-bold' :
                        'text-emerald-700'
                      }>
                        {s.value} <span className="text-[9px] text-slate-400">(SIMULATED)</span>
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* NODE 2 Readings */}
              <div>
                <div className="flex items-center justify-between text-slate-800 font-bold mb-1">
                  <span>{selectedHazard.node2Title}</span>
                  <span className="text-[10px] text-slate-400">ESP32-S3</span>
                </div>
                <div className="space-y-0.5 text-slate-600">
                  {(stage === 'NORMAL_STATE' || stage === 'HAZARD_ANOMALY' ? selectedHazard.node2SensorsNormal : selectedHazard.node2SensorsAlert).map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px]">
                      <span>{s.label}:</span>
                      <strong className={
                        s.status === 'CRITICAL' ? 'text-rose-600 font-bold' :
                        s.status === 'WARNING' ? 'text-amber-600 font-bold' :
                        'text-emerald-700'
                      }>
                        {s.value} <span className="text-[9px] text-slate-400">(SIMULATED)</span>
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Plain English Phase Explanation */}
            <div className="flex flex-col justify-center space-y-2">
              <div className="text-xs font-mono font-bold text-sky-700 uppercase tracking-wider">
                {stage === 'NORMAL_STATE' && 'Calm Baseline State'}
                {stage === 'HAZARD_ANOMALY' && 'Stage 1: Local Anomaly Detected'}
                {stage === 'LORA_CORROBORATION' && 'Stage 2: Peer Corroboration Dispatch'}
                {stage === 'INDEPENDENT_VERIFICATION' && 'Stage 3: Independent Cross-Verification'}
                {stage === 'EVIDENCE_FUSION' && 'Stage 4: Evidence Fusion & Evacuation Trigger'}
                {stage === 'COMPLETE' && 'Cycle Completed'}
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                {stage === 'NORMAL_STATE' && 'Both field sensor nodes report normal baseline conditions. The environment is calm. Approximately 2 seconds after normal state is established, the hazard starts automatically.'}
                {stage === 'HAZARD_ANOMALY' && selectedHazard.anomalyExplanation}
                {stage === 'LORA_CORROBORATION' && selectedHazard.corroborationExplanation}
                {stage === 'INDEPENDENT_VERIFICATION' && selectedHazard.verificationExplanation}
                {stage === 'EVIDENCE_FUSION' && selectedHazard.escalationExplanation}
                {stage === 'COMPLETE' && 'All stages demonstrated: Distributed edge sensors, off-grid LoRa mesh corroboration, and gateway evidence fusion prevent false alarms and autonomously activate the village siren.'}
              </p>

              {/* Principle Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>“Evidence Before Escalation”: No single-node false alarm</span>
              </div>
            </div>

          </div>

          {/* Action Row: [NEXT] button and auto-advance counter */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className="text-xs font-mono text-slate-400">
                {stage !== 'COMPLETE' && `Next in ${secondsRemaining}s`}
              </div>

              {/* Restart current hazard */}
              <button
                onClick={() => startDroneTransition(selectedHazard)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                title="Restart this hazard demonstration"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {stage === 'COMPLETE' ? (
                <>
                  <button
                    onClick={() => setStage('HAZARD_SELECTION')}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    SELECT ANOTHER HAZARD
                  </button>

                  {onOpenEngineeringView && (
                    <button
                      onClick={onOpenEngineeringView}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>ENGINEERING VIEW</span>
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={handleNextStage}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-sky-500/25 transition-all cursor-pointer"
                >
                  <span>NEXT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
