// ==========================================
// SSV 1928 Sulzbach e.V.
// WETTKAMPF.JS
// ==========================================


// ==========================================
// SUPABASE
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
// WETTKAMPF-ID AUS URL
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
// HILFSFUNKTION
// ==========================================

function element(id) {

    return document.getElementById(id);

}


// ==========================================
// WETTKAMPF LADEN
// ==========================================

async function wettkampfLaden() {

    if (!wettkampfId) {

        alert(
            "Kein Wettkampf ausgewählt."
        );

        return false;
    }


    const {
        data,
        error
    } = await supabaseClient
        .from("competitions")
        .select("*")
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

        alert(
            "Der Wettkampf konnte nicht geladen werden."
        );

        return false;
    }


    aktuellerWettkampf =
        data;


    const nameElement =
        element(
            "wettkampf-name"
        );


    if (nameElement) {

        nameElement.textContent =
            data.name;

    }


    const infoElement =
        element(
            "wettkampf-info"
        );


    if (infoElement) {

        let datumText =
            data.datum || "";


        if (data.datum) {

            const datum =
                new Date(
                    data.datum +
                    "T00:00:00"
                );


            datumText =
                datum.toLocaleDateString(
                    "de-DE"
                );

        }


        infoElement.textContent =
            datumText +
            " · " +
            data.anzahl_ergebnisse +
            " Ergebnisse · " +
            data.teamgroesse +
            " Starter pro Team";

    }


    const statusElement =
        element(
            "wettkampf-status"
        );


    if (statusElement) {

        statusElement.textContent =
            "Status: " +
            data.status;

    }


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
        .select(
            "id, competition_id, name, created_at"
        )
        .eq(
            "competition_id",
            wettkampfId
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

        return;

    }


    aktuelleTeams =
        data || [];


    teamsAuswahlAktualisieren();

    await teamAnzeigeLaden();

}


// ==========================================
// TEAM-AUSWAHL
// ==========================================

function teamsAuswahlAktualisieren() {

    const select =
        element(
            "starter-team"
        );


    if (!select) {

        return;

    }


    select.innerHTML =
        "";


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
        element(
            "teams-liste"
        );


    if (!liste) {

        return;

    }


    liste.innerHTML =
        "<p>Teams werden geladen ...</p>";


    if (
        aktuelleTeams.length === 0
    ) {

        liste.innerHTML =
            "<p>Noch keine Teams vorhanden.</p>";

        return;

    }


    const {
        data: starts,
        error
    } = await supabaseClient
        .from("starts")
        .select(
            "id, participant_id, team_id, ak, created_at"
        )
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
            "Fehler beim Laden der Teamstarts:",
            error
        );

        liste.innerHTML =
            "<p>Die Teamstarter konnten nicht geladen werden.</p>";

        return;

    }


    const alleStarts =
        starts || [];


    const teilnehmerIds =
        [
            ...new Set(
                alleStarts.map(
                    start =>
                        start.participant_id
                )
            )
        ];


    let teilnehmer =
        [];


    if (
        teilnehmerIds.length > 0
    ) {

        const {
            data,
            error
        } = await supabaseClient
            .from("participants")
            .select(
                "id, vorname, nachname"
            )
            .in(
                "id",
                teilnehmerIds
            );


        if (error) {

            console.error(
                "Fehler beim Laden der Teilnehmer:",
                error
            );

            return;

        }


        teilnehmer =
            data || [];

    }


    aktuelleTeams.forEach(
        function(team) {

            const teamStarts =
                alleStarts.filter(
                    start =>
                        start.team_id ===
                        team.id
                );


            const regulareStarts =
                teamStarts.filter(
                    start =>
                        start.ak === false
                );


            const akStarts =
                teamStarts.filter(
                    start =>
                        start.ak === true
                );


            const box =
                document.createElement(
                    "div"
                );


            box.className =
                "wettkampf-eintrag";


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

                const titelRegulaer =
                    document.createElement(
                        "strong"
                    );


                titelRegulaer.textContent =
                    "Reguläre Starter";


                box.appendChild(
                    titelRegulaer
                );


                const listeRegulaer =
                    document.createElement(
                        "ul"
                    );


                regulareStarts.forEach(
                    function(start) {

                        const person =
                            teilnehmer.find(
                                p =>
                                    Number(p.id) ===
                                    Number(
                                        start.participant_id
                                    )
                            );


                        const li =
                            document.createElement(
                                "li"
                            );


                        if (person) {

                            li.textContent =
                                person.vorname +
                                " " +
                                person.nachname;

                        } else {

                            li.textContent =
                                "Teilnehmer #" +
                                start.participant_id;

                        }


                        listeRegulaer.appendChild(
                            li
                        );

                    }
                );


                box.appendChild(
                    listeRegulaer
                );

            }


            // ==================================
            // AK-STARTER
            // ==================================

            if (
                akStarts.length > 0
            ) {

                const titelAK =
                    document.createElement(
                        "strong"
                    );


                titelAK.textContent =
                    "AK-Starter";


                box.appendChild(
                    titelAK
                );


                const listeAK =
                    document.createElement(
                        "ul"
                    );


                akStarts.forEach(
                    function(start) {

                        const person =
                            teilnehmer.find(
                                p =>
                                    Number(p.id) ===
                                    Number(
                                        start.participant_id
                                    )
                            );


                        const li =
                            document.createElement(
                                "li"
                            );


                        if (person) {

                            li.textContent =
                                person.vorname +
                                " " +
                                person.nachname +
                                " · AK";

                        } else {

                            li.textContent =
                                "Teilnehmer #" +
                                start.participant_id +
                                " · AK";

                        }


                        listeAK.appendChild(
                            li
                        );

                    }
                );


                box.appendChild(
                    listeAK
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
    element(
        "team-form"
    );


if (teamForm) {

    teamForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const nameInput =
                element(
                    "team-name"
                );


            if (!nameInput) {

                return;

            }


            const name =
                nameInput.value.trim();


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


                const meldung =
                    element(
                        "team-meldung"
                    );


                if (meldung) {

                    meldung.textContent =
                        "Fehler beim Anlegen des Teams.";

                }


                return;

            }


            const meldung =
                element(
                    "team-meldung"
                );


            if (meldung) {

                meldung.textContent =
                    "Team wurde angelegt.";

            }


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


    const {
        error: startError
    } = await supabaseClient
        .from("starts")
        .update({
            team_id:
                null
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
    element(
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
        element(
            "teilnehmer-suchergebnisse"
        );


    const starterBereich =
        element(
            "starter-bereich"
        );


    if (ergebnisBereich) {

        ergebnisBereich.innerHTML =
            "";

    }


    if (starterBereich) {

        starterBereich.style.display =
            "none";

    }


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

        if (ergebnisBereich) {

            ergebnisBereich.innerHTML =
                "<p>Kein Teilnehmer gefunden.</p>";

        }


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


            if (ergebnisBereich) {

                ergebnisBereich.appendChild(
                    button
                );

            }

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


    const ausgewaehlt =
        element(
            "ausgewaehlter-teilnehmer"
        );


    if (ausgewaehlt) {

        ausgewaehlt.textContent =
            teilnehmer.vorname +
            " " +
            teilnehmer.nachname;

    }


    const starterBereich =
        element(
            "starter-bereich"
        );


    if (starterBereich) {

        starterBereich.style.display =
            "block";

    }


    const ak =
        element(
            "starter-ak"
        );


    if (ak) {

        ak.checked =
            false;

    }


    const team =
        element(
            "starter-team"
        );


    if (team) {

        team.value =
            "";

    }

}


// ==========================================
// START HINZUFÜGEN
// ==========================================

const starterHinzufuegenButton =
    element(
        "starter-hinzufuegen"
    );


if (starterHinzufuegenButton) {

    starterHinzufuegenButton.addEventListener(
        "click",
        starterHinzufuegen
    );

}


async function starterHinzufuegen() {

    if (
        !ausgewaehlterTeilnehmer
    ) {

        alert(
            "Bitte zuerst einen Teilnehmer auswählen."
        );

        return;

    }


    const teamSelect =
        element(
            "starter-team"
        );


    const akCheckbox =
        element(
            "starter-ak"
        );


    const teamId =
        teamSelect
            ? (
                teamSelect.value ||
                null
            )
            : null;


    let ak =
        akCheckbox
            ? akCheckbox.checked
            : false;


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
                    t =>
                        t.id ===
                        teamId
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

                ak =
                    true;

            } else {

                return;

            }

        }

    }


    // ======================================
    // START SPEICHERN
    // ======================================

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


        const meldung =
            element(
                "starter-meldung"
            );


        if (meldung) {

            meldung.textContent =
                "Fehler beim Hinzufügen des Starts.";

        }


        return;

    }


    const meldung =
        element(
            "starter-meldung"
        );


    if (meldung) {

        meldung.textContent =
            "Start wurde hinzugefügt.";

    }


    if (teilnehmerSuche) {

        teilnehmerSuche.value =
            "";

    }


    const suchergebnisse =
        element(
            "teilnehmer-suchergebnisse"
        );


    if (suchergebnisse) {

        suchergebnisse.innerHTML =
            "";

    }


    const starterBereich =
        element(
            "starter-bereich"
        );


    if (starterBereich) {

        starterBereich.style.display =
            "none";

    }


    ausgewaehlterTeilnehmer =
        null;


    await starterLaden();

    await teamAnzeigeLaden();

}


// ==========================================
// STARTER LADEN
// WICHTIG:
// KEINE verschachtelte SUPABASE-RELATION
// ==========================================

async function starterLaden() {

    const liste =
        element(
            "starter-liste"
        );


    if (!liste) {

        return;

    }


    liste.innerHTML =
        "<p>Starter werden geladen ...</p>";


    // ======================================
    // 1. STARTS
    // ======================================

    const {
        data: starts,
        error: startsError
    } = await supabaseClient
        .from("starts")
        .select(
            "id, participant_id, team_id, ak, created_at"
        )
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
            "Fehler beim Laden der Starts:",
            startsError
        );


        liste.innerHTML =
            "<p>Die Starter konnten nicht geladen werden.</p>";


        return;

    }


    const alleStarts =
        starts || [];


    if (
        alleStarts.length === 0
    ) {

        liste.innerHTML =
            "<p>Noch keine Starter vorhanden.</p>";


        return;

    }


    // ======================================
    // 2. TEILNEHMER
    // ======================================

    const teilnehmerIds =
        [
            ...new Set(
                alleStarts.map(
                    start =>
                        start.participant_id
                )
            )
        ];


    let teilnehmer =
        [];


    if (
        teilnehmerIds.length > 0
    ) {

        const {
            data,
            error
        } = await supabaseClient
            .from("participants")
            .select(
                "id, vorname, nachname"
            )
            .in(
                "id",
                teilnehmerIds
            );


        if (error) {

            console.error(
                "Fehler beim Laden der Teilnehmer:",
                error
            );


            liste.innerHTML =
                "<p>Die Teilnehmer konnten nicht geladen werden.</p>";


            return;

        }


        teilnehmer =
            data || [];

    }


    // ======================================
    // 3. TEAMS
    // ======================================

    const teamIds =
        [
            ...new Set(
                alleStarts
                    .map(
                        start =>
                            start.team_id
                    )
                    .filter(
                        id =>
                            id !== null
                    )
            )
        ];


    let teams =
        [];


    if (
        teamIds.length > 0
    ) {

        const {
            data,
            error
        } = await supabaseClient
            .from("teams")
            .select(
                "id, name"
            )
            .in(
                "id",
                teamIds
            );


        if (error) {

            console.error(
                "Fehler beim Laden der Teams:",
                error
            );


            liste.innerHTML =
                "<p>Die Teams konnten nicht geladen werden.</p>";


            return;

        }


        teams =
            data || [];

    }


    // ======================================
    // 4. ERGEBNISSE
    // ======================================

    const startIds =
        alleStarts.map(
            start =>
                start.id
        );


    let ergebnisse =
        [];


    if (
        startIds.length > 0
    ) {

        const {
            data,
            error
        } = await supabaseClient
            .from("results")
            .select(
                "id, start_id, nummer, wert"
            )
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


            liste.innerHTML =
                "<p>Die Ergebnisse konnten nicht geladen werden.</p>";


            return;

        }


        ergebnisse =
            data || [];

    }


    // ======================================
    // 5. DATEN ZUSAMMENFÜHREN
    // ======================================

    alleStarts.forEach(
        function(start) {

            start.participant =
                teilnehmer.find(
                    person =>
                        Number(person.id) ===
                        Number(
                            start.participant_id
                        )
                ) || null;


            start.team =
                teams.find(
                    team =>
                        team.id ===
                        start.team_id
                ) || null;


            start.results =
                ergebnisse.filter(
                    ergebnis =>
                        ergebnis.start_id ===
                        start.id
                );

        }
    );


    // ======================================
    // 6. ANZEIGE
    // ======================================

    liste.innerHTML =
        "";


    alleStarts.forEach(
        function(start) {

            starterAnzeigeErstellen(
                start,
                liste
            );

        }
    );

}


// ==========================================
// STARTER ANZEIGEN
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


    if (start.participant) {

        name.textContent =
            start.participant.vorname +
            " " +
            start.participant.nachname;

    } else {

        name.textContent =
            "Teilnehmer #" +
            start.participant_id;

    }


    box.appendChild(
        name
    );


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


    box.appendChild(
        info
    );


    // ======================================
    // ERGEBNISSE
    // ======================================

    const ergebnisContainer =
        ergebnisContainerErstellen(
            start
        );


    box.appendChild(
        ergebnisContainer
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


    box.appendChild(
        speichernButton
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


    box.appendChild(
        bearbeitenButton
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

            let name =
                "diesem Teilnehmer";


            if (start.participant) {

                name =
                    start.participant.vorname +
                    " " +
                    start.participant.nachname;

            }


            startLoeschen(
                start.id,
                name
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


// ==========================================
// ZUORDNUNGSTEXT
// ==========================================

function startZuordnungText(
    start
) {

    let text =
        "Einzelstart";


    if (start.team) {

        text =
            start.team.name;

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


    const anzahl =
        Number(
            aktuellerWettkampf.anzahl_ergebnisse
        );


    for (
        let nummer = 1;
        nummer <= anzahl;
        nummer++
    ) {

        const vorhanden =
            vorhandeneErgebnisse.find(
                ergebnis =>
                    Number(
                        ergebnis.nummer
                    ) ===
                    nummer
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
            "z. B. 12,40";


        input.dataset.nummer =
            nummer;


        if (vorhanden) {

            input.value =
                String(
                    vorhanden.wert
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

    const vorhandeneBearbeitung =
        document.querySelector(
            ".wettkampf-bearbeiten"
        );


    if (
        vorhandeneBearbeitung
    ) {

        vorhandeneBearbeitung.remove();

    }


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


    let name =
        "Teilnehmer";


    if (start.participant) {

        name =
            start.participant.vorname +
            " " +
            start.participant.nachname;

    }


    titel.textContent =
        "Start bearbeiten: " +
        name;


    box.appendChild(
        titel
    );


    // ======================================
    // TEAM
    // ======================================

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


    box.appendChild(
        teamLabel
    );


    box.appendChild(
        teamSelect
    );


    // ======================================
    // AK
    // ======================================

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


    box.appendChild(
        akLabel
    );


    // ======================================
    // SPEICHERN
    // ======================================

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


            // ==============================
            // TEAMGRÖSSE PRÜFEN
            // ==============================

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


                    if (!bestaetigung) {

                        return;

                    }


                    neueAk =
                        true;

                }

            }


            // ==============================
            // START AKTUALISIEREN
            // ==============================

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


    box.appendChild(
        speichernButton
    );


    // ======================================
    // ABBRECHEN
    // ======================================

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
        abbrechenButton
    );


    const starterListe =
        element(
            "starter-liste"
        );


    if (starterListe) {

        starterListe.prepend(
            box
        );

    }

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


    if (
        text === ""
    ) {

        return null;

    }


    const zahl =
        parseFloat(
            text
        );


    return zahl;

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


        const rohwert =
            input.value.trim();


        if (
            rohwert === ""
        ) {

            continue;

        }


        const wert =
            zahlUmwandeln(
                rohwert
            );


        if (
            wert === null ||
            Number.isNaN(wert)
        ) {

            alert(
                "Ergebnis " +
                nummer +
                " ist keine gültige Zahl."
            );


            return;

        }


        ergebnisse.push({
            start_id:
                startId,

            nummer:
                nummer,

            wert:
                wert
        });

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
    // NEUE ERGEBNISSE
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


    // ======================================
    // ERGEBNISSE ZUERST LÖSCHEN
    // ======================================

    const {
        error: resultError
    } = await supabaseClient
        .from("results")
        .delete()
        .eq(
            "start_id",
            startId
        );


    if (resultError) {

        console.error(
            "Fehler beim Löschen der Ergebnisse:",
            resultError
        );


        alert(
            "Die Ergebnisse konnten nicht gelöscht werden."
        );


        return;

    }


    // ======================================
    // START LÖSCHEN
    // ======================================

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
            "Der Start konnte nicht gelöscht werden."
        );


        return;

    }


    await starterLaden();

    await teamAnzeigeLaden();

}


// ==========================================
// STARTER ABBRECHEN
// ==========================================

const starterAbbrechen =
    element(
        "starter-abbrechen"
    );


if (starterAbbrechen) {

    starterAbbrechen.addEventListener(
        "click",
        function() {

            if (teilnehmerSuche) {

                teilnehmerSuche.value =
                    "";

            }


            const suchergebnisse =
                element(
                    "teilnehmer-suchergebnisse"
                );


            if (suchergebnisse) {

                suchergebnisse.innerHTML =
                    "";

            }


            const starterBereich =
                element(
                    "starter-bereich"
                );


            if (starterBereich) {

                starterBereich.style.display =
                    "none";

            }


            ausgewaehlterTeilnehmer =
                null;

        }
    );

}


// ==========================================
// INITIALISIERUNG
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


// ==========================================
// LOS
// ==========================================

start();
