// ==========================================================
// SSV 1928 SULZBACH E.V.
// SUPABASE KONFIGURATION
// ==========================================================


// ==========================================================
// SUPABASE DATEN
// ==========================================================

const SUPABASE_URL =
    "https://pvvdbcvdhggqbembqrda.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_UABPYPapTKw-L2Ut_osECg_sDnwWdnL";


// ==========================================================
// SUPABASE CLIENT
// ==========================================================

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ==========================================================
// GLOBALE HILFSFUNKTIONEN
// ==========================================================

function formatZahl(wert) {

    if (
        wert === null ||
        wert === undefined ||
        wert === ""
    ) {

        return "-";

    }


    const zahl =
        Number(wert);


    if (
        Number.isNaN(
            zahl
        )
    ) {

        return "-";

    }


    return zahl
        .toFixed(2)
        .replace(".", ",");

}


function formatDatum(datum) {

    if (!datum) {

        return "-";

    }


    const teile =
        String(datum).split("-");


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


function escapeHtml(text) {

    if (
        text === null ||
        text === undefined
    ) {

        return "";

    }


    return String(text)
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
// URL-PARAMETER
// ==========================================================

function urlParameter(
    name
) {

    const params =
        new URLSearchParams(
            window.location.search
        );


    return params.get(
        name
    );

}


// ==========================================================
// WETTKAMPF-ID
// ==========================================================

function wettkampfIdAusUrl() {

    return urlParameter(
        "id"
    );

}
