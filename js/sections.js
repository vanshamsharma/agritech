/* global gsap, ScrollTrigger */
// The wheat field (loading-bar type + floating 3D strands), the process
// layout with GSAP text reveals, and wheat growing behind "Grow with us".
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = () => innerWidth < 860;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const range = (p, a, b) => clamp((p - a) / (b - a)); // 0..1 progress of p between a and b
const random = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- loading-bar type: a perfectly straight edge sweeps across the word at constant speed ----------
function wipeWord(el) {
  return { el, text: el.textContent, d: null };
}

// d: 1 = not started, 0 = fully shown, -1 = gone. Coming in, the right edge travels left to right;
// going out, the left edge follows the same path, so in and out read as one machine motion.
function setWipe(w, d) {
  d = clamp(d, -1, 1);
  if (w.d === d) return;
  w.d = d;
  if (d === 0) w.el.style.clipPath = 'none';
  else w.el.style.clipPath = d > 0 ? `inset(-10% ${d * 100}% -10% 0)` : `inset(-10% 0 -10% ${-d * 100}%)`;
}

// ---------- text splitting for reveals ----------
function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute('aria-label', el.textContent.trim());
  el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true" style="--i:${i}">${w}</span>`).join(' ');
}

// masked per-letter rise; keeps <br> and coloured spans intact
function splitChars(el) {
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  const wrap = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(' ');
          const word = document.createElement('span');
          word.className = 'mw';
          word.setAttribute('aria-hidden', 'true');
          [...part].forEach((c) => {
            const s = document.createElement('span');
            s.className = 'mc';
            s.textContent = c;
            word.append(s);
          });
          frag.append(word);
        });
        n.replaceWith(frag);
      } else if (n.nodeName !== 'BR') wrap(n);
    });
  };
  wrap(el);
  return el.querySelectorAll('.mc');
}

document.querySelectorAll('[data-words]').forEach(splitWords);

if (reduceMotion) {
  document.documentElement.classList.add('proto-still');
  } else {
  initFieldScroll();
  initProcess();
  initContact();
}

// ---------- field ----------
function initFieldScroll() {
  const q = (s) => document.querySelector(s);
  const wordA = wipeWord(q('.field__word--a'));
  const wordB = wipeWord(q('.field__word--b'));
  const copyA = q('.field__copy--a'), copyB = q('.field__copy--b'), copyC = q('.field__copy--c');
  const fade = q('.field__fade');
  const state = { p: 0, enter: 0 };

  // the big words are sized from their measured width, so they always sit fully inside the frame
  function layout() {
    const W = innerWidth, H = innerHeight, phone = mobile();
    if (W < 50 || H < 50) return; // a viewport mid-resize can report zero
    const gutter = Math.max(16, W * 0.045);
    const fit = (w, width) => {
      // measure at 100px, then scale so the word exactly fills its column and never leaves the frame
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = `100px ${getComputedStyle(w.el).fontFamily}`;
      const natural = ctx.measureText(w.text.toUpperCase()).width;
      const size = Math.min((width / natural) * 100, (H * 0.4) / 1.02);
      w.el.style.fontSize = size + 'px';
      return size * 1.02;
    };
    if (phone) {
      const top = 72;
      const hA = fit(wordA, W - gutter * 2);
      const hB = fit(wordB, W - gutter * 2);
      wordA.el.style.cssText += `;left:${gutter}px;top:${top}px`;
      wordB.el.style.cssText += `;left:${gutter}px;top:${top}px`;
      copyA.style.cssText += `;left:${gutter}px;right:${gutter}px;top:${top + hA + 12}px`;
      copyB.style.cssText += `;left:${gutter}px;right:${gutter}px;top:${top + hB + 12}px`;
    } else {
      const hA = fit(wordA, W * 0.5);
      const hB = fit(wordB, W * 0.47);
      const topA = Math.max(96, H * 0.5 - (hA + 150) / 2);
      wordA.el.style.cssText += `;left:${gutter}px;top:${topA}px`;
      copyA.style.cssText += `;left:${gutter}px;top:${topA + hA + 24}px`;
      const topB = H * 0.9 - hB;
      wordB.el.style.cssText += `;left:${W * 0.5}px;top:${topB}px`;
      copyB.style.cssText += `;left:${W * 0.5 + 8}px;top:${topB - copyB.offsetHeight - 26}px`;
    }
    ScrollTrigger.refresh();
    apply();
  }

  const apply = () => {
    const p = state.p, u = innerHeight / 100;
    // scene A: the word loads in from the left as it arrives, then clears the same way
    setWipe(wordA, 1 - range(state.enter, 0.3, 1) - range(p, 0.12, 0.3));
    gsap.set(wordA.el, { y: -range(p, 0, 0.3) * 4 * u });
    gsap.set(copyA, { y: -range(p, 0, 0.3) * 6 * u, autoAlpha: range(state.enter, 0.65, 1) * (1 - range(p, 0.16, 0.25)) });
    copyA.classList.toggle('is-in', state.enter > 0.75 && p < 0.25);

    // scene B: mirrored to the right-hand side
    setWipe(wordB, 1 - range(p, 0.3, 0.45) - range(p, 0.52, 0.68));
    gsap.set(wordB.el, { y: (1 - range(p, 0.31, 0.5)) * 4 * u - range(p, 0.5, 0.65) * 4 * u });
    gsap.set(copyB, { y: (1 - range(p, 0.33, 0.43)) * 3 * u, autoAlpha: range(p, 0.33, 0.4) * (1 - range(p, 0.54, 0.6)) });
    copyB.classList.toggle('is-in', p > 0.35 && p < 0.6);

    // scene C: the exploded ear and its spec sheet
    gsap.set(copyC, { y: (1 - range(p, 0.66, 0.74)) * 3 * u, autoAlpha: range(p, 0.66, 0.72) });
    copyC.classList.toggle('is-in', p > 0.68);

    // sink into the corn section's dark background before the page moves on
    fade.style.opacity = range(p, 0.93, 1);
  };

  ScrollTrigger.create({
    trigger: '.field', start: 'top bottom', end: 'top top', scrub: true,
    onUpdate: (s) => { state.enter = s.progress; apply(); },
  });
  ScrollTrigger.create({
    trigger: '.field', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (s) => { state.p = s.progress; apply(); },
  });
  layout();
  document.fonts?.ready.then(layout);
  document.fonts?.load('100px Anton').then(layout);
  addEventListener('resize', layout);

  let started = false;
  const io = new IntersectionObserver(
    (entries) => {
      state.visible = entries[0].isIntersecting;
      if (state.visible && !started) {
        started = true;
        initFieldGL(state).catch(console.error);
      }
    },
    { rootMargin: '140% 0px' }
  );
  io.observe(q('.field'));
}

// keyframes in viewport units: [p, x, y, rotZ, rotY, scale]; x and y run -1..1 across the frame
function track(keys, p) {
  if (p <= keys[0][0]) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (p <= b[0]) {
      const t = smooth((p - a[0]) / (b[0] - a[0]));
      return a.map((v, k) => v + (b[k] - v) * t);
    }
  }
  return keys[keys.length - 1];
}

async function initFieldGL(state) {
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const { wheatParts, wheatMaterials, wheatGroup, sunLights } = await import('./wheat-real.js');

  const phone = mobile();
  const camZ = 1 / Math.tan(THREE.MathUtils.degToRad(14)); // at z = 0 the frame is exactly 2 units tall
  const midA = wheatParts({ seed: 3, detail: phone ? 'low' : 'mid', stemLen: 1.9 });
  const midB = wheatParts({ seed: 11, detail: phone ? 'low' : 'mid', stemLen: 1.9 });
  const hero = wheatParts({ seed: 7, detail: phone ? 'mid' : 'full', stemLen: 1.7 });
  const softGeo = phone ? null : wheatParts({ seed: 17, detail: 'low', stemLen: 0.8 });

  function layer(canvas, dpr, shadows) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    sunLights(renderer, scene, RoomEnvironment, { shadows });
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
    camera.position.z = camZ;
    return { renderer, scene, camera, canvas, dpr };
  }

  const sharp = layer(document.querySelector('.field__gl'), () => Math.min(devicePixelRatio, phone ? 1.5 : 1.6), !phone);
  // out-of-focus strands at the edges: a second, low-res layer with a CSS blur (skipped on phones)
  const soft = phone ? null : layer(document.querySelector('.field__blur'), () => 0.6, false);

  const layers = soft ? [sharp, soft] : [sharp];
  function resize() {
    layers.forEach((l) => {
      const w = l.canvas.clientWidth, h = l.canvas.clientHeight;
      l.renderer.setPixelRatio(l.dpr());
      l.renderer.setSize(w, h, false);
      l.camera.aspect = w / h;
      l.camera.updateProjectionMatrix();
    });
  }
  resize();
  addEventListener('resize', resize);

  const explode = { value: 0 };
  const strand = (l, parts, tone, keys, opts = {}) => {
    const group = wheatGroup(parts, wheatMaterials(tone, opts.explode), l === sharp && !phone);
    l.scene.add(group);
    return { group, keys, spin: opts.spin ?? 0.1, phase: opts.phase ?? 0, layer: l };
  };

  // Scene A: a loose sheaf rising from the bottom right, standing clear of the word on the left.
  // Scene B: one big strand on the left, word on the right. Scene C: the exploded ear on the right.
  const list = [
    strand(sharp, midA, 0xfff2dc, [[0, 0.26, -0.16, 0.1, 0.5, 0.92], [0.3, 0.26, 2.5, 0.08, 1.4, 0.92]], { phase: 1 }),
    strand(sharp, midB, 0xffffff, [[0, 0.5, 0.1, -0.08, 2.2, 1.0], [0.28, 0.5, 2.7, -0.06, 3.1, 1.0]], { phase: 2 }),
    strand(sharp, midA, 0xffdcb4, [[0, 0.72, -0.1, -0.24, 1, 0.96], [0.3, 0.74, 2.5, -0.2, 2, 0.96]], { phase: 3 }),
    strand(sharp, midB, 0xfff2dc, [[0, 0.93, 0.12, -0.4, 1.6, 0.86], [0.27, 0.97, 2.8, -0.34, 2.5, 0.86]], { phase: 4 }),
    strand(sharp, hero, 0xffffff, [[0.27, -0.5, -2.5, -0.5, 0, 1.3], [0.4, -0.46, -0.04, -0.34, 0.6, 1.3], [0.56, -0.46, 0.02, -0.3, 1.4, 1.3], [0.67, -0.44, 2.7, -0.2, 2, 1.3]], { spin: 0.05 }),
    strand(sharp, hero, 0xffffff, [[0.62, 0.48, -2.6, -0.1, 0, 1.2], [0.73, 0.48, -0.06, -0.1, 0.5, 1.2], [1, 0.48, 0.02, -0.08, 1.2, 1.2]], { explode, spin: 0.06 }),
  ];
  if (soft) {
    list.push(
      strand(soft, softGeo, 0xffe4bf, [[0, 1.02, -0.9, -0.5, 0.6, 1.5], [0.3, 1.02, 1.5, -0.4, 1.2, 1.5]]),
      strand(soft, softGeo, 0xffdcb4, [[0.3, -1.02, -2.4, 0.3, 2, 1.6], [0.42, -1.04, -0.78, 0.3, 2.4, 1.6], [0.56, -1.04, -0.72, 0.28, 2.8, 1.6], [0.67, -1.04, 1.8, 0.24, 3.4, 1.6]])
    );
  }

  let smoothP = state.p, enter = 0;
  const clock = new THREE.Clock();
  const loop = () => {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!state.visible) return;
    const k = 1 - Math.exp(-dt * 6);
    smoothP += (state.p - smoothP) * k;
    enter += (state.enter - enter) * k;
    const time = performance.now() / 1000;
    const aspect = sharp.camera.aspect;
    const rise = (1 - smooth(enter)) * -1.6; // the sheaf comes up as the section arrives
    list.forEach((s) => {
      const f = track(s.keys, smoothP);
      const first = s.keys[0][0], last = s.keys[s.keys.length - 1][0];
      s.group.visible = smoothP >= first - 0.01 && (last === 1 || smoothP <= last + 0.01);
      if (!s.group.visible) return;
      const y = (phone ? f[2] * 0.9 - 0.62 : f[2]) + (first === 0 ? rise : 0);
      s.group.position.set(phone ? f[1] * aspect * 0.62 : f[1] * aspect, y + Math.sin(time * 0.7 + s.phase) * 0.012, 0);
      s.group.rotation.set(0.12, f[4] + time * s.spin, f[3] + Math.sin(time * 0.5 + s.phase) * 0.012, 'ZYX');
      s.group.scale.setScalar(f[5] * (phone ? 0.66 : 1));
    });
    explode.value = smooth(range(smoothP, 0.76, 0.94)) * (phone ? 0.34 : 0.56);
    // the blurred layer is the costliest thing on the page: skip it entirely when nothing is on it
    if (soft) {
      const softOn = list.some((s) => s.layer === soft && s.group.visible);
      if (softOn !== soft.on) {
        soft.on = softOn;
        soft.canvas.style.display = softOn ? '' : 'none';
      }
      if (softOn) soft.renderer.render(soft.scene, soft.camera);
    }
    sharp.renderer.render(sharp.scene, sharp.camera);
  };
  sharp.renderer.setAnimationLoop(loop);
}

// ---------- process ----------
function initProcess() {
  const riseIn = (el, opts = {}) => {
    const chars = splitChars(el);
    gsap.set(chars, { yPercent: 115, rotate: 6 });
    gsap.to(chars, {
      yPercent: 0, rotate: 0, duration: 1.05, ease: 'power4.out', stagger: 0.028,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      ...opts,
    });
  };
  document.querySelectorAll('.proc [data-rise]').forEach((el) => riseIn(el));

  const digits = document.querySelector('.proc__digits');
  gsap.utils.toArray('.step').forEach((step, i) => {
    const fig = step.querySelector('.step__img');
    const img = fig.querySelector('img');
    // image opens from a slit in the middle as it arrives, and drifts slowly inside its frame
    gsap.fromTo(fig, { clipPath: 'inset(22% 12% 22% 12% round 18px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 18px)', ease: 'none',
      scrollTrigger: { trigger: fig, start: 'top 95%', end: 'top 45%', scrub: true },
    });
    gsap.fromTo(img, { yPercent: -8, scale: 1.18 }, {
      yPercent: 8, scale: 1.08, ease: 'none',
      scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true },
    });
    step.querySelectorAll('[data-words]').forEach((p) => {
      ScrollTrigger.create({ trigger: p, start: 'top 88%', once: true, onEnter: () => p.classList.add('is-in') });
    });
    ScrollTrigger.create({
      trigger: step, start: 'top 55%', end: 'bottom 55%',
      onToggle: (s) => s.isActive && gsap.to(digits, { yPercent: (-100 * i) / 3, duration: 0.7, ease: 'power3.inOut' }),
    });
  });
}

// ---------- contact: wheat grows up behind the title ----------
function initContact() {
  const title = document.querySelector('.contact [data-rise]');
  const chars = splitChars(title);
  gsap.set(chars, { yPercent: 115 });
  gsap.to(chars, {
    yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.03,
    scrollTrigger: { trigger: '.contact', start: 'top 55%', once: true },
  });

  const state = { p: 0, visible: false };
  ScrollTrigger.create({
    trigger: '.contact', start: 'top 70%', end: 'bottom bottom', scrub: true,
    onUpdate: (s) => (state.p = s.progress),
  });
  let started = false;
  new IntersectionObserver(
    (entries) => {
      state.visible = entries[0].isIntersecting;
      if (state.visible && !started) {
        started = true;
        initContactGL(state).catch(console.error);
      }
    },
    { rootMargin: '100% 0px' }
  ).observe(document.querySelector('.contact'));
}

async function initContactGL(state) {
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const { wheatParts, wheatMaterials, sunLights } = await import('./wheat-real.js');

  const canvas = document.querySelector('.contact__gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  const scene = new THREE.Scene();
  sunLights(renderer, scene, RoomEnvironment);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
  camera.position.z = 1 / Math.tan(THREE.MathUtils.degToRad(14));

  const COUNT = mobile() ? 24 : 54;
  const STEM = 2.1, HEIGHT = STEM + 1.25;
  const parts = wheatParts({ seed: 5, detail: 'low', stemLen: STEM, leaves: true, anchor: 'base' });
  const mats = wheatMaterials(0xffffff);
  const meshes = [new THREE.InstancedMesh(parts.husk, mats.husk, COUNT), new THREE.InstancedMesh(parts.straw, mats.straw, COUNT)];
  meshes.forEach((m) => { m.frustumCulled = false; scene.add(m); });

  const r = random(31337);
  const tones = [0xffffff, 0xfff2dc, 0xffdcb4, 0xffe8c8];
  const plants = [];
  const col = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    const x = (i + 0.5) / COUNT * 2 - 1 + (r() - 0.5) * 0.06;
    const edge = Math.abs(x); // taller at the sides, lower behind the title so it stays readable
    plants.push({
      x,
      z: -0.2 - r() * 0.9,
      scale: 0.3 + edge * edge * 0.42 + r() * 0.1,
      delay: Math.min(0.55, r() * 0.34 + (1 - edge) * 0.2),
      yaw: r() * 6.28,
      lean: (r() - 0.5) * 0.14 + x * 0.1,
      phase: r() * 6.28,
    });
    col.setHex(tones[Math.floor(r() * tones.length)]);
    meshes.forEach((m) => m.setColorAt(i, col));
  }
  meshes.forEach((m) => (m.instanceColor.needsUpdate = true));

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  const obj = new THREE.Object3D();
  let sp = 0;
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!state.visible) return;
    sp += (state.p - sp) * (1 - Math.exp(-dt * 5));
    const t = performance.now() / 1000;
    plants.forEach((pl, i) => {
      const grow = 1 - Math.pow(1 - clamp((sp - pl.delay) / 0.45), 3);
      const h = HEIGHT * pl.scale;
      obj.position.set(pl.x * camera.aspect * 1.08, -1.08 - h + grow * h, pl.z);
      obj.rotation.set(0, pl.yaw, pl.lean + Math.sin(t * 0.9 + pl.phase) * 0.018 * grow);
      obj.scale.setScalar(pl.scale);
      obj.updateMatrix();
      meshes.forEach((m) => m.setMatrixAt(i, obj.matrix));
    });
    meshes.forEach((m) => (m.instanceMatrix.needsUpdate = true));
    renderer.render(scene, camera);
  });
}

addEventListener('load', () => ScrollTrigger.refresh());
