// ==========================================================
// SSV 1928 SULZBACH E.V.
// ERGEBNISSE ERFASSEN
// ==========================================================
//
// DATEI: ergebnisse-eingabe.js
//
// Aktuelle Datenbankstruktur:
//
// participants
//   id = bigint
//
// starts
//   id = uuid
//   competition_id = uuid
//   participant_id = bigint
//   team_id = uuid
//   ak = boolean
//
// results
//   id = uuid
//   start_id = uuid
//   nummer = integer
//   wert = numeric
//
// ==========================================================


// ==========================================================
// SUPABASE
// ==========================================================

const ergebnisSupabase =
    supabaseClient || supabase.createClient(
        "https://pvvdbcvdhggqbembqrda.supabase.co",
        "sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL"
    );



// ==========================================================
// URL-PARAMETER
// ==========================================================
//
// Die Seite kann auf zwei Arten geöffnet werden:
//
// 1. ?start_id=UUID
//    → Ergebnis eines vorhandenen Starts bearbeiten
//
// 2. ?competition_id=UUID
//    → optional für zukünftige Erweiterungen
//
// ==========================================================

const parameter =
    new URLSearchParams(
        window.location.search
    );


const startId =
    parameter.get(
        "start_id"
    );


const competitionId =
    parameter.get(
        "competition_id"
    );



// ==========================================================
// DOM
// ==========================================================

const form =
    document.getElementById(
        "ergebnis-form"
    );


const teilnehmerSelect =
    document.getElementById(
        "teilnehmer"
    );


const ergebnis1Input =
    document.getElementById(
        "ergebnis1"
    );


const ergebnis2Input =
    document.getElementById(
        "ergebnis2"
    );


const ergebnis3Input =
    document.getElementById(
        "ergebnis3"
    );


const meldung =
    document.getElementById(
        "ergebnis-meldung"
    );



// ==========================================================
// MELDUNG
// ==========================================================

function meldungSetzen(
    text,
    klasse = ""
) {

    if (!meldung) {

        return;

    }


    meldung.textContent =
        text;


    meldung.className =
        "meldung " +
        klasse;

}



// ==========================================================
// DEUTSCHE ZAHL IN ZAHL UMWANDELN
// ==========================================================

function zahlLesen(
    wert
) {

    if (
        wert === null ||
        wert === undefined
    ) {

        return null;

    }


    let text =
        String(
            wert
        )
        .trim();


    if (!text) {

        return null;

    }


    // 12,40 → 12.40

    text =
        text.replace(
            ",",
            "."
        );


    const zahl =
        Number(
            text
        );


    if (
        Number.isNaN(
            zahl
        )
    ) {

        return null;

    }


    return zahl;

}



// ==========================================================
// ZAHL FORMATIEREN
// ==========================================================

function zahlFormatieren(
    wert
) {

    if (
        wert === null ||
        wert === undefined ||
        wert === ""
    ) {

        return "";

    }


    const zahl =
        Number(
            wert
        );


    if (
        Number.isNaN(
            zahl
        )
    ) {

        return "";

    }


    return zahl
        .toFixed(2)
        .replace(
            ".",
            ","
        );

}



// ==========================================================
// HTML SICHER MACHEN
// ==========================================================

function ergebnisEscapeHtml(
    wert
) {

    if (
        wert === null ||
        wert === undefined
    ) {

        return "";

    }


    return String(wert)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}



// ==========================================================
// START LADEN
// ==========================================================

async function startLaden() {

    if (!startId) {

        return null;

    }


    const {
        data,
        error
    } = await ergebnisSupabase

        .from("starts")

        .select(`
            id,
            competition_id,
            participant_id,
            team_id,
            ak
        `)

        .eq(
            "id",
            startId
        )

        .single();


    if (error) {

        console.error(
            "Fehler beim Laden des Starts:",
            error
        );


        meldungSetzen(
            "❌ Der Start konnte nicht geladen werden.",
            "status-fehler"
        );


        return null;

    }


    return data;

}



// ==========================================================
// TEILNEHMER DES STARTS LADEN
// ==========================================================

async function teilnehmerLaden(
    participantId
) {

    if (
        participantId === null ||
        participantId === undefined
    ) {

        return null;

    }


    const {
        data,
        error
    } = await ergebnisSupabase

        .from("participants")

        .select(`
            id,
            vorname,
            nachname
        `)

        .eq(
            "id",
            participantId
        )

        .single();


    if (error) {

        console.error(
            "Fehler beim Laden des Teilnehmers:",
            error
        );


        return null;

    }


    return data;

}



// ==========================================================
// TEILNEHMER SELECT
// ==========================================================
//
// Wenn ein start_id vorhanden ist, wird der Teilnehmer
// des Starts angezeigt.
//
// Der Teilnehmer wird absichtlich NICHT neu ausgewählt,
// weil ein Start bereits eindeutig einem Teilnehmer
// zugeordnet ist.
//
// ==========================================================

function teilnehmerAnzeigen(
    person
) {

    if (!teilnehmerSelect) {

        return;

    }


    teilnehmerSelect.innerHTML =
        "";


    if (!person) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            "";


        option.textContent =
            "Kein Teilnehmer";


        teilnehmerSelect.appendChild(
            option
        );


        return;

    }


    const option =
        document.createElement(
            "option"
        );


    option.value =
        person.id;


    option.textContent =

        person.vorname +
        " " +
        person.nachname;


    option.selected =
        true;


    teilnehmerSelect.appendChild(
        option
    );

}



// ==========================================================
// ERGEBNISSE LADEN
// ==========================================================

async function ergebnisseLaden() {

    if (!startId) {

        return [];

    }


    const {
        data,
        error
    } = await ergebnisSupabase

        .from("results")

        .select(`
            id,
            start_id,
            nummer,
            wert,
            created_at
        `)

        .eq(
            "start_id",
            startId
        )

        .order(
            "nummer",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Fehler beim Laden der Ergebnisse:",
            error
        );


        meldungSetzen(
            "❌ Ergebnisse konnten nicht geladen werden.",
            "status-fehler"
        );


        return [];

    }


    return data || [];

}



// ==========================================================
// ERGEBNISSE IN FORMULAR EINTRAGEN
// ==========================================================

function ergebnisseInsFormular(
    ergebnisse
) {

    if (!ergebnisse) {

        return;

    }


    ergebnisse.forEach(
        function(ergebnis) {

            const nummer =
                Number(
                    ergebnis.nummer
                );


            const wert =
                zahlFormatieren(
                    ergebnis.wert
                );


            if (
                nummer === 1 &&
                ergebnis1Input
            ) {

                ergebnis1Input.value =
                    wert;

            }


            if (
                nummer === 2 &&
                ergebnis2Input
            ) {

                ergebnis2Input.value =
                    wert;

            }


            if (
                nummer === 3 &&
                ergebnis3Input
            ) {

                ergebnis3Input.value =
                    wert;

            }

        }
    );

}



// ==========================================================
// ERGEBNIS SPEICHERN
// ==========================================================
//
// Für jeden Start werden bis zu drei Ergebnisdatensätze
// gespeichert.
//
// Nummer 1
// Nummer 2
// Nummer 3
//
// Bestehende Ergebnisse werden vorher gelöscht.
//
// ==========================================================

async function ergebnisseSpeichern(
    event
) {

    event.preventDefault();


    if (!startId) {

        meldungSetzen(
            "❌ Kein Start ausgewählt.",
            "status-fehler"
        );


        return;

    }


    const wert1 =
        zahlLesen(
            ergebnis1Input?.value
        );


    const wert2 =
        zahlLesen(
            ergebnis2Input?.value
        );


    const wert3 =
        zahlLesen(
            ergebnis3Input?.value
        );


    // ======================================================
    // VALIDIERUNG
    // ======================================================

    if (
        wert1 === null ||
        wert2 === null ||
        wert3 === null
    ) {

        meldungSetzen(
            "Bitte alle drei Ergebnisse korrekt eingeben.",
            "status-fehler"
        );


        return;

    }


    if (
        wert1 < 0 ||
        wert2 < 0 ||
        wert3 < 0
    ) {

        meldungSetzen(
            "Ergebnisse dürfen nicht negativ sein.",
            "status-fehler"
        );


        return;

    }



    // ======================================================
    // BUTTON DEAKTIVIEREN
    // ======================================================

    const submitButton =
        form?.querySelector(
            'button[type="submit"]'
        );


    if (submitButton) {

        submitButton.disabled =
            true;


        submitButton.textContent =
            "Speichern ...";

    }



    // ======================================================
    // VORHANDENE ERGEBNISSE LÖSCHEN
    // ======================================================

    const {
        error: deleteError
    } = await ergebnisSupabase

        .from("results")

        .delete()

        .eq(
            "start_id",
            startId
        );


    if (deleteError) {

        console.error(
            "Fehler beim Löschen alter Ergebnisse:",
            deleteError
        );


        meldungSetzen(
            "❌ Vorhandene Ergebnisse konnten nicht aktualisiert werden.",
            "status-fehler"
        );


        if (submitButton) {

            submitButton.disabled =
                false;


            submitButton.textContent =
                "Ergebnisse speichern";

        }


        return;

    }



    // ======================================================
    // NEUE ERGEBNISSE
    // ======================================================

    const neueErgebnisse = [

        {
            start_id:
                startId,

            nummer:
                1,

            wert:
                wert1
        },

        {
            start_id:
                startId,

            nummer:
                2,

            wert:
                wert2
        },

        {
            start_id:
                startId,

            nummer:
                3,

            wert:
                wert3
        }

    ];



    // ======================================================
    // SPEICHERN
    // ======================================================

    const {
        error: insertError
    } = await ergebnisSupabase

        .from("results")

        .insert(
            neueErgebnisse
        );


    if (insertError) {

        console.error(
            "Fehler beim Speichern der Ergebnisse:",
            insertError
        );


        meldungSetzen(
            "❌ Ergebnisse konnten nicht gespeichert werden.",
            "status-fehler"
        );


        if (submitButton) {

            submitButton.disabled =
                false;


            submitButton.textContent =
                "Ergebnisse speichern";

        }


        return;

    }



    // ======================================================
    // ERFOLG
    // ======================================================

    meldungSetzen(
        "✅ Ergebnisse wurden erfolgreich gespeichert.",
        "status-ok"
    );


    if (submitButton) {

        submitButton.disabled =
            false;


        submitButton.textContent =
            "Ergebnisse speichern";

    }

}



// ==========================================================
// SEITE OHNE START-ID
// ==========================================================
//
// Die bisherige HTML-Seite besitzt nur ein
// Teilnehmer-Auswahlfeld.
//
// Die neue Struktur benötigt aber einen konkreten Start.
//
// Deshalb wird ohne start_id ein deutlicher Hinweis
// angezeigt.
//
// ==========================================================

function keinStartAnzeigen() {

    if (teilnehmerSelect) {

        teilnehmerSelect.innerHTML = `

            <option value="">
                Bitte zuerst einen Start auswählen
            </option>

        `;

    }


    if (form) {

        const inputs =
            form.querySelectorAll(
                "input, button, select"
            );


        inputs.forEach(
            function(element) {

                element.disabled =
                    true;

            }
        );

    }


    meldungSetzen(
        "Bitte einen Start über die Wettkampfseite auswählen.",
        "status-fehler"
    );

}



// ==========================================================
// SEITEN-TITEL ANPASSEN
// ==========================================================

function titelAnpassen(
    person
) {

    const titel =
        document.querySelector(
            "h2"
        );


    if (!titel) {

        return;

    }


    if (person) {

        titel.textContent =

            "Ergebnisse erfassen – " +

            person.vorname +
            " " +
            person.nachname;

    }

}



// ==========================================================
// START
// ==========================================================

async function start() {

    // ======================================================
    // Ohne start_id
    // ======================================================

    if (!startId) {

        keinStartAnzeigen();

        return;

    }



    // ======================================================
    // START LADEN
    // ======================================================

    const startDaten =
        await startLaden();


    if (!startDaten) {

        return;

    }



    // ======================================================
    // TEILNEHMER LADEN
    // ======================================================

    const person =
        await teilnehmerLaden(
            startDaten.participant_id
        );


    if (!person) {

        meldungSetzen(
            "❌ Teilnehmer des Starts konnte nicht geladen werden.",
            "status-fehler"
        );


        return;

    }


    teilnehmerAnzeigen(
        person
    );


    titelAnpassen(
        person
    );



    // ======================================================
    // ERGEBNISSE LADEN
    // ======================================================

    const ergebnisse =
        await ergebnisseLaden();


    ergebnisseInsFormular(
        ergebnisse
    );

}



// ==========================================================
// FORMULAR EVENT
// ==========================================================

if (form) {

    form.addEventListener(
        "submit",
        ergebnisseSpeichern
    );

}



// ==========================================================
// AUSFÜHREN
// ==========================================================

start();
