// ==========================================================
// SSV 1928 SULZBACH E.V.
// ERGEBNISERFASSUNG
// DATEI: app.js
// ==========================================================


// ==========================================================
// SUPABASE
// ==========================================================

const ergebnisSupabaseClient =
    supabaseClient;


// ==========================================================
// DOM
// ==========================================================

const sucheInput =
    document.getElementById(
        "teilnehmer-suche"
    );


const suchergebnisse =
    document.getElementById(
        "teilnehmer-suchergebnisse"
    );


const startAuswahlBereich =
    document.getElementById(
        "start-auswahl-bereich"
    );


const startAuswahl =
    document.getElementById(
        "start-auswahl"
    );


const ausgewaehlterTeilnehmer =
    document.getElementById(
        "ausgewaehlter-teilnehmer"
    );


const ergebnisBereich =
    document.getElementById(
        "ergebnis-bereich"
    );


const ergebnisForm =
    document.getElementById(
        "ergebnis-form"
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


const ergebnisMeldung =
    document.getElementById(
        "ergebnis-meldung"
    );


const speichernButton =
    document.getElementById(
        "ergebnis-speichern"
    );


// ==========================================================
// VARIABLEN
// ==========================================================

let ausgewaehlterTeilnehmerId =
    null;


let aktuellerStartId =
    null;


let suchTimer =
    null;


// ==========================================================
// HTML SICHER MACHEN
// ==========================================================

function htmlSicher(
    text
) {

    const element =
        document.createElement(
            "div"
        );


    element.textContent =
        text ?? "";


    return element.innerHTML;

}


// ==========================================================
// MELDUNG
// ==========================================================

function meldungAnzeigen(
    text,
    typ = ""
) {

    if (!ergebnisMeldung) {
        return;
    }


    ergebnisMeldung.textContent =
        text;


    ergebnisMeldung.className =
        "meldung";


    if (typ) {

        ergebnisMeldung.classList.add(
            typ
        );

    }

}


// ==========================================================
// ZAHL UMRECHNEN
// ==========================================================

function zahlAusEingabe(
    wert
) {

    if (
        wert === null ||
        wert === undefined
    ) {

        return null;

    }


    const bereinigt =
        String(wert)
            .trim()
            .replace(",", ".");


    if (bereinigt === "") {
        return null;
    }


    const zahl =
        Number(
            bereinigt
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
// TEILNEHMER SUCHEN
// ==========================================================

async function teilnehmerSuchen() {

    if (!sucheInput) {
        return;
    }


    const suchtext =
        sucheInput.value.trim();


    if (
        suchtext.length < 1
    ) {

        suchergebnisse.innerHTML =
            "";

        return;

    }


    suchergebnisse.innerHTML = `

        <p class="loading">
            Suche ...
        </p>

    `;


    // ======================================================
    // VORNAME ODER NACHNAME
    // ======================================================

    const {
        data,
        error
    } =
        await ergebnisSupabaseClient

            .from("participants")

            .select(`
                id,
                vorname,
                nachname
            `)

            .or(
                `vorname.ilike.%${suchtext}%,nachname.ilike.%${suchtext}%`
            )

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
            )

            .limit(
                30
            );


    if (error) {

        console.error(
            "Fehler bei der Teilnehmer-Suche:",
            error
        );


        suchergebnisse.innerHTML = `

            <div class="error">

                Fehler bei der Teilnehmer-Suche.

            </div>

        `;


        return;

    }


    suchergebnisse.innerHTML =
        "";


    if (
        !data ||
        data.length === 0
    ) {

        suchergebnisse.innerHTML = `

            <div class="empty-state">

                <strong>
                    Kein Teilnehmer gefunden.
                </strong>

                <span>
                    Bitte Vor- oder Nachnamen prüfen.
                </span>

            </div>

        `;


        return;

    }


    // ======================================================
    // TREFFER ANZEIGEN
    // ======================================================

    data.forEach(
        function(person) {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "teilnehmer-suchergebnis";


            element.innerHTML = `

                <div>

                    <strong>

                        ${htmlSicher(
                            person.vorname
                        )}

                        ${htmlSicher(
                            person.nachname
                        )}

                    </strong>

                </div>

            `;


            element.addEventListener(
                "click",
                function() {

                    teilnehmerAuswaehlen(
                        person
                    );

                }
            );


            suchergebnisse.appendChild(
                element
            );

        }
    );

}


// ==========================================================
// TEILNEHMER AUSWÄHLEN
// ==========================================================

async function teilnehmerAuswaehlen(
    person
) {

    ausgewaehlterTeilnehmerId =
        person.id;


    aktuellerStartId =
        null;


    sucheInput.value =
        `${person.vorname} ${person.nachname}`;


    suchergebnisse.innerHTML =
        "";


    ausgewaehlterTeilnehmer.textContent =
        `${person.vorname} ${person.nachname}`;


    startAuswahlBereich.style.display =
        "block";


    ergebnisBereich.style.display =
        "none";


    await startsDesTeilnehmersLaden();

}


// ==========================================================
// STARTS DES TEILNEHMERS LADEN
// ==========================================================

async function startsDesTeilnehmersLaden() {

    startAuswahl.innerHTML = `

        <option value="">
            Starts werden geladen ...
        </option>

    `;


    const {
        data,
        error
    } =
        await ergebnisSupabaseClient

            .from("starts")

            .select(`
                id,
                competition_id,
                participant_id,
                team_id,
                ak,
                created_at,
                competitions (
                    id,
                    name,
                    datum
                ),
                teams (
                    name
                )
            `)

            .eq(
                "participant_id",
                ausgewaehlterTeilnehmerId
            )

            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Fehler beim Laden der Starts:",
            error
        );


        startAuswahl.innerHTML = `

            <option value="">
                Fehler beim Laden
            </option>

        `;


        meldungAnzeigen(
            "❌ Starts konnten nicht geladen werden.",
            "status-fehler"
        );


        return;

    }


    startAuswahl.innerHTML = `

        <option value="">
            Start auswählen
        </option>

    `;


    if (
        !data ||
        data.length === 0
    ) {

        startAuswahl.innerHTML = `

            <option value="">
                Keine Starts vorhanden
            </option>

        `;


        meldungAnzeigen(
            "⚠️ Für diesen Teilnehmer gibt es noch keinen Start.",
            "status-warnung"
        );


        return;

    }


    // ======================================================
    // ALLE STARTS ANZEIGEN
    // ======================================================

    data.forEach(
        function(start, index) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                start.id;


            const wettkampf =
                start.competitions?.name
                || "Unbekannter Wettkampf";


            const team =
                start.teams?.name
                || "Einzelstart";


            const akText =
                start.ak
                ? " – AK"
                : "";


            option.textContent =
                `Start ${index + 1}: ` +
                `${wettkampf} – ` +
                `${team}` +
                `${akText}`;


            startAuswahl.appendChild(
                option
            );

        }
    );


    meldungAnzeigen(
        ""
    );

}


// ==========================================================
// START AUSWÄHLEN
// ==========================================================

async function startAuswaehlen() {

    const startId =
        startAuswahl.value;


    aktuellerStartId =
        startId || null;


    if (!aktuellerStartId) {

        ergebnisBereich.style.display =
            "none";

        return;

    }


    ergebnisBereich.style.display =
        "block";


    await vorhandeneErgebnisseLaden();

}


// ==========================================================
// VORHANDENE ERGEBNISSE LADEN
// ==========================================================

async function vorhandeneErgebnisseLaden() {

    ergebnis1Input.value =
        "";

    ergebnis2Input.value =
        "";

    ergebnis3Input.value =
        "";


    const {
        data,
        error
    } =
        await ergebnisSupabaseClient

            .from("results")

            .select(`
                id,
                start_id,
                nummer,
                wert
            `)

            .eq(
                "start_id",
                aktuellerStartId
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


        return;

    }


    if (
        !data ||
        data.length === 0
    ) {

        meldungAnzeigen(
            "Noch keine Ergebnisse für diesen Start.",
            "status-warnung"
        );


        return;

    }


    data.forEach(
        function(ergebnis) {

            const wert =
                ergebnis.wert;


            if (
                Number(ergebnis.nummer) === 1
            ) {

                ergebnis1Input.value =
                    String(wert)
                        .replace(".", ",");

            }


            if (
                Number(ergebnis.nummer) === 2
            ) {

                ergebnis2Input.value =
                    String(wert)
                        .replace(".", ",");

            }


            if (
                Number(ergebnis.nummer) === 3
            ) {

                ergebnis3Input.value =
                    String(wert)
                        .replace(".", ",");

            }

        }
    );


    meldungAnzeigen(
        "Vorhandene Ergebnisse wurden geladen.",
        "status-ok"
    );

}


// ==========================================================
// ERGEBNISSE SPEICHERN
// ==========================================================

async function ergebnisseSpeichern(
    event
) {

    event.preventDefault();


    if (!aktuellerStartId) {

        meldungAnzeigen(
            "❌ Bitte zuerst einen Start auswählen.",
            "status-fehler"
        );


        return;

    }


    const wert1 =
        zahlAusEingabe(
            ergebnis1Input.value
        );


    const wert2 =
        zahlAusEingabe(
            ergebnis2Input.value
        );


    const wert3 =
        zahlAusEingabe(
            ergebnis3Input.value
        );


    if (
        wert1 === null ||
        wert2 === null ||
        wert3 === null
    ) {

        meldungAnzeigen(
            "❌ Bitte alle drei Ergebnisse korrekt eingeben.",
            "status-fehler"
        );


        return;

    }


    speichernButton.disabled =
        true;


    speichernButton.textContent =
        "Speichern ...";


    meldungAnzeigen(
        "Ergebnisse werden gespeichert ..."
    );


    try {

        // ==================================================
        // BISHERIGE ERGEBNISSE DIESES STARTS LÖSCHEN
        // ==================================================

        const {
            error: deleteError
        } =
            await ergebnisSupabaseClient

                .from("results")

                .delete()

                .eq(
                    "start_id",
                    aktuellerStartId
                );


        if (deleteError) {

            console.error(
                "Fehler beim Löschen alter Ergebnisse:",
                deleteError
            );


            throw deleteError;

        }


        // ==================================================
        // NEUE ERGEBNISSE SPEICHERN
        // ==================================================

        const neueErgebnisse = [

            {
                start_id:
                    aktuellerStartId,

                nummer:
                    1,

                wert:
                    wert1

            },

            {
                start_id:
                    aktuellerStartId,

                nummer:
                    2,

                wert:
                    wert2

            },

            {
                start_id:
                    aktuellerStartId,

                nummer:
                    3,

                wert:
                    wert3

            }

        ];


        const {
            data,
            error
        } =
            await ergebnisSupabaseClient

                .from("results")

                .insert(
                    neueErgebnisse
                )

                .select();


        if (error) {

            console.error(
                "Fehler beim Speichern:",
                error
            );


            throw error;

        }


        console.log(
            "Ergebnisse gespeichert:",
            data
        );


        // ==================================================
        // ERFOLG
        // ==================================================

        meldungAnzeigen(
            "✅ Ergebnisse erfolgreich gespeichert.",
            "status-ok"
        );


    }
    catch (error) {

        console.error(
            "Fehler bei der Ergebnisspeicherung:",
            error
        );


        meldungAnzeigen(
            "❌ Ergebnisse konnten nicht gespeichert werden.",
            "status-fehler"
        );

    }
    finally {

        speichernButton.disabled =
            false;


        speichernButton.textContent =
            "Ergebnisse speichern";

    }

}


// ==========================================================
// EVENTS
// ==========================================================

if (sucheInput) {

    sucheInput.addEventListener(
        "input",
        function() {

            clearTimeout(
                suchTimer
            );


            suchTimer =
                setTimeout(
                    teilnehmerSuchen,
                    250
                );

        }
    );

}


if (startAuswahl) {

    startAuswahl.addEventListener(
        "change",
        startAuswaehlen
    );

}


if (ergebnisForm) {

    ergebnisForm.addEventListener(
        "submit",
        ergebnisseSpeichern
    );

}


// ==========================================================
// START
// ==========================================================

console.log(
    "Ergebniserfassung geladen."
);
