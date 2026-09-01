// ==========================================================
// SSV 1928 SULZBACH E.V.
// WETTKAMPFAUSWERTUNG
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

let wettkaempfe = [];

let aktuellerWettkampf = null;

let starts = [];

let ergebnisse = [];

let aktuelleAuswertung = "einzel";


// ==========================================================
// HILFSFUNKTIONEN
// ==========================================================

function escapeHtml(wert) {

    if (wert === null || wert === undefined) {
        return "";
    }

    return String(wert)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function zahl(wert) {

    if (
        wert === null ||
        wert === undefined ||
        wert === ""
    ) {
        return 0;
    }

    const nummer =
        Number(
            String(wert)
                .replace(",", ".")
        );

    return Number.isFinite(nummer)
        ? nummer
        : 0;
}


function formatZahl(wert) {

    return zahl(wert)
        .toFixed(2)
        .replace(".", ",");
}


function datumFormatieren(datum) {

    if (!datum) {
        return "";
    }

    const d =
        new Date(datum);

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
                `${wettkampf.name} – ${datumFormatieren(wettkampf.datum)}`;

            auswahl.appendChild(
                option
            );

        }
    );
}


// ==========================================================
// WETTKAMPF AUSWÄHLEN
// ==========================================================

async function wettkampfAusgewaehlt() {

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

        document.getElementById(
            "auswertung-bereich"
        ).style.display = "none";

        document.getElementById(
            "einzelwertung"
        ).style.display = "none";

        document.getElementById(
            "teamwertung"
        ).style.display = "none";

        document.getElementById(
            "keine-auswertung"
        ).style.display = "block";

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


    const info =
        document.getElementById(
            "wettkampf-info"
        );


    if (info) {

        info.innerHTML = `
            <strong>
                ${escapeHtml(aktuellerWettkampf.name)}
            </strong>
            ·
            ${datumFormatieren(aktuellerWettkampf.datum)}
            ·
            ${zahl(aktuellerWettkampf.anzahl_ergebnisse)} Ergebnisse
            ·
            ${zahl(aktuellerWettkampf.teamgroesse)} Wertungsstarter
        `;

    }


    document.getElementById(
        "auswertung-bereich"
    ).style.display = "block";


    document.getElementById(
        "keine-auswertung"
    ).style.display = "none";


    await wettkampfDatenLaden();

}


// ==========================================================
// WETTKAMPFDATEN LADEN
// ==========================================================

async function wettkampfDatenLaden() {

    if (!aktuellerWettkampf) {
        return;
    }


    // ------------------------------------------------------
    // STARTS LADEN
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
            )

            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (startFehler) {

        console.error(
            "Fehler beim Laden der Starts:",
            startFehler
        );

        starts = [];

        zeigeFehler(
            "Fehler beim Laden der Starter."
        );

        return;
    }


    starts =
        startDaten || [];


    // ------------------------------------------------------
    // ERGEBNISSE LADEN
    // ------------------------------------------------------

    if (starts.length === 0) {

        ergebnisse = [];

        auswertungAnzeigen();

        return;
    }


    const startIds =
        starts.map(
            function(start) {

                return start.id;

            }
        );


    const {
        data: ergebnisDaten,
        error: ergebnisFehler
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


    if (ergebnisFehler) {

        console.error(
            "Fehler beim Laden der Ergebnisse:",
            ergebnisFehler
        );

        ergebnisse = [];

        zeigeFehler(
            "Fehler beim Laden der Ergebnisse."
        );

        return;
    }


    ergebnisse =
        ergebnisDaten || [];


    auswertungAnzeigen();

}


// ==========================================================
// AUSWERTUNG ANZEIGEN
// ==========================================================

function auswertungAnzeigen() {

    if (
        aktuelleAuswertung === "team"
    ) {

        teamwertungAnzeigen();

    } else {

        einzelwertungAnzeigen();

    }

}


// ==========================================================
// ERGEBNISSE EINES STARTS
// ==========================================================

function ergebnisseFuerStart(
    startId
) {

    return ergebnisse

        .filter(
            function(ergebnis) {

                return String(
                    ergebnis.start_id
                ) === String(startId);

            }
        )

        .sort(
            function(a, b) {

                return (
                    zahl(a.nummer) -
                    zahl(b.nummer)
                );

            }
        );

}


// ==========================================================
// WERTUNG EINES STARTS
// ==========================================================

function startWertung(
    start
) {

    const werte =
        ergebnisseFuerStart(
            start.id
        );


    return werte.reduce(
        function(summe, ergebnis) {

            return (
                summe +
                zahl(ergebnis.wert)
            );

        },
        0
    );

}


// ==========================================================
// ERGEBNISSE ALS SORTIERBARE LISTE
// ==========================================================

function startErgebnisListe(
    start
) {

    return ergebnisseFuerStart(
        start.id
    )
        .map(
            function(ergebnis) {

                return zahl(
                    ergebnis.wert
                );

            }
        );

}


// ==========================================================
// EINZELWERTUNG
// ==========================================================

function einzelwertungErstellen() {

    const teilnehmer = {};


    starts.forEach(
        function(start) {

            if (!start.participant_id) {
                return;
            }


            const id =
                String(
                    start.participant_id
                );


            if (
                !teilnehmer[id]
            ) {

                teilnehmer[id] = {

                    participant_id:
                        start.participant_id,

                    vorname:
                        start.participants?.vorname
                        || "",

                    nachname:
                        start.participants?.nachname
                        || "",

                    starts: []

                };

            }


            teilnehmer[id].starts.push(
                start
            );

        }
    );


    const liste =
        Object.values(
            teilnehmer
        );


    // ------------------------------------------------------
    // BESTEN START ERMITTELN
    // ------------------------------------------------------

    liste.forEach(
        function(teilnehmer) {

            const startWertungen =
                teilnehmer.starts.map(
                    function(start) {

                        return {

                            start:
                                start,

                            summe:
                                startWertung(
                                    start
                                ),

                            ergebnisse:
                                startErgebnisListe(
                                    start
                                )

                        };

                    }
                );


            startWertungen.sort(
                function(a, b) {

                    // Höhere Summe zuerst
                    if (
                        b.summe !==
                        a.summe
                    ) {

                        return (
                            b.summe -
                            a.summe
                        );

                    }


                    // Tie-Break:
                    // Ergebnis 1,
                    // dann Ergebnis 2,
                    // usw.

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

                        const av =
                            a.ergebnisse[i]
                            ?? 0;

                        const bv =
                            b.ergebnisse[i]
                            ?? 0;


                        if (
                            bv !== av
                        ) {

                            return (
                                bv - av
                            );

                        }

                    }


                    return 0;

                }
            );


            teilnehmer.besterStart =
                startWertungen[0]
                || null;

        }
    );


    // ------------------------------------------------------
    // NACH BESTEM ERGEBNIS SORTIEREN
    // ------------------------------------------------------

    liste.sort(
        function(a, b) {

            const av =
                a.besterStart?.summe
                ?? 0;

            const bv =
                b.besterStart?.summe
                ?? 0;


            if (
                bv !== av
            ) {

                return (
                    bv - av
                );

            }


            const ae =
                a.besterStart
                    ?.ergebnisse
                || [];


            const be =
                b.besterStart
                    ?.ergebnisse
                || [];


            const max =
                Math.max(
                    ae.length,
                    be.length
                );


            for (
                let i = 0;
                i < max;
                i++
            ) {

                const av =
                    ae[i] ?? 0;

                const bv =
                    be[i] ?? 0;


                if (
                    av !== bv
                ) {

                    return (
                        bv - av
                    );

                }

            }


            return 0;

        }
    );


    return liste;

}


// ==========================================================
// EINZELWERTUNG ANZEIGEN
// ==========================================================

function einzelwertungAnzeigen() {

    const bereich =
        document.getElementById(
            "einzelwertung"
        );

    const teambereich =
        document.getElementById(
            "teamwertung"
        );


    if (!bereich) {
        return;
    }


    bereich.style.display =
        "block";


    if (teambereich) {
        teambereich.style.display =
            "none";
    }


    const kopf =
        document.getElementById(
            "einzel-tabelle-kopf"
        );

    const tabelle =
        document.getElementById(
            "einzel-tabelle"
        );


    if (!kopf || !tabelle) {
        return;
    }


    const anzahl =
        Math.min(
            Math.max(
                zahl(
                    aktuellerWettkampf
                        ?.anzahl_ergebnisse
                ),
                3
            ),
            10
        );


    // ------------------------------------------------------
    // KOPF
    // ------------------------------------------------------

    let kopfHtml = `
        <tr>
            <th>Platz</th>
            <th>Teilnehmer</th>
    `;


    for (
        let i = 1;
        i <= anzahl;
        i++
    ) {

        kopfHtml += `
            <th>
                Ergebnis ${i}
            </th>
        `;

    }


    kopfHtml += `
            <th>Gesamt</th>
        </tr>
    `;


    kopf.innerHTML =
        kopfHtml;


    // ------------------------------------------------------
    // DATEN
    // ------------------------------------------------------

    const liste =
        einzelwertungErstellen();


    if (
        liste.length === 0
    ) {

        tabelle.innerHTML = `
            <tr>
                <td colspan="${anzahl + 3}">
                    Noch keine Starter vorhanden.
                </td>
            </tr>
        `;

        return;
    }


    tabelle.innerHTML =
        "";


    let letzterRang = 0;

    let letzteWertung = null;


    liste.forEach(
        function(teilnehmer, index) {

            const bester =
                teilnehmer.besterStart;


            const aktuelleWertung =
                bester
                ? [
                    bester.summe,
                    ...bester.ergebnisse
                ]
                : [0];


            let rang;


            if (
                letzterRang > 0 &&
                gleichstand(
                    letzteWertung,
                    aktuelleWertung
                )
            ) {

                rang =
                    letzterRang;

            } else {

                rang =
                    index + 1;

            }


            letzterRang =
                rang;

            letzteWertung =
                aktuelleWertung;


            const zeile =
                document.createElement(
                    "tr"
                );


            let html = `
                <td>
                    <strong>
                        ${rang}.
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        teilnehmer.vorname
                    )}
                    ${escapeHtml(
                        teilnehmer.nachname
                    )}
                </td>
            `;


            const werte =
                bester
                    ?.ergebnisse
                || [];


            for (
                let i = 0;
                i < anzahl;
                i++
            ) {

                html += `
                    <td>
                        ${
                            werte[i] !== undefined
                            ? formatZahl(
                                werte[i]
                            )
                            : "–"
                        }
                    </td>
                `;

            }


            html += `
                <td>
                    <strong>
                        ${
                            bester
                            ? formatZahl(
                                bester.summe
                            )
                            : "0,00"
                        }
                    </strong>
                </td>
            `;


            zeile.innerHTML =
                html;


            tabelle.appendChild(
                zeile
            );

        }
    );

}


// ==========================================================
// GLEICHSTAND
// ==========================================================

function gleichstand(
    a,
    b
) {

    const max =
        Math.max(
            a.length,
            b.length
        );


    for (
        let i = 0;
        i < max;
        i++
    ) {

        if (
            zahl(a[i]) !==
            zahl(b[i])
        ) {

            return false;

        }

    }


    return true;

}


// ==========================================================
// TEAMWERTUNG
// ==========================================================

function teamwertungErstellen() {

    const teams = {};


    starts.forEach(
        function(start) {

            // Einzelstart
            if (!start.team_id) {
                return;
            }


            // AK zählt NICHT
            if (
                start.ak === true
            ) {
                return;
            }


            const teamId =
                String(
                    start.team_id
                );


            if (!teams[teamId]) {

                teams[teamId] = {

                    team_id:
                        start.team_id,

                    name:
                        start.teams?.name
                        || "Unbekanntes Team",

                    starts: []

                };

            }


            teams[teamId].starts.push(
                start
            );

        }
    );


    const liste =
        Object.values(
            teams
        );


    const teamgroesse =
        Math.max(
            3,
            Math.min(
                10,
                zahl(
                    aktuellerWettkampf
                        ?.teamgroesse
                )
            )
        );


    // ------------------------------------------------------
    // TEAMWERTUNG BERECHNEN
    // ------------------------------------------------------

    liste.forEach(
        function(team) {

            const starter =
                team.starts
                    .map(
                        function(start) {

                            return {

                                start:
                                    start,

                                summe:
                                    startWertung(
                                        start
                                    )

                            };

                        }
                    );


            // Nach Ergebnis sortieren
            starter.sort(
                function(a, b) {

                    return (
                        b.summe -
                        a.summe
                    );

                }
            );


            team.starter =
                starter;


            // Nur die ersten X Starter
            // zählen zur Teamwertung.

            team.wertungsstarter =
                starter.slice(
                    0,
                    teamgroesse
                );


            team.gesamt =
                team.wertungsstarter.reduce(
                    function(summe, starter) {

                        return (
                            summe +
                            starter.summe
                        );

                    },
                    0
                );


            // Fehlende Starter
            team.fehlende =
                Math.max(
                    0,
                    teamgroesse -
                    team.wertungsstarter.length
                );

        }
    );


    // ------------------------------------------------------
    // TEAMS SORTIEREN
    // ------------------------------------------------------

    liste.sort(
        function(a, b) {

            return (
                b.gesamt -
                a.gesamt
            );

        }
    );


    return liste;

}


// ==========================================================
// TEAMWERTUNG ANZEIGEN
// ==========================================================

function teamwertungAnzeigen() {

    const bereich =
        document.getElementById(
            "teamwertung"
        );

    const einzelbereich =
        document.getElementById(
            "einzelwertung"
        );


    if (!bereich) {
        return;
    }


    bereich.style.display =
        "block";


    if (einzelbereich) {
        einzelbereich.style.display =
            "none";
    }


    const kopf =
        document.getElementById(
            "team-tabelle-kopf"
        );

    const tabelle =
        document.getElementById(
            "team-tabelle"
        );

    const info =
        document.getElementById(
            "teamwertung-info"
        );


    if (
        !kopf ||
        !tabelle
    ) {
        return;
    }


    const anzahl =
        Math.min(
            Math.max(
                zahl(
                    aktuellerWettkampf
                        ?.anzahl_ergebnisse
                ),
                3
            ),
            10
        );


    const teamgroesse =
        Math.max(
            3,
            Math.min(
                10,
                zahl(
                    aktuellerWettkampf
                        ?.teamgroesse
                )
            )
        );


    // ------------------------------------------------------
    // INFO
    // ------------------------------------------------------

    if (info) {

        info.innerHTML = `
            Gewertet werden die besten
            <strong>
                ${teamgroesse}
            </strong>
            Starter eines Teams.
            Fehlende Wertungsstarter werden
            mit <strong>0</strong> Punkten gewertet.
            AK-Starter zählen nicht zur Teamwertung.
        `;

    }


    // ------------------------------------------------------
    // KOPF
    // ------------------------------------------------------

    let kopfHtml = `
        <tr>
            <th>Platz</th>
            <th>Team</th>
    `;


    for (
        let i = 1;
        i <= teamgroesse;
        i++
    ) {

        kopfHtml += `
            <th>
                Starter ${i}
            </th>
        `;

    }


    kopfHtml += `
            <th>Gesamt</th>
        </tr>
    `;


    kopf.innerHTML =
        kopfHtml;


    const liste =
        teamwertungErstellen();


    if (
        liste.length === 0
    ) {

        tabelle.innerHTML = `
            <tr>
                <td colspan="${teamgroesse + 3}">
                    Noch keine Teams vorhanden.
                </td>
            </tr>
        `;

        return;
    }


    tabelle.innerHTML =
        "";


    liste.forEach(
        function(team, index) {

            const zeile =
                document.createElement(
                    "tr"
                );


            let html = `
                <td>
                    <strong>
                        ${index + 1}.
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        team.name
                    )}
                </td>
            `;


            for (
                let i = 0;
                i < teamgroesse;
                i++
            ) {

                if (
                    team.wertungsstarter[i]
                ) {

                    const starter =
                        team.wertungsstarter[i];


                    const vorname =
                        starter.start
                            .participants
                            ?.vorname
                        || "";


                    const nachname =
                        starter.start
                            .participants
                            ?.nachname
                        || "";


                    html += `
                        <td>
                            ${escapeHtml(
                                vorname
                            )}
                            ${escapeHtml(
                                nachname
                            )}
                            <br>
                            <strong>
                                ${formatZahl(
                                    starter.summe
                                )}
                            </strong>
                        </td>
                    `;

                } else {

                    html += `
                        <td>
                            –
                            <br>
                            <strong>
                                0,00
                            </strong>
                        </td>
                    `;

                }

            }


            html += `
                <td>
                    <strong>
                        ${formatZahl(
                            team.gesamt
                        )}
                    </strong>
                </td>
            `;


            zeile.innerHTML =
                html;


            tabelle.appendChild(
                zeile
            );

        }
    );

}


// ==========================================================
// FEHLER ANZEIGEN
// ==========================================================

function zeigeFehler(
    nachricht
) {

    const einzel =
        document.getElementById(
            "einzel-tabelle"
        );

    const team =
        document.getElementById(
            "team-tabelle"
        );


    if (einzel) {

        einzel.innerHTML = `
            <tr>
                <td>
                    ${escapeHtml(
                        nachricht
                    )}
                </td>
            </tr>
        `;

    }


    if (team) {

        team.innerHTML = `
            <tr>
                <td>
                    ${escapeHtml(
                        nachricht
                    )}
                </td>
            </tr>
        `;

    }

}


// ==========================================================
// BUTTON EINZELWERTUNG
// ==========================================================

function einzelButton() {

    aktuelleAuswertung =
        "einzel";

    const einzel =
        document.getElementById(
            "button-einzelwertung"
        );

    const team =
        document.getElementById(
            "button-teamwertung"
        );


    if (einzel) {
        einzel.classList.add(
            "aktiv"
        );
    }


    if (team) {
        team.classList.remove(
            "aktiv"
        );
    }


    einzelwertungAnzeigen();

}


// ==========================================================
// BUTTON TEAMWERTUNG
// ==========================================================

function teamButton() {

    aktuelleAuswertung =
        "team";

    const einzel =
        document.getElementById(
            "button-einzelwertung"
        );

    const team =
        document.getElementById(
            "button-teamwertung"
        );


    if (einzel) {
        einzel.classList.remove(
            "aktiv"
        );
    }


    if (team) {
        team.classList.add(
            "aktiv"
        );
    }


    teamwertungAnzeigen();

}


// ==========================================================
// EVENTS
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
                wettkampfAusgewaehlt
            );

        }


        const einzel =
            document.getElementById(
                "button-einzelwertung"
            );


        if (einzel) {

            einzel.addEventListener(
                "click",
                einzelButton
            );

        }


        const team =
            document.getElementById(
                "button-teamwertung"
            );


        if (team) {

            team.addEventListener(
                "click",
                teamButton
            );

        }


        await wettkaempfeLaden();

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

            await wettkampfDatenLaden();

        }

    },
    5000
);
