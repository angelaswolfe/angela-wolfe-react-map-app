import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);
const dataFile = path.join(process.cwd(), 'frontend', 'data', 'users.json');

type UserRecord = { username: string; hash: string; salt: string };

async function readUsers(): Promise<UserRecord[]> {
  try {
    const txt = await fs.readFile(dataFile, 'utf8');
    return JSON.parse(txt) as UserRecord[];
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
async function writeUsers(users: UserRecord[]) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(users, null, 2), 'utf8');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body?.username ?? '').trim();
    const password = String(body?.password ?? '');

    if (!username || username.length < 3) {
      return NextResponse.json({ error: 'username must be at least 3 characters' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'password must be at least 6 characters' }, { status: 400 });
    }

    const users = await readUsers();
    if (users.find((u) => u.username === username)) {
      return NextResponse.json({ error: 'username already exists' }, { status: 409 });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    const hash = derived.toString('hex');

    users.push({ username, hash, salt });
    await writeUsers(users);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
