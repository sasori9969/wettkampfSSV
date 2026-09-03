/**
 * SSV 1928 Sulzbach e.V. - Wettkampfauswertung
 * Zentrale Supabase-Konfiguration und Anwendungs-Utilities
 */

(function () {
    'use strict';

    const SUPABASE_URL = 'https://pvvdbcvdhggqbembqrda.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL';

    if (!window.supabase) {
        console.error('❌ Supabase JS SDK wurde nicht vor supabase-client.js geladen.');
    } else {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    // Globale Hilfsfunktionen für einheitliche Formatierung, Benachrichtigungen und Sicherheit
    window.AppUtils = {
        /**
         * Zeigt eine Toast-Benachrichtigung an
         * @param {string} message - Textnachricht
         * @param {'success'|'error'|'info'|'warning'} type - Typ der Meldung
         * @param {number} duration - Anzeigedauer in ms
         */
        showNotification: function (message, type = 'info', duration = 4000) {
            let container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                container.className = 'toast-container';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            
            const icon = type === 'success' ? '✅' :
                         type === 'error' ? '❌' :
                         type === 'warning' ? '⚠️' : 'ℹ️';

            toast.innerHTML = `
                <span class="toast-icon">${icon}</span>
                <span class="toast-message">${this.escapeHtml(message)}</span>
                <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
            `;

            container.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('toast-show');
            }, 10);

            if (duration > 0) {
                setTimeout(() => {
                    toast.classList.remove('toast-show');
                    setTimeout(() => toast.remove(), 300);
                }, duration);
            }
        },

        /**
         * Formatiert eine Zahl nach deutscher Konvention (z.B. 12.4 -> "12,40")
         */
        formatNumber: function (val, decimals = 2) {
            if (val === null || val === undefined || isNaN(val) || val === '') {
                return '–';
            }
            const num = Number(val);
            return num.toLocaleString('de-DE', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        },

        /**
         * Parst einen Eingabestring mit Komma oder Punkt in eine Gleitkommazahl
         */
        parseNumber: function (val) {
            if (val === null || val === undefined || val === '') return null;
            if (typeof val === 'number') return isNaN(val) ? null : val;
            const cleanStr = String(val).trim().replace(',', '.');
            const num = parseFloat(cleanStr);
            return isNaN(num) ? null : num;
        },

        /**
         * Formatiert ein ISO-Datum (JJJJ-MM-TT) in deutsches Format (TT.MM.JJJJ)
         */
        formatDate: function (dateStr) {
            if (!dateStr) return '–';
            const parts = dateStr.split('T')[0].split('-');
            if (parts.length === 3) {
                return `${parts[2]}.${parts[1]}.${parts[0]}`;
            }
            return dateStr;
        },

        /**
         * Bereinigt Text gegen HTML-Injection / XSS
         */
        escapeHtml: function (str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },

        /**
         * Debounce Hilfsfunktion für z.B. Live-Suchfelder
         */
        debounce: function (func, wait = 250) {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        },

        /**
         * Parst URL Suchparameter
         */
        getUrlParam: function (key) {
            const params = new URLSearchParams(window.location.search);
            return params.get(key);
        }
    };
})();
