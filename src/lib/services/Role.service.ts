/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma"

export class RoleService {
  // ── Create ────────────────────────────────────────────────────────────────
  static async create(data: any) {
    if (data.parentId) {
      const parent = await prisma.role.findUnique({
        where: { id: data.parentId },
      })
      if (!parent) throw new Error("Parent role not found")
    }
    return prisma.role.create({ data })
  }

  // ── Get All (with filters) ────────────────────────────────────────────────
  static async findAll(query: any) {
    const { page = 1, limit = 20, isActive, search } = query

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
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
      }),
      prisma.role.count({
        where: {
          ...(isActive !== undefined && { isActive: isActive === "true" }),
          ...(search && {
            name: { contains: search, mode: "insensitive" },
          }),
        },
      }),
    ])

    return {
      data: roles,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    }
  }

  // ── Get One ───────────────────────────────────────────────────────────────
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

  // ── Circular Hierarchy Check ──────────────────────────────────────────────
// ── Circular Hierarchy Check ──────────────────────────────────────────────
static async checkCircular(id: number, parentId: number | null) {
  if (!parentId) return
  if (id === parentId) throw new Error("Role cannot be its own parent")

  let current: number | null = parentId
  while (current !== null) {
    const found: { parentId: number | null } | null =
      await prisma.role.findUnique({
        where: { id: current },
        select: { parentId: true },
      })
    if (!found) break
    if (found.parentId === id)
      throw new Error("Circular hierarchy detected")
    current = found.parentId ?? null
  }
}
  // ── Update ────────────────────────────────────────────────────────────────
  static async update(id: number, data: any) {
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) throw new Error("Role not found")
    if (role.isSystem) throw new Error("System roles cannot be modified")

    if (data.parentId !== undefined) {
      await this.checkCircular(id, data.parentId)
    }

    return prisma.role.update({ where: { id }, data })
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  static async delete(id: number) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        children: true,
        users: true,
      },
    })
    if (!role) throw new Error("Role not found")
    if (role.isSystem) throw new Error("System roles cannot be deleted")
    if (role.children.length > 0) throw new Error("Role has child roles — reassign or delete them first")
    if (role.users.length > 0) throw new Error("Role is assigned to users — reassign users first")

    return prisma.role.delete({ where: { id } })
  }

  // ── Add Permissions ───────────────────────────────────────────────────────
  static async addPermissions(id: number, permissions: string[]) {
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) throw new Error("Role not found")
    if (role.isSystem) throw new Error("System role permissions cannot be modified")

    const updated = Array.from(
      new Set([...(role.permissions as string[]), ...permissions])
    )

    return prisma.role.update({
      where: { id },
      data: { permissions: updated },
    })
  }

  // ── Remove Permissions ────────────────────────────────────────────────────
  static async removePermissions(id: number, permissions: string[]) {
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) throw new Error("Role not found")
    if (role.isSystem) throw new Error("System role permissions cannot be modified")

    const updated = (role.permissions as string[]).filter(
      (p) => !permissions.includes(p)
    )

    return prisma.role.update({
      where: { id },
      data: { permissions: updated },
    })
  }

  // ── Set Permissions (replace all) ─────────────────────────────────────────
  static async setPermissions(id: number, permissions: string[]) {
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) throw new Error("Role not found")
    if (role.isSystem) throw new Error("System role permissions cannot be modified")

    return prisma.role.update({
      where: { id },
      data: { permissions },
    })
  }

  // ── Clone Role ────────────────────────────────────────────────────────────
 // ── Clone Role ────────────────────────────────────────────────────────────
static async clone(id: number, newName: string) {
  const source = await prisma.role.findUnique({ where: { id } })
  if (!source) throw new Error("Source role not found")

  const existing = await prisma.role.findFirst({
    where: { name: newName },
  })
  if (existing) throw new Error(`Role with name "${newName}" already exists`)

  return prisma.role.create({
    data: {
      name: newName,
      displayName: source.displayName,       
      description: `Cloned from ${source.name}`,
      permissions: (source.permissions ?? []) as string[],
      parentId: source.parentId,
      isActive: true,
      isSystem: false,
    },
  })
}

  // ── Get Role Hierarchy (tree) ─────────────────────────────────────────────
  static async getHierarchy() {
    const roles = await prisma.role.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true,
            _count: { select: { users: true } },
          },
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    })
    return roles
  }

  // ── Toggle Active ─────────────────────────────────────────────────────────
  static async toggleActive(id: number) {
    const role = await prisma.role.findUnique({ where: { id } })
    if (!role) throw new Error("Role not found")
    if (role.isSystem) throw new Error("System roles cannot be deactivated")

    return prisma.role.update({
      where: { id },
      data: { isActive: !role.isActive },
    })
  }
}