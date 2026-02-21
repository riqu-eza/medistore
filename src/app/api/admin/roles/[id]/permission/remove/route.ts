import { NextResponse } from "next/server"
import { RoleService } from "@/lib/services/role.service"
import { permissionPatchSchema } from "@/lib/validators/role.schema"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { permissions } = permissionPatchSchema.parse(body)

    const role = await RoleService.removePermissions(
      Number(params.id),
      permissions
    )

    return NextResponse.json(role)
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 400 }
    )
  }
}
