/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { updateRoleSchema } from "@/lib/validators/role.schema"
import { RoleService } from "@/lib/services/Role.service"

export async function GET(
  Request: NextRequest,
  context : { params:Promise <{ id: string }> }
  
) {
  try {
    const { id } = await context.params
    const role = await RoleService.findById(Number(id))
    return NextResponse.json(role)
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 404 }
    )
  }
}

export async function PUT(

   request: NextRequest,
  context : { params:Promise <{ id: string }> }
) {
  try {
    const body = await request.json()
    const data = updateRoleSchema.parse(body)

    const { id } = await context.params
    const role = await RoleService.update(
      Number(id),
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
  request: NextRequest,
  context : { params:Promise <{ id: string }> }
) {
  try {
    const { id } = await context.params
    await RoleService.delete(Number(id))
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 400 }
    )
  }
}
