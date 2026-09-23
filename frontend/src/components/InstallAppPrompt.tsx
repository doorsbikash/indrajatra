import { useEffect, useState } from "react";
import { Download, Share2, Smartphone } from "lucide-react";
import { trackEvent } from "../lib/analytics/track";

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

export function InstallAppPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showHelp, setShowHelp] = useState(false);
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
    if (choice.outcome === "dismissed") setShowHelp(true);
  };

  return (
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
  );
}
