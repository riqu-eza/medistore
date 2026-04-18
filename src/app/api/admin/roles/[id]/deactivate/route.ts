/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
    context: { params :Promise <{ id: string }> }
) {
  try {
    const { id } = await context.params
    const roleId = Number(id)

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      return NextResponse.json(
        { message: "Role not found" },
        { status: 404 }
      )
    }

    if (role.isSystem) {
      return NextResponse.json(
        { message: "System roles cannot be deactivated" },
        { status: 403 }
      )
    }

    const updated = await prisma.role.update({
      where: { id: roleId },
      data: { isActive: false },
    })

    return NextResponse.json(updated)

  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 400 }
    )
  }
}