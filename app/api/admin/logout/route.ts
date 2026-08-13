import { expiredAdminCookie } from "../../../../lib/admin-auth";

export async function POST(request: Request) {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json",
      "set-cookie": expiredAdminCookie(request),
    },
  });
}
