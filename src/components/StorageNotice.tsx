"use client";

// Safari deletes a site's localStorage after seven days of Safari use without a
// visit, which would take every character with it. Home-screen web apps are
// exempt from that sweep, and the Storage API can mark the data persistent, so
// we request persistence and tell the player plainly when it wasn't granted.
// See https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/

import { useEffect, useState, useSyncExternalStore } from "react";

export type PersistState = "checking" | "persisted" | "at-risk" | "unsupported";

export function useStoragePersistence(): PersistState {
  const [state, setState] = useState<PersistState>("checking");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const manager =
        typeof navigator !== "undefined" ? navigator.storage : undefined;
      if (!manager?.persist || !manager?.persisted) {
        if (!cancelled) setState("unsupported");
        return;
      }
      try {
        if (await manager.persisted()) {
          if (!cancelled) setState("persisted");
          return;
        }
        // Browsers decide by heuristic -- being installed to the home screen is
        // the big one -- so this may be declined, which is worth reporting.
        const granted = await manager.persist();
        if (!cancelled) setState(granted ? "persisted" : "at-risk");
      } catch {
        if (!cancelled) setState("unsupported");
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

// Whether the app is running from the home screen rather than a browser tab.
// This is browser state, so it is read through useSyncExternalStore -- that also
// means the banner updates itself the moment the app gets installed.
const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribeStandalone(onChange: () => void) {
  const mq = window.matchMedia(STANDALONE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getStandalone(): boolean {
  const iosStandalone = (
    window.navigator as Navigator & { standalone?: boolean }
  ).standalone;
  return window.matchMedia(STANDALONE_QUERY).matches || iosStandalone === true;
}

function getStandaloneOnServer(): boolean {
  return false;
}

/**
 * True on iPhone and iPad, where every browser runs on WebKit and is therefore
 * subject to the seven-day deletion. Everywhere else, storage is only evicted
 * under real disk pressure, so the warning has to say something different or it
 * frightens people about a rule that doesn't apply to them.
 */
function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports itself as a Mac, so touch points break the tie.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

export function StorageNotice({ hasCharacters }: { hasCharacters: boolean }) {
  const state = useStoragePersistence();
  const installed = useSyncExternalStore(
    subscribeStandalone,
    getStandalone,
    getStandaloneOnServer,
  );
  const [dismissed, setDismissed] = useState(false);
  const apple = isAppleMobile();

  if (dismissed || state === "checking" || state === "persisted") return null;
  // Nothing to lose yet, and a warning on an empty roster is just noise.
  if (!hasCharacters) return null;

  // Only Apple's seven-day rule justifies alarm; elsewhere this is a reminder.
  const tone = apple ? "var(--bad)" : "var(--warn)";

  return (
    <div className="mb-4 rounded border px-3 py-2.5" style={{ borderColor: tone }}>
      <p className="label mb-1" style={{ color: tone }}>
        {apple ? "Your characters could be deleted" : "Worth keeping a backup"}
      </p>

      {apple ? (
        <>
          <p className="text-sm">
            This browser hasn&apos;t marked the sheet&apos;s data as permanent, and
            on iPhone and iPad Safari erases a site&apos;s saved data after{" "}
            <strong>seven days without a visit</strong> — which would take your
            characters with it.
          </p>
          <p className="mt-1.5 text-sm">
            {installed ? (
              <>
                Keep opening it from the Home Screen icon rather than a browser tab,
                and export a backup you can re-import.
              </>
            ) : (
              <>
                Fix it by adding this to your Home Screen — <em>Share → Add to Home
                Screen</em>. Home-screen apps are exempt from that deletion.
              </>
            )}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm">
            This browser hasn&apos;t marked the sheet&apos;s data as permanent yet.
            Nothing gets deleted on a schedule here — that only happens if the
            device runs genuinely low on storage — but clearing site data always
            erases it.
          </p>
          <p className="mt-1.5 text-sm">
            {installed
              ? "Installed apps usually earn permanent storage after a little use, so this notice should clear on its own."
              : "Installing it (Install app in Chrome) makes permanent storage far more likely."}{" "}
            Either way, <strong>Back up all</strong> is the real safety net.
          </p>
        </>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button className="btn btn-sm" onClick={() => setDismissed(true)}>
          Understood
        </button>
      </div>
    </div>
  );
}

/** Quiet confirmation that the data is safe, for the roster footer. */
export function StorageStatusLine() {
  const state = useStoragePersistence();
  if (state === "checking") return null;
  if (state === "persisted") {
    return (
      <span style={{ color: "var(--good)" }}>
        Storage is marked permanent on this device.
      </span>
    );
  }
  if (state === "unsupported") {
    return <span>This browser can&apos;t confirm storage is permanent.</span>;
  }
  return (
    <span style={{ color: "var(--warn)" }}>
      Storage is not marked permanent — back up regularly.
    </span>
  );
}
