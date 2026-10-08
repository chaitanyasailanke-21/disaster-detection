export type SystemState = 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL';

export type HazardType = 
  | 'NONE'
  | 'FOREST_FIRE' 
  | 'FLOOD' 
  | 'LANDSLIDE' 
  | 'EXTREME_RAIN' 
  | 'AIR_QUALITY_EVENT' 
  | 'EXTREME_HEAT'
  | 'MULTI_HAZARD';

export type HazardSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type WeatherMode = 'CLEAR' | 'RAIN' | 'HEAVY_RAIN' | 'STORM' | 'FIRE_HAZE' | 'NIGHT';

export type CameraMode = 
  | 'COMMAND_CENTER' 
  | 'FOREST_OVERVIEW' 
  | 'FLOOD_OVERVIEW' 
  | 'HILLSIDE_OVERVIEW' 
  | 'HEAT_OVERVIEW'
  | 'DRONE_SURVEY'
  | 'NODE_INSPECTION' 
  | 'FREE_CAMERA' 
  | 'DISASTER_CINEMATIC' 
  | 'CINEMATIC'
  | 'DEPLOYMENT_AERIAL'
  | 'FACTORY_OVERVIEW'
  | 'WATCHTOWER_FOCUS'
  | 'NETWORK_VIEW'
  | 'SIREN_TOP_SHOT'
  | 'EVACUATION_DRONE'
  | 'DRONE_DISASTER'
  // Cinematic Demo modes – scripted camera is driven externally by CinematicDemoManager
  | 'CINEMATIC_DEMO';

// ==========================================
// CINEMATIC DEMO TYPES
// ==========================================

export type CinematicPhase =
  | 'CLOUD_DESCENT'
  | 'LANDSLIDE'
  | 'FLOOD'
  | 'FOREST_FIRE'
  | 'AIR_POLLUTION'
  | 'HEAVY_RAIN'
  | 'MULTIHAZARD'
  | 'EVACUATION'
  | 'FINAL_SHOT'
  | 'FADE_OUT';

export interface CinematicCameraKeyframe {
  /** world-space camera position */
  pos: [number, number, number];
  /** world-space look-at target */
  look: [number, number, number];
  /** seconds to lerp from previous keyframe to this one */
  duration: number;
  /** optional easing label for future reference */
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface CinematicState {
  isActive: boolean;
  phase: CinematicPhase | null;
  phaseProgress: number; // 0–1 within current phase
  overlayOpacity: number; // 0 = transparent, 1 = black
  cloudOpacity: number;   // 0–1 cloud veil
}


export type MapMode = 
  | 'SATELLITE_TERRAIN' 
  | 'TOPOGRAPHIC' 
  | 'SENSOR_NETWORK' 
  | 'HAZARD' 
  | 'RISK' 
  | 'COMMUNICATION';

export type SensorType = 
  | 'WATER_LEVEL_ULTRASONIC' 
  | 'RAINFALL_OPTICAL' 
  | 'TEMP_BME688' 
  | 'HUMIDITY_DHT' 
  | 'SMOKE_MQ2' 
  | 'FLAME_IR' 
  | 'VIBRATION_GEOPHONE' 
  | 'IMU_MPU6050' 
  | 'SOIL_MOISTURE_CAPACITIVE' 
  | 'AIR_QUALITY_SPS30' 
  | 'GAS_MQ135';

export type SensorHealthStatus = 'OK' | 'DEGRADED' | 'FAULT' | 'UNTRUSTED';

export interface SensorReading {
  type: SensorType;
  label: string;
  value: number;
  unit: string;
  baseline: number;
  thresholdWatch: number;
  thresholdWarning: number;
  thresholdCritical: number;
  sensorTrustPct: number; 
  healthStatus: SensorHealthStatus;
  isAnomaly: boolean;
  reSensingActive: boolean;
  weight: number;
  lastTestedTime: number;
}

export type PrototypeNodeId = 'NODE-1' | 'NODE-2' | 'NODE-3' | 'NODE-4';
export type FutureNodeId = string;
export type NodeId = string;

export interface SensorNode {
  id: NodeId;
  name: string;
  role: string;
  hardware: 'ESP32-S3 + SX1262' | 'ESP32-S3 Dual-Core + SX1262 LoRa + 120dB Quad-Horn Buzzer' | 'VIRTUAL_SCALE_NODE';
  isPhysicalPrototype: boolean; // true for Node 1 and Node 2 only
  zone: 'FOREST' | 'RIVER' | 'HILLSIDE' | 'URBAN';
  position: [number, number, number]; // 3D coordinates
  sensors: SensorReading[];
  nodeHealth: 'OPERATIONAL' | 'DEGRADED' | 'FAILED';
  overallSensorTrustPct: number;
  localHazardConfidence: number;
  state: SystemState;
  lastCommunicationTime: number;
  samplingRateHz: number;
  batteryPct: number;
  batteryVoltage: number;
  loraStatus: 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';
  offlineQueue: LoRaPacket[];
  isReSensing: boolean;
  isCorroborating: boolean;
}

export type MessageType = 
  | 'EVENT_ALERT' 
  | 'VERIFY_REQUEST' 
  | 'VERIFY_RESPONSE' 
  | 'HEARTBEAT' 
  | 'SENSOR_FAULT' 
  | 'NODE_STATUS' 
  | 'ACK' 
  | 'EVENT_CLEAR' 
  | 'SYNC_QUEUE'
  | 'CLOUD_UPLOAD';

export interface LoRaPacket {
  id: string;
  sourceNodeId: NodeId | 'LOCAL_COMPUTER';
  destinationNodeId: NodeId | 'LOCAL_COMPUTER' | 'BROADCAST';
  messageType: MessageType;
  eventId?: string;
  eventType?: HazardType;
  timestamp: number;
  sequenceNumber: number;
  sensorTrustPct: number;
  hazardConfidence: number;
  sensorHealth: 'GOOD' | 'DEGRADED' | 'FAULT';
  measurementSummary: Record<string, string | number>;
  crc: 'VALID' | 'CORRUPTED';
  messageStatus: 'TRANSMITTING' | 'DELIVERED' | 'QUEUED' | 'DROPPED';
  rssi: number;
  snr: number;
  frequencyMHz: number;
  progress?: number;
  startPos?: [number, number, number];
  endPos?: [number, number, number];
}

export interface EvidenceItem {
  id: string;
  nodeId: NodeId;
  sensorType: SensorType;
  sensorLabel: string;
  hazardType: HazardType;
  detectedValue: number;
  unit: string;
  sensorTrustPct: number;
  anomalyScore: number;
  reSensedConfirmed: boolean;
  timestamp: number;
  summary: string;
  isCorroboratingEvidence: boolean;
  status: 'SUPPORTING' | 'CONFLICTING' | 'UNTRUSTED';
}

export interface EvidenceLedgerEntry {
  id: string;
  eventId: string;
  timestamp: number;
  timeString: string;
  phase: 'SENSE' | 'VALIDATE' | 'TRUST_CHECK' | 'ANOMALY' | 'RE_SENSE' | 'NEIGHBOUR_QUERY' | 'NEIGHBOUR_RESPONSE' | 'FUSION' | 'DECISION' | 'DECAY';
  action: string;
  nodeId?: NodeId;
  sensorTrustPct?: number;
  hazardConfidenceBefore: number;
  hazardConfidenceAfter: number;
  systemStateBefore: SystemState;
  systemStateAfter: SystemState;
  explanation: string;
  isEscalationTrigger: boolean;
}

export interface ActiveHazard {
  id: string;
  type: HazardType;
  name: string;
  zone: 'FOREST' | 'RIVER' | 'HILLSIDE' | 'URBAN' | 'MULTI';
  severity: HazardSeverity;
  center: [number, number, number];
  radius: number;
  startTime: number;
  intensity: number;
  spreadRate: number;
  windDirectionDeg: number;
  windSpeedMs: number;
  status: 'ACTIVE' | 'CONTAINED' | 'CLEARED';
}

export interface LogEntry {
  id: string;
  timestamp: number;
  timeString: string;
  category: 'HAZARD' | 'SENSOR' | 'LORA' | 'GATEWAY' | 'EVIDENCE' | 'FUSION' | 'SYSTEM' | 'CHAOS' | 'DEPLOYMENT';
  title: string;
  description: string;
  level: 'info' | 'warning' | 'critical' | 'success';
  nodeId?: NodeId;
  packetId?: string;
  sensorTrustPct?: number;
  hazardConfidence?: number;
}

export interface ConfidenceDataPoint {
  timeString: string;
  timestamp: number;
  hazardConfidence: number;
  node1Trust: number;
  node2Trust: number;
  state: SystemState;
  eventNote?: string;
}

export interface DemoStep {
  stepIndex: number;
  totalSteps: number;
  phase: string;
  title: string;
  description: string;
  technicalDetail: string;
  aegisCallout: string;
  systemState: SystemState;
  weather: WeatherMode;
  cameraMode: CameraMode;
  hazardConfidence: number;
  node1Trust: number;
  node2Trust: number;
  durationMs: number;
}

// ==========================================
// COST-EFFICIENT RISK-ADAPTIVE DEPLOYMENT TYPES
// ==========================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskZoneDefinition {
  id: string;
  name: string;
  category: 'FLOODPLAIN' | 'WILDFIRE' | 'LANDSLIDE' | 'POLLUTION' | 'LOW_RISK_BUFFER';
  riskLevel: RiskLevel;
  center: [number, number, number];
  radius: number;
  colorHex: string;
  vulnerabilityFactor: string;
  justification: string;
  targetNodeCount: number;
}

export interface NodePlacementCandidate {
  id: string;
  siteName: string;
  position: [number, number, number];
  riskLevel: RiskLevel;
  zoneCategory: 'FLOODPLAIN' | 'WILDFIRE' | 'LANDSLIDE' | 'POLLUTION' | 'LOW_RISK_BUFFER';
  informationValueScore: number; // 0 - 100
  informationValueLabel: 'HIGH' | 'MEDIUM' | 'LOW';
  recommended: boolean;
  isPhysicalPrototype: boolean;
  rationale: string;
  populationImpact: string;
  terrainFactor: string;
  corroborationPartner?: string;
}

export type VirtualScaleOption = 2 | 5 | 10 | 25 | 50;
