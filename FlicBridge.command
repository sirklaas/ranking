#!/bin/bash

# Clear terminal screen
clear
echo "============================================================="
echo "🎤 RankingNW <-> Keynote Flic Bridge"
echo "============================================================="
echo "1x klikken op Flic = Volgende fase (ArrowRight)"
echo "2x klikken op Flic = Vorige fase (ArrowLeft)"
echo ""
echo "Zorg dat Keynote open staat en op 'Speel af in venster' staat."
echo "Laat dit zwarte venstertje gewoon op de achtergrond open staan."
echo "============================================================="
echo ""

# Zorg dat Keynote document voldoende lege slides heeft (minimaal 80)
osascript -e '
tell application "Keynote"
  if (count of documents) > 0 then
    set doc to front document
    set c to count of slides of doc
    if c < 80 then
      repeat (80 - c) times
        make new slide at end of doc
      end repeat
    end if
  end if
end tell
' 2>/dev/null

LAST_SLIDE=0
LAST_PLAYING=0

while true; do
  STATUS=$(osascript -e '
  tell application "Keynote"
    if not (exists front document) then return "NO_DOC"
    if playing is true then
      tell front document
        return "PLAYING:" & (slide number of current slide)
      end tell
    else
      return "READY"
    end if
  end tell
  ' 2>/dev/null)

  if [[ "$STATUS" =~ ^PLAYING:([0-9]+)$ ]]; then
    CUR_SLIDE="${BASH_REMATCH[1]}"
    
    if [ "$LAST_PLAYING" -eq 0 ]; then
      echo "▶️ Keynote diavoorstelling actief (gestart op slide $CUR_SLIDE)"
      echo "🎯 Klaar voor Flic klikken!"
      echo ""
      LAST_PLAYING=1
      LAST_SLIDE=$CUR_SLIDE
    elif [ "$CUR_SLIDE" -ne "$LAST_SLIDE" ]; then
      if [ "$CUR_SLIDE" -gt "$LAST_SLIDE" ]; then
        echo "🟢 VOLGENDE (Slide $LAST_SLIDE -> $CUR_SLIDE) -> Volgende Fase ▶️"
        osascript -e '
        tell application "System Events"
          set pList to name of processes
          if pList contains "Safari" then
            tell application "Safari" to activate
          else if pList contains "Google Chrome" then
            tell application "Google Chrome" to activate
          end if
          delay 0.03
          key code 124
        end tell
        ' 2>/dev/null
      else
        echo "🔴 VORIGE (Slide $LAST_SLIDE -> $CUR_SLIDE) -> Vorige Fase ◀️"
        osascript -e '
        tell application "System Events"
          set pList to name of processes
          if pList contains "Safari" then
            tell application "Safari" to activate
          else if pList contains "Google Chrome" then
            tell application "Google Chrome" to activate
          end if
          delay 0.03
          key code 123
        end tell
        ' 2>/dev/null
      fi
      LAST_SLIDE=$CUR_SLIDE
    fi
  else
    if [ "$LAST_PLAYING" -eq 1 ]; then
      echo "⏸️ Diavoorstelling gestopt of gepauzeerd."
      LAST_PLAYING=0
      LAST_SLIDE=0
    fi
  fi

  sleep 0.08
done
