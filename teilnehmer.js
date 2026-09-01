// ==========================================================
// SSV 1928 SULZBACH E.V.
// TEILNEHMER VERWALTUNG
// DATEI: teilnehmer.js
// ==========================================================


// ==========================================================
// SUPABASE
// ==========================================================

const teilnehmerSupabaseUrl =
    "https://pvvdbcvdhggqbembqrda.supabase.co";

const teilnehmerSupabaseAnonKey =
    "sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL";


const teilnehmerSupabaseClient =
    window.supabase.createClient(
        teilnehmerSupabaseUrl,
        teilnehmerSupabaseAnonKey
    );


// ==========================================================
// DOM
// ==========================================================

const teilnehmerForm =
    document.getElementById(
        "teilnehmer-form"
    );


const vornameInput =
    document.getElementById(
        "vorname"
    );


const nachnameInput =
    document.getElementById(
        "nachname"
    );


const teilnehmerMeldung =
    document.getElementById(
        "teilnehmer-meldung"
    );


const teilnehmerListe =
    document.getElementById(
        "teilnehmer-liste"
    );


// ==========================================================
// MELDUNG
// ==========================================================

function teilnehmerMeldungAnzeigen(
    text,
    typ = ""
) {

    if (!teilnehmerMeldung) {
        return;
    }


    teilnehmerMeldung.textContent =
        text;


    teilnehmerMeldung.className =
        "meldung";


    if (typ) {

        teilnehmerMeldung.classList.add(
            typ
        );

    }

}


// ==========================================================
// HTML SICHER MACHEN
// ==========================================================

function teilnehmerHtmlSicher(
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
// TEILNEHMER LADEN
// ==========================================================

async function teilnehmerLaden() {

    if (!teilnehmerListe) {
        return;
    }


    teilnehmerListe.innerHTML = `

        <p class="loading">
            Teilnehmer werden geladen ...
        </p>

    `;


    const {
        data,
        error
    } =
        await teilnehmerSupabaseClient

            .from("participants")

            .select(`
                id,
                vorname,
                nachname
            `)

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


        teilnehmerListe.innerHTML = `

            <div class="error">

                Fehler beim Laden der Teilnehmer.

            </div>

        `;

        return;

    }


    if (
        !data ||
        data.length === 0
    ) {

        teilnehmerListe.innerHTML = `

            <div class="empty-state">

                <strong>
                    Noch keine Teilnehmer vorhanden.
                </strong>

                <span>
                    Lege den ersten Teilnehmer an.
                </span>

            </div>

        `;

        return;

    }


    teilnehmerListe.innerHTML =
        "";


    data.forEach(
        function(person) {

            const zeile =
                document.createElement(
                    "div"
                );


            zeile.className =
                "starter-card";


            zeile.innerHTML = `

                <div class="starter-name">

                    ${teilnehmerHtmlSicher(
                        person.vorname
                    )}

                    ${teilnehmerHtmlSicher(
                        person.nachname
                    )}

                </div>

            `;


            teilnehmerListe.appendChild(
                zeile
            );

        }
    );

}


// ==========================================================
// TEILNEHMER ANLEGEN
// ==========================================================

async function teilnehmerAnlegen(
    event
) {

    event.preventDefault();


    if (
        !vornameInput ||
        !nachnameInput
    ) {

        return;

    }


    const vorname =
        vornameInput.value.trim();


    const nachname =
        nachnameInput.value.trim();


    // ------------------------------------------------------
    // EINGABEN PRÜFEN
    // ------------------------------------------------------

    if (!vorname) {

        teilnehmerMeldungAnzeigen(
            "❌ Bitte einen Vornamen eingeben.",
            "status-fehler"
        );


        vornameInput.focus();


        return;

    }


    if (!nachname) {

        teilnehmerMeldungAnzeigen(
            "❌ Bitte einen Nachnamen eingeben.",
            "status-fehler"
        );


        nachnameInput.focus();


        return;

    }


    // ------------------------------------------------------
    // BUTTON
    // ------------------------------------------------------

    const button =
        teilnehmerForm.querySelector(
            'button[type="submit"]'
        );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Speichern ...";

    }


    teilnehmerMeldungAnzeigen(
        "Teilnehmer wird gespeichert ..."
    );


    try {

        // ==================================================
        // PRÜFEN, OB TEILNEHMER EXISTIERT
        // ==================================================

        const {
            data: vorhanden,
            error: suchFehler
        } =
            await teilnehmerSupabaseClient

                .from("participants")

                .select(`
                    id,
                    vorname,
                    nachname
                `)

                .ilike(
                    "vorname",
                    vorname
                )

                .ilike(
                    "nachname",
                    nachname
                );


        if (suchFehler) {

            console.error(
                "Fehler bei der Prüfung:",
                suchFehler
            );


            teilnehmerMeldungAnzeigen(
                "❌ Teilnehmer konnte nicht geprüft werden.",
                "status-fehler"
            );


            return;

        }


        if (
            vorhanden &&
            vorhanden.length > 0
        ) {

            teilnehmerMeldungAnzeigen(
                "⚠️ Dieser Teilnehmer ist bereits vorhanden.",
                "status-warnung"
            );


            return;

        }


        // ==================================================
        // TEILNEHMER ANLEGEN
        // ==================================================

        const {
            data: neuerTeilnehmer,
            error: insertFehler
        } =
            await teilnehmerSupabaseClient

                .from("participants")

                .insert({

                    vorname:
                        vorname,

                    nachname:
                        nachname

                })

                .select()
                .single();


        if (insertFehler) {

            console.error(
                "Fehler beim Anlegen:",
                insertFehler
            );


            teilnehmerMeldungAnzeigen(
                "❌ Teilnehmer konnte nicht angelegt werden.",
                "status-fehler"
            );


            return;

        }


        console.log(
            "Teilnehmer angelegt:",
            neuerTeilnehmer
        );


        // ==================================================
        // FORMULAR LEEREN
        // ==================================================

        vornameInput.value =
            "";

        nachnameInput.value =
            "";


        // ==================================================
        // ERFOLG
        // ==================================================

        teilnehmerMeldungAnzeigen(
            "✅ Teilnehmer erfolgreich angelegt.",
            "status-ok"
        );


        // ==================================================
        // LISTE AKTUALISIEREN
        // ==================================================

        await teilnehmerLaden();

    }
    catch (fehler) {

        console.error(
            "Unerwarteter Fehler:",
            fehler
        );


        teilnehmerMeldungAnzeigen(
            "❌ Ein unerwarteter Fehler ist aufgetreten.",
            "status-fehler"
        );

    }
    finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Teilnehmer speichern";

        }

    }

}


// ==========================================================
// FORMULAR VERBINDEN
// ==========================================================

if (teilnehmerForm) {

    teilnehmerForm.addEventListener(
        "submit",
        teilnehmerAnlegen
    );

}


// ==========================================================
// START
// ==========================================================

async function teilnehmerStart() {

    await teilnehmerLaden();

}


teilnehmerStart();
