import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { CarService } from '@/services/car-service';
import { CarSchema } from '@/lib/validations';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const cars = await CarService.list(user.id);
    return NextResponse.json(cars, { status: 200 });
  } catch (error) {
    console.error('Erro ao listar veículos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const result = CarSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const car = await CarService.create(user.id, result.data);
    return NextResponse.json(car, { status: 201 });
  } catch (error) {
    console.error('Erro ao cadastrar veículo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
