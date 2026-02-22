/**
 * Google Maps JS API — Singleton Loader
 * 
 * Uses the dynamic library import recommended by Google.
 * The API is loaded ONCE and all libraries are lazy-loaded on demand.
 * 
 * ⚠️ Replace YOUR_API_KEY with your actual Google Maps API key.
 *    Store it in .env as VITE_GOOGLE_MAPS_API_KEY for security.
 * 
 * Docs: https://developers.google.com/maps/documentation/javascript/load-maps-js-api#dynamic-library-import?utm_source=gmp-code-assist
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

let loaderPromise = null;

/**
 * Initializes the Google Maps JS API with the dynamic loader.
 * Safe to call multiple times — only loads once.
 */
function initLoader() {
    if (loaderPromise) return loaderPromise;

    if (!API_KEY) {
        console.warn('[GoogleMapsLoader] VITE_GOOGLE_MAPS_API_KEY is not set. Maps will not load.');
        loaderPromise = Promise.reject(new Error('Google Maps API key not configured'));
        return loaderPromise;
    }

    loaderPromise = new Promise((resolve, reject) => {
        // Inject the loader script only once
        if (window.google?.maps?.importLibrary) {
            resolve(window.google.maps);
            return;
        }

        ((g) => {
            var h, a, k, p = "The Google Maps JavaScript API",
                c = "google", l = "importLibrary", q = "__ib__",
                m = document, b = window;
            b = b[c] || (b[c] = {});
            var d = b.maps || (b.maps = {}),
                r = new Set, e = new URLSearchParams,
                u = () => h || (h = new Promise((f, n) => {
                    a = m.createElement("script");
                    e.set("libraries", [...r] + "");
                    for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]);
                    e.set("callback", c + ".maps." + q);
                    a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
                    d[q] = f;
                    a.onerror = () => h = n(Error(p + " could not load."));
                    a.nonce = m.querySelector("script[nonce]")?.nonce || "";
                    m.head.append(a);
                }));
            d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
        })({
            key: API_KEY,
            v: "weekly",
            internalUsageAttributionIds: "gmp_mcp_codeassist_v0.1_github"
        });

        // Wait for the loader to be ready
        const checkReady = () => {
            if (window.google?.maps?.importLibrary) {
                resolve(window.google.maps);
            } else {
                setTimeout(checkReady, 100);
            }
        };
        checkReady();
    });

    return loaderPromise;
}

/**
 * Import a Google Maps library by name.
 * @param {string} libraryName - e.g. 'maps', 'marker', 'routes', 'geocoding'
 * @returns {Promise<object>}
 */
export async function importLibrary(libraryName) {
    await initLoader();
    return window.google.maps.importLibrary(libraryName);
}

/**
 * Check if the API key is configured
 */
export function isApiKeyConfigured() {
    return !!API_KEY;
}

export default { importLibrary, isApiKeyConfigured };
