// ============================================================
// auth.js — Authentication (shared by all pages)
// ============================================================
import { auth, db, googleProvider, doc, getDoc, setDoc,
         onAuthStateChanged, signOut, signInWithPopup,
         signInWithEmailAndPassword, createUserWithEmailAndPassword,
         updateProfile, serverTimestamp, deleteUser } from './firebase.js';
import { showToast } from './utils.js';

export let currentUser = null;
export let userSavedPosts = [];

// ===== AUTH STATE LISTENER =====
export function initAuth(onLogin, onLogout) {
  let userUnsub = null;

  onAuthStateChanged(auth, async (user) => {
    if (userUnsub) { userUnsub(); userUnsub = null; }

    if (user) {
      currentUser = user;
      // Update UI elements
      document.querySelectorAll('.auth-required').forEach(el => el.style.display = '');
      document.querySelectorAll('.guest-only').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.user-avatar').forEach(img => {
        img.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName||'U')}&background=random`;
      });
      document.getElementById('sign-in-btn')?.style && (document.getElementById('sign-in-btn').style.display = 'none');
      document.getElementById('user-actions')?.style && (document.getElementById('user-actions').style.display = 'flex');

      // Live user doc listener
      const uRef = doc(db, 'users', user.uid);
      userUnsub = await import('./firebase.js').then(({onSnapshot}) =>
        onSnapshot(uRef, async (snap) => {
          if (!snap.exists()) {
            // Create user doc
            await setDoc(uRef, {
              displayName: user.displayName || 'User',
              email: user.email || '',
              photoURL: user.photoURL || '',
              username: '',
              bio: '',
              followersCount: 0, followingCount: 0,
              followers: [], following: [], savedPosts: [],
              createdAt: serverTimestamp()
            }, { merge: true });
            if (!snap.data()?.username) showUsernameModal();
          } else {
            const d = snap.data();
            userSavedPosts = d.savedPosts || [];
            if (!d.username) showUsernameModal();
          }
        })
      );
      if (onLogin) onLogin(user);
    } else {
      currentUser = null;
      userSavedPosts = [];
      document.querySelectorAll('.auth-required').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.guest-only').forEach(el => el.style.display = '');
      document.getElementById('sign-in-btn')?.style && (document.getElementById('sign-in-btn').style.display = 'block');
      document.getElementById('user-actions')?.style && (document.getElementById('user-actions').style.display = 'none');
      if (onLogout) onLogout();
    }
  });
}

// ===== OPEN AUTH MODAL =====
export function openAuthModal() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) { overlay.classList.add('open'); return; }
  // Redirect to login page if modal not present
  window.location.href = '/pages/login.html?redirect=' + encodeURIComponent(window.location.href);
}

// ===== GOOGLE SIGN IN =====
export async function handleGoogleSignIn() {
  try {
    await signInWithPopup(auth, googleProvider);
    closeAuthModal();
  } catch(e) {
    showToast(e.code === 'auth/popup-blocked' ? 'Popup blocked. Allow popups.' : 'Google sign in failed.');
  }
}

// ===== EMAIL SIGN IN =====
export async function handleEmailSignIn(e) {
  e?.preventDefault();
  const email = document.getElementById('signin-email')?.value.trim();
  const pass  = document.getElementById('signin-password')?.value;
  const errEl = document.getElementById('auth-error-signin');
  if (!email || !pass) return;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    closeAuthModal();
  } catch(err) {
    if (errEl) errEl.textContent = err.code === 'auth/invalid-credential'
      ? 'Wrong email or password' : 'Sign in failed. Try again.';
  }
}

// ===== EMAIL SIGN UP =====
export async function handleEmailSignUp(e) {
  e?.preventDefault();
  const name  = document.getElementById('signup-name')?.value.trim();
  const email = document.getElementById('signup-email')?.value.trim();
  const pass  = document.getElementById('signup-password')?.value;
  const errEl = document.getElementById('auth-error-signup');
  if (!name || !email || !pass) return;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    closeAuthModal();
  } catch(err) {
    if (errEl) errEl.textContent = err.code === 'auth/email-already-in-use'
      ? 'Email already registered' : 'Sign up failed. Try again.';
  }
}

// ===== SIGN OUT =====
export async function doLogout() {
  await signOut(auth);
  showToast('Signed out');
  setTimeout(() => window.location.href = '/', 800);
}

// ===== USERNAME MODAL =====
export function showUsernameModal() {
  const modal = document.getElementById('username-overlay');
  if (modal) modal.classList.add('open');
}

export async function saveUsername() {
  const input = document.getElementById('new-username-input');
  const un = (input?.value || '').trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
  if (!un || un.length < 3) return showToast('Username must be at least 3 characters');
  if (un.length > 30) return showToast('Username too long');
  if (!currentUser) return;
  const btn = document.getElementById('save-username-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  try {
    await setDoc(doc(db, 'users', currentUser.uid), { username: un }, { merge: true });
    document.getElementById('username-overlay')?.classList.remove('open');
    showToast('Username saved!');
  } catch { showToast('Error. Try again.'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = 'Save & Continue'; } }
}

// ===== DELETE ACCOUNT =====
export async function requestAccountDeletion() {
  if (!currentUser) return openAuthModal();
  if (!confirm('Delete your account? All posts and data will be permanently removed.')) return;
  const email = prompt('Type your email to confirm:');
  if (!email || email.trim().toLowerCase() !== (currentUser.email || '').toLowerCase()) {
    return showToast('Email did not match.');
  }
  try {
    await deleteUser(currentUser);
    showToast('Account deleted.');
    setTimeout(() => window.location.href = '/', 1500);
  } catch(e) {
    if (e.code === 'auth/requires-recent-login') showToast('Sign out & sign in again, then try.');
    else showToast('Failed. Email newstallyofficial@gmail.com');
  }
}

export function closeAuthModal() {
  document.getElementById('auth-overlay')?.classList.remove('open');
}

export function toggleAuthView(view) {
  document.getElementById('auth-view-signin').style.display = view === 'signin' ? '' : 'none';
  document.getElementById('auth-view-signup').style.display = view === 'signup' ? '' : 'none';
}

// Make functions globally accessible
window.handleGoogleSignIn = handleGoogleSignIn;
window.handleEmailSignIn  = handleEmailSignIn;
window.handleEmailSignUp  = handleEmailSignUp;
window.doLogout           = doLogout;
window.saveUsername       = saveUsername;
window.openAuthModal      = openAuthModal;
window.closeAuthModal     = closeAuthModal;
window.toggleAuthView     = toggleAuthView;
window.requestAccountDeletion = requestAccountDeletion;
