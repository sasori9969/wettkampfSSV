// ==========================================================
// SSV 1928 SULZBACH E.V.
// WETTKAMPFAUSWERTUNG
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

let wettkaempfe = [];

let aktuellerWettkampf = null;

let starts = [];

let results = [];


// ==========================================================
// HILFSFUNKTIONEN
// ==========================================================

function zahl(wert) {

    if (
        wert === null ||
        wert === undefined ||
        wert === ""
    ) {
        return null;
    }


    const nummer =
        Number(
            String(wert)
                .replace(",", ".")
        );


    return Number.isFinite(nummer)
        ? nummer
        : null;

}


function formatZahl(wert) {

    const nummer =
        zahl(wert);


    if (
        nummer === null
    ) {
        return "0,00";
    }


    return nummer
        .toFixed(2)
        .replace(".", ",");

}


function escapeHtml(wert) {

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


function nameDesStarters(start) {

    const vorname =
        start.participants?.vorname
        || "";


    const nachname =
        start.participants?.nachname
        || "";


    return (
        `${vorname} ${nachname}`
    ).trim();

}


// ==========================================================
// WETTKÄMPFE LADEN
// ==========================================================

async function wettkaempfeLaden() {

    const auswahl =
        document.getElementById(
            "wettkampf-auswahl"
        );


    if (!auswahl) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient

            .from("competitions")

            .select(`
                id,
                name,
                datum,
                anzahl_ergebnisse,
                teamgroesse,
                status
            `)

            .order(
                "datum",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Fehler beim Laden der Wettkämpfe:",
            error
        );


        auswahl.innerHTML = `
            <option value="">
                Fehler beim Laden
            </option>
        `;


        return;
    }


    wettkaempfe =
        data || [];


    auswahl.innerHTML = `
        <option value="">
            Wettkampf auswählen ...
        </option>
    `;


    wettkaempfe.forEach(
        function(wettkampf) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                wettkampf.id;


            option.textContent =
                wettkampf.name;


            auswahl.appendChild(
                option
            );

        }
    );

}


// ==========================================================
// WETTKAMPF AUSWÄHLEN
// ==========================================================

async function wettkampfAuswaehlen() {

    const auswahl =
        document.getElementById(
            "wettkampf-auswahl"
        );


    if (!auswahl) {
        return;
    }


    const id =
        auswahl.value;


    if (!id) {

        aktuellerWettkampf =
            null;

        starts = [];

        results = [];

        auswertungLeeren();

        return;
    }


    aktuellerWettkampf =
        wettkaempfe.find(
            function(wettkampf) {

                return String(
                    wettkampf.id
                ) === String(id);

            }
        );


    if (!aktuellerWettkampf) {
        return;
    }


    await datenLaden();

}


// ==========================================================
// DATEN LADEN
// ==========================================================

async function datenLaden() {

    if (!aktuellerWettkampf) {
        return;
    }


    // ------------------------------------------------------
    // STARTS
    // ------------------------------------------------------

    const {
        data: startDaten,
        error: startFehler
    } =
        await supabaseClient

            .from("starts")

            .select(`
                id,
                competition_id,
                participant_id,
                team_id,
                ak,
                created_at,
                participants (
                    vorname,
                    nachname
                ),
                teams (
                    name
                )
            `)

            .eq(
                "competition_id",
                aktuellerWettkampf.id
            );


    if (startFehler) {

        console.error(
            "Fehler beim Laden der Starts:",
            startFehler
        );


        zeigeFehler(
            "Die Starter konnten nicht geladen werden."
        );


        return;
    }


    starts =
        startDaten || [];


    // ------------------------------------------------------
    // ERGEBNISSE
    // ------------------------------------------------------

    const startIds =
        starts.map(
            function(start) {

                return start.id;

            }
        );


    results = [];


    if (
        startIds.length > 0
    ) {

        const {
            data: resultDaten,
            error: resultFehler
        } =
            await supabaseClient

                .from("results")

                .select(`
                    id,
                    start_id,
                    nummer,
                    wert
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


        if (resultFehler) {

            console.error(
                "Fehler beim Laden der Ergebnisse:",
                resultFehler
            );


            zeigeFehler(
                "Die Ergebnisse konnten nicht geladen werden."
            );


            return;
        }


        results =
            resultDaten || [];

    }


    auswertungAnzeigen();

}


// ==========================================================
// AUSWERTUNG ANZEIGEN
// ==========================================================

function auswertungAnzeigen() {

    const container =
        document.getElementById(
            "ergebnis-tabelle"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (
        !aktuellerWettkampf
    ) {

        container.innerHTML = `
            <tr>
                <td colspan="10">
                    Bitte einen Wettkampf auswählen.
                </td>
            </tr>
        `;


        return;
    }


    const anzahl =
        Math.min(
            Math.max(
                Number(
                    aktuellerWettkampf
                        .anzahl_ergebnisse
                ) || 3,
                3
            ),
            10
        );


    // ------------------------------------------------------
    // KOPF DER TABELLE ANPASSEN
    // ------------------------------------------------------

    const kopf =
        document.querySelector(
            "table thead tr"
        );


    if (kopf) {

        kopf.innerHTML = `

            <th>
                Platz
            </th>

            <th>
                Starter
            </th>

            <th>
                Wertung
            </th>

            ${Array.from(
                {
                    length: anzahl
                },
                function(_, index) {

                    return `
                        <th>
                            Ergebnis ${index + 1}
                        </th>
                    `;

                }
            ).join("")}

            <th>
                Gesamt
            </th>

        `;

    }


    // ------------------------------------------------------
    // EINZELWERTUNG
    // ------------------------------------------------------

    const einzelstarts =
        starts.filter(
            function(start) {

                return !start.team_id;

            }
        );


    const einzelwertung =
        einzelstarts
            .map(
                function(start) {

                    return startAuswertung(
                        start,
                        anzahl
                    );

                }
            )
            .sort(
                vergleichWertung
            );


    // ------------------------------------------------------
    // EINZELWERTUNG ANZEIGEN
    // ------------------------------------------------------

    einzelwertung.forEach(
        function(eintrag, index) {

            tabelleZeileAnzeigen(
                container,
                eintrag,
                index + 1,
                anzahl,
                "Einzel"
            );

        }
    );


    // ------------------------------------------------------
    // TEAMWERTUNG
    // ------------------------------------------------------

    const teamMap =
        new Map();


    starts.forEach(
        function(start) {

            if (
                !start.team_id
            ) {
                return;
            }


            if (
                start.ak === true
            ) {
                return;
            }


            if (
                !teamMap.has(
                    start.team_id
                )
            ) {

                teamMap.set(
                    start.team_id,
                    []
                );

            }


            teamMap
                .get(start.team_id)
                .push(
                    start
                );

        }
    );


    const teamwertungen = [];


    teamMap.forEach(
        function(teamStarts, teamId) {

            const teamwertung =
                teamAuswertung(
                    teamId,
                    teamStarts,
                    anzahl
                );


            teamwertungen.push(
                teamwertung
            );

        }
    );


    teamwertungen.sort(
        function(a, b) {

            return vergleichTeamwertung(
                a,
                b
            );

        }
    );


    // ------------------------------------------------------
    // TEAMERGEBNISSE
    // ------------------------------------------------------

    teamwertungen.forEach(
        function(team, index) {

            teamZeileAnzeigen(
                container,
                team,
                index + 1,
                anzahl
            );

        }
    );


    // ------------------------------------------------------
    // KEINE DATEN
    // ------------------------------------------------------

    if (
        einzelwertung.length === 0 &&
        teamwertungen.length === 0
    ) {

        container.innerHTML = `
            <tr>
                <td colspan="${anzahl + 4}">
                    Für diesen Wettkampf wurden noch keine Starter erfasst.
                </td>
            </tr>
        `;

    }

}


// ==========================================================
// START-AUSWERTUNG
// ==========================================================

function startAuswertung(
    start,
    anzahl
) {

    const werte = [];


    for (
        let nummer = 1;
        nummer <= anzahl;
        nummer++
    ) {

        const ergebnis =
            results.find(
                function(item) {

                    return (
                        String(
                            item.start_id
                        ) === String(
                            start.id
                        ) &&
                        Number(
                            item.nummer
                        ) === nummer
                    );

                }
            );


        werte.push(
            ergebnis
                ? zahl(ergebnis.wert)
                : null
        );

    }


    const gesamt =
        werte.reduce(
            function(summe, wert) {

                return (
                    summe +
                    (
                        wert === null
                            ? 0
                            : wert
                    )
                );

            },
            0
        );


    return {

        start:
            start,

        werte:
            werte,

        gesamt:
            gesamt

    };

}


// ==========================================================
// TEAM-AUSWERTUNG
// ==========================================================

function teamAuswertung(
    teamId,
    teamStarts,
    anzahl
) {

    const teamgroesse =
        Math.min(
            Math.max(
                Number(
                    aktuellerWettkampf
                        .teamgroesse
                ) || 3,
                1
            ),
            10
        );


    // ------------------------------------------------------
    // Nur die vorgesehenen Teamstarter
    // ------------------------------------------------------

    const normaleStarts =
        teamStarts.filter(
            function(start) {

                return start.ak !== true;

            }
        );


    // ------------------------------------------------------
    // Für jeden Start werden die Ergebnisplätze
    // gebildet.
    //
    // Bei weniger Startern entstehen automatisch
    // 0-Wertungen.
    // ------------------------------------------------------

    const starterWertungen =
        normaleStarts.map(
            function(start) {

                return startAuswertung(
                    start,
                    anzahl
                );

            }
        );


    // ------------------------------------------------------
    // Beste Starter zuerst.
    // ------------------------------------------------------

    starterWertungen.sort(
        vergleichWertung
    );


    // ------------------------------------------------------
    // Genau TEAMGRÖSSE verwenden.
    //
    // Sind weniger Starter vorhanden,
    // werden fehlende Starter mit 0 ergänzt.
    // ------------------------------------------------------

    const gewaehlt = [];


    for (
        let i = 0;
        i < teamgroesse;
        i++
    ) {

        if (
            starterWertungen[i]
        ) {

            gewaehlt.push(
                starterWertungen[i]
            );

        } else {

            gewaehlt.push({

                start:
                    null,

                werte:
                    Array(
                        anzahl
                    ).fill(null),

                gesamt:
                    0,

                fehlend:
                    true

            });

        }

    }


    // ------------------------------------------------------
    // Teamgesamtwert
    // ------------------------------------------------------

    const gesamt =
        gewaehlt.reduce(
            function(summe, eintrag) {

                return (
                    summe +
                    eintrag.gesamt
                );

            },
            0
        );


    const team =
        teamStarts[0]?.teams;


    return {

        teamId:
            teamId,

        teamName:
            team?.name || "Unbekanntes Team",

        starter:
            gewaehlt,

        gesamt:
            gesamt

    };

}


// ==========================================================
// VERGLEICH EINZELSTART
// ==========================================================
//
// Regel:
// 1. Gesamtwert
// 2. Ergebnis 1
// 3. Ergebnis 2
// 4. Ergebnis 3
// 5. usw.
//
// Wenn bei einem Vergleich ein Starter kein Ergebnis mehr
// besitzt, wird er hinter einen Starter mit vorhandenem
// Ergebnis gesetzt.
// ==========================================================

function vergleichWertung(
    a,
    b
) {

    if (
        b.gesamt !==
        a.gesamt
    ) {

        return (
            b.gesamt -
            a.gesamt
        );

    }


    const max =
        Math.max(
            a.werte.length,
            b.werte.length
        );


    for (
        let i = 0;
        i < max;
        i++
    ) {

        const av =
            a.werte[i];


        const bv =
            b.werte[i];


        if (
            av === null &&
            bv !== null
        ) {

            return 1;

        }


        if (
            av !== null &&
            bv === null
        ) {

            return -1;

        }


        if (
            av !== null &&
            bv !== null &&
            bv !== av
        ) {

            return (
                bv -
                av
            );

        }

    }


    return 0;

}


// ==========================================================
// TEAMVERGLEICH
// ==========================================================

function vergleichTeamwertung(
    a,
    b
) {

    if (
        b.gesamt !==
        a.gesamt
    ) {

        return (
            b.gesamt -
            a.gesamt
        );

    }


    // ------------------------------------------------------
    // Bei gleicher Teamsumme werden die einzelnen
    // Starterwerte als Tie-Breaker betrachtet.
    // ------------------------------------------------------

    const aStarter =
        [
            ...a.starter
        ];


    const bStarter =
        [
            ...b.starter
        ];


    for (
        let i = 0;
        i < Math.max(
            aStarter.length,
            bStarter.length
        );
        i++
    ) {

        const av =
            aStarter[i];


        const bv =
            bStarter[i];


        if (
            !av ||
            av.fehlend
        ) {

            if (
                bv &&
                !bv.fehlend
            ) {

                return 1;

            }

        }


        if (
            !bv ||
            bv.fehlend
        ) {

            if (
                av &&
                !av.fehlend
            ) {

                return -1;

            }

        }


        if (
            av &&
            bv
        ) {

            const vergleich =
                vergleichWertung(
                    av,
                    bv
                );


            if (
                vergleich !== 0
            ) {

                return vergleich;

            }

        }

    }


    return 0;

}


// ==========================================================
// EINZELZEILE
// ==========================================================

function tabelleZeileAnzeigen(
    container,
    eintrag,
    platz,
    anzahl,
    wertungsart
) {

    const tr =
        document.createElement(
            "tr"
        );


    const start =
        eintrag.start;


    const name =
        start
            ? escapeHtml(
                nameDesStarters(
                    start
                )
            )
            : "";


    tr.innerHTML = `

        <td>
            <strong>
                ${platz}.
            </strong>
        </td>


        <td>
            ${name}
        </td>


        <td>
            ${wertungsart}
        </td>


        ${eintrag.werte
            .map(
                function(wert) {

                    return `
                        <td>
                            ${
                                wert === null
                                    ? "—"
                                    : formatZahl(wert)
                            }
                        </td>
                    `;

                }
            )
            .join("")
        }


        <td>
            <strong>
                ${formatZahl(
                    eintrag.gesamt
                )}
            </strong>
        </td>

    `;


    container.appendChild(
        tr
    );

}


// ==========================================================
// TEAMZEILE
// ==========================================================

function teamZeileAnzeigen(
    container,
    team,
    platz,
    anzahl
) {

    const tr =
        document.createElement(
            "tr"
        );


    const teamErgebnisse =
        Array(
            anzahl
        )
        .fill(0);


    team.starter.forEach(
        function(start) {

            start.werte.forEach(
                function(wert, index) {

                    if (
                        wert !== null
                    ) {

                        teamErgebnisse[index] +=
                            wert;

                    }

                }
            );

        }
    );


    tr.innerHTML = `

        <td>
            <strong>
                ${platz}.
            </strong>
        </td>


        <td>
            <strong>
                ${escapeHtml(
                    team.teamName
                )}
            </strong>
        </td>


        <td>
            Team
        </td>


        ${teamErgebnisse
            .map(
                function(wert) {

                    return `
                        <td>
                            ${formatZahl(
                                wert
                            )}
                        </td>
                    `;

                }
            )
            .join("")
        }


        <td>
            <strong>
                ${formatZahl(
                    team.gesamt
                )}
            </strong>
        </td>

    `;


    container.appendChild(
        tr
    );

}


// ==========================================================
// AUSWERTUNG LEEREN
// ==========================================================

function auswertungLeeren() {

    const container =
        document.getElementById(
            "ergebnis-tabelle"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `
        <tr>
            <td colspan="10">
                Bitte einen Wettkampf auswählen.
            </td>
        </tr>
    `;

}


// ==========================================================
// FEHLER
// ==========================================================

function zeigeFehler(
    nachricht
) {

    const container =
        document.getElementById(
            "ergebnis-tabelle"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `
        <tr>
            <td colspan="10">
                ${escapeHtml(
                    nachricht
                )}
            </td>
        </tr>
    `;

}


// ==========================================================
// START
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        const auswahl =
            document.getElementById(
                "wettkampf-auswahl"
            );


        if (auswahl) {

            auswahl.addEventListener(
                "change",
                wettkampfAuswaehlen
            );

        }


        await wettkaempfeLaden();


        // --------------------------------------------------
        // Wettkampf über URL auswählen
        // Beispiel:
        //
        // ergebnisse.html?id=UUID
        // --------------------------------------------------

        const parameter =
            new URLSearchParams(
                window.location.search
            );


        const wettkampfId =
            parameter.get(
                "id"
            );


        if (
            wettkampfId &&
            auswahl
        ) {

            const vorhanden =
                wettkaempfe.find(
                    function(wettkampf) {

                        return String(
                            wettkampf.id
                        ) === String(
                            wettkampfId
                        );

                    }
                );


            if (vorhanden) {

                auswahl.value =
                    vorhanden.id;


                await wettkampfAuswaehlen();

            }

        }

    }
);


// ==========================================================
// AUTOMATISCHE AKTUALISIERUNG
// ==========================================================

setInterval(
    async function() {

        if (
            aktuellerWettkampf
        ) {

            await datenLaden();

        }

    },
    5000
);
