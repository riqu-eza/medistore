import { z } from "zod"

export const createRoleSchema = z.object({
  name: z.string().min(3).max(100),
  displayName: z.string().min(3).max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1),
  parentId: z.number().int().positive().optional(),
  isSystem: z.boolean().optional(),
})

export const updateRoleSchema = z.object({
  displayName: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  parentId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
})

export const permissionPatchSchema = z.object({
  permissions: z.array(z.string()).min(1),
})
