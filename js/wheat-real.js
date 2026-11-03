// Realistic bearded wheat, generated. Follows the real anatomy: spikelets alternate up a zigzag rachis;
// each has two boat-shaped outer glumes wrapping 3-4 florets, and each lemma ends in a long, fine awn
// running nearly parallel to the ear. Veins come from a painted texture, depth from self-shadowing
// plus ambient occlusion baked into the vertex colours.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const random = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// boat-shaped husk: an open shell with a raised keel down its back and a pointed tip.
// Its keel faces +z; v runs base to tip; `ao` darkens the inside and the tucked-in base.
function shell(len, wid, tone, tint, r, nu = 12, nv = 14) {
  const A = 2.15;
  const pos = [], uv = [], col = [], idx = [];
  const lean = (r() - 0.5) * 0.012;
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    const w = wid * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.68)), 0.62) + 0.0006;
    const beak = smoothstep(0.82, 1, v);
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, th = (u * 2 - 1) * A;
      const keel = 1 + 0.2 * Math.exp(-Math.pow(th * 2.9, 2)) * (1 - beak * 0.5);
      const rib = 1 + 0.018 * Math.cos(th * 9); // the subtle ribs a real glume has
      const x = w * Math.sin(th) * rib;
      const z = w * 0.78 * Math.cos(th) * keel * rib + (v * v * -0.02 + lean * v) * (len / 0.12);
      pos.push(x, len * v, z);
      uv.push(u, v);
      // occlusion: inner surface and the part tucked under the next husk go dark
      const inner = smoothstep(1.2, 2.15, Math.abs(th));
      const occ = (0.28 + 0.72 * smoothstep(0.02, 0.55, v)) * (1 - 0.68 * inner);
      // ripe gold at the shoulder, paler towards the base, a touch of bronze at the tip
      const tip = smoothstep(0.72, 1, v);
      const g = tone * occ;
      col.push(g * (tint[0] + tip * 0.02), g * (tint[1] - tip * 0.07), g * (tint[2] - tip * 0.12));
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + nu + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// tapered tube for awns, rachis and stem
function tube(points, r0, r1, rgb, radial = 3, segs = 6, jitterTone = 0) {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], nor = [], col = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, c = curve.getPointAt(t), rad = r0 + (r1 - r0) * t;
    const fade = 1 + jitterTone * t;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      pos.push(c.x + n.x * rad, c.y + n.y * rad, c.z + n.z * rad);
      nor.push(n.x, n.y, n.z);
      col.push(rgb[0] * fade, rgb[1] * fade, rgb[2] * fade);
      uv.push(j / radial, t);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

// painted husk surface: fine parallel veins, faint mottling, and a matching height map
function huskTextures() {
  const W = 256, H = 512;
  const r = random(424242);
  const make = (paint) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    paint(c.getContext('2d'));
    return c;
  };
  const veins = (ctx, color, alphaMain, alphaFine) => {
    for (let i = 0; i < 26; i++) {
      const x = (i + 0.5) / 26 * W + (r() - 0.5) * 3;
      const main = i % 4 === 1;
      ctx.strokeStyle = color;
      ctx.globalAlpha = main ? alphaMain : alphaFine;
      ctx.lineWidth = main ? 2.2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      // veins converge towards the tip, as they do on a real glume
      for (let y = 0; y <= H; y += 32) {
        const conv = (x - W / 2) * Math.pow(y / H, 1.5) * 0.38;
        ctx.lineTo(x - conv + (r() - 0.5) * 1.2, H - y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  const color = make((ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5200; i++) {
      ctx.fillStyle = `rgba(${90 + r() * 60},${60 + r() * 40},${20 + r() * 20},${r() * 0.1})`;
      ctx.fillRect(r() * W, r() * H, 1 + r() * 2, 2 + r() * 7);
    }
    veins(ctx, '#5a3510', 0.62, 0.32);
  });
  const height = make((ctx) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
      ctx.fillRect(r() * W, r() * H, 1, 3 + r() * 8);
    }
    veins(ctx, '#ffffff', 0.85, 0.42);
  });
  const toTex = (canvas, srgb) => {
    const t = new THREE.CanvasTexture(canvas);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: toTex(color, true), bumpMap: toTex(height, false) };
}

const EAR = 1;
const DETAIL = {
  full: { nu: 12, nv: 14, rows: 22, awn: [4, 7], extra: true, awns: 3 },
  mid: { nu: 8, nv: 9, rows: 22, awn: [3, 5], extra: true, awns: 3 },
  low: { nu: 5, nv: 6, rows: 16, awn: [3, 3], extra: false, awns: 2 },
};

// one outward vector per floret: a shader uniform slides whole husks apart for the exploded view
function setSpread(geo, spread) {
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set(spread, i * 3);
  geo.setAttribute('aSpread', new THREE.BufferAttribute(a, 3));
  return geo;
}

function leafGeo(r, len, side, y, b) {
  const segs = 12, pos = [], uv = [], col = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, w = 0.046 * Math.sin(Math.PI * Math.pow(t, 0.7)) + 0.001;
    const x = b + side * (len * 0.55 * t + 0.25 * t * t), yy = y + len * (t - 0.72 * t * t);
    pos.push(x, yy, -w, x, yy + 0.005, 0, x, yy, w);
    for (let k = 0; k < 3; k++) { uv.push(k / 2, t); col.push(0.74 - t * 0.1, 0.56 - t * 0.12, 0.18); }
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 3;
    idx.push(a, a + 3, a + 1, a + 3, a + 4, a + 1, a + 1, a + 4, a + 2, a + 4, a + 5, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Geometry for one strand. detail: full | mid | low. anchor: 'center' (ear middle) or 'base' (foot of the stem). */
export function wheatParts({ seed = 7, detail = 'full', stemLen = 1.25, leaves = false, anchor = 'center' } = {}) {
  const D = DETAIL[detail];
  const rows = D.rows;
  const r = random(seed * 9973 + 11);
  const shells = [], straw = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const spike = new THREE.Matrix4(), part = new THREE.Matrix4();

  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1);
    const side = i % 2 ? 1 : -1;
    const size = (0.74 + 0.3 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.7)) * (22 / rows) ** 0.35;
    const lean = (0.4 - 0.2 * t) * side + (r() - 0.5) * 0.05;
    e.set((r() - 0.5) * 0.08, (r() - 0.5) * 0.2, -lean);
    q.setFromEuler(e);
    spike.compose(new THREE.Vector3(side * 0.012, t * EAR, 0), q, new THREE.Vector3(size, size, size));

    // each spikelet has its own overall ripeness
    const ripe = r();
    const tint = [0.88 + ripe * 0.1, 0.52 + ripe * 0.09, 0.13 + ripe * 0.07];
    const flySpike = [side * (0.34 + r() * 0.32), (t - 0.5) * 0.42 + (r() - 0.4) * 0.14, (r() - 0.5) * 0.3];

    // two outer glumes, keels facing away from each other
    [-1, 1].forEach((f) => {
      const g = shell(0.112, 0.033, 0.9 + r() * 0.1, tint, r, D.nu, D.nv);
      e.set(f * 0.15, f > 0 ? 0.3 * side : Math.PI - 0.3 * side, 0);
      q.setFromEuler(e);
      part.compose(new THREE.Vector3(0, 0, f * 0.012), q, new THREE.Vector3(1, 1, 1));
      g.applyMatrix4(m.multiplyMatrices(spike, part));
      shells.push(setSpread(g, flySpike));
    });

    // florets stacked up the spikelet, fanning alternately to each side
    const count = 3 + (D.extra && t > 0.15 && t < 0.85 ? 1 : 0);
    for (let j = 0; j < count; j++) {
      const f = j % 2 ? 1 : -1;
      const h = 0.014 + j * 0.019;
      const fan = f * (0.2 + j * 0.05);
      const fly = [flySpike[0] * (1.05 + j * 0.14), flySpike[1] + j * 0.03, flySpike[2] + f * (0.08 + j * 0.05)];
      const g = shell(0.122 - j * 0.006, 0.031 - j * 0.0015, 0.92 + r() * 0.13, tint, r, D.nu, D.nv);
      e.set(fan, f > 0 ? 0.45 * side : Math.PI - 0.45 * side, 0);
      q.setFromEuler(e);
      const at = new THREE.Vector3(side * j * 0.002, h, f * (0.007 + j * 0.003));
      part.compose(at, q, new THREE.Vector3(1, 1, 1));
      g.applyMatrix4(m.multiplyMatrices(spike, part));
      shells.push(setSpread(g, fly));

      // awn: springs from the lemma tip and runs close to parallel with the ear, thin and slightly bowed
      if (j < D.awns) {
        const len = (0.62 + r() * 0.34) * (0.86 + t * 0.2);
        const bow = (r() - 0.35) * 0.05;
        const tipAt = new THREE.Vector3(at.x, at.y + 0.114 - j * 0.006, at.z + Math.sin(fan) * 0.114);
        const out = -lean * 0.35; // counter the spikelet's lean so the beard stays gathered
        const pts = [
          tipAt.clone(),
          tipAt.clone().add(new THREE.Vector3(-out * len * 0.4 * -1 + bow * side, len * 0.45, Math.sin(fan) * 0.025)),
          tipAt.clone().add(new THREE.Vector3(-out * len * -1 + bow * side * 2.6, len, Math.sin(fan) * 0.08)),
        ];
        const tone = 0.86 + r() * 0.16;
        const thick = detail === 'low' ? 1.9 : 1; // distant strands: slightly thicker awns so they don't break into dots
        const a = tube(pts, 0.0027 * thick, 0.0012 * thick, [0.8 * tone, 0.5 * tone, 0.15 * tone], D.awn[0], D.awn[1], 0.14);
        a.applyMatrix4(spike);
        straw.push(setSpread(a, fly));
      }
    }
  }

  // zigzag rachis through the ear, then the long smooth peduncle
  const zig = [];
  for (let i = 0; i < rows; i += 2) zig.push(new THREE.Vector3((i % 4 ? 1 : -1) * 0.004, (i / (rows - 1)) * EAR, 0));
  straw.push(setSpread(tube(zig, 0.0078, 0.0052, [0.36, 0.2, 0.06], 6, 30), [0, 0, 0]));
  const b = 0.07 + r() * 0.05;
  straw.push(
    setSpread(
      tube(
        [
          new THREE.Vector3(b, -stemLen, 0.02),
          new THREE.Vector3(b * 0.62, -stemLen * 0.6, 0.01),
          new THREE.Vector3(b * 0.2, -stemLen * 0.22, 0),
          new THREE.Vector3(0, 0.02, 0),
        ],
        0.0135, 0.0088, [0.76, 0.48, 0.14], 8, 20
      ),
      [0, 0, 0]
    )
  );
  if (leaves) {
    [0.34, 0.62].forEach((f, k) => straw.push(setSpread(leafGeo(r, 0.72 + r() * 0.25, k ? 1 : -1, -stemLen * f, b * 0.45), [0, 0, 0])));
  }

  const shift = anchor === 'base' ? stemLen : -EAR * 0.45;
  const husk = mergeGeometries(shells, false);
  const stalk = mergeGeometries(straw, false);
  husk.translate(0, shift, 0);
  stalk.translate(0, shift, 0);
  shells.forEach((g) => g.dispose());
  straw.forEach((g) => g.dispose());
  return { husk, straw: stalk, triangles: (husk.index.count + stalk.index.count) / 3 };
}

let textures;
const withExplode = (mat, explode) => {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uExplode = explode;
    shader.vertexShader =
      'attribute vec3 aSpread;\nuniform float uExplode;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += aSpread * uExplode;');
  };
  return mat;
};

/** Materials for one colour of wheat. `tone` multiplies the baked gold; `explode` is a shared { value }. */
export function wheatMaterials(tone = 0xffffff, explode = { value: 0 }) {
  textures ||= huskTextures();
  const husk = new THREE.MeshPhysicalMaterial({
    map: textures.map, bumpMap: textures.bumpMap, bumpScale: 1.4,
    vertexColors: true, color: tone, roughness: 0.62, metalness: 0,
    sheen: 0.3, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffd28a), // the papery bloom on dry chaff
    side: THREE.DoubleSide, shadowSide: THREE.DoubleSide,
  });
  const straw = new THREE.MeshStandardMaterial({ vertexColors: true, color: tone, roughness: 0.46, metalness: 0, side: THREE.DoubleSide });
  return { husk: withExplode(husk, explode), straw: withExplode(straw, explode) };
}

export function wheatGroup(parts, mats, shadows = true) {
  const group = new THREE.Group();
  const a = new THREE.Mesh(parts.husk, mats.husk);
  const c = new THREE.Mesh(parts.straw, mats.straw);
  [a, c].forEach((mesh) => {
    mesh.castShadow = mesh.receiveShadow = shadows;
    mesh.frustumCulled = false;
    group.add(mesh);
  });
  return group;
}

export function realWheat(opts = {}) {
  const parts = wheatParts(opts);
  const group = wheatGroup(parts, wheatMaterials());
  group.userData.triangles = parts.triangles;
  return group;
}

// low warm sun, backlight through the beard, soft sky fill
export function sunLights(renderer, scene, RoomEnvironment, { shadows = false, span = [2.5, 1.7] } = {}) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.2;
  pmrem.dispose();
  const sun = new THREE.DirectionalLight(0xffd090, 6);
  sun.position.set(-2.2, 2.4, 3);
  if (shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -span[0], right: span[0], top: span[1], bottom: -span[1], near: 0.5, far: 10 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.005;
    sun.shadow.radius = 3;
  }
  const back = new THREE.DirectionalLight(0xfff0cf, 3.2);
  back.position.set(2.4, 1.2, -3);
  const sky = new THREE.HemisphereLight(0xf2ecdc, 0x4a2f10, 0.26);
  scene.add(sun, back, sky);
}
