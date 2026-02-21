import { NextResponse } from "next/server"
import { RoleService } from "@/lib/services/role.service"
import { updateRoleSchema } from "@/lib/validators/role.schema"

export async function GET(
  _: Request,
  { params }: { params: { id: string } }
) {
  try {
    const role = await RoleService.findById(Number(params.id))
    return NextResponse.json(role)
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 404 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const data = updateRoleSchema.parse(body)

    const role = await RoleService.update(
      Number(params.id),
      data
    )

    return NextResponse.json(role)
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 400 }
    )
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  try {
    await RoleService.delete(Number(params.id))
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 400 }
    )
  }
}
