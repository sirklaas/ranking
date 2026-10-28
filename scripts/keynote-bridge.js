#!/usr/bin/env node

/**
 * Keynote -> RankingNW Flic Bridge
 * 
 * Luistert naar slide-wisselingen in Keynote die worden getriggerd door je Flic 2 knop.
 * Vertaalt deze direct naar ArrowRight / ArrowLeft in je browser (Safari of Chrome)
 * zodat RankingNW synchroon doorschakelt ZONDER dat je je Flic instellingen hoeft aan te passen!
 */

const { execSync } = require('child_process');

console.log('\n=============================================================');
console.log('🎤 RankingNW <-> Keynote Flic Bridge');
console.log('=============================================================');
console.log('Druk 1x op je Flic knop = Volgende fase (ArrowRight)');
console.log('Druk 2x op je Flic knop = Vorige fase (ArrowLeft)');
console.log('Zorg dat je Keynote presentatie geopend is en afspeelt');
console.log('(Tip: Kies in Keynote: Diavoorstelling -> Speel af in venster)\n');

let lastSlide = null;
let lastPlaying = false;
let slidesPadded = false;

function runAppleScript(script) {
  try {
    return execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 1000
    }).trim();
  } catch (err) {
    return null;
  }
}

// Zorg dat de Keynote presentatie voldoende slides heeft (minstens 80)
function ensureSlides() {
  if (slidesPadded) return;
  const script = `
    tell application "Keynote"
      if (count of documents) > 0 then
        set doc to front document
        set c to count of slides of doc
        if c < 80 then
          repeat (80 - c) times
            make new slide at end of doc
          end repeat
        end if
        return count of slides of doc
      end if
      return 0
    end tell
  `;
  const count = runAppleScript(script);
  if (count && parseInt(count, 10) >= 80) {
    slidesPadded = true;
    console.log(`[Bridge] ✓ Keynote document voorbereid met ${count} slides.`);
  }
}

function sendKey(keyCode, directionName) {
  const script = `
    tell application "System Events"
      set pList to name of processes
      if pList contains "Safari" then
        tell application "Safari" to activate
      else if pList contains "Google Chrome" then
        tell application "Google Chrome" to activate
      end if
      delay 0.03
      key code ${keyCode}
    end tell
  `;
  runAppleScript(script);
}

function checkKeynote() {
  const script = `
    tell application "Keynote"
      if not (exists front document) then return "NO_DOC"
      if playing is true then
        tell front document
          return "PLAYING:" & (slide number of current slide)
        end tell
      else
        tell front document
          return "READY:" & (slide number of current slide)
        end tell
      end if
    end tell
  `;

  const status = runAppleScript(script);

  if (!status || status === 'NO_DOC') {
    if (lastPlaying) {
      console.log('[Bridge] ⏹️ Keynote gesloten of gestopt.');
      lastPlaying = false;
      lastSlide = null;
    }
    return;
  }

  ensureSlides();

  if (status.startsWith('PLAYING:')) {
    const currentSlide = parseInt(status.replace('PLAYING:', ''), 10) || 1;

    if (!lastPlaying) {
      lastPlaying = true;
      lastSlide = currentSlide;
      console.log(`[Bridge] ▶️ Keynote diavoorstelling actief (gestart op slide ${currentSlide})`);
      console.log('[Bridge] 🎯 Klaar voor Flic klikken!\n');
      return;
    }

    if (lastSlide !== null && currentSlide !== lastSlide) {
      if (currentSlide > lastSlide) {
        console.log(`[Bridge] 🟢 VOLGENDE (Slide ${lastSlide} -> ${currentSlide}) -> RankingNW Volgende Fase ▶️`);
        sendKey(124, 'ArrowRight');
      } else {
        console.log(`[Bridge] 🔴 VORIGE (Slide ${lastSlide} -> ${currentSlide}) -> RankingNW Vorige Fase ◀️`);
        sendKey(123, 'ArrowLeft');
      }
      lastSlide = currentSlide;
    }
  } else if (status.startsWith('READY:')) {
    if (lastPlaying) {
      console.log('[Bridge] ⏸️ Diavoorstelling gepauzeerd/gestopt. Start opnieuw via "Speel af in venster".');
      lastPlaying = false;
      lastSlide = null;
    }
  }
}

// Hoofd-loop met snelle respons (~75ms poll)
setInterval(checkKeynote, 75);
checkKeynote();
