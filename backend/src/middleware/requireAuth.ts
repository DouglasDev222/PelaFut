import type { NextFunction, Request, Response } from "express"
import { supabaseAdmin } from "../config/supabaseAdmin.js"

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string | undefined }
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined

  if (!token) {
    res.status(401).json({ error: "Token de autenticação ausente" })
    return
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) {
    res.status(401).json({ error: "Token de autenticação inválido" })
    return
  }

  req.user = { id: data.user.id, email: data.user.email }
  next()
}
