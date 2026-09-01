// ==========================================
// SSV 1928 Sulzbach e.V.
// wettkampf.js
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
// GLOBALE DATEN
// ==========================================

let aktuellerWettkampf = null;

let aktuelleTeams = [];

let ausgewaehlterTeilnehmer = null;


// ==========================================
// HILFSFUNKTION
// ==========================================

function element(id) {

    return document.getElementById(id);

}


// ==========================================
// INITIALISIERUNG
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        if (!wettkampfId) {

            alert(
                "Es wurde kein Wettkampf ausgewählt."
            );

            return;
        }


        const geladen =
            await wettkampfLaden();


        if (!geladen) {

            return;
        }


        await teamsLaden();

        await starterLaden();

        formularEventsEinrichten();

    }
);


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


    // ======================================
    // NAME
    // ======================================

    const nameElement =
        element(
            "wettkampf-name"
        );


    if (nameElement) {

        nameElement.textContent =
            data.name;

    }


    // ======================================
    // INFO
    // ======================================

    const infoElement =
        element(
            "wettkampf-info"
        );


    if (infoElement) {

        let datum =
            data.datum || "";


        if (data.datum) {

            const datumObjekt =
                new Date(
                    data.datum +
                    "T00:00:00"
                );


            datum =
                datumObjekt.toLocaleDateString(
                    "de-DE"
                );

        }


        infoElement.textContent =
            datum +
            " · " +
            data.anzahl_ergebnisse +
            " Ergebnisse · " +
            data.teamgroesse +
            " Wertungsstarter pro Team";

    }


    // ======================================
    // STATUS
    // ======================================

    const statusElement =
        element(
            "wettkampf-status"
        );


    if (statusElement) {

        statusElement.textContent =
            "Status: " +
            (data.status || "geplant");

    }


    return true;

}


// ==========================================
// FORMULAR-EVENTS
// ==========================================

function formularEventsEinrichten() {

    // ======================================
    // TEAM-FORMULAR
    // ======================================

    const teamForm =
        element(
            "team-form"
        );


    if (teamForm) {

        teamForm.addEventListener(
            "submit",
            teamAnlegen
        );

    }


    // ======================================
    // TEILNEHMER-SUCHE
    // ======================================

    const suche =
        element(
            "teilnehmer-suche"
        );


    if (suche) {

        suche.addEventListener(
            "input",
            teilnehmerSuchen
        );

    }


    // ======================================
    // START HINZUFÜGEN
    // ======================================

    const startButton =
        element(
            "starter-hinzufuegen"
        );


    if (startButton) {

        startButton.addEventListener(
            "click",
            starterHinzufuegen
        );

    }


    // ======================================
    // ABBRECHEN
    // ======================================

    const abbrechen =
        element(
            "starter-abbrechen"
        );


    if (abbrechen) {

        abbrechen.addEventListener(
            "click",
            starterAuswahlZuruecksetzen
        );

    }

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


        aktuelleTeams =
            [];


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
// TEAM ANLEGEN
// ==========================================

async function teamAnlegen(
    event
) {

    event.preventDefault();


    const input =
        element(
            "team-name"
        );


    const meldung =
        element(
            "team-meldung"
        );


    if (!input) {

        return;
    }


    const name =
        input.value.trim();


    if (!name) {

        if (meldung) {

            meldung.textContent =
                "Bitte einen Teamnamen eingeben.";

        }


        return;
    }


    const bereitsVorhanden =
        aktuelleTeams.some(
            function(team) {

                return (
                    team.name
                        .trim()
                        .toLowerCase() ===
                    name.toLowerCase()
                );

            }
        );


    if (bereitsVorhanden) {

        if (meldung) {

            meldung.textContent =
                "Dieses Team existiert bereits.";

        }


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


        if (meldung) {

            meldung.textContent =
                "Team konnte nicht angelegt werden.";

        }


        return;
    }


    input.value =
        "";


    if (meldung) {

        meldung.textContent =
            "Team wurde angelegt.";

    }


    await teamsLaden();

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
                alleStarts
                    .map(
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


    liste.innerHTML =
        "";


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


            const regulaereStarts =
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
                regulaereStarts.length +
                " / " +
                aktuellerWettkampf.teamgroesse +
                " Wertungsstarter";


            box.appendChild(
                status
            );


            // ==================================
            // REGULÄRE STARTER
            // ==================================

            if (
                regulaereStarts.length > 0
            ) {

                const ueberschrift =
                    document.createElement(
                        "strong"
                    );


                ueberschrift.textContent =
                    "Wertung";


                box.appendChild(
                    ueberschrift
                );


                const ul =
                    document.createElement(
                        "ul"
                    );


                regulaereStarts.forEach(
                    function(start) {

                        const person =
                            teilnehmer.find(
                                function(p) {

                                    return (
                                        Number(p.id) ===
                                        Number(
                                            start.participant_id
                                        )
                                    );

                                }
                            );


                        const li =
                            document.createElement(
                                "li"
                            );


                        li.textContent =
                            person
                                ? person.vorname +
                                  " " +
                                  person.nachname
                                : "Teilnehmer #" +
                                  start.participant_id;


                        ul.appendChild(
                            li
                        );

                    }
                );


                box.appendChild(
                    ul
                );

            }


            // ==================================
            // AK-STARTER
            // ==================================

            if (
                akStarts.length > 0
            ) {

                const ueberschrift =
                    document.createElement(
                        "strong"
                    );


                ueberschrift.textContent =
                    "Außer Konkurrenz (AK)";


                box.appendChild(
                    ueberschrift
                );


                const ul =
                    document.createElement(
                        "ul"
                    );


                akStarts.forEach(
                    function(start) {

                        const person =
                            teilnehmer.find(
                                function(p) {

                                    return (
                                        Number(p.id) ===
                                        Number(
                                            start.participant_id
                                        )
                                    );

                                }
                            );


                        const li =
                            document.createElement(
                                "li"
                            );


                        li.textContent =
                            person
                                ? person.vorname +
                                  " " +
                                  person.nachname
                                : "Teilnehmer #" +
                                  start.participant_id;


                        li.textContent +=
                            " · AK";


                        ul.appendChild(
                            li
                        );

                    }
                );


                box.appendChild(
                    ul
                );

            }


            // ==================================
            // TEAM LÖSCHEN
            // ==================================

            const loeschen =
                document.createElement(
                    "button"
                );


            loeschen.type =
                "button";


            loeschen.textContent =
                "Team löschen";


            loeschen.addEventListener(
                "click",
                function() {

                    teamLoeschen(
                        team.id,
                        team.name
                    );

                }
            );


            box.appendChild(
                loeschen
            );


            liste.appendChild(
                box
            );

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
    // TEAMZUORDNUNG ENTFERNEN
    // ======================================

    const {
        error: updateError
    } = await supabaseClient
        .from("starts")
        .update({
            team_id:
                null
        })
        .eq(
            "competition_id",
            wettkampfId
        )
        .eq(
            "team_id",
            teamId
        );


    if (updateError) {

        console.error(
            "Fehler beim Entfernen der Teamzuordnung:",
            updateError
        );


        alert(
            "Die Teamzuordnungen konnten nicht entfernt werden."
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
            "Das Team konnte nicht gelöscht werden."
        );


        return;
    }


    await teamsLaden();

    await starterLaden();

}


// ==========================================
// TEILNEHMER SUCHEN
// ==========================================

let suchTimer = null;


async function teilnehmerSuchen() {

    const input =
        element(
            "teilnehmer-suche"
        );


    const ergebnisBereich =
        element(
            "teilnehmer-suchergebnisse"
        );


    if (!input || !ergebnisBereich) {

        return;
    }


    const suchtext =
        input.value.trim();


    ergebnisBereich.innerHTML =
        "";


    ausgewaehlterTeilnehmer =
        null;


    const starterBereich =
        element(
            "starter-bereich"
        );


    if (starterBereich) {

        starterBereich.style.display =
            "none";

    }


    if (!suchtext) {

        return;
    }


    clearTimeout(
        suchTimer
    );


    suchTimer =
        setTimeout(
            async function() {

                await teilnehmerSucheAusfuehren(
                    suchtext
                );

            },
            150
        );

}


// ==========================================
// TEILNEHMER-SUCHE AUSFÜHREN
// ==========================================

async function teilnehmerSucheAusfuehren(
    suchtext
) {

    const ergebnisBereich =
        element(
            "teilnehmer-suchergebnisse"
        );


    if (!ergebnisBereich) {

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
        .order(
            "vorname",
            {
                ascending: true
            }
        )
        .limit(15);


    if (error) {

        console.error(
            "Fehler bei der Teilnehmer-Suche:",
            error
        );


        ergebnisBereich.innerHTML =
            "<p>Fehler bei der Suche.</p>";


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


    const suche =
        element(
            "teilnehmer-suche"
        );


    if (suche) {

        suche.value =
            teilnehmer.vorname +
            " " +
            teilnehmer.nachname;

    }


    const suchergebnisse =
        element(
            "teilnehmer-suchergebnisse"
        );


    if (suchergebnisse) {

        suchergebnisse.innerHTML =
            "";

    }


    const nameElement =
        element(
            "ausgewaehlter-teilnehmer"
        );


    if (nameElement) {

        nameElement.textContent =
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


    const team =
        element(
            "starter-team"
        );


    if (team) {

        team.value =
            "";

    }


    const ak =
        element(
            "starter-ak"
        );


    if (ak) {

        ak.checked =
            false;

    }

}


// ==========================================
// START HINZUFÜGEN
// ==========================================

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


    let teamId =
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
    // PRÜFEN:
    // GLEICHER TEILNEHMER KANN MEHRFACH
    // STARTEN
    // ======================================

    // Mehrfachstarts sind ausdrücklich erlaubt.
    // Deshalb gibt es hier KEINE Sperre.


    // ======================================
    // TEAM PRÜFEN
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
                "id",
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


            alert(
                "Die Teambelegung konnte nicht geprüft werden."
            );


            return;
        }


        const teamgroesse =
            Number(
                aktuellerWettkampf.teamgroesse
            );


        if (
            count >= teamgroesse
        ) {

            const team =
                aktuelleTeams.find(
                    function(t) {

                        return (
                            t.id ===
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
                    " von " +
                    teamgroesse +
                    " Wertungsstartern.\n\n" +
                    "Soll dieser Starter als AK (Außer Konkurrenz) hinzugefügt werden?"
                );


            if (!bestaetigung) {

                return;
            }


            ak =
                true;

        }

    }


    // ======================================
    // START SPEICHERN
    // ======================================

    const {
        data,
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
        ])
        .select(
            "id"
        )
        .single();


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
                "Start konnte nicht hinzugefügt werden.";

        }


        return;
    }


    console.log(
        "Start angelegt:",
        data
    );


    const meldung =
        element(
            "starter-meldung"
        );


    if (meldung) {

        meldung.textContent =
            "Start wurde hinzugefügt.";

    }


    starterAuswahlZuruecksetzen();


    await starterLaden();

    await teamAnzeigeLaden();

}


// ==========================================
// STARTER-AUSWAHL ZURÜCKSETZEN
// ==========================================

function starterAuswahlZuruecksetzen() {

    ausgewaehlterTeilnehmer =
        null;


    const suche =
        element(
            "teilnehmer-suche"
        );


    if (suche) {

        suche.value =
            "";

    }


    const ergebnisse =
        element(
            "teilnehmer-suchergebnisse"
        );


    if (ergebnisse) {

        ergebnisse.innerHTML =
            "";

    }


    const bereich =
        element(
            "starter-bereich"
        );


    if (bereich) {

        bereich.style.display =
            "none";

    }


    const meldung =
        element(
            "starter-meldung"
        );


    if (meldung) {

        meldung.textContent =
            "";

    }

}


// ==========================================
// STARTER LADEN
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
    // STARTS
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
    // TEILNEHMER
    // ======================================

    const teilnehmerIds =
        [
            ...new Set(
                alleStarts.map(
                    function(start) {

                        return start.participant_id;

                    }
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
    // TEAMS
    // ======================================

    const teamIds =
        [
            ...new Set(
                alleStarts
                    .map(
                        function(start) {

                            return start.team_id;

                        }
                    )
                    .filter(
                        function(id) {

                            return id !== null;

                        }
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
    // ERGEBNISSE
    // ======================================

    const startIds =
        alleStarts.map(
            function(start) {

                return start.id;

            }
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
    // DATEN ZUSAMMENFÜHREN
    // ======================================

    alleStarts.forEach(
        function(start) {

            start.participant =
                teilnehmer.find(
                    function(person) {

                        return (
                            Number(person.id) ===
                            Number(
                                start.participant_id
                            )
                        );

                    }
                ) || null;


            start.team =
                teams.find(
                    function(team) {

                        return (
                            team.id ===
                            start.team_id
                        );

                    }
                ) || null;


            start.results =
                ergebnisse.filter(
                    function(ergebnis) {

                        return (
                            ergebnis.start_id ===
                            start.id
                        );

                    }
                );

        }
    );


    // ======================================
    // ANZEIGE
    // ======================================

    liste.innerHTML =
        "";


    alleStarts.forEach(
        function(start, index) {

            starterAnzeigeErstellen(
                start,
                index,
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
    index,
    liste
) {

    const box =
        document.createElement(
            "div"
        );


    box.className =
        "wettkampf-eintrag";


    // ======================================
    // KOPF
    // ======================================

    const kopf =
        document.createElement(
            "div"
        );


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


    kopf.appendChild(
        name
    );


    const info =
        document.createElement(
            "p"
        );


    info.textContent =
        startZuordnungText(
            start
        );


    kopf.appendChild(
        info
    );


    box.appendChild(
        kopf
    );


    // ======================================
    // ERGEBNISSE
    // ======================================

    const ergebnisBereich =
        document.createElement(
            "div"
        );


    ergebnisBereich.className =
        "ergebnis-eingabe-container";


    const anzahlErgebnisse =
        Number(
            aktuellerWettkampf.anzahl_ergebnisse
        );


    for (
        let nummer = 1;
        nummer <= anzahlErgebnisse;
        nummer++
    ) {

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


        const vorhandenesErgebnis =
            (start.results || []).find(
                function(ergebnis) {

                    return (
                        Number(
                            ergebnis.nummer
                        ) ===
                        nummer
                    );

                }
            );


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


        ergebnisBereich.appendChild(
            zeile
        );

    }


    box.appendChild(
        ergebnisBereich
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
                ergebnisBereich,
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
                start,
                box
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
            "Team: " +
            start.team.name;

    }


    if (start.ak) {

        text +=
            " · AK";

    } else if (start.team) {

        text +=
            " · Wertung";

    }


    return text;

}


// ==========================================
// START BEARBEITEN
// ==========================================

function startBearbeiten(
    start,
    box
) {

    const alteBearbeitung =
        box.querySelector(
            ".start-bearbeiten-bereich"
        );


    if (alteBearbeitung) {

        alteBearbeitung.remove();

        return;
    }


    const bereich =
        document.createElement(
            "div"
        );


    bereich.className =
        "start-bearbeiten-bereich";


    const titel =
        document.createElement(
            "h4"
        );


    titel.textContent =
        "Startzuordnung ändern";


    bereich.appendChild(
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
        "Team";


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


    bereich.appendChild(
        teamLabel
    );


    bereich.appendChild(
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
        start.ak === true;


    akLabel.appendChild(
        akCheckbox
    );


    akLabel.appendChild(
        document.createTextNode(
            " Außer Konkurrenz (AK)"
        )
    );


    bereich.appendChild(
        akLabel
    );


    // ======================================
    // SPEICHERN
    // ======================================

    const speichern =
        document.createElement(
            "button"
        );


    speichern.type =
        "button";


    speichern.textContent =
        "Zuordnung speichern";


    speichern.addEventListener(
        "click",
        async function() {

            await startZuordnungSpeichern(
                start,
                teamSelect.value || null,
                akCheckbox.checked,
                bereich
            );

        }
    );


    bereich.appendChild(
        speichern
    );


    // ======================================
    // ABBRECHEN
    // ======================================

    const abbrechen =
        document.createElement(
            "button"
        );


    abbrechen.type =
        "button";


    abbrechen.textContent =
        "Abbrechen";


    abbrechen.addEventListener(
        "click",
        function() {

            bereich.remove();

        }
    );


    bereich.appendChild(
        abbrechen
    );


    box.appendChild(
        bereich
    );

}


// ==========================================
// STARTZUORDNUNG SPEICHERN
// ==========================================

async function startZuordnungSpeichern(
    start,
    neuesTeamId,
    neueAK,
    bereich
) {

    // ======================================
    // TEAMGRÖSSE PRÜFEN
    // ======================================

    if (
        neuesTeamId &&
        !neueAK
    ) {

        const {
            count,
            error
        } = await supabaseClient
            .from("starts")
            .select(
                "id",
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
                neuesTeamId
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


            alert(
                "Die Teambelegung konnte nicht geprüft werden."
            );


            return;
        }


        const teamgroesse =
            Number(
                aktuellerWettkampf.teamgroesse
            );


        if (
            count >= teamgroesse
        ) {

            const bestaetigung =
                confirm(
                    "Das Team hat bereits " +
                    count +
                    " Wertungsstarter.\n\n" +
                    "Soll dieser Start als AK geführt werden?"
                );


            if (!bestaetigung) {

                return;
            }


            neueAK =
                true;

        }

    }


    // ======================================
    // AK OHNE TEAM
    // ======================================

    // Ein AK-Start ohne Team ist technisch
    // möglich. Er bleibt dann Einzelstart.


    const {
        error
    } = await supabaseClient
        .from("starts")
        .update({
            team_id:
                neuesTeamId,

            ak:
                neueAK
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
            "Die Startzuordnung konnte nicht geändert werden."
        );


        return;
    }


    bereich.remove();


    await teamsLaden();

    await starterLaden();

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


    const neueErgebnisse =
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


        // ==================================
        // LEER = KEIN ERGEBNIS
        // ==================================

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


        neueErgebnisse.push({
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
    // ALTE ERGEBNISSE DIESES STARTS LÖSCHEN
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
            "Die bisherigen Ergebnisse konnten nicht ersetzt werden."
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
        neueErgebnisse.length > 0
    ) {

        const {
            error: insertError
        } = await supabaseClient
            .from("results")
            .insert(
                neueErgebnisse
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
        Number(
            text
        );


    if (
        !Number.isFinite(
            zahl
        )
    ) {

        return null;
    }


    return zahl;

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
            "Die zugehörigen Ergebnisse werden ebenfalls gelöscht."
        );


    if (!bestaetigung) {

        return;
    }


    // ======================================
    // START LÖSCHEN
    // ======================================
    //
    // results.start_id besitzt ON DELETE CASCADE.
    //
    // Deshalb werden die Ergebnisse automatisch
    // mitgelöscht.
    //
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
// ENDE
// ==========================================
