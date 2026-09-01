// ==========================================================
// SSV 1928 SULZBACH E.V.
// WETTKÄMPFE VERWALTEN
// ==========================================================


// ==========================================================
// GLOBALE VARIABLEN
// ==========================================================

let aktuellerWettkampfId = null;


// ==========================================================
// ELEMENTE
// ==========================================================

const form =
    document.getElementById(
        "wettkampf-form"
    );


const meldung =
    document.getElementById(
        "wettkampf-meldung"
    );


const liste =
    document.getElementById(
        "wettkaempfe-liste"
    );


// ==========================================================
// MELDUNG
// ==========================================================

function meldungAnzeigen(
    text,
    typ = ""
) {

    if (!meldung) {

        return;

    }


    meldung.textContent =
        text;


    meldung.className =
        "meldung " +
        typ;

}


// ==========================================================
// WETTKÄMPFE LADEN
// ==========================================================

async function wettkaempfeLaden() {

    if (!liste) {

        return;

    }


    liste.innerHTML = `
        <p>
            Wettkämpfe werden geladen ...
        </p>
    `;


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
            status,
            created_at
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


        liste.innerHTML = `
            <p class="status-fehler">
                ❌ Wettkämpfe konnten nicht geladen werden.
            </p>
        `;


        return;

    }


    if (
        !data ||
        data.length === 0
    ) {

        liste.innerHTML = `
            <p>
                Noch keine Wettkämpfe vorhanden.
            </p>
        `;


        return;

    }


    liste.innerHTML =
        "";


    data.forEach(
        function(wettkampf) {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "listen-element";


            element.innerHTML = `

                <div class="listen-element-info">

                    <h3>
                        ${
                            escapeHtml(
                                wettkampf.name
                            )
                        }
                    </h3>


                    <p>

                        <strong>
                            Datum:
                        </strong>

                        ${
                            formatDatum(
                                wettkampf.datum
                            )
                        }

                    </p>


                    <p>

                        <strong>
                            Ergebnisse:
                        </strong>

                        ${
                            wettkampf.anzahl_ergebnisse
                        }

                        &nbsp; | &nbsp;

                        <strong>
                            Teamgröße:
                        </strong>

                        ${
                            wettkampf.teamgroesse
                        }

                    </p>


                    <p>

                        <strong>
                            Status:
                        </strong>

                        ${
                            escapeHtml(
                                wettkampf.status
                            )
                        }

                    </p>

                </div>


                <div class="listen-element-aktionen">

                    <button
                        type="button"
                        class="button"
                        data-oeffnen="${wettkampf.id}"
                    >
                        Öffnen
                    </button>


                    <button
                        type="button"
                        class="button button-secondary"
                        data-bearbeiten="${wettkampf.id}"
                    >
                        Bearbeiten
                    </button>


                    <button
                        type="button"
                        class="button button-danger"
                        data-loeschen="${wettkampf.id}"
                    >
                        Löschen
                    </button>

                </div>

            `;


            liste.appendChild(
                element
            );

        }
    );


    // ------------------------------------------------------
    // BUTTONS
    // ------------------------------------------------------

    liste
        .querySelectorAll(
            "[data-oeffnen]"
        )
        .forEach(
            function(button) {

                button.addEventListener(
                    "click",
                    function() {

                        const id =
                            button.dataset.oeffnen;


                        window.location.href =
                            "wettkampf.html?id=" +
                            encodeURIComponent(
                                id
                            );

                    }
                );

            }
        );


    liste
        .querySelectorAll(
            "[data-bearbeiten]"
        )
        .forEach(
            function(button) {

                button.addEventListener(
                    "click",
                    function() {

                        const id =
                            button.dataset.bearbeiten;


                        wettkampfBearbeiten(
                            id
                        );

                    }
                );

            }
        );


    liste
        .querySelectorAll(
            "[data-loeschen]"
        )
        .forEach(
            function(button) {

                button.addEventListener(
                    "click",
                    function() {

                        const id =
                            button.dataset.loeschen;


                        wettkampfLoeschen(
                            id
                        );

                    }
                );

            }
        );

}


// ==========================================================
// WETTKAMPF ANLEGEN
// ==========================================================

async function wettkampfAnlegen(
    event
) {

    event.preventDefault();


    const name =
        document.getElementById(
            "wettkampf-name"
        ).value.trim();


    const datum =
        document.getElementById(
            "wettkampf-datum"
        ).value;


    const anzahlErgebnisse =
        Number(
            document.getElementById(
                "anzahl-ergebnisse"
            ).value
        );


    const teamgroesse =
        Number(
            document.getElementById(
                "teamgroesse"
            ).value
        );


    const status =
        document.getElementById(
            "wettkampf-status"
        ).value;


    if (!name) {

        meldungAnzeigen(
            "Bitte einen Wettkampfnamen eingeben.",
            "status-fehler"
        );


        return;

    }


    if (!datum) {

        meldungAnzeigen(
            "Bitte ein Datum auswählen.",
            "status-fehler"
        );


        return;

    }


    if (
        !Number.isInteger(
            anzahlErgebnisse
        ) ||
        anzahlErgebnisse < 1
    ) {

        meldungAnzeigen(
            "Die Anzahl der Ergebnisse muss mindestens 1 sein.",
            "status-fehler"
        );


        return;

    }


    if (
        !Number.isInteger(
            teamgroesse
        ) ||
        teamgroesse < 1
    ) {

        meldungAnzeigen(
            "Die Teamgröße muss mindestens 1 sein.",
            "status-fehler"
        );


        return;

    }


    meldungAnzeigen(
        "Wettkampf wird angelegt ..."
    );


    const {
        data,
        error
    } = await supabaseClient

        .from("competitions")

        .insert({

            name:
                name,

            datum:
                datum,

            anzahl_ergebnisse:
                anzahlErgebnisse,

            teamgroesse:
                teamgroesse,

            status:
                status

        })

        .select()
        .single();


    if (error) {

        console.error(
            "Fehler beim Anlegen:",
            error
        );


        meldungAnzeigen(
            "❌ Wettkampf konnte nicht angelegt werden.",
            "status-fehler"
        );


        return;

    }


    meldungAnzeigen(
        "✅ Wettkampf wurde angelegt.",
        "status-ok"
    );


    form.reset();


    document.getElementById(
        "anzahl-ergebnisse"
    ).value = 3;


    document.getElementById(
        "teamgroesse"
    ).value = 3;


    document.getElementById(
        "wettkampf-status"
    ).value =
        "geplant";


    await wettkaempfeLaden();

}


// ==========================================================
// WETTKAMPF BEARBEITEN
// ==========================================================

async function wettkampfBearbeiten(
    id
) {

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
            "Fehler beim Laden:",
            error
        );


        alert(
            "Wettkampf konnte nicht geladen werden."
        );


        return;

    }


    const name =
        prompt(
            "Wettkampfname:",
            data.name
        );


    if (
        name === null
    ) {

        return;

    }


    const datum =
        prompt(
            "Datum (JJJJ-MM-TT):",
            data.datum
        );


    if (
        datum === null
    ) {

        return;

    }


    const anzahl =
        prompt(
            "Anzahl Ergebnisse pro Start:",
            data.anzahl_ergebnisse
        );


    if (
        anzahl === null
    ) {

        return;

    }


    const teamgroesse =
        prompt(
            "Teamgröße:",
            data.teamgroesse
        );


    if (
        teamgroesse === null
    ) {

        return;

    }


    const status =
        prompt(
            "Status (geplant / laufend / beendet):",
            data.status
        );


    if (
        status === null
    ) {

        return;

    }


    const neueAnzahl =
        Number(
            anzahl
        );


    const neueTeamgroesse =
        Number(
            teamgroesse
        );


    if (
        !name.trim() ||
        !datum ||
        !Number.isInteger(
            neueAnzahl
        ) ||
        neueAnzahl < 1 ||
        !Number.isInteger(
            neueTeamgroesse
        ) ||
        neueTeamgroesse < 1
    ) {

        alert(
            "Ungültige Eingaben."
        );


        return;

    }


    const {
        error: updateError
    } = await supabaseClient

        .from("competitions")

        .update({

            name:
                name.trim(),

            datum:
                datum,

            anzahl_ergebnisse:
                neueAnzahl,

            teamgroesse:
                neueTeamgroesse,

            status:
                status.trim()

        })

        .eq(
            "id",
            id
        );


    if (updateError) {

        console.error(
            "Fehler beim Bearbeiten:",
            updateError
        );


        alert(
            "Wettkampf konnte nicht geändert werden."
        );


        return;

    }


    await wettkaempfeLaden();

}


// ==========================================================
// WETTKAMPF LÖSCHEN
// ==========================================================

async function wettkampfLoeschen(
    id
) {

    const bestaetigt =
        confirm(
            "Soll dieser Wettkampf wirklich gelöscht werden?\n\nDabei können auch zugehörige Starts und Ergebnisse betroffen sein."
        );


    if (!bestaetigt) {

        return;

    }


    // ------------------------------------------------------
    // ZUERST ERGEBNISSE DER STARTS LÖSCHEN
    // ------------------------------------------------------

    const {
        data: starts,
        error: startsError
    } = await supabaseClient

        .from("starts")

        .select(
            "id"
        )

        .eq(
            "competition_id",
            id
        );


    if (startsError) {

        console.error(
            startsError
        );


        alert(
            "Starts konnten nicht geprüft werden."
        );


        return;

    }


    if (
        starts &&
        starts.length > 0
    ) {

        const startIds =
            starts.map(
                function(start) {

                    return start.id;

                }
            );


        const {
            error: resultsError
        } = await supabaseClient

            .from("results")

            .delete()

            .in(
                "start_id",
                startIds
            );


        if (resultsError) {

            console.error(
                resultsError
            );


            alert(
                "Ergebnisse konnten nicht gelöscht werden."
            );


            return;

        }


        // --------------------------------------------------
        // STARTS LÖSCHEN
        // --------------------------------------------------

        const {
            error: deleteStartsError
        } = await supabaseClient

            .from("starts")

            .delete()

            .eq(
                "competition_id",
                id
            );


        if (deleteStartsError) {

            console.error(
                deleteStartsError
            );


            alert(
                "Starts konnten nicht gelöscht werden."
            );


            return;

        }

    }


    // ------------------------------------------------------
    // TEAMS DES WETTKAMPFS LÖSCHEN
    // ------------------------------------------------------

    const {
        error: teamsError
    } = await supabaseClient

        .from("teams")

        .delete()

        .eq(
            "competition_id",
            id
        );


    if (teamsError) {

        console.error(
            teamsError
        );


        alert(
            "Teams konnten nicht gelöscht werden."
        );


        return;

    }


    // ------------------------------------------------------
    // WETTKAMPF LÖSCHEN
    // ------------------------------------------------------

    const {
        error
    } = await supabaseClient

        .from("competitions")

        .delete()

        .eq(
            "id",
            id
        );


    if (error) {

        console.error(
            "Fehler beim Löschen:",
            error
        );


        alert(
            "Wettkampf konnte nicht gelöscht werden."
        );


        return;

    }


    await wettkaempfeLaden();

}


// ==========================================================
// START
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        if (form) {

            form.addEventListener(
                "submit",
                wettkampfAnlegen
            );

        }


        wettkaempfeLaden();

    }
);
