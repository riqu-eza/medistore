import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  _: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id)

    const role = await prisma.role.findUnique({
      where: { id },
    })

    if (!role)
      return NextResponse.json(
        { message: "Role not found" },
        { status: 404 }
      )

    if (role.isSystem)
      return NextResponse.json(
        { message: "System roles cannot be deactivated" },
        { status: 403 }
      )

    const updated = await prisma.role.update({
      where: { id },
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
