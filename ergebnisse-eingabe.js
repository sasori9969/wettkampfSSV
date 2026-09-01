// ==========================================================
// SSV 1928 SULZBACH E.V.
// ERGEBNISSE ERFASSEN
// ==========================================================


// ==========================================================
// SUPABASE
// ==========================================================

const SUPABASE_URL =
    "https://pvvdbcvdhggqbembqrda.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL";


const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ==========================================================
// GLOBALE VARIABLEN
// ==========================================================

let wettkaempfe = [];

let aktuellerWettkampf = null;

let starts = [];

let ausgewaehlterStart = null;


// ==========================================================
// HILFSFUNKTIONEN
// ==========================================================

function escapeHtml(wert) {

    if (
        wert === null ||
        wert === undefined
    ) {
        return "";
    }

    return String(wert)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function zahl(wert) {

    if (
        wert === null ||
        wert === undefined ||
        wert === ""
    ) {
        return 0;
    }

    const nummer =
        Number(
            String(wert)
                .replace(",", ".")
        );

    return Number.isFinite(nummer)
        ? nummer
        : 0;
}


function formatZahl(wert) {

    return zahl(wert)
        .toFixed(2)
        .replace(".", ",");
}


function nameDesStarters(start) {

    const vorname =
        start.participants?.vorname
        || "";

    const nachname =
        start.participants?.nachname
        || "";

    return (
        `${vorname} ${nachname}`
    ).trim();

}


// ==========================================================
// WETTKÄMPFE LADEN
// ==========================================================

async function wettkaempfeLaden() {

    const auswahl =
        document.getElementById(
            "wettkampf-auswahl"
        );


    if (!auswahl) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient

            .from("competitions")

            .select(`
                id,
                name,
                datum,
                anzahl_ergebnisse,
                teamgroesse,
                status
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


        auswahl.innerHTML = `
            <option value="">
                Fehler beim Laden
            </option>
        `;

        return;
    }


    wettkaempfe =
        data || [];


    auswahl.innerHTML = `
        <option value="">
            Wettkampf auswählen ...
        </option>
    `;


    wettkaempfe.forEach(
        function(wettkampf) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                wettkampf.id;


            option.textContent =
                wettkampf.name;


            auswahl.appendChild(
                option
            );

        }
    );

}


// ==========================================================
// WETTKAMPF AUSWÄHLEN
// ==========================================================

async function wettkampfAusgewaehlt() {

    const auswahl =
        document.getElementById(
            "wettkampf-auswahl"
        );


    const id =
        auswahl?.value;


    if (!id) {

        aktuellerWettkampf =
            null;

        starts = [];

        ausgewaehlterStart =
            null;


        bereicheAusblenden();

        return;
    }


    aktuellerWettkampf =
        wettkaempfe.find(
            function(wettkampf) {

                return String(
                    wettkampf.id
                ) === String(id);

            }
        );


    if (!aktuellerWettkampf) {
        return;
    }


    const info =
        document.getElementById(
            "wettkampf-info"
        );


    if (info) {

        info.innerHTML = `
            <strong>
                ${escapeHtml(
                    aktuellerWettkampf.name
                )}
            </strong>
            ·
            ${escapeHtml(
                aktuellerWettkampf.datum
            )}
            ·
            ${zahl(
                aktuellerWettkampf.anzahl_ergebnisse
            )}
            Ergebnisse
        `;

    }


    await startsLaden();

}


// ==========================================================
// STARTS LADEN
// ==========================================================

async function startsLaden() {

    if (!aktuellerWettkampf) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient

            .from("starts")

            .select(`
                id,
                competition_id,
                participant_id,
                team_id,
                ak,
                created_at,
                participants (
                    vorname,
                    nachname
                ),
                teams (
                    name
                )
            `)

            .eq(
                "competition_id",
                aktuellerWettkampf.id
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


        starts = [];

        return;
    }


    starts =
        data || [];


    ausgewaehlterStart =
        null;


    starterListeAnzeigen();

    erfassteStartsAnzeigen();


    const ergebnisBereich =
        document.getElementById(
            "ergebnis-bereich"
        );


    if (ergebnisBereich) {

        ergebnisBereich.style.display =
            "none";

    }

}


// ==========================================================
// STARTER-LISTE
// ==========================================================

function starterListeAnzeigen() {

    const bereich =
        document.getElementById(
            "starter-auswahl-bereich"
        );


    const auswahl =
        document.getElementById(
            "starter-auswahl"
        );


    if (
        !bereich ||
        !auswahl
    ) {
        return;
    }


    bereich.style.display =
        "block";


    auswahl.innerHTML = `
        <option value="">
            Starter auswählen ...
        </option>
    `;


    starts.forEach(
        function(start) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                start.id;


            let text =
                nameDesStarters(
                    start
                );


            if (
                start.team_id &&
                start.teams
            ) {

                text +=
                    ` – ${start.teams.name}`;

            } else {

                text +=
                    " – Einzelstart";

            }


            if (
                start.ak === true
            ) {

                text +=
                    " – AK";

            }


            option.textContent =
                text;


            auswahl.appendChild(
                option
            );

        }
    );

}


// ==========================================================
// STARTER SUCHEN
// ==========================================================

function starterSuchen() {

    const input =
        document.getElementById(
            "starter-suche"
        );


    const ergebnisse =
        document.getElementById(
            "starter-suchergebnisse"
        );


    if (
        !input ||
        !ergebnisse
    ) {
        return;
    }


    const suchtext =
        input.value
            .trim()
            .toLowerCase();


    ergebnisse.innerHTML =
        "";


    if (!suchtext) {
        return;
    }


    const gefunden =
        starts.filter(
            function(start) {

                const name =
                    nameDesStarters(
                        start
                    ).toLowerCase();


                return name.includes(
                    suchtext
                );

            }
        );


    if (
        gefunden.length === 0
    ) {

        ergebnisse.innerHTML = `
            <p>
                Kein Starter gefunden.
            </p>
        `;

        return;
    }


    gefunden.forEach(
        function(start) {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "suchergebnis";


            let text =
                nameDesStarters(
                    start
                );


            if (
                start.team_id &&
                start.teams
            ) {

                text +=
                    ` – ${start.teams.name}`;

            } else {

                text +=
                    " – Einzelstart";

            }


            if (
                start.ak === true
            ) {

                text +=
                    " – AK";

            }


            button.textContent =
                text;


            button.addEventListener(
                "click",
                function() {

                    starterAuswaehlen(
                        start.id
                    );


                    input.value =
                        "";


                    ergebnisse.innerHTML =
                        "";

                }
            );


            ergebnisse.appendChild(
                button
            );

        }
    );

}


// ==========================================================
// START AUSWÄHLEN
// ==========================================================

async function starterAuswaehlen(
    startId
) {

    const start =
        starts.find(
            function(item) {

                return String(
                    item.id
                ) === String(startId);

            }
        );


    if (!start) {
        return;
    }


    ausgewaehlterStart =
        start;


    const auswahl =
        document.getElementById(
            "starter-auswahl"
        );


    if (auswahl) {

        auswahl.value =
            start.id;

    }


    await ergebnisseFuerStartLaden();

}


// ==========================================================
// START-AUSWAHL AUS SELECT
// ==========================================================

async function starterSelectGeaendert() {

    const auswahl =
        document.getElementById(
            "starter-auswahl"
        );


    if (!auswahl) {
        return;
    }


    const id =
        auswahl.value;


    if (!id) {

        ausgewaehlterStart =
            null;


        const bereich =
            document.getElementById(
                "ergebnis-bereich"
            );


        if (bereich) {

            bereich.style.display =
                "none";

        }


        return;
    }


    await starterAuswaehlen(
        id
    );

}


// ==========================================================
// STARTER-INFORMATION
// ==========================================================

function starterInformationAnzeigen() {

    const info =
        document.getElementById(
            "starter-information"
        );


    if (
        !info ||
        !ausgewaehlterStart
    ) {
        return;
    }


    let typ = "";


    if (
        ausgewaehlterStart.team_id &&
        ausgewaehlterStart.teams
    ) {

        typ =
            `Team: ${escapeHtml(
                ausgewaehlterStart.teams.name
            )}`;

    } else {

        typ =
            "Einzelstart";

    }


    if (
        ausgewaehlterStart.ak === true
    ) {

        typ +=
            " · <strong>AK</strong>";

    }


    info.innerHTML = `
        <strong>
            ${escapeHtml(
                nameDesStarters(
                    ausgewaehlterStart
                )
            )}
        </strong>
        <br>
        ${typ}
    `;


    info.style.display =
        "block";

}


// ==========================================================
// ERGEBNISSE EINES STARTS LADEN
// ==========================================================

async function ergebnisseFuerStartLaden() {

    if (
        !ausgewaehlterStart ||
        !aktuellerWettkampf
    ) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient

            .from("results")

            .select(`
                id,
                start_id,
                nummer,
                wert
            `)

            .eq(
                "start_id",
                ausgewaehlterStart.id
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


        zeigeMeldung(
            "Fehler beim Laden der Ergebnisse.",
            true
        );

        return;
    }


    ergebnisFormularErstellen(
        data || []
    );


    starterInformationAnzeigen();

}


// ==========================================================
// ERGEBNISFORMULAR ERSTELLEN
// ==========================================================

function ergebnisFormularErstellen(
    vorhandeneErgebnisse
) {

    const bereich =
        document.getElementById(
            "ergebnis-bereich"
        );


    const felder =
        document.getElementById(
            "ergebnis-felder"
        );


    const titel =
        document.getElementById(
            "ergebnis-titel"
        );


    const hinweis =
        document.getElementById(
            "ergebnis-hinweis"
        );


    if (
        !bereich ||
        !felder
    ) {
        return;
    }


    const anzahl =
        Math.min(
            Math.max(
                zahl(
                    aktuellerWettkampf
                        ?.anzahl_ergebnisse
                ),
                3
            ),
            10
        );


    if (titel) {

        titel.textContent =
            `Ergebnisse – ${
                nameDesStarters(
                    ausgewaehlterStart
                )
            }`;

    }


    if (hinweis) {

        hinweis.textContent =
            `${anzahl} Ergebnisse für diesen Start`;

    }


    felder.innerHTML =
        "";


    for (
        let i = 1;
        i <= anzahl;
        i++
    ) {

        const vorhandenes =
            vorhandeneErgebnisse.find(
                function(ergebnis) {

                    return (
                        zahl(
                            ergebnis.nummer
                        ) === i
                    );

                }
            );


        const wert =
            vorhandenes
                ? vorhandenes.wert
                : "";


        const gruppe =
            document.createElement(
                "div"
            );


        gruppe.className =
            "form-group";


        gruppe.innerHTML = `
            <label for="ergebnis-${i}">
                Ergebnis ${i}
            </label>

            <input
                type="text"
                id="ergebnis-${i}"
                inputmode="decimal"
                placeholder="z. B. 12,50"
                value="${
                    wert !== ""
                    ? escapeHtml(wert)
                    : ""
                }"
            >
        `;


        felder.appendChild(
            gruppe
        );

    }


    bereich.style.display =
        "block";


    const meldung =
        document.getElementById(
            "ergebnis-meldung"
        );


    if (meldung) {
        meldung.textContent = "";
    }

}


// ==========================================================
// ERGEBNISSE SPEICHERN
// ==========================================================

async function ergebnisseSpeichern(
    event
) {

    event.preventDefault();


    if (
        !ausgewaehlterStart ||
        !aktuellerWettkampf
    ) {

        zeigeMeldung(
            "Bitte zuerst einen Starter auswählen.",
            true
        );

        return;
    }


    const anzahl =
        Math.min(
            Math.max(
                zahl(
                    aktuellerWettkampf
                        .anzahl_ergebnisse
                ),
                3
            ),
            10
        );


    const speichernButton =
        document.getElementById(
            "ergebnisse-speichern"
        );


    if (speichernButton) {

        speichernButton.disabled =
            true;

        speichernButton.textContent =
            "Speichern ...";

    }


    try {

        // --------------------------------------------------
        // Bestehende Ergebnisse laden
        // --------------------------------------------------

        const {
            data: bestehend,
            error: ladeFehler
        } =
            await supabaseClient

                .from("results")

                .select(`
                    id,
                    start_id,
                    nummer,
                    wert
                `)

                .eq(
                    "start_id",
                    ausgewaehlterStart.id
                );


        if (ladeFehler) {
            throw ladeFehler;
        }


        // --------------------------------------------------
        // Jedes Ergebnis einzeln speichern
        // --------------------------------------------------

        for (
            let i = 1;
            i <= anzahl;
            i++
        ) {

            const input =
                document.getElementById(
                    `ergebnis-${i}`
                );


            if (!input) {
                continue;
            }


            const rohwert =
                input.value
                    .trim()
                    .replace(",", ".");


            const vorhanden =
                bestehend?.find(
                    function(ergebnis) {

                        return (
                            zahl(
                                ergebnis.nummer
                            ) === i
                        );

                    }
                );


            // ----------------------------------------------
            // LEERES FELD
            // ----------------------------------------------

            if (
                rohwert === ""
            ) {

                if (vorhanden) {

                    const {
                        error
                    } =
                        await supabaseClient

                            .from("results")

                            .delete()

                            .eq(
                                "id",
                                vorhanden.id
                            );


                    if (error) {
                        throw error;
                    }

                }


                continue;

            }


            const wert =
                Number(
                    rohwert
                );


            if (
                !Number.isFinite(wert)
            ) {

                throw new Error(
                    `Ergebnis ${i} ist keine gültige Zahl.`
                );

            }


            // ----------------------------------------------
            // BESTEHENDES ERGEBNIS AKTUALISIEREN
            // ----------------------------------------------

            if (vorhanden) {

                const {
                    error
                } =
                    await supabaseClient

                        .from("results")

                        .update({

                            wert:
                                wert

                        })

                        .eq(
                            "id",
                            vorhanden.id
                        );


                if (error) {
                    throw error;
                }


            }

            // ----------------------------------------------
            // NEUES ERGEBNIS ANLEGEN
            // ----------------------------------------------

            else {

                const {
                    error
                } =
                    await supabaseClient

                        .from("results")

                        .insert({

                            start_id:
                                ausgewaehlterStart.id,

                            nummer:
                                i,

                            wert:
                                wert

                        });


                if (error) {
                    throw error;
                }

            }

        }


        // --------------------------------------------------
        // ERFOLG
        // --------------------------------------------------

        zeigeMeldung(
            "Ergebnisse erfolgreich gespeichert.",
            false
        );


        await ergebnisseFuerStartLaden();

        await startsLaden();


        // Nach startsLaden ist die Auswahl
        // wieder aufgebaut.
        // Den Start erneut auswählen.

        if (
            ausgewaehlterStart
        ) {

            const startId =
                ausgewaehlterStart.id;


            const neuerStart =
                starts.find(
                    function(start) {

                        return String(
                            start.id
                        ) === String(
                            startId
                        );

                    }
                );


            if (neuerStart) {

                ausgewaehlterStart =
                    neuerStart;


                const auswahl =
                    document.getElementById(
                        "starter-auswahl"
                    );


                if (auswahl) {

                    auswahl.value =
                        neuerStart.id;

                }


                await ergebnisseFuerStartLaden();

            }

        }


    } catch (error) {

        console.error(
            "Fehler beim Speichern:",
            error
        );


        zeigeMeldung(
            error.message
            || "Fehler beim Speichern der Ergebnisse.",
            true
        );

    }


    if (speichernButton) {

        speichernButton.disabled =
            false;

        speichernButton.textContent =
            "Ergebnisse speichern";

    }

}


// ==========================================================
// BEREITS ERFASSTE STARTS
// ==========================================================

async function erfassteStartsAnzeigen() {

    const bereich =
        document.getElementById(
            "erfasste-starts-bereich"
        );


    const container =
        document.getElementById(
            "erfasste-starts"
        );


    if (
        !bereich ||
        !container
    ) {
        return;
    }


    bereich.style.display =
        "block";


    if (
        starts.length === 0
    ) {

        container.innerHTML = `
            <p>
                Für diesen Wettkampf sind noch keine Starter vorhanden.
            </p>
        `;

        return;
    }


    // ------------------------------------------------------
    // Ergebnisse aller Starts laden
    // ------------------------------------------------------

    const startIds =
        starts.map(
            function(start) {

                return start.id;

            }
        );


    const {
        data: resultate,
        error
    } =
        await supabaseClient

            .from("results")

            .select(`
                id,
                start_id,
                nummer,
                wert
            `)

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
            "Fehler beim Laden der erfassten Ergebnisse:",
            error
        );


        container.innerHTML = `
            <p>
                Ergebnisse konnten nicht geladen werden.
            </p>
        `;

        return;
    }


    container.innerHTML =
        "";


    starts.forEach(
        function(start) {

            const eigene =
                (resultate || [])
                    .filter(
                        function(ergebnis) {

                            return String(
                                ergebnis.start_id
                            ) === String(
                                start.id
                            );

                        }
                    );


            const karte =
                document.createElement(
                    "div"
                );


            karte.className =
                "erfasster-start";


            let teamText =
                "Einzelstart";


            if (
                start.team_id &&
                start.teams
            ) {

                teamText =
                    escapeHtml(
                        start.teams.name
                    );

            }


            if (
                start.ak === true
            ) {

                teamText +=
                    " · AK";

            }


            let ergebnisText =
                "Noch keine Ergebnisse";


            if (
                eigene.length > 0
            ) {

                ergebnisText =
                    eigene
                        .sort(
                            function(a, b) {

                                return (
                                    zahl(a.nummer) -
                                    zahl(b.nummer)
                                );

                            }
                        )
                        .map(
                            function(ergebnis) {

                                return formatZahl(
                                    ergebnis.wert
                                );

                            }
                        )
                        .join(
                            " · "
                        );

            }


            karte.innerHTML = `
                <div>
                    <strong>
                        ${escapeHtml(
                            nameDesStarters(
                                start
                            )
                        )}
                    </strong>

                    <br>

                    <small>
                        ${teamText}
                    </small>

                    <br>

                    <span>
                        ${ergebnisText}
                    </span>
                </div>

                <button
                    type="button"
                    class="start-bearbeiten"
                >
                    Bearbeiten
                </button>
            `;


            const button =
                karte.querySelector(
                    ".start-bearbeiten"
                );


            button.addEventListener(
                "click",
                function() {

                    starterAuswaehlen(
                        start.id
                    );

                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });

                }
            );


            container.appendChild(
                karte
            );

        }
    );

}


// ==========================================================
// MELDUNG
// ==========================================================

function zeigeMeldung(
    text,
    fehler
) {

    const meldung =
        document.getElementById(
            "ergebnis-meldung"
        );


    if (!meldung) {
        return;
    }


    meldung.textContent =
        text;


    meldung.style.color =
        fehler
            ? "#b00020"
            : "#147a32";

}


// ==========================================================
// BEREICHE AUSBLENDEN
// ==========================================================

function bereicheAusblenden() {

    const ids = [

        "starter-auswahl-bereich",

        "ergebnis-bereich",

        "erfasste-starts-bereich"

    ];


    ids.forEach(
        function(id) {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.style.display =
                    "none";

            }

        }
    );

}


// ==========================================================
// EVENTS
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {


        // --------------------------------------------------
        // Wettkampf
        // --------------------------------------------------

        const wettkampf =
            document.getElementById(
                "wettkampf-auswahl"
            );


        if (wettkampf) {

            wettkampf.addEventListener(
                "change",
                wettkampfAusgewaehlt
            );

        }


        // --------------------------------------------------
        // Starter
        // --------------------------------------------------

        const starter =
            document.getElementById(
                "starter-auswahl"
            );


        if (starter) {

            starter.addEventListener(
                "change",
                starterSelectGeaendert
            );

        }


        // --------------------------------------------------
        // Suche
        // --------------------------------------------------

        const suche =
            document.getElementById(
                "starter-suche"
            );


        if (suche) {

            suche.addEventListener(
                "input",
                starterSuchen
            );

        }


        // --------------------------------------------------
        // Formular
        // --------------------------------------------------

        const formular =
            document.getElementById(
                "ergebnis-form"
            );


        if (formular) {

            formular.addEventListener(
                "submit",
                ergebnisseSpeichern
            );

        }


        // --------------------------------------------------
        // Zurücksetzen
        // --------------------------------------------------

        const reset =
            document.getElementById(
                "ergebnisse-loeschen"
            );


        if (reset) {

            reset.addEventListener(
                "click",
                function() {

                    if (
                        aktuellerWettkampf
                    ) {

                        ergebnisFormularErstellen(
                            []
                        );

                    }

                }
            );

        }


        // --------------------------------------------------
        // Wettkämpfe laden
        // --------------------------------------------------

        await wettkaempfeLaden();

    }
);
