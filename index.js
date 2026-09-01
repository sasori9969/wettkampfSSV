
// ==========================================================
// SSV 1928 SULZBACH E.V.
// STARTSEITE
// ==========================================================


// ==========================================================
// SUPABASE VERBINDUNG TESTEN
// ==========================================================

async function systemStatusPruefen() {

    const status =
        document.getElementById(
            "system-status"
        );


    if (!status) {

        return;

    }


    status.textContent =
        "Verbindung wird geprüft ...";


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("participants")

            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            );


        if (error) {

            console.error(
                "Supabase-Verbindungsfehler:",
                error
            );


            status.textContent =
                "❌ Datenbankverbindung fehlgeschlagen.";

            status.className =
                "status-fehler";


            return;

        }


        status.textContent =
            "✅ Datenbankverbindung erfolgreich.";

        status.className =
            "status-ok";


    } catch (error) {

        console.error(
            "Unerwarteter Fehler:",
            error
        );


        status.textContent =
            "❌ Verbindung konnte nicht hergestellt werden.";

        status.className =
            "status-fehler";

    }

}


// ==========================================================
// START
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        systemStatusPruefen();

    }
);
