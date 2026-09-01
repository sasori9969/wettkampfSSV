// ==========================================================
// SSV 1928 SULZBACH E.V.
// ERGEBNISSE / RANGLISTE
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
// GLOBALE VARIABLEN
// ==========================================================

let alleStarts = [];

let alleTeams = [];

let aktuellerWettkampf = null;


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


function formatZahl(wert) {

    if (
        wert === null ||
        wert === undefined ||
        wert === ""
    ) {

        return "-";

    }


    const zahl =
        Number(wert);


    if (
        Number.isNaN(
            zahl
        )
    ) {

        return "-";

    }


    return zahl
        .toFixed(2)
        .replace(".", ",");

}


function formatDatum(datum) {

    if (!datum) {

        return "";

    }


    const teile =
        String(datum).split("-");


    if (
        teile.length !== 3
    ) {

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
// STARTS LADEN
// ==========================================================

async function startsLaden() {

    const tabelle =
        document.getElementById(
            "ergebnis-tabelle"
        );


    if (!tabelle) {

        return;

    }


    tabelle.innerHTML = `
        <tr>
            <td colspan="9">
                Ergebnisse werden geladen ...
            </td>
        </tr>
    `;


    // ------------------------------------------------------
    // STARTS
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


    if (startsError) {

        console.error(
            "Fehler beim Laden der Starts:",
            startsError
        );


        tabelle.innerHTML = `
            <tr>
                <td colspan="9">
                    Fehler beim Laden der Starts.
                </td>
            </tr>
        `;


        return;

    }


    alleStarts =
        starts || [];


    // ------------------------------------------------------
    // ERGEBNISSE LADEN
    // ------------------------------------------------------

    if (
        alleStarts.length === 0
    ) {

        tabelle.innerHTML = `
            <tr>
                <td colspan="9">
                    Noch keine Starts vorhanden.
                </td>
            </tr>
        `;


        filterAufbauen();


        return;

    }


    const startIds =
        alleStarts.map(
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
                <td colspan="9">
                    Fehler beim Laden der Ergebnisse.
                </td>
            </tr>
        `;


        return;

    }


    // ------------------------------------------------------
    // ERGEBNISSE DEN STARTS ZUORDNEN
    // ------------------------------------------------------

    alleStarts =
        alleStarts.map(
            function(start) {

                const startErgebnisse =
                    (results || [])
                        .filter(
                            function(result) {

                                return (
                                    result.start_id ===
                                    start.id
                                );

                            }
                        )
                        .sort(
                            function(a, b) {

                                return (
                                    Number(a.nummer) -
                                    Number(b.nummer)
                                );

                            }
                        );


                const gesamt =
                    startErgebnisse.reduce(
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
                        startErgebnisse,

                    gesamt:
                        gesamt

                };

            }
        );


    // ------------------------------------------------------
    // TEAMS ERMITTELN
    // ------------------------------------------------------

    const teamsMap =
        new Map();


    alleStarts.forEach(
        function(start) {

            if (
                start.teams &&
                start.team_id
            ) {

                teamsMap.set(
                    start.team_id,
                    start.teams
                );

            }

        }
    );


    alleTeams =
        Array.from(
            teamsMap.values()
        );


    // ------------------------------------------------------
    // FILTER AUFBAUEN
    // ------------------------------------------------------

    filterAufbauen();


    // ------------------------------------------------------
    // TABELLE ANZEIGEN
    // ------------------------------------------------------

    tabelleAnzeigen();

}


// ==========================================================
// FILTER AUFBAUEN
// ==========================================================

function filterAufbauen() {

    const wettkampfFilter =
        document.getElementById(
            "wettkampf-filter"
        );


    const teamFilter =
        document.getElementById(
            "team-filter"
        );


    if (
        wettkampfFilter
    ) {

        const aktuell =
            wettkampfFilter.value;


        wettkampfFilter.innerHTML = `
            <option value="">
                Alle Wettkämpfe
            </option>
        `;


        const wettkaempfe =
            new Map();


        alleStarts.forEach(
            function(start) {

                if (
                    start.competitions
                ) {

                    wettkaempfe.set(
                        start.competition_id,
                        start.competitions
                    );

                }

            }
        );


        Array.from(
            wettkaempfe.values()
        )
        .sort(
            function(a, b) {

                return String(
                    a.name || ""
                ).localeCompare(
                    String(
                        b.name || ""
                    ),
                    "de"
                );

            }
        )
        .forEach(
            function(wettkampf) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    wettkampf.id;


                option.textContent =
                    `${wettkampf.name} – ${formatDatum(wettkampf.datum)}`;


                wettkampfFilter.appendChild(
                    option
                );

            }
        );


        if (
            aktuell
        ) {

            wettkampfFilter.value =
                aktuell;

        }

    }


    if (
        teamFilter
    ) {

        const aktuell =
            teamFilter.value;


        teamFilter.innerHTML = `
            <option value="">
                Alle Teams
            </option>

            <option value="einzel">
                Einzelstarts
            </option>
        `;


        alleTeams
            .sort(
                function(a, b) {

                    return String(
                        a.name || ""
                    ).localeCompare(
                        String(
                            b.name || ""
                        ),
                        "de"
                    );

                }
            )
            .forEach(
                function(team) {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        team.id;


                    option.textContent =
                        team.name;


                    teamFilter.appendChild(
                        option
                    );

                }
            );


        if (
            aktuell
        ) {

            teamFilter.value =
                aktuell;

        }

    }

}


// ==========================================================
// FILTER AUSLESEN
// ==========================================================

function gefilterteStarts() {

    const wettkampfFilter =
        document.getElementById(
            "wettkampf-filter"
        );


    const teamFilter =
        document.getElementById(
            "team-filter"
        );


    const statusFilter =
        document.getElementById(
            "status-filter"
        );


    const wettkampf =
        wettkampfFilter
            ? wettkampfFilter.value
            : "";


    const team =
        teamFilter
            ? teamFilter.value
            : "";


    const status =
        statusFilter
            ? statusFilter.value
            : "";


    return alleStarts.filter(
        function(start) {

            // ------------------------------------------------
            // WETTKAMPF
            // ------------------------------------------------

            if (
                wettkampf &&
                start.competition_id !==
                wettkampf
            ) {

                return false;

            }


            // ------------------------------------------------
            // TEAM
            // ------------------------------------------------

            if (
                team === "einzel" &&
                start.team_id
            ) {

                return false;

            }


            if (
                team &&
                team !== "einzel" &&
                start.team_id !== team
            ) {

                return false;

            }


            // ------------------------------------------------
            // STATUS
            // ------------------------------------------------

            if (
                status === "ak" &&
                !start.ak
            ) {

                return false;

            }


            if (
                status === "wertung" &&
                start.ak
            ) {

                return false;

            }


            return true;

        }
    );

}


// ==========================================================
// STECHREGEL
// ==========================================================

function startsVergleichen(
    a,
    b
) {

    // ------------------------------------------------------
    // ZUERST GESAMT
    // ------------------------------------------------------

    if (
        a.gesamt !==
        b.gesamt
    ) {

        return (
            b.gesamt -
            a.gesamt
        );

    }


    // ------------------------------------------------------
    // DANN EINZELERGEBNISSE
    // ------------------------------------------------------

    const max =
        Math.max(
            a.ergebnisse.length,
            b.ergebnisse.length
        );


    for (
        let i = 0;
        i < max;
        i++
    ) {

        const aVorhanden =
            a.ergebnisse[i];


        const bVorhanden =
            b.ergebnisse[i];


        if (
            !aVorhanden &&
            !bVorhanden
        ) {

            break;

        }


        if (
            !aVorhanden &&
            bVorhanden
        ) {

            return 1;

        }


        if (
            aVorhanden &&
            !bVorhanden
        ) {

            return -1;

        }


        const wertA =
            Number(
                aVorhanden.wert
            );


        const wertB =
            Number(
                bVorhanden.wert
            );


        if (
            wertA !==
            wertB
        ) {

            return (
                wertB -
                wertA
            );

        }

    }


    return 0;

}


// ==========================================================
// SORTIEREN UND PLÄTZE
// ==========================================================

function ranglisteErstellen(
    starts
) {

    const sortiert =
        [...starts]
            .sort(
                startsVergleichen
            );


    let letzter =
        null;


    let platz =
        0;


    return sortiert.map(
        function(start, index) {

            if (
                letzter === null
            ) {

                platz = 1;

            } else {

                const vergleich =
                    startsVergleichen(
                        letzter,
                        start
                    );


                if (
                    vergleich !== 0
                ) {

                    platz =
                        index + 1;

                }

            }


            letzter =
                start;


            return {

                ...start,

                platz:

                    platz

            };

        }
    );

}


// ==========================================================
// TABELLE ANZEIGEN
// ==========================================================

function tabelleAnzeigen() {

    const tabelle =
        document.getElementById(
            "ergebnis-tabelle"
        );


    if (!tabelle) {

        return;

    }


    let starts =
        gefilterteStarts();


    // ------------------------------------------------------
    // NUR STARTS MIT ERGEBNISSEN
    // ------------------------------------------------------

    starts =
        starts.filter(
            function(start) {

                return (
                    start.ergebnisse &&
                    start.ergebnisse.length > 0
                );

            }
        );


    // ------------------------------------------------------
    // AK SEPARAT NACH UNTEN
    // ------------------------------------------------------

    const wertung =
        starts.filter(
            function(start) {

                return !start.ak;

            }
        );


    const ak =
        starts.filter(
            function(start) {

                return start.ak;

            }
        );


    const rangliste =
        ranglisteErstellen(
            wertung
        );


    // AK bekommt keinen normalen Platz
    const akListe =
        ak.map(
            function(start) {

                return {

                    ...start,

                    platz:
                        "-"

                };

            }
        );


    const alleAnzeigen =
        [
            ...rangliste,
            ...akListe
        ];


    // ------------------------------------------------------
    // LEER
    // ------------------------------------------------------

    if (
        alleAnzeigen.length === 0
    ) {

        tabelle.innerHTML = `
            <tr>
                <td colspan="9">
                    Keine passenden Ergebnisse vorhanden.
                </td>
            </tr>
        `;

        return;

    }


    // ------------------------------------------------------
    // TABELLE LEEREN
    // ------------------------------------------------------

    tabelle.innerHTML =
        "";


    // ------------------------------------------------------
    // ZEILEN
    // ------------------------------------------------------

    alleAnzeigen.forEach(
        function(start) {

            const zeile =
                document.createElement(
                    "tr"
                );


            const person =
                start.participants ||
                {};


            const wettkampf =
                start.competitions ||
                {};


            const team =
                start.teams?.name ||
                "Einzelstart";


            const status =
                start.ak
                    ? "AK"
                    : "Wertung";


            const ergebnisseText =
                start.ergebnisse
                    .map(
                        function(result) {

                            return (
                                formatZahl(
                                    result.wert
                                )
                            );

                        }
                    )
                    .join(
                        " / "
                    );


            zeile.innerHTML = `

                <td>

                    <strong>
                        ${
                            start.platz
                        }${

                            start.platz !== "-"
                                ? "."
                                : ""

                        }
                    </strong>

                </td>


                <td>
                    ${
                        escapeHtml(
                            wettkampf.name ||
                            ""
                        )
                    }
                </td>


                <td>
                    ${
                        formatDatum(
                            wettkampf.datum
                        )
                    }
                </td>


                <td>
                    ${
                        escapeHtml(
                            person.vorname ||
                            ""
                        )
                    }
                </td>


                <td>
                    ${
                        escapeHtml(
                            person.nachname ||
                            ""
                        )
                    }
                </td>


                <td>
                    ${
                        escapeHtml(
                            team
                        )
                    }
                </td>


                <td>
                    ${
                        status
                    }
                </td>


                <td>
                    ${
                        ergebnisseText
                    }
                </td>


                <td>

                    <strong>
                        ${
                            formatZahl(
                                start.gesamt
                            )
                        }
                    </strong>

                </td>

            `;


            tabelle.appendChild(
                zeile
            );

        }
    );

}


// ==========================================================
// FILTER EVENTS
// ==========================================================

function filterEvents() {

    const wettkampfFilter =
        document.getElementById(
            "wettkampf-filter"
        );


    const teamFilter =
        document.getElementById(
            "team-filter"
        );


    const statusFilter =
        document.getElementById(
            "status-filter"
        );


    const reset =
        document.getElementById(
            "filter-zuruecksetzen"
        );


    if (
        wettkampfFilter
    ) {

        wettkampfFilter.addEventListener(
            "change",
            tabelleAnzeigen
        );

    }


    if (
        teamFilter
    ) {

        teamFilter.addEventListener(
            "change",
            tabelleAnzeigen
        );

    }


    if (
        statusFilter
    ) {

        statusFilter.addEventListener(
            "change",
            tabelleAnzeigen
        );

    }


    if (
        reset
    ) {

        reset.addEventListener(
            "click",
            function() {

                if (
                    wettkampfFilter
                ) {

                    wettkampfFilter.value =
                        "";

                }


                if (
                    teamFilter
                ) {

                    teamFilter.value =
                        "";

                }


                if (
                    statusFilter
                ) {

                    statusFilter.value =
                        "";

                }


                tabelleAnzeigen();

            }
        );

    }

}


// ==========================================================
// AUTOMATISCHE AKTUALISIERUNG
// ==========================================================

async function aktualisieren() {

    await startsLaden();

}


// ==========================================================
// START
// ==========================================================

async function start() {

    filterEvents();

    await startsLaden();

}


start();


// Alle 5 Sekunden aktualisieren
setInterval(
    aktualisieren,
    5000
);
