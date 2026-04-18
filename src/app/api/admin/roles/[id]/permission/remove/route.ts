/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { permissionPatchSchema } from "@/lib/validators/role.schema"
import { RoleService } from "@/lib/services/Role.service"

export async function PATCH(
  request: NextRequest,
    context: { params :Promise <{ id: string }> }
) {
  try {
    const body = await request.json()
    const { permissions } = permissionPatchSchema.parse(body)
const { id } = await context.params
    const role = await RoleService.removePermissions(
      Number(id),
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
