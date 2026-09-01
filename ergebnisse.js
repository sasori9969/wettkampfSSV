// ==========================================
// SUPABASE EINSTELLUNGEN
// ==========================================

const SUPABASE_URL =
    "https://pvvdbcvdhggqbembqrda.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL";


// Supabase Verbindung
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// ==========================================
// ERGEBNISSE LADEN
// ==========================================

async function ergebnisseLaden() {

    const tabelle =
        document.getElementById(
            "ergebnis-tabelle"
        );


    // Wir sind nicht auf der Ergebnisseite
    if (!tabelle) {
        return;
    }


    const { data, error } =
        await supabaseClient

            .from("results")

            .select(`
                id,
                ergebnis1,
                ergebnis2,
                ergebnis3,
                participants (
                    vorname,
                    nachname
                )
            `);


    if (error) {

        console.error(
            "Fehler beim Laden der Ergebnisse:",
            error
        );


        tabelle.innerHTML = `
            <tr>
                <td colspan="5">
                    Fehler beim Laden der Ergebnisse.
                </td>
            </tr>
        `;

        return;
    }


    // ==========================================
    // GESAMTERGEBNIS BERECHNEN
    // ==========================================

    const ergebnisse =
        data.map(
            function(eintrag) {

                const gesamt =
                    Number(eintrag.ergebnis1) +
                    Number(eintrag.ergebnis2) +
                    Number(eintrag.ergebnis3);


                return {
                    ...eintrag,
                    gesamt: gesamt
                };

            }
        );


    // ==========================================
    // SORTIEREN
    // Höchstes Gesamtergebnis zuerst
    // ==========================================

    ergebnisse.sort(
        function(a, b) {

            return b.gesamt - a.gesamt;

        }
    );


    // Tabelle leeren
    tabelle.innerHTML = "";


    // ==========================================
    // ERGEBNISSE ANZEIGEN
    // ==========================================

    ergebnisse.forEach(
        function(eintrag, index) {

            const zeile =
                document.createElement("tr");


            const platz =
                index + 1;


            zeile.innerHTML = `
                <td>
                    <strong>
                        ${platz}.
                    </strong>
                </td>

                <td>
                    ${eintrag.participants.vorname}
                    ${eintrag.participants.nachname}
                </td>

                <td>
                    ${Number(eintrag.ergebnis1)
                        .toFixed(1)
                        .replace(".", ",")}
                </td>

                <td>
                    ${Number(eintrag.ergebnis2)
                        .toFixed(1)
                        .replace(".", ",")}
                </td>

                <td>
                    ${Number(eintrag.ergebnis3)
                        .toFixed(1)
                        .replace(".", ",")}
                </td>

                <td>
                    <strong>
                        ${eintrag.gesamt
                            .toFixed(1)
                            .replace(".", ",")}
                    </strong>
                </td>
            `;


            tabelle.appendChild(
                zeile
            );

        }
    );


    // ==========================================
    // KEINE ERGEBNISSE
    // ==========================================

    if (ergebnisse.length === 0) {

        tabelle.innerHTML = `
            <tr>
                <td colspan="6">
                    Noch keine Ergebnisse vorhanden.
                </td>
            </tr>
        `;

    }

}


// ==========================================
// START
// ==========================================

ergebnisseLaden();


// ==========================================
// AUTOMATISCHE AKTUALISIERUNG
//
// Vorerst alle 5 Sekunden.
// Supabase Realtime bauen wir später ein.
// ==========================================

setInterval(
    ergebnisseLaden,
    5000
);
