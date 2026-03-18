import { useState, useEffect, useCallback } from "react";
import { POLAR_ORG_ID, POLAR_API_URL, PRODUCTS } from "./polar-config";

const STORAGE_PREFIX = "polar_license_";

interface LicenseState {
  isLicensed: boolean;
  isLoading: boolean;
  error: string | null;
  licenseKey: string | null;
}

interface UseLicenseReturn extends LicenseState {
  activate: (key: string) => Promise<boolean>;
  deactivate: () => void;
  productInfo: (typeof PRODUCTS)[string];
  checkoutUrl: string;
}

function getStorageKey(pluginSlug: string): string {
  return `${STORAGE_PREFIX}${pluginSlug}`;
}

function getStoredKey(pluginSlug: string): string | null {
  try {
    return localStorage.getItem(getStorageKey(pluginSlug));
  } catch {
    return null;
  }
}

function storeKey(pluginSlug: string, key: string): void {
  try {
    localStorage.setItem(getStorageKey(pluginSlug), key);
  } catch {
    // localStorage not available
  }
}

function removeKey(pluginSlug: string): void {
  try {
    localStorage.removeItem(getStorageKey(pluginSlug));
  } catch {
    // localStorage not available
  }
}

async function validateKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${POLAR_API_URL}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        organizationId: POLAR_ORG_ID,
      }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

async function activateKey(key: string): Promise<{ success: boolean; activationId?: string }> {
  try {
    const res = await fetch(`${POLAR_API_URL}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        organizationId: POLAR_ORG_ID,
        label: "framer-plugin",
      }),
    });
    if (!res.ok) {
      return { success: false };
    }
    const data = await res.json();
    return { success: true, activationId: data.id };
  } catch {
    return { success: false };
  }
}

export function useLicense(pluginSlug: string): UseLicenseReturn {
  const [state, setState] = useState<LicenseState>({
    isLicensed: false,
    isLoading: true,
    error: null,
    licenseKey: null,
  });

  const product = PRODUCTS[pluginSlug];
  const checkoutUrl = `https://polar.sh/checkout?productId=${product?.id}`;

  // Check stored key on mount
  useEffect(() => {
    const stored = getStoredKey(pluginSlug);
    if (!stored) {
      setState({ isLicensed: false, isLoading: false, error: null, licenseKey: null });
      return;
    }

    validateKey(stored).then((valid) => {
      if (valid) {
        setState({ isLicensed: true, isLoading: false, error: null, licenseKey: stored });
      } else {
        removeKey(pluginSlug);
        setState({ isLicensed: false, isLoading: false, error: null, licenseKey: null });
      }
    });
  }, [pluginSlug]);

  const activate = useCallback(
    async (key: string): Promise<boolean> => {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      // First validate
      const valid = await validateKey(key);
      if (!valid) {
        setState((s) => ({ ...s, isLoading: false, error: "Invalid license key" }));
        return false;
      }

      // Then activate (for device tracking)
      const { success } = await activateKey(key);
      if (!success) {
        // Validation passed but activation failed — might be at device limit
        setState((s) => ({ ...s, isLoading: false, error: "Activation limit reached. Deactivate another device first." }));
        return false;
      }

      storeKey(pluginSlug, key);
      setState({ isLicensed: true, isLoading: false, error: null, licenseKey: key });
      return true;
    },
    [pluginSlug]
  );

  const deactivate = useCallback(() => {
    removeKey(pluginSlug);
    setState({ isLicensed: false, isLoading: false, error: null, licenseKey: null });
  }, [pluginSlug]);

  return {
    ...state,
    activate,
    deactivate,
    productInfo: product,
    checkoutUrl,
  };
}
