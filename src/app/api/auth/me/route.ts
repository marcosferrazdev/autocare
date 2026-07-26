import { NextResponse } from 'next/server';
import { getAuthenticatedUserProfile } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthenticatedUserProfile();
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
