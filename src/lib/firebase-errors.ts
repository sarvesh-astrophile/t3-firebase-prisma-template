export function getFirebaseErrorMessage(error: any): string {
  // Extract the error code from the error
  const errorCode = error?.code || '';

  // Map Firebase error codes to user-friendly messages
  switch (errorCode) {
    // Authentication errors
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please try logging in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign in is not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Please choose a stronger password. It should be at least 6 characters long.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please check your email or sign up.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again or reset your password.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful login attempts. Please try again later or reset your password.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/popup-closed-by-user':
      return 'The sign in popup was closed before completing. Please try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for OAuth operations. Please contact support.';
    case 'auth/expired-action-code':
      return 'This link has expired. Please request a new one.';
    case 'auth/invalid-action-code':
      return 'This link is invalid. It may have already been used or expired.';
    case 'auth/missing-email':
      return 'Please enter an email address.';
    case 'auth/missing-password':
      return 'Please enter a password.';
    case 'auth/invalid-credential':
      return 'Invalid login credentials. Please check your email and password.';
    default:
      // If we don't have a specific message for this error, use the error message
      // or a generic fallback
      return error?.message || 'An unexpected error occurred. Please try again.';
  }
} 