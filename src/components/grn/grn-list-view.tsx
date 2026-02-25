// ============================================================================
// GRN LIST VIEW
// Display and filter GRNs
// ============================================================================

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGRNs, GRNFilters } from '@/hooks/use-grn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Package, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { format } from 'date-fns'

interface GRNListViewProps {
  suppliers?: Array<{ id: string; name: string }>
}

export default function GRNListView({ suppliers = [] }: GRNListViewProps) {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<GRNFilters>({})
  const { grns, loading, pagination, fetchGRNs } = useGRNs(filters, page, 20)

  useEffect(() => {
    fetchGRNs()
  }, [fetchGRNs])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
      case 'rejected':
        return 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-3 h-3" />
      case 'rejected':
        return <XCircle className="w-3 h-3" />
      case 'pending':
        return <Clock className="w-3 h-3" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Goods Receipt Notes</h1>
          <p className="text-muted-foreground">Manage incoming drug deliveries</p>
        </div>
        <Button onClick={() => router.push('/grn/create')}>
          <Package className="w-4 h-4 mr-2" />
          Create GRN
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="GRN number..."
                  className="pl-8"
                  value={filters.grnNumber || ''}
                  onChange={(e) => {
                    setFilters({ ...filters, grnNumber: e.target.value })
                    setPage(1)
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => {
                  setFilters({ 
                    ...filters, 
                    status: value === 'all' ? undefined : value 
                  })
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {suppliers.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Supplier</label>
                <Select
                  value={filters.supplierId || 'all'}
                  onValueChange={(value) => {
                    setFilters({ 
                      ...filters, 
                      supplierId: value === 'all' ? undefined : value 
                    })
                    setPage(1)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Date From</label>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => {
                  setFilters({ ...filters, dateFrom: e.target.value })
                  setPage(1)
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GRN Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Received Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : grns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No GRNs found
                </TableCell>
              </TableRow>
            ) : (
              grns.map((grn) => (
                <TableRow key={grn.id}>
                  <TableCell className="font-medium">{grn.grnNumber}</TableCell>
                  <TableCell>{grn.supplier?.name}</TableCell>
                  <TableCell>
                    {format(new Date(grn.receivedDate), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>{grn.totalItems}</TableCell>
                  <TableCell>
                    {grn.totalValue ? `$${grn.totalValue.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={getStatusColor(grn.status)}
                    >
                      <span className="flex items-center gap-1">
                        {getStatusIcon(grn.status)}
                        {grn.status}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/grn/${grn.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} results
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}