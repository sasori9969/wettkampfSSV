```javascript
// ==========================================
// SUPABASE EINSTELLUNGEN
// ==========================================

const SUPABASE_URL = "https://pvvdbcvdhggqbembqrda.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL";


// Supabase Verbindung
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// ==========================================
// ZAHL UMWANDELN
// ==========================================

function zahlUmwandeln(wert) {

    // Komma in Punkt umwandeln
    wert = wert.replace(",", ".");

    return parseFloat(wert);
}


// ==========================================
// TEILNEHMER LADEN
// ==========================================

async function teilnehmerLaden() {

    const select = document.getElementById("teilnehmer");

    // Wenn wir nicht auf der Eingabeseite sind,
    // brauchen wir nichts zu tun.
    if (!select) {
        return;
    }


    const { data, error } = await supabaseClient
        .from("participants")
        .select("*")
        .order("nachname", {
            ascending: true
        });


    if (error) {

        console.error(
            "Fehler beim Laden der Teilnehmer:",
            error
        );

        return;
    }


    // Auswahlfeld zurücksetzen
    select.innerHTML = "";


    // Standardauswahl
    const standardOption =
        document.createElement("option");

    standardOption.value = "";

    standardOption.textContent =
        "Bitte Teilnehmer auswählen";

    select.appendChild(standardOption);


    // Teilnehmer einfügen
    data.forEach(function(teilnehmer) {

        const option =
            document.createElement("option");

        option.value = teilnehmer.id;

        option.textContent =
            teilnehmer.vorname +
            " " +
            teilnehmer.nachname;

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
                document
                    .getElementById("vorname")
                    .value
                    .trim();


            const nachname =
                document
                    .getElementById("nachname")
                    .value
                    .trim();


            if (!vorname || !nachname) {

                alert(
                    "Bitte Vor- und Nachname eingeben."
                );

                return;
            }


            const { error } =
                await supabaseClient
                    .from("participants")
                    .insert([
                        {
                            vorname: vorname,
                            nachname: nachname
                        }
                    ]);


            if (error) {

                console.error(
                    "Fehler beim Speichern:",
                    error
                );


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
            await teilnehmerLaden();

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
                document
                    .getElementById("teilnehmer")
                    .value;


            const wert1 =
                zahlUmwandeln(
                    document
                        .getElementById("ergebnis1")
                        .value
                );


            const wert2 =
                zahlUmwandeln(
                    document
                        .getElementById("ergebnis2")
                        .value
                );


            const wert3 =
                zahlUmwandeln(
                    document
                        .getElementById("ergebnis3")
                        .value
                );


            // Teilnehmer prüfen
            if (!participantId) {

                alert(
                    "Bitte einen Teilnehmer auswählen."
                );

                return;
            }


            // Zahlen prüfen
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


            // Ergebnisse speichern
            const { error } =
                await supabaseClient
                    .from("results")
                    .insert([
                        {
                            participant_id:
                                participantId,

                            ergebnis1:
                                wert1,

                            ergebnis2:
                                wert2,

                            ergebnis3:
                                wert3
                        }
                    ]);


            if (error) {

                console.error(
                    "Fehler beim Speichern der Ergebnisse:",
                    error
                );


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
