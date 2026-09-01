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
// ZAHL UMWANDELN
// ==========================================

function zahlUmwandeln(wert) {

    wert = wert.replace(",", ".");

    return parseFloat(wert);

}



// ==========================================
// TEILNEHMER LADEN
// ==========================================

async function teilnehmerLaden() {

    const ergebnisSelect =
        document.getElementById(
            "teilnehmer"
        );


    const bearbeitenSelect =
        document.getElementById(
            "teilnehmer-bearbeiten"
        );


    const teilnehmerListe =
        document.getElementById(
            "teilnehmer-liste"
        );



    const {
        data,
        error
    } = await supabaseClient

        .from("participants")

        .select("*")

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


        if (teilnehmerListe) {

            teilnehmerListe.innerHTML =
                "<p>Fehler beim Laden der Teilnehmer.</p>";

        }

        return;

    }



    // ==========================================
    // ERGEBNIS-AUSWAHL
    // ==========================================

    if (ergebnisSelect) {

        ergebnisSelect.innerHTML = "";


        const standardOption =
            document.createElement("option");


        standardOption.value = "";


        standardOption.textContent =
            "Bitte Teilnehmer auswählen";


        ergebnisSelect.appendChild(
            standardOption
        );


        data.forEach(
            function(teilnehmer) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    teilnehmer.id;


                option.textContent =
                    teilnehmer.vorname +
                    " " +
                    teilnehmer.nachname;


                ergebnisSelect.appendChild(
                    option
                );

            }
        );

    }



    // ==========================================
    // ALTE BEARBEITUNGSAUSWAHL
    // ==========================================

    if (bearbeitenSelect) {

        bearbeitenSelect.innerHTML = "";


        const standardOption =
            document.createElement("option");


        standardOption.value = "";


        standardOption.textContent =
            "Bitte Teilnehmer auswählen";


        bearbeitenSelect.appendChild(
            standardOption
        );


        data.forEach(
            function(teilnehmer) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    teilnehmer.id;


                option.textContent =
                    teilnehmer.vorname +
                    " " +
                    teilnehmer.nachname;


                option.dataset.vorname =
                    teilnehmer.vorname;


                option.dataset.nachname =
                    teilnehmer.nachname;


                bearbeitenSelect.appendChild(
                    option
                );

            }
        );

    }



    // ==========================================
    // TEILNEHMERLISTE
    // ==========================================

    if (teilnehmerListe) {

        teilnehmerListe.innerHTML = "";


        if (data.length === 0) {

            teilnehmerListe.innerHTML =
                "<p>Noch keine Teilnehmer vorhanden.</p>";

        }


        data.forEach(
            function(teilnehmer) {

                const zeile =
                    document.createElement(
                        "div"
                    );


                zeile.className =
                    "teilnehmer-zeile";


                const name =
                    document.createElement(
                        "div"
                    );


                name.className =
                    "teilnehmer-name";


                name.textContent =
                    teilnehmer.vorname +
                    " " +
                    teilnehmer.nachname;



                const aktionen =
                    document.createElement(
                        "div"
                    );


                aktionen.className =
                    "teilnehmer-aktionen";



                // ==================================
                // BEARBEITEN BUTTON
                // ==================================

                const bearbeitenButton =
                    document.createElement(
                        "button"
                    );


                bearbeitenButton.type =
                    "button";


                bearbeitenButton.className =
                    "button-secondary";


                bearbeitenButton.textContent =
                    "Bearbeiten";


                bearbeitenButton.addEventListener(
                    "click",
                    function() {

                        teilnehmerBearbeiten(
                            teilnehmer
                        );

                    }
                );



                // ==================================
                // LÖSCHEN BUTTON
                // ==================================

                const loeschenButton =
                    document.createElement(
                        "button"
                    );


                loeschenButton.type =
                    "button";


                loeschenButton.className =
                    "button-danger";


                loeschenButton.textContent =
                    "Löschen";


                loeschenButton.addEventListener(
                    "click",
                    function() {

                        teilnehmerLoeschen(
                            teilnehmer
                        );

                    }
                );



                aktionen.appendChild(
                    bearbeitenButton
                );


                aktionen.appendChild(
                    loeschenButton
                );


                zeile.appendChild(
                    name
                );


                zeile.appendChild(
                    aktionen
                );


                teilnehmerListe.appendChild(
                    zeile
                );

            }
        );

    }

}



// ==========================================
// TEILNEHMER ANLEGEN
// ==========================================

const teilnehmerForm =
    document.getElementById(
        "teilnehmer-form"
    );


if (teilnehmerForm) {

    teilnehmerForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const vorname =
                document
                    .getElementById(
                        "vorname"
                    )
                    .value
                    .trim();


            const nachname =
                document
                    .getElementById(
                        "nachname"
                    )
                    .value
                    .trim();



            if (!vorname || !nachname) {

                alert(
                    "Bitte Vor- und Nachname eingeben."
                );

                return;

            }



            const {
                error
            } = await supabaseClient

                .from("participants")

                .insert([
                    {
                        vorname: vorname,
                        nachname: nachname
                    }
                ]);



            if (error) {

                console.error(
                    "Fehler beim Speichern:",
                    error
                );


                document.getElementById(
                    "teilnehmer-meldung"
                ).textContent =
                    "Fehler beim Speichern.";


                return;

            }



            document.getElementById(
                "teilnehmer-meldung"
            ).textContent =
                "Teilnehmer wurde gespeichert.";


            teilnehmerForm.reset();


            await teilnehmerLaden();

        }
    );

}



// ==========================================
// TEILNEHMER BEARBEITEN
// ==========================================

async function teilnehmerBearbeiten(
    teilnehmer
) {

    const neuerVorname =
        prompt(
            "Vorname:",
            teilnehmer.vorname
        );


    if (neuerVorname === null) {

        return;

    }


    const neuerNachname =
        prompt(
            "Nachname:",
            teilnehmer.nachname
        );


    if (neuerNachname === null) {

        return;

    }


    const vorname =
        neuerVorname.trim();


    const nachname =
        neuerNachname.trim();



    if (!vorname || !nachname) {

        alert(
            "Vor- und Nachname dürfen nicht leer sein."
        );

        return;

    }



    const {
        error
    } = await supabaseClient

        .from("participants")

        .update({
            vorname: vorname,
            nachname: nachname
        })

        .eq(
            "id",
            teilnehmer.id
        );



    if (error) {

        console.error(
            "Fehler beim Ändern:",
            error
        );


        alert(
            "Der Teilnehmer konnte nicht geändert werden."
        );

        return;

    }



    await teilnehmerLaden();

}



// ==========================================
// TEILNEHMER LÖSCHEN
// ==========================================

async function teilnehmerLoeschen(
    teilnehmer
) {

    const name =
        teilnehmer.vorname +
        " " +
        teilnehmer.nachname;



    const bestaetigt =
        confirm(
            "ACHTUNG!\n\n" +
            "Soll \"" +
            name +
            "\" wirklich gelöscht werden?\n\n" +
            "Dabei werden auch ALLE Ergebnisse " +
            "dieses Teilnehmers endgültig gelöscht."
        );



    if (!bestaetigt) {

        return;

    }



    const {
        error
    } = await supabaseClient

        .from("participants")

        .delete()

        .eq(
            "id",
            teilnehmer.id
        );



    if (error) {

        console.error(
            "Fehler beim Löschen:",
            error
        );


        alert(
            "Der Teilnehmer konnte nicht gelöscht werden."
        );

        return;

    }



    await teilnehmerLaden();

}



// ==========================================
// VORHANDENE ERGEBNISSE LADEN
// ==========================================

async function vorhandeneErgebnisseLaden() {

    const participantId =
        document
            .getElementById(
                "teilnehmer"
            )
            .value;


    const ergebnis1 =
        document.getElementById(
            "ergebnis1"
        );


    const ergebnis2 =
        document.getElementById(
            "ergebnis2"
        );


    const ergebnis3 =
        document.getElementById(
            "ergebnis3"
        );



    if (!participantId) {

        ergebnis1.value = "";

        ergebnis2.value = "";

        ergebnis3.value = "";

        return;

    }



    const {
        data,
        error
    } = await supabaseClient

        .from("results")

        .select(
            "ergebnis1, ergebnis2, ergebnis3"
        )

        .eq(
            "participant_id",
            participantId
        )

        .maybeSingle();



    if (error) {

        console.error(
            "Fehler beim Laden der Ergebnisse:",
            error
        );

        return;

    }



    if (!data) {

        ergebnis1.value = "";

        ergebnis2.value = "";

        ergebnis3.value = "";

        return;

    }



    ergebnis1.value =
        Number(
            data.ergebnis1
        )
            .toFixed(1)
            .replace(".", ",");


    ergebnis2.value =
        Number(
            data.ergebnis2
        )
            .toFixed(1)
            .replace(".", ",");


    ergebnis3.value =
        Number(
            data.ergebnis3
        )
            .toFixed(1)
            .replace(".", "");

}



// ==========================================
// ERGEBNIS-TEILNEHMER AUSWAHL
// ==========================================

const teilnehmerSelect =
    document.getElementById(
        "teilnehmer"
    );


if (teilnehmerSelect) {

    teilnehmerSelect.addEventListener(
        "change",
        vorhandeneErgebnisseLaden
    );

}



// ==========================================
// ERGEBNISSE SPEICHERN
// ==========================================

const ergebnisForm =
    document.getElementById(
        "ergebnis-form"
    );


if (ergebnisForm) {

    ergebnisForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();



            const participantId =
                document
                    .getElementById(
                        "teilnehmer"
                    )
                    .value;



            const wert1 =
                zahlUmwandeln(
                    document
                        .getElementById(
                            "ergebnis1"
                        )
                        .value
                );


            const wert2 =
                zahlUmwandeln(
                    document
                        .getElementById(
                            "ergebnis2"
                        )
                        .value
                );


            const wert3 =
                zahlUmwandeln(
                    document
                        .getElementById(
                            "ergebnis3"
                        )
                        .value
                );



            if (!participantId) {

                alert(
                    "Bitte einen Teilnehmer auswählen."
                );

                return;

            }



            if (
                Number.isNaN(wert1) ||
                Number.isNaN(wert2) ||
                Number.isNaN(wert3)
            ) {

                alert(
                    "Bitte bei allen drei Ergebnissen Zahlen eingeben."
                );

                return;

            }



            const {
                error
            } = await supabaseClient

                .from("results")

                .upsert(
                    {
                        participant_id:
                            participantId,

                        ergebnis1:
                            wert1,

                        ergebnis2:
                            wert2,

                        ergebnis3:
                            wert3
                    },
                    {
                        onConflict:
                            "participant_id"
                    }
                );



            if (error) {

                console.error(
                    "Fehler beim Speichern der Ergebnisse:",
                    error
                );


                document.getElementById(
                    "ergebnis-meldung"
                ).textContent =
                    "Fehler beim Speichern.";


                return;

            }



            document.getElementById(
                "ergebnis-meldung"
            ).textContent =
                "Ergebnisse wurden gespeichert.";

        }
    );

}



// ==========================================
// START
// ==========================================

teilnehmerLaden();
