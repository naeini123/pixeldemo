// ─── Meta Conversions API (CAPI) – Purchase Event ─────────────────────────────
// Sends a server-side Purchase event to Meta's Conversions API.
// This runs entirely in the browser for static sites (no Node/server required).
//
// Configuration
const CAPI_PIXEL_ID     = '935724062207149';
const CAPI_ACCESS_TOKEN = 'EAAUqKAlvZC5EBQ9zScIwbZBJ221V5vvWgo3gNKDMsLVezOZC2dMJsA6ObddsxWu07VxTSbMJuMYd0kD7MqYxm2ljXELd9fvyKUcWIJhqqkGnGtrPlNffzdSRz1sciQOZCw7mjPpcDUlTblp453ZAw1qbcTZAPHTqPc65H93LB8oYZArpr4bBMG6vHKgP9dD1gZDZD';
const CAPI_TEST_CODE    = 'TEST44494';
const CAPI_API_VERSION  = 'v21.0';
const CAPI_ENDPOINT     = `https://graph.facebook.com/${CAPI_API_VERSION}/${CAPI_PIXEL_ID}/events`;

// ─── Utility: SHA-256 hash (returns lowercase hex string) ─────────────────────
async function sha256(value) {
    if (!value) return '';
    const normalized = value.trim().toLowerCase();
    const msgBuffer  = new TextEncoder().encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// ─── Utility: generate a random event ID for deduplication ────────────────────
function generateEventId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

// ─── Main: send CAPI Purchase event ───────────────────────────────────────────
// Returns a Promise that resolves once the CAPI request completes (or fails).
// The caller MUST await this before navigating away from the page so the
// browser does not cancel the in-flight request on unload.
//
// Parameters:
//   eventId       – shared UUID used for browser-pixel deduplication
//   email         – raw email string (will be hashed)
//   city          – raw city string  (will be normalised + hashed)
//   zip           – raw zip string   (will be hashed)
//   contents      – array of { id, quantity } objects
//   contentIds    – array of content_id strings
//   numItems      – total item count
//   value         – order total (number)
async function sendCapiPurchase({ eventId, email, city, zip, contents, contentIds, numItems, value }) {
    // Hash PII fields as required by Meta
    const [hashedEmail, hashedCity, hashedZip] = await Promise.all([
        sha256(email),
        sha256(city ? city.toLowerCase().replace(/\s+/g, '') : ''),
        sha256(zip)
    ]);

    const userData = {};
    if (hashedEmail) userData.em = [hashedEmail];
    if (hashedCity)  userData.ct = [hashedCity];
    if (hashedZip)   userData.zp = [hashedZip];

    const payload = {
        data: [
            {
                event_name:       'Purchase',
                event_time:       Math.floor(Date.now() / 1000),
                event_source_url: window.location.href,
                action_source:    'website',
                event_id:         eventId,
                user_data:        userData,
                custom_data: {
                    content_ids:  contentIds,
                    content_type: 'product',
                    contents:     contents,
                    currency:     'USD',
                    num_items:    numItems,
                    value:        value
                }
            }
        ],
        test_event_code: CAPI_TEST_CODE
    };

    try {
        // keepalive: true ensures the browser completes this request even if the
        // page navigates away immediately after (fixes the redirect-race condition).
        const response = await fetch(
            `${CAPI_ENDPOINT}?access_token=${CAPI_ACCESS_TOKEN}`,
            {
                method:    'POST',
                headers:   { 'Content-Type': 'application/json' },
                body:      JSON.stringify(payload),
                keepalive: true
            }
        );
        const result = await response.json();
        if (!response.ok) {
            console.error('[CAPI] Error response:', result);
        } else {
            console.log('[CAPI] Purchase event sent successfully:', result);
        }
    } catch (err) {
        console.error('[CAPI] Failed to send Purchase event:', err);
    }
}
