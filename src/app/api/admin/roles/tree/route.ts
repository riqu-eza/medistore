/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { createRoleSchema } from "@/lib/validators/role.schema"
import { z } from "zod"
import { RoleService } from "@/lib/services/Role.service"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || undefined

    const result = await RoleService.findAll({
      page,
      limit,
      search,
    })

    return NextResponse.json({
      success: true,
      data: result
      // meta: result.meta,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = createRoleSchema.parse(body)

    const role = await RoleService.create(data)

    return NextResponse.json(
      { success: true, data: role },
      { status: 201 }
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.flatten() },
        { status: 422 }
      )
    }

    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Role already exists" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}