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


    document.getElementById(
        "wettkampf-name"
    ).textContent =
        data.name;


    const datum =
        new Date(
            data.datum +
            "T00:00:00"
        );


    document.getElementById(
        "wettkampf-info"
    ).textContent =
        datum.toLocaleDateString(
            "de-DE"
        ) +
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


    const liste =
        document.getElementById(
            "teams-liste"
        );


    liste.innerHTML = "";


    if (
        !data ||
        data.length === 0
    ) {

        liste.innerHTML =
            "<p>Noch keine Teams vorhanden.</p>";

        teamsAuswahlAktualisieren();

        return;
    }


    data.forEach(
        function(team) {

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


            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.textContent =
                "Team löschen";


            button.addEventListener(
                "click",
                function() {

                    teamLoeschen(
                        team.id,
                        team.name
                    );

                }
            );


            box.appendChild(
                titel
            );


            box.appendChild(
                button
            );


            liste.appendChild(
                box
            );

        }
    );


    teamsAuswahlAktualisieren();

}



// ==========================================
// TEAM AUSWAHL AKTUALISIEREN
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
            '" wirklich löschen?'
        );


    if (!bestaetigung) {

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
        teilnehmerSuche.value
            .trim();


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


    const ak =
        document.getElementById(
            "starter-ak"
        ).checked;


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
            participants (
                vorname,
                nachname
            ),
            teams (
                name
            ),
            start_results (
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

            const box =
                document.createElement(
                    "div"
                );


            box.className =
                "wettkampf-eintrag";


            const name =
                document.createElement(
                    "h3"
                );


            name.textContent =
                start.participants.vorname +
                " " +
                start.participants.nachname;


            const info =
                document.createElement(
                    "p"
                );


            let zuordnung =
                "Einzelstart";


            if (start.team_id) {

                zuordnung =
                    start.teams
                        ? start.teams.name
                        : "Team";

            }


            if (start.ak) {

                zuordnung +=
                    " · AK";

            }


            info.textContent =
                zuordnung;


            // ==================================
            // ERGEBNISFORMULAR
            // ==================================

            const ergebnisContainer =
                document.createElement(
                    "div"
                );


            ergebnisContainer.className =
                "ergebnis-eingabe-container";


            const vorhandeneErgebnisse =
                start.start_results || [];


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
                        )
                        .replace(
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


                ergebnisContainer.appendChild(
                    zeile
                );

            }


            // ==================================
            // ERGEBNISSE SPEICHERN BUTTON
            // ==================================

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


            // ==================================
            // START LÖSCHEN BUTTON
            // ==================================

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
                loeschenButton
            );


            liste.appendChild(
                box
            );

        }
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



    // ==================================
    // VORHANDENE ERGEBNISSE LÖSCHEN
    // ==================================

    const {
        error: deleteError
    } = await supabaseClient

        .from("start_results")

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



    // ==================================
    // NEUE ERGEBNISSE SPEICHERN
    // ==================================

    if (
        ergebnisse.length > 0
    ) {

        const {
            error: insertError
        } = await supabaseClient

            .from("start_results")

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
