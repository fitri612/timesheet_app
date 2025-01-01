import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { date } = body; // e.g., '2024-12'

        console.log('Received Date:', date);

        if (!date) {
            return NextResponse.json({ error: 'Date is required' }, { status: 400 });
        }

        const [year, month] = date.split('-'); // Split the input into year and month

        // Validation for valid month and year
        if (!year || !month || month < 1 || month > 12) {
            return NextResponse.json({ error: 'Invalid month format' }, { status: 400 });
        }

        const startOfMonth = new Date(year, month - 1, 1); // Get the first day of the month
        const endOfMonth = new Date(year, month, 0); // Get the last day of the month

        console.log('Start of Month:', startOfMonth);
        console.log('End of Month:', endOfMonth);

        const worklogs = await prisma.worklog.findMany({
            where: {
                createdAt: {
                    gte: startOfMonth, // Start of the month
                    lte: endOfMonth,   // End of the month
                }
            },
            include: {
                project: true,
                user: true,
            }
        });

        return NextResponse.json(worklogs);

    } catch (error) {
        console.error('Error:', error); // Log error for debugging
        return NextResponse.json({ error: 'Failed to fetch worklogs' }, { status: 500 });
    }
}
  