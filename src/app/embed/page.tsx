"use client";
import EvaluatePage from "../evaluate/page";

export default function Embed() {
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <EvaluatePage embedded={true} />
      </div>
    </div>
  );
}
