// SHA-256("971012") — 브라우저 SubtleCrypto로 검증
const ADMIN_HASH = "46de2f845bde8d171642382c630150d28c844756494c77b6a24c886afb6382da";
let isAdminUnlocked = false;

const STORAGE_KEYS = {
  approved: "otaku-map-approved",
  pending: "otaku-map-pending",
};

const CATEGORIES = [
  { id: "kuji", label: "제일복권" },
  { id: "figure", label: "피규어" },
  { id: "gacha", label: "가챠" },
  { id: "goods", label: "굿즈샵" },
];

const AREAS = [
  {
    id: "hongdae",
    label: "홍대",
    defaultFocus: true,
    shapes: [
      { top: "16%", left: "12%", width: "34%", height: "24%" },
    ],
    labelPos: { top: "22%", left: "18%" },
  },
  {
    id: "hapjeong",
    label: "합정",
    shapes: [
      { top: "20%", left: "56%", width: "26%", height: "24%" },
    ],
    labelPos: { top: "28%", left: "61%" },
  },
  {
    id: "geondae",
    label: "건대",
    shapes: [
      { top: "60%", left: "58%", width: "24%", height: "18%" },
    ],
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

const seedApproved = [
  {
    id: createId(),
    name: "아키바샵 홍대점",
    area: "hongdae",
    address: "서울 마포구 와우산로29길 48-14",
    categories: ["kuji", "figure", "goods"],
    description: "제일복권 라인업이 자주 바뀌고 피규어 진열이 탄탄한 편",
    hours: "12:00 - 21:00",
    author: "운영팀",
    distance: "홍대",
    pin: { x: 28, y: 38 },
  },
  {
    id: createId(),
    name: "가챠스팟 합정",
    area: "hapjeong",
    address: "서울 마포구 양화로6길 57-5",
    categories: ["gacha", "goods"],
    description: "캡슐 가챠 머신 수가 많고 신상 교체가 빠른 편",
    hours: "11:30 - 22:00",
    author: "운영팀",
    distance: "합정",
    pin: { x: 67, y: 46 },
  },
  {
    id: createId(),
    name: "피규어월드 건대",
    area: "geondae",
    address: "서울 광진구 아차산로31길 9",
    categories: ["figure", "goods"],
    description: "스케일 피규어와 각종 캐릭터 굿즈를 함께 보기 좋은 곳",
    hours: "13:00 - 20:30",
    author: "운영팀",
    distance: "건대",
    pin: { x: 70, y: 74 },
  },
];

const state = {
  activeTab: "explore",
  activeCategory: "all",
  activeArea: AREAS.find((area) => area.defaultFocus)?.id || AREAS[0].id,
  query: "",
  viewMode: "map",
  approved: loadCollection(STORAGE_KEYS.approved, seedApproved),
  pending: loadCollection(STORAGE_KEYS.pending, []),
  draftArea: AREAS.find((area) => area.defaultFocus)?.id || AREAS[0].id,
  get draftPin() { return getAreaPin(this.draftArea); },
};

const elements = {
  tabs: [...document.querySelectorAll("[data-tab-target]")],
  panels: [...document.querySelectorAll("[data-panel]")],
  categoryFilters: document.querySelector("#categoryFilters"),
  areaFilters: document.querySelector("#areaFilters"),
  categoryCheckboxes: document.querySelector("#categoryCheckboxes"),
  approvedList: document.querySelector("#approvedList"),
  approvedCount: document.querySelector("#approvedCount"),
  approvedTotal: document.querySelector("#approvedTotal"),
  pendingCount: document.querySelector("#pendingCount"),
  pendingList: document.querySelector("#pendingList"),
  mapStage: document.querySelector("#mapStage"),
  mapStatus: document.querySelector("#mapStatus"),
  searchInput: document.querySelector("#searchInput"),
  toggleViewButton: document.querySelector("#toggleViewButton"),
  searchButton: document.querySelector("#searchButton"),
  submissionForm: document.querySelector("#submissionForm"),
  submissionArea: document.querySelector("#submissionArea"),
  spotCardTemplate: document.querySelector("#spotCardTemplate"),
  pendingCardTemplate: document.querySelector("#pendingCardTemplate"),
  adminModalOverlay: document.querySelector("#adminModalOverlay"),
  adminPasswordForm: document.querySelector("#adminPasswordForm"),
  adminPasswordInput: document.querySelector("#adminPasswordInput"),
  adminPasswordError: document.querySelector("#adminPasswordError"),
  adminModalCancel: document.querySelector("#adminModalCancel"),
};

bootstrap();

function bootstrap() {
  renderCategoryFilters();
  renderAreaFilters();
  renderCategoryCheckboxes();
  renderAreaOptions();
  bindEvents();
  render();
}

function bindEvents() {
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

  // 관리자 모달 이벤트
  elements.adminPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = elements.adminPasswordInput.value;
    const matched = await verifyAdminPassword(input);
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

  elements.adminModalOverlay.addEventListener("click", (event) => {
    if (event.target === elements.adminModalOverlay) closeAdminModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.adminModalOverlay.classList.contains("open")) {
      closeAdminModal();
    }
  });

  // 입력창은 Enter 키로도 검색 트리거 — 라이브 검색 없음
  elements.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      executeSearch();
    }
  });
  // 입력값을 지우면(검색창의 x 버튼 등) 결과도 원래대로 되돌림
  elements.searchInput.addEventListener("search", () => {
    if (!elements.searchInput.value) {
      state.query = "";
      renderApproved();
    }
  });

  elements.toggleViewButton.addEventListener("click", () => {
    state.viewMode = state.viewMode === "map" ? "list" : "map";
    renderApproved();
  });

  elements.searchButton.addEventListener("click", () => {
    executeSearch();
  });

  elements.submissionArea.addEventListener("change", (event) => {
    state.draftArea = event.target.value;
  });

  elements.submissionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const categories = formData.getAll("categories");

    if (!categories.length) {
      window.alert("카테고리를 하나 이상 선택해 주세요.");
      return;
    }

    const selectedArea = formData.get("area");
    const entry = {
      id: createId(),
      name: formData.get("name"),
      area: selectedArea,
      address: formData.get("address"),
      categories,
      description: formData.get("description"),
      hours: formData.get("hours") || "정보 제보 필요",
      author: formData.get("author") || "익명 덕후",
      distance: areaLabel(selectedArea),
      pin: getAreaPin(selectedArea),
    };

    state.pending = [entry, ...state.pending];
    saveCollection(STORAGE_KEYS.pending, state.pending);
    event.currentTarget.reset();
    state.draftArea = state.activeArea;
    elements.submissionArea.value = state.draftArea;
    if (isAdminUnlocked) {
      state.activeTab = "admin";
    } else {
      state.activeTab = "explore";
      window.alert("제보가 접수됐습니다! 관리자 승인 후 지도에 표시됩니다.");
    }
    render();
  });
}

function render() {
  renderPanels();
  renderApproved();
  renderPending();
}

function renderPanels() {
  if (!isAdminUnlocked && state.activeTab === "admin") {
    state.activeTab = "explore";
  }

  elements.tabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.tabTarget === state.activeTab);
  });

  elements.panels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === state.activeTab);
  });
}

function renderCategoryFilters() {
  const items = [{ id: "all", label: "전체" }, ...CATEGORIES];
  elements.categoryFilters.innerHTML = "";

  items.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${category.id === state.activeCategory ? " active" : ""}`;
    button.textContent = category.label;
    button.addEventListener("click", () => {
      state.activeCategory = category.id;
      renderCategoryFilters();
      renderApproved();
    });
    elements.categoryFilters.appendChild(button);
  });
}

function renderAreaFilters() {
  elements.areaFilters.innerHTML = "";

  let activeButton = null;

  AREAS.forEach((area) => {
    const button = document.createElement("button");
    button.type = "button";
    const isActive = area.id === state.activeArea;
    button.className = `chip${isActive ? " active" : ""}`;
    button.textContent = area.label;
    button.addEventListener("click", () => {
      state.activeArea = area.id;
      renderAreaFilters();
      renderApproved();
    });
    elements.areaFilters.appendChild(button);
    if (isActive) activeButton = button;
  });

  // 활성 지역 칩을 가로 스크롤 중앙으로 부드럽게 이동
  if (activeButton) {
    requestAnimationFrame(() => {
      activeButton.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    });
  }
}

function renderCategoryCheckboxes() {
  elements.categoryCheckboxes.innerHTML = "";

  CATEGORIES.forEach((category) => {
    const label = document.createElement("label");
    label.className = "checkbox-item";
    label.innerHTML = `
      <input type="checkbox" name="categories" value="${category.id}">
      <span>${category.label}</span>
    `;
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
  elements.approvedCount.textContent = `${filtered.length}곳`;
  elements.approvedTotal.textContent = String(state.approved.length);
  elements.toggleViewButton.textContent = state.viewMode === "map" ? "리스트 보기" : "지도 보기";
  elements.mapStage.style.display = state.viewMode === "map" ? "block" : "none";
  elements.mapStatus.textContent = `${areaLabel(state.activeArea)} 지역 커스텀 지도에서 ${filtered.length}개 매장을 보고 있습니다.`;

  filtered.forEach((spot) => {
    elements.approvedList.appendChild(createSpotCard(spot));
  });

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

  state.pending.forEach((entry) => {
    elements.pendingList.appendChild(createPendingCard(entry));
  });
}

function getAreaPin(areaId) {
  const area = AREAS.find((item) => item.id === areaId);
  if (!area) return { x: 50, y: 50 };
  return {
    x: parseFloat(area.labelPos.left),
    y: parseFloat(area.labelPos.top),
  };
}

function renderAreaMap(container, areaId, spots, draftPin = null) {
  container.innerHTML = "";
  const area = AREAS.find((item) => item.id === areaId) || AREAS[0];
  // 탐색 지도(mapStage)에서는 지역 라벨을 클릭해 활성 지역을 바꿀 수 있게 버튼으로 렌더
  const isExploreMap = container === elements.mapStage;

  AREAS.forEach((item) => {
    // 활성 지역의 shapes만 렌더링 — 비활성 지역은 레이블만 표시
    if (item.id === area.id) {
      item.shapes.forEach((shape) => {
        const shapeNode = document.createElement("div");
        shapeNode.className = "district-shape";
        shapeNode.style.top = shape.top;
        shapeNode.style.left = shape.left;
        shapeNode.style.width = shape.width;
        shapeNode.style.height = shape.height;
        container.appendChild(shapeNode);
      });
    }

    const isActive = item.id === area.id;
    const label = document.createElement(isExploreMap ? "button" : "div");
    label.className = `district-label${isActive ? " active" : ""}`;
    label.textContent = item.label;
    label.style.top = item.labelPos.top;
    label.style.left = item.labelPos.left;
    if (!isActive) {
      label.style.opacity = "0.7";
    }
    if (isExploreMap) {
      label.type = "button";
      label.setAttribute("aria-label", `${item.label} 지역 선택`);
      label.setAttribute("aria-pressed", isActive ? "true" : "false");
      label.addEventListener("click", (event) => {
        event.stopPropagation();
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
    pin.style.top = `${spot.pin.y}%`;
    pin.setAttribute("aria-label", `${spot.name} 위치`);
    pin.addEventListener("click", () => focusSpotCard(spot.name));
    container.appendChild(pin);
  });

  if (draftPin) {
    const pin = document.createElement("div");
    pin.className = "picker-pin";
    pin.style.left = `${draftPin.x}%`;
    pin.style.top = `${draftPin.y}%`;
    container.appendChild(pin);
  }

}

function getFilteredApproved() {
  return state.approved.filter((spot) => {
    const matchesArea = spot.area === state.activeArea;
    const matchesCategory =
      state.activeCategory === "all" || spot.categories.includes(state.activeCategory);
    const haystack = [spot.name, areaLabel(spot.area), spot.address, spot.description]
      .join(" ")
      .toLowerCase();
    const matchesQuery = !state.query || haystack.includes(state.query);
    return matchesArea && matchesCategory && matchesQuery;
  });
}

function executeSearch() {
  const raw = (elements.searchInput.value || "").trim();

  if (!raw) {
    state.query = "";
    renderApproved();
    return;
  }

  // 지역명이 입력되면 해당 지역으로 이동하고 입력창을 비움
  const lower = raw.toLowerCase();
  const matchedArea = AREAS.find(
    (area) =>
      area.label === raw ||
      lower === area.id.toLowerCase() ||
      raw.includes(area.label)
  );
  if (matchedArea) {
    state.activeArea = matchedArea.id;
    state.query = "";
    elements.searchInput.value = "";
    renderAreaFilters();
    renderApproved();
    return;
  }

  // 매장명 / 주소 / 설명 자유 텍스트 검색
  state.query = lower;
  renderApproved();
}

function createSpotCard(spot) {
  const fragment = elements.spotCardTemplate.content.cloneNode(true);
  fragment.querySelector("h3").textContent = spot.name;
  fragment.querySelector(".spot-card__meta").textContent = `${areaLabel(spot.area)} · ${spot.address}`;
  fragment.querySelector(".pill").textContent = spot.distance;
  fragment.querySelector(".spot-card__desc").textContent = spot.description;
  fragment.querySelector(".spot-card__hours").textContent = `운영 ${spot.hours}`;
  fragment.querySelector(".spot-card__author").textContent = `등록 ${spot.author}`;

  const tags = fragment.querySelector(".tag-row");
  spot.categories.forEach((categoryId) => tags.appendChild(createTag(categoryId)));
  return fragment;
}

function createPendingCard(entry) {
  const fragment = elements.pendingCardTemplate.content.cloneNode(true);
  fragment.querySelector("h3").textContent = entry.name;
  fragment.querySelector(".pending-card__meta").textContent = `${areaLabel(entry.area)} · ${entry.address}`;
  fragment.querySelector(".pending-card__desc").textContent = entry.description;
  fragment.querySelector(".pending-card__coords").textContent = `핀 위치 ${entry.pin.x}% / ${entry.pin.y}%`;

  const tags = fragment.querySelector(".tag-row");
  entry.categories.forEach((categoryId) => tags.appendChild(createTag(categoryId)));

  fragment.querySelector(".js-approve").addEventListener("click", () => approveEntry(entry.id));
  fragment.querySelector(".js-reject").addEventListener("click", () => rejectEntry(entry.id));
  return fragment;
}

function createTag(categoryId) {
  const tag = document.createElement("span");
  const category = CATEGORIES.find((item) => item.id === categoryId);
  tag.className = "tag";
  tag.textContent = category ? category.label : categoryId;
  return tag;
}

function approveEntry(entryId) {
  const match = state.pending.find((item) => item.id === entryId);
  if (!match) return;

  state.pending = state.pending.filter((item) => item.id !== entryId);
  state.approved = [{ ...match, distance: areaLabel(match.area) }, ...state.approved];
  saveCollection(STORAGE_KEYS.pending, state.pending);
  saveCollection(STORAGE_KEYS.approved, state.approved);
  state.activeArea = match.area;
  state.activeTab = "explore";
  renderAreaFilters();
  render();
}

function rejectEntry(entryId) {
  state.pending = state.pending.filter((item) => item.id !== entryId);
  saveCollection(STORAGE_KEYS.pending, state.pending);
  renderPending();
}

function focusSpotCard(name) {
  const card = [...elements.approvedList.children].find(
    (node) => node.querySelector("h3")?.textContent === name
  );
  if (!card) return;

  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.02)" },
      { transform: "scale(1)" },
    ],
    { duration: 450 }
  );
}

function areaLabel(areaId) {
  return AREAS.find((item) => item.id === areaId)?.label || areaId;
}

function loadCollection(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return cloneData(fallback);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return cloneData(fallback);
  }
}

function saveCollection(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `spot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// 관리자 모달 열기/닫기
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

// 비밀번호 SHA-256 해시 검증
async function verifyAdminPassword(input) {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex === ADMIN_HASH;
}
