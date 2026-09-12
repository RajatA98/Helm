// The Helm ship scene. A pure view: it draws whatever state the app sends through
// window.helmScene.setState(json) and reports taps back through the "helm" message
// handler. It keeps no game state of its own. Contract: docs/scene-contract.md.
(() => {
  'use strict';
  const L = window.HelmSceneLogic;
  const T = window.THREE;
  const scriptStart = performance.now();
  const canvas = document.getElementById('c');

  // ---------- host bridge (WKWebView or a plain browser)
  const host = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.helm;
  const standalone = !host;
  function post(type, extra) {
    const msg = L.buildEvent(type, extra);
    if (host) host.postMessage(msg);
    else if (type !== 'sceneStats') console.log('[helm-scene → app]', JSON.stringify(msg));
  }

  if (!T) { post('sceneError', { message: 'three.js failed to load' }); return; }

  const CM = T.ColorManagement;
  if (CM) { if ('enabled' in CM) CM.enabled = true; else CM.legacyMode = false; }
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { post('sceneError', { message: 'WebGL unavailable' }); return; }
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  // ---------- helpers
  const V3 = T.Vector3;
  const D2R = Math.PI / 180;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
  function noise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const c = (i, j, k) => hash3(xi + i, yi + j, zi + k);
    return lerp(
      lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
      lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v), w);
  }
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    const t = new T.CanvasTexture(c);
    if (srgb) t.encoding = T.sRGBEncoding;
    t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = maxAniso;
    return t;
  }
  function hexToRgb(hex, fallback) {
    const n = L.parseHexColor(hex);
    if (n == null) return fallback;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // ---------- textures
  function drawPlanks(g, w, h, base, seed, plank = 64) {
    const r = rng(seed);
    for (let x = 0; x < w; x += plank) {
      const j = (r() - 0.5) * 22;
      g.fillStyle = `rgb(${base[0] + j | 0},${base[1] + j * 0.8 | 0},${base[2] + j * 0.6 | 0})`;
      g.fillRect(x, 0, plank, h);
      for (let k = 0; k < 30; k++) {
        const gx = x + r() * plank; const ph = r() * 10; const amp = 0.6 + r() * 2.2;
        g.strokeStyle = r() < 0.6 ? `rgba(20,10,4,${0.05 + r() * 0.12})` : `rgba(255,228,190,${0.03 + r() * 0.06})`;
        g.lineWidth = 0.5 + r() * 1.3; g.beginPath();
        for (let y = 0; y <= h; y += 12) { const xx = gx + Math.sin(y * 0.018 + ph) * amp; if (y === 0) g.moveTo(xx, y); else g.lineTo(xx, y); }
        g.stroke();
      }
      g.fillStyle = 'rgba(12,7,4,0.85)'; g.fillRect(x, 0, 2, h);
      const by = r() * h; g.fillRect(x, by, plank, 2);
      g.fillStyle = 'rgba(10,6,3,0.7)';
      g.beginPath(); g.arc(x + 11, by + 9, 2.2, 0, 7); g.arc(x + plank - 11, by + 9, 2.2, 0, 7); g.fill();
    }
    for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 2, 2); }
  }
  const deckTex = canvasTex(512, 1024, (g, w, h) => drawPlanks(g, w, h, [150, 108, 70], 7));
  const staveTex = canvasTex(512, 256, (g, w, h) => drawPlanks(g, w, h, [120, 80, 46], 21, 48));
  function hullTexture(base) {
    return canvasTex(512, 1024, (g, w, h) => drawPlanks(g, w, h, base, 9));
  }
  const glowTex = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  function parchment(g, w, h, seed) {
    const r = rng(seed);
    g.fillStyle = '#e4d3ae'; g.fillRect(0, 0, w, h);
    const rad = g.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.75);
    rad.addColorStop(0, 'rgba(255,250,235,0.25)'); rad.addColorStop(1, 'rgba(120,80,35,0.45)');
    g.fillStyle = rad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(90,60,25,${r() * 0.08})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  }
  const pageTex = canvasTex(256, 256, (g, w, h) => {
    parchment(g, w, h, 5); const r = rng(8);
    g.strokeStyle = 'rgba(34,38,58,0.6)'; g.lineWidth = 1.6;
    for (let y = 40; y < h - 24; y += 20) {
      let x = 22; g.beginPath(); g.moveTo(x, y); const end = w - 22 - r() * 60;
      while (x < end) { x += 4 + r() * 6; g.lineTo(x, y + (r() - 0.5) * 3); }
      g.stroke();
    }
  });
  const mapTex = canvasTex(512, 384, (g, w, h) => {
    parchment(g, w, h, 12); const r = rng(4);
    g.strokeStyle = 'rgba(60,40,20,0.55)'; g.lineWidth = 2;
    [[120, 250, 60], [300, 150, 46], [420, 290, 52]].forEach(([cx, cy, rr]) => {
      g.beginPath();
      for (let a = 0; a <= 6.3; a += 0.25) { const q = rr * (0.75 + r() * 0.45); const px = cx + Math.cos(a) * q, py = cy + Math.sin(a) * q * 0.7; if (a === 0) g.moveTo(px, py); else g.lineTo(px, py); }
      g.closePath(); g.fillStyle = 'rgba(140,110,60,0.18)'; g.fill(); g.stroke();
    });
    g.setLineDash([6, 8]); g.strokeStyle = 'rgba(50,30,15,0.7)'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(60, 340); g.bezierCurveTo(180, 330, 220, 190, 300, 170); g.bezierCurveTo(360, 150, 380, 260, 420, 280); g.stroke();
    g.setLineDash([]); g.strokeStyle = '#9b2f22'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(408, 268); g.lineTo(432, 292); g.moveTo(432, 268); g.lineTo(408, 292); g.stroke();
  });
  const stripeTex = canvasTex(64, 256, (g, w, h) => {
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#a3372a' : '#e6e1d6'; g.fillRect(0, (i * h) / 6, w, h / 6); }
  });

  // ---------- materials
  const mats = {
    deck: new T.MeshStandardMaterial({ map: deckTex, roughness: 0.78, envMapIntensity: 0.55 }),
    wall: new T.MeshStandardMaterial({ map: hullTexture([96, 64, 40]), roughness: 0.8, side: T.DoubleSide, envMapIntensity: 0.5 }),
    hull: new T.MeshStandardMaterial({ map: hullTexture([40, 28, 20]), roughness: 0.62, side: T.DoubleSide, envMapIntensity: 0.6 }),
    rail: new T.MeshStandardMaterial({ color: '#4a2f1c', roughness: 0.42, envMapIntensity: 0.8 }),
    woodDark: new T.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.45, envMapIntensity: 0.8 }),
    stave: new T.MeshStandardMaterial({ map: staveTex, roughness: 0.75 }),
    brass: new T.MeshStandardMaterial({ color: '#c79a4b', metalness: 1, roughness: 0.3, envMapIntensity: 1.2 }),
    iron: new T.MeshStandardMaterial({ color: '#26262a', metalness: 0.7, roughness: 0.5 }),
    rope: new T.MeshStandardMaterial({ color: '#6f5a3c', roughness: 1 }),
    page: new T.MeshStandardMaterial({ map: pageTex, roughness: 0.9, side: T.DoubleSide }),
    map: new T.MeshStandardMaterial({ map: mapTex, roughness: 0.9, side: T.DoubleSide }),
    leather: new T.MeshStandardMaterial({ color: '#40241a', roughness: 0.6 }),
    ribbon: new T.MeshStandardMaterial({ color: '#8e2a22', roughness: 0.7, side: T.DoubleSide }),
    glass: new T.MeshStandardMaterial({ color: '#ffd08a', emissive: '#ffa645', emissiveIntensity: 1, roughness: 0.25, transparent: true, opacity: 0.92 }),
    puddle: new T.MeshStandardMaterial({ color: '#0f1c27', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.78, envMapIntensity: 1.6 }),
    sail: new T.MeshStandardMaterial({ color: '#d9d0bd', roughness: 0.95, side: T.DoubleSide }),
    coat: new T.MeshStandardMaterial({ color: '#1b2842', roughness: 0.82, side: T.DoubleSide }),
    trim: new T.MeshStandardMaterial({ color: '#b58a3c', roughness: 0.4, metalness: 0.6 }),
    trousers: new T.MeshStandardMaterial({ color: '#3a3027', roughness: 0.9 }),
    boots: new T.MeshStandardMaterial({ color: '#1f1712', roughness: 0.55 }),
    belt: new T.MeshStandardMaterial({ color: '#3a2415', roughness: 0.6 }),
    skin: new T.MeshStandardMaterial({ color: '#b07a55', roughness: 0.6 }),
    hair: new T.MeshStandardMaterial({ color: '#17110d', roughness: 0.7 }),
    bandana: new T.MeshStandardMaterial({ color: '#23958a', roughness: 0.8, side: T.DoubleSide }),
    cuff: new T.MeshStandardMaterial({ color: '#d8ccb4', roughness: 0.85 }),
    stone: new T.MeshStandardMaterial({ color: '#8a8378', roughness: 0.95, flatShading: true }),
    trunk: new T.MeshStandardMaterial({ color: '#5c4631', roughness: 0.95 }),
    leaf: new T.MeshStandardMaterial({ color: '#2c5a2e', roughness: 0.85, side: T.DoubleSide }),
    flag: new T.MeshStandardMaterial({ color: '#b8412c', roughness: 0.8, side: T.DoubleSide }),
    shipDark: new T.MeshStandardMaterial({ color: '#22190f', roughness: 0.8 }),
    stripes: new T.MeshStandardMaterial({ map: stripeTex, roughness: 0.7 }),
  };
  const glowMat = new T.SpriteMaterial({ map: glowTex, color: '#ffb45e', blending: T.AdditiveBlending, depthWrite: false, transparent: true });

  // ---------- scene & camera
  const scene = new T.Scene();
  scene.fog = new T.Fog('#c47a5e', 60, 680);
  const camera = new T.PerspectiveCamera(68, 1, 0.1, 4000);

  // ---------- sky
  const skyUniforms = {
    uZenith: { value: new T.Color() }, uHorizon: { value: new T.Color() }, uGlow: { value: new T.Color() },
    uSunDir: { value: new V3(0, 0.1, -1) }, uSunCol: { value: new T.Color() }, uSunVis: { value: 1 },
    uMoonDir: { value: new V3(0.4, 0.6, -0.7).normalize() }, uMoonVis: { value: 0 },
    uStars: { value: 0 }, uTime: { value: 0 },
    uCloudLit: { value: new T.Color() }, uCloudShade: { value: new T.Color() }, uCloudAmt: { value: 0.6 },
  };
  const skyMat = new T.ShaderMaterial({
    uniforms: skyUniforms, side: T.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform vec3 uZenith,uHorizon,uGlow,uSunDir,uSunCol,uMoonDir,uCloudLit,uCloudShade;
      uniform float uSunVis,uMoonVis,uStars,uTime,uCloudAmt;
      varying vec3 vDir;
      float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      float n2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x),f.y); }
      float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*n2(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return v; }
      float h31(vec3 p){ p=fract(p*0.1031); p+=dot(p,p.yzx+33.33); return fract((p.x+p.y)*p.z); }
      void main(){
        vec3 d = normalize(vDir); float y = d.y; float hy = max(y,0.0);
        vec3 col = mix(uHorizon, uZenith, pow(hy, 0.42));
        float sd = max(dot(d,uSunDir),0.0);
        col += uGlow * pow(sd,5.0) * (1.0 - hy*0.8);
        col += uSunCol * pow(sd,60.0) * 0.45 * uSunVis;
        vec2 uv = d.xz / (hy + 0.09);
        float c = fbm(uv*0.5 + vec2(uTime*0.006, uTime*0.0025));
        float band = smoothstep(0.015,0.16,hy) * (1.0 - smoothstep(0.32,0.72,hy));
        float cm = smoothstep(0.56 - uCloudAmt*0.12, 0.86, c) * band;
        vec3 cc = mix(uCloudShade, uCloudLit, clamp(pow(sd,3.0)*1.3 + (c-0.55)*1.4, 0.0, 1.0));
        col = mix(col, cc, cm*0.88);
        vec3 sp = floor(d*420.0); float s = h31(sp);
        float tw = 0.65 + 0.35*sin(uTime*1.7 + s*80.0);
        col += vec3(0.86,0.9,1.0) * step(0.9974, s) * tw * uStars * smoothstep(0.03,0.25,hy) * (1.0-cm);
        float disc = smoothstep(0.99955, 0.99975, dot(d,uSunDir));
        col += uSunCol * disc * 6.0 * uSunVis * step(-0.005, y);
        float md = dot(d,uMoonDir);
        col += vec3(0.95,0.93,0.88) * smoothstep(0.99935,0.9996,md) * 1.8 * uMoonVis;
        col += vec3(0.45,0.55,0.8) * pow(max(md,0.0),300.0) * 0.5 * uMoonVis;
        if (y < 0.0) col = mix(uHorizon, uHorizon*0.82, clamp(-y*5.0,0.0,1.0));
        gl_FragColor = vec4(col,1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`,
  });
  const skyGeo = new T.SphereGeometry(1500, 48, 24);
  const sky = new T.Mesh(skyGeo, skyMat); sky.renderOrder = -1; sky.frustumCulled = false;
  scene.add(sky);
  const envScene = new T.Scene(); envScene.add(new T.Mesh(skyGeo, skyMat));
  const pmrem = new T.PMREMGenerator(renderer);
  let envRT = null;
  function refreshEnv() {
    const rt = pmrem.fromScene(envScene, 0.02, 0.1, 4000);
    scene.environment = rt.texture;
    if (envRT) envRT.dispose();
    envRT = rt;
  }

  // ---------- ocean
  const WAVES = [[1.0, 0.35, 0.11, 42], [0.6, -0.8, 0.09, 24], [-0.4, 1.0, 0.08, 14], [0.9, 0.1, 0.06, 7.5], [-0.7, -0.5, 0.04, 4.2]]
    .map(([x, z, s, l]) => { const n = Math.hypot(x, z); return [x / n, z / n, s, l]; });
  const flow = new T.Vector2(0, 0);
  const oceanUniforms = {
    uTime: { value: 0 }, uFlow: { value: flow },
    uWaves: { value: WAVES.map((w) => new T.Vector4(w[0], w[1], w[2], w[3])) },
    uCam: { value: new V3() }, uKeyDir: { value: new V3(0, 0.2, -1) }, uKeyCol: { value: new T.Color() },
    uDeep: { value: new T.Color() }, uShallow: { value: new T.Color() }, uHorizon: { value: new T.Color() },
    uZenith: { value: new T.Color() }, uFog: { value: new T.Color() }, uGlow: { value: new T.Color() },
    uFogNear: { value: 60 }, uFogFar: { value: 780 }, uGlint: { value: 1 }, uBoat: { value: new V3() },
  };
  const oceanMat = new T.ShaderMaterial({
    uniforms: oceanUniforms,
    vertexShader: `
      uniform float uTime; uniform vec2 uFlow; uniform vec4 uWaves[5];
      varying vec3 vWorld; varying vec3 vN; varying float vH;
      const float PI = 3.14159265;
      void main(){
        vec3 p = position; vec3 g = p;
        vec3 tg = vec3(1.0,0.0,0.0); vec3 bn = vec3(0.0,0.0,1.0);
        vec2 q = p.xz + uFlow;
        for (int i=0;i<5;i++){
          vec4 w = uWaves[i];
          float k = 2.0*PI/w.w; float c = sqrt(9.8/k); vec2 d = w.xy;
          float f = k*(dot(d,q) - c*uTime); float a = w.z/k;
          float s = sin(f), co = cos(f);
          g.x += d.x*a*co; g.y += a*s; g.z += d.y*a*co;
          tg += vec3(-d.x*d.x*w.z*s, d.x*w.z*co, -d.x*d.y*w.z*s);
          bn += vec3(-d.x*d.y*w.z*s, d.y*w.z*co, -d.y*d.y*w.z*s);
        }
        vN = normalize(cross(bn, tg)); vH = g.y / 1.1;
        vec4 wp = modelMatrix * vec4(g,1.0); vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float uTime, uFogNear, uFogFar, uGlint; uniform vec2 uFlow;
      uniform vec3 uCam, uKeyDir, uKeyCol, uDeep, uShallow, uHorizon, uZenith, uFog, uGlow, uBoat;
      varying vec3 vWorld; varying vec3 vN; varying float vH;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n2(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),u.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),u.x),u.y); }
      float halfW(float z){ if (z > -1.0) return 2.3; return 2.3*sqrt(clamp((z+5.2)/4.2,0.0,1.0)); }
      void main(){
        vec3 V = normalize(uCam - vWorld); float dist = length(uCam - vWorld);
        vec3 N = normalize(vN);
        float fade = 1.0 - smoothstep(18.0, 160.0, dist);
        vec2 q = vWorld.xz + uFlow;
        vec2 q1 = q*0.9 + vec2(uTime*0.5, uTime*0.3); vec2 q2 = q*2.4 - vec2(uTime*0.7, uTime*0.2);
        float e = 0.15;
        float nx = (n2(q1+vec2(e,0.0)) - n2(q1-vec2(e,0.0))) + 0.5*(n2(q2+vec2(e,0.0)) - n2(q2-vec2(e,0.0)));
        float nz = (n2(q1+vec2(0.0,e)) - n2(q1-vec2(0.0,e))) + 0.5*(n2(q2+vec2(0.0,e)) - n2(q2-vec2(0.0,e)));
        N = normalize(N + vec3(nx, 0.0, nz) * 0.55 * fade);
        float fres = 0.02 + 0.98*pow(1.0 - clamp(dot(N,V),0.0,1.0), 5.0);
        vec3 R = reflect(-V, N); R.y = abs(R.y);
        vec3 sky = mix(uHorizon, uZenith, pow(clamp(R.y,0.0,1.0), 0.45));
        float sd = max(dot(R, uKeyDir), 0.0);
        sky += uGlow * pow(sd, 6.0) * 0.55;
        vec3 body = mix(uDeep, uShallow, clamp(vH*0.45 + 0.35, 0.0, 1.0));
        float sss = pow(max(dot(V, -uKeyDir), 0.0), 3.0) * clamp(vH*0.7 + 0.3, 0.0, 1.0);
        body += uShallow * sss * 0.45 * uGlint;
        vec3 col = mix(body, sky, fres);
        col += uKeyCol * (pow(sd, 800.0)*16.0 + pow(sd, 90.0)*0.5) * uGlint;
        float fn = n2(q*1.4 + uTime*0.2)*0.6 + n2(q*3.1 - uTime*0.3)*0.4;
        float foam = smoothstep(0.66, 1.05, vH*0.7 + fn*0.5) * 0.6;
        vec2 rel = vWorld.xz - uBoat.xy; float cy = cos(uBoat.z), sy = sin(uBoat.z);
        vec2 loc = vec2(cy*rel.x - sy*rel.y, sy*rel.x + cy*rel.y);
        float hw = halfW(loc.y) * 0.95;
        float onHull = step(-5.5, loc.y) * step(loc.y, 8.0);
        float hullFoam = onHull * (1.0 - smoothstep(0.0, 0.7 + fn*0.9, abs(abs(loc.x) - hw)));
        float bow = 1.0 - smoothstep(0.0, 1.8, length(loc - vec2(0.0, -5.5)));
        foam = max(foam, max(hullFoam*0.85, bow*0.8) * (0.5 + 0.5*fn));
        vec3 foamCol = uKeyCol*0.28 + uZenith*0.3 + uHorizon*0.55;
        col = mix(col, foamCol, clamp(foam, 0.0, 1.0));
        col = mix(col, uFog, smoothstep(uFogNear, uFogFar, dist));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`,
  });
  const oceanGeo = (() => {
    const N = 280, EXT = 950; const g = new T.PlaneGeometry(2, 2, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setXYZ(i, Math.sign(x) * Math.pow(Math.abs(x), 2.4) * EXT, 0, Math.sign(z) * Math.pow(Math.abs(z), 2.4) * EXT);
    }
    return g;
  })();
  const ocean = new T.Mesh(oceanGeo, oceanMat); ocean.frustumCulled = false; scene.add(ocean);
  function waveHeight(x, z, t) {
    let y = 0;
    for (const w of WAVES) {
      const k = 2 * Math.PI / w[3], c = Math.sqrt(9.8 / k), a = w[2] / k;
      y += a * Math.sin(k * (w[0] * (x + flow.x) + w[1] * (z + flow.y) - c * t));
    }
    return y;
  }

  // ---------- lights
  const hemi = new T.HemisphereLight('#ffffff', '#222222', 0.8); scene.add(hemi);
  const keyLight = new T.DirectionalLight('#ffffff', 2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  Object.assign(keyLight.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 90 });
  keyLight.shadow.bias = -0.0004; keyLight.shadow.normalBias = 0.03;
  scene.add(keyLight); scene.add(keyLight.target);

  // ---------- ship
  const DECK = 1.4, Z_BOW = -5.2, Z_AFT = 7.5;
  const halfW = (z) => (z > -1 ? 2.3 : 2.3 * Math.sqrt(Math.max(0, (z - Z_BOW) / (-1 - Z_BOW))));
  const railH = (z) => 0.95 + 0.42 * Math.pow(clamp((-1 - z) / (-1 - Z_BOW), 0, 1), 1.6);
  const zs = []; for (let i = 0; i <= 80; i++) zs.push(Z_BOW + (Z_AFT - Z_BOW) * Math.pow(i / 80, 1.5));
  function strip(rowA, rowB, uvA, uvB, flip) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i < rowA.length; i++) {
      pos.push(rowA[i].x, rowA[i].y, rowA[i].z, rowB[i].x, rowB[i].y, rowB[i].z);
      uv.push(uvA[i][0], uvA[i][1], uvB[i][0], uvB[i][1]);
      if (i > 0) { const k = i * 2; if (flip) idx.push(k - 2, k - 1, k, k - 1, k + 1, k); else idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  function rod(a, b, r0, r1, mat, seg = 8) {
    const d = new V3().subVectors(b, a); const len = d.length();
    const m = new T.Mesh(new T.CylinderGeometry(r1, r0, len, seg), mat);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
    return m;
  }

  const yawGroup = new T.Group(); scene.add(yawGroup);
  const ship = new T.Group(); yawGroup.add(ship);
  ship.rotation.order = 'YXZ';

  {
    const Lp = zs.map((z) => new V3(-halfW(z), DECK, z)), R = zs.map((z) => new V3(halfW(z), DECK, z));
    const deck = new T.Mesh(strip(Lp, R, Lp.map((p) => [p.x * 0.35, p.z * 0.35]), R.map((p) => [p.x * 0.35, p.z * 0.35])), mats.deck);
    deck.receiveShadow = true; ship.add(deck);
  }
  const railPts = [];
  [-1, 1].forEach((s) => {
    const bottom = zs.map((z) => new V3(s * halfW(z), DECK, z));
    const top = zs.map((z) => new V3(s * halfW(z) * 0.985, DECK + railH(z), z));
    const wall = new T.Mesh(strip(bottom, top, bottom.map((p) => [0, p.z * 0.32]), top.map((p) => [0.9, p.z * 0.32])), mats.wall);
    wall.receiveShadow = true; wall.castShadow = true; ship.add(wall);
    const outTop = zs.map((z) => new V3(s * (halfW(z) + 0.1), DECK + railH(z), z));
    const outBot = zs.map((z) => new V3(s * halfW(z) * 0.93, -0.5, z));
    const hull = new T.Mesh(strip(outTop, outBot, outTop.map((p) => [p.z * 0.2, 1]), outBot.map((p) => [p.z * 0.2, 0])), mats.hull);
    ship.add(hull);
  });
  for (let i = zs.length - 1; i >= 0; i--) railPts.push(new V3(-(halfW(zs[i]) + 0.04), DECK + railH(zs[i]) + 0.03, zs[i]));
  for (let i = 1; i < zs.length; i++) railPts.push(new V3(halfW(zs[i]) + 0.04, DECK + railH(zs[i]) + 0.03, zs[i]));
  {
    const rail = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(railPts, false, 'centripetal'), 320, 0.075, 8), mats.rail);
    rail.castShadow = true; ship.add(rail);
    const frame = new T.Mesh(new T.BoxGeometry(1.1, 0.1, 1.0), mats.woodDark); frame.position.set(0, DECK + 0.05, -2.9); frame.receiveShadow = true; ship.add(frame);
    for (let i = -2; i <= 2; i++) {
      const a = new T.Mesh(new T.BoxGeometry(0.04, 0.03, 0.9), mats.rail); a.position.set(i * 0.2, DECK + 0.11, -2.9); ship.add(a);
      const b = new T.Mesh(new T.BoxGeometry(1.0, 0.03, 0.04), mats.rail); b.position.set(0, DECK + 0.12, -2.9 + i * 0.18); ship.add(b);
    }
  }
  const stemTop = new V3(0, DECK + railH(Z_BOW) + 0.3, Z_BOW + 0.05);
  ship.add(rod(new V3(0, DECK, Z_BOW + 0.1), stemTop, 0.12, 0.1, mats.rail));
  const bsStart = new V3(0, DECK + railH(Z_BOW) - 0.05, Z_BOW + 0.4);
  const bsDir = new V3(0, 0.3, -1).normalize();
  const bsTip = bsStart.clone().addScaledVector(bsDir, 6.8);
  ship.add(rod(bsStart, bsTip, 0.15, 0.07, mats.rail, 10));
  ship.add(rod(bsTip, new V3(0, 20, 1.2), 0.018, 0.018, mats.rope, 5));
  ship.add(rod(bsStart.clone().addScaledVector(bsDir, 3.6), new V3(0, 16, 0.4), 0.016, 0.016, mats.rope, 5));
  ship.add(rod(bsTip, new V3(0, 0.2, Z_BOW + 0.2), 0.02, 0.02, mats.rope, 5));
  [-1, 1].forEach((s) => ship.add(rod(new V3(s * (halfW(-3.4) + 0.05), DECK + railH(-3.4), -3.4), new V3(s * 0.4, 16, 1.2), 0.014, 0.014, mats.rope, 5)));
  // a jib on the forestay carries the sail color
  const jib = (() => {
    const a = bsStart.clone().addScaledVector(bsDir, 3.6), b = new V3(0, 16, 0.4), c = new V3(0, 8.5, 0.6);
    const g = new T.BufferGeometry().setFromPoints([a, b, c]);
    g.setIndex([0, 1, 2]); g.computeVertexNormals();
    const m = new T.Mesh(g, mats.sail); m.castShadow = true; ship.add(m); return m;
  })();

  const lanterns = [];
  function makeLantern(scale = 1, lightDist = 6) {
    const g = new T.Group();
    const glass = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.16, 10), mats.glass); glass.position.y = 0.1; g.add(glass);
    const base = new T.Mesh(new T.CylinderGeometry(0.09, 0.1, 0.03, 10), mats.iron); base.position.y = 0.01; g.add(base);
    const top = new T.Mesh(new T.ConeGeometry(0.1, 0.09, 10), mats.iron); top.position.y = 0.225; g.add(top);
    for (let i = 0; i < 4; i++) {
      const bar = new T.Mesh(new T.BoxGeometry(0.012, 0.17, 0.012), mats.iron);
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4; bar.position.set(Math.cos(a) * 0.072, 0.1, Math.sin(a) * 0.072); g.add(bar);
    }
    const light = new T.PointLight('#ffb461', 1, lightDist, 2); light.position.y = 0.1; g.add(light);
    const glow = new T.Sprite(glowMat.clone()); glow.scale.set(0.8, 0.8, 1); glow.position.y = 0.1; g.add(glow);
    g.scale.setScalar(scale);
    lanterns.push({ light, glow });
    return g;
  }
  [-1, 1].forEach((s) => {
    const z = -2.4; const x = s * (halfW(z) - 0.1); const y = DECK + railH(z) + 0.08;
    ship.add(rod(new V3(x, DECK + railH(z) - 0.05, z), new V3(x, y, z), 0.03, 0.03, mats.iron));
    const l = makeLantern(1.15); l.position.set(x, y, z); ship.add(l);
  });
  { const l = makeLantern(1.1, 7); l.position.copy(stemTop); ship.add(l); }

  const WHEEL_Z = -0.2, WHEEL_Y = DECK + 1.15;
  const wheel = new T.Group();
  {
    wheel.add(new T.Mesh(new T.TorusGeometry(0.46, 0.038, 12, 64), mats.woodDark));
    const band = new T.Mesh(new T.TorusGeometry(0.46, 0.013, 8, 64), mats.brass); band.position.z = 0.034; wheel.add(band);
    wheel.add(new T.Mesh(new T.TorusGeometry(0.2, 0.02, 8, 40), mats.woodDark));
    const hub = new T.Mesh(new T.CylinderGeometry(0.075, 0.075, 0.14, 20), mats.brass); hub.rotation.x = Math.PI / 2; wheel.add(hub);
    const cap = new T.Mesh(new T.SphereGeometry(0.05, 16, 12), mats.brass); cap.position.z = 0.07; wheel.add(cap);
    const handleGeo = new T.LatheGeometry([[0.001, 0], [0.024, 0], [0.03, 0.02], [0.021, 0.05], [0.034, 0.095], [0.026, 0.145], [0.03, 0.17], [0.001, 0.19]].map((p) => new T.Vector2(p[0], p[1])), 16);
    for (let i = 0; i < 8; i++) {
      const arm = new T.Group(); arm.rotation.z = (i / 8) * Math.PI * 2;
      const spoke = new T.Mesh(new T.CylinderGeometry(0.018, 0.024, 0.44, 10), mats.woodDark); spoke.position.y = 0.24; arm.add(spoke);
      const handle = new T.Mesh(handleGeo, mats.woodDark); handle.position.y = 0.48; arm.add(handle);
      wheel.add(arm);
    }
    wheel.position.set(0, WHEEL_Y, WHEEL_Z);
    wheel.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    ship.add(wheel);
    const ped = new T.Mesh(new T.BoxGeometry(0.22, 1.08, 0.28), mats.woodDark); ped.position.set(0, DECK + 0.54, WHEEL_Z - 0.1);
    ped.castShadow = true; ped.receiveShadow = true; ship.add(ped);
  }

  // avatar
  const AV_Z = 0.42;
  const avatar = new T.Group(); avatar.position.set(0, DECK, AV_Z); ship.add(avatar);
  const avParts = { tails: [] };
  {
    const add = (m) => { m.castShadow = true; avatar.add(m); return m; };
    [-1, 1].forEach((s) => {
      const boot = add(new T.Mesh(new T.BoxGeometry(0.13, 0.13, 0.25), mats.boots)); boot.position.set(s * 0.11, 0.065, -0.03);
      const leg = add(new T.Mesh(new T.CapsuleGeometry(0.075, 0.6, 6, 12), mats.trousers)); leg.position.set(s * 0.11, 0.47, 0);
    });
    const coat = add(new T.Mesh(new T.LatheGeometry([[0.001, 1.47], [0.2, 1.45], [0.235, 1.33], [0.215, 1.12], [0.22, 0.98], [0.26, 0.8], [0.31, 0.52]].map((p) => new T.Vector2(p[0], p[1])), 36), mats.coat));
    coat.scale.z = 0.8; avParts.coat = coat;
    const hem = add(new T.Mesh(new T.TorusGeometry(0.31, 0.012, 6, 48), mats.trim)); hem.rotation.x = Math.PI / 2; hem.position.y = 0.52; hem.scale.set(1, 0.8, 1);
    const belt = add(new T.Mesh(new T.TorusGeometry(0.222, 0.026, 8, 40), mats.belt)); belt.rotation.x = Math.PI / 2; belt.position.y = 0.99; belt.scale.set(1, 0.8, 1);
    const shoulders = add(new T.Mesh(new T.CapsuleGeometry(0.088, 0.26, 6, 12), mats.coat)); shoulders.rotation.z = Math.PI / 2; shoulders.position.y = 1.41; shoulders.scale.z = 0.85;
    const neck = add(new T.Mesh(new T.CylinderGeometry(0.045, 0.05, 0.1, 12), mats.skin)); neck.position.y = 1.53;
    const head = new T.Group(); head.position.y = 1.64; avatar.add(head); avParts.head = head;
    const skull = new T.Mesh(new T.SphereGeometry(0.112, 24, 18), mats.skin); skull.scale.set(0.95, 1.05, 1); skull.castShadow = true; head.add(skull);
    [-1, 1].forEach((s) => { const ear = new T.Mesh(new T.SphereGeometry(0.024, 10, 8), mats.skin); ear.position.set(s * 0.106, -0.01, 0.005); head.add(ear); });
    const hair = new T.Mesh(new T.SphereGeometry(0.119, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.64), mats.hair); hair.rotation.x = 0.55; hair.position.set(0, 0.008, 0.01); head.add(hair);
    const band = new T.Mesh(new T.SphereGeometry(0.124, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.36), mats.bandana); band.rotation.x = 0.35; band.position.y = 0.012; head.add(band);
    avParts.headwear = band;
    const knot = new T.Mesh(new T.SphereGeometry(0.028, 12, 10), mats.bandana); knot.position.set(0, 0.015, 0.118); head.add(knot);
    [-1, 1].forEach((s) => {
      const g = new T.PlaneGeometry(0.042, 0.17, 1, 8); g.translate(0, -0.085, 0);
      const tail = new T.Mesh(g, mats.bandana); tail.position.set(s * 0.012, 0.015, 0.125); tail.rotation.y = s * 0.3;
      tail.userData.base = g.attributes.position.array.slice(); tail.userData.phase = s * 1.7; head.add(tail); avParts.tails.push(tail);
    });
    const limb = (a, b, r, mat) => {
      const d = new V3().subVectors(b, a); const len = d.length();
      const m = new T.Mesh(new T.CapsuleGeometry(r, Math.max(0.01, len - r), 6, 12), mat);
      m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); m.castShadow = true;
      avatar.add(m); return m;
    };
    [-1, 1].forEach((s) => {
      const S = new V3(s * 0.19, 1.4, 0.0);
      const H = new V3(s * 0.46 * Math.sin(Math.PI / 3), WHEEL_Y - DECK + 0.46 * Math.cos(Math.PI / 3), WHEEL_Z - AV_Z + 0.035);
      const E = new V3().lerpVectors(S, H, 0.5).add(new V3(s * 0.08, -0.08, 0.03));
      limb(S, E, 0.055, mats.coat);
      const W = new V3().lerpVectors(E, H, 0.82);
      limb(E, W, 0.048, mats.coat);
      limb(W, new V3().lerpVectors(E, H, 0.93), 0.05, mats.cuff);
      const hand = new T.Mesh(new T.SphereGeometry(0.043, 14, 10), mats.skin); hand.scale.set(1, 0.85, 1.15); hand.position.copy(H); hand.castShadow = true; avatar.add(hand);
    });
  }

  // barrel with the log book, crate with the charts
  const barrel = new T.Group(); barrel.position.set(-1.25, DECK, -1.3); ship.add(barrel);
  {
    const body = new T.Mesh(new T.LatheGeometry([[0.27, 0], [0.31, 0.2], [0.33, 0.42], [0.31, 0.64], [0.27, 0.84]].map((p) => new T.Vector2(p[0], p[1])), 28), mats.stave);
    body.castShadow = true; body.receiveShadow = true; barrel.add(body);
    const lid = new T.Mesh(new T.CylinderGeometry(0.265, 0.265, 0.02, 28), mats.woodDark); lid.position.y = 0.84; barrel.add(lid);
    [[0.07, 0.29], [0.3, 0.325], [0.55, 0.325], [0.78, 0.28]].forEach(([y, r]) => { const h = new T.Mesh(new T.TorusGeometry(r, 0.012, 6, 32), mats.iron); h.rotation.x = Math.PI / 2; h.position.y = y; barrel.add(h); });
    const book = new T.Group(); book.position.set(0.02, 0.86, 0.02); book.rotation.y = 0.5; barrel.add(book);
    const cover = new T.Mesh(new T.BoxGeometry(0.44, 0.02, 0.3), mats.leather); cover.position.y = 0.01; cover.castShadow = true; book.add(cover);
    [-1, 1].forEach((s) => {
      const g = new T.PlaneGeometry(0.2, 0.28, 8, 1); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + 0.1) / 0.2; p.setZ(i, 0.022 * Math.sin(Math.PI * u) + (s < 0 ? u : 1 - u) * 0.01); }
      g.computeVertexNormals();
      const page = new T.Mesh(g, mats.page); page.rotation.x = -Math.PI / 2; page.position.set(s * 0.105, 0.024, 0); book.add(page);
    });
    const rib = new T.Mesh(new T.PlaneGeometry(0.018, 0.16), mats.ribbon); rib.position.set(0, 0.0, 0.2); rib.rotation.x = -0.9; book.add(rib);
    const lamp = makeLantern(0.75, 3.2); lamp.position.set(-0.17, 0.85, -0.08); barrel.add(lamp);
  }
  const crate = new T.Group(); crate.position.set(1.25, DECK, -1.35); crate.rotation.y = -0.35; ship.add(crate);
  {
    const box = new T.Mesh(new T.BoxGeometry(0.72, 0.62, 0.52), mats.stave); box.position.y = 0.31; box.castShadow = true; box.receiveShadow = true; crate.add(box);
    [0.1, 0.52].forEach((y) => { const b = new T.Mesh(new T.BoxGeometry(0.74, 0.05, 0.54), mats.woodDark); b.position.y = y; crate.add(b); });
    const g = new T.PlaneGeometry(0.64, 0.44, 12, 1); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + 0.32) / 0.64; p.setZ(i, 0.03 * (Math.pow(1 - u, 6) + Math.pow(u, 6))); }
    g.computeVertexNormals();
    const chart = new T.Mesh(g, mats.map); chart.rotation.x = -Math.PI / 2; chart.position.y = 0.625; crate.add(chart);
    [-1, 1].forEach((s) => { const roll = new T.Mesh(new T.CylinderGeometry(0.032, 0.032, 0.46, 12), mats.map); roll.rotation.x = Math.PI / 2; roll.position.set(s * 0.33, 0.655, 0); crate.add(roll); });
    const compass = new T.Mesh(new T.CylinderGeometry(0.065, 0.07, 0.025, 24), mats.brass); compass.position.set(0.14, 0.64, 0.08); crate.add(compass);
  }

  // leaks on deck: up to four puddles, shown by condition
  const puddles = [[0.55, -2.1, 0.34, 0], [-0.45, -3.8, 0.26, 0.7], [-0.7, 1.2, 0.3, 1.4], [0.9, 0.6, 0.28, 2.1]].map(([x, z, r, rot]) => {
    const m = new T.Mesh(new T.CircleGeometry(r, 36), mats.puddle);
    m.rotation.x = -Math.PI / 2; m.position.set(x, DECK + 0.012, z); m.scale.set(1.5, 1, 1); m.rotation.z = rot;
    m.visible = false; ship.add(m); return m;
  });

  // ---------- islands (built from state) and the cove (a fixed landmark)
  function terrain(radius, height, seed, rockBias = 0) {
    const g = new T.IcosahedronGeometry(1, 4); const p = g.attributes.position; const col = []; const c = new T.Color();
    const sand = new T.Color('#c9a86b'), grass = new T.Color('#3f6b36'), rock = new T.Color('#6f6a62'), dark = new T.Color('#2f4a2a');
    const v = new V3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = noise3(v.x * 2.1 + seed, v.y * 2.1, v.z * 2.1) * 0.6 + noise3(v.x * 5 + seed, v.y * 5, v.z * 5) * 0.4;
      let y = v.y < 0 ? v.y * 0.1 : v.y; y = y * height * (0.6 + n * 0.8);
      const r = radius * (0.8 + n * 0.4);
      p.setXYZ(i, v.x * r, y - 0.6, v.z * r);
      const t = y / height;
      if (t < 0.07) c.copy(sand); else if (n + rockBias > 0.72) c.copy(rock); else c.lerpColors(grass, dark, clamp(t, 0, 1));
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    return new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
  }
  const leafGeo = (() => {
    const g = new T.PlaneGeometry(1.0, 4.4, 1, 10); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = (p.getY(i) + 2.2) / 4.4; const out = t * 4.4; p.setXYZ(i, p.getX(i) * (1 - t * 0.7), out * 0.42 - 2.6 * t * t, out); }
    g.computeVertexNormals(); return g;
  })();
  function palm(r) {
    const g = new T.Group(); const h = 5 + r() * 2.5; const lean = (r() - 0.5) * 1.6;
    const curve = new T.CatmullRomCurve3([new V3(0, 0, 0), new V3(lean * 0.3, h * 0.4, 0), new V3(lean * 0.8, h * 0.8, 0), new V3(lean, h, 0)]);
    g.add(new T.Mesh(new T.TubeGeometry(curve, 10, 0.22, 6), mats.trunk));
    const top = curve.getPoint(1);
    for (let i = 0; i < 7; i++) { const leaf = new T.Mesh(leafGeo, mats.leaf); leaf.position.copy(top); leaf.rotation.y = (i / 7) * Math.PI * 2 + r() * 0.3; g.add(leaf); }
    return g;
  }
  const flags = [];
  function flag(h) {
    const g = new T.Group();
    g.add(rod(new V3(0, 0, 0), new V3(0, h, 0), 0.08, 0.06, mats.woodDark));
    const cloth = new T.Mesh(new T.PlaneGeometry(2.4, 1.4, 10, 3), mats.flag);
    cloth.geometry.translate(1.2, 0, 0); cloth.position.set(0, h - 0.8, 0); g.add(cloth);
    cloth.userData.base = cloth.geometry.attributes.position.array.slice(); flags.push(cloth);
    return g;
  }
  function placeAt(obj, bearingDeg, dist) { const b = bearingDeg * D2R; obj.position.set(Math.sin(b) * dist, 0, -Math.cos(b) * dist); scene.add(obj); return obj; }
  function seedFrom(id) { let h = 7; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return Math.abs(h) || 1; }
  const islandMeshes = new Map(); // id -> group
  function buildIsland(island, index) {
    const seed = seedFrom(island.id); const r = rng(seed);
    const g = new T.Group();
    g.add(terrain(14 + (seed % 6), 7 + (seed % 5), (seed % 97) / 10, index % 2 ? 0.25 : 0));
    const palms = 2 + (seed % 3);
    for (let i = 0; i < palms; i++) { const pm = palm(r); pm.position.set((r() - 0.5) * 10, 1.5 + r() * 2, (r() - 0.5) * 10); pm.scale.setScalar(1.1); g.add(pm); }
    const f = flag(7); f.position.set(-6 + r() * 4, 1.5, 2); g.add(f);
    g.userData.id = island.id;
    return placeAt(g, island.bearingDeg, 150 + index * 20);
  }
  function syncIslands(state) {
    const seen = new Set();
    state.islands.forEach((island, index) => {
      seen.add(island.id);
      let g = islandMeshes.get(island.id);
      if (!g) { g = buildIsland(island, index); islandMeshes.set(island.id, g); }
      else { const b = island.bearingDeg * D2R; const d = 150 + index * 20; g.position.set(Math.sin(b) * d, 0, -Math.cos(b) * d); }
    });
    for (const [id, g] of islandMeshes) if (!seen.has(id)) { scene.remove(g); islandMeshes.delete(id); }
  }

  const cove = new T.Group();
  const beams = [];
  {
    cove.add(terrain(14, 7, 3.3, 0.35));
    const tower = new T.Mesh(new T.CylinderGeometry(1.2, 1.9, 14, 16), mats.stripes); tower.position.set(-2, 11, 0); cove.add(tower);
    const lamp = new T.Mesh(new T.CylinderGeometry(1.0, 1.0, 1.6, 12), mats.glass); lamp.position.set(-2, 18.8, 0); cove.add(lamp);
    const roof = new T.Mesh(new T.ConeGeometry(1.35, 1.6, 12), mats.iron); roof.position.set(-2, 20.4, 0); cove.add(roof);
    const lampGlow = new T.Sprite(glowMat.clone()); lampGlow.position.set(-2, 18.8, 0); lampGlow.scale.set(14, 14, 1); cove.add(lampGlow); cove.userData.glow = lampGlow;
    const beamMat = new T.ShaderMaterial({
      uniforms: { uOp: { value: 0 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float uOp; varying vec2 vUv; void main(){ float a = pow(vUv.y, 1.8) * uOp; gl_FragColor = vec4(vec3(1.0,0.86,0.6)*a, a); }',
    });
    const beamGeo = new T.ConeGeometry(7, 110, 24, 1, true); beamGeo.translate(0, -55, 0); beamGeo.rotateX(-Math.PI / 2);
    const spin = new T.Group(); spin.position.set(-2, 18.8, 0); cove.add(spin);
    [0, Math.PI].forEach((a) => { const b = new T.Mesh(beamGeo, beamMat); b.rotation.y = a; spin.add(b); });
    beams.push({ spin, mat: beamMat });
  }
  placeAt(cove, -16, 118);

  // gulls
  const gulls = [];
  {
    const gullMat = new T.MeshBasicMaterial({ color: '#2a2630', side: T.DoubleSide, fog: false });
    const wing = new T.PlaneGeometry(0.9, 0.22); wing.translate(0.45, 0, 0);
    for (let i = 0; i < 4; i++) {
      const b = new T.Group(); const l = new T.Mesh(wing, gullMat); const r = new T.Mesh(wing, gullMat); r.scale.x = -1;
      b.add(l, r); b.userData = { l, r, phase: i * 1.9, rad: 7 + i * 2.2, h: 13 + i * 1.6, sp: 0.22 + i * 0.03 };
      scene.add(b); gulls.push(b);
    }
  }

  // ---------- time of day palette
  const KEYS = [
    { e: -18, zen: '#03060d', hor: '#141e34', glow: '#0a0f1c', fog: '#0f1729', key: '#8fa6dd', keyI: 0.5, hs: '#22335a', hg: '#060708', hi: 0.4, deep: '#020a14', sh: '#0a2638', lan: 2.4, stars: 1, glint: 0.55, exp: 1.05, cl: '#26344f', cs: '#0a101d', ca: 0.3 },
    { e: -8, zen: '#0b1430', hor: '#3a436d', glow: '#6e4a5c', fog: '#333c61', key: '#7d8cc0', keyI: 0.45, hs: '#48578a', hg: '#0f0c0e', hi: 0.55, deep: '#051322', sh: '#16384f', lan: 1.9, stars: 0.55, glint: 0.3, exp: 1.0, cl: '#8a6a82', cs: '#2a3050', ca: 0.5 },
    { e: -1, zen: '#1d2c5a', hor: '#f08a52', glow: '#ff7a3d', fog: '#c77a62', key: '#ff7a3a', keyI: 1.9, hs: '#ff9d72', hg: '#24181a', hi: 0.7, deep: '#0b2034', sh: '#2a5e72', lan: 1.1, stars: 0, glint: 1.0, exp: 1.0, cl: '#ffb07a', cs: '#5a4060', ca: 0.7 },
    { e: 8, zen: '#3a66a8', hor: '#ffc58e', glow: '#ffb068', fog: '#e0b392', key: '#ffb46a', keyI: 2.6, hs: '#ffd6ad', hg: '#382a20', hi: 0.9, deep: '#0b3350', sh: '#2c8796', lan: 0.25, stars: 0, glint: 1.0, exp: 0.95, cl: '#fff0dc', cs: '#b88a7a', ca: 0.6 },
    { e: 32, zen: '#2a73c6', hor: '#b8dcf0', glow: '#fff4e0', fog: '#c4e0ee', key: '#fff2de', keyI: 3.0, hs: '#cfe6ff', hg: '#5a4a3a', hi: 1.0, deep: '#093f63', sh: '#1d97ad', lan: 0, stars: 0, glint: 0.9, exp: 0.9, cl: '#ffffff', cs: '#9fb6c8', ca: 0.55 },
  ];
  const COLOR_FIELDS = ['zen', 'hor', 'glow', 'fog', 'key', 'hs', 'hg', 'deep', 'sh', 'cl', 'cs'];
  KEYS.forEach((k) => COLOR_FIELDS.forEach((f) => { k[f] = new T.Color(k[f]); }));
  const pal = {}; COLOR_FIELDS.forEach((f) => { pal[f] = new T.Color(); });
  const GULL_INK = new T.Color('#1d1a22');
  const now0 = new Date();
  function dayOfYear(d) { return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5); }
  const dstNoon = (() => {
    const y = now0.getFullYear(); const jan = new Date(y, 0, 1).getTimezoneOffset(), jul = new Date(y, 6, 1).getTimezoneOffset();
    return now0.getTimezoneOffset() < Math.max(jan, jul) ? 13 : 12;
  })();
  const dirFrom = (azDeg, elDeg) => { const a = azDeg * D2R, e = elDeg * D2R; return new V3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)); };
  let sunEl = 0, lanternLevel = 0, lastEnvEl = 999, lastEnvAt = 0;

  function applyTime(t, hours) {
    const { el, az } = L.solar(hours, dayOfYear(now0), dstNoon);
    sunEl = el;
    let i = 0; while (i < KEYS.length - 2 && el > KEYS[i + 1].e) i++;
    const a = KEYS[i], b = KEYS[i + 1]; const f = smooth(a.e, b.e, el);
    COLOR_FIELDS.forEach((k) => pal[k].lerpColors(a[k], b[k], f));
    const num = (k) => lerp(a[k], b[k], f);
    const sunDir = dirFrom(az, el);
    const moonDir = dirFrom(24, clamp(-el * 0.9, 12, 46));
    const night = smooth(-2, -9, el);
    const keyDir = el > -5 ? sunDir : moonDir;

    skyUniforms.uZenith.value.copy(pal.zen); skyUniforms.uHorizon.value.copy(pal.hor); skyUniforms.uGlow.value.copy(pal.glow);
    skyUniforms.uSunDir.value.copy(sunDir); skyUniforms.uSunCol.value.copy(pal.key);
    skyUniforms.uSunVis.value = smooth(-3, 1, el);
    skyUniforms.uMoonDir.value.copy(moonDir); skyUniforms.uMoonVis.value = night;
    skyUniforms.uStars.value = num('stars'); skyUniforms.uCloudLit.value.copy(pal.cl); skyUniforms.uCloudShade.value.copy(pal.cs); skyUniforms.uCloudAmt.value = num('ca');
    skyUniforms.uTime.value = t;

    oceanUniforms.uKeyDir.value.copy(keyDir); oceanUniforms.uKeyCol.value.copy(pal.key).multiplyScalar(el > -5 ? 1 : 0.7);
    oceanUniforms.uDeep.value.copy(pal.deep); oceanUniforms.uShallow.value.copy(pal.sh);
    oceanUniforms.uHorizon.value.copy(pal.hor); oceanUniforms.uZenith.value.copy(pal.zen); oceanUniforms.uFog.value.copy(pal.fog); oceanUniforms.uGlow.value.copy(pal.glow);
    oceanUniforms.uGlint.value = num('glint');

    scene.fog.color.copy(pal.fog);
    hemi.color.copy(pal.hs); hemi.groundColor.copy(pal.hg); hemi.intensity = num('hi');
    keyLight.color.copy(pal.key); keyLight.intensity = num('keyI');
    keyLight.userData.dir = keyDir;
    renderer.toneMappingExposure = num('exp');

    lanternLevel = num('lan');
    lanterns.forEach(({ light, glow }) => { light.intensity = lanternLevel * 0.62; glow.material.opacity = clamp(lanternLevel / 2.4, 0, 1) * 0.9; glow.visible = lanternLevel > 0.05; });
    mats.glass.emissiveIntensity = 0.15 + lanternLevel * 0.9;
    cove.userData.glow.material.opacity = clamp(lanternLevel / 2.4, 0.08, 1) * 0.9;
    beams.forEach((b) => { b.mat.uniforms.uOp.value = clamp(lanternLevel / 2.4, 0, 1) * 0.16; });
    const gullsOn = el > -3;
    gulls.forEach((g) => { g.visible = gullsOn; });
    if (gulls[0]) gulls[0].children[0].material.color.copy(pal.zen).lerp(GULL_INK, 0.75);

    const tNow = performance.now();
    if (Math.abs(el - lastEnvEl) > 0.6 && tNow - lastEnvAt > 250) { refreshEnv(); lastEnvEl = el; lastEnvAt = tNow; }
  }

  // ---------- state application
  let state = L.normalizeState(L.MOCK_STATE);
  let visuals = L.conditionVisuals(state.shipCondition);
  let hullKey = '';
  let turn = null;
  function applyState(next) {
    const prev = state;
    state = next;
    visuals = L.conditionVisuals(state.shipCondition);
    puddles.forEach((p, i) => { p.visible = i < visuals.puddles; });
    syncIslands(state);
    // heading
    const target = -L.headingBearing(state) * D2R;
    if (Math.abs(target - yawGroup.rotation.y) > 1e-3 && !(turn && Math.abs(turn.to - target) < 1e-3)) {
      turn = { t0: performance.now(), dur: 2600, from: yawGroup.rotation.y, to: target,
               wFrom: wheel.rotation.z, wTo: wheel.rotation.z + Math.sign(target - yawGroup.rotation.y) * Math.PI * 1.5 };
    }
    // avatar colors
    const av = state.avatar;
    if (L.parseHexColor(av.skinColor) != null) mats.skin.color.set(av.skinColor);
    if (L.parseHexColor(av.hairColor) != null) mats.hair.color.set(av.hairColor);
    if (L.parseHexColor(av.headwearColor) != null) mats.bandana.color.set(av.headwearColor);
    if (L.parseHexColor(av.coatColor) != null) mats.coat.color.set(av.coatColor);
    avParts.headwear.visible = av.headwear !== 'none';
    avParts.tails.forEach((t) => { t.visible = av.headwear === 'bandana'; });
    // ship colors
    const sd = state.shipDesign;
    if (L.parseHexColor(sd.sailColor) != null) mats.sail.color.set(sd.sailColor);
    if (sd.hullColor !== hullKey) {
      hullKey = sd.hullColor;
      const base = hexToRgb(sd.hullColor, [96, 64, 40]);
      const old = mats.wall.map; mats.wall.map = hullTexture(base); mats.wall.needsUpdate = true; if (old) old.dispose();
      const oldH = mats.hull.map; mats.hull.map = hullTexture(base.map((c) => Math.round(c * 0.45))); mats.hull.needsUpdate = true; if (oldH) oldH.dispose();
    }
    if (prev.shipCondition !== state.shipCondition) console.log('[helm-scene] condition', state.shipCondition);
  }

  // ---------- picking
  const ray = new T.Raycaster(); const ndc = new T.Vector2();
  function pickables() {
    const list = [
      { root: wheel, act: () => { post('wheelTurned'); if (standalone) standaloneTurn(); } },
      { root: barrel, act: () => post('barrelTapped') },
      { root: crate, act: () => post('crateTapped') },
      { root: cove, act: () => post('lighthouseTapped') },
    ];
    for (const [id, g] of islandMeshes) list.push({ root: g, act: () => post('islandTapped', { id }) });
    return list;
  }
  function standaloneTurn() {
    const ids = state.islands.map((i) => i.id); if (ids.length < 2) return;
    const next = ids[(ids.indexOf(state.headingGoalID) + 1) % ids.length];
    applyState(L.normalizeState(Object.assign({}, state, { headingGoalID: next })));
  }
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const p of pickables()) { if (ray.intersectObject(p.root, true).length) { p.act(); return; } }
  });

  // ---------- size
  let vw = 1, vh = 1;
  function resize() {
    vw = window.innerWidth || 390; vh = window.innerHeight || 844;
    renderer.setSize(vw, vh, false); camera.aspect = vw / vh;
    camera.fov = vw / vh > 0.75 ? 55 : 68; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  // ---------- camera
  const camBase = { pos: new V3(0, DECK + 3.1, 4.6), look: new V3(0, DECK + 1.0, -6) };
  const tmpA = new V3(), tmpB = new V3(), Y_AXIS = new V3(0, 1, 0);

  // ---------- motion (subtle by design; stiller under Reduce Motion)
  const reduceMotionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let motion = L.motionAmplitudes(!!(reduceMotionQuery && reduceMotionQuery.matches));
  if (reduceMotionQuery && reduceMotionQuery.addEventListener) {
    reduceMotionQuery.addEventListener('change', (e) => { motion = L.motionAmplitudes(e.matches); });
  }

  // ---------- loop
  const clock = new T.Clock();
  let t = 0, yawVel = 0, frames = 0, slowFrames = 0, paused = false, rafId = 0;
  let firstFrameAt = 0, statFrames = 0, statT0 = performance.now();
  applyState(state); applyTime(0, L.effectiveHours(state)); refreshEnv();

  function frame() {
    rafId = requestAnimationFrame(frame);
    if (paused) return;
    const dt = Math.min(clock.getDelta(), 0.05); t += dt;
    const nowMs = performance.now();

    const prevYaw = yawGroup.rotation.y;
    if (turn) {
      const k = clamp((nowMs - turn.t0) / turn.dur, 0, 1); const e = easeInOut(k);
      yawGroup.rotation.y = lerp(turn.from, turn.to, e);
      wheel.rotation.z = lerp(turn.wFrom, turn.wTo, easeInOut(clamp(k * 1.4, 0, 1)));
      avParts.head.rotation.y = Math.sin(k * Math.PI) * -Math.sign(turn.to - turn.from) * 0.3;
      if (k >= 1) turn = null;
    }
    yawVel = lerp(yawVel, (yawGroup.rotation.y - prevYaw) / Math.max(dt, 1e-3), 0.1);

    const yaw = yawGroup.rotation.y; const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
    const speed = visuals.sinking ? 0.4 : 2.2;
    flow.x += fwdX * speed * dt; flow.y += fwdZ * speed * dt;
    oceanUniforms.uTime.value = t;
    oceanUniforms.uBoat.value.set(0, 0, yaw);

    const c = Math.cos(yaw), s = Math.sin(yaw);
    const wpt = (lx, lz) => [c * lx + s * lz, -s * lx + c * lz];
    const [bx, bz] = wpt(0, -4.5), [sx, sz] = wpt(0, 4), [px, pz] = wpt(-2, 0), [qx, qz] = wpt(2, 0);
    const hB = waveHeight(bx, bz, t), hS = waveHeight(sx, sz, t), hP = waveHeight(px, pz, t), hQ = waveHeight(qx, qz, t);
    const sink = visuals.waterline * 0.9;
    ship.position.y = lerp(ship.position.y, ((hB + hS + hP + hQ) / 4) * motion.heave - 0.05 - sink, 0.15);
    ship.rotation.x = lerp(ship.rotation.x, Math.atan2(hB - hS, 8.5) * motion.pitch - (visuals.sinking ? 0.08 : 0), 0.1);
    ship.rotation.z = lerp(ship.rotation.z, Math.atan2(hQ - hP, 4) * motion.roll - clamp(yawVel * 0.5, -0.08, 0.08) + visuals.listDeg * D2R, 0.1);

    const heave = ship.position.y * motion.cameraHeave;
    const camLocal = tmpA.set(camBase.pos.x, camBase.pos.y + heave + ship.rotation.x * motion.cameraPitch, camBase.pos.z);
    const lookLocal = tmpB.set(camBase.look.x, camBase.look.y + heave * 0.6, camBase.look.z);
    camera.position.copy(camLocal).applyAxisAngle(Y_AXIS, yaw);
    camera.lookAt(lookLocal.applyAxisAngle(Y_AXIS, yaw));
    camera.rotateZ(-ship.rotation.z * motion.cameraRoll);
    oceanUniforms.uCam.value.copy(camera.position);
    sky.position.copy(camera.position);

    const kd = keyLight.userData.dir || new V3(0, 1, 0);
    keyLight.target.position.set(0, DECK, -1).applyAxisAngle(Y_AXIS, yaw);
    keyLight.position.copy(keyLight.target.position).addScaledVector(kd, 40);

    avParts.coat.scale.y = 1 + Math.sin(t * 1.6) * 0.006;
    if (!turn) avParts.head.rotation.y = lerp(avParts.head.rotation.y, Math.sin(t * 0.3) * 0.08, 0.05);
    avParts.tails.forEach((tail) => {
      const pos = tail.geometry.attributes.position; const base = tail.userData.base;
      for (let i = 0; i < pos.count; i++) {
        const y = base[i * 3 + 1]; const k = -y / 0.17;
        pos.setZ(i, base[i * 3 + 2] + k * 0.12 + Math.sin(t * 9 + k * 5 + tail.userData.phase) * 0.025 * k);
        pos.setX(i, base[i * 3] + Math.sin(t * 7 + k * 4 + tail.userData.phase) * 0.012 * k);
      }
      pos.needsUpdate = true;
    });
    flags.forEach((f, j) => {
      const pos = f.geometry.attributes.position; const base = f.userData.base;
      for (let i = 0; i < pos.count; i++) { const x = base[i * 3]; pos.setZ(i, Math.sin(t * 4 + x * 1.6 + j) * 0.18 * (x / 2.4)); }
      pos.needsUpdate = true;
    });
    beams.forEach((b) => { b.spin.rotation.y = t * 0.6; });
    gulls.forEach((g) => {
      const u = g.userData; const a = t * u.sp + u.phase;
      g.position.set(Math.sin(yaw) * -40 + Math.cos(a) * u.rad + 6, u.h + Math.sin(t * 0.7 + u.phase) * 0.8, Math.cos(yaw) * -40 + Math.sin(a) * u.rad);
      g.rotation.y = -a; const flap = Math.sin(t * 7 + u.phase) * 0.5; u.l.rotation.z = flap; u.r.rotation.z = -flap;
    });

    if (standalone && state.timeOverride == null) {
      const d = new Date(); state.timeOfDay = d.getHours() + d.getMinutes() / 60;
    }
    applyTime(t, L.effectiveHours(state));
    renderer.render(scene, camera);

    if (!firstFrameAt) {
      firstFrameAt = nowMs;
      post('sceneReady');
      statT0 = nowMs;
    }
    statFrames++;
    if (nowMs - statT0 >= 2000) {
      const fps = (statFrames * 1000) / (nowMs - statT0);
      post('sceneStats', { fps: Math.round(fps * 10) / 10, loadMs: Math.round(firstFrameAt - scriptStart) });
      statFrames = 0; statT0 = nowMs;
    }
    frames++; if (dt > 0.034) slowFrames++;
    if (frames === 180 && slowFrames > 90 && pixelRatio > 1) { pixelRatio = 1; renderer.setPixelRatio(1); resize(); }
  }

  // ---------- public API for the app
  window.helmScene = {
    setState(json) {
      try { applyState(L.normalizeState(json)); return true; }
      catch (e) { post('sceneError', { message: String(e && e.message || e) }); return false; }
    },
    playEvent(json) {
      try {
        const ev = typeof json === 'string' ? JSON.parse(json) : json;
        if (!ev || ev.version !== L.VERSION) throw new Error('playEvent version mismatch');
        // Phase 1 accepts strike, patch, islandReached, sinking; animations arrive with later phases.
        console.log('[helm-scene] playEvent', ev.type);
        return true;
      } catch (e) { post('sceneError', { message: String(e && e.message || e) }); return false; }
    },
    pause() { paused = true; },
    resume() { if (paused) { paused = false; clock.getDelta(); } },
    get state() { return state; },
  };

  rafId = requestAnimationFrame(frame);
})();
