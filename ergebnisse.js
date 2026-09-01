// ==========================================
// SUPABASE EINSTELLUNGEN
// ==========================================

const SUPABASE_URL =
    "https://pvvdbcvdhggqbembqrda.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL";


// ==========================================
// SUPABASE VERBINDUNG
// ==========================================

const supabaseClient =
    supabase.createClient(
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


    // Wenn keine Tabelle vorhanden ist,
    // sind wir nicht auf der Ergebnisseite.
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


    // ==========================================
    // FEHLER
    // ==========================================

    if (error) {

        console.error(
            "Fehler beim Laden der Ergebnisse:",
            error
        );


        tabelle.innerHTML = `
            <tr>
                <td colspan="7">
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
    // HÖCHSTES ERGEBNIS ZUERST
    // ==========================================

    ergebnisse.sort(
        function(a, b) {

            return b.gesamt - a.gesamt;

        }
    );


    // ==========================================
    // TABELLE LEEREN
    // ==========================================

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


            // ==========================================
            // ZAHLEN FORMATIEREN
            // ==========================================

            const wert1 =
                Number(eintrag.ergebnis1)
                    .toFixed(1)
                    .replace(".", ",");


            const wert2 =
                Number(eintrag.ergebnis2)
                    .toFixed(1)
                    .replace(".", ",");


            const wert3 =
                Number(eintrag.ergebnis3)
                    .toFixed(1)
                    .replace(".", ",");


            const gesamt =
                Number(eintrag.gesamt)
                    .toFixed(1)
                    .replace(".", ",");


            // ==========================================
            // VOR- UND NACHNAME
            // ==========================================

            const vorname =
                eintrag.participants?.vorname
                || "";


            const nachname =
                eintrag.participants?.nachname
                || "";


            // ==========================================
            // ZEILE ERSTELLEN
            // ==========================================

            zeile.innerHTML = `

                <td>
                    <strong>
                        ${platz}.
                    </strong>
                </td>


                <td>
                    ${vorname}
                </td>


                <td>
                    ${nachname}
                </td>


                <td>
                    ${wert1}
                </td>


                <td>
                    ${wert2}
                </td>


                <td>
                    ${wert3}
                </td>


                <td>
                    <strong>
                        ${gesamt}
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

                <td colspan="7">
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
// ==========================================

setInterval(
    ergebnisseLaden,
    5000
);
