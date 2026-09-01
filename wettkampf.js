// ==========================================================
// SSV 1928 SULZBACH E.V.
// WETTKAMPF VERWALTUNG
// DATEI: wettkampf.js
// ==========================================================


// ==========================================================
// SUPABASE
// ==========================================================

const wettkampfSupabaseClient =
    supabaseClient;


// ==========================================================
// WETTKAMPF-ID AUS URL
// ==========================================================

const wettkampfUrl =
    new URLSearchParams(
        window.location.search
    );


const wettkampfId =
    wettkampfUrl.get("id");


// ==========================================================
// DOM
// ==========================================================

const wettkampfName =
    document.getElementById(
        "wettkampf-name"
    );


const wettkampfInfo =
    document.getElementById(
        "wettkampf-info"
    );


const wettkampfStatus =
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


const teamsListe =
    document.getElementById(
        "teams-liste"
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


const ausgewaehlterTeilnehmer =
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


const starterListe =
    document.getElementById(
        "starter-liste"
    );


// ==========================================================
// AUSGEWÄHLTER TEILNEHMER
// ==========================================================

let ausgewaehlterTeilnehmerId =
    null;


// ==========================================================
// HTML SICHER MACHEN
// ==========================================================

function wettkampfHtmlSicher(
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

function wettkampfMeldung(
    element,
    text,
    typ = ""
) {

    if (!element) {
        return;
    }


    element.textContent =
        text;


    element.className =
        "meldung";


    if (typ) {

        element.classList.add(
            typ
        );

    }

}


// ==========================================================
// WETTKAMPF LADEN
// ==========================================================

async function wettkampfLaden() {

    if (!wettkampfId) {

        if (wettkampfName) {

            wettkampfName.textContent =
                "Kein Wettkampf ausgewählt.";

        }

        return;

    }


    const {
        data,
        error
    } =
        await wettkampfSupabaseClient

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
                wettkampfId
            )

            .single();


    if (error) {

        console.error(
            "Fehler beim Laden des Wettkampfs:",
            error
        );


        if (wettkampfName) {

            wettkampfName.textContent =
                "Fehler beim Laden des Wettkampfs.";

        }

        return;

    }


    if (wettkampfName) {

        wettkampfName.textContent =
            data.name || "Wettkampf";

    }


    if (wettkampfInfo) {

        const datum =
            data.datum
            ? new Date(
                data.datum + "T00:00:00"
              ).toLocaleDateString(
                "de-DE"
              )
            : "-";


        wettkampfInfo.textContent =
            `Datum: ${datum} | ` +
            `Ergebnisse pro Start: ${data.anzahl_ergebnisse ?? "-"} | ` +
            `Teamgröße: ${data.teamgroesse ?? "-"}`;

    }


    if (wettkampfStatus) {

        wettkampfStatus.innerHTML = `

            Status:
            <span class="status-badge status-${wettkampfHtmlSicher(
                data.status || ""
            )}">
                ${wettkampfHtmlSicher(
                    data.status || "-"
                )}
            </span>

        `;

    }

}


// ==========================================================
// TEAMS LADEN
// ==========================================================

async function teamsLaden() {

    if (!teamsListe) {
        return;
    }


    teamsListe.innerHTML = `

        <p class="loading">
            Teams werden geladen ...
        </p>

    `;


    const {
        data,
        error
    } =
        await wettkampfSupabaseClient

            .from("teams")

            .select(`
                id,
                name,
                competition_id,
                created_at
            `)

            .eq(
                "competition_id",
                wettkampfId
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


        teamsListe.innerHTML = `

            <div class="error">
                Fehler beim Laden der Teams.
            </div>

        `;

        return;

    }


    if (
        !data ||
        data.length === 0
    ) {

        teamsListe.innerHTML = `

            <div class="empty-state">

                <strong>
                    Noch keine Teams vorhanden.
                </strong>

                <span>
                    Lege oben das erste Team an.
                </span>

            </div>

        `;

        await teamAuswahlAktualisieren([]);

        return;

    }


    teamsListe.innerHTML =
        "";


    for (
        const team of data
    ) {

        const card =
            document.createElement(
                "div"
            );


        card.className =
            "team-card";


        // ----------------------------------------------
        // Mitglieder des Teams laden
        // ----------------------------------------------

        const {
            data: starts,
            error: startsError
        } =
            await wettkampfSupabaseClient

                .from("starts")

                .select(`
                    id,
                    participant_id,
                    ak,
                    participants (
                        vorname,
                        nachname
                    )
                `)

                .eq(
                    "competition_id",
                    wettkampfId
                )

                .eq(
                    "team_id",
                    team.id
                );


        if (startsError) {

            console.error(
                "Fehler beim Laden der Teammitglieder:",
                startsError
            );

        }


        const mitglieder =
            starts || [];


        const mitgliederText =
            mitglieder.length === 0
            ? "Keine Starter"
            : mitglieder
                .map(
                    function(start) {

                        const name =
                            `${start.participants?.vorname || ""} ` +
                            `${start.participants?.nachname || ""}`;

                        return `
                            ${wettkampfHtmlSicher(
                                name.trim()
                            )}
                            ${start.ak ? "(AK)" : ""}
                        `;

                    }
                )
                .join(
                    ", "
                );


        card.innerHTML = `

            <div>

                <div class="team-name">

                    ${wettkampfHtmlSicher(
                        team.name
                    )}

                </div>

                <div class="team-members">

                    ${mitgliederText}

                </div>

            </div>

        `;


        teamsListe.appendChild(
            card
        );

    }


    await teamAuswahlAktualisieren(
        data
    );

}


// ==========================================================
// TEAM AUSWAHL AKTUALISIEREN
// ==========================================================

async function teamAuswahlAktualisieren(
    teams
) {

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


    if (!wettkampfId) {
        return;
    }


    const name =
        teamNameInput?.value.trim();


    if (!name) {

        wettkampfMeldung(
            teamMeldung,
            "❌ Bitte einen Teamnamen eingeben.",
            "status-fehler"
        );

        return;

    }


    const button =
        teamForm?.querySelector(
            'button[type="submit"]'
        );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Team wird angelegt ...";

    }


    try {

        const {
            data,
            error
        } =
            await wettkampfSupabaseClient

                .from("teams")

                .insert({

                    competition_id:
                        wettkampfId,

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


            wettkampfMeldung(
                teamMeldung,
                "❌ Team konnte nicht angelegt werden.",
                "status-fehler"
            );


            return;

        }


        console.log(
            "Team angelegt:",
            data
        );


        teamNameInput.value =
            "";


        wettkampfMeldung(
            teamMeldung,
            "✅ Team erfolgreich angelegt.",
            "status-ok"
        );


        await teamsLaden();


    }
    finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Team anlegen";

        }

    }

}


// ==========================================================
// TEILNEHMER SUCHEN
// ==========================================================

let suchTimeout =
    null;


async function teilnehmerSuchen() {

    if (!teilnehmerSuche) {
        return;
    }


    const suchtext =
        teilnehmerSuche.value.trim();


    if (suchtext.length < 1) {

        teilnehmerSuchergebnisse.innerHTML =
            "";

        return;

    }


    const {
        data,
        error
    } =
        await wettkampfSupabaseClient

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
                20
            );


    if (error) {

        console.error(
            "Fehler bei der Teilnehmer-Suche:",
            error
        );


        teilnehmerSuchergebnisse.innerHTML = `

            <div class="error">
                Fehler bei der Suche.
            </div>

        `;

        return;

    }


    teilnehmerSuchergebnisse.innerHTML =
        "";


    if (
        !data ||
        data.length === 0
    ) {

        teilnehmerSuchergebnisse.innerHTML = `

            <div class="empty-state">
                Keine Teilnehmer gefunden.
            </div>

        `;

        return;

    }


    data.forEach(
        function(person) {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "teilnehmer-suchergebnis";


            element.innerHTML = `

                <span>

                    <strong>
                        ${wettkampfHtmlSicher(
                            person.vorname
                        )}
                        ${wettkampfHtmlSicher(
                            person.nachname
                        )}
                    </strong>

                </span>

            `;


            element.addEventListener(
                "click",
                function() {

                    teilnehmerAuswaehlen(
                        person
                    );

                }
            );


            teilnehmerSuchergebnisse.appendChild(
                element
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

    ausgewaehlterTeilnehmerId =
        person.id;


    if (ausgewaehlterTeilnehmer) {

        ausgewaehlterTeilnehmer.textContent =
            `${person.vorname} ${person.nachname}`;

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

}


// ==========================================================
// AUSWAHL ABBRECHEN
// ==========================================================

function starterAuswahlZuruecksetzen() {

    ausgewaehlterTeilnehmerId =
        null;


    if (starterBereich) {

        starterBereich.style.display =
            "none";

    }


    if (starterTeam) {

        starterTeam.value =
            "";

    }


    if (starterAk) {

        starterAk.checked =
            false;

    }


    if (ausgewaehlterTeilnehmer) {

        ausgewaehlterTeilnehmer.textContent =
            "";

    }

}


// ==========================================================
// START HINZUFÜGEN
// ==========================================================

async function starterHinzufuegenFunktion() {

    if (!wettkampfId) {
        return;
    }


    if (!ausgewaehlterTeilnehmerId) {

        wettkampfMeldung(
            starterMeldung,
            "❌ Bitte zuerst einen Teilnehmer auswählen.",
            "status-fehler"
        );

        return;

    }


    const teamId =
        starterTeam?.value || null;


    const ak =
        starterAk?.checked || false;


    if (
        teamId
    ) {

        // ----------------------------------------------
        // Teamgröße prüfen
        // ----------------------------------------------

        const {
            data: teamStarts,
            error: teamError
        } =
            await wettkampfSupabaseClient

                .from("starts")

                .select(
                    "id"
                )

                .eq(
                    "competition_id",
                    wettkampfId
                )

                .eq(
                    "team_id",
                    teamId
                );


        if (teamError) {

            console.error(
                "Fehler bei der Teamprüfung:",
                teamError
            );


            wettkampfMeldung(
                starterMeldung,
                "❌ Team konnte nicht geprüft werden.",
                "status-fehler"
            );


            return;

        }


        const {
            data: wettkampfData,
            error: wettkampfError
        } =
            await wettkampfSupabaseClient

                .from("competitions")

                .select(
                    "teamgroesse"
                )

                .eq(
                    "id",
                    wettkampfId
                )

                .single();


        if (wettkampfError) {

            console.error(
                "Fehler beim Laden der Teamgröße:",
                wettkampfError
            );


            return;

        }


        const maximaleTeamgroesse =
            Number(
                wettkampfData?.teamgroesse
            );


        if (
            maximaleTeamgroesse > 0 &&
            teamStarts.length >= maximaleTeamgroesse
        ) {

            wettkampfMeldung(
                starterMeldung,
                `❌ Das Team ist bereits voll (${maximaleTeamgroesse} Starter).`,
                "status-fehler"
            );


            return;

        }

    }


    const button =
        starterHinzufuegen;


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Start wird gespeichert ...";

    }


    try {

        // ==================================================
        // START ANLEGEN
        // ==================================================

        const {
            data,
            error
        } =
            await wettkampfSupabaseClient

                .from("starts")

                .insert({

                    competition_id:
                        wettkampfId,

                    participant_id:
                        ausgewaehlterTeilnehmerId,

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


            wettkampfMeldung(
                starterMeldung,
                "❌ Start konnte nicht hinzugefügt werden.",
                "status-fehler"
            );


            return;

        }


        console.log(
            "Start angelegt:",
            data
        );


        wettkampfMeldung(
            starterMeldung,
            "✅ Start erfolgreich hinzugefügt.",
            "status-ok"
        );


        starterAuswahlZuruecksetzen();


        await teamsLaden();

        await starterLaden();


    }
    finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Start hinzufügen";

        }

    }

}


// ==========================================================
// STARTER LADEN
// ==========================================================

async function starterLaden() {

    if (!starterListe) {
        return;
    }


    starterListe.innerHTML = `

        <p class="loading">
            Starter werden geladen ...
        </p>

    `;


    // ======================================================
    // STARTS LADEN
    // ======================================================

    const {
        data: starts,
        error: startsError
    } =
        await wettkampfSupabaseClient

            .from("starts")

            .select(`
                id,
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
                wettkampfId
            )

            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (startsError) {

        console.error(
            "Fehler beim Laden der Starter:",
            startsError
        );


        starterListe.innerHTML = `

            <div class="error">

                Fehler beim Laden der Starter.

            </div>

        `;

        return;

    }


    if (
        !starts ||
        starts.length === 0
    ) {

        starterListe.innerHTML = `

            <div class="empty-state">

                <strong>
                    Noch keine Starter vorhanden.
                </strong>

                <span>
                    Füge oben den ersten Start hinzu.
                </span>

            </div>

        `;

        return;

    }


    // ======================================================
    // ERGEBNISSE FÜR ALLE STARTS LADEN
    // ======================================================

    const startIds =
        starts.map(
            function(start) {

                return start.id;

            }
        );


    let ergebnisse =
        [];


    if (startIds.length > 0) {

        const {
            data: resultData,
            error: resultError
        } =
            await wettkampfSupabaseClient

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


        if (resultError) {

            console.error(
                "Fehler beim Laden der Ergebnisse:",
                resultError
            );

        }
        else {

            ergebnisse =
                resultData || [];

        }

    }


    // ======================================================
    // ERGEBNISSE NACH START SORTIEREN
    // ======================================================

    const ergebnisseNachStart =
        {};


    ergebnisse.forEach(
        function(ergebnis) {

            if (
                !ergebnisseNachStart[
                    ergebnis.start_id
                ]
            ) {

                ergebnisseNachStart[
                    ergebnis.start_id
                ] = [];

            }


            ergebnisseNachStart[
                ergebnis.start_id
            ].push(
                ergebnis
            );

        }
    );


    // ======================================================
    // TABELLE
    // ======================================================

    let html = `

        <div class="table-container">

            <table>

                <thead>

                    <tr>

                        <th>
                            #
                        </th>

                        <th>
                            Teilnehmer
                        </th>

                        <th>
                            Team
                        </th>

                        <th>
                            AK
                        </th>

                        <th>
                            Ergebnisse
                        </th>

                    </tr>

                </thead>

                <tbody>

    `;


    starts.forEach(
        function(start, index) {

            const person =
                start.participants;


            const team =
                start.teams;


            const startErgebnisse =
                ergebnisseNachStart[
                    start.id
                ] || [];


            let ergebnisText =
                "Noch keine Ergebnisse";


            if (
                startErgebnisse.length > 0
            ) {

                ergebnisText =
                    startErgebnisse

                        .map(
                            function(ergebnis) {

                                return `
                                    ${ergebnis.nummer}.
                                    ${Number(
                                        ergebnis.wert
                                    ).toFixed(2).replace(".", ",")}
                                `;

                            }
                        )

                        .join(
                            " | "
                        );

            }


            html += `

                <tr>

                    <td>
                        ${index + 1}
                    </td>

                    <td>

                        <strong>

                            ${wettkampfHtmlSicher(
                                person?.vorname || ""
                            )}

                            ${wettkampfHtmlSicher(
                                person?.nachname || ""
                            )}

                        </strong>

                    </td>

                    <td>

                        ${
                            team
                                ? wettkampfHtmlSicher(
                                    team.name
                                  )
                                : "Einzelstart"
                        }

                    </td>

                    <td>

                        ${
                            start.ak
                                ? `<span class="ak-badge">AK</span>`
                                : "-"
                        }

                    </td>

                    <td>

                        ${ergebnisText}

                    </td>

                </tr>

            `;

        }
    );


    html += `

                </tbody>

            </table>

        </div>

    `;


    starterListe.innerHTML =
        html;

}


// ==========================================================
// EVENT LISTENER
// ==========================================================

if (teamForm) {

    teamForm.addEventListener(
        "submit",
        teamAnlegen
    );

}


if (teilnehmerSuche) {

    teilnehmerSuche.addEventListener(
        "input",
        function() {

            clearTimeout(
                suchTimeout
            );


            suchTimeout =
                setTimeout(
                    teilnehmerSuchen,
                    250
                );

        }
    );

}


if (starterHinzufuegen) {

    starterHinzufuegen.addEventListener(
        "click",
        starterHinzufuegenFunktion
    );

}


if (starterAbbrechen) {

    starterAbbrechen.addEventListener(
        "click",
        function() {

            starterAuswahlZuruecksetzen();

        }
    );

}


// ==========================================================
// START
// ==========================================================

async function wettkampfStart() {

    if (!wettkampfId) {

        console.error(
            "Keine Wettkampf-ID in der URL."
        );

        return;

    }


    await wettkampfLaden();

    await teamsLaden();

    await starterLaden();

}


// ==========================================================
// ANWENDUNG STARTEN
// ==========================================================

wettkampfStart();
