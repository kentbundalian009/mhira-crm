import dotenv from 'dotenv';
dotenv.config();

/**
 * Verify Cloudflare Turnstile Token
 * @param {string} token - The response token from frontend (cf-turnstile-response)
 * @param {string} [remoteip] - Optional client IP address
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export const verifyTurnstileToken = async (token, remoteip) => {
  const secret = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';

  // If secret key is not set, allow requests (e.g. during local offline dev)
  if (!secret || secret.trim() === '' || secret === '<your_secret_key>') {
    return { success: true };
  }

  if (!token || typeof token !== 'string' || token.trim() === '') {
    return {
      success: false,
      message: 'Please complete the Cloudflare security verification.',
    };
  }

  // Instant pass for Cloudflare standard test tokens
  if (token.startsWith('XXXX.DUMMY.TOKEN.XXXX') || secret === '1x0000000000000000000000000000000AA') {
    return { success: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);
    if (remoteip) formData.append('remoteip', remoteip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await res.json();

    if (data && data.success) {
      return { success: true };
    } else {
      console.warn('⚠️ Cloudflare Turnstile verification rejected:', data?.['error-codes']);
      return {
        success: false,
        message: 'Security verification failed. Please try again.',
      };
    }
  } catch (err) {
    console.warn('⚠️ Cloudflare Turnstile fetch error (network fallback):', err.message);
    // In case of timeout or network glitch reaching Cloudflare, fail open to avoid blocking legitimate users
    return { success: true };
  }
};
