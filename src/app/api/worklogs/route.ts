import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, projectId, workDate, hoursWorked } = body;

    const parsedWorkDate = new Date(workDate);

    const existingWorklogs = await prisma.worklog.findMany({
      where: {
        userId: parseInt(userId),
        workDate: parsedWorkDate,
      },
    });
    
    const totalHoursWorked = existingWorklogs.reduce(
      (total, log) => total + log.hoursWorked,
      0
    );

    if (totalHoursWorked + parseFloat(hoursWorked) > 8) {
      return NextResponse.json(
        { error: 'Cannot log more than 8 hours for this day.' },
        { status: 400 }
      );
    }

    const worklog = await prisma.worklog.create({
      data: {
        userId: parseInt(userId),
        projectId: parseInt(projectId),
        workDate: parsedWorkDate,
        hoursWorked: parseFloat(hoursWorked),
      },
      include: {
        project: true,
      },
    });

    return NextResponse.json(worklog);
  } catch (error) {
    console.error('Error creating worklog:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create worklog' },
      { status: 500 }
    );
  }
}


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const worklogs = await prisma.worklog.findMany({
      where: {
        userId: userId ? parseInt(userId) : undefined,
      },
      include: {
        project: true,
        user: true,
      },
      orderBy: {
        workDate: 'desc',
      },
    });

    return NextResponse.json(worklogs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch worklogs' }, { status: 500 });
  }
}