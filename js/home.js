import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAtvEg9LMPYz_ksNsPkWXjSof85XD0BhWc",
  authDomain: "signify-0326.firebaseapp.com",
  projectId: "signify-0326",
  storageBucket: "signify-0326.firebasestorage.app",
  messagingSenderId: "277885993716",
  appId: "1:277885993716:web:8aa7aef7777f14417e14a1",
  databaseURL: "https://signify-0326-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

onAuthStateChanged(auth, async (user) => {
  const returningUserView = document.getElementById('returningUserView');
  const newUserView       = document.getElementById('newUserView');
  const loadingView       = document.getElementById('loadingView');

  if (!returningUserView || !newUserView || !loadingView) return;

  if (user) {
    newUserView.style.display  = 'none';
    loadingView.style.display  = 'block';

    await loadUserData(user);
    await loadMiniLeaderboard(user.uid);

    // Show dashboard FIRST, then rank is visible in the DOM
    loadingView.style.display       = 'none';
    returningUserView.style.display = 'block';

  } else {
    returningUserView.style.display = 'none';
    loadingView.style.display       = 'none';
    newUserView.style.display       = 'block';
  }
});

async function loadUserData(user) {
  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (!userSnap.exists()) return;
  const data = userSnap.data();

  const streakEl = document.getElementById('stat-streak');
  if (streakEl) streakEl.innerText = `${data.streak || 0} Days`;

  const xpEl = document.getElementById('stat-xp');
  if (xpEl) xpEl.innerText = `${data.total_xp || 0} XP`;

  // Alphabet progress from subcollection
  // const alphaSnap = await getDocs(collection(db, "users", user.uid, "alphabet")); not neccessary since it is not being used anymore in this way
  const alphaMap = data.alphabet || {};
  const learned  = Object.values(alphaMap).filter(v => v === true).length;
  const pct      = Math.round((learned / 26) * 100);

  const pAtoZText = document.getElementById('progress-AtoZ-text');
  const pAtoZBar  = document.getElementById('progress-AtoZ-bar');
  if (pAtoZText) pAtoZText.innerText  = `${pct}%`;
  if (pAtoZBar)  pAtoZBar.style.width = `${pct}%`;

  const nextBtn = document.getElementById('next-lesson-btn');
  if (nextBtn) nextBtn.innerText = `Jump to Letter "${data.nextLetter || 'A'}"`;
}

async function loadMiniLeaderboard(currentUid) {
  const leaderboardEl = document.getElementById('mini-leaderboard');
  if (!leaderboardEl) return;

  leaderboardEl.innerHTML = '';

  // Single query for all users sorted by XP
  const allSnap = await getDocs(query(collection(db, "users"), orderBy("total_xp", "desc")));
  const allDocs = allSnap.docs;

  // True XP rank
  const trueRank = allDocs.findIndex(d => d.id === currentUid) + 1;
  console.log("trueRank:", trueRank, "uid:", currentUid);

  // Top 4 mini leaderboard
  allDocs.slice(0, 4).forEach((docSnap, i) => {
    const rank = i + 1;
    const data = docSnap.data();
    const isMe = docSnap.id === currentUid;

    let iconHtml = `<span class="me-2 text-muted fw-bold">${rank}.</span>`;
  if (rank === 1) iconHtml = `<span class="rank-1" style="display:inline-flex;align-items:center;gap:4px;"><span class="material-icons" style="font-size:18px;">emoji_events</span>1</span>`;
  else if (rank === 2) iconHtml = `<span class="rank-2" style="display:inline-flex;align-items:center;gap:4px;"><span class="material-icons" style="font-size:18px;">emoji_events</span>2</span>`;
  else if (rank === 3) iconHtml = `<span class="rank-3" style="display:inline-flex;align-items:center;gap:4px;"><span class="material-icons" style="font-size:18px;">emoji_events</span>3</span>`;

    const displayName = data.displayName || data.email?.split('@')[0] || 'User';

    const li = document.createElement('li');
    li.className = `list-group-item d-flex justify-content-between align-items-center px-0 ${isMe ? 'bg-light rounded mt-2 p-2 border' : ''}`;
    li.innerHTML = `
  <span style="display:inline-flex;align-items:center;center;gap:20px;">${iconHtml} ${isMe ? `<strong>${displayName} (You)</strong>` : displayName}</span>
  
      <span class="badge rounded-pill" style="background-color:${isMe ? '#648FFF' : '#1e293b'};">
        ${data.total_xp || 0} XP
      </span>
    `;
    leaderboardEl.appendChild(li);
  });

  // Set rank after everything is done
  const rankEl = document.getElementById('stat-rank');
  if (rankEl) rankEl.innerText = trueRank > 0 ? `Rank #${trueRank}` : 'Keep Learning!';
}