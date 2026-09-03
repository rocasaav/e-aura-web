'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    // Login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("Credenciales incorrectas. Por favor verifica tu correo y contraseña.");
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      setErrorMsg("No se pudo obtener el usuario.");
      setLoading(false);
      return;
    }

    // Verificar rol
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setErrorMsg("No se pudo verificar el rol del usuario.");
      setLoading(false);
      return;
    }

    if (profile.role !== "admin") {
      setErrorMsg("No tienes permisos para acceder al panel de administración.");
      setLoading(false);
      return;
    }

    router.push("/admin");
  };

  return (
    <div className="w-full max-w-md bg-white/80 backdrop-blur-md p-8 rounded-2xl border border-[#e8ded1] shadow-lg">
      <div className="text-center mb-6">
        <span className="text-[10px] tracking-widest font-[var(--font-cinzel)] text-[#7a5c29] uppercase font-semibold">
          Acceso Restringido
        </span>
        <h1 className="text-2xl font-bold font-[var(--font-cinzel)] text-[#3d2b1f] mt-1">
          Iniciar Sesión - Admin
        </h1>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-center font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold mb-1 text-[#3d2b1f]">Correo Electrónico</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@e-aura.com.mx"
            className="w-full px-4 py-2.5 rounded-xl border border-[#c9b596] bg-white text-[#3d2b1f] focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1 text-[#3d2b1f]">Contraseña</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-xl border border-[#c9b596] bg-white text-[#3d2b1f] focus:outline-none focus:ring-2 focus:ring-[#7a5c29]/40"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 bg-[#3d2b1f] text-white rounded-xl font-semibold hover:bg-[#5a3e2b] transition-all shadow-sm disabled:opacity-50 text-xs"
        >
          {loading ? "Verificando..." : "Ingresar al Panel"}
        </button>
      </form>
    </div>
  );
}
