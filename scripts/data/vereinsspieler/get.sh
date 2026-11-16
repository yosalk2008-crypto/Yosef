#!/bin/bash
# get.sh <lang> <title> <out>
t=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1].replace(' ','_')))" "$2")
for i in 1 2 3; do
  curl -sS -m 40 -A "koshertrivia-data/1.0 (quiz game; low volume)" "https://$1.wikipedia.org/w/index.php?title=$t&action=raw" -o "$3"
  if grep -q "too many requests" "$3"; then sleep 20; else break; fi
done
r=$(grep -oiP '^#(REDIRECT|REDIRECTION|WEITERLEITUNG|RINVIA|REDIRECCIÓN)\s*\[\[\K[^\]]+' "$3")
if [ -n "$r" ]; then echo "redirect -> $r"; sleep 3; exec "$0" "$1" "$r" "$3"; fi
echo "$3 $(wc -c <"$3") bytes"
