// ==========================================================
// SSV 1928 SULZBACH E.V.
// ERGEBNISLISTE
// ==========================================================
//
// DATEI: ergebnisse.js
//
// AKTUELLE DATENBANKSTRUKTUR
//
// competitions
//   id
//   name
//   datum
//   anzahl_ergebnisse
//   teamgroesse
//   status
//
// starts
//   id
//   competition_id
//   participant_id
//   team_id
//   ak
//
// participants
//   id
//   vorname
//   nachname
//
// teams
//   id
//   competition_id
//   name
//
// results
//   id
//   start_id
//   nummer
//   wert
//
// ==========================================================


// ==========================================================
// SUPABASE
// ==========================================================

const ergebnisseSupabase =
    supabaseClient || supabase.createClient(
        "https://pvvdbcvdhggqbembqrda.supabase.co",
        "sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL"
    );


// ==========================================================
// DOM
// ==========================================================

const tabelle =
    document.getElementById(
        "ergebnis-tabelle"
    );


// ==========================================================
// URL-PARAMETER
// ==========================================================

const ergebnisseUrlParameter =
    new URLSearchParams(
        window.location.search
    );

const competitionId =
    ergebnisseUrlParameter.get(
        "competition_id"
    );


// ==========================================================
// ZAHL FORMATIEREN
// ==========================================================

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

    if (
        Number.isNaN(zahl)
    ) {

        return "-";

    }

    return zahl
        .toFixed(2)
        .replace(".", ",");

}


// ==========================================================
// HTML ESCAPEN
// ==========================================================

function ergebnisseEscapeHtml(wert) {

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
// DATUM FORMATIEREN
// ==========================================================

function datumFormatieren(
    datum
) {

    if (!datum) {

        return "";

    }

    const d =
        new Date(
            datum
        );

    if (
        Number.isNaN(
            d.getTime()
        )
    ) {

        return datum;

    }

    return d.toLocaleDateString(
        "de-DE"
    );

}


// ==========================================================
// WETTKAMPF LADEN
// ==========================================================

async function wettkampfLaden() {

    if (!competitionId) {

        return null;

    }

    const {
        data,
        error
    } =
        await ergebnisseSupabase

            .from("competitions")

            .select(`
                id,
                name,
                datum,
                anzahl_ergebnisse,
                teamgroesse,
                status
            `)

            .eq(
                "id",
                competitionId
            )

            .single();


    if (error) {

        console.error(
            "Fehler beim Laden des Wettkampfs:",
            error
        );

        return null;

    }

    return data;

}


// ==========================================================
// STARTER UND ERGEBNISSE LADEN
// ==========================================================

async function startsLaden() {

    let query =
        ergebnisseSupabase

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
                teams (
                    id,
                    name
                )
            `);


    // ------------------------------------------------------
    // Wenn ein bestimmter Wettkampf gewählt wurde:
    // ------------------------------------------------------

    if (competitionId) {

        query =
            query.eq(
                "competition_id",
                competitionId
            );

    }


    query =
        query.order(
            "created_at",
            {
                ascending: true
            }
        );


    const {
        data,
        error
    } =
        await query;


    if (error) {

        console.error(
            "Fehler beim Laden der Starter:",
            error
        );

        return [];

    }


    return data || [];

}


// ==========================================================
// ERGEBNISSE FÜR STARTS LADEN
// ==========================================================

async function resultsLaden(
    starts
) {

    if (
        !starts ||
        starts.length === 0
    ) {

        return [];

    }


    const startIds =
        starts.map(
            function(start) {

                return start.id;

            }
        );


    const {
        data,
        error
    } =
        await ergebnisseSupabase

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


    if (error) {

        console.error(
            "Fehler beim Laden der Ergebnisse:",
            error
        );

        return [];

    }


    return data || [];

}


// ==========================================================
// STARTS MIT ERGEBNISSEN VERKNÜPFEN
// ==========================================================

function datenZusammenbauen(
    starts,
    results
) {

    const resultMap =
        new Map();


    results.forEach(
        function(result) {

            if (
                !resultMap.has(
                    result.start_id
                )
            ) {

                resultMap.set(
                    result.start_id,
                    []
                );

            }


            resultMap
                .get(
                    result.start_id
                )
                .push(
                    result
                );

        }
    );


    return starts.map(
        function(start) {

            const startResults =
                resultMap.get(
                    start.id
                ) || [];


            let gesamt =
                0;


            let anzahl =
                0;


            const werte = {};


            startResults.forEach(
                function(result) {

                    const nummer =
                        Number(
                            result.nummer
                        );


                    const wert =
                        Number(
                            result.wert
                        );


                    if (
                        !Number.isNaN(
                            wert
                        )
                    ) {

                        gesamt +=
                            wert;

                        anzahl++;

                    }


                    werte[
                        nummer
                    ] =
                        result.wert;

                }
            );


            return {

                ...start,

                werte:
                    werte,

                gesamt:
                    gesamt,

                anzahl:
                    anzahl

            };

        }
    );

}


// ==========================================================
// SORTIEREN
// ==========================================================
//
// Höchstes Gesamtergebnis zuerst.
//
// AK-Teilnehmer werden grundsätzlich hinter
// regulären Teilnehmern einsortiert.
//
// ==========================================================

function ergebnisseSortieren(
    daten
) {

    return daten.sort(
        function(a, b) {

            // ------------------------------------------------
            // Zuerst normale Teilnehmer
            // ------------------------------------------------

            if (
                Boolean(a.ak) !==
                Boolean(b.ak)
            ) {

                return a.ak
                    ? 1
                    : -1;

            }


            // ------------------------------------------------
            // Danach Gesamtwertung
            // ------------------------------------------------

            if (
                b.gesamt !==
                a.gesamt
            ) {

                return (
                    b.gesamt -
                    a.gesamt
                );

            }


            // ------------------------------------------------
            // Bei gleicher Punktzahl:
            // Anzahl vorhandener Ergebnisse
            // ------------------------------------------------

            if (
                b.anzahl !==
                a.anzahl
            ) {

                return (
                    b.anzahl -
                    a.anzahl
                );

            }


            // ------------------------------------------------
            // Danach alphabetisch
            // ------------------------------------------------

            const nameA =
                (
                    a.participants?.nachname ||
                    ""
                ) +
                " " +
                (
                    a.participants?.vorname ||
                    ""
                );


            const nameB =
                (
                    b.participants?.nachname ||
                    ""
                ) +
                " " +
                (
                    b.participants?.vorname ||
                    ""
                );


            return nameA.localeCompare(
                nameB,
                "de"
            );

        }
    );

}


// ==========================================================
// TABELLENÜBERSCHRIFT DYNAMISCH ANPASSEN
// ==========================================================

function tabellenKopfAnpassen(
    maxNummer
) {

    if (!tabelle) {

        return;

    }


    const thead =
        tabelle.closest(
            "table"
        )?.querySelector(
            "thead"
        );


    if (!thead) {

        return;

    }


    const ersteZeile =
        thead.querySelector(
            "tr"
        );


    if (!ersteZeile) {

        return;

    }


    // ------------------------------------------------------
    // Bestehende Ergebnis-Spalten entfernen
    // ------------------------------------------------------

    const alteSpalten =
        ersteZeile.querySelectorAll(
            ".dynamische-ergebnis-spalte"
        );


    alteSpalten.forEach(
        function(spalte) {

            spalte.remove();

        }
    );


    // ------------------------------------------------------
    // Gesamt-Spalte finden
    // ------------------------------------------------------

    const gesamtSpalte =
        Array.from(
            ersteZeile.children
        ).find(
            function(element) {

                return (
                    element.textContent
                        .trim()
                        .toLowerCase() ===
                    "gesamt"
                );

            }
        );


    // ------------------------------------------------------
    // Ergebnis-Spalten einfügen
    // ------------------------------------------------------

    if (!gesamtSpalte) {

        return;

    }


    for (
        let nummer = 1;
        nummer <= maxNummer;
        nummer++
    ) {

        const th =
            document.createElement(
                "th"
            );


        th.className =
            "dynamische-ergebnis-spalte";


        th.textContent =
            "Ergebnis " +
            nummer;


        ersteZeile.insertBefore(
            th,
            gesamtSpalte
        );

    }

}


// ==========================================================
// TABELLE ANZEIGEN
// ==========================================================

function tabelleAnzeigen(
    daten,
    maxNummer
) {

    if (!tabelle) {

        return;

    }


    tabelle.innerHTML =
        "";


    if (
        !daten ||
        daten.length === 0
    ) {

        const zeile =
            document.createElement(
                "tr"
            );


        const zelle =
            document.createElement(
                "td"
            );


        zelle.colSpan =
            4 + maxNummer;


        zelle.textContent =
            "Noch keine Ergebnisse vorhanden.";


        zeile.appendChild(
            zelle
        );


        tabelle.appendChild(
            zeile
        );


        return;

    }


    // ------------------------------------------------------
    // Platz bestimmen
    // ------------------------------------------------------

    let platz =
        0;


    let letztesErgebnis =
        null;


    daten.forEach(
        function(eintrag, index) {

            const hatErgebnis =
                eintrag.anzahl > 0;


            if (
                !eintrag.ak &&
                hatErgebnis
            ) {

                if (
                    letztesErgebnis === null ||
                    eintrag.gesamt !==
                    letztesErgebnis
                ) {

                    platz =
                        index + 1;

                }


                letztesErgebnis =
                    eintrag.gesamt;

            }

        }
    );


    // ------------------------------------------------------
    // Eigentliche Ausgabe
    // ------------------------------------------------------

    let normalPlatz =
        0;


    let vorherigeGesamt =
        null;


    let vorherigeNummer =
        0;


    daten.forEach(
        function(eintrag) {

            const zeile =
                document.createElement(
                    "tr"
                );


            const person =
                eintrag.participants ||
                {};


            const vorname =
                person.vorname ||
                "";


            const nachname =
                person.nachname ||
                "";


            const team =
                eintrag.teams?.name ||
                "Einzelstart";


            const ak =
                Boolean(
                    eintrag.ak
                );


            const hatErgebnis =
                eintrag.anzahl >
                0;


            // ------------------------------------------------
            // Platz
            // ------------------------------------------------

            let platzText =
                "–";


            if (
                !ak &&
                hatErgebnis
            ) {

                if (
                    vorherigeGesamt === null ||
                    eintrag.gesamt !==
                    vorherigeGesamt
                ) {

                    normalPlatz =
                        daten.filter(
                            function(item) {

                                return (
                                    !item.ak &&
                                    item.anzahl > 0 &&
                                    item.gesamt >
                                    eintrag.gesamt
                                );

                            }
                        ).length + 1;

                }


                platzText =
                    normalPlatz + ".";


                vorherigeGesamt =
                    eintrag.gesamt;

            }


            // ------------------------------------------------
            // Platz-Zelle
            // ------------------------------------------------

            const platzZelle =
                document.createElement(
                    "td"
                );


            platzZelle.innerHTML =
                ak
                    ? '<span class="ak-badge">AK</span>'
                    : (
                        hatErgebnis
                            ? "<strong>" +
                              platzText +
                              "</strong>"
                            : "–"
                    );


            zeile.appendChild(
                platzZelle
            );


            // ------------------------------------------------
            // Vorname
            // ------------------------------------------------

            const vornameZelle =
                document.createElement(
                    "td"
                );


            vornameZelle.textContent =
                vorname;


            zeile.appendChild(
                vornameZelle
            );


            // ------------------------------------------------
            // Nachname
            // ------------------------------------------------

            const nachnameZelle =
                document.createElement(
                    "td"
                );


            nachnameZelle.textContent =
                nachname;


            zeile.appendChild(
                nachnameZelle
            );


            // ------------------------------------------------
            // Team
            // ------------------------------------------------

            const teamZelle =
                document.createElement(
                    "td"
                );


            teamZelle.textContent =
                team;


            zeile.appendChild(
                teamZelle
            );


            // ------------------------------------------------
            // Ergebnisse
            // ------------------------------------------------

            for (
                let nummer = 1;
                nummer <= maxNummer;
                nummer++
            ) {

                const zelle =
                    document.createElement(
                        "td"
                    );


                zelle.className =
                    "dynamische-ergebnis-zelle";


                if (
                    eintrag.werte[
                        nummer
                    ] !== undefined
                ) {

                    zelle.textContent =
                        zahlFormatieren(
                            eintrag.werte[
                                nummer
                            ]
                        );

                } else {

                    zelle.textContent =
                        "–";

                }


                zeile.appendChild(
                    zelle
                );

            }


            // ------------------------------------------------
            // Gesamt
            // ------------------------------------------------

            const gesamtZelle =
                document.createElement(
                    "td"
                );


            gesamtZelle.innerHTML =
                hatErgebnis
                    ? "<strong>" +
                      zahlFormatieren(
                          eintrag.gesamt
                      ) +
                      "</strong>"
                    : "–";


            zeile.appendChild(
                gesamtZelle
            );


            // ------------------------------------------------
            // AK Klasse
            // ------------------------------------------------

            if (ak) {

                zeile.classList.add(
                    "ak-zeile"
                );

            }


            tabelle.appendChild(
                zeile
            );

        }
    );

}


// ==========================================================
// WETTKAMPFINFORMATIONEN
// ==========================================================

function wettkampfInfoAnzeigen(
    wettkampf
) {

    if (!wettkampf) {

        return;

    }


    // ------------------------------------------------------
    // Titel
    // ------------------------------------------------------

    const titel =
        document.querySelector(
            "main h2"
        );


    if (titel) {

        titel.textContent =
            wettkampf.name;

    }


    // ------------------------------------------------------
    // Beschreibung
    // ------------------------------------------------------

    const beschreibung =
        document.querySelector(
            "main .card p"
        );


    if (beschreibung) {

        beschreibung.textContent =

            "Wettkampf am " +

            datumFormatieren(
                wettkampf.datum
            );

    }

}


// ==========================================================
// HAUPTFUNKTION
// ==========================================================

async function ergebnisseLaden() {

    if (!tabelle) {

        return;

    }


    tabelle.innerHTML = `

        <tr>

            <td colspan="10">
                Ergebnisse werden geladen ...
            </td>

        </tr>

    `;


    try {

        // --------------------------------------------------
        // Wettkampf laden
        // --------------------------------------------------

        const wettkampf =
            await wettkampfLaden();


        if (wettkampf) {

            wettkampfInfoAnzeigen(
                wettkampf
            );

        }


        // --------------------------------------------------
        // Starts laden
        // --------------------------------------------------

        const starts =
            await startsLaden();


        // --------------------------------------------------
        // Ergebnisse laden
        // --------------------------------------------------

        const results =
            await resultsLaden(
                starts
            );


        // --------------------------------------------------
        // Zusammenführen
        // --------------------------------------------------

        let daten =
            datenZusammenbauen(
                starts,
                results
            );


        // --------------------------------------------------
        // Höchste Ergebnisnummer bestimmen
        // --------------------------------------------------

        let maxNummer =
            3;


        if (
            wettkampf &&
            Number(
                wettkampf.anzahl_ergebnisse
            ) > 0
        ) {

            maxNummer =
                Number(
                    wettkampf.anzahl_ergebnisse
                );

        }


        results.forEach(
            function(result) {

                const nummer =
                    Number(
                        result.nummer
                    );


                if (
                    nummer > maxNummer
                ) {

                    maxNummer =
                        nummer;

                }

            }
        );


        // --------------------------------------------------
        // Sortieren
        // --------------------------------------------------

        daten =
            ergebnisseSortieren(
                daten
            );


        // --------------------------------------------------
        // Tabellenkopf
        // --------------------------------------------------

        tabellenKopfAnpassen(
            maxNummer
        );


        // --------------------------------------------------
        // Tabelle
        // --------------------------------------------------

        tabelleAnzeigen(
            daten,
            maxNummer
        );


    } catch (fehler) {

        console.error(
            "Unerwarteter Fehler beim Laden der Ergebnisse:",
            fehler
        );


        tabelle.innerHTML = `

            <tr>

                <td colspan="10">

                    ❌ Fehler beim Laden
                    der Ergebnisse.

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
//
// Alle 5 Sekunden aktualisieren.
//
// ==========================================================

setInterval(
    ergebnisseLaden,
    5000
);
