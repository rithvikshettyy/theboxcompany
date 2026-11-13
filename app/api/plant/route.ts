import { build } from "@/lib/model";
import { isScope, SCOPES } from "@/lib/scope";

/** GET /api/plant?scope=A|B|C|today|7d|30d → PlantData for that scope. */
export function GET(request: Request) {
  const scope = new URL(request.url).searchParams.get("scope");
  if (!isScope(scope)) {
    return Response.json(
      { error: `Unknown scope "${scope ?? ""}". Use one of ${SCOPES.join(", ")}.` },
      { status: 400 },
    );
  }
  return Response.json(build(scope));
}
