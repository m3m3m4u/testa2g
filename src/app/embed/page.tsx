"use client";
import { useEffect } from "react";
import EvaluatePage from "../evaluate/page";

export default function Embed() {
  useEffect(() => {
    // Send a ready message to the parent for diagnostics
    function sendReady() {
      try {
        const height = document.documentElement.scrollHeight || document.body.scrollHeight;
        window.parent.postMessage({ type: 'embed-ready', height }, '*');
      } catch (e) {
        // ignore
      }
    }

    sendReady();
    const ro = new ResizeObserver(() => sendReady());
    ro.observe(document.body);
    window.addEventListener('load', sendReady);
    return () => {
      ro.disconnect();
      window.removeEventListener('load', sendReady);
    };
  }, []);

  return (
    <div className="embed-mode min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <EvaluatePage />
      </div>
    </div>
  );
}
