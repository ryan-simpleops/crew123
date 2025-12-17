import { supabase } from './supabase';

/**
 * Validates and normalizes phone numbers to E.164 format
 * @param {string} phone - Phone number in any format
 * @returns {object} - { valid: boolean, normalized?: string, error?: string }
 */
export function validatePhone(phone) {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // US phone numbers: 10 digits or 11 with leading 1
  if (digits.length === 10) {
    return { valid: true, normalized: `+1${digits}` };
  }

  if (digits.length === 11 && digits[0] === '1') {
    return { valid: true, normalized: `+${digits}` };
  }

  // International: 7-15 digits with leading country code
  if (digits.length >= 7 && digits.length <= 15) {
    return { valid: true, normalized: `+${digits}` };
  }

  return {
    valid: false,
    error: 'Invalid phone format. Use 10-digit US number or international format.'
  };
}

/**
 * Checks if a phone number already exists in the database
 * @param {string} phone - Phone number to check
 * @returns {Promise<object>} - { isDuplicate: boolean, existingCrew?: object }
 */
export async function checkPhoneDuplicate(phone) {
  const validation = validatePhone(phone);

  if (!validation.valid) {
    return { isDuplicate: false };
  }

  const { data } = await supabase
    .from('crew_members')
    .select('id, name, phone')
    .eq('phone', validation.normalized)
    .maybeSingle();

  return {
    isDuplicate: !!data,
    existingCrew: data
  };
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (!email) return true; // Email is optional

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
