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

Current mode:
- `STRICT_EXTERNAL_DATA = true` in `index.html`
- Data is expected at `data/games.json`
- If missing, app intentionally does not fall back to inline records
