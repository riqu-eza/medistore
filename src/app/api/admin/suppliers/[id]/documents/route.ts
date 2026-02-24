/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma'
import { supplierSchema } from '@/lib/validators/supplier'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || undefined
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')

  const where: any = {
    AND: [
      search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      status ? { status } : {},
    ],
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  })

  const total = await prisma.supplier.count({ where })

  return NextResponse.json({
    data: suppliers,
    meta: { total, page, limit },
  })
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = supplierSchema.parse(body)

  const supplier = await prisma.supplier.create({
    data: {
      ...parsed,
      status: 'pending',
    },
  })

  return NextResponse.json({ success: true, data: supplier })
}