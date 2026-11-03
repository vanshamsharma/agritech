/* global gsap, ScrollTrigger, Lenis */
gsap.registerPlugin(ScrollTrigger);

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => innerWidth < 860;

// ---------- smooth scroll ----------
if (!reduceMotion) {
  // a long, soft glide: the page keeps easing after each wheel tick instead of stepping
  const lenis = new Lenis({ lerp: 0.065, wheelMultiplier: 0.9, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const target = a.getAttribute('href');
      if (target.length < 2) return;
      e.preventDefault();
      lenis.scrollTo(target === '#top' ? 0 : target, { duration: 1.6 });
    })
  );
}

// ---------- hero: autoplay film that hands its playhead to the scroll ----------
const video = document.querySelector('.hero__video');
const hero = { mode: 'play', p: 0, t0: 0, cur: 0, span: 1, idle: 0 };
const duration = () => (isFinite(video.duration) && video.duration > 0 ? video.duration : 20);

video.play().catch(() => {}); // muted autoplay; the poster covers the rare block

function startScrub() {
  hero.mode = 'scrub';
  video.pause();
  hero.t0 = hero.cur = video.currentTime;
  // scrub forward from wherever the film is; if it was near the end, wrap around the loop
  hero.span = Math.max(duration() - 0.05 - hero.t0, duration() * 0.6);
}

if (!reduceMotion) {
  const heroTl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: () => `+=${innerHeight * 2.5}`,
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate(self) {
        hero.p = self.progress;
        if (hero.mode === 'play' && self.progress > 0.002) startScrub();
      },
    },
  });
  heroTl
    .to('.hero__content', { autoAlpha: 0, y: -90, duration: 0.25 }, 0.02)
    .to(['.hero__stats', '.hero__side', '.hero__scroll'], { autoAlpha: 0, y: 30, duration: 0.15 }, 0.02)
    // a longer dissolve when the brown field section follows
    .to('.hero__fade', document.querySelector('.field') ? { opacity: 1, duration: 0.3 } : { opacity: 1, duration: 0.12 }, document.querySelector('.field') ? 0.7 : 0.88);
  if (document.querySelector('.hero__caption')) {
    heroTl
      .fromTo('.hero__caption', { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 0.2 }, 0.36)
      .to('.hero__caption', { autoAlpha: 0, y: -70, duration: 0.2 }, 0.7);
  }

  gsap.ticker.add(() => {
    if (hero.mode !== 'scrub') return;
    const D = duration();
    const target = hero.t0 + hero.p * hero.span; // unwrapped time, so the lerp never runs backwards over the loop seam
    hero.cur += (target - hero.cur) * 0.18;
    const t = hero.cur % D;
    // only seek once the previous seek has landed; short keyframe spacing keeps each seek cheap
    if (!video.seeking && Math.abs(video.currentTime - t) > 1 / 60) video.currentTime = t;

    // resting back at the very top: let the film play on its own again
    if (hero.p < 0.002 && Math.abs(hero.cur - hero.t0) < 0.03) {
      if (++hero.idle > 45) {
        hero.mode = 'play';
        hero.idle = 0;
        video.play().catch(() => {});
      }
    } else hero.idle = 0;
  });
}

// ---------- corn section (optional: only on pages that include it) ----------
if (document.querySelector('.corn')) {
  const cornState = { p: 0, enter: 0, mx: 0, my: 0, vel: 0, visible: false };
  const infos = [...document.querySelectorAll('.info')];
  const stepsEl = document.querySelector('.corn__steps');
  const steps = [...stepsEl.children];
  const words = [...document.querySelectorAll('.corn__words span')];
  const intro = document.querySelector('.corn__intro');
  const glow = document.querySelector('.corn__glow');

  function updateInfo(p) {
    intro.classList.toggle('is-hidden', p > 0.04);
    stepsEl.classList.toggle('is-on', p > 0.04);
    // card k pops once leaf k is well on its way open, and stays until the next leaf takes over
    let active = -1;
    infos.forEach((el, k) => {
      const on = p >= k / 3 + 0.12 && (k === infos.length - 1 || p < (k + 1) / 3 + 0.12);
      el.classList.toggle('is-active', on);
      if (on) active = k;
    });
    steps.forEach((el, k) => el.classList.toggle('is-on', p >= k / 3 + 0.12));
    words.forEach((el, i) => el.classList.toggle('is-on', i === active + 1));
  }

  // Scroll -> leaf mapping: one continuous flow, no stops. A short rest on the closed cob at the start,
  // then the three leaves open back to back as you scroll.
  const INTRO = 0.04;
  const leafFromScroll = (s) => Math.min(1, Math.max(0, (s - INTRO) / (1 - INTRO)));

  if (!reduceMotion) {
    // entrance: the corn rises and grows in while the section scrolls into view
    ScrollTrigger.create({
      trigger: '.corn',
      start: 'top bottom',
      end: 'top top',
      scrub: true,
      onUpdate: (s) => (cornState.enter = s.progress),
    });
    ScrollTrigger.create({
      trigger: '.corn',
      start: 'top top',
      end: () => `+=${innerHeight * 3.5}`,
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (s) => {
        cornState.p = leafFromScroll(s.progress);
        cornState.vel = s.getVelocity();
        updateInfo(cornState.p);
      },
    });
  } else {
    cornState.enter = 1;
    cornState.p = 1;
    updateInfo(1);
  }

  addEventListener('pointermove', (e) => {
    cornState.mx = (e.clientX / innerWidth) * 2 - 1;
    cornState.my = (e.clientY / innerHeight) * 2 - 1;
  });

  // three.js loads only when the corn section is getting close, so the hero gets the bandwidth first
  let cornStarted = false;
  new IntersectionObserver(
    (entries) => {
      cornState.visible = entries[0].isIntersecting;
      if (cornState.visible && !cornStarted) {
        cornStarted = true;
        initCorn().catch((err) => {
          console.error(err);
          document.querySelector('.corn__loader').classList.add('is-done');
        });
      }
    },
    { rootMargin: '120% 0px' }
  ).observe(document.querySelector('.corn'));

  async function initCorn() {
    const THREE = await import('three');
    const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
    const { loadCorn } = await import('./corn-scroll.js');

    const canvas = document.querySelector('.corn__canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.58;

    // warm key from front-left, two strong rims behind so the silhouette glows off the dark background;
    // a slightly lower fill than neutral gives just a touch of extra contrast
    const key = new THREE.DirectionalLight(0xffe6bc, 3);
    key.position.set(-3, 4, 5);
    const rimL = new THREE.DirectionalLight(0xffc06a, 4.8);
    rimL.position.set(-4, 2, -4);
    const rimR = new THREE.DirectionalLight(0xd8ffb0, 3.4);
    rimR.position.set(4, 3, -4);
    const fill = new THREE.HemisphereLight(0xfff4dc, 0x141c0c, 0.45);
    scene.add(key, rimL, rimR, fill);

    const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);

    // wrapper groups: `tilt` leans the corn diagonally, `pivot` takes entrance + mouse motion,
    // `fit` centres and scales the model
    const tilt = new THREE.Group();
    const pivot = new THREE.Group();
    const fit = new THREE.Group();
    pivot.add(fit);
    tilt.add(pivot);
    scene.add(tilt);

    const corn = await loadCorn(fit);
    // frame using both the closed and fully peeled poses; the leaves are skinned,
    // so measure posed vertices (bone matrices updated by hand before the first render)
    const measure = () => {
      corn.corn.updateMatrixWorld(true);
      corn.corn.traverse((o) => o.isSkinnedMesh && o.skeleton.update());
      return new THREE.Box3().setFromObject(corn.corn, true);
    };
    const box = measure();
    corn.set(1);
    box.union(measure());
    corn.set(reduceMotion ? 1 : 0);
    const size = box.getSize(new THREE.Vector3());
    corn.corn.position.sub(box.getCenter(new THREE.Vector3()));
    fit.scale.setScalar(2 / size.y); // corn (with open leaves) is 2 units tall

    let baseDist = 5, lookY = 0;
    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile() ? 1.5 : 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // the whole corn, open leaves included, fills most of the view height (less on phones, leaving room for the card)
      const frac = isMobile() ? 0.6 : 0.8; // the diagonal lean shortens it on screen, so frame tighter
      baseDist = 1 / frac / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      lookY = isMobile() ? -0.42 : 0.03; // centred, a touch below middle (the nav covers the top)
      camera.updateProjectionMatrix();
    }
    resize();
    addEventListener('resize', resize);

    document.querySelector('.corn__loader').classList.add('is-done');
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const clock = new THREE.Clock();
    let rx = 0, ry = 0, enter = 0, lean = 0, swayVel = 0;

    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.1);
      if (!cornState.visible) return;
      const k = 1 - Math.exp(-dt * 4);
      enter += (cornState.enter - enter) * k;
      const e = ease(Math.min(1, enter));
      canvas.style.opacity = Math.min(1, enter * 1.5);
      glow.style.opacity = e;

      if (!reduceMotion) corn.update(cornState.p, dt);
      const sp = corn.progress;

      pivot.scale.setScalar(0.62 + 0.38 * e);
      pivot.position.y = -0.8 * (1 - e) + Math.sin(performance.now() / 1400) * 0.015; // gentle float
      rx += (cornState.my * 0.06 - rx) * k;
      ry += (cornState.mx * 0.22 - ry) * k;
      pivot.rotation.set(rx, ry - 1.2 * (1 - e), 0);
      // the corn rocks from one diagonal to the other as the leaves open (one swing per leaf),
      // and leans into the scroll a little more the faster you scroll; both eased so it never snaps
      const amp = isMobile() ? 0.3 : 0.42;
      const sway = -amp * Math.cos(sp * Math.PI * 3);
      cornState.vel *= Math.exp(-dt * 6); // velocity fades out once scrolling stops
      swayVel += (Math.max(-1, Math.min(1, cornState.vel / 2500)) - swayVel) * k;
      lean += (sway - lean) * (1 - Math.exp(-dt * 3));
      tilt.rotation.z = (lean - swayVel * 0.12) * e;
      tilt.rotation.x = swayVel * 0.08 * e;

      // barely-there dolly-in as the husk opens, keeping the full corn on screen
      const dist = baseDist * (1 - 0.04 * sp);
      camera.position.set(0, lookY, dist);
      camera.lookAt(0, lookY, 0);
      renderer.render(scene, camera);
    });
  }

}

// ---------- lower sections ----------
if (!reduceMotion) {
  gsap.utils.toArray('.reveal').forEach((el, i) => {
    gsap.from(el, {
      y: 60,
      autoAlpha: 0,
      duration: 1.1,
      ease: 'power3.out',
      delay: (i % 4) * 0.08,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

document.querySelectorAll('[data-count]').forEach((el) => {
  const end = +el.dataset.count;
  const suffix = el.dataset.suffix || '';
  const show = (v) => (el.textContent = Math.round(v).toLocaleString() + suffix);
  if (reduceMotion) return show(end);
  const o = { v: 0 };
  gsap.to(o, {
    v: end,
    duration: 1.8,
    ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    onUpdate: () => show(o.v),
  });
});

video.addEventListener('loadedmetadata', () => ScrollTrigger.refresh());
addEventListener('load', () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());
