const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobilePanel = document.querySelector("[data-mobile-panel]");
const contactForm = document.querySelector("[data-contact-form]");
const formNote = document.querySelector("[data-form-note]");
const stripTrack = document.querySelector("[data-strip]");
const progressBar = document.querySelector("[data-progress]");
const heroEl = document.querySelector(".hero");
const heroConsole = document.querySelector(".hero-console-stack");

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const remap = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
const easeInQuad = (t) => t * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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
let scrollVelocity = 0;
let lastScrollY = window.scrollY;
let heroHeight = heroEl ? heroEl.offsetHeight : 1;
let scrollTicking = false;

/* 섹션 스크럽 — 레이아웃 읽기는 load/resize에서만, 스크롤 중엔 산술만 */
const fwSection = document.querySelector(".framework-section");
let fwTop = 0;
let fwHeight = 1;
let lastFwp = "";
let lastHs = "";
let loopScrollSync = null; // Solution 루프 블록에서 주입

function measureSections() {
  pinEnabled = window.innerWidth > 1024;
  heroHeight = heroEl ? heroEl.offsetHeight : 1;
  if (pinEnabled && heroEl && heroInner && heroConsole) {
    // offsetLeft 기반(transform 무시) — 무대 콘텐츠 중앙까지의 X 이동량
    const innerCenter = heroInner.offsetLeft + heroInner.offsetWidth / 2;
    const consoleCenter = heroConsole.offsetLeft + heroConsole.offsetWidth / 2;
    heroEl.style.setProperty("--console-dx", `${(innerCenter - consoleCenter).toFixed(0)}px`);
  }
  if (fwSection) {
    fwTop = fwSection.offsetTop;
    fwHeight = fwSection.offsetHeight;
  }
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

let pinEnabled = window.innerWidth > 1024; // 히어로 핀 스크럽(데스크탑 전용)
const heroInner = document.querySelector(".hero-inner");

function onScrollFrame() {
  const y = window.scrollY;

  if (header) header.classList.toggle("scrolled", y > 16);

  if (progressBar) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.setProperty("--p", max > 0 ? clamp(y / max, 0, 1).toFixed(4) : "0");
  }

  const vh = window.innerHeight;
  const heroTrack = pinEnabled ? Math.max(1, heroHeight - vh) : heroHeight * 0.85;
  heroProgress = clamp(y / heroTrack, 0, 1);
  scrollVelocity = clamp(Math.abs(y - lastScrollY) / 40, 0, 1);
  lastScrollY = y;

  if (heroEl) {
    const key = heroProgress.toFixed(3) + (pinEnabled ? "p" : "m");
    if (key !== lastHs) {
      lastHs = key;
      if (pinEnabled) {
        const p = heroProgress;
        heroEl.style.setProperty("--hs", easeInQuad(remap(p, 0.08, 0.42)).toFixed(3));
        heroEl.style.setProperty("--hc", easeInOutCubic(remap(p, 0.3, 0.78)).toFixed(3));
        heroEl.style.setProperty("--hsp", remap(p, 0.55, 0.8).toFixed(3));
        heroEl.style.setProperty("--hbr", easeOutCubic(remap(p, 0.78, 0.95)).toFixed(3));
        heroEl.style.setProperty("--hcue", remap(p, 0.72, 0.9).toFixed(3));
        for (let i = 0; i < 3; i += 1) {
          const st = 0.58 + 0.06 * i;
          heroEl.style.setProperty(`--hk${i}`, easeOutCubic(remap(p, st, st + 0.14)).toFixed(3));
        }
        if (p > 0.05) heroEl.classList.add("scrubbed");
      } else {
        heroEl.style.setProperty("--hs", heroProgress.toFixed(3));
      }
    }
  }

  if (fwSection) {
    const vh = window.innerHeight;
    const fwp = clamp((y + vh - fwTop) / (vh + fwHeight), 0, 1).toFixed(3);
    if (fwp !== lastFwp) {
      fwSection.style.setProperty("--fwp", fwp);
      lastFwp = fwp;
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

let measureTimer;
window.addEventListener("resize", () => {
  window.clearTimeout(measureTimer);
  measureTimer = window.setTimeout(measureSections, 160);
});
measureSections();
onScrollFrame();

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
  const proxyMap = { framework: "about", reference: "works" };
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

/* Works 필터 */
const filterButtons = document.querySelectorAll("[data-filter]");
const workStatus = document.querySelector("[data-work-status]");
const filterLabels = { all: "전체", commerce: "Commerce", health: "Health", marketplace: "Marketplace" };

const workGrid = document.querySelector(".work-grid");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // 필터 조작 시점엔 등장 연출이 끝난 것으로 간주 — display 토글 재생 방지
    if (workGrid) workGrid.classList.add("stagger-done");
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    let visibleCount = 0;
    document.querySelectorAll("[data-category]").forEach((card) => {
      const visible = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("hidden", !visible);
      if (visible) visibleCount += 1;
    });

    if (workStatus) {
      workStatus.textContent = `${filterLabels[filter] || filter} 사례 ${visibleCount}건을 표시합니다.`;
    }
  });
});

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

/* Contact 폼 (mailto) */
if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      if (formNote) formNote.textContent = "필수 항목과 개인정보 동의를 확인해주세요.";
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
    if (formNote) {
      formNote.textContent =
        "메일 앱에서 문의 내용을 확인해주세요. 메일 앱이 열리지 않으면 contact@aqnet.co.kr 로 직접 보내주세요.";
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
    const activeShift = parseFloat(getComputedStyle(loop).getPropertyValue("--loop-active-shift")) || 0;
    const loopRect = loop.getBoundingClientRect();
    nodeCenters = nodes.map((node) => {
      const icon = node.querySelector(".loop-ic");
      if (!icon) {
        return { x: 40 + activeShift, y: node.offsetTop + node.offsetHeight / 2 };
      }
      const iconRect = icon.getBoundingClientRect();
      const shiftX = node.classList.contains("active") ? 0 : activeShift;
      return {
        x: iconRect.left - loopRect.left + iconRect.width / 2 + shiftX,
        y: iconRect.top - loopRect.top + iconRect.height / 2,
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
  const PR = { radiusSq: 150 * 150, push: 14, damp: 0.88, lerp: 0.12 };

  const lowPower = (navigator.hardwareConcurrency || 8) <= 4;

  function buildScene(width, height) {
    let count = clamp(Math.round((width * height) / 22000), 28, 70);
    if (width < 720) count = Math.min(count, 40);
    if (lowPower) count = Math.round(count * 0.7);

    particles = Array.from({ length: count }, (_, index) => ({
      baseX: Math.random() * width,
      baseY: Math.random() * height,
      ox: 0,
      oy: 0,
      x: 0,
      y: 0,
      f: 0,
      r: index % 7 === 0 ? 2.2 : 1.35,
      d: 0.4 + Math.random() * 0.6,
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
    const dprCap = window.innerWidth < 720 ? 1.5 : 2;
    const ratio = Math.min(window.devicePixelRatio || 1, dprCap);
    const rect = canvas.getBoundingClientRect();
    canvasRect = rect;
    canvasDocTop = rect.top + window.scrollY;
    viewW = rect.width;
    viewH = rect.height;
    canvas.width = Math.floor(viewW * ratio);
    canvas.height = Math.floor(viewH * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    buildScene(viewW, viewH);
  }

  function drawScene() {
    if (pointer.active) {
      pointer.x += (target.x - pointer.x) * PR.lerp;
      pointer.y += (target.y - pointer.y) * PR.lerp;
    }

    context.clearRect(0, 0, viewW, viewH);
    context.globalAlpha = pinEnabled
      ? 1 - 0.75 * remap(heroProgress, 0.6, 1)
      : 1 - heroProgress * 0.85;
    const spreadK = pinEnabled ? remap(heroProgress, 0.3, 0.85) : 0;

    const gx = viewW * 0.78;
    const gy = viewH * 0.24 + heroProgress * 40;
    const gradient = context.createRadialGradient(gx, gy, 30, gx, gy, viewW * 0.62);
    gradient.addColorStop(0, "rgba(46, 211, 255, 0.20)");
    gradient.addColorStop(0.42, "rgba(34, 118, 255, 0.10)");
    gradient.addColorStop(1, "rgba(5, 7, 13, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, viewW, viewH);

    // update pass — drift + pointer ripple + restore
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      p.baseX += p.vx;
      p.baseY += p.vy;
      if (p.baseX < -20) p.baseX = viewW + 20;
      if (p.baseX > viewW + 20) p.baseX = -20;
      if (p.baseY < -20) p.baseY = viewH + 20;
      if (p.baseY > viewH + 20) p.baseY = -20;

      let f = 0;
      const px = p.baseX + p.ox;
      const py = p.baseY + p.oy;
      if (pointer.active) {
        const dx = px - pointer.x;
        const dy = py - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < PR.radiusSq) {
          f = 1 - d2 / PR.radiusSq;
          const inv = 1 / (Math.sqrt(d2) + 0.001);
          p.ox += dx * inv * PR.push * f * 0.15;
          p.oy += dy * inv * PR.push * f * 0.15;
        }
      }
      p.ox *= PR.damp;
      p.oy *= PR.damp;
      p.x = p.baseX + p.ox;
      p.y = p.baseY + p.oy;
      p.f = f;
      if (spreadK > 0) {
        const k = 1 + 0.1 * p.d * spreadK;
        p.x = viewW * 0.5 + (p.x - viewW * 0.5) * k;
        p.y = viewH * 0.5 + (p.y - viewH * 0.5) * k;
      }
    }

    // connections
    context.lineWidth = 1;
    for (let i = 0; i < particles.length; i += 1) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j += 1) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 16384) {
          const dist = Math.sqrt(d2);
          const near = Math.max(a.f, b.f);
          const alpha = 0.14 * (1 - dist / 128) + 0.22 * near;
          context.strokeStyle =
            near > 0.02 ? `rgba(46, 211, 255, ${alpha})` : `rgba(122, 183, 255, ${alpha})`;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      }
    }

    // nodes
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      if (p.hub) {
        context.shadowBlur = 6;
        context.shadowColor = "rgba(46, 211, 255, 0.8)";
      }
      context.fillStyle = `rgba(255, 255, 255, ${Math.min(1, p.alpha + 0.5 * p.f)})`;
      context.beginPath();
      context.arc(p.x, p.y, p.r + 1.1 * p.f, 0, Math.PI * 2);
      context.fill();
      if (p.hub) context.shadowBlur = 0;
    }

    context.globalAlpha = 1;

    if (running) animationFrame = requestAnimationFrame(drawScene);
  }

  function startLoop() {
    if (running) return;
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
