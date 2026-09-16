/* Consts */
const access_token = localStorage.getItem("access_token");
const raw_user_data = localStorage.getItem("user_data");
const user_data = JSON.parse(raw_user_data);
const klas = user_data.klas.split(" ")[0]; // "4D"
const school_id = localStorage.getItem("school_id");
const photo = `data:image/jpeg;base64,${user_data.foto}`;
const logo = chrome.runtime.getURL("pictures/lab_logo.png");
const succescriteria_photo = chrome.runtime.getURL("pictures/succescriteria.png");
const bronnen_photo = chrome.runtime.getURL("pictures/bronnen.png");
const classroom_photo = chrome.runtime.getURL("pictures/classroom.png");
const instructie_photo = chrome.runtime.getURL("pictures/instructie.png");
const voorkennis_photo = chrome.runtime.getURL("pictures/voorkennis.png");
if (!access_token) {
  location.assign("/login");
}
/* Functions */
async function apiFetch(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${access_token}`,
      "X-School-Id": school_id
    }
  });
  if (!res.ok) throw new Error(`API error ${res.status} on ${url}`);
  return res.json();
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
/* Observer */
const observer = new MutationObserver(async () => {
  if (["/login"].includes(location.pathname)) return;
  observer.disconnect();
  try {
  document.body.innerHTML = `
  <aside class="sidebar">
    <div class="logo-container">
      <img src="${logo}" class="logo">
    </div>
    <ul></ul>
  </aside>
  <main class="main-content"></main>
  <main class="succescriteria"></main>
  <main class="voorkennis"></main>
  <main class="instructie"></main>
  <main class="bronnen"></main>
  <main class="inleveren"></main>
`;
const actief = await apiFetch(`https://apps4lab.be/api/schooljaar/actief`);
const projectweken = await apiFetch(`https://apps4lab.be/api/schooljaar/projectweken/${actief.data.lang}`)
const today = new Date().toISOString().split("T")[0];

const huidig_tijdperk = projectweken.data.find(x =>
  today >= x.startdatum &&
  today <= x.einddatum
) || projectweken.data
  .filter(x => x.einddatum < today)
  .sort((a, b) => b.einddatum.localeCompare(a.einddatum))[0];

const deelprojecten = await apiFetch(`https://apps4lab.be/api/projecten/leerling-deelprojecten?leerling_id=${user_data.user_id}&schooljaar=${actief.data.lang}&project=${huidig_tijdperk.projectnr}`);
    let sidebarHTML = "";
for (let i = 0; i < deelprojecten.data.length; i++) {
    
    let weeks = "";
    for (let weeks_to_check = 1; weeks_to_check <= huidig_tijdperk.weeknummer; weeks_to_check++) {
        weeks += `
            <li>
                <button data-week="${weeks_to_check}" data-vakAcro="${deelprojecten.data[i].vakAcro}">Week ${weeks_to_check}</button>
            </li>
        `;
    }
    sidebarHTML += `
    <li>
        <button id="${deelprojecten.data[i].vakAcro}">
            <span class="arrow"></span>
            <span>${deelprojecten.data[i].volgnummer}. ${deelprojecten.data[i].vak_omschrijving}</span>
        </button>

        <ul class="submenu">
            ${weeks}
        </ul>
    </li>
`;
}
document.querySelector(".sidebar ul").innerHTML = sidebarHTML



document.querySelector(".sidebar ul").addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const li = button.closest("li");
    const submenu = li.querySelector(":scope > ul");
    let taken = null
    if (submenu) {
        submenu.classList.toggle("open");
        button.classList.toggle("open");
        taken = await apiFetch(`https://apps4lab.be/api/projecten/leerling-opdrachten?leerling_id=${user_data.user_id}&deelproject_id=${actief.data.lang}+-+${klas}+-+${button.id}&project=${huidig_tijdperk.projectnr}`);
    } else {
      taken = await apiFetch(`https://apps4lab.be/api/projecten/leerling-opdrachten?leerling_id=${user_data.user_id}&deelproject_id=${actief.data.lang}+-+${klas}+-+${button.dataset.vakacro}&project=${huidig_tijdperk.projectnr}`);
    }
    const main = document.querySelector(".main-content");
    const items = (taken.data?.opdrachten ?? [])
        .filter(t => t.weeknummer == huidig_tijdperk.weeknummer);

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
              ${DOMPurify.sanitize(t.voorkennis, { ALLOWED_TAGS: ['b','i','a','ul','li','br'], ALLOWED_ATTR: ['href'] })}
            </ul>
          </div>
        `);
    }

    if (t.instructie) {
        blocks.push(`
          <div class="instructie-text __BG__">
            <img src="${instructie_photo}" class="instructie_photo"><span><b>Instructie:</b></span>
            <ul>
              ${DOMPurify.sanitize(t.instructie, { ALLOWED_TAGS: ['b','i','a','ul','li','br'], ALLOWED_ATTR: ['href'] })}
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
  console.log(error)
}

});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});
