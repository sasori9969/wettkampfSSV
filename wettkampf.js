// ==========================================================
// SSV 1928 SULZBACH E.V.
// WETTKAMPFVERWALTUNG
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

let wettkampf = null;

let teams = [];

let teilnehmer = [];

let ausgewaehlterTeilnehmer = null;

let bearbeiteterStart = null;

let starts = [];

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


function formatDatum(datum) {

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
    id,
    text,
    typ = ""
) {

    const element =
        el(id);

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


function anzeigen(id) {

    const element =
        el(id);

    if (element) {

        element.style.display =
            "";

    }

}


function verstecken(id) {

    const element =
        el(id);

    if (element) {

        element.style.display =
            "none";

    }

}


// ==========================================================
// WETTKAMPF-ID AUS URL
// ==========================================================

function wettkampfIdAusUrl() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return (
        params.get("id") ||
        params.get("wettkampf")
    );

}


// ==========================================================
// WETTKAMPF LADEN
// ==========================================================

async function wettkampfLaden() {

    const id =
        wettkampfIdAusUrl();


    if (!id) {

        el("wettkampf-name").textContent =
            "Kein Wettkampf ausgewählt.";

        el("wettkampf-info").textContent =
            "Bitte einen Wettkampf aus der Übersicht auswählen.";

        return false;

    }


    const {
        data,
        error
    } = await supabaseClient

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
            id
        )

        .single();


    if (error) {

        console.error(
            "Fehler beim Laden des Wettkampfs:",
            error
        );


        el("wettkampf-name").textContent =
            "Fehler";

        el("wettkampf-info").textContent =
            "Der Wettkampf konnte nicht geladen werden.";

        return false;

    }


    wettkampf =
        data;


    el("wettkampf-name").textContent =
        wettkampf.name;


    el("wettkampf-info").textContent =
        `Datum: ${formatDatum(wettkampf.datum)} | ` +
        `Ergebnisse je Start: ${wettkampf.anzahl_ergebnisse || 3} | ` +
        `Teamgröße: ${wettkampf.teamgroesse || 3}`;


    el("wettkampf-status").textContent =
        `Status: ${wettkampf.status || "geplant"}`;


    return true;

}


// ==========================================================
// TEAMS LADEN
// ==========================================================

async function teamsLaden() {

    if (!wettkampf) {
        return;
    }


    const {
        data,
        error
    } = await supabaseClient

        .from("teams")

        .select(`
            id,
            competition_id,
            name,
            created_at
        `)

        .eq(
            "competition_id",
            wettkampf.id
        )

        .order(
            "created_at",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Fehler beim Laden der Teams:",
            error
        );

        meldung(
            "team-meldung",
            "Teams konnten nicht geladen werden.",
            "fehler"
        );

        return;

    }


    teams =
        data || [];


    teamsAnzeigen();


    teamAuswahlAktualisieren();

}


// ==========================================================
// TEAMS ANZEIGEN
// ==========================================================

function teamsAnzeigen() {

    const container =
        el("teams-liste");


    if (!container) {
        return;
    }


    if (teams.length === 0) {

        container.innerHTML = `
            <p>
                Noch keine Teams angelegt.
            </p>
        `;

        return;

    }


    container.innerHTML =
        teams
            .map(
                function(team) {

                    const teamStarts =
                        starts.filter(
                            function(start) {

                                return (
                                    start.team_id ===
                                    team.id
                                );

                            }
                        );


                    const normale =
                        teamStarts.filter(
                            function(start) {

                                return !start.ak;

                            }
                        );


                    const ak =
                        teamStarts.filter(
                            function(start) {

                                return start.ak;

                            }
                        );


                    return `

                        <div class="card">

                            <h3>
                                ${escapeHtml(team.name)}
                            </h3>

                            <p>
                                Wertungsstarter:
                                <strong>
                                    ${normale.length}
                                </strong>
                            </p>

                            <p>
                                AK-Starter:
                                <strong>
                                    ${ak.length}
                                </strong>
                            </p>

                            <div>

                                ${
                                    teamStarts.length === 0
                                    ? `
                                        <p>
                                            Noch keine Starter.
                                        </p>
                                      `
                                    : teamStarts
                                        .map(
                                            function(start) {

                                                return startZeile(
                                                    start
                                                );

                                            }
                                        )
                                        .join("")
                                }

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


// ==========================================================
// STARTER ZEILE
// ==========================================================

function startZeile(start) {

    const vorname =
        start.participants?.vorname || "";

    const nachname =
        start.participants?.nachname || "";


    let status =
        "";


    if (start.ak) {

        status =
            "AK";

    } else {

        status =
            "Wertung";

    }


    return `

        <div
            class="start-zeile"
            style="
                padding: 10px;
                margin: 6px 0;
                border: 1px solid #ddd;
                border-radius: 8px;
            "
        >

            <strong>
                ${escapeHtml(vorname)}
                ${escapeHtml(nachname)}
            </strong>

            <span>
                – ${status}
            </span>


            <button
                type="button"
                onclick="startBearbeiten('${start.id}')"
            >
                Ändern
            </button>


            <button
                type="button"
                onclick="startLoeschen('${start.id}')"
            >
                Löschen
            </button>

        </div>

    `;

}


// ==========================================================
// TEILNEHMER LADEN
// ==========================================================

async function teilnehmerLaden() {

    const {
        data,
        error
    } = await supabaseClient

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

        meldung(
            "starter-meldung",
            "Teilnehmer konnten nicht geladen werden.",
            "fehler"
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

    const input =
        el("teilnehmer-suche");

    const container =
        el("teilnehmer-suchergebnisse");


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
        return;
    }


    const treffer =
        teilnehmer.filter(
            function(person) {

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


                return (
                    vorname.startsWith(suchtext) ||
                    nachname.startsWith(suchtext) ||
                    kompletterName.includes(suchtext)
                );

            }
        );


    if (treffer.length === 0) {

        container.innerHTML = `
            <p>
                Kein Teilnehmer gefunden.
            </p>
        `;

        return;

    }


    treffer
        .slice(0, 20)
        .forEach(
            function(person) {

                const button =
                    document.createElement(
                        "button"
                    );


                button.type =
                    "button";


                button.className =
                    "start-button";


                button.innerHTML = `

                    <span class="start-button-icon">
                        👤
                    </span>

                    <span class="start-button-text">

                        <strong>
                            ${escapeHtml(person.vorname)}
                            ${escapeHtml(person.nachname)}
                        </strong>

                        <small>
                            Starter auswählen
                        </small>

                    </span>

                `;


                button.addEventListener(
                    "click",
                    function() {

                        starterAuswaehlen(
                            person
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
// STARTER AUSWÄHLEN
// ==========================================================

function starterAuswaehlen(
    person
) {

    ausgewaehlterTeilnehmer =
        person;


    const suche =
        el("teilnehmer-suche");


    if (suche) {

        suche.value =
            `${person.vorname} ${person.nachname}`;

    }


    const ergebnisse =
        el("teilnehmer-suchergebnisse");


    if (ergebnisse) {

        ergebnisse.innerHTML =
            "";

    }


    anzeigen(
        "starter-bereich"
    );


    el(
        "ausgewaehlter-teilnehmer"
    ).textContent =
        `${person.vorname} ${person.nachname}`;


    el(
        "starter-ak"
    ).checked =
        false;


    el(
        "starter-team"
    ).value =
        "";


    bearbeiteterStart =
        null;

}


// ==========================================================
// TEAM-AUSWAHL AKTUALISIEREN
// ==========================================================

function teamAuswahlAktualisieren() {

    const select =
        el("starter-team");


    if (!select) {
        return;
    }


    const bisherigerWert =
        select.value;


    select.innerHTML = `

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


            select.appendChild(
                option
            );

        }
    );


    if (bisherigerWert) {

        select.value =
            bisherigerWert;

    }

}


// ==========================================================
// START HINZUFÜGEN
// ==========================================================

async function startHinzufuegen() {

    if (
        !wettkampf ||
        !ausgewaehlterTeilnehmer
    ) {

        meldung(
            "starter-meldung",
            "Bitte zuerst einen Teilnehmer auswählen.",
            "fehler"
        );

        return;

    }


    const teamId =
        el("starter-team").value ||
        null;


    const ak =
        el("starter-ak").checked;


    const daten = {

        competition_id:
            wettkampf.id,

        participant_id:
            ausgewaehlterTeilnehmer.id,

        team_id:
            teamId,

        ak:
            ak

    };


    // ======================================================
    // NEUEN START
    // ======================================================

    if (!bearbeiteterStart) {

        const {
            data,
            error
        } = await supabaseClient

            .from("starts")

            .insert(
                daten
            )

            .select(`
                id,
                competition_id,
                participant_id,
                team_id,
                ak,
                created_at
            `)

            .single();


        if (error) {

            console.error(
                "Fehler beim Anlegen des Starts:",
                error
            );


            meldung(
                "starter-meldung",
                "Starter konnte nicht hinzugefügt werden.",
                "fehler"
            );

            return;

        }


        meldung(
            "starter-meldung",
            "Starter erfolgreich hinzugefügt.",
            "erfolg"
        );

    }


    // ======================================================
    // BESTEHENDEN START ÄNDERN
    // ======================================================

    else {

        const {
            error
        } = await supabaseClient

            .from("starts")

            .update(
                daten
            )

            .eq(
                "id",
                bearbeiteterStart.id
            );


        if (error) {

            console.error(
                "Fehler beim Ändern des Starts:",
                error
            );


            meldung(
                "starter-meldung",
                "Start konnte nicht geändert werden.",
                "fehler"
            );

            return;

        }


        meldung(
            "starter-meldung",
            "Start wurde erfolgreich geändert.",
            "erfolg"
        );

    }


    starterFormZuruecksetzen();


    await allesNeuLaden();

}


// ==========================================================
// START BEARBEITEN
// ==========================================================

function startBearbeiten(
    startId
) {

    const start =
        starts.find(
            function(item) {

                return item.id === startId;

            }
        );


    if (!start) {

        return;

    }


    ausgewaehlterTeilnehmer =
        start.participants;


    bearbeiteterStart =
        start;


    anzeigen(
        "starter-bereich"
    );


    el(
        "ausgewaehlter-teilnehmer"
    ).textContent =
        `${start.participants?.vorname || ""} ${start.participants?.nachname || ""}`;


    el(
        "starter-team"
    ).value =
        start.team_id || "";


    el(
        "starter-ak"
    ).checked =
        Boolean(
            start.ak
        );


    const suche =
        el("teilnehmer-suche");


    if (suche) {

        suche.value =
            `${start.participants?.vorname || ""} ${start.participants?.nachname || ""}`;

    }


    window.scrollTo(
        {
            top:
                document.getElementById(
                    "starter-bereich"
                )?.offsetTop || 0,

            behavior:
                "smooth"
        }
    );

}


// ==========================================================
// START LÖSCHEN
// ==========================================================

async function startLoeschen(
    startId
) {

    const start =
        starts.find(
            function(item) {

                return item.id === startId;

            }
        );


    if (!start) {
        return;
    }


    const name =
        `${start.participants?.vorname || ""} ${start.participants?.nachname || ""}`;


    const bestaetigt =
        window.confirm(
            `Start von ${name} wirklich löschen?\n\nDie zugehörigen Ergebnisse werden ebenfalls gelöscht.`
        );


    if (!bestaetigt) {
        return;
    }


    const {
        error
    } = await supabaseClient

        .from("starts")

        .delete()

        .eq(
            "id",
            startId
        );


    if (error) {

        console.error(
            "Fehler beim Löschen des Starts:",
            error
        );


        meldung(
            "starter-meldung",
            "Start konnte nicht gelöscht werden.",
            "fehler"
        );

        return;

    }


    meldung(
        "starter-meldung",
        "Start wurde gelöscht.",
        "erfolg"
    );


    await allesNeuLaden();

}


// ==========================================================
// STARTER FORM ZURÜCKSETZEN
// ==========================================================

function starterFormZuruecksetzen() {

    ausgewaehlterTeilnehmer =
        null;

    bearbeiteterStart =
        null;


    verstecken(
        "starter-bereich"
    );


    const suche =
        el("teilnehmer-suche");


    if (suche) {

        suche.value =
            "";

    }


    const ergebnisse =
        el("teilnehmer-suchergebnisse");


    if (ergebnisse) {

        ergebnisse.innerHTML =
            "";

    }


    const team =
        el("starter-team");


    if (team) {

        team.value =
            "";

    }


    const ak =
        el("starter-ak");


    if (ak) {

        ak.checked =
            false;

    }

}


// ==========================================================
// STARTS LADEN
// ==========================================================

async function startsLaden() {

    if (!wettkampf) {
        return;
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
            )
        `)

        .eq(
            "competition_id",
            wettkampf.id
        )

        .order(
            "created_at",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Fehler beim Laden der Starter:",
            error
        );


        meldung(
            "starter-meldung",
            "Starter konnten nicht geladen werden.",
            "fehler"
        );

        return;

    }


    starts =
        data || [];


    starterAnzeigen();

    teamsAnzeigen();

}


// ==========================================================
// STARTER ANZEIGEN
// ==========================================================

function starterAnzeigen() {

    const container =
        el("starter-liste");


    if (!container) {
        return;
    }


    if (starts.length === 0) {

        container.innerHTML = `
            <p>
                Noch keine Starter für diesen Wettkampf vorhanden.
            </p>
        `;

        return;

    }


    container.innerHTML =
        starts
            .map(
                function(start, index) {

                    const vorname =
                        start.participants?.vorname || "";

                    const nachname =
                        start.participants?.nachname || "";


                    const team =
                        start.teams?.name ||
                        "Einzelstart";


                    const status =
                        start.ak
                        ? "AK"
                        : "Wertung";


                    return `

                        <div
                            class="start-zeile"
                            style="
                                padding: 12px;
                                margin: 8px 0;
                                border: 1px solid #ddd;
                                border-radius: 8px;
                            "
                        >

                            <strong>
                                ${index + 1}.
                                ${escapeHtml(vorname)}
                                ${escapeHtml(nachname)}
                            </strong>

                            <div>
                                Team:
                                <strong>
                                    ${escapeHtml(team)}
                                </strong>
                            </div>

                            <div>
                                Status:
                                <strong>
                                    ${status}
                                </strong>
                            </div>


                            <div
                                style="margin-top: 8px;"
                            >

                                <button
                                    type="button"
                                    onclick="startBearbeiten('${start.id}')"
                                >
                                    Ändern
                                </button>


                                <button
                                    type="button"
                                    onclick="startLoeschen('${start.id}')"
                                >
                                    Löschen
                                </button>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


// ==========================================================
// TEAM ANLEGEN
// ==========================================================

async function teamAnlegen(
    event
) {

    event.preventDefault();


    if (!wettkampf) {

        meldung(
            "team-meldung",
            "Kein Wettkampf ausgewählt.",
            "fehler"
        );

        return;

    }


    const input =
        el("team-name");


    const name =
        input.value.trim();


    if (!name) {

        meldung(
            "team-meldung",
            "Bitte einen Teamnamen eingeben.",
            "fehler"
        );

        return;

    }


    const {
        data,
        error
    } = await supabaseClient

        .from("teams")

        .insert({

            competition_id:
                wettkampf.id,

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


        meldung(
            "team-meldung",
            "Team konnte nicht angelegt werden.",
            "fehler"
        );

        return;

    }


    teams.push(
        data
    );


    input.value =
        "";


    meldung(
        "team-meldung",
        "Team erfolgreich angelegt.",
        "erfolg"
    );


    teamsAnzeigen();

    teamAuswahlAktualisieren();

}


// ==========================================================
// ALLES NEU LADEN
// ==========================================================

async function allesNeuLaden() {

    await startsLaden();

}


// ==========================================================
// EVENTS
// ==========================================================

function eventsEinrichten() {


    // ------------------------------------------------------
    // TEILNEHMERSUCHE
    // ------------------------------------------------------

    const suche =
        el("teilnehmer-suche");


    if (suche) {

        suche.addEventListener(
            "input",
            function() {

                clearTimeout(
                    suchTimer
                );


                suchTimer =
                    setTimeout(
                        teilnehmerSuchen,
                        100
                    );

            }
        );

    }


    // ------------------------------------------------------
    // START HINZUFÜGEN
    // ------------------------------------------------------

    const addButton =
        el("starter-hinzufuegen");


    if (addButton) {

        addButton.addEventListener(
            "click",
            startHinzufuegen
        );

    }


    // ------------------------------------------------------
    // START ABBRECHEN
    // ------------------------------------------------------

    const cancelButton =
        el("starter-abbrechen");


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            starterFormZuruecksetzen
        );

    }


    // ------------------------------------------------------
    // TEAM FORMULAR
    // ------------------------------------------------------

    const teamForm =
        el("team-form");


    if (teamForm) {

        teamForm.addEventListener(
            "submit",
            teamAnlegen
        );

    }

}


// ==========================================================
// START
// ==========================================================

async function appStarten() {

    eventsEinrichten();


    const erfolgreich =
        await wettkampfLaden();


    if (!erfolgreich) {
        return;
    }


    await teilnehmerLaden();

    await teamsLaden();

    await startsLaden();

}


// ==========================================================
// APP STARTEN
// ==========================================================

appStarten();
