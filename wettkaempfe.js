/**
 * SSV 1928 Sulzbach e.V. - Wettkampfverwaltung
 * Logik für wettkaempfe.html
 */

(function () {
    'use strict';

    let allCompetitions = [];
    let startsCountByComp = {};
    let teamsCountByComp = {};

    document.addEventListener('DOMContentLoaded', () => {
        initApp();
    });

    function initApp() {
        if (!window.supabaseClient) {
            console.error('Supabase Client nicht verfügbar.');
            window.AppUtils.showNotification('Supabase-Client konnte nicht geladen werden.', 'error');
            return;
        }

        // Standard-Datum auf heute setzen
        const dateInput = document.getElementById('comp-date');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        // Form Submit: Anlegen
        const addForm = document.getElementById('form-add-competition');
        if (addForm) {
            addForm.addEventListener('submit', handleAddCompetition);
        }

        // Suche
        const searchInput = document.getElementById('search-competitions');
        if (searchInput) {
            searchInput.addEventListener('input', window.AppUtils.debounce(handleSearch, 200));
        }

        // Wettkämpfe laden
        loadCompetitions();
    }

    /**
     * Lädt alle Wettkämpfe aus Supabase
     */
    async function loadCompetitions() {
        const container = document.getElementById('competitions-list-container');
        container.innerHTML = `<div class="empty-state"><p>Lade Wettkämpfe...</p></div>`;

        try {
            // Lade Wettkämpfe, Teams und Starts parallel
            const [compRes, teamsRes, startsRes] = await Promise.all([
                window.supabaseClient
                    .from('competitions')
                    .select('*')
                    .order('datum', { ascending: false })
                    .order('created_at', { ascending: false }),
                window.supabaseClient
                    .from('teams')
                    .select('competition_id'),
                window.supabaseClient
                    .from('starts')
                    .select('competition_id')
            ]);

            if (compRes.error) {
                console.error('Fehler beim Laden der Wettkämpfe:', compRes.error);
                container.innerHTML = `<div class="alert alert-danger">❌ Wettkämpfe konnten nicht geladen werden: ${window.AppUtils.escapeHtml(compRes.error.message)}</div>`;
                window.AppUtils.showNotification('❌ Wettkämpfe konnten nicht geladen werden.', 'error');
                return;
            }

            allCompetitions = compRes.data || [];

            // Zähle Teams je Wettkampf
            teamsCountByComp = {};
            if (teamsRes.data) {
                teamsRes.data.forEach(t => {
                    teamsCountByComp[t.competition_id] = (teamsCountByComp[t.competition_id] || 0) + 1;
                });
            }

            // Zähle Starts je Wettkampf
            startsCountByComp = {};
            if (startsRes.data) {
                startsRes.data.forEach(s => {
                    startsCountByComp[s.competition_id] = (startsCountByComp[s.competition_id] || 0) + 1;
                });
            }

            // Update Badge
            const badge = document.getElementById('competition-count-badge');
            if (badge) badge.textContent = allCompetitions.length;

            renderCompetitions(allCompetitions);

        } catch (err) {
            console.error('Unerwarteter Fehler beim Laden der Wettkämpfe:', err);
            container.innerHTML = `<div class="alert alert-danger">❌ Unerwarteter Fehler: ${window.AppUtils.escapeHtml(err.message)}</div>`;
        }
    }

    /**
     * Rendert die Wettkämpfe als Tabelle / Übersicht
     */
    function renderCompetitions(competitions) {
        const container = document.getElementById('competitions-list-container');

        if (!competitions || competitions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎯</div>
                    <div class="empty-state-title">Keine Wettkämpfe gefunden</div>
                    <p>Erstelle oben einen neuen Wettkampf, um zu starten.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Wettkampfname</th>
                            <th>Datum</th>
                            <th>Status</th>
                            <th>Regeln / Modus</th>
                            <th>Starter & Teams</th>
                            <th style="text-align: right;">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        competitions.forEach(c => {
            const statusBadge = c.status === 'laufend' ? '<span class="badge badge-status-laufend">Laufend</span>' :
                                c.status === 'abgeschlossen' ? '<span class="badge badge-status-abgeschlossen">Beendet</span>' :
                                '<span class="badge badge-status-geplant">Geplant</span>';

            const teamsCount = teamsCountByComp[c.id] || 0;
            const startsCount = startsCountByComp[c.id] || 0;

            html += `
                <tr>
                    <td>
                        <strong><a href="wettkampf.html?id=${c.id}" style="color: var(--primary-dark); text-decoration: none;">${window.AppUtils.escapeHtml(c.name)}</a></strong>
                    </td>
                    <td>${window.AppUtils.formatDate(c.datum)}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <span style="font-size: 0.85rem; color: var(--text-muted);">
                            ${c.anzahl_ergebnisse} Ergebnisse &bull; Teamgröße max. ${c.teamgroesse}
                        </span>
                    </td>
                    <td>
                        <span class="badge badge-team">${teamsCount} Team${teamsCount !== 1 ? 's' : ''}</span>
                        <span class="badge badge-single" style="margin-left: 4px;">${startsCount} Start${startsCount !== 1 ? 's' : ''}</span>
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                        <a href="wettkampf.html?id=${c.id}" class="btn btn-sm btn-primary" title="Details, Teams und Starter verwalten">
                            ⚙️ Details & Starter
                        </a>
                        <a href="ergebnisse-eingabe.html?competition_id=${c.id}" class="btn btn-sm btn-outline" title="Ergebnisse für diesen Wettkampf eintragen">
                            📝 Eingabe
                        </a>
                        <a href="ergebnisse.html?competition_id=${c.id}" class="btn btn-sm btn-outline" title="Rangliste & Auswertung">
                            🏆 Rangliste
                        </a>
                        <a href="qrcode.html?competition_id=${c.id}" class="btn btn-sm btn-outline" title="Live-Anzeige & QR-Code für Zuschauer">
                            📺 Live-QR
                        </a>
                        <button type="button" class="btn btn-sm btn-danger btn-delete-c" data-id="${c.id}" data-name="${window.AppUtils.escapeHtml(c.name)}" title="Wettkampf löschen">
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
        container.querySelectorAll('.btn-delete-c').forEach(btn => {
            btn.addEventListener('click', () => {
                handleDeleteCompetition(btn.dataset.id, btn.dataset.name);
            });
        });
    }

    /**
     * Suchfilter
     */
    function handleSearch(e) {
        const query = (e.target.value || '').trim().toLowerCase();
        if (!query) {
            renderCompetitions(allCompetitions);
            return;
        }

        const filtered = allCompetitions.filter(c => {
            return (c.name || '').toLowerCase().includes(query) || (c.status || '').toLowerCase().includes(query);
        });

        renderCompetitions(filtered);
    }

    /**
     * Neuen Wettkampf anlegen
     */
    async function handleAddCompetition(e) {
        e.preventDefault();

        const nameInput = document.getElementById('comp-name');
        const dateInput = document.getElementById('comp-date');
        const resultsCountInput = document.getElementById('comp-results-count');
        const teamSizeInput = document.getElementById('comp-team-size');
        const statusSelect = document.getElementById('comp-status');
        const submitBtn = document.getElementById('btn-save-competition');

        const name = (nameInput.value || '').trim();
        const datum = dateInput.value;
        const anzahl_ergebnisse = parseInt(resultsCountInput.value, 10) || 3;
        const teamgroesse = parseInt(teamSizeInput.value, 10) || 3;
        const status = statusSelect.value || 'geplant';

        if (!name || !datum) {
            window.AppUtils.showNotification('Bitte Name und Datum angeben.', 'warning');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Speichere...';

        try {
            const { data, error } = await window.supabaseClient
                .from('competitions')
                .insert([{
                    name,
                    datum,
                    anzahl_ergebnisse,
                    teamgroesse,
                    status
                }])
                .select();

            if (error) {
                console.error('Fehler beim Anlegen des Wettkampfs:', error);
                window.AppUtils.showNotification(`❌ Fehler beim Speichern: ${error.message}`, 'error');
                return;
            }

            window.AppUtils.showNotification(`Wettkampf "${name}" erfolgreich angelegt!`, 'success');
            nameInput.value = '';

            await loadCompetitions();

            // Weiterleitung direkt zur Wettkampfdetailseite anbieten
            if (data && data.length > 0) {
                const newCompId = data[0].id;
                setTimeout(() => {
                    if (confirm(`Wettkampf "${name}" wurde angelegt!\n\nMöchtest du jetzt direkt Teams und Starter für diesen Wettkampf verwalten?`)) {
                        window.location.href = `wettkampf.html?id=${newCompId}`;
                    }
                }, 300);
            }

        } catch (err) {
            console.error('Unerwarteter Fehler:', err);
            window.AppUtils.showNotification(`❌ Unerwarteter Fehler: ${err.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '🎯 Wettkampf anlegen';
        }
    }

    /**
     * Wettkampf löschen
     */
    async function handleDeleteCompetition(id, name) {
        if (!confirm(`Möchtest du den Wettkampf "${name}" wirklich löschen?\n\nACHTUNG: Alle zugehörigen Teams, Starts und Ergebnisse werden unwiderruflich gelöscht!`)) {
            return;
        }

        try {
            // Finde alle Starts des Wettkampfs, um Results zu bereinigen
            const { data: compStarts } = await window.supabaseClient
                .from('starts')
                .select('id')
                .eq('competition_id', id);

            if (compStarts && compStarts.length > 0) {
                const startIds = compStarts.map(s => s.id);
                await window.supabaseClient.from('results').delete().in('start_id', startIds);
            }

            // Lösche Starts und Teams
            await window.supabaseClient.from('starts').delete().eq('competition_id', id);
            await window.supabaseClient.from('teams').delete().eq('competition_id', id);

            // Lösche Wettkampf
            const { error } = await window.supabaseClient
                .from('competitions')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Fehler beim Löschen des Wettkampfs:', error);
                window.AppUtils.showNotification(`❌ Fehler beim Löschen: ${error.message}`, 'error');
                return;
            }

            window.AppUtils.showNotification(`Wettkampf "${name}" wurde gelöscht.`, 'info');
            await loadCompetitions();

        } catch (err) {
            console.error('Unerwarteter Fehler beim Löschen:', err);
            window.AppUtils.showNotification(`❌ Unerwarteter Fehler: ${err.message}`, 'error');
        }
    }

})();
