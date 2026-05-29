Data contract used by `index.html` runtime.

- `IMG`: object map of game title -> image URL (usually Steam header URL)
- `GAMES`: array of game objects with keys:
  - `t`: title (string)
  - `y`: year (number)
  - `g`: genre key (string)
  - `vita`: `yes` | `warn` | `no`
  - `p`: platform key (optional, defaults to `PC`)
  - `f`: flags array (`must`, `owned`, `coop`, `online`, etc.)
  - `d`: description (string)
  - `cover`: optional image URL or local path for the card cover
  - `consoleCover`: optional explicit cover URL for console titles (Nintendo/PlayStation)
  - `steamId`: optional Steam app ID for modal hero / portrait fallbacks

Current mode:
- `STRICT_EXTERNAL_DATA = true` in `index.html`
- Data is expected at `data/games.json`
- If missing, app intentionally does not fall back to inline records
- For console covers, the app also looks for local files under `covers/<platform>/<slug>.jpg`
  where `<platform>` is one of `ps1`, `ps2`, `ps3`, `psp`, `vita`, `nds`, `n3ds`, `wii`, `wiiu`, `nsw`
