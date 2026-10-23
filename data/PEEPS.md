# Peeps — the character models of Crystal and Mindy

Drop the finished images in `assets/img/peeps/` and describe them in `data/peeps.json`:

```json
{
  "peeps": [
    { "id": "crystal", "name": "Crystal", "role": "The one with the tickets", "image": "assets/img/peeps/crystal.png", "pose_alt": {"night": "assets/img/peeps/crystal-night.png"}, "line": "One short line in her voice (optional)" },
    { "id": "mindy",   "name": "Mindy",   "role": "...", "image": "assets/img/peeps/mindy.png" }
  ],
  "show_in": ["header", "tonight"]
}
```

- PNG with a transparent background (or SVG) renders best; ~800px tall is plenty.
- `show_in` picks where they appear: `header` (beside the wordmark), `tonight` (standing next to the show title), `footer`.
- If `peeps.json` is missing nothing renders; the site never breaks without it.
