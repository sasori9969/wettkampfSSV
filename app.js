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

    const selects = [];


    const ergebnisSelect =
        document.getElementById("teilnehmer");


    const bearbeitenSelect =
        document.getElementById(
            "teilnehmer-bearbeiten"
        );


    if (ergebnisSelect) {

        selects.push(ergebnisSelect);

    }


    if (bearbeitenSelect) {

        selects.push(bearbeitenSelect);

    }


    if (selects.length === 0) {

        return;

    }



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

        return;

    }



    // ==========================================
    // ERGEBNIS-EINGABE
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
    // TEILNEHMER BEARBEITEN
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

}



// ==========================================
// TEILNEHMER SPEICHERN
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
// TEILNEHMER AUSWÄHLEN
// ==========================================

const bearbeitenSelect =
    document.getElementById(
        "teilnehmer-bearbeiten"
    );


if (bearbeitenSelect) {

    bearbeitenSelect.addEventListener(
        "change",
        function() {

            const option =
                bearbeitenSelect
                    .selectedOptions[0];


            const vornameInput =
                document.getElementById(
                    "bearbeiten-vorname"
                );


            const nachnameInput =
                document.getElementById(
                    "bearbeiten-nachname"
                );



            if (
                !option ||
                !option.value
            ) {

                vornameInput.value = "";

                nachnameInput.value = "";

                return;

            }



            vornameInput.value =
                option.dataset.vorname || "";


            nachnameInput.value =
                option.dataset.nachname || "";

        }
    );

}



// ==========================================
// TEILNEHMER BEARBEITEN
// ==========================================

const bearbeitenForm =
    document.getElementById(
        "teilnehmer-bearbeiten-form"
    );


if (bearbeitenForm) {

    bearbeitenForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const participantId =
                bearbeitenSelect.value;


            const vorname =
                document
                    .getElementById(
                        "bearbeiten-vorname"
                    )
                    .value
                    .trim();


            const nachname =
                document
                    .getElementById(
                        "bearbeiten-nachname"
                    )
                    .value
                    .trim();



            if (!participantId) {

                alert(
                    "Bitte zuerst einen Teilnehmer auswählen."
                );

                return;

            }



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

                .update({
                    vorname: vorname,
                    nachname: nachname
                })

                .eq(
                    "id",
                    participantId
                );



            if (error) {

                console.error(
                    "Fehler beim Ändern des Teilnehmers:",
                    error
                );


                document.getElementById(
                    "bearbeiten-meldung"
                ).textContent =
                    "Fehler beim Ändern des Teilnehmers.";


                return;

            }



            document.getElementById(
                "bearbeiten-meldung"
            ).textContent =
                "Teilnehmer wurde geändert.";


            await teilnehmerLaden();


            bearbeitenSelect.value =
                participantId;


            const option =
                bearbeitenSelect
                    .selectedOptions[0];


            if (option) {

                option.dataset.vorname =
                    vorname;

                option.dataset.nachname =
                    nachname;

            }

        }
    );

}



// ==========================================
// TEILNEHMER LÖSCHEN
// ==========================================

const loeschenButton =
    document.getElementById(
        "teilnehmer-loeschen"
    );


if (loeschenButton) {

    loeschenButton.addEventListener(
        "click",
        async function() {

            const participantId =
                bearbeitenSelect.value;



            if (!participantId) {

                alert(
                    "Bitte zuerst einen Teilnehmer auswählen."
                );

                return;

            }



            const option =
                bearbeitenSelect
                    .selectedOptions[0];


            const name =
                option
                    ? option.textContent
                    : "Dieser Teilnehmer";



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
                    participantId
                );



            if (error) {

                console.error(
                    "Fehler beim Löschen:",
                    error
                );


                document.getElementById(
                    "loeschen-meldung"
                ).textContent =
                    "Fehler beim Löschen des Teilnehmers.";


                return;

            }



            document.getElementById(
                "loeschen-meldung"
            ).textContent =
                "Teilnehmer und alle zugehörigen " +
                "Ergebnisse wurden gelöscht.";



            document.getElementById(
                "bearbeiten-vorname"
            ).value = "";


            document.getElementById(
                "bearbeiten-nachname"
            ).value = "";



            await teilnehmerLaden();


            bearbeitenSelect.value = "";

        }
    );

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
// TEILNEHMER AUSWAHL ERGEBNISSE
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
