// ==========================================================
// SSV 1928 SULZBACH E.V.
// ERGEBNISSE ERFASSEN
// ==========================================================
//
// DATEI: app.js
//
// AKTUELLE DATENBANKSTRUKTUR
//
// participants
//   id             bigint
//   vorname        text
//   nachname       text
//
// starts
//   id             uuid
//   competition_id uuid
//   participant_id bigint
//   team_id        uuid
//   ak             boolean
//
// results
//   id             uuid
//   start_id       uuid
//   nummer         integer
//   wert           numeric
//
// WICHTIG:
// Ein Teilnehmer kann mehrere Starts haben.
// Deshalb darf niemals nur participant_id verwendet werden,
// um ein Ergebnis zu speichern.
// Immer: start_id
//
// ==========================================================


// ==========================================================
// SUPABASE
// ==========================================================

const SUPABASE_URL =
    "https://pvvdbcvdhggqbembqrda.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_UABPYPapTKw-L2UtECg_sDnwWdnL";

const appSupabase =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
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
// URL-PARAMETER
// ==========================================================

const parameter =
    new URLSearchParams(
        window.location.search
    );

const urlStartId =
    parameter.get(
        "start_id"
    );

const urlCompetitionId =
    parameter.get(
        "competition_id"
    );


// ==========================================================
// AKTUELLER START
// ==========================================================

let aktuellerStart = null;


// ==========================================================
// MELDUNG
// ==========================================================

function meldungAnzeigen(
    text,
    typ = ""
) {

    if (!meldung) {
        return;
    }

    meldung.textContent =
        text;

    meldung.className =
        "meldung";

    if (typ) {

        meldung.classList.add(
            typ
        );

    }

}


// ==========================================================
// ZAHL EINLESEN
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
        ).trim();

    if (!text) {

        return null;

    }

    // Deutsche Schreibweise:
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
        !Number.isFinite(
            zahl
        )
    ) {

        return null;

    }

    return zahl;

}


// ==========================================================
// TEILNEHMER LADEN
// ==========================================================
//
// Diese Funktion wird nur verwendet, wenn die alte
// Ergebniserfassung ohne start_id geöffnet wird.
//
// In diesem Fall kann der Benutzer einen Teilnehmer
// auswählen.
// Danach werden dessen Starts geladen.
//
// ==========================================================

async function teilnehmerLaden() {

    if (!teilnehmerSelect) {

        return;

    }

    const {
        data,
        error
    } =
        await appSupabase

            .from("participants")

            .select(`
                id,
                vorname,
                nachname
            `)

            .order(
                "nachname",
                {
                    ascending: true
                }
            )

            .order(
                "vorname",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Fehler beim Laden der Teilnehmer:",
            error
        );

        meldungAnzeigen(
            "❌ Teilnehmer konnten nicht geladen werden.",
            "status-fehler"
        );

        return;

    }


    teilnehmerSelect.innerHTML = `

        <option value="">
            Teilnehmer auswählen
        </option>

    `;


    (data || []).forEach(
        function(person) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                person.id;

            option.textContent =
                person.nachname +
                ", " +
                person.vorname;

            teilnehmerSelect.appendChild(
                option
            );

        }
    );

}


// ==========================================================
// STARTS EINES TEILNEHMERS LADEN
// ==========================================================

async function startsDesTeilnehmersLaden(
    participantId
) {

    if (
        participantId === null ||
        participantId === undefined ||
        participantId === ""
    ) {

        return [];

    }


    let query =
        appSupabase

            .from("starts")

            .select(`
                id,
                competition_id,
                participant_id,
                team_id,
                ak,
                competitions (
                    id,
                    name,
                    datum,
                    status
                ),
                teams (
                    id,
                    name
                )
            `)

            .eq(
                "participant_id",
                participantId
            );


    if (urlCompetitionId) {

        query =
            query.eq(
                "competition_id",
                urlCompetitionId
            );

    }


    const {
        data,
        error
    } =
        await query;


    if (error) {

        console.error(
            "Fehler beim Laden der Starts:",
            error
        );

        return [];

    }


    return data || [];

}


// ==========================================================
// START AUSWÄHLEN
// ==========================================================
//
// Da ein Teilnehmer mehrere Starts haben kann,
// muss der konkrete Start ausgewählt werden.
//
// Die Funktion erzeugt dafür bei Bedarf ein zusätzliches
// Auswahlfeld direkt unter dem Teilnehmerfeld.
//
// ==========================================================

function startAuswahlErzeugen(
    starts
) {

    let container =
        document.getElementById(
            "start-auswahl-container"
        );


    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "start-auswahl-container";

        container.className =
            "form-group";


        if (
            teilnehmerSelect
        ) {

            teilnehmerSelect
                .closest(
                    ".form-group"
                )
                ?.after(
                    container
                );

        }

    }


    container.innerHTML =
        "";


    if (
        !starts ||
        starts.length === 0
    ) {

        aktuellerStart =
            null;

        return;

    }


    const label =
        document.createElement(
            "label"
        );

    label.setAttribute(
        "for",
        "start-auswahl"
    );

    label.textContent =
        "Start auswählen";


    const select =
        document.createElement(
            "select"
        );

    select.id =
        "start-auswahl";

    select.required =
        true;


    const ersteOption =
        document.createElement(
            "option"
        );

    ersteOption.value =
        "";

    ersteOption.textContent =
        "Start auswählen";

    select.appendChild(
        ersteOption
    );


    starts.forEach(
        function(start, index) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                start.id;


            const wettkampf =
                start.competitions;


            const team =
                start.teams;


            let text =
                "";


            if (wettkampf) {

                text +=
                    wettkampf.name;

            } else {

                text +=
                    "Wettkampf";

            }


            if (
                wettkampf?.datum
            ) {

                const datum =
                    new Date(
                        wettkampf.datum
                    )
                    .toLocaleDateString(
                        "de-DE"
                    );

                text +=
                    " – " +
                    datum;

            }


            if (team?.name) {

                text +=
                    " – " +
                    team.name;

            } else {

                text +=
                    " – Einzelstart";

            }


            if (start.ak) {

                text +=
                    " – AK";

            }


            option.textContent =
                text;


            select.appendChild(
                option
            );


            // Wenn nur ein Start vorhanden ist,
            // automatisch auswählen.

            if (
                starts.length === 1 &&
                index === 0
            ) {

                option.selected =
                    true;

            }

        }
    );


    container.appendChild(
        label
    );

    container.appendChild(
        select
    );


    select.addEventListener(
        "change",
        async function() {

            const selectedStartId =
                select.value;


            if (!selectedStartId) {

                aktuellerStart =
                    null;

                ergebnisseLeeren();

                return;

            }


            aktuellerStart =
                starts.find(
                    function(start) {

                        return (
                            start.id ===
                            selectedStartId
                        );

                    }
                ) || null;


            await vorhandeneErgebnisseLaden();

        }
    );


    // Bei nur einem Start automatisch laden.

    if (
        starts.length === 1
    ) {

        aktuellerStart =
            starts[0];

        vorhandeneErgebnisseLaden();

    }

}


// ==========================================================
// TEILNEHMER-AUSWAHL
// ==========================================================

async function teilnehmerAusgewaehlt() {

    if (!teilnehmerSelect) {

        return;

    }


    const participantId =
        teilnehmerSelect.value;


    ergebnisseLeeren();


    if (!participantId) {

        aktuellerStart =
            null;

        startAuswahlErzeugen(
            []
        );

        return;

    }


    meldungAnzeigen(
        "Starts werden geladen ..."
    );


    const starts =
        await startsDesTeilnehmersLaden(
            participantId
        );


    startAuswahlErzeugen(
        starts
    );


    if (
        starts.length === 0
    ) {

        meldungAnzeigen(
            "⚠️ Für diesen Teilnehmer wurde noch kein Start angelegt.",
            "status-fehler"
        );

        return;

    }


    if (
        starts.length > 1
    ) {

        meldungAnzeigen(
            "Bitte den gewünschten Start auswählen."
        );

    } else {

        meldungAnzeigen(
            ""
        );

    }

}


// ==========================================================
// ERGEBNISSE LEEREN
// ==========================================================

function ergebnisseLeeren() {

    if (ergebnis1Input) {

        ergebnis1Input.value =
            "";

    }

    if (ergebnis2Input) {

        ergebnis2Input.value =
            "";

    }

    if (ergebnis3Input) {

        ergebnis3Input.value =
            "";

    }

}


// ==========================================================
// VORHANDENE ERGEBNISSE LADEN
// ==========================================================

async function vorhandeneErgebnisseLaden() {

    if (
        !aktuellerStart ||
        !aktuellerStart.id
    ) {

        ergebnisseLeeren();

        return;

    }


    const {
        data,
        error
    } =
        await appSupabase

            .from("results")

            .select(`
                id,
                start_id,
                nummer,
                wert
            `)

            .eq(
                "start_id",
                aktuellerStart.id
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

        meldungAnzeigen(
            "❌ Ergebnisse konnten nicht geladen werden.",
            "status-fehler"
        );

        return;

    }


    ergebnisseLeeren();


    (data || []).forEach(
        function(result) {

            const wert =
                Number(
                    result.wert
                );


            if (
                result.nummer === 1 &&
                ergebnis1Input
            ) {

                ergebnis1Input.value =
                    Number.isFinite(
                        wert
                    )
                        ? wert
                        : "";

            }


            if (
                result.nummer === 2 &&
                ergebnis2Input
            ) {

                ergebnis2Input.value =
                    Number.isFinite(
                        wert
                    )
                        ? wert
                        : "";

            }


            if (
                result.nummer === 3 &&
                ergebnis3Input
            ) {

                ergebnis3Input.value =
                    Number.isFinite(
                        wert
                    )
                        ? wert
                        : "";

            }

        }
    );


    if (
        data &&
        data.length > 0
    ) {

        meldungAnzeigen(
            "Vorhandene Ergebnisse geladen."
        );

    }

}


// ==========================================================
// START AUS URL LADEN
// ==========================================================

async function startAusUrlLaden() {

    if (!urlStartId) {

        return false;

    }


    const {
        data,
        error
    } =
        await appSupabase

            .from("starts")

            .select(`
                id,
                competition_id,
                participant_id,
                team_id,
                ak,
                participants (
                    id,
                    vorname,
                    nachname
                ),
                competitions (
                    id,
                    name,
                    datum,
                    status
                ),
                teams (
                    id,
                    name
                )
            `)

            .eq(
                "id",
                urlStartId
            )

            .single();


    if (error) {

        console.error(
            "Fehler beim Laden des Starts:",
            error
        );

        meldungAnzeigen(
            "❌ Der ausgewählte Start konnte nicht geladen werden.",
            "status-fehler"
        );

        return true;

    }


    aktuellerStart =
        data;


    // ------------------------------------------------------
    // Teilnehmer im Select anzeigen
    // ------------------------------------------------------

    if (
        teilnehmerSelect &&
        data.participants
    ) {

        teilnehmerSelect.innerHTML =
            "";


        const option =
            document.createElement(
                "option"
            );


        option.value =
            data.participants.id;


        option.textContent =

            data.participants.nachname +
            ", " +
            data.participants.vorname;


        option.selected =
            true;


        teilnehmerSelect.appendChild(
            option
        );


        teilnehmerSelect.disabled =
            true;

    }


    // ------------------------------------------------------
    // Start-Auswahl anzeigen
    // ------------------------------------------------------

    startAuswahlErzeugen(
        [data]
    );


    const startSelect =
        document.getElementById(
            "start-auswahl"
        );


    if (startSelect) {

        startSelect.value =
            data.id;

        startSelect.disabled =
            true;

    }


    await vorhandeneErgebnisseLaden();


    return true;

}


// ==========================================================
// ERGEBNISSE SPEICHERN
// ==========================================================

async function ergebnisseSpeichern(
    event
) {

    event.preventDefault();


    // ------------------------------------------------------
    // Prüfen, ob ein Start vorhanden ist
    // ------------------------------------------------------

    if (
        !aktuellerStart ||
        !aktuellerStart.id
    ) {

        meldungAnzeigen(
            "❌ Bitte zuerst einen konkreten Start auswählen.",
            "status-fehler"
        );

        return;

    }


    // ------------------------------------------------------
    // Werte lesen
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // Pflichtfelder prüfen
    // ------------------------------------------------------

    if (
        wert1 === null ||
        wert2 === null ||
        wert3 === null
    ) {

        meldungAnzeigen(
            "❌ Bitte alle drei Ergebnisse eingeben.",
            "status-fehler"
        );

        return;

    }


    // ------------------------------------------------------
    // Negative Werte verhindern
    // ------------------------------------------------------

    if (
        wert1 < 0 ||
        wert2 < 0 ||
        wert3 < 0
    ) {

        meldungAnzeigen(
            "❌ Ergebnisse dürfen nicht negativ sein.",
            "status-fehler"
        );

        return;

    }


    // ------------------------------------------------------
    // Button sperren
    // ------------------------------------------------------

    const button =
        form?.querySelector(
            'button[type="submit"]'
        );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Speichern ...";

    }


    try {

        // ==================================================
        // ALTE ERGEBNISSE DIESES STARTS LÖSCHEN
        // ==================================================

        const {
            error: deleteError
        } =
            await appSupabase

                .from("results")

                .delete()

                .eq(
                    "start_id",
                    aktuellerStart.id
                );


        if (deleteError) {

            console.error(
                "Fehler beim Löschen alter Ergebnisse:",
                deleteError
            );

            meldungAnzeigen(
                "❌ Ergebnisse konnten nicht aktualisiert werden.",
                "status-fehler"
            );

            return;

        }


        // ==================================================
        // NEUE ERGEBNISSE
        // ==================================================

        const neueErgebnisse = [

            {
                start_id:
                    aktuellerStart.id,

                nummer:
                    1,

                wert:
                    wert1
            },

            {
                start_id:
                    aktuellerStart.id,

                nummer:
                    2,

                wert:
                    wert2
            },

            {
                start_id:
                    aktuellerStart.id,

                nummer:
                    3,

                wert:
                    wert3
            }

        ];


        // ==================================================
        // INSERT
        // ==================================================

        const {
            data,
            error: insertError
        } =
            await appSupabase

                .from("results")

                .insert(
                    neueErgebnisse
                )

                .select();


        if (insertError) {

            console.error(
                "Fehler beim Speichern:",
                insertError
            );

            meldungAnzeigen(
                "❌ Ergebnisse konnten nicht gespeichert werden.",
                "status-fehler"
            );

            return;

        }


        console.log(
            "Ergebnisse gespeichert:",
            data
        );


        meldungAnzeigen(
            "✅ Ergebnisse erfolgreich gespeichert.",
            "status-ok"
        );


    } catch (fehler) {

        console.error(
            "Unerwarteter Fehler:",
            fehler
        );


        meldungAnzeigen(
            "❌ Ein unerwarteter Fehler ist aufgetreten.",
            "status-fehler"
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Ergebnisse speichern";

        }

    }

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
// TEILNEHMER EVENT
// ==========================================================

if (teilnehmerSelect) {

    teilnehmerSelect.addEventListener(
        "change",
        teilnehmerAusgewaehlt
    );

}


// ==========================================================
// START
// ==========================================================

async function appStart() {

    // ------------------------------------------------------
    // Wenn die Seite mit ?start_id= geöffnet wurde
    // ------------------------------------------------------

    if (urlStartId) {

        await startAusUrlLaden();

        return;

    }


    // ------------------------------------------------------
    // Normale Ergebniserfassung
    // ------------------------------------------------------

    if (teilnehmerSelect) {

        await teilnehmerLaden();

    }

}


// ==========================================================
// AUSFÜHREN
// ==========================================================

appStart();
