import { z } from 'zod'

export const supplierSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  companyType: z.enum(['manufacturer', 'distributor', 'wholesaler']),
  contactPerson: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    postal_code: z.string(),
  }),
  licenseNumber: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
})