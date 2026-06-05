let appData = {
    teams: [],
    notes: ""
};

let currentSortField = 'dps';
let currentSortOrder = 'desc';

const tableBody = document.getElementById('table-body');
const notesArea = document.getElementById('notes-area');
const modal = document.getElementById('team-modal');
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalSpan = document.querySelector('.close-modal');
const teamForm = document.getElementById('team-form');

const downloadBtn = document.getElementById('download-btn');
const uploadBtn = document.getElementById('upload-btn');
const uploadInput = document.getElementById('upload-input');

window.addEventListener('DOMContentLoaded', () => {
    loadLocalData();
    notesArea.oninput = (e) => {
        appData.notes = e.target.value;
        saveLocalData();
    };
    
    document.getElementById('sort-dps').onclick = () => toggleSort('dps');
    document.getElementById('sort-dps-standard').onclick = () => toggleSort('dpsStandard');
    document.getElementById('sort-dmg').onclick = () => toggleSort('dmg');
});

function loadLocalData() {
    const local = localStorage.getItem('dps_tracker_final_storage');
    if (local) {
        try {
            appData = JSON.parse(local);
            if (Array.isArray(appData.teams)) {
                appData.teams.forEach(team => {
                    if (team.dpsStandard === undefined) {
                        team.dpsStandard = 0;
                    }
                });
            }
            notesArea.value = appData.notes || "";
        } catch (e) {
            console.error(e);
        }
    }
    renderTable();
}

function saveLocalData() {
    localStorage.setItem('dps_tracker_final_storage', JSON.stringify(appData));
}

downloadBtn.onclick = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "dps_tracker_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
};

uploadBtn.onclick = () => uploadInput.click();
uploadInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const parsed = JSON.parse(event.target.result);
            if (parsed && Array.isArray(parsed.teams)) {
                parsed.teams.forEach(team => {
                    if (team.dpsStandard === undefined) {
                        team.dpsStandard = 0;
                    }
                });
                appData = parsed;
                saveLocalData();
                notesArea.value = appData.notes || "";
                renderTable();
            } else { alert("Неверная структура файла бэкапа!"); }
        } catch (err) { alert("Ошибка чтения JSON!"); }
    };
    reader.readAsText(file);
    uploadInput.value = "";
};

function toggleSort(field) {
    if (currentSortField === field) {
        currentSortOrder = currentSortOrder === 'desc' ? 'asc' : 'desc';
    } else {
        currentSortField = field;
        currentSortOrder = 'desc';
    }
    renderTable();
}

function sortTeams() {
    appData.teams.sort((a, b) => {
        let valA = a[currentSortField] || 0;
        let valB = b[currentSortField] || 0;
        return currentSortOrder === 'desc' ? valB - valA : valA - valB;
    });
}

function renderTable() {
    sortTeams();
    tableBody.innerHTML = '';

    appData.teams.forEach((team, teamIndex) => {
        const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        tdName.contentEditable = true;
        tdName.textContent = team.name;
        
        if (teamIndex === 0) {
            tdName.className = 'rank-gold';
        } else if (teamIndex === 1) {
            tdName.className = 'rank-silver';
        } else if (teamIndex === 2) {
            tdName.className = 'rank-bronze';
        }

        tdName.onblur = (e) => { team.name = e.target.textContent; saveLocalData(); };
        tdName.onkeydown = (e) => { if(e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };

        const tdMembers = document.createElement('td');
        const grid = document.createElement('div');
        grid.className = 'members-grid';

        team.members.forEach((member, memberIndex) => {
            const card = document.createElement('div');
            card.className = 'member-card';

            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'member-img-wrapper';
            
            const img = document.createElement('img');
            img.src = member.url || 'https://via.placeholder.com/48/1f2336/ffffff?text=?';
            img.onerror = () => { img.src = 'https://via.placeholder.com/48/1f2336/ffffff?text=?'; };
            imgWrapper.appendChild(img);

            const inlineEdit = document.createElement('div');
            inlineEdit.className = 'edit-img-inline';
            const inlineInput = document.createElement('input');
            inlineInput.type = 'text';
            inlineInput.value = member.url;
            inlineInput.placeholder = 'URL картинки + Enter';
            
            inlineInput.onblur = () => {
                inlineEdit.style.display = 'none';
                member.url = inlineInput.value.trim();
                img.src = member.url || 'https://via.placeholder.com/48/1f2336/ffffff?text=?';
                saveLocalData();
            };
            inlineInput.onkeydown = (e) => { if(e.key === 'Enter') inlineInput.blur(); };
            
            inlineEdit.appendChild(inlineInput);
            card.appendChild(imgWrapper);
            card.appendChild(inlineEdit);

            imgWrapper.onclick = (e) => {
                e.stopPropagation();
                document.querySelectorAll('.edit-img-inline').forEach(el => el.style.display = 'none');
                inlineEdit.style.display = 'block';
                inlineInput.focus();
            };

            const noteDiv = document.createElement('div');
            noteDiv.className = 'member-card-note';
            noteDiv.contentEditable = true;
            noteDiv.textContent = member.note || '—';
            noteDiv.onblur = (e) => {
                member.note = e.target.textContent;
                saveLocalData();
            };
            noteDiv.onkeydown = (e) => { if(e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };

            card.appendChild(noteDiv);
            grid.appendChild(card);
        });

        tdMembers.appendChild(grid);

        const tdDps = document.createElement('td');
        tdDps.contentEditable = true;
        tdDps.textContent = `${team.dps}K`;
        tdDps.onfocus = (e) => { e.target.textContent = team.dps; };
        tdDps.onblur = (e) => {
            let val = parseFloat(e.target.textContent.replace(/[^\d.]/g, ''));
            if (isNaN(val)) val = 0;
            team.dps = val;
            saveLocalData();
            renderTable();
        };
        tdDps.onkeydown = (e) => { if(e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };

        const tdDpsStandard = document.createElement('td');
        tdDpsStandard.contentEditable = true;
        tdDpsStandard.textContent = `${team.dpsStandard}K`;
        tdDpsStandard.onfocus = (e) => { e.target.textContent = team.dpsStandard; };
        tdDpsStandard.onblur = (e) => {
            let val = parseFloat(e.target.textContent.replace(/[^\d.]/g, ''));
            if (isNaN(val)) val = 0;
            team.dpsStandard = val;
            saveLocalData();
            renderTable();
        };
        tdDpsStandard.onkeydown = (e) => { if(e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };

        const tdDmg = document.createElement('td');
        tdDmg.contentEditable = true;
        tdDmg.textContent = `${team.dmg}M`;
        tdDmg.onfocus = (e) => { e.target.textContent = team.dmg; };
        tdDmg.onblur = (e) => {
            let val = parseFloat(e.target.textContent.replace(/[^\d.]/g, ''));
            if (isNaN(val)) val = 0;
            team.dmg = val;
            saveLocalData();
            renderTable();
        };
        tdDmg.onkeydown = (e) => { if(e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };

        const tdActions = document.createElement('td');
        tdActions.style.textAlign = 'center';
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.innerHTML = '<span class="material-icons">delete</span>';
        deleteBtn.onclick = () => {
            if(confirm("Подтвердить удаление? Да/Нет")) {
                appData.teams.splice(teamIndex, 1);
                saveLocalData();
                renderTable();
            }
        };
        tdActions.appendChild(deleteBtn);

        tr.appendChild(tdName);
        tr.appendChild(tdMembers);
        tr.appendChild(tdDps);
        tr.appendChild(tdDpsStandard);
        tr.appendChild(tdDmg);
        tr.appendChild(tdActions);
        tableBody.appendChild(tr);
    });
}

document.addEventListener('click', () => {
    document.querySelectorAll('.edit-img-inline').forEach(el => el.style.display = 'none');
});

openModalBtn.onclick = () => modal.style.display = "flex";
closeModalSpan.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

teamForm.onsubmit = (e) => {
    e.preventDefault();
};

const submitBtn = document.querySelector('.btn-block');
if (submitBtn) {
    submitBtn.onclick = function(e) {
        e.preventDefault();
        
        const urls = document.querySelectorAll('.m-url');
        const notes = document.querySelectorAll('.m-note');
        
        const membersArray = [];
        for (let i = 0; i < 4; i++) {
            const urlValue = urls[i] ? urls[i].value.trim() : "";
            const noteValue = notes[i] ? notes[i].value.trim() : "";
            membersArray.push({ url: urlValue, note: noteValue });
        }

        const nameInput = document.getElementById('team-name');
        const dpsInput = document.getElementById('team-dps');
        const dpsStandardInput = document.getElementById('team-dps-standard');
        const dmgInput = document.getElementById('team-dmg');

        if (!nameInput || !nameInput.value.trim()) {
            alert("Пожалуйста, введите название команды!");
            return;
        }
        if (!dpsInput || dpsInput.value === "") {
            alert("Пожалуйста, заполните поле DPS!");
            return;
        }
        if (!dpsStandardInput || dpsStandardInput.value === "") {
            alert("Пожалуйста, заполните поле DPS Standard!");
            return;
        }
        if (!dmgInput || dmgInput.value === "") {
            alert("Пожалуйста, заполните поле Total DMG!");
            return;
        }

        const dpsValue = Number(dpsInput.value.replace(/[^\d.]/g, '')) || 0;
        const dpsStandardValue = Number(dpsStandardInput.value.replace(/[^\d.]/g, '')) || 0;
        const dmgValue = Number(dmgInput.value.replace(/[^\d.]/g, '')) || 0;

        const newTeam = {
            name: nameInput.value.trim(),
            members: membersArray,
            dps: dpsValue,
            dpsStandard: dpsStandardValue,
            dmg: dmgValue
        };

        appData.teams.push(newTeam);
        saveLocalData();
        renderTable();
        
        teamForm.reset();
        modal.style.display = "none";
    };
}
