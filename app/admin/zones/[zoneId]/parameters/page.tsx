"use client";

import { use, useEffect, useState } from "react";
import { Plus, Edit, Package, DollarSign, TrendingUp, Check, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ParameterFormModal } from "@/components/admin/glamping/ParameterFormModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Parameter {
  id: string;
  name: string;
  color_code: string;
  display_order: number;
  controls_inventory: boolean;
  sets_pricing: boolean;
  price_range: boolean;
  visibility: string;
  min_value?: number;
  max_value?: number;
}

// Sortable Row Component
function SortableParameterRow({
  param,
  index,
  onEdit,
  t,
}: {
  param: Parameter;
  index: number;
  onEdit: (id: string) => void;
  t: any;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: param.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={index % 2 === 1 ? "bg-gray-50/50" : ""}
    >
      {/* Drag Handle */}
      <TableCell className="w-12 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="w-5 h-5 text-gray-400" />
      </TableCell>

      {/* Color Indicator */}
      <TableCell>
        <div
          className="w-6 h-6 rounded-md border border-gray-200"
          style={{ backgroundColor: param.color_code || "#cccccc" }}
          title={param.color_code}
        />
      </TableCell>

      {/* Parameter Name */}
      <TableCell>
        <button
          onClick={() => onEdit(param.id)}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {param.name}
        </button>
      </TableCell>

      {/* Display Order */}
      <TableCell className="text-center">
        <span className="text-sm font-medium text-gray-700">
          {param.display_order}
        </span>
      </TableCell>

      {/* Controls Inventory */}
      <TableCell className="text-center">
        {param.controls_inventory ? (
          <Check className="w-5 h-5 text-green-600 mx-auto" />
        ) : (
          <X className="w-5 h-5 text-gray-300 mx-auto" />
        )}
      </TableCell>

      {/* Sets Pricing */}
      <TableCell className="text-center">
        {param.sets_pricing ? (
          <Check className="w-5 h-5 text-green-600 mx-auto" />
        ) : (
          <X className="w-5 h-5 text-gray-300 mx-auto" />
        )}
      </TableCell>

      {/* Price Range */}
      <TableCell>
        {param.price_range && param.min_value !== undefined && param.max_value !== undefined ? (
          <span className="text-sm font-medium text-gray-700">
            {param.min_value?.toLocaleString()} - {param.max_value?.toLocaleString()}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )}
      </TableCell>

      {/* Visibility */}
      <TableCell>
        <Badge
          variant={param.visibility === "everyone" ? "default" : "secondary"}
        >
          {t(`visibility.${param.visibility}`)}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(param.id)}
        >
          <Edit className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function ParametersPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.parameters");
  const tc = useTranslations("admin.glamping.common");
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingParameterId, setEditingParameterId] = useState<string | undefined>(undefined);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Redirect to dashboard if "all" zones selected (not supported on this page)
  useEffect(() => {
    if (zoneId === "all") {
      router.replace("/admin/zones/all/dashboard");
    }
  }, [zoneId, router]);

  useEffect(() => {
    if (zoneId !== "all") {
      fetchParameters();
    }
  }, [zoneId]); // Re-fetch when zone changes

  const fetchParameters = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/parameters?zone_id=${zoneId}`);
      const data = await response.json();
      setParameters(data.parameters || []);
    } catch (error) {
      console.error('Failed to fetch parameters:', error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditParameter = (parameterId: string) => {
    setEditingParameterId(parameterId);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingParameterId(undefined);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = parameters.findIndex((p) => p.id === active.id);
    const newIndex = parameters.findIndex((p) => p.id === over.id);

    // Optimistically update UI
    const newParameters = arrayMove(parameters, oldIndex, newIndex);

    // Update display_order based on new positions
    const updatedParameters = newParameters.map((param, index) => ({
      ...param,
      display_order: index,
    }));

    setParameters(updatedParameters);

    // Send to server
    try {
      const response = await fetch('/api/admin/glamping/parameters/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parameters: updatedParameters.map(p => ({
            id: p.id,
            display_order: p.display_order,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      toast({
        title: tc("success"),
        description: t("reorderSuccess") || "Parameter order updated successfully",
      });
    } catch (error) {
      console.error('Failed to reorder parameters:', error);
      toast({
        title: tc("error"),
        description: tc("error"),
        variant: "destructive",
      });
      // Revert on error
      fetchParameters();
    }
  };


  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("addNew")}
        </Button>
      </div>

      {/* Parameters Table */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="border rounded-lg bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-12"></TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead className="font-semibold">{t("table.parameterName")}</TableHead>
                <TableHead className="text-center font-semibold">{t("table.displayOrder")}</TableHead>
                <TableHead className="text-center font-semibold">
                  <div className="flex items-center justify-center gap-1">
                    <Package className="w-4 h-4" />
                    {t("table.inventory")}
                  </div>
                </TableHead>
                <TableHead className="text-center font-semibold">
                  <div className="flex items-center justify-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {t("table.pricing")}
                  </div>
                </TableHead>
                <TableHead className="font-semibold">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {t("table.priceRange")}
                  </div>
                </TableHead>
                <TableHead className="font-semibold">{t("table.visibility")}</TableHead>
                <TableHead className="text-right">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : parameters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                    {t("noParameters")}
                  </TableCell>
                </TableRow>
              ) : (
                <SortableContext
                  items={parameters.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {parameters.map((param, index) => (
                    <SortableParameterRow
                      key={param.id}
                      param={param}
                      index={index}
                      onEdit={handleEditParameter}
                      t={t}
                    />
                  ))}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </div>
      </DndContext>

      {/* Create Parameter Modal */}
      <ParameterFormModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={fetchParameters}
        zoneId={zoneId}
      />

      {/* Edit Parameter Modal */}
      <ParameterFormModal
        open={showEditModal}
        onOpenChange={handleCloseEditModal}
        onSuccess={fetchParameters}
        zoneId={zoneId}
        parameterId={editingParameterId}
      />
    </div>
  );
}
