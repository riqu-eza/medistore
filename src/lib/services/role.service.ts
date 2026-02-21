import { prisma } from "@/lib/prisma"

export class RoleService {
  // Create
  static async create(data: any) {
    if (data.parentId) {
      const parent = await prisma.role.findUnique({
        where: { id: data.parentId },
      })
      if (!parent) throw new Error("Parent role not found")
    }

    return prisma.role.create({ data })
  }

  // Get All (with filters)
  static async findAll(query: any) {
    const { page = 1, limit = 20, isActive, search } = query

    return prisma.role.findMany({
      where: {
        ...(isActive !== undefined && { isActive: isActive === "true" }),
        ...(search && {
          name: { contains: search, mode: "insensitive" },
        }),
      },
      include: {
        parent: true,
        children: true,
        _count: { select: { users: true } },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    })
  }

  // Get One
  static async findById(id: number) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: { select: { users: true } },
      },
    })

    if (!role) throw new Error("Role not found")

    return role
  }

  // Prevent Circular Hierarchy
  static async checkCircular(id: number, parentId: number | null) {
    if (!parentId) return

    if (id === parentId) {
      throw new Error("Role cannot be its own parent")
    }

    let current = parentId

    while (current) {
      const parent = await prisma.role.findUnique({
        where: { id: current },
        select: { parentId: true },
      })

      if (!parent) break
      if (parent.parentId === id)
        throw new Error("Circular hierarchy detected")

      current = parent.parentId ?? null
    }
  }

  // Update
  static async update(id: number, data: any) {
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) throw new Error("Role not found")

    if (role.isSystem)
      throw new Error("System roles cannot be modified")

    if (data.parentId !== undefined)
      await this.checkCircular(id, data.parentId)

    return prisma.role.update({
      where: { id },
      data,
    })
  }

  // Delete
  static async delete(id: number) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        children: true,
        users: true,
      },
    })

    if (!role) throw new Error("Role not found")
    if (role.isSystem)
      throw new Error("System roles cannot be deleted")

    if (role.children.length > 0)
      throw new Error("Role has child roles")

    if (role.users.length > 0)
      throw new Error("Role is assigned to users")

    return prisma.role.delete({ where: { id } })
  }

  // Add Permission
  static async addPermissions(id: number, permissions: string[]) {
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) throw new Error("Role not found")

    const updated = Array.from(
      new Set([...(role.permissions as string[]), ...permissions])
    )

    return prisma.role.update({
      where: { id },
      data: { permissions: updated },
    })
  }

  // Remove Permission
  static async removePermissions(id: number, permissions: string[]) {
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) throw new Error("Role not found")

    const updated = (role.permissions as string[]).filter(
      (p) => !permissions.includes(p)
    )

    return prisma.role.update({
      where: { id },
      data: { permissions: updated },
    })
  }
}
