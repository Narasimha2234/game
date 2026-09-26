"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    setError(null);
    if (!username?.trim() || !password) {
      setError("Please enter mobile and password");
      return;
    }
    setLoading(true);
    try {
      await login({ username, password });
      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <form className="w-full max-w-md bg-white/5 backdrop-blur rounded-lg p-6 shadow" onSubmit={(e)=>e.preventDefault()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-xl">
            🎲
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Goodgudi</h1>
            <p className="text-xs text-slate-400">Admin Portal Sign In</p>
          </div>
        </div>
        {error && <div className="text-sm text-red-400 mb-3">{error}</div>}
        <label className="block mb-2">
          <div className="text-sm mb-1">Username</div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded px-3 py-2 bg-white/4"
            required
          />
        </label>
        <label className="block mb-4">
          <div className="text-sm mb-1">Password</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded px-3 py-2 bg-white/4"
            required
          />
        </label>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded py-2"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
