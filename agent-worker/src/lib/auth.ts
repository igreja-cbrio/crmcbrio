import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const SECRET = process.env.WORKER_SECRET;

if (!SECRET || SECRET.length < 16) {
  throw new Error('WORKER_SECRET ausente ou curto demais (mín 16 chars).');
}

/**
 * HMAC simples: o cliente envia X-CBRio-Signature contendo
 *   hex(hmac-sha256(secret, raw_body))
 * Para GET / requests sem body, assina a string vazia.
 */
export function verifyHmac(req: Request, res: Response, next: NextFunction) {
  // /health não exige assinatura — pra liveness probe simples
  if (req.path === '/health') return next();

  const sig = req.header('x-cbrio-signature');
  if (!sig) {
    return res.status(401).json({ error: 'X-CBRio-Signature ausente' });
  }

  const rawBody = (req as Request & { rawBody?: string }).rawBody ?? '';
  const expected = createHmac('sha256', SECRET!).update(rawBody).digest('hex');

  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return res.status(401).json({ error: 'Assinatura inválida' });
    }
  } catch {
    return res.status(401).json({ error: 'Assinatura malformada' });
  }

  return next();
}

export function captureRawBody(req: Request, _res: Response, buf: Buffer) {
  (req as Request & { rawBody?: string }).rawBody = buf.toString('utf8');
}
