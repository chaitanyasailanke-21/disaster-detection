import { 
  SensorNode, 
  SystemState, 
  HazardType, 
  HazardSeverity, 
  ActiveHazard, 
  LoRaPacket, 
  EvidenceItem, 
  EvidenceLedgerEntry,
  LogEntry, 
  NodeId, 
  SensorType,
  DemoStep,
  ConfidenceDataPoint,
  WeatherMode,
  CameraMode,
  MapMode,
  RiskZoneDefinition,
  NodePlacementCandidate,
  VirtualScaleOption,
  RiskLevel
} from '../types/simulation';
import { soundManager } from '../audio/soundEffects';

// LOCAL COMMAND CENTER POSITION in 3D scene (Rugged Workstation with integrated LoRa Transceiver)
export const LOCAL_COMPUTER_POSITION: [number, number, number] = [0, 2.0, 0];

// EXACT PHYSICAL PROTOTYPE ARCHITECTURE: ESP32-S3 + SX1262 LoRa Edge Mesh + Superior Hub
export const PROTOTYPE_NODES: SensorNode[] = [
  // 1. LANDSLIDE DETECTION NODES
  {
    id: 'NODE-3', // Landslide Node 1
    name: 'Landslide Node 1',
    role: 'Top Node #1 of Landslide Detection · Escarpment Geophone & Soil Saturation Watch',
    hardware: 'ESP32-S3 + SX1262',
    isPhysicalPrototype: true,
    zone: 'HILLSIDE',
    position: [-35.7, 16.84, 41.7], // X = -35.7, Z = 41.7
    nodeHealth: 'OPERATIONAL',
    overallSensorTrustPct: 96,
    localHazardConfidence: 0.04,
    state: 'NORMAL',
    lastCommunicationTime: Date.now() - 900,
    samplingRateHz: 1.0,
    batteryPct: 98,
    batteryVoltage: 3.98,
    loraStatus: 'CONNECTED',
    offlineQueue: [],
    isReSensing: false,
    isCorroborating: false,
    sensors: [
      { type: 'VIBRATION_GEOPHONE', label: 'Seismic Geophone', value: 0.02, unit: 'g', baseline: 0.02, thresholdWatch: 0.30, thresholdWarning: 0.75, thresholdCritical: 1.40, sensorTrustPct: 96, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.35, lastTestedTime: Date.now() },
      { type: 'HUMIDITY_DHT', label: 'Soil Saturation Probe', value: 34.0, unit: '%', baseline: 32.0, thresholdWatch: 70.0, thresholdWarning: 85.0, thresholdCritical: 95.0, sensorTrustPct: 95, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.30, lastTestedTime: Date.now() },
      { type: 'RAINFALL_OPTICAL', label: 'Slope Precipitation Gauge', value: 0.0, unit: 'mm/h', baseline: 0.0, thresholdWatch: 20.0, thresholdWarning: 40.0, thresholdCritical: 70.0, sensorTrustPct: 97, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.20, lastTestedTime: Date.now() },
      { type: 'TEMP_BME688', label: 'BME688 Escarpment Temp', value: 21.8, unit: '°C', baseline: 22.0, thresholdWatch: 35.0, thresholdWarning: 45.0, thresholdCritical: 55.0, sensorTrustPct: 96, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.15, lastTestedTime: Date.now() }
    ]
  },
  {
    id: 'NODE-LANDSLIDE-2', // Landslide Node 2
    name: 'Landslide Node 2',
    role: 'Node #2 of Landslide Detection · Lower Slope Runout Corroboration & Inclinometer',
    hardware: 'ESP32-S3 + SX1262',
    isPhysicalPrototype: true,
    zone: 'HILLSIDE',
    position: [-9.0, 3.2, 34.7], // X: -9.0, Z: 34.7
    nodeHealth: 'OPERATIONAL',
    overallSensorTrustPct: 95,
    localHazardConfidence: 0.03,
    state: 'NORMAL',
    lastCommunicationTime: Date.now() - 950,
    samplingRateHz: 1.0,
    batteryPct: 97,
    batteryVoltage: 3.97,
    loraStatus: 'CONNECTED',
    offlineQueue: [],
    isReSensing: false,
    isCorroborating: false,
    sensors: [
      { type: 'VIBRATION_GEOPHONE', label: 'Runout Seismic Geophone', value: 0.01, unit: 'g', baseline: 0.01, thresholdWatch: 0.25, thresholdWarning: 0.65, thresholdCritical: 1.20, sensorTrustPct: 95, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.35, lastTestedTime: Date.now() },
      { type: 'IMU_MPU6050', label: 'MPU-6050 Slope Inclinometer', value: 0.0, unit: 'deg', baseline: 0.0, thresholdWatch: 4.0, thresholdWarning: 8.0, thresholdCritical: 15.0, sensorTrustPct: 96, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.30, lastTestedTime: Date.now() },
      { type: 'HUMIDITY_DHT', label: 'Colluvium Moisture Sensor', value: 30.0, unit: '%', baseline: 28.0, thresholdWatch: 65.0, thresholdWarning: 80.0, thresholdCritical: 92.0, sensorTrustPct: 94, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.20, lastTestedTime: Date.now() },
      { type: 'TEMP_BME688', label: 'BME688 Lower Terrace Temp', value: 22.4, unit: '°C', baseline: 22.0, thresholdWatch: 35.0, thresholdWarning: 45.0, thresholdCritical: 55.0, sensorTrustPct: 95, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.15, lastTestedTime: Date.now() }
    ]
  },

  // 2. FOREST FIRE DETECTION NODES
  {
    id: 'NODE-2', // Forest Fire Node 1
    name: 'Forest Fire Node 1',
    role: 'Node #1 of Forest Fire Detection · Forest Boundary Smoke & Thermal Sensor',
    hardware: 'ESP32-S3 + SX1262',
    isPhysicalPrototype: true,
    zone: 'FOREST',
    position: [-16.0, 1.2, -12.0], // X = -16.0, Z = -12.0
    nodeHealth: 'OPERATIONAL',
    overallSensorTrustPct: 94,
    localHazardConfidence: 0.05,
    state: 'NORMAL',
    lastCommunicationTime: Date.now() - 1400,
    samplingRateHz: 1.0,
    batteryPct: 96,
    batteryVoltage: 3.96,
    loraStatus: 'CONNECTED',
    offlineQueue: [],
    isReSensing: false,
    isCorroborating: false,
    sensors: [
      { type: 'SMOKE_MQ2', label: 'MQ-2 Gas / Smoke Sensor', value: 16.0, unit: 'ppm', baseline: 15.0, thresholdWatch: 55.0, thresholdWarning: 140.0, thresholdCritical: 280.0, sensorTrustPct: 93, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.30, lastTestedTime: Date.now() },
      { type: 'TEMP_BME688', label: 'BME688 Ambient Temp', value: 24.2, unit: '°C', baseline: 24.0, thresholdWatch: 38.0, thresholdWarning: 52.0, thresholdCritical: 68.0, sensorTrustPct: 96, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.25, lastTestedTime: Date.now() },
      { type: 'FLAME_IR', label: 'Optical IR Flame Sensor', value: 0, unit: 'state', baseline: 0, thresholdWatch: 0.5, thresholdWarning: 0.8, thresholdCritical: 1.0, sensorTrustPct: 92, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.20, lastTestedTime: Date.now() },
      { type: 'VIBRATION_GEOPHONE', label: 'Seismic Geophone', value: 0.02, unit: 'g', baseline: 0.02, thresholdWatch: 0.35, thresholdWarning: 0.80, thresholdCritical: 1.50, sensorTrustPct: 94, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.15, lastTestedTime: Date.now() },
      { type: 'GAS_MQ135', label: 'MQ-135 Gas / Air Quality', value: 35.0, unit: 'AQI (Sim)', baseline: 32.0, thresholdWatch: 90.0, thresholdWarning: 180.0, thresholdCritical: 320.0, sensorTrustPct: 91, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.10, lastTestedTime: Date.now() }
    ]
  },
  {
    id: 'NODE-FIRE-2', // Forest Fire Node 2
    name: 'Forest Fire Node 2',
    role: 'Node #2 of Forest Fire Detection · Deep Timber Flame Optical IR & Combustion Corroboration',
    hardware: 'ESP32-S3 + SX1262',
    isPhysicalPrototype: true,
    zone: 'FOREST',
    position: [-41.6, 2.5, -38.8], // X: -41.6, Z: -38.8
    nodeHealth: 'OPERATIONAL',
    overallSensorTrustPct: 95,
    localHazardConfidence: 0.04,
    state: 'NORMAL',
    lastCommunicationTime: Date.now() - 1200,
    samplingRateHz: 1.0,
    batteryPct: 97,
    batteryVoltage: 3.97,
    loraStatus: 'CONNECTED',
    offlineQueue: [],
    isReSensing: false,
    isCorroborating: false,
    sensors: [
      { type: 'FLAME_IR', label: 'Deep Timber IR Flame Sensor', value: 0, unit: 'state', baseline: 0, thresholdWatch: 0.5, thresholdWarning: 0.8, thresholdCritical: 1.0, sensorTrustPct: 94, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.35, lastTestedTime: Date.now() },
      { type: 'SMOKE_MQ2', label: 'MQ-2 Combustion Smoke Sensor', value: 14.0, unit: 'ppm', baseline: 14.0, thresholdWatch: 50.0, thresholdWarning: 130.0, thresholdCritical: 260.0, sensorTrustPct: 93, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.30, lastTestedTime: Date.now() },
      { type: 'TEMP_BME688', label: 'BME688 Canopy Thermal Probe', value: 23.0, unit: '°C', baseline: 23.0, thresholdWatch: 38.0, thresholdWarning: 50.0, thresholdCritical: 66.0, sensorTrustPct: 95, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.20, lastTestedTime: Date.now() },
      { type: 'GAS_MQ135', label: 'MQ-135 Carbon Monoxide & Gas', value: 28.0, unit: 'AQI', baseline: 28.0, thresholdWatch: 75.0, thresholdWarning: 150.0, thresholdCritical: 290.0, sensorTrustPct: 92, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.15, lastTestedTime: Date.now() }
    ]
  },

  // 3. FLOOD DETECTION NODES
  {
    id: 'NODE-FLOOD-1', // Flood Node 1
    name: 'Flood Node 1',
    role: 'Node #1 of Flood Detection · Upstream Mountain Runoff & River Surge Sensor',
    hardware: 'ESP32-S3 + SX1262',
    isPhysicalPrototype: true,
    zone: 'RIVER',
    position: [17.6, 0.45, -53.3], // X: 17.6, Z: -53.3 (upstream mountain gorge)
    nodeHealth: 'OPERATIONAL',
    overallSensorTrustPct: 96,
    localHazardConfidence: 0.04,
    state: 'NORMAL',
    lastCommunicationTime: Date.now() - 1000,
    samplingRateHz: 1.0,
    batteryPct: 96,
    batteryVoltage: 3.95,
    loraStatus: 'CONNECTED',
    offlineQueue: [],
    isReSensing: false,
    isCorroborating: false,
    sensors: [
      { type: 'WATER_LEVEL_ULTRASONIC', label: 'HC-SR04 Mountain Runoff Gauge', value: 1.15, unit: 'm', baseline: 1.10, thresholdWatch: 2.60, thresholdWarning: 3.90, thresholdCritical: 5.10, sensorTrustPct: 96, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.40, lastTestedTime: Date.now() },
      { type: 'RAINFALL_OPTICAL', label: 'Gorge Catchment Optical Rain', value: 0.0, unit: 'mm/h', baseline: 0.0, thresholdWatch: 24.0, thresholdWarning: 48.0, thresholdCritical: 78.0, sensorTrustPct: 97, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.30, lastTestedTime: Date.now() },
      { type: 'TEMP_BME688', label: 'BME688 Mountain River Temp', value: 20.8, unit: '°C', baseline: 21.0, thresholdWatch: 34.0, thresholdWarning: 45.0, thresholdCritical: 58.0, sensorTrustPct: 96, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.15, lastTestedTime: Date.now() },
      { type: 'HUMIDITY_DHT', label: 'DHT22 Canyon Humidity', value: 72.0, unit: '%', baseline: 70.0, thresholdWatch: 86.0, thresholdWarning: 94.0, thresholdCritical: 99.0, sensorTrustPct: 95, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.15, lastTestedTime: Date.now() }
    ]
  },
  {
    id: 'NODE-1', // Flood Node 2
    name: 'Flood Node 2',
    role: 'Top Node #2 of Flood Detection · Valley Embankment & Inundation Corroboration',
    hardware: 'ESP32-S3 + SX1262',
    isPhysicalPrototype: true,
    zone: 'RIVER',
    position: [7.2, -0.42, 32.2], // X: 7.2, Y: -0.42, Z: 32.2 (Embankment Level)
    nodeHealth: 'OPERATIONAL',
    overallSensorTrustPct: 95,
    localHazardConfidence: 0.04,
    state: 'NORMAL',
    lastCommunicationTime: Date.now() - 1100,
    samplingRateHz: 1.0,
    batteryPct: 95,
    batteryVoltage: 3.94,
    loraStatus: 'CONNECTED',
    offlineQueue: [],
    isReSensing: false,
    isCorroborating: false,
    sensors: [
      { type: 'WATER_LEVEL_ULTRASONIC', label: 'HC-SR04 Embankment Level', value: 1.25, unit: 'm', baseline: 1.20, thresholdWatch: 2.80, thresholdWarning: 4.20, thresholdCritical: 5.40, sensorTrustPct: 95, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.40, lastTestedTime: Date.now() },
      { type: 'RAINFALL_OPTICAL', label: 'Optical Rain Sensor', value: 0.0, unit: 'mm/h', baseline: 0.0, thresholdWatch: 22.0, thresholdWarning: 45.0, thresholdCritical: 75.0, sensorTrustPct: 96, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.30, lastTestedTime: Date.now() },
      { type: 'TEMP_BME688', label: 'BME688 Corridor Temp', value: 23.5, unit: '°C', baseline: 23.5, thresholdWatch: 36.0, thresholdWarning: 48.0, thresholdCritical: 60.0, sensorTrustPct: 97, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.15, lastTestedTime: Date.now() },
      { type: 'HUMIDITY_DHT', label: 'DHT22 Floodplain Humidity', value: 68.0, unit: '%', baseline: 68.0, thresholdWatch: 85.0, thresholdWarning: 92.0, thresholdCritical: 98.0, sensorTrustPct: 94, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.15, lastTestedTime: Date.now() }
    ]
  },

  // 4. SUPERIOR NODE: Watch Tower 01 Master Evidence Hub & 120dB Buzzer
  {
    id: 'NODE-SUPERIOR',
    name: 'Watch Tower 01 — Superior ESP32 Node',
    role: 'Master Evidence Fusion Hub & 120dB Quad-Horn Village Buzzer / Siren',
    hardware: 'ESP32-S3 Dual-Core + SX1262 LoRa + 120dB Quad-Horn Buzzer',
    isPhysicalPrototype: true,
    zone: 'URBAN',
    position: [42.5, 14.5, 2.5],
    nodeHealth: 'OPERATIONAL',
    overallSensorTrustPct: 99,
    localHazardConfidence: 0.02,
    state: 'NORMAL',
    lastCommunicationTime: Date.now() - 300,
    samplingRateHz: 2.0,
    batteryPct: 100,
    batteryVoltage: 4.18,
    loraStatus: 'CONNECTED',
    offlineQueue: [],
    isReSensing: false,
    isCorroborating: false,
    sensors: [
      { type: 'AIR_QUALITY_SPS30', label: 'Superior Ambient SPS30 Laser Particle Sensor', value: 12.0, unit: 'µg/m³', baseline: 12.0, thresholdWatch: 45.0, thresholdWarning: 80.0, thresholdCritical: 150.0, sensorTrustPct: 99, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.25, lastTestedTime: Date.now() },
      { type: 'GAS_MQ135', label: 'Superior Multi-Gas Air Quality Sensor', value: 28.0, unit: 'AQI', baseline: 28.0, thresholdWatch: 75.0, thresholdWarning: 150.0, thresholdCritical: 280.0, sensorTrustPct: 99, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.20, lastTestedTime: Date.now() },
      { type: 'TEMP_BME688', label: 'Watch Tower Meteorological Temp', value: 22.8, unit: '°C', baseline: 23.0, thresholdWatch: 36.0, thresholdWarning: 48.0, thresholdCritical: 60.0, sensorTrustPct: 99, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.20, lastTestedTime: Date.now() },
      { type: 'RAINFALL_OPTICAL', label: 'High-Altitude Precipitation Gauge', value: 0.0, unit: 'mm/h', baseline: 0.0, thresholdWatch: 25.0, thresholdWarning: 50.0, thresholdCritical: 80.0, sensorTrustPct: 99, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.15, lastTestedTime: Date.now() },
      { type: 'VIBRATION_GEOPHONE', label: 'Tower Structural Foundation Monitor', value: 0.01, unit: 'g', baseline: 0.01, thresholdWatch: 0.30, thresholdWarning: 0.70, thresholdCritical: 1.20, sensorTrustPct: 99, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.20, lastTestedTime: Date.now() }
    ]
  }
];

// WATCH TOWER BASE POSITION (X: 40 to 45, Z: 0 to 5)
export const WATCHTOWER_POSITION: [number, number, number] = [42.5, 0.48, 2.5];

// ==========================================
// COST-EFFICIENT RISK-ADAPTIVE DEPLOYMENT DEFINITIONS
// "Do not cover every square meter. Place nodes where they provide the most important environmental evidence."
// ==========================================

export const RISK_ZONES: RiskZoneDefinition[] = [
  {
    id: 'ZONE-FLOOD',
    name: 'River Corridor & Floodplain Basin',
    category: 'FLOODPLAIN',
    riskLevel: 'CRITICAL',
    center: [14, 0.6, -6],
    radius: 11.5,
    colorHex: '#ef4444', // Red
    vulnerabilityFactor: 'Dense settlement directly downstream of bridge constriction and river meander.',
    justification: 'Critical bottleneck: Rapid catchment rise inundates residential access roads.',
    targetNodeCount: 2
  },
  {
    id: 'ZONE-FIRE',
    name: 'Sector Alpha — Forest Reserve Boundary',
    category: 'WILDFIRE',
    riskLevel: 'HIGH',
    center: [-16, 1.2, -12],
    radius: 12.0,
    colorHex: '#f97316', // Orange
    vulnerabilityFactor: 'Dense coniferous timber with prevailing seasonal dry winds toward village.',
    justification: 'High ignition probability: Early perimeter smoke detection halts crown propagation.',
    targetNodeCount: 2
  },
  {
    id: 'ZONE-SLOPE',
    name: 'Western Escarpment Slope & Cut Road (Pinned Landslide Zone)',
    category: 'LANDSLIDE',
    riskLevel: 'HIGH',
    center: [-28.0, 9.0, 32.0],
    radius: 17.5,
    colorHex: '#f59e0b', // Amber
    vulnerabilityFactor: 'Steep 42° fractured shale escarpment enclosed by Pins [-42, 43.3], [-12.6, 34], [-36.8, 19.4].',
    justification: 'Slope saturation triggers sudden soil slip; geophone & tilt sensing provide vital minutes.',
    targetNodeCount: 1
  },
  {
    id: 'ZONE-POLLUTION',
    name: 'Industrial Processing Corridor',
    category: 'POLLUTION',
    riskLevel: 'MEDIUM',
    center: [18, 2.0, 24],
    radius: 7.5,
    colorHex: '#eab308', // Yellow
    vulnerabilityFactor: 'Commercial processing plants with toxic particulate stack potential.',
    justification: 'Downwind tracking across atmospheric corridor into residential valley.',
    targetNodeCount: 1
  },
  {
    id: 'ZONE-BUFFER',
    name: 'Stable Agricultural Open Buffer',
    category: 'LOW_RISK_BUFFER',
    riskLevel: 'LOW',
    center: [-2, 1.0, 4],
    radius: 16.0,
    colorHex: '#10b981', // Green
    vulnerabilityFactor: 'Flat pastureland with natural subterranean drainage and zero slope.',
    justification: 'LOW INFORMATION VALUE: Dense sensor placement here wastes hardware with zero hazard risk.',
    targetNodeCount: 0 // Zero nodes needed!
  }
];

// 50 Procedural Placement Candidates evaluated by the Simulated Information-Value Model
export const PLACEMENT_CANDIDATES: NodePlacementCandidate[] = [
  // 1. Prototype Node 1
  {
    id: 'SITE-01',
    siteName: 'Site 1: River Flooding Hydrological Station (NODE 01)',
    position: [10.6, -0.63, 17.9],
    riskLevel: 'CRITICAL',
    zoneCategory: 'FLOODPLAIN',
    informationValueScore: 98,
    informationValueLabel: 'HIGH',
    recommended: true,
    isPhysicalPrototype: true,
    rationale: 'In-channel hydrological station positioned directly at the river flooding constriction (X: 10.6, Y: 17.9, elevation: -0.63m). Measures ultrasonic water level, surge rates, and precipitation in river basin.',
    populationImpact: 'Protects 340 homes in downstream floodplain',
    terrainFactor: 'River corridor channel bed with direct stream gauge monitoring',
    corroborationPartner: 'NODE-2 (Rainfall corridor correlation)'
  },
  // 2. Prototype Node 2
  {
    id: 'SITE-02',
    siteName: 'Site 2: Timberland Perimeter Ridge (NODE 02)',
    position: [-16, 1.2, -12],
    riskLevel: 'HIGH',
    zoneCategory: 'WILDFIRE',
    informationValueScore: 94,
    informationValueLabel: 'HIGH',
    recommended: true,
    isPhysicalPrototype: true,
    rationale: 'Upwind perimeter of dense pine woods. Intercepts dry seasonal firefronts before village.',
    populationImpact: 'Direct shield for eastern residential boundary',
    terrainFactor: 'Boundary knoll with unobstructed line-of-sight LoRa',
    corroborationPartner: 'NODE-1 (Regional weather & thermal corroboration)'
  },
  // 3. Prototype Node 3 (Escarpment & Slope)
  {
    id: 'SITE-03',
    siteName: 'Site 3: Pinned Escarpment Boulder Ridge (NODE 03)',
    position: [-35.7, 16.84, 41.7],
    riskLevel: 'HIGH',
    zoneCategory: 'LANDSLIDE',
    informationValueScore: 95,
    informationValueLabel: 'HIGH',
    recommended: true,
    isPhysicalPrototype: true,
    rationale: 'Toe of unstable shale slope inside the pinned landslide boundary (Pins: [-42, 43.3], [-12.6, 34], [-36.8, 19.4]). Seismic geophone & capacitive soil moisture capture slope liquefaction.',
    populationImpact: 'Protects critical transit road below pinned escarpment',
    terrainFactor: '42° inclination slope with historical creep and natural boulder anchor in pinned hazard zone',
    corroborationPartner: 'NODE-1 & NODE-2'
  },
  // 4. Virtual Node 4 (River Meander)
  {
    id: 'SITE-04',
    siteName: 'Site 4: River Meander Neck (Virtual)',
    position: [16, 0.4, 4],
    riskLevel: 'HIGH',
    zoneCategory: 'FLOODPLAIN',
    informationValueScore: 88,
    informationValueLabel: 'HIGH',
    recommended: true,
    isPhysicalPrototype: false,
    rationale: 'Overbank spillway zone where water breaches farmland prior to entering streets.',
    populationImpact: 'Early surge detection 15 minutes before village flood',
    terrainFactor: 'Natural levee low spot',
    corroborationPartner: 'NODE-1'
  },
  // 5. Prototype Node 4 (Watch Tower Atmospheric Station)
  {
    id: 'SITE-05',
    siteName: 'Site 5: Watch Tower Atmospheric Air Tower (NODE 04)',
    position: [48.0, 0.48, 2.5],
    riskLevel: 'HIGH',
    zoneCategory: 'POLLUTION',
    informationValueScore: 94,
    informationValueLabel: 'HIGH',
    recommended: true,
    isPhysicalPrototype: true,
    rationale: 'Tall atmospheric monitoring mast deployed at Watch Tower compound. SPS30 Laser PM2.5/PM10 and MQ-135 sensors detect hazardous plumes and airborne contaminants entering the village settlement corridor.',
    populationImpact: 'Direct shield for village residential settlement and primary school downwind',
    terrainFactor: 'Elevated Watch Tower mast with optimal line-of-sight LoRa mesh to all sectors',
    corroborationPartner: 'NODE-SUPERIOR & NODE-2'
  },
  // Generate remaining virtual candidate sites (6-50)
  ...Array.from({ length: 45 }, (_, idx) => {
    const siteNum = idx + 6;
    // Pockets of risk vs buffer
    const isForestPocket = idx < 12;
    const isFloodPocket = idx >= 12 && idx < 24;
    const isSlopePocket = idx >= 24 && idx < 32;
    const isLowRiskOpenField = idx >= 32;

    let pos: [number, number, number];
    let risk: RiskLevel;
    let cat: 'FLOODPLAIN' | 'WILDFIRE' | 'LANDSLIDE' | 'POLLUTION' | 'LOW_RISK_BUFFER';
    let valScore: number;
    let recommended: boolean;

    if (isForestPocket) {
      pos = [-24 + (idx % 4) * 4, 1.4, -18 + Math.floor(idx / 4) * 4];
      risk = 'HIGH';
      cat = 'WILDFIRE';
      valScore = 75 - (idx % 5) * 5;
      recommended = true;
    } else if (isFloodPocket) {
      pos = [11 + (idx % 3) * 3, 0.3, -16 + (idx - 12) * 2.5];
      risk = 'CRITICAL';
      cat = 'FLOODPLAIN';
      valScore = 85 - (idx % 4) * 4;
      recommended = true;
    } else if (isSlopePocket) {
      pos = [-14 + (idx % 3) * 4, 3.8, 8 + (idx - 24) * 2];
      risk = 'HIGH';
      cat = 'LANDSLIDE';
      valScore = 78 - (idx % 4) * 6;
      recommended = true;
    } else {
      // Open buffer pasture: LOW VALUE! Not recommended!
      pos = [-6 + (idx % 4) * 3.5, 0.8, -2 + (idx - 32) * 2];
      risk = 'LOW';
      cat = 'LOW_RISK_BUFFER';
      valScore = 22 - (idx % 3) * 5;
      recommended = false; // REJECTED! Cost-efficient placement skips low risk fields!
    }

    return {
      id: `SITE-${siteNum.toString().padStart(2, '0')}`,
      siteName: `Site ${siteNum}: ${cat === 'LOW_RISK_BUFFER' ? 'Pasture Field (Low Value)' : cat + ' Perimeter'}`,
      position: pos,
      riskLevel: risk,
      zoneCategory: cat,
      informationValueScore: valScore,
      informationValueLabel: valScore > 70 ? 'HIGH' : valScore > 40 ? 'MEDIUM' : 'LOW',
      recommended: recommended,
      isPhysicalPrototype: false,
      rationale: recommended 
        ? 'High vulnerability pocket. Contributes valuable corroboration evidence.' 
        : 'LOW INFORMATION VALUE: Uniform dense placement here wastes budget with no hazard benefit.',
      populationImpact: recommended ? 'Protects localized infrastructure' : 'Minimal human exposure',
      terrainFactor: recommended ? 'Hazard-prone feature' : 'Stable flat terrain'
    } as NodePlacementCandidate;
  })
];

// ==========================================
// 90-SECOND JUDGE DEMO STORYLINE (Refined for SIH 2026)
// Incorporates the Cost-Efficient Targeted Deployment Moment!
// ==========================================
export const JUDGE_DEMO_STEPS: DemoStep[] = [
  {
    stepIndex: 1,
    totalSteps: 9,
    phase: '1. NORMAL → RAIN / DISASTER OCCURRENCE',
    title: '1. NORMAL → Environmental Change & Rain Occurrence',
    description: 'System begins in NORMAL state. Rain / environmental change / disaster occurrence begins across the catchment.',
    technicalDetail: 'NORMAL ↓ RAIN / ENVIRONMENTAL CHANGE / DISASTER OCCURRENCE. Baseline sensors monitor at 1.0 Hz.',
    aegisCallout: 'NARRATIVE: NORMAL ↓ RAIN / ENVIRONMENTAL CHANGE / DISASTER OCCURRENCE',
    systemState: 'NORMAL',
    weather: 'RAIN',
    cameraMode: 'COMMAND_CENTER',
    hazardConfidence: 0.05,
    node1Trust: 95,
    node2Trust: 94,
    durationMs: 8000
  },
  {
    stepIndex: 2,
    totalSteps: 9,
    phase: '2. ANOMALY DETECTED → "IS THIS REAL?"',
    title: '2. ANOMALY DETECTED → "IS THIS REAL?"',
    description: 'Primary edge node detects an environmental anomaly. Instead of triggering a false alarm immediately, the edge intelligence asks: "IS THIS REAL?"',
    technicalDetail: 'ANOMALY DETECTED ↓ "IS THIS REAL?" — Single sensor spike isolated for local verification.',
    aegisCallout: 'NARRATIVE: ANOMALY DETECTED ↓ "IS THIS REAL?"',
    systemState: 'WATCH',
    weather: 'HEAVY_RAIN',
    cameraMode: 'FLOOD_OVERVIEW',
    hazardConfidence: 0.35,
    node1Trust: 95,
    node2Trust: 94,
    durationMs: 8000
  },
  {
    stepIndex: 3,
    totalSteps: 9,
    phase: '3. RE-SENSE → PERSISTENT EVIDENCE',
    title: '3. RE-SENSE (5 Hz Burst) → PERSISTENT EVIDENCE',
    description: 'Node spikes sampling from 1 Hz to 5 Hz (RE-SENSE) and confirms PERSISTENT EVIDENCE rather than transient noise.',
    technicalDetail: 'RE-SENSE ↓ PERSISTENT EVIDENCE — 5 Hz adaptive burst confirms sustained physical hazard.',
    aegisCallout: 'NARRATIVE: RE-SENSE ↓ PERSISTENT EVIDENCE',
    systemState: 'WATCH',
    weather: 'HEAVY_RAIN',
    cameraMode: 'NODE_INSPECTION',
    hazardConfidence: 0.52,
    node1Trust: 95,
    node2Trust: 94,
    durationMs: 8000
  },
  {
    stepIndex: 4,
    totalSteps: 9,
    phase: '4. "ASK THE NEIGHBOUR" → LoRa VERIFY_REQUEST',
    title: '4. "ASK THE NEIGHBOUR" → LoRa VERIFY_REQUEST Beam',
    description: 'Primary node executes "ASK THE NEIGHBOUR" and transmits a LoRa VERIFY_REQUEST energy beam to its neighbouring node.',
    technicalDetail: '"ASK THE NEIGHBOUR" ↓ LoRa VERIFY_REQUEST — Peer-to-peer SX1262 LoRa verification beam active.',
    aegisCallout: 'NARRATIVE: "ASK THE NEIGHBOUR" ↓ LoRa VERIFY_REQUEST',
    systemState: 'WATCH',
    weather: 'HEAVY_RAIN',
    cameraMode: 'NETWORK_VIEW',
    hazardConfidence: 0.62,
    node1Trust: 95,
    node2Trust: 94,
    durationMs: 8000
  },
  {
    stepIndex: 5,
    totalSteps: 9,
    phase: '5. INDEPENDENT CORROBORATION → LoRa VERIFY_RESPONSE',
    title: '5. INDEPENDENT CORROBORATION → LoRa VERIFY_RESPONSE Beam',
    description: 'Neighbouring node performs INDEPENDENT CORROBORATION and beams back a LoRa VERIFY_RESPONSE confirming the disaster.',
    technicalDetail: 'INDEPENDENT CORROBORATION ↓ LoRa VERIFY_RESPONSE — Dual-node corroboration achieved.',
    aegisCallout: 'NARRATIVE: INDEPENDENT CORROBORATION ↓ LoRa VERIFY_RESPONSE',
    systemState: 'WATCH',
    weather: 'STORM',
    cameraMode: 'NETWORK_VIEW',
    hazardConfidence: 0.74,
    node1Trust: 95,
    node2Trust: 94,
    durationMs: 8000
  },
  {
    stepIndex: 6,
    totalSteps: 9,
    phase: '6. SUPERIOR NODE → EVIDENCE FUSION',
    title: '6. SUPERIOR NODE → EVIDENCE FUSION',
    description: 'Verified telemetry beams converge on the Watch Tower 01 SUPERIOR NODE for Bayesian EVIDENCE FUSION.',
    technicalDetail: 'SUPERIOR NODE ↓ EVIDENCE FUSION ↓ CONFIDENCE > ALERT THRESHOLD (0.88 > 0.75).',
    aegisCallout: 'NARRATIVE: SUPERIOR NODE ↓ EVIDENCE FUSION ↓ CONFIDENCE > ALERT THRESHOLD',
    systemState: 'WARNING',
    weather: 'STORM',
    cameraMode: 'WATCHTOWER_FOCUS',
    hazardConfidence: 0.88,
    node1Trust: 95,
    node2Trust: 94,
    durationMs: 8000
  },
  {
    stepIndex: 7,
    totalSteps: 9,
    phase: '7. CONFIDENCE > ALERT THRESHOLD → WARNING → BUZZER / SIREN',
    title: '7. WARNING → 120dB WATCH TOWER BUZZER / SIREN',
    description: 'CONFIDENCE > ALERT THRESHOLD triggers system WARNING and activates the Watch Tower 01 quad-horn BUZZER / SIREN.',
    technicalDetail: 'CONFIDENCE > ALERT THRESHOLD ↓ WARNING ↓ BUZZER / SIREN — Village acoustic evacuation shockwaves active.',
    aegisCallout: 'NARRATIVE: CONFIDENCE > ALERT THRESHOLD ↓ WARNING ↓ BUZZER / SIREN',
    systemState: 'CRITICAL',
    weather: 'STORM',
    cameraMode: 'WATCHTOWER_FOCUS',
    hazardConfidence: 0.94,
    node1Trust: 95,
    node2Trust: 94,
    durationMs: 8000
  },
  {
    stepIndex: 8,
    totalSteps: 9,
    phase: '8. WAN FAILURE → LOCAL EDGE OPERATION CONTINUES',
    title: '8. WAN FAILURE → LOCAL EDGE OPERATION CONTINUES',
    description: 'External WAN / cloud internet fails completely (WAN FAILURE), yet LOCAL EDGE OPERATION CONTINUES autonomously over LoRa.',
    technicalDetail: 'WAN FAILURE ↓ LOCAL EDGE OPERATION CONTINUES — 100% zero-cloud edge resilience.',
    aegisCallout: 'NARRATIVE: WAN FAILURE ↓ LOCAL EDGE OPERATION CONTINUES',
    systemState: 'CRITICAL',
    weather: 'STORM',
    cameraMode: 'COMMAND_CENTER',
    hazardConfidence: 0.94,
    node1Trust: 95,
    node2Trust: 94,
    durationMs: 8000
  },
  {
    stepIndex: 9,
    totalSteps: 9,
    phase: '9. BACK TO NORMAL → CLOUD DATA UPLOADED & SAVED',
    title: '9. Back to Normal → Red Plasma Beam Cloud Upload to Satellite',
    description: 'Hazard complete and system returns to NORMAL. Watch Tower 01 Superior Node transmits a RED volumetric plasma beam to the Orbital Satellite, uploading and saving all edge ledger data to the cloud.',
    technicalDetail: 'HAZARD COMPLETE / BACK TO NORMAL ↓ CLOUD DATA UPLOADED & SAVED — Red plasma beam from NODE-SUPERIOR to NODE-SATELLITE.',
    aegisCallout: 'NARRATIVE COMPLETE: CLOUD DATA UPLOADED & SAVED VIA SATELLITE',
    systemState: 'NORMAL',
    weather: 'CLEAR',
    cameraMode: 'DEPLOYMENT_AERIAL',
    hazardConfidence: 0.05,
    node1Trust: 95,
    node2Trust: 94,
    durationMs: 10000
  }
];

export const NARRATIVE_FLOW_STEPS = [
  'NORMAL',
  'RAIN / ENVIRONMENTAL CHANGE / DISASTER OCCURRENCE',
  'ANOMALY DETECTED',
  '"IS THIS REAL?"',
  'RE-SENSE',
  'PERSISTENT EVIDENCE',
  '"ASK THE NEIGHBOUR"',
  'LoRa VERIFY_REQUEST',
  'INDEPENDENT CORROBORATION',
  'LoRa VERIFY_RESPONSE',
  'SUPERIOR NODE',
  'EVIDENCE FUSION',
  'CONFIDENCE > ALERT THRESHOLD',
  'WARNING',
  'BUZZER / SIREN',
  'WAN FAILURE',
  'LOCAL EDGE OPERATION CONTINUES',
  'HAZARD COMPLETE / BACK TO NORMAL',
  'CLOUD DATA UPLOADED & SAVED'
] as const;

export class SimulationEngine {
  // Prototype nodes: exactly 2 physical ESP32-S3 nodes
  public prototypeNodes: SensorNode[] = JSON.parse(JSON.stringify(PROTOTYPE_NODES));
  public isFutureScaleMode: boolean = false;
  public virtualScaleCount: VirtualScaleOption = 2;
  public futureScaleNodeCount: number = 2;

  public setFutureScaleMode(active: boolean, count?: number) {
    this.isFutureScaleMode = active;
    if (count) {
      this.futureScaleNodeCount = count;
      this.virtualScaleCount = (count as VirtualScaleOption) || 2;
    }
    this.notify();
  }

  // Cost-Efficient Risk-Adaptive Deployment Layer states
  public isRiskHeatmapActive: boolean = false;
  public isNodePlacementActive: boolean = false;
  public isDenseGridComparisonActive: boolean = false;

  // Temporary Scale & Coordinate Grid Layer (Pinned Landslide Hazard Zone)
  public isCoordinateGridActive: boolean = false;
  public coordinatePins: Array<{ id: string; x: number; y: number; z: number; label: string }> = [
    { id: 'PIN-LS-1', x: -42.0, y: 19.8, z: 43.3, label: '📍 Escarpment Crest Pin 1 [X: -42, Z: 43.3]' },
    { id: 'PIN-LS-2', x: -12.6, y: 6.2, z: 34.0, label: '📍 Slope Toe Pin 2 [X: -12.6, Z: 34]' },
    { id: 'PIN-LS-3', x: -36.8, y: 8.8, z: 19.4, label: '📍 Southern Flank Pin 3 [X: -36.8, Z: 19.4]' }
  ];

  public setCoordinateGrid(active: boolean) {
    this.isCoordinateGridActive = active;
    this.notify();
  }

  public addCoordinatePin(x: number, y: number, z: number, label?: string) {
    const pinId = `PIN-${Date.now()}-${this.coordinatePins.length + 1}`;
    const newPin = {
      id: pinId,
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(2)),
      z: Number(z.toFixed(1)),
      label: label || `Pin ${this.coordinatePins.length + 1}`
    };
    this.coordinatePins.push(newPin);
    this.notify();
    return newPin;
  }

  public clearCoordinatePins() {
    this.coordinatePins = [];
    this.notify();
  }

  public removeCoordinatePin(id: string) {
    this.coordinatePins = this.coordinatePins.filter(p => p.id !== id);
    this.notify();
  }

  // WATCH TOWER 01 — ESP32 SUPERIOR NODE & VILLAGE ALARM SIREN / BUZZER
  public isWatchtowerSirenActive: boolean = false;
  public watchtowerSirenMode: 'SIREN' | 'BUZZER' = 'SIREN';
  public watchtowerSoundwaveProgress: number = 0;
  public watchtowerEvidenceValidationPct: number = 98;
  public isWatchtowerAudioMuted: boolean = false;
  public watchtowerAcousticDecibels: number = 120; // 120 dB SPL at tower source

  public triggerWatchtowerAlarm(active: boolean, mode: 'SIREN' | 'BUZZER' = 'SIREN') {
    this.isWatchtowerSirenActive = active;
    this.watchtowerSirenMode = mode;
    if (active) {
      if (!this.isWatchtowerAudioMuted) {
        soundManager.startWatchtowerSiren(mode);
      }
    } else {
      soundManager.stopWatchtowerSiren();
    }
    this.notify();
  }

  public toggleWatchtowerAudioMute() {
    this.isWatchtowerAudioMuted = !this.isWatchtowerAudioMuted;
    if (this.isWatchtowerAudioMuted) {
      soundManager.stopWatchtowerSiren();
    } else if (this.isWatchtowerSirenActive) {
      soundManager.startWatchtowerSiren(this.watchtowerSirenMode);
    }
    this.notify();
  }

  public setWatchtowerSirenMode(mode: 'SIREN' | 'BUZZER') {
    this.watchtowerSirenMode = mode;
    if (this.isWatchtowerSirenActive && !this.isWatchtowerAudioMuted) {
      soundManager.startWatchtowerSiren(mode);
    }
    this.notify();
  }

  public systemState: SystemState = 'NORMAL';
  public activeHazard: ActiveHazard | null = null;
  
  // Dynamic Environment & Camera (Daylight / Overcast high visibility)
  public weatherMode: WeatherMode = 'CLEAR';
  public cameraMode: CameraMode = 'COMMAND_CENTER';
  public mapMode: MapMode = 'SATELLITE_TERRAIN';
  public isInternetOnline: boolean = true;

  // Wind simulation controls
  public windDirectionDeg: number = 45;
  public windSpeedMs: number = 8.5;

  // SEPARATE TRUST & CONFIDENCE
  public aggregatedHazardConfidence: number = 0.05;
  public node1TrustPct: number = 95;
  public node2TrustPct: number = 94;
  public node3TrustPct: number = 96;
  public node4TrustPct: number = 95;

  public evidencePool: EvidenceItem[] = [];
  public evidenceLedger: EvidenceLedgerEntry[] = [];
  public confidenceHistory: ConfidenceDataPoint[] = [];
  public activePackets: LoRaPacket[] = [];
  public logs: LogEntry[] = [];

  public isPaused: boolean = false;
  public simulationSpeed: number = 1.0;
  public packetSeqCounter: number = 100;
  
  // Scenarios flags
  public activeScenarioName: string = 'NORMAL_NETWORK';
  public isFalseAlarmScenarioActive: boolean = false;
  public falseAlarmBanner: string | null = null;
  public confirmedEventBanner: string | null = null;

  // 19-Step Narrative Flow State
  public currentNarrativeStepIndex: number = 0;
  public currentNarrativeStepLabel: string = NARRATIVE_FLOW_STEPS[0];
  public isCloudUploading: boolean = false;
  private narrativeTimerIds: Array<ReturnType<typeof setTimeout>> = [];
  private cloudUploadTimerId: ReturnType<typeof setTimeout> | null = null;

  public setNarrativeStep(index: number) {
    const clamped = Math.max(0, Math.min(NARRATIVE_FLOW_STEPS.length - 1, index));
    this.currentNarrativeStepIndex = clamped;
    this.currentNarrativeStepLabel = NARRATIVE_FLOW_STEPS[clamped];
    this.notify();
  }

  private clearNarrativeTimers() {
    this.narrativeTimerIds.forEach(id => clearTimeout(id));
    this.narrativeTimerIds = [];
    if (this.cloudUploadTimerId) {
      clearTimeout(this.cloudUploadTimerId);
      this.cloudUploadTimerId = null;
    }
    this.isCloudUploading = false;
  }

  public triggerCloudDataUpload(durationMs: number = 9000) {
    this.isInternetOnline = true;
    this.isCloudUploading = true;
    this.setNarrativeStep(17); // HAZARD COMPLETE / BACK TO NORMAL

    // Dispatch red volumetric plasma beam from Superior Node -> Satellite immediately
    this.dispatchLoRaPacket('NODE-SUPERIOR', 'NODE-SATELLITE', 'CLOUD_UPLOAD', {
      status: 'CLOUD_ARCHIVE_SYNC',
      ledger_records: this.evidenceLedger.length,
      uplink: 'KA_BAND_SATELLITE'
    });

    const step18Tid = setTimeout(() => {
      this.setNarrativeStep(18); // CLOUD DATA UPLOADED & SAVED
      this.dispatchLoRaPacket('NODE-SUPERIOR', 'NODE-SATELLITE', 'CLOUD_UPLOAD', {
        status: 'CLOUD_DATA_SAVED',
        saved_events: this.evidenceLedger.length,
        integrity: 'SHA256_VERIFIED'
      });
      this.addLedgerEntry(
        'DECISION',
        'CLOUD DATA UPLOADED & SAVED: Superior Node transmitted buffered edge evidence ledger to Orbital Satellite via Ka-Band uplink',
        'NODE-SUPERIOR',
        99,
        0.05,
        0.05,
        'NORMAL',
        'NARRATIVE: LOCAL EDGE OPERATION CONTINUES ↓ HAZARD COMPLETE / BACK TO NORMAL ↓ CLOUD DATA UPLOADED & SAVED'
      );
      this.addLog(
        'GATEWAY',
        'CLOUD DATA UPLOADED & SAVED (SUPERIOR NODE → SATELLITE)',
        'Hazard resolved & system back to NORMAL. Full edge telemetry & evidence ledger uploaded via red plasma beam to Orbital Satellite and saved to cloud.',
        'success',
        'NODE-SUPERIOR'
      );
    }, 650);
    this.narrativeTimerIds.push(step18Tid);

    if (this.cloudUploadTimerId) clearTimeout(this.cloudUploadTimerId);
    this.cloudUploadTimerId = setTimeout(() => {
      this.isCloudUploading = false;
      this.activePackets = this.activePackets.filter(p => p.destinationNodeId !== 'NODE-SATELLITE');
      this.setNarrativeStep(0);
      this.notify();
    }, durationMs);
  }

  private scheduleNarrativeStep(delayMs: number, stepIndex: number, action?: () => void) {
    const tid = setTimeout(() => {
      this.currentNarrativeStepIndex = stepIndex;
      this.currentNarrativeStepLabel = NARRATIVE_FLOW_STEPS[stepIndex] || 'NORMAL';
      if (action) action();
      this.notify();
    }, delayMs);
    this.narrativeTimerIds.push(tid);
  }

  // 90-second judge demo mode
  public isDemoRunning: boolean = false;
  public isDemoPaused: boolean = false;
  public currentDemoStepIndex: number = 0;
  public demoTimerId: ReturnType<typeof setTimeout> | null = null;
  private demoStepStartTime: number = 0;
  private demoRemainingTimeMs: number = 0;

  // ==========================================
  // CINEMATIC DEMO STATE
  // ==========================================
  public isCinematicDemoActive: boolean = false;
  /** Opacity of the black cinematic fade overlay (0 = transparent, 1 = solid black) */
  public cinematicOverlayOpacity: number = 0;
  /** Opacity of the cloud / fog veil used for the cloud-descent opening (0–1) */
  public cinematicCloudOpacity: number = 0;
  /** Current named phase of the cinematic (null = not running) */
  public cinematicPhase: string | null = null;
  /** 0–1 progress within the current phase */
  public cinematicPhaseProgress: number = 0;

  /** Start the full cinematic demo — stops the judge demo first if running */
  public startCinematicDemo() {
    if (this.isDemoRunning) this.stopJudgeDemo();
    this.clearHazard();
    this.setWeather('CLEAR');
    this.isCinematicDemoActive = true;
    this.cinematicOverlayOpacity = 0;
    this.cinematicCloudOpacity = 1;
    this.cinematicPhase = 'CLOUD_DESCENT';
    this.cinematicPhaseProgress = 0;
    this.setCameraMode('CINEMATIC_DEMO');
    this.notify();
  }

  /** Stop / skip the cinematic and return to normal application state */
  public stopCinematicDemo() {
    this.isCinematicDemoActive = false;
    this.cinematicOverlayOpacity = 0;
    this.cinematicCloudOpacity = 0;
    this.cinematicPhase = null;
    this.cinematicPhaseProgress = 0;
    this.clearHazard();
    this.setWeather('CLEAR');
    this.setCameraMode('FREE_CAMERA');
    this.triggerWatchtowerAlarm(false);
    this.notify();
  }

  /** Update cinematic state (called by CinematicDemoManager each frame / step) */
  public updateCinematicState(
    phase: string,
    phaseProgress: number,
    overlayOpacity: number,
    cloudOpacity: number
  ) {
    this.cinematicPhase = phase;
    this.cinematicPhaseProgress = phaseProgress;
    this.cinematicOverlayOpacity = overlayOpacity;
    this.cinematicCloudOpacity = cloudOpacity;
    this.notify();
  }

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.addLog('SYSTEM', 'System Initialized', '2 × ESP32-S3 Nodes + SX1262 LoRa → Local Computer Station with LoRa Transceiver online.', 'info');
    this.recordConfidencePoint('Initial equilibrium');
  }

  // Returns active nodes based on Virtual Scale Mode (2 = prototype only, 5, 10, 25, 50 = prototype + virtual candidates)
  public get nodes(): SensorNode[] {
    if (this.virtualScaleCount <= 2) {
      return this.prototypeNodes;
    }

    // Generate virtual sensor nodes from top candidates
    const activeCandidates = PLACEMENT_CANDIDATES
      .filter(c => c.recommended && !c.isPhysicalPrototype)
      .slice(0, this.virtualScaleCount - 2);

    const virtualNodes: SensorNode[] = activeCandidates.map((c, idx) => {
      const vId = `V-NODE-${(idx + 3).toString().padStart(2, '0')}`;
      return {
        id: vId,
        name: `${c.siteName} (Virtual)`,
        role: `${c.zoneCategory} Strategic Watchpoint`,
        hardware: 'VIRTUAL_SCALE_NODE',
        isPhysicalPrototype: false,
        zone: c.zoneCategory === 'FLOODPLAIN' ? 'RIVER' : c.zoneCategory === 'WILDFIRE' ? 'FOREST' : 'HILLSIDE',
        position: c.position,
        nodeHealth: 'OPERATIONAL',
        overallSensorTrustPct: 92,
        localHazardConfidence: 0.04,
        state: 'NORMAL',
        lastCommunicationTime: Date.now() - (idx * 400 + 1200),
        samplingRateHz: 1.0,
        batteryPct: 96,
        batteryVoltage: 3.98,
        loraStatus: 'CONNECTED',
        offlineQueue: [],
        isReSensing: false,
        isCorroborating: false,
        sensors: [
          { type: 'TEMP_BME688', label: 'BME688 Ambient', value: 23.8, unit: '°C', baseline: 23.5, thresholdWatch: 38, thresholdWarning: 50, thresholdCritical: 65, sensorTrustPct: 94, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.5, lastTestedTime: Date.now() },
          { type: 'HUMIDITY_DHT', label: 'Regional Humidity', value: 65, unit: '%', baseline: 65, thresholdWatch: 85, thresholdWarning: 92, thresholdCritical: 98, sensorTrustPct: 92, healthStatus: 'OK', isAnomaly: false, reSensingActive: false, weight: 0.5, lastTestedTime: Date.now() }
        ]
      };
    });

    return [...this.prototypeNodes, ...virtualNodes];
  }

  private isNotifying = false;
  private pendingNotify = false;

  public subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    if (this.isNotifying) {
      this.pendingNotify = true;
      return;
    }
    this.isNotifying = true;
    try {
      this.listeners.forEach(cb => {
        try {
          cb();
        } catch (err) {
          console.error('Simulation engine listener error:', err);
        }
      });
    } finally {
      this.isNotifying = false;
      if (this.pendingNotify) {
        this.pendingNotify = false;
        this.notify();
      }
    }
  }

  // ==========================================
  // DEPLOYMENT CONTROLLERS
  // ==========================================
  public setVirtualScaleCount(count: VirtualScaleOption) {
    this.virtualScaleCount = count;
    this.isFutureScaleMode = (count > 2);
    this.addLog(
      'DEPLOYMENT', 
      `Virtual Network Scale: ${count} Nodes`, 
      count === 2 
        ? 'Active baseline: Exactly 2 physical ESP32-S3 prototype nodes.' 
        : `VIRTUAL DEPLOYMENT: Expanded to ${count} simulated nodes placed strictly in high-risk zones.`,
      'info'
    );
    this.notify();
  }

  public toggleRiskHeatmap() {
    this.isRiskHeatmapActive = !this.isRiskHeatmapActive;
    this.addLog('DEPLOYMENT', `Risk Heatmap Layer: ${this.isRiskHeatmapActive ? 'ON' : 'OFF'}`, 'Displays spatial vulnerability zones: Floodplain, Wildfire, Slope, and Industrial.', 'info');
    this.notify();
  }

  public toggleNodePlacement() {
    this.isNodePlacementActive = !this.isNodePlacementActive;
    this.addLog('DEPLOYMENT', `Targeted Node Placement Layer: ${this.isNodePlacementActive ? 'ON' : 'OFF'}`, 'Shows strategic node locations vs empty low-risk buffer fields.', 'info');
    this.notify();
  }

  public toggleDenseGridComparison() {
    this.isDenseGridComparisonActive = !this.isDenseGridComparisonActive;
    this.addLog(
      'DEPLOYMENT', 
      `Dense Grid vs Targeted Placement: ${this.isDenseGridComparisonActive ? 'ACTIVE' : 'OFF'}`, 
      'Visually demonstrates targeted placement vs wasteful uniform dense grid.',
      'info'
    );
    this.notify();
  }

  public openDeploymentAerialView() {
    this.setCameraMode('DEPLOYMENT_AERIAL');
    this.isRiskHeatmapActive = true;
    this.isNodePlacementActive = true;
    this.notify();
  }

  // Environment & Camera
  public setWeather(mode: WeatherMode) {
    if (this.weatherMode === mode) return;
    this.weatherMode = mode;
    this.addLog('SYSTEM', `Weather State: ${mode}`, `Environmental daylight & overcast atmospheric scattering adjusted to ${mode}.`, 'info');
    this.notify();
  }

  public setCameraMode(mode: CameraMode) {
    if (this.cameraMode === mode) return;
    this.cameraMode = mode;
    this.notify();
  }

  // Interactive visitor camera nudge & rotation callbacks
  private cameraNudgeListeners: ((type: 'ROTATE_LEFT' | 'ROTATE_RIGHT' | 'PAN_LEFT' | 'PAN_RIGHT' | 'RESET') => void)[] = [];

  public onCameraNudge(fn: (type: 'ROTATE_LEFT' | 'ROTATE_RIGHT' | 'PAN_LEFT' | 'PAN_RIGHT' | 'RESET') => void) {
    this.cameraNudgeListeners.push(fn);
    return () => {
      this.cameraNudgeListeners = this.cameraNudgeListeners.filter(l => l !== fn);
    };
  }

  public nudgeCamera(type: 'ROTATE_LEFT' | 'ROTATE_RIGHT' | 'PAN_LEFT' | 'PAN_RIGHT' | 'RESET') {
    this.cameraNudgeListeners.forEach(fn => fn(type));
  }

  // Simultaneous Rotate & Move Mode
  public isSimultaneousRotateMove: boolean = false;
  public toggleSimultaneousRotateMove() {
    this.isSimultaneousRotateMove = !this.isSimultaneousRotateMove;
    this.notify();
  }

  public toggleInternet() {
    this.isInternetOnline = !this.isInternetOnline;
    this.addLog(
      'SYSTEM', 
      `Internet Connectivity: ${this.isInternetOnline ? 'ONLINE' : 'OFFLINE'}`, 
      this.isInternetOnline 
        ? 'Cloud link restored. Edge grid continues logging locally.' 
        : 'Cloud link severed! Local Computer & LoRa mesh maintain 100% autonomous operation.', 
      this.isInternetOnline ? 'info' : 'warning'
    );
    this.notify();
  }

  // ==========================================
  // CHAOS & FAULT INJECTION CONTROLLERS
  // ==========================================
  public toggleSensorFault(nodeId: NodeId, sensorType: SensorType) {
    const node = this.prototypeNodes.find(n => n.id === nodeId);
    if (!node) return;
    const sensor = node.sensors.find(s => s.type === sensorType);
    if (!sensor) return;

    if (sensor.healthStatus === 'OK') {
      sensor.healthStatus = 'FAULT';
      sensor.sensorTrustPct = 12;
      this.addLog('CHAOS', `Injected Sensor Fault: ${node.name} - ${sensor.label}`, 'Sensor trust dropped to 12%. Anomaly isolation test initiated.', 'warning', nodeId);
    } else {
      sensor.healthStatus = 'OK';
      sensor.sensorTrustPct = 95;
      this.addLog('CHAOS', `Restored Sensor: ${node.name} - ${sensor.label}`, 'Sensor health normalized to 95% trust.', 'info', nodeId);
    }

    const avgTrust = Math.round(node.sensors.reduce((acc, s) => acc + s.sensorTrustPct, 0) / node.sensors.length);
    node.overallSensorTrustPct = avgTrust;
    if (nodeId === 'NODE-1') this.node1TrustPct = avgTrust;
    if (nodeId === 'NODE-2') this.node2TrustPct = avgTrust;
    if (nodeId === 'NODE-3') this.node3TrustPct = avgTrust;
    if (nodeId === 'NODE-4') this.node4TrustPct = avgTrust;

    this.recomputeEvidenceFusion();
    this.notify();
  }

  public toggleNodeFailure(nodeId: NodeId) {
    const node = this.prototypeNodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.nodeHealth === 'OPERATIONAL') {
      node.nodeHealth = 'FAILED';
      node.loraStatus = 'DISCONNECTED';
      node.batteryPct = 0;
      node.state = 'NORMAL';
      this.addLog('CHAOS', `Simulated Power Loss: ${node.name}`, 'Node dropped offline. Neighbor corroboration unavailable from this unit.', 'critical', nodeId);
    } else {
      node.nodeHealth = 'OPERATIONAL';
      node.loraStatus = 'CONNECTED';
      node.batteryPct = 95;
      this.addLog('CHAOS', `Restored Node Power: ${node.name}`, 'Node booted back online. Heartbeat packet transmitted.', 'info', nodeId);
    }
    this.recomputeEvidenceFusion();
    this.notify();
  }

  public toggleLoRaLink(nodeId: NodeId) {
    const node = this.prototypeNodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.loraStatus === 'CONNECTED') {
      node.loraStatus = 'DISCONNECTED';
      this.addLog('CHAOS', `Simulated RF Link Jam: ${node.name}`, 'SX1262 LoRa transmission blocked. Offline queue active.', 'warning', nodeId);
    } else {
      node.loraStatus = 'CONNECTED';
      this.addLog('CHAOS', `Restored RF Link: ${node.name}`, 'LoRa connection established. Syncing offline telemetry queue.', 'info', nodeId);
    }
    this.notify();
  }

  public triggerFalseAlarmScenario() {
    this.stopJudgeDemo();
    this.clearHazard();
    this.isFalseAlarmScenarioActive = true;
    this.falseAlarmBanner = 'FALSE ALARM REJECTED — UNVERIFIED SINGLE-NODE SPIKE';
    this.activeScenarioName = 'FALSE_ALARM_TEST';

    const node1 = this.prototypeNodes.find(n => n.id === 'NODE-1');
    if (node1) {
      node1.sensors[0].value = 4.8;
      node1.sensors[0].isAnomaly = true;
      node1.sensors[0].sensorTrustPct = 35;
      node1.isReSensing = true;
      node1.samplingRateHz = 5.0;
      node1.state = 'WATCH';
    }

    this.addLog('CHAOS', 'False Alarm Test Triggered', 'Single ultrasonic spike injected. Neighbor corroboration fails to confirm. Warning NOT escalated.', 'warning');
    soundManager.playWatchPing();

    setTimeout(() => {
      this.dispatchLoRaPacket('NODE-1', 'NODE-2', 'VERIFY_REQUEST', { type: 'WATER_SPIKE', val: 4.8 });
      setTimeout(() => {
        this.dispatchLoRaPacket('NODE-2', 'NODE-1', 'VERIFY_RESPONSE', { status: 'CORROBORATION_FAILED_CLEAR_WEATHER', rain: 0 });
        this.addLedgerEntry(
          'DECISION',
          'FALSE ALARM REJECTED: Single anomalous reading failed neighbor corroboration and sensor trust check.',
          'NODE-1',
          35,
          0.35,
          0.12,
          'NORMAL',
          'Cooperative evidence cascade prevented false disaster evacuation. Sensor trust was below threshold.'
        );
        this.systemState = 'NORMAL';
        this.aggregatedHazardConfidence = 0.12;
        this.recordConfidencePoint('False alarm rejected');
        this.notify();
      }, 2000);
    }, 1000);

    this.notify();
  }

  public triggerCorroboratedScenario(type: HazardType = 'FLOOD') {
    this.triggerHazard(type, 'HIGH');
  }

  // ==========================================
  // DISASTER ENGINE
  // ==========================================
  public triggerHazard(type: HazardType, severity: HazardSeverity = 'HIGH') {
    this.stopJudgeDemo();
    this.isFalseAlarmScenarioActive = false;
    this.falseAlarmBanner = null;

    let center: [number, number, number] = [0, 0, 0];
    let name = '';
    let zone: 'FOREST' | 'RIVER' | 'HILLSIDE' | 'URBAN' | 'MULTI' = 'FOREST';

    switch (type) {
      case 'FOREST_FIRE':
        center = [-16, 1.2, -12];
        name = 'Sector Alpha Wildfire Outbreak';
        zone = 'FOREST';
        this.setWeather('FIRE_HAZE');
        break;
      case 'FLOOD':
        center = [10.6, -0.63, 17.9];
        name = 'River Corridor Flood Inundation';
        zone = 'RIVER';
        this.setWeather('HEAVY_RAIN');
        break;
      case 'LANDSLIDE':
        center = [-28, 9.0, 32];
        name = 'Pinned Escarpment Landslide & Slope Failure';
        zone = 'HILLSIDE';
        this.setWeather('RAIN');
        break;
      case 'EXTREME_RAIN':
        center = [0, 1.5, 0];
        name = 'Regional Catchment Cloudburst';
        zone = 'MULTI';
        this.setWeather('STORM');
        break;
      case 'AIR_QUALITY_EVENT':
        center = [44.0, 10.0, -36.0]; // Centered at Valdoria Industrial Factory
        name = 'Industrial Excess Emissions & Air Quality Breach';
        zone = 'MULTI';
        this.setWeather('FIRE_HAZE');
        break;
      case 'EXTREME_HEAT':
        center = [24.0, 1.8, 16.0];
        name = 'Agricultural Valley Extreme Heat Dome';
        zone = 'URBAN';
        this.setWeather('CLEAR');
        break;
      case 'MULTI_HAZARD':
        center = [0, 2.0, 0];
        name = 'Compound Multi-Hazard Cascade';
        zone = 'MULTI';
        this.setWeather('STORM');
        break;
      default:
        this.clearHazard();
        return;
    }

    this.activeHazard = {
      id: `HAZARD-${Date.now().toString().slice(-4)}`,
      type,
      name,
      zone,
      severity,
      center,
      radius: 8.5,
      startTime: Date.now(),
      intensity: severity === 'HIGH' ? 0.85 : severity === 'MEDIUM' ? 0.55 : 0.35,
      spreadRate: 0.4,
      windDirectionDeg: this.windDirectionDeg,
      windSpeedMs: this.windSpeedMs,
      status: 'ACTIVE'
    };

    this.addLog('HAZARD', `Hazard Triggered: ${name}`, `Severity: ${severity}. Simulating local sensor deviation across nodes.`, 'warning');
    soundManager.playWatchPing();
    this.propagateHazardToSensors();
    this.notify();
  }

  public clearHazard(triggerCloudSync: boolean = true) {
    const hadActiveHazard = this.activeHazard !== null;
    this.clearNarrativeTimers();
    this.activeHazard = null;
    this.activeScenarioName = 'NORMAL_NETWORK';
    this.isFalseAlarmScenarioActive = false;
    this.falseAlarmBanner = null;
    this.confirmedEventBanner = null;
    this.isInternetOnline = true;
    this.setNarrativeStep(0);
    this.setWeather('CLEAR');
    this.triggerWatchtowerAlarm(false);
    this.resetSensorsToBaseline();
    this.recomputeEvidenceFusion();
    this.addLog('HAZARD', 'Hazard Cleared', 'System returned to equilibrium (NORMAL).', 'info');
    if (hadActiveHazard && triggerCloudSync) {
      this.triggerCloudDataUpload(8500);
    }
    this.notify();
  }

  public resetSensorsToBaseline() {
    this.clearNarrativeTimers();
    this.prototypeNodes.forEach(node => {
      node.state = 'NORMAL';
      node.isReSensing = false;
      node.isCorroborating = false;
      node.samplingRateHz = 1.0;
      node.localHazardConfidence = 0.05;
      node.sensors.forEach(s => {
        s.value = s.baseline;
        s.isAnomaly = false;
        s.reSensingActive = false;
        s.healthStatus = 'OK';
        s.sensorTrustPct = 95;
      });
    });

    this.aggregatedHazardConfidence = 0.05;
    this.systemState = 'NORMAL';
    this.currentNarrativeStepIndex = 0;
    this.currentNarrativeStepLabel = NARRATIVE_FLOW_STEPS[0];
    this.evidencePool = [];
    this.activePackets = [];
    this.recordConfidencePoint('Reset to baseline');
    this.notify();
  }

  public getNode(id: string): SensorNode | undefined {
    if (id === 'NODE-FLOOD-2') return this.prototypeNodes.find(n => n.id === 'NODE-1');
    if (id === 'NODE-FIRE-1') return this.prototypeNodes.find(n => n.id === 'NODE-2');
    if (id === 'NODE-LANDSLIDE-1') return this.prototypeNodes.find(n => n.id === 'NODE-3');
    return this.prototypeNodes.find(n => n.id === id);
  }

  private propagateHazardToSensors() {
    if (!this.activeHazard) return;

    this.clearNarrativeTimers();
    this.activePackets = [];
    this.isInternetOnline = true;

    const hType = this.activeHazard.type;
    const isFlood = hType === 'FLOOD' || hType === 'EXTREME_RAIN' || hType === 'MULTI_HAZARD';
    const isFire = hType === 'FOREST_FIRE' || hType === 'MULTI_HAZARD';
    const isLandslide = hType === 'LANDSLIDE' || hType === 'MULTI_HAZARD';
    const isAirQuality = hType === 'AIR_QUALITY_EVENT' || hType === 'MULTI_HAZARD';
    const isHeat = hType === 'EXTREME_HEAT';

    // STEP 1: RAIN / ENVIRONMENTAL CHANGE / DISASTER OCCURRENCE
    this.setNarrativeStep(1);

    // STEP 2: ANOMALY DETECTED (350ms)
    this.scheduleNarrativeStep(350, 2, () => {
      if (isFlood) {
        const floodNode1 = this.getNode('NODE-FLOOD-1');
        if (floodNode1) {
          floodNode1.sensors.forEach(s => {
            if (s.type === 'WATER_LEVEL_ULTRASONIC') {
              s.value = 4.85;
              s.isAnomaly = true;
            }
            if (s.type === 'RAINFALL_OPTICAL') {
              s.value = 68.0;
              s.isAnomaly = true;
            }
          });
          floodNode1.state = 'WATCH';
          floodNode1.localHazardConfidence = 0.62;
          this.addLedgerEntry(
            'ANOMALY',
            'ANOMALY DETECTED: Flood Node 1 (X: 17.6, Z: -53.3) ultrasonic water level breached (4.85m > 3.90m)',
            floodNode1.id,
            floodNode1.overallSensorTrustPct,
            0.05,
            0.62,
            'WATCH',
            'NARRATIVE: NORMAL ↓ RAIN / DISASTER OCCURRENCE ↓ ANOMALY DETECTED'
          );
        }
      }

      if (isFire) {
        const fireNode1 = this.getNode('NODE-2');
        if (fireNode1) {
          fireNode1.sensors.forEach(s => {
            if (s.type === 'SMOKE_MQ2') {
              s.value = 185.0;
              s.isAnomaly = true;
            }
            if (s.type === 'TEMP_BME688') {
              s.value = 49.5;
              s.isAnomaly = true;
            }
            if (s.type === 'FLAME_IR') {
              s.value = 1.0;
              s.isAnomaly = true;
            }
          });
          fireNode1.state = 'WATCH';
          fireNode1.localHazardConfidence = 0.64;
          this.addLedgerEntry(
            'ANOMALY',
            'ANOMALY DETECTED: Forest Fire Node 1 (X: -16.0, Z: -12.0) detected smoke spike (185 ppm) & heat (49.5°C)',
            fireNode1.id,
            fireNode1.overallSensorTrustPct,
            0.05,
            0.64,
            'WATCH',
            'NARRATIVE: NORMAL ↓ ENVIRONMENTAL CHANGE ↓ ANOMALY DETECTED'
          );
        }
      }

      if (isLandslide) {
        const lsNode1 = this.getNode('NODE-3');
        if (lsNode1) {
          lsNode1.sensors.forEach(s => {
            if (s.type === 'VIBRATION_GEOPHONE') {
              s.value = 1.48;
              s.isAnomaly = true;
            }
            if (s.type === 'HUMIDITY_DHT') {
              s.value = 94.0;
              s.isAnomaly = true;
            }
            if (s.type === 'RAINFALL_OPTICAL') {
              s.value = 52.0;
              s.isAnomaly = true;
            }
          });
          lsNode1.state = 'WATCH';
          lsNode1.localHazardConfidence = 0.68;
          this.addLedgerEntry(
            'ANOMALY',
            'ANOMALY DETECTED: Landslide Node 1 (X: -35.7, Z: 41.7) detected slope shear (1.48 g) & soil saturation (94%)',
            lsNode1.id,
            lsNode1.overallSensorTrustPct,
            0.04,
            0.68,
            'WATCH',
            'NARRATIVE: NORMAL ↓ RAIN / ENVIRONMENTAL CHANGE ↓ ANOMALY DETECTED'
          );
        }
      }

      if (isAirQuality && !isFire) {
        const node2 = this.getNode('NODE-2');
        if (node2) {
          node2.sensors.forEach(s => {
            if (s.type === 'SMOKE_MQ2') {
              s.value = 245.0;
              s.isAnomaly = true;
            }
            if (s.type === 'GAS_MQ135') {
              s.value = 275.0;
              s.isAnomaly = true;
            }
          });
          node2.state = 'WATCH';
          node2.localHazardConfidence = 0.66;
        }
      }

      if (isHeat) {
        const node1 = this.getNode('NODE-1');
        if (node1) {
          node1.sensors.forEach(s => {
            if (s.type === 'TEMP_BME688') {
              s.value = 47.2;
              s.isAnomaly = true;
            }
            if (s.type === 'HUMIDITY_DHT') {
              s.value = 13.0;
              s.isAnomaly = true;
            }
          });
          node1.state = 'WATCH';
          node1.localHazardConfidence = 0.65;
        }
      }

      this.systemState = 'WATCH';
      this.aggregatedHazardConfidence = 0.38;
    });

    // STEP 3: "IS THIS REAL?" (700ms)
    this.scheduleNarrativeStep(700, 3, () => {
      this.addLog(
        'SENSOR',
        'Edge Intelligence Check: "IS THIS REAL?"',
        'Single sensor threshold breach isolated. Evaluating sensor trust and initiating adaptive re-sensing before escalating.',
        'info'
      );
    });

    // STEP 4: RE-SENSE (1050ms)
    this.scheduleNarrativeStep(1050, 4, () => {
      if (isFlood) {
        const floodNode1 = this.getNode('NODE-FLOOD-1');
        if (floodNode1) {
          floodNode1.isReSensing = true;
          floodNode1.samplingRateHz = 5.0;
          floodNode1.sensors.forEach(s => {
            if (s.isAnomaly) s.reSensingActive = true;
          });
        }
      }
      if (isFire || isAirQuality) {
        const fireNode1 = this.getNode('NODE-2');
        if (fireNode1) {
          fireNode1.isReSensing = true;
          fireNode1.samplingRateHz = 5.0;
          fireNode1.sensors.forEach(s => {
            if (s.isAnomaly) s.reSensingActive = true;
          });
        }
      }
      if (isLandslide) {
        const lsNode1 = this.getNode('NODE-3');
        if (lsNode1) {
          lsNode1.isReSensing = true;
          lsNode1.samplingRateHz = 5.0;
          lsNode1.sensors.forEach(s => {
            if (s.isAnomaly) s.reSensingActive = true;
          });
        }
      }
      if (isHeat) {
        const node1 = this.getNode('NODE-1');
        if (node1) {
          node1.isReSensing = true;
          node1.samplingRateHz = 5.0;
          node1.sensors.forEach(s => {
            if (s.isAnomaly) s.reSensingActive = true;
          });
        }
      }
      this.aggregatedHazardConfidence = 0.48;
    });

    // STEP 5: PERSISTENT EVIDENCE (1400ms)
    this.scheduleNarrativeStep(1400, 5, () => {
      this.aggregatedHazardConfidence = 0.56;
      this.addLedgerEntry(
        'RE_SENSE',
        'PERSISTENT EVIDENCE CONFIRMED: 5.0 Hz adaptive burst verified sustained physical anomaly (transient noise ruled out)',
        isFlood ? 'NODE-FLOOD-1' : isLandslide ? 'NODE-3' : 'NODE-2',
        96,
        0.38,
        0.56,
        'WATCH',
        'NARRATIVE: "IS THIS REAL?" ↓ RE-SENSE ↓ PERSISTENT EVIDENCE'
      );
    });

    // STEP 6: "ASK THE NEIGHBOUR" (1750ms)
    this.scheduleNarrativeStep(1750, 6, () => {
      this.addLog(
        'LORA',
        'Cooperative Protocol: "ASK THE NEIGHBOUR"',
        'Local persistence confirmed. Preparing peer-to-peer LoRa VERIFY_REQUEST to neighbouring sensor node.',
        'info'
      );
    });

    // STEP 7: LoRa VERIFY_REQUEST (2100ms) — Braided Cyan Beam from Primary Node -> Neighbour Node
    this.scheduleNarrativeStep(2100, 7, () => {
      if (isFlood) {
        this.dispatchLoRaPacket('NODE-FLOOD-1', 'NODE-1', 'VERIFY_REQUEST', {
          event: 'FLOOD_PRELIM',
          water_m: 4.85,
          rain_mm_h: 68.0
        });
      }
      if (isFire) {
        this.dispatchLoRaPacket('NODE-2', 'NODE-FIRE-2', 'VERIFY_REQUEST', {
          event: 'FIRE_PRELIM',
          smoke_ppm: 185.0,
          temp_c: 49.5
        });
      }
      if (isLandslide) {
        this.dispatchLoRaPacket('NODE-3', 'NODE-LANDSLIDE-2', 'VERIFY_REQUEST', {
          event: 'LANDSLIDE_PRELIM',
          seismic_g: 1.48,
          soil_sat: 94.0
        });
      }
      if (isAirQuality && !isFire) {
        this.dispatchLoRaPacket('NODE-2', 'NODE-FIRE-2', 'VERIFY_REQUEST', {
          event: 'AIR_PLUME_CORROBORATE',
          smoke_ppm: 245.0,
          aqi: 275.0
        });
      }
      if (isHeat) {
        this.dispatchLoRaPacket('NODE-1', 'NODE-2', 'VERIFY_REQUEST', {
          event: 'THERMAL_CORROBORATE',
          temp_c: 47.2
        });
      }
      this.aggregatedHazardConfidence = 0.64;
    });

    // STEP 8: INDEPENDENT CORROBORATION (2600ms)
    this.scheduleNarrativeStep(2600, 8, () => {
      if (isFlood) {
        const floodNode2 = this.getNode('NODE-1');
        if (floodNode2) {
          floodNode2.sensors.forEach(s => {
            if (s.type === 'WATER_LEVEL_ULTRASONIC') {
              s.value = 3.90;
              s.isAnomaly = true;
            }
            if (s.type === 'HUMIDITY_DHT') {
              s.value = 95.0;
              s.isAnomaly = true;
            }
          });
          floodNode2.isCorroborating = true;
          floodNode2.state = 'WARNING';
          floodNode2.localHazardConfidence = 0.89;
        }
      }
      if (isFire || isAirQuality) {
        const fireNode2 = this.getNode('NODE-FIRE-2');
        if (fireNode2) {
          fireNode2.sensors.forEach(s => {
            if (s.type === 'FLAME_IR') {
              s.value = 1.0;
              s.isAnomaly = true;
            }
            if (s.type === 'TEMP_BME688') {
              s.value = 52.0;
              s.isAnomaly = true;
            }
            if (s.type === 'SMOKE_MQ2') {
              s.value = 145.0;
              s.isAnomaly = true;
            }
          });
          fireNode2.isCorroborating = true;
          fireNode2.state = 'WARNING';
          fireNode2.localHazardConfidence = 0.91;
        }
      }
      if (isLandslide) {
        const lsNode2 = this.getNode('NODE-LANDSLIDE-2');
        if (lsNode2) {
          lsNode2.sensors.forEach(s => {
            if (s.type === 'VIBRATION_GEOPHONE') {
              s.value = 0.95;
              s.isAnomaly = true;
            }
            if (s.type === 'IMU_MPU6050') {
              s.value = 11.4;
              s.isAnomaly = true;
            }
          });
          lsNode2.isCorroborating = true;
          lsNode2.state = 'WARNING';
          lsNode2.localHazardConfidence = 0.88;
        }
      }
      if (isHeat) {
        const node2 = this.getNode('NODE-2');
        if (node2) {
          node2.isCorroborating = true;
          node2.state = 'WARNING';
          node2.localHazardConfidence = 0.85;
        }
      }
      this.aggregatedHazardConfidence = 0.72;
    });

    // STEP 9: LoRa VERIFY_RESPONSE (3050ms) — Braided Cyan Beam from Neighbour Node -> Primary Node
    this.scheduleNarrativeStep(3050, 9, () => {
      if (isFlood) {
        this.dispatchLoRaPacket('NODE-1', 'NODE-FLOOD-1', 'VERIFY_RESPONSE', {
          status: 'CORROBORATED_SURGE',
          water_m: 3.90
        });
        this.addLedgerEntry(
          'NEIGHBOUR_RESPONSE',
          'INDEPENDENT CORROBORATION: Flood Node 2 (X: 7.2, Z: 32.2) confirmed downstream embankment surge (3.90m)',
          'NODE-1',
          95,
          0.64,
          0.78,
          'WATCH',
          'NARRATIVE: "ASK THE NEIGHBOUR" ↓ LoRa VERIFY_REQUEST ↓ INDEPENDENT CORROBORATION ↓ LoRa VERIFY_RESPONSE'
        );
      }
      if (isFire) {
        this.dispatchLoRaPacket('NODE-FIRE-2', 'NODE-2', 'VERIFY_RESPONSE', {
          status: 'CORROBORATED_FLAME_ACTIVE',
          flame_ir: 1.0,
          temp_c: 52.0
        });
        this.addLedgerEntry(
          'NEIGHBOUR_RESPONSE',
          'INDEPENDENT CORROBORATION: Forest Fire Node 2 (X: -41.6, Z: -38.8) confirmed IR flame & 52.0°C combustion',
          'NODE-FIRE-2',
          95,
          0.64,
          0.79,
          'WATCH',
          'NARRATIVE: "ASK THE NEIGHBOUR" ↓ LoRa VERIFY_REQUEST ↓ INDEPENDENT CORROBORATION ↓ LoRa VERIFY_RESPONSE'
        );
      }
      if (isLandslide) {
        this.dispatchLoRaPacket('NODE-LANDSLIDE-2', 'NODE-3', 'VERIFY_RESPONSE', {
          status: 'CORROBORATED_RUNOUT_SLIP',
          seismic_g: 0.95,
          tilt_deg: 11.4
        });
        this.addLedgerEntry(
          'NEIGHBOUR_RESPONSE',
          'INDEPENDENT CORROBORATION: Landslide Node 2 (X: -9.0, Z: 34.7) confirmed lower runout displacement (11.4° tilt)',
          'NODE-LANDSLIDE-2',
          95,
          0.68,
          0.80,
          'WATCH',
          'NARRATIVE: "ASK THE NEIGHBOUR" ↓ LoRa VERIFY_REQUEST ↓ INDEPENDENT CORROBORATION ↓ LoRa VERIFY_RESPONSE'
        );
      }
      if (isAirQuality && !isFire) {
        this.dispatchLoRaPacket('NODE-FIRE-2', 'NODE-2', 'VERIFY_RESPONSE', {
          status: 'CORROBORATED_PLUME',
          aqi: 275.0
        });
      }
      if (isHeat) {
        this.dispatchLoRaPacket('NODE-2', 'NODE-1', 'VERIFY_RESPONSE', {
          status: 'CORROBORATED_HEAT_DOME',
          temp_c: 46.8
        });
      }
      this.aggregatedHazardConfidence = 0.78;
    });

    // STEP 10: SUPERIOR NODE (3500ms) — Braided Cyan Beams from Field Nodes -> Watch Tower 01 (NODE-SUPERIOR)
    this.scheduleNarrativeStep(3500, 10, () => {
      if (isFlood) {
        this.dispatchLoRaPacket('NODE-FLOOD-1', 'NODE-SUPERIOR', 'EVENT_ALERT', {
          event: 'FLOOD_VERIFIED',
          water_m: 4.85,
          corroborated: 1
        });
        this.dispatchLoRaPacket('NODE-1', 'NODE-SUPERIOR', 'EVENT_ALERT', {
          event: 'FLOOD_CORROBORATION',
          water_m: 3.90
        });
      }
      if (isFire) {
        this.dispatchLoRaPacket('NODE-2', 'NODE-SUPERIOR', 'EVENT_ALERT', {
          event: 'FIRE_VERIFIED',
          smoke_ppm: 185.0,
          corroborated: 1
        });
        this.dispatchLoRaPacket('NODE-FIRE-2', 'NODE-SUPERIOR', 'EVENT_ALERT', {
          event: 'FIRE_CORROBORATION',
          flame_ir: 1.0,
          temp_c: 52.0
        });
      }
      if (isLandslide) {
        this.dispatchLoRaPacket('NODE-3', 'NODE-SUPERIOR', 'EVENT_ALERT', {
          event: 'LANDSLIDE_VERIFIED',
          seismic_g: 1.48,
          corroborated: 1
        });
        this.dispatchLoRaPacket('NODE-LANDSLIDE-2', 'NODE-SUPERIOR', 'EVENT_ALERT', {
          event: 'LANDSLIDE_CORROBORATION',
          seismic_g: 0.95,
          tilt_deg: 11.4
        });
      }
      if (isAirQuality) {
        this.dispatchLoRaPacket('NODE-2', 'NODE-SUPERIOR', 'EVENT_ALERT', {
          event: 'AIR_POLLUTION_SMOKE',
          smoke_ppm: 245.0,
          aqi: 275.0
        });
        const nodeSuperior = this.getNode('NODE-SUPERIOR');
        if (nodeSuperior) {
          nodeSuperior.sensors.forEach(s => {
            if (s.type === 'AIR_QUALITY_SPS30') {
              s.value = 168.0;
              s.isAnomaly = true;
              s.reSensingActive = true;
            }
            if (s.type === 'GAS_MQ135') {
              s.value = 285.0;
              s.isAnomaly = true;
              s.reSensingActive = true;
            }
          });
          nodeSuperior.state = 'WARNING';
          nodeSuperior.localHazardConfidence = 0.92;
          nodeSuperior.isReSensing = true;
          nodeSuperior.samplingRateHz = 5.0;
        }
      }
      if (isHeat) {
        this.dispatchLoRaPacket('NODE-1', 'NODE-SUPERIOR', 'EVENT_ALERT', {
          event: 'HEAT_STRESS_ANOMALY',
          temp_c: 47.2,
          humidity_pct: 13.0
        });
      }
      this.aggregatedHazardConfidence = 0.84;
    });

    // STEP 11: EVIDENCE FUSION (3950ms)
    this.scheduleNarrativeStep(3950, 11, () => {
      this.recomputeEvidenceFusion();
    });

    // STEP 12: CONFIDENCE > ALERT THRESHOLD (4350ms)
    this.scheduleNarrativeStep(4350, 12, () => {
      this.aggregatedHazardConfidence = Math.max(this.aggregatedHazardConfidence, 0.92);
      this.recordConfidencePoint('Confidence > Alert Threshold');
    });

    // STEP 13: WARNING (4750ms)
    this.scheduleNarrativeStep(4750, 13, () => {
      if (this.systemState === 'NORMAL' || this.systemState === 'WATCH') {
        this.systemState = 'WARNING';
      }
      this.addLedgerEntry(
        'DECISION',
        `WARNING ESCALATION: Multi-node evidence fusion crossed alert threshold (${(this.aggregatedHazardConfidence * 100).toFixed(0)}%)`,
        'NODE-SUPERIOR',
        99,
        0.78,
        this.aggregatedHazardConfidence,
        this.systemState,
        'NARRATIVE: SUPERIOR NODE ↓ EVIDENCE FUSION ↓ CONFIDENCE > ALERT THRESHOLD ↓ WARNING'
      );
    });

    // STEP 14: BUZZER / SIREN (5150ms)
    this.scheduleNarrativeStep(5150, 14, () => {
      soundManager.playCriticalSiren();
      this.triggerWatchtowerAlarm(true, 'SIREN');
      this.addLog(
        'FUSION',
        'WATCH TOWER 01: BUZZER / SIREN ACTIVATED (120 dB SPL)',
        'Superior Node validated multi-node evidence & activated the 120dB quad-horn village emergency buzzer / siren.',
        'critical',
        'NODE-SUPERIOR'
      );
    });

    // STEP 15: WAN FAILURE (5650ms)
    this.scheduleNarrativeStep(5650, 15, () => {
      this.isInternetOnline = false;
      this.addLog(
        'SYSTEM',
        'WAN FAILURE: External Cloud Backhaul Severed',
        'Cloud internet link lost during disaster! Transitioning to 100% autonomous local LoRa edge operation.',
        'warning'
      );
    });

    // STEP 16: LOCAL EDGE OPERATION CONTINUES (6150ms)
    this.scheduleNarrativeStep(6150, 16, () => {
      this.addLedgerEntry(
        'DECISION',
        'LOCAL EDGE OPERATION CONTINUES: SX1262 LoRa mesh & Watch Tower Superior Node operating 100% autonomously despite WAN failure',
        'NODE-SUPERIOR',
        99,
        this.aggregatedHazardConfidence,
        this.aggregatedHazardConfidence,
        this.systemState,
        'NARRATIVE: WARNING ↓ BUZZER / SIREN ↓ WAN FAILURE ↓ LOCAL EDGE OPERATION CONTINUES'
      );
    });

    // STEP 17: HAZARD COMPLETE / BACK TO NORMAL (6650ms)
    this.scheduleNarrativeStep(6650, 17, () => {
      this.isInternetOnline = true;
      this.isCloudUploading = true;
      this.dispatchLoRaPacket('NODE-SUPERIOR', 'NODE-SATELLITE', 'CLOUD_UPLOAD', {
        status: 'HAZARD_COMPLETE_CLOUD_SYNC',
        ledger_records: this.evidenceLedger.length
      });
    });

    // STEP 18: CLOUD DATA UPLOADED & SAVED (7150ms) — Red Volumetric Plasma Beam from Superior Node -> Orbital Satellite
    this.scheduleNarrativeStep(7150, 18, () => {
      this.isInternetOnline = true;
      this.isCloudUploading = true;
      this.dispatchLoRaPacket('NODE-SUPERIOR', 'NODE-SATELLITE', 'CLOUD_UPLOAD', {
        status: 'CLOUD_DATA_UPLOADED_AND_SAVED',
        saved_events: this.evidenceLedger.length,
        uplink: 'SATELLITE_KA_BAND'
      });
      this.addLedgerEntry(
        'DECISION',
        'CLOUD DATA UPLOADED & SAVED: Red plasma beam uplink from Watch Tower 01 Superior Node to Orbital Satellite completed cloud archival',
        'NODE-SUPERIOR',
        99,
        this.aggregatedHazardConfidence,
        0.05,
        'NORMAL',
        'NARRATIVE: LOCAL EDGE OPERATION CONTINUES ↓ HAZARD COMPLETE / BACK TO NORMAL ↓ CLOUD DATA UPLOADED & SAVED'
      );
    });
  }

  // ==========================================
  // BAYESIAN EVIDENCE FUSION ENGINE
  // ==========================================
  public recomputeEvidenceFusion() {
    let totalScore = 0;
    const items: EvidenceItem[] = [];

    this.prototypeNodes.forEach(node => {
      node.sensors.forEach(s => {
        if (s.isAnomaly && s.healthStatus !== 'UNTRUSTED') {
          const trustWeight = s.sensorTrustPct / 100.0;
          const score = s.weight * trustWeight * (s.reSensingActive ? 1.2 : 1.0);
          totalScore += score;

          items.push({
            id: `EV-${node.id}-${s.type}`,
            nodeId: node.id,
            sensorType: s.type,
            sensorLabel: s.label,
            hazardType: this.activeHazard?.type || 'NONE',
            detectedValue: s.value,
            unit: s.unit,
            sensorTrustPct: s.sensorTrustPct,
            anomalyScore: score,
            reSensedConfirmed: s.reSensingActive,
            timestamp: Date.now(),
            summary: `${s.label}: ${s.value} ${s.unit} (Trust: ${s.sensorTrustPct}%)`,
            isCorroboratingEvidence: node.isCorroborating,
            status: 'SUPPORTING'
          });
        }
      });
    });

    this.evidencePool = items;
    const previousConfidence = this.aggregatedHazardConfidence;
    this.aggregatedHazardConfidence = Math.min(1.0, Math.max(0.04, totalScore));

    // Dispatch Evidence Fusion beams from all contributing field nodes strictly to NODE-SUPERIOR (Watch Tower 01)
    if (this.currentNarrativeStepIndex >= 10) {
      const contributingNodeIds = Array.from(new Set(items.map(i => i.nodeId)));
      contributingNodeIds.forEach(nid => {
        if (nid !== 'NODE-SUPERIOR') {
          this.dispatchLoRaPacket(nid, 'NODE-SUPERIOR', 'EVENT_ALERT', {
            fusion_conf: Number(this.aggregatedHazardConfidence.toFixed(2)),
            evidence_items: items.filter(i => i.nodeId === nid).length
          }, true);
        }
      });
    }

    // Determine state
    let nextState: SystemState = 'NORMAL';
    if (this.aggregatedHazardConfidence >= 0.85) {
      nextState = 'CRITICAL';
    } else if (this.aggregatedHazardConfidence >= 0.65) {
      nextState = 'WARNING';
    } else if (this.aggregatedHazardConfidence >= 0.35) {
      nextState = 'WATCH';
    }

    if (nextState !== this.systemState) {
      this.systemState = nextState;

      if (nextState === 'WARNING' || nextState === 'CRITICAL') {
        if (this.currentNarrativeStepIndex >= 14) {
          soundManager.playCriticalSiren();
          this.triggerWatchtowerAlarm(true, 'SIREN');
        }
      } else if (nextState === 'WATCH') {
        soundManager.playWatchPing();
      } else if (nextState === 'NORMAL') {
        this.triggerWatchtowerAlarm(false);
      }

      this.addLedgerEntry(
        'DECISION',
        `System state escalated to ${nextState} (Confidence: ${(this.aggregatedHazardConfidence * 100).toFixed(0)}%)`,
        undefined,
        undefined,
        previousConfidence,
        this.aggregatedHazardConfidence,
        nextState,
        `Multi-sensor evidence convergence crossed the ${nextState} decision boundary.`
      );
    }

    this.recordConfidencePoint(`Fusion update: ${this.systemState}`);
    this.notify();
  }

  // ==========================================
  // LORA PACKET MANAGEMENT
  // ==========================================
  public dispatchLoRaPacket(
    source: NodeId | 'LOCAL_COMPUTER',
    dest: NodeId | 'LOCAL_COMPUTER' | 'BROADCAST',
    type: LoRaPacket['messageType'],
    measurements: Record<string, string | number>,
    silentRefresh: boolean = false
  ) {
    // Never dispatch a 3D beam to or from LOCAL_COMPUTER (which has no 3D sensor node mesh)
    if (source === 'LOCAL_COMPUTER' || dest === 'LOCAL_COMPUTER' || dest === 'BROADCAST') {
      return;
    }

    const srcNode = this.getNode(source);
    const isDestSatellite = dest === 'NODE-SATELLITE';
    const dstNode = isDestSatellite ? undefined : this.getNode(dest);
    if (!srcNode || (!dstNode && !isDestSatellite)) return;
    if (srcNode.loraStatus === 'DISCONNECTED') return;

    // If a beam already exists between these two nodes, keep it alive smoothly without duplicate stacking
    const existing = this.activePackets.find(
      p => (p.sourceNodeId === source && p.destinationNodeId === dest) ||
           (silentRefresh && p.sourceNodeId === dest && p.destinationNodeId === source)
    );
    if (existing) {
      existing.progress = Math.min(existing.progress || 0.22, 0.22);
      existing.messageType = type;
      existing.measurementSummary = measurements;
      existing.timestamp = Date.now();
      if (!silentRefresh) {
        this.notify();
      }
      return;
    }

    this.packetSeqCounter++;
    const pktId = `PKT-${this.packetSeqCounter}`;

    const startPos: [number, number, number] = [...srcNode.position];
    const endPos: [number, number, number] = isDestSatellite
      ? [44.0, 58.0, -36.0]
      : [...dstNode!.position];

    const pkt: LoRaPacket = {
      id: pktId,
      sourceNodeId: source,
      destinationNodeId: dest,
      messageType: type,
      timestamp: Date.now(),
      sequenceNumber: this.packetSeqCounter,
      sensorTrustPct: srcNode.overallSensorTrustPct,
      hazardConfidence: this.aggregatedHazardConfidence,
      sensorHealth: 'GOOD',
      measurementSummary: measurements,
      crc: 'VALID',
      messageStatus: 'TRANSMITTING',
      rssi: -82 - Math.floor(Math.random() * 8),
      snr: 7.8 + (Math.random() * 1.5),
      frequencyMHz: 868.1,
      progress: 0,
      startPos,
      endPos
    };

    this.activePackets.push(pkt);

    if (!silentRefresh) {
      soundManager.playRadioChirp();
      this.addLog(
        'LORA',
        `LoRa ${type}: ${source} → ${dest}`,
        `Payload: ${JSON.stringify(measurements)} | RSSI: ${pkt.rssi} dBm`,
        'info',
        source as NodeId,
        pktId
      );
      this.notify();
    }
  }

  // ==========================================
  // LEDGER & CONFIDENCE TIMELINE
  // ==========================================
  private addLedgerEntry(
    phase: EvidenceLedgerEntry['phase'],
    action: string,
    nodeId?: NodeId,
    sensorTrustPct?: number,
    confBefore: number = 0.05,
    confAfter: number = 0.05,
    stateAfter: SystemState = 'NORMAL',
    explanation: string = ''
  ) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0').slice(0, 2)}`;

    const entry: EvidenceLedgerEntry = {
      id: `LEDGER-${Date.now().toString().slice(-5)}`,
      eventId: `EV-${Date.now().toString().slice(-4)}`,
      timestamp: Date.now(),
      timeString: timeStr,
      phase,
      action,
      nodeId,
      sensorTrustPct,
      hazardConfidenceBefore: confBefore,
      hazardConfidenceAfter: confAfter,
      systemStateBefore: this.systemState,
      systemStateAfter: stateAfter,
      explanation,
      isEscalationTrigger: confAfter > confBefore && stateAfter !== 'NORMAL'
    };

    this.evidenceLedger.unshift(entry);
    if (this.evidenceLedger.length > 50) this.evidenceLedger.pop();
  }

  public recordConfidencePoint(note?: string) {
    const now = new Date();
    const timeStr = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    this.confidenceHistory.push({
      timeString: timeStr,
      timestamp: Date.now(),
      hazardConfidence: this.aggregatedHazardConfidence,
      node1Trust: this.node1TrustPct,
      node2Trust: this.node2TrustPct,
      state: this.systemState,
      eventNote: note
    });
    if (this.confidenceHistory.length > 40) this.confidenceHistory.shift();
  }

  public addLog(
    category: LogEntry['category'],
    title: string,
    description: string,
    level: LogEntry['level'] = 'info',
    nodeId?: NodeId,
    packetId?: string
  ) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const log: LogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString().slice(2, 5)}`,
      timestamp: Date.now(),
      timeString: timeStr,
      category,
      title,
      description,
      level,
      nodeId,
      packetId,
      sensorTrustPct: nodeId === 'NODE-1' ? this.node1TrustPct : nodeId === 'NODE-2' ? this.node2TrustPct : nodeId === 'NODE-3' ? this.node3TrustPct : undefined,
      hazardConfidence: this.aggregatedHazardConfidence
    };

    this.logs.unshift(log);
    if (this.logs.length > 100) this.logs.pop();
  }

  // ==========================================
  // RUNTIME TICK (Animation, Packets, Demo)
  // ==========================================
  private beamSustainerTimer: number = 0;

  public tick(dt: number) {
    if (this.isPaused) return;

    // Advance soundwave propagation progress if Watch Tower siren is sounding
    if (this.isWatchtowerSirenActive) {
      this.watchtowerSoundwaveProgress = (this.watchtowerSoundwaveProgress + dt * 0.45) % 1.0;
    }

    // Advance active LoRa communication & fusion beams
    for (let i = this.activePackets.length - 1; i >= 0; i--) {
      const pkt = this.activePackets[i];
      pkt.progress = (pkt.progress || 0) + dt * 0.28;
      if (pkt.progress >= 1.0) {
        this.activePackets.splice(i, 1);
      }
    }

    // Sustain active peer corroboration (Step >= 7) and Superior Node evidence fusion (Step >= 10) beams during active hazards
    this.beamSustainerTimer += dt;
    if (this.beamSustainerTimer >= 0.85) {
      this.beamSustainerTimer = 0;
      const hType = this.activeHazard?.type;

      // Sustain Red Volumetric Plasma Beam from Superior Node -> Orbital Satellite when uploading to cloud
      if (this.isCloudUploading || this.currentNarrativeStepIndex >= 17) {
        this.dispatchLoRaPacket('NODE-SUPERIOR', 'NODE-SATELLITE', 'CLOUD_UPLOAD', {
          status: 'CLOUD_DATA_UPLOADED_AND_SAVED',
          saved_events: this.evidenceLedger.length
        }, true);
      }

      if (hType) {
        const allowPeerBeams = this.currentNarrativeStepIndex >= 7;
        const allowSuperiorBeams = this.currentNarrativeStepIndex >= 10;

        if (hType === 'FLOOD' || hType === 'EXTREME_RAIN' || hType === 'MULTI_HAZARD') {
          if (allowPeerBeams) {
            this.dispatchLoRaPacket('NODE-FLOOD-1', 'NODE-1', 'VERIFY_REQUEST', { event: 'FLOOD_CORROBORATE', water_m: 4.85 }, true);
          }
          if (allowSuperiorBeams) {
            this.dispatchLoRaPacket('NODE-FLOOD-1', 'NODE-SUPERIOR', 'EVENT_ALERT', { event: 'FLOOD_EVIDENCE_FUSION', water_m: 4.85 }, true);
            this.dispatchLoRaPacket('NODE-1', 'NODE-SUPERIOR', 'EVENT_ALERT', { event: 'FLOOD_EVIDENCE_FUSION', water_m: 3.90 }, true);
          }
        }
        if (hType === 'FOREST_FIRE' || hType === 'MULTI_HAZARD') {
          if (allowPeerBeams) {
            this.dispatchLoRaPacket('NODE-2', 'NODE-FIRE-2', 'VERIFY_REQUEST', { event: 'FIRE_CORROBORATE', smoke_ppm: 185.0 }, true);
          }
          if (allowSuperiorBeams) {
            this.dispatchLoRaPacket('NODE-2', 'NODE-SUPERIOR', 'EVENT_ALERT', { event: 'FIRE_EVIDENCE_FUSION', smoke_ppm: 185.0 }, true);
            this.dispatchLoRaPacket('NODE-FIRE-2', 'NODE-SUPERIOR', 'EVENT_ALERT', { event: 'FIRE_EVIDENCE_FUSION', temp_c: 52.0 }, true);
          }
        }
        if (hType === 'LANDSLIDE' || hType === 'MULTI_HAZARD') {
          if (allowPeerBeams) {
            this.dispatchLoRaPacket('NODE-3', 'NODE-LANDSLIDE-2', 'VERIFY_REQUEST', { event: 'SLOPE_CORROBORATE', seismic_g: 1.48 }, true);
          }
          if (allowSuperiorBeams) {
            this.dispatchLoRaPacket('NODE-3', 'NODE-SUPERIOR', 'EVENT_ALERT', { event: 'SLOPE_EVIDENCE_FUSION', seismic_g: 1.48 }, true);
            this.dispatchLoRaPacket('NODE-LANDSLIDE-2', 'NODE-SUPERIOR', 'EVENT_ALERT', { event: 'SLOPE_EVIDENCE_FUSION', tilt_deg: 11.4 }, true);
          }
        }
        if (hType === 'AIR_QUALITY_EVENT') {
          if (allowPeerBeams) {
            this.dispatchLoRaPacket('NODE-2', 'NODE-FIRE-2', 'VERIFY_REQUEST', { event: 'PLUME_CORROBORATE', aqi: 275.0 }, true);
          }
          if (allowSuperiorBeams) {
            this.dispatchLoRaPacket('NODE-2', 'NODE-SUPERIOR', 'EVENT_ALERT', { event: 'AQI_EVIDENCE_FUSION', smoke_ppm: 245.0 }, true);
          }
        }
        if (hType === 'EXTREME_HEAT') {
          if (allowPeerBeams) {
            this.dispatchLoRaPacket('NODE-1', 'NODE-2', 'VERIFY_REQUEST', { event: 'THERMAL_CORROBORATE', temp_c: 47.2 }, true);
          }
          if (allowSuperiorBeams) {
            this.dispatchLoRaPacket('NODE-1', 'NODE-SUPERIOR', 'EVENT_ALERT', { event: 'HEAT_EVIDENCE_FUSION', temp_c: 47.2 }, true);
          }
        }
      } else if (this.isFalseAlarmScenarioActive) {
        this.dispatchLoRaPacket('NODE-1', 'NODE-2', 'VERIFY_REQUEST', { type: 'WATER_SPIKE_CHECK', val: 4.8 }, true);
        this.dispatchLoRaPacket('NODE-2', 'NODE-1', 'VERIFY_RESPONSE', { status: 'CLEAR_WEATHER_REJECT' }, true);
      } else if (this.isDemoRunning) {
        const step = JUDGE_DEMO_STEPS[this.currentDemoStepIndex];
        if (step && step.stepIndex === 4) {
          this.dispatchLoRaPacket('NODE-FLOOD-1', 'NODE-1', 'VERIFY_REQUEST', { type: 'WATER_SURGE', val_m: 4.85 }, true);
        } else if (step && step.stepIndex === 5) {
          this.dispatchLoRaPacket('NODE-1', 'NODE-FLOOD-1', 'VERIFY_RESPONSE', { status: 'CORROBORATED_SURGE', rain_mm: 68 }, true);
        } else if (step && (step.stepIndex === 6 || step.stepIndex === 7 || step.stepIndex === 8 || step.stepIndex === 9)) {
          this.dispatchLoRaPacket('NODE-FLOOD-1', 'NODE-1', 'VERIFY_RESPONSE', { status: 'CORROBORATED_SURGE' }, true);
          this.dispatchLoRaPacket('NODE-FLOOD-1', 'NODE-SUPERIOR', 'EVENT_ALERT', { conf: 0.94, state: 'CRITICAL' }, true);
          this.dispatchLoRaPacket('NODE-1', 'NODE-SUPERIOR', 'EVENT_ALERT', { conf: 0.94, state: 'CRITICAL' }, true);
        }
      }
    }
  }

  // ==========================================
  // 90-SECOND JUDGE DEMO EXECUTION
  // ==========================================
  public startJudgeDemo() {
    this.clearHazard();
    this.isDemoRunning = true;
    this.currentDemoStepIndex = 0;
    this.executeCurrentDemoStep();
    this.notify();
  }

  public stopJudgeDemo() {
    if (this.demoTimerId) {
      clearTimeout(this.demoTimerId);
      this.demoTimerId = null;
    }
    this.isDemoRunning = false;
    this.isDemoPaused = false;
    this.notify();
  }

  public pauseJudgeDemo() {
    if (this.demoTimerId) {
      clearTimeout(this.demoTimerId);
      this.demoTimerId = null;
    }
    const elapsed = Date.now() - this.demoStepStartTime;
    const step = JUDGE_DEMO_STEPS[this.currentDemoStepIndex];
    if (step) {
      this.demoRemainingTimeMs = Math.max(1000, step.durationMs - elapsed);
    }
    this.isDemoPaused = true;
    this.notify();
  }

  public resumeJudgeDemo() {
    this.isDemoPaused = false;
    this.demoStepStartTime = Date.now();
    this.demoTimerId = setTimeout(() => {
      this.nextJudgeDemoStep();
    }, this.demoRemainingTimeMs || 5000);
    this.notify();
  }

  public jumpToJudgeDemoStep(idx: number) {
    if (idx >= 0 && idx < JUDGE_DEMO_STEPS.length) {
      this.currentDemoStepIndex = idx;
      this.isDemoPaused = false;
      this.executeCurrentDemoStep();
    }
  }

  public nextJudgeDemoStep() {
    if (this.currentDemoStepIndex < JUDGE_DEMO_STEPS.length - 1) {
      this.currentDemoStepIndex++;
      this.executeCurrentDemoStep();
    } else {
      this.stopJudgeDemo();
    }
  }

  public prevJudgeDemoStep() {
    if (this.currentDemoStepIndex > 0) {
      this.currentDemoStepIndex--;
      this.executeCurrentDemoStep();
    }
  }

  private executeCurrentDemoStep() {
    if (this.demoTimerId) {
      clearTimeout(this.demoTimerId);
      this.demoTimerId = null;
    }

    const step = JUDGE_DEMO_STEPS[this.currentDemoStepIndex];
    if (!step) return;

    this.demoStepStartTime = Date.now();
    this.demoRemainingTimeMs = step.durationMs;

    this.systemState = step.systemState;
    this.aggregatedHazardConfidence = step.hazardConfidence;
    this.setWeather(step.weather);

    if (step.cameraMode === 'DEPLOYMENT_AERIAL') {
      this.isRiskHeatmapActive = true;
      this.isNodePlacementActive = true;
    } else {
      this.isRiskHeatmapActive = false;
    }

    // Synchronize 19-step narrative index with the 9 Judge Demo steps
    const stepToNarrativeMap: Record<number, number> = {
      1: 1,  // NORMAL -> RAIN / ENVIRONMENTAL CHANGE
      2: 3,  // ANOMALY DETECTED -> "IS THIS REAL?"
      3: 5,  // RE-SENSE -> PERSISTENT EVIDENCE
      4: 7,  // "ASK THE NEIGHBOUR" -> LoRa VERIFY_REQUEST
      5: 9,  // INDEPENDENT CORROBORATION -> LoRa VERIFY_RESPONSE
      6: 11, // SUPERIOR NODE -> EVIDENCE FUSION
      7: 14, // CONFIDENCE > ALERT THRESHOLD -> WARNING -> BUZZER / SIREN
      8: 16, // WAN FAILURE -> LOCAL EDGE OPERATION CONTINUES
      9: 18  // HAZARD COMPLETE / BACK TO NORMAL -> CLOUD DATA UPLOADED & SAVED
    };
    this.setNarrativeStep(stepToNarrativeMap[step.stepIndex] ?? 0);

    // Trigger step-specific packet transmissions and alerts
    if (step.stepIndex === 2) {
      const floodNode1 = this.getNode('NODE-FLOOD-1');
      if (floodNode1) {
        floodNode1.sensors[0].value = 4.85;
        floodNode1.sensors[0].isAnomaly = true;
        floodNode1.state = 'WATCH';
      }
      soundManager.playWatchPing();
    } else if (step.stepIndex === 3) {
      const floodNode1 = this.getNode('NODE-FLOOD-1');
      if (floodNode1) {
        floodNode1.isReSensing = true;
        floodNode1.samplingRateHz = 5.0;
      }
    } else if (step.stepIndex === 4) {
      this.dispatchLoRaPacket('NODE-FLOOD-1', 'NODE-1', 'VERIFY_REQUEST', { type: 'WATER_SURGE', val_m: 4.85 });
    } else if (step.stepIndex === 5) {
      const node1 = this.getNode('NODE-1');
      if (node1) {
        node1.isCorroborating = true;
        node1.state = 'WARNING';
      }
      this.dispatchLoRaPacket('NODE-1', 'NODE-FLOOD-1', 'VERIFY_RESPONSE', { status: 'CONFIRMED_RAIN_SURGE', rain_mm: 68 });
    } else if (step.stepIndex === 6) {
      this.dispatchLoRaPacket('NODE-FLOOD-1', 'NODE-SUPERIOR', 'EVENT_ALERT', { conf: 0.88, state: 'WARNING' });
      this.dispatchLoRaPacket('NODE-1', 'NODE-SUPERIOR', 'EVENT_ALERT', { conf: 0.88, state: 'WARNING' });
    } else if (step.stepIndex === 7) {
      soundManager.playCriticalSiren();
      this.triggerWatchtowerAlarm(true, 'SIREN');
    } else if (step.stepIndex === 8) {
      this.isInternetOnline = false;
    } else if (step.stepIndex === 9) {
      this.triggerWatchtowerAlarm(false);
      this.triggerCloudDataUpload(10000);
    }

    this.addLog('SYSTEM', `Demo Step ${step.stepIndex}: ${step.title}`, step.description, 'info');
    this.recordConfidencePoint(`Demo: ${step.phase}`);
    this.notify();

    // Auto-advance after step duration
    this.demoTimerId = setTimeout(() => {
      this.nextJudgeDemoStep();
    }, step.durationMs);
  }
}

export const simulationEngine = new SimulationEngine();
