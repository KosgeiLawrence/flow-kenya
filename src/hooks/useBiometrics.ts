import { useState, useEffect, useCallback } from "react";

const BIOMETRIC_ENABLED_KEY = "biometric-enabled";
const BIOMETRIC_CRED_ID_KEY = "biometric-credential-id";
const BIOMETRIC_USER_ID_KEY = "biometric-user-id";
const APP_LOCKED_KEY = "app-locked";

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function useBiometrics(userId: string | undefined) {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Check WebAuthn support
  useEffect(() => {
    const check = async () => {
      // WebAuthn is blocked inside iframes (e.g. Lovable preview)
      const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
      if (isInIframe || !window.PublicKeyCredential) {
        setIsSupported(false);
        return;
      }
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsSupported(available);
      } catch {
        setIsSupported(false);
      }
    };
    check();
  }, []);

  // Check if biometric is enabled for this user
  useEffect(() => {
    if (!userId) return;
    const storedUserId = localStorage.getItem(BIOMETRIC_USER_ID_KEY);
    const enabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true";
    const credId = localStorage.getItem(BIOMETRIC_CRED_ID_KEY);
    
    if (enabled && credId && storedUserId === userId) {
      setIsEnabled(true);
      // Check if app should be locked (returning user)
      const locked = sessionStorage.getItem(APP_LOCKED_KEY);
      if (locked === null) {
        // First visit in this session — lock the app
        sessionStorage.setItem(APP_LOCKED_KEY, "true");
        setIsLocked(true);
      } else {
        setIsLocked(locked === "true");
      }
    } else {
      setIsEnabled(false);
      setIsLocked(false);
    }
  }, [userId]);

  const register = useCallback(async () => {
    if (!userId || !isSupported) return false;
    setIsRegistering(true);
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userIdBuffer = new TextEncoder().encode(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: "Twende Green Ecocycle",
            id: window.location.hostname,
          },
          user: {
            id: userIdBuffer,
            name: "Twende Green Ecocycle User",
            displayName: "Twende Green Ecocycle User",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },   // ES256
            { alg: -257, type: "public-key" },  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (!credential) return false;

      const credId = bufferToBase64(credential.rawId);
      localStorage.setItem(BIOMETRIC_CRED_ID_KEY, credId);
      localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
      localStorage.setItem(BIOMETRIC_USER_ID_KEY, userId);
      sessionStorage.setItem(APP_LOCKED_KEY, "false");
      setIsEnabled(true);
      setIsLocked(false);
      return true;
    } catch (err) {
      console.error("Biometric registration failed:", err);
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, [userId, isSupported]);

  const authenticate = useCallback(async () => {
    if (!isEnabled) return false;
    setIsAuthenticating(true);
    try {
      const credId = localStorage.getItem(BIOMETRIC_CRED_ID_KEY);
      if (!credId) return false;

      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [
            {
              id: base64ToBuffer(credId),
              type: "public-key",
              transports: ["internal"],
            },
          ],
          userVerification: "required",
          timeout: 60000,
        },
      });

      if (assertion) {
        sessionStorage.setItem(APP_LOCKED_KEY, "false");
        setIsLocked(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Biometric authentication failed:", err);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [isEnabled]);

  const disable = useCallback(() => {
    localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    localStorage.removeItem(BIOMETRIC_CRED_ID_KEY);
    localStorage.removeItem(BIOMETRIC_USER_ID_KEY);
    sessionStorage.removeItem(APP_LOCKED_KEY);
    setIsEnabled(false);
    setIsLocked(false);
  }, []);

  const unlock = useCallback(() => {
    sessionStorage.setItem(APP_LOCKED_KEY, "false");
    setIsLocked(false);
  }, []);

  return {
    isSupported,
    isEnabled,
    isLocked,
    isRegistering,
    isAuthenticating,
    register,
    authenticate,
    disable,
    unlock,
  };
}
