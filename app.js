// ==========================================================
// SSV 1928 SULZBACH E.V.
// ERGEBNISSE ERFASSEN
// ==========================================================


// ==========================================================
// SUPABASE EINSTELLUNGEN
// ==========================================================

const SUPABASE_URL =
    "https://pvvdbcvdhggqbembqrda.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL";


// ==========================================================
// SUPABASE VERBINDUNG
// ==========================================================

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ==========================================================
// GLOBALE VARIABLEN
// ==========================================================

let starts = [];

let ausgewaehlterStart = null;

let suchTimer = null;


// ==========================================================
// HILFSFUNKTIONEN
// ==========================================================

function el(id) {

    return document.getElementById(id);

}


function escapeHtml(text) {

    if (
        text === null ||
        text === undefined
    ) {

        return "";

    }

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function zahlFormatieren(wert) {

    if (
        wert === null ||
        wert === undefined ||
        wert === ""
    ) {

        return "-";

    }


    const zahl =
        Number(wert);


    if (Number.isNaN(zahl)) {

        return "-";

    }


    return zahl
        .toFixed(2)
        .replace(".", ",");

}


function datumFormatieren(datum) {

    if (!datum) {

        return "";

    }


    const teile =
        String(datum).split("-");


    if (teile.length !== 3) {

        return datum;

    }


    return (
        teile[2] +
        "." +
        teile[1] +
        "." +
        teile[0]
    );

}


function meldung(
    text,
    typ = ""
) {

    const element =
        el("ergebnis-meldung");


    if (!element) {

        return;

    }


    element.textContent =
        text || "";


    element.className =
        "meldung";


    if (typ) {

        element.classList.add(
            typ
        );

    }

}


// ==========================================================
// STARTS LADEN
// ==========================================================

async function startsLaden() {

    const suchergebnisse =
        el("start-suchergebnisse");


    if (suchergebnisse) {

        suchergebnisse.innerHTML = `
            <p>
                Starts werden geladen ...
            </p>
        `;

    }


    const {
        data,
        error
    } = await supabaseClient

        .from("starts")

        .select(`
            id,
            competition_id,
            participant_id,
            team_id,
            ak,
            created_at,

            participants (
                id,
                vorname,
                nachname
            ),

            teams (
                id,
                name
            ),

            competitions (
                id,
                name,
                datum,
                anzahl_ergebnisse,
                teamgroesse,
                status
            )
        `)

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


        if (suchergebnisse) {

            suchergebnisse.innerHTML = `
                <p>
                    Fehler beim Laden der Starts.
                </p>
            `;

        }

        return;

    }


    starts =
        data || [];


    if (
        starts.length === 0
    ) {

        if (suchergebnisse) {

            suchergebnisse.innerHTML = `
                <p>
                    Es wurden noch keine Starts angelegt.
                </p>
            `;

        }

        return;

    }


    if (suchergebnisse) {

        suchergebnisse.innerHTML = `
            <p>
                ${starts.length}
                Start${starts.length === 1 ? "" : "s"}
                verfügbar.
            </p>
        `;

    }

}


// ==========================================================
// START SUCHEN
// ==========================================================

function startsSuchen() {

    const input =
        el("start-suche");


    const container =
        el("start-suchergebnisse");


    if (
        !input ||
        !container
    ) {

        return;

    }


    const suchtext =
        input.value
            .trim()
            .toLowerCase();


    container.innerHTML =
        "";


    if (!suchtext) {

        container.innerHTML = `
            <p>
                Bitte Namen eingeben.
            </p>
        `;

        return;

    }


    const treffer =
        starts.filter(
            function(start) {

                const person =
                    start.participants || {};


                const vorname =
                    String(
                        person.vorname || ""
                    ).toLowerCase();


                const nachname =
                    String(
                        person.nachname || ""
                    ).toLowerCase();


                const kompletterName =
                    `${vorname} ${nachname}`;


                const teamName =
                    String(
                        start.teams?.name || ""
                    ).toLowerCase();


                const wettkampfName =
                    String(
                        start.competitions?.name || ""
                    ).toLowerCase();


                return (

                    vorname.startsWith(
                        suchtext
                    )

                    ||

                    nachname.startsWith(
                        suchtext
                    )

                    ||

                    kompletterName.includes(
                        suchtext
                    )

                    ||

                    teamName.includes(
                        suchtext
                    )

                    ||

                    wettkampfName.includes(
                        suchtext
                    )

                );

            }
        );


    if (
        treffer.length === 0
    ) {

        container.innerHTML = `
            <p>
                Kein Start gefunden.
            </p>
        `;

        return;

    }


    treffer
        .forEach(
            function(start) {

                const button =
                    document.createElement(
                        "button"
                    );


                button.type =
                    "button";


                button.style.width =
                    "100%";


                button.style.textAlign =
                    "left";


                button.style.marginBottom =
                    "8px";


                button.innerHTML =
                    startAnzeigeText(
                        start
                    );


                button.addEventListener(
                    "click",
                    function() {

                        startAuswaehlen(
                            start
                        );

                    }
                );


                container.appendChild(
                    button
                );

            }
        );

}


// ==========================================================
// START ANZEIGETEXT
// ==========================================================

function startAnzeigeText(
    start
) {

    const person =
        start.participants || {};


    const vorname =
        person.vorname || "";


    const nachname =
        person.nachname || "";


    const wettkampf =
        start.competitions?.name ||
        "Unbekannter Wettkampf";


    const datum =
        start.competitions?.datum
            ? datumFormatieren(
                start.competitions.datum
            )
            : "";


    const team =
        start.teams?.name ||
        "Einzelstart";


    const status =
        start.ak
            ? "AK"
            : "Wertung";


    return `

        <div
            style="
                padding: 8px;
            "
        >

            <strong>
                ${escapeHtml(vorname)}
                ${escapeHtml(nachname)}
            </strong>

            <br>

            <span>
                ${escapeHtml(wettkampf)}
            </span>

            <br>

            <small>
                ${escapeHtml(datum)}
                |
                ${escapeHtml(team)}
                |
                ${status}
            </small>

        </div>

    `;

}


// ==========================================================
// START AUSWÄHLEN
// ==========================================================

async function startAuswaehlen(
    start
) {

    ausgewaehlterStart =
        start;


    // ------------------------------------------------------
    // INFO ANZEIGEN
    // ------------------------------------------------------

    const info =
        el("ausgewaehlter-start-info");


    if (info) {

        const person =
            start.participants || {};


        const team =
            start.teams?.name ||
            "Einzelstart";


        const status =
            start.ak
                ? "Außer Konkurrenz (AK)"
                : "Wertung";


        const wettkampf =
            start.competitions?.name ||
            "";


        const datum =
            start.competitions?.datum
                ? datumFormatieren(
                    start.competitions.datum
                )
                : "";


        info.innerHTML = `

            <div>

                <p>
                    <strong>
                        Starter:
                    </strong>

                    ${escapeHtml(
                        person.vorname || ""
                    )}
                    ${escapeHtml(
                        person.nachname || ""
                    )}
                </p>


                <p>
                    <strong>
                        Wettkampf:
                    </strong>

                    ${escapeHtml(
                        wettkampf
                    )}
                </p>


                <p>
                    <strong>
                        Datum:
                    </strong>

                    ${escapeHtml(
                        datum
                    )}
                </p>


                <p>
                    <strong>
                        Team:
                    </strong>

                    ${escapeHtml(
                        team
                    )}
                </p>


                <p>
                    <strong>
                        Status:
                    </strong>

                    ${status}
                </p>

            </div>

        `;

    }


    // ------------------------------------------------------
    // BEREICHE EINBLENDEN
    // ------------------------------------------------------

    const startBereich =
        el(
            "ausgewaehlter-start-bereich"
        );


    if (startBereich) {

        startBereich.style.display =
            "";

    }


    const ergebnisBereich =
        el(
            "ergebnis-bereich"
        );


    if (ergebnisBereich) {

        ergebnisBereich.style.display =
            "";

    }


    // ------------------------------------------------------
    // SUCHERGEBNISSE AUSBLENDEN
    // ------------------------------------------------------

    const suche =
        el("start-suche");


    if (suche) {

        suche.value =
            "";

    }


    const suchergebnisse =
        el("start-suchergebnisse");


    if (suchergebnisse) {

        suchergebnisse.innerHTML =
            "";

    }


    // ------------------------------------------------------
    // ERGEBNISSE DES STARTS LADEN
    // ------------------------------------------------------

    await ergebnisseFelderErstellen();

}


// ==========================================================
// ERGEBNISFELDER ERSTELLEN
// ==========================================================

async function ergebnisseFelderErstellen() {

    const container =
        el("ergebnis-felder");


    if (
        !container ||
        !ausgewaehlterStart
    ) {

        return;

    }


    container.innerHTML = `
        <p>
            Ergebnisse werden geladen ...
        </p>
    `;


    // ------------------------------------------------------
    // ANZAHL DER ERGEBNISSE
    // ------------------------------------------------------

    let anzahl =
        Number(
            ausgewaehlterStart
                .competitions
                ?.anzahl_ergebnisse
        );


    if (
        !anzahl ||
        anzahl < 1
    ) {

        anzahl =
            3;

    }


    // ------------------------------------------------------
    // VORHANDENE ERGEBNISSE LADEN
    // ------------------------------------------------------

    const {
        data,
        error
    } = await supabaseClient

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
            ausgewaehlterStart.id
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


        container.innerHTML = `
            <p>
                Fehler beim Laden der Ergebnisse.
            </p>
        `;

        return;

    }


    const vorhandene =
        {};


    (data || [])
        .forEach(
            function(result) {

                vorhandene[
                    Number(result.nummer)
                ] =
                    result;

            }
        );


    // ------------------------------------------------------
    // FELDER
    // ------------------------------------------------------

    container.innerHTML =
        "";


    for (
        let nummer = 1;
        nummer <= anzahl;
        nummer++
    ) {

        const result =
            vorhandene[
                nummer
            ];


        const gruppe =
            document.createElement(
                "div"
            );


        gruppe.className =
            "form-group";


        const label =
            document.createElement(
                "label"
            );


        label.setAttribute(
            "for",
            `ergebnis-${nummer}`
        );


        label.textContent =
            `Ergebnis ${nummer}`;


        const input =
            document.createElement(
                "input"
            );


        input.type =
            "text";


        input.id =
            `ergebnis-${nummer}`;


        input.name =
            `ergebnis-${nummer}`;


        input.inputMode =
            "decimal";


        input.placeholder =
            "z. B. 12,40";


        input.autocomplete =
            "off";


        if (
            result &&
            result.wert !== null &&
            result.wert !== undefined
        ) {

            input.value =
                String(
                    result.wert
                ).replace(
                    ".",
                    ","
                );

        }


        gruppe.appendChild(
            label
        );


        gruppe.appendChild(
            input
        );


        container.appendChild(
            gruppe
        );

    }


    // ------------------------------------------------------
    // VORHANDENE ERGEBNISSE ANZEIGEN
    // ------------------------------------------------------

    vorhandeneErgebnisseAnzeigen(
        data || []
    );

}


// ==========================================================
// VORHANDENE ERGEBNISSE
// ==========================================================

function vorhandeneErgebnisseAnzeigen(
    results
) {

    const bereich =
        el(
            "vorhandene-ergebnisse-bereich"
        );


    const container =
        el(
            "vorhandene-ergebnisse"
        );


    if (
        !bereich ||
        !container
    ) {

        return;

    }


    if (
        !results ||
        results.length === 0
    ) {

        bereich.style.display =
            "none";

        return;

    }


    bereich.style.display =
        "";


    const sortiert =
        [...results]
            .sort(
                function(a, b) {

                    return (
                        Number(a.nummer) -
                        Number(b.nummer)
                    );

                }
            );


    const gesamt =
        sortiert.reduce(
            function(summe, result) {

                const wert =
                    Number(
                        result.wert
                    );


                if (
                    Number.isNaN(
                        wert
                    )
                ) {

                    return summe;

                }


                return (
                    summe +
                    wert
                );

            },
            0
        );


    container.innerHTML = `

        <div>

            ${sortiert
                .map(
                    function(result) {

                        return `

                            <p>

                                <strong>
                                    Ergebnis
                                    ${result.nummer}:
                                </strong>

                                ${zahlFormatieren(
                                    result.wert
                                )}

                            </p>

                        `;

                    }
                )
                .join("")
            }


            <hr>


            <p>

                <strong>
                    Gesamt:
                </strong>

                ${zahlFormatieren(
                    gesamt
                )}

            </p>

        </div>

    `;

}


// ==========================================================
// ERGEBNISSE SPEICHERN
// ==========================================================

async function ergebnisseSpeichern(
    event
) {

    event.preventDefault();


    if (
        !ausgewaehlterStart
    ) {

        meldung(
            "Bitte zuerst einen Start auswählen.",
            "fehler"
        );

        return;

    }


    const anzahl =
        Number(
            ausgewaehlterStart
                .competitions
                ?.anzahl_ergebnisse
        ) || 3;


    const daten =
        [];


    // ------------------------------------------------------
    // EINGABEN PRÜFEN
    // ------------------------------------------------------

    for (
        let nummer = 1;
        nummer <= anzahl;
        nummer++
    ) {

        const input =
            el(
                `ergebnis-${nummer}`
            );


        if (!input) {
            continue;
        }


        const text =
            input.value
                .trim()
                .replace(
                    ",",
                    "."
                );


        if (!text) {

            meldung(
                `Bitte Ergebnis ${nummer} eingeben.`,
                "fehler"
            );

            input.focus();

            return;

        }


        const wert =
            Number(text);


        if (
            Number.isNaN(
                wert
            )
        ) {

            meldung(
                `Ergebnis ${nummer} ist keine gültige Zahl.`,
                "fehler"
            );

            input.focus();

            return;

        }


        daten.push({

            start_id:
                ausgewaehlterStart.id,

            nummer:
                nummer,

            wert:
                wert

        });

    }


    // ------------------------------------------------------
    // SPEICHERN
    //
    // Wir löschen die bisherigen Ergebnisse
    // dieses konkreten Starts und speichern
    // anschließend den aktuellen Stand neu.
    //
    // Dadurch sind nachträgliche Korrekturen
    // jederzeit möglich.
    // ------------------------------------------------------

    meldung(
        "Ergebnisse werden gespeichert..."
    );


    const {
        error: deleteError
    } = await supabaseClient

        .from("results")

        .delete()

        .eq(
            "start_id",
            ausgewaehlterStart.id
        );


    if (deleteError) {

        console.error(
            "Fehler beim Löschen der alten Ergebnisse:",
            deleteError
        );


        meldung(
            "Die bisherigen Ergebnisse konnten nicht aktualisiert werden.",
            "fehler"
        );

        return;

    }


    const {
        error: insertError
    } = await supabaseClient

        .from("results")

        .insert(
            daten
        );


    if (insertError) {

        console.error(
            "Fehler beim Speichern der Ergebnisse:",
            insertError
        );


        meldung(
            "Die Ergebnisse konnten nicht gespeichert werden.",
            "fehler"
        );

        return;

    }


    // ------------------------------------------------------
    // ERFOLG
    // ------------------------------------------------------

    meldung(
        "Ergebnisse erfolgreich gespeichert.",
        "erfolg"
    );


    // ------------------------------------------------------
    // FELDER AKTUALISIEREN
    // ------------------------------------------------------

    await ergebnisseFelderErstellen();

}


// ==========================================================
// START WECHSELN
// ==========================================================

function startWechseln() {

    ausgewaehlterStart =
        null;


    const startBereich =
        el(
            "ausgewaehlter-start-bereich"
        );


    if (startBereich) {

        startBereich.style.display =
            "none";

    }


    const ergebnisBereich =
        el(
            "ergebnis-bereich"
        );


    if (ergebnisBereich) {

        ergebnisBereich.style.display =
            "none";

    }


    const vorhandene =
        el(
            "vorhandene-ergebnisse-bereich"
        );


    if (vorhandene) {

        vorhandene.style.display =
            "none";

    }


    const suche =
        el("start-suche");


    if (suche) {

        suche.value =
            "";

        suche.focus();

    }


    const suchergebnisse =
        el(
            "start-suchergebnisse"
        );


    if (suchergebnisse) {

        suchergebnisse.innerHTML = `
            <p>
                Bitte Namen eingeben.
            </p>
        `;

    }


    meldung(
        ""
    );

}


// ==========================================================
// EVENTS
// ==========================================================

function eventsEinrichten() {


    // ------------------------------------------------------
    // SUCHFELD
    // ------------------------------------------------------

    const suche =
        el("start-suche");


    if (suche) {

        suche.addEventListener(
            "input",
            function() {

                clearTimeout(
                    suchTimer
                );


                suchTimer =
                    setTimeout(
                        startsSuchen,
                        100
                    );

            }
        );

    }


    // ------------------------------------------------------
    // ERGEBNISFORMULAR
    // ------------------------------------------------------

    const form =
        el("ergebnis-form");


    if (form) {

        form.addEventListener(
            "submit",
            ergebnisseSpeichern
        );

    }


    // ------------------------------------------------------
    // START WECHSELN
    // ------------------------------------------------------

    const wechseln =
        el("start-wechseln");


    if (wechseln) {

        wechseln.addEventListener(
            "click",
            startWechseln
        );

    }

}


// ==========================================================
// START
// ==========================================================

async function appStarten() {

    eventsEinrichten();


    await startsLaden();

}


// ==========================================================
// APP STARTEN
// ==========================================================

appStarten();
