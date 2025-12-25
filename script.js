/**
 * Minimal transcript highlighter for HTML5 <audio> + WebVTT.
 * - Renders cues into a clickable transcript list
 * - Highlights the active cue as audio plays
 * - Optional auto-scroll
 *
 * Works best in Chromium browsers; also works in Firefox in most cases.
 */

function formatTime(seconds) {
  const s = Math.max(0, seconds || 0);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function setupCard(card) {
  const audio = card.querySelector("audio.player");
  const transcriptEl = card.querySelector(".transcript");
  const details = card.querySelector("details.transcript-wrap");
  const autoScrollCheckbox = card.querySelector('input[data-action="auto-scroll"]');

  if (!audio || !transcriptEl) return;

  // Ensure text tracks are accessible
  const track = audio.textTracks && audio.textTracks[0];
  if (!track) {
    transcriptEl.innerHTML =
      "<p>⚠️ No WebVTT track found. Add a .vtt file and a &lt;track&gt; tag.</p>";
    return;
  }

  // Hide native captions UI; we render our own transcript.
  track.mode = "hidden";

  const lines = [];
  let cueToLine = new Map();

  function renderFromCues() {
    transcriptEl.innerHTML = "";
    lines.length = 0;
    cueToLine = new Map();

    const cues = track.cues ? Array.from(track.cues) : [];
    if (!cues.length) {
      transcriptEl.innerHTML =
        "<p>Loading transcript… If it never loads, check your .vtt path and formatting.</p>";
      return;
    }

    cues.forEach((cue, idx) => {
      const div = document.createElement("div");
      div.className = "line";
      div.setAttribute("data-idx", String(idx));
      div.setAttribute("role", "button");
      div.setAttribute("tabindex", "0");

      const time = document.createElement("span");
      time.className = "time";
      time.textContent = formatTime(cue.startTime);

      const text = document.createElement("span");
      // cue.text is plain text; we keep it simple for safety.
      text.textContent = cue.text;

      div.appendChild(time);
      div.appendChild(text);

      const jump = () => {
        audio.currentTime = cue.startTime + 0.01; // nudge to ensure cue activates
        audio.play().catch(() => {
          /* autoplay may be blocked; that's fine */
        });
      };

      div.addEventListener("click", jump);
      div.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          jump();
        }
      });

      transcriptEl.appendChild(div);
      lines.push(div);
      cueToLine.set(cue, div);
    });
  }

  // Some browsers populate cues after metadata/track loads.
  // Try a few times quickly rather than leaving the user stuck.
  let attempts = 0;
  const maxAttempts = 20;
  const timer = setInterval(() => {
    attempts += 1;
    if (track.cues && track.cues.length) {
      clearInterval(timer);
      renderFromCues();
    } else if (attempts >= maxAttempts) {
      clearInterval(timer);
      renderFromCues();
    }
  }, 150);

  function clearActive() {
    lines.forEach((l) => l.classList.remove("active"));
  }

  function setActiveCue(cue) {
    if (!cue) return;
    clearActive();

    const line = cueToLine.get(cue);
    if (!line) return;

    line.classList.add("active");

    // Only auto-scroll if transcript is open and checkbox is checked
    const doScroll = details && details.open && autoScrollCheckbox && autoScrollCheckbox.checked;

  if (doScroll) {
  const parent = transcriptEl;

  // Measure what the user actually sees (more reliable than offsetTop here)
  const parentRect = parent.getBoundingClientRect();
  const lineRect = line.getBoundingClientRect();

  const paddingTop = 20;     // px
  const paddingBottom = 30;  // px

  // If the active line is above the visible area, scroll up just enough
  if (lineRect.top < parentRect.top + paddingTop) {
    const delta = (lineRect.top - (parentRect.top + paddingTop));
    parent.scrollTop += delta;
    return;
  }

  // If the active line is below the visible area, scroll down just enough
  if (lineRect.bottom > parentRect.bottom - paddingBottom) {
    const delta = (lineRect.bottom - (parentRect.bottom - paddingBottom));
    parent.scrollTop += delta;
    return;
  }

  // Otherwise: it's visible — do nothing (no jumping)
}


  }

  // Many browsers fire cuechange with activeCues set.
  track.addEventListener("cuechange", () => {
    const active =
      track.activeCues && track.activeCues.length ? track.activeCues[0] : null;
    setActiveCue(active);
  });

  // Buttons: jump back/forward
  card.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      if (action === "jump-back") audio.currentTime = Math.max(0, audio.currentTime - 5);
      if (action === "jump-forward")
        audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 5);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".card").forEach(setupCard);
});
