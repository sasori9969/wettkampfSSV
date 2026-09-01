// ==========================================================
// SSV 1928 SULZBACH E.V.
// ERGEBNISSE ERFASSEN
// ==========================================================


// ==========================================================
// SUPABASE EINSTELLUNGEN
// ==========================================================

const SUPABASE_URL =
    "https://pvvdbcvdhggqbembqrda.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL";


// ==========================================================
// SUPABASE VERBINDUNG
// ==========================================================

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ==========================================================
// GLOBALE VARIABLEN
// ==========================================================

let aktuellerWettkampf = null;

let aktuellerTeilnehmer = null;

let aktuelleStarts = [];

let aktuellerStart = null;

let alleTeilnehmer = [];

let suchTimer = null;


// ==========================================================
// HILFSFUNKTIONEN
// ==========================================================

function element(id) {

    return document.getElementById(id);

}


function escapeHtml(text) {

    if (text === null || text === undefined) {
        return "";
    }

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function zahlAusEingabe(value) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {

        return null;

    }

    let text =
        String(value)
            .trim()
            .replace(",", ".");

    const zahl =
        Number(text);

    if (!Number.isFinite(zahl)) {

        return null;

    }

    return zahl;

}


function formatZahl(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "";

    }

    const zahl =
        Number(value);

    if (!Number.isFinite(zahl)) {

        return "";

    }

    return zahl
        .toFixed(2)
        .replace(".", ",");

}


function setMeldung(id, text, typ = "") {

    const el =
        element(id);

    if (!el) {
        return;
    }

    el.textContent =
        text || "";

    el.className =
        "meldung";

    if (typ) {

        el.classList.add(
            typ
        );

    }

}


// ==========================================================
// WETTKÄMPFE LADEN
// ==========================================================

async function wettkaempfeLaden() {

    const select =
        element("wettkampf-auswahl");

    if (!select) {
        return;
    }


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

        setMeldung(
            "wettkampf-info",
            "Fehler beim Laden der Wettkämpfe.",
            "fehler"
        );

        return;

    }


    select.innerHTML = `
        <option value="">
            Wettkampf auswählen ...
        </option>
    `;


    (data || []).forEach(
        function(wettkampf) {

            const option =
                document.createElement("option");

            option.value =
                wettkampf.id;

            option.textContent =
                `${wettkampf.name} – ${formatDatum(wettkampf.datum)}`;

            select.appendChild(
                option
            );

        }
    );

}


// ==========================================================
// DATUM FORMATIEREN
// ==========================================================

function formatDatum(datum) {

    if (!datum) {
        return "";
    }

    const teile =
        String(datum).split("-");

    if (teile.length !== 3) {
        return datum;
    }

    return `${teile[2]}.${teile[1]}.${teile[0]}`;

}


// ==========================================================
// WETTKAMPF AUSWÄHLEN
// ==========================================================

async function wettkampfAusgewaehlt() {

    const select =
        element("wettkampf-auswahl");

    if (!select) {
        return;
    }


    const wettkampfId =
        select.value;


    aktuellerWettkampf = null;

    aktuellerTeilnehmer = null;

    aktuelleStarts = [];

    aktuellerStart = null;


    bereichAusblenden(
        "starter-suche-bereich"
    );

    bereichAusblenden(
        "start-auswahl-bereich"
    );

    bereichAusblenden(
        "ergebnis-bereich"
    );

    bereichAusblenden(
        "gespeicherte-ergebnisse-bereich"
    );


    if (!wettkampfId) {

        setMeldung(
            "wettkampf-info",
            "Bitte einen Wettkampf auswählen."
        );

        return;

    }


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
            wettkampfId
        )

        .single();


    if (error) {

        console.error(
            "Fehler beim Laden des Wettkampfs:",
            error
        );

        setMeldung(
            "wettkampf-info",
            "Wettkampf konnte nicht geladen werden.",
            "fehler"
        );

        return;

    }


    aktuellerWettkampf =
        data;


    setMeldung(
        "wettkampf-info",
        `${data.name} | ${formatDatum(data.datum)} | ${data.anzahl_ergebnisse} Ergebnisse`
    );


    bereichEinblenden(
        "starter-suche-bereich"
    );


    const suche =
        element("starter-suche");

    if (suche) {

        suche.value = "";

        suche.focus();

    }


    const ergebnisse =
        element("starter-suchergebnisse");

    if (ergebnisse) {

        ergebnisse.innerHTML = "";

    }


    await teilnehmerLaden();

}


// ==========================================================
// TEILNEHMER LADEN
// ==========================================================

async function teilnehmerLaden() {

    const {
        data,
        error
    } = await supabaseClient

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

        return;

    }


    alleTeilnehmer =
        data || [];

}


// ==========================================================
// TEILNEHMER SUCHEN
// ==========================================================

function teilnehmerSuchen() {

    const suche =
        element("starter-suche");

    const container =
        element("starter-suchergebnisse");

    if (!suche || !container) {
        return;
    }


    const begriff =
        suche.value
            .trim()
            .toLowerCase();


    container.innerHTML = "";


    if (!begriff) {
        return;
    }


    const treffer =
        alleTeilnehmer.filter(
            function(teilnehmer) {

                const vollerName =
                    `${teilnehmer.vorname} ${teilnehmer.nachname}`
                        .toLowerCase();

                const nachname =
                    String(
                        teilnehmer.nachname || ""
                    ).toLowerCase();

                const vorname =
                    String(
                        teilnehmer.vorname || ""
                    ).toLowerCase();


                return (
                    vollerName.includes(begriff) ||
                    nachname.startsWith(begriff) ||
                    vorname.startsWith(begriff)
                );

            }
        );


    if (treffer.length === 0) {

        container.innerHTML = `
            <p>
                Kein Teilnehmer gefunden.
            </p>
        `;

        return;

    }


    treffer
        .slice(0, 20)
        .forEach(
            function(teilnehmer) {

                const button =
                    document.createElement("button");

                button.type =
                    "button";

                button.className =
                    "start-button";

                button.innerHTML = `

                    <span class="start-button-icon">
                        👤
                    </span>

                    <span class="start-button-text">

                        <strong>
                            ${escapeHtml(teilnehmer.vorname)}
                            ${escapeHtml(teilnehmer.nachname)}
                        </strong>

                        <small>
                            Teilnehmer auswählen
                        </small>

                    </span>

                `;


                button.addEventListener(
                    "click",
                    function() {

                        teilnehmerAuswaehlen(
                            teilnehmer
                        );

                    }
                );


                container.appendChild(
                    button
                );

            }
        );

}


// ==========================================================
// TEILNEHMER AUSWÄHLEN
// ==========================================================

async function teilnehmerAuswaehlen(
    teilnehmer
) {

    aktuellerTeilnehmer =
        teilnehmer;


    const suche =
        element("starter-suche");

    if (suche) {

        suche.value =
            `${teilnehmer.vorname} ${teilnehmer.nachname}`;

    }


    const suchergebnisse =
        element("starter-suchergebnisse");

    if (suchergebnisse) {

        suchergebnisse.innerHTML = "";

    }


    await startsFuerTeilnehmerLaden();

}


// ==========================================================
// STARTS DES TEILNEHMERS LADEN
// ==========================================================

async function startsFuerTeilnehmerLaden() {

    if (
        !aktuellerWettkampf ||
        !aktuellerTeilnehmer
    ) {

        return;

    }


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
            created_at,
            teams (
                id,
                name
            )
        `)

        .eq(
            "competition_id",
            aktuellerWettkampf.id
        )

        .eq(
            "participant_id",
            aktuellerTeilnehmer.id
        )

        .order(
            "created_at",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Fehler beim Laden der Starts:",
            error
        );

        setMeldung(
            "wettkampf-info",
            "Fehler beim Laden der Starts.",
            "fehler"
        );

        return;

    }


    aktuelleStarts =
        data || [];


    startAuswahlAnzeigen();

}


// ==========================================================
// STARTAUSWAHL ANZEIGEN
// ==========================================================

function startAuswahlAnzeigen() {

    const bereich =
        element("start-auswahl-bereich");

    const select =
        element("start-auswahl");

    const starter =
        element("ausgewaehlter-starter");

    if (
        !bereich ||
        !select ||
        !starter
    ) {

        return;

    }


    bereichEinblenden(
        "start-auswahl-bereich"
    );


    starter.innerHTML = `

        <div class="ausgewaehlter-starter">

            <strong>
                ${escapeHtml(aktuellerTeilnehmer.vorname)}
                ${escapeHtml(aktuellerTeilnehmer.nachname)}
            </strong>

            <span>
                ${aktuelleStarts.length}
                ${aktuelleStarts.length === 1 ? "Start" : "Starts"}
                in diesem Wettkampf
            </span>

        </div>

    `;


    select.innerHTML = `
        <option value="">
            Start auswählen ...
        </option>
    `;


    if (aktuelleStarts.length === 0) {

        const option =
            document.createElement("option");

        option.value =
            "";

        option.textContent =
            "Für diesen Teilnehmer existiert kein Start.";

        option.disabled =
            true;

        select.appendChild(
            option
        );

        bereichAusblenden(
            "ergebnis-bereich"
        );

        bereichAusblenden(
            "gespeicherte-ergebnisse-bereich"
        );

        return;

    }


    aktuelleStarts.forEach(
        function(start, index) {

            const option =
                document.createElement("option");

            option.value =
                start.id;


            let text =
                `Start ${index + 1}`;


            if (start.team_id && start.teams) {

                text +=
                    ` – ${start.teams.name}`;

            } else {

                text +=
                    " – Einzel";

            }


            if (start.ak) {

                text +=
                    " – AK";

            }


            option.textContent =
                text;


            select.appendChild(
                option
            );

        }
    );


    if (aktuelleStarts.length === 1) {

        select.value =
            aktuelleStarts[0].id;

        startAusgewaehlt();

    }

}


// ==========================================================
// START AUSWÄHLEN
// ==========================================================

async function startAusgewaehlt() {

    const select =
        element("start-auswahl");

    if (!select) {
        return;
    }


    const startId =
        select.value;


    aktuellerStart =
        aktuelleStarts.find(
            function(start) {

                return start.id === startId;

            }
        ) || null;


    bereichAusblenden(
        "ergebnis-bereich"
    );

    bereichAusblenden(
        "gespeicherte-ergebnisse-bereich"
    );


    if (!aktuellerStart) {

        return;

    }


    startInformationAnzeigen();


    await ergebnisseDesStartsLaden();

}


// ==========================================================
// START INFORMATIONEN
// ==========================================================

function startInformationAnzeigen() {

    const info =
        element("start-information");

    if (!info || !aktuellerStart) {
        return;
    }


    let wertung =
        "Einzelstart";


    if (aktuellerStart.team_id) {

        wertung =
            aktuellerStart.teams?.name ||
            "Team";

    }


    if (aktuellerStart.ak) {

        wertung +=
            " – AK";

    }


    info.innerHTML = `

        <div class="start-information">

            <strong>
                ${escapeHtml(wertung)}
            </strong>

        </div>

    `;

}


// ==========================================================
// ERGEBNISSE DES STARTS LADEN
// ==========================================================

async function ergebnisseDesStartsLaden() {

    if (!aktuellerStart) {
        return;
    }


    const {
        data,
        error
    } = await supabaseClient

        .from("results")

        .select(`
            id,
            start_id,
            nummer,
            wert,
            created_at
        `)

        .eq(
            "start_id",
            aktuellerStart.id
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

        setMeldung(
            "ergebnis-meldung",
            "Fehler beim Laden der Ergebnisse.",
            "fehler"
        );

        return;

    }


    ergebnisFormularAnzeigen(
        data || []
    );

}


// ==========================================================
// ERGEBNISFORMULAR
// ==========================================================

function ergebnisFormularAnzeigen(
    vorhandeneErgebnisse
) {

    const bereich =
        element("ergebnis-bereich");

    const felder =
        element("ergebnis-felder");

    const hinweis =
        element("ergebnis-hinweis");

    if (
        !bereich ||
        !felder
    ) {

        return;

    }


    const anzahl =
        Number(
            aktuellerWettkampf?.anzahl_ergebnisse
        ) || 3;


    const maximum =
        Math.min(
            Math.max(
                anzahl,
                1
            ),
            10
        );


    bereichEinblenden(
        "ergebnis-bereich"
    );


    if (hinweis) {

        hinweis.textContent =
            `Bitte ${maximum} Ergebnisse erfassen. Bereits gespeicherte Werte können jederzeit geändert werden.`;

    }


    felder.innerHTML = "";


    const werte =
        {};


    vorhandeneErgebnisse.forEach(
        function(ergebnis) {

            werte[
                ergebnis.nummer
            ] =
                ergebnis.wert;

        }
    );


    for (
        let nummer = 1;
        nummer <= maximum;
        nummer++
    ) {

        const gruppe =
            document.createElement("div");

        gruppe.className =
            "form-group";


        const label =
            document.createElement("label");

        label.setAttribute(
            "for",
            `ergebnis-${nummer}`
        );

        label.textContent =
            `Ergebnis ${nummer}`;


        const input =
            document.createElement("input");

        input.type =
            "text";

        input.id =
            `ergebnis-${nummer}`;

        input.name =
            `ergebnis-${nummer}`;

        input.inputMode =
            "decimal";

        input.placeholder =
            "z. B. 12,40";


        if (
            werte[nummer] !== undefined
        ) {

            input.value =
                formatZahl(
                    werte[nummer]
                );

        }


        gruppe.appendChild(
            label
        );

        gruppe.appendChild(
            input
        );


        felder.appendChild(
            gruppe
        );

    }


    gespeicherteErgebnisseAnzeigen(
        vorhandeneErgebnisse
    );

}


// ==========================================================
// GESPEICHERTE ERGEBNISSE
// ==========================================================

function gespeicherteErgebnisseAnzeigen(
    ergebnisse
) {

    const bereich =
        element("gespeicherte-ergebnisse-bereich");

    const container =
        element("gespeicherte-ergebnisse");

    if (
        !bereich ||
        !container
    ) {

        return;

    }


    if (!ergebnisse.length) {

        bereichAusblenden(
            "gespeicherte-ergebnisse-bereich"
        );

        container.innerHTML =
            "";

        return;

    }


    bereichEinblenden(
        "gespeicherte-ergebnisse-bereich"
    );


    container.innerHTML =
        ergebnisse
            .map(
                function(ergebnis) {

                    return `

                        <div class="gespeichertes-ergebnis">

                            <strong>
                                Ergebnis ${ergebnis.nummer}
                            </strong>

                            <span>
                                ${formatZahl(ergebnis.wert)}
                            </span>

                        </div>

                    `;

                }
            )
            .join("");

}


// ==========================================================
// ERGEBNISSE SPEICHERN
// ==========================================================

async function ergebnisseSpeichern(
    event
) {

    event.preventDefault();


    if (
        !aktuellerWettkampf ||
        !aktuellerStart
    ) {

        setMeldung(
            "ergebnis-meldung",
            "Bitte zuerst einen Start auswählen.",
            "fehler"
        );

        return;

    }


    const anzahl =
        Number(
            aktuellerWettkampf.anzahl_ergebnisse
        ) || 3;


    const maximum =
        Math.min(
            Math.max(
                anzahl,
                1
            ),
            10
        );


    const zuSpeichern =
        [];


    for (
        let nummer = 1;
        nummer <= maximum;
        nummer++
    ) {

        const input =
            element(
                `ergebnis-${nummer}`
            );


        if (!input) {
            continue;
        }


        const text =
            input.value.trim();


        // Leeres Feld = kein Ergebnis.
        if (!text) {
            continue;
        }


        const wert =
            zahlAusEingabe(
                text
            );


        if (
            wert === null
        ) {

            setMeldung(
                "ergebnis-meldung",
                `Ergebnis ${nummer} ist keine gültige Zahl.`,
                "fehler"
            );

            input.focus();

            return;

        }


        zuSpeichern.push({

            start_id:
                aktuellerStart.id,

            nummer:
                nummer,

            wert:
                wert

        });

    }


    if (
        zuSpeichern.length === 0
    ) {

        setMeldung(
            "ergebnis-meldung",
            "Bitte mindestens ein Ergebnis eingeben.",
            "fehler"
        );

        return;

    }


    setMeldung(
        "ergebnis-meldung",
        "Ergebnisse werden gespeichert ..."
    );


    // ======================================================
    // ALTE ERGEBNISSE DES STARTS LÖSCHEN
    // ======================================================

    const {
        error: deleteError
    } = await supabaseClient

        .from("results")

        .delete()

        .eq(
            "start_id",
            aktuellerStart.id
        );


    if (deleteError) {

        console.error(
            "Fehler beim Löschen alter Ergebnisse:",
            deleteError
        );

        setMeldung(
            "ergebnis-meldung",
            "Die bisherigen Ergebnisse konnten nicht aktualisiert werden.",
            "fehler"
        );

        return;

    }


    // ======================================================
    // NEUE ERGEBNISSE SPEICHERN
    // ======================================================

    const {
        error: insertError
    } = await supabaseClient

        .from("results")

        .insert(
            zuSpeichern
        );


    if (insertError) {

        console.error(
            "Fehler beim Speichern:",
            insertError
        );


        setMeldung(
            "ergebnis-meldung",
            "Fehler beim Speichern der Ergebnisse.",
            "fehler"
        );

        return;

    }


    setMeldung(
        "ergebnis-meldung",
        "Ergebnisse erfolgreich gespeichert.",
        "erfolg"
    );


    await ergebnisseDesStartsLaden();

}


// ==========================================================
// BEREICH EINBLENDEN
// ==========================================================

function bereichEinblenden(id) {

    const el =
        element(id);

    if (!el) {
        return;
    }

    el.style.display =
        "";

}


// ==========================================================
// BEREICH AUSBLENDEN
// ==========================================================

function bereichAusblenden(id) {

    const el =
        element(id);

    if (!el) {
        return;
    }

    el.style.display =
        "none";

}


// ==========================================================
// EVENT LISTENER
// ==========================================================

function eventsEinrichten() {


    // ------------------------------------------------------
    // WETTKAMPF
    // ------------------------------------------------------

    const wettkampfSelect =
        element(
            "wettkampf-auswahl"
        );


    if (wettkampfSelect) {

        wettkampfSelect.addEventListener(
            "change",
            wettkampfAusgewaehlt
        );

    }


    // ------------------------------------------------------
    // TEILNEHMERSUCHE
    // ------------------------------------------------------

    const suche =
        element(
            "starter-suche"
        );


    if (suche) {

        suche.addEventListener(
            "input",
            function() {

                clearTimeout(
                    suchTimer
                );


                suchTimer =
                    setTimeout(
                        teilnehmerSuchen,
                        100
                    );

            }
        );

    }


    // ------------------------------------------------------
    // STARTAUSWAHL
    // ------------------------------------------------------

    const startSelect =
        element(
            "start-auswahl"
        );


    if (startSelect) {

        startSelect.addEventListener(
            "change",
            startAusgewaehlt
        );

    }


    // ------------------------------------------------------
    // ERGEBNISFORMULAR
    // ------------------------------------------------------

    const form =
        element(
            "ergebnis-form"
        );


    if (form) {

        form.addEventListener(
            "submit",
            ergebnisseSpeichern
        );

    }

}


// ==========================================================
// START
// ==========================================================

async function startApp() {

    eventsEinrichten();

    await wettkaempfeLaden();


    // ------------------------------------------------------
    // OPTIONAL:
    // WETTKAMPF AUS URL ÜBERNEHMEN
    // ------------------------------------------------------

    const params =
        new URLSearchParams(
            window.location.search
        );


    const wettkampfId =
        params.get(
            "wettkampf"
        );


    if (wettkampfId) {

        const select =
            element(
                "wettkampf-auswahl"
            );


        if (select) {

            select.value =
                wettkampfId;


            if (
                select.value === wettkampfId
            ) {

                await wettkampfAusgewaehlt();

            }

        }

    }

}


// ==========================================================
// ANWENDUNG STARTEN
// ==========================================================

startApp();
