```javascript
// ==========================================
// SUPABASE EINSTELLUNGEN
// ==========================================

const SUPABASE_URL = "DEINE_SUPABASE_URL";
const SUPABASE_ANON_KEY = "DEIN_SUPABASE_ANON_KEY";


const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// ==========================================
// ERGEBNISSE LADEN
// ==========================================

async function ergebnisseLaden() {

    const tabelle =
        document.getElementById("ergebnis-tabelle");


    const { data, error } = await supabaseClient

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

        console.error(error);

        tabelle.innerHTML = `
            <tr>
                <td colspan="7">
                    Fehler beim Laden der Ergebnisse.
                </td>
            </tr>
        `;

        return;
    }


    // Gesamtwert berechnen
    const ergebnisse = data.map(eintrag => {

        const gesamt =
            eintrag.ergebnis1 +
            eintrag.ergebnis2 +
            eintrag.ergebnis3;


        return {
            ...eintrag,
            gesamt: gesamt
        };

    });


    // Nach Gesamtwert absteigend sortieren
    ergebnisse.sort(
        (a, b) => b.gesamt - a.gesamt
    );


    // Tabelle leeren
    tabelle.innerHTML = "";


    // Ergebnisse anzeigen
    ergebnisse.forEach(
        (eintrag, index) => {

            const zeile =
                document.createElement("tr");


            const platz =
                index + 1;


            zeile.innerHTML = `

                <td class="platz">
                    ${platz}.
                </td>

                <td>
                    ${eintrag.participants.vorname}
                </td>

                <td>
                    ${eintrag.participants.nachname}
                </td>

                <td>
                    ${eintrag.ergebnis1.toFixed(1)}
                </td>

                <td>
                    ${eintrag.ergebnis2.toFixed(1)}
                </td>

                <td>
                    ${eintrag.ergebnis3.toFixed(1)}
                </td>

                <td>
                    <strong>
                        ${eintrag.gesamt.toFixed(1)}
                    </strong>
                </td>

            `;


            tabelle.appendChild(zeile);

        }
    );


    // Keine Ergebnisse
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
//
// Alle 10 Sekunden wird geprüft, ob neue
// Ergebnisse vorhanden sind.
//

setInterval(
    ergebnisseLaden,
    10000
);
```
