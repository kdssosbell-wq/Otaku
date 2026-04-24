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

// ── 네이버 지도 인스턴스 ─────────────────────────────────────────────────
let naverMap    = null;
const nmMarkers = []; // { marker, infoWindow }

// ── 카테고리 & 지역 & 요일 정의 ───────────────────────────────────────────
const CATEGORIES = [
  { id: "kuji",   label: "제일복권" },
  { id: "figure", label: "피규어"   },
  { id: "gacha",  label: "가챠"     },
  { id: "goods",  label: "굿즈샵"   },
  { id: "etc",    label: "기타", subCategories: [
    { id: "etc_manga", label: "만화 서적"       },
    { id: "etc_bar",   label: "오타쿠 칵테일바" },
  ]},
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

// ── 구별 네이버 지도 중심 좌표 (부산·대전) ───────────────────────────────
const GU_CENTERS = {
  daejeon: {
    "동구":   { lat: 36.3467, lng: 127.4536 },
    "중구":   { lat: 36.3254, lng: 127.4210 },
    "서구":   { lat: 36.3551, lng: 127.3836 },
    "유성구": { lat: 36.3793, lng: 127.3562 },
    "대덕구": { lat: 36.3822, lng: 127.4346 },
  },
  busan: {
    "부산진구": { lat: 35.1636, lng: 129.0530 },
    "해운대구": { lat: 35.1631, lng: 129.1640 },
    "사하구":   { lat: 35.1041, lng: 128.9746 },
    "금정구":   { lat: 35.2432, lng: 129.0924 },
    "남구":     { lat: 35.1361, lng: 129.0848 },
    "동구":     { lat: 35.1801, lng: 129.0544 },
    "연제구":   { lat: 35.1821, lng: 129.0757 },
    "수영구":   { lat: 35.1452, lng: 129.1134 },
    "서구":     { lat: 35.1775, lng: 129.0118 },
    "사상구":   { lat: 35.1488, lng: 128.9934 },
    "강서구":   { lat: 35.2118, lng: 128.9826 },
    "기장군":   { lat: 35.2447, lng: 129.2225 },
    "북구":     { lat: 35.1985, lng: 128.9991 },
    "중구":     { lat: 35.1796, lng: 129.0202 },
    "동래구":   { lat: 35.1990, lng: 129.0875 },
  },
};

// ── 네이버 지도: 지역별 중심 좌표 ────────────────────────────────────────
const AREA_CENTERS = {
  hongdae:    { lat: 37.5534, lng: 126.9235 },
  hapjeong:   { lat: 37.5498, lng: 126.9049 },
  sinchon:    { lat: 37.5596, lng: 126.9370 },
  yongsan:    { lat: 37.5323, lng: 126.9647 },
  gangnam:    { lat: 37.4982, lng: 127.0275 },
  geondae:    { lat: 37.5403, lng: 127.0703 },
  suwon:      { lat: 37.2636, lng: 127.0286 },
  osan:       { lat: 37.1496, lng: 127.0694 },
  dongtan:    { lat: 37.2005, lng: 127.0720 },
  pyeongtaek: { lat: 36.9921, lng: 127.1128 },
  cheonan:    { lat: 36.8151, lng: 127.1139 },
  busan:      { lat: 35.1796, lng: 129.0756 },
  daejeon:    { lat: 36.3504, lng: 127.3845 },
};

const REGION_VIEWS = {
  seoul:    { lat: 37.5400, lng: 126.9700, zoom: 12 },
  gyeonggi: { lat: 37.1800, lng: 127.0600, zoom: 10 },
  busan:    { lat: 35.1796, lng: 129.0756, zoom: 13 },
  daejeon:  { lat: 36.3504, lng: 127.3845, zoom: 13 },
};

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
  { id: "busan",    label: "부산",   areaIds: ["busan"],   useDistricts: true },
  { id: "daejeon",  label: "대전",   areaIds: ["daejeon"], useDistricts: true },
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
  editLat:            document.querySelector("#editLat"),
  editLng:            document.querySelector("#editLng"),
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
  populateEditCategoryCheckboxes();
  bindEvents();
  setupAuthListener();
  initNaverMap();       // 지도 먼저 초기화해야 첫 render에서 커스텀 라벨을 그리지 않음
  initPlaceSearch();
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
    const selectedCategories = [...elements.editCategoryCheckboxes.querySelectorAll("input[name='editCategories']:checked")]
      .map((cb) => cb.value);
    const selectedSubCategories = [...elements.editCategoryCheckboxes.querySelectorAll("input[name='editSubCategories']:checked")]
      .map((cb) => cb.value);

    // 기타 하위 카테고리 선택 시 "etc" 자동 추가
    const etcSubIds = CATEGORIES.find(c => c.id === "etc")?.subCategories?.map(s => s.id) || [];
    if (selectedSubCategories.some(s => etcSubIds.includes(s)) && !selectedCategories.includes("etc")) {
      selectedCategories.push("etc");
    }
    const selectedClosedDays = [...document.querySelectorAll("#editClosedDays input:checked")]
      .map((cb) => cb.value);

    const editLatVal = parseFloat(document.getElementById("editLat")?.value || "");
    const editLngVal = parseFloat(document.getElementById("editLng")?.value || "");
    const editAreaId = areaIdFromText(elements.editArea.value.trim()); // "홍대"→"hongdae", "신림"→"신림"
    const updatedData = {
      name:          elements.editName.value.trim(),
      area:          editAreaId,
      address:       elements.editAddress.value.trim(),
      ...(isFinite(editLatVal) && isFinite(editLngVal) ? { lat: editLatVal, lng: editLngVal } : {}),
      categories:    selectedCategories,
      subCategories: selectedSubCategories,
      description: elements.editDescription.value.trim(),
      hours:       elements.editHours.value.trim(),
      closedDays:  selectedClosedDays,
      sns:         elements.editSns.value.trim(),
      phone:       elements.editPhone.value.trim(),
      parking:     document.querySelector("#editParking input:checked")?.value ?? "",
      distance:    areaLabel(editAreaId),
      pin:         getAreaPin(editAreaId),
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
    // 지도가 숨겨졌다가 다시 표시될 때 네이버 지도 크기 재계산
    if (state.viewMode === "map" && naverMap) {
      setTimeout(() => naverMap.autoResize(), 80);
    }
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
    const categories    = formData.getAll("categories");
    const subCategories = formData.getAll("subCategories");

    // 기타 하위 카테고리 선택 시 "etc" 자동 추가
    const etcSubIds = CATEGORIES.find(c => c.id === "etc")?.subCategories?.map(s => s.id) || [];
    if (subCategories.some(s => etcSubIds.includes(s)) && !categories.includes("etc")) {
      categories.push("etc");
    }

    // 중복 매장 최종 차단
    const nameVal = (formData.get("name") || "").trim();
    if (nameVal && checkDuplicateName(nameVal)) return;

    if (!categories.length && !subCategories.length) {
      window.alert("카테고리를 하나 이상 선택해 주세요.");
      return;
    }

    // 사용자가 입력한 지역 텍스트("홍대", "신림" 등)를 area ID로 변환
    // 기존 알려진 지역("홍대" → "hongdae")은 ID로, 신규 지역("신림")은 텍스트 그대로 저장
    const selectedArea = areaIdFromText(formData.get("area") || "");
    const regionVal    = formData.get("region") || null; // geocoding에서 자동 감지된 대분류
    const latVal = parseFloat(formData.get("lat") || "");
    const lngVal = parseFloat(formData.get("lng") || "");
    const entry = {
      id:          createId(),
      name:        formData.get("name"),
      area:        selectedArea,
      ...(regionVal ? { detectedRegion: regionVal } : {}),
      address:     formData.get("address"),
      ...(isFinite(latVal) && isFinite(lngVal) ? { lat: latVal, lng: lngVal } : {}),
      categories,
      subCategories,
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
      // geocode UI 초기화
      const statusEl    = document.getElementById("geocodeStatus");
      const areaAutoTag = document.getElementById("areaAutoTag");
      if (statusEl)    { statusEl.hidden = true; }
      if (areaAutoTag) { areaAutoTag.hidden = true; }
      const previewEl   = document.getElementById("submitMapPreview");
      if (previewEl)    { previewEl.hidden = true; }
      const regionInput = document.getElementById("coordRegion");
      if (regionInput)  { regionInput.value = ""; }
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
  // 하위탭 스크롤 위치 보존 (클릭 시 리렌더로 리셋되는 것 방지)
  const prevAreaRow   = elements.regionFilters.querySelector(".area-row");
  const savedScrollLeft = prevAreaRow ? prevAreaRow.scrollLeft : 0;

  elements.regionFilters.innerHTML = "";

  const baseList = state.approved.filter(s => {
    const matchesCat  = state.activeCategory === "all" || s.categories.includes(state.activeCategory);
    const matchesOpen = !state.onlyOpen || isOpenNow(s);
    const matchesQ    = !state.query || [s.name, areaLabel(s.area), s.address, s.description].join(" ").toLowerCase().includes(state.query);
    return matchesCat && matchesOpen && matchesQ;
  });

  // ── 대분류 행 ──────────────────────────────────────
  const regionRow = document.createElement("div");
  regionRow.className = "region-row";

  REGIONS.forEach((region) => {
    const count = baseList.filter(s => region.areaIds.includes(s.area) || s.detectedRegion === region.id).length;
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
      state.onlyOpen = false;
      state.activeGuFilter = null;
      if (elements.openNowToggle) elements.openNowToggle.classList.remove("active");
      renderRegionFilters();
      renderApproved();
    });
    regionRow.appendChild(btn);
  });
  elements.regionFilters.appendChild(regionRow);

  // ── 소분류 아코디언 행 ──────────────────────────────────
  if (state.activeRegion) {
    const activeRegionData = REGIONS.find(r => r.id === state.activeRegion);
    if (activeRegionData) {
      const areaRow = document.createElement("div");
      areaRow.className = "area-row";

      if (activeRegionData.useDistricts) {
        // 부산·대전: 주소에서 구 추출해 동적 생성
        const regionStores = baseList.filter(s => activeRegionData.areaIds.includes(s.area));
        const districts = [...new Set(
          regionStores.map(s => extractGu(s.address)).filter(Boolean)
        )].sort((a, b) => a.localeCompare(b, "ko"));

        districts.forEach(gu => {
          const count = regionStores.filter(s => extractGu(s.address) === gu).length;
          const isActive = state.activeGuFilter === gu;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `chip chip--sub${isActive ? " active" : ""}`;
          btn.innerHTML = count > 0
            ? `${gu}<span class="region-count">${count}</span>`
            : gu;
          btn.addEventListener("click", () => {
            state.activeGuFilter = isActive ? null : gu;
            state.activeArea     = null;
            renderRegionFilters();
            renderApproved();
          });
          areaRow.appendChild(btn);
        });
      } else {
        // 서울·경기도: AREAS 기반 고정 탭
        activeRegionData.areaIds.forEach(areaId => {
          const area = AREAS.find(a => a.id === areaId);
          if (!area) return;
          const count = baseList.filter(s => s.area === areaId || (AREAS.find(a2=>a2.id===areaId)?.label === s.area)).length;
          const isAreaActive = state.activeArea === areaId;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `chip chip--sub${isAreaActive ? " active" : ""}`;
          btn.innerHTML = count > 0
            ? `${area.label}<span class="region-count">${count}</span>`
            : area.label;
          btn.addEventListener("click", () => {
            state.activeArea     = isAreaActive ? null : areaId;
            state.activeGuFilter = null;
            renderRegionFilters();
            renderApproved();
          });
          areaRow.appendChild(btn);
        });

        // 신규 동네: detectedRegion으로 이 지역에 속하지만 AREAS에 없는 area를 동적 탭으로 추가
        const knownAreaIds  = new Set(activeRegionData.areaIds);
        const knownLabels   = new Set(activeRegionData.areaIds.map(id => AREAS.find(a=>a.id===id)?.label).filter(Boolean));
        const dynamicAreas  = [...new Set(
          baseList
            .filter(s => s.detectedRegion === activeRegionData.id && !knownAreaIds.has(s.area) && !knownLabels.has(s.area))
            .map(s => s.area)
        )].sort((a, b) => a.localeCompare(b, "ko"));

        dynamicAreas.forEach(dynamicArea => {
          const count = baseList.filter(s => s.area === dynamicArea).length;
          const isAreaActive = state.activeArea === dynamicArea;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `chip chip--sub${isAreaActive ? " active" : ""}`;
          btn.innerHTML = count > 0
            ? `${dynamicArea}<span class="region-count">${count}</span>`
            : dynamicArea;
          btn.addEventListener("click", () => {
            state.activeArea     = isAreaActive ? null : dynamicArea;
            state.activeGuFilter = null;
            renderRegionFilters();
            renderApproved();
          });
          areaRow.appendChild(btn);
        });
      }

      if (areaRow.children.length) {
        const wrap = document.createElement("div");
        wrap.className = "area-row-wrap";
        wrap.appendChild(areaRow);
        elements.regionFilters.appendChild(wrap);
        // 클릭 전 스크롤 위치 복원 (강남 클릭 후 앞으로 튀는 현상 방지)
        areaRow.scrollLeft = savedScrollLeft;
      }
    }
  }
}

function buildCategoryItem(cat, nameAttr, subNameAttr) {
  if (!cat.subCategories?.length) {
    const label = document.createElement("label");
    label.className = "checkbox-item";
    label.innerHTML = `<input type="checkbox" name="${nameAttr}" value="${cat.id}"><span>${cat.label}</span>`;
    return label;
  }

  // 하위 카테고리가 있는 경우 — 부모 체크박스 없이 그룹 레이블 + 항상 열린 하위 그리드
  const wrapper = document.createElement("div");
  wrapper.className = "category-etc-wrapper";

  const groupLabel = document.createElement("span");
  groupLabel.className = "category-group-label";
  groupLabel.textContent = cat.label;
  wrapper.appendChild(groupLabel);

  const subGrid = document.createElement("div");
  subGrid.className = "checkbox-sub-grid";

  cat.subCategories.forEach(sub => {
    const subLabel = document.createElement("label");
    subLabel.className = "checkbox-item checkbox-item--sub";
    const subInput = document.createElement("input");
    subInput.type = "checkbox";
    subInput.name = subNameAttr;
    subInput.value = sub.id;
    subLabel.appendChild(subInput);
    const subSpan = document.createElement("span");
    subSpan.textContent = sub.label;
    subLabel.appendChild(subSpan);
    subGrid.appendChild(subLabel);
  });
  wrapper.appendChild(subGrid);

  return wrapper;
}

function renderCategoryCheckboxes() {
  elements.categoryCheckboxes.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    elements.categoryCheckboxes.appendChild(
      buildCategoryItem(cat, "categories", "subCategories")
    );
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
    elements.editCategoryCheckboxes.appendChild(
      buildCategoryItem(cat, "editCategories", "editSubCategories")
    );
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
// ── 네이버 지도 초기화 ────────────────────────────────────────────────────
function initNaverMap() {
  if (!window.naver?.maps) return;
  const container = elements.mapStage;
  if (!container) return;

  const view = REGION_VIEWS[state.activeRegion] || REGION_VIEWS.seoul;
  naverMap = new naver.maps.Map(container, {
    center:  new naver.maps.LatLng(view.lat, view.lng),
    zoom:    view.zoom,
    minZoom: 9,
    mapDataControl: false,
    logoControlOptions: { position: naver.maps.Position.BOTTOM_LEFT },
    scaleControlOptions: { position: naver.maps.Position.BOTTOM_RIGHT },
  });

  // 지도 클릭 시 열린 정보창 닫기
  naver.maps.Event.addListener(naverMap, "click", () => {
    nmMarkers.forEach(({ infoWindow }) => infoWindow.close());
  });

  window.addEventListener("resize", () => { naverMap?.autoResize(); });
}

// ── 좌표 결정: 저장된 값 우선, 없으면 지역 중심 + 결정론적 오프셋 ─────────
function hashToFloat(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  }
  return h / 0xffffffff;
}

function getSpotCoords(spot) {
  if (spot.lat && spot.lng) return { lat: +spot.lat, lng: +spot.lng };

  // 주소에서 구를 추출해 GU_CENTERS 폴백 (대전·부산처럼 구 단위 지역)
  const gu = extractGu(spot.address);
  if (gu) {
    const region = REGIONS.find(r => r.areaIds.includes(spot.area));
    if (region) {
      const guCenter = GU_CENTERS[region.id]?.[gu];
      if (guCenter) {
        const seed = spot.id || spot.name || "";
        return {
          lat: guCenter.lat + (hashToFloat(seed + "lat") - 0.5) * 0.003,
          lng: guCenter.lng + (hashToFloat(seed + "lng") - 0.5) * 0.004,
        };
      }
    }
  }

  const center = AREA_CENTERS[spot.area];
  if (!center) return null;
  const seed = spot.id || spot.name || "";
  return {
    lat: center.lat + (hashToFloat(seed + "lat") - 0.5) * 0.007,
    lng: center.lng + (hashToFloat(seed + "lng") - 0.5) * 0.010,
  };
}

// ── 마커 생성 HTML ─────────────────────────────────────────────────────────
// spot.name에 가챠/가차 포함 시 PIN-2, 그 외 PIN-3 사용
function makePinHTML(spot) {
  const cats = spot.categories    || [];
  const subs = spot.subCategories || [];
  let pinFile;

  if (subs.includes("etc_bar")   || cats.includes("etc_bar"))   pinFile = "tema/PIN-4.png"; // 칵테일바
  else if (subs.includes("etc_manga") || cats.includes("etc_manga")) pinFile = "tema/PIN-1.png"; // 만화 서적
  else if (cats.includes("gacha"))                                    pinFile = "tema/PIN-2.png"; // 가챠
  else                                                                pinFile = "tema/PIN-3.png"; // 기본

  return `<img src="${pinFile}" style="width:36px;height:auto;display:block;cursor:pointer;" draggable="false" alt="">`;
}

function makeInfoWindowHTML(spot) {
  const allCats = [
    ...(spot.categories || []).map(c => {
      for (const cat of CATEGORIES) {
        if (cat.id === c) return cat.label;
        const sub = cat.subCategories?.find(s => s.id === c);
        if (sub) return sub.label;
      }
      return c;
    }),
    ...(spot.subCategories || []).map(id => {
      for (const cat of CATEGORIES) {
        const sub = cat.subCategories?.find(s => s.id === id);
        if (sub) return sub.label;
      }
      return id;
    }),
  ];
  const cats = allCats.map(l => `<span class="nm-iw__tag">${l}</span>`).join("");
  const open = isOpenNow(spot);
  const openBadge = spot.hours && spot.hours !== "정보 제보 필요"
    ? `<span class="nm-iw__badge nm-iw__badge--${open ? "open" : "close"}">${open ? "영업중" : "영업 전"}</span>`
    : "";
  return `
    <div class="nm-iw">
      <strong class="nm-iw__name">${spot.name}</strong>
      <p class="nm-iw__addr">${spot.address || ""}</p>
      ${cats ? `<div class="nm-iw__tags">${cats}</div>` : ""}
      <div class="nm-iw__foot">
        ${spot.hours && spot.hours !== "정보 제보 필요" ? `<span>⏰ ${spot.hours}</span>` : ""}
        ${openBadge}
      </div>
      <button class="nm-iw__detail-btn" onclick="window.__focusSpot('${spot.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">세부 정보 보러가기 →</button>
    </div>`;
}

// ── 마커 일괄 업데이트 ────────────────────────────────────────────────────
function updateNaverMarkers(spots) {
  if (!naverMap) return;

  // 기존 마커 제거
  nmMarkers.forEach(({ marker, infoWindow }) => {
    infoWindow.close();
    marker.setMap(null);
  });
  nmMarkers.length = 0;

  // ── 같은 좌표에 겹치는 마커를 원형으로 분산 ──────────────────────────
  // 소수점 5자리(약 1m) 기준으로 그룹핑 → 2개 이상이면 반지름 0.00018° (~20m) 원형 배치
  const coordKey  = c => `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`;
  const coordGroups = new Map(); // key → [spot, ...]
  spots.forEach(spot => {
    const c = getSpotCoords(spot);
    if (!c) return;
    const k = coordKey(c);
    if (!coordGroups.has(k)) coordGroups.set(k, []);
    coordGroups.get(k).push({ spot, baseCoords: c });
  });

  const SPREAD_R = 0.00018; // 분산 반지름 (위경도 단위, 약 18~20m)
  const resolvedSpots = []; // { spot, lat, lng }
  coordGroups.forEach((entries) => {
    if (entries.length === 1) {
      const { spot, baseCoords } = entries[0];
      resolvedSpots.push({ spot, lat: baseCoords.lat, lng: baseCoords.lng });
    } else {
      // 2개 이상: 원형 균등 배치
      entries.forEach(({ spot, baseCoords }, i) => {
        const angle = (2 * Math.PI * i) / entries.length - Math.PI / 2;
        resolvedSpots.push({
          spot,
          lat: baseCoords.lat + SPREAD_R * Math.cos(angle),
          lng: baseCoords.lng + SPREAD_R * Math.sin(angle) / Math.cos(baseCoords.lat * Math.PI / 180),
        });
      });
    }
  });

  resolvedSpots.forEach(({ spot, lat, lng }) => {
    const marker = new naver.maps.Marker({
      position: new naver.maps.LatLng(lat, lng),
      map:      naverMap,
      icon: {
        content: makePinHTML(spot),
        anchor:  new naver.maps.Point(18, 36), // 이미지 하단 중앙
      },
      title: spot.name,
    });

    const infoWindow = new naver.maps.InfoWindow({
      content:         makeInfoWindowHTML(spot),
      borderWidth:     0,
      backgroundColor: "transparent",
      anchorSkew:      true,
      anchorColor:     "transparent",
      anchorSize:      new naver.maps.Size(10, 10),
    });

    naver.maps.Event.addListener(marker, "click", () => {
      nmMarkers.forEach(m => { if (m.infoWindow !== infoWindow) m.infoWindow.close(); });
      if (infoWindow.getMap()) {
        infoWindow.close();
      } else {
        infoWindow.open(naverMap, marker);
        // 스크롤은 인포창 내 "세부 정보 보러가기" 클릭 시에만 발생
      }
    });

    nmMarkers.push({ marker, infoWindow });
  });
}

// ── 지역 탭 변경 시 지도 이동 ────────────────────────────────────────────
function panNaverMapToRegion() {
  if (!naverMap) return;
  const view = REGION_VIEWS[state.activeRegion];
  if (!view) return;
  naverMap.morph(new naver.maps.LatLng(view.lat, view.lng), view.zoom, { duration: 400 });
}

// ── 필터된 매장 좌표에 맞춰 지도 자동 피팅 ─────────────────────────────
function panNaverMapToSpots(spots) {
  if (!naverMap) return;

  // 하위 필터 선택된 경우: 실제 매장 위치 기준으로 지도 영역 조정
  if (state.activeGuFilter || state.activeArea) {
    const coords = spots.map(getSpotCoords).filter(Boolean);
    if (coords.length > 0) {
      if (coords.length === 1) {
        naverMap.morph(new naver.maps.LatLng(coords[0].lat, coords[0].lng), 16, { duration: 400 });
      } else {
        const latLngs = coords.map(c => new naver.maps.LatLng(c.lat, c.lng));
        const bounds = latLngs.reduce(
          (b, ll) => b.extend(ll),
          new naver.maps.LatLngBounds(latLngs[0], latLngs[0])
        );
        naverMap.fitBounds(bounds, { top: 70, right: 30, bottom: 50, left: 30 });
      }
      return;
    }
    // 매장 없으면 구/지역 중심으로 폴백
    if (state.activeGuFilter) {
      const c = GU_CENTERS[state.activeRegion]?.[state.activeGuFilter];
      if (c) { naverMap.morph(new naver.maps.LatLng(c.lat, c.lng), 14, { duration: 400 }); return; }
    }
    if (state.activeArea) {
      const c = AREA_CENTERS[state.activeArea];
      if (c) { naverMap.morph(new naver.maps.LatLng(c.lat, c.lng), 15, { duration: 400 }); return; }
    }
  }

  // 대분류만 선택된 경우: 지역 전체 뷰
  panNaverMapToRegion();
}

function renderAreaMap(container, activeAreaId, spots) {
  // 네이버 지도 있으면 마커만 업데이트
  if (naverMap) {
    // 혹시 남아 있는 커스텀 지도 라벨/블롭 제거
    container.querySelectorAll(".district-label, .map-blob, .map-pin").forEach(el => el.remove());
    panNaverMapToSpots(spots); // 매장 좌표 기준으로 자동 피팅
    updateNaverMarkers(spots);
    return;
  }

  // 네이버 지도 미로드 시 → 기존 커스텀 지도 폴백
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
  (spot.subCategories || []).forEach((id) => tags.appendChild(createTag(id)));

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
  let label = categoryId;
  for (const cat of CATEGORIES) {
    if (cat.id === categoryId) { label = cat.label; break; }
    const sub = cat.subCategories?.find(s => s.id === categoryId);
    if (sub) { label = sub.label; break; }
  }
  tag.className = "tag";
  tag.textContent = label;
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
  elements.editArea.value       = areaLabel(entry.area); // ID("hongdae") → 라벨("홍대")
  elements.editAddress.value    = entry.address;
  elements.editDescription.value = entry.description;
  elements.editHours.value      = entry.hours || "";
  elements.editSns.value        = entry.sns   || "";
  elements.editPhone.value      = entry.phone || "";
  // 기존 좌표 복원
  const editLatEl = document.getElementById("editLat");
  const editLngEl = document.getElementById("editLng");
  if (editLatEl) editLatEl.value = isFinite(entry.lat) ? entry.lat : "";
  if (editLngEl) editLngEl.value = isFinite(entry.lng) ? entry.lng : "";
  // geocode 상태 초기화
  const editStatus = document.getElementById("editGeocodeStatus");
  if (editStatus) editStatus.hidden = true;
  // 좌표 없는 가게는 안내 메시지 표시
  if (editStatus && !isFinite(entry.lat)) {
    editStatus.hidden    = false;
    editStatus.className = "geocode-status geocode-status--warn";
    editStatus.textContent = "이 매장은 정확한 좌표가 없어요. 주소 수정 후 '위치 확인'을 눌러 좌표를 등록하면 지도에 정확히 표시돼요.";
  }

  // 카테고리 체크 복원
  elements.editCategoryCheckboxes.querySelectorAll("input[name='editCategories']").forEach((cb) => {
    cb.checked = (entry.categories || []).includes(cb.value);
  });
  // 하위 카테고리 체크 복원
  elements.editCategoryCheckboxes.querySelectorAll("input[name='editSubCategories']").forEach((cb) => {
    cb.checked = (entry.subCategories || []).includes(cb.value);
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
      // 소분류 선택: area ID 직접 매칭 OR 동네명(한글)이 해당 area의 label과 일치
      const areaObj = AREAS.find(a => a.id === state.activeArea);
      matchesArea = spot.area === state.activeArea
        || (areaObj && spot.area === areaObj.label);
    } else if (state.activeRegion) {
      const region = REGIONS.find(r => r.id === state.activeRegion);
      if (region) {
        // 기존 알려진 area ID로 매칭 OR 신규 동네의 detectedRegion으로 매칭
        matchesArea = region.areaIds.includes(spot.area)
          || spot.detectedRegion === state.activeRegion;
      } else {
        matchesArea = true;
      }
    } else {
      matchesArea = true;
    }
    // "기타" 필터: 직접 저장된 categories["etc"] 외에, 예전 데이터가 서브카테고리만 갖는 경우도 매칭
    const etcSubIds = new Set(
      CATEGORIES.find(c => c.id === "etc")?.subCategories?.map(s => s.id) || []
    );
    const matchesCategory = state.activeCategory === "all"
      || (spot.categories || []).includes(state.activeCategory)
      || (state.activeCategory === "etc" && (
           (spot.subCategories || []).some(s => etcSubIds.has(s)) ||
           (spot.categories    || []).some(s => etcSubIds.has(s))
         ));
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
// 인포창 내 버튼에서 직접 호출할 수 있도록 전역 노출
window.__focusSpot = focusSpotCard;

function getAreaPin(areaId) {
  const area = AREAS.find((a) => a.id === areaId);
  if (!area) return { x: 50, y: 50 };
  return { x: parseFloat(area.labelPos.left), y: parseFloat(area.labelPos.top) };
}

function areaLabel(areaId) {
  return AREAS.find((a) => a.id === areaId)?.label || areaId;
}

// 사용자가 입력한 텍스트(라벨 or ID)를 area ID로 변환
// "홍대" → "hongdae", "hongdae" → "hongdae", "신림" → "신림" (미매칭은 그대로)
function areaIdFromText(text) {
  if (!text) return "";
  const t = text.trim();
  const byId    = AREAS.find(a => a.id    === t);
  if (byId)    return byId.id;
  const byLabel = AREAS.find(a => a.label === t);
  if (byLabel) return byLabel.id;
  return t; // 서비스 외 지역은 텍스트 그대로 저장
}

// ── 주소에서 구 추출 ──────────────────────────────────────────────────────
function extractGu(address) {
  const m = (address || "").match(/(\S+구)/);
  if (!m) return null;
  const gu = m[1];
  // "진구"만 기록된 경우 → 부산 주소일 때만 부산진구로 정규화
  if (gu === "진구" && address.includes("부산")) return "부산진구";
  return gu;
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

// ── 제보 탭: 장소 검색 + 주소 자동입력 ──────────────────────────────────
function initPlaceSearch() {
  const searchInput = document.getElementById("placeSearchInput");
  const searchBtn   = document.getElementById("placeSearchBtn");
  const resultsBox  = document.getElementById("placeSearchResults");
  const previewEl   = document.getElementById("submitMapPreview");
  const addrInput   = document.getElementById("addressInput");
  const latInput    = document.getElementById("coordLat");
  const lngInput    = document.getElementById("coordLng");
  const nameInput   = document.getElementById("nameInput");

  if (!searchInput) return;

  let miniMap    = null;
  let miniMarker = null;
  let debounce   = null;

  // HTML 태그 제거 (네이버 API title에 <b> 태그가 포함됨)
  function stripHtml(str) {
    return str ? str.replace(/<[^>]*>/g, "") : "";
  }

  // 도로명 주소 → 서비스 지역 ID 자동 매핑
  // addressElements(Geocoding 응답)를 우선 활용하고, 없으면 fullAddr 문자열로 폴백
  const ADDR_TO_AREA = [
    // ── 서울 ──
    { keys: ["마포구 서교동", "마포구 동교동", "마포구 연남동", "마포구 상수동", "홍익대", "홍대입구", "서교동", "동교동", "연남동", "상수동"], area: "hongdae" },
    { keys: ["마포구 합정동", "마포구 망원동", "합정동", "망원동"],                                                                              area: "hapjeong" },
    { keys: ["서대문구 창천동", "서대문구 대현동", "마포구 노고산동", "신촌동", "창천동", "대현동", "이화여대"],                                  area: "sinchon" },
    { keys: ["용산구"],                                                                                                                          area: "yongsan" },
    { keys: ["강남구", "서초구"],                                                                                                                area: "gangnam" },
    { keys: ["광진구 화양동", "광진구 자양동", "광진구 구의동", "화양동", "자양동", "건대입구"],                                                  area: "geondae" },
    // ── 경기 (고정 카테고리) ──
    { keys: ["수원시"],                                                                                                                          area: "suwon" },
    { keys: ["오산시"],                                                                                                                          area: "osan" },
    // 동탄구 법정동 + 행정동명 기반 (화성시 안이지만 별도 카테고리)
    // 법정동: 반송·석우·청계·영천·방교·금곡·산척·장지·오산·중·목·신·송(화성시 소속)
    { keys: [
        "화성시 반송동", "화성시 석우동", "화성시 청계동", "화성시 영천동",
        "화성시 방교동", "화성시 금곡동", "화성시 산척동", "화성시 장지동",
        "화성시 오산동", "화성시 중동",   "화성시 목동",   "화성시 신동",   "화성시 송동",
        "동탄구 능동",
        "동탄1동", "동탄2동", "동탄3동", "동탄4동", "동탄5동",
        "동탄6동", "동탄7동", "동탄8동", "동탄9동", "동탄역",
      ],                                                                                                                                        area: "dongtan" },
    // 병점구 법정동 + 행정동명 기반 (별도 카테고리)
    // 법정동: 진안·기산·반정·병점·반월·황계·송산·안녕(화성시 소속)
    { keys: [
        "화성시 진안동", "화성시 기산동", "화성시 반정동", "화성시 병점동",
        "화성시 반월동", "화성시 황계동", "화성시 송산동", "화성시 안녕동",
        "병점구 능동",
        "병점1동", "병점2동", "병점역", "화산동",
      ],                                                                                                                                        area: "병점" },
    { keys: ["평택시"],                                                                                                                          area: "pyeongtaek" },
    { keys: ["천안시"],                                                                                                                          area: "cheonan" },
    // ── 광역시 ──
    { keys: ["부산광역시", "부산시", "부산"],                                                                                                    area: "busan" },
    { keys: ["대전광역시", "대전시", "대전"],                                                                                                    area: "daejeon" },
  ];

  // 경기도 시/군 → 표시명 매핑 (동탄 제외 — 별도 최우선 처리)
  // 이 목록에 없는 시도 regex로 추출한 원문 그대로 동적 지역으로 등록됨
  const GYEONGGI_CITY_MAP = {
    "파주시": "파주", "안산시": "안산", "안양시": "안양", "용인시": "용인",
    "고양시": "고양", "성남시": "성남", "부천시": "부천", "의정부시": "의정부",
    "남양주시": "남양주", "화성시": "화성", "시흥시": "시흥", "김포시": "김포",
    "광주시": "광주", "광명시": "광명", "군포시": "군포", "하남시": "하남",
    "이천시": "이천", "양주시": "양주", "구리시": "구리", "안성시": "안성",
    "포천시": "포천", "의왕시": "의왕", "여주시": "여주", "양평군": "양평",
    "가평군": "가평", "연천군": "연천", "동두천시": "동두천",
  };

  // 시도 → 대분류 region ID 매핑
  function detectRegionFromSido(sido) {
    if (!sido) return null;
    if (sido.includes("서울"))            return "seoul";
    if (sido.includes("경기") || sido.includes("인천") || sido.includes("충청")) return "gyeonggi";
    if (sido.includes("부산"))            return "busan";
    if (sido.includes("대전"))            return "daejeon";
    return null;
  }

  // 주소 → { area: 지역ID or 동네명, areaLabel: 표시명, region: 대분류ID } 반환
  // ※ 기존 ADDR_TO_AREA에 없는 신규 동네도 geocoding 응답에서 이름을 추출해 반환
  function detectAreaFromAddress(addr, addressElements) {
    const addrStr = addr ?? "";

    // ① 원본 주소(addr)만으로 알려진 지역 매핑
    //    → geocoder가 잘못된 장소를 반환해도 addressElements 오염 없음
    //    → 동탄·병점은 ADDR_TO_AREA 내 법정동/행정동명으로 정밀 매칭
    for (const { keys, area } of ADDR_TO_AREA) {
      if (keys.some(k => addrStr.includes(k))) {
        const sido = addressElements?.find(el => el.types?.includes("SIDO"))?.longName ?? "";
        const region = detectRegionFromSido(sido) ?? detectRegionFromSido(addrStr);
        return { area, areaLabel: areaLabel(area), region };
      }
    }

    // ③ 경기도/인천 주소 → 시/군 단위 추출 (동 단위보다 상위 카테고리 우선)
    if (addrStr.includes("경기") || addrStr.includes("인천")) {
      // 주소에서 "OO시" 또는 "OO군" 패턴 추출
      const siMatch = addrStr.match(/([가-힣]{2,5}시|[가-힣]{2,5}군)/);
      if (siMatch) {
        const cityFull  = siMatch[1]; // "파주시", "안산시" 등
        const cityLabel = GYEONGGI_CITY_MAP[cityFull] ?? cityFull.replace(/시$|군$/, "");
        return { area: cityLabel, areaLabel: cityLabel, region: "gyeonggi" };
      }
    }

    // ④ 알려진 지역 없음 → addressElements 기반 신규 지역 추출
    const sigungu = addressElements?.find(el => el.types?.includes("SIGUGUN"))?.longName ?? "";
    const dong    = addressElements?.find(el => el.types?.includes("DONGMYUN"))?.longName ?? "";
    const sido    = addressElements?.find(el => el.types?.includes("SIDO"))?.longName ?? "";
    const region  = detectRegionFromSido(sido);

    if (dong) {
      const label = dong.replace(/(동|읍|면|리)$/, "") || dong;
      return { area: label, areaLabel: label, region };
    }
    if (sigungu) {
      const label = sigungu.replace(/(구|군)$/, "") || sigungu;
      return { area: label, areaLabel: label, region };
    }

    return null;
  }

  // region ID → 표시명 (UI 피드백용)
  function regionLabel(regionId) {
    return REGIONS.find(r => r.id === regionId)?.label ?? regionId;
  }

  // 지역 표시 문자열 — 경기도 계열은 "경기도 > 파주" 형태로, 나머지는 그냥 areaLabel
  function formatDetectedLabel(detected) {
    if (!detected) return "";
    if (detected.region === "gyeonggi") {
      return `경기도 › ${detected.areaLabel}`;
    }
    return detected.areaLabel;
  }

  // 검색 실행 — Netlify Function 프록시를 통해 네이버 지역 검색 API 호출
  async function doSearch() {
    const q = searchInput.value.trim();
    if (!q) { resultsBox.hidden = true; return; }

    resultsBox.innerHTML = `<div class="place-result-item" style="color:var(--muted)">검색 중…</div>`;
    resultsBox.hidden = false;

    try {
      const res = await fetch(
        `https://fancy-cell-13aanaver-search-api.kdssosbell.workers.dev?query=${encodeURIComponent(q)}`
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = data.items || [];

      if (!items.length) {
        resultsBox.innerHTML = `<div class="place-result-item" style="color:var(--muted)">결과를 찾을 수 없습니다.</div>`;
        return;
      }

      resultsBox.innerHTML = "";
      items.forEach((item) => {
        const name = stripHtml(item.title);
        const road = item.roadAddress || item.address || "";
        const cat  = item.category ? `<span class="place-result-item__sub">${item.category} · ${road}</span>` : `<span class="place-result-item__sub">${road}</span>`;

        const btn = document.createElement("button");
        btn.type      = "button";
        btn.className = "place-result-item";
        btn.innerHTML = `<strong>${name}</strong>${cat}`;

        btn.addEventListener("click", () => {
          // mapx / mapy 는 WGS84 × 1e7 정수값
          const lng = parseFloat(item.mapx) / 1e7;
          const lat = parseFloat(item.mapy) / 1e7;

          // 제보 폼 자동 입력
          if (nameInput && !nameInput.value) nameInput.value = name;
          if (addrInput) addrInput.value = road;

          // 주소에서 지역 자동 감지 → 지역 텍스트 입력 + geocode UI 업데이트
          const detected    = detectAreaFromAddress(road, null);
          const areaInput   = document.getElementById("submissionArea");
          const statusEl    = document.getElementById("geocodeStatus");
          const areaAutoTag = document.getElementById("areaAutoTag");
          if (detected && areaInput) {
            areaInput.value = detected.areaLabel;
            if (areaAutoTag) areaAutoTag.hidden = false;
            if (statusEl) {
              statusEl.hidden      = false;
              statusEl.className   = "geocode-status geocode-status--ok";
              statusEl.textContent = `📍 ${detected.areaLabel} 지역으로 자동 감지됐어요. (직접 수정도 가능해요)`;
            }
          }

          // 좌표가 한국 범위이면 바로 저장, 아니면 Geocoding으로 정밀 좌표 획득
          const validKorea = lat > 33 && lat < 40 && lng > 124 && lng < 132;
          if (validKorea) {
            if (latInput) latInput.value = lat;
            if (lngInput) lngInput.value = lng;
            showMiniMap(lat, lng);
          } else if (window.naver?.maps?.Service) {
            // 좌표 변환 실패 시 Geocoder로 폴백 (도로명 주소 → WGS84)
            naver.maps.Service.geocode({ query: road }, (status, gRes) => {
              if (status === naver.maps.Service.Status.OK) {
                const addr = gRes.v2?.addresses?.[0];
                if (addr) {
                  const glat = parseFloat(addr.y);
                  const glng = parseFloat(addr.x);
                  if (latInput) latInput.value = glat;
                  if (lngInput) lngInput.value = glng;
                  showMiniMap(glat, glng);
                }
              }
            });
          }

          searchInput.value = name;
          resultsBox.hidden = true;
        });

        resultsBox.appendChild(btn);
      });
    } catch (err) {
      console.error("장소 검색 오류:", err);
      resultsBox.innerHTML = `<div class="place-result-item" style="color:var(--muted)">검색 중 오류가 발생했습니다.</div>`;
    }
  }

  // 입력 디바운스 (400ms)
  searchInput.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(doSearch, 400);
  });
  searchBtn.addEventListener("click", doSearch);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); doSearch(); }
  });

  // 외부 클릭 시 드롭다운 닫기
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".place-search-card")) resultsBox.hidden = true;
  });

  // 미니 지도 미리보기 표시 (Naver Maps 로드된 경우에만)
  function showMiniMap(lat, lng) {
    if (!window.naver?.maps) return;
    previewEl.hidden = false;
    const latlng = new naver.maps.LatLng(lat, lng);

    if (!miniMap) {
      miniMap = new naver.maps.Map(previewEl, {
        center:         latlng,
        zoom:           16,
        mapDataControl: false,
        scaleControl:   false,
        logoControlOptions: { position: naver.maps.Position.BOTTOM_LEFT },
      });
      miniMarker = new naver.maps.Marker({
        position: latlng,
        map:      miniMap,
        icon: { content: `<div class="nm-pin"></div>`, anchor: new naver.maps.Point(8, 22) },
      });
    } else {
      miniMap.setCenter(latlng);
      miniMarker.setPosition(latlng);
    }
  }

  // ── 주소 직접 입력 → 자동 Geocoding ─────────────────────────────────────
  // 사용자가 주소 필드에 직접 타이핑 후 포커스를 벗어나거나 "위치 확인" 버튼을 누르면
  // Naver Maps Geocoding API로 정밀 좌표를 가져오고, 지역을 자동 감지한다.
  const geocodeBtn  = document.getElementById("geocodeBtn");
  const statusEl    = document.getElementById("geocodeStatus");
  const areaAutoTag = document.getElementById("areaAutoTag");
  const areaInput   = document.getElementById("submissionArea"); // 이제 text input

  async function runGeocode() {
    const address = (addrInput?.value ?? "").trim();
    if (!address) return;

    // ① 로딩 상태
    if (statusEl) { statusEl.hidden = false; statusEl.className = "geocode-status geocode-status--loading"; statusEl.textContent = "주소 분석 중…"; }
    if (geocodeBtn) geocodeBtn.disabled = true;

    try {
      await new Promise((resolve) => {
        if (!window.naver?.maps?.Service) {
          if (statusEl) { statusEl.className = "geocode-status geocode-status--warn"; statusEl.textContent = "지도 서비스 준비 중이에요. 잠시 후 다시 시도해 주세요."; }
          resolve(); return;
        }

        naver.maps.Service.geocode({ query: address }, (gStatus, gRes) => {
          const addrs = gRes?.v2?.addresses;

          // ② 주소를 찾지 못한 경우
          if (gStatus === naver.maps.Service.Status.ERROR || !addrs?.length) {
            if (statusEl) { statusEl.className = "geocode-status geocode-status--warn"; statusEl.textContent = "주소를 찾지 못했어요. 지역을 직접 입력해 주세요."; }
            if (latInput) latInput.value = "";
            if (lngInput) lngInput.value = "";
            if (areaAutoTag) areaAutoTag.hidden = true;
            resolve(); return;
          }

          // ③ 좌표 저장
          const result   = addrs[0];
          const lat      = parseFloat(result.y);
          const lng      = parseFloat(result.x);
          if (latInput) latInput.value = lat;
          if (lngInput) lngInput.value = lng;
          showMiniMap(lat, lng);

          // ④ 지역 자동 감지 — 기존 알려진 지역은 매핑, 신규 지역은 동네명 추출
          // address(원본 입력값)을 사용해야 상호명이 포함된 경우 잘못된 장소로 매칭되는 버그를 피할 수 있음
          const detected = detectAreaFromAddress(address, result.addressElements);

          // region 정보도 hidden 필드에 저장 (나중에 동적 필터링에 활용)
          const regionInput = document.getElementById("coordRegion");
          if (regionInput && detected?.region) regionInput.value = detected.region;

          if (detected && areaInput) {
            areaInput.value = detected.areaLabel; // Firestore 저장값: "파주", "홍대" 등
            if (areaAutoTag) areaAutoTag.hidden = false;
            const displayLabel = formatDetectedLabel(detected); // UI용: "경기도 › 파주", "홍대" 등
            if (statusEl) { statusEl.className = "geocode-status geocode-status--ok"; statusEl.textContent = `📍 ${displayLabel} 지역으로 자동 감지됐어요. (직접 수정도 가능해요)`; }
          } else {
            // geocoding은 성공했으나 위치 정보 파싱 불가 — 매우 드문 케이스
            if (areaAutoTag) areaAutoTag.hidden = true;
            if (statusEl) { statusEl.className = "geocode-status geocode-status--warn"; statusEl.textContent = "좌표는 등록됐어요. 지역명을 직접 입력해 주세요."; }
          }

          resolve();
        });
      });
    } catch (err) {
      console.error("Geocode error:", err);
      if (statusEl) { statusEl.className = "geocode-status geocode-status--warn"; statusEl.textContent = "위치 분석 중 오류가 발생했어요. 지역을 직접 입력해 주세요."; }
      if (latInput) latInput.value = "";
      if (lngInput) lngInput.value = "";
    } finally {
      if (geocodeBtn) geocodeBtn.disabled = false;
    }
  }

  // 주소 수정 시작 → 이전 상태 초기화
  if (addrInput) {
    addrInput.addEventListener("input", () => {
      if (statusEl) statusEl.hidden = true;
      if (areaAutoTag) areaAutoTag.hidden = true;
      if (latInput) latInput.value = "";
      if (lngInput) lngInput.value = "";
    });
    // 포커스 벗어날 때 자동 실행
    addrInput.addEventListener("blur", runGeocode);
  }
  if (geocodeBtn) geocodeBtn.addEventListener("click", runGeocode);

  // ── 수정 모달의 "위치 확인" 버튼 ─────────────────────────────────────────
  const editGeocodeBtn    = document.getElementById("editGeocodeBtn");
  const editGeocodeStatus = document.getElementById("editGeocodeStatus");
  const editLatInput      = document.getElementById("editLat");
  const editLngInput      = document.getElementById("editLng");
  const editAddrInput     = document.getElementById("editAddress");
  const editAreaInput     = document.getElementById("editArea");

  if (editGeocodeBtn && editAddrInput) {
    editGeocodeBtn.addEventListener("click", async () => {
      const address = editAddrInput.value.trim();
      if (!address) return;

      editGeocodeStatus.hidden    = false;
      editGeocodeStatus.className = "geocode-status geocode-status--loading";
      editGeocodeStatus.textContent = "주소 분석 중…";
      editGeocodeBtn.disabled = true;

      try {
        await new Promise((resolve) => {
          if (!window.naver?.maps?.Service) {
            editGeocodeStatus.className   = "geocode-status geocode-status--warn";
            editGeocodeStatus.textContent = "지도 서비스 준비 중이에요. 잠시 후 다시 시도해 주세요.";
            resolve(); return;
          }
          naver.maps.Service.geocode({ query: address }, (gStatus, gRes) => {
            const addrs = gRes?.v2?.addresses;
            if (gStatus === naver.maps.Service.Status.ERROR || !addrs?.length) {
              editGeocodeStatus.className   = "geocode-status geocode-status--warn";
              editGeocodeStatus.textContent = "주소를 찾지 못했어요. 주소를 다시 확인해 주세요.";
              resolve(); return;
            }
            const result = addrs[0];
            editLatInput.value = parseFloat(result.y);
            editLngInput.value = parseFloat(result.x);
            // 지역 자동 감지 후 지역 필드에 채우기
            // address(원본 입력값)을 사용해야 상호명이 포함된 경우 잘못된 장소로 매칭되는 버그를 피할 수 있음
            const detected = detectAreaFromAddress(address, result.addressElements);
            if (detected && editAreaInput) editAreaInput.value = detected.areaLabel; // Firestore 저장값
            const displayLabel = detected ? formatDetectedLabel(detected) : null;
            const areaNote = displayLabel ? ` · 지역: ${displayLabel}` : "";
            editGeocodeStatus.className   = "geocode-status geocode-status--ok";
            editGeocodeStatus.textContent = `📍 좌표 등록 완료${areaNote} — 저장하면 지도에 정확히 표시돼요.`;
            resolve();
          });
        });
      } catch (err) {
        console.error("Edit geocode error:", err);
        editGeocodeStatus.className   = "geocode-status geocode-status--warn";
        editGeocodeStatus.textContent = "오류가 발생했어요. 다시 시도해 주세요.";
      } finally {
        editGeocodeBtn.disabled = false;
      }
    });

    // 주소 수정 시 좌표 초기화 안내
    editAddrInput.addEventListener("input", () => {
      if (editLatInput) editLatInput.value = "";
      if (editLngInput) editLngInput.value = "";
      editGeocodeStatus.hidden    = false;
      editGeocodeStatus.className = "geocode-status geocode-status--warn";
      editGeocodeStatus.textContent = "주소가 변경됐어요. '위치 확인'을 눌러 좌표를 새로 등록해 주세요.";
    });
  }
}

