/**
 * SSV 1928 Sulzbach e.V. - Wettkampf-Details & Starterverwaltung
 * Logik für wettkampf.html
 */

(function () {
    'use strict';

    let currentCompetition = null;
    let compTeams = [];
    let compStarts = [];
    let allParticipantsCache = [];
    let startsByTeamId = {};

    document.addEventListener('DOMContentLoaded', () => {
        initApp();
    });

    function initApp() {
        if (!window.supabaseClient) {
            console.error('Supabase Client nicht verfügbar.');
            window.AppUtils.showNotification('Supabase-Client konnte nicht geladen werden.', 'error');
            return;
        }

        const compId = window.AppUtils.getUrlParam('id');
        if (!compId) {
            alert('Keine Wettkampf-ID angegeben.');
            window.location.href = 'wettkaempfe.html';
            return;
        }

        // Quick Links aktualisieren
        const quickEntry = document.getElementById('btn-quick-entry');
        const quickRanking = document.getElementById('btn-quick-ranking');
        const quickLiveQr = document.getElementById('btn-quick-live-qr');
        if (quickEntry) quickEntry.href = `ergebnisse-eingabe.html?competition_id=${compId}`;
        if (quickRanking) quickRanking.href = `ergebnisse.html?competition_id=${compId}`;
        if (quickLiveQr) quickLiveQr.href = `qrcode.html?competition_id=${compId}`;

        // Event-Listener: Team anlegen
        const formAddTeam = document.getElementById('form-add-team');
        if (formAddTeam) formAddTeam.addEventListener('submit', handleAddTeam);

        // Event-Listener: Teilnehmer-Suche
        const searchInput = document.getElementById('search-participant-input');
        if (searchInput) {
            // Beim Tippen filtern
            searchInput.addEventListener('input', window.AppUtils.debounce(handleParticipantSearch, 100));

            // Beim Hineinklicken oder Fokussieren SOFORT die letzten Teilnehmer anzeigen
            searchInput.addEventListener('focus', () => {
                handleParticipantSearch();
            });

            searchInput.addEventListener('click', () => {
                handleParticipantSearch();
            });

            // Escape schließt die Liste
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const resultsList = document.getElementById('participant-search-results');
                    if (resultsList) resultsList.style.display = 'none';
                }
            });
        }

        // Klick außerhalb schließt Suchergebnisse
        document.addEventListener('click', (e) => {
            const searchWrapper = document.querySelector('.search-wrapper');
            const resultsList = document.getElementById('participant-search-results');
            if (searchWrapper && !searchWrapper.contains(e.target) && resultsList) {
                resultsList.style.display = 'none';
            }
        });

        // Abwählen-Button
        const btnDeselect = document.getElementById('btn-deselect-participant');
        if (btnDeselect) btnDeselect.addEventListener('click', deselectParticipant);

        // Event-Listener: Start anlegen
        const formAddStart = document.getElementById('form-add-start');
        if (formAddStart) formAddStart.addEventListener('submit', handleAddStart);

        // Starterliste filtern
        const filterStarts = document.getElementById('filter-starts-input');
        if (filterStarts) {
            filterStarts.addEventListener('input', window.AppUtils.debounce(handleFilterStarts, 150));
        }

        // Daten initial laden
        loadCompetitionData(compId);
    }

    /**
     * Lädt den Wettkampf, Teams, Starts und Results
     */
    async function loadCompetitionData(compId) {
        try {
            // 1. Wettkampf laden
            const { data: comp, error: compErr } = await window.supabaseClient
                .from('competitions')
                .select('*')
                .eq('id', compId)
                .single();

            if (compErr || !comp) {
                console.error('Fehler beim Laden des Wettkampfs:', compErr);
                document.getElementById('comp-title-display').textContent = 'Wettkampf nicht gefunden';
                window.AppUtils.showNotification('❌ Wettkampf nicht gefunden.', 'error');
                return;
            }

            currentCompetition = comp;
            renderCompetitionHeader(comp);

            // 2. Teams, Starts, Teilnehmer und Results parallel laden
            await refreshTeamsAndStarts();

        } catch (err) {
            console.error('Unerwarteter Fehler:', err);
            window.AppUtils.showNotification(`❌ Unerwarteter Fehler: ${err.message}`, 'error');
        }
    }

    /**
     * Rendert die Kopfdaten des Wettkampfs
     */
    function renderCompetitionHeader(comp) {
        document.getElementById('comp-title-display').textContent = comp.name;

        const statusBadge = comp.status === 'laufend' ? '<span class="badge badge-status-laufend">Laufend</span>' :
                            comp.status === 'abgeschlossen' ? '<span class="badge badge-status-abgeschlossen">Beendet</span>' :
                            '<span class="badge badge-status-geplant">Geplant</span>';

        document.getElementById('comp-meta-display').innerHTML = `
            📅 <strong>Datum:</strong> ${window.AppUtils.formatDate(comp.datum)} &bull; 
            📊 <strong>Modus:</strong> ${comp.anzahl_ergebnisse} Ergebnisse &bull; 
            👥 <strong>Teamgröße:</strong> max. ${comp.teamgroesse} Starter &bull; 
            <strong>Status:</strong> ${statusBadge}
        `;
    }

    /**
     * Lädt Teams, Starts, Teilnehmer (neueste zuerst) und Results neu
     */
    async function refreshTeamsAndStarts() {
        if (!currentCompetition) return;

        const compId = currentCompetition.id;

        try {
            // Teilnehmer nach created_at absteigend laden -> Neueste zuerst!
            const [teamsRes, startsRes, participantsRes, resultsRes] = await Promise.all([
                window.supabaseClient
                    .from('teams')
                    .select('*')
                    .eq('competition_id', compId)
                    .order('name', { ascending: true }),
                window.supabaseClient
                    .from('starts')
                    .select('*')
                    .eq('competition_id', compId)
                    .order('created_at', { ascending: true }),
                window.supabaseClient
                    .from('participants')
                    .select('*')
                    .order('created_at', { ascending: false }),
                window.supabaseClient
                    .from('results')
                    .select('*')
            ]);

            compTeams = teamsRes.data || [];
            compStarts = startsRes.data || [];
            allParticipantsCache = participantsRes.data || [];
            const allResults = resultsRes.data || [];

            // Sortierung absichern: Neueste Teilnehmer (höchste ID / neuestes Datum) immer oben
            allParticipantsCache.sort((a, b) => {
                if (a.created_at && b.created_at) {
                    const diff = new Date(b.created_at) - new Date(a.created_at);
                    if (diff !== 0) return diff;
                }
                return (Number(b.id) || 0) - (Number(a.id) || 0);
            });

            // Map Results to Starts
            const resultsByStartId = {};
            allResults.forEach(r => {
                if (!resultsByStartId[r.start_id]) {
                    resultsByStartId[r.start_id] = [];
                }
                resultsByStartId[r.start_id].push(r);
            });

            // Map Participants
            const participantMap = {};
            allParticipantsCache.forEach(p => {
                participantMap[p.id] = p;
            });

            // Map Teams
            const teamMap = {};
            startsByTeamId = {};
            compTeams.forEach(t => {
                teamMap[t.id] = t;
                startsByTeamId[t.id] = 0;
            });

            // Erweitere Starts-Objekte
            compStarts.forEach(s => {
                s.participant = participantMap[s.participant_id] || { vorname: 'Unbekannt', nachname: '#' + s.participant_id };
                s.team = s.team_id ? (teamMap[s.team_id] || { name: 'Unbekannt' }) : null;
                s.results = (resultsByStartId[s.id] || []).sort((a, b) => a.nummer - b.nummer);
                
                if (s.team_id && startsByTeamId[s.team_id] !== undefined) {
                    startsByTeamId[s.team_id]++;
                }
            });

            // Rendere Bereiche
            renderTeamsList();
            populateTeamSelect();
            renderStartsTable(compStarts);

        } catch (err) {
            console.error('Fehler beim Aktualisieren der Teams/Starts:', err);
        }
    }

    /**
     * Rendert die Teamliste
     */
    function renderTeamsList() {
        const container = document.getElementById('teams-list-container');
        const badge = document.getElementById('teams-count-badge');
        if (badge) badge.textContent = `${compTeams.length} Team${compTeams.length !== 1 ? 's' : ''}`;

        if (!compTeams || compTeams.length === 0) {
            container.innerHTML = `<div class="empty-state" style="padding: 1.5rem 0;"><p>Noch keine Teams angelegt.</p></div>`;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Teamname</th>
                            <th>Belegung</th>
                            <th style="text-align: right;">Aktion</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        compTeams.forEach(t => {
            const count = startsByTeamId[t.id] || 0;
            const max = currentCompetition.teamgroesse;
            const isFull = count >= max;
            const capBadge = isFull 
                ? `<span class="badge badge-status-laufend" style="background: #fee2e2; color: #b91c1c;">Voll (${count}/${max})</span>`
                : `<span class="badge badge-team">${count} / ${max} Starter</span>`;

            html += `
                <tr>
                    <td><strong>${window.AppUtils.escapeHtml(t.name)}</strong></td>
                    <td>${capBadge}</td>
                    <td style="text-align: right;">
                        <button type="button" class="btn btn-sm btn-outline btn-delete-team" data-id="${t.id}" data-name="${window.AppUtils.escapeHtml(t.name)}" data-count="${count}">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        container.querySelectorAll('.btn-delete-team').forEach(btn => {
            btn.addEventListener('click', () => {
                handleDeleteTeam(btn.dataset.id, btn.dataset.name, parseInt(btn.dataset.count, 10));
            });
        });
    }

    /**
     * Füllt das Team-Dropdown für das Hinzufügen von Startern
     */
    function populateTeamSelect() {
        const select = document.getElementById('select-start-team');
        if (!select) return;

        let html = `<option value="">Einzelstart (kein Team)</option>`;

        compTeams.forEach(t => {
            const count = startsByTeamId[t.id] || 0;
            const max = currentCompetition.teamgroesse;
            const isFull = count >= max;

            if (isFull) {
                html += `<option value="${t.id}" disabled>${window.AppUtils.escapeHtml(t.name)} (VOLL – ${count}/${max})</option>`;
            } else {
                html += `<option value="${t.id}">${window.AppUtils.escapeHtml(t.name)} (${count}/${max} belegt)</option>`;
            }
        });

        select.innerHTML = html;
    }

    /**
     * Neues Team anlegen
     */
    async function handleAddTeam(e) {
        e.preventDefault();

        const input = document.getElementById('team-name');
        const submitBtn = document.getElementById('btn-save-team');
        const name = (input.value || '').trim();

        if (!name) return;

        submitBtn.disabled = true;

        try {
            const { error } = await window.supabaseClient
                .from('teams')
                .insert([{
                    competition_id: currentCompetition.id,
                    name: name
                }]);

            if (error) {
                console.error('Fehler beim Anlegen des Teams:', error);
                window.AppUtils.showNotification(`❌ Fehler beim Team-Anlegen: ${error.message}`, 'error');
                return;
            }

            window.AppUtils.showNotification(`Team "${name}" erfolgreich angelegt!`, 'success');
            input.value = '';
            await refreshTeamsAndStarts();

        } catch (err) {
            console.error('Unerwarteter Fehler:', err);
            window.AppUtils.showNotification(`❌ Fehler: ${err.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
        }
    }

    /**
     * Team löschen
     */
    async function handleDeleteTeam(teamId, teamName, count) {
        let msg = `Möchtest du das Team "${teamName}" wirklich löschen?`;
        if (count > 0) {
            msg += `\n\nACHTUNG: Diesem Team sind aktuell ${count} Start(s) zugeordnet. Diese Starts werden auf Einzelstart umgestellt!`;
        }

        if (!confirm(msg)) return;

        try {
            if (count > 0) {
                await window.supabaseClient
                    .from('starts')
                    .update({ team_id: null })
                    .eq('team_id', teamId);
            }

            const { error } = await window.supabaseClient
                .from('teams')
                .delete()
                .eq('id', teamId);

            if (error) {
                console.error('Fehler beim Löschen des Teams:', error);
                window.AppUtils.showNotification(`❌ Fehler beim Löschen: ${error.message}`, 'error');
                return;
            }

            window.AppUtils.showNotification(`Team "${teamName}" wurde gelöscht.`, 'info');
            await refreshTeamsAndStarts();

        } catch (err) {
            console.error('Unerwarteter Fehler:', err);
            window.AppUtils.showNotification(`❌ Fehler: ${err.message}`, 'error');
        }
    }

    /**
     * Teilnehmer-Suche & Sofort-Vorschau beim Hineinklicken
     * WICHTIG: Die zuletzt angelegten Teilnehmer erscheinen sofort ganz oben!
     */
    async function handleParticipantSearch() {
        const input = document.getElementById('search-participant-input');
        const resultsList = document.getElementById('participant-search-results');
        if (!input || !resultsList) return;

        const query = (input.value || '').trim().toLowerCase();

        // Falls Cache leer ist, frisch aus Supabase laden (neueste zuerst)
        if (allParticipantsCache.length === 0) {
            try {
                const { data } = await window.supabaseClient
                    .from('participants')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (data) {
                    allParticipantsCache = data;
                }
            } catch (err) {
                console.error('Fehler beim Laden der Teilnehmer:', err);
            }
        }

        // Ausgangsbasis: Neueste Teilnehmer zuerst sortieren!
        let matches = [...allParticipantsCache].sort((a, b) => {
            if (a.created_at && b.created_at) {
                const diff = new Date(b.created_at) - new Date(a.created_at);
                if (diff !== 0) return diff;
            }
            return (Number(b.id) || 0) - (Number(a.id) || 0);
        });

        // Wenn Suchbegriff eingegeben wurde, filtern
        if (query) {
            matches = matches.filter(p => {
                const firstName = (p.vorname || '').toLowerCase();
                const lastName = (p.nachname || '').toLowerCase();
                const fullName = `${firstName} ${lastName}`;
                const reverseName = `${lastName} ${firstName}`;
                return firstName.includes(query) || lastName.includes(query) || fullName.includes(query) || reverseName.includes(query);
            });
        }

        if (matches.length === 0) {
            resultsList.innerHTML = `
                <li class="search-empty">
                    Kein Teilnehmer für "${window.AppUtils.escapeHtml(query)}" gefunden.
                    <div style="margin-top: 0.5rem;">
                        <a href="teilnehmer.html" class="btn btn-sm btn-outline">+ Neuen Teilnehmer anlegen</a>
                    </div>
                </li>
            `;
            resultsList.style.display = 'block';
            return;
        }

        // Header anzeigen: Zuletzt angelegt vs. Suchergebnisse
        let headerText = query 
            ? `🔍 Gefundene Teilnehmer (${matches.length})` 
            : `🕒 Zuletzt angelegte Teilnehmer (${matches.length})`;

        let html = `
            <li class="search-dropdown-header">
                <span>${headerText}</span>
                <span style="font-size: 0.72rem; opacity: 0.8; font-weight: normal;">Klicken zum Auswählen</span>
            </li>
        `;

        // Bis zu 25 Teilnehmer anzeigen (scrollbar)
        matches.slice(0, 25).forEach((p, idx) => {
            const existingStartsCount = compStarts.filter(s => String(s.participant_id) === String(p.id)).length;
            let startHint = existingStartsCount === 0 
                ? 'Noch kein Start im Wettkampf' 
                : `${existingStartsCount} Start${existingStartsCount > 1 ? 's' : ''} im Wettkampf`;

            // Neu-Badge für die zuletzt angelegten
            const isNewest = (!query && idx === 0);
            const badgeHtml = isNewest 
                ? `<span class="badge badge-ak" style="font-size: 0.7rem; margin-left: 6px;">Zuletzt angelegt</span>`
                : '';

            html += `
                <li class="search-results-item" data-id="${window.AppUtils.escapeHtml(String(p.id))}" data-name="${window.AppUtils.escapeHtml((p.vorname || '') + ' ' + (p.nachname || ''))}">
                    <div>
                        <div style="font-weight: 700; color: var(--text-main); font-size: 0.98rem;">
                            ${window.AppUtils.escapeHtml(p.nachname || '')}, ${window.AppUtils.escapeHtml(p.vorname || '')}
                            ${badgeHtml}
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                            ${startHint}
                        </div>
                    </div>
                    <span class="btn btn-sm btn-primary" style="pointer-events: none;">
                        Auswählen ✓
                    </span>
                </li>
            `;
        });

        resultsList.innerHTML = html;
        resultsList.style.display = 'block';

        // mousedown und touchstart verwenden, damit kein blur-Event dazwischenfunkt
        resultsList.querySelectorAll('.search-results-item').forEach(item => {
            const onSelect = (e) => {
                e.preventDefault();
                e.stopPropagation();
                selectParticipant(item.dataset.id, item.dataset.name);
            };

            item.addEventListener('mousedown', onSelect);
            item.addEventListener('touchstart', onSelect);
        });
    }

    /**
     * Teilnehmer für Start auswählen
     */
    function selectParticipant(id, name) {
        document.getElementById('selected-participant-id').value = id;
        document.getElementById('selected-participant-name').textContent = name;

        // Prüfe bisherige Starts in diesem Wettkampf
        const prevStarts = compStarts.filter(s => String(s.participant_id) === String(id));
        let infoText = 'Bereit für Zuweisung';
        if (prevStarts.length > 0) {
            infoText = `Teilnehmer hat bereits ${prevStarts.length} Start(s) in diesem Wettkampf (Mehrfachstart möglich)`;
        }
        document.getElementById('selected-participant-info').textContent = infoText;

        document.getElementById('selected-participant-card').style.display = 'flex';
        
        const resultsList = document.getElementById('participant-search-results');
        if (resultsList) resultsList.style.display = 'none';

        const searchInput = document.getElementById('search-participant-input');
        if (searchInput) searchInput.value = '';

        document.getElementById('btn-save-start').disabled = false;
    }

    /**
     * Teilnehmer-Auswahl zurücksetzen
     */
    function deselectParticipant() {
        document.getElementById('selected-participant-id').value = '';
        document.getElementById('selected-participant-name').textContent = '–';
        document.getElementById('selected-participant-card').style.display = 'none';
        document.getElementById('btn-save-start').disabled = true;

        const searchInput = document.getElementById('search-participant-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
    }

    /**
     * Neuen Start hinzufügen (Mehrfachstarts erlaubt)
     */
    async function handleAddStart(e) {
        e.preventDefault();

        const participantId = document.getElementById('selected-participant-id').value;
        const teamSelect = document.getElementById('select-start-team');
        const akCheckbox = document.getElementById('check-ak');
        const submitBtn = document.getElementById('btn-save-start');

        if (!participantId) {
            window.AppUtils.showNotification('Bitte wähle zuerst einen Teilnehmer aus.', 'warning');
            return;
        }

        const teamId = teamSelect.value ? teamSelect.value : null;
        const ak = akCheckbox.checked;

        // Prüfe Teamgröße
        if (teamId) {
            const currentTeamCount = startsByTeamId[teamId] || 0;
            if (currentTeamCount >= currentCompetition.teamgroesse) {
                const teamObj = compTeams.find(t => t.id === teamId);
                const teamName = teamObj ? teamObj.name : 'Dieses Team';
                window.AppUtils.showNotification(`❌ ${teamName} ist mit ${currentCompetition.teamgroesse} Startern bereits voll!`, 'error');
                return;
            }
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Füge hinzu...';

        try {
            const { data, error } = await window.supabaseClient
                .from('starts')
                .insert([{
                    competition_id: currentCompetition.id,
                    participant_id: participantId,
                    team_id: teamId,
                    ak: ak
                }])
                .select();

            if (error) {
                console.error('Fehler beim Hinzufügen des Starts:', error);
                window.AppUtils.showNotification(`❌ Fehler beim Start-Hinzufügen: ${error.message}`, 'error');
                return;
            }

            const pName = document.getElementById('selected-participant-name').textContent;
            window.AppUtils.showNotification(`Start für "${pName}" erfolgreich hinzugefügt!`, 'success');

            // Reset
            deselectParticipant();
            akCheckbox.checked = false;
            teamSelect.value = '';

            await refreshTeamsAndStarts();

        } catch (err) {
            console.error('Unerwarteter Fehler beim Hinzufügen des Starts:', err);
            window.AppUtils.showNotification(`❌ Fehler: ${err.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '➕ Start zum Wettkampf hinzufügen';
        }
    }

    /**
     * Starterliste rendern
     */
    function renderStartsTable(starts) {
        const container = document.getElementById('starts-table-container');
        const badge = document.getElementById('starts-count-badge');
        if (badge) badge.textContent = `${starts.length} Start${starts.length !== 1 ? 's' : ''}`;

        if (!starts || starts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-title">Noch keine Starter eingetragen</div>
                    <p>Wähle oben einen Teilnehmer aus, um den ersten Start hinzuzufügen.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th style="width: 45px;">#</th>
                            <th>Teilnehmer</th>
                            <th>Team / Einzel</th>
                            <th>AK</th>
                            <th>Ergebnisse (Serien)</th>
                            <th class="num-col">Gesamt</th>
                            <th style="text-align: right;">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        starts.forEach((s, idx) => {
            const teamBadge = s.team 
                ? `<span class="badge badge-team">${window.AppUtils.escapeHtml(s.team.name)}</span>`
                : `<span class="badge badge-single">Einzelstart</span>`;

            const akBadge = s.ak 
                ? `<span class="badge badge-ak">AK</span>` 
                : `<span style="color: var(--text-muted);">–</span>`;

            // Formatierte Ergebnisse
            let resultsFormatted = '<span style="color: var(--text-muted); font-style: italic;">Noch keine Ergebnisse</span>';
            let totalSum = null;

            if (s.results && s.results.length > 0) {
                const values = s.results.map(r => window.AppUtils.formatNumber(r.wert));
                resultsFormatted = `<strong>${values.join(' / ')}</strong>`;
                totalSum = s.results.reduce((acc, cur) => acc + (Number(cur.wert) || 0), 0);
            }

            const totalDisplay = totalSum !== null 
                ? `<strong>${window.AppUtils.formatNumber(totalSum)}</strong>` 
                : '<span style="color: var(--text-muted);">–</span>';

            html += `
                <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${window.AppUtils.escapeHtml(s.participant.vorname + ' ' + s.participant.nachname)}</strong></td>
                    <td>${teamBadge}</td>
                    <td>${akBadge}</td>
                    <td>${resultsFormatted}</td>
                    <td class="num-col">${totalDisplay}</td>
                    <td style="text-align: right; white-space: nowrap;">
                        <a href="ergebnisse-eingabe.html?competition_id=${currentCompetition.id}&participant_id=${s.participant_id}&start_id=${s.id}" class="btn btn-sm btn-primary" title="Ergebnisse für diesen Start eintragen/bearbeiten">
                            📝 Ergebnisse
                        </a>
                        <button type="button" class="btn btn-sm btn-danger btn-delete-start" data-id="${s.id}" data-name="${window.AppUtils.escapeHtml(s.participant.vorname + ' ' + s.participant.nachname)}" title="Start entfernen">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        // Delete Buttons
        container.querySelectorAll('.btn-delete-start').forEach(btn => {
            btn.addEventListener('click', () => {
                handleDeleteStart(btn.dataset.id, btn.dataset.name);
            });
        });
    }

    /**
     * Starts filtern
     */
    function handleFilterStarts(e) {
        const query = (e.target.value || '').trim().toLowerCase();
        if (!query) {
            renderStartsTable(compStarts);
            return;
        }

        const filtered = compStarts.filter(s => {
            const pName = `${s.participant.vorname} ${s.participant.nachname}`.toLowerCase();
            const tName = s.team ? s.team.name.toLowerCase() : 'einzelstart';
            return pName.includes(query) || tName.includes(query);
        });

        renderStartsTable(filtered);
    }

    /**
     * Start löschen
     */
    async function handleDeleteStart(startId, participantName) {
        if (!confirm(`Möchtest du den Start für "${participantName}" wirklich löschen? Die zugehörigen Ergebnisse werden ebenfalls gelöscht.`)) {
            return;
        }

        try {
            await window.supabaseClient.from('results').delete().eq('start_id', startId);
            const { error } = await window.supabaseClient.from('starts').delete().eq('id', startId);

            if (error) {
                console.error('Fehler beim Löschen des Starts:', error);
                window.AppUtils.showNotification(`❌ Fehler beim Löschen: ${error.message}`, 'error');
                return;
            }

            window.AppUtils.showNotification(`Start für "${participantName}" wurde entfernt.`, 'info');
            await refreshTeamsAndStarts();

        } catch (err) {
            console.error('Unerwarteter Fehler:', err);
            window.AppUtils.showNotification(`❌ Fehler: ${err.message}`, 'error');
        }
    }

})();