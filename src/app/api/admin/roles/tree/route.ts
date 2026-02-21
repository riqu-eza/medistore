import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function buildRoleTree(roles: any[]) {
  const map = new Map()
  const roots: any[] = []

  roles.forEach((role) => {
    map.set(role.id, { ...role, children: [] })
  })

  roles.forEach((role) => {
    if (role.parentId) {
      const parent = map.get(role.parentId)
      if (parent) {
        parent.children.push(map.get(role.id))
      }
    } else {
      roots.push(map.get(role.id))
    }
  })

  return roots
}

export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: "asc" },
    })

    const tree = buildRoleTree(roles)

    return NextResponse.json(tree)
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
}
