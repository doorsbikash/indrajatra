import { useEffect, useState } from "react";
import { Download, Share2, Smartphone } from "lucide-react";
import { trackEvent } from "../lib/analytics/track";
import { CloseButton, Sheet } from "./ui";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);

const isIosDevice = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const isMobileBrowser = () =>
  isIosDevice() || /Android/i.test(navigator.userAgent) ||
  window.matchMedia("(max-width: 820px) and (pointer: coarse)").matches;

const INTRO_SEEN = "ij26-install-intro-seen";

export function InstallAppPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showHelp, setShowHelp] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const ios = isIosDevice();

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      trackEvent("pwa_install_prompted");
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      setShowPopup(false);
      trackEvent("pwa_installed");
    };
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const onDisplayMode = () => setInstalled(isStandalone());

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    displayMode.addEventListener?.("change", onDisplayMode);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      displayMode.removeEventListener?.("change", onDisplayMode);
    };
  }, []);

  useEffect(() => {
    if (installed || !isMobileBrowser()) return;
    try {
      if (window.sessionStorage.getItem(INTRO_SEEN)) return;
      window.sessionStorage.setItem(INTRO_SEEN, "1");
    } catch {
      // Private browsing may block session storage; the card remains available.
    }
    const timer = window.setTimeout(() => setShowPopup(true), 900);
    return () => window.clearTimeout(timer);
  }, [installed]);

  if (installed) return null;

  const install = async () => {
    if (!installEvent) {
      setShowHelp((visible) => !visible);
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") trackEvent("pwa_installed");
    setInstallEvent(null);
    setShowPopup(false);
    if (choice.outcome === "dismissed") setShowHelp(true);
  };

  return (
    <>
      <section className="install-card" aria-labelledby="install-app-title">
        <span className="icon-disc icon-disc--gold"><Smartphone size={19} /></span>
        <div className="install-card__copy">
          <h2 id="install-app-title">Keep the festival guide handy</h2>
          <p>Install it on your phone for quick access and offline essentials on the day.</p>
          {showHelp && (
            <p className="install-card__help" role="status">
              {ios
                ? <>In Safari, tap <Share2 size={15} aria-label="Share" /> <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</>
                : <>Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</>}
            </p>
          )}
        </div>
        <button type="button" className="btn btn--sm btn--primary" onClick={() => void install()}>
          <Download size={15} />
          {installEvent ? "Install app" : showHelp ? "Hide steps" : "Install steps"}
        </button>
      </section>

      {showPopup && (
        <Sheet onClose={() => setShowPopup(false)} labelledBy="install-popup-title">
          <div className="row row--between install-popup__head">
            <span className="icon-disc icon-disc--gold"><Smartphone size={22} /></span>
            <CloseButton onClick={() => setShowPopup(false)} label="Not now" />
          </div>
          <p className="eyebrow">Better on your phone</p>
          <h2 id="install-popup-title">Add Indra Jatra to your home screen</h2>
          <p className="muted">Open the programme, map and festival essentials like an app. It also keeps key information available when reception is patchy.</p>

          {installEvent ? (
            <button type="button" className="btn btn--primary btn--block" onClick={() => void install()}>
              <Download size={17} />Install app
            </button>
          ) : ios ? (
            <ol className="install-steps">
              <li>Tap the <Share2 size={17} aria-hidden /> <strong>Share</strong> button in Safari.</li>
              <li>Choose <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong>.</li>
            </ol>
          ) : (
            <ol className="install-steps">
              <li>Open your browser menu.</li>
              <li>Choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</li>
              <li>Confirm the installation.</li>
            </ol>
          )}

          {!installEvent && (
            <button type="button" className="btn btn--block" onClick={() => setShowPopup(false)}>Got it</button>
          )}
          <button type="button" className="btn btn--quiet btn--block install-popup__later" onClick={() => setShowPopup(false)}>Not now</button>
        </Sheet>
      )}
    </>
  );
}
