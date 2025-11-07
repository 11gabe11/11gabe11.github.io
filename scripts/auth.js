// scripts/auth.js — unified auth helpers for all portals
// Uses the sb client exported from /pigeon.js

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

  // roles that require verification
  const needsVerification = (prof.role_id === 'agent' || prof.role_id === 'venue_booker');
  if (needsVerification && !prof.is_verified) {
    location.href = pendingHref;
    return false;
  }
  return true;
}

/**
 * Approve/Reject a verification request.
 * - Looks up the request to get requester_id
 * - Updates verification_requests.status
 * - If approved, flips profiles.is_verified for requester
 */
export async function approveRequest(requestId, approve = true, reason = null) {
  // 1) Get the request row (requester_id)
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
      reason: reason ?? (approve ? 'Approved' : 'Rejected')
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

// Re-export the Supabase client for dashboards that may need it.
export { sb };
