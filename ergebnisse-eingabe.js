/**
 * SSV 1928 Sulzbach e.V. - Ergebniserfassung
 * Logik für ergebnisse-eingabe.html
 */

(function () {
    'use strict';

    let allCompetitions = [];
    let allParticipantsCache = [];
    let selectedParticipant = null;
    let selectedStart = null;
    let participantStarts = [];
    let preselectedCompetitionId = null;
    let competitionParticipantIdsCache = {};

    document.addEventListener('DOMContentLoaded', () => {
        initApp();
    });

    async function initApp() {
        if (!window.supabaseClient) {
            console.error('Supabase Client nicht verfügbar.');
            window.AppUtils.showNotification('Supabase-Client konnte nicht geladen werden.', 'error');
            return;
        }

        // URL-Parameter auswerten
        preselectedCompetitionId = window.AppUtils.getUrlParam('competition_id');
        const urlParticipantId = window.AppUtils.getUrlParam('participant_id');
        const urlStartId = window.AppUtils.getUrlParam('start_id');

        // Navigation Links aktualisieren
        if (preselectedCompetitionId) {
            const btnComp = document.getElementById('btn-to-competition');
            const btnRank = document.getElementById('btn-to-rankings');
            if (btnComp) btnComp.href = `wettkampf.html?id=${preselectedCompetitionId}`;
            if (btnRank) btnRank.href = `ergebnisse.html?competition_id=${preselectedCompetitionId}`;
        }

        // Form Submit für Ergebnisse
        const formResults = document.getElementById('form-results-entry');
        if (formResults) {
            formResults.addEventListener('submit', handleSaveResults);
        }

        // Wettkampf-Filter Event
        const compFilter = document.getElementById('filter-competition-select');
        if (compFilter) {
            compFilter.addEventListener('change', async (e) => {
                preselectedCompetitionId = e.target.value || null;
                competitionParticipantIdsCache = {};
                resetParticipantSelection();
            });
        }

        // Live-Suche nach Teilnehmern
        const searchInput = document.getElementById('search-participant-input');
        if (searchInput) {
            // Beim Tippen filtern
            searchInput.addEventListener('input', window.AppUtils.debounce(handleSearchParticipants, 100));

            // Beim Hineinklicken oder Fokussieren SOFORT die letzten Teilnehmer anzeigen
            searchInput.addEventListener('focus', () => {
                handleSearchParticipants();
            });

            searchInput.addEventListener('click', () => {
                handleSearchParticipants();
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

        // Teilnehmer Reset Button
        const btnResetPart = document.getElementById('btn-reset-participant');
        if (btnResetPart) {
            btnResetPart.addEventListener('click', resetParticipantSelection);
        }

        // Wettkämpfe und Teilnehmerdaten vorladen
        await loadInitialData();

        // Falls URL-Parameter übergeben wurden, direkt ansteuern
        if (urlParticipantId) {
            const part = allParticipantsCache.find(p => String(p.id) === String(urlParticipantId));
            if (part) {
                selectParticipant(part);
                if (urlStartId) {
                    setTimeout(() => {
                        const start = participantStarts.find(s => String(s.id) === String(urlStartId));
                        if (start) selectStart(start);
                    }, 500);
                }
            }
        }
    }

    /**
     * Lädt Wettkämpfe und Teilnehmer zur Initialisierung
     * WICHTIG: Teilnehmer werden nach created_at absteigend geladen (Neueste zuerst)
     */
    async function loadInitialData() {
        try {
            const [compRes, partRes] = await Promise.all([
                window.supabaseClient
                    .from('competitions')
                    .select('*')
                    .order('datum', { ascending: false }),
                window.supabaseClient
                    .from('participants')
                    .select('*')
                    .order('created_at', { ascending: false })
            ]);

            allCompetitions = compRes.data || [];
            allParticipantsCache = partRes.data || [];

            // Sortierung absichern: Neueste Teilnehmer (höchste ID / neuestes Datum) immer oben
            allParticipantsCache.sort((a, b) => {
                if (a.created_at && b.created_at) {
                    const diff = new Date(b.created_at) - new Date(a.created_at);
                    if (diff !== 0) return diff;
                }
                return (Number(b.id) || 0) - (Number(a.id) || 0);
            });

            // Dropdown befüllen
            const compFilter = document.getElementById('filter-competition-select');
            if (compFilter) {
                let html = `<option value="">Alle Wettkämpfe anzeigen</option>`;
                allCompetitions.forEach(c => {
                    const selected = String(c.id) === String(preselectedCompetitionId) ? 'selected' : '';
                    html += `<option value="${window.AppUtils.escapeHtml(String(c.id))}" ${selected}>${window.AppUtils.escapeHtml(c.name)} (${window.AppUtils.formatDate(c.datum)})</option>`;
                });
                compFilter.innerHTML = html;
            }

        } catch (err) {
            console.error('Fehler beim Initialisieren der Daten:', err);
        }
    }

    /**
     * Ermittelt Teilnehmer-IDs eines bestimmten Wettkampfs
     */
    async function getCompetitionParticipantIds(compId) {
        if (!compId) return null;
        if (competitionParticipantIdsCache[compId]) {
            return competitionParticipantIdsCache[compId];
        }

        try {
            const { data, error } = await window.supabaseClient
                .from('starts')
                .select('participant_id')
                .eq('competition_id', compId);

            if (error) return [];
            const ids = [...new Set((data || []).map(s => String(s.participant_id)))];
            competitionParticipantIdsCache[compId] = ids;
            return ids;
        } catch (err) {
            console.error('Fehler beim Ermitteln der Teilnehmer:', err);
            return [];
        }
    }

    /**
     * Live-Suche nach Teilnehmern & Sofort-Anzeige beim Klick ins Feld
     * WICHTIG: Die zuletzt angelegten Teilnehmer erscheinen sofort ganz oben!
     */
    async function handleSearchParticipants() {
        const input = document.getElementById('search-participant-input');
        const resultsList = document.getElementById('participant-search-results');
        if (!input || !resultsList) return;

        const query = (input.value || '').trim().toLowerCase();

        // Falls Cache noch leer ist, frisch laden
        if (allParticipantsCache.length === 0) {
            try {
                const { data } = await window.supabaseClient
                    .from('participants')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (data) allParticipantsCache = data;
            } catch (err) {
                console.error('Fehler beim Laden:', err);
            }
        }

        // Ausgangsliste: Neueste Teilnehmer zuerst!
        let matches = [...allParticipantsCache].sort((a, b) => {
            if (a.created_at && b.created_at) {
                const diff = new Date(b.created_at) - new Date(a.created_at);
                if (diff !== 0) return diff;
            }
            return (Number(b.id) || 0) - (Number(a.id) || 0);
        });

        // Nach Wettkampf filtern, falls ausgewählt
        if (preselectedCompetitionId) {
            const participantIds = await getCompetitionParticipantIds(preselectedCompetitionId);
            const participantIdSet = new Set(participantIds);
            matches = matches.filter(p => participantIdSet.has(String(p.id)));
        }

        // Nach Name filtern, falls getippt
        if (query) {
            matches = matches.filter(p => {
                const fullName = `${p.vorname || ''} ${p.nachname || ''}`.toLowerCase();
                const reverseName = `${p.nachname || ''} ${p.vorname || ''}`.toLowerCase();
                return fullName.includes(query) || reverseName.includes(query);
            });
        }

        if (matches.length === 0) {
            resultsList.innerHTML = `
                <li class="search-empty">
                    ${query 
                        ? `Kein Teilnehmer für "${window.AppUtils.escapeHtml(query)}" gefunden.` 
                        : (preselectedCompetitionId ? 'Keine Teilnehmer für diesen Wettkampf eingetragen.' : 'Keine Teilnehmer vorhanden.')}
                </li>
            `;
            resultsList.style.display = 'block';
            return;
        }

        // Header
        let headerText = query 
            ? `🔍 Gefundene Teilnehmer (${matches.length})` 
            : (preselectedCompetitionId ? `🕒 Starter dieses Wettkampfs (Neueste zuerst)` : `🕒 Zuletzt angelegte Teilnehmer (${matches.length})`);

        let html = `
            <li class="search-dropdown-header">
                <span>${headerText}</span>
                <span style="font-size: 0.72rem; opacity: 0.8; font-weight: normal;">Klicken zum Auswählen</span>
            </li>
        `;

        matches.slice(0, 25).forEach((p, idx) => {
            const isNewest = (!query && idx === 0 && !preselectedCompetitionId);
            const badgeHtml = isNewest 
                ? `<span class="badge badge-ak" style="font-size: 0.7rem; margin-left: 6px;">Zuletzt angelegt</span>` 
                : '';

            html += `
                <li class="search-results-item" data-id="${window.AppUtils.escapeHtml(String(p.id))}">
                    <div>
                        <div style="font-weight: 700; color: var(--text-main); font-size: 0.98rem;">
                            ${window.AppUtils.escapeHtml(p.nachname || '')}, ${window.AppUtils.escapeHtml(p.vorname || '')}
                            ${badgeHtml}
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                            ID: ${p.id}
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
                const part = allParticipantsCache.find(p => String(p.id) === String(item.dataset.id));
                if (part) selectParticipant(part);
            };

            item.addEventListener('mousedown', onSelect);
            item.addEventListener('touchstart', onSelect);
        });
    }

    /**
     * Teilnehmer auswählen
     */
    function selectParticipant(participant) {
        selectedParticipant = participant;

        document.getElementById('selected-participant-name').textContent = `${participant.vorname} ${participant.nachname}`;
        document.getElementById('selected-participant-meta').textContent = `Teilnehmer ID: ${participant.id}`;
        document.getElementById('selected-participant-card').style.display = 'flex';
        
        const resultsList = document.getElementById('participant-search-results');
        if (resultsList) resultsList.style.display = 'none';

        const searchInput = document.getElementById('search-participant-input');
        if (searchInput) searchInput.value = '';

        // Schritt 2 einblenden und Starts laden
        document.getElementById('card-step-2').style.display = 'block';
        resetStartSelection();

        loadStartsForParticipant(participant.id);
    }

    /**
     * Teilnehmerauswahl zurücksetzen
     */
    function resetParticipantSelection() {
        selectedParticipant = null;
        document.getElementById('selected-participant-card').style.display = 'none';
        document.getElementById('card-step-2').style.display = 'none';
        resetStartSelection();

        const searchInput = document.getElementById('search-participant-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
    }

    /**
     * Lädt alle Starts für den gewählten Teilnehmer
     */
    async function loadStartsForParticipant(participantId) {
        const listContainer = document.getElementById('starts-selection-list');
        const badge = document.getElementById('starts-count-badge');
        listContainer.innerHTML = `<p style="color: var(--text-muted); padding: 0.5rem 0;">Lade Starts...</p>`;

        try {
            let startsQuery = window.supabaseClient
                .from('starts')
                .select('*')
                .eq('participant_id', participantId)
                .order('created_at', { ascending: false });

            if (preselectedCompetitionId) {
                startsQuery = startsQuery.eq('competition_id', preselectedCompetitionId);
            }

            const { data: starts, error: startsErr } = await startsQuery;

            if (startsErr) {
                console.error('Fehler beim Laden der Starts:', startsErr);
                listContainer.innerHTML = `<div class="alert alert-danger">Fehler beim Laden der Starts: ${startsErr.message}</div>`;
                return;
            }

            if (!starts || starts.length === 0) {
                badge.textContent = '0 Starts';
                listContainer.innerHTML = `
                    <div class="alert alert-warning" style="margin-bottom: 0;">
                        ⚠️ Dieser Schütze hat noch keine Starts ${preselectedCompetitionId ? 'in diesem Wettkampf' : ''}.
                        <br><a href="wettkaempfe.html" style="font-weight: 700; color: inherit; text-decoration: underline;">Zum Wettkampf, um Starter hinzuzufügen.</a>
                    </div>
                `;
                return;
            }

            badge.textContent = `${starts.length} Start${starts.length > 1 ? 's' : ''}`;

            const compIds = [...new Set(starts.map(s => s.competition_id))];
            const teamIds = [...new Set(starts.map(s => s.team_id).filter(Boolean))];
            const startIds = starts.map(s => s.id);

            const [compsRes, teamsRes, resultsRes] = await Promise.all([
                window.supabaseClient.from('competitions').select('*').in('id', compIds),
                teamIds.length > 0 ? window.supabaseClient.from('teams').select('*').in('id', teamIds) : Promise.resolve({ data: [] }),
                window.supabaseClient.from('results').select('*').in('start_id', startIds)
            ]);

            const compMap = {};
            (compsRes.data || []).forEach(c => compMap[c.id] = c);

            const teamMap = {};
            (teamsRes.data || []).forEach(t => teamMap[t.id] = t);

            const resultsByStart = {};
            (resultsRes.data || []).forEach(r => {
                if (!resultsByStart[r.start_id]) resultsByStart[r.start_id] = [];
                resultsByStart[r.start_id].push(r);
            });

            participantStarts = starts.map(s => {
                return {
                    ...s,
                    competition: compMap[s.competition_id] || { name: 'Unbekannter Wettkampf', anzahl_ergebnisse: 3 },
                    team: s.team_id ? (teamMap[s.team_id] || { name: 'Unbekanntes Team' }) : null,
                    results: (resultsByStart[s.id] || []).sort((a, b) => a.nummer - b.nummer)
                };
            });

            renderStartsSelectionList(participantStarts);

            // Wenn es genau 1 Start gibt, diesen automatisch vorauswählen
            if (participantStarts.length === 1) {
                selectStart(participantStarts[0]);
            }

        } catch (err) {
            console.error('Unerwarteter Fehler beim Laden der Starts:', err);
            listContainer.innerHTML = `<div class="alert alert-danger">Fehler: ${err.message}</div>`;
        }
    }

    /**
     * Rendert die Liste der wählbaren Starts
     */
    function renderStartsSelectionList(starts) {
        const container = document.getElementById('starts-selection-list');
        let html = '';

        starts.forEach((s, idx) => {
            const teamLabel = s.team ? s.team.name : 'Einzelstart';
            const akBadge = s.ak ? '<span class="badge badge-ak" style="margin-left: 4px;">AK</span>' : '';
            const isSelected = selectedStart && selectedStart.id === s.id;

            let resultSummary = '<span style="color: var(--text-muted); font-size: 0.85rem;">Noch keine Ergebnisse</span>';
            if (s.results && s.results.length > 0) {
                const values = s.results.map(r => window.AppUtils.formatNumber(r.wert));
                const sum = s.results.reduce((acc, cur) => acc + (Number(cur.wert) || 0), 0);
                resultSummary = `<span style="color: var(--primary); font-weight: 700; font-size: 0.85rem;">${values.join(' / ')} (Gesamt: ${window.AppUtils.formatNumber(sum)})</span>`;
            }

            html += `
                <div class="card start-select-card ${isSelected ? 'selected-card' : ''}" data-start-id="${s.id}" style="cursor: pointer; padding: 0.85rem 1rem; margin-bottom: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); transition: all 0.2s ease;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="font-weight: 700; color: var(--primary-dark); font-size: 0.95rem;">
                                Start ${idx + 1}: ${window.AppUtils.escapeHtml(s.competition.name)}
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-main); margin-top: 0.2rem;">
                                🛡️ ${window.AppUtils.escapeHtml(teamLabel)} ${akBadge}
                            </div>
                            <div style="margin-top: 0.35rem;">
                                ${resultSummary}
                            </div>
                        </div>
                        <button type="button" class="btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}">
                            ${isSelected ? 'Ausgewählt ✓' : 'Auswählen &rarr;'}
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.start-select-card').forEach(card => {
            card.addEventListener('click', () => {
                const start = participantStarts.find(s => s.id === card.dataset.startId);
                if (start) selectStart(start);
            });
        });
    }

    /**
     * Konkreten Start auswählen und Formular für Schritt 3 aufbauen
     */
    function selectStart(start) {
        selectedStart = start;

        // Markierung in Schritt 2 aktualisieren
        renderStartsSelectionList(participantStarts);

        // Header Schritt 3
        const pName = `${selectedParticipant.vorname} ${selectedParticipant.nachname}`;
        const teamName = start.team ? start.team.name : 'Einzelstart';
        const akText = start.ak ? ' (Außer Konkurrenz / AK)' : '';

        document.getElementById('entry-start-title').textContent = `${pName} – ${start.competition.name}`;
        document.getElementById('entry-start-subtitle').textContent = `Mannschaft: ${teamName}${akText}`;
        document.getElementById('start-status-badge').className = 'badge badge-status-laufend';
        document.getElementById('start-status-badge').textContent = 'Start gewählt';

        // Felder aufbauen
        const inputsContainer = document.getElementById('score-inputs-container');
        const count = start.competition.anzahl_ergebnisse || 3;
        let html = '';

        // Vorhandene Ergebnisse mappen
        const existingResultsMap = {};
        if (start.results) {
            start.results.forEach(r => {
                existingResultsMap[r.nummer] = r.wert;
            });
        }

        for (let i = 1; i <= count; i++) {
            const existingVal = existingResultsMap[i] !== undefined ? existingResultsMap[i] : '';
            html += `
                <div class="score-input-card">
                    <label for="score-input-${i}">Ergebnis ${i}</label>
                    <input type="text" 
                           id="score-input-${i}" 
                           class="score-input-field" 
                           data-num="${i}" 
                           value="${existingVal !== '' ? existingVal : ''}" 
                           placeholder="0.00" 
                           inputmode="decimal" 
                           autocomplete="off">
                </div>
            `;
        }

        inputsContainer.innerHTML = html;

        // Event-Listener für Live-Summe
        inputsContainer.querySelectorAll('.score-input-field').forEach(input => {
            input.addEventListener('input', calculateLiveTotal);
        });

        // Summe sofort berechnen
        calculateLiveTotal();

        // Formular einblenden
        document.getElementById('no-start-selected-hint').style.display = 'none';
        document.getElementById('form-results-entry').style.display = 'block';

        // Fokus auf das erste leere Feld oder Feld 1
        const firstField = document.getElementById('score-input-1');
        if (firstField) firstField.focus();
    }

    /**
     * Startauswahl zurücksetzen
     */
    function resetStartSelection() {
        selectedStart = null;
        document.getElementById('no-start-selected-hint').style.display = 'block';
        document.getElementById('form-results-entry').style.display = 'none';
        document.getElementById('start-status-badge').className = 'badge badge-single';
        document.getElementById('start-status-badge').textContent = 'Kein Start gewählt';
    }

    /**
     * Berechnet die Live-Summe der eingegebenen Ergebnisse
     */
    function calculateLiveTotal() {
        const inputFields = document.querySelectorAll('.score-input-field');
        let total = 0;
        let hasAnyInput = false;

        inputFields.forEach(input => {
            const val = window.AppUtils.parseNumber(input.value);
            if (val !== null) {
                total += val;
                hasAnyInput = true;
            }
        });

        document.getElementById('live-total-score').textContent = window.AppUtils.formatNumber(total);
    }

    /**
     * Ergebnisse in Supabase speichern (Delete & Insert in 'results')
     * Hinweis: Leere Felder sind erlaubt für Zwischenstände
     */
    async function handleSaveResults(e) {
        e.preventDefault();

        if (!selectedStart) {
            window.AppUtils.showNotification('Kein Start ausgewählt.', 'warning');
            return;
        }

        const inputFields = document.querySelectorAll('.score-input-field');
        const resultsToInsert = [];
        let totalScore = 0;

        for (const input of inputFields) {
            const num = parseInt(input.dataset.num, 10);
            const rawValue = (input.value || '').trim();

            // Leere Felder erlauben (Zwischenergebnisse)
            if (!rawValue) continue;

            const val = window.AppUtils.parseNumber(rawValue);

            if (val === null) {
                window.AppUtils.showNotification(`Bitte einen gültigen Wert für Ergebnis ${num} eingeben (z. B. 12,40).`, 'warning');
                input.focus();
                return;
            }

            if (val < 0) {
                window.AppUtils.showNotification(`Ergebnis ${num} darf nicht negativ sein.`, 'warning');
                input.focus();
                return;
            }

            resultsToInsert.push({
                start_id: selectedStart.id,
                nummer: num,
                wert: val
            });

            totalScore += val;
        }

        if (resultsToInsert.length === 0) {
            window.AppUtils.showNotification('Bitte mindestens ein Ergebnis eingeben.', 'warning');
            return;
        }

        const submitBtn = document.getElementById('btn-save-results');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Speichere Ergebnisse...';

        try {
            // 1. Vorhandene Ergebnisse für diesen Start löschen
            const { error: deleteErr } = await window.supabaseClient
                .from('results')
                .delete()
                .eq('start_id', selectedStart.id);

            if (deleteErr) {
                console.error('Fehler beim Bereinigen alter Ergebnisse:', deleteErr);
                window.AppUtils.showNotification(`❌ Fehler beim Speichern: ${deleteErr.message}`, 'error');
                return;
            }

            // 2. Neue Ergebnisse einfügen
            const { error: insertErr } = await window.supabaseClient
                .from('results')
                .insert(resultsToInsert);

            if (insertErr) {
                console.error('Fehler beim Einfügen der Ergebnisse:', insertErr);
                window.AppUtils.showNotification(`❌ Fehler beim Speichern: ${insertErr.message}`, 'error');
                return;
            }

            const pName = `${selectedParticipant.vorname} ${selectedParticipant.nachname}`;
            window.AppUtils.showNotification(`✅ Ergebnisse für ${pName} erfolgreich gespeichert! (Gesamt: ${window.AppUtils.formatNumber(totalScore)})`, 'success', 5000);

            // Aktualisiere Starts-Liste links
            await loadStartsForParticipant(selectedParticipant.id);

            // Ausgewählten Start aktualisieren
            const updatedStart = participantStarts.find(s => s.id === selectedStart.id);
            if (updatedStart) {
                selectedStart = updatedStart;
            }

        } catch (err) {
            console.error('Unerwarteter Fehler beim Speichern:', err);
            window.AppUtils.showNotification(`❌ Fehler: ${err.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 Ergebnisse speichern';
        }
    }

})();