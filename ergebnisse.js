// ==========================================================
// SSV 1928 SULZBACH E.V.
// ERGEBNISSE
// ==========================================================


// ==========================================================
// SUPABASE
// ==========================================================

const SUPABASE_URL =
    "https://pvvdbcvdhggqbembqrda.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL";


const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ==========================================================
// HILFSFUNKTIONEN
// ==========================================================

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


// ==========================================================
// ERGEBNISSE LADEN
// ==========================================================

async function ergebnisseLaden() {

    const tabelle =
        document.getElementById(
            "ergebnis-tabelle"
        );


    if (!tabelle) {
        return;
    }


    // ------------------------------------------------------
    // STARTS LADEN
    // ------------------------------------------------------

    const {
        data: starts,
        error: startsError
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
                teamgroesse,
                anzahl_ergebnisse
            )
        `)

        .order(
            "created_at",
            {
                ascending: true
            }
        );


    if (startsError) {

        console.error(
            "Fehler beim Laden der Starts:",
            startsError
        );


        tabelle.innerHTML = `
            <tr>
                <td colspan="8">
                    Fehler beim Laden der Wettkampfstarts.
                </td>
            </tr>
        `;

        return;

    }


    if (
        !starts ||
        starts.length === 0
    ) {

        tabelle.innerHTML = `
            <tr>
                <td colspan="8">
                    Noch keine Starts vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    // ------------------------------------------------------
    // ALLE ERGEBNISSE LADEN
    // ------------------------------------------------------

    const startIds =
        starts.map(
            function(start) {

                return start.id;

            }
        );


    const {
        data: results,
        error: resultsError
    } = await supabaseClient

        .from("results")

        .select(`
            id,
            start_id,
            nummer,
            wert,
            created_at
        `)

        .in(
            "start_id",
            startIds
        )

        .order(
            "nummer",
            {
                ascending: true
            }
        );


    if (resultsError) {

        console.error(
            "Fehler beim Laden der Ergebnisse:",
            resultsError
        );


        tabelle.innerHTML = `
            <tr>
                <td colspan="8">
                    Fehler beim Laden der Ergebnisse.
                </td>
            </tr>
        `;

        return;

    }


    // ------------------------------------------------------
    // ERGEBNISSE NACH START SORTIEREN
    // ------------------------------------------------------

    const ergebnisseNachStart =
        {};


    (results || [])
        .forEach(
            function(result) {

                if (
                    !ergebnisseNachStart[
                        result.start_id
                    ]
                ) {

                    ergebnisseNachStart[
                        result.start_id
                    ] = [];

                }


                ergebnisseNachStart[
                    result.start_id
                ].push(
                    result
                );

            }
        );


    // ------------------------------------------------------
    // STARTS AUFBEREITEN
    // ------------------------------------------------------

    const daten =
        starts.map(
            function(start) {

                const ergebnisse =
                    ergebnisseNachStart[
                        start.id
                    ] || [];


                const sortierteErgebnisse =
                    [...ergebnisse]
                        .sort(
                            function(a, b) {

                                return (
                                    Number(a.nummer) -
                                    Number(b.nummer)
                                );

                            }
                        );


                const gesamt =
                    sortierteErgebnisse.reduce(
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


                return {

                    ...start,

                    ergebnisse:
                        sortierteErgebnisse,

                    gesamt:
                        gesamt

                };

            }
        );


    // ------------------------------------------------------
    // SORTIERUNG
    //
    // Höchstes Gesamtergebnis zuerst
    // ------------------------------------------------------

    daten.sort(
        function(a, b) {

            return (
                b.gesamt -
                a.gesamt
            );

        }
    );


    // ------------------------------------------------------
    // TABELLE LEEREN
    // ------------------------------------------------------

    tabelle.innerHTML =
        "";


    // ------------------------------------------------------
    // TABELLE AUFBAUEN
    // ------------------------------------------------------

    daten.forEach(
        function(start, index) {

            const zeile =
                document.createElement(
                    "tr"
                );


            const person =
                start.participants || {};


            const team =
                start.teams || null;


            const competition =
                start.competitions || null;


            const ergebnisse =
                start.ergebnisse || [];


            // ------------------------------------------------
            // ERGEBNISSPALTEN
            // ------------------------------------------------

            const ergebnisZellen =
                ergebnisse
                    .map(
                        function(result) {

                            return `
                                <td>
                                    ${zahlFormatieren(
                                        result.wert
                                    )}
                                </td>
                            `;

                        }
                    )
                    .join("");


            // ------------------------------------------------
            // STATUS
            // ------------------------------------------------

            const status =
                start.ak
                    ? `<span class="ak-badge">AK</span>`
                    : `<span>Wertung</span>`;


            // ------------------------------------------------
            // TEAM
            // ------------------------------------------------

            const teamName =
                team?.name ||
                "Einzelstart";


            // ------------------------------------------------
            // WETTKAMPF
            // ------------------------------------------------

            const wettkampfName =
                competition?.name ||
                "";


            const wettkampfDatum =
                competition?.datum
                ? datumFormatieren(
                    competition.datum
                )
                : "";


            // ------------------------------------------------
            // ZEILE
            // ------------------------------------------------

            zeile.innerHTML = `

                <td>
                    <strong>
                        ${index + 1}.
                    </strong>
                </td>


                <td>
                    ${escapeHtml(
                        person.vorname || ""
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        person.nachname || ""
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        teamName
                    )}
                </td>


                <td>
                    ${status}
                </td>


                ${ergebnisZellen}


                <td>
                    <strong>
                        ${zahlFormatieren(
                            start.gesamt
                        )}
                    </strong>
                </td>

            `;


            // ------------------------------------------------
            // ZUSATZINFORMATIONEN
            // ------------------------------------------------

            zeile.title =
                `${wettkampfName} – ${wettkampfDatum}`;


            tabelle.appendChild(
                zeile
            );

        }
    );


    // ------------------------------------------------------
    // KEINE ERGEBNISSE
    // ------------------------------------------------------

    if (daten.length === 0) {

        tabelle.innerHTML = `
            <tr>
                <td colspan="8">
                    Noch keine Ergebnisse vorhanden.
                </td>
            </tr>
        `;

    }

}


// ==========================================================
// START
// ==========================================================

ergebnisseLaden();


// ==========================================================
// AUTOMATISCHE AKTUALISIERUNG
// ==========================================================

setInterval(
    ergebnisseLaden,
    5000
);
