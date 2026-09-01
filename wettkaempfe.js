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
// ELEMENTE
// ==========================================

const wettkampfForm =
    document.getElementById(
        "wettkampf-form"
    );


const wettkampfListe =
    document.getElementById(
        "wettkampf-liste"
    );


const wettkampfMeldung =
    document.getElementById(
        "wettkampf-meldung"
    );



// ==========================================
// WETTKÄMPFE LADEN
// ==========================================

async function wettkaempfeLaden() {

    const {
        data,
        error
    } = await supabaseClient

        .from("competitions")

        .select("*")

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


        wettkampfListe.innerHTML =
            "<p>Fehler beim Laden der Wettkämpfe.</p>";

        return;
    }



    // Keine Wettkämpfe vorhanden

    if (!data || data.length === 0) {

        wettkampfListe.innerHTML =
            "<p>Noch keine Wettkämpfe vorhanden.</p>";

        return;
    }



    // Liste leeren

    wettkampfListe.innerHTML = "";



    // Wettkämpfe anzeigen

    data.forEach(
        function(wettkampf) {


            const container =
                document.createElement(
                    "div"
                );


            container.className =
                "wettkampf-eintrag";



            // Datum formatieren

            const datum =
                new Date(
                    wettkampf.datum +
                    "T00:00:00"
                );


            const datumText =
                datum.toLocaleDateString(
                    "de-DE"
                );



            // Überschrift

            const titel =
                document.createElement(
                    "h3"
                );


            titel.textContent =
                wettkampf.name;



            // Informationen

            const info =
                document.createElement(
                    "p"
                );


            info.textContent =
                datumText +
                " · " +
                wettkampf.anzahl_ergebnisse +
                " Ergebnisse · " +
                wettkampf.teamgroesse +
                " Starter pro Team · " +
                wettkampf.status;



            // Öffnen Button

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.textContent =
                "Wettkampf öffnen";


            button.addEventListener(
                "click",
                function() {

                    window.location.href =
                        "wettkampf.html?id=" +
                        encodeURIComponent(
                            wettkampf.id
                        );

                }
            );



            container.appendChild(
                titel
            );


            container.appendChild(
                info
            );


            container.appendChild(
                button
            );


            wettkampfListe.appendChild(
                container
            );

        }
    );

}



// ==========================================
// WETTKAMPF ANLEGEN
// ==========================================

if (wettkampfForm) {

    wettkampfForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();



            const name =
                document
                    .getElementById(
                        "wettkampf-name"
                    )
                    .value
                    .trim();



            const datum =
                document
                    .getElementById(
                        "wettkampf-datum"
                    )
                    .value;



            const anzahlErgebnisse =
                Number(
                    document
                        .getElementById(
                            "anzahl-ergebnisse"
                        )
                        .value
                );



            const teamgroesse =
                Number(
                    document
                        .getElementById(
                            "teamgroesse"
                        )
                        .value
                );



            if (!name || !datum) {

                alert(
                    "Bitte Wettkampfname und Datum eingeben."
                );

                return;
            }



            // Speichern

            const {
                data,
                error
            } = await supabaseClient

                .from("competitions")

                .insert([
                    {
                        name: name,

                        datum: datum,

                        anzahl_ergebnisse:
                            anzahlErgebnisse,

                        teamgroesse:
                            teamgroesse,

                        status:
                            "geplant"
                    }
                ])

                .select()
                
                .single();



            if (error) {

                console.error(
                    "Fehler beim Anlegen des Wettkampfs:",
                    error
                );


                wettkampfMeldung.textContent =
                    "Fehler beim Anlegen des Wettkampfs.";

                return;
            }



            // Erfolg

            wettkampfMeldung.textContent =
                "Wettkampf wurde angelegt.";



            wettkampfForm.reset();



            // Standardwerte wieder setzen

            document
                .getElementById(
                    "anzahl-ergebnisse"
                )
                .value = "5";


            document
                .getElementById(
                    "teamgroesse"
                )
                .value = "3";



            // Liste aktualisieren

            await wettkaempfeLaden();



            // Nach kurzer Zeit zum Wettkampf

            if (data && data.id) {

                setTimeout(
                    function() {

                        window.location.href =
                            "wettkampf.html?id=" +
                            encodeURIComponent(
                                data.id
                            );

                    },
                    500
                );

            }

        }
    );

}



// ==========================================
// START
// ==========================================

wettkaempfeLaden();
