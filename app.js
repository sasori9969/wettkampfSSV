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
// ZAHL UMWANDELN
// ==========================================

function zahlUmwandeln(wert) {

    wert = wert.trim();

    // Deutsches Komma in Punkt umwandeln
    wert = wert.replace(",", ".");

    return parseFloat(wert);
}


// ==========================================
// TEILNEHMER LADEN
// ==========================================

async function teilnehmerLaden() {

    const select =
        document.getElementById("teilnehmer");

    // Wenn kein Teilnehmer-Auswahlfeld
    // vorhanden ist, sind wir nicht auf
    // der Ergebnisseingabe-Seite.
    if (!select) {
        return;
    }


    const { data, error } =
        await supabaseClient

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


    select.appendChild(
        standardOption
    );


    // Teilnehmer einfügen
    data.forEach(
        function(teilnehmer) {

            const option =
                document.createElement("option");


            option.value =
                teilnehmer.id;


            option.textContent =
                teilnehmer.vorname +
                " " +
                teilnehmer.nachname;


            select.appendChild(
                option
            );

        }
    );

}


// ==========================================
// TEILNEHMER SPEICHERN
// ==========================================

const teilnehmerForm =
    document.getElementById(
        "teilnehmer-form"
    );


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


            // Eingaben prüfen
            if (!vorname || !nachname) {

                alert(
                    "Bitte Vor- und Nachname eingeben."
                );

                return;
            }


            // Teilnehmer speichern
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


            // Erfolgsmeldung
            document.getElementById(
                "teilnehmer-meldung"
            ).textContent =
                "Teilnehmer wurde gespeichert.";


            // Formular leeren
            teilnehmerForm.reset();


            // Teilnehmerliste aktualisieren
            await teilnehmerLaden();

        }
    );

}


// ==========================================
// VORHANDENE ERGEBNISSE LADEN
// ==========================================

async function vorhandeneErgebnisseLaden() {

    const select =
        document.getElementById(
            "teilnehmer"
        );


    const ergebnis1 =
        document.getElementById(
            "ergebnis1"
        );


    const ergebnis2 =
        document.getElementById(
            "ergebnis2"
        );


    const ergebnis3 =
        document.getElementById(
            "ergebnis3"
        );


    // Sicherheitsprüfung
    if (
        !select ||
        !ergebnis1 ||
        !ergebnis2 ||
        !ergebnis3
    ) {

        return;
    }


    const participantId =
        select.value;


    // Kein Teilnehmer ausgewählt
    if (!participantId) {

        ergebnis1.value = "";
        ergebnis2.value = "";
        ergebnis3.value = "";

        return;
    }


    // Vorhandene Ergebnisse laden
    const { data, error } =
        await supabaseClient

            .from("results")

            .select(
                "ergebnis1, ergebnis2, ergebnis3"
            )

            .eq(
                "participant_id",
                participantId
            )

            .maybeSingle();


    if (error) {

        console.error(
            "Fehler beim Laden der Ergebnisse:",
            error
        );

        return;
    }


    // Keine Ergebnisse vorhanden
    if (!data) {

        ergebnis1.value = "";
        ergebnis2.value = "";
        ergebnis3.value = "";

        return;
    }


    // Ergebnisse in Felder schreiben
    ergebnis1.value =
        Number(data.ergebnis1)
            .toFixed(1)
            .replace(".", ",");


    ergebnis2.value =
        Number(data.ergebnis2)
            .toFixed(1)
            .replace(".", ",");


    ergebnis3.value =
        Number(data.ergebnis3)
            .toFixed(1)
            .replace(".", ",");

}


// ==========================================
// TEILNEHMER AUSWAHL GEÄNDERT
// ==========================================

const teilnehmerSelect =
    document.getElementById(
        "teilnehmer"
    );


if (teilnehmerSelect) {

    teilnehmerSelect.addEventListener(
        "change",
        vorhandeneErgebnisseLaden
    );

}


// ==========================================
// ERGEBNISSE SPEICHERN
// ==========================================

const ergebnisForm =
    document.getElementById(
        "ergebnis-form"
    );


if (ergebnisForm) {

    ergebnisForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const participantId =
                document
                    .getElementById(
                        "teilnehmer"
                    )
                    .value;


            const wert1 =
                zahlUmwandeln(
                    document
                        .getElementById(
                            "ergebnis1"
                        )
                        .value
                );


            const wert2 =
                zahlUmwandeln(
                    document
                        .getElementById(
                            "ergebnis2"
                        )
                        .value
                );


            const wert3 =
                zahlUmwandeln(
                    document
                        .getElementById(
                            "ergebnis3"
                        )
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


            // ==========================================
            // ERGEBNISSE SPEICHERN ODER AKTUALISIEREN
            // ==========================================

            const { error } =
                await supabaseClient

                    .from("results")

                    .upsert(
                        {
                            participant_id:
                                participantId,

                            ergebnis1:
                                wert1,

                            ergebnis2:
                                wert2,

                            ergebnis3:
                                wert3
                        },
                        {
                            onConflict:
                                "participant_id"
                        }
                    );


            // Fehler
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


            // Erfolgsmeldung
            document.getElementById(
                "ergebnis-meldung"
            ).textContent =
                "Ergebnisse wurden gespeichert.";


            // ==========================================
            // WICHTIG:
            // Teilnehmer bleibt ausgewählt.
            // Die gespeicherten Werte werden erneut
            // aus der Datenbank geladen.
            // ==========================================

            await vorhandeneErgebnisseLaden();

        }
    );

}


// ==========================================
// START
// ==========================================

teilnehmerLaden();
