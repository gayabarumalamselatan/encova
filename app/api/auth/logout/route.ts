import { NextResponse } from 'next/server';
import { removeToken } from '@/lib/auth';

export async function POST() {
  await removeToken();
  return NextResponse.json({ success: true, message: 'Logged out successfully' });
}
