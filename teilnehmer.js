/**
 * SSV 1928 Sulzbach e.V. - Teilnehmerverwaltung
 * Logik für teilnehmer.html
 */

(function () {
    'use strict';

    let allParticipants = [];
    let startsCountByParticipant = {};
    let currentSortMode = 'recent'; // 'recent' | 'alpha'
    let lastAddedParticipantId = null;

    document.addEventListener('DOMContentLoaded', () => {
        initApp();
    });

    function initApp() {
        if (!window.supabaseClient) {
            console.error('Supabase Client nicht verfügbar.');
            window.AppUtils.showNotification('Supabase-Client konnte nicht geladen werden.', 'error');
            return;
        }

        // Form Submit: Anlegen
        const addForm = document.getElementById('form-add-participant');
        if (addForm) {
            addForm.addEventListener('submit', handleAddParticipant);
        }

        // Sortierung Umschalten
        const sortSelect = document.getElementById('select-participant-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                currentSortMode = e.target.value;
                applySortAndRender();
            });
        }

        // Suche & Klick ins Suchfeld
        const searchInput = document.getElementById('search-participants');
        if (searchInput) {
            searchInput.addEventListener('input', window.AppUtils.debounce(handleSearch, 150));

            searchInput.addEventListener('focus', () => {
                handleShowRecentDropdown();
            });

            searchInput.addEventListener('click', () => {
                handleShowRecentDropdown();
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const resultsList = document.getElementById('participant-search-results');
                    if (resultsList) resultsList.style.display = 'none';
                }
            });
        }

        // Klick außerhalb schließt Such-Dropdown
        document.addEventListener('click', (e) => {
            const searchWrapper = document.querySelector('.search-wrapper');
            const resultsList = document.getElementById('participant-search-results');
            if (searchWrapper && !searchWrapper.contains(e.target) && resultsList) {
                resultsList.style.display = 'none';
            }
        });

        // Edit Modal Events
        const editForm = document.getElementById('form-edit-participant');
        if (editForm) {
            editForm.addEventListener('submit', handleSaveEdit);
        }

        const btnCloseModal = document.getElementById('btn-close-modal');
        const btnCancelEdit = document.getElementById('btn-cancel-edit');
        if (btnCloseModal) btnCloseModal.addEventListener('click', closeEditModal);
        if (btnCancelEdit) btnCancelEdit.addEventListener('click', closeEditModal);

        // Daten laden
        loadParticipants();
    }

    /**
     * Lädt alle Teilnehmer aus Supabase (Neueste zuerst)
     */
    async function loadParticipants() {
        const container = document.getElementById('participants-table-container');
        container.innerHTML = `<div class="empty-state"><p>Lade Teilnehmer...</p></div>`;

        try {
            // Lade Teilnehmer nach created_at absteigend und Starts parallel
            const [participantsRes, startsRes] = await Promise.all([
                window.supabaseClient
                    .from('participants')
                    .select('*')
                    .order('created_at', { ascending: false }),
                window.supabaseClient
                    .from('starts')
                    .select('participant_id')
            ]);

            if (participantsRes.error) {
                console.error('Fehler beim Laden der Teilnehmer:', participantsRes.error);
                container.innerHTML = `<div class="alert alert-danger">❌ Teilnehmer konnten nicht geladen werden: ${window.AppUtils.escapeHtml(participantsRes.error.message)}</div>`;
                window.AppUtils.showNotification('❌ Teilnehmer konnten nicht geladen werden.', 'error');
                return;
            }

            allParticipants = participantsRes.data || [];

            // Zähle Starts je Teilnehmer
            startsCountByParticipant = {};
            if (startsRes.data) {
                startsRes.data.forEach(s => {
                    startsCountByParticipant[s.participant_id] = (startsCountByParticipant[s.participant_id] || 0) + 1;
                });
            }

            // Update Badge
            const badge = document.getElementById('participant-count-badge');
            if (badge) badge.textContent = allParticipants.length;

            applySortAndRender();

        } catch (err) {
            console.error('Unerwarteter Fehler beim Laden der Teilnehmer:', err);
            container.innerHTML = `<div class="alert alert-danger">❌ Unerwarteter Fehler: ${window.AppUtils.escapeHtml(err.message)}</div>`;
        }
    }

    /**
     * Sortiert und rendert die Teilnehmer-Tabelle
     */
    function applySortAndRender() {
        const searchInput = document.getElementById('search-participants');
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();

        let list = [...allParticipants];

        // Suchfilter
        if (query) {
            list = list.filter(p => {
                const fullName = `${p.vorname || ''} ${p.nachname || ''}`.toLowerCase();
                const revFullName = `${p.nachname || ''} ${p.vorname || ''}`.toLowerCase();
                return fullName.includes(query) || revFullName.includes(query);
            });
        }

        // Sortierung
        if (currentSortMode === 'alpha') {
            list.sort((a, b) => {
                const nameA = `${a.nachname || ''} ${a.vorname || ''}`.toLowerCase();
                const nameB = `${b.nachname || ''} ${b.vorname || ''}`.toLowerCase();
                return nameA.localeCompare(nameB, 'de');
            });
        } else {
            // 'recent': Neueste zuerst!
            list.sort((a, b) => {
                if (a.created_at && b.created_at) {
                    const diff = new Date(b.created_at) - new Date(a.created_at);
                    if (diff !== 0) return diff;
                }
                return (Number(b.id) || 0) - (Number(a.id) || 0);
            });
        }

        renderParticipantsTable(list);
    }

    /**
     * Rendert die Tabelle der Teilnehmer
     */
    function renderParticipantsTable(participants) {
        const container = document.getElementById('participants-table-container');

        if (!participants || participants.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <div class="empty-state-title">Keine Teilnehmer gefunden</div>
                    <p>Lege oben einen neuen Teilnehmer an oder passe deinen Suchfilter an.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th style="width: 50px;">#</th>
                            <th>Nachname</th>
                            <th>Vorname</th>
                            <th>Status / Starts</th>
                            <th style="text-align: right;">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        participants.forEach((p, index) => {
            const startsCount = startsCountByParticipant[p.id] || 0;
            const startsBadge = startsCount > 0 
                ? `<span class="badge badge-team">${startsCount} Start${startsCount > 1 ? 's' : ''}</span>`
                : `<span class="badge badge-single">0 Starts</span>`;

            // Neu-Badge, wenn gerade angelegt
            const isJustAdded = lastAddedParticipantId && String(lastAddedParticipantId) === String(p.id);
            const rowHighlight = isJustAdded ? 'style="background-color: var(--primary-bg); font-weight: bold;"' : '';
            const newBadge = isJustAdded ? '<span class="badge badge-ak" style="margin-left: 6px; font-size: 0.72rem;">Neu angelegt</span>' : '';

            html += `
                <tr ${rowHighlight}>
                    <td>${index + 1}</td>
                    <td><strong>${window.AppUtils.escapeHtml(p.nachname || '')}</strong> ${newBadge}</td>
                    <td>${window.AppUtils.escapeHtml(p.vorname || '')}</td>
                    <td>${startsBadge}</td>
                    <td style="text-align: right; white-space: nowrap;">
                        <button type="button" class="btn btn-sm btn-outline btn-edit-p" data-id="${p.id}" data-vorname="${window.AppUtils.escapeHtml(p.vorname || '')}" data-nachname="${window.AppUtils.escapeHtml(p.nachname || '')}">
                            ✏️ Bearbeiten
                        </button>
                        <button type="button" class="btn btn-sm btn-danger btn-delete-p" data-id="${p.id}" data-name="${window.AppUtils.escapeHtml((p.vorname || '') + ' ' + (p.nachname || ''))}" data-starts="${startsCount}">
                            🗑️ Löschen
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

        // Event-Listener für Bearbeiten & Löschen
        container.querySelectorAll('.btn-edit-p').forEach(btn => {
            btn.addEventListener('click', () => {
                openEditModal(btn.dataset.id, btn.dataset.vorname, btn.dataset.nachname);
            });
        });

        container.querySelectorAll('.btn-delete-p').forEach(btn => {
            btn.addEventListener('click', () => {
                handleDeleteParticipant(btn.dataset.id, btn.dataset.name, parseInt(btn.dataset.starts, 10));
            });
        });
    }

    /**
     * Zeigt das Dropdown der letzten Teilnehmer im Suchfeld an
     */
    function handleShowRecentDropdown() {
        const input = document.getElementById('search-participants');
        const resultsList = document.getElementById('participant-search-results');
        if (!input || !resultsList || allParticipants.length === 0) return;

        const query = (input.value || '').trim().toLowerCase();

        // Neueste Teilnehmer zuerst
        let matches = [...allParticipants].sort((a, b) => {
            if (a.created_at && b.created_at) {
                const diff = new Date(b.created_at) - new Date(a.created_at);
                if (diff !== 0) return diff;
            }
            return (Number(b.id) || 0) - (Number(a.id) || 0);
        });

        if (query) {
            matches = matches.filter(p => {
                const fullName = `${p.vorname || ''} ${p.nachname || ''}`.toLowerCase();
                const revFullName = `${p.nachname || ''} ${p.vorname || ''}`.toLowerCase();
                return fullName.includes(query) || revFullName.includes(query);
            });
        }

        if (matches.length === 0) {
            resultsList.style.display = 'none';
            return;
        }

        let headerText = query ? `🔍 Gefundene Teilnehmer (${matches.length})` : `🕒 Zuletzt angelegte Teilnehmer (${matches.length})`;

        let html = `
            <li class="search-dropdown-header">
                <span>${headerText}</span>
                <span style="font-size: 0.72rem; opacity: 0.8; font-weight: normal;">Klicken zum Filtern</span>
            </li>
        `;

        matches.slice(0, 15).forEach((p, idx) => {
            const isNewest = (!query && idx === 0);
            const badgeHtml = isNewest 
                ? `<span class="badge badge-ak" style="font-size: 0.7rem; margin-left: 6px;">Zuletzt angelegt</span>`
                : '';

            html += `
                <li class="search-results-item" data-name="${window.AppUtils.escapeHtml(p.nachname + ' ' + p.vorname)}">
                    <div>
                        <div style="font-weight: 700; color: var(--text-main); font-size: 0.98rem;">
                            ${window.AppUtils.escapeHtml(p.nachname || '')}, ${window.AppUtils.escapeHtml(p.vorname || '')}
                            ${badgeHtml}
                        </div>
                    </div>
                    <span class="btn btn-sm btn-outline" style="pointer-events: none;">Filtern &rarr;</span>
                </li>
            `;
        });

        resultsList.innerHTML = html;
        resultsList.style.display = 'block';

        resultsList.querySelectorAll('.search-results-item').forEach(item => {
            const onSelect = (e) => {
                e.preventDefault();
                e.stopPropagation();
                input.value = item.dataset.name;
                resultsList.style.display = 'none';
                applySortAndRender();
            };
            item.addEventListener('mousedown', onSelect);
            item.addEventListener('touchstart', onSelect);
        });
    }

    /**
     * Suchfilter Eingabe-Handler
     */
    function handleSearch() {
        handleShowRecentDropdown();
        applySortAndRender();
    }

    /**
     * Neuen Teilnehmer speichern
     */
    async function handleAddParticipant(e) {
        e.preventDefault();

        const vornameInput = document.getElementById('vorname');
        const nachnameInput = document.getElementById('nachname');
        const submitBtn = document.getElementById('btn-save-participant');

        const vorname = (vornameInput.value || '').trim();
        const nachname = (nachnameInput.value || '').trim();

        if (!vorname || !nachname) {
            window.AppUtils.showNotification('Bitte Vor- und Nachnamen eingeben.', 'warning');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Speichere...';

        try {
            const { data, error } = await window.supabaseClient
                .from('participants')
                .insert([{ vorname, nachname }])
                .select();

            if (error) {
                console.error('Fehler beim Anlegen des Teilnehmers:', error);
                window.AppUtils.showNotification(`❌ Fehler beim Speichern: ${error.message}`, 'error');
                return;
            }

            const newId = (data && data[0]) ? data[0].id : null;
            lastAddedParticipantId = newId;

            window.AppUtils.showNotification(`✅ Teilnehmer "${vorname} ${nachname}" erfolgreich angelegt!`, 'success');
            vornameInput.value = '';
            nachnameInput.value = '';
            vornameInput.focus();

            // Neueste zuerst aktivieren, damit Max Müller direkt ganz oben steht!
            currentSortMode = 'recent';
            const sortSelect = document.getElementById('select-participant-sort');
            if (sortSelect) sortSelect.value = 'recent';

            await loadParticipants();

        } catch (err) {
            console.error('Unerwarteter Fehler:', err);
            window.AppUtils.showNotification(`❌ Unerwarteter Fehler: ${err.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 Teilnehmer speichern';
        }
    }

    /**
     * Edit Modal öffnen
     */
    function openEditModal(id, vorname, nachname) {
        document.getElementById('edit-id').value = id;
        document.getElementById('edit-vorname').value = vorname;
        document.getElementById('edit-nachname').value = nachname;
        const modal = document.getElementById('edit-modal');
        modal.style.display = 'flex';
    }

    /**
     * Edit Modal schließen
     */
    function closeEditModal() {
        const modal = document.getElementById('edit-modal');
        modal.style.display = 'none';
    }

    /**
     * Bearbeiteten Teilnehmer speichern
     */
    async function handleSaveEdit(e) {
        e.preventDefault();

        const id = document.getElementById('edit-id').value;
        const vorname = (document.getElementById('edit-vorname').value || '').trim();
        const nachname = (document.getElementById('edit-nachname').value || '').trim();

        if (!vorname || !nachname) {
            window.AppUtils.showNotification('Bitte Vor- und Nachnamen ausfüllen.', 'warning');
            return;
        }

        try {
            const { error } = await window.supabaseClient
                .from('participants')
                .update({ vorname, nachname })
                .eq('id', id);

            if (error) {
                console.error('Fehler beim Aktualisieren des Teilnehmers:', error);
                window.AppUtils.showNotification(`❌ Fehler beim Aktualisieren: ${error.message}`, 'error');
                return;
            }

            window.AppUtils.showNotification(`Teilnehmer "${vorname} ${nachname}" erfolgreich aktualisiert!`, 'success');
            closeEditModal();
            await loadParticipants();

        } catch (err) {
            console.error('Unerwarteter Fehler beim Bearbeiten:', err);
            window.AppUtils.showNotification(`❌ Unerwarteter Fehler: ${err.message}`, 'error');
        }
    }

    /**
     * Teilnehmer löschen
     */
    async function handleDeleteParticipant(id, name, startsCount) {
        let confirmMsg = `Möchtest du den Teilnehmer "${name}" wirklich löschen?`;
        if (startsCount > 0) {
            confirmMsg += `\n\nACHTUNG: Dieser Teilnehmer hat bereits ${startsCount} Start(s). Die zugehörigen Starts und Ergebnisse werden ggf. ebenfalls gelöscht!`;
        }

        if (!confirm(confirmMsg)) return;

        try {
            if (startsCount > 0) {
                const { data: userStarts } = await window.supabaseClient
                    .from('starts')
                    .select('id')
                    .eq('participant_id', id);

                if (userStarts && userStarts.length > 0) {
                    const startIds = userStarts.map(s => s.id);
                    await window.supabaseClient.from('results').delete().in('start_id', startIds);
                    await window.supabaseClient.from('starts').delete().eq('participant_id', id);
                }
            }

            const { error } = await window.supabaseClient
                .from('participants')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Fehler beim Löschen des Teilnehmers:', error);
                window.AppUtils.showNotification(`❌ Fehler beim Löschen: ${error.message}`, 'error');
                return;
            }

            window.AppUtils.showNotification(`Teilnehmer "${name}" wurde gelöscht.`, 'info');
            await loadParticipants();

        } catch (err) {
            console.error('Unerwarteter Fehler beim Löschen:', err);
            window.AppUtils.showNotification(`❌ Unerwarteter Fehler: ${err.message}`, 'error');
        }
    }

})();
