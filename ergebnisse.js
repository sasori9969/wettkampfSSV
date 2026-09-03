/**
 * SSV 1928 Sulzbach e.V. - Ranglisten & Auswertung
 * Logik für ergebnisse.html
 */

(function () {
    'use strict';

    let allCompetitions = [];
    let currentCompetition = null;
    let enrichedStarts = [];
    let teamsMap = {};
    let participantsMap = {};
    let currentTab = 'tab-einzel';
    let filterEinzelMode = 'all'; // 'all' | 'wertung' | 'ak_only'

    document.addEventListener('DOMContentLoaded', () => {
        initApp();
    });

    async function initApp() {
        if (!window.supabaseClient) {
            console.error('Supabase Client nicht verfügbar.');
            window.AppUtils.showNotification('Supabase-Client konnte nicht geladen werden.', 'error');
            return;
        }

        // Tab Navigation Events
        document.querySelectorAll('.nav-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                switchTab(btn.dataset.tab);
            });
        });

        // Wettkampf Dropdown Event
        const compSelect = document.getElementById('select-competition');
        if (compSelect) {
            compSelect.addEventListener('change', (e) => {
                const compId = e.target.value;
                if (compId) {
                    loadCompetitionResults(compId);
                }
            });
        }

        // Filter Einzelwertung
        const filterEinzel = document.getElementById('filter-einzel-ak');
        if (filterEinzel) {
            filterEinzel.addEventListener('change', (e) => {
                filterEinzelMode = e.target.value;
                renderEinzelwertung();
            });
        }

        // Drucken Button
        const btnPrint = document.getElementById('btn-print');
        if (btnPrint) {
            btnPrint.addEventListener('click', () => {
                window.print();
            });
        }

        // CSV Export Button
        const btnCsv = document.getElementById('btn-export-csv');
        if (btnCsv) {
            btnCsv.addEventListener('click', exportToCSV);
        }

        // Wettkämpfe laden
        await loadCompetitionsList();
    }

    /**
     * Tab wechseln
     */
    function switchTab(tabId) {
        currentTab = tabId;

        document.querySelectorAll('.nav-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === tabId);
        });
    }

    /**
     * Lädt die Liste aller Wettkämpfe für das Dropdown
     */
    async function loadCompetitionsList() {
        try {
            const { data: competitions, error } = await window.supabaseClient
                .from('competitions')
                .select('*')
                .order('datum', { ascending: false });

            if (error) {
                console.error('Fehler beim Laden der Wettkämpfe:', error);
                window.AppUtils.showNotification('❌ Wettkämpfe konnten nicht geladen werden.', 'error');
                return;
            }

            allCompetitions = competitions || [];
            const select = document.getElementById('select-competition');

            if (allCompetitions.length === 0) {
                select.innerHTML = `<option value="">Keine Wettkämpfe vorhanden</option>`;
                return;
            }

            let html = '';
            const requestedCompId = window.AppUtils.getUrlParam('competition_id') || window.AppUtils.getUrlParam('id');
            let initialCompId = allCompetitions[0].id;

            if (requestedCompId && allCompetitions.some(c => c.id === requestedCompId)) {
                initialCompId = requestedCompId;
            }

            allCompetitions.forEach(c => {
                const selected = c.id === initialCompId ? 'selected' : '';
                html += `<option value="${c.id}" ${selected}>${window.AppUtils.escapeHtml(c.name)} (${window.AppUtils.formatDate(c.datum)})</option>`;
            });

            select.innerHTML = html;

            // Ergebnisse für den ersten/gewählten Wettkampf laden
            await loadCompetitionResults(initialCompId);

        } catch (err) {
            console.error('Unerwarteter Fehler beim Laden der Wettkämpfe:', err);
        }
    }

    /**
     * Lädt alle Starts, Teilnehmer, Teams und Results für einen Wettkampf
     */
    async function loadCompetitionResults(compId) {
        currentCompetition = allCompetitions.find(c => c.id === compId);
        if (!currentCompetition) return;

        // Buttons zur Ergebniserfassung und Live-QR aktualisieren
        const btnEdit = document.getElementById('btn-edit-results');
        if (btnEdit) btnEdit.href = `ergebnisse-eingabe.html?competition_id=${compId}`;
        const btnLiveQr = document.getElementById('btn-live-qr');
        if (btnLiveQr) btnLiveQr.href = `qrcode.html?competition_id=${compId}`;

        // Header & Meta aktualisieren
        const statusBadge = currentCompetition.status === 'laufend' ? '<span class="badge badge-status-laufend">Laufend</span>' :
                            currentCompetition.status === 'abgeschlossen' ? '<span class="badge badge-status-abgeschlossen">Beendet</span>' :
                            '<span class="badge badge-status-geplant">Geplant</span>';

        const infoBadge = document.getElementById('comp-info-badge');
        if (infoBadge) {
            infoBadge.innerHTML = `${statusBadge} &bull; <span style="font-size: 0.9rem; color: var(--text-muted);">${currentCompetition.anzahl_ergebnisse} Serien &bull; Teamgröße ${currentCompetition.teamgroesse}</span>`;
        }

        // Druck-Header aktualisieren
        const printTitle = document.getElementById('print-competition-title');
        const printMeta = document.getElementById('print-competition-meta');
        if (printTitle) printTitle.textContent = currentCompetition.name;
        if (printMeta) printMeta.textContent = `Datum: ${window.AppUtils.formatDate(currentCompetition.datum)} | Modus: ${currentCompetition.anzahl_ergebnisse} Serien je Starter`;

        try {
            // Lade Starts, Teams, Participants und Results
            const [startsRes, teamsRes, participantsRes, resultsRes] = await Promise.all([
                window.supabaseClient.from('starts').select('*').eq('competition_id', compId),
                window.supabaseClient.from('teams').select('*').eq('competition_id', compId),
                window.supabaseClient.from('participants').select('*'),
                window.supabaseClient.from('results').select('*')
            ]);

            const starts = startsRes.data || [];
            const teams = teamsRes.data || [];
            const participants = participantsRes.data || [];
            const allResults = resultsRes.data || [];

            // Mapping Maps erstellen
            teamsMap = {};
            teams.forEach(t => teamsMap[t.id] = t);

            participantsMap = {};
            participants.forEach(p => participantsMap[p.id] = p);

            const resultsByStartId = {};
            allResults.forEach(r => {
                if (!resultsByStartId[r.start_id]) {
                    resultsByStartId[r.start_id] = [];
                }
                resultsByStartId[r.start_id].push(r);
            });

            // Starts anreichern & Gesamtergebnis berechnen
            enrichedStarts = starts.map(s => {
                const p = participantsMap[s.participant_id] || { vorname: 'Unbekannt', nachname: '#' + s.participant_id };
                const t = s.team_id ? (teamsMap[s.team_id] || { name: 'Unbekanntes Team' }) : null;
                const startResults = (resultsByStartId[s.id] || []).sort((a, b) => a.nummer - b.nummer);

                // Gesamtergebnis berechnen
                let gesamt = null;
                let hasResults = false;
                if (startResults.length > 0) {
                    hasResults = true;
                    gesamt = startResults.reduce((acc, cur) => acc + (Number(cur.wert) || 0), 0);
                }

                return {
                    ...s,
                    participant: p,
                    team: t,
                    results: startResults,
                    hasResults: hasResults,
                    gesamt: gesamt
                };
            });

            // Alle Tabs rendern
            renderEinzelwertung();
            renderTeamwertung();
            renderAllStarts();

        } catch (err) {
            console.error('Fehler beim Laden der Ergebnisse:', err);
            window.AppUtils.showNotification(`❌ Fehler beim Laden der Ergebnisse: ${err.message}`, 'error');
        }
    }

    /**
     * TAB 1: Einzelwertung rendern
     */
    function renderEinzelwertung() {
        const container = document.getElementById('einzel-table-container');

        // Filter anwenden
        let startsToDisplay = [...enrichedStarts];
        if (filterEinzelMode === 'wertung') {
            startsToDisplay = startsToDisplay.filter(s => !s.ak);
        } else if (filterEinzelMode === 'ak_only') {
            startsToDisplay = startsToDisplay.filter(s => s.ak);
        }

        if (startsToDisplay.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎯</div>
                    <div class="empty-state-title">Keine Starter für diese Ansicht</div>
                    <p>Füge im Wettkampf Starter hinzu oder passe den Filter an.</p>
                </div>
            `;
            return;
        }

        // Sortierung: Höchstes Gesamtergebnis zuerst, Starter ohne Ergebnisse ans Ende
        startsToDisplay.sort((a, b) => {
            if (a.gesamt === null && b.gesamt === null) return 0;
            if (a.gesamt === null) return 1;
            if (b.gesamt === null) return -1;
            return b.gesamt - a.gesamt;
        });

        const seriesCount = currentCompetition.anzahl_ergebnisse || 3;

        let html = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th class="rank-col">Rang</th>
                            <th>Teilnehmer</th>
                            <th>Team / Einzel</th>
                            <th>Status</th>
        `;

        for (let i = 1; i <= seriesCount; i++) {
            html += `<th class="num-col">Serie ${i}</th>`;
        }

        html += `
                            <th class="num-col" style="font-weight: 700;">Gesamt</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        let currentOfficialRank = 0;

        startsToDisplay.forEach(s => {
            // Ranglogik: AK-Starts erhalten keinen regulären numerischen Podestrang
            let rankDisplay = '–';
            if (s.gesamt !== null) {
                if (s.ak) {
                    rankDisplay = `<span class="badge badge-ak">AK</span>`;
                } else {
                    currentOfficialRank++;
                    if (currentOfficialRank === 1) {
                        rankDisplay = `<span class="rank-badge rank-1" title="1. Platz (Gold)">1</span>`;
                    } else if (currentOfficialRank === 2) {
                        rankDisplay = `<span class="rank-badge rank-2" title="2. Platz (Silber)">2</span>`;
                    } else if (currentOfficialRank === 3) {
                        rankDisplay = `<span class="rank-badge rank-3" title="3. Platz (Bronze)">3</span>`;
                    } else {
                        rankDisplay = `<strong>${currentOfficialRank}.</strong>`;
                    }
                }
            }

            const teamBadge = s.team 
                ? `<span class="badge badge-team">${window.AppUtils.escapeHtml(s.team.name)}</span>`
                : `<span class="badge badge-single">Einzelstart</span>`;

            const statusBadge = s.ak 
                ? `<span class="badge badge-ak">AK</span>`
                : `<span style="color: var(--text-muted); font-size: 0.85rem;">Wertung</span>`;

            // Serienwerte mappen
            const resultMap = {};
            s.results.forEach(r => resultMap[r.nummer] = r.wert);

            let seriesTds = '';
            for (let i = 1; i <= seriesCount; i++) {
                const val = resultMap[i];
                seriesTds += `<td class="num-col">${window.AppUtils.formatNumber(val)}</td>`;
            }

            const totalDisplay = s.gesamt !== null
                ? `<strong style="font-size: 1.05rem; color: var(--primary-dark);">${window.AppUtils.formatNumber(s.gesamt)}</strong>`
                : `<span style="color: var(--text-muted);">–</span>`;

            html += `
                <tr>
                    <td class="rank-col">${rankDisplay}</td>
                    <td><strong>${window.AppUtils.escapeHtml(s.participant.vorname + ' ' + s.participant.nachname)}</strong></td>
                    <td>${teamBadge}</td>
                    <td>${statusBadge}</td>
                    ${seriesTds}
                    <td class="num-col">${totalDisplay}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * TAB 2: Mannschaftswertung rendern
     */
    function renderTeamwertung() {
        const container = document.getElementById('team-table-container');

        // Gruppiere nach Teams
        const teamGroups = {};
        Object.values(teamsMap).forEach(t => {
            teamGroups[t.id] = {
                team: t,
                members: [],
                totalScore: 0,
                hasCompleteScores: false
            };
        });

        enrichedStarts.forEach(s => {
            if (s.team_id && teamGroups[s.team_id]) {
                teamGroups[s.team_id].members.push(s);
            }
        });

        const activeTeams = Object.values(teamGroups).filter(g => g.members.length > 0);

        if (activeTeams.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🛡️</div>
                    <div class="empty-state-title">Keine Mannschaften gefunden</div>
                    <p>In diesem Wettkampf wurden noch keine Starter Mannschaften zugeordnet.</p>
                </div>
            `;
            return;
        }

        // Berechne Team-Gesamtsummen
        activeTeams.forEach(g => {
            let sum = 0;
            let scoredCount = 0;
            g.members.forEach(m => {
                if (m.gesamt !== null) {
                    sum += m.gesamt;
                    scoredCount++;
                }
            });
            g.totalScore = sum;
            g.scoredCount = scoredCount;
        });

        // Sortiere nach Team Gesamt absteigend
        activeTeams.sort((a, b) => b.totalScore - a.totalScore);

        let html = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th class="rank-col">Rang</th>
                            <th>Mannschaft</th>
                            <th>Schützen & Einzelergebnisse</th>
                            <th class="num-col" style="font-weight: 700;">Mannschafts-Gesamt</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        activeTeams.forEach((g, idx) => {
            let rankBadge = `<strong>${idx + 1}.</strong>`;
            if (idx === 0) rankBadge = `<span class="rank-badge rank-1">1</span>`;
            if (idx === 1) rankBadge = `<span class="rank-badge rank-2">2</span>`;
            if (idx === 2) rankBadge = `<span class="rank-badge rank-3">3</span>`;

            // Schützen-Liste aufbauen
            let membersListHtml = '<div style="display: flex; flex-direction: column; gap: 0.35rem;">';
            g.members.forEach(m => {
                const akHint = m.ak ? ' <span class="badge badge-ak">AK</span>' : '';
                const scoreText = m.gesamt !== null ? window.AppUtils.formatNumber(m.gesamt) : '–';
                const seriesText = m.results.length > 0 ? ` (${m.results.map(r => window.AppUtils.formatNumber(r.wert)).join(' / ')})` : '';

                membersListHtml += `
                    <div style="font-size: 0.9rem; display: flex; justify-content: space-between; max-width: 400px; padding: 2px 0; border-bottom: 1px dashed var(--border-light);">
                        <span>${window.AppUtils.escapeHtml(m.participant.vorname + ' ' + m.participant.nachname)}${akHint}</span>
                        <span style="font-weight: 600; color: var(--text-main); font-variant-numeric: tabular-nums;">
                            ${scoreText} <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">${seriesText}</span>
                        </span>
                    </div>
                `;
            });
            membersListHtml += '</div>';

            html += `
                <tr>
                    <td class="rank-col">${rankBadge}</td>
                    <td>
                        <strong style="font-size: 1.1rem; color: var(--primary-dark);">${window.AppUtils.escapeHtml(g.team.name)}</strong>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                            ${g.members.length} / ${currentCompetition.teamgroesse} Starter
                        </div>
                    </td>
                    <td>${membersListHtml}</td>
                    <td class="num-col">
                        <strong style="font-size: 1.25rem; color: var(--primary-dark);">${window.AppUtils.formatNumber(g.totalScore)}</strong>
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
    }

    /**
     * TAB 3: Alle Starts & Protokoll rendern
     */
    function renderAllStarts() {
        const container = document.getElementById('all-starts-table-container');

        if (enrichedStarts.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>Keine Starts eingetragen.</p></div>`;
            return;
        }

        const seriesCount = currentCompetition.anzahl_ergebnisse || 3;

        let html = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th style="width: 45px;">#</th>
                            <th>Teilnehmer</th>
                            <th>Team / Einzel</th>
                            <th>AK</th>
        `;

        for (let i = 1; i <= seriesCount; i++) {
            html += `<th class="num-col">Serie ${i}</th>`;
        }

        html += `
                            <th class="num-col">Gesamt</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        enrichedStarts.forEach((s, idx) => {
            const teamBadge = s.team 
                ? `<span class="badge badge-team">${window.AppUtils.escapeHtml(s.team.name)}</span>`
                : `<span class="badge badge-single">Einzelstart</span>`;

            const akBadge = s.ak ? '<span class="badge badge-ak">AK</span>' : '–';

            const resultMap = {};
            s.results.forEach(r => resultMap[r.nummer] = r.wert);

            let seriesTds = '';
            for (let i = 1; i <= seriesCount; i++) {
                const val = resultMap[i];
                seriesTds += `<td class="num-col">${window.AppUtils.formatNumber(val)}</td>`;
            }

            const totalDisplay = s.gesamt !== null 
                ? `<strong>${window.AppUtils.formatNumber(s.gesamt)}</strong>` 
                : '<span style="color: var(--text-muted);">–</span>';

            html += `
                <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${window.AppUtils.escapeHtml(s.participant.vorname + ' ' + s.participant.nachname)}</strong></td>
                    <td>${teamBadge}</td>
                    <td>${akBadge}</td>
                    ${seriesTds}
                    <td class="num-col">${totalDisplay}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * CSV Export Funktion (mit Semikolon und UTF-8 BOM für Excel)
     */
    function exportToCSV() {
        if (!currentCompetition || enrichedStarts.length === 0) {
            window.AppUtils.showNotification('Keine Daten zum Exportieren vorhanden.', 'warning');
            return;
        }

        const seriesCount = currentCompetition.anzahl_ergebnisse || 3;

        let csv = '\uFEFF'; // UTF-8 BOM
        csv += `Wettkampf:;${currentCompetition.name}\n`;
        csv += `Datum:;${currentCompetition.datum}\n\n`;

        // Header
        let header = ['Rang', 'Nachname', 'Vorname', 'Team', 'AK'];
        for (let i = 1; i <= seriesCount; i++) {
            header.push(`Serie_${i}`);
        }
        header.push('Gesamtergebnis');

        csv += header.join(';') + '\n';

        // Sortierte Liste nach Gesamtergebnis
        const sorted = [...enrichedStarts].sort((a, b) => {
            if (a.gesamt === null) return 1;
            if (b.gesamt === null) return -1;
            return b.gesamt - a.gesamt;
        });

        let rank = 0;
        sorted.forEach(s => {
            if (!s.ak && s.gesamt !== null) rank++;
            const rankStr = s.ak ? 'AK' : (s.gesamt !== null ? rank : '');
            const teamStr = s.team ? s.team.name : 'Einzelstart';
            const akStr = s.ak ? 'JA' : 'NEIN';

            const resultMap = {};
            s.results.forEach(r => resultMap[r.nummer] = r.wert);

            const row = [
                rankStr,
                `"${s.participant.nachname}"`,
                `"${s.participant.vorname}"`,
                `"${teamStr}"`,
                akStr
            ];

            for (let i = 1; i <= seriesCount; i++) {
                const val = resultMap[i] !== undefined ? String(resultMap[i]).replace('.', ',') : '';
                row.push(val);
            }

            row.push(s.gesamt !== null ? String(s.gesamt).replace('.', ',') : '');

            csv += row.join(';') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const cleanName = currentCompetition.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        a.href = url;
        a.download = `Ergebnisse_${cleanName}_${currentCompetition.datum}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        window.AppUtils.showNotification('📥 CSV-Datei erfolgreich heruntergeladen!', 'success');
    }

})();
