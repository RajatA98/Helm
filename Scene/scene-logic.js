// Pure logic for the ship scene. No DOM, no Three.js, so it runs under `node --test`.
// The contract it implements is documented in docs/scene-contract.md and mirrored in
// HelmCore/Sources/HelmCore/SceneContract.swift.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HelmSceneLogic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = 1;
  const D2R = Math.PI / 180;

  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  const DEFAULT_AVATAR = Object.freeze({
    skinColor: '#b07a55', hairColor: '#17110d', hairStyle: 'short',
    headwear: 'bandana', headwearColor: '#23958a', coat: 'long', coatColor: '#1b2842',
  });
  const DEFAULT_SHIP = Object.freeze({ hullColor: '#8c6a46', sailColor: '#d9d0bd', flagEmblem: 'anchor' });

  /** Ship condition from open leaks. Mirrors ShipCondition(openLeaks:) in Swift. */
  function conditionFor(openLeaks) {
    const n = Math.max(0, openLeaks | 0);
    if (n === 0) return 'clean';
    if (n <= 2) return 'puddles';
    if (n <= 4) return 'listing';
    return 'sinking';
  }

  function str(v, fallback) { return typeof v === 'string' ? v : fallback; }
  function num(v, fallback) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }

  /** Validates a state from the app (object or JSON string), fills defaults, derives the condition. */
  function normalizeState(input) {
    const raw = typeof input === 'string' ? JSON.parse(input) : input;
    if (!raw || raw.version !== VERSION) {
      throw new Error(`scene contract version mismatch: expected ${VERSION}, got ${raw && raw.version}`);
    }
    const openLeaks = Math.max(0, Math.floor(num(raw.openLeaks, 0)));
    const avatar = Object.assign({}, DEFAULT_AVATAR, raw.avatar || {});
    const shipDesign = Object.assign({}, DEFAULT_SHIP, raw.shipDesign || {});
    const islands = Array.isArray(raw.islands)
      ? raw.islands.filter((i) => i && typeof i.id === 'string').map((i) => ({
          id: i.id,
          name: str(i.name, ''),
          goalName: str(i.goalName, ''),
          bearingDeg: num(i.bearingDeg, 0),
        }))
      : [];
    return {
      version: VERSION,
      openLeaks,
      shipCondition: conditionFor(openLeaks),
      headingGoalID: str(raw.headingGoalID, islands.length ? islands[0].id : ''),
      timeOfDay: clamp(num(raw.timeOfDay, 12), 0, 23.999),
      timeOverride: raw.timeOverride == null ? null : clamp(num(raw.timeOverride, 12), 0, 23.999),
      islands,
      crewName: str(raw.crewName, ''),
      crewLine: str(raw.crewLine, ''),
      avatar,
      shipDesign,
    };
  }

  function effectiveHours(state) {
    return state.timeOverride == null ? state.timeOfDay : state.timeOverride;
  }

  /** What the ship should look like for a condition. Numbers the scene can use directly. */
  function conditionVisuals(condition) {
    switch (condition) {
      case 'puddles': return { puddles: 2, listDeg: 0, sinking: false, waterline: 0 };
      case 'listing': return { puddles: 4, listDeg: 7, sinking: false, waterline: 0.35 };
      case 'sinking': return { puddles: 4, listDeg: 12, sinking: true, waterline: 1 };
      default: return { puddles: 0, listDeg: 0, sinking: false, waterline: 0 };
    }
  }

  function headingBearing(state) {
    const island = state.islands.find((i) => i.id === state.headingGoalID);
    return island ? island.bearingDeg : 0;
  }

  /**
   * Sun position for a local hour. Elevation in degrees (negative below the horizon) and
   * an azimuth in degrees relative to the ship: behind the ship at sunrise, over the port
   * rail at noon, just off the bow by sunset. Latitude 38° is a reasonable mid-latitude default.
   */
  function solar(hours, dayOfYear, noonHour, latDeg) {
    const lat = (latDeg == null ? 38 : latDeg) * D2R;
    const decl = 23.44 * Math.sin((2 * Math.PI * (dayOfYear - 81)) / 365) * D2R;
    const ha = (hours - noonHour) * 15 * D2R;
    const el = Math.asin(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha)) / D2R;
    const dayLen = (24 / Math.PI) * Math.acos(clamp(-Math.tan(lat) * Math.tan(decl), -1, 1));
    const frac = (hours - (noonHour - dayLen / 2)) / dayLen;
    return { el, az: 194 + 180 * frac };
  }

  /** The Cove rides in `islands` as a heading target with this id; the scene draws it as the lighthouse. */
  const COVE_ID = 'cove';

  /** Dragging the wheel: how far (CSS px) before the heading steps, and how much the wheel turns per px. */
  const WHEEL_DRAG_THRESHOLD = 60;
  const WHEEL_DRAG_RAD_PER_PX = 0.012;
  /** Drag left steps to the next heading, drag right to the previous one; less than the threshold does nothing. */
  function wheelDragStep(dx, threshold) {
    const t = threshold == null ? WHEEL_DRAG_THRESHOLD : threshold;
    if (dx <= -t) return 'next';
    if (dx >= t) return 'previous';
    return null;
  }

  /** A message for the app. Always stamped with the contract version. */
  function buildEvent(type, extra) {
    if (type === 'islandTapped' && !(extra && typeof extra.id === 'string')) {
      throw new Error('islandTapped requires an id');
    }
    const msg = Object.assign({ version: VERSION, type }, extra || {});
    if (type === 'wheelTurned') {
      if (msg.direction == null) msg.direction = 'next';
      if (msg.direction !== 'next' && msg.direction !== 'previous') throw new Error('wheelTurned direction must be next or previous');
    }
    return msg;
  }

  /**
   * How much the ship rocks. The wave-driven heave, pitch and roll are multiplied by
   * MOTION_SCALE so the motion is present but subtle: this screen is watched every day
   * and must never distract or nauseate. The camera follows the (already scaled) ship
   * through the camera* ratios. Under Reduce Motion everything is stiller again.
   */
  const MOTION_SCALE = 1 / 3;
  const BASE_MOTION = Object.freeze({ heave: 0.7, pitch: 0.6, roll: 0.6, cameraHeave: 0.8, cameraPitch: 1.2, cameraRoll: 0.35 });
  const REDUCED_SHIP_FACTOR = 0.3;
  const REDUCED_CAMERA_FACTOR = 0.5;
  function motionAmplitudes(reduceMotion) {
    const ship = MOTION_SCALE * (reduceMotion ? REDUCED_SHIP_FACTOR : 1);
    const cam = reduceMotion ? REDUCED_CAMERA_FACTOR : 1;
    return {
      heave: BASE_MOTION.heave * ship,
      pitch: BASE_MOTION.pitch * ship,
      roll: BASE_MOTION.roll * ship,
      cameraHeave: BASE_MOTION.cameraHeave * cam,
      cameraPitch: BASE_MOTION.cameraPitch * cam,
      cameraRoll: BASE_MOTION.cameraRoll * cam,
    };
  }

  /**
   * Screen positions for the objects the native app anchors buttons to. Input: normalized
   * device coordinates from camera projection ({x, y} in -1..1, z < 1 means in front of the
   * camera) per named anchor, plus the viewport in CSS px. Output: an `anchors` event with
   * CSS-pixel points and a visibility flag. Junk entries are dropped, never fatal.
   */
  function buildAnchorsMessage(projected, viewport) {
    const w = num(viewport && viewport.width, 0), h = num(viewport && viewport.height, 0);
    const points = {};
    for (const name of Object.keys(projected || {})) {
      const p = projected[name];
      if (!p || typeof p !== 'object') continue;
      const nx = Number(p.x), ny = Number(p.y), nz = Number(p.z);
      if (![nx, ny, nz].every(Number.isFinite)) continue;
      const visible = nz < 1 && nx >= -1.02 && nx <= 1.02 && ny >= -1.02 && ny <= 1.02;
      points[name] = {
        x: Math.round((nx * 0.5 + 0.5) * w * 10) / 10,
        y: Math.round((-ny * 0.5 + 0.5) * h * 10) / 10,
        visible,
      };
    }
    return buildEvent('anchors', { points });
  }

  function parseHexColor(hex) {
    if (typeof hex !== 'string') return null;
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return parseInt(h, 16);
  }

  /** The state the scene shows before the app sends one, and in a plain browser. */
  const MOCK_STATE = Object.freeze({
    version: VERSION,
    openLeaks: 2,
    headingGoalID: 'fit',
    timeOfDay: 14.25,
    islands: [
      { id: 'fit', name: 'Heal the Shoulders', goalName: 'Get Fit', bearingDeg: 0 },
      { id: 'hired', name: 'Ship the Portfolio', goalName: 'Get Hired', bearingDeg: 30 },
    ],
    crewName: 'Bran, master-at-arms',
    crewLine: 'Legs before sundown, Captain.',
    avatar: DEFAULT_AVATAR,
    shipDesign: DEFAULT_SHIP,
  });

  return {
    VERSION, conditionFor, normalizeState, effectiveHours, conditionVisuals,
    headingBearing, solar, buildEvent, parseHexColor, MOCK_STATE, DEFAULT_AVATAR, DEFAULT_SHIP,
    MOTION_SCALE, BASE_MOTION, motionAmplitudes, buildAnchorsMessage,
    COVE_ID, WHEEL_DRAG_THRESHOLD, WHEEL_DRAG_RAD_PER_PX, wheelDragStep,
  };
});
