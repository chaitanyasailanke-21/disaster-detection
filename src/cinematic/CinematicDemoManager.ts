/**
 * CinematicDemoManager — v4
 *
 * Key fixes:
 *  • Multi-hazard: triggers each disaster individually with a brief reveal
 *    pause so all 4 visual effects (fire, flood, landslide, pollution smoke)
 *    are actually rendered. MULTI_HAZARD alone only enables flood visuals.
 *  • Flood: pure straight-line, no rotation — camera travels directly over
 *    the bridge from forest side (south) to houses side (north).
 *  • Landslide: pure top-down descent, slow, zooming out so hill + debris
 *    path + river are all visible together.
 *  • All timing tuned for "perfect view" hold at each key moment.
 *  • No black fades, no cloud descent — starts directly at overview.
 */

import { simulationEngine } from '../engine/simulationEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Camera driver interface — implemented in ThreeScene.tsx
// ─────────────────────────────────────────────────────────────────────────────
export interface CinematicCameraDriver {
  flyTo(
    pos:  [number, number, number],
    look: [number, number, number],
    durationSec: number,
    easing?: 'linear' | 'ease-out' | 'ease-in-out'
  ): void;
  snapTo(
    pos:  [number, number, number],
    look: [number, number, number]
  ): void;
  startOrbit(
    centre:   [number, number, number],
    radius:   number,
    height:   number,
    speedRad: number
  ): void;
  stopOrbit(): void;
  getOrbitAngle(): number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Timer — driven by tick()
// ─────────────────────────────────────────────────────────────────────────────
class TimerHandle {
  remaining: number;
  private resolve: () => void;
  public promise: Promise<void>;
  constructor(sec: number) {
    this.remaining = sec;
    let r!: () => void;
    this.promise = new Promise<void>((res) => { r = res; });
    this.resolve = r;
  }
  tick(dt: number): boolean {
    this.remaining -= dt;
    if (this.remaining <= 0) { this.resolve(); return true; }
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Manager
// ─────────────────────────────────────────────────────────────────────────────
export class CinematicDemoManager {
  private driver: CinematicCameraDriver | null = null;
  private timers: TimerHandle[] = [];
  private isRunning = false;
  private abortFlag = false;

  public setDriver(d: CinematicCameraDriver) { this.driver = d; }

  public tick(dt: number) {
    if (!this.isRunning) return;
    this.timers = this.timers.filter((t) => !t.tick(dt));
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning  = true;
    this.abortFlag  = false;
    simulationEngine.startCinematicDemo();
    simulationEngine.cinematicCloudOpacity = 0;

    try {
      await this.actOverview();     if (this.abortFlag) return this.cleanup();
      await this.actLandslide();    if (this.abortFlag) return this.cleanup();
      await this.actFlood();        if (this.abortFlag) return this.cleanup();
      await this.actForestFire();   if (this.abortFlag) return this.cleanup();
      await this.actAirPollution(); if (this.abortFlag) return this.cleanup();
      await this.actHeavyRain();    if (this.abortFlag) return this.cleanup();
      await this.actMultiHazard();  if (this.abortFlag) return this.cleanup();
      await this.actEvacuation();   if (this.abortFlag) return this.cleanup();
      await this.actReturnHome();   if (this.abortFlag) return this.cleanup();
      await this.actFinalShot();
    } catch (_) { /* aborted */ }

    this.cleanup();
  }

  public stop() {
    this.abortFlag = true;
    this.timers    = [];
    this.cleanup();
  }

  public get active() { return this.isRunning; }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private wait(sec: number): Promise<void> {
    const t = new TimerHandle(sec);
    this.timers.push(t);
    return t.promise;
  }

  private async fly(
    pos:  [number, number, number],
    look: [number, number, number],
    travelSec: number,
    holdSec = 0,
    easing: 'linear' | 'ease-out' | 'ease-in-out' = 'ease-in-out'
  ) {
    this.driver?.flyTo(pos, look, travelSec, easing);
    await this.wait(travelSec + holdSec);
  }

  private setPhase(phase: string, progress = 0) {
    simulationEngine.updateCinematicState(phase, progress, 0, 0);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACT 1 — Wide Overview  (~7 s)
  // Snap to high wide position, slow orbit — full environment visible.
  // Hills NW, forest W, factory NE, village + river, bridge.
  // ─────────────────────────────────────────────────────────────────────────
  private async actOverview() {
    this.setPhase('OVERVIEW', 0);
    simulationEngine.setWeather('CLEAR');

    this.driver?.snapTo([0, 52, 76], [0, 2, 0]);
    await this.wait(0.05);

    this.driver?.startOrbit([0, 0, 0], 76, 52, 0.09);
    await this.wait(7.0);
    this.driver?.stopOrbit();

    this.setPhase('OVERVIEW', 1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACT 2 — Landslide  (~12 s)
  //
  // Geography:
  //   Hill peaks near (-48, 21, 46)
  //   NODE-3 (slope sensor) at (-35.7, 16.84, 41.7)
  //   Landslide scar centroid ≈ (-30.5, ~9, 32) XZ
  //   River corridor: X ≈ 7–19, runs full Z
  //
  // Camera path — PURE VERTICAL DESCENT along the hill-to-river axis, NO rotation:
  //
  //   Snap:   High above hill crest — wide bird's-eye looking straight down
  //           and slightly toward river.  pos=(-28, 60, 44)  look=(-15, 0, 28)
  //
  //   Fly 1:  Slow descent — camera moves forward+down along the slope axis
  //           (hill is on left, river corridor starts appearing right of centre)
  //           pos=(-20, 42, 50)  look=(-12, 2, 28)    6 s ease-in-out
  //           → TRIGGER LANDSLIDE mid-way so debris is moving when we arrive
  //
  //   Fly 2:  Continue descending, ZOOM OUT — pull back X a little so the
  //           full composition fits: hill-top left, landslide scar middle,
  //           river right.  pos=(-6, 28, 54)  look=(-14, 1, 24)    5 s ease-out
  //           → hold 1.5 s at the bottom for the viewer to read the scene
  // ─────────────────────────────────────────────────────────────────────────
  private async actLandslide() {
    this.setPhase('LANDSLIDE', 0);
    simulationEngine.clearHazard();
    simulationEngine.setWeather('RAIN');

    // Snap high above hill — no transition gap from overview
    this.driver?.snapTo([-28, 60, 44], [-15, 0, 28]);
    await this.wait(0.05);

    // Fly 1: slow descent — 6 s — trigger landslide at 3 s in
    this.driver?.flyTo([-20, 42, 50], [-12, 2, 28], 6.0, 'ease-in-out');
    await this.wait(3.0);
    simulationEngine.triggerHazard('LANDSLIDE', 'HIGH');
    simulationEngine.triggerWatchtowerAlarm(true, 'SIREN');
    this.setPhase('LANDSLIDE', 0.4);
    await this.wait(3.0); // finish fly 1

    // Fly 2: continue down + zoom out so hill + scar + river all fit — 5 s + 1.5 s hold
    await this.fly([-6, 28, 54], [-14, 1, 24], 5.0, 1.5, 'ease-out');

    this.setPhase('LANDSLIDE', 1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACT 3 — Flood  (~12 s)
  //
  // River runs full Z length: south end Z≈-76 (forest side) to north end Z≈+76 (hills/houses).
  // Camera travels the FULL LENGTH of the river — one corner to the other.
  //
  //   Start corner: south-east of river, elevated, looking north-west up the river.
  //     Forest is visible left, river runs ahead, open terrain right.
  //     pos=(26, 20, -52)  look=(12, 0, -20)
  //
  //   Mid: glide forward — bridge becomes visible, flooding evident.
  //     pos=(18, 12, -10)  look=(12, 0, 10)
  //
  //   End corner: north end of river — houses visible left, hills right.
  //     pos=(22, 10, 38)  look=(12, 0, 20)
  //     River has been followed its full length, flood spreading onto land.
  // ─────────────────────────────────────────────────────────────────────────
  private async actFlood() {
    this.setPhase('FLOOD', 0);
    simulationEngine.clearHazard();
    simulationEngine.setWeather('HEAVY_RAIN');

    // Snap to south corner — forest side, looking up the river
    this.driver?.snapTo([26, 20, -52], [12, 0, -20]);
    await this.wait(0.3);

    // Trigger flood — camera at south end, water starts rising
    simulationEngine.triggerHazard('FLOOD', 'HIGH');
    simulationEngine.triggerWatchtowerAlarm(true, 'SIREN');
    this.setPhase('FLOOD', 0.2);

    // Travel north along the river — bridge area becomes visible
    await this.fly([18, 12, -10], [12, 0, 10], 4.0, 0, 'ease-in-out');
    this.setPhase('FLOOD', 0.55);

    // Arrive at north corner — houses and hills visible, full flood evident
    await this.fly([22, 10, 38], [12, 0, 20], 4.0, 2.0, 'ease-out');

    this.setPhase('FLOOD', 1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACT 4 — Forest Fire  (~8 s)
  //
  // Forest: X -48→0, Z -36→+6.  NODE-2: (-16, 1.2, -12).
  // Burning trees: X -13→-22, Z -10→-18.
  //
  // Long wide shot only. Camera positioned east of forest looking west so
  // fire glow fills the frame. Stays far throughout.
  //
  //   Snap:   East of forest, mid-height, looking west into canopy.
  //           pos=(12, 24, 6)  look=(-16, 1, -12)
  //           → trigger fire immediately
  //
  //   Fly 1:  Slow drift south — keeps fire zone front and centre,
  //           slight angle change shows smoke rising.
  //           pos=(6, 22, -6)  look=(-18, 1, -14)    6 s + 2 s hold
  // ─────────────────────────────────────────────────────────────────────────
  private async actForestFire() {
    this.setPhase('FOREST_FIRE', 0);
    simulationEngine.clearHazard();
    simulationEngine.setWeather('FIRE_HAZE');

    this.driver?.snapTo([12, 24, 6], [-16, 1, -12]);
    await this.wait(0.05);

    simulationEngine.triggerHazard('FOREST_FIRE', 'HIGH');
    simulationEngine.triggerWatchtowerAlarm(true, 'SIREN');
    this.setPhase('FOREST_FIRE', 0.3);

    // Slow drift south — fire visible the whole time
    await this.fly([6, 22, -6], [-18, 1, -14], 6.0, 2.0, 'ease-in-out');

    this.setPhase('FOREST_FIRE', 1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACT 5 — Air Pollution  (~8 s)
  //
  // Factory: (44, 5, -36).  Chimneys: (50,25,-45.5), (54,19,-42), (52,15,-30).
  //
  // Camera placed NORTH of factory looking SOUTH — chimneys project upward
  // into open sky, smoke columns clearly readable against blue/hazy sky.
  //
  //   Snap:   North-east, mid-high, looking south toward chimneys.
  //           pos=(52, 24, 6)  look=(50, 14, -44)
  //           → trigger air quality
  //
  //   Fly 1:  Pull back north-west — factory stays in lower frame,
  //           smoke columns grow taller against sky.
  //           pos=(36, 32, 4)  look=(50, 16, -42)    6 s + 2 s hold
  // ─────────────────────────────────────────────────────────────────────────
  private async actAirPollution() {
    this.setPhase('AIR_POLLUTION', 0);
    simulationEngine.clearHazard();
    simulationEngine.setWeather('CLEAR');

    this.driver?.snapTo([52, 24, 6], [50, 14, -44]);
    await this.wait(0.05);

    simulationEngine.triggerHazard('AIR_QUALITY_EVENT', 'HIGH');
    simulationEngine.triggerWatchtowerAlarm(true, 'SIREN');
    this.setPhase('AIR_POLLUTION', 0.3);

    await this.fly([36, 32, 4], [50, 16, -42], 6.0, 2.0, 'ease-in-out');

    this.setPhase('AIR_POLLUTION', 1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACT 6 — Heavy Rain  (~8 s)
  //
  // Rain fix: clearHazard() resets weather to CLEAR internally.
  // We call clearHazard() first (removes AIR_QUALITY_EVENT which forces
  // FIRE_HAZE), then immediately call setWeather('RAIN') twice — the second
  // call lands AFTER clearHazard's internal reset, overriding it cleanly.
  // Then triggerHazard('EXTREME_RAIN') keeps weather at STORM.
  // ─────────────────────────────────────────────────────────────────────────
  private async actHeavyRain() {
    this.setPhase('HEAVY_RAIN', 0);

    // Step 1: clear previous hazard (this internally calls setWeather('CLEAR'))
    simulationEngine.clearHazard();
    // Step 2: immediately override with rain — runs synchronously after clearHazard
    simulationEngine.setWeather('RAIN');

    // Force rain particles on by setting weather again on next microtask
    await this.wait(0.05);
    simulationEngine.setWeather('RAIN');

    this.driver?.startOrbit([0, 0, 0], 70, 48, 0.08);
    await this.wait(2.5);

    simulationEngine.setWeather('HEAVY_RAIN');
    this.setPhase('HEAVY_RAIN', 0.3);
    await this.wait(2.0);

    // EXTREME_RAIN sets weather to STORM internally — keeps rain going
    simulationEngine.triggerHazard('EXTREME_RAIN', 'HIGH');
    simulationEngine.triggerWatchtowerAlarm(true, 'SIREN');
    this.setPhase('HEAVY_RAIN', 0.6);

    await this.wait(3.5);
    this.driver?.stopOrbit();

    this.setPhase('HEAVY_RAIN', 1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACT 7 — Multihazard  (~14 s)
  //
  // SINGLE VIEW — the exact composition from the screenshot:
  //   Forest + landslide (top-left), flooded river (center),
  //   watchtower siren rings + factory chimney (top-right),
  //   village houses (bottom-right), rain falling everywhere.
  //
  // Camera: south-east of the scene, elevated, looking north-west.
  //   pos=(52, 40, 52)  look=(-4, 1, 0)
  //
  // All 4 hazards triggered simultaneously before the snap.
  // Hold the view with a very slow gentle drift — no orbit, no beat cuts.
  // ─────────────────────────────────────────────────────────────────────────
  private async actMultiHazard() {
    this.setPhase('MULTIHAZARD', 0);

    // Trigger all disasters simultaneously via MULTI_HAZARD
    // ThreeScene now reads MULTI_HAZARD for: isFire, isFlood, isLandslide, isAirPollution
    simulationEngine.triggerHazard('MULTI_HAZARD', 'HIGH');
    simulationEngine.setWeather('STORM');
    simulationEngine.triggerWatchtowerAlarm(true, 'SIREN');

    // Snap to the composition:
    // forest+fire top-left, river center, watchtower + factory chimneys right
    // look target shifted toward Z-negative so factory is in the right portion of frame
    this.driver?.snapTo([58, 42, 48], [14, 2, -10]);
    await this.wait(0.1);

    this.setPhase('MULTIHAZARD', 0.2);

    // Hold the view — very slow gentle drift
    await this.fly([54, 40, 46], [14, 2, -10], 7.0, 0, 'ease-in-out');
    this.setPhase('MULTIHAZARD', 0.6);

    await this.fly([58, 42, 48], [14, 2, -10], 6.0, 1.0, 'ease-in-out');
    this.setPhase('MULTIHAZARD', 1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACT 8 — Evacuation  (~12 s)
  //
  // Village: X 29–51, Z 14–51.  Shelter: (70, 0.55, 28.5).
  // Evacuation road: X 50–75, Z 25–30.
  // Villagers run: home → (45, 27.5) → (50.5, 27.5) → shelter assembly.
  //
  // To SHOW PEOPLE RUNNING we need to be low enough to see them (~Y 12-16)
  // while still having village and shelter both visible in the same frame.
  //
  //   Snap:   South-west of village, low, looking NE along the evac corridor.
  //           People visible left, shelter visible right.
  //           pos=(22, 14, 48)  look=(58, 1, 26)
  //
  //   Fly 1:  Drift east and lower — follow the running people.
  //           pos=(34, 10, 46)  look=(62, 1, 27)    4 s
  //           At Y=10 individual running villager figures are clearly visible.
  //
  //   Fly 2:  Widen out to show full shelter arrival + entire evacuation path.
  //           pos=(48, 18, 50)  look=(65, 1, 27)    4 s + 2 s hold
  // ─────────────────────────────────────────────────────────────────────────
  private async actEvacuation() {
    this.setPhase('EVACUATION', 0);
    // Keep MULTI_HAZARD active — villagers only run when disaster is active
    // (existing ThreeScene logic: runProgress advances when systemState is CRITICAL)
    simulationEngine.triggerHazard('MULTI_HAZARD', 'HIGH');
    simulationEngine.setWeather('STORM');

    // Low south-west position — people visible, shelter on right
    this.driver?.snapTo([22, 14, 48], [58, 1, 26]);
    await this.wait(0.05);

    // Follow the runners — low angle, people figures readable
    await this.fly([34, 10, 46], [62, 1, 27], 4.0, 0, 'ease-in-out');
    this.setPhase('EVACUATION', 0.45);

    // Widen out — show full evacuation path + shelter arrival
    await this.fly([48, 18, 50], [65, 1, 27], 4.0, 2.0, 'ease-out');

    this.setPhase('EVACUATION', 1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACT 9 — Return Home  (~10 s)
  //
  // After evacuation people walk back to their houses.
  // clearHazard() stops the disaster → isDisasterActive becomes false →
  // ThreeScene automatically reverses runProgress → people walk home.
  //
  // Camera: low village street level, show people walking back into houses.
  // Village houses: X 29–51, Z 14–51.
  //
  //   Snap:   Low, inside the village, looking along the main street.
  //           pos=(36, 5, 54)  look=(38, 1, 30)
  //           Houses visible both sides, people walking toward them.
  //
  //   Fly 1:  Drift forward slowly along the street — follow the returning people.
  //           pos=(38, 4, 40)  look=(38, 1, 22)    5 s
  //
  //   Fly 2:  Gentle rise to show village rooftops + people at their doors.
  //           pos=(38, 10, 56)  look=(38, 1, 30)   4 s + 1 s hold
  // ─────────────────────────────────────────────────────────────────────────
  private async actReturnHome() {
    this.setPhase('RETURN_HOME', 0);
    simulationEngine.triggerWatchtowerAlarm(false);

    // Clear all hazards — this triggers isDisasterActive = false in ThreeScene
    // which makes runProgress decrease → villagers walk back to houses
    simulationEngine.clearHazard();
    simulationEngine.setWeather('CLEAR');

    // Low street-level position — inside the village
    this.driver?.snapTo([36, 5, 54], [38, 1, 30]);
    await this.wait(0.05);

    // Follow people walking back — drift slowly down the street
    await this.fly([38, 4, 40], [38, 1, 22], 5.0, 0, 'ease-in-out');
    this.setPhase('RETURN_HOME', 0.5);

    // Rise gently — rooftops visible, people arriving at doors
    await this.fly([38, 10, 56], [38, 1, 30], 4.0, 1.0, 'ease-out');

    this.setPhase('RETURN_HOME', 1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACT 10 — Final Overview  (~14 s)
  //
  // The recovery scene. Weather cleared. People back in houses.
  // Factory smoke turns WHITE (normal ops, no pollution event active).
  // Forest fire out — only residual smoke drifting (fire particles fade,
  // smoke lingers via factory smoke system which is always-on).
  // Landslide settled — boulders at rest.
  //
  // Camera: high slow orbit showing the whole environment in recovery.
  //
  //   Shot 1: Pull back to high aerial — show full environment.
  //           pos=(0, 72, 58)  look=(0, 2, 0)
  //
  //   Shot 2: Slow wide orbit — factory (NE), forest (W), village (E),
  //           river (center), hills (NW) all visible. No more disasters.
  //           Final peaceful establishing shot.
  // ─────────────────────────────────────────────────────────────────────────
  private async actFinalShot() {
    this.setPhase('FINAL_SHOT', 0);

    // Pull up to high aerial showing the recovering environment
    await this.fly([0, 72, 58], [0, 2, 0], 4.0, 0, 'ease-in-out');
    this.setPhase('FINAL_SHOT', 0.25);

    // Wide slow orbit — factory smoke is white (no event), forest smoke
    // lingers, river back to normal, people in houses, village peaceful
    this.driver?.startOrbit([0, 0, 0], 92, 70, 0.042);
    await this.wait(5.0);
    this.setPhase('FINAL_SHOT', 0.6);
    await this.wait(5.0);
    this.driver?.stopOrbit();

    this.setPhase('FINAL_SHOT', 1);
    await this.wait(0.5);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  private cleanup() {
    this.isRunning = false;
    this.timers    = [];
    simulationEngine.stopCinematicDemo();
  }
}

// Singleton
export const cinematicDemoManager = new CinematicDemoManager();
