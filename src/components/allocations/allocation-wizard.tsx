/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import {
  usePendingAllocations,
  useAllocateBatch,
  useBulkAllocate,
  useAutoAllocate,
} from "@/hooks/use-allocation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Sparkles, Package, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";

interface AllocationWizardProps {
  grnId?: string;
  onComplete?: () => void;
}

export default function AllocationWizard({
  grnId,
  onComplete,
}: AllocationWizardProps) {
  const { allocations, loading, fetchPendingAllocations } =
    usePendingAllocations();
  const { allocateBatch, loading: allocating } = useAllocateBatch();
  const { bulkAllocate, loading: bulkAllocating } = useBulkAllocate();
  const { autoAllocate, loading: autoAllocating } = useAutoAllocate();

  const [selectedAllocations, setSelectedAllocations] = useState<Map<string, { storeId: string; storeName: string; quantity: number }>>(new Map());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPendingAllocations();
  }, [fetchPendingAllocations]); 

  const filteredAllocations = grnId
    ? allocations.filter((a) => a.batch.grnId === grnId)
    : allocations;

  const allSelected =
    selectedRows.size === filteredAllocations.length &&
    filteredAllocations.length > 0;

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedRows(
      allSelected ? new Set() : new Set(filteredAllocations.map((a) => a.id)),
    );
  };

  const handleStoreSelect = (
    itemId: string,
    storeId: string,
    item: (typeof filteredAllocations)[0],
  ) => {
    const suggestion = item.suggestedStores?.find(
      (s) => s.store.id === storeId,
    );
    const storeName = suggestion?.store.name ?? storeId;
    const newMap = new Map(selectedAllocations);
    newMap.set(itemId, {
      storeId,
      storeName,
      quantity: item.availableQuantity,
    });
    setSelectedAllocations(newMap);
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    const allocation = selectedAllocations.get(itemId);
    if (allocation) {
      const newMap = new Map(selectedAllocations);
      newMap.set(itemId, { ...allocation, quantity });
      setSelectedAllocations(newMap);
    }
  };

  const handleAutoAllocate = async () => {
    if (!grnId) return;
    try {
      await autoAllocate(grnId);
      fetchPendingAllocations();
      onComplete?.();
    } catch (error) {
      console.error("Auto-allocation failed:", error);
    }
  };

  const handleManualAllocate = async () => {
    if (selectedAllocations.size === 0) return;
    const allocationsArray = Array.from(selectedAllocations.entries()).map(
      ([itemId, data]) => {
        const item = filteredAllocations.find((a) => a.id === itemId)!;
        return {
          batchId: item.batch.id,
          targetStoreId: data.storeId,
          quantity: data.quantity,
        };
      },
    );
    try {
      if (grnId) {
        await bulkAllocate({ grnId, allocations: allocationsArray });
      } else {
        for (const alloc of allocationsArray) await allocateBatch(alloc);
      }
      setSelectedAllocations(new Map());
      fetchPendingAllocations();
      onComplete?.();
    } catch (error) {
      console.error("Manual allocation failed:", error);
    }
  };

  const allocatedCount = selectedAllocations.size;
  const progressPct = filteredAllocations.length
    ? Math.round((allocatedCount / filteredAllocations.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-400px">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (filteredAllocations.length === 0) {
    return (
      <Card>
        <CardContent className=" text-red-300 py-16 text-center">
          <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No pending allocations</p>
          <p className="text-sm text-muted-foreground mt-1">
            All items have been allocated to stores
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1 text-gray-700 " >
            <h2 className="text-xl font-semibold">Store Allocation</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filteredAllocations.length} item(s) pending · {allocatedCount}{" "}
              assigned
            </p>
          </div>
          {grnId && (
            <Button
              variant="outline"
              onClick={handleAutoAllocate}
              disabled={autoAllocating}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {autoAllocating ? "Auto-Allocating…" : "Auto-Allocate All"}
            </Button>
          )}
        </div>

        {/* Progress */}
        <div className=" text-green-700 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Allocation progress</span>
            <span>{progressPct}%</span>
          </div>
          <Progress value={progressPct} className=" text-blue-700 h-2" />
        </div>

        <Separator />

        {/* Table */}
        <Card className="text-gray-600" >
          <ScrollArea className="max-h-520px">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Drug</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead>Target Store</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAllocations.map((item) => {
                  const selection = selectedAllocations.get(item.id);
                  const suggestions = item.suggestedStores ?? [];
                  const isChecked = selectedRows.has(item.id);

                  return (
                    <TableRow
                      key={item.id}
                      className={isChecked ? "bg-muted/40" : undefined}
                    >
                      {/* Checkbox */}
                      <TableCell>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleRow(item.id)}
                        />
                      </TableCell>

                      {/* Drug */}
                      <TableCell>
                        <p className="font-medium leading-tight">
                          {item.drug.genericName}
                        </p>
                        {item.drug.brandName && (
                          <p className="text-xs text-muted-foreground">
                            {item.drug.brandName}
                          </p>
                        )}
                      </TableCell>

                      {/* Batch */}
                      <TableCell className="font-mono text-sm">
                        {item.batch.batchNumber}
                      </TableCell>

                      {/* Expiry */}
                      <TableCell className="text-sm">
                        {format(new Date(item.batch.expiryDate), "dd MMM yyyy")}
                      </TableCell>

                      {/* Available qty */}
                      <TableCell className="text-right font-medium">
                        {item.availableQuantity}
                      </TableCell>

                      {/* Store selector */}
                      <TableCell className="min-w-200px">
                        {suggestions.length > 0 ? (
                          <Select
                            value={selection?.storeId ?? ""}
                            onValueChange={(val) =>
                              handleStoreSelect(item.id, val, item)
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select store…" />
                            </SelectTrigger>
                            <SelectContent className="text-gray-500" >
                              {suggestions.map((s) => (
                                <SelectItem key={s.store.id} value={s.store.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{s.store.name}</span>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs ml-auto"
                                    >
                                      {s.score}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Tooltip >
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <AlertCircle className="w-3.5 h-3.5" />
                                No stores found
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              No stores match this drug&#39;s storage requirements
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>

                      {/* Quantity */}
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={1}
                          max={item.availableQuantity}
                          disabled={!selection}
                          value={selection?.quantity ?? ""}
                          onChange={(e) =>
                            handleQuantityChange(
                              item.id,
                              parseFloat(e.target.value),
                            )
                          }
                          className="h-8 w-24 text-right ml-auto"
                        />
                      </TableCell>

                      {/* Status badge */}
                      <TableCell>
                        {selection ? (
                          <Badge variant="default" className="text-xs">
                            Assigned
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs text-muted-foreground"
                          >
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>

        {/* Suggestion reasons — shown below table for selected items */}
        {filteredAllocations
          .filter((item) => selectedAllocations.get(item.id))
          .map((item) => {
            const selection = selectedAllocations.get(item.id)!;
            const suggestion = item.suggestedStores?.find(
              (s) => s.store.id === selection.storeId,
            );
            if (!suggestion?.reasons?.length) return null;
            return (
              <Alert key={item.id} className="py-2.5">
                <Info className= " text-black w-4 h-4" />
                <AlertDescription className=" text-green-400 text-xs">
                  <span className=" text-gray-300 font-medium">{item.drug.genericName}</span> →{" "}
                  {suggestion.store.name}: {suggestion.reasons.join(" · ")}
                </AlertDescription>
              </Alert>
            );
          })}

        {/* Footer actions */}
        {allocatedCount > 0 && (
          <>
            <Separator />
            <div className=" text-gray-600 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {allocatedCount} of {filteredAllocations.length} items assigned
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAllocations(new Map())}
                >
                  Clear All
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={allocating || bulkAllocating}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  {allocating || bulkAllocating
                    ? "Allocating…"
                    : "Confirm Allocation"}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Confirm Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Confirm Allocation</DialogTitle>
              <DialogDescription>
                Items will be moved from the receiving zone to the selected
                stores.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(selectedAllocations.entries()).map(
                    ([itemId, data]) => {
                      const item = filteredAllocations.find(
                        (a) => a.id === itemId,
                      );
                      return (
                        <TableRow key={itemId}>
                          <TableCell>
                            <p className="font-medium text-sm">
                              {item?.drug.genericName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item?.batch.batchNumber}
                            </p>
                          </TableCell>
                          <TableCell className="text-sm">
                            {data.storeName}
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {data.quantity}
                          </TableCell>
                        </TableRow>
                      );
                    },
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowConfirmDialog(false);
                  handleManualAllocate();
                }}
                disabled={allocating || bulkAllocating}
              >
                {allocating || bulkAllocating
                  ? "Allocating…"
                  : "Confirm & Allocate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
