/**
 * Authentication Service
 *
 * Handles user authentication via Supabase Auth.
 * Uses phone number as the user identifier (stored as virtual email format internally).
 * No SMS verification required — phone number uniqueness is enforced at DB level.
 */

import { supabase } from '../utils/supabase';
import type { User, Session } from '@supabase/supabase-js';

// ============================================================
// Types
// ============================================================

export interface AuthUser {
  id: string;
  phone: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Converts phone number to a virtual email for Supabase Auth.
 * e.g. "13800138000" → "13800138000@phone.local"
 */
function phoneToEmail(phone: string): string {
  return `${phone.replace(/\D/g, '')}@phone.local`;
}

/**
 * Extracts phone number from virtual email.
 * e.g. "13800138000@phone.local" → "13800138000"
 */
function emailToPhone(email: string): string {
  return email.replace(/@phone\.local$/, '');
}

function mapUser(user: User): AuthUser {
  const email = user.email ?? '';
  return {
    id: user.id,
    phone: emailToPhone(email),
    displayName: user.user_metadata?.display_name ?? emailToPhone(email),
    avatarUrl: user.user_metadata?.avatar_url ?? undefined,
    createdAt: user.created_at,
  };
}

// ============================================================
// Auth Functions
// ============================================================

/**
 * Register a new user with phone number and password.
 * Phone number uniqueness is enforced by Supabase (virtual email must be unique).
 */
export async function signUp(phone: string, password: string, displayName?: string) {
  const email = phoneToEmail(phone);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName ?? phone, phone_number: phone },
      emailRedirectTo: undefined,
    },
  });

  if (error) {
    // Translate common errors to Chinese
    if (error.message.includes('already registered')) {
      throw new Error('该手机号已被注册');
    }
    throw error;
  }
  return data.user ? mapUser(data.user) : null;
}

/**
 * Sign in with phone number and password.
 */
export async function signIn(phone: string, password: string) {
  const email = phoneToEmail(phone);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('手机号或密码错误');
    }
    throw error;
  }
  return {
    user: data.user ? mapUser(data.user) : null,
    session: data.session,
  };
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get the current session (auto-refreshes if expired).
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Get the current user.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return mapUser(data.user);
}

/**
 * Listen to auth state changes (login, logout, token refresh).
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null, session: Session | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ? mapUser(session.user) : null;
    callback(user, session);
  });

  return data.subscription;
}
