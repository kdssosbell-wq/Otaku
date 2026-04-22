// ── Firebase 설정 ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDXHbzcKG9hFFLTHWbwWai0nemhTNJaVOc",
  authDomain:        "otaku-map-29d8b.firebaseapp.com",
  projectId:         "otaku-map-29d8b",
  storageBucket:     "otaku-map-29d8b.firebasestorage.app",
  messagingSenderId: "227268562859",
  appId:             "1:227268562859:web:ab842e7c9e3c5763628cee",
};
firebase.initializeApp(firebaseConfig);
const db   = firebase.firestore();
const auth = firebase.auth();

// ── 관리자 인증 상태 ────────────────────────────────────────────────────────
let isAdminUnlocked = false;

// ── 카테고리 & 지역 & 요일 정의 ───────────────────────────────────────────
const CATEGORIES = [
  { id: "kuji",   label: "제일복권" },
  { id: "figure", label: "피규어"   },
  { id: "gacha",  label: "가챠"     },
  { id: "goods",  label: "굿즈샵"   },
];

const DAY_LABELS = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" };

const AREAS = [
  {
    id: "hongdae", label: "홍대", defaultFocus: true,
    shapes: [{ top: "16%", left: "12%", width: "34%", height: "24%" }],
    labelPos: { top: "22%", left: "18%" },
  },
  {
    id: "hapjeong", label: "합정",
    shapes: [{ top: "20%", left: "56%", width: "26%", height: "24%" }],
    labelPos: { top: "28%", left: "61%" },
  },
  {
    id: "sinchon", label: "신촌",
    shapes: [{ top: "8%", left: "42%", width: "22%", height: "18%" }],
    labelPos: { top: "10%", left: "46%" },
  },
  {
    id: "yongsan", label: "용산",
    shapes: [{ top: "34%", left: "36%", width: "20%", height: "16%" }],
    labelPos: { top: "38%", left: "40%" },
  },
  {
    id: "gangnam", label: "강남",
    shapes: [{ top: "46%", left: "8%", width: "22%", height: "16%" }],
    labelPos: { top: "50%", left: "12%" },
  },
  {
    id: "geondae", label: "건대",
    shapes: [{ top: "60%", left: "58%", width: "24%", height: "18%" }],
    labelPos: { top: "68%", left: "62%" },
  },
  {
    id: "suwon", label: "수원",
    shapes: [{ top: "60%", left: "18%", width: "20%", height: "14%" }],
    labelPos: { top: "63%", left: "22%" },
  },
  {
    id: "osan", label: "오산",
    shapes: [{ top: "74%", left: "8%", width: "18%", height: "14%" }],
    labelPos: { top: "77%", left: "11%" },
  },
  {
    id: "dongtan", label: "동탄",
    shapes: [{ top: "74%", left: "76%", width: "16%", height: "14%" }],
    labelPos: { top: "77%", left: "78%" },
  },
  {
    id: "pyeongtaek", label: "평택",
    shapes: [{ top: "86%", left: "34%", width: "22%", height: "12%" }],
    labelPos: { top: "89%", left: "38%" },
  },
  {
    id: "cheonan", label: "천안",
    shapes: [{ top: "86%", left: "60%", width: "22%", height: "12%" }],
    labelPos: { top: "89%", left: "64%" },
  },
  {
    id: "busan", label: "부산",
    shapes: [{ top: "40%", left: "30%", width: "40%", height: "30%" }],
    labelPos: { top: "50%", left: "36%" },
  },
  {
    id: "daejeon", label: "대전",
    shapes: [{ top: "40%", left: "30%", width: "40%", height: "30%" }],
    labelPos: { top: "50%", left: "36%" },
  },
];

// ── 대전 구별 지도 위치 ───────────────────────────────────────────────────
const DAEJEON_GU_POS = {
  "유성구": { top: "14%", left: "12%" },
  "서구":   { top: "68%", left: "10%" },
  "중구":   { top: "60%", left: "42%" },
  "동구":   { top: "22%", left: "64%" },
  "대덕구": { top: "34%", left: "76%" },
};

// ── 대분류 지역 정의 ──────────────────────────────────────────────────────
const REGIONS = [
  { id: "seoul",    label: "서울",   areaIds: ["hongdae","hapjeong","sinchon","yongsan","gangnam","geondae"] },
  { id: "gyeonggi", label: "경기도", areaIds: ["suwon","osan","dongtan","pyeongtaek","cheonan"] },
  { id: "busan",    label: "부산",   areaIds: ["busan"] },
  { id: "daejeon",  label: "대전",   areaIds: ["daejeon"] },
];

// ── 앱 상태 ───────────────────────────────────────────────────────────────
const state = {
  activeTab:      "explore",
  activeCategory: "all",
  activeRegion:   "seoul", // 대분류 (기본: 서울)
  activeArea:     null,    // 소분류 (null = 미선택)
  query:          "",
  viewMode:       "map",
  approved:       [],
  pending:        [],
  draftArea:      AREAS.find((a) => a.defaultFocus)?.id || AREAS[0].id,
  get draftPin()  { return getAreaPin(this.draftArea); },
  adminApprovedQuery: "",
  onlyOpen: false,
  activeGuFilter: null, // 대전 구 필터
};

// ── DOM 요소 참조 ─────────────────────────────────────────────────────────
const elements = {
  tabs:               [...document.querySelectorAll("[data-tab-target]")],
  panels:             [...document.querySelectorAll("[data-panel]")],
  categoryFilters:    document.querySelector("#categoryFilters"),
  regionFilters:      document.querySelector("#regionFilters"),
  categoryCheckboxes: document.querySelector("#categoryCheckboxes"),
  approvedList:       document.querySelector("#approvedList"),
  approvedCount:      document.querySelector("#approvedCount"),
  approvedTotal:      document.querySelector("#approvedTotal"),
  pendingCount:       document.querySelector("#pendingCount"),
  pendingList:        document.querySelector("#pendingList"),
  mapStage:           document.querySelector("#mapStage"),
  mapStatus:          document.querySelector("#mapStatus"),
  searchInput:        document.querySelector("#searchInput"),
  toggleViewButton:   document.querySelector("#toggleViewButton"),
  searchButton:       document.querySelector("#searchButton"),
  submissionForm:     document.querySelector("#submissionForm"),
  submissionArea:     document.querySelector("#submissionArea"),
  spotCardTemplate:   document.querySelector("#spotCardTemplate"),
  pendingCardTemplate:document.querySelector("#pendingCardTemplate"),
  // 로그아웃 버튼
  logoutBtn:          document.querySelector("#logoutBtn"),
  // 제보 수정 모달
  editModalOverlay:   document.querySelector("#editModalOverlay"),
  editForm:           document.querySelector("#editForm"),
  editEntryId:        document.querySelector("#editEntryId"),
  editCollection:     document.querySelector("#editCollection"),
  editName:           document.querySelector("#editName"),
  editArea:           document.querySelector("#editArea"),
  editAddress:        document.querySelector("#editAddress"),
  editCategoryCheckboxes: document.querySelector("#editCategoryCheckboxes"),
  editDescription:    document.querySelector("#editDescription"),
  editHours:          document.querySelector("#editHours"),
  editSns:            document.querySelector("#editSns"),
  editPhone:          document.querySelector("#editPhone"),
  editModalCancel:    document.querySelector("#editModalCancel"),
  // 승인된 매장 관리 목록
  openNowToggle:        document.querySelector("#openNowToggle"),
  approvedAdminList:    document.querySelector("#approvedAdminList"),
  approvedAdminSearch:  document.querySelector("#approvedAdminSearch"),
  // 매장명 중복 검사
  nameInput:            document.querySelector("#nameInput"),
  nameError:            document.querySelector("#nameError"),
};

bootstrap();

// ── 초기화 ────────────────────────────────────────────────────────────────
function bootstrap() {
  renderCategoryFilters();
  renderRegionFilters();
  renderCategoryCheckboxes();
  renderAreaOptions();
  populateEditAreaOptions();
  populateEditCategoryCheckboxes();
  bindEvents();
  setupAuthListener();
  render();
  setupFirestoreListeners();
}

// ── Firebase Auth 리스너 ──────────────────────────────────────────────────
function setupAuthListener() {
  auth.onAuthStateChanged((user) => {
    isAdminUnlocked = !!user;

    // 로그아웃 버튼 표시/숨김
    if (elements.logoutBtn) {
      elements.logoutBtn.hidden = !isAdminUnlocked;
    }

    // 로그인 후 #admin 해시로 리다이렉트된 경우 → 관리 탭 자동 열기
    if (isAdminUnlocked && window.location.hash === "#admin") {
      history.replaceState(null, "", window.location.pathname);
      state.activeTab = "admin";
    }

    // 관리자 권한이 사라졌는데 관리 탭이면 → 지도 탭으로
    if (!isAdminUnlocked && state.activeTab === "admin") {
      state.activeTab = "explore";
    }

    renderPanels();
  });
}

// ── Firestore 실시간 리스너 ───────────────────────────────────────────────
function setupFirestoreListeners() {
  db.collection("approved").onSnapshot((snapshot) => {
    state.approved = snapshot.docs.map((doc) => doc.data());
    renderRegionFilters();
    renderApproved();
    renderApprovedAdmin();
  }, (err) => console.error("approved 리스너 오류:", err));

  db.collection("pending")
    .orderBy("submittedAt", "desc")
    .onSnapshot((snapshot) => {
      state.pending = snapshot.docs.map((doc) => doc.data());
      elements.pendingCount.textContent  = String(state.pending.length);
      elements.approvedTotal.textContent = String(state.approved.length);
      renderPending();
    }, (err) => console.error("pending 리스너 오류:", err));
}

// ── 이벤트 바인딩 ─────────────────────────────────────────────────────────
function bindEvents() {
  // 탭 전환
  elements.tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tabTarget;
      if (target === "admin" && !isAdminUnlocked) {
        // 관리자 미로그인 → 로그인 페이지로 이동
        window.location.href = "admin.html";
        return;
      }
      state.activeTab = target;
      renderPanels();
    });
  });

  // 로그아웃 버튼
  elements.logoutBtn?.addEventListener("click", async () => {
    if (!window.confirm("로그아웃 하시겠습니까?")) return;
    try {
      await auth.signOut();
      state.activeTab = "explore";
      renderPanels();
    } catch (err) {
      console.error("로그아웃 실패:", err);
    }
  });

  // Escape 키 → 제보 수정 모달 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (elements.editModalOverlay.classList.contains("open")) closeEditModal();
    }
  });

  // ── 제보 수정 모달 ──
  elements.editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const entryId = elements.editEntryId.value;
    const selectedCategories = [...elements.editCategoryCheckboxes.querySelectorAll("input:checked")]
      .map((cb) => cb.value);
    const selectedClosedDays = [...document.querySelectorAll("#editClosedDays input:checked")]
      .map((cb) => cb.value);

    const updatedData = {
      name:        elements.editName.value.trim(),
      area:        elements.editArea.value,
      address:     elements.editAddress.value.trim(),
      categories:  selectedCategories,
      description: elements.editDescription.value.trim(),
      hours:       elements.editHours.value.trim(),
      closedDays:  selectedClosedDays,
      sns:         elements.editSns.value.trim(),
      phone:       elements.editPhone.value.trim(),
      parking:     document.querySelector("#editParking input:checked")?.value ?? "",
      distance:    areaLabel(elements.editArea.value),
      pin:         getAreaPin(elements.editArea.value),
    };

    const collection = elements.editCollection.value || "pending";
    try {
      await db.collection(collection).doc(entryId).update(updatedData);
      closeEditModal();
    } catch (err) {
      console.error("수정 실패:", err);
      window.alert("수정 중 오류가 발생했습니다.");
    }
  });
  elements.editModalCancel.addEventListener("click", closeEditModal);
  elements.editModalOverlay.addEventListener("click", (e) => {
    if (e.target === elements.editModalOverlay) closeEditModal();
  });

  // ── 지도 탭 검색 ──
  elements.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); executeSearch(); }
  });
  elements.searchInput.addEventListener("search", () => {
    if (!elements.searchInput.value) { state.query = ""; renderApproved(); }
  });
  elements.searchButton.addEventListener("click", executeSearch);

  // ── 관리 탭 승인 매장 검색 ──
  elements.approvedAdminSearch?.addEventListener("input", (e) => {
    state.adminApprovedQuery = e.target.value.trim().toLowerCase();
    renderApprovedAdmin();
  });
  elements.approvedAdminSearch?.addEventListener("search", (e) => {
    if (!e.target.value) { state.adminApprovedQuery = ""; renderApprovedAdmin(); }
  });

  // 지도 ↔ 리스트 토글
  elements.toggleViewButton.addEventListener("click", () => {
    state.viewMode = state.viewMode === "map" ? "list" : "map";
    renderApproved();
  });

  // 제보 폼 지역 변경
  elements.submissionArea.addEventListener("change", (e) => {
    state.draftArea = e.target.value;
  });

  // ── 영업중 필터 토글 ──
  elements.openNowToggle?.addEventListener("click", () => {
    state.onlyOpen = !state.onlyOpen;
    elements.openNowToggle.classList.toggle("active", state.onlyOpen);
    renderApproved();
  });

  // ── 매장명 실시간 중복 검사 ──
  elements.nameInput?.addEventListener("input", () => {
    checkDuplicateName(elements.nameInput.value.trim());
  });

  // ── 제보 폼 제출 ──
  elements.submissionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form       = event.currentTarget;
    const formData   = new FormData(form);
    const categories = formData.getAll("categories");

    // 중복 매장 최종 차단
    const nameVal = (formData.get("name") || "").trim();
    if (nameVal && checkDuplicateName(nameVal)) return;

    if (!categories.length) {
      window.alert("카테고리를 하나 이상 선택해 주세요.");
      return;
    }

    const selectedArea = formData.get("area");
    const entry = {
      id:          createId(),
      name:        formData.get("name"),
      area:        selectedArea,
      address:     formData.get("address"),
      categories,
      description: formData.get("description"),
      hours:       formData.get("hours") || "정보 제보 필요",
      closedDays:  formData.getAll("closedDays"),
      sns:         formData.get("sns") || "",
      phone:       formData.get("phone") || "",
      parking:     formData.get("parking") || "",
      author:      formData.get("author") || "익명 덕후",
      distance:    areaLabel(selectedArea),
      pin:         getAreaPin(selectedArea),
      submittedAt: Date.now(),
    };

    try {
      await db.collection("pending").doc(entry.id).set(entry);
      form.reset();
      clearNameError();
      state.draftArea = state.activeArea;
      elements.submissionArea.value = state.draftArea;
      if (isAdminUnlocked) {
        state.activeTab = "admin";
      } else {
        state.activeTab = "explore";
        window.alert("제보가 접수됐습니다! 관리자 승인 후 지도에 표시됩니다.");
      }
      renderPanels();
    } catch (err) {
      console.error("제보 저장 실패:", err);
      window.alert("저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
  });
}

// ── 렌더링 ────────────────────────────────────────────────────────────────
function render() {
  renderPanels();
  renderRegionFilters();
  renderApproved();
  renderPending();
  renderApprovedAdmin();
}

function renderPanels() {
  if (!isAdminUnlocked && state.activeTab === "admin") state.activeTab = "explore";
  elements.tabs.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tabTarget === state.activeTab);
  });
  elements.panels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === state.activeTab);
  });
}

function renderCategoryFilters() {
  const items = [{ id: "all", label: "전체" }, ...CATEGORIES];
  elements.categoryFilters.innerHTML = "";
  items.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `chip${cat.id === state.activeCategory ? " active" : ""}`;
    btn.textContent = cat.label;
    btn.addEventListener("click", () => {
      state.activeCategory = cat.id;
      renderCategoryFilters();
      renderRegionFilters();
      renderApproved();
    });
    elements.categoryFilters.appendChild(btn);
  });
}

function renderRegionFilters() {
  elements.regionFilters.innerHTML = "";
  // 카테고리·영업중·검색어 필터를 모두 반영한 기준 목록 (지역 필터 제외)
  const baseList = state.approved.filter(s => {
    const matchesCat  = state.activeCategory === "all" || s.categories.includes(state.activeCategory);
    const matchesOpen = !state.onlyOpen || isOpenNow(s);
    const matchesQ    = !state.query || [s.name, areaLabel(s.area), s.address, s.description].join(" ").toLowerCase().includes(state.query);
    return matchesCat && matchesOpen && matchesQ;
  });

  REGIONS.forEach((region) => {
    const count = baseList.filter(s => region.areaIds.includes(s.area)).length;
    const isActive = region.id === state.activeRegion;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `chip${isActive ? " active" : ""}`;
    btn.innerHTML = count > 0
      ? `${region.label}<span class="region-count">${count}</span>`
      : region.label;
    btn.addEventListener("click", () => {
      if (state.activeRegion === region.id) {
        state.activeRegion = null;
        state.activeArea   = null;
      } else {
        state.activeRegion = region.id;
        state.activeArea   = null;
      }
      // 지역 탭 전환 시 영업중·구 필터 초기화
      state.onlyOpen = false;
      state.activeGuFilter = null;
      if (elements.openNowToggle) elements.openNowToggle.classList.remove("active");
      renderRegionFilters();
      renderApproved();
    });
    elements.regionFilters.appendChild(btn);
  });
}

function renderCategoryCheckboxes() {
  elements.categoryCheckboxes.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const label = document.createElement("label");
    label.className = "checkbox-item";
    label.innerHTML = `<input type="checkbox" name="categories" value="${cat.id}"><span>${cat.label}</span>`;
    elements.categoryCheckboxes.appendChild(label);
  });
}

function renderAreaOptions() {
  elements.submissionArea.innerHTML = "";
  [...AREAS]
    .sort((a, b) => a.label.localeCompare(b.label, "ko"))
    .forEach((area) => {
      const opt = document.createElement("option");
      opt.value = area.id;
      opt.textContent = area.label;
      if (area.id === state.draftArea) opt.selected = true;
      elements.submissionArea.appendChild(opt);
    });
}

function populateEditAreaOptions() {
  elements.editArea.innerHTML = "";
  AREAS.forEach((area) => {
    const opt = document.createElement("option");
    opt.value = area.id;
    opt.textContent = area.label;
    elements.editArea.appendChild(opt);
  });
}

function populateEditCategoryCheckboxes() {
  elements.editCategoryCheckboxes.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const label = document.createElement("label");
    label.className = "checkbox-item";
    label.innerHTML = `<input type="checkbox" name="editCategories" value="${cat.id}"><span>${cat.label}</span>`;
    elements.editCategoryCheckboxes.appendChild(label);
  });
}

function renderApproved() {
  const filtered = getFilteredApproved();
  elements.approvedList.innerHTML   = "";
  elements.approvedCount.textContent  = `${filtered.length}곳`;
  elements.approvedTotal.textContent  = String(state.approved.length);
  elements.toggleViewButton.textContent = state.viewMode === "map" ? "지도 숨기기" : "지도 보기";
  const showMap = state.viewMode === "map";
  elements.mapStage.style.display = showMap ? "block" : "none";
  const statusLabel = state.activeArea
    ? areaLabel(state.activeArea)
    : state.activeRegion
      ? (REGIONS.find(r => r.id === state.activeRegion)?.label || "")
      : "전체";
  elements.mapStatus.textContent = `${statusLabel} · 승인 매장 ${filtered.length}곳`;

  [...filtered]
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .forEach((spot) => elements.approvedList.appendChild(createSpotCard(spot)));

  if (!filtered.length) {
    const empty = document.createElement("article");
    empty.className = "spot-card";
    empty.innerHTML = `
      <h3>조건에 맞는 매장이 아직 없어요</h3>
      <p class="spot-card__desc">필터를 바꾸거나 직접 제보해서 첫 매장을 추가해 보세요.</p>
    `;
    elements.approvedList.appendChild(empty);
  }

  if (showMap) renderAreaMap(elements.mapStage, state.activeArea, filtered);
}

// ── 대전 구별 지도 렌더링 ─────────────────────────────────────────────────
function renderDaejeonMap(container, spots) {
  // 전체 대전 승인 매장에서 구별로 그룹화 (카운트용: 현재 필터 기준)
  const allDaejeon = state.approved.filter(s =>
    (s.area === "daejeon") &&
    (state.activeCategory === "all" || s.categories.includes(state.activeCategory)) &&
    (!state.onlyOpen || isOpenNow(s))
  );

  const guGroups = {};
  allDaejeon.forEach(s => {
    const gu = extractGu(s.address);
    if (gu && DAEJEON_GU_POS[gu]) {
      if (!guGroups[gu]) guGroups[gu] = [];
      guGroups[gu].push(s);
    }
  });

  const guEntries = Object.entries(guGroups);
  if (!guEntries.length) {
    const msg = document.createElement("p");
    msg.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--muted);font-size:.85rem;text-align:center;margin:0;";
    msg.textContent = "제보된 매장이 없습니다";
    container.appendChild(msg);
    return;
  }

  const maxCount = Math.max(1, ...guEntries.map(([, ss]) => ss.length));

  guEntries.forEach(([gu, guSpots]) => {
    const pos       = DAEJEON_GU_POS[gu];
    const count     = guSpots.length;
    const intensity = count / maxCount;
    const isActive  = state.activeGuFilter === gu;
    const a1 = 0.13 + intensity * 0.24;
    const a2 = 0.05 + intensity * 0.10;

    // 히트맵 블롭
    const blob = document.createElement("div");
    blob.className = "map-blob";
    blob.style.cssText = `
      left:${pos.left}; top:${pos.top};
      width:${28 + intensity * 16}%; height:${22 + intensity * 16}%;
      background: radial-gradient(ellipse at center,
        rgba(239,91,42,${a1}) 0%,
        rgba(239,91,42,${a2}) 42%,
        transparent 70%);
    `;
    container.appendChild(blob);

    // 구 라벨 버튼
    const label = document.createElement("button");
    label.type = "button";
    label.className = `district-label${isActive ? " active" : ""}`;
    label.style.top  = pos.top;
    label.style.left = pos.left;
    label.innerHTML  = `${gu}<span class="map-label-count">${count}</span>`;
    label.addEventListener("click", () => {
      state.activeGuFilter = isActive ? null : gu;
      renderApproved();
    });
    container.appendChild(label);
  });

  // 핀 렌더링
  spots.forEach(spot => {
    const gu = extractGu(spot.address);
    if (!gu || !DAEJEON_GU_POS[gu]) return;
    const pos = DAEJEON_GU_POS[gu];
    const pin = document.createElement("div");
    pin.className = "map-pin";
    pin.style.left  = pos.left;
    pin.style.top   = pos.top;
    pin.title = spot.name;
    pin.addEventListener("click", () => focusSpotCard(spot.name));
    container.appendChild(pin);
  });
}

function renderPending() {
  elements.pendingList.innerHTML = "";
  elements.pendingCount.textContent = String(state.pending.length);

  if (!state.pending.length) {
    const empty = document.createElement("article");
    empty.className = "pending-card";
    empty.innerHTML = `
      <h3>대기 중인 제보가 없습니다</h3>
      <p class="pending-card__desc">유저가 새 매장을 등록하면 이곳에서 검토할 수 있습니다.</p>
    `;
    elements.pendingList.appendChild(empty);
    return;
  }

  state.pending.forEach((entry) => elements.pendingList.appendChild(createPendingCard(entry)));
}

// ── 커스텀 SVG 스타일 지도 렌더링 ────────────────────────────────────────
function renderAreaMap(container, activeAreaId, spots) {
  container.innerHTML = "";

  // ── 대전: 주소에서 구를 동적 감지해 별도 렌더링 ──
  if (state.activeRegion === "daejeon") {
    renderDaejeonMap(container, spots);
    return;
  }

  // 현재 대분류에 따라 보여줄 지역 목록 결정
  const activeRegion = REGIONS.find(r => r.id === state.activeRegion);
  const visibleAreas = activeRegion
    ? AREAS.filter(a => activeRegion.areaIds.includes(a.id))
    : AREAS;

  // 지역별 매장 수 (히트맵용) — 현재 활성 필터(카테고리·영업중·검색어) 모두 반영
  const countMap = {};
  AREAS.forEach(a => { countMap[a.id] = 0; });
  spots.forEach(s => { if (countMap[s.area] !== undefined) countMap[s.area]++; });
  const maxCount = Math.max(1, ...visibleAreas.map(a => countMap[a.id] || 0));

  // ── 위치 정규화: 평균값 기준 + 세로/가로 독립 스케일 ──
  const rawTops  = visibleAreas.map(a => parseFloat(a.labelPos.top));
  const rawLefts = visibleAreas.map(a => parseFloat(a.labelPos.left));
  const meanT = rawTops.reduce((s,v) => s+v, 0)  / rawTops.length;
  const meanL = rawLefts.reduce((s,v) => s+v, 0) / rawLefts.length;
  const rangeT = Math.max(...rawTops)  - Math.min(...rawTops)  || 1;
  const rangeL = Math.max(...rawLefts) - Math.min(...rawLefts) || 1;

  const SCALE_T = Math.min(2.2, 54 / rangeT);  // 세로 목표 펼침 54%
  const SCALE_L = Math.min(0.85, 50 / rangeL); // 가로 목표 펼침 50%
  const CENTER_T = 46, CENTER_L = 36;

  function normPos(top, left) {
    if (visibleAreas.length <= 1) return [`${CENTER_T}%`, `${CENTER_L}%`];
    const nt = CENTER_T + (top  - meanT) * SCALE_T;
    const nl = CENTER_L + (left - meanL) * SCALE_L;
    return [
      `${Math.max(12, Math.min(80, nt)).toFixed(1)}%`,
      `${Math.max(8,  Math.min(66, nl)).toFixed(1)}%`,
    ];
  }

  visibleAreas.forEach(area => {
    const count     = countMap[area.id] || 0;
    const intensity = count / maxCount;
    const isActive  = area.id === activeAreaId;

    const lTop  = parseFloat(area.labelPos.top);
    const lLeft = parseFloat(area.labelPos.left);
    const [nTop, nLeft] = normPos(lTop, lLeft);

    // ── 히트맵 글로우 블롭 ──
    const shapeW = parseFloat(area.shapes[0].width);
    const shapeH = parseFloat(area.shapes[0].height);
    const blobW  = shapeW * (1.5 + intensity * 1.0);
    const blobH  = shapeH * (1.8 + intensity * 1.2);
    const a1 = count === 0 ? 0.035 : 0.13 + intensity * 0.24;
    const a2 = count === 0 ? 0.01  : 0.05 + intensity * 0.10;

    const blob = document.createElement("div");
    blob.className = "map-blob";
    blob.style.cssText = `
      left:${nLeft}; top:${nTop};
      width:${blobW}%; height:${blobH}%;
      background: radial-gradient(ellipse at center,
        rgba(239,91,42,${a1}) 0%,
        rgba(239,91,42,${a2}) 42%,
        transparent 70%);
    `;
    container.appendChild(blob);

    // ── 지역 라벨 버튼 ──
    const label = document.createElement("button");
    label.type = "button";
    label.className = `district-label${isActive ? " active" : ""}`;
    label.style.top  = nTop;
    label.style.left = nLeft;
    label.innerHTML = count > 0
      ? `${area.label}<span class="map-label-count">${count}</span>`
      : area.label;
    label.addEventListener("click", () => {
      state.activeArea = area.id === activeAreaId ? null : area.id;
      renderApproved();
    });
    container.appendChild(label);
  });

  // ── 핀 렌더링 (정규화된 위치 사용) ──
  spots.forEach(spot => {
    if (!spot.pin) return;
    const pinArea = AREAS.find(a => a.id === spot.area);
    if (!pinArea) return;
    const [pTop, pLeft] = normPos(
      parseFloat(pinArea.labelPos.top),
      parseFloat(pinArea.labelPos.left)
    );
    const pin = document.createElement("div");
    pin.className = "map-pin";
    pin.style.left = pLeft;
    pin.style.top  = pTop;
    pin.title = spot.name;
    pin.addEventListener("click", () => focusSpotCard(spot.name));
    container.appendChild(pin);
  });
}

// ── 카드 생성 ─────────────────────────────────────────────────────────────
function createSpotCard(spot) {
  const f = elements.spotCardTemplate.content.cloneNode(true);
  f.querySelector("h3").textContent               = spot.name;
  f.querySelector(".spot-card__meta").textContent  = spot.address;
  f.querySelector(".spot-card__desc").textContent  = spot.description;
  f.querySelector(".spot-card__hours").textContent = `운영 ${spot.hours}`;
  f.querySelector(".spot-card__author").innerHTML  = `<span class="author-badge">👤 ${spot.author}</span>`;

  // 접기/펼치기 토글
  f.querySelector(".spot-card__toggle").addEventListener("click", (e) => {
    const card = e.currentTarget.closest(".spot-card");
    card.classList.toggle("is-open");
  });

  // 주소 복사 버튼
  f.querySelector(".addr-copy-btn").addEventListener("click", (e) => {
    navigator.clipboard.writeText(spot.address).then(() => {
      const btn = e.currentTarget;
      btn.textContent = "✓ 복사됨";
      btn.classList.add("addr-copy-btn--done");
      setTimeout(() => {
        btn.textContent = "복사";
        btn.classList.remove("addr-copy-btn--done");
      }, 2000);
    });
  });

  const tags = f.querySelector(".tag-row");
  spot.categories.forEach((id) => tags.appendChild(createTag(id)));

  // 추가 정보 (휴무일 / 전화번호 / SNS / 주차)
  const extra = f.querySelector(".spot-card__extra");

  if (spot.closedDays?.length) {
    const span = document.createElement("span");
    span.className = "spot-card__extra-item";
    span.textContent = `휴무 ${spot.closedDays.map((d) => DAY_LABELS[d] || d).join("·")}`;
    extra.appendChild(span);
  }

  if (spot.phone) {
    const span = document.createElement("span");
    span.className = "spot-card__extra-item";
    span.textContent = `📞 ${spot.phone}`;
    extra.appendChild(span);
  }

  if (spot.sns) {
    const raw = spot.sns.trim();
    const isNaver = raw.includes("naver") || raw.includes("band");
    const isInsta = raw.includes("instagram") || raw.startsWith("@") || !raw.startsWith("http");

    let url, icon, label;

    if (isNaver) {
      url   = raw.startsWith("http") ? raw : `https://cafe.naver.com/${raw.replace(/^@/, "")}`;
      icon  = "naver.png";
      label = raw.replace(/.*cafe\.naver\.com\/([^/?#]+).*/, "$1").replace(/^@/, "");
    } else {
      const handle = raw.startsWith("http")
        ? raw.replace(/.*instagram\.com\/([^/?#]+).*/, "$1")
        : raw.replace(/^@/, "");
      url   = raw.startsWith("http") ? raw : `https://www.instagram.com/${handle}`;
      icon  = "instargram.png";
      label = handle;
    }

    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "spot-card__extra-item sns-link";
    a.innerHTML = `<img src="${icon}" class="sns-icon" alt="SNS"><span class="sns-handle">@${label}</span>`;
    extra.appendChild(a);
  }

  if (spot.parking === "available") {
    const span = document.createElement("span");
    span.className = "spot-card__extra-item";
    span.textContent = "🚗 주차 가능";
    extra.appendChild(span);
  } else if (spot.parking === "unavailable") {
    const span = document.createElement("span");
    span.className = "spot-card__extra-item";
    span.textContent = "🚌 권장";
    extra.appendChild(span);
  }

  return f;
}

function createPendingCard(entry) {
  const f = elements.pendingCardTemplate.content.cloneNode(true);
  f.querySelector("h3").textContent                  = entry.name;
  f.querySelector(".pending-card__meta").textContent  = `${areaLabel(entry.area)} · ${entry.address}`;
  f.querySelector(".pending-card__desc").textContent  = entry.description;

  // 추가 정보 한 줄 요약
  const extraParts = [];
  if (entry.hours)               extraParts.push(`운영 ${entry.hours}`);
  if (entry.closedDays?.length)  extraParts.push(`휴무 ${entry.closedDays.map((d) => DAY_LABELS[d] || d).join("·")}`);
  if (entry.phone)               extraParts.push(entry.phone);
  if (entry.sns)                 extraParts.push(entry.sns);
  f.querySelector(".pending-card__coords").textContent = extraParts.join("  ·  ");

  const tags = f.querySelector(".tag-row");
  entry.categories.forEach((id) => tags.appendChild(createTag(id)));

  f.querySelector(".js-approve").addEventListener("click", () => approveEntry(entry.id));
  f.querySelector(".js-reject").addEventListener("click",  () => rejectEntry(entry.id));
  f.querySelector(".js-edit").addEventListener("click",    () => openEditModal(entry));
  return f;
}

function createTag(categoryId) {
  const tag = document.createElement("span");
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  tag.className = "tag";
  tag.textContent = cat ? cat.label : categoryId;
  return tag;
}

// ── 승인 / 반려 / 수정 (Firestore) ───────────────────────────────────────
async function approveEntry(entryId) {
  const match = state.pending.find((item) => item.id === entryId);
  if (!match) return;
  try {
    const batch = db.batch();
    batch.delete(db.collection("pending").doc(entryId));
    batch.set(db.collection("approved").doc(entryId), { ...match, distance: areaLabel(match.area) });
    await batch.commit();
    state.activeArea = match.area;
    const region = REGIONS.find(r => r.areaIds.includes(match.area));
    if (region) state.activeRegion = region.id;
  } catch (err) {
    console.error("승인 실패:", err);
    window.alert("승인 중 오류가 발생했습니다.");
  }
}

async function rejectEntry(entryId) {
  try {
    await db.collection("pending").doc(entryId).delete();
  } catch (err) {
    console.error("반려 실패:", err);
    window.alert("반려 중 오류가 발생했습니다.");
  }
}

// ── 승인된 매장 관리 목록 렌더링 ─────────────────────────────────────────
function renderApprovedAdmin() {
  if (!elements.approvedAdminList) return;
  elements.approvedAdminList.innerHTML = "";

  if (!state.approved.length) {
    const empty = document.createElement("article");
    empty.className = "pending-card";
    empty.innerHTML = `<h3>승인된 매장이 없습니다</h3>
      <p class="pending-card__desc">제보를 승인하면 이곳에 표시됩니다.</p>`;
    elements.approvedAdminList.appendChild(empty);
    return;
  }

  // 검색 필터
  const q = state.adminApprovedQuery;
  const filtered = q
    ? state.approved.filter((e) =>
        [e.name, areaLabel(e.area), e.address, e.description].join(" ").toLowerCase().includes(q)
      )
    : state.approved;

  if (!filtered.length) {
    const empty = document.createElement("article");
    empty.className = "pending-card";
    empty.innerHTML = `<h3>검색 결과가 없습니다</h3>`;
    elements.approvedAdminList.appendChild(empty);
    return;
  }

  // 지역 순으로 정렬
  const sorted = [...filtered].sort((a, b) =>
    (areaLabel(a.area) + a.name).localeCompare(areaLabel(b.area) + b.name, "ko")
  );

  sorted.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "pending-card";

    const tags = (entry.categories || [])
      .map((id) => {
        const cat = CATEGORIES.find((c) => c.id === id);
        return `<span class="tag">${cat ? cat.label : id}</span>`;
      }).join("");

    const extraParts = [];
    if (entry.closedDays?.length)
      extraParts.push(`휴무 ${entry.closedDays.map((d) => DAY_LABELS[d] || d).join("·")}`);
    if (entry.phone) extraParts.push(entry.phone);
    if (entry.sns)   extraParts.push(entry.sns);

    card.innerHTML = `
      <div class="pending-card__head">
        <div>
          <h3>${entry.name}</h3>
          <p class="pending-card__meta">${areaLabel(entry.area)} · ${entry.address}</p>
        </div>
      </div>
      <p class="pending-card__desc">${entry.description || ""}</p>
      <p class="pending-card__coords">${extraParts.join("  ·  ")}</p>
      <div class="tag-row">${tags}</div>
      <div class="pending-card__actions">
        <button class="ghost-btn ghost-btn--danger js-delete-approved" type="button">삭제</button>
        <button class="primary-btn js-edit-approved" type="button">수정</button>
      </div>
    `;

    card.querySelector(".js-edit-approved").addEventListener("click", () =>
      openEditModal(entry, "approved")
    );
    card.querySelector(".js-delete-approved").addEventListener("click", () =>
      deleteApproved(entry.id)
    );

    elements.approvedAdminList.appendChild(card);
  });
}

async function deleteApproved(entryId) {
  if (!window.confirm("승인된 매장을 삭제하면 지도에서도 사라집니다. 삭제할까요?")) return;
  try {
    await db.collection("approved").doc(entryId).delete();
  } catch (err) {
    console.error("삭제 실패:", err);
    window.alert("삭제 중 오류가 발생했습니다.");
  }
}

// ── 수정 모달 ─────────────────────────────────────────────────────────────
function openEditModal(entry, collection = "pending") {
  elements.editCollection.value  = collection;
  elements.editEntryId.value    = entry.id;
  elements.editName.value       = entry.name;
  elements.editArea.value       = entry.area;
  elements.editAddress.value    = entry.address;
  elements.editDescription.value = entry.description;
  elements.editHours.value      = entry.hours || "";
  elements.editSns.value        = entry.sns   || "";
  elements.editPhone.value      = entry.phone || "";

  elements.editCategoryCheckboxes.querySelectorAll("input").forEach((cb) => {
    cb.checked = (entry.categories || []).includes(cb.value);
  });

  document.querySelectorAll("#editClosedDays input").forEach((cb) => {
    cb.checked = (entry.closedDays || []).includes(cb.value);
  });

  document.querySelectorAll("#editParking input[type=radio]").forEach((rb) => {
    rb.checked = rb.value === (entry.parking || "");
  });

  const modalTitle = elements.editModalOverlay.querySelector("h2");
  if (modalTitle) modalTitle.textContent = collection === "approved" ? "매장 정보 수정" : "제보 수정";

  elements.editModalOverlay.classList.add("open");
  requestAnimationFrame(() => elements.editName.focus());
}

function closeEditModal() {
  elements.editModalOverlay.classList.remove("open");
  elements.editForm.reset();
}

// ── 검색 & 필터 ───────────────────────────────────────────────────────────
function getFilteredApproved() {
  return state.approved.filter((spot) => {
    let matchesArea;
    if (state.activeArea) {
      matchesArea = spot.area === state.activeArea;
    } else if (state.activeRegion) {
      const region = REGIONS.find(r => r.id === state.activeRegion);
      matchesArea = region ? region.areaIds.includes(spot.area) : true;
    } else {
      matchesArea = true;
    }
    const matchesCategory = state.activeCategory === "all" || spot.categories.includes(state.activeCategory);
    const haystack = [spot.name, areaLabel(spot.area), spot.address, spot.description].join(" ").toLowerCase();
    const matchesQuery = !state.query || haystack.includes(state.query);
    const matchesOpen = !state.onlyOpen || isOpenNow(spot);
    const matchesGu   = !state.activeGuFilter || extractGu(spot.address) === state.activeGuFilter;
    return matchesArea && matchesCategory && matchesQuery && matchesOpen && matchesGu;
  });
}

function executeSearch() {
  const raw = (elements.searchInput.value || "").trim();
  if (!raw) { state.query = ""; renderApproved(); return; }

  const lower = raw.toLowerCase();

  // 대분류(지역) 매칭
  const matchedRegion = REGIONS.find(r => r.label === raw || lower === r.id);
  if (matchedRegion) {
    state.activeRegion = matchedRegion.id;
    state.activeArea   = null;
    state.query = "";
    elements.searchInput.value = "";
    renderRegionFilters();
    renderApproved();
    return;
  }

  // 소분류(구역) 매칭
  const matchedArea = AREAS.find(
    (a) => a.label === raw || lower === a.id.toLowerCase() || raw.includes(a.label)
  );
  if (matchedArea) {
    const region = REGIONS.find(r => r.areaIds.includes(matchedArea.id));
    state.activeRegion = region?.id || null;
    state.activeArea   = matchedArea.id;
    state.query = "";
    elements.searchInput.value = "";
    renderRegionFilters();
    renderApproved();
    return;
  }

  state.query = lower;
  renderApproved();
}

// ── 중복 매장명 검사 ──────────────────────────────────────────────────────
function checkDuplicateName(name) {
  if (!name) { clearNameError(); return false; }
  const lower = name.toLowerCase();
  const isDup = [...state.approved, ...state.pending].some(
    (s) => s.name?.trim().toLowerCase() === lower
  );
  if (isDup) {
    elements.nameError.textContent = "이미 제보 완료된 매장입니다.";
    elements.nameError.hidden = false;
    elements.nameError.classList.add("name-error--visible");
    elements.nameInput?.classList.add("name-input--error");
  } else {
    clearNameError();
  }
  return isDup;
}

function clearNameError() {
  if (!elements.nameError) return;
  elements.nameError.hidden = true;
  elements.nameError.classList.remove("name-error--visible");
  elements.nameInput?.classList.remove("name-input--error");
}

// ── 유틸리티 ──────────────────────────────────────────────────────────────
function focusSpotCard(name) {
  const card = [...elements.approvedList.children].find(
    (node) => node.querySelector("h3")?.textContent === name
  );
  if (!card) return;
  card.classList.add("is-open");
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.02)" }, { transform: "scale(1)" }],
    { duration: 450 }
  );
}

function getAreaPin(areaId) {
  const area = AREAS.find((a) => a.id === areaId);
  if (!area) return { x: 50, y: 50 };
  return { x: parseFloat(area.labelPos.left), y: parseFloat(area.labelPos.top) };
}

function areaLabel(areaId) {
  return AREAS.find((a) => a.id === areaId)?.label || areaId;
}

// ── 주소에서 구 추출 ──────────────────────────────────────────────────────
function extractGu(address) {
  const m = (address || "").match(/(\S+구)/);
  return m ? m[1] : null;
}

// ── 영업중 판별 ───────────────────────────────────────────────────────────
function isOpenNow(spot) {
  const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const now = new Date();
  const todayCode = DAY_CODES[now.getDay()];

  // 오늘 휴무이면 영업 안 함
  if (spot.closedDays?.includes(todayCode)) return false;

  // 운영시간 정보 없으면 영업중으로 간주
  const hours = (spot.hours || "").trim();
  if (!hours || hours === "정보 제보 필요") return true;

  // "HH:MM - HH:MM" 또는 "HH:MM~HH:MM" 형식 파싱
  const match = hours.match(/(\d{1,2}):(\d{2})\s*[-~]\s*(\d{1,2}):(\d{2})/);
  if (!match) return true;

  const openMin  = parseInt(match[1]) * 60 + parseInt(match[2]);
  const closeMin = parseInt(match[3]) * 60 + parseInt(match[4]);
  const nowMin   = now.getHours() * 60 + now.getMinutes();

  // 자정 넘는 케이스 (예: 10:00 - 02:00)
  if (closeMin < openMin) {
    return nowMin >= openMin || nowMin < closeMin;
  }
  return nowMin >= openMin && nowMin < closeMin;
}

function createId() {
  return window.crypto?.randomUUID?.() || `spot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ── 시간대별 배경 ─────────────────────────────────────────────────────────
function applyTimeBackground() {
  const h = new Date().getHours();
  let period;
  if      (h >= 7  && h < 18) period = "day";     // 오전 7시 ~ 오후 6시  → background2
  else if (h >= 18)            period = "evening"; // 오후 6시 ~ 자정      → background1
  else                         period = "night";   // 자정 ~ 오전 7시      → background3
  document.documentElement.dataset.time = period;
}
applyTimeBackground();
setInterval(applyTimeBackground, 60 * 1000);

// ── 커스텀 마우스 커서 ────────────────────────────────────────────────────
(function initCursor() {
  const cursor = document.getElementById("custom-cursor");
  if (!cursor) return;

  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (isTouch) {
    // ── 모바일: 터치 중에만 커서 표시, 떼면 숨김 ──
    document.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      cursor.style.left    = t.clientX + "px";
      cursor.style.top     = t.clientY + "px";
      cursor.style.opacity = "1";
      cursor.style.scale   = "0.85";
    }, { passive: true });

    document.addEventListener("touchmove", (e) => {
      const t = e.touches[0];
      cursor.style.left  = t.clientX + "px";
      cursor.style.top   = t.clientY + "px";
      cursor.style.scale = "1";
    }, { passive: true });

    document.addEventListener("touchend", () => {
      // CSS transition(0.7s)으로 서서히 페이드아웃
      cursor.style.opacity = "0";
      cursor.style.scale   = "1";
    }, { passive: true });

  } else {
    // ── PC: 마우스 이동에 따라 커서 표시 ──
    document.addEventListener("mousemove", (e) => {
      cursor.style.left    = e.clientX + "px";
      cursor.style.top     = e.clientY + "px";
      cursor.style.opacity = "1";
    });
    document.addEventListener("mouseleave", () => { cursor.style.opacity = "0"; });
    document.addEventListener("mouseenter", () => { cursor.style.opacity = "1"; });
    document.addEventListener("mousedown",  () => { cursor.style.scale = "0.8"; });
    document.addEventListener("mouseup",    () => { cursor.style.scale = "1"; });
  }
})();

// ── 벚꽃 흩날리기 ────────────────────────────────────────────────────────
(function initSakura() {
  const container = document.getElementById("sakura-container");
  if (!container) return;

  const PETAL_COUNT = 20;  // 동시에 떠 있을 꽃잎 수

  function createPetal() {
    const el = document.createElement("div");
    el.className = "sakura-petal";

    // 랜덤 위치 / 크기 / 애니메이션 타이밍
    const size     = 7 + Math.random() * 7;            // 7~14px
    const startX   = Math.random() * 105;              // 0~105vw
    const duration = 7 + Math.random() * 9;            // 7~16s
    const delay    = -(Math.random() * 14);            // 음수 딜레이 → 시작부터 화면에 있음

    el.style.cssText = `
      left: ${startX}vw;
      width: ${size}px;
      height: ${size}px;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;

    container.appendChild(el);
  }

  for (let i = 0; i < PETAL_COUNT; i++) {
    createPetal();
  }
})();

// ── 배경 도트 반짝이 캔버스 ───────────────────────────────────────────────
(function initSparkleCanvas() {
  const canvas = document.createElement("canvas");
  canvas.id = "sparkle-canvas";
  canvas.style.cssText = [
    "position:fixed",
    "inset:0",
    "width:100%",
    "height:100%",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  // 시간대별 스파클 색상 팔레트
  const PALETTES = {
    day:     ["#ffe8b0", "#ffd0e8", "#e8d0ff", "#ffffff", "#d8f8ff"], // background2: 파스텔 골드+핑크
    evening: ["#ffb0d0", "#d8b0ff", "#ffeeaa", "#ffffff", "#ffcce8"], // background1: 핑크+보라+금
    night:   ["#a8c8ff", "#c8b0ff", "#d8f0ff", "#ffffff", "#b0e8ff"], // background3: 아이스블루+보라
  };

  // 스파클 파티클 생성
  const COUNT = 45;
  const sparkles = Array.from({ length: COUNT }, () => ({
    x:       Math.random(),               // 화면 비율 위치 (0~1)
    y:       Math.random(),
    size:    1.2 + Math.random() * 2.2,   // 도트 크기
    phase:   Math.random() * Math.PI * 2, // 깜빡임 위상
    speed:   0.018 + Math.random() * 0.032, // 깜빡임 속도
    dx:      (Math.random() - 0.5) * 0.00025, // 수평 이동
    dy:      (Math.random() - 0.5) * 0.00018, // 수직 이동
    colorIdx: Math.floor(Math.random() * 5),
    // 십자 스파클 vs 원형 도트 랜덤 혼합
    type:    Math.random() < 0.6 ? "cross" : "dot",
  }));

  function getColors() {
    const t = document.documentElement.dataset.time || "afternoon";
    return PALETTES[t] || PALETTES.afternoon;
  }

  // 십자(+) 모양 스파클 그리기
  function drawCross(x, y, size, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";

    const arm = size * 3.5;
    const armShort = arm * 0.45;

    // 세로/가로 긴 축
    ctx.lineWidth = size * 0.7;
    ctx.beginPath(); ctx.moveTo(x, y - arm); ctx.lineTo(x, y + arm); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - arm, y); ctx.lineTo(x + arm, y); ctx.stroke();

    // 대각선 짧은 축
    ctx.lineWidth = size * 0.35;
    ctx.beginPath(); ctx.moveTo(x - armShort, y - armShort); ctx.lineTo(x + armShort, y + armShort); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + armShort, y - armShort); ctx.lineTo(x - armShort, y + armShort); ctx.stroke();

    ctx.restore();
  }

  // 원형 도트 그리기
  function drawDot(x, y, size, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const colors = getColors();

    sparkles.forEach((sp) => {
      // 위치 살짝 이동 (루프)
      sp.x = (sp.x + sp.dx + 1) % 1;
      sp.y = (sp.y + sp.dy + 1) % 1;

      // 알파값: sin 파형으로 자연스럽게 깜빡임
      const alpha = Math.pow((Math.sin(frame * sp.speed + sp.phase) + 1) / 2, 1.8) * 0.82;
      const color = colors[sp.colorIdx % colors.length];
      const px    = sp.x * canvas.width;
      const py    = sp.y * canvas.height;

      if (sp.type === "cross") {
        drawCross(px, py, sp.size, alpha, color);
      } else {
        drawDot(px, py, sp.size, alpha * 0.7, color);
      }
    });

    frame++;
    requestAnimationFrame(animate);
  }

  animate();
})();
