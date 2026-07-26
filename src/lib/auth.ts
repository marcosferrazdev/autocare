import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'autocare-secret-key-12345';
const COOKIE_NAME = 'autocare_token';

export interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Cria um hash seguro para a senha do usuário
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compara uma senha em texto puro com o hash salvo
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Gera um token JWT para a sessão do usuário
 */
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verifica se o token JWT é válido e retorna o payload
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Salva o token JWT em um cookie seguro HttpOnly
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/',
  });
}

/**
 * Remove o cookie de autenticação do usuário
 */
export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Identidade do usuário autenticado, lida direto do JWT assinado — sem ida ao banco.
 * As rotas sempre filtram os dados por userId, então um token de usuário removido
 * simplesmente não encontra nada.
 */
export async function getAuthenticatedUser(): Promise<{ id: string; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    return { id: decoded.userId, email: decoded.email };
  } catch (error) {
    return null;
  }
}

/**
 * Perfil completo do usuário (nome, e-mail). Só use quando precisar dos dados
 * de exibição — custa uma consulta ao banco.
 */
export async function getAuthenticatedUserProfile() {
  const auth = await getAuthenticatedUser();
  if (!auth) return null;

  return prisma.user.findUnique({
    where: { id: auth.id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
}
