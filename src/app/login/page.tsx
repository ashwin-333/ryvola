"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("Auth error:", error.message);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="flex w-full max-w-[320px] flex-col items-center">
        <Image
          src="/ryvolalogo.png"
          alt="Ryvola"
          width={140}
          height={47}
          className="object-contain"
          priority
        />

        <p className="mt-2 text-center text-[13px] leading-relaxed text-zinc-400">
          Screenshot any assignment.
          <br />
          Get an instant plan. Stay on track.
        </p>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-[13px] font-medium text-zinc-700 transition-all hover:border-zinc-300 hover:shadow-sm active:scale-[0.995] disabled:opacity-50"
        >
          <svg width="15" height="15" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
          </svg>
          {loading ? "Signing in…" : "Continue with Google"}
        </button>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-zinc-300">
          By continuing you agree to let Ryvola read
          <br />
          assignment prompts and access Google Calendar.
        </p>
      </div>
    </main>
  );
}
