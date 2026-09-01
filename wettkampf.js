// ==========================================================
// SSV 1928 SULZBACH E.V.
// WETTKAMPF
// ==========================================================
//
// DATEI: wettkampf.js
//
// STRUKTUR:
//
// competitions
//      │
//      ├── teams
//      │
//      └── starts
//             │
//             └── results
//
// WICHTIG:
//
// Ein Teilnehmer kann mehrere Starts haben.
//
// participants.id = BIGINT
// competitions.id = UUID
// teams.id        = UUID
// starts.id       = UUID
// results.id      = UUID
// results.start_id = UUID
//
// ==========================================================


// ==========================================================
// SUPABASE
// ==========================================================

const SUPABASE_URL =
    "https://pvvdbcvdhggqbembqrda.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL";


// Falls supabase.js bereits geladen wurde,
// wird die dort vorhandene Verbindung verwendet.
// Ansonsten wird sie hier erzeugt.

let wettkampfSupabase;

if (
    typeof supabaseClient !== "undefined"
) {

    wettkampfSupabase =
        supabaseClient;

} else {

    wettkampfSupabase =
        supabase.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        );

}



// ==========================================================
// WETTKAMPF-ID AUS URL
// ==========================================================

const urlParameter =
    new URLSearchParams(
        window.location.search
    );


const competitionId =
    urlParameter.get(
        "id"
    );



// ==========================================================
// GLOBALE DATEN
// ==========================================================

let wettkampf = null;

let teams = [];

let teilnehmer = [];

let starts = [];

let ausgewaehlterTeilnehmer = null;



// ==========================================================
// DOM ELEMENTE
// ==========================================================

const wettkampfNameElement =
    document.getElementById(
        "wettkampf-name"
    );


const wettkampfInfoElement =
    document.getElementById(
        "wettkampf-info"
    );


const wettkampfStatusElement =
    document.getElementById(
        "wettkampf-status"
    );


const teamForm =
    document.getElementById(
        "team-form"
    );


const teamNameInput =
    document.getElementById(
        "team-name"
    );


const teamMeldung =
    document.getElementById(
        "team-meldung"
    );


const teilnehmerSuche =
    document.getElementById(
        "teilnehmer-suche"
    );


const teilnehmerSuchergebnisse =
    document.getElementById(
        "teilnehmer-suchergebnisse"
    );


const starterBereich =
    document.getElementById(
        "starter-bereich"
    );


const ausgewaehlterTeilnehmerElement =
    document.getElementById(
        "ausgewaehlter-teilnehmer"
    );


const starterTeam =
    document.getElementById(
        "starter-team"
    );


const starterAk =
    document.getElementById(
        "starter-ak"
    );


const starterHinzufuegen =
    document.getElementById(
        "starter-hinzufuegen"
    );


const starterAbbrechen =
    document.getElementById(
        "starter-abbrechen"
    );


const starterMeldung =
    document.getElementById(
        "starter-meldung"
    );


const teamsListe =
    document.getElementById(
        "teams-liste"
    );


const starterListe =
    document.getElementById(
        "starter-liste"
    );



// ==========================================================
// PRÜFUNG WETTKAMPF-ID
// ==========================================================

if (!competitionId) {

    console.error(
        "Keine Wettkampf-ID in der URL."
    );


    if (wettkampfNameElement) {

        wettkampfNameElement.textContent =
            "Kein Wettkampf ausgewählt";

    }


    if (wettkampfInfoElement) {

        wettkampfInfoElement.textContent =
            "Bitte einen Wettkampf aus der Wettkampfliste öffnen.";

    }

}



// ==========================================================
// MELDUNGEN
// ==========================================================

function setMeldung(
    element,
    text,
    klasse = ""
) {

    if (!element) {

        return;

    }


    element.textContent =
        text;


    element.className =
        "meldung " +
        klasse;

}



// ==========================================================
// WETTKAMPF LADEN
// ==========================================================

async function wettkampfLaden() {

    if (!competitionId) {

        return;

    }


    const {
        data,
        error
    } = await wettkampfSupabase

        .from("competitions")

        .select(`
            id,
            name,
            datum,
            anzahl_ergebnisse,
            teamgroesse,
            status,
            created_at
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


        if (wettkampfNameElement) {

            wettkampfNameElement.textContent =
                "Fehler beim Laden";

        }


        if (wettkampfInfoElement) {

            wettkampfInfoElement.textContent =
                "Der Wettkampf konnte nicht geladen werden.";

        }


        return;

    }


    wettkampf =
        data;


    wettkampfAnzeigen();

}



// ==========================================================
// WETTKAMPF ANZEIGEN
// ==========================================================

function wettkampfAnzeigen() {

    if (!wettkampf) {

        return;

    }


    if (wettkampfNameElement) {

        wettkampfNameElement.textContent =
            wettkampf.name;

    }


    if (wettkampfInfoElement) {

        wettkampfInfoElement.textContent =

            "Datum: " +

            datumFormatieren(
                wettkampf.datum
            ) +

            " | " +

            "Ergebnisse pro Start: " +

            wettkampf.anzahl_ergebnisse +

            " | " +

            "Teamgröße: " +

            wettkampf.teamgroesse;

    }


    if (wettkampfStatusElement) {

        wettkampfStatusElement.textContent =

            "Status: " +

            statusFormatieren(
                wettkampf.status
            );

    }

}



// ==========================================================
// TEAMS LADEN
// ==========================================================

async function teamsLaden() {

    if (!competitionId) {

        return;

    }


    const {
        data,
        error
    } = await wettkampfSupabase

        .from("teams")

        .select(`
            id,
            competition_id,
            name,
            created_at
        `)

        .eq(
            "competition_id",
            competitionId
        )

        .order(
            "name",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Fehler beim Laden der Teams:",
            error
        );


        setMeldung(
            teamMeldung,
            "❌ Teams konnten nicht geladen werden.",
            "status-fehler"
        );


        return;

    }


    teams =
        data || [];


    teamsAnzeigen();

    teamsSelectAktualisieren();

}



// ==========================================================
// TEAMS ANZEIGEN
// ==========================================================

function teamsAnzeigen() {

    if (!teamsListe) {

        return;

    }


    teamsListe.innerHTML =
        "";


    if (teams.length === 0) {

        teamsListe.innerHTML = `

            <p>
                Noch keine Teams angelegt.
            </p>

        `;


        return;

    }


    teams.forEach(
        function(team) {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "team-item";


            element.innerHTML = `

                <strong>
                    ${escapeHtml(team.name)}
                </strong>

            `;


            teamsListe.appendChild(
                element
            );

        }
    );

}



// ==========================================================
// TEAM-SELECT AKTUALISIEREN
// ==========================================================

function teamsSelectAktualisieren() {

    if (!starterTeam) {

        return;

    }


    starterTeam.innerHTML = `

        <option value="">
            Einzelstart
        </option>

    `;


    teams.forEach(
        function(team) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                team.id;


            option.textContent =
                team.name;


            starterTeam.appendChild(
                option
            );

        }
    );

}



// ==========================================================
// TEAM ANLEGEN
// ==========================================================

async function teamAnlegen(
    event
) {

    event.preventDefault();


    const name =
        teamNameInput.value.trim();


    if (!name) {

        setMeldung(
            teamMeldung,
            "Bitte einen Teamnamen eingeben.",
            "status-fehler"
        );


        return;

    }


    if (!competitionId) {

        return;

    }


    // ======================================================
    // TEAMNAME AUF DOPPELUNG PRÜFEN
    // ======================================================

    const vorhandenesTeam =
        teams.find(
            function(team) {

                return (

                    team.name
                        .trim()
                        .toLowerCase() ===

                    name
                        .trim()
                        .toLowerCase()

                );

            }
        );


    if (vorhandenesTeam) {

        setMeldung(
            teamMeldung,
            "Dieses Team existiert bereits.",
            "status-fehler"
        );


        return;

    }


    // ======================================================
    // TEAM SPEICHERN
    // ======================================================

    const {
        data,
        error
    } = await wettkampfSupabase

        .from("teams")

        .insert({

            competition_id:
                competitionId,

            name:
                name

        })

        .select()

        .single();


    if (error) {

        console.error(
            "Fehler beim Anlegen des Teams:",
            error
        );


        setMeldung(
            teamMeldung,
            "❌ Team konnte nicht angelegt werden.",
            "status-fehler"
        );


        return;

    }


    setMeldung(
        teamMeldung,
        "✅ Team wurde angelegt.",
        "status-ok"
    );


    teamNameInput.value =
        "";


    await teamsLaden();

}



// ==========================================================
// TEILNEHMER LADEN
// ==========================================================

async function teilnehmerLaden() {

    const {
        data,
        error
    } = await wettkampfSupabase

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


        setMeldung(
            starterMeldung,
            "❌ Teilnehmer konnten nicht geladen werden.",
            "status-fehler"
        );


        return;

    }


    teilnehmer =
        data || [];

}



// ==========================================================
// TEILNEHMER SUCHEN
// ==========================================================

function teilnehmerSuchen() {

    if (!teilnehmerSuchergebnisse) {

        return;

    }


    const suchtext =
        (
            teilnehmerSuche.value ||
            ""
        )
        .trim()
        .toLowerCase();


    teilnehmerSuchergebnisse.innerHTML =
        "";


    if (!suchtext) {

        return;

    }


    const treffer =
        teilnehmer.filter(
            function(person) {

                const name =

                    (
                        person.vorname ||
                        ""
                    ) +

                    " " +

                    (
                        person.nachname ||
                        ""
                    );


                return name
                    .toLowerCase()
                    .includes(
                        suchtext
                    );

            }
        )
        .slice(
            0,
            15
        );


    if (treffer.length === 0) {

        teilnehmerSuchergebnisse.innerHTML = `

            <p>
                Keine Teilnehmer gefunden.
            </p>

        `;


        return;

    }


    treffer.forEach(
        function(person) {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "button";


            button.textContent =

                person.vorname +
                " " +
                person.nachname;


            button.addEventListener(
                "click",
                function() {

                    teilnehmerAuswaehlen(
                        person
                    );

                }
            );


            teilnehmerSuchergebnisse
                .appendChild(
                    button
                );

        }
    );

}



// ==========================================================
// TEILNEHMER AUSWÄHLEN
// ==========================================================

function teilnehmerAuswaehlen(
    person
) {

    ausgewaehlterTeilnehmer =
        person;


    if (ausgewaehlterTeilnehmerElement) {

        ausgewaehlterTeilnehmerElement.textContent =

            person.vorname +
            " " +
            person.nachname;

    }


    if (starterBereich) {

        starterBereich.style.display =
            "block";

    }


    if (teilnehmerSuche) {

        teilnehmerSuche.value =
            "";

    }


    if (teilnehmerSuchergebnisse) {

        teilnehmerSuchergebnisse.innerHTML =
            "";

    }


    setMeldung(
        starterMeldung,
        ""
    );

}



// ==========================================================
// START HINZUFÜGEN
// ==========================================================

async function startHinzufuegen() {

    if (!ausgewaehlterTeilnehmer) {

        setMeldung(
            starterMeldung,
            "Bitte zuerst einen Teilnehmer auswählen.",
            "status-fehler"
        );


        return;

    }


    if (!competitionId) {

        return;

    }


    const teamId =
        starterTeam.value ||
        null;


    const ak =
        Boolean(
            starterAk.checked
        );


    // ======================================================
    // START SPEICHERN
    // ======================================================
    //
    // KEINE Prüfung auf participant_id + competition_id!
    //
    // Ein Teilnehmer darf ausdrücklich mehrere Starts
    // im gleichen Wettkampf haben.
    //
    // ======================================================

    const {
        data,
        error
    } = await wettkampfSupabase

        .from("starts")

        .insert({

            competition_id:
                competitionId,

            participant_id:
                Number(
                    ausgewaehlterTeilnehmer.id
                ),

            team_id:
                teamId,

            ak:
                ak

        })

        .select()

        .single();


    if (error) {

        console.error(
            "Fehler beim Hinzufügen des Starts:",
            error
        );


        setMeldung(
            starterMeldung,
            "❌ Start konnte nicht hinzugefügt werden.",
            "status-fehler"
        );


        return;

    }


    setMeldung(
        starterMeldung,
        "✅ Start wurde hinzugefügt.",
        "status-ok"
    );


    ausgewaehltenTeilnehmerZuruecksetzen();


    await starterLaden();

}



// ==========================================================
// AUSWAHL ZURÜCKSETZEN
// ==========================================================

function ausgewaehltenTeilnehmerZuruecksetzen() {

    ausgewaehlterTeilnehmer =
        null;


    if (ausgewaehlterTeilnehmerElement) {

        ausgewaehlterTeilnehmerElement.textContent =
            "";

    }


    if (starterTeam) {

        starterTeam.value =
            "";

    }


    if (starterAk) {

        starterAk.checked =
            false;

    }


    if (starterBereich) {

        starterBereich.style.display =
            "none";

    }

}



// ==========================================================
// STARTER LADEN
// ==========================================================

async function starterLaden() {

    if (!competitionId) {

        return;

    }


    if (!starterListe) {

        return;

    }


    starterListe.innerHTML = `

        <p>
            Starter werden geladen ...
        </p>

    `;


    // ======================================================
    // STARTS
    // ======================================================

    const {
        data: startDaten,
        error: startFehler
    } = await wettkampfSupabase

        .from("starts")

        .select(`
            id,
            competition_id,
            participant_id,
            team_id,
            ak,
            created_at
        `)

        .eq(
            "competition_id",
            competitionId
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


        starterListe.innerHTML = `

            <p class="status-fehler">
                Starter konnten nicht geladen werden.
            </p>

        `;


        return;

    }


    starts =
        startDaten || [];



    // ======================================================
    // ERGEBNISSE LADEN
    // ======================================================
    //
    // WICHTIG:
    //
    // results besitzt:
    //
    // id
    // start_id
    // nummer
    // wert
    // created_at
    //
    // ======================================================

    const startIds =
        starts.map(
            function(start) {

                return start.id;

            }
        );


    let ergebnisse = [];


    if (startIds.length > 0) {

        const {
            data: resultDaten,
            error: resultFehler
        } = await wettkampfSupabase

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


        if (resultFehler) {

            console.error(
                "Fehler beim Laden der Ergebnisse:",
                resultFehler
            );


            starterListe.innerHTML = `

                <p class="status-fehler">
                    Ergebnisse konnten nicht geladen werden.
                </p>

            `;


            return;

        }


        ergebnisse =
            resultDaten || [];

    }



    // ======================================================
    // STARTS MIT TEILNEHMERN UND TEAMS VERKNÜPFEN
    // ======================================================

    const teilnehmerMap =
        new Map();


    teilnehmer.forEach(
        function(person) {

            teilnehmerMap.set(
                String(person.id),
                person
            );

        }
    );


    const teamMap =
        new Map();


    teams.forEach(
        function(team) {

            teamMap.set(
                String(team.id),
                team
            );

        }
    );


    const ergebnisMap =
        new Map();


    ergebnisse.forEach(
        function(ergebnis) {

            const startId =
                String(
                    ergebnis.start_id
                );


            if (
                !ergebnisMap.has(
                    startId
                )
            ) {

                ergebnisMap.set(
                    startId,
                    []
                );

            }


            ergebnisMap
                .get(startId)
                .push(
                    ergebnis
                );

        }
    );



    // ======================================================
    // ANZEIGEN
    // ======================================================

    starterListe.innerHTML =
        "";


    if (starts.length === 0) {

        starterListe.innerHTML = `

            <p>
                Noch keine Starter vorhanden.
            </p>

        `;


        return;

    }


    starts.forEach(
        function(start, index) {

            const person =
                teilnehmerMap.get(
                    String(
                        start.participant_id
                    )
                );


            const team =
                start.team_id
                    ? teamMap.get(
                        String(
                            start.team_id
                        )
                    )
                    : null;


            const startErgebnisse =
                ergebnisMap.get(
                    String(
                        start.id
                    )
                ) || [];


            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "starter-item";


            const name =

                person

                    ? (

                        person.vorname +
                        " " +
                        person.nachname

                    )

                    : (

                        "Teilnehmer #" +
                        start.participant_id

                    );


            let ergebnisText =
                "Noch keine Ergebnisse";


            if (
                startErgebnisse.length > 0
            ) {

                ergebnisText =
                    startErgebnisse

                        .sort(
                            function(a, b) {

                                return (
                                    a.nummer -
                                    b.nummer
                                );

                            }
                        )

                        .map(
                            function(ergebnis) {

                                return (

                                    Number(
                                        ergebnis.nummer
                                    ) +

                                    ": " +

                                    wertFormatieren(
                                        ergebnis.wert
                                    )

                                );

                            }
                        )

                        .join(
                            " | "
                        );

            }


            element.innerHTML = `

                <div class="starter-item-inhalt">


                    <h3>

                        ${index + 1}.
                        ${escapeHtml(name)}

                    </h3>


                    <p>

                        <strong>
                            Team:
                        </strong>

                        ${
                            team
                                ? escapeHtml(team.name)
                                : "Einzelstart"
                        }

                    </p>


                    <p>

                        <strong>
                            AK:
                        </strong>

                        ${
                            start.ak
                                ? "Ja"
                                : "Nein"
                        }

                    </p>


                    <p>

                        <strong>
                            Ergebnisse:
                        </strong>

                        ${escapeHtml(
                            ergebnisText
                        )}

                    </p>


                </div>


                <div class="starter-item-aktionen">


                    <button
                        type="button"
                        class="button"
                        data-ergebnisse="${start.id}"
                    >
                        Ergebnisse
                    </button>


                    <button
                        type="button"
                        class="button button-danger"
                        data-start-loeschen="${start.id}"
                    >
                        Start löschen
                    </button>


                </div>

            `;


            starterListe.appendChild(
                element
            );

        }
    );



    // ======================================================
    // ERGEBNISSE BUTTON
    // ======================================================

    starterListe
        .querySelectorAll(
            "[data-ergebnisse]"
        )
        .forEach(
            function(button) {

                button.addEventListener(
                    "click",
                    function() {

                        const startId =
                            button.dataset.ergebnisse;


                        ergebnisseBearbeiten(
                            startId
                        );

                    }
                );

            }
        );



    // ======================================================
    // START LÖSCHEN
    // ======================================================

    starterListe
        .querySelectorAll(
            "[data-start-loeschen]"
        )
        .forEach(
            function(button) {

                button.addEventListener(
                    "click",
                    function() {

                        const startId =
                            button.dataset.startLoeschen;


                        startLoeschen(
                            startId
                        );

                    }
                );

            }
        );

}



// ==========================================================
// ERGEBNISSE BEARBEITEN
// ==========================================================
//
// Öffnet die vorhandene Eingabeseite mit start_id.
//
// Dadurch können Ergebnisse später jederzeit korrigiert
// werden.
//
// ==========================================================

function ergebnisseBearbeiten(
    startId
) {

    window.location.href =

        "ergebnisse-eingabe.html" +

        "?start_id=" +

        encodeURIComponent(
            startId
        );

}



// ==========================================================
// START LÖSCHEN
// ==========================================================

async function startLoeschen(
    startId
) {

    const bestaetigt =
        confirm(
            "Diesen Start wirklich löschen?\n\n" +
            "Die zugehörigen Ergebnisse werden ebenfalls gelöscht."
        );


    if (!bestaetigt) {

        return;

    }


    // ======================================================
    // ZUERST ERGEBNISSE LÖSCHEN
    // ======================================================

    const {
        error: resultFehler
    } = await wettkampfSupabase

        .from("results")

        .delete()

        .eq(
            "start_id",
            startId
        );


    if (resultFehler) {

        console.error(
            "Fehler beim Löschen der Ergebnisse:",
            resultFehler
        );


        setMeldung(
            starterMeldung,
            "❌ Ergebnisse konnten nicht gelöscht werden.",
            "status-fehler"
        );


        return;

    }



    // ======================================================
    // START LÖSCHEN
    // ======================================================

    const {
        error: startFehler
    } = await wettkampfSupabase

        .from("starts")

        .delete()

        .eq(
            "id",
            startId
        );


    if (startFehler) {

        console.error(
            "Fehler beim Löschen des Starts:",
            startFehler
        );


        setMeldung(
            starterMeldung,
            "❌ Start konnte nicht gelöscht werden.",
            "status-fehler"
        );


        return;

    }


    setMeldung(
        starterMeldung,
        "✅ Start wurde gelöscht.",
        "status-ok"
    );


    await starterLaden();

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


    const teile =
        String(
            datum
        ).split("-");


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
// STATUS FORMATIEREN
// ==========================================================

function statusFormatieren(
    status
) {

    switch (status) {

        case "geplant":

            return "Geplant";


        case "laufend":

            return "Laufend";


        case "beendet":

            return "Beendet";


        default:

            return status || "";

    }

}



// ==========================================================
// WERT FORMATIEREN
// ==========================================================

function wertFormatieren(
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

        return String(
            wert
        );

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

function escapeHtml(
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
// EVENTS
// ==========================================================


// TEAM FORMULAR

if (teamForm) {

    teamForm.addEventListener(
        "submit",
        teamAnlegen
    );

}



// TEILNEHMER SUCHE

if (teilnehmerSuche) {

    teilnehmerSuche.addEventListener(
        "input",
        teilnehmerSuchen
    );

}



// START HINZUFÜGEN

if (starterHinzufuegen) {

    starterHinzufuegen.addEventListener(
        "click",
        startHinzufuegen
    );

}



// AUSWAHL ABBRECHEN

if (starterAbbrechen) {

    starterAbbrechen.addEventListener(
        "click",
        function() {

            ausgewaehltenTeilnehmerZuruecksetzen();


            setMeldung(
                starterMeldung,
                ""
            );

        }
    );

}



// ==========================================================
// START
// ==========================================================

async function start() {

    if (!competitionId) {

        return;

    }


    await wettkampfLaden();

    await teilnehmerLaden();

    await teamsLaden();

    await starterLaden();

}


start();
