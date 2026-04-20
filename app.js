// ── Firebase 설정 ──────────────────────────────────────────────────────────
// Firebase Console에서 복사한 값을 아래에 붙여넣으세요
const firebaseConfig = {
  apiKey:            "AIzaSyDXHbzcKG9hFFLTHWbwWai0nemhTNJaVOc",
  authDomain:        "otaku-map-29d8b.firebaseapp.com",
  projectId:         "otaku-map-29d8b",
  storageBucket:     "otaku-map-29d8b.firebasestorage.app",
  messagingSenderId: "227268562859",
  appId:             "1:227268562859:web:ab842e7c9e3c5763628cee",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ── 관리자 비밀번호 (SHA-256 암호화) ──────────────────────────────────────
const ADMIN_HASH = "46de2f845bde8d171642382c630150d28c844756494c77b6a24c886afb6382da";
let isAdminUnlocked = false;

// ── 카테고리 & 지역 정의 ──────────────────────────────────────────────────
const CATEGORIES = [
  { id: "kuji",   label: "제일복권" },
  { id: "figure", label: "피규어"   },
  { id: "gacha",  label: "가챠"     },
  { id: "goods",  label: "굿즈샵"   },
];

const AREAS = [
  {
    id: "hongdae",
    label: "홍대",
    defaultFocus: true,
    shapes: [{ top: "16%", left: "12%", width: "34%", height: "24%" }],
    labelPos: { top: "22%", left: "18%" },
  },
  {
    id: "hapjeong",
    label: "합정",
    shapes: [{ top: "20%", left: "56%", width: "26%", height: "24%" }],
    labelPos: { top: "28%", left: "61%" },
  },
  {
    id: "geondae",
    label: "건대",
    shapes: [{ top: "60%", left: "58%", width: "24%", height: "18%" }],
    labelPos: { top: "68%", left: "62%" },
  },
  {
    id: "sinchon",
    label: "신촌",
    shapes: [{ top: "8%", left: "42%", width: "22%", height: "18%" }],
    labelPos: { top: "10%", left: "46%" },
  },
  {
    id: "yongsan",
    label: "용산",
    shapes: [{ top: "34%", left: "36%", width: "20%", height: "16%" }],
    labelPos: { top: "38%", left: "40%" },
  },
  {
    id: "osan",
    label: "오산",
    shapes: [{ top: "74%", left: "8%", width: "18%", height: "14%" }],
    labelPos: { top: "77%", left: "11%" },
  },
  {
    id: "dongtan",
    label: "동탄",
    shapes: [{ top: "74%", left: "76%", width: "16%", height: "14%" }],
    labelPos: { top: "77%", left: "78%" },
  },
  {
    id: "pyeongtaek",
    label: "평택",
    shapes: [{ top: "86%", left: "34%", width: "22%", height: "12%" }],
    labelPos: { top: "89%", left: "38%" },
  },
];

// ── 앱 상태 ───────────────────────────────────────────────────────────────
const state = {
  activeTab:      "explore",
  activeCategory: "all",
  activeArea:     AREAS.find((a) => a.defaultFocus)?.id || AREAS[0].id,
  query:          "",
  viewMode:       "map",
  approved:       [],   // Firestore에서 실시간으로 채워짐
  pending:        [],   // Firestore에서 실시간으로 채워짐
  draftArea:      AREAS.find((a) => a.defaultFocus)?.id || AREAS[0].id,
  get draftPin()  { return getAreaPin(this.draftArea); },
};

// ── DOM 요소 참조 ─────────────────────────────────────────────────────────
const elements = {
  tabs:               [...document.querySelectorAll("[data-tab-target]")],
  panels:             [...document.querySelectorAll("[data-panel]")],
  categoryFilters:    document.querySelector("#categoryFilters"),
  areaFilters:        document.querySelector("#areaFilters"),
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
  adminModalOverlay:  document.querySelector("#adminModalOverlay"),
  adminPasswordForm:  document.querySelector("#adminPasswordForm"),
  adminPasswordInput: document.querySelector("#adminPasswordInput"),
  adminPasswordError: document.querySelector("#adminPasswordError"),
  adminModalCancel:   document.querySelector("#adminModalCancel"),
};

bootstrap();

// ── 초기화 ────────────────────────────────────────────────────────────────
function bootstrap() {
  renderCategoryFilters();
  renderAreaFilters();
  renderCategoryCheckboxes();
  renderAreaOptions();
  bindEvents();
  render();
  setupFirestoreListeners(); // Firestore 실시간 연결
}

// ── Firestore 실시간 리스너 ───────────────────────────────────────────────
function setupFirestoreListeners() {
  // 승인된 매장: 실시간 동기화
  db.collection("approved").onSnapshot((snapshot) => {
    state.approved = snapshot.docs.map((doc) => doc.data());
    renderApproved();
  }, (error) => {
    console.error("approved 리스너 오류:", error);
  });

  // 제보 대기 목록: 실시간 동기화
  db.collection("pending")
    .orderBy("submittedAt", "desc")
    .onSnapshot((snapshot) => {
      state.pending = snapshot.docs.map((doc) => doc.data());
      elements.pendingCount.textContent = String(state.pending.length);
      elements.approvedTotal.textContent = String(state.approved.length);
      renderPending();
    }, (error) => {
      console.error("pending 리스너 오류:", error);
    });
}

// ── 이벤트 바인딩 ─────────────────────────────────────────────────────────
function bindEvents() {
  // 탭 전환 (관리 탭은 비밀번호 확인)
  elements.tabs.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.tabTarget;
      if (target === "admin" && !isAdminUnlocked) {
        openAdminModal();
        return;
      }
      state.activeTab = target;
      renderPanels();
    });
  });

  // 관리자 비밀번호 모달
  elements.adminPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const matched = await verifyAdminPassword(elements.adminPasswordInput.value);
    if (matched) {
      isAdminUnlocked = true;
      closeAdminModal();
      state.activeTab = "admin";
      renderPanels();
    } else {
      elements.adminPasswordError.textContent = "비밀번호가 틀렸습니다.";
      elements.adminPasswordInput.value = "";
      elements.adminPasswordInput.focus();
    }
  });

  elements.adminPasswordInput.addEventListener("input", () => {
    elements.adminPasswordError.textContent = "";
  });

  elements.adminModalCancel.addEventListener("click", closeAdminModal);

  elements.adminModalOverlay.addEventListener("click", (e) => {
    if (e.target === elements.adminModalOverlay) closeAdminModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && elements.adminModalOverlay.classList.contains("open")) {
      closeAdminModal();
    }
  });

  // 검색
  elements.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); executeSearch(); }
  });
  elements.searchInput.addEventListener("search", () => {
    if (!elements.searchInput.value) { state.query = ""; renderApproved(); }
  });
  elements.searchButton.addEventListener("click", executeSearch);

  // 지도 ↔ 리스트 토글
  elements.toggleViewButton.addEventListener("click", () => {
    state.viewMode = state.viewMode === "map" ? "list" : "map";
    renderApproved();
  });

  // 제보 폼 지역 변경
  elements.submissionArea.addEventListener("change", (e) => {
    state.draftArea = e.target.value;
  });

  // 제보 폼 제출 → Firestore pending 컬렉션에 저장
  elements.submissionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData  = new FormData(event.currentTarget);
    const categories = formData.getAll("categories");

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
      author:      formData.get("author") || "익명 덕후",
      distance:    areaLabel(selectedArea),
      pin:         getAreaPin(selectedArea),
      submittedAt: Date.now(),
    };

    try {
      await db.collection("pending").doc(entry.id).set(entry);
      event.currentTarget.reset();
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

// ── 렌더링 함수들 ─────────────────────────────────────────────────────────
function render() {
  renderPanels();
  renderApproved();
  renderPending();
}

function renderPanels() {
  if (!isAdminUnlocked && state.activeTab === "admin") {
    state.activeTab = "explore";
  }
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
      renderApproved();
    });
    elements.categoryFilters.appendChild(btn);
  });
}

function renderAreaFilters() {
  elements.areaFilters.innerHTML = "";
  let activeBtn = null;
  AREAS.forEach((area) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const isActive = area.id === state.activeArea;
    btn.className = `chip${isActive ? " active" : ""}`;
    btn.textContent = area.label;
    btn.addEventListener("click", () => {
      state.activeArea = area.id;
      renderAreaFilters();
      renderApproved();
    });
    elements.areaFilters.appendChild(btn);
    if (isActive) activeBtn = btn;
  });
  if (activeBtn) {
    requestAnimationFrame(() => {
      activeBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  }
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
  AREAS.forEach((area) => {
    const option = document.createElement("option");
    option.value = area.id;
    option.textContent = area.label;
    if (area.id === state.draftArea) option.selected = true;
    elements.submissionArea.appendChild(option);
  });
}

function renderApproved() {
  const filtered = getFilteredApproved();
  elements.approvedList.innerHTML = "";
  elements.approvedCount.textContent  = `${filtered.length}곳`;
  elements.approvedTotal.textContent  = String(state.approved.length);
  elements.toggleViewButton.textContent = state.viewMode === "map" ? "리스트 보기" : "지도 보기";
  elements.mapStage.style.display = state.viewMode === "map" ? "block" : "none";
  elements.mapStatus.textContent = `${areaLabel(state.activeArea)} 지역 커스텀 지도에서 ${filtered.length}개 매장을 보고 있습니다.`;

  filtered.forEach((spot) => elements.approvedList.appendChild(createSpotCard(spot)));

  if (!filtered.length) {
    const empty = document.createElement("article");
    empty.className = "spot-card";
    empty.innerHTML = `
      <h3>조건에 맞는 매장이 아직 없어요</h3>
      <p class="spot-card__desc">필터를 바꾸거나 직접 제보해서 첫 매장을 추가해 보세요.</p>
    `;
    elements.approvedList.appendChild(empty);
  }

  if (state.viewMode === "map") {
    renderAreaMap(elements.mapStage, state.activeArea, filtered);
  }
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

function renderAreaMap(container, areaId, spots, draftPin = null) {
  container.innerHTML = "";
  const area = AREAS.find((a) => a.id === areaId) || AREAS[0];
  const isExploreMap = container === elements.mapStage;

  AREAS.forEach((item) => {
    if (item.id === area.id) {
      item.shapes.forEach((shape) => {
        const node = document.createElement("div");
        node.className = "district-shape";
        node.style.top    = shape.top;
        node.style.left   = shape.left;
        node.style.width  = shape.width;
        node.style.height = shape.height;
        container.appendChild(node);
      });
    }

    const isActive = item.id === area.id;
    const label = document.createElement(isExploreMap ? "button" : "div");
    label.className = `district-label${isActive ? " active" : ""}`;
    label.textContent = item.label;
    label.style.top   = item.labelPos.top;
    label.style.left  = item.labelPos.left;
    if (!isActive) label.style.opacity = "0.7";

    if (isExploreMap) {
      label.type = "button";
      label.setAttribute("aria-label", `${item.label} 지역 선택`);
      label.setAttribute("aria-pressed", isActive ? "true" : "false");
      label.addEventListener("click", (e) => {
        e.stopPropagation();
        if (state.activeArea === item.id) return;
        state.activeArea = item.id;
        renderAreaFilters();
        renderApproved();
      });
    }
    container.appendChild(label);
  });

  spots.forEach((spot) => {
    if (spot.area !== area.id || !spot.pin) return;
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = "map-pin";
    pin.style.left = `${spot.pin.x}%`;
    pin.style.top  = `${spot.pin.y}%`;
    pin.setAttribute("aria-label", `${spot.name} 위치`);
    pin.addEventListener("click", () => focusSpotCard(spot.name));
    container.appendChild(pin);
  });

  if (draftPin) {
    const pin = document.createElement("div");
    pin.className = "picker-pin";
    pin.style.left = `${draftPin.x}%`;
    pin.style.top  = `${draftPin.y}%`;
    container.appendChild(pin);
  }
}

// ── 검색 & 필터 ───────────────────────────────────────────────────────────
function getFilteredApproved() {
  return state.approved.filter((spot) => {
    const matchesArea     = spot.area === state.activeArea;
    const matchesCategory = state.activeCategory === "all" || spot.categories.includes(state.activeCategory);
    const haystack = [spot.name, areaLabel(spot.area), spot.address, spot.description].join(" ").toLowerCase();
    const matchesQuery = !state.query || haystack.includes(state.query);
    return matchesArea && matchesCategory && matchesQuery;
  });
}

function executeSearch() {
  const raw = (elements.searchInput.value || "").trim();
  if (!raw) { state.query = ""; renderApproved(); return; }

  const lower = raw.toLowerCase();
  const matchedArea = AREAS.find(
    (a) => a.label === raw || lower === a.id.toLowerCase() || raw.includes(a.label)
  );
  if (matchedArea) {
    state.activeArea = matchedArea.id;
    state.query = "";
    elements.searchInput.value = "";
    renderAreaFilters();
    renderApproved();
    return;
  }
  state.query = lower;
  renderApproved();
}

// ── 카드 생성 ─────────────────────────────────────────────────────────────
function createSpotCard(spot) {
  const f = elements.spotCardTemplate.content.cloneNode(true);
  f.querySelector("h3").textContent              = spot.name;
  f.querySelector(".spot-card__meta").textContent = `${areaLabel(spot.area)} · ${spot.address}`;
  f.querySelector(".pill").textContent            = spot.distance;
  f.querySelector(".spot-card__desc").textContent = spot.description;
  f.querySelector(".spot-card__hours").textContent = `운영 ${spot.hours}`;
  f.querySelector(".spot-card__author").textContent = `등록 ${spot.author}`;
  const tags = f.querySelector(".tag-row");
  spot.categories.forEach((id) => tags.appendChild(createTag(id)));
  return f;
}

function createPendingCard(entry) {
  const f = elements.pendingCardTemplate.content.cloneNode(true);
  f.querySelector("h3").textContent                  = entry.name;
  f.querySelector(".pending-card__meta").textContent  = `${areaLabel(entry.area)} · ${entry.address}`;
  f.querySelector(".pending-card__desc").textContent  = entry.description;
  f.querySelector(".pending-card__coords").textContent = `지역: ${areaLabel(entry.area)}`;
  const tags = f.querySelector(".tag-row");
  entry.categories.forEach((id) => tags.appendChild(createTag(id)));
  f.querySelector(".js-approve").addEventListener("click", () => approveEntry(entry.id));
  f.querySelector(".js-reject").addEventListener("click",  () => rejectEntry(entry.id));
  return f;
}

function createTag(categoryId) {
  const tag = document.createElement("span");
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  tag.className = "tag";
  tag.textContent = cat ? cat.label : categoryId;
  return tag;
}

// ── 승인 / 반려 (Firestore) ───────────────────────────────────────────────
async function approveEntry(entryId) {
  const match = state.pending.find((item) => item.id === entryId);
  if (!match) return;

  try {
    const batch = db.batch();
    batch.delete(db.collection("pending").doc(entryId));
    batch.set(db.collection("approved").doc(entryId), {
      ...match,
      distance: areaLabel(match.area),
    });
    await batch.commit();

    state.activeArea = match.area;
    state.activeTab  = "explore";
    renderAreaFilters();
    renderPanels();
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

// ── 유틸리티 ──────────────────────────────────────────────────────────────
function focusSpotCard(name) {
  const card = [...elements.approvedList.children].find(
    (node) => node.querySelector("h3")?.textContent === name
  );
  if (!card) return;
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

function createId() {
  return window.crypto?.randomUUID?.() || `spot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ── 관리자 모달 ───────────────────────────────────────────────────────────
function openAdminModal() {
  elements.adminPasswordInput.value = "";
  elements.adminPasswordError.textContent = "";
  elements.adminModalOverlay.classList.add("open");
  requestAnimationFrame(() => elements.adminPasswordInput.focus());
}

function closeAdminModal() {
  elements.adminModalOverlay.classList.remove("open");
  elements.adminPasswordInput.value = "";
  elements.adminPasswordError.textContent = "";
}

async function verifyAdminPassword(input) {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoded);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex === ADMIN_HASH;
}
