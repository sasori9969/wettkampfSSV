/**
 * SSV 1928 Sulzbach e.V. - Live-Ergebnisanzeige
 * Logik für live.html
 *
 * - Auto-Refresh alle 30 Sekunden
 * - Wettkampf-ID aus URL-Parameter
 * - Einzelwertung: nach Gesamtergebnis absteigend, AK separat
 * - Mannschaftswertung: Teamsumme absteigend, Einzelbeiträge der Schützen
 */

(function () {
    'use strict';

    const REFRESH_INTERVAL_SECONDS = 30;

    let competitionId = null;
    let currentCompetition = null;
    let refreshTimer = null;
    let countdownTimer = null;
    let countdownValue = REFRESH_INTERVAL_SECONDS;
    let isLoading = false;

    document.addEventListener('DOMContentLoaded', () => {
        init();
    });

    function init() {
        competitionId = getUrlParam('competition_id') || getUrlParam('id');

        if (!competitionId) {
            document.getElementById('no-comp-screen').style.display = 'flex';
            document.getElementById('results-area').style.display = 'none';
            document.getElementById('last-updated-text').textContent = 'Kein Wettkampf ausgewählt';
            return;
        }

        document.getElementById('no-comp-screen').style.display = 'none';
        document.getElementById('results-area').style.display = 'block';
        document.getElementById('comp-info-bar').style.display = 'flex';

        // Erste Ladung
        loadAndRender();

        // Auto-Refresh Countdown starten
        startCountdown();
    }

    function getUrlParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    // =========================================================
    // COUNTDOWN & AUTO-REFRESH
    // =========================================================

    function startCountdown() {
        countdownValue = REFRESH_INTERVAL_SECONDS;
        updateCountdownDisplay();

        if (countdownTimer) clearInterval(countdownTimer);

        countdownTimer = setInterval(() => {
            countdownValue--;
            updateCountdownDisplay();

            if (countdownValue <= 0) {
                countdownValue = REFRESH_INTERVAL_SECONDS;
                loadAndRender();
            }
        }, 1000);
    }

    function updateCountdownDisplay() {
        const el = document.getElementById('countdown-display');
        if (el) el.textContent = countdownValue;
    }

    // =========================================================
    // DATEN LADEN & RENDERN
    // =========================================================

    async function loadAndRender() {
        if (isLoading) return;
        isLoading = true;

        try {
            if (!window.supabaseClient) {
                showError('Supabase-Verbindung nicht verfügbar.');
                return;
            }

            // Alles parallel laden
            const [compRes, startsRes, teamsRes, participantsRes, resultsRes] = await Promise.all([
                window.supabaseClient.from('competitions').select('*').eq('id', competitionId).single(),
                window.supabaseClient.from('starts').select('*').eq('competition_id', competitionId),
                window.supabaseClient.from('teams').select('*').eq('competition_id', competitionId),
                window.supabaseClient.from('participants').select('*'),
                window.supabaseClient.from('results').select('*')
            ]);

            if (compRes.error || !compRes.data) {
                showError('Wettkampf nicht gefunden. Bitte QR-Code neu generieren.');
                return;
            }

            currentCompetition = compRes.data;

            const starts = startsRes.data || [];
            const teams = teamsRes.data || [];
            const participants = participantsRes.data || [];
            const allResults = resultsRes.data || [];

            // Mapping
            const participantMap = {};
            participants.forEach(p => participantMap[p.id] = p);

            const teamMap = {};
            teams.forEach(t => teamMap[t.id] = t);

            const resultsByStartId = {};
            allResults.forEach(r => {
                if (!resultsByStartId[r.start_id]) resultsByStartId[r.start_id] = [];
                resultsByStartId[r.start_id].push(r);
            });

            // Starts anreichern
            const enrichedStarts = starts.map(s => {
                const p = participantMap[s.participant_id] || { vorname: 'Unbekannt', nachname: '#' + s.participant_id };
                const t = s.team_id ? (teamMap[s.team_id] || { name: 'Unbekanntes Team' }) : null;
                const startResults = (resultsByStartId[s.id] || []).sort((a, b) => a.nummer - b.nummer);

                let gesamt = null;
                if (startResults.length > 0) {
                    gesamt = startResults.reduce((acc, cur) => acc + (Number(cur.wert) || 0), 0);
                }

                return { ...s, participant: p, team: t, results: startResults, gesamt };
            });

            // Header aktualisieren
            renderHeader(currentCompetition);

            // Sektionen rendern
            renderEinzelwertung(enrichedStarts, currentCompetition);
            renderTeamwertung(enrichedStarts, teams, currentCompetition);

            // Zeitstempel
            const now = new Date();
            const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            document.getElementById('last-updated-text').textContent = `Zuletzt aktualisiert: ${timeStr} Uhr`;

        } catch (err) {
            console.error('Fehler beim Laden der Live-Ergebnisse:', err);
            showError(`Verbindungsfehler: ${err.message}`);
        } finally {
            isLoading = false;
        }
    }

    // =========================================================
    // HEADER RENDERN
    // =========================================================

    function renderHeader(comp) {
        document.getElementById('comp-name-display').textContent = comp.name;

        const date = comp.datum ? new Date(comp.datum).toLocaleDateString('de-DE', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        }) : '–';

        document.getElementById('comp-meta-display').textContent =
            `📅 ${date}  ·  📊 ${comp.anzahl_ergebnisse} Serien je Starter  ·  👥 Teamgröße: max. ${comp.teamgroesse} Starter`;

        const statusBadgeClass = comp.status === 'laufend' ? 'badge-laufend' :
                                 comp.status === 'abgeschlossen' ? 'badge-abgeschlossen' : 'badge-geplant';

        const statusText = comp.status === 'laufend' ? 'Laufend' :
                           comp.status === 'abgeschlossen' ? 'Beendet' : 'Geplant';

        document.getElementById('comp-badges-display').innerHTML = `
            <span class="badge ${statusBadgeClass}">${statusText}</span>
        `;
    }

    // =========================================================
    // EINZELWERTUNG RENDERN
    // =========================================================

    function renderEinzelwertung(enrichedStarts, comp) {
        const container = document.getElementById('einzel-container');
        const seriesCount = comp.anzahl_ergebnisse || 3;

        // Aufteilen in Wertung und AK
        const wertungStarts = enrichedStarts.filter(s => !s.ak && s.gesamt !== null);
        const akStarts = enrichedStarts.filter(s => s.ak && s.gesamt !== null);
        const ohneErgebnisStarts = enrichedStarts.filter(s => s.gesamt === null);

        // Sortieren: beste Gesamt oben
        wertungStarts.sort((a, b) => b.gesamt - a.gesamt);
        akStarts.sort((a, b) => b.gesamt - a.gesamt);

        if (enrichedStarts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎯</div>
                    <div class="empty-state-title">Noch keine Starter eingetragen</div>
                    <p>Starter werden nach der Eingabe automatisch hier angezeigt.</p>
                </div>
            `;
            return;
        }

        // Tabellen-Header
        let headerCols = '';
        for (let i = 1; i <= seriesCount; i++) {
            headerCols += `<th class="num-col" style="min-width: 70px;">S${i}</th>`;
        }

        let html = `
            <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #30363d;">
                <table class="rank-table">
                    <thead>
                        <tr>
                            <th style="width: 60px; text-align: center;">Rang</th>
                            <th>Schütze</th>
                            <th>Mannschaft</th>
                            ${headerCols}
                            <th class="num-col" style="font-size: 0.9rem; min-width: 100px;">Gesamt</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Wertungs-Starts
        wertungStarts.forEach((s, idx) => {
            const rank = idx + 1;
            const posClass = rank === 1 ? 'pos-1' : rank === 2 ? 'pos-2' : rank === 3 ? 'pos-3' : 'pos-n';
            const posBadge = rank <= 3
                ? `<span class="pos-badge ${posClass}">${rank}</span>`
                : `<span class="pos-n">${rank}.</span>`;

            const totalClass = rank === 1 ? 'total-score total-score-gold' :
                               rank === 2 ? 'total-score total-score-silver' :
                               rank === 3 ? 'total-score total-score-bronze' : 'total-score';

            const teamDisplay = s.team
                ? `<span class="badge badge-team">${escHtml(s.team.name)}</span>`
                : `<span class="badge badge-single">Einzel</span>`;

            const resultMap = {};
            s.results.forEach(r => resultMap[r.nummer] = r.wert);

            let seriesTds = '';
            for (let i = 1; i <= seriesCount; i++) {
                const v = resultMap[i];
                seriesTds += `<td class="num-col" style="color: #8b949e; font-size: 0.9rem;">${fmt(v)}</td>`;
            }

            const rowClass = rank <= 3 ? 'row-top3' : '';

            html += `
                <tr class="${rowClass}">
                    <td style="text-align: center;">${posBadge}</td>
                    <td>
                        <div class="participant-name">${escHtml(s.participant.vorname + ' ' + s.participant.nachname)}</div>
                    </td>
                    <td>${teamDisplay}</td>
                    ${seriesTds}
                    <td class="num-col"><span class="${totalClass}">${fmt(s.gesamt)}</span></td>
                </tr>
            `;
        });

        // AK-Starts (in derselben Tabelle, aber visuell abgesetzt)
        if (akStarts.length > 0) {
            html += `
                <tr>
                    <td colspan="${4 + seriesCount}" style="background: #21262d; padding: 0.5rem 1rem; font-size: 0.78rem; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">
                        Außer Konkurrenz (AK) – nicht in Wertung
                    </td>
                </tr>
            `;

            akStarts.forEach(s => {
                const teamDisplay = s.team
                    ? `<span class="badge badge-team">${escHtml(s.team.name)}</span>`
                    : `<span class="badge badge-single">Einzel</span>`;

                const resultMap = {};
                s.results.forEach(r => resultMap[r.nummer] = r.wert);

                let seriesTds = '';
                for (let i = 1; i <= seriesCount; i++) {
                    const v = resultMap[i];
                    seriesTds += `<td class="num-col" style="color: #4d5566; font-size: 0.9rem;">${fmt(v)}</td>`;
                }

                html += `
                    <tr class="ak-row">
                        <td style="text-align: center;"><span class="badge badge-ak">AK</span></td>
                        <td>
                            <div class="participant-name" style="opacity: 0.75;">${escHtml(s.participant.vorname + ' ' + s.participant.nachname)}</div>
                        </td>
                        <td>${teamDisplay}</td>
                        ${seriesTds}
                        <td class="num-col"><span class="total-score" style="opacity: 0.75;">${fmt(s.gesamt)}</span></td>
                    </tr>
                `;
            });
        }

        // Ohne Ergebnisse (wenn vorhanden)
        if (ohneErgebnisStarts.length > 0) {
            html += `
                <tr>
                    <td colspan="${4 + seriesCount}" style="background: #21262d; padding: 0.5rem 1rem; font-size: 0.78rem; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">
                        Noch keine Ergebnisse eingetragen (${ohneErgebnisStarts.length} Starter)
                    </td>
                </tr>
            `;

            ohneErgebnisStarts.forEach(s => {
                const teamDisplay = s.team
                    ? `<span class="badge badge-team">${escHtml(s.team.name)}</span>`
                    : `<span class="badge badge-single">Einzel</span>`;

                let seriesTds = '';
                for (let i = 1; i <= seriesCount; i++) {
                    seriesTds += `<td class="num-col" style="color: #4d5566;">–</td>`;
                }

                html += `
                    <tr class="ak-row">
                        <td style="text-align: center;">–</td>
                        <td>
                            <div class="participant-name" style="opacity: 0.5;">${escHtml(s.participant.vorname + ' ' + s.participant.nachname)}</div>
                        </td>
                        <td>${teamDisplay}</td>
                        ${seriesTds}
                        <td class="num-col"><span class="total-score-na">–</span></td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        // Teilnehmeranzahl-Info
        const gesamtAnzahl = wertungStarts.length + akStarts.length;
        html += `
            <div style="margin-top: 0.75rem; font-size: 0.8rem; color: #8b949e;">
                ${wertungStarts.length > 0 ? `<strong style="color: #e6edf3;">${wertungStarts.length}</strong> Starter in Wertung` : ''}
                ${akStarts.length > 0 ? ` · <strong style="color: #e6edf3;">${akStarts.length}</strong> AK` : ''}
                ${ohneErgebnisStarts.length > 0 ? ` · <strong style="color: #e6edf3;">${ohneErgebnisStarts.length}</strong> noch ohne Ergebnisse` : ''}
            </div>
        `;

        container.innerHTML = html;
    }

    // =========================================================
    // MANNSCHAFTSWERTUNG RENDERN
    // =========================================================

    function renderTeamwertung(enrichedStarts, teams, comp) {
        const container = document.getElementById('team-container');

        if (teams.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🛡️</div>
                    <div class="empty-state-title">Keine Mannschaften eingetragen</div>
                    <p>Lege im Wettkampf Teams an und ordne Starter zu, um die Mannschaftswertung zu sehen.</p>
                </div>
            `;
            return;
        }

        // Gruppen nach Teams bilden
        const teamGroups = {};
        teams.forEach(t => {
            teamGroups[t.id] = { team: t, members: [], totalScore: 0 };
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
                    <div class="empty-state-title">Noch keine Starter Mannschaften zugeordnet</div>
                </div>
            `;
            return;
        }

        // Team-Gesamtsummen berechnen
        activeTeams.forEach(g => {
            let sum = 0;
            g.members.forEach(m => {
                if (m.gesamt !== null) sum += m.gesamt;
            });
            g.totalScore = sum;
        });

        // Sortieren: höchste Teamgesamte oben
        activeTeams.sort((a, b) => b.totalScore - a.totalScore);

        let html = '';

        activeTeams.forEach((g, idx) => {
            const rank = idx + 1;
            const posClass = rank === 1 ? 'pos-1' : rank === 2 ? 'pos-2' : rank === 3 ? 'pos-3' : '';
            const posBadge = rank <= 3
                ? `<span class="pos-badge ${posClass}">${rank}</span>`
                : `<span style="font-size: 1.4rem; font-weight: 800; color: #8b949e;">${rank}.</span>`;

            const totalColorStyle = rank === 1 ? 'color: var(--gold);' :
                                    rank === 2 ? 'color: var(--silver);' :
                                    rank === 3 ? 'color: var(--bronze);' : 'color: #58a6ff;';

            // Mitglieder
            let membersHtml = '';
            const sortedMembers = [...g.members].sort((a, b) => {
                if (a.gesamt === null && b.gesamt === null) return 0;
                if (a.gesamt === null) return 1;
                if (b.gesamt === null) return -1;
                return b.gesamt - a.gesamt;
            });

            sortedMembers.forEach(m => {
                const seriesText = m.results.length > 0
                    ? m.results.map(r => fmt(r.wert)).join(' / ')
                    : 'Noch keine Ergebnisse';
                const akBadge = m.ak ? ' <span class="badge badge-ak" style="font-size: 0.65rem;">AK</span>' : '';

                membersHtml += `
                    <div class="team-member-row">
                        <div>
                            <div class="team-member-name">
                                ${escHtml(m.participant.vorname + ' ' + m.participant.nachname)}${akBadge}
                            </div>
                            <div class="team-member-series">${escHtml(seriesText)}</div>
                        </div>
                        <div class="team-member-score">
                            ${m.gesamt !== null ? fmt(m.gesamt) : '–'}
                        </div>
                    </div>
                `;
            });

            // Fehlende Starter anzeigen
            const missingCount = comp.teamgroesse - g.members.length;
            if (missingCount > 0) {
                membersHtml += `
                    <div class="team-member-row" style="opacity: 0.4; font-style: italic;">
                        <div class="team-member-name">${missingCount} Starter noch nicht eingetragen</div>
                        <div class="team-member-score">–</div>
                    </div>
                `;
            }

            html += `
                <div class="team-card">
                    <div class="team-card-header">
                        <div class="team-card-pos">
                            ${posBadge}
                            <div>
                                <div class="team-card-name">${escHtml(g.team.name)}</div>
                                <div style="font-size: 0.8rem; color: #8b949e; margin-top: 2px;">
                                    ${g.members.length} von ${comp.teamgroesse} Startern
                                </div>
                            </div>
                        </div>
                        <div class="team-card-total" style="${totalColorStyle}">
                            ${fmt(g.totalScore)}
                        </div>
                    </div>
                    <div class="team-card-members">
                        ${membersHtml}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // =========================================================
    // HILFSFUNKTIONEN
    // =========================================================

    function fmt(val, decimals = 2) {
        if (val === null || val === undefined || isNaN(val) || val === '') return '–';
        return Number(val).toLocaleString('de-DE', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    function escHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showError(msg) {
        const einzel = document.getElementById('einzel-container');
        const team = document.getElementById('team-container');
        if (einzel) einzel.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">${escHtml(msg)}</div></div>`;
        if (team) team.innerHTML = '';
        document.getElementById('last-updated-text').textContent = `Fehler: ${msg}`;
    }

})();
