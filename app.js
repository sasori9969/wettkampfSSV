```javascript
// ==========================================
// SUPABASE EINSTELLUNGEN
// ==========================================
//
// Diese beiden Werte tragen wir später
// gemeinsam aus deinem Supabase-Projekt ein.
//

const SUPABASE_URL = "DEINE_SUPABASE_URL";
const SUPABASE_ANON_KEY = "DEIN_SUPABASE_ANON_KEY";


// Supabase Verbindung herstellen
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// ==========================================
// HILFSFUNKTION
// ==========================================

function zahlUmwandeln(wert) {

    // Deutsches Komma in Punkt umwandeln
    wert = wert.replace(",", ".");

    const zahl = parseFloat(wert);

    return zahl;
}


// ==========================================
// TEILNEHMER LADEN
// ==========================================

async function teilnehmerLaden() {

    const select = document.getElementById("teilnehmer");

    if (!select) {
        return;
    }

    const { data, error } = await supabaseClient
        .from("participants")
        .select("*")
        .order("nachname", { ascending: true });

    if (error) {

        console.error(error);

        return;
    }


    // Alte Einträge entfernen
    select.innerHTML = `
        <option value="">
            Bitte Teilnehmer auswählen
        </option>
    `;


    // Teilnehmer hinzufügen
    data.forEach(teilnehmer => {

        const option = document.createElement("option");

        option.value = teilnehmer.id;

        option.textContent =
            `${teilnehmer.vorname} ${teilnehmer.nachname}`;

        select.appendChild(option);

    });
}


// ==========================================
// TEILNEHMER SPEICHERN
// ==========================================

const teilnehmerForm =
    document.getElementById("teilnehmer-form");


if (teilnehmerForm) {

    teilnehmerForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const vorname =
                document.getElementById("vorname").value.trim();

            const nachname =
                document.getElementById("nachname").value.trim();


            if (!vorname || !nachname) {

                alert("Bitte Vor- und Nachname eingeben.");

                return;
            }


            const { error } = await supabaseClient
                .from("participants")
                .insert([
                    {
                        vorname: vorname,
                        nachname: nachname
                    }
                ]);


            if (error) {

                console.error(error);

                document.getElementById(
                    "teilnehmer-meldung"
                ).textContent =
                    "Fehler beim Speichern.";

                return;
            }


            document.getElementById(
                "teilnehmer-meldung"
            ).textContent =
                "Teilnehmer wurde gespeichert.";


            teilnehmerForm.reset();


            // Teilnehmerliste aktualisieren
            teilnehmerLaden();

        }
    );

}


// ==========================================
// ERGEBNISSE SPEICHERN
// ==========================================

const ergebnisForm =
    document.getElementById("ergebnis-form");


if (ergebnisForm) {

    ergebnisForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const participantId =
                document.getElementById("teilnehmer").value;


            const wert1 =
                zahlUmwandeln(
                    document.getElementById("ergebnis1").value
                );

            const wert2 =
                zahlUmwandeln(
                    document.getElementById("ergebnis2").value
                );

            const wert3 =
                zahlUmwandeln(
                    document.getElementById("ergebnis3").value
                );


            // Prüfung
            if (!participantId) {

                alert("Bitte einen Teilnehmer auswählen.");

                return;
            }


            if (
                Number.isNaN(wert1) ||
                Number.isNaN(wert2) ||
                Number.isNaN(wert3)
            ) {

                alert(
                    "Bitte bei allen drei Ergebnissen Zahlen eingeben."
                );

                return;
            }


            // In Supabase speichern
            const { error } = await supabaseClient
                .from("results")
                .insert([
                    {
                        participant_id: participantId,
                        ergebnis1: wert1,
                        ergebnis2: wert2,
                        ergebnis3: wert3
                    }
                ]);


            if (error) {

                console.error(error);

                document.getElementById(
                    "ergebnis-meldung"
                ).textContent =
                    "Fehler beim Speichern.";

                return;
            }


            document.getElementById(
                "ergebnis-meldung"
            ).textContent =
                "Ergebnisse wurden gespeichert.";


            ergebnisForm.reset();

        }
    );

}


// ==========================================
// START
// ==========================================

teilnehmerLaden();
```
