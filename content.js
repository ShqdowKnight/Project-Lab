/* vars */
let access_token = null;
let raw_user_data = null;
let user_data = null;
let klas = null;
let school_id = null;
let photo = null;
let logo = null;
let succescriteria_photo = null;
let bronnen_photo = null;
let classroom_photo = null;
let instructie_photo = null;
let voorkennis_photo = null;
/* Settings Saved */
const COLOR_SETTINGS = [
  { id: "mainColor",      cssVar: "--main-color",       label: "Main color",       fallback: "#5bd2dc" },
  { id: "ChangingColor1", cssVar: "--changing-color-1", label: "Changing color 1", fallback: "#ececec" },
  { id: "ChangingColor2", cssVar: "--changing-color-2", label: "Changing color 2", fallback: "#ffffff" }
];

COLOR_SETTINGS.forEach(({ id, cssVar }) => {
  const saved = localStorage.getItem(id);
  if (saved) document.documentElement.style.setProperty(cssVar, saved);
});

/* Functions */
async function apiFetch(url) {
  const cached = sessionStorage.getItem(url);
  if (cached) return JSON.parse(cached);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${access_token}`,
      "X-School-Id": school_id
    }
  });

  if (!res.ok) throw new Error(`API error ${res.status} on ${url}`);

  const data = await res.json();
  try {
    sessionStorage.setItem(url, JSON.stringify(data));
  } catch (e) {
    // storage full? skip the cache
  }
  return data;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString.replace(" ", "T"));

  return date.toLocaleDateString("nl-BE", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }) + " voor " + date.toLocaleTimeString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderHome() {
  const main = document.querySelector(".main-content");
  if (!main) {
    console.log("main-content not found");
    return;
  }
  main.innerHTML = ``;
}

function openDialog({ title = "", html = null, content = null, onClose = null } = {}) {
  const scrollbarCSS = `
<style>
  html { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.25) transparent; }
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.25); border-radius: 999px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.4); }
</style>`;

  const backdrop = document.createElement("div");
  backdrop.className = "dialog-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "dialog-paper";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "dialog-title");

  const titleEl = document.createElement("h2");
  titleEl.className = "dialog-title";
  titleEl.id = "dialog-title";
  titleEl.textContent = title;

  const contentEl = document.createElement("div");
  contentEl.className = "dialog-content";

  const caption = document.createElement("span");
  caption.className = "dialog-caption";
  contentEl.appendChild(caption);

  if (html !== null) {
    const iframe = document.createElement("iframe");
    iframe.title = title;
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.srcdoc = html.replace("</head>", scrollbarCSS + "</head>");
    contentEl.appendChild(iframe);
  } else if (content instanceof Node) {
    contentEl.appendChild(content);
  }

  const actions = document.createElement("div");
  actions.className = "dialog-actions";

  const closeBtn = document.createElement("button");
  closeBtn.className = "dialog-close";
  closeBtn.type = "button";
  closeBtn.textContent = "Sluiten";
  actions.appendChild(closeBtn);

  dialog.append(titleEl, contentEl, actions);
  backdrop.appendChild(dialog);
  (document.body || document.documentElement).appendChild(backdrop);

  const onKey = (e) => {
    if (e.key === "Escape") close();
  };

  function close() {
    document.removeEventListener("keydown", onKey);
    backdrop.remove();
    if (onClose) onClose();
  }

  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener("keydown", onKey);

  return { close, dialog, content: contentEl };
}

/* Settings */
function buildSettingsContent() {
  const wrap = document.createElement("div");
  wrap.className = "settings-content";

  const resetIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw preview-icon"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;

  wrap.innerHTML = `
    ${COLOR_SETTINGS.map(({ id, label, fallback }) => `
      <div class="setting">
        <label for="${id}">${label}</label>
        <div class="setting-controls">
          <input type="color" id="${id}" value="${fallback}">
          <button type="button" class="reset-btn" data-reset="${id}" aria-label="Reset ${label}" title="Reset">
            ${resetIcon}
          </button>
        </div>
      </div>
    `).join("")}

    <style>
      .setting {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .setting-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .setting input[type="color"] {
        width: 40px;
        height: 28px;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
      }
      .reset-btn {
        width: 30px;
        height: 30px;
        padding: 0;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #555;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .reset-btn:hover {
        background: rgba(0, 0, 0, 0.08);
      }
      .reset-btn:active {
        background: rgba(0, 0, 0, 0.15);
      }
    </style>
  `;

  COLOR_SETTINGS.forEach(({ id, cssVar, fallback }) => {
    const input = wrap.querySelector(`#${id}`);
    const resetBtn = wrap.querySelector(`[data-reset="${id}"]`);

    input.value = localStorage.getItem(id) || fallback;

    input.addEventListener("input", (e) => {
      document.documentElement.style.setProperty(cssVar, e.target.value);
      localStorage.setItem(id, e.target.value);
    });

    resetBtn.addEventListener("click", () => {
      localStorage.removeItem(id);
      document.documentElement.style.removeProperty(cssVar);
      input.value = fallback;
    });
  });

  return wrap;
}

function openSettingsDialog() {
  openDialog({ title: "Instellingen", content: buildSettingsContent() });
}


document.addEventListener("keydown", (e) => {
  if (e.key === "P") {
    renderHome();
  }
});

/* Logged in check */
if (!localStorage.getItem("access_token") && location.pathname !== "/login") {
  location.assign("/login");
}

/* Observer */
const excluded = ["/login", "/nsd", "/python"];

const observer = new MutationObserver(async () => {
  if (excluded.some(p => location.pathname.startsWith(p))) return;
  observer.disconnect();
  try {
    sessionStorage.clear();

    /* Consts */
    access_token = localStorage.getItem("access_token");
    raw_user_data = localStorage.getItem("user_data");
    user_data = JSON.parse(raw_user_data);
    klas = user_data.klas.split(" ")[0]; // "4D"
    school_id = localStorage.getItem("school_id");
    photo = `data:image/jpeg;base64,${user_data.foto}`;
    logo = chrome.runtime.getURL("pictures/lab_logo.png");
    succescriteria_photo = chrome.runtime.getURL("pictures/succescriteria.png");
    bronnen_photo = chrome.runtime.getURL("pictures/bronnen.png");
    classroom_photo = chrome.runtime.getURL("pictures/classroom.png");
    instructie_photo = chrome.runtime.getURL("pictures/instructie.png");
    voorkennis_photo = chrome.runtime.getURL("pictures/voorkennis.png");

    document.body.innerHTML = `
  <aside class="sidebar">
    <div class="logo-container">
      <img src="${logo}" class="logo">
    </div>
    <ul></ul>
<div class="icon-row">
  <button class="icon-btn" id="settings-btn" aria-label="Instellingen" title="Instellingen">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings preview-icon"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>
  </button>

  <button class="icon-btn" id="studiewijzer-btn" aria-label="Studiewijzer" title="Studiewijzer">
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-notepad-text preview-icon">
      <path d="M8 2v4"/>
      <path d="M12 2v4"/>
      <path d="M16 2v4"/>
      <rect width="16" height="18" x="4" y="4" rx="2"/>
      <path d="M8 10h6"/>
      <path d="M8 14h8"/>
      <path d="M8 18h5"/>
    </svg>
  </button>

  <button class="icon-btn" id="projecten-btn" aria-label="Projecten" title="Projecten">
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw-clock preview-icon">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M12 7v5l4 2"/>
    </svg>
  </button>
  <div class="quick-menu-wrapper">
    <button class="icon-btn" id="quickmenu-btn" aria-label="Snelmenu" title="Snelmenu"
            aria-haspopup="true" aria-expanded="false" aria-controls="quickmenu-popup">
      <!-- lucide "layout-grid" icon -->
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-grid preview-icon">
        <rect width="7" height="7" x="3" y="3" rx="1"/>
        <rect width="7" height="7" x="14" y="3" rx="1"/>
        <rect width="7" height="7" x="14" y="14" rx="1"/>
        <rect width="7" height="7" x="3" y="14" rx="1"/>
      </svg>
    </button>

    <div class="quick-menu-popup" id="quickmenu-popup" role="menu" hidden>
      <button class="icon-btn" id="portaal-btn" role="menuitem" aria-label="Portaal" title="Portaal">
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left-right preview-icon"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>
      </button>
      <button class="icon-btn" id="python-btn" role="menuitem" aria-label="Python" title="Python">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-code-xml preview-icon"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
      </button>
      <button class="icon-btn" id="nsd-btn" role="menuitem" aria-label="NSD-Tool" title="NSD Tool">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-network preview-icon"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>
      </button>
    </div>
  </div>
</div>
  </aside>
  <main class="main-content"></main>
`;

    const quickBtn = document.getElementById("quickmenu-btn");
    const quickPopup = document.getElementById("quickmenu-popup");

    function setQuickMenu(open) {
      quickPopup.hidden = !open;
      quickBtn.setAttribute("aria-expanded", String(open));
    }

    quickBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setQuickMenu(quickPopup.hidden);
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      if (!quickPopup.hidden && !quickPopup.contains(e.target)) {
        setQuickMenu(false);
      }
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !quickPopup.hidden) {
        setQuickMenu(false);
        quickBtn.focus();
      }
    });

    // Close after picking an item
    quickPopup.addEventListener("click", () => setQuickMenu(false));

    const actief = await apiFetch(`https://apps4lab.be/api/schooljaar/actief`);
    const projectweken = await apiFetch(`https://apps4lab.be/api/schooljaar/projectweken/${actief.data.lang}`);
    const today = new Date().toISOString().split("T")[0];
    const huidig_tijdperk = projectweken.data.find(x =>
      today >= x.startdatum &&
      today <= x.einddatum
    ) || projectweken.data
      .filter(x => x.einddatum < today)
      .sort((a, b) => b.einddatum.localeCompare(a.einddatum))[0];
    console.log(huidig_tijdperk);

    /* Button handlers */
    document.getElementById("settings-btn").addEventListener("click", openSettingsDialog);

    document.getElementById("studiewijzer-btn").addEventListener("click", async () => {
      try {
        const res = await apiFetch(
          `https://apps4lab.be/api/projecten/studiewijzer-preview?schooljaar=${actief.data.lang}&richting=${klas}&project=${huidig_tijdperk.projectnr}&projectweek_code=${huidig_tijdperk.code}&leerling_id=${user_data.user_id}`
        );
        openDialog({ title: "Studiewijzer", html: res.data.html });
      } catch (err) {
        console.error(err);
      }
    });

    document.getElementById("portaal-btn").addEventListener("click", async () => {
      try {
        window.location.href = "https://portaal.apps4lab.be/sn/leerling/dashboard";
      } catch (err) {
        console.error(err);
      }
    });

    document.getElementById("python-btn").addEventListener("click", async () => {
      try {
        location.assign("/python");
      } catch (err) {
        console.error(err);
      }
    });

    document.getElementById("nsd-btn").addEventListener("click", async () => {
      try {
        location.assign("/nsd");
      } catch (err) {
        console.error(err);
      }
    });

    /* Renders the homepage */
    renderHome();

    const deelprojecten = await apiFetch(`https://apps4lab.be/api/projecten/leerling-deelprojecten?leerling_id=${user_data.user_id}&schooljaar=${actief.data.lang}&project=${huidig_tijdperk.projectnr}`);
    let sidebarHTML = "";
    for (let i = 0; i < deelprojecten.data.length; i++) {

      let weeks = "";
      for (let weeks_to_check = 1; weeks_to_check <= huidig_tijdperk.weeknummer; weeks_to_check++) {
        weeks += `
            <li>
                <button data-week="${weeks_to_check}" data-vakacro="${deelprojecten.data[i].vakAcro}" data-richting="${deelprojecten.data[i].richting}">Week ${weeks_to_check}</button>
            </li>
        `;
      }
      sidebarHTML += `
    <li>
        <button id="${deelprojecten.data[i].vakAcro}" data-richting="${deelprojecten.data[i].richting}">
            <span class="arrow"></span>
            <span>${deelprojecten.data[i].volgnummer}. ${deelprojecten.data[i].vak_omschrijving} ${deelprojecten.data[i].richting === klas ? "" : `(${deelprojecten.data[i].richting})`}</span>
        </button>

        <ul class="submenu">
            ${weeks}
        </ul>
    </li>
`;
    }
    document.querySelector(".sidebar ul").innerHTML = sidebarHTML;

    document.querySelector(".sidebar ul").addEventListener("click", async (event) => {
      let main = null;
      let items = null;
      const button = event.target.closest("button");
      if (!button) return;

      const li = button.closest("li");
      const submenu = li.querySelector(":scope > ul");
      let taken = null;
      if (submenu) {
        submenu.classList.toggle("open");
        button.classList.toggle("open");
        taken = await apiFetch(`https://apps4lab.be/api/projecten/leerling-opdrachten?leerling_id=${user_data.user_id}&deelproject_id=${actief.data.lang}+-+${button.dataset.richting}+-+${button.id}&project=${huidig_tijdperk.projectnr}`);
        items = (taken.data?.opdrachten ?? [])
          .filter(t => t.weeknummer == huidig_tijdperk.weeknummer);
      } else {
        taken = await apiFetch(`https://apps4lab.be/api/projecten/leerling-opdrachten?leerling_id=${user_data.user_id}&deelproject_id=${actief.data.lang}+-+${button.dataset.richting}+-+${button.dataset.vakacro}&project=${huidig_tijdperk.projectnr}`);
        items = (taken.data?.opdrachten ?? [])
          .filter(t => t.weeknummer == button.dataset.week);
      }
      main = document.querySelector(".main-content");

      main.innerHTML = items.length
        ? items.map(t => {
          const labdoelen = [...(t.labdoelen ?? [])]
            .sort((a, b) => Number(a.sorteer_volgorde) - Number(b.sorteer_volgorde));

          const blocks = [];

          if (labdoelen.length) {
            blocks.push(`
          <div class="succescriteria-text __BG__">
            <img src="${succescriteria_photo}" class="succescriteria_photo"><span><b>Succescriteria:</b></span>
            <ul>
              ${labdoelen.map(l => `
                <li class="labdoel-item" style="cursor: pointer; user-select: none;">
                  <i>${escapeHTML(l.omschrijving.trim())}&nbsp;(${escapeHTML(l.lpd_code.trim())})</i>
                </li>`).join("")}
            </ul>
          </div>
        `);
          }

          if (t.voorkennis) {
            blocks.push(`
          <div class="voorkennis-text __BG__">
            <img src="${voorkennis_photo}" class="voorkennis_photo"><span><b>Voorkennis:</b></span>
            <ul>
              ${DOMPurify.sanitize(t.voorkennis, {
              ALLOWED_TAGS: [
                'b', 'i', 'strong',
                'a',
                'ul', 'ol', 'li',
                'p', 'br',
                'mark'
              ],
              ALLOWED_ATTR: ['href']
            })}
            </ul>
          </div>
        `);
          }

          if (t.instructie) {
            blocks.push(`
          <div class="instructie-text __BG__">
            <img src="${instructie_photo}" class="instructie_photo"><span><b>Instructie:</b></span>
            <ul>
              ${DOMPurify.sanitize(t.instructie, {
              ALLOWED_TAGS: [
                'b', 'i', 'strong',
                'a',
                'ul', 'ol', 'li',
                'p', 'br',
                'mark'
              ],
              ALLOWED_ATTR: ['href']
            })}
            </ul>
          </div>
        `);
          }

          if (t.bronnen && t.bronnen.length) {
            const sortedBronnen = [...t.bronnen]
              .sort((a, b) => Number(a.volgorde) - Number(b.volgorde));

            blocks.push(`
      <div class="bronnen-text __BG__">
        <img src="${bronnen_photo}" class="bronnen_photo"><span><b>Bronnen:</b></span>
        <ul>
          ${sortedBronnen.map(b => `<li><a href="${escapeHTML(b.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(b.label)}</a></li>`).join("")}
        </ul>
      </div>
    `);
          }

          if (t.inleveracties && t.inleveracties.length) {
            const sorted = [...t.inleveracties].sort((a, b) => Number(a.volgorde) - Number(b.volgorde));
            blocks.push(`
  <div class="classroom-text __BG__">
    <img src="${classroom_photo}" class="classroom_photo"><span><b>Inleveren:</b></span>
    <ul>
      ${sorted.map(a => {
              const deadlineText = a.deadline ? ` Deadline: ${escapeHTML(formatDate(a.deadline))}` : "";
              if (!a.waarde) {
                return `<li><span>Inleveren in ${escapeHTML(a.type)}.${deadlineText}</span></li>`;
              } else {
                return `<li><a href="${escapeHTML(a.waarde)}" target="_blank" rel="noopener noreferrer">Lever digitaal in ${escapeHTML(a.type)}.${deadlineText}</a></li>`;
              }
            }).join("")}
    </ul>
  </div>
`);
          }

          const coloredBlocks = blocks
            .map((html, i) => html.replace("__BG__", i % 2 === 0 ? "bg-grey" : "bg-white"))
            .join("");

          return `
      <div class="header-bar">
        <span>${escapeHTML(t.opdracht_code)}:&nbsp;&nbsp;${escapeHTML(t.titel)}&nbsp;&nbsp;&nbsp;&nbsp;(${escapeHTML(t.werktijd_label)})</span>
      </div>
      ${coloredBlocks}
    `;
        }).join("")
        : `<div class="header-bar"><span>Geen taken voor deze week</span></div>`;

      main.querySelectorAll(".labdoel-item").forEach(li => {
        li.addEventListener("click", () => {
          li.style.textDecoration = li.style.textDecoration === "line-through" ? "none" : "line-through";
        });
      });
    });

  } catch (error) {
    console.log(error);
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});
