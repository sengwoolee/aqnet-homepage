# AQNET 홈페이지 — SDD (Spec & Development Document)

> 다른 대화/세션에서 업무 맥락을 이어받기 위한 작업 명세서.
> 마지막 갱신: 2026-07-02 · 디자인 의사결정의 상세 근거는 [design.md](../design.md) 참조.

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트 | AQNET(에이큐넷) 회사 홈페이지 |
| 포지셔닝 | **데이터·AI 기반 마케팅 기술 컴퍼니** (화려한 광고대행사 ✕, 데이터 테크 ○) |
| 브랜드 철학 | **AQ = Adaptability Quotient**(변화 적응 능력) + **C·O·R·E** 프레임워크(Control/Ownership/Reach/Endurance) |
| 메인 카피 | "퍼포먼스 마케팅을 넘어, 성장 구조를 설계합니다." |
| 무드 | 데이터·프로덕트 테크 프리미엄 — 네이비/블랙/화이트 + 블루·시안 포인트 |
| 벤치마킹 | 1순위: 매드업, 와이즈버즈, DMC미디어, 비에이티, 드리븐 / 2순위: 애드이피션시, 이루다, 헤이데이, 더플레이스, 아지앙스 |
| 의사결정자 | 김관호 과장(대표, 방향성·피드백), 이승우(제작·개인정보책임자) |

## 2. 기술 스택 · 파일 구조

- **순수 정적 사이트**: HTML + CSS + Vanilla JS. 빌드툴/프레임워크/외부 라이브러리 없음. 아이콘은 인라인 SVG.
- 폰트: Pretendard(시스템 스택 fallback, 웹폰트 셀프호스팅은 백로그).

```
index.html      # 단일 페이지(전 섹션)
styles.css      # 디자인 시스템 토큰 + 전체 스타일
script.js       # 인터랙션(캔버스/스크롤/폼/루프)
design.md       # 디자인 의사결정 로그 (§1~11)
docs/SDD.md     # 본 문서
assets/logos/   # 브랜드 로고(가공본 포함), OG 카드
assets/references/  # 광고주 레퍼런스 로고 70종 (priority 18종)
```

## 3. 배포 스펙

| 항목 | 내용 |
|---|---|
| 호스팅 | GitHub Pages (무료) |
| 저장소 | `https://github.com/sengwoolee/aqnet-homepage` (main / root) |
| 공개 URL | **https://sengwoolee.github.io/aqnet-homepage/** |
| 배포 방법 | `git push origin main` → 1~2분 뒤 자동 반영 (CDN 캐시 최대 ~10분, 확인은 강력 새로고침) |
| 인증 | macOS 키체인에 PAT 저장됨(재인증 불필요) |
| 메타 | canonical/OG/JSON-LD가 위 URL 기준. OG 카드: `assets/logos/aqnet-og.png` (1200×630) |
| 주의 | 사용자 사이트(`sengwoolee.github.io`)의 커스텀 도메인은 해제된 상태여야 함(설정 시 전 프로젝트가 그 도메인으로 리다이렉트됨) |

## 4. 페이지 구성 명세 (섹션 순서대로)

| # | 섹션 (id) | 톤 | 핵심 스펙 |
|---|---|---|---|
| 1 | Header | 다크(고정) | 로고 + 7메뉴 + CTA. 스크롤 시 블러 배경(테두리/blur 레이어 상시 유지 — 로고 밀림 방지). 스크롤스파이 활성 표시. 상단 2px 스크롤 진행바 |
| 2 | Hero (`#home`) | 다크 | 텍스트 H1(메인 카피, "설계" 그라데이션) + **라이브 콘솔 카드**(스파크라인·KPI·LIVE). 배경: 기하학 파티클 네트워크 캔버스(포인터 잔물결 반응, 스크롤 페이드). ※떨어지는 네모 스트림은 제거됨 |
| 3 | Signal Strip | 다크 | 운영 채널·데이터 스택 12종 무한 마퀴(hover 일시정지) |
| 4 | Snapshot | 다크 | 카운트업 지표 4종: 70+ 운영 브랜드 / 6 / 5 / 1 |
| 5 | About (`#about`) | 라이트 | **Why AQNET?** 다크 박스(AQ=Adaptability Quotient 정의 + "광고는 계속 변합니다…" + Capabilities 태그) + 운영 원칙 타임라인(진단→실행→자동화→학습) |
| 6 | **AQ Framework** (`#framework`) | 다크 | "Every Growth Starts with Adaptability." + **C·O·R·E 4카드**(고스트 이니셜): Control(광고 데이터·CRM·퍼널·KPI) / Ownership(ROAS·매출·LTV) / Reach(Media·Creative·Automation·Global) / Endurance(AI·System·Learning·Optimization). ※내비 메뉴에는 미포함 |
| 7 | Service (`#service`) | 라이트 | 6카드(아이콘+체크리스트): Data Analytics / **AI Marketing Solution(FLAGSHIP 다크 강조)** / Performance / Creative&Contents / CRM·Funnel / Commerce. 하단 **Media Products** 4카드: 검색광고 / 디스플레이·배너 / SNS·영상 / 오픈마켓·쇼핑 |
| 8 | Solution (`#solution`) | 다크 | **AQ Growth OS** — 루프 5노드(3초 순환+스크롤 스크럽, 진행 커서 도트, Learn→Collect 리턴 패스) + **제품 목업 콘솔**(크롬바·v1.0 PREVIEW·KPI 4셀·채널 ROAS 바·대화형 레포트 티저·STEP 상태라인·데모 CTA). 노드↔존 `data-sync` 1:1 점등. 수치는 소개서 확정 예시값+"예시 화면" 캡션 |
| 9 | Works (`#works`) | 다크 | 카테고리 필터 탭(All/Commerce/Health/Marketplace) + 사례 5카드(월 예산·광고 매출) + 측정기준 주석 |
| 10 | Client Network (`#reference`) | 라이트 | 로고월 70종(7열, lazy load, 기본 grayscale→hover 원색, priority 18종은 옅은 컬러 유지) |
| 11 | Insight (`#insight`) | 라이트 | 아티클 리스트 3건(카테고리 pill, hover 액센트) — 현재 프리뷰형(링크 없음) |
| 12 | Contact (`#contact`) | 다크 | 좌 카피+메타 / 우 글래스 폼(§5 참조) |
| 13 | Footer | 다크 | 2단: 브랜드+태그라인+CTA / Sitemap / Contact / SNS ▸ 법인정보 줄 + © + 약관 링크 |

## 5. 문의 폼 스펙 (8필드, 1열)

1. 회사명/업체명 (필수)
2. 사이트 URL (선택, type=url)
3. 담당자명 (필수)
4. 연락처 (필수, tel)
5. 이메일 (필수)
6. **광고 종류** — 체크박스 복수선택: 검색광고 / 배너광고 / 오픈마켓광고 / SNS광고
7. **월 평균 마케팅 예산** — 라디오 필수: 500만원 미만 / 500만~2,000만 / 2,000만~5,000만 / 5,000만 이상
8. 문의 내용/주요 목표 (필수) + 개인정보 동의 체크(필수)

- 제출: **mailto**(`contact@aqnet.co.kr`)로 전 항목 본문 구성. *(서버 폼 전환은 백로그)*
- 선택 그룹은 칩형 UI(`.check`, `:has(:checked)` 시안 하이라이트). 공통 input 스타일은 checkbox/radio 제외 처리돼 있음.

## 6. 디자인 시스템 요약 (styles.css `:root`)

- **컬러**: `--blue #2276ff`, `--cyan #2ed3ff`, 다크 surface 4단계(`--surface-0~3`+glass), 라이트 3단계, border/text 단계, 시그니처 그라데이션(`--grad-brand/action/bar/line`)·글로우·메시 토큰.
- **radius 5단계**(6/10/14/20/999), **elevation**(다크 카드는 상단 1px inset 하이라이트가 핵심), 컨테이너 `--max: 1200px`.
- **정렬 원칙**: 전 섹션 콘텐츠는 동일한 1200px 밴드(넓은 화면 기준 좌우 120px). 풀블리드는 배경만.
- **개행 원칙**: 본문은 `word-break: keep-all` 자동 흐름. 헤드라인/짧은 리드만 수동 `<br>`, 의미 덩어리 보호는 `<span class="nowrap">`.
- **로고**: 헤더·푸터 = `aqnet-logo-horizontal-dark.png`(컬러 심볼+화이트 워드마크, 워드마크 1.45배 확대판). 컬러 투명본 = `-color.png`.

## 7. 모션/인터랙션 정책 ⚠️ 중요 결정

**모든 애니메이션은 OS '모션 줄이기(prefers-reduced-motion)' 설정과 무관하게 항상 재생한다** (클라이언트 확정, 2026-06). CSS의 reduce-motion 비활성화 블록과 JS 가드는 전면 제거된 상태 — 재도입 시 회귀임.

- 히어로 캔버스: 포인터 잔물결(반경 150/push 14/damp 0.88), 스크롤 페이드, 허브 노드 글로우. 화면 밖/탭 비활성 시 rAF 자동 정지(성능).
- 통합 스크롤 핸들러(단일 rAF): 헤더 상태·진행바·히어로 진행도·콘솔 패럴랙스(-18px, 데스크탑 fine 포인터만).
- 스크롤 리빌(`[data-reveal]` 페이드업 + `[data-stagger]` keyframe 70ms stagger — hover transition과 분리), 카운트업, eyebrow 밑줄 그로우.
- **v5 스크롤 경험**: 히어로 카피 스크럽(`--hs`), 헤딩 라인 마스크 리빌(JS가 h2를 `<br>` 단위 래핑), C·O·R·E 이니셜 스크럽(`--fwp`), 채널띠 스크롤 가속(WAAPI playbackRate 1→3.5 감쇠), Solution 루프 스크롤 스크럽(멈추면 4초 후 자동 순환 재개), 로고월 타일 stagger, 스파크라인 드로우-온. 레이아웃 읽기는 load/resize에서만(오프셋 캐시).

## 8. 작업 이력 (라운드 요약)

> 상세 근거: design.md §번호 병기. v1~v4는 git init 이전 작업(첫 커밋에 스냅샷 포함).

| 라운드 | 내용 | design.md |
|---|---|---|
| v1 | 초기 제작: 방향성 정리, IA(Home~Contact), 레퍼런스 로고월 | §1~6 |
| v2 | 레퍼런스 리서치 반영 + 검토 개선: 텍스트 H1, 투명 로고 생성, 채널 스트립, 접근성/SEO/lazy load | §7 |
| v3 | **비주얼 리디자인**(데이터·프로덕트 테크 프리미엄): 토큰 시스템, 히어로 콘솔, About 타임라인, Service 아이콘 카드, Solution 다크 승격, Contact 다크 | §8 |
| — | 레이아웃 정렬 통일(1200 밴드) + 컬러 로고 교체(다크용 변환) | §9 |
| v4 | **인터랙션**: 캔버스 포인터/스크롤 반응, 진행바, 스크롤스파이, 마이크로 인터랙션. 이후 떨어지는 네모 제거·히어로 여백 축소 | §10 |
| 배포 | GitHub Pages 배포(sengwoolee), OG 카드 제작, 커스텀 도메인 해제 대응 | — |
| 폴리시 | reduce-motion 전면 해제(항상 재생), 로고월 톤 균일화, 헤더 로고 안정화, 개행 다듬기 다수, footer 2단 개편(대표 김관호·개인정보책임자 이승우), 폼 1열 | — |
| **2차 디벨롭** | **AQ 브랜드 철학 반영**(과장님 피드백): Why AQNET?, AQ Framework(C·O·R·E), Media Products, 폼 8필드 확장 | §11 |
| **v5** | **스크롤 경험 강화**: 전수 감사(요구 전 항목 충족, stagger hover-지연 버그 발견·수정) + 히어로 스크럽/헤딩 라인 리빌/이니셜 스크럽/마퀴 가속/루프 스크롤 스크럽/로고월 stagger/스파크라인 드로우-온, scrollspy 사각지대·대비·skip-link 보완 | §12 |
| **v6** | **3역할(기획·디자인·개발) 병렬 감사 폴리시 19건**: Service 도트 미렌더·Works 필터 깜빡임 버그 수정, 탭 상태 분리, 모바일 로고월 3열, Insight "발행 예정" 라벨, Works 하단 CTA 밴드, 콘솔 "예시 화면" 캡션, :has/svh/inert 폴백, 폼 검증 강화. **회사소개서 13p 확장안 도출**(온보딩·리포팅·회사개요 — 클라이언트 소스 대기) | §13 |

<details>
<summary>커밋 로그 (git init 이후, 오래된 순)</summary>

```
5181724 AQNET 홈페이지 정적 사이트 (v1~v4 누적 스냅샷)
1d5fc46 개행 정제(nowrap) + 배포 URL 메타 갱신
8b61bde 로고 워드마크 확대 — 심볼 대비 비율 0.43→0.62
6d7b3c1 줄개행 의미단위 정제 + 문의 폼 필드 개편 + footer 개편
7644384 문의 폼 단일 열 레이아웃
4997f86 About 워터마크 제거 + 타임라인 연결선 수정
d68e352 채널띠·히어로 배경 항상 동작(모션 줄이기 무시)
050d890 reduce-motion 전수 검토 — 시그니처 모션 항상 동작화
83948dc B그룹 모션도 항상 동작 — reduce-motion 전면 제거
55e7201 오픈그래프 브랜드 OG 카드(1200x630)
0ceb0a5 로고월 타일 배경 균일화
ddb667f footer 법인정보 — 대표 김관호, 개인정보책임자 이승우
a540e08 카피 개행 6건 + About 통계 박스 리디자인
c9315f8 About 박스 위계 개선 — CAPABILITIES 승격
8a2923b / ba9fab3 Service 카드 설명문 개행(6카드)
9b71455 헤더 스크롤 로고 밀림/재래스터화 제거
acaa01e Service 체크 아이콘 수직 정렬
259bc09 About 제목 nowrap
267333b 2차 디벨롭 — Why AQNET / AQ Framework / Media Products / 폼 확장
```
</details>

## 9. 백로그 (TODO)

### 클라이언트(김관호 대표) 소스 대기 항목
- [ ] Works 사례별 운영 기간(→ 기간·ROAS 표기 보강), Snapshot 외부 지표(업력·누적 집행액 등)
- [ ] 회사소개서 확장용: 온보딩 절차·기간 (연혁·팀·리포팅은 1차 PDF 소스로 해소됨)
- [ ] `app.aqnet.io` 도메인 표기 확정(솔루션 콘솔 크롬바 URL + 소개서 목업) 및 v1.0 PREVIEW 뱃지 문구 컨펌
- [ ] 공식 이메일 확정: contact@aqnet.co.kr(홈페이지) vs hello@aqnet.io(1차 PDF)

### 실데이터 채우기 (placeholder 교체 필요)
- [ ] footer: 사업자등록번호(`000-00-00000`), 주소(`서울특별시 ○○구…`), 전화(`02-0000-0000`)
- [ ] footer SNS 링크 3종(LinkedIn/Instagram/Blog — 현재 `#`, 미운영 채널은 제거)
- [ ] **개인정보처리방침 페이지**(footer 링크 `#` 상태 — 폼으로 개인정보 수집 중이므로 우선순위 높음), 이용약관

### 기능/콘텐츠
- [ ] Contact mailto → 서버리스 폼(제출 처리·스팸 방지)
- [ ] Insight 실제 아티클 연결(현재 프리뷰형)
- [ ] Works 수치의 측정 기간·기준 명시
- [ ] Pretendard 웹폰트 셀프호스팅
- [ ] 커스텀 도메인 연결 시: DNS + 저장소 Pages 설정 + `index.html` 메타 URL(canonical/OG/JSON-LD) 일괄 교체
- [ ] 회사소개서(PPT/PDF)를 동일 디자인 시스템·C·O·R·E 프레임으로 제작 (과장님 언급)

## 10. 작업 규칙

1. **수정 → 로컬 검증 → 커밋 → push(=배포)**. 프리뷰는 프로젝트를 ASCII 경로(`/tmp/aqnet-preview`)로 복사해 python 정적 서버로 확인(한글 경로는 프리뷰 샌드박스 제한).
2. 커밋 메시지는 한국어 요약 + `Co-Authored-By: Claude`. author는 `-c user.name='AQNET' -c user.email='leesengwoo555@gmail.com'`.
3. 카피 수정 시 개행 원칙(§6) 준수. 새 모션 추가 시 정책(§7) 준수 — reduce-motion 가드 넣지 말 것.
4. 큰 방향 변경(비주얼/구조/카피 톤)은 서브에이전트 리서치·스펙 후 구현하는 패턴 사용.
5. 디자인 의사결정은 design.md에, 진행 현황·백로그는 본 문서에 갱신.
