import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets and images
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-.*\\.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb)$).*)",
  ],
};
