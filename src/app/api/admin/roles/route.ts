/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { createRoleSchema } from "@/lib/validators/role.schema"
import { RoleService } from "@/lib/services/Role.service"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = createRoleSchema.parse(body)

    const role = await RoleService.create(data)
    return NextResponse.json(role, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 400 }
    )
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const roles = await RoleService.findAll(
    Object.fromEntries(searchParams)
  )

  return NextResponse.json(roles)
}
