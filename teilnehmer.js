// ==========================================================
// SSV 1928 SULZBACH E.V.
// TEILNEHMER VERWALTUNG
// DATEI: teilnehmer.js
// ==========================================================


// ==========================================================
// SUPABASE
// ==========================================================

const SUPABASE_URL =
    "https://pvvdbcvdhggqbembqrda.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL";

const teilnehmerSupabase =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ==========================================================
// DOM ELEMENTE
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

function htmlSicher(
    text
) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text ?? "";

    return div.innerHTML;

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
        await teilnehmerSupabase

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

                Teilnehmer konnten nicht geladen werden.

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

                    ${htmlSicher(person.vorname)}
                    ${htmlSicher(person.nachname)}

                </div>

                <div>

                    ID:
                    ${htmlSicher(person.id)}

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
    // Eingaben prüfen
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
    // Button sperren
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
        // PRÜFEN, OB TEILNEHMER BEREITS EXISTIERT
        // ==================================================

        const {
            data: vorhandene,
            error: suchError
        } =
            await teilnehmerSupabase

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


        if (suchError) {

            console.error(
                "Fehler bei der Teilnehmerprüfung:",
                suchError
            );

            teilnehmerMeldungAnzeigen(
                "❌ Teilnehmer konnte nicht geprüft werden.",
                "status-fehler"
            );

            return;

        }


        if (
            vorhandene &&
            vorhandene.length > 0
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
            data,
            error
        } =
            await teilnehmerSupabase

                .from("participants")

                .insert({

                    vorname:
                        vorname,

                    nachname:
                        nachname

                })

                .select()
                .single();


        if (error) {

            console.error(
                "Fehler beim Anlegen des Teilnehmers:",
                error
            );


            teilnehmerMeldungAnzeigen(
                "❌ Teilnehmer konnte nicht angelegt werden.",
                "status-fehler"
            );

            return;

        }


        console.log(
            "Teilnehmer angelegt:",
            data
        );


        // ==================================================
        // FORMULAR LEEREN
        // ==================================================

        vornameInput.value =
            "";

        nachnameInput.value =
            "";


        // ==================================================
        // ERFOLGSMELDUNG
        // ==================================================

        teilnehmerMeldungAnzeigen(
            "✅ Teilnehmer erfolgreich angelegt.",
            "status-ok"
        );


        // ==================================================
        // LISTE AKTUALISIEREN
        // ==================================================

        await teilnehmerLaden();


    } catch (fehler) {

        console.error(
            "Unerwarteter Fehler:",
            fehler
        );


        teilnehmerMeldungAnzeigen(
            "❌ Ein unerwarteter Fehler ist aufgetreten.",
            "status-fehler"
        );


    } finally {

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


// ==========================================================
// AUSFÜHREN
// ==========================================================

teilnehmerStart();
