// ============================================================
//  word-engine.js  –  ASL Word Detection
//  Uses MediaPipe Handpose + Fingerpose (loads from CDN)
// ============================================================

function makeHelloGesture() {
    const hello = new fp.GestureDescription('Thank You');
    for (const f of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
        hello.addCurl(f, fp.FingerCurl.NoCurl, 1.0);
    }
    hello.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);
    hello.addDirection(fp.Finger.Middle, fp.FingerDirection.VerticalUp, 1.0);
    hello.addDirection(fp.Finger.Ring, fp.FingerDirection.VerticalUp, 1.0);
    hello.addDirection(fp.Finger.Pinky, fp.FingerDirection.VerticalUp, 1.0);
    return hello;
}

function makeThankYouGesture() {
    const thankYou = new fp.GestureDescription('Hello');
    for (const f of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
        thankYou.addCurl(f, fp.FingerCurl.NoCurl, 1.0);
    }
    thankYou.addDirection(fp.Finger.Index, fp.FingerDirection.DiagonalUpLeft, 1.0);
    thankYou.addDirection(fp.Finger.Index, fp.FingerDirection.DiagonalUpRight, 1.0);
    thankYou.addDirection(fp.Finger.Middle, fp.FingerDirection.DiagonalUpLeft, 1.0);
    thankYou.addDirection(fp.Finger.Middle, fp.FingerDirection.DiagonalUpRight, 1.0);
    thankYou.addDirection(fp.Finger.Ring, fp.FingerDirection.DiagonalUpLeft, 0.9);
    thankYou.addDirection(fp.Finger.Ring, fp.FingerDirection.DiagonalUpRight, 0.9);
    return thankYou;
}

function makeILoveYouGesture() {
    const ily = new fp.GestureDescription('I Love You');
    ily.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
    ily.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
    ily.addCurl(fp.Finger.Middle, fp.FingerCurl.FullCurl, 1.0);
    ily.addCurl(fp.Finger.Ring, fp.FingerCurl.FullCurl, 1.0);
    ily.addCurl(fp.Finger.Pinky, fp.FingerCurl.NoCurl, 1.0);
    ily.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);
    ily.addDirection(fp.Finger.Pinky, fp.FingerDirection.VerticalUp, 1.0);
    return ily;
}

function makeYesGesture() {
    const yes = new fp.GestureDescription('Yes');
    yes.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
    yes.addCurl(fp.Finger.Index, fp.FingerCurl.FullCurl, 1.0);
    yes.addCurl(fp.Finger.Middle, fp.FingerCurl.FullCurl, 1.0);
    yes.addCurl(fp.Finger.Ring, fp.FingerCurl.FullCurl, 1.0);
    yes.addCurl(fp.Finger.Pinky, fp.FingerCurl.FullCurl, 1.0);
    yes.addDirection(fp.Finger.Thumb, fp.FingerDirection.VerticalUp, 1.0);
    yes.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalUpLeft, 0.7);
    yes.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalUpRight, 0.7);
    return yes;
}

function makeNoGesture() {
    const no = new fp.GestureDescription('No');
    no.addCurl(fp.Finger.Thumb, fp.FingerCurl.FullCurl, 1.0);
    no.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 0.5);
    no.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
    no.addCurl(fp.Finger.Middle, fp.FingerCurl.NoCurl, 1.0);
    no.addCurl(fp.Finger.Ring, fp.FingerCurl.FullCurl, 1.0);
    no.addCurl(fp.Finger.Ring, fp.FingerCurl.HalfCurl, 0.5);
    no.addCurl(fp.Finger.Pinky, fp.FingerCurl.FullCurl, 1.0);
    no.addCurl(fp.Finger.Pinky, fp.FingerCurl.HalfCurl, 0.5);
    no.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);
    no.addDirection(fp.Finger.Middle, fp.FingerDirection.VerticalUp, 1.0);
    return no;
}

// ── Config ────────────────────────────────────────────────────
const WORD_INSTRUCTIONS = {
    'Hello': 'Raise your open hand, all five fingers pointing straight up like a salute.',
    'Thank You': 'Flat open hand, fingers angled outward/forward (not straight up).',
    'I Love You': 'Extend your thumb, index finger, and pinky — middle and ring fingers curled.',
    'Yes': 'Thumbs up — fist closed with only your thumb pointing straight up.',
    'No': 'Peace sign — index and middle fingers up, others curled.',
};
const WORD_TIPS = {
    'Hello': 'Think of it like a casual salute — fingers up, palm forward.',
    'Thank You': 'Like blowing a kiss forward from your chin.',
    'I Love You': 'Combine I, L, and Y handshapes into one!',
    'Yes': 'A confident thumbs up — keep your fist firm.',
    'No': 'Classic peace sign — V for victory!',
};
const WORD_XP = {
    'Hello': 100,
    'Thank You': 100,
    'I Love You': 100,
    'Yes': 100,
    'No': 100,
};
const WORD_IMAGES = {
    'Hello': 'images/hello.png',
    'Thank You': 'images/thankyou.png',
    'I Love You': 'images/iloveyou.png',
    'Yes': 'images/yes.png',
    'No': 'images/no.png',
};
const WORDS = ['Hello', 'Thank You', 'I Love You', 'Yes', 'No'];
const MATCH_NEEDED = 15;
const MIN_WORD_TIME = 3000; // 3 seconds minimum before advancing

// ── DOM refs ──────────────────────────────────────────────────
const video = document.getElementById('webcam_words');
const canvas = document.getElementById('output_canvas_words');
const ctx = canvas.getContext('2d');
const enableBtn = document.getElementById('enableWebcamButtonWords');
const progressBar = document.getElementById('accuracy-bar-words');
const holdLabel = document.getElementById('holdLabel');
const progFill = document.getElementById('progFill');
const progressCount = document.getElementById('progressCount');

// Hero card elements
const wordHighlight = document.getElementById('wordHighlight');
const wordDesc = document.getElementById('wordDesc');
const wordTip = document.getElementById('wordTip');
const wordImage = document.getElementById('wordImage');
const wordImgFallback = document.getElementById('wordImgFallback');

function updateWordImage(word) {
    const src = WORD_IMAGES[word];
    if (wordImage) {
        wordImage.src = src || '';
        wordImage.style.display = src ? 'block' : 'none';
    }
    if (wordImgFallback) {
        wordImgFallback.textContent = word[0];
        wordImgFallback.style.display = src ? 'none' : 'flex';
    }
}

// Sidebar
const sbXp = document.getElementById('sb-xp');
const sbDone = document.getElementById('sb-done');
const wordListEl = document.getElementById('wordList');

// Success overlay
const successOverlay = document.getElementById('successOverlay');
const successTitle = document.getElementById('successTitle');
const successSub = document.getElementById('successSub');
const nextWordBtn = document.getElementById('nextWordBtn');

// Camera overlay
const camOverlay = document.getElementById('camOverlay');

let handposeModel = null;
let gestureEstimator = null;
let streaming = false;
let currentWordIdx = 0;
let currentWord = WORDS[0];
let matchFrames = 0;
let totalXP = 0;
let wordsCompleted = 0;
let wordStartTime = Date.now(); // tracks when current word began


// ── Build sidebar word list ───────────────────────────────────
function buildWordList() {
    wordListEl.innerHTML = '';
    const images = ['images/hello.png', 'images/thankyou.png', 'images/iloveyou.png', 'images/yes.png', 'images/no.png'];
    WORDS.forEach((word, i) => {
        const div = document.createElement('div');
        div.className = 'word-item' + (i === currentWordIdx ? ' active' : i < currentWordIdx ? ' done' : '');
        div.id = `wi-${i}`;
        div.innerHTML = `
            <div class="wi-icon"><img src="${images[i]}" style="width:20px;height:20px;object-fit:contain;"></div>
            <span>${word}</span>
            <i class="bi bi-check-circle-fill wi-check"></i>
        `;
        wordListEl.appendChild(div);
    });
}

function updateWordList() {
    WORDS.forEach((_, i) => {
        const el = document.getElementById(`wi-${i}`);
        if (!el) return;
        el.className = 'word-item' + (i === currentWordIdx ? ' active' : i < currentWordIdx ? ' done' : '');
    });
}

function updateOverallProgress() {
    const pct = Math.round((wordsCompleted / WORDS.length) * 100);
    progFill.style.width = `${pct}%`;
    progressCount.textContent = `${wordsCompleted} / ${WORDS.length}`;
    sbDone.textContent = `${wordsCompleted}/${WORDS.length}`;
}

// ── Load ──────────────────────────────────────────────────────
async function loadModels() {
    enableBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading Model…';
    enableBtn.disabled = true;
    try {
        handposeModel = await handpose.load();
        gestureEstimator = new fp.GestureEstimator([
            makeHelloGesture(),
            makeThankYouGesture(),
            makeILoveYouGesture(),
            makeYesGesture(),
            makeNoGesture(),
        ]);
        console.log('[word-engine] Ready ✓');
        enableBtn.innerHTML = '<i class="bi bi-camera-video"></i> Enable Camera';
        enableBtn.disabled = false;
    } catch (err) {
        console.error('[word-engine] Load error:', err);
        enableBtn.textContent = '❌ Load failed – check console';
    }
}

// ── Webcam ────────────────────────────────────────────────────
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: 640, height: 480 },
        });
        video.srcObject = stream;
        video.addEventListener('loadeddata', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            camOverlay.style.display = 'none';
            streaming = true;
            detectLoop();
        });
    } catch (err) {
        console.error('[word-engine] Webcam error:', err);
        alert('Could not access webcam. Please allow camera permissions.');
    }
}

// ── Draw skeleton ─────────────────────────────────────────────
const FINGER_PATHS = [
    [0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [0, 9, 10, 11, 12], [0, 13, 14, 15, 16], [0, 17, 18, 19, 20],
];

function drawHand(predictions, color) {
    if (!predictions.length) return;
    const lm = predictions[0].landmarks;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    for (const path of FINGER_PATHS) {
        ctx.beginPath();
        ctx.moveTo(lm[path[0]][0], lm[path[0]][1]);
        for (let i = 1; i < path.length; i++) ctx.lineTo(lm[path[i]][0], lm[path[i]][1]);
        ctx.stroke();
    }
    for (const [x, y] of lm) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// ── Detection loop ────────────────────────────────────────────
async function detectLoop() {
    if (!streaming) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const predictions = await handposeModel.estimateHands(video);

    if (predictions.length > 0) {
        const est = gestureEstimator.estimate(predictions[0].landmarks, 4.0);

        if (est.gestures.length > 0) {
            const sorted = [...est.gestures].sort((a, b) => b.score - a.score);
            const best = sorted[0];
            const label = best.name;
            const pct = Math.min(100, Math.round((best.score / 8.0) * 100));
            const isMatch = label === currentWord;
            const timeElapsed = Date.now() - wordStartTime;
            const timeReady = timeElapsed >= MIN_WORD_TIME;

            progressBar.style.width = `${pct}%`;
            progressBar.className = `hold-fill${isMatch && timeReady ? ' success' : ''}`;

            if (isMatch && timeReady) {
                matchFrames++;
                if (matchFrames >= MATCH_NEEDED) {
                    advanceWord();
                    matchFrames = 0;
                }
            } else if (!isMatch) {
                matchFrames = Math.max(0, matchFrames - 1);
            }

            // Label based on confidence score, feels natural not mechanical
            if (pct >= 80) {
                holdLabel.textContent = "Looking great! 🔥";
            } else if (pct >= 60) {
                holdLabel.textContent = "Almost there, keep going!";
            } else if (pct >= 40) {
                holdLabel.textContent = "Getting closer…";
            } else {
                holdLabel.textContent = "Try adjusting your hand";
            }
        } else {
            progressBar.style.width = '5%';
            progressBar.className = 'hold-fill';
            holdLabel.textContent = 'Hand detected…';
            matchFrames = Math.max(0, matchFrames - 1);
        }
    } else {
        progressBar.style.width = '0%';
        progressBar.className = 'hold-fill';
        holdLabel.textContent = 'Make the sign!';
        matchFrames = 0;
    }

    requestAnimationFrame(detectLoop);
}

// ── Advance word ──────────────────────────────────────────────
function advanceWord() {
    streaming = false;
    matchFrames = 0;

    const xpEarned = WORD_XP[currentWord] || 100;
    totalXP += xpEarned;
    wordsCompleted++;
    sbXp.textContent = totalXP;
    updateOverallProgress();
    updateWordList();

    // Save to Firebase
    if (typeof window.onWordComplete === 'function') {
        window.onWordComplete(currentWord, xpEarned);
    }

    const isLast = currentWordIdx >= WORDS.length - 1;

    if (isLast) {
        if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
        showStageComplete();
    } else {
        successTitle.textContent = `Nice work! "${currentWord}" ✓`;
        document.querySelector('.success-card .xp-tag').textContent = `+${xpEarned} XP`;
        successSub.textContent = `Up next: "${WORDS[currentWordIdx + 1]}"`;
        nextWordBtn.textContent = 'Next Word →';
        successOverlay.classList.add('visible');
        if (typeof confetti === 'function') confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }
}

// ── Stage completion popup ────────────────────────────────────
function showStageComplete() {
    const images = ['images/hello.png', 'images/thankyou.png', 'images/iloveyou.png', 'images/yes.png', 'images/no.png'];
    const wordReview = WORDS.map((w, i) =>
        `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
            <img src="${images[i]}" style="width:70px;height:70px;object-fit:contain;border-radius:8px;">
            <span style="font-weight:700;color:#0f172a;">${w}</span>
            <span style="margin-left:auto;color:#22c55e;font-weight:700;">✓ +${WORD_XP[w]} XP</span>
        </div>`
    ).join('');

    const popup = document.createElement('div');
    popup.id = 'stageCompleteOverlay';
    popup.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(6px);z-index:1000;display:flex;justify-content:center;align-items:center;';
    popup.innerHTML = `
        <div style="background:#fff;border-radius:24px;padding:40px;max-width:460px;width:90%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.2);">
            <span style="font-size:3.5rem;display:block;margin-bottom:12px;">🎉</span>
            <h2 style="font-size:1.8rem;font-weight:900;color:#0f172a;margin-bottom:6px;">Stage 1 Complete!</h2>
            <p style="color:#64748b;margin-bottom:20px;">You learned all 5 everyday words. Here's your recap:</p>
            <div style="text-align:left;margin-bottom:20px;">${wordReview}</div>
            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:14px 20px;margin-bottom:24px;">
                <p style="margin:0;font-weight:700;color:#16a34a;font-size:1rem;">🔓 Stage 2 Unlocked — Eating & Ordering!</p>
            </div>
            <button id="stageCompleteBtn" style="width:100%;padding:14px;background:#6d8bfa;border:none;border-radius:12px;color:#fff;font-size:16px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;">Go to Word Stages →</button>
        </div>`;
    document.body.appendChild(popup);
    document.getElementById('stageCompleteBtn').addEventListener('click', () => {
        window.location.href = 'learn-word.html';
    });
}

// ── Next word button ──────────────────────────────────────────
nextWordBtn.addEventListener('click', () => {
    successOverlay.classList.remove('visible');

    currentWordIdx++;
    currentWord = WORDS[currentWordIdx];
    wordStartTime = Date.now(); // reset timer for new word

    wordHighlight.textContent = `"${currentWord}"`;
    wordDesc.textContent = WORD_INSTRUCTIONS[currentWord];
    wordTip.innerHTML = `<i class="bi bi-lightbulb"></i> ${WORD_TIPS[currentWord]}`;
    updateWordImage(currentWord);

    progressBar.style.width = '0%';
    progressBar.className = 'hold-fill';
    holdLabel.textContent = 'Make the sign!';

    updateWordList();
    streaming = true;
    detectLoop();
});

// ── Button ────────────────────────────────────────────────────
enableBtn.addEventListener('click', async () => {
    if (!handposeModel) { alert('Still loading, please wait.'); return; }
    enableBtn.disabled = true;
    enableBtn.innerHTML = '<i class="bi bi-camera-video-fill"></i> Camera active';
    await startWebcam();
});

// ── Init ──────────────────────────────────────────────────────
buildWordList();
updateOverallProgress();
updateWordImage(WORDS[0]);
wordStartTime = Date.now(); // start timer for first word
loadModels();