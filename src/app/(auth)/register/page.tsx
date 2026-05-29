'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema } from '@/lib/validations';
import { useAuth } from '@/components/providers/auth-provider';
import { RodaNexoLogo } from '@/components/logo';
import { Car, Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';

type RegisterFormValues = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setError(null);
      setSubmitting(true);
      await registerUser(data.name, data.email, data.password);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center p-6">
      {/* Logo */}
      <RodaNexoLogo size="lg" href="/" className="mb-8" />

      {/* Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 max-w-md w-full p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Crie sua conta</h1>
          <p className="text-slate-500 text-sm mt-1">Inscreva-se grátis para gerenciar seus veículos.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex gap-2.5 items-start text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Nome Completo */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="name">
              Nome Completo
            </label>
            <input
              id="name"
              type="text"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-950 placeholder:text-slate-400"
              placeholder="Seu nome"
              {...registerField('name')}
            />
            {errors.name && (
              <p className="text-red-600 text-xs mt-1.5 font-medium">{errors.name.message}</p>
            )}
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-950 placeholder:text-slate-400"
              placeholder="seuemail@exemplo.com"
              {...registerField('email')}
            />
            {errors.email && (
              <p className="text-red-600 text-xs mt-1.5 font-medium">{errors.email.message}</p>
            )}
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-950 placeholder:text-slate-400"
              placeholder="Mínimo 6 caracteres"
              {...registerField('password')}
            />
            {errors.password && (
              <p className="text-red-600 text-xs mt-1.5 font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Botão Registrar */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl disabled:bg-blue-400 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Criando conta...</span>
              </>
            ) : (
              <span>Criar Conta</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-slate-500 text-sm">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-semibold">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
