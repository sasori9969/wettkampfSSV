// ==========================================================
// SSV 1928 SULZBACH E.V.
// RANGLISTEN- UND STECHREGELN
// ==========================================================


// ==========================================================
// EINZELSTART VERGLEICHEN
// ==========================================================
//
// Regel:
//
// Zuerst Gesamtwert vergleichen.
//
// Bei gleichem Gesamtwert:
// Ergebnis 1
// Ergebnis 2
// Ergebnis 3
// Ergebnis 4
// usw.
//
// Sobald ein Unterschied vorhanden ist,
// entscheidet das bessere Folgeergebnis.
//
// Nur wenn ALLE vorhandenen Ergebnisse identisch sind,
// besteht Gleichstand.
// ==========================================================

function startsVergleichen(
    a,
    b
) {

    // ------------------------------------------------------
    // GESAMT
    // ------------------------------------------------------

    const gesamtA =
        Number(a.gesamt || 0);

    const gesamtB =
        Number(b.gesamt || 0);


    if (
        gesamtA !== gesamtB
    ) {

        return (
            gesamtB -
            gesamtA
        );

    }


    // ------------------------------------------------------
    // FOLGEERGEBNISSE
    // ------------------------------------------------------

    const ergebnisseA =
        (a.ergebnisse || [])
            .slice()
            .sort(
                function(x, y) {

                    return (
                        Number(x.nummer) -
                        Number(y.nummer)
                    );

                }
            );


    const ergebnisseB =
        (b.ergebnisse || [])
            .slice()
            .sort(
                function(x, y) {

                    return (
                        Number(x.nummer) -
                        Number(y.nummer)
                    );

                }
            );


    const max =
        Math.max(
            ergebnisseA.length,
            ergebnisseB.length
        );


    for (
        let i = 0;
        i < max;
        i++
    ) {

        const wertA =
            ergebnisseA[i]
                ? Number(
                    ergebnisseA[i].wert
                )
                : null;


        const wertB =
            ergebnisseB[i]
                ? Number(
                    ergebnisseB[i].wert
                )
                : null;


        // --------------------------------------------------
        // Beide haben kein weiteres Ergebnis
        // --------------------------------------------------

        if (
            wertA === null &&
            wertB === null
        ) {

            break;

        }


        // --------------------------------------------------
        // A hat kein weiteres Ergebnis
        //
        // B hat noch eines:
        // B wird besser gewertet.
        // --------------------------------------------------

        if (
            wertA === null &&
            wertB !== null
        ) {

            return 1;

        }


        // --------------------------------------------------
        // B hat kein weiteres Ergebnis
        //
        // A hat noch eines:
        // A wird besser gewertet.
        // --------------------------------------------------

        if (
            wertA !== null &&
            wertB === null
        ) {

            return -1;

        }


        // --------------------------------------------------
        // Unterschied gefunden
        // --------------------------------------------------

        if (
            wertA !== wertB
        ) {

            return (
                wertB -
                wertA
            );

        }

    }


    // ------------------------------------------------------
    // WIRKLICHER GLEICHSTAND
    // ------------------------------------------------------

    return 0;

}


// ==========================================================
// STARTS SORTIEREN
// ==========================================================

function startsSortieren(
    starts
) {

    return (
        [...starts]
            .sort(
                startsVergleichen
            )
    );

}


// ==========================================================
// PLÄTZE VERGEBEN
// ==========================================================
//
// Beispiel:
//
// 100 Punkte
// 100 Punkte
// 99 Punkte
//
// Wenn die beiden 100er tatsächlich komplett
// gleich sind:
//
// 1.
// 1.
// 3.
//
// Wenn ein Folgeergebnis entscheidet:
//
// 1.
// 2.
// 3.
//
// ==========================================================

function plaetzeVergeben(
    starts
) {

    const sortiert =
        startsSortieren(
            starts
        );


    let letzterStart =
        null;


    let letzterPlatz =
        0;


    let anzahlGleicher =
        0;


    return sortiert.map(
        function(start, index) {

            if (
                letzterStart === null
            ) {

                letzterPlatz =
                    1;

                anzahlGleicher =
                    1;

            } else {

                const vergleich =
                    startsVergleichen(
                        letzterStart,
                        start
                    );


                if (
                    vergleich === 0
                ) {

                    anzahlGleicher++;

                } else {

                    letzterPlatz =
                        index + 1;

                    anzahlGleicher =
                        1;

                }

            }


            letzterStart =
                start;


            return {

                ...start,

                platz:
                    letzterPlatz,

                gleichstand:
                    anzahlGleicher > 1

            };

        }
    );

}


// ==========================================================
// WERTUNGSSTARTS
// ==========================================================
//
// AK wird ausgeschlossen.
//
// Einzelstarts bleiben enthalten.
//
// Teamstarts bleiben enthalten.
// ==========================================================

function wertungsstarts(
    starts
) {

    return (
        starts.filter(
            function(start) {

                return !start.ak;

            }
        )
    );

}


// ==========================================================
// AK-STARTS
// ==========================================================

function akStarts(
    starts
) {

    return (
        starts.filter(
            function(start) {

                return Boolean(
                    start.ak
                );

            }
        )
    );

}


// ==========================================================
// EINZELSTARTS
// ==========================================================

function einzelstarts(
    starts
) {

    return (
        starts.filter(
            function(start) {

                return (
                    !start.team_id
                );

            }
        )
    );

}


// ==========================================================
// TEAMSTARTS
// ==========================================================

function teamstarts(
    starts,
    teamId
) {

    return (
        starts.filter(
            function(start) {

                return (
                    start.team_id ===
                    teamId
                );

            }
        )
    );

}


// ==========================================================
// GESAMTWERTE EINES TEAMS
// ==========================================================
//
// Wichtig:
//
// AK zählt nicht.
//
// Die Teamgröße wird aus dem Wettkampf übernommen.
//
// Standard: 3 Starter.
//
// Von einem Team werden die besten zulässigen
// Wertungsstarter berücksichtigt.
// ==========================================================

function teamwertungBerechnen(
    starts,
    team,
    teamgroesse = 3
) {

    const teamStarts =
        starts
            .filter(
                function(start) {

                    return (
                        start.team_id ===
                        team.id &&
                        !start.ak
                    );

                }
            );


    const sortiert =
        startsSortieren(
            teamStarts
        );


    const gewertet =
        sortiert.slice(
            0,
            teamgroesse
        );


    const gesamt =
        gewertet.reduce(
            function(summe, start) {

                return (
                    summe +
                    Number(
                        start.gesamt || 0
                    )
                );

            },
            0
        );


    return {

        team_id:
            team.id,

        team_name:
            team.name,

        starts:
            teamStarts,

        gewertet:
            gewertet,

        gesamt:
            gesamt,

        vollstaendig:
            gewertet.length >=
            teamgroesse

    };

}


// ==========================================================
// ALLE TEAMWERTUNGEN
// ==========================================================

function alleTeamwertungen(
    starts,
    teams,
    teamgroesse = 3
) {

    const wertungen =
        teams.map(
            function(team) {

                return teamwertungBerechnen(
                    starts,
                    team,
                    teamgroesse
                );

            }
        );


    wertungen.sort(
        function(a, b) {

            return (
                b.gesamt -
                a.gesamt
            );

        }
    );


    return wertungen.map(
        function(team, index) {

            return {

                ...team,

                platz:
                    index + 1

            };

        }
    );

}


// ==========================================================
// HILFSFUNKTION:
// GESAMT ERGEBNIS EINES STARTS
// ==========================================================

function startGesamtBerechnen(
    start
) {

    const ergebnisse =
        start.ergebnisse || [];


    return ergebnisse.reduce(
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

}


// ==========================================================
// GESAMTWERTE AUTOMATISCH AKTUALISIEREN
// ==========================================================

function gesamtwerteAktualisieren(
    starts
) {

    return (
        starts.map(
            function(start) {

                return {

                    ...start,

                    gesamt:
                        startGesamtBerechnen(
                            start
                        )

                };

            }
        )
    );

}


// ==========================================================
// ÖFFENTLICH VERFÜGBARE FUNKTIONEN
// ==========================================================

window.Rangliste = {

    startsVergleichen,

    startsSortieren,

    plaetzeVergeben,

    wertungsstarts,

    akStarts,

    einzelstarts,

    teamstarts,

    teamwertungBerechnen,

    alleTeamwertungen,

    startGesamtBerechnen,

    gesamtwerteAktualisieren

};
