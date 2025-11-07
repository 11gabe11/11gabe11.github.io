// scripts/auth.js — unified auth helpers + sign-in/up + logout + routing
// Uses the single Supabase client exported from /pigeon.js

import { sb } from '../pigeon.js';

/** Ensure there is a session; otherwise send to a login/landing page. */
export async function requireAuthOrSendTo(redirectHref = 'auth.html') {
  const { data: { session }, error } = await sb.auth.getSession();
  if (error) {
    console.error('[auth] getSession error:', error.message);
    location.href = redirectHref;
    return false;
  }
  if (!session) {
    location.href = redirectHref;
    return false;
  }
  return true;
}

/** Return the current profile row (or null). */
export async function currentProfile() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;

  const { data, error } = await sb
    .from('profiles')
    .select('user_id, role_id, is_verified, display_name, email')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) { console.warn('[auth] profile read:', error.message); }
  return data ?? null;
}

/** If role must be verified, bounce to pending page until verified. */
export async function gateByVerificationOrPending(pendingHref = 'pending.html') {
  const prof = await currentProfile();
  if (!prof) { location.href = 'auth.html'; return false; }
  const needsVerification = (prof.role_id === 'agent' || prof.role_id === 'venue_booker');
  if (needsVerification && !prof.is_verified) {
    location.href = pendingHref;
    return false;
  }
  return true;
}

/** Route the user to the appropriate portal page based on profile + verification. */
export async function routeAfterLogin() {
  const p = await currentProfile();
  if (!p) { location.href = 'auth.html'; return; }

  // Roles that require supervisor/central approval
  const needsVerification = (p.role_id === 'agent' || p.role_id === 'venue_booker');
  if (needsVerification && !p.is_verified) { location.href = 'pending.html'; return; }

  switch (p.role_id) {
    case 'artist':            location.href = 'artist.html'; break;
    case 'agent':             location.href = 'agent.html'; break;
    case 'punter':            location.href = 'punter.html'; break;
    case 'venue_supervisor':  location.href = 'venue-supervisor.html'; break;
    case 'venue_booker':      location.href = 'venue-booker.html'; break;
    default:                  location.href = './'; // fallback to home
  }
}

/** Approve/Reject a verification request. */
export async function approveRequest(requestId, approve = true, reason = null) {
  const { data: reqRow, error: readErr } = await sb
    .from('verification_requests')
    .select('id, requester_id')
    .eq('id', requestId)
    .maybeSingle();
  if (readErr) throw new Error('[approveRequest] read error: ' + readErr.message);
  if (!reqRow) throw new Error('[approveRequest] request not found');

  const { error: updErr } = await sb
    .from('verification_requests')
    .update({
      status: approve ? 'approved' : 'rejected',
      decided_at: new Date().toISOString(),
      reason: reason ?? (approve ? 'Approved' : 'Rejected')
    })
    .eq('id', requestId);
  if (updErr) throw new Error('[approveRequest] update error: ' + updErr.message);

  if (approve) {
    const { error: profErr } = await sb
      .from('profiles')
      .update({ is_verified: true })
      .eq('user_id', reqRow.requester_id);
    if (profErr) throw new Error('[approveRequest] profile update error: ' + profErr.message);
  }

  return true;
}

/** Email + password sign-in. */
export async function signInWithEmail(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Email + password sign-up.
 * - Creates auth user
 * - Inserts/Upserts a profile row
 * - If role is venue_booker, optionally creates a verification request directed to a supervisor email
 */
export async function signUp({ email, password, displayName, roleId, supervisorEmail }) {
  const { data: sign, error: signErr } = await sb.auth.signUp({ email, password });
  if (signErr) throw new Error(signErr.message);

  const userId = sign.user?.id;
  if (!userId) throw new Error('No user id returned from sign-up.');

  // Add/overwrite profile
  const profile = {
    user_id: userId,
    email: email.toLowerCase(),
    display_name: displayName ?? null,
    role_id: roleId,
    is_verified: false
  };
  const { error: profErr } = await sb.from('profiles').upsert(profile, { onConflict: 'user_id' });
  if (profErr) throw new Error(profErr.message);

  // If venue_booker, create a targeted verification request
  if (roleId === 'venue_booker' && supervisorEmail) {
    const payload = {
      requester_id: userId,
      role_requested: 'venue_booker',
      status: 'pending',
      target_supervisor_email: supervisorEmail.toLowerCase()
    };
    const { error: vrErr } = await sb.from('verification_requests').insert(payload);
    if (vrErr) throw new Error('[verification] ' + vrErr.message);
  }

  return sign;
}

/** Sign out and return to auth page. */
export async function logout(redirect = 'auth.html') {
  await sb.auth.signOut();
  location.href = redirect;
}

// Re-export the Supabase client for dashboards that may need it.
export { sb };
