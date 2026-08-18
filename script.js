const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobilePanel = document.querySelector("[data-mobile-panel]");
const contactForm = document.querySelector("[data-contact-form]");
const formNote = document.querySelector("[data-form-note]");
const stripTrack = document.querySelector("[data-strip]");
const progressBar = document.querySelector("[data-progress]");
const heroEl = document.querySelector(".hero");

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const remap = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
const easeInQuad = (t) => t * t;
const easeInCubic = (t) => t * t * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const isWindowsPlatform = /Win/i.test(`${navigator.platform || ""} ${navigator.userAgent || ""}`);
const reduceMotionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
const prefersReducedMotion = () => !!(reduceMotionQuery && reduceMotionQuery.matches);
/* 애플 방식 — 네이티브 스크롤은 그대로 두고 시각 진행도만 lerp(전 데스크탑 공통) */
const smoothHeroScroll = !(reduceMotionQuery && reduceMotionQuery.matches);

/* 히어로 페이즈 워프 — 240svh 축소 트랙에서 막1(카피·첫 CTA)을 절대 스크롤 기준으로
   길게 유지. 원시 진행도 0~0.30을 기존 막1 창(0~0.22)에 매핑하고 잔여 구간을 재배분 —
   이후의 모든 연출 창(비트·브리지·레일·캔버스 게이트)은 원본 좌표를 그대로 재사용한다 */
const warpHeroPhase = (p) => (p < 0.3 ? p * (0.22 / 0.3) : 0.22 + (p - 0.3) * (0.78 / 0.7));

/* 히어로 CI 비디오 — 단일층: AQ 엠블럼 드로잉을 프레임 단위 스크롤 스크럽으로 구동.
   스크롤이 진행될수록 광선이 심볼을 그려나가고, 브리지 직전에 완성 프레임에 도달한다.
   재생(play)은 일절 없음 — 순수 스크럽 레이어 */
const heroVideoEls = Array.from(document.querySelectorAll("[data-hero-video]"));
const heroEmblemEl = heroVideoEls.find((el) => el.dataset.heroVideo === "emblem") || null;
let heroVideosLoaded = false;
let heroVideoLoadTimer = null;
let heroVideoActive = false; // 핀 해제 전환 감지용 래치(else 분기 1회 정지)
let heroEmblemPendingSeek = null; // 시크 진행 중 도착한 목표 시각 — seeked에서 반영(마지막 쓰기 유실 방지)

// 모바일(≤1024px)·동작 줄이기에서는 레이어가 display:none — 로드도 시크도 하지 않는다
const heroVideosEnabled = () => !!heroEmblemEl && pinEnabled && !prefersReducedMotion();

// ★load() 삭제 금지 — preload=metadata 힌트를 무력화해 duration을 확보하는 핵심 호출.
//   제거하면 duration이 NaN으로 남아 스크럽 게이트가 영원히 닫힌다(무음 실패)
function promoteHeroVideo(video) {
  if (!video || video.src || !video.dataset.src) return;
  video.src = video.dataset.src;
  video.load();
}

/* 준비 페이드 — 지연 로드 특성상 첫 프레임이 늦게 도착하는데, 그때 스크럽 농도(--hve)가
   이미 1이라 심볼이 툭 튀어나온다. 첫 프레임 확보 시점에 --hvr을 0→1로 램프해 서서히 배어나오게
   한다(CSS에서 --hve와 곱연산). transition이 아니라 rAF 램프인 이유: opacity에 transition을
   걸면 이후 스크럽 변화까지 지연돼 스크롤 동기가 무너진다 */
let heroEmblemFadeRaf = null;

function rampHeroEmblemIn() {
  if (!heroEl) return;
  if (heroEmblemFadeRaf) cancelAnimationFrame(heroEmblemFadeRaf);
  // 기준 시각은 예약 시점이 아니라 첫 프레임에서 잡는다 — 백그라운드 탭에서 로드되면
  // rAF가 멈춰 있다가 복귀하는데, 예약 시각 기준이면 경과분이 이미 지나 즉시 1로 튀어버린다
  let start = 0;
  const DUR = 620;
  const step = (now) => {
    if (!start) start = now;
    const t = clamp((now - start) / DUR, 0, 1);
    heroEl.style.setProperty("--hvr", easeOutCubic(t).toFixed(4));
    heroEmblemFadeRaf = t < 1 ? requestAnimationFrame(step) : null;
  };
  heroEmblemFadeRaf = requestAnimationFrame(step);
}

/* src 승격은 1회만 — 초기 로드(LCP) 경합을 피해 지연 실행 */
function loadHeroVideos() {
  if (heroVideosLoaded || !heroVideosEnabled()) return;
  heroVideosLoaded = true;

  // 시크 예약 반영 — 진행 중 시크에 덮인 마지막 목표를 완료 시점에 재적용
  heroEmblemEl.addEventListener("seeked", () => {
    if (heroEmblemPendingSeek === null) return;
    const t = heroEmblemPendingSeek;
    heroEmblemPendingSeek = null;
    if (Math.abs(t - heroEmblemEl.currentTime) > 0.08) heroEmblemEl.currentTime = t;
  });
  // 첫 프레임 확보 시점에 페이드 인(로드 실패 시 --hvr은 0으로 남아 레이어가 조용히 비활성)
  heroEmblemEl.addEventListener("loadeddata", rampHeroEmblemIn, { once: true });
  promoteHeroVideo(heroEmblemEl);
}

// 로드 트리거 — load 후 idle+600ms 타이머와 첫 스크롤 중 먼저 오는 쪽(중복 호출은 no-op)
function triggerHeroVideoLoad() {
  window.clearTimeout(heroVideoLoadTimer);
  heroVideoLoadTimer = null;
  loadHeroVideos();
  if (heroVideosLoaded) window.removeEventListener("scroll", triggerHeroVideoLoad);
}

// 스크럽 레이어는 재생 상태가 없지만, 혹시 모를 재생 잔존에 대비한 안전망으로 유지
function pauseHeroVideos() {
  heroVideoEls.forEach((video) => {
    if (!video.paused) video.pause();
  });
}

if (heroEmblemEl) {
  window.addEventListener("scroll", triggerHeroVideoLoad, { passive: true });
  window.addEventListener("load", () => {
    if (heroVideosLoaded) return;
    // LCP 경합 방지 — lazy 이미지 탓에 load가 매우 이르게 발화하므로 idle까지 한 번 더 양보
    const start = () => {
      heroVideoLoadTimer = window.setTimeout(triggerHeroVideoLoad, 600);
    };
    if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 1200 });
    else start();
  });
  // 탭 복귀 — 변경 가드를 무효화해 현재 스크롤 위치의 프레임으로 재동기화
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pauseHeroVideos();
    } else {
      lastHs = "";
      queueHeroProgressSync();
    }
  });
}

/* 무한 마퀴: 자식을 한 번 복제해 폭을 2배로 만들고 CSS에서 -50% 이동 */
if (stripTrack) {
  const clones = Array.from(stripTrack.children).map((item) => {
    const clone = item.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    return clone;
  });
  stripTrack.append(...clones);
}

/* ---------------------------------------------------------
   통합 스크롤 핸들러 (단일 rAF)
   - 헤더 상태 / 스크롤 진행바 / 히어로 진행도·속도 / 콘솔 패럴랙스
   --------------------------------------------------------- */
let heroProgress = 0;
let heroTargetProgress = 0;
let scrollVelocity = 0;
let lastScrollY = window.scrollY;
let heroHeight = heroEl ? heroEl.offsetHeight : 1;
let scrollTicking = false;
let heroSmoothingRaf = null;
let heroScrollInitialized = false;
let heroSmoothLastTime = 0;

/* 섹션 스크럽 — 레이아웃 읽기는 load/resize에서만, 스크롤 중엔 산술만 */
const fwSection = document.querySelector(".framework-section");
let fwTop = 0;
let fwHeight = 1;
let lastFwp = "";
let lastHs = "";
let loopScrollSync = null; // Solution 루프 블록에서 주입

/* 범용 --sp 스크럽 — data-scrub 요소를 fwp와 동일한 변경 가드로 일반화.
   top은 getBoundingClientRect 기준(offsetParent 함정 회피, 측정은 load/resize뿐) */
const scrubEls = Array.from(document.querySelectorAll("[data-scrub]")).map((el) => ({
  el,
  top: 0,
  height: 1,
  last: "",
}));

function measureSections() {
  pinEnabled = window.innerWidth > 1024 && !prefersReducedMotion();
  heroHeight = heroEl ? heroEl.offsetHeight : 1;
  if (fwSection) {
    fwTop = fwSection.offsetTop;
    fwHeight = fwSection.offsetHeight;
  }
  scrubEls.forEach((item) => {
    const rect = item.el.getBoundingClientRect();
    item.top = rect.top + window.scrollY;
    item.height = item.el.offsetHeight;
  });
}

/* 채널띠 가속 — 스크롤 속도에 비례해 재생 배율 상승, 멈추면 자연 감쇠 */
let stripAnim = null;
let stripRate = 1;
let stripDecayRaf = null;

function stripDecay() {
  stripRate += (1 - stripRate) * 0.05;
  if (stripRate < 1.02) {
    stripRate = 1;
    if (stripAnim) stripAnim.updatePlaybackRate(1);
    stripDecayRaf = null;
    return;
  }
  stripAnim.updatePlaybackRate(stripRate);
  stripDecayRaf = requestAnimationFrame(stripDecay);
}

function stripBoost() {
  if (!stripTrack || scrollVelocity < 0.05) return;
  if (!stripAnim && stripTrack.getAnimations) {
    stripAnim = stripTrack.getAnimations()[0] || null;
  }
  if (!stripAnim) return;
  const target = Math.min(1 + scrollVelocity * 2.5, 3.5);
  if (target > stripRate + 0.05) {
    stripRate = target;
    stripAnim.updatePlaybackRate(stripRate);
    if (!stripDecayRaf) stripDecayRaf = requestAnimationFrame(stripDecay);
  }
}

let pinEnabled = window.innerWidth > 1024 && !prefersReducedMotion(); // 히어로 핀 스크럽(데스크탑 전용, 동작 줄이기 시 해제)

function shouldSmoothHeroProgress() {
  return smoothHeroScroll && pinEnabled;
}

function getHeroTrackLength() {
  const vh = window.innerHeight;
  return pinEnabled ? Math.max(1, heroHeight - vh) : heroHeight * 0.85;
}

const heroChapterDots = heroEl ? Array.from(heroEl.querySelectorAll(".hero-chapters span")) : [];
let lastChapter = -1;

/* 챕터 타임테이블(240svh 트랙 · warpHeroPhase 좌표계) — 막1 카피 0–0.22(원시 0–0.30) /
   막2 정렬+비트1 0.26–0.46 / 막3 통과 줌+비트2 0.46–0.76 / 막4 브리지 0.74–0.94 / exit 0.92–1 */
function syncHeroProgressVars() {
  if (!heroEl) return;
  const key = heroProgress.toFixed(4) + (pinEnabled ? "p" : "m");
  if (key === lastHs) return;

  lastHs = key;
  if (pinEnabled) {
    const p = warpHeroPhase(heroProgress);
    heroEl.style.setProperty("--hs", easeInQuad(remap(p, 0.05, 0.22)).toFixed(4));
    heroEl.style.setProperty("--hcue", remap(p, 0.03, 0.08).toFixed(4));

    // 메시지 비트 — 스트립 오버랩을 40svh로 줄여 무대가 깨끗한 구간(~0.68)이 넓어졌으므로
    // 두 비트를 충분히 늦추고 각자 머무는 시간도 늘렸다(비트2가 너무 일찍 뜬다는 피드백 반영).
    const b1 = easeOutCubic(remap(p, 0.26, 0.33)) * (1 - easeInQuad(remap(p, 0.4, 0.45)));
    const b2 = easeOutCubic(remap(p, 0.47, 0.54)) * (1 - easeInQuad(remap(p, 0.68, 0.76)));
    heroEl.style.setProperty("--hb1", b1.toFixed(4));
    heroEl.style.setProperty("--hb2", b2.toFixed(4));

    const bridgeIn = easeOutCubic(remap(p, 0.74, 0.82));
    const bridgeOut = 1 - easeInQuad(remap(p, 0.92, 0.98));
    heroEl.style.setProperty("--hbr", (bridgeIn * bridgeOut).toFixed(4));
    heroEl.style.setProperty("--hx", easeInOutCubic(remap(p, 0.92, 1)).toFixed(4));

    const railIn = easeOutCubic(remap(p, 0.82, 0.94));
    const railOut = 1 - easeInQuad(remap(p, 0.97, 1));
    heroEl.style.setProperty("--hrl", railIn.toFixed(4));
    heroEl.style.setProperty("--hrla", (railIn * railOut).toFixed(4));
    heroEl.classList.toggle("exiting", p > 0.88 && p < 1);

    const chapter = p < 0.22 ? 0 : p < 0.47 ? 1 : p < 0.76 ? 2 : 3;
    if (chapter !== lastChapter) {
      heroChapterDots.forEach((dot, i) => dot.classList.toggle("on", i === chapter));
      lastChapter = chapter;
    }

    // 비디오 레이어 — 창 함수는 비트/브리지와 동일 문법(전부 p 순수 함수)
    if (heroVideosEnabled()) {
      // 엠블럼 소멸 — 완성(0.64)을 충분히 보여준 뒤 0.66부터 0.84까지 선형 소멸.
      // 브리지 등장(0.74~0.82)과 겹쳐 지워지고 수평선 레일(railIn 0.82~0.94)로 릴레이
      const hve = 1 - remap(p, 0.66, 0.84);
      heroEl.style.setProperty("--hve", hve.toFixed(4));

      // 프레임 단위 스크럽 — p 0~0.50을 영상 0~5.6s(광선이 휘도는 구간)에만 매핑한다.
      // ★종료점 0.64는 후행 신호 스트립이 무대를 밀고 올라오기 시작하는 0.68보다 앞:
      //   화면이 넘어가기 전에 드로잉이 반드시 끝나야 한다는 요구를 만족시킨다.
      // 원본 8s 중 5.6s 이후는 완성 심볼이 멈춰 있는 정지 구간이라 매핑에서 제외한다.
      // 비트2(정렬 선언)가 완전히 뜨는 0.54가 영상 4.7s = 아직 휘도는 구간이라
      // "생성 중에 메시지가 얹히고, 그 위에서 심볼이 마저 완성"되는 순서가 된다.
      // play() 금지 — 순수 스크럽. 미로드 시 duration NaN이라 자연 통과
      const HERO_EMBLEM_MOTION_END = 5.6;
      if (Number.isFinite(heroEmblemEl.duration) && heroEmblemEl.duration > 0) {
        const t = Math.min(heroEmblemEl.duration, HERO_EMBLEM_MOTION_END) * remap(p, 0, 0.64);
        if (heroEmblemEl.seeking) {
          // 진행 중 시크를 덮지 않고 예약 — seeked 리스너가 최종 목표를 반영(마지막 쓰기 유실 방지)
          heroEmblemPendingSeek = t;
        } else if (Math.abs(t - heroEmblemEl.currentTime) > 0.08) {
          // 0.08s 데드밴드 — lerp 미세 진동으로 매 프레임 시크가 걸리는 것을 막는다
          heroEmblemPendingSeek = null;
          heroEmblemEl.currentTime = t;
        }
      }

      heroVideoActive = true;
    }
  } else {
    heroEl.style.setProperty("--hs", heroProgress.toFixed(4));
    // 핀 해제(리사이즈로 ≤1024px 진입 등) — 잔존 재생 안전망 1회 정지
    if (heroVideoActive) {
      heroVideoActive = false;
      pauseHeroVideos();
    }
  }
}

function smoothHeroProgressFrame(frameNow) {
  heroSmoothingRaf = null;

  if (!shouldSmoothHeroProgress()) {
    heroProgress = heroTargetProgress;
    heroSmoothLastTime = 0;
    syncHeroProgressVars();
    return;
  }

  const now = frameNow || performance.now();
  const frameRatio = heroSmoothLastTime ? clamp((now - heroSmoothLastTime) / 16.67, 0.5, 2.5) : 1;
  heroSmoothLastTime = now;

  const diff = heroTargetProgress - heroProgress;
  if (Math.abs(diff) < 0.0002) {
    heroProgress = heroTargetProgress;
    heroSmoothLastTime = 0;
    syncHeroProgressVars();
    return;
  }

  const baseLerp = clamp(0.12 + scrollVelocity * 0.04, 0.12, 0.18);
  const progressLerp = 1 - Math.pow(1 - baseLerp, frameRatio);
  heroProgress += diff * progressLerp;
  syncHeroProgressVars();
  heroSmoothingRaf = requestAnimationFrame(smoothHeroProgressFrame);
}

function queueHeroProgressSync() {
  if (!heroScrollInitialized || !shouldSmoothHeroProgress()) {
    if (heroSmoothingRaf) {
      cancelAnimationFrame(heroSmoothingRaf);
      heroSmoothingRaf = null;
    }
    heroSmoothLastTime = 0;
    heroProgress = heroTargetProgress;
    heroScrollInitialized = true;
    syncHeroProgressVars();
    return;
  }

  if (!heroSmoothingRaf) heroSmoothingRaf = requestAnimationFrame(smoothHeroProgressFrame);
}

function onScrollFrame() {
  const y = window.scrollY;

  if (header) header.classList.toggle("scrolled", y > 16);

  if (progressBar) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.setProperty("--p", max > 0 ? clamp(y / max, 0, 1).toFixed(4) : "0");
  }

  const heroTrack = getHeroTrackLength();
  heroTargetProgress = clamp(y / heroTrack, 0, 1);
  const rawScrollVelocity = clamp(Math.abs(y - lastScrollY) / 40, 0, 1);
  scrollVelocity = shouldSmoothHeroProgress()
    ? scrollVelocity + (rawScrollVelocity - scrollVelocity) * 0.35
    : rawScrollVelocity;
  lastScrollY = y;
  queueHeroProgressSync();

  if (fwSection && !prefersReducedMotion()) {
    const vh = window.innerHeight;
    const fwp = clamp((y + vh - fwTop) / (vh + fwHeight), 0, 1).toFixed(3);
    if (fwp !== lastFwp) {
      fwSection.style.setProperty("--fwp", fwp);
      lastFwp = fwp;
    }
  }

  if (scrubEls.length && !prefersReducedMotion()) {
    const vh = window.innerHeight;
    for (let i = 0; i < scrubEls.length; i += 1) {
      const item = scrubEls[i];
      const sp = clamp((y + vh - item.top) / (vh + item.height), 0, 1).toFixed(3);
      // 변경 가드 — 뷰포트 밖(0/1 고정) 재설정 스킵
      if (sp !== item.last) {
        item.el.style.setProperty("--sp", sp);
        item.last = sp;
      }
    }
  }

  if (loopScrollSync) loopScrollSync(y);
  stripBoost();

  scrollTicking = false;
}

window.addEventListener(
  "scroll",
  () => {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(onScrollFrame);
    }
  },
  { passive: true },
);

/* 동작 줄이기 — 스크럽 변수를 완료 상태로 고정(styles.css 하단 reduce 블록과 세트) */
function applyMotionPreference() {
  if (!prefersReducedMotion()) return;
  if (fwSection) {
    fwSection.style.setProperty("--fwp", "1");
    lastFwp = "1";
  }
  scrubEls.forEach((item) => {
    item.el.style.setProperty("--sp", "1");
    item.last = "1";
  });
}

if (reduceMotionQuery && typeof reduceMotionQuery.addEventListener === "function") {
  reduceMotionQuery.addEventListener("change", () => {
    measureSections();
    applyMotionPreference();
    pauseHeroVideos(); // CI 비디오 — 설정 전환 즉시 정지(복귀는 스크럽 갱신이 담당)
    lastHs = "";
    queueHeroProgressSync();
    // 캔버스 등 기존 리사이즈 경로 재사용 — 루프 재기동/정지 프레임 전환
    window.dispatchEvent(new Event("resize"));
  });
}

/* 인트로 스킵 — 히어로 트랙 끝(p=1)으로 이동해 본문 시작점에 착지 */
const heroSkipBtn = document.querySelector("[data-hero-skip]");
if (heroSkipBtn && heroEl) {
  heroSkipBtn.addEventListener("click", () => {
    const targetY = Math.max(0, heroEl.offsetTop + heroEl.offsetHeight - window.innerHeight);
    window.scrollTo({ top: targetY, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  });
}

let measureTimer;
window.addEventListener("resize", () => {
  window.clearTimeout(measureTimer);
  // 재측정 후 진행도 재동기화 — 핀 토글(데스크탑↔모바일) 시 비가시 비디오가 다음 스크롤까지
  // 계속 디코딩되는 문제를 즉시 정리(lastHs의 p/m 키가 전환을 감지)
  measureTimer = window.setTimeout(() => {
    measureSections();
    queueHeroProgressSync();
  }, 160);
});
measureSections();
applyMotionPreference();
onScrollFrame();
// lazy 이미지 로드로 후행 섹션 높이가 변한 뒤 오프셋 캐시 재측정
window.addEventListener("load", measureSections);

/* 모바일 메뉴 */
if (menuToggle && mobilePanel) {
  const setMenu = (open) => {
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    mobilePanel.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
    if (open) {
      mobilePanel.removeAttribute("inert");
    } else {
      mobilePanel.setAttribute("inert", "");
    }
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    setMenu(!isOpen);
  });

  mobilePanel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      menuToggle.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (menuToggle.getAttribute("aria-expanded") !== "true") return;
    if (mobilePanel.contains(event.target) || menuToggle.contains(event.target)) return;
    setMenu(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1024) setMenu(false);
  });
}

/* Scrollspy — 현재 섹션 내비 강조 */
const navLinks = document.querySelectorAll("[data-nav] a");
if (navLinks.length && "IntersectionObserver" in window) {
  const byId = new Map();
  navLinks.forEach((link) => {
    const id = link.getAttribute("href").replace("#", "");
    const section = document.getElementById(id);
    if (section) byId.set(section, link);
  });

  // 내비에 없는 섹션은 인접 메뉴로 매핑(스파이 사각지대 제거)
  const proxyMap = { "about-detail": "about", framework: "about", reference: "works" };
  Object.entries(proxyMap).forEach(([sectionId, navId]) => {
    const section = document.getElementById(sectionId);
    const link = Array.from(navLinks).find((l) => l.getAttribute("href") === `#${navId}`);
    if (section && link) byId.set(section, link);
  });

  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((l) => l.classList.remove("active"));
          const link = byId.get(entry.target);
          if (link) link.classList.add("active");
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
  );
  byId.forEach((_, section) => spy.observe(section));
}

/* Works 필터 — 업종 9종(Commerce는 업종이 아니라 비즈니스 형태라 제외).
   데이터 계약(data-filter / .hidden / stagger-done / measureSections)은 그대로. */
const filterButtons = document.querySelectorAll("[data-work-tabs] [data-filter]");
if (filterButtons.length) {
  const workGrid = document.querySelector(".work-grid");
  const workStatus = document.querySelector("[data-work-status]");
  const filterLabels = {
    all: "전체",
    health: "Health",
    food: "Food",
    home: "Home",
    pet: "Pet",
    digital: "Digital",
    bedding: "Bedding",
    sports: "Sports",
    service: "Service",
  };

  const applyWorkFilter = (filter) => {
    filterButtons.forEach((btn) => {
      const active = btn.dataset.filter === filter;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    // display 토글이 등장 keyframe을 되감지 않도록 stagger를 완료 상태로 고정
    if (workGrid) workGrid.classList.add("stagger-done");

    let visible = 0;
    document.querySelectorAll(".work-grid .work-card").forEach((card) => {
      const match = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("hidden", !match);
      if (match) visible += 1;
    });

    if (workStatus) {
      const label = filterLabels[filter] || filterLabels.all;
      workStatus.textContent = `${label} 사례 ${visible}건을 표시합니다.`;
    }

    measureSections(); // 카드 표시/숨김으로 섹션 높이가 바뀌므로 스크럽 오프셋 재측정
  };

  // 초기 상태 — 마크업에 aria-pressed가 없어 JS에서 세팅(활성 칩 기준, 기본값 all)
  const activeButton = document.querySelector("[data-work-tabs] [data-filter].is-active");
  filterButtons.forEach((btn) => {
    const active = activeButton ? btn === activeButton : btn.dataset.filter === "all";
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => applyWorkFilter(btn.dataset.filter || "all"));
  });
}

/* 로고월 더 보기 — 접힘 기준은 CSS(.is-collapsed)가 뷰포트별로 가른다.
   데스크탑 40장 / 모바일(≤720px) priority 18장 → 펼치면 전수.
   버튼과 접힘 클래스를 JS가 부여하므로 JS 미실행 환경은 70장 전량 노출 */
const logoWall = document.querySelector(".logo-wall");
if (logoWall) {
  const logoTiles = logoWall.querySelectorAll(".logo-tile");
  const DESKTOP_VISIBLE = 40; // styles.css의 :nth-child(n + 41)과 짝 — 함께 바꿀 것
  const priorityTiles = logoWall.querySelectorAll(".logo-tile.priority").length;

  if (logoTiles.length > DESKTOP_VISIBLE || logoTiles.length > priorityTiles) {
    const referenceSection = logoWall.closest("section");
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "logo-more";
    toggle.textContent = "더 보기";
    toggle.setAttribute("aria-expanded", "false");
    if (logoWall.id) toggle.setAttribute("aria-controls", logoWall.id);

    logoWall.classList.add("is-collapsed");
    logoWall.after(toggle);

    toggle.addEventListener("click", () => {
      const expand = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", expand ? "true" : "false");
      toggle.textContent = expand ? "접기" : "더 보기";
      logoWall.classList.toggle("is-collapsed", !expand);

      // 접을 때만 보정 — 로고월이 접히면 버튼이 1800px 넘게 위로 올라가므로
      // 뷰포트가 그대로면 뒤 섹션에 떨어진다. html{scroll-behavior:smooth}를
      // 상속하면 그 거리를 훑고 지나가므로 instant로 끊고, 헤더 가림은
      // scroll-padding-top을 읽는 scrollIntoView가 알아서 피한다
      if (!expand && referenceSection && referenceSection.getBoundingClientRect().top < 0) {
        referenceSection.scrollIntoView({ block: "start", behavior: "instant" });
      }

      measureSections(); // 로고월 높이가 바뀌므로 스크럽 오프셋 재측정
    });
  }
}

/* 폼 칩 선택 하이라이트 — :has() 미지원 브라우저 폴백(.checked 미러링) */
document.querySelectorAll(".check input").forEach((input) => {
  const sync = () => {
    if (input.type === "radio") {
      document.querySelectorAll(`.check input[name="${input.name}"]`).forEach((r) => {
        r.closest(".check").classList.toggle("checked", r.checked);
      });
    } else {
      input.closest(".check").classList.toggle("checked", input.checked);
    }
  };
  input.addEventListener("change", sync);
});

/* 커스텀 드롭다운 — 디스클로저 버튼 + 스크롤 팝오버, 내부는 native input 유지 */
let requestSelectOpen = null; // 제출 검증에서 예산 드롭다운을 열기 위해 주입
const selects = document.querySelectorAll(".select");
if (selects.length) {
  let openSelect = null;

  const closeSelect = (select, focusToggle) => {
    select.classList.remove("is-open");
    select.querySelector(".select-toggle").setAttribute("aria-expanded", "false");
    select.querySelector(".select-panel").hidden = true;
    if (openSelect === select) openSelect = null;
    if (focusToggle) select.querySelector(".select-toggle").focus();
  };

  const openSelectEl = (select) => {
    if (openSelect && openSelect !== select) closeSelect(openSelect, false); // 다른 드롭다운은 닫기
    select.classList.add("is-open");
    select.querySelector(".select-toggle").setAttribute("aria-expanded", "true");
    select.querySelector(".select-panel").hidden = false;
    openSelect = select;
  };
  requestSelectOpen = openSelectEl;

  // 선택 요약 갱신 — multi는 "검색광고 외 2개" 형식, single은 선택 라벨
  const updateSummary = (select) => {
    const valueEl = select.querySelector("[data-select-value]");
    const checked = Array.from(select.querySelectorAll(".select-list input")).filter((i) => i.checked);
    const labelOf = (input) => input.closest(".check").querySelector("span").textContent;
    let text;
    if (!checked.length) {
      text = "선택해주세요";
    } else if (select.dataset.select === "multi" && checked.length > 1) {
      text = `${labelOf(checked[0])} 외 ${checked.length - 1}개`;
    } else {
      text = labelOf(checked[0]);
    }
    valueEl.textContent = text;
    valueEl.classList.toggle("is-filled", checked.length > 0);
  };

  selects.forEach((select) => {
    const toggle = select.querySelector(".select-toggle");
    const inputs = Array.from(select.querySelectorAll(".select-list input"));

    toggle.addEventListener("click", () => {
      if (select.classList.contains("is-open")) closeSelect(select, false);
      else openSelectEl(select);
    });

    inputs.forEach((input) => {
      input.addEventListener("change", () => {
        updateSummary(select);
        if (select.dataset.select === "single") closeSelect(select, true); // single은 선택 즉시 닫힘
      });
    });

    // ArrowUp/Down — 토글/옵션 어디서든 옵션 포커스 이동(닫혀 있으면 먼저 열기)
    select.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      if (!select.classList.contains("is-open")) openSelectEl(select);
      const active = inputs.indexOf(document.activeElement);
      let next;
      if (active === -1) {
        next = event.key === "ArrowDown" ? 0 : inputs.length - 1;
      } else {
        next =
          event.key === "ArrowDown"
            ? Math.min(inputs.length - 1, active + 1)
            : Math.max(0, active - 1);
      }
      inputs[next].focus();
    });

    updateSummary(select); // 초기 요약(뒤로가기 복원값 대비)
  });

  // 바깥 클릭 / Escape로 닫기 — 문서에 각 1회만 위임(누수 없음)
  document.addEventListener("click", (event) => {
    if (openSelect && !openSelect.contains(event.target)) closeSelect(openSelect, false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openSelect) closeSelect(openSelect, true); // Escape는 토글로 포커스 복귀
  });
}

/* Contact 폼 (mailto) */
if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      if (formNote) formNote.textContent = "필수 항목과 개인정보 동의를 확인해주세요.";
      return;
    }

    // 예산 수동 검증 — 라디오 required를 제거했으므로 미선택 시 드롭다운을 열고 안내
    const budgetSelect = contactForm.querySelector('.select[data-select="single"]');
    if (budgetSelect && !budgetSelect.querySelector("input:checked")) {
      if (requestSelectOpen) requestSelectOpen(budgetSelect);
      budgetSelect.querySelector(".select-toggle").focus();
      if (formNote) formNote.textContent = "월 평균 마케팅 예산을 선택해주세요.";
      return;
    }

    const formData = new FormData(contactForm);
    const company = formData.get("company");
    const siteUrl = String(formData.get("siteUrl") || "").trim() || "-";
    const name = formData.get("name");
    const phone = formData.get("phone");
    const email = formData.get("email");
    const adTypes = formData.getAll("adtype");
    const adTypeText = adTypes.length ? adTypes.join(", ") : "-";
    const budget = formData.get("budget") || "-";
    const message = formData.get("message");
    const subject = encodeURIComponent(`[AQNET 문의] ${company} / ${name}`);
    const body = encodeURIComponent(
      `회사명/업체명: ${company}\n사이트 URL: ${siteUrl}\n담당자명: ${name}\n연락처: ${phone}\n이메일: ${email}\n광고 종류: ${adTypeText}\n월 평균 마케팅 예산: ${budget}\n\n문의 내용/주요 목표:\n${message}\n\n개인정보 수집·이용 동의: 동의함`,
    );

    window.location.href = `mailto:contact@aqnet.co.kr?subject=${subject}&body=${body}`;
    // 성공 톤 안내 — 다만 실제 전송은 사용자의 메일 앱에서 일어나므로
    // '서버로 접수 완료'로 오인되지 않도록 마지막 전송 단계를 반드시 명시한다
    if (formNote) {
      formNote.textContent =
        "문의 내용이 메일로 작성되었습니다. 메일 앱에서 전송하시면 영업일 기준 1일 이내 연락드리겠습니다. 메일 앱이 열리지 않으면 contact@aqnet.co.kr 로 보내주세요.";
    }
  });
}

/* 숫자 카운트업 */
const counters = document.querySelectorAll("[data-count]");
if (counters.length) {
  const animateCount = (el) => {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || "";
    const done = () => {
      const cell = el.closest("article");
      if (cell) cell.classList.add("counted");
    };
    // 동작 줄이기 — 카운트업 없이 즉시 최종값(DOM 기본값과 동일)
    if (prefersReducedMotion()) {
      el.textContent = `${target}${suffix}`;
      done();
      return;
    }
    // DOM에는 최종 숫자가 박혀 있다(JS 미실행·옵저버 미발화 대비).
    // 0은 애니메이션을 실제로 시작하는 순간에만 세운다
    el.textContent = `0${suffix}`;
    const duration = 1100;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = `${Math.round(target * eased)}${suffix}`;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        done();
      }
    };
    requestAnimationFrame(step);
  };

  const countObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 },
  );
  counters.forEach((el) => countObserver.observe(el));
}

/* 섹션 헤딩 라인 마스크 리빌 — <br> 단위 라인 래핑(노드 이동이라 .grad/.nowrap 보존) */
document.querySelectorAll(".section-heading h2").forEach((h2) => {
  if (!h2.closest("[data-reveal]")) return; // 리빌 트리거 없는 헤딩은 마스크 은닉 금지
  const lines = [[]];
  Array.from(h2.childNodes).forEach((node) => {
    if (node.nodeName === "BR") {
      lines.push([]);
      node.remove();
    } else {
      lines[lines.length - 1].push(node);
    }
  });
  lines.forEach((nodes, lineIndex) => {
    const outer = document.createElement("span");
    outer.className = "h-line";
    const inner = document.createElement("span");
    inner.className = "h-line-inner";
    inner.style.setProperty("--ln", lineIndex);
    nodes.forEach((n) => inner.appendChild(n));
    outer.appendChild(inner);
    h2.appendChild(outer);
  });
  h2.classList.add("lines-ready");
});

/* 로고월 타일 stagger 인덱스(지연 상한 캡) */
document.querySelectorAll(".logo-tile").forEach((tile, i) => {
  tile.style.setProperty("--li", Math.min(i, 34));
});

/* 스크롤 진입 리빌 (+ stagger 인덱스, 차트 그로우) */
const revealItems = document.querySelectorAll("[data-reveal]");

document.querySelectorAll("[data-stagger]").forEach((group) => {
  Array.from(group.children).forEach((child, i) => child.style.setProperty("--i", i));
});

const drawChartBars = (bars) => {
  const fills = bars.querySelectorAll(".ch-fill");
  const targets = fills.length ? Array.from(fills) : Array.from(bars.children);
  targets.forEach((el, i) => {
    el.style.transitionDelay = `${i * 60}ms`;
  });
  bars.classList.add("drawn");
};

if (revealItems.length) {
  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((el) => el.classList.add("is-visible"));
    const bars = document.querySelector("[data-bars]");
    if (bars) bars.classList.add("drawn");
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            const bars = entry.target.querySelector("[data-bars]");
            if (bars) drawChartBars(bars);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    revealItems.forEach((el) => revealObserver.observe(el));
  }
}

/* AQ Growth OS — 운영 루프 순환 + 콘솔 패널 동기화 (모션 설정과 무관하게 항상 동작) */
const loop = document.querySelector("[data-loop]");
if (loop) {
  const nodes = Array.from(loop.querySelectorAll(".loop-node"));
  const syncEls = Array.from(document.querySelectorAll("[data-sync]"));
  const panel = document.querySelector(".solution-panel");
  const statusEl = document.querySelector(".console-status");
  const STATUS = [
    "STEP 01 · Collect — 12개 소스 수집 중",
    "STEP 02 · Analyze — 채널 기여도 재계산",
    "STEP 03 · Decide — 예산 재배분 우선순위 산출",
    "STEP 04 · Execute — 캠페인 액션 반영 중",
    "STEP 05 · Learn — 다음 가설로 학습 반영",
  ];
  let nodeCenters = [];
  let active = 0;
  let timer;

  const measureNodes = () => {
    const cursorX = parseFloat(getComputedStyle(loop).getPropertyValue("--loop-cursor-x")) || 40;
    const loopRect = loop.getBoundingClientRect();
    nodeCenters = nodes.map((node) => {
      const nodeRect = node.getBoundingClientRect();
      return {
        x: cursorX,
        y: nodeRect.top - loopRect.top + nodeRect.height / 2,
      };
    });
  };

  const setActive = (index) => {
    nodes.forEach((n, i) => {
      n.classList.toggle("active", i === index);
      if (i === index) {
        n.setAttribute("aria-current", "step");
      } else {
        n.removeAttribute("aria-current");
      }
    });
    syncEls.forEach((el) => el.classList.toggle("lit", el.dataset.sync === String(index)));
    loop.classList.toggle("returning", index === nodes.length - 1);
    if (panel) panel.classList.toggle("learning", index === nodes.length - 1);
    measureNodes();
    if (nodeCenters.length) {
      loop.style.setProperty("--cx", `${nodeCenters[index].x}px`);
      loop.style.setProperty("--cy", `${nodeCenters[index].y}px`);
    }
    if (statusEl) {
      statusEl.textContent = STATUS[index] || "";
      if (statusEl.animate) {
        statusEl.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 240, easing: "ease-out" });
      }
    }
  };

  const start = () => {
    timer = window.setInterval(() => {
      active = (active + 1) % nodes.length;
      setActive(active);
    }, 3000);
  };

  let loopVisible = false;
  let idleTimer = null;

  /* 스크롤 스크럽 — 섹션 통과 진행도로 루프를 문지르고, 멈추면 4초 후 자동 순환 재개 */
  const solutionSection = document.querySelector(".solution-section");
  let solTop = 0;
  let solHeight = 1;
  const measureSolution = () => {
    if (solutionSection) {
      solTop = solutionSection.offsetTop;
      solHeight = solutionSection.offsetHeight;
    }
    measureNodes();
  };
  measureSolution();
  setActive(0); // 커서 초기 위치 + 상태 라인 초기화
  let solTimer;
  window.addEventListener("resize", () => {
    window.clearTimeout(solTimer);
    solTimer = window.setTimeout(() => {
      measureSolution();
      setActive(active);
    }, 200);
  });

  loopScrollSync = (y) => {
    if (!solutionSection || !loopVisible || scrollVelocity < 0.02) return;
    const vh = window.innerHeight;
    const p = (y + vh - solTop) / (vh + solHeight);
    if (p <= 0 || p >= 1) return;
    const wide = window.innerWidth > 1024;
    const lo = wide ? 0.2 : 0.15;
    const span = wide ? 0.6 : 0.7;
    const idx = clamp(Math.floor(((p - lo) / span) * nodes.length), 0, nodes.length - 1);
    if (idx !== active) {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
      active = idx;
      setActive(active);
    }
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (!timer && loopVisible) start();
    }, 4000);
  };

  if ("IntersectionObserver" in window) {
    const loopObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          loopVisible = entry.isIntersecting;
          if (entry.isIntersecting) {
            if (!timer) start();
          } else {
            window.clearInterval(timer);
            timer = null;
            window.clearTimeout(idleTimer);
          }
        });
      },
      { threshold: 0.25 },
    );
    loopObserver.observe(loop);
  } else {
    loopVisible = true;
    start();
  }
}

/* ---------------------------------------------------------
   히어로 데이터 네트워크 캔버스
   - 포인터 잔물결 / 스크롤 페이드·스트림 가속 / 가시성 정지 / 허브 노드
   --------------------------------------------------------- */
const canvas = document.getElementById("heroCanvas");
if (canvas && canvas.getContext) {
  const context = canvas.getContext("2d");
  let particles = [];
  let animationFrame = null;
  let running = false;
  let viewW = 0;
  let viewH = 0;
  let canvasRect = canvas.getBoundingClientRect();
  let canvasDocTop = canvasRect.top + window.scrollY;

  const pointer = { x: -9999, y: -9999, active: false };
  const target = { x: -9999, y: -9999 };
  const PR = { radiusSq: 170 * 170, push: 14, damp: 0.88, lerp: 0.12 };

  const isWindows = isWindowsPlatform;
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
  const motionLite = isWindows || lowPower;

  const bootT = performance.now(); // 로드 인트로(캔버스 페이드-인) 기준 시각

  function buildScene(width, height) {
    const density = isWindows ? 26000 : motionLite ? 21000 : 15500;
    const countMax = isWindows ? 62 : motionLite ? 76 : 104;
    let count = clamp(Math.round((width * height) / density), 34, countMax);
    if (width < 720) count = Math.min(count, 40);
    if (lowPower) count = Math.round(count * 0.7);

    particles = Array.from({ length: count }, (_, index) => ({
      // 카피(좌측)가 주인공인 첫 화면 — 파티클 60%를 우측 반부에 편향 배치
      baseX: index % 5 < 3 ? width * (0.45 + Math.random() * 0.6) : Math.random() * width,
      baseY: Math.random() * height,
      ox: 0,
      oy: 0,
      x: 0,
      y: 0,
      f: 0,
      g: 1,
      s: 1,
      r: index % 7 === 0 ? 2.2 : 1.35,
      // 심도 성층 — 1/8은 원경(끝까지 화면에 남아 줌 후반 공백 방지), 나머지는 근·중경
      d: index % 8 === 0 ? 0.12 + Math.random() * 0.08 : 0.35 + Math.random() * 0.65,
      hub: index % 11 === 0,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.18,
      alpha: 0.28 + Math.random() * 0.48,
    }));
    particles.forEach((p) => {
      p.x = p.baseX;
      p.y = p.baseY;
    });
  }

  function resizeCanvas() {
    const dprCap = window.innerWidth < 720 ? 1.4 : isWindows ? 1.1 : lowPower ? 1.35 : 2;
    const ratio = Math.min(window.devicePixelRatio || 1, dprCap);
    const rect = canvas.getBoundingClientRect();
    canvasRect = rect;
    canvasDocTop = rect.top + window.scrollY;
    // 크기는 offset 값 사용 — exit 중 무대가 scale된 상태에서 리사이즈돼도 백버퍼 유지
    viewW = canvas.offsetWidth;
    viewH = canvas.offsetHeight;
    canvas.width = Math.floor(viewW * ratio);
    canvas.height = Math.floor(viewH * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    buildScene(viewW, viewH);
  }

  function drawScene(frameNow) {
    const now = frameNow || performance.now();
    if (pointer.active) {
      pointer.x += (target.x - pointer.x) * PR.lerp;
      pointer.y += (target.y - pointer.y) * PR.lerp;
    }

    context.clearRect(0, 0, viewW, viewH);
    // Fly-through 마스터 커브 — 전부 p 순수 함수(역스크롤 자연 복원).
    // 핀 모드는 DOM 비트와 동일한 워프 좌표계 공유(막 경계 정합)
    const p9 = pinEnabled ? warpHeroPhase(heroProgress) : heroProgress;
    // 막2 질서: 지터 감쇠 + 좌향 층류. 모바일은 시간 기반 자율 사이클(~14s 호흡)
    let alignK;
    if (pinEnabled) {
      alignK = easeInOutCubic(remap(p9, 0.26, 0.42));
    } else {
      const s = 0.5 + 0.5 * Math.sin(((now - bootT) * Math.PI * 2) / 14000 - Math.PI / 2);
      alignK = s * s * (3 - 2 * s) * 0.85;
    }
    // 막3 진입: 방사 줌 마스터(초점 = 코어). 층류는 줌에 자리를 양보
    const Zm = pinEnabled ? easeInQuad(remap(p9, 0.46, 0.8)) : 0;
    const flowK = alignK * (1 - 0.8 * (pinEnabled ? remap(p9, 0.5, 0.64) : 0));
    // 막1 카피 게이트 — 침강에 비례해 좌측 감쇠 해제
    const sinkK = pinEnabled ? easeInQuad(remap(p9, 0.05, 0.22)) : 0;
    const introK = easeOutCubic(clamp((now - bootT) / 1100, 0, 1)); // 로드 페이드-인
    context.globalAlpha =
      introK *
      (pinEnabled ? 1 - easeInQuad(remap(p9, 0.58, 0.76)) : 1 - heroProgress * 0.85);

    // 오버랩에 가려진 종반 — 드로우 패스 생략(rAF만 유지)
    if (context.globalAlpha < 0.02) {
      context.globalAlpha = 1;
      if (running) animationFrame = requestAnimationFrame(drawScene);
      return;
    }

    const gx = viewW * 0.78;
    const gy = viewH * 0.24 + heroProgress * 40;
    const gradient = context.createRadialGradient(gx, gy, 30, gx, gy, viewW * 0.62);
    gradient.addColorStop(0, "rgba(3, 144, 238, 0.20)");
    gradient.addColorStop(0.42, "rgba(34, 118, 255, 0.10)");
    gradient.addColorStop(1, "rgba(5, 7, 13, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, viewW, viewH);

    // 방사 줌 초점 좌표 — 궤도 다이어그램(링·위성·라벨·코어)은 제거됨(2026-08 피드백:
    // AQ 엠블럼 영상이 주연이 되면서 회전 원형 그래프와 시각 중복). 좌표는 파티클
    // 방사 줌·모션 스트릭의 기준점으로만 유지
    const compactHero = !pinEnabled && viewW < 720;
    const orbCx = viewW * (pinEnabled ? 0.7 : compactHero ? 0.78 : 0.76);
    const orbCy = viewH * (pinEnabled ? 0.42 : compactHero ? 0.24 : 0.3); // 데스크탑: 레일(42%)과 동일 좌표 정박

    // update pass — drift + 층류 + pointer ripple + 방사 줌 (좌표는 매 프레임 재계산: p 순수 함수)
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      p.baseX += p.vx;
      p.baseY += p.vy * (1 - alignK); // 막2 질서 — 세로 지터 감쇠(방향 정렬)
      // 막2 층류 — 마퀴 방향(좌향) 흐름. 허브는 패킷처럼 빠르게. 줌 시작 후 자리 양보
      if (flowK > 0) p.baseX -= flowK * p.d * (p.hub ? 1.6 : 0.9);
      if (p.baseX < -20) p.baseX = viewW + 20;
      if (p.baseX > viewW + 20) p.baseX = -20;
      if (p.baseY < -20) p.baseY = viewH + 20;
      if (p.baseY > viewH + 20) p.baseY = -20;

      let f = 0;
      const px = p.baseX + p.ox;
      const py = p.baseY + p.oy;
      // 줌 중에는 포인터 리플 무시(투영 좌표와 포인터 좌표가 어긋나는 구간)
      if (pointer.active && Zm < 0.15) {
        const dx = px - pointer.x;
        const dy = py - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < PR.radiusSq) {
          f = 1 - d2 / PR.radiusSq;
          const inv = 1 / (Math.sqrt(d2) + 0.001);
          // 정렬 후에는 리플 감쇠 — 구조가 흩어지지 않고 출렁임 후 복귀
          const push = PR.push * (1 - alignK * 0.7);
          p.ox += dx * inv * push * f * 0.15;
          p.oy += dy * inv * push * f * 0.15;
        }
      }
      p.ox *= PR.damp;
      p.oy *= PR.damp;
      p.x = p.baseX + p.ox;
      p.y = p.baseY + p.oy;
      p.f = f;
      // 막3 방사 줌 — 초점(코어)에서 심도별 확산. 가까운 것(d 큼)이 먼저 빠르게 지나감
      if (Zm > 0) {
        const S = 1 + Zm * (0.8 + 11 * p.d * p.d);
        p.x = orbCx + (p.x - orbCx) * S;
        p.y = orbCy + (p.y - orbCy) * S;
        p.s = S;
      } else {
        p.s = 1;
      }
      // 카피 보호 게이트 — 좌측 반부 알파 감쇠(침강 완료에 비례해 해제). 모바일 미적용
      p.g = pinEnabled && p.x < viewW * 0.46 ? 0.55 + 0.45 * sinkK : 1;
    }

    // connections — 줌 진입과 함께 페이드아웃, 이후 루프 자체를 스킵(성능)
    const structK = alignK * 0.5;
    const linkFade = pinEnabled ? 1 - remap(p9, 0.48, 0.62) : 1;
    if (linkFade > 0.01) {
      const linkBoost = 1 + 1.1 * structK;
      const linkStep = isWindows ? 3 : motionLite ? 2 : 1;
      context.lineWidth = 1;
      for (let i = 0; i < particles.length; i += linkStep) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += linkStep) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          // 정렬 중 이방성 판정 — 세로 링크 감쇠·가로 링크 증폭(스트림化), sqrt 추가 없음
          const d2 =
            structK > 0
              ? dx * dx * (1 - 0.5 * structK) + dy * dy * (1 + 2 * structK)
              : dx * dx + dy * dy;
          if (d2 < 16384) {
            const dist = Math.sqrt(d2);
            const near = Math.max(a.f, b.f);
            const alpha =
              (0.14 * (1 - dist / 128) + 0.22 * near) * linkBoost * linkFade * ((a.g + b.g) * 0.5);
            context.strokeStyle =
              near > 0.02 ? `rgba(3, 144, 238, ${alpha})` : `rgba(122, 183, 255, ${alpha})`;
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
          }
        }
      }
    }

    // nodes — 저속: 도트 / 고속 통과(S>2.5): 방사 방향 모션 스트릭
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      const nodeA = Math.min(1, p.alpha + 0.5 * p.f + 0.2 * alignK) * p.g;
      if (p.s > 2.5) {
        const ddx = p.x - orbCx;
        const ddy = p.y - orbCy;
        const dl = Math.sqrt(ddx * ddx + ddy * ddy) + 0.001;
        const L = Math.min((p.s - 2.5) * 3, 16);
        context.strokeStyle = `rgba(255, 255, 255, ${nodeA * 0.8})`;
        context.lineWidth = Math.min(p.r * (1 + (p.s - 1) * 0.15), 2.4);
        context.beginPath();
        context.moveTo(p.x, p.y);
        context.lineTo(p.x - (ddx / dl) * L, p.y - (ddy / dl) * L);
        context.stroke();
      } else {
        if (p.hub) {
          context.shadowBlur = 6;
          context.shadowColor = "rgba(3, 144, 238, 0.8)";
        }
        context.fillStyle = `rgba(255, 255, 255, ${nodeA})`;
        context.beginPath();
        context.arc(p.x, p.y, Math.min(p.r * (1 + (p.s - 1) * 0.35), 6) + 1.1 * p.f, 0, Math.PI * 2);
        context.fill();
        if (p.hub) context.shadowBlur = 0;
      }
    }
    context.lineWidth = 1;

    context.globalAlpha = 1;

    if (running) animationFrame = requestAnimationFrame(drawScene);
  }


  function startLoop() {
    if (running) return;
    // 동작 줄이기 — 루프 없이 정지 프레임 1장만 렌더(배경 아이덴티티는 유지).
    // 로드 페이드-인(introK)을 건너뛰도록 완료 시점 타임스탬프로 그린다
    if (prefersReducedMotion()) {
      drawScene(bootT + 4000);
      return;
    }
    running = true;
    animationFrame = requestAnimationFrame(drawScene);
  }

  function stopLoop() {
    running = false;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  // 포인터 잔물결 — 좌표만 저장(그리지 않음). 모션 설정과 무관하게 항상 동작.
  if (heroEl) {
    heroEl.addEventListener(
      "pointermove",
      (event) => {
        // rect.left는 스크롤과 무관, top은 산술 계산(레이아웃 읽기 없음)
        target.x = event.clientX - canvasRect.left;
        const stageTop = pinEnabled
          ? Math.min(0, heroHeight - window.innerHeight - window.scrollY)
          : canvasDocTop - window.scrollY;
        target.y = event.clientY - stageTop;
        if (!pointer.active) {
          pointer.x = target.x;
          pointer.y = target.y;
        }
        pointer.active = true;
      },
      { passive: true },
    );
    heroEl.addEventListener("pointerleave", () => {
      pointer.active = false;
    });
  }

  // 가시성 정지 — 화면 밖 / 탭 비활성 시 루프 중단
  let heroVisible = true;
  if ("IntersectionObserver" in window) {
    const visObserver = new IntersectionObserver(
      (entries) => {
        heroVisible = entries[0].isIntersecting;
        if (heroVisible && !document.hidden) startLoop();
        else stopLoop();
      },
      { threshold: 0 },
    );
    visObserver.observe(canvas);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopLoop();
    else if (heroVisible) startLoop();
  });

  resizeCanvas();
  startLoop();

  let resizeTimer;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      heroHeight = heroEl ? heroEl.offsetHeight : 1;
      resizeCanvas();
      if (heroVisible && !document.hidden) {
        stopLoop();
        startLoop();
      }
    }, 150);
  });
}
