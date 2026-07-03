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
        // Fly-through 4막 — 한 구간 = 한 지배 모션. 전 커브 p 직접 기준, 종점 p≤0.98
        const p = heroProgress;
        heroEl.style.setProperty("--hs", easeInQuad(remap(p, 0.06, 0.3)).toFixed(3)); // 막1 카피 침강
        heroEl.style.setProperty("--hcue", remap(p, 0.04, 0.1).toFixed(3));
        heroEl.style.setProperty("--hbr", easeOutCubic(remap(p, 0.8, 0.9)).toFixed(3)); // 막4 브리지
        heroEl.style.setProperty("--hx", easeInOutCubic(remap(p, 0.78, 0.98)).toFixed(3)); // 막4 상향+스크림
        heroEl.style.setProperty("--hrl", easeOutCubic(remap(p, 0.8, 0.92)).toFixed(3)); // 막4 레일 스트릭
        heroEl.classList.toggle("exiting", p > 0.72 && p < 1);
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

  const lowPower = (navigator.hardwareConcurrency || 8) <= 4;

  // 오비탈 코어 위성 — ri: 링 인덱스, w: 각속도(rad/s, 부호=방향), ph: 초기 위상
  const ORB_SATS = [
    { ri: 0, w: 0.5, ph: 0.4 },
    { ri: 1, w: -0.3, ph: 2.1 },
    { ri: 1, w: -0.3, ph: 5.2 },
    { ri: 2, w: 0.19, ph: 1.1 },
    { ri: 2, w: 0.19, ph: 4.3 },
  ];
  const bootT = performance.now(); // 로드 인트로(캔버스 페이드-인) 기준 시각

  function buildScene(width, height) {
    let count = clamp(Math.round((width * height) / 15500), 36, 104);
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
    const dprCap = window.innerWidth < 720 ? 1.5 : 2;
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
    // Fly-through 마스터 커브 — 전부 p 순수 함수(역스크롤 자연 복원)
    const p9 = heroProgress;
    // 막2 질서: 지터 감쇠 + 좌향 층류. 모바일은 시간 기반 자율 사이클(~14s 호흡)
    let alignK;
    if (pinEnabled) {
      alignK = easeInOutCubic(remap(p9, 0.28, 0.44));
    } else {
      const s = 0.5 + 0.5 * Math.sin(((now - bootT) * Math.PI * 2) / 14000 - Math.PI / 2);
      alignK = s * s * (3 - 2 * s) * 0.85;
    }
    // 막3 진입: 방사 줌 마스터(초점 = 코어). 층류는 줌에 자리를 양보
    const Zm = pinEnabled ? easeInQuad(remap(p9, 0.44, 0.78)) : 0;
    const flowK = alignK * (1 - 0.8 * (pinEnabled ? remap(p9, 0.48, 0.62) : 0));
    // 막1 카피 게이트 — 침강에 비례해 좌측 감쇠 해제
    const sinkK = pinEnabled ? easeInQuad(remap(p9, 0.06, 0.3)) : 0;
    const introK = easeOutCubic(clamp((now - bootT) / 1100, 0, 1)); // 로드 페이드-인
    context.globalAlpha =
      introK *
      (pinEnabled ? 1 - 0.9 * easeInQuad(remap(p9, 0.84, 0.97)) : 1 - heroProgress * 0.85);

    // 오버랩에 가려진 종반 — 드로우 패스 생략(rAF만 유지)
    if (context.globalAlpha < 0.02) {
      context.globalAlpha = 1;
      if (running) animationFrame = requestAnimationFrame(drawScene);
      return;
    }

    const gx = viewW * 0.78;
    const gy = viewH * 0.24 + heroProgress * 40;
    const gradient = context.createRadialGradient(gx, gy, 30, gx, gy, viewW * 0.62);
    gradient.addColorStop(0, "rgba(46, 211, 255, 0.20)");
    gradient.addColorStop(0.42, "rgba(34, 118, 255, 0.10)");
    gradient.addColorStop(1, "rgba(5, 7, 13, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, viewW, viewH);

    // ── 오비탈 시스템 코어 — 시각 앵커. 막3에서 링이 안쪽→바깥 순차 확대·소멸되는
    //    "통과 게이트"가 됨(카메라 전진 서사 — 파괴가 아니라 통과)
    const minDim = Math.min(viewW, viewH);
    const orbCx = viewW * (pinEnabled ? 0.7 : 0.76);
    const orbCy = viewH * (pinEnabled ? 0.42 : 0.3); // 데스크탑: 레일(42%)과 동일 좌표 정박
    const orbScale = pinEnabled ? 1 : 0.62;
    const orbT = (now - bootT) / 1000;
    const orbSpin = 1 + alignK * 0.8; // 정렬되면 시스템이 빨라짐
    const orbDraw = easeOutCubic(clamp((now - bootT - 250) / 1500, 0, 1)); // 로드 드로우-온
    const ORB_R = [0.16, 0.235, 0.315];
    // 게이트 창(p): 외곽이 먼저 다가와 통과(0.50–0.64), 중간(0.58–0.72), 내곽(0.66–0.80)
    const GATES = [
      [0.66, 0.8],
      [0.58, 0.72],
      [0.5, 0.64],
    ];
    const ringS = [1, 1, 1];
    const ringA = [1, 1, 1];
    for (let ri = 0; ri < 3; ri += 1) {
      const gk = pinEnabled ? easeInCubic(remap(p9, GATES[ri][0], GATES[ri][1])) : 0;
      ringS[ri] = 1 + 7 * gk; // 최종 반경 ≈ 2.5·minDim(뷰포트 밖)
      ringA[ri] = pinEnabled ? 1 - remap(p9, GATES[ri][1] - 0.06, GATES[ri][1] - 0.01) : 1;
    }

    // 링 3개(중간 링은 점선) — 통과 근접 시 선이 굵어짐(원근)
    for (let ri = 0; ri < 3; ri += 1) {
      const rr = ORB_R[ri] * minDim * orbScale * ringS[ri];
      const ra = [0.3, 0.22, 0.17][ri] * orbDraw * ringA[ri];
      if (ra < 0.01) continue;
      context.lineWidth = 1 + Math.min(1.5, 1.5 * remap(ringS[ri], 1, 8));
      context.strokeStyle = `rgba(122, 183, 255, ${ra})`;
      if (ri === 1) context.setLineDash([3, 7]);
      context.beginPath();
      context.ellipse(orbCx, orbCy, rr, rr, 0, -Math.PI / 2, -Math.PI / 2 + orbDraw * Math.PI * 2);
      context.stroke();
      if (ri === 1) context.setLineDash([]);
    }
    context.lineWidth = 1;
    // 외곽 링 계기 틱 24개 — 줌 시작 전 조기 소등(확대 중 지터 방지)
    const tickFade = pinEnabled ? 1 - remap(p9, 0.5, 0.58) : 1;
    const tickR = ORB_R[2] * minDim * orbScale * ringS[2];
    if (tickFade > 0.01) {
      context.strokeStyle = `rgba(122, 183, 255, ${0.2 * orbDraw * tickFade})`;
      context.beginPath();
      for (let ti = 0; ti < 24; ti += 1) {
        const ang = orbT * 0.045 + (ti / 24) * Math.PI * 2;
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        context.moveTo(orbCx + ca * tickR, orbCy + sa * tickR);
        context.lineTo(orbCx + ca * (tickR + 6), orbCy + sa * (tickR + 6));
      }
      context.stroke();
    }
    // 회전 스윕 아크 — 소속 링의 스케일·알파를 승계(링과 함께 다가와 함께 지나감)
    context.lineWidth = 1.6;
    if (ringA[2] > 0.01) {
      const sweepA = orbT * 0.24 * orbSpin;
      context.strokeStyle = `rgba(46, 211, 255, ${0.5 * orbDraw * ringA[2]})`;
      context.beginPath();
      context.ellipse(orbCx, orbCy, tickR, tickR, 0, sweepA, sweepA + 0.55);
      context.stroke();
    }
    if (ringA[1] > 0.01) {
      const sweepB = -orbT * 0.16 * orbSpin + 2.4;
      const midR = ORB_R[1] * minDim * orbScale * ringS[1];
      context.strokeStyle = `rgba(34, 118, 255, ${0.55 * orbDraw * ringA[1]})`;
      context.beginPath();
      context.ellipse(orbCx, orbCy, midR, midR, 0, sweepB, sweepB + 0.4);
      context.stroke();
    }
    context.lineWidth = 1;

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
    const linkFade = pinEnabled ? 1 - remap(p9, 0.46, 0.6) : 1;
    if (linkFade > 0.01) {
      const linkBoost = 1 + 1.1 * structK;
      context.lineWidth = 1;
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
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
              near > 0.02 ? `rgba(46, 211, 255, ${alpha})` : `rgba(122, 183, 255, ${alpha})`;
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
          context.shadowColor = "rgba(46, 211, 255, 0.8)";
        }
        context.fillStyle = `rgba(255, 255, 255, ${nodeA})`;
        context.beginPath();
        context.arc(p.x, p.y, Math.min(p.r * (1 + (p.s - 1) * 0.35), 6) + 1.1 * p.f, 0, Math.PI * 2);
        context.fill();
        if (p.hub) context.shadowBlur = 0;
      }
    }
    context.lineWidth = 1;

    // 코어 → 근접 허브 인입선 — 줌 시작과 함께 페이드(신호를 읽는 시스템 은유)
    const inflowFade = pinEnabled ? 1 - remap(p9, 0.44, 0.55) : 1;
    if (inflowFade > 0.01) {
      const baseTickR = ORB_R[2] * minDim * orbScale;
      const linkR2 = baseTickR * baseTickR * 1.3;
      for (let i = 0; i < particles.length; i += 1) {
        const hp = particles[i];
        if (!hp.hub) continue;
        const hdx = hp.x - orbCx;
        const hdy = hp.y - orbCy;
        if (hdx * hdx + hdy * hdy < linkR2) {
          context.strokeStyle = `rgba(46, 211, 255, ${0.14 * orbDraw * inflowFade * hp.g})`;
          context.beginPath();
          context.moveTo(orbCx, orbCy);
          context.lineTo(hp.x, hp.y);
          context.stroke();
        }
      }
    }

    // 궤도 위성 노드 — 소속 링의 스케일·알파 승계(링과 함께 다가와 화면을 스쳐 지나감)
    const satBase = (pinEnabled ? 0.85 : 0.6) * orbDraw;
    for (let si = 0; si < ORB_SATS.length; si += 1) {
      const s = ORB_SATS[si];
      const sa = satBase * ringA[s.ri];
      if (sa < 0.02) continue;
      const rr = ORB_R[s.ri] * minDim * orbScale * ringS[s.ri];
      const ang = s.ph + orbT * s.w * orbSpin;
      const sx = orbCx + Math.cos(ang) * rr;
      const sy = orbCy + Math.sin(ang) * rr;
      context.shadowBlur = 10;
      context.shadowColor = "rgba(46, 211, 255, 0.9)";
      context.fillStyle = `rgba(46, 211, 255, ${sa})`;
      context.beginPath();
      context.arc(sx, sy, (s.ri === 2 ? 2 : 2.6) * (1 + (ringS[s.ri] - 1) * 0.12), 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    }
    // 코어 — 펄스 글로우. 통과 순간(0.78–0.83) 플레어 후 레일 스트릭에 바통(0.84–0.90 페이드)
    const flare = pinEnabled ? easeOutCubic(remap(p9, 0.78, 0.83)) * (1 - remap(p9, 0.83, 0.9)) : 0;
    if (flare > 0.01) {
      const fr = 90 + 60 * flare;
      const fg = context.createRadialGradient(orbCx, orbCy, 0, orbCx, orbCy, fr);
      fg.addColorStop(0, `rgba(46, 211, 255, ${0.35 * flare})`);
      fg.addColorStop(1, "rgba(46, 211, 255, 0)");
      context.fillStyle = fg;
      context.fillRect(orbCx - fr, orbCy - fr, fr * 2, fr * 2);
    }
    const coreFade = pinEnabled ? 1 - remap(p9, 0.84, 0.9) : 1;
    if (coreFade > 0.01) {
      const pulse = 0.75 + 0.25 * Math.sin(orbT * 1.1);
      const glowR = (10 + 3 * pulse) * (1 + 1.2 * (pinEnabled ? remap(p9, 0.6, 0.8) : 0));
      context.shadowBlur = 14 * pulse;
      context.shadowColor = "rgba(46, 211, 255, 0.85)";
      context.fillStyle = `rgba(255, 255, 255, ${0.95 * orbDraw * coreFade})`;
      context.beginPath();
      context.arc(orbCx, orbCy, 3.2, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = `rgba(46, 211, 255, ${0.5 * pulse * orbDraw * coreFade})`;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(orbCx, orbCy, glowR, 0, Math.PI * 2);
      context.stroke();
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
