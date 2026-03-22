/**
 * sign-engine.js  –  Signify Alphabet Learning Engine v2
 */

import {
    GestureRecognizer,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

// ── Letter data ──
// gesture: exact MediaPipe Task Vision Model (defined below) categoryName that counts as correct, or null
// For null-gesture letters (that would require a 3D hand model), the bar fills only while a hand is visible.
// The user still has to actively show their hand; idle frames don't count.
export const LETTERS = [
    { letter:"A", gesture:"A",
      desc:"Make a fist with your thumb resting against the side of your index finger. Keep all four fingers curled tightly.",
      tip:"Fist facing forward — thumb to the side, not on top." },
    { letter:"B", gesture:"B",
      desc:"Hold all four fingers together pointing straight up. Fold your thumb flat across the palm.",
      tip:"Think of holding a flat book upright." },
    { letter:"C", gesture:null,
      desc:"Curve all fingers and thumb into the shape of the letter C, like gripping a can from the side.",
      tip:"Your hand should make a half-circle opening." },
    { letter:"D", gesture:"D",
      desc:"Point your index finger up. Bring the middle, ring, and pinky fingers down to touch the tip of your thumb, forming a circle.",
      tip:"The loop is the round part of the letter D." },
    { letter:"E", gesture:"E",
      desc:"Curl all four fingers downward like bent claws. Tuck your thumb underneath the curled fingers.",
      tip:"Fingertips should nearly touch the thumb." },
    { letter:"F", gesture:"F",
      desc:"Connect your index finger and thumb in a circle. Hold the other three fingers upright and spread.",
      tip:"Similar to the OK hand sign, but held sideways." },
    { letter:"G", gesture:"G",
      desc:"Point your index finger out to the side. Hold your thumb parallel to it, pointing the same direction.",
      tip:"Like a sideways finger gun." },
    { letter:"H", gesture:"H",
      desc:"Point both your index and middle fingers out to the side together, side by side and flat.",
      tip:"Two fingers horizontal — like a sideways peace sign." },
    { letter:"I", gesture:"I",
      desc:"Raise only your pinky finger. Curl all other fingers into a fist.",
      tip:"Like a pinky promise." },
    { letter:"J", gesture:null,
      desc:"Start with the I handshape (pinky up), then trace a J shape in the air with your pinky.",
      tip:"The movement draws the letter — don't forget the curve!" },
    { letter:"K", gesture:"K",
      desc:"Extend your index and middle fingers up in a V shape. Place your thumb between them, pointing out.",
      tip:"Like a peace sign, but with the thumb extended between the fingers." },
    { letter:"L", gesture:"L",
      desc:"Point your index finger straight up. Extend your thumb out to the side. Keep other fingers curled.",
      tip:"Your hand literally makes the shape of the letter L." },
    { letter:"M", gesture:null,
      desc:"Tuck three fingers (index, middle, ring) over the top of your thumb. Keep your pinky curled in.",
      tip:"Three fingers on top = M." },
    { letter:"N", gesture:null,
      desc:"Tuck your index and middle fingers over the top of your thumb. Keep other fingers curled.",
      tip:"Two fingers on top = N." },
    { letter:"O", gesture:"O",
      desc:"Bring all your fingertips and thumb together to form the letter O, like holding a small ball.",
      tip:"The gap in the circle should be visible." },
    { letter:"P", gesture:null,
      desc:"Make the K handshape but point your whole hand downward.",
      tip:"K flipped to point down." },
    { letter:"Q", gesture:null,
      desc:"Make the G handshape but point it downward instead.",
      tip:"G flipped to point down." },
    { letter:"R", gesture:"R",
      desc:"Cross your index finger over your middle finger. Keep other fingers curled.",
      tip:"Think of crossing your fingers for luck." },
    { letter:"S", gesture:"Closed_Fist",
      desc:"Make a fist with your thumb placed across the front of your fingers (not to the side like A).",
      tip:"Very similar to A — the thumb position is the only difference." },
    { letter:"T", gesture:null,
      desc:"Make a fist and poke your thumb up between your index and middle finger so the tip peeks out.",
      tip:"The thumb tip shows through the fist." },
    { letter:"U", gesture:"U",
      desc:"Hold your index and middle fingers together, pointing straight up. Keep other fingers and thumb curled.",
      tip:"Two fingers together pointing up." },
    { letter:"V", gesture:"V",
      desc:"Hold your index and middle fingers apart in a V shape pointing up. Keep other fingers curled.",
      tip:"The classic peace sign!" },
    { letter:"W", gesture:"W",
      desc:"Hold your index, middle, and ring fingers up and spread apart to form a W. Keep pinky and thumb folded.",
      tip:"Three fingers spread = W." },
    { letter:"X", gesture:"X",
      desc:"Extend your index finger and curl it into a hook shape. Keep all other fingers curled.",
      tip:"Like a beckoning 'come here' motion — but held still." },
    { letter:"Y", gesture:"Y",
      desc:"Extend your thumb and pinky finger outward. Keep your index, middle, and ring fingers curled.",
      tip:"Imagine a Y-shape made by your thumb and pinky." },
    { letter:"Z", gesture:null,
      desc:"Point your index finger and draw the letter Z in the air: horizontal right, diagonal down-left, horizontal right.",
      tip:"The movement IS the letter Z — keep it crisp." },
];

// ── Constants ────
const XP_PER_LETTER     = 50;
const HOLD_FRAMES       = 40;   
const HAND_HOLD_SECS    = 3;   // seconds hand must be present for null-gesture letters
const CONFIDENCE_THRESH = 0.75; // min confidence for a correct gesture match

let fpEstimator = null; // FingerPose Estimator

// Inspired by function from game.html for gestures defined 
function buildGestures() {
    const g = [];
    const defs = {
        'A': d => { [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky].forEach(f => d.addCurl(f, fp.FingerCurl.FullCurl, 1.0)); d.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 0.8); },
        'B': d => { [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky].forEach(f => { d.addCurl(f, fp.FingerCurl.NoCurl, 1.0); d.addDirection(f, fp.FingerDirection.VerticalUp, 1.0); }); d.addCurl(fp.Finger.Thumb, fp.FingerCurl.FullCurl, 1.0); },
        'D': d => { d.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0); d.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);[fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky].forEach(f => d.addCurl(f, fp.FingerCurl.FullCurl, 1.0)); d.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 0.8); },
        'E': d => { [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky].forEach(f => d.addCurl(f, fp.FingerCurl.HalfCurl, 1.0)); d.addCurl(fp.Finger.Thumb, fp.FingerCurl.FullCurl, 1.0); },
        'F': d => { d.addCurl(fp.Finger.Index, fp.FingerCurl.HalfCurl, 1.0);[fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky].forEach(f => { d.addCurl(f, fp.FingerCurl.NoCurl, 1.0); d.addDirection(f, fp.FingerDirection.VerticalUp, 0.9); }); },
        'G': d => { d.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0); d.addDirection(fp.Finger.Index, fp.FingerDirection.HorizontalLeft, 1.0);[fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky].forEach(f => d.addCurl(f, fp.FingerCurl.FullCurl, 1.0)); },
        'H': d => { [fp.Finger.Index, fp.Finger.Middle].forEach(f => { d.addCurl(f, fp.FingerCurl.NoCurl, 1.0); d.addDirection(f, fp.FingerDirection.HorizontalLeft, 0.9); });[fp.Finger.Ring, fp.Finger.Pinky].forEach(f => d.addCurl(f, fp.FingerCurl.FullCurl, 1.0)); },
        'I': d => { d.addCurl(fp.Finger.Pinky, fp.FingerCurl.NoCurl, 1.0); d.addDirection(fp.Finger.Pinky, fp.FingerDirection.VerticalUp, 1.0);[fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring].forEach(f => d.addCurl(f, fp.FingerCurl.FullCurl, 1.0)); },
        'L': d => { d.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0); d.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0); d.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0); d.addDirection(fp.Finger.Thumb, fp.FingerDirection.HorizontalLeft, 0.9);[fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky].forEach(f => d.addCurl(f, fp.FingerCurl.FullCurl, 1.0)); },
        'O': d => { [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky, fp.Finger.Thumb].forEach(f => d.addCurl(f, fp.FingerCurl.HalfCurl, 0.9)); },
        'V': d => { [fp.Finger.Index, fp.Finger.Middle].forEach(f => { d.addCurl(f, fp.FingerCurl.NoCurl, 1.0); d.addDirection(f, fp.FingerDirection.VerticalUp, 1.0); });[fp.Finger.Ring, fp.Finger.Pinky].forEach(f => d.addCurl(f, fp.FingerCurl.FullCurl, 1.0)); },
        'W': d => { [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring].forEach(f => { d.addCurl(f, fp.FingerCurl.NoCurl, 1.0); d.addDirection(f, fp.FingerDirection.VerticalUp, 1.0); }); d.addCurl(fp.Finger.Pinky, fp.FingerCurl.FullCurl, 1.0); },
        'Y': d => { d.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0); d.addCurl(fp.Finger.Pinky, fp.FingerCurl.NoCurl, 1.0);[fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring].forEach(f => d.addCurl(f, fp.FingerCurl.FullCurl, 1.0)); },
    };
    Object.entries(defs).forEach(([name, fn]) => {
        const d = new fp.GestureDescription(name); fn(d); g.push(d);
    });
    return g;
}

// ── State ───
let cfg         = window.SIGNIFY_CONFIG || {};
let completedSet  = cfg.completedSet instanceof Set ? cfg.completedSet : new Set();
let skippedSet    = new Set(); // letters the user chose to skip
let currentIndex  = 0;
let holdProgress  = 0;
let handTimer     = 0;    // accumulated seconds hand is visible (null-gesture letters)
let phaseLocked   = false; // true once success OR retry panel shown
let gestureRec    = null;
let webcamRunning = false;
let lastVideoTime = -1;
let sessionXP     = 0;
let lastFrameTime = 0;
let totalAttempts = 0;
let totalHits     = 0;
let isRetryMode   = false; // true when practising again after XP already earned
let lastResults = null;

// DOM refs
let video, canvas, ctx, camBtn, camOverlay,
    holdBar, holdLabel;

// ── DOM ────
function grabDom() {
    video      = document.getElementById("webcam");
    canvas     = document.getElementById("output_canvas");
    ctx        = canvas.getContext("2d");
    camBtn     = document.getElementById("camBtn");
    camOverlay = document.getElementById("camOverlay");
    holdBar    = document.getElementById("holdBar");
    holdLabel  = document.getElementById("holdLabel");
}

// ── Render letter ────
function renderLetter(retryMode = false) {
    isRetryMode = retryMode;
    const l = LETTERS[currentIndex];

    const hl = document.getElementById("letterHighlight");
    if (hl) hl.textContent = `"${l.letter}"`;
    const desc = document.getElementById("letterDesc");
    if (desc) desc.textContent = l.desc;
    const tip = document.getElementById("letterTip");
    if (tip) tip.innerHTML = `<i class="bi bi-hand-index-thumb"></i> ${l.tip}`;

    // ASL reference image
    const img = document.getElementById("aslImage");
    const fb  = document.getElementById("aslFallback");
    if (img) {
        img.style.display = "block";
        if (fb) fb.style.display = "none";
        img.alt = `ASL sign for letter ${l.letter}`;
        img.src = `https://www.lifeprint.com/asl101/fingerspelling/abc-gifs/${l.letter.toLowerCase()}.gif`;
    }

    // Progress bar
    const pct = Math.round((completedSet.size / 26) * 100);
    const pf  = document.getElementById("progFill");
    if (pf) pf.style.width = pct + "%";
    const pc  = document.getElementById("progressCount");
    if (pc) pc.textContent = `${completedSet.size} / 26`;

    // Reset hold
    holdProgress = 0;
    handTimer    = 0;
    phaseLocked  = false;
    updateHoldBar();
    buildGrid();
    updateSidebar();

    // Hide both overlays
    hideOverlay("successOverlay");
    hideOverlay("retryOverlay");
}

// ── Grid ─────
function buildGrid() {
    const grid = document.getElementById("letterGrid");
    if (!grid) return;
    grid.innerHTML = "";
    LETTERS.forEach((l, i) => {
        const btn = document.createElement("button");
        btn.id = `lb-${l.letter}`;
        btn.textContent = l.letter;
        btn.setAttribute("aria-label", `Go to letter ${l.letter}`);
        let cls = "letter-btn";
        if (i === currentIndex)           cls += " active";
        else if (completedSet.has(l.letter)) cls += " done";
        else if (skippedSet.has(l.letter))   cls += " skipped";
        btn.className = cls;
        btn.onclick   = () => { currentIndex = i; renderLetter(); };
        grid.appendChild(btn);
    });
}

// ── Sidebar ──────
function updateSidebar() {
    const xpEl   = document.getElementById("sb-xp");
    const baseXP = (window.SIGNIFY_CONFIG && window.SIGNIFY_CONFIG.totalXP) || 0;
    if (xpEl) xpEl.textContent = baseXP + sessionXP;
    const doneEl = document.getElementById("sb-done");
    if (doneEl)  doneEl.textContent = `${completedSet.size}/26`;
    const accEl  = document.getElementById("sb-acc");
    if (accEl)   accEl.textContent = totalAttempts > 0
        ? Math.round((totalHits / totalAttempts) * 100) + "%" : "—";
    const strEl  = document.getElementById("sb-streak");
    if (strEl)   strEl.textContent = cfg.streak || 0;
}

// ── Hold bar ─────
function updateHoldBar() {
    if (!holdBar || !holdLabel) return;
    const l   = LETTERS[currentIndex];
    const pct = Math.min(100, holdProgress);
    holdBar.style.width = pct + "%";

    if (phaseLocked) return; 

    if (pct >= 100) {
        holdBar.classList.add("success");
        holdLabel.textContent = "✓ Perfect!";
    } else if (l.gesture === null) {
        holdBar.classList.remove("success");
        // Only show progress while hand is in frame
        holdLabel.textContent = pct > 5
            ? `Holding sign… ${Math.floor(pct)}%`
            : "Show your hand to start the timer";
    } else {
        holdBar.classList.remove("success");
        holdLabel.textContent = pct > 5
            ? `Holding… ${Math.floor(pct)}%`
            : "Make the sign!";
    }
}

// ── Overlay helpers ─────
function showOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("visible");
}
function hideOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("visible");
}

// ── Success ────
function showSuccess(letter) {
    if (phaseLocked) return;
    phaseLocked = true;

    const alreadyDone = completedSet.has(letter);
    if (!alreadyDone) {
        completedSet.add(letter);
        sessionXP += XP_PER_LETTER;
    }

    const title = document.getElementById("successTitle");
    if (title) title.textContent = alreadyDone
        ? `Letter ${letter} — Great practice! 💪`
        : `Letter ${letter} Mastered! 🔥`;

    const xpTag = document.getElementById("xpEarned");
    if (xpTag) {
        xpTag.textContent = alreadyDone ? "Practice ✓" : `+${XP_PER_LETTER} XP`;
        xpTag.style.background = alreadyDone ? "#f0fdf4" : "#fffbeb";
        xpTag.style.color      = alreadyDone ? "#16a34a"  : "#92400e";
        xpTag.style.borderColor= alreadyDone ? "#86efac"  : "#fde68a";
    }

    const subs = ["Keep it up!", "Excellent form!", "Your hands are speaking! 🤝", "That's ASL!"];
    const sub  = document.getElementById("successSub");
    if (sub) sub.textContent = subs[Math.floor(Math.random() * subs.length)];

    showOverlay("successOverlay");

    // XP pop and Firebase Save (only on first completion)
    if (!alreadyDone) {
        const pop = document.createElement("div");
        pop.style.cssText = "position:fixed;left:50%;top:42%;transform:translateX(-50%);font-size:1.6rem;font-weight:900;color:#f59e0b;pointer-events:none;z-index:9999;animation:xpPop 1.1s ease-out forwards;text-shadow:0 2px 12px rgba(245,158,11,.4);";
        pop.textContent   = `+${XP_PER_LETTER} XP`;
        document.body.appendChild(pop);
        setTimeout(() => pop.remove(), 1300);

        if (typeof cfg.onSuccess === "function") cfg.onSuccess(letter, sessionXP);


    }

    updateSidebar();
    buildGrid();
}

// ── Retry panel ──────
function showRetryPanel(letter) {
    if (phaseLocked) return;
    phaseLocked = true;

    const rt = document.getElementById("retryTitle");
    if (rt) rt.textContent = `Not quite, ${letter}!`;
    const rs = document.getElementById("retrySubtitle");
    if (rs) rs.textContent = "Take another look at the reference image and try again.";

    showOverlay("retryOverlay");
}

// ── Navigation (onclick in HTML) ──────
window.goLetter = function(delta) {
    currentIndex = Math.max(0, Math.min(25, currentIndex + delta));
    renderLetter();
};

// Called by "Next Letter" button on success overlay
window.dismissSuccess = function() {
    hideOverlay("successOverlay");
    if (currentIndex < 25) { currentIndex++; renderLetter(); }
    else if (holdLabel) holdLabel.textContent = "🏆 All 26 letters complete!";
};

// Called by "Try Again" button on retry overlay
window.retryLetter = function() {
    hideOverlay("retryOverlay");
    renderLetter(false); // not retry mode, fresh attempt
};

// Called by "Skip for Now" button on retry overlay
window.skipLetter = function() {
    const letter = LETTERS[currentIndex].letter;
    skippedSet.add(letter);
    hideOverlay("retryOverlay");
    // Advance to next non-completed, non-skipped letter, or next in sequence
    const next = LETTERS.findIndex((l, i) => i > currentIndex && !completedSet.has(l.letter));
    currentIndex = next >= 0 ? next : Math.min(currentIndex + 1, 25);
    renderLetter();
};

// Called by "Retry (Practice)" button on success overlay
window.retryForPractice = function() {
    hideOverlay("successOverlay");
    renderLetter(true); // retry mode, no XP
};

// ── MediaPipe ────
async function initRecognizer() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    gestureRec = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
    });
    fpEstimator = new fp.GestureEstimator(buildGestures());
    camBtn.disabled = false;
    camBtn.innerHTML = '<i class="bi bi-webcam"></i> Enable Camera';
    camBtn.addEventListener("click", toggleCam);
}

// ── Camera ────
function toggleCam() {
    if (webcamRunning) {
        webcamRunning = false;
        camBtn.innerHTML = '<i class="bi bi-webcam"></i> Enable Camera';
        const stream = video.srcObject;
        if (stream) stream.getTracks().forEach(t => t.stop());
        video.srcObject = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        camOverlay.style.display = "flex";
    } else {
        webcamRunning = true;
        camBtn.innerHTML = '<i class="bi bi-webcam-fill"></i> Disable Camera';
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                video.srcObject = stream;
                camOverlay.style.display = "none";
                video.addEventListener("loadeddata", gameLoop, { once: true });
            })
            .catch(err => {
                webcamRunning = false;
                camBtn.innerHTML = '<i class="bi bi-webcam"></i> Enable Camera';
                const p = camOverlay.querySelector("p");
                if (p) p.textContent = "Camera access denied — please allow camera and try again.";
                console.error("getUserMedia error:", err);
            });
    }
}

// ── Game loop ──────
function gameLoop() {
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    if (!webcamRunning) return;

    const now = performance.now();
    const delta = lastFrameTime ? (now - lastFrameTime) / 1000 : 1 / 60; // seconds elapsed
    lastFrameTime = now;
    let results;
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        results = gestureRec.recognizeForVideo(video, now);
        lastResults = results;
    }

    // Clear canvas but draw NOTHING
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If phase is locked (success/retry panel showing), just keep the loop ticking
    if (phaseLocked) {
        if (webcamRunning) requestAnimationFrame(gameLoop);
        return;
    }

    const l = LETTERS[currentIndex];
    const handPresent = lastResults != null && lastResults.landmarks?.length > 0;

    // ── Gesture-based letters (A, G, S, Y, …) ──
    if (l.gesture !== null) {
        let isMatch = false;

        if (handPresent) {
            // MediaPipe 7 built-in gestures first 
            if (lastResults.gestures?.length > 0) {
                const cat = lastResults.gestures[0][0].categoryName;
                const score = lastResults.gestures[0][0].score;
                if ((Array.isArray(l.gesture) ? l.gesture.includes(cat) : cat === l.gesture) && score >= CONFIDENCE_THRESH) {
                    isMatch = true;
                }
            }

            // Try Fingerpose
            if (!isMatch && fpEstimator) {
                const pixelLandmarks = lastResults.landmarks[0].map(lm => [
                    lm.x * canvas.width, 
                    lm.y * canvas.height, 
                    lm.z * canvas.width
                ]);

                // Running Fingerpose with a confidence threshold of 7.0
                const est = fpEstimator.estimate(pixelLandmarks, 7.0);
                if (est.gestures.length > 0) {
                    const best = est.gestures.reduce((p, c) => p.score > c.score ? p : c);
                    if (best.name === l.gesture) {
                        isMatch = true;
                    }
                }
            }
        }

        // Apply progress
        if (isMatch) {
            holdProgress += (100 / HOLD_FRAMES);
            totalHits++;
        } else if (handPresent) {
            holdProgress = Math.max(0, holdProgress - 3); // Hand present, wrong sign
        } else {
            holdProgress = Math.max(0, holdProgress - 6); // No hand
        }
    }

    // ── Null-gesture letters (for certain letters/exceptions that would require a heavy dataset & training) ────
    // Timer only advances while a hand is actually in frame.
    else {
        if (handPresent) {
            handTimer    += delta;
            holdProgress  = Math.min(100, (handTimer / HAND_HOLD_SECS) * 100);
        }
        // No hand = timer pauses, progress stays where it is 
    }

    holdProgress = Math.min(100, Math.max(0, holdProgress));
    updateHoldBar();

    if (holdProgress >= 100 && !phaseLocked) {
        showSuccess(l.letter);
    }

    if (webcamRunning) requestAnimationFrame(gameLoop);
}

// ── Boot ──────
document.addEventListener("DOMContentLoaded", () => {
    grabDom();
    cfg = window.SIGNIFY_CONFIG || {};
    if (cfg.completedSet instanceof Set) completedSet = cfg.completedSet;

    const first = LETTERS.findIndex(l => !completedSet.has(l.letter));
    if (first >= 0) currentIndex = first;

    renderLetter();

    camBtn.disabled = true;
    camBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading AI…';
    initRecognizer();

    window.__signEngineRerender = () => {
        completedSet = cfg.completedSet;
        const f = LETTERS.findIndex(l => !completedSet.has(l.letter));
        if (f >= 0) currentIndex = f;
        renderLetter();
    };
    window.__signEngineReady = true;
});