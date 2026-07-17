import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { WashRecordService } from '@/services/wash-record-service';
import { WashRecordSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: carId } = await params;
    const { searchParams } = new URL(request.url);
    const washType = searchParams.get('washType') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const records = await WashRecordService.listByCar(carId, user.id, {
      washType,
      startDate,
      endDate,
    });

    return NextResponse.json(records, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao listar lavagens:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao buscar lavagens.' }, { status });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: carId } = await params;
    const body = await request.json();
    const result = WashRecordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const record = await WashRecordService.create(carId, user.id, result.data);
    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao registrar lavagem:', error);
    const status = error.message?.includes('permissão') || error.message?.includes('autorizado') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao salvar lavagem.' }, { status });
  }
}
