#!/bin/bash
# fetch_gutenberg.sh — single polite GETs of Project Gutenberg plain-text books (US public domain).
# One request per book, 4 s apart, identifying User-Agent; no crawling, no index pages.
UA="khora-notation-closed-codes/1.0 (research; polite single-file requests)"
OUT=/private/tmp/claude-501/notation/closed_codes/raw/gutenberg
LOG=/private/tmp/claude-501/notation/closed_codes/logs/fetch_gutenberg.log
: > "$LOG"
# id:slug  (slug is only for our file name)
for item in 1342:pride-and-prejudice 2701:moby-dick 1228:origin-of-species 98:tale-of-two-cities \
            84:frankenstein 34901:on-liberty \
            1661:sherlock-holmes 345:dracula 132:art-of-war 35:time-machine; do
  id=${item%%:*}; slug=${item##*:}
  url="https://www.gutenberg.org/cache/epub/$id/pg$id.txt"
  code=$(curl -sS -L -m 90 -A "$UA" -o "$OUT/pg$id-$slug.txt" -w "%{http_code}" "$url")
  sz=$(wc -c < "$OUT/pg$id-$slug.txt")
  echo "$(date -u +%FT%TZ) $id $slug $url $code $sz" | tee -a "$LOG"
  sleep 4
done
