import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  simulationEngine, 
  LOCAL_COMPUTER_POSITION,
  RISK_ZONES,
  PLACEMENT_CANDIDATES
} from '../engine/simulationEngine';
import { NodeId, LoRaPacket, WeatherMode, CameraMode, SensorNode } from '../types/simulation';
import { cinematicDemoManager, CinematicCameraDriver } from '../cinematic/CinematicDemoManager';
import { qualityManager } from '../cinematic/QualityManager';
import { 
  Radio, 
  Flame, 
  Droplets, 
  Camera, 
  Compass, 
  Laptop,
  Layers,
  Zap,
  CloudRain,
  Sun,
  Moon,
  Wind,
  Eye,
  Maximize2,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  X,
  MapPin,
  Sliders,
  RotateCw,
  Move,
  Grid,
  Crosshair,
  Copy,
  Trash2,
  Check,
  BellRing
} from 'lucide-react';

export interface ClickedObjectInfo {
  id: string;
  name: string;
  category: 'NODE' | 'RIVER' | 'VILLAGE' | 'FOREST' | 'HILLSIDE' | 'COMMAND_CENTER' | 'HAZARD' | 'INFRASTRUCTURE';
  status: string;
  details: string;
  position: [number, number, number];
  nodeId?: NodeId;
}

interface ThreeSceneProps {
  onSelectNode: (nodeId: NodeId) => void;
  onSelectPacket: (packet: LoRaPacket) => void;
  selectedNodeId: NodeId | null;
  onInspectNodeModal?: (nodeId: NodeId) => void;
}

export const ThreeScene: React.FC<ThreeSceneProps> = ({
  onSelectNode,
  onSelectPacket,
  selectedNodeId,
  onInspectNodeModal
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeCameraView, setActiveCameraView] = useState<CameraMode>('FREE_CAMERA');
  const activeCameraViewRef = useRef<CameraMode>('FREE_CAMERA');
  const [showControlsHint, setShowControlsHint] = useState<boolean>(true);
  const [clickedObject, setClickedObject] = useState<ClickedObjectInfo | null>(null);

  // Temporary Coordinate Reference Graph & Surveyor Probe (Turned off primarily)
  const [isCoordinateGridActive, setIsCoordinateGridActive] = useState<boolean>(false);
  const isCoordinateGridActiveRef = useRef<boolean>(false);
  const [hoveredCoords, setHoveredCoords] = useState<{ x: number; y: number; z: number } | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Dynamic meshes & systems
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const terrainMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const roadMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const fireParticlesRef = useRef<THREE.Points | null>(null);
  const emberParticlesRef = useRef<THREE.Points | null>(null);
  const smokeParticlesRef = useRef<THREE.Points | null>(null);
  const forestFireGroupRef = useRef<THREE.Group | null>(null);
  interface FlameMeshInfo {
    mesh: THREE.Mesh;
    baseY: number;
    baseScaleY: number;
    speed: number;
    phase: number;
  }
  const flameMeshesRef = useRef<FlameMeshInfo[]>([]);
  const secondaryFireLightsRef = useRef<THREE.PointLight[]>([]);
  const rainParticlesRef = useRef<THREE.Points | null>(null);
  const pollutionSmokeRef = useRef<THREE.Points | null>(null);
  const landslideDebrisRef = useRef<THREE.Group | null>(null);
  const landslideDustParticlesRef = useRef<THREE.Points | null>(null);
  const factorySmokeRef = useRef<THREE.Points | null>(null);
  const factoryBeaconRef = useRef<THREE.PointLight | null>(null);
  
  // Dynamic disaster hillside elements: rolling boulders, slumping trees, soil slip, and river surge
  interface RollingBoulderInfo {
    mesh: THREE.Mesh;
    startX: number;
    startY: number;
    startZ: number;
    baseRotX: number;
    baseRotY: number;
    baseRotZ: number;
    radius: number;
    targetX: number;
    targetZ: number;
  }
  const rollingBouldersRef = useRef<RollingBoulderInfo[]>([]);
  const rollingProgressRef = useRef<number>(0);
  
  interface HillsideSlidingTreeInfo {
    tree: THREE.Group;
    baseX: number;
    baseY: number;
    baseZ: number;
    baseRotX: number;
    baseRotZ: number;
    tiltMultiplier: number;
    slideMultiplier: number;
    isRiverRunoutTree?: boolean;
    targetRiverX?: number;
    targetRiverZ?: number;
    targetTiltZ?: number;
  }
  const slidingTreesRef = useRef<HillsideSlidingTreeInfo[]>([]);
  const slideAnimProgressRef = useRef<number>(0);
  const baseTerrainYRef = useRef<Float32Array | null>(null);
  const baseTerrainColorsRef = useRef<Float32Array | null>(null);
  const baseWaterYRef = useRef<Float32Array | null>(null);
  const baseWaterPosRef = useRef<{ x: Float32Array; y: Float32Array; z: Float32Array } | null>(null);
  const riverSplashParticlesRef = useRef<THREE.Points | null>(null);
  const landslideWaterSplashRef = useRef<THREE.Points | null>(null);
  const splashParticlesDataRef = useRef<{
    vx: Float32Array;
    vy: Float32Array;
    vz: Float32Array;
    life: Float32Array;
    maxLife: Float32Array;
  } | null>(null);
  const floodSpilloverMeshRef = useRef<THREE.Mesh | null>(null);
  const baseFloodSpillPosRef = useRef<{ x: Float32Array; y: Float32Array; z: Float32Array } | null>(null);
  const floodProgressRef = useRef<number>(0);

  interface FlowingSoilClod {
    mesh: THREE.Mesh;
    startX: number;
    startZ: number;
    targetX: number;
    targetZ: number;
    speed: number;
    rotSpeed: number;
    radius: number;
  }
  const flowingSoilClodsRef = useRef<FlowingSoilClod[]>([]);
  const flowingMudMeshRef = useRef<THREE.Mesh | null>(null);

  const packetMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const nodeMarkersRef = useRef<Map<string, THREE.Group>>(new Map());

  // Risk heatmap and dense grid comparison groups
  const riskHeatmapGroupRef = useRef<THREE.Group | null>(null);
  const denseGridGroupRef = useRef<THREE.Group | null>(null);
  const virtualNodesGroupRef = useRef<THREE.Group | null>(null);
  const coordinateGraphGroupRef = useRef<THREE.Group | null>(null);
  const coordinatePinsGroupRef = useRef<THREE.Group | null>(null);
  const hoverReticleRef = useRef<THREE.Group | null>(null);

  // Watch Tower & Siren / Soundwave references
  const watchtowerGroupRef = useRef<THREE.Group | null>(null);
  const watchtowerBeaconLightRef = useRef<THREE.PointLight | null>(null);
  const watchtowerBeaconMeshRef = useRef<THREE.Mesh | null>(null);
  const watchtowerSoundwavesRef = useRef<THREE.Group | null>(null);
  const watchtowerBadgeMeshRef = useRef<THREE.Sprite | null>(null);
  const watchtowerCpuLedRef = useRef<THREE.Mesh | null>(null);
  const watchtowerAqiLedRef = useRef<THREE.Mesh | null>(null);

  // Mountain water torrents & spray references (excess water from mountains feeding river flood)
  const mountainWaterGroupRef = useRef<THREE.Group | null>(null);
  const mountainWaterfallsRef = useRef<THREE.Mesh[]>([]);
  interface MountainStreamHandle {
    mesh: THREE.Mesh;
    basePos: { x: Float32Array; y: Float32Array; z: Float32Array };
    wColors: Float32Array;
    flowDirection: { x: number; z: number };
    baseSpeed: number;
    baseScale: { x: number; y: number; z: number };
  }
  const mountainStreamsRef = useRef<MountainStreamHandle[]>([]);
  const mountainSprayParticlesRef = useRef<THREE.Points | null>(null);

  interface NodeBadgeHandle {
    sprite: THREE.Sprite;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
    title: string;
    details: string;
    accentColor: string;
    lastState?: string;
  }
  const nodeBadgesMapRef = useRef<Map<string, NodeBadgeHandle>>(new Map());

  // 20 Villagers Evacuation references (running towards the emergency shed during disaster)
  interface VillagerEntity {
    id: number;
    houseIndex: number;
    homeX: number;
    homeZ: number;
    targetX: number;
    targetZ: number;
    group: THREE.Group;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    runProgress: number; // 0.0 at home to 1.0 at assembly point
    speed: number;
    startDelay: number;
    /** Pre-cached ground elevations — eliminates per-frame getMountainTerrainElevation calls */
    homeGroundY: number;
    targetGroundY: number;
  }
  const villagersRef = useRef<VillagerEntity[]>([]);
  const chemicalOutletTrickleRef = useRef<THREE.Mesh | null>(null);
  
  // Lighting references (Daylight / Overcast High Visibility Suite)
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const fireLightRef = useRef<THREE.PointLight | null>(null);
  const lightningLightRef = useRef<THREE.PointLight | null>(null);

  // Camera targets & interpolation
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 24, 38));
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.5, 0));
  const keysDownRef = useRef<{ [key: string]: boolean }>({});
  const isCinematicRunningRef = useRef<boolean>(false);
  const cinematicAngleRef = useRef<number>(0);
  const isTransitioningRef = useRef<boolean>(false);

  // Lightning state — drives the multi-flash thunder sequence
  const lightningTimerRef  = useRef<number>(0);   // countdown to next strike (seconds)
  const lightningPhaseRef  = useRef<number>(0);   // 0=idle, 1=flash1, 2=dark, 3=flash2, 4=decay
  const lightningPhaseTRef = useRef<number>(0);   // time within current phase
  const lightningLastTimeRef = useRef<number>(0); // previous frame's time for dt calculation

  // ── Cinematic Demo camera driver state ──────────────────────────────────
  // These are read every frame by the animate loop when isCinematicDemoRef is true.
  // We keep them as plain refs (not React state) to avoid triggering re-renders.
  const isCinematicDemoRef = useRef<boolean>(false);

  // flyTo target — set by CinematicCameraDriver.flyTo()
  interface CinFlyTarget {
    startPos: THREE.Vector3;
    startLook: THREE.Vector3;
    targetPos: THREE.Vector3;
    targetLook: THREE.Vector3;
    duration: number;       // seconds
    elapsed: number;        // seconds
    easing: 'linear' | 'ease-out' | 'ease-in-out';
  }
  const cinFlyRef = useRef<CinFlyTarget | null>(null);

  // orbit — set by CinematicCameraDriver.startOrbit()
  interface CinOrbit {
    centre: THREE.Vector3;
    radius: number;
    height: number;
    speedRad: number;
    angle: number;
  }
  const cinOrbitRef = useRef<CinOrbit | null>(null);

  // Auto-dismiss keyboard hint after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowControlsHint(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  const onSelectNodeRef = useRef(onSelectNode);
  onSelectNodeRef.current = onSelectNode;

  const onSelectPacketRef = useRef(onSelectPacket);
  onSelectPacketRef.current = onSelectPacket;

  const selectedNodeIdRef = useRef(selectedNodeId);
  selectedNodeIdRef.current = selectedNodeId;

  // Camera Mode Dispatcher
  const switchCameraMode = useCallback((mode: CameraMode) => {
    activeCameraViewRef.current = mode;
    setActiveCameraView(mode);
    if (simulationEngine.cameraMode !== mode) {
      simulationEngine.setCameraMode(mode);
    }
    if (!controlsRef.current) return;

    isCinematicRunningRef.current = (mode === 'CINEMATIC' || mode === 'DISASTER_CINEMATIC');
    isTransitioningRef.current = !isCinematicRunningRef.current;

    const currNodeId = selectedNodeIdRef.current;

    switch (mode) {
      case 'COMMAND_CENTER':
        targetCamPosRef.current.set(0, 4.2, 5.8);
        targetLookAtRef.current.set(0, 1.8, 0);
        break;
      case 'FOREST_OVERVIEW':
        targetCamPosRef.current.set(-16, 9, -2);
        targetLookAtRef.current.set(-16, 1.2, -12);
        break;
      case 'FLOOD_OVERVIEW':
        targetCamPosRef.current.set(18.0, 24.0, -18.0);
        targetLookAtRef.current.set(16.0, 2.0, -48.0);
        break;
      case 'HILLSIDE_OVERVIEW':
        targetCamPosRef.current.set(-6, 22, 54);
        targetLookAtRef.current.set(-28, 9, 32);
        break;
      case 'NODE_INSPECTION':
        if (currNodeId === 'NODE-SUPERIOR') {
          targetCamPosRef.current.set(54.0, 18.5, 12.0);
          targetLookAtRef.current.set(42.5, 14.5, 2.5);
        } else if (currNodeId === 'NODE-1') {
          // Flood Node 2 at [42.5, 1.2, 2.5]
          targetCamPosRef.current.set(48.5, 3.2, 7.5);
          targetLookAtRef.current.set(42.5, 1.2, 2.5);
        } else if (currNodeId === 'NODE-FLOOD-1') {
          // Flood Node 1 at [17.6, 0.45, -53.3] (under mountain gorge)
          targetCamPosRef.current.set(22.5, 3.2, -48.0);
          targetLookAtRef.current.set(17.6, 0.8, -53.3);
        } else if (currNodeId === 'NODE-2') {
          // Forest Fire Node 1 at [-16.0, 1.2, -12.0]
          targetCamPosRef.current.set(-13.0, 2.8, -8.0);
          targetLookAtRef.current.set(-16.0, 1.2, -12.0);
        } else if (currNodeId === 'NODE-FIRE-2') {
          // Forest Fire Node 2 at [-41.6, 2.5, -38.8]
          targetCamPosRef.current.set(-37.5, 4.5, -34.5);
          targetLookAtRef.current.set(-41.6, 2.5, -38.8);
        } else if (currNodeId === 'NODE-3') {
          // Landslide Node 1 at [-35.7, 16.84, 41.7]
          targetCamPosRef.current.set(-32.0, 19.5, 45.5);
          targetLookAtRef.current.set(-35.7, 16.84, 41.7);
        } else if (currNodeId === 'NODE-LANDSLIDE-2') {
          // Landslide Node 2 at [-9.0, 3.2, 34.7]
          targetCamPosRef.current.set(-5.5, 5.2, 38.5);
          targetLookAtRef.current.set(-9.0, 3.2, 34.7);
        } else {
          const n = simulationEngine.nodes.find(pn => pn.id === currNodeId);
          if (n) {
            targetCamPosRef.current.set(n.position[0] + 4.5, n.position[1] + 3.0, n.position[2] + 4.5);
            targetLookAtRef.current.set(n.position[0], n.position[1] + 0.8, n.position[2]);
          }
        }
        break;
      case 'WATCHTOWER_FOCUS':
        targetCamPosRef.current.set(56.0, 19.5, 14.0);
        targetLookAtRef.current.set(42.5, 14.0, 2.5);
        break;
      case 'DEPLOYMENT_AERIAL':
        targetCamPosRef.current.set(0, 92, 0.05);
        targetLookAtRef.current.set(0, 0, 0);
        break;
      case 'FACTORY_OVERVIEW':
        targetCamPosRef.current.set(44, 22, -18);
        targetLookAtRef.current.set(44, 6, -36);
        break;
      case 'DISASTER_CINEMATIC':
      case 'CINEMATIC':
        isCinematicRunningRef.current = true;
        break;
      case 'CINEMATIC_DEMO':
        // Hand full camera control to CinematicDemoManager — disable orbit & transitions
        isCinematicRunningRef.current = false;
        isTransitioningRef.current = false;
        isCinematicDemoRef.current = true;
        break;
      case 'HEAT_OVERVIEW':
        targetCamPosRef.current.set(24, 14, 26);
        targetLookAtRef.current.set(24, 1.8, 16);
        break;
      case 'DRONE_SURVEY':
      case 'EVACUATION_DRONE':
      case 'DRONE_DISASTER':
        targetCamPosRef.current.set(0, 55, 35);
        targetLookAtRef.current.set(0, 0, 0);
        break;
      case 'NETWORK_VIEW':
        targetCamPosRef.current.set(0, 48, 0.01);
        targetLookAtRef.current.set(0, 0, 0);
        break;
      case 'FREE_CAMERA':
      default:
        targetCamPosRef.current.set(0, 24, 38);
        targetLookAtRef.current.set(0, 1.5, 0);
        break;
    }
  }, []);

  const lastEngineCameraModeRef = useRef<CameraMode>(simulationEngine.cameraMode);

  useEffect(() => {
    isCoordinateGridActiveRef.current = isCoordinateGridActive;
  }, [isCoordinateGridActive]);

  // Sync external camera/weather requests from SimulationEngine
  useEffect(() => {
    return simulationEngine.subscribe(() => {
      const extMode = simulationEngine.cameraMode;
      // Only switch if simulationEngine explicitly changed cameraMode to something new
      if (extMode && extMode !== lastEngineCameraModeRef.current) {
        lastEngineCameraModeRef.current = extMode;
        if (extMode !== 'FREE_CAMERA') {
          switchCameraMode(extMode);
        }
      }
      if (simulationEngine.isCoordinateGridActive !== isCoordinateGridActiveRef.current) {
        setIsCoordinateGridActive(simulationEngine.isCoordinateGridActive);
      }
    });
  }, [switchCameraMode]);

  // Main Three.js Setup Effect
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. SCENE WITH NATURAL DAYLIGHT ATMOSPHERE (NO DARK THEME!)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa5cbf5); // Clean realistic daylight sky
    scene.fog = new THREE.FogExp2(0xd6e8fa, 0.0020); // Crisp, clear mountain visibility
    sceneRef.current = scene;

    // 2. CAMERA
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 24, 38);
    cameraRef.current = camera;

    // 3. RENDERER — settings scaled to device quality tier
    const qc = qualityManager.config;
    const renderer = new THREE.WebGLRenderer({ antialias: qc.antialias, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(qc.pixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // High-performance filtered shadow map
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. FULL 360-DEGREE ORBIT & GAME CAMERA CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.05; // Prevent camera dipping below terrain
    controls.minDistance = 2.0;
    controls.maxDistance = 280;
    controls.rotateSpeed = 0.9;
    controls.panSpeed = 1.0;
    controls.screenSpacePanning = true;
    controls.target.set(0, 1.5, 0);

    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,   // Holding scroll wheel to move the view
      RIGHT: THREE.MOUSE.ROTATE  // Holding right button of the mouse to rotate the view
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    // Prevent browser context menu on right click so holding right button to rotate is smooth and uninterrupted
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);

    controls.addEventListener('start', () => {
      isTransitioningRef.current = false;
      isCinematicRunningRef.current = false;
      // Stop cinematic demo if user grabs the camera
      if (isCinematicDemoRef.current) {
        isCinematicDemoRef.current = false;
        cinematicDemoManager.stop();
      }
      activeCameraViewRef.current = 'FREE_CAMERA';
      setActiveCameraView('FREE_CAMERA');
      lastEngineCameraModeRef.current = 'FREE_CAMERA';
      simulationEngine.cameraMode = 'FREE_CAMERA';
    });

    controls.addEventListener('change', () => {
      targetCamPosRef.current.copy(camera.position);
      targetLookAtRef.current.copy(controls.target);
    });

    controls.addEventListener('end', () => {
      isTransitioningRef.current = false;
      targetCamPosRef.current.copy(camera.position);
      targetLookAtRef.current.copy(controls.target);
    });

    controlsRef.current = controls;

    // 5. BRIGHT REALISTIC DAYLIGHT SUITE
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 1.25);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemiLight = new THREE.HemisphereLight(0xbfdbfe, 0x334155, 0.85);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.3);
    sunLight.position.set(48, 75, 42);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width  = qc.shadowMapSize;
    sunLight.shadow.mapSize.height = qc.shadowMapSize;
    sunLight.shadow.camera.near = 15;
    sunLight.shadow.camera.far = 200;
    const sf = qc.shadowFrustum;
    sunLight.shadow.camera.left   = -sf;
    sunLight.shadow.camera.right  =  sf;
    sunLight.shadow.camera.top    =  sf;
    sunLight.shadow.camera.bottom = -sf;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Dynamic fire point lights — spread across full burning zone
    const fireLight = new THREE.PointLight(0xff4400, 0, 90);
    fireLight.position.set(-18, 4.5, -13);
    scene.add(fireLight);
    fireLightRef.current = fireLight;

    const fireLight2 = new THREE.PointLight(0xff5500, 0, 85);
    fireLight2.position.set(-26, 4.5, -15);
    scene.add(fireLight2);

    const fireLight3 = new THREE.PointLight(0xff6600, 0, 80);
    fireLight3.position.set(-11, 4.0, -10);
    scene.add(fireLight3);

    const fireLight4 = new THREE.PointLight(0xff4400, 0, 80);
    fireLight4.position.set(-20, 4.5,  -4);
    scene.add(fireLight4);

    const fireLight5 = new THREE.PointLight(0xff5500, 0, 75);
    fireLight5.position.set(-30, 4.0, -13);
    scene.add(fireLight5);

    secondaryFireLightsRef.current = [fireLight2, fireLight3, fireLight4, fireLight5];

    // Lightning flash lights — very high range/intensity so they're visible from far camera distances
    const lightning = new THREE.PointLight(0xdbeeff, 0, 600);
    lightning.position.set(5, 60, 5);
    scene.add(lightning);
    lightningLightRef.current = lightning;

    // Second lightning light — factory/east zone
    const lightning2 = new THREE.PointLight(0xdbeeff, 0, 500);
    lightning2.position.set(40, 58, -20);
    scene.add(lightning2);

    // Third lightning light — hill/west zone
    const lightning3 = new THREE.PointLight(0xdbeeff, 0, 500);
    lightning3.position.set(-30, 58, 30);
    scene.add(lightning3);

    // Store all three
    (lightningLightRef as React.MutableRefObject<THREE.PointLight & { extra?: THREE.PointLight[] }>).current = lightning;
    (lightningLightRef.current as THREE.PointLight & { extra?: THREE.PointLight[] }).extra = [lightning2, lightning3];

    // 6. PROCEDURAL DIGITAL TWIN ENVIRONMENT
    buildRealisticTerrain(scene);
    buildDenseForestZone(scene);
    buildRealisticRiverAndBridge(scene);
    buildDetailedVillage(scene);
    buildLargeFactoryComplex(scene);
    buildHillsideLandslideZone(scene);
    buildPrototypeFieldNodes(scene);
    buildWatchTowerMesh(scene);
    buildRealisticMountainWaterSystem(scene);
    buildDisasterParticles(scene);
    buildVolumetricForestFire(scene);
    buildRiskHeatmapLayers(scene);
    buildTraditionalDenseGridMesh(scene);
    buildVirtualScaleNodesMesh(scene);
    buildCoordinateGraphLayer(scene);
    buildHoverReticleMesh(scene);
    buildCoordinatePinsGroup(scene);

    // 7. KEYBOARD WASD & GAME CONTROLS
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      keysDownRef.current[e.code] = true;

      // R key: Reset camera to FREE_CAMERA
      if (e.code === 'KeyR') {
        switchCameraMode('FREE_CAMERA');
      }

      if (e.code === 'KeyG') {
        const next = !simulationEngine.isCoordinateGridActive;
        simulationEngine.setCoordinateGrid(next);
        setIsCoordinateGridActive(next);
      }
      if (e.code === 'Escape') {
        isCinematicRunningRef.current = false;
        isCinematicDemoRef.current = false;
        cinematicDemoManager.stop();
        activeCameraViewRef.current = 'FREE_CAMERA';
        setActiveCameraView('FREE_CAMERA');
        setClickedObject(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 8. RAYCASTER FOR INTERACTIVE CLICKING & DOUBLE-CLICK FOCUS
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let mouseDownPos = { x: 0, y: 0 };
    let prevMousePos = { x: 0, y: 0 };
    let isRightDown = false;
    let isMiddleDown = false;
    let isLeftDown = false;

    const handleMouseDown = (e: MouseEvent) => {
      mouseDownPos = { x: e.clientX, y: e.clientY };
      prevMousePos = { x: e.clientX, y: e.clientY };
      if (e.button === 2) isRightDown = true;
      if (e.button === 1) isMiddleDown = true;
      if (e.button === 0) isLeftDown = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) isRightDown = false;
      if (e.button === 1) isMiddleDown = false;
      if (e.button === 0) isLeftDown = false;
    };

    const handleGlobalMouseUp = () => {
      isRightDown = false;
      isMiddleDown = false;
      isLeftDown = false;
    };

    const handleClick = (e: MouseEvent) => {
      const dist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
      if (dist > 6) return; // User dragged to rotate or move, not a point click

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      for (const hit of intersects) {
        let cur: THREE.Object3D | null = hit.object;
        while (cur && cur !== scene) {
          if (cur.userData?.nodeId) {
            const nId = cur.userData.nodeId as NodeId;
            onSelectNodeRef.current(nId);
            const foundNode = simulationEngine.nodes.find(n => n.id === nId);
            setClickedObject({
              id: nId,
              name: nId === 'NODE-1' 
                ? 'Node 01 — Floodplain Station (Physical Prototype)' 
                : nId === 'NODE-2'
                ? 'Node 02 — Forest Boundary Station (Physical Prototype)'
                : nId === 'NODE-3'
                ? 'Node 03 — Escarpment & Slope Station (Physical Prototype)'
                : nId === 'NODE-4'
                ? 'Node 04 — Watch Tower Atmospheric Station (Physical Prototype)'
                : `${foundNode?.name || nId} (Virtual Scale Node)`,
              category: 'NODE',
              status: nId === 'NODE-SUPERIOR'
                ? (simulationEngine.isWatchtowerSirenActive ? '🚨 ALARM SIREN ACTIVE' : 'MONITORING & ARMED')
                : (foundNode ? foundNode.state : 'ONLINE'),
              details: nId === 'NODE-1' 
                ? 'ESP32-S3 + SX1262 LoRa · HC-SR04 Ultrasonic & Optical Rain Transducer' 
                : nId === 'NODE-2'
                ? 'ESP32-S3 + SX1262 LoRa · MQ-2 Smoke, BME688 & IR Flame Sensors'
                : nId === 'NODE-3'
                ? 'ESP32-S3 + SX1262 LoRa · Seismic Geophone & Soil Saturation Sensor'
                : nId === 'NODE-4'
                ? 'ESP32-S3 + SX1262 LoRa · Tall 20m Atmospheric Mast at Watch Tower, SPS30 Laser PM2.5/PM10 & MQ-135 Gas Sensors'
                : 'Targeted Virtual Candidate Node positioned strictly in high-vulnerability corridor.',
              position: foundNode ? foundNode.position : [0, 0, 0],
              nodeId: nId
            });
            return;
          }
          if (cur.userData?.packet) {
            onSelectPacketRef.current(cur.userData.packet as LoRaPacket);
            return;
          }
          if (cur.name === 'riverWater' || cur.name === 'riverBridge') {
            setClickedObject({
              id: 'river-floodplain',
              name: 'River Corridor & Floodplain Basin',
              category: 'RIVER',
              status: simulationEngine.activeHazard?.type === 'FLOOD' ? 'FLOODING' : 'NORMAL LEVEL',
              details: 'Critical bottleneck: Waterway crossing bridge with low-lying residential village. Targeted Node 01 deployed here for maximum flood warning lead time.',
              position: [14, 0.6, -6]
            });
            return;
          }
          if (cur.name === 'forestZone') {
            setClickedObject({
              id: 'forest-sector',
              name: 'Sector Alpha — Forest Reserve Boundary',
              category: 'FOREST',
              status: simulationEngine.activeHazard?.type === 'FOREST_FIRE' ? 'ACTIVE FIRE' : 'CLEAR',
              details: 'Dense pine timberland subject to dry seasonal winds toward village. Targeted Node 02 deployed on perimeter ridge.',
              position: [-16, 1.2, -12]
            });
            return;
          }
          if (cur.name === 'villageZone') {
            setClickedObject({
              id: 'village-sector',
              name: 'Low-Lying Village Settlement',
              category: 'VILLAGE',
              status: simulationEngine.systemState,
              details: 'Downstream residential homes and road junction directly exposed to riverbank overflow during extreme catchment rain.',
              position: [40.0, 1.0, 32.0]
            });
            return;
          }
          if (cur.name === 'hillsideLandslideZone' || cur.name === 'landslideDebris') {
            setClickedObject({
              id: 'hillside-landslide',
              name: 'Western Escarpment Slope & Landslide Zone',
              category: 'HILLSIDE',
              status: simulationEngine.activeHazard?.type === 'LANDSLIDE' ? 'ACTIVE SLOPE COLLAPSE' : 'MONITORED STABLE',
              details: 'Steep hill area composed of exposed soil, mud slip chutes, and fractured rock scree. Monitored by tilt and seismic geophone sensors for slope failure.',
              position: [-10, 4.2, 14]
            });
            return;
          }
          if (cur.name === 'largeFactoryComplex' || cur.name === 'factoryChimney') {
            setClickedObject({
              id: 'factory-complex',
              name: 'Valdoria Heavy Manufacturing & Thermal Facility',
              category: 'INFRASTRUCTURE',
              status: simulationEngine.activeHazard?.type === 'AIR_QUALITY_EVENT' ? 'EXCESS EMISSION WARNING' : 'OPERATIONAL',
              details: 'Major industrial manufacturing plant and thermal facility with 3 continuous exhaust chimneys. Real-time particulate matter (PM2.5/PM10), CO, and VOC emissions tracked by IoT sensor Node 02.',
              position: [44.0, 10.0, -36.0]
            });
            return;
          }
          cur = cur.parent;
        }
      }

      // If scale graph is active and user clicked on the terrain ground (for precision placement planning):
      if (simulationEngine.isCoordinateGridActive && intersects.length > 0) {
        const groundHit = intersects.find(hit => 
          hit.object === terrainMeshRef.current || 
          (hit.point && Math.abs(hit.point.x) <= 75 && Math.abs(hit.point.z) <= 75)
        );
        if (groundHit) {
          const pt = groundHit.point;
          simulationEngine.addCoordinatePin(pt.x, pt.y, pt.z);
          const coordText = `X: ${pt.x.toFixed(1)}, Z: ${pt.z.toFixed(1)}`;
          if (navigator.clipboard) {
            navigator.clipboard.writeText(coordText).catch(() => {});
          }
          setCopiedNotification(`📍 Dropped Pin at [${coordText}] (Elevation: ${pt.y.toFixed(2)}m) · Coordinates copied!`);
          setTimeout(() => setCopiedNotification(null), 4000);
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const dx = e.clientX - prevMousePos.x;
      const dy = e.clientY - prevMousePos.y;
      prevMousePos = { x: e.clientX, y: e.clientY };

      // SIMULTANEOUS ROTATE & MOVE:
      // Active when:
      // 1. Right click is held together with Middle click (scroll wheel) or Left click
      // 2. OR Right click is held while Shift key is pressed
      // 3. OR both buttons 2 & 4 or 2 & 1 are active
      // 4. OR isSimultaneousRotateMove mode is enabled in simulationEngine
      const hasSimultaneous = 
        (isRightDown && (isMiddleDown || isLeftDown)) ||
        (isRightDown && e.shiftKey) ||
        ((e.buttons & 2) !== 0 && ((e.buttons & 4) !== 0 || (e.buttons & 1) !== 0 || e.shiftKey)) ||
        (simulationEngine.isSimultaneousRotateMove && (isRightDown || isMiddleDown || isLeftDown));

      if (hasSimultaneous && (dx !== 0 || dy !== 0) && controlsRef.current && cameraRef.current) {
        isTransitioningRef.current = false;
        isCinematicRunningRef.current = false;
        activeCameraViewRef.current = 'FREE_CAMERA';
        simulationEngine.cameraMode = 'FREE_CAMERA';

        const ctrl = controlsRef.current;
        const cam = cameraRef.current;

        // A. MOVE / PAN (translates camera position and target together across terrain)
        const panSpeed = 0.042;
        const forward = new THREE.Vector3().subVectors(ctrl.target, cam.position).setY(0).normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const panDelta = new THREE.Vector3()
          .addScaledVector(right, -dx * panSpeed)
          .addScaledVector(forward, dy * panSpeed);

        cam.position.add(panDelta);
        ctrl.target.add(panDelta);

        // B. ROTATE / ORBIT (orbits camera 360 degrees around the newly moved target)
        const rotSpeed = 0.0055;
        const offset = new THREE.Vector3().subVectors(cam.position, ctrl.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -dx * rotSpeed);
        offset.applyAxisAngle(right, -dy * rotSpeed);

        if (ctrl.target.y + offset.y < 0.6) {
          offset.y = 0.6 - ctrl.target.y;
        }

        cam.position.copy(ctrl.target).add(offset);
        cam.lookAt(ctrl.target);
        ctrl.update();

        targetCamPosRef.current.copy(cam.position);
        targetLookAtRef.current.copy(ctrl.target);
      }

      if (simulationEngine.isCoordinateGridActive && terrainMeshRef.current) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(terrainMeshRef.current, false);
        if (intersects.length > 0) {
          const pt = intersects[0].point;
          setHoveredCoords({ x: pt.x, y: pt.y, z: pt.z });
          if (hoverReticleRef.current) {
            hoverReticleRef.current.position.set(pt.x, pt.y + 0.05, pt.z);
            hoverReticleRef.current.visible = true;
          }
        } else {
          if (hoverReticleRef.current) hoverReticleRef.current.visible = false;
        }
      } else {
        if (hoverReticleRef.current) hoverReticleRef.current.visible = false;
      }
    };

    const handleMouseLeave = () => {
      isRightDown = false;
      isMiddleDown = false;
      isLeftDown = false;
      if (hoverReticleRef.current) hoverReticleRef.current.visible = false;
      setHoveredCoords(null);
    };

    const handleDoubleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        targetLookAtRef.current.copy(point);
        const offset = new THREE.Vector3().subVectors(camera.position, controls.target).normalize().multiplyScalar(12);
        targetCamPosRef.current.copy(point).add(offset);
        isTransitioningRef.current = true;
      }
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseleave', handleMouseLeave);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('dblclick', handleDoubleClick);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // 9. ANIMATION LOOP WITH WASD MOVEMENT & SMOOTH INTERPOLATION
    let lastTime = performance.now();
    let animId: number;

    // ── Easing helpers used by the cinematic driver ─────────────────────────
    const cinEaseInOut = (t: number) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    const cinEaseOut   = (t: number) => 1 - Math.pow(1 - t, 2.5);

    // ── Register the CinematicCameraDriver with the manager ─────────────────
    const cinematicDriver: CinematicCameraDriver = {
      flyTo(pos, look, durationSec, easing = 'ease-in-out') {
        cinFlyRef.current = {
          startPos:  camera.position.clone(),
          startLook: controls.target.clone(),
          targetPos:  new THREE.Vector3(...pos),
          targetLook: new THREE.Vector3(...look),
          duration: durationSec,
          elapsed:  0,
          easing,
        };
        // While flying, orbit is paused
        if (cinOrbitRef.current) cinOrbitRef.current = null;
      },
      snapTo(pos, look) {
        camera.position.set(...pos);
        controls.target.set(...look);
        controls.update();
        cinFlyRef.current  = null;
        cinOrbitRef.current = null;
        targetCamPosRef.current.set(...pos);
        targetLookAtRef.current.set(...look);
      },
      startOrbit(centre, radius, height, speedRad) {
        cinFlyRef.current = null;
        cinOrbitRef.current = {
          centre: new THREE.Vector3(...centre),
          radius,
          height,
          speedRad,
          // Initialise angle so camera starts from its current position
          angle: Math.atan2(
            camera.position.x - centre[0],
            camera.position.z - centre[2]
          ),
        };
      },
      stopOrbit() {
        cinOrbitRef.current = null;
      },
      getOrbitAngle() {
        return cinOrbitRef.current?.angle ?? 0;
      },
    };
    cinematicDemoManager.setDriver(cinematicDriver);

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      simulationEngine.tick(dt);

      // ── Advance CinematicDemoManager timers ────────────────────────────────
      cinematicDemoManager.tick(dt);

      // WASD Flight / Navigation
      const keys = keysDownRef.current;
      const hasWASD = keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'] || keys['KeyQ'] || keys['KeyE'];

      if (isCinematicDemoRef.current && simulationEngine.isCinematicDemoActive) {
        // ── CINEMATIC DEMO CAMERA ──────────────────────────────────────────
        // WASD/mouse cancel the cinematic immediately
        if (hasWASD) {
          isCinematicDemoRef.current = false;
          cinematicDemoManager.stop();
        } else {
          // Process active fly-to
          const fly = cinFlyRef.current;
          if (fly) {
            fly.elapsed += dt;
            const raw = Math.min(fly.elapsed / fly.duration, 1.0);
            const t = fly.easing === 'ease-out'
              ? cinEaseOut(raw)
              : fly.easing === 'linear'
                ? raw
                : cinEaseInOut(raw);

            camera.position.lerpVectors(fly.startPos, fly.targetPos, t);
            controls.target.lerpVectors(fly.startLook, fly.targetLook, t);

            if (raw >= 1.0) cinFlyRef.current = null;
          }

          // Process active orbit (overrides fly-to while active)
          const orb = cinOrbitRef.current;
          if (orb) {
            orb.angle += dt * orb.speedRad;
            const cx = orb.centre.x + Math.sin(orb.angle) * orb.radius;
            const cz = orb.centre.z + Math.cos(orb.angle) * orb.radius;
            camera.position.set(cx, orb.centre.y + orb.height, cz);
            controls.target.copy(orb.centre);
          }

          targetCamPosRef.current.copy(camera.position);
          targetLookAtRef.current.copy(controls.target);
          controls.update();
        }
      } else if (hasWASD) {
        isCinematicRunningRef.current = false;
        isTransitioningRef.current = false;
        activeCameraViewRef.current = 'FREE_CAMERA';
        setActiveCameraView('FREE_CAMERA');
        lastEngineCameraModeRef.current = 'FREE_CAMERA';
        simulationEngine.cameraMode = 'FREE_CAMERA';
        const moveSpeed = (keys['ShiftLeft'] || keys['ShiftRight'] ? 36.0 : 16.0) * dt;

        const forward = new THREE.Vector3().subVectors(controls.target, camera.position).setY(0).normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        const moveDelta = new THREE.Vector3();
        if (keys['KeyW']) moveDelta.add(forward.clone().multiplyScalar(moveSpeed));
        if (keys['KeyS']) moveDelta.add(forward.clone().multiplyScalar(-moveSpeed));
        if (keys['KeyD']) moveDelta.add(right.clone().multiplyScalar(moveSpeed));
        if (keys['KeyA']) moveDelta.add(right.clone().multiplyScalar(-moveSpeed));
        if (keys['KeyE']) moveDelta.y += moveSpeed;
        if (keys['KeyQ']) moveDelta.y -= moveSpeed;

        camera.position.add(moveDelta);
        controls.target.add(moveDelta);
        targetCamPosRef.current.copy(camera.position);
        targetLookAtRef.current.copy(controls.target);
      } else if (isCinematicRunningRef.current) {
        cinematicAngleRef.current += dt * 0.12;
        const rad = 36.0;
        const cx = Math.sin(cinematicAngleRef.current) * rad;
        const cz = Math.cos(cinematicAngleRef.current) * rad;
        const cy = 18.0 + Math.sin(cinematicAngleRef.current * 0.6) * 6.0;
        camera.position.set(cx, cy, cz);
        controls.target.set(0, 1.8, 0);
        targetCamPosRef.current.copy(camera.position);
        targetLookAtRef.current.copy(controls.target);
      } else if (isTransitioningRef.current) {
        camera.position.lerp(targetCamPosRef.current, 0.08);
        controls.target.lerp(targetLookAtRef.current, 0.08);
        if (camera.position.distanceTo(targetCamPosRef.current) < 0.15 &&
            controls.target.distanceTo(targetLookAtRef.current) < 0.15) {
          isTransitioningRef.current = false;
        }
      }

      controls.update();

      // Update dynamic layers (Water, particles, daylight lighting, packets, risk heatmap)
      updateSceneDynamicLayers(scene, time * 0.001);

      renderer.render(scene, camera);
    };

    const unsubNudge = simulationEngine.onCameraNudge((type) => {
      if (!controlsRef.current || !cameraRef.current) return;
      isTransitioningRef.current = false;
      isCinematicRunningRef.current = false;
      const ctrl = controlsRef.current;
      const cam = cameraRef.current;

      if (type === 'ROTATE_LEFT' || type === 'ROTATE_RIGHT') {
        const angle = (type === 'ROTATE_LEFT' ? 1 : -1) * (Math.PI / 8);
        const offset = new THREE.Vector3().subVectors(cam.position, ctrl.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        cam.position.copy(ctrl.target).add(offset);
        ctrl.update();
        targetCamPosRef.current.copy(cam.position);
        targetLookAtRef.current.copy(ctrl.target);
      } else if (type === 'PAN_LEFT' || type === 'PAN_RIGHT') {
        const dir = (type === 'PAN_LEFT' ? -1 : 1) * 6.0;
        const forward = new THREE.Vector3().subVectors(ctrl.target, cam.position).setY(0).normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const delta = right.multiplyScalar(dir);
        cam.position.add(delta);
        ctrl.target.add(delta);
        ctrl.update();
        targetCamPosRef.current.copy(cam.position);
        targetLookAtRef.current.copy(ctrl.target);
      } else if (type === 'RESET') {
        switchCameraMode('FREE_CAMERA');
      }
    });

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      unsubNudge();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseleave', handleMouseLeave);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('dblclick', handleDoubleClick);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // ==========================================
  // PROCEDURAL BUILDERS
  // ==========================================

  function getMountainTerrainElevation(x: number, z: number): number {
    let y = 0;
    // Hillside mountain topography - sweeping majestic mountain range extending northwest
    if (x < 7.5 && z > -8.0) {
      // 1. High peaks anchored deep in the northwest & far western territory
      const dSummitNorth = Math.hypot(x + 48.0, z - 46.0);
      const mtnSummit = Math.max(0, 21.0 - dSummitNorth * 0.44);

      const dRidgeNorth = Math.hypot(x + 40.0, z - 38.0);
      const mtnRidgeNorth = Math.max(0, 17.5 - dRidgeNorth * 0.42);

      const dRidgeWest = Math.hypot(x + 44.0, z - 28.0);
      const mtnRidgeWest = Math.max(0, 14.5 - dRidgeWest * 0.38);

      const dSouthShoulder = Math.hypot(x + 46.0, z - 14.0);
      const mtnSouthShoulder = Math.max(0, 11.5 - dSouthShoulder * 0.36);

      const rawMountain = Math.max(mtnSummit, mtnRidgeNorth, mtnRidgeWest, mtnSouthShoulder);

      // 2. Smooth, realistic riverward descending slope (Eastward in positive X):
      // As x advances from the western mountains (x = -40) eastward towards the river (bank at x ≈ 7.5),
      // the terrain smoothly, monotonically slopes DOWN towards the river valley.
      const riverSlopeRamp = Math.max(0, Math.min(1.0, (7.5 - x) / 46.0));
      
      // 3. Smooth, natural slope towards the forest (Southward in negative Z):
      // The southern end of the hill area gracefully slopes DOWN to seamlessly meet the forest floor
      // between z = 22 and z = -8, eliminating any cliff or drop-off
      const forestT = Math.max(0, Math.min(1.0, (z + 8.0) / 28.0));
      const forestSlopeRamp = forestT * forestT * (3.0 - 2.0 * forestT); // Cubic smoothstep

      // Gentle hillside terrace slope descending towards both the river and the forest
      const generalSlope = Math.pow(riverSlopeRamp, 1.35) * 8.0 * forestSlopeRamp;

      // Composite mountain height sloping down to the river and forest
      let hillHeight = (rawMountain * 0.72 + generalSlope) * riverSlopeRamp * forestSlopeRamp;

      // Soft natural terrain undulations
      hillHeight += (Math.sin(x * 0.32 + z * 0.22) * 0.40 + Math.cos(x * 0.25 - z * 0.28) * 0.30) * riverSlopeRamp * forestSlopeRamp;

      // Pinned Landslide concave slip chute on the upper mountain face (x: -32 to -22, z: 30 to 38)
      const lsDist = Math.hypot(x - (-28.0), z - 33.0);
      if (lsDist < 12.0) {
        const slipFactor = 1 - lsDist / 12.0;
        hillHeight -= slipFactor * 1.25;
        hillHeight += Math.sin(x * 1.6 + z * 1.3) * 0.15 * slipFactor;
      }
      y = Math.max(0, hillHeight);
    }
    // Center vantage for Local Command Center
    const distCenter = Math.sqrt(x * x + z * z);
    if (distCenter < 7) {
      y += Math.max(0, 2.0 - distCenter * 0.28);
    }
    // Continuous river basin carved in positive x through the entire valley
    if (x > 7 && x < 19) {
      const riverCenter = 13 + Math.sin(z * 0.12) * 2.2;
      const distToRiver = Math.abs(x - riverCenter);
      if (distToRiver < 5.5) {
        y -= (2.0 - distToRiver * 0.32);
      }
    }
    // Forest undulating knolls
    if (x < 0 && z < 0) {
      y += Math.sin(x * 0.22) * 0.6 + Math.cos(z * 0.22) * 0.6;
    }

    // NORTHERN REALISTIC ALPINE MOUNTAIN RANGE (from X: -35.2, Z: -72.0 to X: 53.3, Z: -70.4)
    // Directly modeled on the uploaded reference photo (image.png):
    // Towering craggy peaks, fluted vertical rock ribs, snowy couloirs, and deep gorge
    if (z < -46.0 && x >= -46.0 && x <= 64.0) {
      const tNorth = Math.min(1.0, Math.max(0.0, (-z - 46.0) / 24.0));
      const ramp = tNorth * tNorth * (3.0 - 2.0 * tNorth); // smoothstep

      // West Gorge Peak (peak flanking canyon on the west at X = 3.0, Z = -73.0)
      const dWestGorge = Math.hypot(x - 3.0, z - (-73.0));
      const mtnWestGorge = Math.max(0, 36.0 - dWestGorge * 1.08);

      // East Gorge Peak (peak flanking canyon on the east at X = 24.5, Z = -73.0)
      const dEastGorge = Math.hypot(x - 24.5, z - (-73.0));
      const mtnEastGorge = Math.max(0, 36.0 - dEastGorge * 1.08);

      // Distant Horn Summit behind canyon headwaters (X = 13.5, Z = -78.0)
      const dDistantHorn = Math.hypot(x - 13.5, z - (-78.0));
      const mtnDistantHorn = Math.max(0, 42.0 - dDistantHorn * 1.02);

      // Western Pyramid Peak (left peak in image.png, around X = -21.0, Z = -72.5)
      const dWest = Math.hypot(x - (-21.0), z - (-72.5));
      const mtnWest = Math.max(0, 32.0 - dWest * 1.15);
      const flutingWest = Math.sin(Math.atan2(z - (-72.5), x - (-22.0)) * 6.0) * 1.8;

      // Eastern Escarpment Bastion (right peak in image.png, around X = 43.0, Z = -71.5)
      const dEast = Math.hypot(x - 43.0, z - (-71.5));
      const mtnEast = Math.max(0, 34.0 - dEast * 1.10);

      // Far Western Anchor (X = -35.2, Z = -72.0)
      const dFarWest = Math.hypot(x - (-35.2), z - (-72.0));
      const mtnFarWest = Math.max(0, 24.0 - dFarWest * 0.95);

      // Far Eastern Anchor (X = 53.3, Z = -70.4)
      const dFarEast = Math.hypot(x - 53.3, z - (-70.4));
      const mtnFarEast = Math.max(0, 22.0 - dFarEast * 0.95);

      let mtnElevation = Math.max(mtnWestGorge, mtnEastGorge, mtnDistantHorn, mtnWest + flutingWest, mtnEast, mtnFarWest, mtnFarEast);

      y = Math.max(y, mtnElevation * ramp);
    }

    // EXACT RIVER CANYON CHANNEL CARVING
    // River flowing from (X: 11, Z: -64.5 to X: 15.4, Z: -63.6) down to (X: 10.3, Z: -46.1 to X: 17.9, Z: -46.1)
    if (z >= -66.5 && z <= -44.5) {
      const tRiv = Math.min(1.0, Math.max(0.0, (z - (-64.5)) / 18.4));
      const leftBankX = 11.0 + (10.3 - 11.0) * tRiv;
      const rightBankX = 15.4 + (17.9 - 15.4) * tRiv;
      const rivCenterX = (leftBankX + rightBankX) * 0.5;
      const rivHalfWidth = (rightBankX - leftBankX) * 0.5;
      const distFromRivCenter = Math.abs(x - rivCenterX);

      if (distFromRivCenter < rivHalfWidth + 4.5) {
        // Water surface elevation smoothly cascading down from 4.8m down to -0.65m at confluence
        const rivWaterY = -0.65 + (4.8 - (-0.65)) * Math.pow(1.0 - tRiv, 1.30);
        // Riverbed carved underneath water surface (deepest in center, curving up to banks)
        const bedDepth = 0.85 * (1.0 - Math.min(1.0, Math.pow(distFromRivCenter / rivHalfWidth, 2)));
        const targetBedY = rivWaterY - bedDepth;

        if (distFromRivCenter <= rivHalfWidth) {
          y = Math.min(y, targetBedY);
        } else {
          const bankRamp = (distFromRivCenter - rivHalfWidth) / 4.5;
          const smoothBank = bankRamp * bankRamp * (3.0 - 2.0 * bankRamp);
          const targetY = THREE.MathUtils.lerp(rivWaterY + 0.12, y, smoothBank);
          y = Math.min(y, targetY);
        }
      }
    }

    // Mountain canyon upstream gully feeding the river headwaters (Z: -74.0 to -64.5)
    if (z < -64.5 && z >= -74.0) {
      const tUp = Math.min(1.0, Math.max(0.0, (-64.5 - z) / 9.5));
      const gullyCenterX = 13.2;
      const gullyHalfWidth = 2.2 + 2.2 * tUp;
      const distGully = Math.abs(x - gullyCenterX);
      if (distGully < gullyHalfWidth + 4.0) {
        const gullyFloorY = 4.8 + 8.5 * tUp;
        if (distGully <= gullyHalfWidth) {
          y = Math.min(y, gullyFloorY);
        } else {
          const gRamp = (distGully - gullyHalfWidth) / 4.0;
          const smoothG = gRamp * gRamp * (3.0 - 2.0 * gRamp);
          y = Math.min(y, THREE.MathUtils.lerp(gullyFloorY + 0.15, y, smoothG));
        }
      }
    }

    // Terraced Plains below the river: Houses at grey spot (z=20 to 46), Factory at blue spot (z=-48 to -22), Evacuation zone (x=50 to 75)
    if (x >= 20 && x <= 75 && z >= -54 && z <= 54) {
      y = Math.max(y, 0.45); // Flat terrace safely elevated above river level, firmly grounding all village structures and shelter
    }

    // Make the surface completely plane / flat at the extreme outer borders of the land
    if (Math.abs(x) > 71 || z > 71 || z < -78) {
      const borderDist = Math.max(Math.abs(x) - 71, z > 71 ? z - 71 : -z - 78);
      const borderFactor = Math.min(1.0, Math.max(0.0, borderDist / 4.0));
      y = y * (1.0 - borderFactor);
    }
    return y;
  }

  // Mathematical influence function covering the landslide zone down into the lake
  function getLandslideZoneInfluence(x: number, z: number): number {
    if (x < -46.0 || x > 9.5 || z < 16.0 || z > 47.0) return 0;

    // Runout corridor sloping down into the lake (x: -12.6 to 9.5, z: 22.0 to 42.0)
    if (x > -12.6) {
      if (z >= 22.0 && z <= 42.0) {
        const lateralDist = Math.abs(z - 33.0);
        const lateralFactor = Math.max(0, 1.0 - lateralDist / 9.5);
        const forwardFactor = Math.max(0, 1.0 - (x - (-12.6)) / 22.1);
        return lateralFactor * (0.45 + forwardFactor * 0.55);
      }
      return 0;
    }

    // Triangle vertices A, B, C for upper slope
    const x1 = -42.0, z1 = 43.3;
    const x2 = -12.6, z2 = 34.0;
    const x3 = -36.8, z3 = 19.4;

    // Barycentric coordinates
    const det = (z2 - z3) * (x1 - x3) + (x3 - x2) * (z1 - z3);
    const w1 = ((z2 - z3) * (x - x3) + (x3 - x2) * (z - z3)) / det;
    const w2 = ((z3 - z1) * (x - x3) + (x1 - x3) * (z - z3)) / det;
    const w3 = 1.0 - w1 - w2;

    // Inside triangle with smooth edge buffer
    const minW = Math.min(w1, w2, w3);
    if (minW >= -0.22) {
      if (minW >= 0) return 1.0;
      return (minW + 0.22) / 0.22;
    }

    // Soft circular blend around centroid (-30.5, 32.2)
    const distCentroid = Math.hypot(x - (-30.5), z - 32.2);
    if (distCentroid < 19.5) {
      return Math.max(0, 1.0 - (distCentroid - 14.5) / 5.0);
    }
    return 0;
  }

  // Exact dynamic terrain elevation during active landslide deformation across the TOTAL pinned area
  // Displaced mud and soil slopes smoothly down into the lake
  function getDeformedTerrainElevation(x: number, z: number, sProgress: number): number {
    const baseY = getMountainTerrainElevation(x, z);
    if (sProgress <= 0.0001) return baseY;
    
    const factor = getLandslideZoneInfluence(x, z);
    if (factor > 0) {
      // Dynamic moving soil wave traveling downhill
      const slopeWave = Math.sin((x * 0.75 + z * 0.65) - sProgress * Math.PI * 2.8) * 0.35 * factor * sProgress;
      
      // Upper crest detachment drops, lower slope accumulates / bulges and slopes into the lake
      let slump = 0;
      if (x < -24) {
        slump = -1.65 * factor * sProgress;
      } else if (x <= 4.0) {
        slump = 0.85 * factor * sProgress;
      } else {
        // Displaced mud and soil slopes smoothly down off the terrace directly into the lake!
        // Lake water level is at -0.65; mud enters and slopes below water level to -0.85
        const tLake = Math.min(1.0, (x - 4.0) / 4.5);
        const slopeIntoLake = THREE.MathUtils.lerp(0.85, -0.85 - baseY, tLake) * factor * sProgress;
        slump = slopeIntoLake;
      }
      return baseY + slump + slopeWave;
    }
    return baseY;
  }

  function buildRealisticTerrain(scene: THREE.Scene) {
    // EXPANDED TERRAIN GEOMETRY (Optimized 96x96 grid: 9,216 vertices for high performance and smooth framerate)
    const geo = new THREE.PlaneGeometry(152, 152, 96, 96);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const baseY = new Float32Array(pos.count);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = getMountainTerrainElevation(x, z);
      pos.setY(i, y);
      baseY[i] = y;

      // VERTEX COLORING: Grass across normal plains; SOIL AND MUD for Landslide & Hill
      // Base natural pasture grass
      let r = 0.176 + Math.sin(x * 0.5 + z * 0.4) * 0.02;
      let g = 0.290 + Math.cos(x * 0.4 - z * 0.3) * 0.025;
      let b = 0.133 + Math.sin(x * 0.3 + z * 0.5) * 0.015;

      // Village landscaping and paved pathways at GREY SPOT (below river, left side: z=20 to 44, x=28 to 50)
      if (x >= 26 && x <= 52 && z >= 18 && z <= 46) {
        const vDist = Math.hypot(x - 40.0, z - 32.0);
        if (vDist < 16) {
          const vFactor = Math.min(1.0, Math.max(0.0, 1.0 - (vDist - 8) / 8.0));
          const vR = 0.22 + Math.sin(x * 1.5 + z * 1.2) * 0.02;
          const vG = 0.38 + Math.cos(x * 1.2 - z * 1.5) * 0.02;
          const vB = 0.16;
          r = r * (1 - vFactor) + vR * vFactor;
          g = g * (1 - vFactor) + vG * vFactor;
          b = b * (1 - vFactor) + vB * vFactor;
        }
      }

      // Factory industrial concrete / gravel yard coloring at BLUE SPOT (below river, right side: z=-48 to -24, x=28 to 56)
      if (x >= 28 && x <= 58 && z >= -50 && z <= -22) {
        const indDist = Math.hypot(x - 44, z - (-36));
        if (indDist < 18) {
          const indFactor = Math.min(1.0, Math.max(0.0, 1.0 - (indDist - 8) / 10.0));
          const indR = 0.33 + Math.sin(x * 2.2 + z * 1.8) * 0.02;
          const indG = 0.35 + Math.cos(x * 1.8 - z * 2.2) * 0.02;
          const indB = 0.37 + Math.sin(x + z) * 0.01;
          r = r * (1 - indFactor) + indR * indFactor;
          g = g * (1 - indFactor) + indG * indFactor;
          b = b * (1 - indFactor) + indB * indFactor;
        }
      }

      // Check if inside Landslide and Hill area
      const lsDist = Math.hypot(x - (-11.5), z - 14.2);
      const isHill = (x < -1 && z > -4);

      if (lsDist < 7.8) {
        // LANDSLIDE AREA: STRICTLY SOIL AND MUD - NOT GRASS!
        const mudFactor = Math.min(1.0, Math.max(0.0, 1.0 - lsDist / 7.8));
        
        // Deep dark wet mud in center chute vs churned clay/soil around slip margins
        const isCoreMud = (lsDist < 4.8);
        const noise = Math.sin(x * 2.4 + z * 1.9) * 0.04;
        
        let targetR: number, targetG: number, targetB: number;
        if (isCoreMud) {
          // Dark wet viscous mud
          targetR = 0.22 + noise;
          targetG = 0.13 + noise * 0.6;
          targetB = 0.07 + noise * 0.4;
        } else {
          // Exposed earthy soil, clay, and gravel sediment
          targetR = 0.35 + noise;
          targetG = 0.22 + noise * 0.7;
          targetB = 0.13 + noise * 0.5;
        }

        // Blend strictly to soil/mud (no grass in landslide area)
        r = r * (1 - mudFactor) + targetR * mudFactor;
        g = g * (1 - mudFactor) + targetG * mudFactor;
        b = b * (1 - mudFactor) + targetB * mudFactor;
      } else if (isHill && y > 0.6) {
        // Mountain slopes and ridges:
        // Mountain flanks are lush alpine mountain grass; only the highest mountain peak crests have mountain timberline earth
        const peakFactor = Math.min(1.0, Math.max(0.0, (y - 9.0) / 4.0));
        const noise = Math.sin(x * 0.9 - z * 0.8) * 0.025;

        // Mountain grass (natural deep alpine meadow green)
        const mtnGrassR = 0.165 + noise;
        const mtnGrassG = 0.285 + noise;
        const mtnGrassB = 0.125 + noise * 0.5;

        // High mountain peak timberline earth
        const peakR = 0.38 + noise;
        const peakG = 0.31 + noise * 0.8;
        const peakB = 0.23 + noise * 0.6;

        r = mtnGrassR * (1 - peakFactor) + peakR * peakFactor;
        g = mtnGrassG * (1 - peakFactor) + peakG * peakFactor;
        b = mtnGrassB * (1 - peakFactor) + peakB * peakFactor;
      } else if (z < -46.0 && y > 1.0) {
        // Northern Realistic Alpine Mountains (from reference image)
        const peakT = Math.min(1.0, Math.max(0.0, (y - 10.0) / 18.0));
        const noiseMtn = Math.sin(x * 1.4 - z * 1.1) * 0.035;
        
        // Vertical couloir snow streaks
        const isSnowCouloir = Math.abs(Math.sin(x * 0.5 + z * 0.25)) < 0.24 && y > 12.0;
        
        if (isSnowCouloir) {
          // White snow and bright pale alpine limestone scree in gullies
          r = 0.90 + noiseMtn * 0.5;
          g = 0.92 + noiseMtn * 0.5;
          b = 0.96;
        } else if (peakT > 0.45) {
          // Warm granite / limestone buff rock faces matching photo
          r = 0.68 + noiseMtn;
          g = 0.62 + noiseMtn * 0.8;
          b = 0.52 + noiseMtn * 0.6;
        } else {
          // Alpine grass and slate lower slopes
          const grassBlend = 1.0 - Math.min(1.0, peakT * 2.0);
          r = THREE.MathUtils.lerp(0.46, 0.14, grassBlend) + noiseMtn;
          g = THREE.MathUtils.lerp(0.44, 0.35, grassBlend) + noiseMtn;
          b = THREE.MathUtils.lerp(0.40, 0.18, grassBlend);
        }
      }

      // Wet riverbed & rocky shores for river flowing from (11, -64.5 to 15.4, -63.6) to (10.3, -46.1 to 17.9, -46.1)
      if (z >= -66.5 && z <= -44.5) {
        const tRiv = Math.min(1.0, Math.max(0.0, (z - (-64.5)) / 18.4));
        const leftBankX = 11.0 + (10.3 - 11.0) * tRiv;
        const rightBankX = 15.4 + (17.9 - 15.4) * tRiv;
        const rivCenterX = (leftBankX + rightBankX) * 0.5;
        const rivHalfWidth = (rightBankX - leftBankX) * 0.5;
        const distChannel = Math.abs(x - rivCenterX);
        if (distChannel < rivHalfWidth + 3.0) {
          const bedBlend = Math.min(1.0, Math.max(0.0, 1.0 - (distChannel - rivHalfWidth * 0.6) / (rivHalfWidth * 0.4 + 3.0)));
          const noiseBed = Math.sin(x * 3.5 + z * 2.8) * 0.03;
          r = THREE.MathUtils.lerp(r, 0.20 + noiseBed, bedBlend);
          g = THREE.MathUtils.lerp(g, 0.26 + noiseBed, bedBlend);
          b = THREE.MathUtils.lerp(b, 0.32 + noiseBed, bedBlend);
        }
      }

      colors[i * 3] = Math.max(0, Math.min(1, r));
      colors[i * 3 + 1] = Math.max(0, Math.min(1, g));
      colors[i * 3 + 2] = Math.max(0, Math.min(1, b));
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    baseTerrainYRef.current = baseY;
    baseTerrainColorsRef.current = new Float32Array(colors);

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.84,
      metalness: 0.05,
      flatShading: true
    });
    terrainMaterialRef.current = terrainMat;

    const terrain = new THREE.Mesh(geo, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);
    terrainMeshRef.current = terrain;

    // Scattered natural boulders & rocks across lowlands - firmly planted on the land
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88, flatShading: true });
    for (let r = 0; r < 24; r++) {
      const rx = (Math.random() - 0.5) * 60;
      const rz = (Math.random() - 0.5) * 60;
      // Strictly avoid roads, river corridor, and specified mountain river region
      if (Math.abs(rx - 13) < 4 || Math.abs(rx) < 5 || (rx < -2 && rz > 2)) continue;
      if (rx >= 7.5 && rx <= 21.0 && rz >= -67.0 && rz <= -43.0) continue;
      const rockRadius = 0.35 + Math.random() * 0.5;
      const rockGeo = new THREE.DodecahedronGeometry(rockRadius);
      const rockMesh = new THREE.Mesh(rockGeo, rockMat);
      const groundY = getMountainTerrainElevation(rx, rz);
      // Rock center adjusted so the bottom sits firmly in and on the land
      rockMesh.position.set(rx, groundY + rockRadius * 0.45, rz);
      rockMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rockMesh.castShadow = true;
      rockMesh.receiveShadow = true;
      scene.add(rockMesh);
    }

    // Permanent Landmark Shoreline Rock on the left corner bank matching user screenshot
    const lakeRockGeo = new THREE.DodecahedronGeometry(0.82, 0);
    const lakeRockMesh = new THREE.Mesh(lakeRockGeo, rockMat);
    const lakeRockY = getMountainTerrainElevation(5.2, -15.8) + 0.82 * 0.45;
    lakeRockMesh.position.set(5.2, lakeRockY, -15.8);
    lakeRockMesh.rotation.set(0.3, 0.7, 0.2);
    lakeRockMesh.castShadow = true;
    lakeRockMesh.receiveShadow = true;
    scene.add(lakeRockMesh);
  }

  interface BurningTreeDef {
    x: number;
    z: number;
    scale: number;
    isBirch: boolean;
  }

  const BURNING_TREES: BurningTreeDef[] = [
    // Original core ignition cluster
    { x: -18.2, z: -14.2, scale: 1.15, isBirch: false },
    { x: -15.8, z: -16.0, scale: 1.05, isBirch: false },
    { x: -20.5, z: -12.5, scale: 1.20, isBirch: true  },
    { x: -13.8, z: -13.2, scale: 0.95, isBirch: false },
    { x: -17.2, z: -10.5, scale: 1.10, isBirch: false },
    { x: -21.8, z: -15.2, scale: 1.00, isBirch: false },
    { x: -19.6, z: -17.5, scale: 1.08, isBirch: false },
    // Fire spreading north
    { x: -16.4, z:  -8.2, scale: 1.05, isBirch: false },
    { x: -22.4, z:  -9.0, scale: 1.12, isBirch: false },
    { x: -14.2, z:  -7.0, scale: 0.98, isBirch: true  },
    { x: -25.0, z: -11.5, scale: 1.18, isBirch: false },
    // Fire spreading west — deeper into dense forest
    { x: -24.6, z: -17.0, scale: 1.10, isBirch: false },
    { x: -27.2, z: -14.2, scale: 1.05, isBirch: true  },
    { x: -26.0, z: -19.5, scale: 0.92, isBirch: false },
    // Fire spreading east toward forest edge
    { x: -11.5, z: -15.5, scale: 0.90, isBirch: false },
    { x: -10.2, z: -12.0, scale: 0.85, isBirch: false },
    // Further north spread — crown fire jumping
    { x: -12.8, z:  -5.2, scale: 1.02, isBirch: false },
    { x: -18.8, z:  -4.5, scale: 1.08, isBirch: true  },
    { x: -24.0, z:  -5.8, scale: 1.14, isBirch: false },
    { x: -20.5, z:  -2.5, scale: 0.96, isBirch: false },
    { x: -15.0, z:  -2.0, scale: 1.00, isBirch: false },
    // Further east spread into forest interior
    { x:  -8.5, z: -10.5, scale: 0.88, isBirch: false },
    { x:  -7.2, z: -14.8, scale: 0.82, isBirch: false },
    { x:  -9.0, z:  -7.5, scale: 0.94, isBirch: true  },
    // Further west — dense pine zone
    { x: -30.0, z: -12.5, scale: 1.15, isBirch: false },
    { x: -29.5, z: -17.8, scale: 1.10, isBirch: false },
    { x: -32.0, z: -14.0, scale: 1.05, isBirch: false },
    // North-east — bridging toward forest boundary
    { x: -13.0, z:  -0.5, scale: 0.90, isBirch: false },
    { x: -20.0, z:   0.8, scale: 0.95, isBirch: true  },
    { x: -27.5, z:  -2.0, scale: 1.02, isBirch: false },
  ];

  function buildDenseForestZone(scene: THREE.Scene) {
    const forest = new THREE.Group();
    forest.name = 'forestZone';

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x452b1b, roughness: 0.9 });
    const pineMat1 = new THREE.MeshStandardMaterial({ color: 0x164e28, roughness: 0.82, flatShading: true });
    const pineMat2 = new THREE.MeshStandardMaterial({ color: 0x226738, roughness: 0.78, flatShading: true });
    const birchFoliageMat = new THREE.MeshStandardMaterial({ color: 0x367c4d, roughness: 0.8, flatShading: true });

    // Place the specific cluster of trees that catch fire
    BURNING_TREES.forEach((bt) => {
      const tree = new THREE.Group();
      const scale = bt.scale;
      if (bt.isBirch) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.22 * scale, 2.0 * scale, 6), trunkMat);
        trunk.position.y = 1.0 * scale;
        trunk.castShadow = true;
        tree.add(trunk);

        const leafClusterGeo = new THREE.DodecahedronGeometry(1.3 * scale, 1);
        const leaves = new THREE.Mesh(leafClusterGeo, birchFoliageMat);
        leaves.position.y = 2.4 * scale;
        leaves.castShadow = true;
        tree.add(leaves);
      } else {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, 1.4 * scale, 6), trunkMat);
        trunk.position.y = 0.7 * scale;
        trunk.castShadow = true;
        tree.add(trunk);

        const tier1 = new THREE.Mesh(new THREE.ConeGeometry(1.1 * scale, 2.2 * scale, 6), pineMat1);
        tier1.position.y = 1.9 * scale;
        tier1.castShadow = true;
        tree.add(tier1);

        const tier2 = new THREE.Mesh(new THREE.ConeGeometry(0.85 * scale, 1.8 * scale, 6), pineMat2);
        tier2.position.y = 2.9 * scale;
        tier2.castShadow = true;
        tree.add(tier2);

        const tier3 = new THREE.Mesh(new THREE.ConeGeometry(0.55 * scale, 1.3 * scale, 6), pineMat1);
        tier3.position.y = 3.8 * scale;
        tier3.castShadow = true;
        tree.add(tier3);
      }

      const groundY = getMountainTerrainElevation(bt.x, bt.z);
      tree.position.set(bt.x, groundY - 0.05, bt.z);
      forest.add(tree);
    });

    // 2. DENSE WOODLAND CANOPY & UNDERSTORY
    const shrubMat1 = new THREE.MeshStandardMaterial({ color: 0x1e5a2c, roughness: 0.85, flatShading: true });
    const shrubMat2 = new THREE.MeshStandardMaterial({ color: 0x2d733b, roughness: 0.80, flatShading: true });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x3b5323, roughness: 0.95 });

    // Strict road, river, and station exclusion check
    const isExcludedZone = (x: number, z: number) => {
      // 1. SPECIFIED RIVER CORRIDOR CLEARING: Strictly remove all trees in region X: 7.5 to 21.0, Z: -66.5 to -43.5
      if (x >= 7.5 && x <= 21.0 && z >= -66.5 && z <= -43.5) return true;
      // General northern mountain water & gorge catchment clearance
      if (z <= -40.0 && x >= 3.0 && x <= 25.0) return true;
      // West highway leading to bridge: road centerline is at z = -6.0 across entire west land
      if (Math.abs(z - (-6.0)) < 5.2 && x < 9.0) return true;
      // River corridor and bridge deck
      if (x > 3.5 && x < 21.5) return true;
      // Riverfront highway along x = 24.0
      if (Math.abs(x - 24.0) < 5.2 && z > -16.0 && z < 56.0) return true;
      // Bridge east connector (x: 18 to 26, z: -10 to -3)
      if (x >= 18.0 && x <= 26.5 && Math.abs(z - (-6.0)) < 5.0) return true;
      // Village main avenue along x = 40.0
      if (Math.abs(x - 40.0) < 5.0 && z > 10.0 && z < 56.0) return true;
      // Village central promenade at z = 32.0
      if (Math.abs(z - 32.0) < 4.8 && x > 20.0 && x < 54.0) return true;
      // Village cross streets at z = 18.0 and z = 47.0
      if ((Math.abs(z - 18.0) < 4.4 || Math.abs(z - 47.0) < 4.4) && x > 20.0 && x < 52.0) return true;
      // Local Command center clearance at (0, 0)
      if (Math.hypot(x, z) < 8.0) return true;
      // Node 2 physical prototype station clearance
      if (Math.hypot(x + 16, z + 12) < 3.5) return true;
      // Burning trees cluster clearance
      if (BURNING_TREES.some(bt => Math.hypot(x - bt.x, z - bt.z) < 2.2)) return true;
      // Industrial factory zone at blue spot
      if (x > 26.0 && z < -18.0) return true;
      // NORTHERN ALPINE MOUNTAIN RANGE (Z < -42.0) — strictly NO trees on mountain peaks, crags & snowy slopes
      if (z < -42.0) return true;
      // Alpine mountain timberline: strictly NO trees, bushes or logs above 4.5m elevation
      if (getMountainTerrainElevation(x, z) > 4.5) return true;
      // Mountain stream gorge & waterfall catchment corridor
      if (z < -36.0 && x > 4.0 && x < 26.0) return true;
      return false;
    };

    // Helper to add a procedural tree
    const addTree = (tx: number, tz: number, idx: number) => {
      if (isExcludedZone(tx, tz)) return;

      const tree = new THREE.Group();
      const scale = 0.65 + Math.random() * 0.85;
      const treeType = idx % 4; // 0, 1 = Scots Pine, 2 = European Birch, 3 = Tall Alpine Spruce
      // Optimize shadow casting: only 25% of prominent trees cast shadows to eliminate draw-call lag
      const castShad = (idx % 4 === 0);

      if (treeType === 2) {
        // European Birch with leafy rounded canopy
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.20 * scale, 2.2 * scale, 6), trunkMat);
        trunk.position.y = 1.1 * scale;
        trunk.castShadow = castShad;
        tree.add(trunk);

        const leafClusterGeo = new THREE.DodecahedronGeometry(1.35 * scale, 1);
        const leaves = new THREE.Mesh(leafClusterGeo, birchFoliageMat);
        leaves.position.y = 2.5 * scale;
        leaves.castShadow = castShad;
        tree.add(leaves);

        // Secondary leaf tuft
        const leaves2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85 * scale, 1), birchFoliageMat);
        leaves2.position.set(0.3 * scale, 3.2 * scale, 0.1 * scale);
        tree.add(leaves2);
      } else if (treeType === 3) {
        // Tall Multi-tiered Alpine Spruce
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.22 * scale, 1.8 * scale, 6), trunkMat);
        trunk.position.y = 0.9 * scale;
        trunk.castShadow = castShad;
        tree.add(trunk);

        const tiers = [
          { r: 1.25, h: 2.2, y: 2.1, mat: pineMat1 },
          { r: 1.00, h: 1.9, y: 3.2, mat: pineMat2 },
          { r: 0.75, h: 1.6, y: 4.2, mat: pineMat1 },
          { r: 0.45, h: 1.3, y: 5.1, mat: pineMat2 }
        ];
        tiers.forEach((t, tIdx) => {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r * scale, t.h * scale, 6), t.mat);
          cone.position.y = t.y * scale;
          cone.castShadow = castShad && (tIdx === 0);
          tree.add(cone);
        });
      } else {
        // Standard Scots Pine
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, 1.4 * scale, 6), trunkMat);
        trunk.position.y = 0.7 * scale;
        trunk.castShadow = castShad;
        tree.add(trunk);

        const tier1 = new THREE.Mesh(new THREE.ConeGeometry(1.1 * scale, 2.2 * scale, 6), pineMat1);
        tier1.position.y = 1.9 * scale;
        tier1.castShadow = castShad;
        tree.add(tier1);

        const tier2 = new THREE.Mesh(new THREE.ConeGeometry(0.85 * scale, 1.8 * scale, 6), pineMat2);
        tier2.position.y = 2.9 * scale;
        tree.add(tier2);

        const tier3 = new THREE.Mesh(new THREE.ConeGeometry(0.55 * scale, 1.3 * scale, 6), pineMat1);
        tier3.position.y = 3.8 * scale;
        tree.add(tier3);
      }

      // Root tree base firmly on the exact terrain ground elevation
      const groundY = getMountainTerrainElevation(tx, tz);
      tree.position.set(tx, groundY - 0.05, tz);
      forest.add(tree);

      // Add occasional woodland understory bush / mossy log (strictly off-road)
      if (idx % 3 === 0) {
        const bx = tx + (Math.random() - 0.5) * 1.6;
        const bz = tz + (Math.random() - 0.5) * 1.6;
        if (!isExcludedZone(bx, bz)) {
          const bush = new THREE.Mesh(
            new THREE.DodecahedronGeometry((0.4 + (idx % 5) * 0.1) * scale, 1),
            idx % 2 === 0 ? shrubMat1 : shrubMat2
          );
          const bgY = getMountainTerrainElevation(bx, bz);
          bush.position.set(bx, bgY + 0.25 * scale, bz);
          forest.add(bush);
        }
      }

      if (idx % 14 === 0) {
        const lx = tx + 1.1;
        const lz = tz + 0.8;
        if (!isExcludedZone(lx, lz)) {
          const log = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16 * scale, 0.20 * scale, 2.8 * scale, 5),
            mossMat
          );
          log.rotation.z = Math.PI / 2;
          log.rotation.y = Math.random() * Math.PI;
          const lgY = getMountainTerrainElevation(lx, lz);
          log.position.set(lx, lgY + 0.15, lz);
          forest.add(log);
        }
      }
    };

    // Pass 1: Central Forest Zone (surrounding Node 2, strictly excluding west road z = -6.0)
    for (let i = 0; i < 220; i++) {
      const tx = -48 + Math.random() * 46;
      const tz = -36 + Math.random() * 42;
      addTree(tx, tz, i);
    }

    // Pass 2: Northwestern Valley Forest (strictly below mountain range z >= -41.0)
    for (let i = 0; i < 260; i++) {
      const tx = -68 + Math.random() * 62;
      const tz = -41.5 + Math.random() * 22; // tz stays strictly between -41.5 and -19.5
      addTree(tx, tz, i + 220);
    }

    // Pass 3: Western Foothills & Border (strictly below timberline)
    for (let i = 0; i < 90; i++) {
      const tx = -66 + Math.random() * 22;
      const tz = -30 + Math.random() * 38;
      addTree(tx, tz, i + 480);
    }

    // Pass 4: Northern riverbank woodland shoulders (strictly below mountains z >= -41.0)
    for (let i = 0; i < 70; i++) {
      const tx = -24 + Math.random() * 26;
      const tz = -41.0 + Math.random() * 18; // tz stays strictly between -41.0 and -23.0
      addTree(tx, tz, i + 570);
    }

    // Explicit tree removal pass to guarantee NO trees, shrubs, or logs exist in the specified river region (X: 7.5 to 21.0, Z: -67.0 to -43.0)
    for (let i = forest.children.length - 1; i >= 0; i--) {
      const child = forest.children[i];
      if (child.position.x >= 7.5 && child.position.x <= 21.0 && child.position.z >= -67.0 && child.position.z <= -43.0) {
        forest.remove(child);
      }
    }

    scene.add(forest);
  }

  function buildRealisticRiverAndBridge(scene: THREE.Scene) {
    // 1. OPTIMIZED HIGH-PERFORMANCE WAVE GEOMETRY (32x64 grid: 2,048 vertices, 5x faster with crisp waves)
    const waterGeo = new THREE.PlaneGeometry(18, 152, 32, 64);
    waterGeo.rotateX(-Math.PI / 2);

    // Cache baseline 3D coordinates for Gerstner wave & trochoidal horizontal displacement
    const wPos = waterGeo.attributes.position;
    const vertexCount = wPos.count;
    const baseWX = new Float32Array(vertexCount);
    const baseWY = new Float32Array(vertexCount);
    const baseWZ = new Float32Array(vertexCount);
    const wColors = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      baseWX[i] = wPos.getX(i);
      baseWY[i] = wPos.getY(i);
      baseWZ[i] = wPos.getZ(i);

      // Initial realistic turquoise water gradient (Reference image palette)
      wColors[i * 3] = 0.05;     // R
      wColors[i * 3 + 1] = 0.68; // G
      wColors[i * 3 + 2] = 0.84; // B
    }

    baseWaterPosRef.current = { x: baseWX, y: baseWY, z: baseWZ };
    baseWaterYRef.current = baseWY;
    waterGeo.setAttribute('color', new THREE.BufferAttribute(wColors, 3));

    // Realistic Translucent Turquoise Water Material with Dynamic Wave Foam
    const waterMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.08,
      metalness: 0.18,
      transparent: true,
      opacity: 0.94,
      flatShading: false
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(13, -0.65, 0);
    water.name = 'riverWater';
    scene.add(water);
    waterMeshRef.current = water;

    // 2. WARM SANDY RIVERBED SHELF UNDERNEATH (Shows through translucent water like in reference image)
    const bedGeo = new THREE.PlaneGeometry(18.5, 154, 32, 64);
    bedGeo.rotateX(-Math.PI / 2);
    const bPos = bedGeo.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      const bx = bPos.getX(i);
      // Gentle underwater bathymetry: deeper channel in center, shallow sandy shelf at edges
      const depth = -1.55 + Math.pow(Math.abs(bx) / 8.25, 2) * 1.05;
      bPos.setY(i, depth);
    }
    bedGeo.computeVertexNormals();
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0xc8a882, // Warm beach sand & riverbed silt
      roughness: 0.88,
      flatShading: true
    });
    const riverBed = new THREE.Mesh(bedGeo, bedMat);
    riverBed.position.set(13, -0.65, 0);
    riverBed.receiveShadow = true;
    scene.add(riverBed);

    // 3. SHORELINE BILLOWING FOAM & SPRAY PARTICLES (Breakers against the sand and rocks)
    const splashCount = 260;
    const splashGeo = new THREE.BufferGeometry();
    const splashPos = new Float32Array(splashCount * 3);
    for (let i = 0; i < splashCount; i++) {
      // Clustered along the shoreline curves and breaker zones
      const side = (i % 2 === 0) ? -7.0 + Math.random() * 2.2 : 5.2 + Math.random() * 2.2;
      splashPos[i * 3] = 13 + side;
      splashPos[i * 3 + 1] = -0.55 + Math.random() * 0.35;
      splashPos[i * 3 + 2] = -72.0 + Math.random() * 144.0;
    }
    splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPos, 3));
    const splashMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.35,
      transparent: true,
      opacity: 0.75
    });
    const splashParticles = new THREE.Points(splashGeo, splashMat);
    scene.add(splashParticles);
    riverSplashParticlesRef.current = splashParticles;

    // 3b. DEDICATED WATER SPLASH & HIGH-ARC WATER SPRINKLE SHOWER INTO THE HOUSES
    const lakeSplashCount = 420;
    const lakeSplashGeo = new THREE.BufferGeometry();
    const lakeSplashPos = new Float32Array(lakeSplashCount * 3);
    const lakeSplashVelX = new Float32Array(lakeSplashCount);
    const lakeSplashVelY = new Float32Array(lakeSplashCount);
    const lakeSplashVelZ = new Float32Array(lakeSplashCount);
    const lakeSplashLife = new Float32Array(lakeSplashCount);
    const lakeSplashMaxLife = new Float32Array(lakeSplashCount);

    for (let i = 0; i < lakeSplashCount; i++) {
      if (i < 150) {
        // Group A: Lake entry explosive geyser at fallen mud zone (X: 7.4 to 9.2, Z: 26 to 38)
        lakeSplashPos[i * 3] = 7.5 + Math.random() * 1.6;
        lakeSplashPos[i * 3 + 1] = -0.65;
        lakeSplashPos[i * 3 + 2] = 26.5 + Math.random() * 11.5;

        const angle = (Math.random() - 0.5) * Math.PI * 0.7;
        const spd = 0.05 + Math.random() * 0.14;
        lakeSplashVelX[i] = Math.cos(angle) * spd + 0.04;
        lakeSplashVelY[i] = 0.10 + Math.random() * 0.22;
        lakeSplashVelZ[i] = Math.sin(angle) * spd;
        lakeSplashLife[i] = Math.random();
        lakeSplashMaxLife[i] = 0.5 + Math.random() * 0.4;
      } else {
        // Group B: High-Arc Water Sprinkle Shower Arcing Across River DIRECTLY Into the Houses (X: 20 to 38, Z: 18 to 46)
        const isMidRiver = Math.random() < 0.45;
        lakeSplashPos[i * 3] = isMidRiver ? 13.0 + Math.random() * 5.0 : 8.0 + Math.random() * 4.0;
        lakeSplashPos[i * 3 + 1] = -0.40 + Math.random() * 0.8;
        lakeSplashPos[i * 3 + 2] = 20.0 + Math.random() * 24.0;

        // High eastward velocity pointing towards village houses (positive X)
        lakeSplashVelX[i] = 0.25 + Math.random() * 0.32;
        lakeSplashVelY[i] = 0.16 + Math.random() * 0.24; // High arcing upward spray
        lakeSplashVelZ[i] = (Math.random() - 0.5) * 0.14;
        lakeSplashLife[i] = Math.random();
        lakeSplashMaxLife[i] = 0.8 + Math.random() * 0.6; // Longer flight path to reach houses
      }
    }
    lakeSplashGeo.setAttribute('position', new THREE.BufferAttribute(lakeSplashPos, 3));
    const lakeSplashMat = new THREE.PointsMaterial({
      color: 0xe0f2fe, // Sparkling aqua-white droplet color
      size: 0.52,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    const lakeSplash = new THREE.Points(lakeSplashGeo, lakeSplashMat);
    lakeSplash.name = 'landslideWaterSplash';
    lakeSplash.visible = false;
    scene.add(lakeSplash);
    landslideWaterSplashRef.current = lakeSplash;
    splashParticlesDataRef.current = {
      vx: lakeSplashVelX,
      vy: lakeSplashVelY,
      vz: lakeSplashVelZ,
      life: lakeSplashLife,
      maxLife: lakeSplashMaxLife
    };

    // Concrete River Bridge Main Span (x: 6.75 to 19.25, y: 1.45, z: -6.0)
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.65 });
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const lineWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const lineYellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const abutmentMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.75 });

    // Main bridge deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.45, 3.8), bridgeMat);
    deck.position.set(13, 1.45, -6);
    deck.name = 'riverBridge';
    deck.castShadow = true;
    deck.receiveShadow = true;
    scene.add(deck);

    // Bridge road top asphalt surface
    const bridgeAsphalt = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 3.7), asphaltMat);
    bridgeAsphalt.rotateX(-Math.PI / 2);
    bridgeAsphalt.position.set(13, 1.68, -6);
    bridgeAsphalt.receiveShadow = true;
    scene.add(bridgeAsphalt);

    // Bridge road center line
    const bridgeCenterLine = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 0.16), lineYellowMat);
    bridgeCenterLine.rotateX(-Math.PI / 2);
    bridgeCenterLine.position.set(13, 1.685, -6);
    scene.add(bridgeCenterLine);

    // Main bridge safety rails
    const railMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.7, roughness: 0.3 });
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.5, 0.1), railMat);
    rail1.position.set(13, 1.9, -4.2);
    rail1.castShadow = true;
    scene.add(rail1);
    const rail2 = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.5, 0.1), railMat);
    rail2.position.set(13, 1.9, -7.8);
    rail2.castShadow = true;
    scene.add(rail2);

    // Bridge pillars
    [-4.0, 4.0].forEach(offsetX => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.8, 8), bridgeMat);
      pillar.position.set(13 + offsetX, 0.1, -6);
      pillar.castShadow = true;
      scene.add(pillar);
    });

    // ==========================================
    // 4. BRIDGE SLOPED APPROACH RAMPS (BOTH SIDES)
    // ==========================================
    // A. WEST APPROACH RAMP (Left Side: Slopes down from x=6.75, y=1.45 to x=0.5, y=0.20)
    const westSpanX = 6.25;
    const westDropY = 1.25;
    const westRampLen = Math.hypot(westSpanX, westDropY); // ~6.373m
    const westAngleZ = Math.atan2(westDropY, westSpanX);  // ~0.197 rad
    const westMidX = 3.625;
    const westMidY = 0.825;

    // West sloped bridge ramp deck
    const westRamp = new THREE.Mesh(new THREE.BoxGeometry(westRampLen, 0.45, 3.8), bridgeMat);
    westRamp.position.set(westMidX, westMidY, -6.0);
    westRamp.rotation.z = westAngleZ;
    westRamp.castShadow = true;
    westRamp.receiveShadow = true;
    scene.add(westRamp);

    // West ramp asphalt surface
    const westRampAsphalt = new THREE.Mesh(new THREE.BoxGeometry(westRampLen, 0.05, 3.7), asphaltMat);
    westRampAsphalt.position.set(westMidX, westMidY + 0.23, -6.0);
    westRampAsphalt.rotation.z = westAngleZ;
    westRampAsphalt.receiveShadow = true;
    scene.add(westRampAsphalt);

    // West ramp center line
    const westRampStripe = new THREE.Mesh(new THREE.BoxGeometry(westRampLen, 0.06, 0.16), lineYellowMat);
    westRampStripe.position.set(westMidX, westMidY + 0.24, -6.0);
    westRampStripe.rotation.z = westAngleZ;
    scene.add(westRampStripe);

    // West ramp guardrails
    const westRail1 = new THREE.Mesh(new THREE.BoxGeometry(westRampLen, 0.5, 0.1), railMat);
    westRail1.position.set(westMidX, westMidY + 0.45, -4.2);
    westRail1.rotation.z = westAngleZ;
    westRail1.castShadow = true;
    scene.add(westRail1);
    const westRail2 = new THREE.Mesh(new THREE.BoxGeometry(westRampLen, 0.5, 0.1), railMat);
    westRail2.position.set(westMidX, westMidY + 0.45, -7.8);
    westRail2.rotation.z = westAngleZ;
    westRail2.castShadow = true;
    scene.add(westRail2);

    // Solid retaining embankment foundation under west ramp
    const westAbutment = new THREE.Mesh(new THREE.BoxGeometry(westSpanX, 0.85, 4.0), abutmentMat);
    westAbutment.position.set(westMidX, 0.35, -6.0);
    westAbutment.receiveShadow = true;
    scene.add(westAbutment);

    // Heavy concrete bridge pier head at joint x=6.75
    const westPierHead = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 4.4), abutmentMat);
    westPierHead.position.set(6.75, 0.55, -6.0);
    westPierHead.castShadow = true;
    scene.add(westPierHead);

    // West road continuation onto mainland
    const westRoad = new THREE.Mesh(new THREE.PlaneGeometry(12.0, 3.8), asphaltMat);
    westRoad.rotateX(-Math.PI / 2);
    westRoad.position.set(-5.5, 0.22, -6.0);
    westRoad.receiveShadow = true;
    scene.add(westRoad);

    const westRoadStripe = new THREE.Mesh(new THREE.PlaneGeometry(12.0, 0.16), lineYellowMat);
    westRoadStripe.rotateX(-Math.PI / 2);
    westRoadStripe.position.set(-5.5, 0.23, -6.0);
    scene.add(westRoadStripe);

    // B. EAST APPROACH RAMP (Right Side: Slopes down from x=19.25, y=1.45 to x=24.5, y=0.50)
    const eastSpanX = 5.25;
    const eastDropY = 0.95;
    const eastRampLen = Math.hypot(eastSpanX, eastDropY); // ~5.335m
    const eastAngleZ = -Math.atan2(eastDropY, eastSpanX);  // ~ -0.179 rad
    const eastMidX = 21.875;
    const eastMidY = 0.975;

    // East sloped bridge ramp deck
    const eastRamp = new THREE.Mesh(new THREE.BoxGeometry(eastRampLen, 0.45, 3.8), bridgeMat);
    eastRamp.position.set(eastMidX, eastMidY, -6.0);
    eastRamp.rotation.z = eastAngleZ;
    eastRamp.castShadow = true;
    eastRamp.receiveShadow = true;
    scene.add(eastRamp);

    // East ramp asphalt surface
    const eastRampAsphalt = new THREE.Mesh(new THREE.BoxGeometry(eastRampLen, 0.05, 3.7), asphaltMat);
    eastRampAsphalt.position.set(eastMidX, eastMidY + 0.23, -6.0);
    eastRampAsphalt.rotation.z = eastAngleZ;
    eastRampAsphalt.receiveShadow = true;
    scene.add(eastRampAsphalt);

    // East ramp center line
    const eastRampStripe = new THREE.Mesh(new THREE.BoxGeometry(eastRampLen, 0.06, 0.16), lineYellowMat);
    eastRampStripe.position.set(eastMidX, eastMidY + 0.24, -6.0);
    eastRampStripe.rotation.z = eastAngleZ;
    scene.add(eastRampStripe);

    // East ramp guardrails
    const eastRail1 = new THREE.Mesh(new THREE.BoxGeometry(eastRampLen, 0.5, 0.1), railMat);
    eastRail1.position.set(eastMidX, eastMidY + 0.45, -4.2);
    eastRail1.rotation.z = eastAngleZ;
    eastRail1.castShadow = true;
    scene.add(eastRail1);
    const eastRail2 = new THREE.Mesh(new THREE.BoxGeometry(eastRampLen, 0.5, 0.1), railMat);
    eastRail2.position.set(eastMidX, eastMidY + 0.45, -7.8);
    eastRail2.rotation.z = eastAngleZ;
    eastRail2.castShadow = true;
    scene.add(eastRail2);

    // Solid retaining embankment foundation under east ramp
    const eastAbutment = new THREE.Mesh(new THREE.BoxGeometry(eastSpanX, 0.95, 4.0), abutmentMat);
    eastAbutment.position.set(eastMidX, 0.42, -6.0);
    eastAbutment.receiveShadow = true;
    scene.add(eastAbutment);

    // Heavy concrete bridge pier head at joint x=19.25
    const eastPierHead = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 4.4), abutmentMat);
    eastPierHead.position.set(19.25, 0.55, -6.0);
    eastPierHead.castShadow = true;
    scene.add(eastPierHead);

    // ==========================================
    // 5. VILLAGE OVERLAND FLOOD INUNDATION SHEET
    // Spills over the riverbank across the highway, and PARTIALLY reaches the front lawns like rolling waves
    // STOPS STRICTLY BEFORE THE HOUSES (covers x = 18.5 to 26.0; houses are at x >= 27.7)
    // ==========================================
    const floodSpillGeo = new THREE.PlaneGeometry(7.5, 48.0, 16, 36);
    floodSpillGeo.rotateX(-Math.PI / 2);

    const fsPos = floodSpillGeo.attributes.position;
    const fsBaseX = new Float32Array(fsPos.count);
    const fsBaseY = new Float32Array(fsPos.count);
    const fsBaseZ = new Float32Array(fsPos.count);
    for (let i = 0; i < fsPos.count; i++) {
      fsBaseX[i] = fsPos.getX(i);
      fsBaseY[i] = fsPos.getY(i);
      fsBaseZ[i] = fsPos.getZ(i);
    }
    baseFloodSpillPosRef.current = { x: fsBaseX, y: fsBaseY, z: fsBaseZ };

    const floodSpillMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.12,
      metalness: 0.32,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const floodSpillover = new THREE.Mesh(floodSpillGeo, floodSpillMat);
    floodSpillover.name = 'villageFloodSpillover';
    floodSpillover.position.set(22.25, 0.47, 33.0);
    floodSpillover.receiveShadow = true;
    floodSpillover.visible = false;
    scene.add(floodSpillover);
    floodSpilloverMeshRef.current = floodSpillover;
  }

  function buildDetailedVillage(scene: THREE.Scene) {
    const village = new THREE.Group();
    village.name = 'villageZone';

    // Materials
    const wallMat1 = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 }); // Clean white render
    const wallMat2 = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.70 }); // Warm country cream
    const wallMat3 = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 }); // Sandstone / fieldstone
    const wallTimber = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 }); // Dark timber framing
    const roofRed = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.75 }); // Terracotta tile roof
    const roofSlate = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.70 }); // Grey slate roof
    const roofShake = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 }); // Cedar wood shakes
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 }); // Main paved street
    roadMaterialRef.current = roadMat;
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.90 }); // Gravel walking path
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 0.45,
      roughness: 0.2
    });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5c2f16, roughness: 0.8 });
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.9 });
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.9 });
    const foliageMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8, flatShading: true });
    const foliageMat2 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8, flatShading: true });

    // 1. VILLAGE ROADS & PEDESTRIAN PROMENADE AT THE GREY SPOT (z = 12 to 55, x = 28 to 56)
    // A. Main Village Avenue (North-South through heart of village at x = 40.0, z = 11 to 55)
    const mainAvenue = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 44), roadMat);
    mainAvenue.rotateX(-Math.PI / 2);
    mainAvenue.position.set(40.0, 0.50, 33.0);
    mainAvenue.receiveShadow = true;
    village.add(mainAvenue);

    // B. Village Central Promenade (at z = 32.0, connecting x=24.0 to x=52.0 across the center)
    const entranceRoad = new THREE.Mesh(new THREE.PlaneGeometry(28.0, 4.0), roadMat);
    entranceRoad.rotateX(-Math.PI / 2);
    entranceRoad.position.set(38.0, 0.50, 32.0);
    entranceRoad.receiveShadow = true;
    village.add(entranceRoad);

    // North Village Cross Street (at z = 18.0, connecting x=32.0 to x=48.0)
    const northStreet = new THREE.Mesh(new THREE.PlaneGeometry(16.0, 3.4), roadMat);
    northStreet.rotateX(-Math.PI / 2);
    northStreet.position.set(40.0, 0.50, 18.0);
    northStreet.receiveShadow = true;
    village.add(northStreet);

    // South Village Cross Street (at z = 47.0, connecting x=32.0 to x=48.0)
    const southStreet = new THREE.Mesh(new THREE.PlaneGeometry(16.0, 3.4), roadMat);
    southStreet.rotateX(-Math.PI / 2);
    southStreet.position.set(40.0, 0.50, 47.0);
    southStreet.receiveShadow = true;
    village.add(southStreet);

    // West Riverside Residential Lane (x = 29.5, z = 20 to 45)
    const westLane = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 25), pathMat);
    westLane.rotateX(-Math.PI / 2);
    westLane.position.set(29.5, 0.49, 32.5);
    westLane.receiveShadow = true;
    village.add(westLane);

    // East Meadow Residential Lane (x = 51.5, z = 18 to 46)
    const eastLane = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 28), pathMat);
    eastLane.rotateX(-Math.PI / 2);
    eastLane.position.set(51.5, 0.49, 32.0);
    eastLane.receiveShadow = true;
    village.add(eastLane);

    // C. Riverfront Scenic Highway (Connecting Bridge down to Village along x=24.0)
    const riverfrontHighway = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 40.0), roadMat);
    riverfrontHighway.rotateX(-Math.PI / 2);
    riverfrontHighway.position.set(24.0, 0.50, 13.0);
    riverfrontHighway.receiveShadow = true;
    village.add(riverfrontHighway);

    // D. Bridge Connector Road (touching eastern approach ramp touchdown at x=24.0, z=-6.0)
    const bridgeConnector = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.0), roadMat);
    bridgeConnector.rotateX(-Math.PI / 2);
    bridgeConnector.position.set(24.0, 0.50, -6.0);
    bridgeConnector.receiveShadow = true;
    village.add(bridgeConnector);

    // E. Scenic Riverbank Walking Promenade along water (x = 21.8, z = 20 to 44)
    const riverPath = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 24), pathMat);
    riverPath.rotateX(-Math.PI / 2);
    riverPath.position.set(21.8, 0.48, 32.0);
    riverPath.receiveShadow = true;
    village.add(riverPath);

    // 2. RUSTIC RIVERBANK FENCE & BUFFER PARKLAND (Directly separates safe village from river water)
    // River edge is at x=19.5; Fence stands along x=20.8 providing clear scenic waterfront safety boundary
    for (let fz = 20.0; fz <= 44.0; fz += 3.2) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.1, 6), fenceMat);
      const postY = getMountainTerrainElevation(20.8, fz);
      post.position.set(20.8, postY + 0.55, fz);
      post.castShadow = true;
      village.add(post);

      // Horizontal rails
      if (fz < 43.5) {
        [0.35, 0.75].forEach(railH => {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.2), fenceMat);
          rail.position.set(20.8, postY + railH, fz + 1.6);
          rail.castShadow = true;
          village.add(rail);
        });
      }
    }

    // Riverside Park Benches overlooking the river
    [26.0, 36.0].forEach(bz => {
      const benchGroup = new THREE.Group();
      const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 1.4), fenceMat);
      benchSeat.position.set(0, 0.45, 0);
      const benchBack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 1.4), fenceMat);
      benchBack.position.set(-0.25, 0.75, 0);
      benchGroup.add(benchSeat);
      benchGroup.add(benchBack);
      const bY = getMountainTerrainElevation(22.2, bz);
      benchGroup.position.set(22.2, bY, bz);
      village.add(benchGroup);
    });

    // Riverside Ornamental Flowering & Birch Trees along the river buffer
    [
      { x: 22.5, z: 23.0, s: 0.85 },
      { x: 22.5, z: 30.0, s: 0.90 },
      { x: 22.5, z: 38.0, s: 0.85 }
    ].forEach((tPos, tIdx) => {
      const tree = new THREE.Group();
      const s = tPos.s;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.8 * s, 6), treeTrunkMat);
      trunk.position.y = 0.9 * s;
      trunk.castShadow = true;
      tree.add(trunk);

      const foliageMat = tIdx % 2 === 0 ? foliageMat1 : foliageMat2;
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 * s, 1), foliageMat);
      crown.position.y = 2.1 * s;
      crown.castShadow = true;
      tree.add(crown);

      const gY = getMountainTerrainElevation(tPos.x, tPos.z);
      tree.position.set(tPos.x, gY - 0.05, tPos.z);
      village.add(tree);
    });

    // Village Neighborhood Park Trees around the village
    [
      { x: 30.0, z: 21.0, s: 1.0 },
      { x: 42.0, z: 21.0, s: 1.05 },
      { x: 48.0, z: 32.0, s: 0.95 },
      { x: 48.0, z: 42.0, s: 1.0 }
    ].forEach((tPos, tIdx) => {
      const tree = new THREE.Group();
      const s = tPos.s;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.20 * s, 2.0 * s, 6), treeTrunkMat);
      trunk.position.y = 1.0 * s;
      trunk.castShadow = true;
      tree.add(trunk);

      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3 * s, 1), tIdx % 2 === 0 ? foliageMat2 : foliageMat1);
      crown.position.y = 2.3 * s;
      crown.castShadow = true;
      tree.add(crown);

      const gY = getMountainTerrainElevation(tPos.x, tPos.z);
      tree.position.set(tPos.x, gY - 0.05, tPos.z);
      village.add(tree);
    });

    // 3. VILLAGE PLAZA & CENTRAL STONE FOUNTAIN AT GREY SPOT (x=40.0, z=32.0)
    const plazaCenter = { x: 40.0, z: 32.0 };
    const plazaY = getMountainTerrainElevation(plazaCenter.x, plazaCenter.z);

    // Stone Apron
    const plazaMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 3.6, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 })
    );
    plazaMesh.position.set(plazaCenter.x, plazaY + 0.04, plazaCenter.z);
    plazaMesh.receiveShadow = true;
    village.add(plazaMesh);

    // Tiered Stone Fountain
    const fountainGroup = new THREE.Group();
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.6, 0.45, 12),
      chimneyMat
    );
    basin.position.y = 0.22;
    fountainGroup.add(basin);

    const fWater = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.35, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.8 })
    );
    fWater.position.y = 0.42;
    fountainGroup.add(fWater);

    const fSpire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.35, 1.3, 8),
      chimneyMat
    );
    fSpire.position.y = 0.85;
    fountainGroup.add(fSpire);

    fountainGroup.position.set(plazaCenter.x, plazaY, plazaCenter.z);
    village.add(fountainGroup);

    // Decorative Street Lanterns around plaza
    [
      { dx: -2.4, dz: -2.4 },
      { dx: 2.4,  dz: -2.4 },
      { dx: -2.4, dz: 2.4 },
      { dx: 2.4,  dz: 2.4 }
    ].forEach(lp => {
      const lx = plazaCenter.x + lp.dx;
      const lz = plazaCenter.z + lp.dz;
      const ly = getMountainTerrainElevation(lx, lz);

      const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 2.2, 6), fenceMat);
      lampPole.position.set(lx, ly + 1.1, lz);
      village.add(lampPole);

      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.35, 0.24), windowMat);
      lantern.position.set(lx, ly + 2.1, lz);
      village.add(lantern);
    });

    // 4. VILLAGE HOUSES AT GREY SPOT (z = 22 to 44, x = 32 to 48)
    interface VillageHouseDef {
      x: number;
      z: number;
      w: number;
      d: number;
      h: number;
      wallMat: THREE.Material;
      roofMat: THREE.Material;
      roofType: 'gable' | 'hip' | 'hall';
      chimneySide: 'left' | 'right' | 'none';
      hasPorch?: boolean;
      hasAwning?: boolean;
    }

    const houses: VillageHouseDef[] = [
      // 1. WEST CENTRAL ROW (x=35.0, west of village avenue)
      { x: 35.0, z: 24.0, w: 3.4, d: 2.8, h: 2.6, wallMat: wallMat1, roofMat: roofSlate, roofType: 'gable', chimneySide: 'left',  hasPorch: true },
      { x: 35.0, z: 28.5, w: 3.8, d: 3.4, h: 3.2, wallMat: wallMat2, roofMat: roofRed,   roofType: 'hip',   chimneySide: 'right', hasPorch: true },
      { x: 35.0, z: 35.5, w: 3.5, d: 3.0, h: 2.8, wallMat: wallMat3, roofMat: roofShake, roofType: 'gable', chimneySide: 'left' },
      { x: 35.0, z: 40.0, w: 3.4, d: 2.8, h: 2.6, wallMat: wallMat1, roofMat: roofRed,   roofType: 'gable', chimneySide: 'right' },

      // 2. EAST CENTRAL ROW (x=45.0, east of village avenue)
      { x: 45.0, z: 24.0, w: 4.8, d: 3.8, h: 3.6, wallMat: wallTimber, roofMat: roofSlate, roofType: 'hall',  chimneySide: 'none',  hasPorch: true },
      { x: 45.0, z: 28.5, w: 3.6, d: 3.2, h: 3.0, wallMat: wallMat1,   roofMat: roofRed,   roofType: 'gable', chimneySide: 'right' },
      { x: 45.0, z: 35.5, w: 4.0, d: 3.4, h: 3.2, wallMat: wallMat2,   roofMat: roofRed,   roofType: 'gable', chimneySide: 'left',  hasAwning: true },
      { x: 45.0, z: 40.0, w: 3.8, d: 3.4, h: 3.1, wallMat: wallMat3,   roofMat: roofShake, roofType: 'hip',   chimneySide: 'right' },

      // 3. CUL-DE-SAC COTTAGE (z=43.5)
      { x: 40.0, z: 43.5, w: 3.6, d: 3.2, h: 2.9, wallMat: wallMat2, roofMat: roofSlate, roofType: 'hip',   chimneySide: 'left' },

      // 4. NORTH DISTRICT EXTENSION (x=35 and x=45, z=14 to 20)
      { x: 35.0, z: 19.5, w: 3.5, d: 3.0, h: 2.8, wallMat: wallMat1, roofMat: roofRed,   roofType: 'gable', chimneySide: 'right', hasPorch: true },
      { x: 35.0, z: 15.0, w: 3.4, d: 2.8, h: 2.6, wallMat: wallMat2, roofMat: roofSlate, roofType: 'hip',   chimneySide: 'left' },
      { x: 45.0, z: 19.5, w: 3.8, d: 3.2, h: 3.0, wallMat: wallMat3, roofMat: roofShake, roofType: 'gable', chimneySide: 'left' },
      { x: 45.0, z: 15.0, w: 4.0, d: 3.4, h: 3.2, wallMat: wallTimber, roofMat: roofRed, roofType: 'hip',   chimneySide: 'right', hasPorch: true },

      // 5. SOUTH DISTRICT EXTENSION (x=35 and x=45, z=45 to 52)
      { x: 35.0, z: 47.0, w: 3.5, d: 3.0, h: 2.7, wallMat: wallMat2, roofMat: roofSlate, roofType: 'gable', chimneySide: 'right' },
      { x: 35.0, z: 51.5, w: 3.6, d: 3.2, h: 2.9, wallMat: wallMat1, roofMat: roofRed,   roofType: 'hip',   chimneySide: 'left',  hasPorch: true },
      { x: 45.0, z: 47.0, w: 3.8, d: 3.2, h: 3.0, wallMat: wallMat3, roofMat: roofRed,   roofType: 'gable', chimneySide: 'left' },
      { x: 45.0, z: 51.5, w: 3.5, d: 3.0, h: 2.8, wallMat: wallMat2, roofMat: roofShake, roofType: 'hip',   chimneySide: 'right' },

      // 6. WEST RIVERSIDE LANE (x=29.5, overlooking river parkland)
      { x: 29.5, z: 23.5, w: 3.4, d: 2.8, h: 2.6, wallMat: wallMat1, roofMat: roofRed,   roofType: 'hip',   chimneySide: 'right' },
      { x: 29.5, z: 28.5, w: 3.8, d: 3.2, h: 3.1, wallMat: wallTimber, roofMat: roofSlate, roofType: 'gable', chimneySide: 'left', hasPorch: true },
      { x: 29.5, z: 35.5, w: 3.5, d: 3.0, h: 2.8, wallMat: wallMat2, roofMat: roofRed,   roofType: 'gable', chimneySide: 'right' },
      { x: 29.5, z: 41.0, w: 3.6, d: 3.2, h: 2.9, wallMat: wallMat3, roofMat: roofShake, roofType: 'hip',   chimneySide: 'left' },

      // 7. EAST MEADOW QUARTER (x=51.5, east of community hall)
      { x: 51.5, z: 20.0, w: 3.6, d: 3.0, h: 2.8, wallMat: wallMat2, roofMat: roofSlate, roofType: 'gable', chimneySide: 'left' },
      { x: 51.5, z: 25.5, w: 3.5, d: 3.0, h: 2.7, wallMat: wallMat1, roofMat: roofRed,   roofType: 'hip',   chimneySide: 'right' },
      { x: 51.5, z: 35.0, w: 3.8, d: 3.4, h: 3.0, wallMat: wallTimber, roofMat: roofRed, roofType: 'hip',   chimneySide: 'right', hasPorch: true },
      { x: 51.5, z: 40.5, w: 3.5, d: 3.0, h: 2.7, wallMat: wallMat3, roofMat: roofShake, roofType: 'gable', chimneySide: 'left' },
      { x: 51.5, z: 46.0, w: 3.6, d: 3.2, h: 2.9, wallMat: wallMat2, roofMat: roofSlate, roofType: 'hip',   chimneySide: 'right' },

      // 8. ADDITIONAL RIVERSIDE CHALETS & COTTAGES (along west lane x=29.5)
      { x: 29.5, z: 16.5, w: 3.3, d: 2.8, h: 2.6, wallMat: wallMat1, roofMat: roofSlate, roofType: 'hip',   chimneySide: 'left' },
      { x: 29.5, z: 19.5, w: 3.5, d: 3.0, h: 2.7, wallMat: wallMat2, roofMat: roofRed,   roofType: 'gable', chimneySide: 'right', hasPorch: true },
      { x: 29.5, z: 32.0, w: 3.6, d: 3.1, h: 2.8, wallMat: wallTimber, roofMat: roofShake, roofType: 'hip', chimneySide: 'none',  hasPorch: true },
      { x: 29.5, z: 45.5, w: 3.5, d: 2.9, h: 2.7, wallMat: wallMat3, roofMat: roofRed,   roofType: 'gable', chimneySide: 'left' },
      { x: 29.5, z: 49.5, w: 3.4, d: 2.8, h: 2.6, wallMat: wallMat1, roofMat: roofSlate, roofType: 'hip',   chimneySide: 'right' },

      // 9. CENTRAL AVENUE TOWN COTTAGES (x=40.0)
      { x: 40.0, z: 14.0, w: 3.5, d: 3.0, h: 2.8, wallMat: wallMat2, roofMat: roofRed,   roofType: 'gable', chimneySide: 'left',  hasPorch: true },
      { x: 40.0, z: 21.0, w: 3.6, d: 3.2, h: 2.9, wallMat: wallMat3, roofMat: roofSlate, roofType: 'hip',   chimneySide: 'right' },
      { x: 40.0, z: 26.5, w: 3.4, d: 2.9, h: 2.7, wallMat: wallMat1, roofMat: roofShake, roofType: 'gable', chimneySide: 'left' },
      { x: 40.0, z: 37.5, w: 3.7, d: 3.1, h: 3.0, wallMat: wallTimber, roofMat: roofRed, roofType: 'gable', chimneySide: 'right', hasAwning: true },
      { x: 40.0, z: 48.0, w: 3.5, d: 3.0, h: 2.8, wallMat: wallMat2, roofMat: roofSlate, roofType: 'hip',   chimneySide: 'left' },

      // 10. EAST MEADOW EXPANSION (x=51.5 & suburban fringe)
      { x: 51.5, z: 15.0, w: 3.6, d: 3.0, h: 2.8, wallMat: wallMat1, roofMat: roofRed,   roofType: 'gable', chimneySide: 'right', hasPorch: true },
      { x: 51.5, z: 30.5, w: 3.8, d: 3.3, h: 3.0, wallMat: wallMat2, roofMat: roofSlate, roofType: 'hip',   chimneySide: 'left' },
      { x: 51.5, z: 50.5, w: 3.5, d: 3.0, h: 2.7, wallMat: wallMat3, roofMat: roofShake, roofType: 'gable', chimneySide: 'right' },
      { x: 46.5, z: 11.5, w: 3.5, d: 2.9, h: 2.7, wallMat: wallTimber, roofMat: roofRed, roofType: 'hip',   chimneySide: 'left' },
      { x: 34.0, z: 11.5, w: 3.4, d: 2.8, h: 2.6, wallMat: wallMat1, roofMat: roofSlate, roofType: 'gable', chimneySide: 'right', hasPorch: true }
    ];

    houses.forEach(h => {
      const houseGroup = new THREE.Group();

      // Main House Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(h.w, h.h, h.d), h.wallMat);
      body.position.y = h.h / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      houseGroup.add(body);

      // Roof Construction
      if (h.roofType === 'hall') {
        // Village Community Hall Roof with steep pitch & central clock cupola
        const roofGeo = new THREE.ConeGeometry(Math.max(h.w, h.d) * 0.72, 1.8, 4);
        roofGeo.rotateY(Math.PI / 4);
        const roof = new THREE.Mesh(roofGeo, h.roofMat);
        roof.position.y = h.h + 0.9;
        roof.castShadow = true;
        houseGroup.add(roof);

        // Community Clock / Bell Cupola
        const cupola = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.9), wallMat1);
        cupola.position.y = h.h + 1.9;
        cupola.castShadow = true;
        houseGroup.add(cupola);

        const steeple = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 4), roofRed);
        steeple.rotateY(Math.PI / 4);
        steeple.position.y = h.h + 2.9;
        steeple.castShadow = true;
        houseGroup.add(steeple);
      } else if (h.roofType === 'hip') {
        const roofGeo = new THREE.ConeGeometry(Math.max(h.w, h.d) * 0.74, 1.5, 4);
        roofGeo.rotateY(Math.PI / 4);
        const roof = new THREE.Mesh(roofGeo, h.roofMat);
        roof.position.y = h.h + 0.75;
        roof.castShadow = true;
        houseGroup.add(roof);
      } else {
        // Gabled Roof
        const roofGeo = new THREE.ConeGeometry(Math.max(h.w, h.d) * 0.72, 1.4, 4);
        roofGeo.rotateY(Math.PI / 4);
        const roof = new THREE.Mesh(roofGeo, h.roofMat);
        roof.position.y = h.h + 0.7;
        roof.castShadow = true;
        houseGroup.add(roof);
      }

      // Front Wooden Door
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.08), doorMat);
      door.position.set(0, 0.7, h.d / 2 + 0.04);
      houseGroup.add(door);

      // Warm Glowing Windows
      [-(h.w * 0.28), h.w * 0.28].forEach(wx => {
        // Ground floor window
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.7, 0.08), windowMat);
        win.position.set(wx, 1.2, h.d / 2 + 0.04);
        houseGroup.add(win);

        // Upper floor window (if 2-story)
        if (h.h >= 3.0) {
          const winUp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.08), windowMat);
          winUp.position.set(wx, 2.3, h.d / 2 + 0.04);
          houseGroup.add(winUp);
        }

        // Side window
        const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.65), windowMat);
        sideWin.position.set(h.w / 2 + 0.04, 1.2, 0);
        houseGroup.add(sideWin);
      });

      // Stone Chimney
      if (h.chimneySide !== 'none') {
        const cx = (h.chimneySide === 'left' ? -1 : 1) * (h.w * 0.3);
        const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.4, 0.45), chimneyMat);
        chimney.position.set(cx, h.h + 0.9, 0);
        chimney.castShadow = true;
        houseGroup.add(chimney);
      }

      // Front Porch Canopy (for select homes)
      if (h.hasPorch) {
        const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.9), h.roofMat);
        porchRoof.position.set(0, 1.7, h.d / 2 + 0.48);
        porchRoof.castShadow = true;
        houseGroup.add(porchRoof);

        [-0.6, 0.6].forEach(px => {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.7, 6), fenceMat);
          post.position.set(px, 0.85, h.d / 2 + 0.85);
          houseGroup.add(post);
        });
      }

      // Village Store Front Awning
      if (h.hasAwning) {
        const awningMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
        const awning = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.1), awningMat);
        awning.rotation.x = Math.PI / 10;
        awning.position.set(0, 1.8, h.d / 2 + 0.55);
        awning.castShadow = true;
        houseGroup.add(awning);
      }

      // Firmly plant on exact terrain elevation
      const groundY = getMountainTerrainElevation(h.x, h.z);
      houseGroup.position.set(h.x, groundY, h.z);
      village.add(houseGroup);
    });

    // ==========================================
    // EVACUATION ROAD & SAFE MUSTER POINT
    // Road from x = 50.0 to 75.0, z from 25.0 to 30.0
    // Towards x = 70, y = ground (~30 elevation zone)
    // ==========================================
    // 1. Evacuation Road (25m along X, 5m along Z, centered at X: 62.5, Z: 27.5)
    const evacRoadGeo = new THREE.BoxGeometry(25.0, 0.12, 5.0);
    const evacRoad = new THREE.Mesh(evacRoadGeo, roadMat);
    evacRoad.position.set(62.5, 0.50, 27.5);
    evacRoad.receiveShadow = true;
    village.add(evacRoad);

    // Double yellow center divider line
    const yellowStripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(24.4, 0.18), yellowStripeMat);
    centerLine.rotateX(-Math.PI / 2);
    centerLine.position.set(62.5, 0.57, 27.5);
    village.add(centerLine);

    // White outer road shoulder markings
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    [-2.2, 2.2].forEach(offsetZ => {
      const shoulderLine = new THREE.Mesh(new THREE.PlaneGeometry(24.4, 0.12), whiteLineMat);
      shoulderLine.rotateX(-Math.PI / 2);
      shoulderLine.position.set(62.5, 0.57, 27.5 + offsetZ);
      village.add(shoulderLine);
    });

    // Connector road linking the village avenue (x = 40.0) into the evacuation road (at x = 50.0)
    const connectorRoad = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.12, 4.2), roadMat);
    connectorRoad.position.set(45.0, 0.50, 27.5);
    connectorRoad.receiveShadow = true;
    village.add(connectorRoad);

    // Directional evacuation chevrons painted on asphalt pointing East toward X: 70
    [54.0, 60.0, 66.0].forEach(arrowX => {
      const arrowGroup = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.3), whiteLineMat);
      shaft.rotateX(-Math.PI / 2);
      shaft.position.set(arrowX, 0.58, 26.5);
      arrowGroup.add(shaft);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 3), whiteLineMat);
      head.rotateX(-Math.PI / 2);
      head.rotateZ(-Math.PI / 2);
      head.position.set(arrowX + 1.1, 0.58, 26.5);
      arrowGroup.add(head);
      village.add(arrowGroup);
    });

    // Streetlights along evacuation road
    const darkSteelPolesMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.5 });
    [53.0, 61.0, 69.0].forEach(lx => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 8), darkSteelPolesMat);
      pole.position.set(lx, 2.1, 24.5);
      pole.castShadow = true;
      village.add(pole);

      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.5), whiteLineMat);
      lamp.position.set(lx, 3.7, 25.0);
      village.add(lamp);

      const light = new THREE.PointLight(0xfef08a, 0.8, 8);
      light.position.set(lx, 3.5, 25.0);
      village.add(light);
    });

    // SAFE EVACUATION MUSTER POINT & EMERGENCY SHELTER AT X: 70.0, Z: 28.5 to 30.0
    const shelterPad = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 0.25, 6.0),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 })
    );
    shelterPad.position.set(70.0, 0.55, 28.5);
    shelterPad.receiveShadow = true;
    village.add(shelterPad);

    // Weatherproof Shelter Canopy Tent
    const tentRoofMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
    const tentRoof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.4, 4), tentRoofMat);
    tentRoof.rotateY(Math.PI / 4);
    tentRoof.position.set(70.0, 2.6, 28.5);
    tentRoof.castShadow = true;
    village.add(tentRoof);

    // 4 Corner Poles for Shelter
    [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.8, 6), darkSteelPolesMat);
      post.position.set(70.0 + px, 1.55, 28.5 + pz);
      village.add(post);
    });

    // Flashing Emergency Beacon Pole at Muster Point
    const beaconPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 4.2, 8), darkSteelPolesMat);
    beaconPole.position.set(73.5, 2.6, 28.5);
    village.add(beaconPole);

    const beaconLight = new THREE.PointLight(0xf59e0b, 1.8, 15);
    beaconLight.position.set(73.5, 4.8, 28.5);
    village.add(beaconLight);

    const beaconGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
    beaconGlobe.position.set(73.5, 4.8, 28.5);
    village.add(beaconGlobe);

    // 2. 20 VILLAGERS RUNNING TOWARDS EMERGENCY SHED (AROUND 20 PEOPLE)
    const clothingColors = [
      0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 
      0x8b5cf6, 0x06b6d4, 0xec4899, 0x14b8a6,
      0xf97316, 0x6366f1, 0x84cc16, 0x0ea5e9,
      0xd946ef, 0x22c55e, 0xeab308, 0x64748b,
      0xf43f5e, 0x0284c7, 0x10b981, 0xe11d48
    ];

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.7 });
    const hairColors = [0x1e293b, 0x451a03, 0x78350f, 0x0f172a];
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    // The 8 residential houses in the village (4 West + 4 East) + 9th cul-de-sac cottage + promenade
    const residentialHouses = houses.slice(0, 8);
    const newVillagers: VillagerEntity[] = [];

    // 20 designated starting configurations across homes and village plaza
    interface VillagerHomeConfig {
      hIdx: number;
      homeX: number;
      homeZ: number;
      rotY: number;
    }
    const villagerConfigs: VillagerHomeConfig[] = [];

    // 16 residents from the 8 primary houses (2 per house)
    residentialHouses.forEach((house, hIdx) => {
      for (let p = 0; p < 2; p++) {
        const homeOffsetZ = (p === 0 ? -0.7 : 0.7);
        const homeX = house.x + (house.x === 35.0 ? 2.0 : -2.0);
        const homeZ = house.z + homeOffsetZ;
        const rotY = (house.x === 35.0 ? Math.PI / 2 : -Math.PI / 2);
        villagerConfigs.push({ hIdx, homeX, homeZ, rotY });
      }
    });

    // 2 residents from the Cul-de-sac cottage (house #8)
    villagerConfigs.push({ hIdx: 8, homeX: 38.6, homeZ: 42.6, rotY: Math.PI / 2 });
    villagerConfigs.push({ hIdx: 8, homeX: 41.4, homeZ: 42.6, rotY: -Math.PI / 2 });

    // 2 residents strolling by the Village Plaza & Promenade
    villagerConfigs.push({ hIdx: 9, homeX: 39.2, homeZ: 20.8, rotY: 0.2 });
    villagerConfigs.push({ hIdx: 9, homeX: 41.8, homeZ: 22.2, rotY: -0.4 });

    villagerConfigs.forEach((cfg, villagerId) => {
      const villagerGroup = new THREE.Group();
      villagerGroup.name = `villager_${villagerId}`;

      const shirtMat = new THREE.MeshStandardMaterial({
        color: clothingColors[villagerId % clothingColors.length],
        roughness: 0.7
      });
      const hairMat = new THREE.MeshStandardMaterial({
        color: hairColors[(villagerId + cfg.hIdx) % hairColors.length],
        roughness: 0.9
      });

      // Torso
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.52, 0.22), shirtMat);
      body.position.y = 0.76;
      body.castShadow = true;
      villagerGroup.add(body);

      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), skinMat);
      head.position.y = 1.14;
      head.castShadow = true;
      villagerGroup.add(head);

      // Hair / Cap
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.145, 8, 8), hairMat);
      hair.position.set(0, 1.17, -0.02);
      hair.scale.set(1.02, 0.7, 1.02);
      villagerGroup.add(hair);

      // Left Leg
      const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.50, 0.12), pantsMat);
      leftLeg.position.set(-0.09, 0.25, 0);
      leftLeg.castShadow = true;
      villagerGroup.add(leftLeg);

      // Right Leg
      const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.50, 0.12), pantsMat);
      rightLeg.position.set(0.09, 0.25, 0);
      rightLeg.castShadow = true;
      villagerGroup.add(rightLeg);

      // Left Arm
      const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.44, 0.09), shirtMat);
      leftArm.position.set(-0.23, 0.76, 0);
      leftArm.castShadow = true;
      villagerGroup.add(leftArm);

      // Right Arm
      const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.44, 0.09), shirtMat);
      rightArm.position.set(0.23, 0.76, 0);
      rightArm.castShadow = true;
      villagerGroup.add(rightArm);

      // Home Ground Elevation & Placement
      const groundY = getMountainTerrainElevation(cfg.homeX, cfg.homeZ);
      villagerGroup.position.set(cfg.homeX, groundY, cfg.homeZ);
      villagerGroup.rotation.y = cfg.rotY;
      village.add(villagerGroup);

      // Evacuation Target: 20 people safely assembled under & around the Emergency Shed at X: 70, Z: 28.5
      const targetRow = Math.floor(villagerId / 5); // 4 rows
      const targetCol = villagerId % 5;             // 5 columns
      const targetX = 68.2 + targetCol * 0.85;
      const targetZ = 27.2 + targetRow * 0.75;

      newVillagers.push({
        id: villagerId,
        houseIndex: cfg.hIdx,
        homeX: cfg.homeX,
        homeZ: cfg.homeZ,
        targetX,
        targetZ,
        group: villagerGroup,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        runProgress: 0,
        speed: 0.18 + (villagerId % 5) * 0.03,
        startDelay: (villagerId * 0.12) % 1.2,
        // Cache ground elevations once at build time — avoids 20 expensive calls per frame
        homeGroundY:   getMountainTerrainElevation(cfg.homeX, cfg.homeZ),
        targetGroundY: getMountainTerrainElevation(targetX, targetZ),
      });
    });

    villagersRef.current = newVillagers;

    scene.add(village);
  }

  // ==========================================
  // VALDORIA HEAVY INDUSTRIAL FACTORY & SMOKESTACKS
  // Major manufacturing plant with 3 chimneys exhaling continuous volumetric smoke
  // ==========================================
  function buildLargeFactoryComplex(scene: THREE.Scene) {
    const factoryGroup = new THREE.Group();
    factoryGroup.name = 'largeFactoryComplex';

    // Industrial Materials
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, metalness: 0.1 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.4 });
    const sheetMetalMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.45 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75, metalness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.15, metalness: 0.9, transparent: true, opacity: 0.75 });
    const yellowStripeMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 });
    const redStripeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    const whiteStripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.8 });
    const tankMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.25 });
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7, metalness: 0.5 });
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });

    // 1. Concrete Foundation Apron & Logistics Yard AT THE BLUE SPOT (z = -48 to -24, x = 32 to 56)
    const apron = new THREE.Mesh(new THREE.BoxGeometry(24, 0.35, 24), concreteMat);
    apron.position.set(44, 0.25, -36);
    apron.receiveShadow = true;
    factoryGroup.add(apron);

    // North Highway connecting bridge at z=-6.0 down to factory at z=-36.0 along x=24.0
    const northHighway = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 32.0), roadMat);
    northHighway.rotateX(-Math.PI / 2);
    northHighway.position.set(24.0, 0.48, -21.0);
    northHighway.receiveShadow = true;
    factoryGroup.add(northHighway);

    // Factory Access Road branching from highway into apron (at z = -36.0, connecting x=24.0 to x=34.0)
    const factoryAccessRoad = new THREE.Mesh(new THREE.PlaneGeometry(16.0, 4.0), roadMat);
    factoryAccessRoad.rotateX(-Math.PI / 2);
    factoryAccessRoad.position.set(30.0, 0.48, -36.0);
    factoryAccessRoad.receiveShadow = true;
    factoryGroup.add(factoryAccessRoad);

    // 2. MAIN MANUFACTURING HALL AT THE BLUE SPOT
    const mainHall = new THREE.Mesh(new THREE.BoxGeometry(20, 9.5, 12), sheetMetalMat);
    mainHall.position.set(44, 5.1, -36);
    mainHall.castShadow = true;
    mainHall.receiveShadow = true;
    factoryGroup.add(mainHall);

    // Industrial Saw-tooth Roof with Glass Skylights
    [-3.2, 0, 3.2].forEach(roofOffset => {
      const toothGroup = new THREE.Group();
      toothGroup.position.set(44, 10.2, -36 + roofOffset);

      // Sloped dark roof panel
      const slope = new THREE.Mesh(new THREE.BoxGeometry(20, 0.15, 3.0), roofMat);
      slope.rotation.x = Math.PI / 6.5;
      slope.position.set(0, 0.8, -0.6);
      slope.castShadow = true;
      toothGroup.add(slope);

      // Vertical glass skylight facing north
      const skylight = new THREE.Mesh(new THREE.BoxGeometry(19.6, 1.4, 0.1), glassMat);
      skylight.position.set(0, 0.8, 1.0);
      toothGroup.add(skylight);

      factoryGroup.add(toothGroup);
    });

    // Roll-up Cargo Loading Bays with Warning Stripes
    [-5.5, 0, 5.5].forEach(doorX => {
      const bayDoor = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.2, 0.2), darkSteelMat);
      bayDoor.position.set(44 + doorX, 2.45, -29.9);
      factoryGroup.add(bayDoor);

      // Warning striped lintel
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.4, 0.3), yellowStripeMat);
      lintel.position.set(44 + doorX, 4.75, -29.85);
      factoryGroup.add(lintel);
    });

    // 3. SECONDARY THERMAL BOILER & TURBINE BUILDING
    const boilerPlant = new THREE.Mesh(new THREE.BoxGeometry(11, 7.5, 8), darkSteelMat);
    boilerPlant.position.set(51, 4.1, -43.0);
    boilerPlant.castShadow = true;
    boilerPlant.receiveShadow = true;
    factoryGroup.add(boilerPlant);

    // Transformer & Electrical Substation
    const subPad = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 6), concreteMat);
    subPad.position.set(36, 0.48, -43.0);
    factoryGroup.add(subPad);
    [-2, 2].forEach(tx => {
      const trans = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.5, 2.2), sheetMetalMat);
      trans.position.set(36 + tx, 1.7, -43.0);
      trans.castShadow = true;
      factoryGroup.add(trans);

      const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.1, 8), darkSteelMat);
      insulator.position.set(36 + tx, 3.4, -43.0);
      factoryGroup.add(insulator);
    });

    // 4. OVERHEAD INDUSTRIAL PIPING & DUCT RUNS
    const pipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 10, 12), pipeMat);
    pipe1.rotation.x = Math.PI / 2;
    pipe1.position.set(48, 7.8, -41.0);
    pipe1.castShadow = true;
    factoryGroup.add(pipe1);

    const pipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 10, 10), pipeMat);
    pipe2.rotation.z = Math.PI / 2;
    pipe2.position.set(44, 8.5, -42.2);
    pipe2.castShadow = true;
    factoryGroup.add(pipe2);

    // 5. THREE TALL INDUSTRIAL CHIMNEYS (SMOKESTACKS)
    // Chimney 1: Giant Primary Concrete Smokestack
    const chimney1Group = new THREE.Group();
    chimney1Group.name = 'factoryChimney';
    chimney1Group.position.set(50, 0.35, -45.5);

    const stack1 = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.5, 25, 16), concreteMat);
    stack1.position.y = 12.5;
    stack1.castShadow = true;
    stack1.receiveShadow = true;
    chimney1Group.add(stack1);

    // Alternating Red & White Aviation Hazard Rings
    [21.5, 23.5].forEach(ry => {
      const redRing = new THREE.Mesh(new THREE.CylinderGeometry(1.04, 1.08, 1.0, 16), redStripeMat);
      redRing.position.y = ry;
      chimney1Group.add(redRing);
    });
    [20.5, 22.5, 24.5].forEach(wy => {
      const whiteRing = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.06, 1.0, 16), whiteStripeMat);
      whiteRing.position.y = wy;
      chimney1Group.add(whiteRing);
    });

    // Inspection Catwalk Platform
    const catwalk1 = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.2, 16), darkSteelMat);
    catwalk1.position.y = 18.0;
    chimney1Group.add(catwalk1);
    const rail1 = new THREE.Mesh(new THREE.CylinderGeometry(1.92, 1.92, 0.9, 16, 1, true), fenceMat);
    rail1.position.y = 18.5;
    chimney1Group.add(rail1);

    // Flashing Red Warning Beacon on Top
    const beacon1 = new THREE.PointLight(0xef4444, 1.8, 45);
    beacon1.position.y = 25.4;
    chimney1Group.add(beacon1);
    factoryBeaconRef.current = beacon1;

    const beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    beaconMesh.position.y = 25.4;
    chimney1Group.add(beaconMesh);

    factoryGroup.add(chimney1Group);

    // Chimney 2: Secondary Steel Flue Chimney
    const stack2 = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 19, 14), darkSteelMat);
    stack2.position.set(54, 9.8, -42.0);
    stack2.castShadow = true;
    factoryGroup.add(stack2);

    const stack2Top = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.65, 0.8, 14), redStripeMat);
    stack2Top.position.set(54, 19.4, -42.0);
    factoryGroup.add(stack2Top);

    // Chimney 3: Boiler Exhaust Chimney
    const stack3 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 15, 12), pipeMat);
    stack3.position.set(52, 8.0, -30.0);
    stack3.castShadow = true;
    factoryGroup.add(stack3);

    // 6. CONTINUOUS EXHALING SMOKE PARTICLE SYSTEM
    const smokeCount = 450;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);

    // Soft radial gradient canvas texture for realistic billowing volumetric smoke
    const smokeCanvas = document.createElement('canvas');
    smokeCanvas.width = 64;
    smokeCanvas.height = 64;
    const sCtx = smokeCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.35, 'rgba(255,255,255,0.6)');
      grad.addColorStop(0.7, 'rgba(255,255,255,0.2)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 64, 64);
    }
    const softSmokeTexture = new THREE.CanvasTexture(smokeCanvas);

    for (let i = 0; i < smokeCount; i++) {
      const isChimney1 = i % 3 !== 0;
      const originX = isChimney1 ? 50 : 54;
      const originY = isChimney1 ? 25.5 : 19.5;
      const originZ = isChimney1 ? -45.5 : -42.0;

      const progress = Math.random();
      smokePos[i * 3] = originX - progress * 18 + (Math.random() - 0.5) * 4.5 * progress;
      smokePos[i * 3 + 1] = originY + progress * 14 + (Math.random() - 0.5) * 2;
      smokePos[i * 3 + 2] = originZ + progress * 10 + (Math.random() - 0.5) * 4.5 * progress;
    }

    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));

    const factorySmokeMat = new THREE.PointsMaterial({
      color: 0xcbd5e1, // Billowing industrial exhaust steam/smoke
      map: softSmokeTexture,
      size: 3.2,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });
    const smokePoints = new THREE.Points(smokeGeo, factorySmokeMat);
    scene.add(smokePoints);
    factorySmokeRef.current = smokePoints;

    // 7. CHEMICAL & GAS STORAGE TANKS AT THE BLUE SPOT
    // 2 Large Spherical Gas Storage Tanks
    [
      { x: 35, z: -32.0, r: 2.1 },
      { x: 35, z: -36.5, r: 1.8 }
    ].forEach(t => {
      const tank = new THREE.Mesh(new THREE.SphereGeometry(t.r, 16, 16), tankMat);
      tank.position.set(t.x, t.r + 0.6, t.z);
      tank.castShadow = true;
      factoryGroup.add(tank);

      for (let leg = 0; leg < 4; leg++) {
        const ang = (leg * Math.PI) / 2 + Math.PI / 4;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, t.r + 0.6, 6), darkSteelMat);
        post.position.set(t.x + Math.cos(ang) * (t.r * 0.7), (t.r + 0.6) / 2, t.z + Math.sin(ang) * (t.r * 0.7));
        factoryGroup.add(post);
      }
    });

    // 3 Vertical Storage Silos
    [-3.2, 0, 3.2].forEach(siloZ => {
      const silo = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 8.0, 14), sheetMetalMat);
      silo.position.set(34, 4.35, -41.0 + siloZ);
      silo.castShadow = true;
      factoryGroup.add(silo);

      const dome = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.0, 14), darkSteelMat);
      dome.position.set(34, 8.85, -41.0 + siloZ);
      factoryGroup.add(dome);
    });

    // 8. LOGISTICS INTERMODAL SHIPPING CONTAINERS
    const containerColors = [0x0284c7, 0xe11d48, 0x16a34a, 0xd97706, 0x475569];
    const containers = [
      { x: 35, z: -27.0, rot: 0, c: 0 },
      { x: 35, z: -23.5, rot: 0, c: 1 },
      { x: 35, z: -27.0, y: 2.7, rot: 0, c: 2 },
      { x: 53, z: -34.0, rot: Math.PI / 2, c: 3 },
      { x: 53, z: -38.0, rot: Math.PI / 2, c: 4 },
      { x: 53, z: -34.0, y: 2.7, rot: Math.PI / 2, c: 0 }
    ];
    containers.forEach(ct => {
      const cMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 2.6, 6.0),
        new THREE.MeshStandardMaterial({ color: containerColors[ct.c], roughness: 0.6, metalness: 0.3 })
      );
      cMesh.position.set(ct.x, (ct.y || 1.45), ct.z);
      cMesh.rotation.y = ct.rot;
      cMesh.castShadow = true;
      factoryGroup.add(cMesh);
    });

    // ==========================================
    // 9. CHEMICAL EFFLUENT DISCHARGE OUTLET (x = 30.0 to 17.5 at z = -34.0)
    // Pipeline from factory chemical storage area dumping into the river
    // ==========================================
    const outletGroup = new THREE.Group();
    outletGroup.name = 'factoryChemicalOutlet';

    // Industrial discharge pipe from x = 30.0 to x = 17.5 (length = 12.5m)
    const outpipeGeo = new THREE.CylinderGeometry(0.26, 0.26, 12.5, 12);
    outpipeGeo.rotateZ(Math.PI / 2);
    const outpipe = new THREE.Mesh(outpipeGeo, pipeMat);
    outpipe.position.set(23.75, 0.32, -34.0);
    outpipe.castShadow = true;
    outletGroup.add(outpipe);

    // Concrete culvert / drainage ditch underneath
    const trenchGeo = new THREE.BoxGeometry(12.5, 0.22, 1.1);
    const trench = new THREE.Mesh(trenchGeo, concreteMat);
    trench.position.set(23.75, 0.10, -34.0);
    trench.receiveShadow = true;
    outletGroup.add(trench);

    // Support cradles along the pipe
    [28.0, 24.0, 20.0].forEach(sx => {
      const cradle = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.8), darkSteelMat);
      cradle.position.set(sx, 0.22, -34.0);
      cradle.castShadow = true;
      outletGroup.add(cradle);
    });

    // Concrete outfall headwall at river shoreline (x = 17.5, z = -34.0)
    const headwall = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.4, 2.2), concreteMat);
    headwall.position.set(17.5, -0.15, -34.0);
    headwall.castShadow = true;
    headwall.receiveShadow = true;
    outletGroup.add(headwall);

    // Steel trash rack / grate at pipe mouth
    const grate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.65), darkSteelMat);
    grate.position.set(17.2, -0.22, -34.0);
    outletGroup.add(grate);

    // Small trickling chemical fluid flow pouring from pipe into water (very small quantity)
    const chemTrickleMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark industrial effluent
      roughness: 0.15,
      metalness: 0.3,
      transparent: true,
      opacity: 0.82
    });
    const trickle = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.16, 0.55, 8), chemTrickleMat);
    trickle.position.set(17.15, -0.48, -34.0);
    outletGroup.add(trickle);
    chemicalOutletTrickleRef.current = trickle;

    factoryGroup.add(outletGroup);

    scene.add(factoryGroup);
  }

  function buildHillsideLandslideZone(scene: THREE.Scene) {
    const hillsideGroup = new THREE.Group();
    hillsideGroup.name = 'hillsideLandslideZone';

    // 1. NATURAL MOUNTAIN BEDROCK CLIFFS & LARGE ROLLING BOULDERS (Only 4 natural boulders)
    const cliffMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.92, flatShading: true });
    rollingBouldersRef.current = [];
    const mountainPeaks = [
      // 4 natural boulders spaced across the mountain slope
      { x: -38.5, z: 41.0, sx: 3.2, sy: 2.8, sz: 3.0, rx: 0.2, ry: 0.8, targetX: -15.0, targetZ: 34.0, r: 1.8 },
      { x: -33.5, z: 33.0, sx: 3.0, sy: 2.5, sz: 2.8, rx: -0.2, ry: 1.0, targetX: -14.0, targetZ: 32.0, r: 1.6 },
      { x: -28.0, z: 24.0, sx: 2.8, sy: 2.4, sz: 2.6, rx: 0.3, ry: 0.6, targetX: -15.5, targetZ: 26.5, r: 1.5 },
      { x: -19.5, z: 32.5, sx: 2.6, sy: 2.2, sz: 2.4, rx: 0.1, ry: 0.9, targetX: -13.0, targetZ: 33.5, r: 1.4 }
    ];

    mountainPeaks.forEach(pk => {
      const pkGeo = new THREE.DodecahedronGeometry(1.0, 1);
      const pkMesh = new THREE.Mesh(pkGeo, cliffMat);
      const pkY = getMountainTerrainElevation(pk.x, pk.z) + 1.2;
      pkMesh.position.set(pk.x, pkY, pk.z);
      pkMesh.scale.set(pk.sx, pk.sy, pk.sz);
      pkMesh.rotation.set(pk.rx, pk.ry, 0);
      pkMesh.castShadow = true;
      pkMesh.receiveShadow = true;
      hillsideGroup.add(pkMesh);

      rollingBouldersRef.current.push({
        mesh: pkMesh,
        startX: pk.x,
        startY: pkY,
        startZ: pk.z,
        baseRotX: pk.rx,
        baseRotY: pk.ry,
        baseRotZ: 0,
        radius: pk.r,
        targetX: pk.targetX,
        targetZ: pk.targetZ
      });
    });

    // 2. SCATTER ROCKS: Removed so only 4 main boulders are present on the slope

    // 2b. BROAD ACTIVE FLOWING SOIL & MUD BLANKET REACHING ALL THE WAY TO THE RIVER (FIRMLY ON THE LAND)
    const mudChuteGeo = new THREE.PlaneGeometry(48.0, 36.0, 32, 24);
    mudChuteGeo.rotateX(-Math.PI / 2);

    // FIRMLY ON THE LAND: Set every vertex to the exact mountain terrain elevation so it can NEVER hover in the air!
    const mPosInit = mudChuteGeo.attributes.position;
    for (let i = 0; i < mPosInit.count; i++) {
      const mx = mPosInit.getX(i);
      const mz = mPosInit.getZ(i);
      const wx = -19.5 + mx;
      const wz = 32.5 + mz;
      const groundY = getMountainTerrainElevation(wx, wz);
      mPosInit.setY(i, groundY + 0.04);
    }
    mudChuteGeo.computeVertexNormals();

    const mudMat = new THREE.MeshStandardMaterial({
      color: 0x48321d, // Rich dark wet mountain earth
      roughness: 0.55,
      metalness: 0.15,
      transparent: true,
      opacity: 0,
      flatShading: true
    });
    const mudMesh = new THREE.Mesh(mudChuteGeo, mudMat);
    mudMesh.position.set(-19.5, 0, 32.5); // Position Y = 0 and rotation = 0 to stay firmly on the ground!
    mudMesh.receiveShadow = true;
    mudMesh.visible = false;
    hillsideGroup.add(mudMesh);
    flowingMudMeshRef.current = mudMesh;

    // 2c. TUMBLING SOIL & MUD CLODS ACROSS TOTAL SLOPE ALL THE WAY TO THE RIVER
    flowingSoilClodsRef.current = [];
    const clodMat = new THREE.MeshStandardMaterial({ color: 0x54361e, roughness: 0.9, flatShading: true });
    for (let c = 0; c < 36; c++) {
      const radius = 0.35 + Math.random() * 0.55;
      const clodMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), clodMat);
      clodMesh.castShadow = true;
      clodMesh.receiveShadow = true;
      clodMesh.visible = false;
      hillsideGroup.add(clodMesh);

      const latSpread = (Math.random() - 0.5) * 16.0;
      flowingSoilClodsRef.current.push({
        mesh: clodMesh,
        startX: -39.0 + (Math.random() - 0.5) * 6.0,
        startZ: 33.0 + latSpread * 0.65,
        targetX: 8.4 + (Math.random() - 0.5) * 1.6, // Tumbles down the mountain slope and falls into the lake!
        targetZ: 32.0 + latSpread * 0.40,
        speed: 0.14 + Math.random() * 0.12,
        rotSpeed: 2.0 + Math.random() * 3.0,
        radius
      });
    }

    // Dynamic debris reference for subtle hazard movement
    const dynamicDebrisGroup = new THREE.Group();
    dynamicDebrisGroup.name = 'landslideDebris';
    dynamicDebrisGroup.position.set(-28.0, 7.5, 32.5);
    hillsideGroup.add(dynamicDebrisGroup);
    landslideDebrisRef.current = dynamicDebrisGroup;

    // 3. MOUNTAIN EVERGREEN PINES THOROUGHLY POPULATING HILLSIDE SLOPES
    slidingTreesRef.current = [];
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.9 });
    const pineFoliageMat1 = new THREE.MeshStandardMaterial({ color: 0x144524, roughness: 0.82, flatShading: true });
    const pineFoliageMat2 = new THREE.MeshStandardMaterial({ color: 0x1c542d, roughness: 0.78, flatShading: true });
    const soilEarthMat = new THREE.MeshStandardMaterial({ color: 0x4a331f, roughness: 0.92, flatShading: true }); // Dark fertile mountain soil
    const rootWoodMat = new THREE.MeshStandardMaterial({ color: 0x382215, roughness: 0.88 });

    // Comprehensive dense distribution of trees across the empty areas
    const isNearAnyRock = (tx: number, tz: number) => {
      return mountainPeaks.some(pk => {
        const d = Math.hypot(tx - pk.x, tz - pk.z);
        return d < Math.max(pk.sx, pk.sz) + 1.8;
      });
    };

    const mountainPineCoords = [
      // Left / Western slope (X: -44 to -28, Z: 18 to 44)
      { x: -43.5, z: 38.5, s: 1.10 },
      { x: -42.5, z: 36.5, s: 1.05 },
      { x: -41.0, z: 39.0, s: 0.95 },
      { x: -43.0, z: 33.5, s: 1.05 },
      { x: -40.5, z: 32.5, s: 1.00 },
      { x: -42.0, z: 28.0, s: 0.90 },
      { x: -39.5, z: 29.5, s: 0.85 },
      { x: -41.5, z: 26.0, s: 0.95 },
      { x: -38.5, z: 25.0, s: 1.00 },
      { x: -41.5, z: 23.5, s: 0.85 },
      { x: -39.0, z: 21.5, s: 0.90 },
      { x: -36.5, z: 22.0, s: 0.90 },
      { x: -34.5, z: 24.5, s: 0.95 },
      { x: -32.5, z: 22.0, s: 0.80 },
      { x: -35.0, z: 27.0, s: 0.88 },
      { x: -38.0, z: 32.0, s: 0.90 },
      { x: -35.5, z: 30.0, s: 0.85 },

      // High Crest Ridge & Upper Shoulder (X: -44 to -22, Z: 39 to 46)
      { x: -43.5, z: 44.5, s: 1.15 },
      { x: -42.0, z: 43.0, s: 1.10 },
      { x: -39.5, z: 42.5, s: 1.05 },
      { x: -37.0, z: 43.5, s: 0.95 },
      { x: -35.0, z: 41.5, s: 1.00 },
      { x: -33.5, z: 44.5, s: 1.05 },
      { x: -32.5, z: 43.0, s: 0.90 },
      { x: -30.0, z: 42.0, s: 0.95 },
      { x: -28.0, z: 43.5, s: 0.85 },
      { x: -26.0, z: 41.5, s: 0.90 },
      { x: -24.5, z: 43.5, s: 0.95 },
      { x: -24.0, z: 40.0, s: 0.85 },
      { x: -22.0, z: 42.0, s: 0.80 },
      { x: -21.0, z: 44.0, s: 0.85 },
      { x: -23.0, z: 45.0, s: 0.90 },
      { x: -25.5, z: 45.5, s: 0.95 },

      // Central Slope Bowl (X: -36 to -18, Z: 26 to 39)
      { x: -35.5, z: 35.0, s: 0.95 },
      { x: -33.5, z: 37.0, s: 1.00 },
      { x: -31.5, z: 34.5, s: 0.90 },
      { x: -29.5, z: 37.5, s: 0.95 },
      { x: -28.0, z: 35.0, s: 0.85 },
      { x: -26.5, z: 37.0, s: 0.90 },
      { x: -25.0, z: 33.5, s: 0.80 },
      { x: -23.5, z: 36.5, s: 0.85 },
      { x: -22.0, z: 34.0, s: 0.80 },
      { x: -20.5, z: 32.5, s: 0.85 },
      { x: -24.5, z: 30.5, s: 0.75 },
      { x: -27.5, z: 29.0, s: 0.85 },
      { x: -29.0, z: 31.5, s: 0.88 },
      { x: -30.0, z: 27.5, s: 0.80 },
      { x: -32.0, z: 29.5, s: 0.85 },
      { x: -22.5, z: 31.0, s: 0.78 },
      { x: -21.0, z: 33.5, s: 0.82 },

      // Southern Flank Ridge & Gully (X: -40 to -20, Z: 16 to 26)
      { x: -38.5, z: 17.5, s: 0.90 },
      { x: -36.8, z: 19.4, s: 0.95 },
      { x: -34.5, z: 18.5, s: 0.90 },
      { x: -33.0, z: 16.5, s: 0.85 },
      { x: -31.5, z: 19.5, s: 0.85 },
      { x: -29.0, z: 18.5, s: 0.80 },
      { x: -27.0, z: 16.8, s: 0.75 },
      { x: -26.5, z: 20.5, s: 0.75 },
      { x: -23.5, z: 22.0, s: 0.80 },
      { x: -25.5, z: 24.0, s: 0.85 },
      { x: -28.0, z: 26.0, s: 0.75 },
      { x: -21.5, z: 25.5, s: 0.70 },
      { x: -20.0, z: 23.5, s: 0.75 },
      { x: -18.5, z: 22.0, s: 0.72 },
      { x: -22.5, z: 18.0, s: 0.78 },

      // Lower Slope / Escarpment Toe (X: -22 to -10, Z: 26 to 40)
      { x: -21.5, z: 38.5, s: 0.90 },
      { x: -20.5, z: 36.0, s: 0.85 },
      { x: -18.5, z: 33.0, s: 0.75 },
      { x: -19.0, z: 38.0, s: 0.85 },
      { x: -17.0, z: 36.5, s: 0.80 },
      { x: -15.5, z: 34.5, s: 0.75 },
      { x: -16.5, z: 39.5, s: 0.80 },
      { x: -14.0, z: 31.0, s: 0.70 },
      { x: -14.5, z: 36.5, s: 0.75 },
      { x: -13.0, z: 35.5, s: 0.75 },
      { x: -12.6, z: 34.0, s: 0.70 },
      { x: -11.5, z: 36.0, s: 0.70 },
      { x: -16.0, z: 29.0, s: 0.75 },
      { x: -18.0, z: 27.5, s: 0.70 },
      { x: -14.5, z: 27.0, s: 0.65 },
      { x: -12.5, z: 28.5, s: 0.68 },
      { x: -11.0, z: 30.5, s: 0.65 },
      { x: -10.0, z: 33.0, s: 0.68 }
    ];

    mountainPineCoords
      .filter(pt => !isNearAnyRock(pt.x, pt.z))
      .forEach((pt, pIdx) => {
      const tree = new THREE.Group();
      const s = pt.s;
      const mat = (pIdx % 2 === 0) ? pineFoliageMat1 : pineFoliageMat2;
      const castShad = (pIdx % 3 === 0);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.5 * s, 6), trunkMat);
      trunk.position.y = 0.75 * s;
      trunk.castShadow = castShad;
      tree.add(trunk);

      const f1 = new THREE.Mesh(new THREE.ConeGeometry(1.0 * s, 2.0 * s, 6), mat);
      f1.position.y = 1.8 * s;
      f1.castShadow = castShad;
      tree.add(f1);

      const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.7 * s, 1.6 * s, 6), mat);
      f2.position.y = 2.7 * s;
      tree.add(f2);

      const f3 = new THREE.Mesh(new THREE.ConeGeometry(0.4 * s, 1.1 * s, 6), mat);
      f3.position.y = 3.5 * s;
      tree.add(f3);

      const groundY = getMountainTerrainElevation(pt.x, pt.z);
      tree.position.set(pt.x, groundY - 0.20, pt.z);
      tree.rotation.z = -0.12;
      hillsideGroup.add(tree);

      slidingTreesRef.current.push({
        tree,
        baseX: pt.x,
        baseY: groundY - 0.20,
        baseZ: pt.z,
        baseRotX: 0,
        baseRotZ: -0.12,
        tiltMultiplier: 0.8 + (pIdx % 5) * 0.25,
        slideMultiplier: 0.7 + (pIdx % 4) * 0.30
      });
    });

    // 4. DISTINCTIVE SOIL TREES (Trees anchored on dark mountain soil mounds with exposed root clusters)
    const soilTreesCoords = [
      { x: -37.0, z: 34.0, s: 0.95 },
      { x: -34.0, z: 31.5, s: 0.90 },
      { x: -32.0, z: 36.0, s: 0.92 },
      { x: -29.0, z: 33.5, s: 0.88 },
      { x: -27.5, z: 37.0, s: 0.85 },
      { x: -26.0, z: 31.0, s: 0.82 },
      { x: -23.0, z: 35.0, s: 0.85 },
      { x: -21.0, z: 30.0, s: 0.78 },
      { x: -19.5, z: 35.5, s: 0.80 },
      { x: -17.5, z: 31.5, s: 0.75 },
      { x: -15.0, z: 33.5, s: 0.72 },
      { x: -13.5, z: 37.0, s: 0.70 },
      { x: -36.0, z: 23.0, s: 0.90 },
      { x: -30.0, z: 24.5, s: 0.85 },
      { x: -24.0, z: 27.5, s: 0.80 },
      { x: -18.0, z: 25.0, s: 0.74 },
      // Increased additional soil trees across the landslide zone
      { x: -38.0, z: 30.5, s: 0.92 },
      { x: -35.5, z: 25.5, s: 0.88 },
      { x: -33.0, z: 28.0, s: 0.86 },
      { x: -31.0, z: 38.0, s: 0.90 },
      { x: -28.5, z: 26.5, s: 0.82 },
      { x: -25.5, z: 39.0, s: 0.85 },
      { x: -22.5, z: 28.0, s: 0.78 },
      { x: -20.0, z: 37.5, s: 0.80 },
      { x: -17.0, z: 27.5, s: 0.72 },
      { x: -15.5, z: 37.5, s: 0.74 },
      { x: -13.0, z: 31.5, s: 0.70 },
      { x: -11.5, z: 34.0, s: 0.68 }
    ];

    soilTreesCoords.forEach((st, stIdx) => {
      const sTreeGroup = new THREE.Group();
      const s = st.s;
      const castShad = (stIdx % 3 === 0);

      // Dark, rich mountain soil base mound
      const soilMound = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.85 * s, 1),
        soilEarthMat
      );
      soilMound.scale.set(1.4, 0.45, 1.4);
      soilMound.position.y = 0.2 * s;
      soilMound.receiveShadow = true;
      sTreeGroup.add(soilMound);

      // Radiating exposed mountain roots creeping over soil
      for (let r = 0; r < 4; r++) {
        const rootAng = (r * Math.PI / 2) + 0.3;
        const rootLen = 0.95 * s;
        const root = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04 * s, 0.08 * s, rootLen, 5),
          rootWoodMat
        );
        root.rotation.z = Math.PI / 3.2;
        root.rotation.y = rootAng;
        root.position.set(Math.cos(rootAng) * 0.45 * s, 0.18 * s, Math.sin(rootAng) * 0.45 * s);
        sTreeGroup.add(root);
      }

      // Slightly bent/tilted alpine tree trunk representing creeping mountain soil
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12 * s, 0.20 * s, 1.6 * s, 6),
        trunkMat
      );
      trunk.position.set(-0.06 * s, 0.85 * s, 0);
      trunk.rotation.z = -0.16;
      trunk.castShadow = castShad;
      sTreeGroup.add(trunk);

      // Tiered foliage
      const foliageMat = stIdx % 2 === 0 ? pineFoliageMat1 : pineFoliageMat2;
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.05 * s, 1.9 * s, 6), foliageMat);
      c1.position.set(-0.16 * s, 1.85 * s, 0);
      c1.rotation.z = -0.16;
      c1.castShadow = castShad;
      sTreeGroup.add(c1);

      const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.72 * s, 1.5 * s, 6), pineFoliageMat2);
      c2.position.set(-0.25 * s, 2.75 * s, 0);
      c2.rotation.z = -0.16;
      sTreeGroup.add(c2);

      const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.42 * s, 1.1 * s, 6), pineFoliageMat1);
      c3.position.set(-0.32 * s, 3.55 * s, 0);
      c3.rotation.z = -0.16;
      sTreeGroup.add(c3);

      const groundY = getMountainTerrainElevation(st.x, st.z);
      sTreeGroup.position.set(st.x, groundY - 0.08, st.z);
      hillsideGroup.add(sTreeGroup);

      slidingTreesRef.current.push({
        tree: sTreeGroup,
        baseX: st.x,
        baseY: groundY - 0.08,
        baseZ: st.z,
        baseRotX: 0,
        baseRotZ: -0.16,
        tiltMultiplier: 1.1 + (stIdx % 4) * 0.25,
        slideMultiplier: 1.0 + (stIdx % 3) * 0.35
      });
    });

    // 5. FOUR DEDICATED RIVER-BOUND TREES & SOIL
    // During landslide, these 4 trees and their root soil mounds slope dramatically down the hillside and NEARS THE RIVER!
    const riverSlideTreesCoords = [
      { startX: -16.0, startZ: 33.5, targetX: 4.2, targetZ: 32.5, s: 0.86, targetTiltZ: -0.62 },
      { startX: -18.2, startZ: 36.8, targetX: 3.6, targetZ: 35.8, s: 0.90, targetTiltZ: -0.58 },
      { startX: -14.2, startZ: 30.5, targetX: 4.6, targetZ: 29.8, s: 0.82, targetTiltZ: -0.65 },
      { startX: -19.5, startZ: 34.0, targetX: 3.4, targetZ: 34.0, s: 0.88, targetTiltZ: -0.55 }
    ];

    riverSlideTreesCoords.forEach((rst, rIdx) => {
      const rTreeGroup = new THREE.Group();
      const s = rst.s;

      // Heavy displaced soil base mound under the tree
      const soilMound = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.95 * s, 1),
        soilEarthMat
      );
      soilMound.scale.set(1.5, 0.5, 1.5);
      soilMound.position.y = 0.22 * s;
      soilMound.castShadow = true;
      soilMound.receiveShadow = true;
      rTreeGroup.add(soilMound);

      // Massive exposed root tendrils gripping the soil
      for (let r = 0; r < 5; r++) {
        const rootAng = (r * Math.PI / 2.5) + 0.2;
        const rootLen = 1.1 * s;
        const root = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05 * s, 0.09 * s, rootLen, 5),
          rootWoodMat
        );
        root.rotation.z = Math.PI / 3.0;
        root.rotation.y = rootAng;
        root.position.set(Math.cos(rootAng) * 0.5 * s, 0.2 * s, Math.sin(rootAng) * 0.5 * s);
        root.castShadow = true;
        rTreeGroup.add(root);
      }

      // Strong alpine pine trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.22 * s, 1.7 * s, 6), trunkMat);
      trunk.position.set(-0.08 * s, 0.9 * s, 0);
      trunk.rotation.z = -0.15;
      trunk.castShadow = true;
      rTreeGroup.add(trunk);

      // Tiered foliage with dynamic color
      const foliageMat = rIdx % 2 === 0 ? pineFoliageMat1 : pineFoliageMat2;
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.15 * s, 2.1 * s, 6), foliageMat);
      c1.position.set(-0.18 * s, 1.95 * s, 0);
      c1.rotation.z = -0.15;
      c1.castShadow = true;
      rTreeGroup.add(c1);

      const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.80 * s, 1.6 * s, 6), pineFoliageMat2);
      c2.position.set(-0.28 * s, 2.9 * s, 0);
      c2.rotation.z = -0.15;
      c2.castShadow = true;
      rTreeGroup.add(c2);

      const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.48 * s, 1.2 * s, 6), pineFoliageMat1);
      c3.position.set(-0.35 * s, 3.7 * s, 0);
      c3.rotation.z = -0.15;
      c3.castShadow = true;
      rTreeGroup.add(c3);

      const groundY = getMountainTerrainElevation(rst.startX, rst.startZ);
      rTreeGroup.position.set(rst.startX, groundY - 0.10, rst.startZ);
      hillsideGroup.add(rTreeGroup);

      slidingTreesRef.current.push({
        tree: rTreeGroup,
        baseX: rst.startX,
        baseY: groundY - 0.10,
        baseZ: rst.startZ,
        baseRotX: 0,
        baseRotZ: -0.15,
        tiltMultiplier: 1.5,
        slideMultiplier: 2.2,
        isRiverRunoutTree: true,
        targetRiverX: rst.targetX,
        targetRiverZ: rst.targetZ,
        targetTiltZ: rst.targetTiltZ
      });
    });

    // 6. TREES ON THE ACTIVE SLIDE CENTER (Tilt and slide down across total area during disaster!)
    const activeSlideTreesCoords = [
      { x: -35.0, z: 36.5, s: 0.90 },
      { x: -31.0, z: 33.0, s: 0.85 },
      { x: -27.0, z: 35.5, s: 0.80 },
      { x: -24.0, z: 32.0, s: 0.75 },
      { x: -20.0, z: 34.0, s: 0.75 },
      { x: -16.5, z: 32.5, s: 0.70 }
    ];

    activeSlideTreesCoords
      .filter(pt => !isNearAnyRock(pt.x, pt.z))
      .forEach((pt, sIdx) => {
      const tree = new THREE.Group();
      const s = pt.s;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.5 * s, 6), trunkMat);
      trunk.position.y = 0.75 * s;
      trunk.castShadow = true;
      tree.add(trunk);

      const f1 = new THREE.Mesh(new THREE.ConeGeometry(1.0 * s, 2.0 * s, 6), pineFoliageMat1);
      f1.position.y = 1.8 * s;
      f1.castShadow = true;
      tree.add(f1);

      const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.7 * s, 1.6 * s, 6), pineFoliageMat2);
      f2.position.y = 2.7 * s;
      f2.castShadow = true;
      tree.add(f2);

      const groundY = getMountainTerrainElevation(pt.x, pt.z);
      tree.position.set(pt.x, groundY - 0.20, pt.z);
      tree.rotation.z = -0.12;
      hillsideGroup.add(tree);

      slidingTreesRef.current.push({
        tree,
        baseX: pt.x,
        baseY: groundY - 0.20,
        baseZ: pt.z,
        baseRotX: 0,
        baseRotZ: -0.12,
        tiltMultiplier: 1.25 + sIdx * 0.2,
        slideMultiplier: 1.35 + sIdx * 0.2
      });
    });

    scene.add(hillsideGroup);
  }

  // ==========================================
  // PHYSICAL PROTOTYPE NODES (ESP32-S3 + SX1262 LoRa)
  // With 3D Floating Billboard HUD Labels visible at all times
  // ==========================================
  function getNodeBadgeInfo(node: SensorNode): { title: string; subtitle: string; tag: string; color: string } {
    switch (node.id) {
      case 'NODE-FLOOD-1':
        return {
          title: 'FLOOD NODE 1',
          subtitle: 'MOUNTAIN RUNOFF GAUGE · NODE #1',
          tag: 'HEADWATERS INFLOW',
          color: '#06b6d4'
        };
      case 'NODE-1':
        return {
          title: 'FLOOD NODE 2',
          subtitle: 'EMBANKMENT LEVEL · TOP NODE #2',
          tag: 'CORRIDOR PRIMARY',
          color: '#0284c7'
        };
      case 'NODE-2':
        return {
          title: 'FOREST FIRE NODE 1',
          subtitle: 'SMOKE MQ-2 & THERMAL IR · NODE #1',
          tag: 'TIMBER WATCH #1',
          color: '#f97316'
        };
      case 'NODE-FIRE-2':
        return {
          title: 'FOREST FIRE NODE 2',
          subtitle: 'OPTICAL FLAME IR & GAS · NODE #2',
          tag: 'CANOPY CORROBORATION',
          color: '#fb923c'
        };
      case 'NODE-3':
        return {
          title: 'LANDSLIDE NODE 1',
          subtitle: 'ESCARPMENT GEOPHONE · TOP NODE #1',
          tag: 'SLOPE PRIMARY',
          color: '#f59e0b'
        };
      case 'NODE-LANDSLIDE-2':
        return {
          title: 'LANDSLIDE NODE 2',
          subtitle: 'RUNOUT TILT & GEOPHONE · NODE #2',
          tag: 'RUNOUT CORROBORATION',
          color: '#eab308'
        };
      default:
        return {
          title: node.name.toUpperCase(),
          subtitle: node.role.slice(0, 32),
          tag: 'FIELD NODE',
          color: '#10b981'
        };
    }
  }

  function renderBadgeCanvas(
    canvas: HTMLCanvasElement,
    title: string,
    subtitle: string,
    tag: string,
    accentColor: string,
    state: string
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let borderColor = accentColor;
    let badgeTag = tag;
    let tagBg = 'rgba(14, 165, 233, 0.22)';
    let tagFg = '#38bdf8';

    if (state === 'CRITICAL') {
      borderColor = '#ef4444';
      badgeTag = 'CRITICAL ALERT';
      tagBg = 'rgba(239, 68, 68, 0.35)';
      tagFg = '#f87171';
    } else if (state === 'WARNING') {
      borderColor = '#f59e0b';
      badgeTag = 'CORROBORATING';
      tagBg = 'rgba(245, 158, 11, 0.35)';
      tagFg = '#fbbf24';
    } else if (state === 'WATCH') {
      borderColor = '#38bdf8';
      badgeTag = 'WATCH ACTIVE';
      tagBg = 'rgba(56, 189, 248, 0.35)';
      tagFg = '#7dd3fc';
    }

    // Outer frosted container
    ctx.fillStyle = 'rgba(2, 6, 23, 0.90)';
    ctx.beginPath();
    ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 18);
    ctx.fill();

    // Glowing border
    ctx.lineWidth = 4;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    // Title: e.g. "FLOOD NODE 1"
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, 24, 46);

    // Minimal details: e.g. "MOUNTAIN RUNOFF GAUGE · NODE #1"
    ctx.font = '500 17px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(subtitle, 24, 80);

    // Status pill
    ctx.fillStyle = tagBg;
    ctx.beginPath();
    ctx.roundRect(24, 98, 230, 36, 10);
    ctx.fill();
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = tagFg;
    ctx.fillText(badgeTag, 36, 122);

    // Microchip hardware tag
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect(canvas.width - 188, 98, 164, 36, 10);
    ctx.fill();
    ctx.font = '600 15px monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('ESP32-S3 LoRa', canvas.width - 176, 122);
  }

  function buildPrototypeFieldNodes(scene: THREE.Scene) {
    nodeBadgesMapRef.current.clear();

    simulationEngine.prototypeNodes.forEach(node => {
      if (node.id === 'NODE-SUPERIOR') return; // Dedicated 14m Watch Tower mesh handles NODE-SUPERIOR
      const nodeGroup = new THREE.Group();
      const nodeElevation = getMountainTerrainElevation(node.position[0], node.position[2]);
      nodeGroup.position.set(node.position[0], nodeElevation, node.position[2]);
      nodeGroup.userData = { nodeId: node.id };

      const mastMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 8), mastMat);
      mast.position.y = 1.1;
      mast.castShadow = true;
      nodeGroup.add(mast);

      // Rugged Weatherproof IP67 Field Enclosure
      const boxMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });
      const enclosure = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.68, 0.36), boxMat);
      enclosure.position.set(0, 1.48, 0);
      enclosure.castShadow = true;
      nodeGroup.add(enclosure);

      // SX1262 LoRa Whip Antenna
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 6), mastMat);
      ant.position.set(0.2, 2.15, -0.1);
      nodeGroup.add(ant);

      // Top Angled Solar Panel Canopy (Field Deployment Concept)
      const solarMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.85 });
      const solar = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.03, 0.48), solarMat);
      solar.position.set(0, 1.9, 0.15);
      solar.rotation.x = Math.PI / 7;
      nodeGroup.add(solar);

      // SENSOR-SPECIFIC HARDWARE ATTACHMENTS
      if (node.id === 'NODE-1') {
        // Flood Node 2: Valley Embankment Water Horn & Optical Rain Gauge
        nodeGroup.rotation.y = -Math.PI / 4;
        const pileMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true });
        const pileMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.7, 8), pileMat);
        pileMesh.position.set(0, 0.35, 0);
        pileMesh.castShadow = true;
        nodeGroup.add(pileMesh);

        const sensorHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.28, 8), mastMat);
        sensorHorn.position.set(0, 0.85, 0.28);
        sensorHorn.rotation.x = Math.PI / 6;
        nodeGroup.add(sensorHorn);
      } else if (node.id === 'NODE-FLOOD-1') {
        // Flood Node 1: Upstream Mountain Runoff HC-SR04 Transducer & Canyon Rain Gauge
        nodeGroup.rotation.y = Math.PI / 6;
        const cliffMount = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.5), mastMat);
        cliffMount.position.set(0, 0.4, -0.2);
        nodeGroup.add(cliffMount);

        const runoffTransducer = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.32, 8), mastMat);
        runoffTransducer.position.set(0, 0.75, 0.3);
        runoffTransducer.rotation.x = Math.PI / 5;
        nodeGroup.add(runoffTransducer);

        const rainFunnel = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 8), mastMat);
        rainFunnel.position.set(-0.25, 2.1, 0);
        nodeGroup.add(rainFunnel);
      } else if (node.id === 'NODE-3') {
        // Landslide Node 1: Top Node Escarpment Geophone & Soil Saturation Stake
        const geophoneHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.38, 8), mastMat);
        geophoneHousing.position.set(0, 0.2, 0.22);
        nodeGroup.add(geophoneHousing);

        const soilProbe = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 6), mastMat);
        soilProbe.rotation.x = Math.PI;
        soilProbe.position.set(0, -0.15, 0.22);
        nodeGroup.add(soilProbe);
      } else if (node.id === 'NODE-LANDSLIDE-2') {
        // Landslide Node 2: Runout MPU-6050 Inclinometer Box & Geophone Stake
        const inclinometerBox = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.2), mastMat);
        inclinometerBox.position.set(0, 0.35, 0.22);
        nodeGroup.add(inclinometerBox);

        const runoutStake = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 6), mastMat);
        runoutStake.rotation.x = Math.PI;
        runoutStake.position.set(0, -0.1, 0.22);
        nodeGroup.add(runoutStake);
      } else if (node.id === 'NODE-2') {
        // Forest Fire Node 1: Smoke Snorkel, Optical IR Flame Window & BME688
        const smokeSnorkel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), mastMat);
        smokeSnorkel.position.set(0, 1.8, -0.2);
        smokeSnorkel.name = 'smokeSnorkel';
        nodeGroup.add(smokeSnorkel);

        const flameWindow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
        flameWindow.position.set(0, 1.25, 0.2);
        nodeGroup.add(flameWindow);

        const intakeAuraGeo = new THREE.RingGeometry(0.12, 0.35, 16);
        intakeAuraGeo.rotateX(-Math.PI / 2);
        const intakeAuraMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide
        });
        const intakeAura = new THREE.Mesh(intakeAuraGeo, intakeAuraMat);
        intakeAura.position.set(0, 1.95, -0.2);
        intakeAura.name = 'intakeAura';
        nodeGroup.add(intakeAura);
      } else {
        // Forest Fire Node 2 (NODE-FIRE-2): Deep Timber Canopy Optical Flame Sensor & MQ-135 Gas
        const canopyFlameDome = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfb923c }));
        canopyFlameDome.position.set(0, 1.3, 0.2);
        nodeGroup.add(canopyFlameDome);

        const gasSnorkel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 8), mastMat);
        gasSnorkel.position.set(0, 1.8, -0.18);
        gasSnorkel.name = 'smokeSnorkel';
        nodeGroup.add(gasSnorkel);
      }

      // LED Beacon
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), ledMat);
      led.position.set(0, 1.55, 0.20);
      led.name = 'statusLed';
      nodeGroup.add(led);

      // Selection Halo
      const haloGeo = new THREE.RingGeometry(0.85, 1.15, 24);
      haloGeo.rotateX(-Math.PI / 2);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.y = 0.05;
      halo.name = 'selectionHalo';
      halo.visible = false;
      nodeGroup.add(halo);

      // 3D FLOATING HOLOGRAPHIC BILLBOARD HUD LABEL
      // Visible at all times in 3D (Sprite with CanvasTexture), showing node name and minimal details
      const badgeInfo = getNodeBadgeInfo(node);
      const badgeCanvas = document.createElement('canvas');
      badgeCanvas.width = 512;
      badgeCanvas.height = 160;
      renderBadgeCanvas(badgeCanvas, badgeInfo.title, badgeInfo.subtitle, badgeInfo.tag, badgeInfo.color, node.state);

      const badgeTex = new THREE.CanvasTexture(badgeCanvas);
      badgeTex.minFilter = THREE.LinearFilter;
      const badgeMat = new THREE.SpriteMaterial({ map: badgeTex, transparent: true, depthTest: false });
      const badgeSprite = new THREE.Sprite(badgeMat);
      badgeSprite.scale.set(6.4, 2.0, 1);
      badgeSprite.position.set(0, 3.25, 0); // Positioned comfortably above the solar canopy
      badgeSprite.renderOrder = 999;
      nodeGroup.add(badgeSprite);

      nodeBadgesMapRef.current.set(node.id, {
        sprite: badgeSprite,
        canvas: badgeCanvas,
        ctx: badgeCanvas.getContext('2d')!,
        texture: badgeTex,
        title: badgeInfo.title,
        details: badgeInfo.subtitle,
        accentColor: badgeInfo.color,
        lastState: node.state
      });

      scene.add(nodeGroup);
      nodeMarkersRef.current.set(node.id, nodeGroup);
    });
  }

  // ==========================================
  // REALISTIC ALPINE MOUNTAIN RANGE & CASCADE WATER SYSTEM
  // Mountains extending from X: -35.2, Z: -72.0 to X: 53.3, Z: -70.4
  // Modeled after the reference photo with craggy cliffs, rock buttresses,
  // stepped waterfalls, and mountain torrents.
  // When rainfall or thunderstorm occurs, excess water cascades down
  // from these mountains directly into the river causing river flooding!
  // ==========================================
  function buildRealisticMountainWaterSystem(scene: THREE.Scene) {
    const mtnWaterGroup = new THREE.Group();
    mtnWaterGroup.name = 'mountainWaterAndTerrainSystem';

    // 1. DEDICATED REALISTIC 3D MOUNTAIN CRAGS & ROCK FORMATIONS
    // Placed along the specified line from X: -35.2, Z: -72.0 to X: 53.3, Z: -70.4
    const cragSlateMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.92,
      metalness: 0.08,
      flatShading: true
    });
    const cragGraniteMat = new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true
    });
    const snowCouloirMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.65,
      metalness: 0.12,
      flatShading: true
    });

    // Generate rugged 3D mountain buttresses along the range
    // Flanking summits frame the canyon on west and east, leaving the river corridor completely clear
    const buttressCoords = [
      { x: -35.2, z: -72.0, h: 26.0, r: 8.5 },
      { x: -28.0, z: -73.5, h: 32.0, r: 9.0 },
      { x: -21.0, z: -72.5, h: 38.0, r: 10.5 }, // Western pyramid peak
      { x: -12.0, z: -71.5, h: 33.0, r: 9.0 },
      { x: -3.0,  z: -73.0, h: 35.0, r: 8.5 },
      { x: 3.5,   z: -73.5, h: 36.0, r: 7.0 },  // West canyon rim peak (well west of river corridor)
      { x: 13.5,  z: -78.0, h: 44.0, r: 6.5 },  // Distant central horn deep behind headwaters
      { x: 24.5,  z: -73.5, h: 36.0, r: 7.0 },  // East canyon rim peak (well east of river corridor)
      { x: 33.0,  z: -71.0, h: 33.0, r: 9.0 },
      { x: 43.0,  z: -71.5, h: 36.0, r: 10.0 }, // Eastern bastion
      { x: 53.3,  z: -70.4, h: 24.0, r: 8.5 }   // Eastern anchor
    ];

    buttressCoords.forEach((b, idx) => {
      // Massive angular rock pyramid / spire
      const spireGeo = new THREE.ConeGeometry(b.r, b.h, 6, 4);
      spireGeo.rotateY((idx * 0.75) % Math.PI);
      const spireMesh = new THREE.Mesh(spireGeo, idx % 2 === 0 ? cragGraniteMat : cragSlateMat);
      spireMesh.position.set(b.x, b.h * 0.48, b.z);
      spireMesh.castShadow = true;
      spireMesh.receiveShadow = true;
      mtnWaterGroup.add(spireMesh);

      // Flanking stepped rock ledges (strictly outside river corridor)
      for (let s = 0; s < 3; s++) {
        const lx = b.x + (s === 0 ? -b.r * 0.55 : s === 1 ? b.r * 0.55 : 0);
        const lz = b.z + (s === 2 ? 3.5 : -2.5);
        if (lx >= 8.0 && lx <= 20.5 && lz >= -66.5 && lz <= -44.0) continue;
        const lh = b.h * (0.45 + s * 0.15);
        const ledgeGeo = new THREE.DodecahedronGeometry(b.r * 0.42, 1);
        ledgeGeo.scale(1.2, 1.8, 1.0);
        const ledgeMesh = new THREE.Mesh(ledgeGeo, cragSlateMat);
        ledgeMesh.position.set(lx, lh * 0.5, lz);
        ledgeMesh.castShadow = true;
        mtnWaterGroup.add(ledgeMesh);
      }
    });

    // 2. DEDICATED RIVER CHANNEL FLOWING FROM (X: 11, Z: -64.5 to X: 15.4, Z: -63.6) TO (X: 10.3, Z: -46.1 to X: 17.9, Z: -46.1)
    // Custom parametric Quad Mesh conforming precisely to the user-specified bank coordinates
    const segsU = 24; // width divisions (Left Bank to Right Bank)
    const segsV = 48; // length divisions (Upstream Z: -64.5 down to Downstream Z: -46.1)
    const vertCount = (segsU + 1) * (segsV + 1);

    const riverChannelGeo = new THREE.BufferGeometry();
    const rPositions = new Float32Array(vertCount * 3);
    const rColors = new Float32Array(vertCount * 3);
    const rUvs = new Float32Array(vertCount * 2);
    const rIndices: number[] = [];

    const baseRivX = new Float32Array(vertCount);
    const baseRivY = new Float32Array(vertCount);
    const baseRivZ = new Float32Array(vertCount);

    let vIdx = 0;
    for (let iv = 0; iv <= segsV; iv++) {
      const tv = iv / segsV; // 0 at upstream (-64.5 / -63.6), 1 at downstream (-46.1)
      const leftX = 11.0 + (10.3 - 11.0) * tv;
      const leftZ = -64.5 + (-46.1 - (-64.5)) * tv;
      const rightX = 15.4 + (17.9 - 15.4) * tv;
      const rightZ = -63.6 + (-46.1 - (-63.6)) * tv;

      // Water elevation smoothly cascading from 4.8m down to -0.65m at the valley river confluence
      const waterY = -0.65 + (4.8 - (-0.65)) * Math.pow(1.0 - tv, 1.30);

      for (let iu = 0; iu <= segsU; iu++) {
        const tu = iu / segsU; // 0 at left bank, 1 at right bank
        const px = leftX + (rightX - leftX) * tu;
        const pz = leftZ + (rightZ - leftZ) * tu;
        // Minor natural convex water surface profile (slightly higher in central deep flow)
        const py = waterY + Math.sin(tu * Math.PI) * 0.035;

        rPositions[vIdx * 3] = px;
        rPositions[vIdx * 3 + 1] = py;
        rPositions[vIdx * 3 + 2] = pz;

        baseRivX[vIdx] = px;
        baseRivY[vIdx] = py;
        baseRivZ[vIdx] = pz;

        rUvs[vIdx * 2] = tu;
        rUvs[vIdx * 2 + 1] = tv;

        // Color shading:
        // Deep translucent turquoise channel in center; brilliant white foam along banks & steeper upper steps
        const distFromBank = Math.min(tu, 1.0 - tu);
        let foam = 0.10;
        if (distFromBank < 0.20) {
          foam = 0.55 + (0.20 - distFromBank) * 2.0;
        }
        if (tv < 0.38) {
          // Upper rapid cascades have stronger churning foam
          foam = Math.max(foam, 0.40 + (0.38 - tv) * 0.7);
        }
        foam = Math.min(1.0, foam);

        rColors[vIdx * 3]     = THREE.MathUtils.lerp(0.04, 0.96, foam);
        rColors[vIdx * 3 + 1] = THREE.MathUtils.lerp(0.68, 0.99, foam);
        rColors[vIdx * 3 + 2] = THREE.MathUtils.lerp(0.85, 1.00, foam);

        vIdx++;
      }
    }

    for (let iv = 0; iv < segsV; iv++) {
      for (let iu = 0; iu < segsU; iu++) {
        const a = iv * (segsU + 1) + iu;
        const b = a + 1;
        const c = a + (segsU + 1);
        const d = c + 1;
        rIndices.push(a, c, b);
        rIndices.push(b, c, d);
      }
    }

    riverChannelGeo.setAttribute('position', new THREE.BufferAttribute(rPositions, 3));
    riverChannelGeo.setAttribute('color', new THREE.BufferAttribute(rColors, 3));
    riverChannelGeo.setAttribute('uv', new THREE.BufferAttribute(rUvs, 2));
    riverChannelGeo.setIndex(rIndices);
    riverChannelGeo.computeVertexNormals();

    const riverChannelMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.08,
      metalness: 0.16,
      transparent: true,
      opacity: 0.94,
      flatShading: false,
      side: THREE.DoubleSide
    });

    const riverChannelMesh = new THREE.Mesh(riverChannelGeo, riverChannelMat);
    riverChannelMesh.name = 'mountainRiverChannel';
    mtnWaterGroup.add(riverChannelMesh);

    // Matching underlying sandy riverbed shelf underneath the river water
    const bedPositions = new Float32Array(vertCount * 3);
    for (let i = 0; i < vertCount; i++) {
      const tu = rUvs[i * 2];
      const bedDepth = 0.85 * (1.0 - Math.pow(2.0 * tu - 1.0, 2));
      bedPositions[i * 3]     = baseRivX[i];
      bedPositions[i * 3 + 1] = baseRivY[i] - bedDepth;
      bedPositions[i * 3 + 2] = baseRivZ[i];
    }
    const riverBedGeo = new THREE.BufferGeometry();
    riverBedGeo.setAttribute('position', new THREE.BufferAttribute(bedPositions, 3));
    riverBedGeo.setIndex(rIndices);
    riverBedGeo.computeVertexNormals();
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0xb59972,
      roughness: 0.90,
      flatShading: true
    });
    const riverBedMesh = new THREE.Mesh(riverBedGeo, bedMat);
    riverBedMesh.receiveShadow = true;
    mtnWaterGroup.add(riverBedMesh);

    // 3. NATURAL RIVERBANK BOULDERS & SHORELINE STONES
    // Weathered alpine river stones lining the outer banks of the river
    const riverBoulderMat1 = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.88, flatShading: true });
    const riverBoulderMat2 = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, flatShading: true });
    const numBankBoulders = 28;
    for (let b = 0; b < numBankBoulders; b++) {
      const tb = b / (numBankBoulders - 1);
      const isLeft = b % 2 === 0;
      const bLeftX = 11.0 + (10.3 - 11.0) * tb;
      const bLeftZ = -64.5 + (-46.1 - (-64.5)) * tb;
      const bRightX = 15.4 + (17.9 - 15.4) * tb;
      const bRightZ = -63.6 + (-46.1 - (-63.6)) * tb;

      const offsetDist = 0.6 + ((b * 7) % 5) * 0.18;
      const bx = isLeft ? (bLeftX - offsetDist) : (bRightX + offsetDist);
      const bz = isLeft ? bLeftZ : bRightZ;
      const by = getMountainTerrainElevation(bx, bz);

      const bRadius = 0.35 + ((b * 13) % 7) * 0.08;
      const boulderGeo = new THREE.DodecahedronGeometry(bRadius, 0);
      const boulderMesh = new THREE.Mesh(boulderGeo, b % 2 === 0 ? riverBoulderMat1 : riverBoulderMat2);
      boulderMesh.position.set(bx, by + bRadius * 0.35, bz);
      boulderMesh.rotation.set((b * 1.3) % Math.PI, (b * 0.8) % Math.PI, (b * 0.5) % Math.PI);
      boulderMesh.castShadow = true;
      boulderMesh.receiveShadow = true;
      mtnWaterGroup.add(boulderMesh);
    }

    // Register this primary river into mountainStreamsRef for dynamic wave & downhill velocity updates
    mountainStreamsRef.current = [
      {
        mesh: riverChannelMesh,
        basePos: { x: baseRivX, y: baseRivY, z: baseRivZ },
        wColors: rColors,
        flowDirection: { x: 0.9, z: 18.4 },
        baseSpeed: 2.2,
        baseScale: { x: 1.0, y: 1.0, z: 1.0 }
      }
    ];

    // 4. STEPPED RAPIDS CASCADE PLANES & FOAM APRONS
    const rapidsSteps = [
      { tv: 0.20, width: 4.8, height: 1.2 },
      { tv: 0.48, width: 5.6, height: 1.1 },
      { tv: 0.78, width: 6.8, height: 0.9 }
    ];

    mountainWaterfallsRef.current = [];

    rapidsSteps.forEach((rp, rpIdx) => {
      const tv = rp.tv;
      const lx = 11.0 + (10.3 - 11.0) * tv;
      const lz = -64.5 + (-46.1 - (-64.5)) * tv;
      const rx = 15.4 + (17.9 - 15.4) * tv;
      const rz = -63.6 + (-46.1 - (-63.6)) * tv;
      const cx = (lx + rx) * 0.5;
      const cz = (lz + rz) * 0.5;
      const waterY = -0.65 + (4.8 - (-0.65)) * Math.pow(1.0 - tv, 1.30);

      const rpGeo = new THREE.PlaneGeometry(rp.width, rp.height, 8, 4);
      rpGeo.rotateX(-Math.PI * 0.35); // Sloped rapid apron
      const rpMat = new THREE.MeshStandardMaterial({
        color: 0xa5f3fc,
        emissive: 0x0891b2,
        emissiveIntensity: 0.40,
        roughness: 0.12,
        metalness: 0.18,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide
      });
      const rpMesh = new THREE.Mesh(rpGeo, rpMat);
      rpMesh.position.set(cx, waterY + 0.05, cz);
      rpMesh.name = `mountainRapidsStep_${rpIdx}`;
      mtnWaterGroup.add(rpMesh);
      mountainWaterfallsRef.current.push(rpMesh);
    });

    // 5. RAPIDS PLUNGE SPRAY & MOUNTAIN MIST PARTICLES
    const sprayCount = 160;
    const sprayGeo = new THREE.BufferGeometry();
    const sprayPos = new Float32Array(sprayCount * 3);
    for (let p = 0; p < sprayCount; p++) {
      const step = rapidsSteps[p % rapidsSteps.length];
      const tv = step.tv;
      const lx = 11.0 + (10.3 - 11.0) * tv;
      const lz = -64.5 + (-46.1 - (-64.5)) * tv;
      const rx = 15.4 + (17.9 - 15.4) * tv;
      const rz = -63.6 + (-46.1 - (-63.6)) * tv;
      const cx = (lx + rx) * 0.5;
      const cz = (lz + rz) * 0.5;
      const waterY = -0.65 + (4.8 - (-0.65)) * Math.pow(1.0 - tv, 1.30);

      sprayPos[p * 3]     = cx + (Math.random() - 0.5) * (step.width * 0.85);
      sprayPos[p * 3 + 1] = waterY + 0.15 + Math.random() * 0.85;
      sprayPos[p * 3 + 2] = cz + (Math.random() - 0.5) * 1.5;
    }
    sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
    const sprayMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 0.75,
      transparent: true,
      opacity: 0.60,
      blending: THREE.AdditiveBlending
    });
    const sprayPoints = new THREE.Points(sprayGeo, sprayMat);
    mtnWaterGroup.add(sprayPoints);
    mountainSprayParticlesRef.current = sprayPoints;

    scene.add(mtnWaterGroup);
    mountainWaterGroupRef.current = mtnWaterGroup;
  }

  // ==========================================
  // WATCH TOWER 01 — ESP32 SUPERIOR NODE & 120 dB VILLAGE ALARM SIREN ARRAY
  // Positioned exactly at X = 40 to 45 (width = 5) and Z = 0 to 5 (depth = 5)
  // Master Evidence Fusion Station that processes LoRa corroboration packets
  // and sounds a loud emergency siren / buzzer with 3D traveling soundwaves
  // ==========================================
  function buildWatchTowerMesh(scene: THREE.Scene) {
    const watchTowerGroup = new THREE.Group();
    watchTowerGroup.name = 'watchTowerComplex';
    watchTowerGroup.userData = { nodeId: 'NODE-SUPERIOR', isWatchTower: true };

    const centerX = 42.5;
    const centerZ = 2.5;
    const groundY = getMountainTerrainElevation(centerX, centerZ);
    const platformHeight = 13.5;
    const deckY = groundY + platformHeight;

    // Materials
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const steelLegMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.25 });
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.75, roughness: 0.35 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4 });
    const hazardStripeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const cabinWallMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const glassMat = new THREE.MeshStandardMaterial({ 
      color: 0x38bdf8, 
      metalness: 0.9, 
      roughness: 0.1, 
      transparent: true, 
      opacity: 0.55 
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85, roughness: 0.2 });
    const sirenRedMat = new THREE.MeshStandardMaterial({ 
      color: 0xdc2626, 
      emissive: 0x991b1b, 
      emissiveIntensity: 0.35, 
      roughness: 0.3 
    });
    const espBoxMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });

    // 1. Concrete Corner Footing Pedestals at (40.5, 0.5), (44.5, 0.5), (40.5, 4.5), (44.5, 4.5)
    const corners = [
      { x: 40.5, z: 0.5 },
      { x: 44.5, z: 0.5 },
      { x: 40.5, z: 4.5 },
      { x: 44.5, z: 4.5 }
    ];

    corners.forEach(c => {
      const cy = getMountainTerrainElevation(c.x, c.z);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 0.85), concreteMat);
      pad.position.set(c.x, cy + 0.3, c.z);
      pad.castShadow = true;
      pad.receiveShadow = true;
      watchTowerGroup.add(pad);
    });

    // Square Foundation Ground Border Wireframe (indicating X: 40 to 45, Z: 0 to 5)
    const perimeterLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(40.0, groundY + 0.05, 0.0),
      new THREE.Vector3(45.0, groundY + 0.05, 0.0),
      new THREE.Vector3(45.0, groundY + 0.05, 5.0),
      new THREE.Vector3(40.0, groundY + 0.05, 5.0),
      new THREE.Vector3(40.0, groundY + 0.05, 0.0)
    ]);
    const perimeterLine = new THREE.Line(
      perimeterLineGeo, 
      new THREE.LineBasicMaterial({ color: 0xf43f5e, linewidth: 2, transparent: true, opacity: 0.8 })
    );
    watchTowerGroup.add(perimeterLine);

    // 2. 4 Heavy Steel Truss Leg Pylons (rising from ground to deck at Y = deckY)
    const topCorners = [
      { x: centerX - 1.8, z: centerZ - 1.8 },
      { x: centerX + 1.8, z: centerZ - 1.8 },
      { x: centerX - 1.8, z: centerZ + 1.8 },
      { x: centerX + 1.8, z: centerZ + 1.8 }
    ];

    for (let i = 0; i < 4; i++) {
      const bottom = new THREE.Vector3(corners[i].x, groundY + 0.6, corners[i].z);
      const top = new THREE.Vector3(topCorners[i].x, deckY, topCorners[i].z);
      const legVec = new THREE.Vector3().subVectors(top, bottom);
      const legLen = legVec.length();

      const legGeo = new THREE.CylinderGeometry(0.09, 0.13, legLen, 8);
      const legMesh = new THREE.Mesh(legGeo, steelLegMat);
      
      const midPoint = new THREE.Vector3().addVectors(bottom, top).multiplyScalar(0.5);
      legMesh.position.copy(midPoint);
      legMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), legVec.clone().normalize());
      legMesh.castShadow = true;
      watchTowerGroup.add(legMesh);
    }

    // 3. Multi-tier Cross Bracing (3 Tiers at Y = 4.2m, 8.2m, 12.0m)
    const tierHeights = [groundY + 4.2, groundY + 8.2, groundY + 12.0];
    tierHeights.forEach(ty => {
      const alpha = (ty - (groundY + 0.6)) / (deckY - (groundY + 0.6));
      const tierCorners = corners.map((b, idx) => ({
        x: THREE.MathUtils.lerp(b.x, topCorners[idx].x, alpha),
        z: THREE.MathUtils.lerp(b.z, topCorners[idx].z, alpha)
      }));

      // Horizontal perimeter tie beams connecting the 4 legs
      const ringIndices = [[0, 1], [1, 3], [3, 2], [2, 0]];
      ringIndices.forEach(([a, b]) => {
        const pA = new THREE.Vector3(tierCorners[a].x, ty, tierCorners[a].z);
        const pB = new THREE.Vector3(tierCorners[b].x, ty, tierCorners[b].z);
        const beamVec = new THREE.Vector3().subVectors(pB, pA);
        const beamLen = beamVec.length();
        const beamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, beamLen, 6), trussMat);
        beamMesh.position.copy(pA).addScaledVector(beamVec, 0.5);
        beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamVec.normalize());
        watchTowerGroup.add(beamMesh);
      });
    });

    // 4. Central Service Ladder
    const ladderBottom = groundY + 0.6;
    const ladderHeight = deckY - ladderBottom;
    const ladderRail1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, ladderHeight, 6), steelLegMat);
    const ladderRail2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, ladderHeight, 6), steelLegMat);
    ladderRail1.position.set(centerX - 0.25, ladderBottom + ladderHeight * 0.5, centerZ - 1.2);
    ladderRail2.position.set(centerX + 0.25, ladderBottom + ladderHeight * 0.5, centerZ - 1.2);
    watchTowerGroup.add(ladderRail1);
    watchTowerGroup.add(ladderRail2);

    const rungsCount = Math.floor(ladderHeight / 0.45);
    for (let r = 0; r < rungsCount; r++) {
      const rungY = ladderBottom + r * 0.45 + 0.3;
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), steelLegMat);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(centerX, rungY, centerZ - 1.2);
      watchTowerGroup.add(rung);
    }

    // 5. High Observation Deck Platform (5.2m x 5.2m square deck at Y = deckY)
    const deckPlatform = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.24, 5.2), deckMat);
    deckPlatform.position.set(centerX, deckY, centerZ);
    deckPlatform.castShadow = true;
    deckPlatform.receiveShadow = true;
    watchTowerGroup.add(deckPlatform);

    // Hazard border trim
    const borderTrim = new THREE.Mesh(new THREE.BoxGeometry(5.26, 0.08, 5.26), hazardStripeMat);
    borderTrim.position.set(centerX, deckY + 0.08, centerZ);
    watchTowerGroup.add(borderTrim);

    // Perimeter Handrails (1.1m high around 5.2m square platform)
    const railHeight = 1.1;
    const railY = deckY + railHeight * 0.5;
    const handrailGeo = new THREE.CylinderGeometry(0.025, 0.025, 5.1, 8);

    // North rail
    const railN = new THREE.Mesh(handrailGeo, trussMat);
    railN.rotation.z = Math.PI / 2;
    railN.position.set(centerX, deckY + railHeight, centerZ - 2.5);
    watchTowerGroup.add(railN);

    // South rail (facing Village)
    const railS = new THREE.Mesh(handrailGeo, trussMat);
    railS.rotation.z = Math.PI / 2;
    railS.position.set(centerX, deckY + railHeight, centerZ + 2.5);
    watchTowerGroup.add(railS);

    // West rail
    const railW = new THREE.Mesh(handrailGeo, trussMat);
    railW.rotation.x = Math.PI / 2;
    railW.position.set(centerX - 2.5, deckY + railHeight, centerZ);
    watchTowerGroup.add(railW);

    // East rail
    const railE = new THREE.Mesh(handrailGeo, trussMat);
    railE.rotation.x = Math.PI / 2;
    railE.position.set(centerX + 2.5, deckY + railHeight, centerZ);
    watchTowerGroup.add(railE);

    // Corner safety posts
    [
      [-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]
    ].forEach(([dx, dz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, railHeight, 6), steelLegMat);
      post.position.set(centerX + dx, railY, centerZ + dz);
      watchTowerGroup.add(post);
    });

    // 6. Observation Cupola & Equipment Cabin (2.6m x 2.6m x 2.2m)
    const cabinY = deckY + 0.12 + 1.1;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.2, 2.7), cabinWallMat);
    cabin.position.set(centerX, cabinY, centerZ);
    cabin.castShadow = true;
    watchTowerGroup.add(cabin);

    // Wrap-around Observation Tinted Glass
    const glassBand = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.85, 2.74), glassMat);
    glassBand.position.set(centerX, cabinY + 0.35, centerZ);
    watchTowerGroup.add(glassBand);

    // Overhanging Roof Canopy (3.8m x 3.8m)
    const roofY = cabinY + 1.15;
    const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.16, 3.8), roofMat);
    roofMesh.position.set(centerX, roofY, centerZ);
    watchTowerGroup.add(roofMesh);

    // Dual Photovoltaic Solar Modules on roof
    const solar1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 1.0), solarMat);
    const solar2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 1.0), solarMat);
    solar1.position.set(centerX - 0.9, roofY + 0.14, centerZ);
    solar2.position.set(centerX + 0.9, roofY + 0.14, centerZ);
    solar1.rotation.x = Math.PI / 8;
    solar2.rotation.x = Math.PI / 8;
    watchTowerGroup.add(solar1);
    watchTowerGroup.add(solar2);

    // 7. ESP32 SUPERIOR NODE ENCLOSURE
    // Mounted on exterior deck platform facing south towards the village
    const espEnclosure = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.45), espBoxMat);
    espEnclosure.position.set(centerX, deckY + 0.65, centerZ + 2.1);
    espEnclosure.castShadow = true;
    watchTowerGroup.add(espEnclosure);

    // Inspection Window with visible ESP32-S3 PCB and glowing LED
    const espWindowMat = new THREE.MeshBasicMaterial({ color: 0x064e3b });
    const espWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.55), espWindowMat);
    espWindow.position.set(centerX, deckY + 0.65, centerZ + 2.33);
    watchTowerGroup.add(espWindow);

    // ESP32 Heartbeat CPU Status LED
    const cpuLedMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const cpuLed = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), cpuLedMat);
    cpuLed.position.set(centerX - 0.18, deckY + 0.75, centerZ + 2.35);
    watchTowerGroup.add(cpuLed);
    watchtowerCpuLedRef.current = cpuLed;

    // LoRa RX/TX RF Activity LED
    const loraLedMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const loraLed = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), loraLedMat);
    loraLed.position.set(centerX + 0.18, deckY + 0.75, centerZ + 2.35);
    watchTowerGroup.add(loraLed);

    // Air Quality Sensor on Superior Node (SPS30 Optical Particle Counter & Multi-Gas AQI Sensor)
    const aqiBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.45, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.4 })
    );
    aqiBox.position.set(centerX + 0.65, deckY + 0.65, centerZ + 2.1);
    watchTowerGroup.add(aqiBox);

    const aqiSnorkel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 8), steelLegMat);
    aqiSnorkel.position.set(centerX + 0.65, deckY + 0.95, centerZ + 2.1);
    watchTowerGroup.add(aqiSnorkel);

    const aqiLed = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    aqiLed.position.set(centerX + 0.65, deckY + 0.65, centerZ + 2.26);
    watchTowerGroup.add(aqiLed);
    watchtowerAqiLedRef.current = aqiLed;

    // Master High-Gain Omnidirectional LoRa Base Station Fiberglass Dipole Antenna
    const loraMastMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const loraMast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 3.4, 8), loraMastMat);
    loraMast.position.set(centerX, roofY + 1.7, centerZ);
    loraMast.castShadow = true;
    watchTowerGroup.add(loraMast);

    // Ground plane radials for LoRa antenna
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 2;
      const radial = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.75, 6), loraMastMat);
      radial.rotation.x = Math.PI / 2;
      radial.rotation.z = angle;
      radial.position.set(
        centerX + Math.cos(angle) * 0.38, 
        roofY + 0.15, 
        centerZ + Math.sin(angle) * 0.38
      );
      watchTowerGroup.add(radial);
    }

    // Directional Yagi Telemetry Antenna
    const yagiBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6), steelLegMat);
    yagiBoom.rotation.z = Math.PI / 2;
    yagiBoom.position.set(centerX - 1.2, roofY + 0.6, centerZ);
    watchTowerGroup.add(yagiBoom);

    // 8. QUAD-HORN LOUD RED EMERGENCY ALARM SIREN & BUZZER
    // 4 Directional Megaphone Siren Horns pointing North, South, East, West
    const sirenCenterY = roofY + 0.65;
    const hornDirections = [
      { angle: 0, label: 'SOUTH_VILLAGE' },
      { angle: Math.PI / 2, label: 'EAST_FOREST' },
      { angle: Math.PI, label: 'NORTH_SLOPE' },
      { angle: -Math.PI / 2, label: 'WEST_RIVER' }
    ];

    hornDirections.forEach(({ angle }) => {
      const hornGroup = new THREE.Group();
      hornGroup.position.set(
        centerX + Math.sin(angle) * 0.85, 
        sirenCenterY, 
        centerZ + Math.cos(angle) * 0.85
      );
      hornGroup.rotation.y = angle;

      // Horn flare cone
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 12, 1, true), sirenRedMat);
      cone.rotation.x = Math.PI / 2;
      hornGroup.add(cone);

      // Horn driver cylinder
      const driver = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.28, 8), sirenRedMat);
      driver.rotation.x = Math.PI / 2;
      driver.position.z = -0.32;
      hornGroup.add(driver);

      // Dark acoustic mouth orifice
      const mouthMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
      const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.23, 12), mouthMat);
      mouth.position.z = 0.28;
      hornGroup.add(mouth);

      watchTowerGroup.add(hornGroup);
    });

    // Central Siren Housing Block
    const sirenCenterBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.5, 12), sirenRedMat);
    sirenCenterBlock.position.set(centerX, sirenCenterY, centerZ);
    watchTowerGroup.add(sirenCenterBlock);

    // 9. HIGH-INTENSITY RED EMERGENCY STROBE BEACON LIGHT
    const beaconDomeGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.35, 12);
    const beaconDomeMat = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      transparent: true, 
      opacity: 0.85 
    });
    const beaconDome = new THREE.Mesh(beaconDomeGeo, beaconDomeMat);
    beaconDome.position.set(centerX, sirenCenterY + 0.55, centerZ);
    watchTowerGroup.add(beaconDome);
    watchtowerBeaconMeshRef.current = beaconDome;

    // Dynamic Siren PointLight
    const beaconLight = new THREE.PointLight(0xff0000, 0.35, 60);
    beaconLight.position.set(centerX, sirenCenterY + 0.6, centerZ);
    watchTowerGroup.add(beaconLight);
    watchtowerBeaconLightRef.current = beaconLight;

    // 10. 3D TRAVELING SOUNDWAVE SHOCKWAVE SYSTEM (WAVE FORMAT)
    // Multiple concentric wave rings expanding across the landscape
    const soundwavesGroup = new THREE.Group();
    soundwavesGroup.name = 'watchtowerSoundwaveTravelingWave';
    soundwavesGroup.position.set(centerX, deckY + 0.8, centerZ);
    soundwavesGroup.visible = false;

    const ringCount = 8;
    for (let r = 0; r < ringCount; r++) {
      const ringGeo = new THREE.RingGeometry(0.96, 1.04, 64);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide
      });
      const waveMesh = new THREE.Mesh(ringGeo, ringMat);
      soundwavesGroup.add(waveMesh);
    }
    watchTowerGroup.add(soundwavesGroup);
    watchtowerSoundwavesRef.current = soundwavesGroup;

    // 11. 3D FLOATING HOLOGRAPHIC BILLBOARD HUD LABEL
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 512;
    badgeCanvas.height = 160;
    const bCtx = badgeCanvas.getContext('2d');
    if (bCtx) {
      // Dark HUD container
      bCtx.fillStyle = 'rgba(2, 6, 23, 0.88)';
      bCtx.roundRect(8, 8, 496, 144, 20);
      bCtx.fill();
      bCtx.lineWidth = 4;
      bCtx.strokeStyle = '#ef4444';
      bCtx.stroke();

      // Top title
      bCtx.font = 'bold 26px sans-serif';
      bCtx.fillStyle = '#ffffff';
      bCtx.fillText('WATCH TOWER 01 [ESP32 SUPERIOR]', 24, 46);

      // Specs
      bCtx.font = '20px monospace';
      bCtx.fillStyle = '#38bdf8';
      bCtx.fillText('FUSION HUB · 120 dB VILLAGE SIREN', 24, 82);

      // Status pill
      bCtx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      bCtx.roundRect(24, 100, 260, 36, 10);
      bCtx.fill();
      bCtx.font = 'bold 18px monospace';
      bCtx.fillStyle = '#f87171';
      bCtx.fillText('SIREN & BUZZER ARMED', 36, 125);
    }

    const badgeTex = new THREE.CanvasTexture(badgeCanvas);
    const badgeMat = new THREE.SpriteMaterial({ map: badgeTex, transparent: true });
    const badgeSprite = new THREE.Sprite(badgeMat);
    badgeSprite.scale.set(7.5, 2.35, 1);
    badgeSprite.position.set(centerX, roofY + 4.2, centerZ);
    watchTowerGroup.add(badgeSprite);
    watchtowerBadgeMeshRef.current = badgeSprite;

    // ==========================================
    // NODE-4: Atmospheric Monitoring Hardware mounted on Watch Tower roof
    // Moved from the removed 20m standalone lattice mast
    // ==========================================
    {
      const chromeMat4 = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.1 });
      const darkMat4   = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4 });
      const hazardMat4 = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });

      // IP67 enclosure on the south edge of the roof
      const ip67Mat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
      const stationBox = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.95, 0.48), ip67Mat);
      stationBox.position.set(centerX - 1.1, roofY + 0.58, centerZ - 1.8);
      stationBox.castShadow = true;
      watchTowerGroup.add(stationBox);

      // Sunshield cover
      const sunShield = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.56), darkMat4);
      sunShield.position.set(centerX - 1.1, roofY + 1.08, centerZ - 1.8);
      watchTowerGroup.add(sunShield);

      // SPS30 sampling snorkel mast
      const sampleMast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), chromeMat4);
      sampleMast.position.set(centerX - 0.4, roofY + 0.85, centerZ - 1.8);
      watchTowerGroup.add(sampleMast);

      // Inverted cone intake horn
      const intakeCone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.32, 10), chromeMat4);
      intakeCone.rotation.x = Math.PI;
      intakeCone.position.set(centerX - 0.4, roofY + 1.65, centerZ - 1.8);
      watchTowerGroup.add(intakeCone);

      // Intake nozzle
      const intakeNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 8), darkMat4);
      intakeNozzle.position.set(centerX - 0.4, roofY + 1.52, centerZ - 1.8);
      intakeNozzle.name = 'smokeSnorkel';
      watchTowerGroup.add(intakeNozzle);

      // Dynamic suction aura (animated during air pollution events)
      const intakeAuraGeo = new THREE.RingGeometry(0.18, 0.52, 20);
      intakeAuraGeo.rotateX(-Math.PI / 2);
      const intakeAuraMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0, side: THREE.DoubleSide });
      const intakeAura = new THREE.Mesh(intakeAuraGeo, intakeAuraMat);
      intakeAura.position.set(centerX - 0.4, roofY + 1.50, centerZ - 1.8);
      intakeAura.name = 'intakeAura';
      watchTowerGroup.add(intakeAura);

      // MQ-135 gas chamber
      const gasChamber = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 10), darkMat4);
      gasChamber.position.set(centerX - 1.8, roofY + 0.56, centerZ - 1.8);
      watchTowerGroup.add(gasChamber);
      const gasGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.22, 10), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 }));
      gasGuard.position.set(centerX - 1.8, roofY + 0.80, centerZ - 1.8);
      watchTowerGroup.add(gasGuard);

      // Wind anemometer boom
      const boomBar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.2, 6), darkMat4);
      boomBar.rotation.z = Math.PI / 2;
      boomBar.position.set(centerX - 1.5, roofY + 1.35, centerZ - 1.8);
      watchTowerGroup.add(boomBar);

      // 3-cup anemometer
      const anemometerGroup4 = new THREE.Group();
      anemometerGroup4.position.set(centerX - 2.0, roofY + 1.55, centerZ - 1.8);
      anemometerGroup4.name = 'towerAnemometer';
      const cupHub4 = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.09, 8), darkMat4);
      anemometerGroup4.add(cupHub4);
      for (let a = 0; a < 3; a++) {
        const ang = (a * 2 * Math.PI) / 3;
        const arm4 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.013, 0.013), chromeMat4);
        arm4.position.set(Math.cos(ang) * 0.11, 0, Math.sin(ang) * 0.11);
        arm4.rotation.y = -ang;
        anemometerGroup4.add(arm4);
        const cup4 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8, 0, Math.PI), darkMat4);
        cup4.position.set(Math.cos(ang) * 0.22, 0, Math.sin(ang) * 0.22);
        cup4.rotation.y = -ang + Math.PI / 2;
        anemometerGroup4.add(cup4);
      }
      watchTowerGroup.add(anemometerGroup4);

      // Wind vane
      const vane4 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.01), hazardMat4);
      vane4.position.set(centerX - 2.15, roofY + 1.2, centerZ - 1.8);
      watchTowerGroup.add(vane4);

      // LoRa antenna
      const loraAnt4 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1.8, 8), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2 }));
      loraAnt4.position.set(centerX - 0.9, roofY + 1.1, centerZ - 1.8);
      watchTowerGroup.add(loraAnt4);
      const antTip4 = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.12, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      antTip4.position.set(centerX - 0.9, roofY + 2.08, centerZ - 1.8);
      watchTowerGroup.add(antTip4);

      // Status LED
      const led4 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
      led4.position.set(centerX - 1.1, roofY + 0.62, centerZ - 1.55);
      led4.name = 'statusLed';
      watchTowerGroup.add(led4);
    }

    // Selection Halo for Node-Superior
    const haloGeo = new THREE.RingGeometry(3.2, 3.8, 36);
    haloGeo.rotateX(-Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.set(centerX, groundY + 0.1, centerZ);
    halo.name = 'selectionHalo';
    halo.visible = false;
    watchTowerGroup.add(halo);

    scene.add(watchTowerGroup);
    watchtowerGroupRef.current = watchTowerGroup;
    nodeMarkersRef.current.set('NODE-SUPERIOR', watchTowerGroup);
  }

  // ==========================================
  // RISK-ADAPTIVE DEPLOYMENT LAYERS
  // ==========================================
  function buildRiskHeatmapLayers(scene: THREE.Scene) {
    const group = new THREE.Group();
    group.name = 'riskHeatmapLayers';
    group.visible = false;

    RISK_ZONES.forEach(z => {
      const zoneGroup = new THREE.Group();
      zoneGroup.position.set(z.center[0], 0.12, z.center[2]);

      // Glowing outer hazard perimeter ring
      const ringGeo = new THREE.RingGeometry(z.radius - 0.4, z.radius, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(z.colorHex),
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      zoneGroup.add(ring);

      // Translucent inner danger zone surface
      const discGeo = new THREE.CircleGeometry(z.radius - 0.4, 48);
      discGeo.rotateX(-Math.PI / 2);
      const discMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(z.colorHex),
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.position.y = -0.02;
      zoneGroup.add(disc);

      group.add(zoneGroup);
    });

    scene.add(group);
    riskHeatmapGroupRef.current = group;
  }

  // Helper to generate crisp billboard text sprites for coordinate surveying
  function createCoordinateLabelSprite(text: string, color: string = '#38bdf8', bgColor: string = 'rgba(15, 23, 42, 0.88)') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = bgColor;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(4, 4, 248, 56, 10);
    } else {
      ctx.rect(4, 4, 248, 56);
    }
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3.6, 0.9, 1);
    return sprite;
  }

  function createAxisLabelSprite(text: string, color: string = '#f43f5e') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(4, 4, 248, 56, 12);
    } else {
      ctx.rect(4, 4, 248, 56);
    }
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(4.4, 1.1, 1);
    return sprite;
  }

  // Temporary Full-Area Scale & Coordinate Reference Graph
  function buildCoordinateGraphLayer(scene: THREE.Scene) {
    const group = new THREE.Group();
    group.name = 'coordinateGraphGroup';
    group.visible = simulationEngine.isCoordinateGridActive;

    const bound = 70;
    const step = 2; // interpolation step along line to hug mountain slopes

    // 1. Minor Lines (every 5 units, excluding multiples of 10)
    const minorPositions: number[] = [];
    for (let x = -bound; x <= bound; x += 5) {
      if (x % 10 === 0) continue;
      for (let z = -bound; z < bound; z += step) {
        const nextZ = Math.min(bound, z + step);
        const y1 = getMountainTerrainElevation(x, z) + 0.08;
        const y2 = getMountainTerrainElevation(x, nextZ) + 0.08;
        minorPositions.push(x, y1, z, x, y2, nextZ);
      }
    }
    for (let z = -bound; z <= bound; z += 5) {
      if (z % 10 === 0) continue;
      for (let x = -bound; x < bound; x += step) {
        const nextX = Math.min(bound, x + step);
        const y1 = getMountainTerrainElevation(x, z) + 0.08;
        const y2 = getMountainTerrainElevation(nextX, z) + 0.08;
        minorPositions.push(x, y1, z, nextX, y2, z);
      }
    }

    const minorGeo = new THREE.BufferGeometry();
    minorGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(minorPositions), 3));
    const minorMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.28,
      depthWrite: false
    });
    group.add(new THREE.LineSegments(minorGeo, minorMat));

    // 2. Major Lines (every 10 units, excluding 0)
    const majorPositions: number[] = [];
    for (let x = -bound; x <= bound; x += 10) {
      if (x === 0) continue; // Axis line handled separately
      for (let z = -bound; z < bound; z += step) {
        const nextZ = Math.min(bound, z + step);
        const y1 = getMountainTerrainElevation(x, z) + 0.11;
        const y2 = getMountainTerrainElevation(x, nextZ) + 0.11;
        majorPositions.push(x, y1, z, x, y2, nextZ);
      }
    }
    for (let z = -bound; z <= bound; z += 10) {
      if (z === 0) continue; // Axis line handled separately
      for (let x = -bound; x < bound; x += step) {
        const nextX = Math.min(bound, x + step);
        const y1 = getMountainTerrainElevation(x, z) + 0.11;
        const y2 = getMountainTerrainElevation(nextX, z) + 0.11;
        majorPositions.push(x, y1, z, nextX, y2, z);
      }
    }

    const majorGeo = new THREE.BufferGeometry();
    majorGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(majorPositions), 3));
    const majorMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.58,
      depthWrite: false
    });
    group.add(new THREE.LineSegments(majorGeo, majorMat));

    // 3. Primary X Axis (Z = 0)
    const xAxisPositions: number[] = [];
    for (let x = -bound - 2; x < bound + 2; x += 1) {
      const nextX = x + 1;
      const y1 = getMountainTerrainElevation(x, 0) + 0.16;
      const y2 = getMountainTerrainElevation(nextX, 0) + 0.16;
      xAxisPositions.push(x, y1, 0, nextX, y2, 0);
    }
    const xAxisGeo = new THREE.BufferGeometry();
    xAxisGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(xAxisPositions), 3));
    const xAxisMat = new THREE.LineBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });
    group.add(new THREE.LineSegments(xAxisGeo, xAxisMat));

    // X Axis end labels
    const eastSprite = createAxisLabelSprite('+X [East]', '#f43f5e');
    if (eastSprite) {
      eastSprite.position.set(bound + 3, getMountainTerrainElevation(bound + 3, 0) + 1.2, 0);
      group.add(eastSprite);
    }
    const westSprite = createAxisLabelSprite('-X [West]', '#f43f5e');
    if (westSprite) {
      westSprite.position.set(-bound - 3, getMountainTerrainElevation(-bound - 3, 0) + 1.2, 0);
      group.add(westSprite);
    }

    // 4. Primary Z Axis (X = 0)
    const zAxisPositions: number[] = [];
    for (let z = -bound - 2; z < bound + 2; z += 1) {
      const nextZ = z + 1;
      const y1 = getMountainTerrainElevation(0, z) + 0.16;
      const y2 = getMountainTerrainElevation(0, nextZ) + 0.16;
      zAxisPositions.push(0, y1, z, 0, y2, nextZ);
    }
    const zAxisGeo = new THREE.BufferGeometry();
    zAxisGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(zAxisPositions), 3));
    const zAxisMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });
    group.add(new THREE.LineSegments(zAxisGeo, zAxisMat));

    // Z Axis end labels
    const southSprite = createAxisLabelSprite('+Z [South]', '#38bdf8');
    if (southSprite) {
      southSprite.position.set(0, getMountainTerrainElevation(0, bound + 3) + 1.2, bound + 3);
      group.add(southSprite);
    }
    const northSprite = createAxisLabelSprite('-Z [North]', '#38bdf8');
    if (northSprite) {
      northSprite.position.set(0, getMountainTerrainElevation(0, -bound - 3) + 1.2, -bound - 3);
      group.add(northSprite);
    }

    // 5. Origin Marker (0, 0, 0)
    const originY = getMountainTerrainElevation(0, 0);
    const originInnerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    originInnerRing.position.set(0, originY + 0.15, 0);
    group.add(originInnerRing);

    const originOuterRing = new THREE.Mesh(
      new THREE.RingGeometry(2.4, 2.65, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    originOuterRing.position.set(0, originY + 0.15, 0);
    group.add(originOuterRing);

    // Glowing origin beacon
    const originBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 8.0, 8),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.65 })
    );
    originBeacon.position.set(0, originY + 4.0, 0);
    group.add(originBeacon);

    const originSprite = createCoordinateLabelSprite('📍 ORIGIN (0, 0)', '#facc15', 'rgba(113, 63, 18, 0.92)');
    if (originSprite) {
      originSprite.position.set(0, originY + 2.2, 0);
      group.add(originSprite);
    }

    // 6. Number Ticks along X and Z Axes every 10 units
    for (let x = -60; x <= 60; x += 10) {
      if (x === 0) continue;
      const y = getMountainTerrainElevation(x, 0);
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(0.35, 12).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide })
      );
      dot.position.set(x, y + 0.18, 0);
      group.add(dot);

      const label = createCoordinateLabelSprite(`X: ${x > 0 ? '+' : ''}${x}`, '#f43f5e', 'rgba(15, 23, 42, 0.9)');
      if (label) {
        label.position.set(x, y + 1.1, 0);
        group.add(label);
      }
    }

    for (let z = -60; z <= 60; z += 10) {
      if (z === 0) continue;
      const y = getMountainTerrainElevation(0, z);
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(0.35, 12).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
      );
      dot.position.set(0, y + 0.18, z);
      group.add(dot);

      const label = createCoordinateLabelSprite(`Z: ${z > 0 ? '+' : ''}${z}`, '#38bdf8', 'rgba(15, 23, 42, 0.9)');
      if (label) {
        label.position.set(0, y + 1.1, z);
        group.add(label);
      }
    }

    // 7. Grid Intersection Survey Badges across the terrain every 20 units
    for (let x = -60; x <= 60; x += 20) {
      for (let z = -60; z <= 60; z += 20) {
        if (x === 0 || z === 0) continue; // Covered by axis ticks
        const y = getMountainTerrainElevation(x, z);
        const peg = new THREE.Mesh(
          new THREE.CircleGeometry(0.32, 12).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide })
        );
        peg.position.set(x, y + 0.12, z);
        group.add(peg);

        const badge = createCoordinateLabelSprite(`[${x}, ${z}]`, '#00f0ff', 'rgba(15, 23, 42, 0.88)');
        if (badge) {
          badge.position.set(x, y + 1.35, z);
          group.add(badge);
        }
      }
    }

    scene.add(group);
    coordinateGraphGroupRef.current = group;
  }

  // Real-time 3D cursor reticle for live mouse hover on terrain
  function buildHoverReticleMesh(scene: THREE.Scene) {
    const group = new THREE.Group();
    group.name = 'hoverReticle';
    group.visible = false;

    // Glowing target ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.9, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    group.add(ring);

    // Center dot
    const centerDot = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 12).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide })
    );
    group.add(centerDot);

    // 4 crosshair tick segments
    const tickPositions = [
      -1.4, 0, 0,  -0.9, 0, 0,
       0.9, 0, 0,   1.4, 0, 0,
       0, 0, -1.4,  0, 0, -0.9,
       0, 0,  0.9,  0, 0,  1.4
    ];
    const tickGeo = new THREE.BufferGeometry();
    tickGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tickPositions), 3));
    const tickMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.95 });
    group.add(new THREE.LineSegments(tickGeo, tickMat));

    // Vertical plumb line
    const plumbPositions = [0, 0, 0, 0, 2.0, 0];
    const plumbGeo = new THREE.BufferGeometry();
    plumbGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(plumbPositions), 3));
    const plumbMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.75 });
    group.add(new THREE.LineSegments(plumbGeo, plumbMat));

    scene.add(group);
    hoverReticleRef.current = group;
  }

  // Placement pins group for user-clicked placement coordinates
  function buildCoordinatePinsGroup(scene: THREE.Scene) {
    const group = new THREE.Group();
    group.name = 'coordinatePinsGroup';
    group.visible = true;
    scene.add(group);
    coordinatePinsGroupRef.current = group;
  }

  // Visual Comparison: Traditional Uniform Dense Grid (64 dots everywhere)
  function buildTraditionalDenseGridMesh(scene: THREE.Scene) {
    const group = new THREE.Group();
    group.name = 'traditionalDenseGrid';
    group.visible = false;

    const dotGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6);
    const dotMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.8,
      metalness: 0.3
    });

    // 8 x 8 dense grid
    for (let gx = -28; gx <= 28; gx += 8) {
      for (let gz = -28; gz <= 28; gz += 8) {
        const pole = new THREE.Mesh(dotGeo, dotMat);
        pole.position.set(gx, 0.4, gz);
        group.add(pole);

        // Wasteful grid footprint ring
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.6, 0.75, 12).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
        );
        ring.position.set(gx, 0.06, gz);
        group.add(ring);
      }
    }

    scene.add(group);
    denseGridGroupRef.current = group;
  }

  // Virtual Scale Nodes Mesh (Rendered when Virtual Scale > 2)
  function buildVirtualScaleNodesMesh(scene: THREE.Scene) {
    const group = new THREE.Group();
    group.name = 'virtualScaleNodes';
    group.visible = false;

    const vBoxMat = new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.4 });
    const vPoleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });

    PLACEMENT_CANDIDATES.filter(c => !c.isPhysicalPrototype).forEach((c, idx) => {
      const vNodeGroup = new THREE.Group();
      vNodeGroup.position.set(c.position[0], c.position[1], c.position[2]);
      vNodeGroup.name = `vNode_${idx}`;
      vNodeGroup.userData = { nodeId: `V-NODE-${(idx + 3).toString().padStart(2, '0')}` };

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.8, 6), vPoleMat);
      pole.position.y = 0.9;
      vNodeGroup.add(pole);

      const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.28), vBoxMat);
      box.position.y = 1.35;
      vNodeGroup.add(box);

      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6), vPoleMat);
      ant.position.set(0.15, 1.85, -0.05);
      vNodeGroup.add(ant);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.8, 1.05, 16).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
      );
      ring.position.y = 0.06;
      vNodeGroup.add(ring);

      group.add(vNodeGroup);
    });

    scene.add(group);
    virtualNodesGroupRef.current = group;
  }

  // Draw LoRa links: Peer-to-peer and direct uplinks
  function buildLoRaRFConnections(_scene: THREE.Scene) {
    // Removed dashed line rendering that generated floating dot artifacts in the air.
    // In-flight LoRa packets dynamically animate message transmissions between active nodes.
  }

  function buildVolumetricForestFire(scene: THREE.Scene) {
    const fireGroup = new THREE.Group();
    fireGroup.name = 'volumetricForestFire';
    fireGroup.visible = false;

    // 1. Shared Flame Geometries and Materials (Scalable for Tree Trunks, Branches, and Crowns)
    const flameGeoTrunk = new THREE.ConeGeometry(0.55, 1.8, 5, 2);
    const flameGeoBranch = new THREE.ConeGeometry(0.75, 2.2, 5, 2);
    const flameGeoCrown = new THREE.ConeGeometry(0.65, 2.8, 5, 2);
    const flameGeoCore = new THREE.ConeGeometry(0.35, 1.4, 4, 1);

    const flameMatCore = new THREE.MeshBasicMaterial({
      color: 0xff3700,
      transparent: true,
      opacity: 0.90,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const flameMatOuter = new THREE.MeshBasicMaterial({
      color: 0xff9900,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const flameMatYellow = new THREE.MeshBasicMaterial({
      color: 0xffe000,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const ashMat = new THREE.MeshStandardMaterial({
      color: 0x14110f,
      roughness: 0.95,
      metalness: 0.05
    });

    flameMeshesRef.current = [];

    // 2. Build Tree-Anchored Fires: Flames emanate directly from trunks, branches, and crowns of each burning tree
    BURNING_TREES.forEach((bt, tIdx) => {
      const groundY = getMountainTerrainElevation(bt.x, bt.z);
      const s = bt.scale;

      // Small charred ash circle immediately under this specific tree's base
      const ashGeo = new THREE.CircleGeometry(1.2 * s, 10);
      ashGeo.rotateX(-Math.PI / 2);
      const ashMesh = new THREE.Mesh(ashGeo, ashMat);
      ashMesh.position.set(bt.x, groundY + 0.03, bt.z);
      fireGroup.add(ashMesh);

      // A. Trunk Flame — Licking up the lower trunk
      const trunkFlame = new THREE.Mesh(flameGeoTrunk, flameMatCore);
      const trunkBaseY = groundY + 0.85 * s;
      trunkFlame.position.set(bt.x, trunkBaseY, bt.z);
      trunkFlame.scale.set(s * 0.9, s * 0.95, s * 0.9);
      fireGroup.add(trunkFlame);

      const trunkCore = new THREE.Mesh(flameGeoCore, flameMatYellow);
      trunkCore.position.set(0, 0.2, 0);
      trunkCore.scale.set(0.6, 0.75, 0.6);
      trunkFlame.add(trunkCore);

      flameMeshesRef.current.push({
        mesh: trunkFlame,
        baseY: trunkBaseY,
        baseScaleY: s * 0.95,
        speed: 12 + (tIdx % 4) * 2.2,
        phase: tIdx * 0.9
      });

      // B. Mid-Canopy Branch Fire — Bursting through foliage boughs
      const branchFlame1 = new THREE.Mesh(flameGeoBranch, flameMatOuter);
      const b1BaseY = groundY + (bt.isBirch ? 1.8 : 2.0) * s;
      branchFlame1.position.set(bt.x + 0.22 * s, b1BaseY, bt.z - 0.18 * s);
      branchFlame1.scale.set(s * 0.85, s * 0.9, s * 0.85);
      fireGroup.add(branchFlame1);

      flameMeshesRef.current.push({
        mesh: branchFlame1,
        baseY: b1BaseY,
        baseScaleY: s * 0.9,
        speed: 13 + (tIdx % 5) * 1.8,
        phase: tIdx * 1.1 + 0.4
      });

      const branchFlame2 = new THREE.Mesh(flameGeoBranch, flameMatCore);
      const b2BaseY = groundY + (bt.isBirch ? 2.2 : 2.6) * s;
      branchFlame2.position.set(bt.x - 0.20 * s, b2BaseY, bt.z + 0.18 * s);
      branchFlame2.scale.set(s * 0.78, s * 0.85, s * 0.78);
      fireGroup.add(branchFlame2);

      flameMeshesRef.current.push({
        mesh: branchFlame2,
        baseY: b2BaseY,
        baseScaleY: s * 0.85,
        speed: 14 + (tIdx % 3) * 2.5,
        phase: tIdx * 0.8 + 1.2
      });

      // C. Crown Torch Flame — Leaping high from the tree top apex
      const crownFlame = new THREE.Mesh(flameGeoCrown, flameMatOuter);
      const crownBaseY = groundY + (bt.isBirch ? 2.9 : 3.5) * s;
      crownFlame.position.set(bt.x, crownBaseY, bt.z);
      crownFlame.scale.set(s * 0.75, s * 1.05, s * 0.75);
      fireGroup.add(crownFlame);

      const crownCore = new THREE.Mesh(flameGeoCore, flameMatYellow);
      crownCore.position.set(0, 0.3, 0);
      crownCore.scale.set(0.65, 0.8, 0.65);
      crownFlame.add(crownCore);

      flameMeshesRef.current.push({
        mesh: crownFlame,
        baseY: crownBaseY,
        baseScaleY: s * 1.05,
        speed: 15 + (tIdx % 4) * 2.0,
        phase: tIdx * 1.3 + 0.7
      });
    });

    scene.add(fireGroup);
    forestFireGroupRef.current = fireGroup;
  }

  function buildDisasterParticles(scene: THREE.Scene) {
    // Canvas textures for soft glowing fire and volumetric smoke
    const fireCanvas = document.createElement('canvas');
    fireCanvas.width = 64;
    fireCanvas.height = 64;
    const fCtx = fireCanvas.getContext('2d');
    if (fCtx) {
      const grad = fCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.2, 'rgba(255, 230, 60, 0.95)');
      grad.addColorStop(0.5, 'rgba(255, 100, 10, 0.85)');
      grad.addColorStop(0.8, 'rgba(220, 30, 0, 0.45)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      fCtx.fillStyle = grad;
      fCtx.fillRect(0, 0, 64, 64);
    }
    const softFireTexture = new THREE.CanvasTexture(fireCanvas);

    const smokeCanvas = document.createElement('canvas');
    smokeCanvas.width = 64;
    smokeCanvas.height = 64;
    const smCtx = smokeCanvas.getContext('2d');
    if (smCtx) {
      const grad = smCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(35, 40, 50, 0.95)');
      grad.addColorStop(0.35, 'rgba(50, 55, 65, 0.7)');
      grad.addColorStop(0.7, 'rgba(65, 72, 82, 0.3)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      smCtx.fillStyle = grad;
      smCtx.fillRect(0, 0, 64, 64);
    }
    const softDisasterSmokeTexture = new THREE.CanvasTexture(smokeCanvas);

    // 1. Focused Tree-Anchored Fire Particle System (380 particles licking up the burning trees)
    const fireCount = 960;
    const fireGeo = new THREE.BufferGeometry();
    const firePos = new Float32Array(fireCount * 3);
    for (let i = 0; i < fireCount; i++) {
      const bt = BURNING_TREES[i % BURNING_TREES.length];
      const gy = getMountainTerrainElevation(bt.x, bt.z);
      firePos[i * 3] = bt.x + (Math.random() - 0.5) * 0.7 * bt.scale;
      firePos[i * 3 + 1] = gy + 0.6 + Math.random() * 3.2 * bt.scale;
      firePos[i * 3 + 2] = bt.z + (Math.random() - 0.5) * 0.7 * bt.scale;
    }
    fireGeo.setAttribute('position', new THREE.BufferAttribute(firePos, 3));
    const fireMat = new THREE.PointsMaterial({
      color: 0xff5500,
      map: softFireTexture,
      size: 2.2,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const firePoints = new THREE.Points(fireGeo, fireMat);
    firePoints.visible = false;
    scene.add(firePoints);
    fireParticlesRef.current = firePoints;

    // 2. Rising Golden Embers from Burning Trees (particles drifting into the air)
    const emberCount = 580;
    const emberGeo = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount; i++) {
      const bt = BURNING_TREES[i % BURNING_TREES.length];
      const gy = getMountainTerrainElevation(bt.x, bt.z);
      emberPos[i * 3] = bt.x + (Math.random() - 0.5) * 1.1 * bt.scale;
      emberPos[i * 3 + 1] = gy + 1.2 + Math.random() * 4.5 * bt.scale;
      emberPos[i * 3 + 2] = bt.z + (Math.random() - 0.5) * 1.1 * bt.scale;
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    const emberMat = new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.45,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const emberPoints = new THREE.Points(emberGeo, emberMat);
    emberPoints.visible = false;
    scene.add(emberPoints);
    emberParticlesRef.current = emberPoints;

    // 3. Realistic Billowing Smoke Plumes from Burning Tree Tops
    const smokeCount = 680;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    for (let i = 0; i < smokeCount; i++) {
      const bt = BURNING_TREES[i % BURNING_TREES.length];
      const gy = getMountainTerrainElevation(bt.x, bt.z);
      smokePos[i * 3] = bt.x + (Math.random() - 0.5) * 0.8;
      smokePos[i * 3 + 1] = gy + 2.8 * bt.scale + Math.random() * 10.0;
      smokePos[i * 3 + 2] = bt.z + (Math.random() - 0.5) * 0.8;
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0x3b4252,
      map: softDisasterSmokeTexture,
      size: 4.8,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const smokePoints = new THREE.Points(smokeGeo, smokeMat);
    smokePoints.visible = false;
    scene.add(smokePoints);
    smokeParticlesRef.current = smokePoints;

    // 4. Rain Particles — larger, denser, more visible streaks
    const rainCount = 2800;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPos[i]     = (Math.random() - 0.5) * 110; // wider coverage
      rainPos[i + 1] = Math.random() * 42;           // taller spawn height
      rainPos[i + 2] = (Math.random() - 0.5) * 110;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));

    // Create a thin vertical streak texture for each raindrop
    const rainCanvas = document.createElement('canvas');
    rainCanvas.width = 4; rainCanvas.height = 16;
    const rainCtx = rainCanvas.getContext('2d')!;
    const rainGrad = rainCtx.createLinearGradient(0, 0, 0, 16);
    rainGrad.addColorStop(0,   'rgba(180,220,255,0.0)');
    rainGrad.addColorStop(0.3, 'rgba(180,220,255,0.9)');
    rainGrad.addColorStop(1.0, 'rgba(180,220,255,0.0)');
    rainCtx.fillStyle = rainGrad;
    rainCtx.fillRect(0, 0, 4, 16);
    const rainTexture = new THREE.CanvasTexture(rainCanvas);

    const rainMat = new THREE.PointsMaterial({
      color: 0xbfdbfe,        // blue-200 — bright, clearly visible
      map: rainTexture,
      size: 0.55,             // much larger than 0.18
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,  // additive so streaks glow
    });
    const rainPoints = new THREE.Points(rainGeo, rainMat);
    rainPoints.visible = false;
    scene.add(rainPoints);
    rainParticlesRef.current = rainPoints;

    // 5. Air Pollution & Toxic Smoke Plume System (drifting directly into Node 2 sensor station)
    const pollutionCount = 650;
    const pollutionGeo = new THREE.BufferGeometry();
    const pollutionPos = new Float32Array(pollutionCount * 3);
    for (let i = 0; i < pollutionCount * 3; i += 3) {
      pollutionPos[i] = -16 + (Math.random() - 0.5) * 8.5;
      pollutionPos[i + 1] = 0.8 + Math.random() * 6.0;
      pollutionPos[i + 2] = -12 + (Math.random() - 0.5) * 8.5;
    }
    pollutionGeo.setAttribute('position', new THREE.BufferAttribute(pollutionPos, 3));
    const pollutionMat = new THREE.PointsMaterial({
      color: 0x5a534a,
      size: 2.2,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const pollutionPoints = new THREE.Points(pollutionGeo, pollutionMat);
    pollutionPoints.visible = false;
    scene.add(pollutionPoints);
    pollutionSmokeRef.current = pollutionPoints;

    // 7. Landslide Dust & Sliding Earth Particle Cloud
    const slideDustCount = 320;
    const slideDustGeo = new THREE.BufferGeometry();
    const slideDustPos = new Float32Array(slideDustCount * 3);
    for (let i = 0; i < slideDustCount * 3; i += 3) {
      slideDustPos[i] = -12 + (Math.random() - 0.5) * 6.5;
      slideDustPos[i + 1] = 2.0 + Math.random() * 5.5;
      slideDustPos[i + 2] = 14 + (Math.random() - 0.5) * 6.5;
    }
    slideDustGeo.setAttribute('position', new THREE.BufferAttribute(slideDustPos, 3));
    // Helper to generate soft circular radial gradient alpha particle texture (no square blocks)
    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = 64;
    dustCanvas.height = 64;
    const dustCtx = dustCanvas.getContext('2d');
    if (dustCtx) {
      const grad = dustCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.65)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      dustCtx.fillStyle = grad;
      dustCtx.fillRect(0, 0, 64, 64);
    }
    const softDustTexture = new THREE.CanvasTexture(dustCanvas);

    const slideDustMat = new THREE.PointsMaterial({
      color: 0x8a6245, // Warm mountain earth dust
      map: softDustTexture,
      size: 0.9,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const slideDustPoints = new THREE.Points(slideDustGeo, slideDustMat);
    slideDustPoints.visible = false;
    scene.add(slideDustPoints);
    landslideDustParticlesRef.current = slideDustPoints;
  }

  // ==========================================
  // DYNAMIC RUNTIME UPDATES (Daylight Preservation)
  // ==========================================
  function updateSceneDynamicLayers(scene: THREE.Scene, time: number) {
    const hazard = simulationEngine.activeHazard;
    const weather = simulationEngine.weatherMode;

    // 1. DYNAMIC DAYLIGHT / OVERCAST LIGHTING SUITE (NO DARK MODE / NO BLACK SCENE!)
    if (sunLightRef.current && ambientLightRef.current && sceneRef.current) {
      let targetSunIntensity = 2.3;
      let targetAmbientIntensity = 1.25;
      let targetFogDensity = 0.0020; // Clear daylight baseline
      let targetSkyColor = 0xa5cbf5; // Crisp daylight blue
      let targetFogColor = 0xd6e8fa;
      let isWet = false;

      if (weather === 'RAIN') {
        targetSunIntensity = 1.8;
        targetAmbientIntensity = 1.25;
        targetFogDensity = 0.0032; // Very gentle light mist, clear visibility
        targetSkyColor = 0x94a3b8; // Slate-400 clean daylight overcast grey/white
        targetFogColor = 0xcbd5e1;
        isWet = true;
      } else if (weather === 'HEAVY_RAIN' || weather === 'STORM') {
        targetSunIntensity = 1.5;
        targetAmbientIntensity = 1.20;
        targetFogDensity = 0.0040; // Soft drizzle atmosphere, completely eliminates milky fog
        targetSkyColor = 0x8293a7;
        targetFogColor = 0xb4c2d2;
        isWet = true;

        // ── Cinematic multi-flash thunder sequence ────────────────────────
        if (lightningLightRef.current) {
          const mainLight = lightningLightRef.current as THREE.PointLight & { extra?: THREE.PointLight[] };
          const extraLights = mainLight.extra ?? [];
          const allLights = [mainLight, ...extraLights];

          // Use actual frame delta derived from time
          const lnDt = lightningLastTimeRef.current === 0
            ? 0.016
            : Math.min(0.05, time - lightningLastTimeRef.current);
          lightningLastTimeRef.current = time;

          if (lightningTimerRef.current === 0) {
            lightningTimerRef.current = 1.5 + Math.random() * 2.0; // first strike after 1.5–3.5 s
          }

          lightningTimerRef.current  -= lnDt;
          lightningPhaseTRef.current += lnDt;

          switch (lightningPhaseRef.current) {
            case 0: // idle — waiting for next strike
              if (lightningTimerRef.current <= 0) {
                // Next interval: 1.5–3.5 s STORM, 3–6 s HEAVY_RAIN
                const interval = weather === 'STORM'
                  ? 1.5 + Math.random() * 2.0
                  : 3.0 + Math.random() * 3.0;
                lightningTimerRef.current = interval;
                lightningPhaseRef.current = 1;
                lightningPhaseTRef.current = 0;
                // All lights fire together — whole sky lights up
                allLights.forEach(l => { l.intensity = 320; });
              } else {
                allLights.forEach(l => { l.intensity = 0; });
              }
              break;

            case 1: // first flash — bright, lasts 0.12 s
              if (lightningPhaseTRef.current > 0.12) {
                lightningPhaseRef.current = 2;
                lightningPhaseTRef.current = 0;
                allLights.forEach(l => { l.intensity = 0; });
              }
              break;

            case 2: // brief dark gap — 0.08 s
              if (lightningPhaseTRef.current > 0.08) {
                lightningPhaseRef.current = 3;
                lightningPhaseTRef.current = 0;
                allLights.forEach(l => { l.intensity = 220; });
              }
              break;

            case 3: // second flash — slightly dimmer, lasts 0.15 s
              if (lightningPhaseTRef.current > 0.15) {
                lightningPhaseRef.current = 4;
                lightningPhaseTRef.current = 0;
              }
              break;

            case 4: // decay — fade out over 0.4 s
              {
                const decayT = lightningPhaseTRef.current / 0.4;
                const decayIntensity = Math.max(0, 220 * (1 - decayT));
                allLights.forEach(l => { l.intensity = decayIntensity; });
                if (decayT >= 1.0) {
                  lightningPhaseRef.current = 0;
                  allLights.forEach(l => { l.intensity = 0; });
                }
              }
              break;
          }
        }
      } else if (hazard?.type === 'FOREST_FIRE') {
        targetSunIntensity = 2.0;
        targetAmbientIntensity = 1.20;
        targetFogDensity = 0.0025; // Clean air with localized fire smoke plumes
        targetSkyColor = 0xa38c78;
        targetFogColor = 0xb8a490;
      } else if (hazard?.type === 'AIR_QUALITY_EVENT') {
        targetSunIntensity = 1.9;
        targetAmbientIntensity = 1.25;
        targetFogDensity = 0.0042; // Mild haze rather than dense obscuring fog
        targetSkyColor = 0xbab2a3;
        targetFogColor = 0xc9c2b5;
      } else {
        // Clear weather — reset lightning state and kill all lights
        if (lightningLightRef.current) {
          const mainLight = lightningLightRef.current as THREE.PointLight & { extra?: THREE.PointLight[] };
          const allLights = [mainLight, ...(mainLight.extra ?? [])];
          allLights.forEach(l => { l.intensity = 0; });
        }
        lightningPhaseRef.current = 0;
        lightningTimerRef.current = 0;  // reset to 0 so first-entry guard fires next rain
      }

      sunLightRef.current.intensity = THREE.MathUtils.lerp(sunLightRef.current.intensity, targetSunIntensity, 0.05);
      ambientLightRef.current.intensity = THREE.MathUtils.lerp(ambientLightRef.current.intensity, targetAmbientIntensity, 0.05);
      
      const fog = sceneRef.current.fog as THREE.FogExp2;
      if (fog) {
        fog.density = THREE.MathUtils.lerp(fog.density, targetFogDensity, 0.05);
        fog.color.lerp(new THREE.Color(targetFogColor), 0.05);
      }
      (sceneRef.current.background as THREE.Color).lerp(new THREE.Color(targetSkyColor), 0.05);

      // Dynamic terrain wetness & reflections
      if (terrainMaterialRef.current) {
        terrainMaterialRef.current.roughness = THREE.MathUtils.lerp(
          terrainMaterialRef.current.roughness,
          isWet ? 0.25 : 0.82,
          0.05
        );
        terrainMaterialRef.current.metalness = THREE.MathUtils.lerp(
          terrainMaterialRef.current.metalness,
          isWet ? 0.35 : 0.05,
          0.05
        );
      }
      if (roadMaterialRef.current) {
        roadMaterialRef.current.roughness = THREE.MathUtils.lerp(
          roadMaterialRef.current.roughness,
          isWet ? 0.16 : 0.85,
          0.05
        );
      }
    }

    // 2. DYNAMIC RIVER WATER: REALISTIC GERSTNER WAVES, SHORELINE FOAM & REALITY MOVEMENT (Matches Reference Image)
    if (waterMeshRef.current) {
      let targetWaterY = -0.65; // Normal river level
      const isFlood = hazard?.type === 'FLOOD' || hazard?.type === 'MULTI_HAZARD';
      const isExtremeRain = hazard?.type === 'EXTREME_RAIN' || weather === 'STORM' || weather === 'HEAVY_RAIN';
      const isLandslide = hazard?.type === 'LANDSLIDE' || hazard?.type === 'MULTI_HAZARD';
      const conf = simulationEngine.aggregatedHazardConfidence;

      // Excess water cascading from northern mountains (X: -35.2, Z: -72.0 to X: 53.3, Z: -70.4)
      // pours into the river headwaters at Z: -53.3 during rainfall or thunderstorm, causing the river to flood
      const isMountainRunoffSurge = weather === 'STORM' || weather === 'HEAVY_RAIN' || weather === 'RAIN' || isExtremeRain;

      if (isFlood) {
        targetWaterY = -0.65 + Math.max(conf * 1.55, 1.15); // Rises into low-lying village floodplain!
      } else if (isMountainRunoffSurge) {
        const surge = weather === 'STORM' ? 0.88 : weather === 'HEAVY_RAIN' ? 0.62 : 0.40;
        targetWaterY = -0.65 + Math.max(conf * 0.75, surge); // Swells with mountain catchment torrents
      } else if (isLandslide) {
        // Soil and rolling rock entry pushes up river water level locally
        targetWaterY = -0.65 + Math.sin(time * 3.5) * 0.10 * conf + conf * 0.22;
      }
      waterMeshRef.current.position.y = THREE.MathUtils.lerp(waterMeshRef.current.position.y, targetWaterY, 0.04);
      waterMeshRef.current.position.x = 13 + Math.sin(time * 1.8) * 0.06;

      // Realistic Gerstner Waves — throttled on MEDIUM/LOW to save CPU + GPU upload cost
      const _waveInterval = qualityManager.config.waterUpdateInterval;
      const _shouldUpdateWaves = _waveInterval <= 1 || Math.round(time * 60) % _waveInterval === 0;

      // Realistic Gerstner Waves with Trochoidal Horizontal Pinching & Dynamic Foam Shading
      const wGeo = waterMeshRef.current.geometry;
      const wPos = wGeo.attributes.position;
      const wColors = wGeo.attributes.color as THREE.BufferAttribute;
      const basePos = baseWaterPosRef.current;
      const rockProgress = rollingProgressRef.current;
      const sProgress = slideAnimProgressRef.current;
      const riverIntensity = isFlood ? Math.max(0.65, conf) : (isExtremeRain ? 0.45 : (isLandslide ? 0.32 : 0.08));

      if (_shouldUpdateWaves && wPos && basePos && wColors) {
        const count = wPos.count;
        const bx = basePos.x;
        const by = basePos.y;
        const bz = basePos.z;

        // Wave 1: Dominant Longitudinal Downstream Channel Roller Swell
        const k1 = 0.58;
        const w1 = 2.4;
        const A1 = 0.16 + riverIntensity * 0.30;
        const dir1X = -0.15;
        const dir1Z = 0.99;

        // Wave 2: Shoreline Breaker Cross-Wave (Banking against river curves)
        const k2 = 1.25;
        const w2 = 3.5;
        const A2 = 0.10 + riverIntensity * 0.20;
        const dir2X = 0.82;
        const dir2Z = 0.57;

        // Wave 3: Micro-Ripple Capillary Waves (Glinting fluid facet caustics)
        const k3 = 3.2;
        const w3 = 7.2;
        const A3 = 0.035 + riverIntensity * 0.055;
        const dir3X = -0.6;
        const dir3Z = 0.8;

        const steepnessQ = 0.42;

        for (let i = 0; i < count; i++) {
          const x0 = bx[i];
          const y0 = by[i];
          const z0 = bz[i];

          const wx = 13 + x0;
          const wz = -2 + z0;

          // Wave phases
          const phi1 = (dir1X * x0 + dir1Z * z0) * k1 - time * w1;
          const phi2 = (dir2X * x0 + dir2Z * z0) * k2 - time * w2;
          const phi3 = (dir3X * x0 + dir3Z * z0) * k3 - time * w3;

          // Disaster concentric circular shockwaves radiating from landslide mud and soil entering the lake
          let impactWave = 0;
          if (isLandslide && sProgress > 0.015) {
            const distToMudImpact = Math.hypot(wx - 8.2, wz - 32.5);
            if (distToMudImpact < 12.0) {
              const attenuation = Math.max(0, 1.0 - distToMudImpact / 12.0);
              impactWave = Math.sin(distToMudImpact * 3.8 - time * 14.0) * 0.42 * attenuation * sProgress;
            }
          }

          // Trochoidal horizontal displacement (sharp Gerstner crests, broad troughs)
          const cos1 = Math.cos(phi1);
          const cos2 = Math.cos(phi2);
          const sin1 = Math.sin(phi1);
          const sin2 = Math.sin(phi2);
          const sin3 = Math.sin(phi3);

          const dx = -steepnessQ * (A1 * dir1X * cos1 + A2 * dir2X * cos2);
          const dz = -steepnessQ * (A1 * dir1Z * cos1 + A2 * dir2Z * cos2);
          const dy = A1 * sin1 + A2 * sin2 + A3 * sin3 + impactWave;

          wPos.setXYZ(i, x0 + dx, y0 + dy, z0 + dz);

          // Dynamic foam and reality water color shading (matching Reference Image):
          // 1. Shoreline breaker foam: continuous thick white frothy contours hugging the banks
          const distToShore = Math.min(Math.abs(x0 - (-7.8)), Math.abs(x0 - 7.8));
          const shoreLapping = Math.sin(time * 3.2 + z0 * 0.45) * 0.5 + 0.5;
          let foam = Math.max(0, 1.0 - distToShore / (1.85 + shoreLapping * 0.9));
          foam = Math.pow(foam, 1.3);

          // 2. Wave crest white foam froth (when wave peaks pinch up)
          if (dy > 0.10) {
            const crestPeak = (dy - 0.10) / 0.28;
            foam = Math.max(foam, Math.min(1.0, crestPeak * 0.95));
          }

          // 3. Trailing wake / river turbulence ribbons
          const wakeNoise = Math.sin(x0 * 1.6 + time * 2.2) * Math.cos(z0 * 0.85 - time * 1.8);
          if (wakeNoise > 0.60) {
            foam = Math.max(foam, (wakeNoise - 0.60) * 2.4 * (0.35 + conf * 0.65));
          }

          // 4. Fallen mud and soil impact splash foam bursts in the lake
          if (Math.abs(impactWave) > 0.08) {
            foam = Math.max(foam, Math.min(1.0, 0.65 + Math.abs(impactWave) * 2.5));
          }

          foam = Math.min(1.0, foam);

          // Color interpolation:
          // Deep trough: Rich marine turquoise (0.02, 0.44, 0.68)
          // Mid face: Radiant crystal aqua (0.10, 0.74, 0.86)
          // Breaker foam: Pure brilliant white (0.97, 0.99, 1.0)
          let r: number, g: number, b: number;
          if (foam > 0.45) {
            const tFoam = (foam - 0.45) / 0.55;
            r = THREE.MathUtils.lerp(0.10, 0.97, tFoam);
            g = THREE.MathUtils.lerp(0.74, 0.99, tFoam);
            b = THREE.MathUtils.lerp(0.86, 1.00, tFoam);
          } else {
            const tWater = foam / 0.45;
            r = THREE.MathUtils.lerp(0.02, 0.10, tWater);
            g = THREE.MathUtils.lerp(0.44, 0.74, tWater);
            b = THREE.MathUtils.lerp(0.68, 0.86, tWater);
          }

          // Turbid silt cloud where fallen mud and soil enters the lake
          if (isLandslide && sProgress > 0.02) {
            const distMudPlume = Math.hypot(wx - 8.2, wz - 32.5);
            if (distMudPlume < 7.0) {
              const mudSpread = (1.0 - distMudPlume / 7.0) * Math.min(1.0, sProgress * 1.6) * 0.82;
              r = THREE.MathUtils.lerp(r, 0.38, mudSpread);
              g = THREE.MathUtils.lerp(g, 0.25, mudSpread);
              b = THREE.MathUtils.lerp(b, 0.13, mudSpread);
            }
          }

          // Chemical Factory Discharge Outlet at x = 17.5, z = -34.0
          const chemDx = wx - 17.5;
          const chemDz = z0 - (-34.0);
          const chemDist = Math.hypot(chemDx, chemDz);
          if (chemDist < 5.6 && wx <= 18.2) {
            const chemFactor = (1.0 - chemDist / 5.6) * 0.46;
            r = THREE.MathUtils.lerp(r, 0.16, chemFactor);
            g = THREE.MathUtils.lerp(g, 0.18, chemFactor);
            b = THREE.MathUtils.lerp(b, 0.20, chemFactor);
          }

          wColors.setXYZ(i, r, g, b);
        }

        wPos.needsUpdate = true;
        wColors.needsUpdate = true;
      }

      // 4. Dynamic Shoreline Foam Mist & Spray Particles — skip CPU update when inactive
      if (riverSplashParticlesRef.current) {
        const isSplashing = isLandslide && (rockProgress > 0.35);
        // Only run the CPU particle loop when visible — river splash is cosmetic at idle
        riverSplashParticlesRef.current.visible = true;
        const spMat = riverSplashParticlesRef.current.material as THREE.PointsMaterial;
        const targetOpacity = isSplashing ? 0.92 : 0.32; // reduce idle opacity too
        spMat.opacity = THREE.MathUtils.lerp(spMat.opacity, targetOpacity, 0.06);

        // Only animate particles on HIGH tier at idle, always animate when splashing
        const _splashInterval = isSplashing ? 1 : qualityManager.config.waterUpdateInterval;
        if (_splashInterval <= 1 || Math.round(time * 60) % _splashInterval === 0) {
          const spPos = riverSplashParticlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < spPos.count * 3; i += 3) {
          spPos.array[i + 1] += (isSplashing ? 0.055 : 0.025);
          spPos.array[i] += Math.sin(time * 10 + i) * 0.015;
          spPos.array[i + 2] += 0.04;

          if (spPos.array[i + 1] > (isSplashing ? 1.8 : 0.5) || spPos.array[i + 2] > 70.0) {
            const side = (i % 2 === 0) ? -7.2 + Math.random() * 2.2 : 5.4 + Math.random() * 2.2;
            spPos.array[i] = 13 + side;
            spPos.array[i + 1] = -0.55 + Math.random() * 0.25;
            spPos.array[i + 2] = -72.0 + Math.random() * 144.0;
          }
        }
        spPos.needsUpdate = true;
        } // end throttle interval
      }

      // 4b. DEDICATED WATER SPLASH & HIGH-ARC WATER SPRINKLE SHOWER INTO THE HOUSES
      if (landslideWaterSplashRef.current && splashParticlesDataRef.current) {
        const isSplashing = isLandslide && sProgress > 0.015;
        landslideWaterSplashRef.current.visible = isSplashing;
        if (isSplashing) {
          const sMat = landslideWaterSplashRef.current.material as THREE.PointsMaterial;
          sMat.opacity = THREE.MathUtils.lerp(sMat.opacity, Math.min(0.96, sProgress * 2.5), 0.1);
          const sPos = landslideWaterSplashRef.current.geometry.attributes.position as THREE.BufferAttribute;
          const data = splashParticlesDataRef.current;
          const count = sPos.count;

          for (let i = 0; i < count; i++) {
            const idx = i * 3;
            data.life[i] += 0.026;

            sPos.array[idx] += data.vx[i];
            sPos.array[idx + 1] += data.vy[i];
            sPos.array[idx + 2] += data.vz[i];

            if (i < 150) {
              // Group A: Lake entry explosive geyser at fallen mud zone
              data.vy[i] -= 0.008; // Gravity pulls splash water back down
              if (sPos.array[idx + 1] < -0.65 || data.life[i] > data.maxLife[i]) {
                data.life[i] = 0;
                sPos.array[idx] = 7.5 + Math.random() * 1.6;
                sPos.array[idx + 1] = -0.62 + Math.random() * 0.04;
                sPos.array[idx + 2] = 26.5 + Math.random() * 11.5;

                const splashAngle = (Math.random() - 0.5) * Math.PI * 0.7;
                const speed = 0.05 + Math.random() * 0.14;
                data.vx[i] = Math.cos(splashAngle) * speed + 0.04;
                data.vy[i] = 0.10 + Math.random() * 0.22;
                data.vz[i] = Math.sin(splashAngle) * speed;
              }
            } else {
              // Group B: Powerful high-arc water sprinkle shower shooting across the river DIRECTLY into the houses!
              data.vy[i] -= 0.0055; // Gentle gravity arc allowing droplets to soar into the village
              const curX = sPos.array[idx];
              const curY = sPos.array[idx + 1];
              const isOverVillage = curX >= 26.0;
              const hitGround = isOverVillage ? 0.45 : -0.65;

              // Reset when hitting village ground / house roofs or completing flight path
              if (curY < hitGround || data.life[i] > data.maxLife[i] || curX > 45.0) {
                data.life[i] = 0;
                // Erupt from lake entry and eastern surge wave (X: 8.0 to 18.5)
                const isEasternSurge = Math.random() < 0.45;
                sPos.array[idx] = isEasternSurge ? 17.5 + Math.random() * 2.0 : 8.0 + Math.random() * 4.0;
                sPos.array[idx + 1] = isEasternSurge ? 0.10 + Math.random() * 0.4 : -0.55 + Math.random() * 0.3;
                sPos.array[idx + 2] = 19.0 + Math.random() * 26.0;

                // High eastward velocity pointing towards village houses (X: 24 to 40)
                data.vx[i] = 0.30 + Math.random() * 0.36; // Strong arc towards houses
                data.vy[i] = 0.18 + Math.random() * 0.24; // High upward arc sprinkling down
                data.vz[i] = (Math.random() - 0.5) * 0.15;
                data.maxLife[i] = 0.9 + Math.random() * 0.7;
              }
            }
          }
          sPos.needsUpdate = true;
        }
      }
    }

    // 2b. DYNAMIC VILLAGE OVERLAND FLOOD SPILLWATER (Water spills near the houses and on to the land like waves, partially)
    const isFlood = hazard?.type === 'FLOOD' || hazard?.type === 'MULTI_HAZARD';
    const isExtremeRain = hazard?.type === 'EXTREME_RAIN' || weather === 'STORM' || weather === 'HEAVY_RAIN';

    if (isFlood) {
      floodProgressRef.current = Math.min(1.0, floodProgressRef.current + 0.005);
    } else if (isExtremeRain) {
      floodProgressRef.current = Math.min(0.55, floodProgressRef.current + 0.003);
    } else {
      floodProgressRef.current = Math.max(0, floodProgressRef.current - 0.025);
    }
    const fProgress = floodProgressRef.current;

    if (floodSpilloverMeshRef.current) {
      floodSpilloverMeshRef.current.visible = fProgress > 0.01;
      if (fProgress > 0.01) {
        const fsMat = floodSpilloverMeshRef.current.material as THREE.MeshStandardMaterial;
        fsMat.opacity = Math.min(0.85, fProgress * 0.95);

        // Water level spills partially across the riverside promenade and front lawns
        const targetSpillY = 0.468 + fProgress * 0.030;
        floodSpilloverMeshRef.current.position.y = targetSpillY;

        // Dynamic surging flood waves rolling in from the river towards the front of the houses:
        const fGeo = floodSpilloverMeshRef.current.geometry;
        const fPos = fGeo.attributes.position;
        const fBase = baseFloodSpillPosRef.current;
        if (fBase) {
          const wavePhase = time * 3.2;
          for (let i = 0; i < fPos.count; i++) {
            const bx = fBase.x[i];
            const bz = fBase.z[i];
            const worldX = 22.25 + bx;
            const worldZ = 33.0 + bz;

            // Distance ratio: 0 at river shoreline (x=18.5), 1.0 at front curb/lawn (x=26.0)
            const tDist = Math.max(0, Math.min(1.0, (worldX - 18.5) / 7.5));

            // Rolling breaker waves washing towards the houses:
            const wave1 = Math.sin(worldX * 2.0 - wavePhase) * 0.030;
            const wave2 = Math.sin(worldZ * 0.95 + worldX * 0.8 - wavePhase * 0.7) * 0.016;
            // Pulsating tidal wash surging forward and drawing back:
            const surgeWash = Math.sin(time * 2.2) * 0.018 * (1.0 - tDist * 0.45);

            // PARTIAL REACH: Height tapers off smoothly down to 0 before the houses (tDist > 0.75)
            // Water only reaches front promenade/gardens and NEVER goes inside the houses!
            const edgeTaper = Math.max(0, 1.0 - Math.pow(Math.max(0, (tDist - 0.70) / 0.30), 1.6));

            fPos.setY(i, (wave1 + wave2 + surgeWash) * edgeTaper * fProgress);
          }
          fPos.needsUpdate = true;
        }
      }
    }

    // Dynamic wet ground / muddy saturation on village terrain where flood water spills (partially, strictly stopping before house interiors at x <= 26.0)
    if (terrainMeshRef.current && baseTerrainColorsRef.current) {
      const tGeo = terrainMeshRef.current.geometry;
      const tPos = tGeo.attributes.position;
      const tColors = tGeo.attributes.color as THREE.BufferAttribute;
      const baseCol = baseTerrainColorsRef.current;

      if (fProgress > 0.01) {
        for (let i = 0; i < tPos.count; i++) {
          const tx = tPos.getX(i);
          const tz = tPos.getZ(i);
          // Village land domain strictly between river bank and front lawn curb (x: 18.0 to 26.0, z: 12.0 to 52.0)
          if (tx >= 18.0 && tx <= 26.0 && tz >= 12.0 && tz <= 52.0) {
            const wetDist = Math.max(0, 1.0 - (tx - 18.0) / 8.0);
            const wetFactor = wetDist * fProgress * 0.65;
            if (wetFactor > 0) {
              tColors.setXYZ(
                i,
                THREE.MathUtils.lerp(baseCol[i * 3], 0.12, wetFactor),
                THREE.MathUtils.lerp(baseCol[i * 3 + 1], 0.22, wetFactor),
                THREE.MathUtils.lerp(baseCol[i * 3 + 2], 0.28, wetFactor)
              );
            }
          }
        }
        tColors.needsUpdate = true;
      }
    }

    // 3. FOREST FIRE & EMBER INTENSITY (Vastly Increased Blaze & Volumetric Flames)
    const isFire = hazard?.type === 'FOREST_FIRE' || hazard?.type === 'MULTI_HAZARD';

    if (forestFireGroupRef.current) {
      forestFireGroupRef.current.visible = isFire;
      if (isFire) {
        // Animate volumetric flame cones & crown fire with multi-frequency turbulence
        flameMeshesRef.current.forEach(flame => {
          const s = Math.sin(time * flame.speed + flame.phase);
          const c = Math.cos(time * (flame.speed * 0.8) + flame.phase);
          flame.mesh.scale.y = flame.baseScaleY * (0.85 + 0.38 * Math.abs(s));
          flame.mesh.scale.x = flame.baseScaleY * (0.92 + 0.16 * c);
          flame.mesh.scale.z = flame.baseScaleY * (0.92 + 0.16 * s);
          flame.mesh.rotation.y += 0.035;
        });
      }
    }

    if (fireParticlesRef.current && smokeParticlesRef.current && fireLightRef.current && emberParticlesRef.current) {
      fireParticlesRef.current.visible = isFire;
      emberParticlesRef.current.visible = isFire;
      smokeParticlesRef.current.visible = isFire;

      const fireMat = fireParticlesRef.current.material as THREE.PointsMaterial;
      const emberMat = emberParticlesRef.current.material as THREE.PointsMaterial;
      const smokeMat = smokeParticlesRef.current.material as THREE.PointsMaterial;

      let targetFireOpacity = isFire ? 0.96 : 0;
      let targetSmokeOpacity = isFire ? 0.85 : 0;
      let targetEmberOpacity = isFire ? 0.92 : 0;

      fireMat.opacity = THREE.MathUtils.lerp(fireMat.opacity, targetFireOpacity, 0.08);
      emberMat.opacity = THREE.MathUtils.lerp(emberMat.opacity, targetEmberOpacity, 0.08);
      smokeMat.opacity = THREE.MathUtils.lerp(smokeMat.opacity, targetSmokeOpacity, 0.08);

      if (isFire) {
        // Warm realistic fire light flickering specifically over the burning trees
        fireLightRef.current.intensity = 18 + Math.sin(time * 14) * 4 + Math.sin(time * 24) * 2;
        secondaryFireLightsRef.current.forEach((sl, idx) => {
          sl.intensity = 6 + Math.sin(time * 12 + idx * 2.5) * 2;
        });

        // Fire particles licking directly up the trunks and crowns of the burning trees
        const pos = fireParticlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const bt = BURNING_TREES[i % BURNING_TREES.length];
          const gy = getMountainTerrainElevation(bt.x, bt.z);
          pos.array[i * 3 + 1] += 0.055; // rise up the tree trunk & crown
          pos.array[i * 3] += Math.sin(time * 3.0 + i) * 0.012;
          pos.array[i * 3 + 2] += Math.cos(time * 2.8 + i) * 0.012;

          if (pos.array[i * 3 + 1] > gy + 4.0 * bt.scale) {
            pos.array[i * 3] = bt.x + (Math.random() - 0.5) * 0.6 * bt.scale;
            pos.array[i * 3 + 1] = gy + 0.6 + Math.random() * 0.8;
            pos.array[i * 3 + 2] = bt.z + (Math.random() - 0.5) * 0.6 * bt.scale;
          }
        }
        pos.needsUpdate = true;

        // Golden embers drifting directly off the burning branches into the air
        const ePos = emberParticlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < ePos.count; i++) {
          const bt = BURNING_TREES[i % BURNING_TREES.length];
          const gy = getMountainTerrainElevation(bt.x, bt.z);
          ePos.array[i * 3 + 1] += 0.075;
          ePos.array[i * 3] += Math.sin(time * 2.5 + i) * 0.02 + 0.01;
          ePos.array[i * 3 + 2] += Math.cos(time * 2.2 + i) * 0.018;

          if (ePos.array[i * 3 + 1] > gy + 12.0) {
            ePos.array[i * 3] = bt.x + (Math.random() - 0.5) * 1.0 * bt.scale;
            ePos.array[i * 3 + 1] = gy + 1.2 + Math.random() * 2.2 * bt.scale;
            ePos.array[i * 3 + 2] = bt.z + (Math.random() - 0.5) * 1.0 * bt.scale;
          }
        }
        ePos.needsUpdate = true;

        // Billowing dark smoke columns rising straight from the burning tree tops
        const sPos = smokeParticlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < sPos.count; i++) {
          const bt = BURNING_TREES[i % BURNING_TREES.length];
          const gy = getMountainTerrainElevation(bt.x, bt.z);
          sPos.array[i * 3 + 1] += 0.048;
          sPos.array[i * 3] += 0.018 + Math.sin(time * 1.2 + i) * 0.008; // gentle breeze drift
          sPos.array[i * 3 + 2] += Math.cos(time * 1.0 + i) * 0.008;

          if (sPos.array[i * 3 + 1] > gy + 18.0) {
            sPos.array[i * 3] = bt.x + (Math.random() - 0.5) * 0.6;
            sPos.array[i * 3 + 1] = gy + 2.8 * bt.scale + Math.random() * 0.8;
            sPos.array[i * 3 + 2] = bt.z + (Math.random() - 0.5) * 0.6;
          }
        }
        sPos.needsUpdate = true;
      } else {
        fireLightRef.current.intensity = THREE.MathUtils.lerp(fireLightRef.current.intensity, 0, 0.08);
        secondaryFireLightsRef.current.forEach(sl => {
          sl.intensity = THREE.MathUtils.lerp(sl.intensity, 0, 0.08);
        });
      }
    }

    // 4. RAIN PARTICLES
    if (rainParticlesRef.current) {
      const isRaining = weather === 'RAIN' || weather === 'HEAVY_RAIN' || weather === 'STORM' || hazard?.type === 'EXTREME_RAIN';
      rainParticlesRef.current.visible = isRaining;
      const rainMat = rainParticlesRef.current.material as THREE.PointsMaterial;

      // Scale opacity and size by storm intensity — clearly visible at all levels
      const targetRainOpacity = weather === 'STORM' ? 0.95
                               : weather === 'HEAVY_RAIN' ? 0.88
                               : isRaining ? 0.72 : 0;
      const targetSize = weather === 'STORM' ? 0.68
                       : weather === 'HEAVY_RAIN' ? 0.58
                       : isRaining ? 0.48 : 0.55;
      // Fast fade-in (0.18 lerp factor = ~8 frames to 75% opacity)
      rainMat.opacity = THREE.MathUtils.lerp(rainMat.opacity, targetRainOpacity, 0.18);
      rainMat.size    = THREE.MathUtils.lerp(rainMat.size, targetSize, 0.12);

      if (isRaining) {
        const rPos = rainParticlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        // Faster fall + diagonal wind angle for realism
        const fallSpeed = weather === 'STORM' ? 2.2 : weather === 'HEAVY_RAIN' ? 1.8 : 1.2;
        const windX     = weather === 'STORM' ? -0.22 : -0.10;
        const windZ     = weather === 'STORM' ?  0.08 :  0.04;
        for (let i = 0; i < rPos.count * 3; i += 3) {
          rPos.array[i]     += windX;            // drift X
          rPos.array[i + 1] -= fallSpeed;        // fall Y
          rPos.array[i + 2] += windZ;            // drift Z
          // Reset when below ground or drifted too far
          if (rPos.array[i + 1] < -1) {
            rPos.array[i]     = (Math.random() - 0.5) * 110;
            rPos.array[i + 1] = 40 + Math.random() * 8; // respawn higher
            rPos.array[i + 2] = (Math.random() - 0.5) * 110;
          }
        }
        rPos.needsUpdate = true;
      }
    }

    // 4b. AIR POLLUTION & DENSE SMOKE PLUME DYNAMICS (Detected by Node 2)
    const isAirPollution = hazard?.type === 'AIR_QUALITY_EVENT' || hazard?.type === 'MULTI_HAZARD';
    if (pollutionSmokeRef.current) {
      pollutionSmokeRef.current.visible = isAirPollution;
      const pMat = pollutionSmokeRef.current.material as THREE.PointsMaterial;
      // Boosted opacity: clearly visible during AIR_QUALITY and MULTI_HAZARD
      const targetPollutionOpacity = hazard?.type === 'MULTI_HAZARD' ? 0.78
                                   : isAirPollution ? 0.68 : 0;
      // Fast lerp (0.12) so smoke appears quickly when multihazard triggers
      pMat.opacity = THREE.MathUtils.lerp(pMat.opacity, targetPollutionOpacity, 0.12);

      if (isAirPollution) {
        const pPos = pollutionSmokeRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pPos.count * 3; i += 3) {
          pPos.array[i + 1] += 0.038; // rise Y
          pPos.array[i] += Math.sin(time * 2.5 + i) * 0.02 + 0.012; // drift X
          pPos.array[i + 2] += Math.cos(time * 2.0 + i) * 0.02 - 0.015; // drift Z

          if (pPos.array[i + 1] > 8.0) {
            pPos.array[i + 1] = 0.6 + Math.random() * 0.6;
            const atFactory = (i % 2 === 0);
            pPos.array[i] = (atFactory ? 44.0 : -16.0) + (Math.random() - 0.5) * 8.0;
            pPos.array[i + 2] = (atFactory ? -36.0 : -12.0) + (Math.random() - 0.5) * 8.0;
          }
        }
        pPos.needsUpdate = true;
      }
    }

    // 4b2. CONTINUOUS INDUSTRIAL FACTORY EXHALED SMOKE SYSTEM
    // Throttle: only run the CPU particle loop every other frame (frameCount is odd/even)
    if (factorySmokeRef.current) {
      const fSmokeMat = factorySmokeRef.current.material as THREE.PointsMaterial;

      // Dynamic emission opacity and coloring — only set when value actually changes
      if (isAirPollution) {
        if (fSmokeMat.color.getHex() !== 0x334155) fSmokeMat.color.setHex(0x334155);
        fSmokeMat.opacity = THREE.MathUtils.lerp(fSmokeMat.opacity, 0.94, 0.05);
        if (fSmokeMat.size !== 4.2) fSmokeMat.size = 4.2;
      } else {
        // Standard clean industrial steam & combustion exhaust plume
        if (fSmokeMat.color.getHex() !== 0xcbd5e1) fSmokeMat.color.setHex(0xcbd5e1);
        fSmokeMat.opacity = THREE.MathUtils.lerp(fSmokeMat.opacity, 0.72, 0.05);
        if (fSmokeMat.size !== 3.2) fSmokeMat.size = 3.2;
      }

      // Aircraft hazard beacon flashing on chimney top
      if (factoryBeaconRef.current) {
        factoryBeaconRef.current.intensity = Math.sin(time * 6) > 0.4 ? 2.8 : 0.15;
      }

      // Animate smoke particles — throttled: skip every other frame on MEDIUM/LOW
      const _smokeInterval = qualityManager.config.waterUpdateInterval; // reuse interval setting
      if (_smokeInterval <= 1 || Math.round(time * 60) % _smokeInterval === 0) {
        const sPos = factorySmokeRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const sCount = sPos.count;

        for (let i = 0; i < sCount; i++) {
          const isChimney1 = i % 3 !== 0;
          const originX = isChimney1 ? 50 : 54;
          const originY = isChimney1 ? 25.5 : 19.5;
          const originZ = isChimney1 ? -45.5 : -42.0;

          const idx = i * 3;
          // Scale movement by interval so speed stays consistent even when skipping frames
          const step = _smokeInterval;
          sPos.array[idx + 1] += (isAirPollution ? 0.11 : 0.08) * step;
          sPos.array[idx] -= (0.07 + Math.sin(time * 2.0 + i) * 0.015) * step;
          sPos.array[idx + 2] += (0.03 + Math.cos(time * 1.5 + i) * 0.01) * step;

          if (sPos.array[idx + 1] > 48.0 || sPos.array[idx] < 10.0) {
            sPos.array[idx] = originX + (Math.random() - 0.5) * 0.7;
            sPos.array[idx + 1] = originY + Math.random() * 0.8;
            sPos.array[idx + 2] = originZ + (Math.random() - 0.5) * 0.7;
          }
        }
        sPos.needsUpdate = true;
      }
    }

    // 4c. LANDSLIDE ACTIVE SLIDING EARTH DYNAMICS, ROLLING ROCKS & TREE SLUMP
    const isLandslide = hazard?.type === 'LANDSLIDE' || hazard?.type === 'MULTI_HAZARD';

    // 1. Advance landslide progression ONLY when landslide hazard is active!
    if (isLandslide) {
      slideAnimProgressRef.current = Math.min(1.0, slideAnimProgressRef.current + 0.0035);
      rollingProgressRef.current = Math.min(1.0, rollingProgressRef.current + 0.0032);
    } else {
      slideAnimProgressRef.current = THREE.MathUtils.lerp(slideAnimProgressRef.current, 0, 0.05);
      rollingProgressRef.current = THREE.MathUtils.lerp(rollingProgressRef.current, 0, 0.05);
      if (slideAnimProgressRef.current < 0.002) slideAnimProgressRef.current = 0;
      if (rollingProgressRef.current < 0.002) rollingProgressRef.current = 0;
    }

    const sProgress = slideAnimProgressRef.current;
    const rProgress = rollingProgressRef.current;

    // 2. THE LARGE ROCKS ROLL FORWARD DOWNHILL TOWARDS THE RIVER
    rollingBouldersRef.current.forEach((b, bIdx) => {
      if (rProgress > 0.001) {
        // Natural gravity acceleration curve for rolling
        const curve = Math.pow(rProgress, 1.25);
        const curX = THREE.MathUtils.lerp(b.startX, b.targetX, curve);
        const curZ = THREE.MathUtils.lerp(b.startZ, b.targetZ, curve);
        // Follow the exact dynamic deformed terrain elevation
        const groundY = getDeformedTerrainElevation(curX, curZ, sProgress);
        // Boulder rolls directly over the slumping terrain with slight realistic contact bounces
        const bounce = Math.abs(Math.sin(curve * Math.PI * 6 + bIdx)) * 0.16 * (1.0 - curve);
        const curY = groundY + b.radius * 0.70 + bounce;

        b.mesh.position.set(curX, curY, curZ);

        // Calculate angular roll rotation proportional to distance rolled
        const rolledDist = Math.hypot(curX - b.startX, curZ - b.startZ);
        const rollAngle = rolledDist / (b.radius * 0.85);

        // Vector down the slope toward the river
        const dx = b.targetX - b.startX;
        const dz = b.targetZ - b.startZ;
        const heading = Math.atan2(dz, dx);

        // Realistic tumble and continuous roll rotation down the mountain face
        b.mesh.rotation.z = b.baseRotZ - rollAngle * Math.sin(heading + Math.PI / 2);
        b.mesh.rotation.x = b.baseRotX + rollAngle * Math.cos(heading + Math.PI / 2);
        b.mesh.rotation.y = b.baseRotY + Math.sin(time * 6 + bIdx) * 0.06;
      } else {
        // Reset firmly to mountain crest resting position
        b.mesh.position.set(b.startX, b.startY, b.startZ);
        b.mesh.rotation.set(b.baseRotX, b.baseRotY, b.baseRotZ);
      }
    });

    // 3. THE TREES SLUMP & TILT TOWARDS THE RIVER AS SOIL SLIPS (FIRMLY ON THE LAND)
    slidingTreesRef.current.forEach((st, sIdx) => {
      if (sProgress > 0.001) {
        if (st.isRiverRunoutTree && st.targetRiverX !== undefined && st.targetRiverZ !== undefined) {
          // Dedicated 4 trees that slope down and near the river!
          const curve = Math.pow(sProgress, 0.85);
          const curX = THREE.MathUtils.lerp(st.baseX, st.targetRiverX, curve);
          const curZ = THREE.MathUtils.lerp(st.baseZ, st.targetRiverZ, curve);
          const riverTiltZ = THREE.MathUtils.lerp(st.baseRotZ, st.targetTiltZ || -0.58, curve);

          st.tree.rotation.z = riverTiltZ;
          st.tree.rotation.x = st.baseRotX + curve * 0.28 + Math.sin(time * 14 + sIdx) * 0.02;

          const groundY = getDeformedTerrainElevation(curX, curZ, sProgress);
          st.tree.position.set(curX, groundY - 0.22, curZ);
        } else {
          // Dynamic tilt downhill towards the river (+x direction towards water)
          const tilt = (0.24 + st.tiltMultiplier * 0.36) * Math.sin(sProgress * Math.PI * 0.9);
          st.tree.rotation.z = st.baseRotZ - tilt;
          st.tree.rotation.x = st.baseRotX + tilt * 0.32 + Math.sin(time * 16 + sIdx) * 0.015;

          // Slide forward down the slope toward the river channel
          const slideDist = sProgress * (2.2 + st.slideMultiplier * 1.8);
          const curX = st.baseX + slideDist;
          const curZ = st.baseZ - sProgress * 1.0;

          // FIRMLY ON THE LAND: Follow the exact dynamic deformed terrain height
          const groundY = getDeformedTerrainElevation(curX, curZ, sProgress);
          // Embed trunk base 22cm deep into the slumping soil so no gap can EVER occur even when tilted
          st.tree.position.set(curX, groundY - 0.22, curZ);
        }
      } else {
        // Reset to upright baseline firmly planted on static ground
        st.tree.rotation.z = st.baseRotZ;
        st.tree.rotation.x = st.baseRotX;
        const groundY = getMountainTerrainElevation(st.baseX, st.baseZ);
        st.tree.position.set(st.baseX, groundY - 0.20, st.baseZ);
      }
    });

    // 4. THE SOIL SLOPES ACROSS TOTAL PINNED LANDSLIDE AREA INTO THE LAKE (TERRAIN DYNAMIC VERTEX DEFORMATION)
    if (terrainMeshRef.current && baseTerrainYRef.current) {
      const tGeo = terrainMeshRef.current.geometry;
      const tPos = tGeo.attributes.position;
      const baseY = baseTerrainYRef.current;

      if (sProgress > 0.001) {
        for (let i = 0; i < tPos.count; i++) {
          const x = tPos.getX(i);
          const z = tPos.getZ(i);

          const factor = getLandslideZoneInfluence(x, z);

          if (factor > 0) {
            // Direct unified dynamic deformed terrain elevation sloping into the lake:
            tPos.setY(i, getDeformedTerrainElevation(x, z, sProgress));
          }
        }
        tPos.needsUpdate = true;
      } else if (tPos.getY(0) !== baseY[0]) {
        for (let i = 0; i < tPos.count; i++) {
          tPos.setY(i, baseY[i]);
        }
        tPos.needsUpdate = true;
      }
    }

    // 4b. HIDE FLOATING MUD MESH: Terrain mesh itself carries the deformed sloping mud firmly on the land!
    if (flowingMudMeshRef.current) {
      flowingMudMeshRef.current.visible = false;
    }

    // 4c. TUMBLING SOIL & MUD CLODS TRAVELING DOWN THE SLOPE INTO THE LAKE
    flowingSoilClodsRef.current.forEach((clod, cIdx) => {
      if (sProgress > 0.015) {
        clod.mesh.visible = true;
        const clodCycle = (time * clod.speed + cIdx * 0.06) % 1.0;
        const cx = THREE.MathUtils.lerp(clod.startX, clod.targetX, clodCycle);
        const cz = THREE.MathUtils.lerp(clod.startZ, clod.targetZ, clodCycle);
        let gy = getDeformedTerrainElevation(cx, cz, sProgress);

        // When soil and mud clods reach the lake (cx >= 7.2), they plunge into the water and sink
        if (cx > 7.2) {
          const plunge = Math.min(1.0, (cx - 7.2) / 1.4);
          gy = THREE.MathUtils.lerp(gy, -0.95, plunge);
        }

        clod.mesh.position.set(cx, gy + clod.radius * 0.55 + Math.abs(Math.sin(clodCycle * Math.PI * 6)) * 0.08, cz);
        clod.mesh.rotation.x += clod.rotSpeed * 0.04;
        clod.mesh.rotation.z += clod.rotSpeed * 0.03;
      } else {
        clod.mesh.visible = false;
      }
    });

    // 4d. DYNAMIC SOIL SCAR PAINTING (TERRAIN TURNS INTO RICH WET MUD ACROSS TOTAL PINNED AREA)
    if (terrainMeshRef.current && baseTerrainColorsRef.current) {
      const tGeo = terrainMeshRef.current.geometry;
      const tPos = tGeo.attributes.position;
      const tColors = tGeo.attributes.color as THREE.BufferAttribute;
      const baseCol = baseTerrainColorsRef.current;

      if (sProgress > 0.005) {
        for (let i = 0; i < tPos.count; i++) {
          const x = tPos.getX(i);
          const z = tPos.getZ(i);

          const zoneInfluence = getLandslideZoneInfluence(x, z);

          if (zoneInfluence > 0) {
            const mudIntensity = zoneInfluence * Math.min(1.0, sProgress * 1.8);

            // Rich wet dark brown mountain earth, rock fracture striations
            const mudR = 0.26 + Math.sin(x * 1.8 + z * 1.4) * 0.03;
            const mudG = 0.15 + Math.cos(x * 1.6 - z * 1.1) * 0.02;
            const mudB = 0.07;

            tColors.setXYZ(
              i,
              THREE.MathUtils.lerp(baseCol[i * 3], mudR, mudIntensity),
              THREE.MathUtils.lerp(baseCol[i * 3 + 1], mudG, mudIntensity),
              THREE.MathUtils.lerp(baseCol[i * 3 + 2], mudB, mudIntensity)
            );
          }
        }
        tColors.needsUpdate = true;
      } else if (tColors.getX(0) !== baseCol[0]) {
        for (let i = 0; i < tColors.count; i++) {
          tColors.setXYZ(i, baseCol[i * 3], baseCol[i * 3 + 1], baseCol[i * 3 + 2]);
        }
        tColors.needsUpdate = true;
      }
    }

    // 5. Animate billowing dust & rushing debris along the slide track in pinned area
    if (landslideDustParticlesRef.current) {
      landslideDustParticlesRef.current.visible = isLandslide;
      const dMat = landslideDustParticlesRef.current.material as THREE.PointsMaterial;
      const targetDustOpacity = isLandslide ? 0.20 : 0;
      dMat.opacity = THREE.MathUtils.lerp(dMat.opacity, targetDustOpacity, 0.08);

      if (isLandslide) {
        const dPos = landslideDustParticlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < dPos.count * 3; i += 3) {
          // Rush down the mountain slope towards Pin 2
          dPos.array[i] += 0.09;      // move X downhill
          dPos.array[i + 1] -= 0.07;  // move Y downhill
          dPos.array[i + 2] -= 0.02;  // move Z downhill

          // Billow plume upward slightly
          dPos.array[i + 1] += Math.sin(time * 8 + i) * 0.018;

          // Reset when reaching bottom of slope
          if (dPos.array[i + 1] < 4.8) {
            dPos.array[i] = -38.0 + (Math.random() - 0.5) * 10.0;
            dPos.array[i + 1] = 14.5 + Math.random() * 4.0;
            dPos.array[i + 2] = 32.0 + (Math.random() - 0.5) * 18.0;
          }
        }
        dPos.needsUpdate = true;
      }
    }

    // 4. Subtle seismic rumble on debris group
    if (landslideDebrisRef.current) {
      if (isLandslide) {
        landslideDebrisRef.current.position.y = 7.2 + Math.sin(time * 28) * 0.04;
        landslideDebrisRef.current.position.x = -26.0 + Math.sin(time * 22) * 0.035;
        landslideDebrisRef.current.position.z = 33.5 + Math.cos(time * 19) * 0.03;
      } else {
        landslideDebrisRef.current.position.set(-26.0, 7.2, 33.5);
      }
    }

    // 5. UPDATE NODE PHYSICAL LEDS & HALOS
    simulationEngine.prototypeNodes.forEach(node => {
      const marker = nodeMarkersRef.current.get(node.id);
      if (!marker) return;

      const halo = marker.getObjectByName('selectionHalo') as THREE.Mesh;
      if (halo) {
        halo.visible = (selectedNodeIdRef.current === node.id);
        if (halo.visible) halo.rotation.z = time * 2;
      }

      const led = marker.getObjectByName('statusLed') as THREE.Mesh;
      if (led) {
        const mat = led.material as THREE.MeshBasicMaterial;
        if (node.loraStatus === 'DISCONNECTED') {
          mat.color.setHex(0xef4444);
        } else if (node.isReSensing || node.state === 'WATCH') {
          mat.color.setHex(0xf59e0b);
        } else if (node.state === 'WARNING' || node.state === 'CRITICAL') {
          mat.color.setHex(0xef4444);
        } else {
          mat.color.setHex(0x10b981);
        }
      }

      // Animate intake snorkel aura on Node-2 & Node-4 when detecting smoke / air pollution
      const intakeAura = marker.getObjectByName('intakeAura') as THREE.Mesh;
      if (intakeAura) {
        const auraMat = intakeAura.material as THREE.MeshBasicMaterial;
        if (isAirPollution && (node.id === 'NODE-2' || node.id === 'NODE-4')) {
          auraMat.opacity = 0.65 + Math.sin(time * 7) * 0.35;
          const s = 1.0 + Math.sin(time * 5) * 0.3;
          intakeAura.scale.set(s, s, s);
          auraMat.color.setHex(Math.sin(time * 6) > 0 ? 0xf59e0b : 0xef4444);
        } else {
          auraMat.opacity = 0;
        }
      }

      // Animate tower anemometer and aviation hazard beacon on Node-4
      if (node.id === 'NODE-4') {
        const anemometer = marker.getObjectByName('towerAnemometer');
        if (anemometer) {
          anemometer.rotation.y = time * 7.5;
        }
        const beacon = marker.getObjectByName('towerBeaconLight') as THREE.PointLight;
        if (beacon) {
          beacon.intensity = Math.sin(time * 5.5) > 0.3 ? 2.8 : 0.2;
        }
      }
    });

    // 5b. WATCH TOWER SUPERIOR NODE AIR QUALITY SENSOR LED
    if (watchtowerAqiLedRef.current) {
      const aqiMat = watchtowerAqiLedRef.current.material as THREE.MeshBasicMaterial;
      if (isAirPollution) {
        // Superior node actively detecting elevated air pollution / toxic smoke
        aqiMat.color.setHex(Math.sin(time * 9) > 0 ? 0xef4444 : 0xf59e0b);
      } else {
        aqiMat.color.setHex(0x10b981); // Clean baseline green
      }
    }

    // 5c. 20 VILLAGERS RUNNING ON ROAD TOWARDS SHED AT X: 70, Z: 30 AFTER HEARING SIREN
    const isDisasterActive = 
      simulationEngine.systemState === 'WARNING' || 
      simulationEngine.systemState === 'CRITICAL' || 
      simulationEngine.isWatchtowerSirenActive ||
      (simulationEngine.activeHazard !== null && simulationEngine.activeHazard.type !== 'NONE');

    const villagers = villagersRef.current;
    if (villagers && villagers.length > 0) {
      const delta = 0.016; // approximate frame delta
      villagers.forEach(v => {
        if (isDisasterActive) {
          // Hearing siren from the watch tower -> run along road towards x = 70, z = 30
          v.runProgress = Math.min(1.0, v.runProgress + delta * v.speed);
        } else {
          // Disaster cleared -> walk back to homes at a brisk pace
          v.runProgress = Math.max(0.0, v.runProgress - delta * (v.speed * 1.5));
        }

        const t = v.runProgress;

        if (t <= 0.001) {
          // Standing peacefully at home
          v.leftLeg.rotation.x = 0;
          v.rightLeg.rotation.x = 0;
          v.leftArm.rotation.x = 0;
          v.rightArm.rotation.x = 0;
          v.group.position.set(v.homeX, v.homeGroundY, v.homeZ);
          v.group.rotation.y = (v.homeX < 40 ? Math.PI / 2 : -Math.PI / 2);
        } else if (t < 0.999) {
          // Running on the road towards x = 70, z = 30
          let currentX: number;
          let currentZ: number;

          if (t < 0.25) {
            const segT = t / 0.25;
            currentX = THREE.MathUtils.lerp(v.homeX, 45.0, segT);
            currentZ = THREE.MathUtils.lerp(v.homeZ, 27.5, segT);
          } else if (t < 0.50) {
            const segT = (t - 0.25) / 0.25;
            currentX = THREE.MathUtils.lerp(45.0, 50.5, segT);
            currentZ = THREE.MathUtils.lerp(27.5, 27.5, segT);
          } else {
            const segT = (t - 0.50) / 0.50;
            currentX = THREE.MathUtils.lerp(50.5, v.targetX, segT);
            currentZ = THREE.MathUtils.lerp(27.5, v.targetZ, segT);
          }

          const gy = THREE.MathUtils.lerp(v.homeGroundY, v.targetGroundY, Math.min(t / 0.5, 1.0));
          const runPhase = time * 18 + v.id;
          // Running gait
          v.leftLeg.rotation.x = Math.sin(runPhase) * 0.8;
          v.rightLeg.rotation.x = -Math.sin(runPhase) * 0.8;
          v.leftArm.rotation.x = -Math.sin(runPhase) * 0.7;
          v.rightArm.rotation.x = Math.sin(runPhase) * 0.7;
          const bob = Math.abs(Math.sin(runPhase)) * 0.12;

          v.group.position.set(currentX, gy + bob, currentZ);
          // Face running direction (+X down the evacuation highway)
          v.group.rotation.y = Math.PI / 2;
        } else {
          // Standing safely at x = 70, z = 30 after running away from the disaster
          v.leftLeg.rotation.x = 0;
          v.rightLeg.rotation.x = 0;
          v.leftArm.rotation.x = 0.08 + Math.sin(time * 2.5 + v.id) * 0.03;
          v.rightArm.rotation.x = 0.08 + Math.sin(time * 2.5 + v.id) * 0.03;

          const gy = getMountainTerrainElevation(v.targetX, v.targetZ);
          v.group.position.set(v.targetX, gy + 0.08, v.targetZ);
          // Turn around to look back toward the village / watch tower in safety
          v.group.rotation.y = -Math.PI / 2 + Math.sin(time * 1.5 + v.id) * 0.12;
        }
      });
    }

    // 6. UPDATE RISK HEATMAP & DENSE GRID VISIBILITY
    if (riskHeatmapGroupRef.current) {
      riskHeatmapGroupRef.current.visible = simulationEngine.isRiskHeatmapActive;
    }
    if (denseGridGroupRef.current) {
      denseGridGroupRef.current.visible = simulationEngine.isDenseGridComparisonActive;
    }
    if (coordinateGraphGroupRef.current) {
      coordinateGraphGroupRef.current.visible = simulationEngine.isCoordinateGridActive;
    }
    if (coordinatePinsGroupRef.current) {
      coordinatePinsGroupRef.current.visible = simulationEngine.isCoordinateGridActive;
      const pins = simulationEngine.coordinatePins;
      if (coordinatePinsGroupRef.current.children.length === 0 || coordinatePinsGroupRef.current.userData.pinCount !== pins.length) {
        coordinatePinsGroupRef.current.userData.pinCount = pins.length;
        while (coordinatePinsGroupRef.current.children.length > 0) {
          coordinatePinsGroupRef.current.remove(coordinatePinsGroupRef.current.children[0]);
        }
        pins.forEach((pin) => {
          const pinGroup = new THREE.Group();
          const groundY = getMountainTerrainElevation(pin.x, pin.z);
          pinGroup.position.set(pin.x, groundY, pin.z);

          // Surveyor Pole
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.10, 3.2, 8),
            new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.85 })
          );
          pole.position.y = 1.6;
          pinGroup.add(pole);

          // Glowing Head Sphere
          const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.38, 16, 16),
            new THREE.MeshStandardMaterial({ 
              color: 0x00f0ff, 
              emissive: 0x0284c7, 
              emissiveIntensity: 0.8,
              roughness: 0.15 
            })
          );
          sphere.position.y = 3.2;
          pinGroup.add(sphere);

          // Base concentric hazard ring
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.6, 0.95, 24).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
          );
          ring.position.y = 0.08;
          pinGroup.add(ring);

          // Names and labelling removed per user request

          coordinatePinsGroupRef.current!.add(pinGroup);
        });

        // Zone text banner removed per user request
      }
    }
    if (virtualNodesGroupRef.current) {
      virtualNodesGroupRef.current.visible = (simulationEngine.virtualScaleCount > 2);
      // Toggle individual virtual nodes according to scale count
      const activeVirtualCount = simulationEngine.virtualScaleCount - 2;
      virtualNodesGroupRef.current.children.forEach((child, idx) => {
        child.visible = (idx < activeVirtualCount);
      });
    }

    // 7. ANIMATE IN-FLIGHT LORA PACKETS
    const activePackets: LoRaPacket[] = simulationEngine.activePackets;
    const currentPktIds = new Set(activePackets.map((p: LoRaPacket) => p.id));

    packetMeshesRef.current.forEach((mesh, id) => {
      if (!currentPktIds.has(id)) {
        scene.remove(mesh);
        packetMeshesRef.current.delete(id);
      }
    });

    activePackets.forEach((p: LoRaPacket) => {
      let pGroup = packetMeshesRef.current.get(p.id);
      if (!pGroup) {
        pGroup = new THREE.Group();
        pGroup.userData = { packet: p };

        const sphereMat = new THREE.MeshBasicMaterial({
          color: p.messageType === 'VERIFY_REQUEST' ? 0xa855f7 : p.messageType === 'VERIFY_RESPONSE' ? 0x10b981 : 0x0284c7
        });
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), sphereMat);
        pGroup.add(sphere);

        const waveGeo = new THREE.RingGeometry(0.38, 0.58, 16);
        const waveMat = new THREE.MeshBasicMaterial({
          color: sphereMat.color,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide
        });
        const wave = new THREE.Mesh(waveGeo, waveMat);
        pGroup.add(wave);

        scene.add(pGroup);
        packetMeshesRef.current.set(p.id, pGroup);
      }

      const start = p.startPos ? new THREE.Vector3(p.startPos[0], p.startPos[1], p.startPos[2]) : new THREE.Vector3(0, 0, 0);
      const end = p.endPos ? new THREE.Vector3(p.endPos[0], p.endPos[1], p.endPos[2]) : new THREE.Vector3(LOCAL_COMPUTER_POSITION[0], LOCAL_COMPUTER_POSITION[1], LOCAL_COMPUTER_POSITION[2]).add(new THREE.Vector3(0.9, 4.0, 0.1));
      const t = Math.min(1.0, Math.max(0.0, p.progress || 0));

      const x = THREE.MathUtils.lerp(start.x, end.x, t);
      const z = THREE.MathUtils.lerp(start.z, end.z, t);
      const y = Math.sin(t * Math.PI) * 4.6 + THREE.MathUtils.lerp(start.y + 1.8, end.y + 2.0, t);

      pGroup.position.set(x, y, z);
      pGroup.rotation.y = time * 4;
      pGroup.rotation.x = time * 2;
    });

    // 8. WATCH TOWER EMERGENCY SIREN & 3D TRAVELING SOUNDWAVE SHOCKWAVES
    const isSirenOn = simulationEngine.isWatchtowerSirenActive;
    if (watchtowerBeaconLightRef.current && watchtowerBeaconMeshRef.current) {
      if (isSirenOn) {
        // Red Emergency Flashing Strobe (24Hz strobe cycle)
        const strobePulse = 0.5 + 0.5 * Math.sin(time * 24);
        watchtowerBeaconLightRef.current.intensity = 2.5 + strobePulse * 5.0;
        watchtowerBeaconLightRef.current.color.setHex(simulationEngine.watchtowerSirenMode === 'SIREN' ? 0xff0000 : 0xff4400);
        // Rotating beacon beam
        watchtowerBeaconMeshRef.current.rotation.y = time * 12;
      } else {
        watchtowerBeaconLightRef.current.intensity = 0.35;
        watchtowerBeaconLightRef.current.color.setHex(0x10b981); // Standby green
      }
    }

    if (watchtowerCpuLedRef.current) {
      // Blinking ESP32 heartbeat LED
      const cpuMat = watchtowerCpuLedRef.current.material as THREE.MeshBasicMaterial;
      cpuMat.color.setHex(Math.sin(time * 8) > 0 ? 0x10b981 : 0x064e3b);
    }

    if (watchtowerSoundwavesRef.current) {
      watchtowerSoundwavesRef.current.visible = isSirenOn;
      if (isSirenOn) {
        const children = watchtowerSoundwavesRef.current.children;
        const totalRings = children.length;
        const sirenProgress = simulationEngine.watchtowerSoundwaveProgress || ((time * 0.42) % 1.0);
        const waveColor = simulationEngine.watchtowerSirenMode === 'SIREN' ? 0xef4444 : 0xf97316;

        children.forEach((child, idx) => {
          const mesh = child as THREE.Mesh;
          const ringProgress = (sirenProgress + idx / totalRings) % 1.0;
          // Scale from 2m to 82m radius across the landscape towards the villages
          const currentRadius = 2.0 + ringProgress * 80.0;
          mesh.scale.set(currentRadius, currentRadius, currentRadius);

          // Acoustic inverse square distance attenuation (120 dB SPL down to 88 dB SPL)
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.color.setHex(waveColor);
          mat.opacity = Math.max(0.0, (1.0 - ringProgress) * 0.72);

          // Undulating acoustic wave elevation following terrain slope
          mesh.position.y = -ringProgress * 12.8 + Math.sin(ringProgress * Math.PI * 6 - time * 8) * 0.35;
        });
      }
    }

    // 9. UPDATE 3D FLOATING HOLOGRAPHIC BILLBOARD HUD LABELS FOR ALL FIELD NODES
    simulationEngine.prototypeNodes.forEach(node => {
      const handle = nodeBadgesMapRef.current.get(node.id);
      if (handle && handle.lastState !== node.state) {
        handle.lastState = node.state;
        const info = getNodeBadgeInfo(node);
        renderBadgeCanvas(handle.canvas, info.title, info.subtitle, info.tag, info.color, node.state);
        handle.texture.needsUpdate = true;
      }
    });

    // 10. REALISTIC MOUNTAIN WATER TORRENTS, WATERFALLS & SPRAY
    // When there is rainfall or thunderstorm (or flood), excess water surges down from the northern mountains
    const isRainingOrStorm = weather === 'RAIN' || weather === 'HEAVY_RAIN' || weather === 'STORM' || isExtremeRain || isFlood;
    const mtnIntensity = isFlood ? 2.5 : (isRainingOrStorm ? 1.8 : 0.65);

    if (mountainStreamsRef.current && mountainStreamsRef.current.length > 0) {
      mountainStreamsRef.current.forEach((st) => {
        const mesh = st.mesh;
        const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
        const cols = mesh.geometry.attributes.color as THREE.BufferAttribute;
        const base = st.basePos;
        const count = pos.count;
        const speed = st.baseSpeed * (0.8 + mtnIntensity * 0.6);

        // Scale stream width with excess water surge
        const targetScaleX = isRainingOrStorm ? 1.35 : 1.0;
        mesh.scale.x = THREE.MathUtils.lerp(mesh.scale.x, targetScaleX, 0.05);

        for (let i = 0; i < count; i++) {
          const bx = base.x[i];
          const by = base.y[i];
          const bz = base.z[i];

          // Downhill torrent waves
          const wavePhase = (bx * 1.5 + bz * 2.2) - time * speed * 3.5;
          const waveH = Math.sin(wavePhase) * (0.08 + mtnIntensity * 0.12);
          const ripple = Math.cos(bx * 4.2 - time * speed * 5.0) * (0.03 + mtnIntensity * 0.05);

          pos.setXYZ(i, bx, by + waveH + ripple, bz);

          // White foaming torrent highlights when surging down rocks
          let foam = 0.15;
          if (waveH + ripple > 0.04) {
            foam = Math.min(1.0, 0.45 + (waveH + ripple) * 4.0 * mtnIntensity);
          }
          if (isRainingOrStorm) {
            foam = Math.min(1.0, foam + 0.35);
          }

          // Same turquoise water palette blending into brilliant white foam
          const r = THREE.MathUtils.lerp(0.05, 0.96, foam);
          const g = THREE.MathUtils.lerp(0.70, 0.99, foam);
          const b = THREE.MathUtils.lerp(0.86, 1.00, foam);
          cols.setXYZ(i, r, g, b);
        }
        pos.needsUpdate = true;
        cols.needsUpdate = true;
      });
    }

    // Animate vertical waterfall drops
    if (mountainWaterfallsRef.current && mountainWaterfallsRef.current.length > 0) {
      mountainWaterfallsRef.current.forEach((wf, wfIdx) => {
        const mat = wf.material as THREE.MeshStandardMaterial;
        const plungePulse = Math.sin(time * (18 + wfIdx * 4)) * 0.15;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, isRainingOrStorm ? 0.96 : 0.82, 0.08);
        mat.emissiveIntensity = isRainingOrStorm ? (0.45 + plungePulse) : 0.25;
        wf.scale.x = THREE.MathUtils.lerp(wf.scale.x, isRainingOrStorm ? 1.3 : 1.0, 0.05);
      });
    }

    // Animate mountain plunge spray particles
    if (mountainSprayParticlesRef.current) {
      mountainSprayParticlesRef.current.visible = true;
      const spMat = mountainSprayParticlesRef.current.material as THREE.PointsMaterial;
      spMat.opacity = THREE.MathUtils.lerp(spMat.opacity, isRainingOrStorm ? 0.92 : 0.38, 0.08);
      spMat.size = THREE.MathUtils.lerp(spMat.size, isRainingOrStorm ? 1.35 : 0.80, 0.08);

      const spPos = mountainSprayParticlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < spPos.count * 3; i += 3) {
        spPos.array[i + 1] += (isRainingOrStorm ? 0.065 : 0.025); // rise Y
        spPos.array[i] += Math.sin(time * 8 + i) * 0.015;
        spPos.array[i + 2] += Math.cos(time * 6 + i) * 0.015;

        // Reset if too high
        if (spPos.array[i + 1] > 28.0) {
          spPos.array[i + 1] = 1.0 + Math.random() * 4.0;
          spPos.array[i] = 15.5 + (Math.random() - 0.5) * 4.0;
          spPos.array[i + 2] = -58.0 + (Math.random() - 0.5) * 12.0;
        }
      }
      spPos.needsUpdate = true;
    }
  }

  const focusOnPosition = (pos: [number, number, number]) => {
    targetLookAtRef.current.set(pos[0], pos[1] + 1.0, pos[2]);
    targetCamPosRef.current.set(pos[0] + 8, pos[1] + 6, pos[2] + 10);
    activeCameraViewRef.current = 'FREE_CAMERA';
    setActiveCameraView('FREE_CAMERA');
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden font-mono">
      {/* 3D WebGL Canvas */}
      <div 
        ref={mountRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing" 
      />

      {/* Temporary Scale & Coordinate Graph Active Alert / Dismiss Banner */}
      {isCoordinateGridActive && (
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-slate-950/95 backdrop-blur-md border border-cyan-500/70 text-cyan-200 px-3.5 py-1.5 rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.3)] font-mono text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold text-cyan-300">
              TEMPORARY SCALE &amp; COORDINATE GRAPH ACTIVE
            </span>
            <span className="hidden md:inline text-slate-400 text-[11px]">
              · Hover to probe [X, Z] · Click ground to drop pin &amp; copy coordinates · Say "remove graph" to dismiss
            </span>
          </div>
          <button
            onClick={() => {
              simulationEngine.setCoordinateGrid(false);
              setIsCoordinateGridActive(false);
            }}
            className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white rounded border border-cyan-700/60 text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
            title="Remove / Hide Temporary Graph"
          >
            <X className="w-3 h-3" />
            <span>Hide Graph</span>
          </button>
        </div>
      )}

      {/* Area Coordinate Graph Quick Toggle — Positioned Directly Below the Blue Bar */}
      <div className="absolute top-3 left-4 z-20">
        <button
          onClick={() => {
            const next = !isCoordinateGridActive;
            setIsCoordinateGridActive(next);
            simulationEngine.setCoordinateGrid(next);
          }}
          className={`px-3 py-1.5 rounded-xl backdrop-blur-md border transition-colors flex items-center gap-1.5 cursor-pointer text-xs shadow-lg ${
            isCoordinateGridActive
              ? 'bg-cyan-600/90 border-cyan-400 text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Area Coordinate Graph &amp; Ruler (HotKey: G)"
        >
          <Grid className="w-3.5 h-3.5 text-cyan-300" />
          <span>Scale Graph {isCoordinateGridActive ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Landslide Hazard Active HUD */}
      {simulationEngine.activeHazard?.type === 'LANDSLIDE' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-slate-950/95 backdrop-blur-md border border-amber-500/70 px-4 py-2 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.25)] flex items-center gap-3 font-mono text-xs text-amber-200">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-bold text-amber-300">
              LANDSLIDE DETECTED · ESCARPMENT SOIL FAILURE
            </span>
            <span className="text-slate-400 text-[11px]">
              Geophone: <strong className="text-amber-300">1.48 g Seismic Shock</strong> · Soil Moisture: <strong className="text-amber-300">94% Saturation</strong>
            </span>
          </div>
          <button
            onClick={() => {
              onSelectNode('NODE-3');
              switchCameraMode('NODE_INSPECTION');
            }}
            className="ml-2 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition-colors shrink-0 shadow-sm"
          >
            Focus Node 03
          </button>
        </div>
      )}

      {/* Air Pollution Smoke Detection Live HUD */}
      {simulationEngine.activeHazard?.type === 'AIR_QUALITY_EVENT' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-slate-950/95 backdrop-blur-md border border-amber-500/70 px-4 py-2 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.25)] flex items-center gap-3 font-mono text-xs text-amber-200">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-bold text-amber-300">
              AIR POLLUTION DETECTED · SENSOR SAMPLING SMOKE
            </span>
            <span className="text-slate-400 text-[11px]">
              Node-2 MQ-2: <strong className="text-amber-300">245 ppm</strong> · MQ-135: <strong className="text-amber-300">275 AQI</strong> (5 Hz Burst)
            </span>
          </div>
          <button
            onClick={() => {
              onSelectNode('NODE-2');
              switchCameraMode('NODE_INSPECTION');
            }}
            className="ml-2 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition-colors shrink-0 shadow-sm"
          >
            Focus Sensor
          </button>
        </div>
      )}

      {/* Floating Controls Hint Tooltip */}
      {showControlsHint && (
        <div className="absolute top-14 left-4 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 text-[10px] text-slate-300 max-w-xs shadow-xl animate-fade-in flex flex-col gap-1.5">
          <div className="flex items-center justify-between font-bold text-sky-400">
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" /> 360° Game &amp; Mouse Controls
            </span>
            <button 
              onClick={() => setShowControlsHint(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-300">
            <div><span className="text-amber-400 font-bold">Right Drag:</span> Rotate 360°</div>
            <div><span className="text-purple-400 font-bold">Hold Wheel:</span> Move View</div>
            <div><span className="text-emerald-400 font-bold">Both Buttons:</span> Rotate + Move</div>
            <div><span className="text-sky-400 font-bold">Scroll Wheel:</span> Zoom In/Out</div>
            <div><span className="text-cyan-400 font-bold">Shift+Right:</span> Rotate + Move</div>
            <div><span className="text-amber-400 font-bold">R Key:</span> Reset View</div>
          </div>
        </div>
      )}

      {/* Contextual Object Inspection Mini-Card */}
      {clickedObject && (
        <div className="absolute bottom-12 left-4 z-30 max-w-sm w-88 bg-slate-900/95 backdrop-blur-md border border-sky-500/40 rounded-xl p-3.5 text-xs text-slate-200 shadow-2xl animate-fade-in">
          <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                {clickedObject.category}
              </div>
              <h4 className="font-display font-bold text-slate-100 text-sm">
                {clickedObject.name}
              </h4>
            </div>
            <button
              onClick={() => setClickedObject(null)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[11px] text-slate-300 mb-3 leading-relaxed">
            {clickedObject.details}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => focusOnPosition(clickedObject.position)}
              className="flex-1 py-1.5 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span>Focus Camera</span>
            </button>

            {clickedObject.nodeId && onInspectNodeModal && (
              <button
                onClick={() => {
                  onInspectNodeModal(clickedObject.nodeId!);
                }}
                className="flex-1 py-1.5 px-2 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors shadow-sm"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Inspect Node</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interactive Precision Coordinate Probe & Pin Manager */}
      {isCoordinateGridActive && (
        <div className="absolute bottom-12 right-4 z-30 w-80 bg-slate-950/95 backdrop-blur-xl border border-cyan-500/60 rounded-xl p-3 font-mono text-xs text-slate-200 shadow-[0_0_30px_rgba(6,182,212,0.25)] flex flex-col gap-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Crosshair className="w-4 h-4" />
              <span>Area Placement Ruler</span>
            </div>
            <button
              onClick={() => {
                simulationEngine.setCoordinateGrid(false);
                setIsCoordinateGridActive(false);
              }}
              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800"
              title="Close ruler"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live Coordinates Readout */}
          <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Hovered Position</div>
              <div className="text-sm font-bold text-cyan-300">
                {hoveredCoords 
                  ? `X: ${hoveredCoords.x.toFixed(1)}  Z: ${hoveredCoords.z.toFixed(1)}` 
                  : 'Hover terrain to probe'}
              </div>
              <div className="text-[10px] text-slate-400">
                {hoveredCoords ? `Elevation Y: ${hoveredCoords.y.toFixed(2)} m` : 'Click ground to drop pin & copy'}
              </div>
            </div>
            {hoveredCoords && (
              <button
                onClick={() => {
                  const coordStr = `X: ${hoveredCoords.x.toFixed(1)}, Z: ${hoveredCoords.z.toFixed(1)}`;
                  navigator.clipboard?.writeText(coordStr);
                  setCopiedNotification(`Copied [${coordStr}] to clipboard!`);
                  setTimeout(() => setCopiedNotification(null), 3500);
                }}
                className="p-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/70 text-cyan-300 rounded hover:text-white transition-colors cursor-pointer"
                title="Copy coordinates"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Placed Pins List */}
          {simulationEngine.coordinatePins.length > 0 && (
            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Placement Pins ({simulationEngine.coordinatePins.length})</span>
                <button
                  onClick={() => simulationEngine.clearCoordinatePins()}
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-0.5 cursor-pointer text-[10px]"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  <span>Clear Pins</span>
                </button>
              </div>
              {simulationEngine.coordinatePins.map((pin, i) => (
                <div key={pin.id} className="flex items-center justify-between bg-slate-900/70 px-2 py-1 rounded border border-slate-800/80 text-[11px]">
                  <span className="text-slate-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <strong>Pin #{i+1}:</strong> [X: {pin.x}, Z: {pin.z}]
                  </span>
                  <button
                    onClick={() => {
                      const coordStr = `X: ${pin.x}, Z: ${pin.z}`;
                      navigator.clipboard?.writeText(coordStr);
                      setCopiedNotification(`Copied [${coordStr}]!`);
                      setTimeout(() => setCopiedNotification(null), 3000);
                    }}
                    className="text-cyan-400 hover:text-cyan-200"
                    title="Copy"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick Reference Landmarks */}
          <div className="pt-1.5 border-t border-slate-900 text-[10px] text-slate-400 space-y-0.5">
            <div className="font-semibold text-slate-300">Reference Coordinates:</div>
            <div className="grid grid-cols-2 gap-x-2 text-[10px]">
              <span>Center: <strong>[0.0, 0.0]</strong></span>
              <span>Node 1: <strong>[7.6, -16.0]</strong></span>
              <span>Node 2: <strong>[-16.0, -12.0]</strong></span>
              <span>Node 3: <strong>[-8.4, 10.5]</strong></span>
              <span>Village: <strong>[36.0, 32.0]</strong></span>
              <span>Factory: <strong>[42.0, -36.0]</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Copied Toast Notification */}
      {copiedNotification && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-cyan-950/95 backdrop-blur-md border border-cyan-400 text-white px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] font-mono text-xs flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-cyan-300" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Simulated Graph / Digital Twin Watermark — Positioned Directly Below the Blue Bar */}
      <div className={`absolute top-3 right-4 z-10 pointer-events-none text-xs font-mono px-3.5 py-1.5 rounded-xl border shadow-md backdrop-blur-md transition-all ${
        isCoordinateGridActive 
          ? 'bg-cyan-950/90 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
          : 'bg-white/80 backdrop-blur-md border-slate-300/90 text-slate-700 shadow-sm'
      }`}>
        {isCoordinateGridActive ? 'COORDINATE SCALE ACTIVE · 1 UNIT = 1 METRE' : 'SIMULATED DIGITAL TWIN — NOT TO SCALE'}
      </div>
    </div>
  );
};
