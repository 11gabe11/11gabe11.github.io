// scripts/auth.js — unified auth helpers + sign-in/up + logout + routing (ESM)
// Relies on the single Supabase client exported from /pigeon.js

import { sb } from '../pigeon.js';

/* =========================
   Small role/flow helpers
   ========================= */
export const ROLES = {
  artist: 'artist',
  agent: 'agent',
  punter: 'punter',
  venueSupervisor: 'venue_supervisor',
  venueBooker: 'venue_booker',
};

export function roleNeedsVerification(roleId) {
  return roleId === ROLES.agent || roleId === ROLES.venueBooker;
}

/* ======================================
   Session / profile primitives
   ====================================== */

/** Ensure there is a session; otherwise send to a login/landing page. */
export async function requireAuthOrSendTo(redirectHref = 'auth.html') {
  const { data, error } = await sb.auth.getSession();
  if (error) {
    console.error('[auth] getSession error:', error.message);
    location.href = redirectHref;
    return false;
  }
  if (!data?.session) {
    location.href = redirectHref;
    return false;
  }
  return true;
}

/** Return the current Supabase session (or null). */
export async function currentSession() {
  const { data: { session } = {} } = await sb.auth.getSession();
  return session ?? null;
}

/** Return the current profile row (or null). */
export async function currentProfile() {
  const session = await currentSession();
  if (!session) return null;

  const { data, error } = await sb
    .from('profiles')
    .select('user_id, role_id, is_verified, display_name, email')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    console.warn('[auth] profile read:', error.message);
    return null;
  }
  return data ?? null;
}

/** If role must be verified, bounce to pending page until verified. */
export async function gateByVerificationOrPending(pendingHref = 'pending.html') {
  const prof = await currentProfile();
  if (!prof) { location.href = 'auth.html'; return false; }

  if (roleNeedsVerification(prof.role_id) && !prof.is_verified) {
    location.href = pendingHref;
    return false;
  }
  return true;
}

/* ======================================
   Routing helpers
   ====================================== */

/** Route the user to the appropriate portal page based on profile + verification. */
export async function routeAfterLogin() {
  const p = await currentProfile();
  if (!p) { location.href = 'auth.html'; return; }

  if (roleNeedsVerification(p.role_id) && !p.is_verified) {
    location.href = 'pending.html';
    return;
  }

  switch (p.role_id) {
    case ROLES.artist:           location.href = 'artist.html'; break;
    case ROLES.agent:            location.href = 'agent.html'; break;
    case ROLES.punter:           location.href = 'punter.html'; break;
    case ROLES.venueSupervisor:  location.href = 'venue-supervisor.html'; break;
    case ROLES.venueBooker:      location.href = 'venue-booker.html'; break;
    default:                     location.href = './';
  }
}

/* ======================================
   Verification workflow
   ====================================== */

/**
 * Approve/Reject a verification request.
 * - Looks up the request to get requester_id
 * - Updates verification_requests.status
 * - If approved, flips profiles.is_verified for requester
 */
export async function approveRequest(requestId, approve = true, reason = null) {
  // 1) Read the request
  const { data: reqRow, error: readErr } = await sb
    .from('verification_requests')
    .select('id, requester_id')
    .eq('id', requestId)
    .maybeSingle();
  if (readErr) throw new Error('[approveRequest] read error: ' + readErr.message);
  if (!reqRow) throw new Error('[approveRequest] request not found');

  // 2) Update the request status
  const { error: updErr } = await sb
    .from('verification_requests')
    .update({
      status: approve ? 'approved' : 'rejected',
      decided_at: new Date().toISOString(),
      reason: reason ?? (approve ? 'Approved' : 'Rejected'),
    })
    .eq('id', requestId);
  if (updErr) throw new Error('[approveRequest] update error: ' + updErr.message);

  // 3) If approved, mark the requester profile as verified
  if (approve) {
    const { error: profErr } = await sb
      .from('profiles')
      .update({ is_verified: true })
      .eq('user_id', reqRow.requester_id);
    if (profErr) throw new Error('[approveRequest] profile update error: ' + profErr.message);
  }

  return true;
}

/**
 * Create a verification request row (e.g., for venue_booker targeting a supervisor).
 * Safe to call multiple times; duplicate/pending handling is left to DB constraints/indexes.
 */
export async function createVerificationRequest({ roleRequested, supervisorEmail = null }) {
  const session = await currentSession();
  if (!session) throw new Error('Not signed in.');

  const payload = {
    requester_id: session.user.id,
    role_requested: roleRequested,
    status: 'pending',
    ...(supervisorEmail ? { target_supervisor_email: supervisorEmail.toLowerCase() } : {}),
  };

  const { error } = await sb.from('verification_requests').insert(payload);
  if (error) throw new Error('[verification] ' + error.message);
  return true;
}

/* ======================================
   Sign-in / Sign-up / Sign-out
   ====================================== */

/** Email + password sign-in. */
export async function signInWithEmail(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({
    email: (email ?? '').trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Email + password sign-up.
 * - Creates auth user
 * - Upserts a profile row
 * - If role requires verification, optionally creates a verification request
 */
export async function signUp({ email, password, displayName, roleId, supervisorEmail }) {
  const normEmail = (email ?? '').trim().toLowerCase();

  const { data: sign, error: signErr } = await sb.auth.signUp({ email: normEmail, password });
  if (signErr) throw new Error(signErr.message);

  const userId = sign.user?.id;
  if (!userId) throw new Error('No user id returned from sign-up.');

  // Ensure profile exists/updated
  const profileRow = {
    user_id: userId,
    email: normEmail,
    display_name: displayName?.trim() || null,
    role_id: roleId,
    is_verified: false,
  };

  const { error: profErr } = await sb
    .from('profiles')
    .upsert(profileRow, { onConflict: 'user_id' });
  if (profErr) throw new Error(profErr.message);

  // If role needs verification, optionally create a targeted verification request
  if (roleNeedsVerification(roleId)) {
    if (roleId === ROLES.venueBooker && supervisorEmail) {
      await createVerificationRequest({
        roleRequested: ROLES.venueBooker,
        supervisorEmail,
      });
    } else if (roleId === ROLES.agent) {
      await createVerificationRequest({ roleRequested: ROLES.agent });
    }
  }

  return sign;
}

/** Sign out and return to auth page (or a custom href). */
export async function logout(redirect = 'auth.html') {
  await sb.auth.signOut();
  location.href = redirect;
}

/* ======================================
   Convenience utilities (optional)
   ====================================== */

/** Get the current user’s email (lowercased) or null. */
export async function currentEmail() {
  const session = await currentSession();
  return session?.user?.email?.toLowerCase() ?? null;
}

/** Update display name in profile (safe helper). */
export async function updateDisplayName(newName) {
  const session = await currentSession();
  if (!session) throw new Error('Not signed in.');
  const { error } = await sb
    .from('profiles')
    .update({ display_name: (newName ?? '').trim() || null })
    .eq('user_id', session.user.id);
  if (error) throw new Error(error.message);
  return true;
}

// Re-export client for dashboards that prefer direct access
export { sb };
