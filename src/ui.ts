export const UI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PocketCoach AI — Voice & Rhythm Trainer</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --accent: #38bdf8;
      --text: #f8fafc;
      --muted: #94a3b8;
    }
    body.whiplash {
      --bg: #180909;
      --card: #2c1010;
      --accent: #ef4444;
    }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
    body {
      margin: 0; padding: 24px; background: var(--bg); color: var(--text);
      display: flex; justify-content: center; transition: background 0.3s;
    }
    .container { max-width: 720px; width: 100%; }
    header {
      display: flex; justify-content: space-between; align-items: center;
      background: var(--card); padding: 16px 20px; border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08); margin-bottom: 18px;
    }
    .toggle-label {
      display: flex; align-items: center; gap: 8px; cursor: pointer;
      font-size: 0.9rem; background: rgba(0,0,0,0.25); padding: 8px 12px; border-radius: 99px;
    }
    .stats-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px;
    }
    .stat-box {
      background: var(--card); padding: 14px; border-radius: 10px; text-align: center;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .stat-label { font-size: 0.78rem; color: var(--muted); text-transform: uppercase; }
    .stat-val { font-size: 1.35rem; font-weight: 700; color: var(--accent); margin-top: 4px; }
    .stage {
      background: var(--card); padding: 22px; border-radius: 12px; margin-bottom: 18px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .coach-quote {
      font-size: 1.1rem; line-height: 1.5; padding: 14px;
      background: rgba(0,0,0,0.25); border-left: 4px solid var(--accent);
      border-radius: 6px; margin-bottom: 16px;
    }
    .beats-row { display: flex; gap: 10px; margin: 16px 0; justify-content: center; }
    .beat-pill {
      padding: 10px 16px; border-radius: 8px; background: rgba(255,255,255,0.06);
      font-weight: 600; font-size: 0.9rem; min-width: 90px; text-align: center;
    }
    .controls { display: flex; gap: 10px; flex-wrap: wrap; }
    button {
      cursor: pointer; border: none; border-radius: 8px; padding: 12px 18px;
      font-weight: 600; font-size: 0.95rem; transition: opacity 0.15s;
    }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: var(--accent); color: #090d16; flex: 2; }
    .btn-voice { background: #334155; color: var(--text); flex: 1; }
    .btn-reset { background: transparent; border: 1px solid #475569; color: var(--muted); }
    .status-banner {
      margin-top: 12px; font-size: 0.9rem; color: var(--accent); min-height: 22px; font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h2 style="margin:0;">🎵 PocketCoach AI</h2>
        <small style="color:var(--muted);">Web Audio + Mic Millisecond Rhythm Trainer</small>
      </div>
      <label class="toggle-label">
        <input type="checkbox" id="roastToggle" />
        <span>🔥 Whiplash Roast Mode (Opt-In)</span>
      </label>
    </header>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label" id="meterLabel">Groove Pocket Score</div>
        <div class="stat-val" id="meterValue">75%</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Timing Tendency</div>
        <div class="stat-val" id="tendencyValue">Warming Up</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Current Drill BPM</div>
        <div class="stat-val" id="bpmValue">95 BPM</div>
      </div>
    </div>

    <div class="stage">
      <div style="font-size:0.85rem; color:var(--muted); margin-bottom:6px;">
        CURRENT EXERCISE: <strong id="drillName" style="color:var(--text);">Warm-Up Quarter Note Pocket</strong>
      </div>
      <div class="coach-quote" id="coachQuote">
        "Welcome to the studio! Click 'Play & Clap Drill'—I'll play 1 bar of synth notes, and you clap or say 'Da!' into your mic on the very next bar. Or click 'Speak to Coach' to ask for any tempo or style."
      </div>

      <div class="beats-row" id="beatsRow"></div>

      <div class="controls">
        <button class="btn-primary" id="playBtn">🥁 Play & Clap Drill (Mic)</button>
        <button class="btn-voice" id="voiceBtn">🎙️ Speak to Coach</button>
        <button class="btn-reset" id="resetBtn">Reset</button>
      </div>
      <div class="status-banner" id="statusBanner"></div>
    </div>
  </div>

  <script>
    const sessionId = localStorage.getItem("rhythm_sid") || ("sid_" + Math.random().toString(36).slice(2, 9));
    localStorage.setItem("rhythm_sid", sessionId);

    let currentDrill = {
      name: "Warm-Up Quarter Note Pocket",
      bpm: 95,
      beats: [0, 1, 2, 3],
      notesHz: [261.63, 329.63, 392.0, 523.25]
    };
    let currentMode = "supportive";

    const roastToggle = document.getElementById("roastToggle");
    const meterLabel = document.getElementById("meterLabel");
    const meterValue = document.getElementById("meterValue");
    const tendencyValue = document.getElementById("tendencyValue");
    const bpmValue = document.getElementById("bpmValue");
    const drillName = document.getElementById("drillName");
    const coachQuote = document.getElementById("coachQuote");
    const beatsRow = document.getElementById("beatsRow");
    const statusBanner = document.getElementById("statusBanner");
    const playBtn = document.getElementById("playBtn");
    const voiceBtn = document.getElementById("voiceBtn");
    const resetBtn = document.getElementById("resetBtn");

    function renderBeats(offsets = []) {
      beatsRow.innerHTML = currentDrill.beats.map((b, i) => {
        const off = offsets[i];
        const tag = off === undefined
          ? "Beat " + (b + 1)
          : (off < 0 ? off + "ms (Early)" : "+" + off + "ms (Late)");
        return '<div class="beat-pill">' + tag + '</div>';
      }).join("");
    }
    renderBeats();

    function playTone(ctx, freq, time, duration = 0.14, type = "triangle") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + duration);
    }

    async function runAudioDrill(drill) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const beatSec = 60 / drill.bpm;
      const bar1Start = ctx.currentTime + 0.25;

      statusBanner.textContent = "👂 Listen to Bar 1 (Coach plays pattern)...";

      // Schedule Bar 1 (Coach plays melody + metronome clicks)
      for (let b = 0; b < 4; b++) {
        playTone(ctx, 880, bar1Start + b * beatSec, 0.04, "sine");
      }
      drill.beats.forEach((beat, idx) => {
        playTone(ctx, drill.notesHz[idx] || 330, bar1Start + beat * beatSec, 0.18, "sawtooth");
      });

      // Schedule Bar 2 guide clicks (User claps/vocalizes in Bar 2)
      const bar2Start = bar1Start + 4 * beatSec;
      for (let b = 0; b < 4; b++) {
        playTone(ctx, 440, bar2Start + b * beatSec, 0.03, "sine");
      }

      const targetTimesMs = drill.beats.map(b => (bar2Start + b * beatSec) * 1000);
      const detectedHitsMs = [];
      const data = new Uint8Array(analyser.frequencyBinCount);
      let lastHitMs = 0;

      return new Promise((resolve) => {
        const timer = setInterval(() => {
          const nowMs = ctx.currentTime * 1000;
          if (nowMs >= bar2Start * 1000) {
            statusBanner.textContent = "👏 YOUR TURN! Clap or say 'DA!' on the beats!";
          }
          analyser.getByteTimeDomainData(data);
          let maxPeak = 0;
          for (let i = 0; i < data.length; i++) {
            const amp = Math.abs(data[i] - 128);
            if (amp > maxPeak) maxPeak = amp;
          }

          if (nowMs >= (bar2Start - 0.12) * 1000 && maxPeak > 30 && (nowMs - lastHitMs) > 160) {
            lastHitMs = nowMs;
            detectedHitsMs.push(nowMs);
          }

          if (ctx.currentTime > bar2Start + 4 * beatSec + 0.2) {
            clearInterval(timer);
            stream.getTracks().forEach(t => t.stop());
            ctx.close();

            const offsetsMs = targetTimesMs.map((target, idx) => {
              const hit = detectedHitsMs[idx] !== undefined ? detectedHitsMs[idx] : (target + 220);
              return Math.round(hit - target);
            });
            resolve(offsetsMs);
          }
        }, 5);
      });
    }

    async function sendAuditionTurn(payload) {
      playBtn.disabled = true;
      voiceBtn.disabled = true;
      statusBanner.textContent = "🧠 Coach is analyzing your timing...";

      try {
        const res = await fetch("/api/audition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, mode: currentMode, ...payload })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || ("HTTP " + res.status));
        }
        const st = data.state;

        currentMode = st.mode;
        roastToggle.checked = currentMode === "whiplash";
        document.body.classList.toggle("whiplash", currentMode === "whiplash");

        if (currentMode === "whiplash") {
          meterLabel.textContent = "Maestro Blood Pressure";
          meterValue.textContent = st.bloodPressure + " / 200";
        } else {
          meterLabel.textContent = "Groove Pocket Score";
          meterValue.textContent = st.grooveScore + "%";
        }

        tendencyValue.textContent = st.tendency;
        currentDrill = st.currentDrill;
        bpmValue.textContent = currentDrill.bpm + " BPM";
        drillName.textContent = currentDrill.name;
        coachQuote.textContent = '"' + data.critique + '"';
        renderBeats(payload.offsetsMs);

        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(data.critique);
          utter.rate = currentMode === "whiplash" ? 1.12 : 1.0;
          window.speechSynthesis.speak(utter);
        }
        statusBanner.textContent = "✅ Ready for next round.";
      } catch (err) {
        statusBanner.textContent = "⚠️ Error contacting Worker: " + err.message;
      } finally {
        playBtn.disabled = false;
        voiceBtn.disabled = false;
      }
    }

    roastToggle.addEventListener("change", () => {
      currentMode = roastToggle.checked ? "whiplash" : "supportive";
      document.body.classList.toggle("whiplash", currentMode === "whiplash");
      sendAuditionTurn({
        spokenText: currentMode === "whiplash"
          ? "Switch to Whiplash roast mode."
          : "Switch back to supportive coach mode."
      });
    });

    playBtn.addEventListener("click", async () => {
      const offsetsMs = await runAudioDrill(currentDrill);
      await sendAuditionTurn({ offsetsMs });
    });

    voiceBtn.addEventListener("click", () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        const typed = prompt("Browser SpeechRecognition unavailable. Type what you'd like to say to the coach:");
        if (typed) sendAuditionTurn({ spokenText: typed });
        return;
      }
      const rec = new SR();
      rec.lang = "en-US";
      statusBanner.textContent = "🎙️ Listening... Speak to your coach!";
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        statusBanner.textContent = 'You said: "' + transcript + '"';
        sendAuditionTurn({ spokenText: transcript });
      };
      rec.onerror = () => {
        statusBanner.textContent = "⚠️ Could not capture voice.";
      };
      rec.start();
    });

    resetBtn.addEventListener("click", () => sendAuditionTurn({ reset: true }));
  </script>
</body>
</html>`;
