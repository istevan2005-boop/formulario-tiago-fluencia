import { adminCookie, verifyPassword } from "../../../../lib/admin-auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: unknown };
    const password = typeof body.password === "string" ? body.password : "";

    if (!(await verifyPassword(password))) {
      return Response.json({ error: "Senha incorreta." }, { status: 401 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": await adminCookie(request),
      },
    });
  } catch {
    return Response.json({ error: "Não foi possível entrar." }, { status: 400 });
  }
}
