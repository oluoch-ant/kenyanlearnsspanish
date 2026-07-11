#!/bin/sh
# Assembles the self-contained artifact page (content-only, no doctype/html/head/body)
# and a doctype-wrapped index.html for local preview.
cd "$(dirname "$0")"

APP_SRC="${1:-app.js}"
OUT="dashboard-artifact.html"

{
  echo '<title>Oluoch aprende español</title>'
  echo '<style>'
  cat base.css
  echo '</style>'
  echo '<script>'
  cat tailwind-play.js
  echo '</script>'
  echo '<script>'
  cat tailwind-config.js
  echo '</script>'
  echo '<script>'
  cat react.min.js
  echo '</script>'
  echo '<script>'
  cat react-dom.min.js
  echo '</script>'
  echo '<script>'
  cat htm.min.js
  echo '</script>'
  echo '<div id="root" class="ground"></div>'
  echo '<script>'
  cat data.js
  cat "$APP_SRC"
  echo '</script>'
} > "$OUT"

{
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>'
  cat "$OUT"
  echo '</body></html>'
} > index.html

echo "built: $OUT ($(wc -c < "$OUT") bytes), index.html ($(wc -c < index.html) bytes)"
