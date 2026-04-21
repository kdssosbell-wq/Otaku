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
const db = firebase.firestore();

// ── 관리자 비밀번호 (SHA-256 암호화) ──────────────────────────────────────
const ADMIN_HASH = "46de2f845bde8d171642382c630150d28c844756494c77b6a24c886afb6382da";
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
    id: "geondae", label: "건대",
    shapes: [{ top: "60%", left: "58%", width: "24%", height: "18%" }],
    labelPos: { top: "68%", left: "62%" },
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
];

// ── 앱 상태 ───────────────────────────────────────────────────────────────
const state = {
  activeTab:      "explore",
  activeCategory: "all",
  activeArea:     AREAS.find((a) => a.defaultFocus)?.id || AREAS[0].id,
  query:          "",
  viewMode:       "map",
  approved:       [],
  pending:        [],
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
  // 관리자 비밀번호 모달
  adminModalOverlay:  document.querySelector("#adminModalOverlay"),
  adminPasswordForm:  document.querySelector("#adminPasswordForm"),
  adminPasswordInput: document.querySelector("#adminPasswordInput"),
  adminPasswordError: document.querySelector("#adminPasswordError"),
  adminModalCancel:   document.querySelector("#adminModalCancel"),
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
  approvedAdminList:  document.querySelector("#approvedAdminList"),
};

bootstrap();

// ── 초기화 ────────────────────────────────────────────────────────────────
function bootstrap() {
  renderCategoryFilters();
  renderAreaFilters();
  renderCategoryCheckboxes();
  renderAreaOptions();
  populateEditAreaOptions();
  populateEditCategoryCheckboxes();
  bindEvents();
  render();
  setupFirestoreListeners();
}

// ── Firestore 실시간 리스너 ───────────────────────────────────────────────
function setupFirestoreListeners() {
  db.collection("approved").onSnapshot((snapshot) => {
    state.approved = snapshot.docs.map((doc) => doc.data());
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
      if (target === "admin" && !isAdminUnlocked) { openAdminModal(); return; }
      state.activeTab = target;
      renderPanels();
    });
  });

  // ── 관리자 비밀번호 모달 ──
  elements.adminPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
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
    if (e.key === "Escape") {
      if (elements.adminModalOverlay.classList.contains("open")) closeAdminModal();
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

  // ── 검색 ──
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

  // ── 제보 폼 제출 ──
  elements.submissionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form       = event.currentTarget;
    const formData   = new FormData(form);
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
  elements.toggleViewButton.textContent = state.viewMode === "map" ? "리스트 보기" : "지도 보기";
  elements.mapStage.style.display     = state.viewMode === "map" ? "block" : "none";
  elements.mapStatus.textContent      = `${areaLabel(state.activeArea)} 지역 커스텀 지도에서 ${filtered.length}개 매장을 보고 있습니다.`;

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

  if (state.viewMode === "map") renderAreaMap(elements.mapStage, state.activeArea, filtered);
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
        node.style.top = shape.top; node.style.left = shape.left;
        node.style.width = shape.width; node.style.height = shape.height;
        container.appendChild(node);
      });
    }

    const isActive = item.id === area.id;
    const label = document.createElement(isExploreMap ? "button" : "div");
    label.className = `district-label${isActive ? " active" : ""}`;
    label.textContent = item.label;
    label.style.top = item.labelPos.top;
    label.style.left = item.labelPos.left;
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
    pin.type = "button"; pin.className = "map-pin";
    pin.style.left = `${spot.pin.x}%`; pin.style.top = `${spot.pin.y}%`;
    pin.setAttribute("aria-label", `${spot.name} 위치`);
    pin.addEventListener("click", () => focusSpotCard(spot.name));
    container.appendChild(pin);
  });

  if (draftPin) {
    const pin = document.createElement("div");
    pin.className = "picker-pin";
    pin.style.left = `${draftPin.x}%`; pin.style.top = `${draftPin.y}%`;
    container.appendChild(pin);
  }
}

// ── 카드 생성 ─────────────────────────────────────────────────────────────
function createSpotCard(spot) {
  const f = elements.spotCardTemplate.content.cloneNode(true);
  f.querySelector("h3").textContent               = spot.name;
  f.querySelector(".spot-card__meta").textContent  = spot.address;
  f.querySelector(".spot-card__desc").textContent  = spot.description;
  f.querySelector(".spot-card__hours").textContent = `운영 ${spot.hours}`;
  f.querySelector(".spot-card__author").innerHTML  = `<span class="author-badge">👤 ${spot.author}</span>`;

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
    const handle = raw.startsWith("http")
      ? raw.replace(/.*instagram\.com\/([^/?#]+).*/, "$1")
      : raw.replace(/^@/, "");
    const url = raw.startsWith("http") ? raw : `https://www.instagram.com/${handle}`;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "spot-card__extra-item sns-link";
    a.innerHTML = `<img src="instargram.svg" class="sns-icon" alt="Instagram"><span class="sns-handle">@${handle}</span>`;
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

  // 지역 순으로 정렬
  const sorted = [...state.approved].sort((a, b) =>
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
  // 어느 컬렉션 대상인지 저장
  elements.editCollection.value  = collection;

  // 기존 데이터 채우기
  elements.editEntryId.value    = entry.id;
  elements.editName.value       = entry.name;
  elements.editArea.value       = entry.area;
  elements.editAddress.value    = entry.address;
  elements.editDescription.value = entry.description;
  elements.editHours.value      = entry.hours || "";
  elements.editSns.value        = entry.sns   || "";
  elements.editPhone.value      = entry.phone || "";

  // 카테고리 체크박스
  elements.editCategoryCheckboxes.querySelectorAll("input").forEach((cb) => {
    cb.checked = (entry.categories || []).includes(cb.value);
  });

  // 휴무일 체크박스
  document.querySelectorAll("#editClosedDays input").forEach((cb) => {
    cb.checked = (entry.closedDays || []).includes(cb.value);
  });

  // 주차 라디오
  document.querySelectorAll("#editParking input[type=radio]").forEach((rb) => {
    rb.checked = rb.value === (entry.parking || "");
  });

  // 모달 제목 구분
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

// ── 관리자 비밀번호 모달 ──────────────────────────────────────────────────
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
