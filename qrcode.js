/**
 * SSV 1928 Sulzbach e.V. - QR-Code Generator für Live-Ergebnisse
 * Logik für qrcode.html
 */

(function () {
    'use strict';

    let allCompetitions = [];
    let currentCompId = null;

    document.addEventListener('DOMContentLoaded', () => {
        init();
    });

    async function init() {
        if (!window.supabaseClient) {
            console.error('Supabase Client nicht verfügbar.');
            window.AppUtils?.showNotification('Supabase-Client konnte nicht geladen werden.', 'error');
            return;
        }

        setupEvents();
        await loadCompetitions();
    }

    function setupEvents() {
        const selectComp = document.getElementById('select-competition');
        if (selectComp) {
            selectComp.addEventListener('change', (e) => {
                const compId = e.target.value;
                if (compId) {
                    selectCompetition(compId);
                } else {
                    resetSelection();
                }
            });
        }

        const btnCopy = document.getElementById('btn-copy-url');
        if (btnCopy) {
            btnCopy.addEventListener('click', copyLiveUrl);
        }

        const btnPrint = document.getElementById('btn-print-qr');
        if (btnPrint) {
            btnPrint.addEventListener('click', printQrCode);
        }
    }

    async function loadCompetitions() {
        try {
            const { data: competitions, error } = await window.supabaseClient
                .from('competitions')
                .select('*')
                .order('datum', { ascending: false });

            if (error) throw error;

            allCompetitions = competitions || [];
            const select = document.getElementById('select-competition');

            if (allCompetitions.length === 0) {
                select.innerHTML = '<option value="">Keine Wettkämpfe vorhanden</option>';
                return;
            }

            let html = '<option value="">– Bitte Wettkampf wählen –</option>';
            const urlCompId = window.AppUtils?.getUrlParam('competition_id') || window.AppUtils?.getUrlParam('id');
            let initialCompId = null;

            allCompetitions.forEach(c => {
                const dateStr = window.AppUtils?.formatDate(c.datum) || c.datum;
                const isSelected = urlCompId === c.id;
                if (isSelected) initialCompId = c.id;
                html += `<option value="${c.id}" ${isSelected ? 'selected' : ''}>${window.AppUtils?.escapeHtml(c.name)} (${dateStr})</option>`;
            });

            select.innerHTML = html;

            if (initialCompId) {
                selectCompetition(initialCompId);
            } else if (allCompetitions.length > 0) {
                // Automatisch den ersten (neuesten) auswählen
                select.value = allCompetitions[0].id;
                selectCompetition(allCompetitions[0].id);
            }

        } catch (err) {
            console.error('Fehler beim Laden der Wettkämpfe:', err);
            window.AppUtils?.showNotification(`❌ Fehler beim Laden der Wettkämpfe: ${err.message}`, 'error');
        }
    }

    function selectCompetition(compId) {
        currentCompId = compId;
        const comp = allCompetitions.find(c => c.id === compId);
        if (!comp) return;

        // Info-Box aktualisieren
        const infoBox = document.getElementById('comp-info-box');
        const badgesEl = document.getElementById('comp-info-badges');
        const metaEl = document.getElementById('comp-info-meta');

        if (infoBox && badgesEl && metaEl) {
            const statusClass = comp.status === 'laufend' ? 'status-badge-laufend' :
                                comp.status === 'abgeschlossen' ? 'status-badge-abgeschlossen' : 'status-badge-geplant';
            const statusText = comp.status === 'laufend' ? 'Laufend' :
                               comp.status === 'abgeschlossen' ? 'Beendet' : 'Geplant';

            badgesEl.innerHTML = `
                <span class="badge ${statusClass}">${statusText}</span>
                <span class="badge badge-team">${comp.anzahl_ergebnisse} Serien</span>
                <span class="badge badge-single">Teamgröße ${comp.teamgroesse}</span>
            `;

            const dateStr = window.AppUtils?.formatDate(comp.datum) || comp.datum;
            metaEl.innerHTML = `📅 Datum: <strong>${dateStr}</strong><br>ID: <small style="font-family: monospace;">${comp.id}</small>`;
            infoBox.style.display = 'block';
        }

        // Live-URL generieren
        // Ermittle absolute URL basierend auf aktuellem Ort
        const liveUrl = new URL('live.html', window.location.href);
        liveUrl.searchParams.set('competition_id', comp.id);
        const liveUrlString = liveUrl.toString();

        // UI-Elemente anzeigen
        const urlDisplay = document.getElementById('url-display');
        if (urlDisplay) {
            urlDisplay.textContent = liveUrlString;
            urlDisplay.style.display = 'block';
        }

        const openBtn = document.getElementById('btn-open-live');
        if (openBtn) {
            openBtn.href = liveUrlString;
        }

        const qrActions = document.getElementById('qr-actions');
        if (qrActions) {
            qrActions.style.display = 'flex';
        }

        // QR Code zeichnen
        generateQr(liveUrlString);
    }

    let qrCodeInstance = null;

    function resetSelection() {
        currentCompId = null;
        document.getElementById('comp-info-box').style.display = 'none';
        document.getElementById('url-display').style.display = 'none';
        document.getElementById('qr-actions').style.display = 'none';
        
        const target = document.getElementById('qr-target');
        if (target) {
            target.innerHTML = '';
            target.style.display = 'none';
        }

        const placeholder = document.getElementById('qr-placeholder');
        if (placeholder) {
            placeholder.innerHTML = `
                <div class="qr-placeholder-icon">📡</div>
                <div>Bitte zuerst einen Wettkampf auswählen</div>
            `;
            placeholder.style.display = 'block';
        }
        qrCodeInstance = null;
    }

    function generateQr(url) {
        const target = document.getElementById('qr-target');
        const placeholder = document.getElementById('qr-placeholder');

        if (!target) return;

        if (typeof window.QRCode !== 'undefined') {
            target.innerHTML = '';
            target.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';

            try {
                qrCodeInstance = new window.QRCode(target, {
                    text: url,
                    width: 250,
                    height: 250,
                    colorDark: '#0d3810',
                    colorLight: '#ffffff',
                    correctLevel: window.QRCode.CorrectLevel.H
                });
            } catch (err) {
                console.error('Fehler bei QR-Generierung:', err);
                if (placeholder) {
                    placeholder.innerHTML = '⚠️ Fehler bei der QR-Code-Erstellung.';
                    placeholder.style.display = 'block';
                }
            }
        } else {
            console.error('QRCode-Bibliothek nicht verfügbar.');
            if (placeholder) {
                placeholder.innerHTML = '⚠️ QR-Code-Bibliothek konnte nicht geladen werden.';
                placeholder.style.display = 'block';
            }
        }
    }

    async function copyLiveUrl() {
        const urlDisplay = document.getElementById('url-display');
        const btn = document.getElementById('btn-copy-url');
        if (!urlDisplay || !urlDisplay.textContent) return;

        try {
            await navigator.clipboard.writeText(urlDisplay.textContent);
            const originalText = btn.textContent;
            btn.textContent = '✅ Kopiert!';
            btn.style.borderColor = 'var(--primary)';
            btn.style.color = 'var(--primary)';

            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.borderColor = '';
                btn.style.color = '';
            }, 2000);

            window.AppUtils?.showNotification('URL in Zwischenablage kopiert!', 'success', 2500);
        } catch (e) {
            // Fallback
            const tempInput = document.createElement('input');
            tempInput.value = urlDisplay.textContent;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            window.AppUtils?.showNotification('URL kopiert!', 'success', 2500);
        }
    }

    function printQrCode() {
        if (!currentCompId) return;
        const comp = allCompetitions.find(c => c.id === currentCompId);
        const compName = comp ? comp.name : 'Wettkampf';
        const target = document.getElementById('qr-target');
        const urlDisplay = document.getElementById('url-display');

        if (!target) return;

        // Bild-Daten abrufen (entweder aus img oder canvas)
        let qrDataUrl = '';
        const imgEl = target.querySelector('img');
        const canvasEl = target.querySelector('canvas');

        if (imgEl && imgEl.src && imgEl.src.startsWith('data:image')) {
            qrDataUrl = imgEl.src;
        } else if (canvasEl && typeof canvasEl.toDataURL === 'function') {
            qrDataUrl = canvasEl.toDataURL();
        }

        if (!qrDataUrl) {
            window.AppUtils?.showNotification('QR-Code Bild konnte nicht für den Druck extrahiert werden.', 'warning');
            return;
        }

        const dateStr = comp ? (window.AppUtils?.formatDate(comp.datum) || comp.datum) : '';

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="de">
            <head>
                <meta charset="UTF-8">
                <title>QR-Code: ${window.AppUtils?.escapeHtml(compName)}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 40px 20px;
                        color: #111;
                    }
                    .header {
                        margin-bottom: 25px;
                    }
                    h1 {
                        font-size: 26px;
                        margin: 0 0 10px 0;
                        color: #1b5e20;
                    }
                    .subtitle {
                        font-size: 16px;
                        color: #555;
                        margin-bottom: 5px;
                    }
                    .qr-box {
                        display: inline-block;
                        padding: 20px;
                        border: 3px solid #1b5e20;
                        border-radius: 12px;
                        margin: 25px auto;
                    }
                    img {
                        width: 320px;
                        height: 320px;
                        display: block;
                    }
                    .scan-hint {
                        font-size: 18px;
                        font-weight: bold;
                        color: #1b5e20;
                        margin-top: 15px;
                    }
                    .url-text {
                        font-size: 12px;
                        color: #666;
                        word-break: break-all;
                        max-width: 450px;
                        margin: 20px auto 0 auto;
                    }
                    @media print {
                        body { padding: 20px; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>SSV 1928 Sulzbach e.V.</h1>
                    <div class="subtitle">Live-Ergebnisse: <strong>${window.AppUtils?.escapeHtml(compName)}</strong></div>
                    <div class="subtitle">Datum: ${dateStr}</div>
                </div>

                <div class="qr-box">
                    <img src="${qrDataUrl}" alt="QR-Code">
                    <div class="scan-hint">📲 Jetzt scannen für Live-Ergebnisse!</div>
                </div>

                <div class="url-text">${urlDisplay ? urlDisplay.textContent : ''}</div>

                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

})();
