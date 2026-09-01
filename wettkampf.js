// ==========================================
// SUPABASE EINSTELLUNGEN
// ==========================================

const SUPABASE_URL =
    "https://pvvdbcvdhggqbembqrda.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ==========================================
// WETTKAMPF-ID
// ==========================================

const urlParameter =
    new URLSearchParams(
        window.location.search
    );

const wettkampfId =
    urlParameter.get("id");


// ==========================================
// GLOBALE VARIABLEN
// ==========================================

let aktuellerWettkampf = null;

let ausgewaehlterTeilnehmer = null;

let aktuelleTeams = [];


// ==========================================
// WETTKAMPF LADEN
// ==========================================

async function wettkampfLaden() {

    const {
        data,
        error
    } = await supabaseClient
        .from("competitions")
        .select("*")
        .eq("id", wettkampfId)
        .single();


    if (error) {

        console.error(
            "Fehler beim Laden des Wettkampfs:",
            error
        );

        alert(
            "Der Wettkampf konnte nicht geladen werden."
        );

        return false;
    }


    aktuellerWettkampf =
        data;


    document.getElementById(
        "wettkampf-name"
    ).textContent =
        data.name;


    const datum =
        new Date(
            data.datum + "T00:00:00"
        );


    document.getElementById(
        "wettkampf-info"
    ).textContent =
        datum.toLocaleDateString("de-DE") +
        " · " +
        data.anzahl_ergebnisse +
        " Ergebnisse · " +
        data.teamgroesse +
        " Starter pro Team";


    document.getElementById(
        "wettkampf-status"
    ).textContent =
        "Status: " +
        data.status;


    return true;
}


// ==========================================
// TEAMS LADEN
// ==========================================

async function teamsLaden() {

    const {
        data,
        error
    } = await supabaseClient
        .from("teams")
        .select("*")
        .eq("competition_id", wettkampfId)
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

        return;
    }


    aktuelleTeams =
        data || [];


    teamsAuswahlAktualisieren();

    await teamAnzeigeLaden();
}


// ==========================================
// TEAM-AUSWAHL AKTUALISIEREN
// ==========================================

function teamsAuswahlAktualisieren() {

    const select =
        document.getElementById(
            "starter-team"
        );


    if (!select) {

        return;
    }


    select.innerHTML = "";


    const einzelOption =
        document.createElement(
            "option"
        );


    einzelOption.value =
        "";


    einzelOption.textContent =
        "Einzelstart";


    select.appendChild(
        einzelOption
    );


    aktuelleTeams.forEach(
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

}


// ==========================================
// TEAM-ANZEIGE
// ==========================================

async function teamAnzeigeLaden() {

    const liste =
        document.getElementById(
            "teams-liste"
        );


    if (!liste) {

        return;
    }


    liste.innerHTML = "";


    if (
        aktuelleTeams.length === 0
    ) {

        liste.innerHTML =
            "<p>Noch keine Teams vorhanden.</p>";

        return;
    }


    // ======================================
    // ALLE STARTS DES WETTKAMPFS LADEN
    // ======================================

    const {
        data: starts,
        error
    } = await supabaseClient
        .from("starts")
        .select(`
            id,
            participant_id,
            team_id,
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
        .order(
            "created_at",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Fehler beim Laden der Teamstarter:",
            error
        );

        liste.innerHTML =
            "<p>Die Teamstarter konnten nicht geladen werden.</p>";

        return;
    }


    const alleStarts =
        starts || [];


    // ======================================
    // TEAMS AUFBAUEN
    // ======================================

    aktuelleTeams.forEach(
        function(team) {

            const teamStarts =
                alleStarts.filter(
                    function(start) {

                        return (
                            start.team_id ===
                            team.id
                        );

                    }
                );


            const regulareStarts =
                teamStarts.filter(
                    function(start) {

                        return (
                            start.ak === false
                        );

                    }
                );


            const akStarts =
                teamStarts.filter(
                    function(start) {

                        return (
                            start.ak === true
                        );

                    }
                );


            const box =
                document.createElement(
                    "div"
                );


            box.className =
                "wettkampf-eintrag";


            // ==================================
            // TEAMKOPF
            // ==================================

            const titel =
                document.createElement(
                    "h3"
                );


            titel.textContent =
                team.name;


            box.appendChild(
                titel
            );


            const status =
                document.createElement(
                    "p"
                );


            status.textContent =
                regulareStarts.length +
                " / " +
                aktuellerWettkampf.teamgroesse +
                " reguläre Starter";


            box.appendChild(
                status
            );


            // ==================================
            // REGULÄRE STARTER
            // ==================================

            if (
                regulareStarts.length > 0
            ) {

                const starterTitel =
                    document.createElement(
                        "strong"
                    );


                starterTitel.textContent =
                    "Reguläre Starter";


                box.appendChild(
                    starterTitel
                );


                const ul =
                    document.createElement(
                        "ul"
                    );


                regulareStarts.forEach(
                    function(start) {

                        const li =
                            document.createElement(
                                "li"
                            );


                        li.textContent =
                            start.participants.vorname +
                            " " +
                            start.participants.nachname;


                        ul.appendChild(
                            li
                        );

                    }
                );


                box.appendChild(
                    ul
                );

            } else {

                const leer =
                    document.createElement(
                        "p"
                    );


                leer.textContent =
                    "Noch keine regulären Starter.";


                box.appendChild(
                    leer
                );

            }


            // ==================================
            // AK-STARTER
            // ==================================

            if (
                akStarts.length > 0
            ) {

                const akTitel =
                    document.createElement(
                        "strong"
                    );


                akTitel.textContent =
                    "AK-Starter";


                box.appendChild(
                    akTitel
                );


                const akListe =
                    document.createElement(
                        "ul"
                    );


                akStarts.forEach(
                    function(start) {

                        const li =
                            document.createElement(
                                "li"
                            );


                        li.textContent =
                            start.participants.vorname +
                            " " +
                            start.participants.nachname +
                            " · AK";


                        akListe.appendChild(
                            li
                        );

                    }
                );


                box.appendChild(
                    akListe
                );

            }


            // ==================================
            // TEAM LÖSCHEN
            // ==================================

            const loeschenButton =
                document.createElement(
                    "button"
                );


            loeschenButton.type =
                "button";


            loeschenButton.textContent =
                "Team löschen";


            loeschenButton.addEventListener(
                "click",
                function() {

                    teamLoeschen(
                        team.id,
                        team.name
                    );

                }
            );


            box.appendChild(
                loeschenButton
            );


            liste.appendChild(
                box
            );

        }
    );

}


// ==========================================
// TEAM ANLEGEN
// ==========================================

const teamForm =
    document.getElementById(
        "team-form"
    );


if (teamForm) {

    teamForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const name =
                document
                    .getElementById(
                        "team-name"
                    )
                    .value
                    .trim();


            if (!name) {

                return;
            }


            const {
                error
            } = await supabaseClient
                .from("teams")
                .insert([
                    {
                        competition_id:
                            wettkampfId,

                        name:
                            name
                    }
                ]);


            if (error) {

                console.error(
                    "Fehler beim Anlegen des Teams:",
                    error
                );


                document.getElementById(
                    "team-meldung"
                ).textContent =
                    "Fehler beim Anlegen des Teams.";

                return;
            }


            document.getElementById(
                "team-meldung"
            ).textContent =
                "Team wurde angelegt.";


            teamForm.reset();


            await teamsLaden();

            await starterLaden();

        }
    );

}


// ==========================================
// TEAM LÖSCHEN
// ==========================================

async function teamLoeschen(
    teamId,
    teamName
) {

    const bestaetigung =
        confirm(
            'Team "' +
            teamName +
            '" wirklich löschen?\n\n' +
            "Die Starts bleiben erhalten und werden zu Einzelstarts."
        );


    if (!bestaetigung) {

        return;
    }


    // ======================================
    // STARTS VOM TEAM TRENNEN
    // ======================================

    const {
        error: startError
    } = await supabaseClient
        .from("starts")
        .update({
            team_id: null
        })
        .eq(
            "team_id",
            teamId
        );


    if (startError) {

        console.error(
            "Fehler beim Entfernen der Teamzuordnung:",
            startError
        );

        alert(
            "Die Teamzuordnungen konnten nicht geändert werden."
        );

        return;
    }


    // ======================================
    // TEAM LÖSCHEN
    // ======================================

    const {
        error
    } = await supabaseClient
        .from("teams")
        .delete()
        .eq(
            "id",
            teamId
        );


    if (error) {

        console.error(
            "Fehler beim Löschen des Teams:",
            error
        );

        alert(
            "Team konnte nicht gelöscht werden."
        );

        return;
    }


    await teamsLaden();

    await starterLaden();

}


// ==========================================
// TEILNEHMER SUCHEN
// ==========================================

const teilnehmerSuche =
    document.getElementById(
        "teilnehmer-suche"
    );


if (teilnehmerSuche) {

    teilnehmerSuche.addEventListener(
        "input",
        teilnehmerSuchen
    );

}


async function teilnehmerSuchen() {

    const suchtext =
        teilnehmerSuche.value.trim();


    const ergebnisBereich =
        document.getElementById(
            "teilnehmer-suchergebnisse"
        );


    ergebnisBereich.innerHTML =
        "";


    document.getElementById(
        "starter-bereich"
    ).style.display =
        "none";


    ausgewaehlterTeilnehmer =
        null;


    if (!suchtext) {

        return;
    }


    const {
        data,
        error
    } = await supabaseClient
        .from("participants")
        .select(
            "id, vorname, nachname"
        )
        .or(
            "vorname.ilike.%" +
            suchtext +
            "%,nachname.ilike.%" +
            suchtext +
            "%"
        )
        .order(
            "nachname",
            {
                ascending: true
            }
        )
        .limit(10);


    if (error) {

        console.error(
            "Fehler bei der Teilnehmer-Suche:",
            error
        );

        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        ergebnisBereich.innerHTML =
            "<p>Kein Teilnehmer gefunden.</p>";

        return;
    }


    data.forEach(
        function(teilnehmer) {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.textContent =
                teilnehmer.vorname +
                " " +
                teilnehmer.nachname;


            button.addEventListener(
                "click",
                function() {

                    teilnehmerAuswaehlen(
                        teilnehmer
                    );

                }
            );


            ergebnisBereich.appendChild(
                button
            );

        }
    );

}


// ==========================================
// TEILNEHMER AUSWÄHLEN
// ==========================================

function teilnehmerAuswaehlen(
    teilnehmer
) {

    ausgewaehlterTeilnehmer =
        teilnehmer;


    document.getElementById(
        "ausgewaehlter-teilnehmer"
    ).textContent =
        teilnehmer.vorname +
        " " +
        teilnehmer.nachname;


    document.getElementById(
        "starter-bereich"
    ).style.display =
        "block";


    document.getElementById(
        "starter-ak"
    ).checked =
        false;


    document.getElementById(
        "starter-team"
    ).value =
        "";

}


// ==========================================
// START HINZUFÜGEN
// ==========================================

document.getElementById(
    "starter-hinzufuegen"
).addEventListener(
    "click",
    starterHinzufuegen
);


async function starterHinzufuegen() {

    if (!ausgewaehlterTeilnehmer) {

        return;
    }


    const teamId =
        document.getElementById(
            "starter-team"
        ).value || null;


    let ak =
        document.getElementById(
            "starter-ak"
        ).checked;


    // ======================================
    // TEAMGRÖSSE PRÜFEN
    // ======================================

    if (
        teamId &&
        !ak
    ) {

        const {
            count,
            error
        } = await supabaseClient
            .from("starts")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "competition_id",
                wettkampfId
            )
            .eq(
                "team_id",
                teamId
            )
            .eq(
                "ak",
                false
            );


        if (error) {

            console.error(
                "Fehler bei der Teamprüfung:",
                error
            );

            return;
        }


        if (
            count >=
            aktuellerWettkampf.teamgroesse
        ) {

            const team =
                aktuelleTeams.find(
                    function(item) {

                        return (
                            item.id ===
                            teamId
                        );

                    }
                );


            const teamName =
                team
                    ? team.name
                    : "Dieses Team";


            const bestaetigung =
                confirm(
                    teamName +
                    " hat bereits " +
                    count +
                    " reguläre Starter.\n\n" +
                    "Soll der neue Start als AK aufgenommen werden?"
                );


            if (bestaetigung) {

                ak = true;

            } else {

                return;
            }

        }

    }


    const {
        error
    } = await supabaseClient
        .from("starts")
        .insert([
            {
                competition_id:
                    wettkampfId,

                participant_id:
                    ausgewaehlterTeilnehmer.id,

                team_id:
                    teamId,

                ak:
                    ak
            }
        ]);


    if (error) {

        console.error(
            "Fehler beim Hinzufügen des Starts:",
            error
        );


        document.getElementById(
            "starter-meldung"
        ).textContent =
            "Fehler beim Hinzufügen des Starts.";

        return;
    }


    document.getElementById(
        "starter-meldung"
    ).textContent =
        "Start wurde hinzugefügt.";


    document.getElementById(
        "teilnehmer-suche"
    ).value =
        "";


    document.getElementById(
        "teilnehmer-suchergebnisse"
    ).innerHTML =
        "";


    document.getElementById(
        "starter-bereich"
    ).style.display =
        "none";


    ausgewaehlterTeilnehmer =
        null;


    await starterLaden();

    await teamAnzeigeLaden();

}


// ==========================================
// STARTER LADEN
// ==========================================

async function starterLaden() {

    const {
        data,
        error
    } = await supabaseClient
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
            ),
            results (
                id,
                nummer,
                wert
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


    if (error) {

        console.error(
            "Fehler beim Laden der Starter:",
            error
        );

        return;
    }


    const liste =
        document.getElementById(
            "starter-liste"
        );


    liste.innerHTML =
        "";


    if (
        !data ||
        data.length === 0
    ) {

        liste.innerHTML =
            "<p>Noch keine Starter vorhanden.</p>";

        return;
    }


    data.forEach(
        function(start) {

            starterAnzeigeErstellen(
                start,
                liste
            );

        }
    );

}


// ==========================================
// STARTER-ANZEIGE
// ==========================================

function starterAnzeigeErstellen(
    start,
    liste
) {

    const box =
        document.createElement(
            "div"
        );


    box.className =
        "wettkampf-eintrag";


    // ======================================
    // NAME
    // ======================================

    const name =
        document.createElement(
            "h3"
        );


    name.textContent =
        start.participants.vorname +
        " " +
        start.participants.nachname;


    // ======================================
    // ZUORDNUNG
    // ======================================

    const info =
        document.createElement(
            "p"
        );


    info.textContent =
        startZuordnungText(
            start
        );


    // ======================================
    // ERGEBNISSE
    // ======================================

    const ergebnisContainer =
        ergebnisContainerErstellen(
            start
        );


    // ======================================
    // ERGEBNISSE SPEICHERN
    // ======================================

    const speichernButton =
        document.createElement(
            "button"
        );


    speichernButton.type =
        "button";


    speichernButton.textContent =
        "Ergebnisse speichern";


    speichernButton.addEventListener(
        "click",
        function() {

            ergebnisseSpeichern(
                start.id,
                ergebnisContainer,
                speichernButton
            );

        }
    );


    // ======================================
    // START BEARBEITEN
    // ======================================

    const bearbeitenButton =
        document.createElement(
            "button"
        );


    bearbeitenButton.type =
        "button";


    bearbeitenButton.textContent =
        "Start bearbeiten";


    bearbeitenButton.addEventListener(
        "click",
        function() {

            startBearbeiten(
                start
            );

        }
    );


    // ======================================
    // START LÖSCHEN
    // ======================================

    const loeschenButton =
        document.createElement(
            "button"
        );


    loeschenButton.type =
        "button";


    loeschenButton.textContent =
        "Start löschen";


    loeschenButton.addEventListener(
        "click",
        function() {

            startLoeschen(
                start.id,
                start.participants.vorname +
                " " +
                start.participants.nachname
            );

        }
    );


    box.appendChild(
        name
    );


    box.appendChild(
        info
    );


    box.appendChild(
        ergebnisContainer
    );


    box.appendChild(
        speichernButton
    );


    box.appendChild(
        bearbeitenButton
    );


    box.appendChild(
        loeschenButton
    );


    liste.appendChild(
        box
    );

}


// ==========================================
// ZUORDNUNGSTEXT
// ==========================================

function startZuordnungText(
    start
) {

    let text =
        "Einzelstart";


    if (start.team_id) {

        if (start.teams) {

            text =
                start.teams.name;

        } else {

            text =
                "Team";

        }

    }


    if (start.ak) {

        text +=
            " · AK";

    }


    return text;

}


// ==========================================
// ERGEBNIS-CONTAINER
// ==========================================

function ergebnisContainerErstellen(
    start
) {

    const container =
        document.createElement(
            "div"
        );


    container.className =
        "ergebnis-eingabe-container";


    const vorhandeneErgebnisse =
        start.results || [];


    for (
        let nummer = 1;
        nummer <= aktuellerWettkampf.anzahl_ergebnisse;
        nummer++
    ) {

        const vorhandenesErgebnis =
            vorhandeneErgebnisse.find(
                function(ergebnis) {

                    return (
                        Number(
                            ergebnis.nummer
                        ) === nummer
                    );

                }
            );


        const zeile =
            document.createElement(
                "div"
            );


        zeile.className =
            "ergebnis-zeile";


        const label =
            document.createElement(
                "label"
            );


        label.textContent =
            "Ergebnis " +
            nummer;


        const input =
            document.createElement(
                "input"
            );


        input.type =
            "text";


        input.inputMode =
            "decimal";


        input.placeholder =
            "z. B. 12,5";


        input.dataset.nummer =
            nummer;


        if (
            vorhandenesErgebnis
        ) {

            input.value =
                String(
                    vorhandenesErgebnis.wert
                ).replace(
                    ".",
                    ","
                );

        }


        zeile.appendChild(
            label
        );


        zeile.appendChild(
            input
        );


        container.appendChild(
            zeile
        );

    }


    return container;

}


// ==========================================
// START BEARBEITEN
// ==========================================

async function startBearbeiten(
    start
) {

    const box =
        document.createElement(
            "div"
        );


    box.className =
        "wettkampf-bearbeiten";


    const titel =
        document.createElement(
            "h3"
        );


    titel.textContent =
        "Start bearbeiten: " +
        start.participants.vorname +
        " " +
        start.participants.nachname;


    const teamLabel =
        document.createElement(
            "label"
        );


    teamLabel.textContent =
        "Zuordnung";


    const teamSelect =
        document.createElement(
            "select"
        );


    const einzelOption =
        document.createElement(
            "option"
        );


    einzelOption.value =
        "";


    einzelOption.textContent =
        "Einzelstart";


    teamSelect.appendChild(
        einzelOption
    );


    aktuelleTeams.forEach(
        function(team) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                team.id;


            option.textContent =
                team.name;


            if (
                team.id ===
                start.team_id
            ) {

                option.selected =
                    true;

            }


            teamSelect.appendChild(
                option
            );

        }
    );


    const akLabel =
        document.createElement(
            "label"
        );


    const akCheckbox =
        document.createElement(
            "input"
        );


    akCheckbox.type =
        "checkbox";


    akCheckbox.checked =
        start.ak;


    akLabel.appendChild(
        akCheckbox
    );


    akLabel.appendChild(
        document.createTextNode(
            " Außer Konkurrenz (AK)"
        )
    );


    const speichernButton =
        document.createElement(
            "button"
        );


    speichernButton.type =
        "button";


    speichernButton.textContent =
        "Änderung speichern";


    speichernButton.addEventListener(
        "click",
        async function() {

            let neueTeamId =
                teamSelect.value ||
                null;


            let neueAk =
                akCheckbox.checked;


            if (
                neueTeamId &&
                !neueAk
            ) {

                const {
                    count,
                    error
                } = await supabaseClient
                    .from("starts")
                    .select(
                        "*",
                        {
                            count: "exact",
                            head: true
                        }
                    )
                    .eq(
                        "competition_id",
                        wettkampfId
                    )
                    .eq(
                        "team_id",
                        neueTeamId
                    )
                    .eq(
                        "ak",
                        false
                    )
                    .neq(
                        "id",
                        start.id
                    );


                if (error) {

                    console.error(
                        "Fehler bei der Teamprüfung:",
                        error
                    );

                    return;
                }


                if (
                    count >=
                    aktuellerWettkampf.teamgroesse
                ) {

                    const bestaetigung =
                        confirm(
                            "Das Team hat bereits " +
                            count +
                            " reguläre Starter.\n\n" +
                            "Soll dieser Start stattdessen als AK geführt werden?"
                        );


                    if (
                        !bestaetigung
                    ) {

                        return;
                    }


                    neueAk =
                        true;

                }

            }


            const {
                error
            } = await supabaseClient
                .from("starts")
                .update({
                    team_id:
                        neueTeamId,

                    ak:
                        neueAk
                })
                .eq(
                    "id",
                    start.id
                );


            if (error) {

                console.error(
                    "Fehler beim Ändern des Starts:",
                    error
                );

                alert(
                    "Der Start konnte nicht geändert werden."
                );

                return;
            }


            box.remove();


            await starterLaden();

            await teamAnzeigeLaden();

        }
    );


    const abbrechenButton =
        document.createElement(
            "button"
        );


    abbrechenButton.type =
        "button";


    abbrechenButton.textContent =
        "Abbrechen";


    abbrechenButton.addEventListener(
        "click",
        function() {

            box.remove();

        }
    );


    box.appendChild(
        titel
    );


    box.appendChild(
        teamLabel
    );


    box.appendChild(
        teamSelect
    );


    box.appendChild(
        akLabel
    );


    box.appendChild(
        speichernButton
    );


    box.appendChild(
        abbrechenButton
    );


    document.getElementById(
        "starter-liste"
    ).prepend(
        box
    );

}


// ==========================================
// ZAHL UMWANDELN
// ==========================================

function zahlUmwandeln(
    wert
) {

    const text =
        String(wert)
            .trim()
            .replace(
                ",",
                "."
            );


    if (text === "") {

        return null;
    }


    return parseFloat(
        text
    );

}


// ==========================================
// ERGEBNISSE SPEICHERN
// ==========================================

async function ergebnisseSpeichern(
    startId,
    container,
    button
) {

    const inputs =
        container.querySelectorAll(
            "input"
        );


    const ergebnisse =
        [];


    for (
        const input of inputs
    ) {

        const nummer =
            Number(
                input.dataset.nummer
            );


        const wert =
            zahlUmwandeln(
                input.value
            );


        if (
            input.value.trim() !== "" &&
            Number.isNaN(wert)
        ) {

            alert(
                "Ergebnis " +
                nummer +
                " ist keine gültige Zahl."
            );

            return;
        }


        if (
            input.value.trim() !== ""
        ) {

            ergebnisse.push({
                start_id:
                    startId,

                nummer:
                    nummer,

                wert:
                    wert
            });

        }

    }


    button.disabled =
        true;


    button.textContent =
        "Speichert ...";


    // ======================================
    // ALTE ERGEBNISSE LÖSCHEN
    // ======================================

    const {
        error: deleteError
    } = await supabaseClient
        .from("results")
        .delete()
        .eq(
            "start_id",
            startId
        );


    if (deleteError) {

        console.error(
            "Fehler beim Löschen der alten Ergebnisse:",
            deleteError
        );


        alert(
            "Die alten Ergebnisse konnten nicht aktualisiert werden."
        );


        button.disabled =
            false;


        button.textContent =
            "Ergebnisse speichern";

        return;
    }


    // ======================================
    // NEUE ERGEBNISSE SPEICHERN
    // ======================================

    if (
        ergebnisse.length > 0
    ) {

        const {
            error: insertError
        } = await supabaseClient
            .from("results")
            .insert(
                ergebnisse
            );


        if (insertError) {

            console.error(
                "Fehler beim Speichern der Ergebnisse:",
                insertError
            );


            alert(
                "Die Ergebnisse konnten nicht gespeichert werden."
            );


            button.disabled =
                false;


            button.textContent =
                "Ergebnisse speichern";

            return;
        }

    }


    button.disabled =
        false;


    button.textContent =
        "Gespeichert ✓";


    setTimeout(
        function() {

            button.textContent =
                "Ergebnisse speichern";

        },
        1500
    );

}


// ==========================================
// START LÖSCHEN
// ==========================================

async function startLoeschen(
    startId,
    name
) {

    const bestaetigung =
        confirm(
            "Start von " +
            name +
            " wirklich löschen?\n\n" +
            "Alle Ergebnisse dieses Starts werden ebenfalls gelöscht."
        );


    if (!bestaetigung) {

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


        alert(
            "Start konnte nicht gelöscht werden."
        );

        return;
    }


    await starterLaden();

    await teamAnzeigeLaden();

}


// ==========================================
// STARTER-AUSWAHL ABBRECHEN
// ==========================================

const starterAbbrechen =
    document.getElementById(
        "starter-abbrechen"
    );


if (starterAbbrechen) {

    starterAbbrechen.addEventListener(
        "click",
        function() {

            document.getElementById(
                "teilnehmer-suche"
            ).value = "";


            document.getElementById(
                "teilnehmer-suchergebnisse"
            ).innerHTML =
                "";


            document.getElementById(
                "starter-bereich"
            ).style.display =
                "none";


            ausgewaehlterTeilnehmer =
                null;

        }
    );

}


// ==========================================
// START
// ==========================================

async function start() {

    if (!wettkampfId) {

        alert(
            "Kein Wettkampf ausgewählt."
        );

        return;
    }


    const erfolgreich =
        await wettkampfLaden();


    if (!erfolgreich) {

        return;
    }


    await teamsLaden();

    await starterLaden();

}


start();
