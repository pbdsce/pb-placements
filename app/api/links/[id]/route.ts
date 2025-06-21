import { NextRequest, NextResponse } from 'next/server';
import { LinkService } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const links = await LinkService.getMemberLinks(params.id);
    return NextResponse.json(links);
  } catch (error) {
    console.error('Error fetching member links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member links' },
      { status: 500 }
    );
  }
} 