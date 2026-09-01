// ==========================================================
// SSV 1928 SULZBACH E.V.
// WETTKAMPFVERWALTUNG
// ==========================================================
//
// Funktionen:
//
// - Wettkampf anlegen
// - Wettkampf bearbeiten
// - Wettkampf löschen
// - Wettkampf öffnen
// - Wettkampfname ändern
// - Wettkampfdatum ändern
// - Anzahl Ergebnisse ändern
// - Teamgröße ändern
// - Status ändern
//
// Die IDs der Wettkämpfe sind UUIDs.
// ==========================================================



// ==========================================================
// GLOBALE VARIABLEN
// ==========================================================

let alleWettkaempfe = [];


// ==========================================================
// DOM ELEMENTE
// ==========================================================

const wettkampfForm =
    document.getElementById(
        "wettkampf-form"
    );


const wettkampfId =
    document.getElementById(
        "wettkampf-id"
    );


const wettkampfName =
    document.getElementById(
        "wettkampf-name"
    );


const wettkampfDatum =
    document.getElementById(
        "wettkampf-datum"
    );


const anzahlErgebnisse =
    document.getElementById(
        "anzahl-ergebnisse"
    );


const teamgroesse =
    document.getElementById(
        "teamgroesse"
    );


const wettkampfStatus =
    document.getElementById(
        "wettkampf-status"
    );


const wettkampfSpeichern =
    document.getElementById(
        "wettkampf-speichern"
    );


const wettkampfAbbrechen =
    document.getElementById(
        "wettkampf-abbrechen"
    );


const wettkampfMeldung =
    document.getElementById(
        "wettkampf-meldung"
    );


const wettkaempfeListe =
    document.getElementById(
        "wettkaempfe-liste"
    );



// ==========================================================
// MELDUNG ANZEIGEN
// ==========================================================

function meldung(
    text,
    klasse = ""
) {

    if (!wettkampfMeldung) {

        return;

    }


    wettkampfMeldung.textContent =
        text;


    wettkampfMeldung.className =
        "meldung " +
        klasse;

}



// ==========================================================
// WETTKÄMPFE LADEN
// ==========================================================

async function wettkaempfeLaden() {

    if (!wettkaempfeListe) {

        return;

    }


    wettkaempfeListe.innerHTML = `

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
        )

        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Fehler beim Laden der Wettkämpfe:",
            error
        );


        wettkaempfeListe.innerHTML = `

            <p class="status-fehler">
                Wettkämpfe konnten nicht geladen werden.
            </p>

        `;


        return;

    }


    alleWettkaempfe =
        data || [];


    wettkaempfeAnzeigen(
        alleWettkaempfe
    );

}



// ==========================================================
// WETTKÄMPFE ANZEIGEN
// ==========================================================

function wettkaempfeAnzeigen(
    wettkaempfe
) {

    wettkaempfeListe.innerHTML =
        "";


    if (
        !wettkaempfe ||
        wettkaempfe.length === 0
    ) {

        wettkaempfeListe.innerHTML = `

            <p>
                Noch keine Wettkämpfe vorhanden.
            </p>

        `;


        return;

    }


    wettkaempfe.forEach(
        function(
            wettkampf
        ) {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "wettkampf-card";


            const datum =
                datumFormatieren(
                    wettkampf.datum
                );


            const status =
                statusFormatieren(
                    wettkampf.status
                );


            card.innerHTML = `

                <div class="wettkampf-card-inhalt">


                    <h3>

                        ${escapeHtml(
                            wettkampf.name
                        )}

                    </h3>


                    <p>

                        <strong>
                            Datum:
                        </strong>

                        ${datum}

                    </p>


                    <p>

                        <strong>
                            Ergebnisse:
                        </strong>

                        ${Number(
                            wettkampf.anzahl_ergebnisse
                        )}

                    </p>


                    <p>

                        <strong>
                            Teamgröße:
                        </strong>

                        ${Number(
                            wettkampf.teamgroesse
                        )}

                    </p>


                    <p>

                        <strong>
                            Status:
                        </strong>

                        ${status}

                    </p>


                </div>


                <div class="wettkampf-card-aktionen">


                    <button
                        type="button"
                        class="button"
                        data-oeffnen="${wettkampf.id}"
                    >
                        Wettkampf öffnen
                    </button>


                    <button
                        type="button"
                        class="button"
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


            wettkaempfeListe.appendChild(
                card
            );

        }
    );



    // ======================================================
    // WETTKAMPF ÖFFNEN
    // ======================================================

    wettkaempfeListe
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



    // ======================================================
    // WETTKAMPF BEARBEITEN
    // ======================================================

    wettkaempfeListe
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



    // ======================================================
    // WETTKAMPF LÖSCHEN
    // ======================================================

    wettkaempfeListe
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
// WETTKAMPF SPEICHERN
// ==========================================================

async function wettkampfSpeichernFunktion(
    event
) {

    event.preventDefault();


    const name =
        wettkampfName.value.trim();


    const datum =
        wettkampfDatum.value;


    const ergebnisse =
        Number(
            anzahlErgebnisse.value
        );


    const groesse =
        Number(
            teamgroesse.value
        );


    const status =
        wettkampfStatus.value;


    const id =
        wettkampfId.value.trim();



    // ======================================================
    // VALIDIERUNG
    // ======================================================

    if (!name) {

        meldung(
            "Bitte einen Wettkampfnamen eingeben.",
            "status-fehler"
        );


        wettkampfName.focus();


        return;

    }


    if (!datum) {

        meldung(
            "Bitte ein Datum auswählen.",
            "status-fehler"
        );


        wettkampfDatum.focus();


        return;

    }


    if (
        !Number.isInteger(ergebnisse) ||
        ergebnisse < 1 ||
        ergebnisse > 20
    ) {

        meldung(
            "Die Anzahl der Ergebnisse muss zwischen 1 und 20 liegen.",
            "status-fehler"
        );


        anzahlErgebnisse.focus();


        return;

    }


    if (
        !Number.isInteger(groesse) ||
        groesse < 1 ||
        groesse > 100
    ) {

        meldung(
            "Die Teamgröße muss zwischen 1 und 100 liegen.",
            "status-fehler"
        );


        teamgroesse.focus();


        return;

    }


    const erlaubteStatus =
        [
            "geplant",
            "laufend",
            "beendet"
        ];


    if (
        !erlaubteStatus.includes(
            status
        )
    ) {

        meldung(
            "Ungültiger Wettkampfstatus.",
            "status-fehler"
        );


        return;

    }



    // ======================================================
    // BESTEHENDEN WETTKAMPF BEARBEITEN
    // ======================================================

    if (id) {

        const {
            error
        } = await supabaseClient

            .from("competitions")

            .update({

                name:
                    name,

                datum:
                    datum,

                anzahl_ergebnisse:
                    ergebnisse,

                teamgroesse:
                    groesse,

                status:
                    status

            })

            .eq(
                "id",
                id
            );


        if (error) {

            console.error(
                "Fehler beim Bearbeiten des Wettkampfs:",
                error
            );


            meldung(
                "❌ Wettkampf konnte nicht geändert werden.",
                "status-fehler"
            );


            return;

        }


        meldung(
            "✅ Wettkampf wurde geändert.",
            "status-ok"
        );


        formularZuruecksetzen();


        await wettkaempfeLaden();


        return;

    }



    // ======================================================
    // NEUEN WETTKAMPF ANLEGEN
    // ======================================================

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
                ergebnisse,

            teamgroesse:
                groesse,

            status:
                status

        })

        .select()
        .single();



    if (error) {

        console.error(
            "Fehler beim Anlegen des Wettkampfs:",
            error
        );


        meldung(
            "❌ Wettkampf konnte nicht angelegt werden.",
            "status-fehler"
        );


        return;

    }



    // ======================================================
    // ERFOLGREICH ANGELEGT
    // ======================================================

    meldung(
        "✅ Wettkampf wurde angelegt.",
        "status-ok"
    );


    formularZuruecksetzen();


    await wettkaempfeLaden();

}



// ==========================================================
// WETTKAMPF BEARBEITEN
// ==========================================================

function wettkampfBearbeiten(
    id
) {

    const wettkampf =
        alleWettkaempfe.find(
            function(
                eintrag
            ) {

                return String(
                    eintrag.id
                ) === String(id);

            }
        );


    if (!wettkampf) {

        console.error(
            "Wettkampf nicht gefunden:",
            id
        );


        return;

    }


    wettkampfId.value =
        wettkampf.id;


    wettkampfName.value =
        wettkampf.name || "";


    wettkampfDatum.value =
        wettkampf.datum || "";


    anzahlErgebnisse.value =
        wettkampf.anzahl_ergebnisse || 3;


    teamgroesse.value =
        wettkampf.teamgroesse || 3;


    wettkampfStatus.value =
        wettkampf.status || "geplant";


    wettkampfSpeichern.textContent =
        "Änderungen speichern";


    wettkampfAbbrechen.style.display =
        "inline-block";


    meldung(
        "Wettkampf wird bearbeitet."
    );


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });


    wettkampfName.focus();

}



// ==========================================================
// FORMULAR ZURÜCKSETZEN
// ==========================================================

function formularZuruecksetzen() {

    wettkampfId.value =
        "";


    wettkampfName.value =
        "";


    wettkampfDatum.value =
        "";


    anzahlErgebnisse.value =
        3;


    teamgroesse.value =
        3;


    wettkampfStatus.value =
        "geplant";


    wettkampfSpeichern.textContent =
        "Wettkampf anlegen";


    wettkampfAbbrechen.style.display =
        "none";

}



// ==========================================================
// WETTKAMPF LÖSCHEN
// ==========================================================

async function wettkampfLoeschen(
    id
) {

    const wettkampf =
        alleWettkaempfe.find(
            function(
                eintrag
            ) {

                return String(
                    eintrag.id
                ) === String(id);

            }
        );


    if (!wettkampf) {

        return;

    }


    const bestaetigt =
        confirm(

            "Wettkampf wirklich löschen?\n\n" +

            wettkampf.name +

            "\n" +

            datumFormatieren(
                wettkampf.datum
            ) +

            "\n\n" +

            "Achtung: Zugehörige Teams, Starts und Ergebnisse können ebenfalls von Datenbankbeziehungen betroffen sein."

        );


    if (!bestaetigt) {

        return;

    }



    // ======================================================
    // WETTKAMPF LÖSCHEN
    // ======================================================

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
            "Fehler beim Löschen des Wettkampfs:",
            error
        );


        meldung(

            "❌ Wettkampf konnte nicht gelöscht werden. " +

            "Möglicherweise existieren noch Teams oder Starts.",

            "status-fehler"

        );


        return;

    }


    meldung(
        "✅ Wettkampf wurde gelöscht.",
        "status-ok"
    );


    await wettkaempfeLaden();

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

            return "🟡 Geplant";


        case "laufend":

            return "🟢 Laufend";


        case "beendet":

            return "🔵 Beendet";


        default:

            return escapeHtml(
                status || ""
            );

    }

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
// FORMULAR EVENT
// ==========================================================

if (wettkampfForm) {

    wettkampfForm.addEventListener(
        "submit",
        wettkampfSpeichernFunktion
    );

}



// ==========================================================
// ABBRECHEN
// ==========================================================

if (wettkampfAbbrechen) {

    wettkampfAbbrechen.addEventListener(
        "click",
        function() {

            formularZuruecksetzen();


            meldung(
                ""
            );

        }
    );

}



// ==========================================================
// START
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        wettkaempfeLaden();

    }
);
