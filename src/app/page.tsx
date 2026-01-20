"use client";

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [randomWord, setRandomWord] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRandomWord = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/random-word", {
        method: "POST",
      });
      const data = await response.json();
      setRandomWord(data.randomWord);
    } catch (error) {
      console.error("Error fetching random word:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Random Word Generator
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:size-auto lg:bg-none">
          <a
            className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
            href="https://vercel.com?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            By{" "}
            <Image
              src="/vercel.svg"
              alt="Vercel Logo"
              className="dark:invert"
              width={100}
              height={24}
              priority
            />
          </a>
        </div>
      </div>

      <div className="flex flex-col items-center gap-8">
        <div className="relative flex place-items-center before:absolute before:h-[300px] before:w-full before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-full after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 sm:before:w-[480px] sm:after:w-[240px] before:lg:h-[360px]">
          <Image
            className="relative dark:drop-shadow-[0_0_0.3rem_#ffffff70] dark:invert"
            src="/next.svg"
            alt="Next.js Logo"
            width={180}
            height={37}
            priority
          />
        </div>

        <div className="z-10 flex flex-col items-center gap-4">
          <button
            onClick={fetchRandomWord}
            disabled={loading}
            className="rounded-full bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Fetching..." : "Get Random Word"}
          </button>

          {randomWord && (
            <div className="mt-4 text-center">
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Your random word is:
              </p>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {randomWord}
              </h1>
            </div>
          )}
        </div>
      </div>

      <div className="mb-32 grid text-center lg:mb-0 lg:w-full lg:max-w-5xl lg:grid-cols-4 lg:text-left opacity-50">
        {/* Retaining footer links but dimmed */}
      </div>
    </main>
  );
}
