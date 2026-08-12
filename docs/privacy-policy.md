# GAMEVAULT — Privacy Policy

**Last updated:** 12 August 2026
**Applies to:** the GAMEVAULT iOS app (`com.earlgreylab.gamevault`) and the GAMEVAULT website.

## Short version

GAMEVAULT has no accounts, no analytics, and no tracking. Your library lives on your
device. The only thing the app ever sends anywhere is a barcode number you explicitly
choose to scan.

## What is stored, and where

Everything GAMEVAULT saves about you stays in local storage on your own device. There
is no GAMEVAULT server and no cloud sync.

| Data | Where it lives | How it is removed |
|---|---|---|
| Your favourites | `gv-favourites` in local device storage | Delete the app |
| Games you added by scanning | `gv_local_additions` in local device storage | Delete the app |
| The bundled game library | Read-only file shipped inside the app | — |

Because this is device-local, your favourites and scanned additions do **not** transfer
between devices or installs, and nobody but you can see them.

## Camera

The Scan tab uses the camera to read the barcode on a game case. Specifically:

- The camera is only ever active while the Scan tab is open.
- Video frames are decoded to a barcode number **on your device**, inside the app. The
  decoding library runs locally; no frame is uploaded.
- No photo, video, or camera frame is saved, stored, or transmitted — not to us, not to
  anyone else.

iOS will ask for camera permission the first time you open the Scan tab. Declining it
disables scanning and nothing else.

## What leaves your device

Three things cause an outbound network request. None of them involve an identity,
account, or advertising identifier.

1. **Barcode lookups → PriceCharting.** When a barcode is decoded, the *number* is sent
   to PriceCharting's product API to retrieve current pricing. Only the barcode number
   is sent. This happens only when you scan something.
2. **Cover artwork → Steam's CDN (Valve/Akamai).** Game cover images are loaded from
   Steam's public content network as the library renders.
3. **Fonts → Google Fonts.** The app's typefaces are loaded from Google's font CDN.

For all three, the operator of that service necessarily sees your IP address and the
standard request metadata any web request carries — this is inherent to fetching a
resource from a third party, not something GAMEVAULT adds. Their handling of that data
is governed by their own privacy policies:

- PriceCharting — <https://www.pricecharting.com/privacy>
- Valve/Steam — <https://store.steampowered.com/privacy_agreement/>
- Google — <https://policies.google.com/privacy>

## What GAMEVAULT does not do

- No user accounts, sign-up, or login.
- No analytics, telemetry, crash reporting, or usage measurement.
- No advertising, ad networks, or advertising identifiers.
- No third-party tracking SDKs of any kind.
- No selling or sharing of personal data — there is none to sell.
- No location, contacts, microphone, photo library, or health data access.

## Children

GAMEVAULT collects no personal information from anyone, including children under 13.

## Changes

Any change to this policy will be published with an updated date at the top. Material
changes will be noted in the app's release notes.

## Contact

Questions about this policy: **open an issue on the project GitHub repository**
