/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    setDone(true);
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      {!done ? (
        <form onSubmit={handleSubmit}>
          <h2>Forgot Password</h2>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      ) : (
        <p>If the email exists, a reset link has been sent.</p>
      )}
    </div>
  );
}