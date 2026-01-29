"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Save, Eye, Upload, X, Image as ImageIcon, ChevronDown, HelpCircle, Sun, Moon, Clock, Calendar, Check, Paperclip, Loader2, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ParameterForm } from "@/components/admin/ParameterForm";
import EventFormFields from "@/components/admin/events/EventFormFields";
import TaxManagement from "@/components/admin/items/TaxManagement";
import { PricingTable } from "./PricingTable";
import type { Category as EventCategory } from "@/components/admin/events/CategoryItemSelector";

interface Category {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Parameter {
  id: string;
  name: string;
  color_code: string;
  default_value?: number;
  link_to_guests?: boolean;
  controls_inventory?: boolean;
  sets_pricing?: boolean;
  price_range?: boolean;
  visibility?: string;
  required?: boolean;
}

const formSchema = z.object({
  // Step 1: Description
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  category_id: z.string().optional(),
  summary: z.string().optional(),

  // Step 2: Attributes
  inventory_quantity: z.number().min(0).default(1),
  unlimited_inventory: z.boolean().default(false),
  allocation_type: z.enum(['per_day', 'per_night', 'per_hour', 'timeslots']).default('per_night'),
  visibility: z.enum(['everyone', 'staff_only', 'packages_only']).default('everyone'),
  default_calendar_status: z.enum(['available', 'unavailable', 'disabled']).default('available'),

  // Allocation settings
  fixed_length_value: z.number().nullable().optional(),
  fixed_length_unit: z.enum(['days', 'nights', 'hours']).nullable().optional(),
  fixed_start_time: z.string().nullable().optional(),
  default_length_hours: z.number().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

const getSteps = (t: any) => [
  { id: 1, name: t('steps.description'), key: 'description' },
  { id: 2, name: t('steps.media'), key: 'media' },
  { id: 3, name: t('steps.attributes'), key: 'attributes' },
  { id: 4, name: t('steps.pricing'), key: 'pricing' },
  { id: 5, name: t('steps.menuProducts'), key: 'menuProducts' },
];

export interface ItemFormWizardProps {
  mode: 'create' | 'edit';
  itemId?: string;
  zoneId?: string;
  initialData?: Partial<FormData> & {
    tags?: Array<{id: string; name: string}>;
    images?: Array<{url?: string; file?: File; preview: string; caption: string}>;
    youtube_url?: string;
    video_start_time?: number;
    pricing_rate?: string;
    group_pricing?: Record<string, Array<{min: number; max: number; price: number}>>;
    parameter_base_prices?: Record<string, number>;
    deposit_type?: string;
    deposit_value?: number;
    parameters?: Array<{
      id: string;
      name: string;
      color_code: string;
      inventory: string;
      visibility: string;
      min_max: { min: number; max: number };
    }>;
    package_items?: Array<{
      item_id: string;
      item_name: string;
      price_percentage: number;
      opt_in: 'optional' | 'required';
    }>;
    show_package_price?: boolean;
    package_starting_price?: number;
    allocation_type?: 'per_day' | 'per_night' | 'per_hour' | 'timeslots';
    fixed_length_value?: number;
    fixed_length_unit?: 'days' | 'nights' | 'hours';
    fixed_start_time?: string;
    default_length_hours?: number;
    timeslots?: Array<{
      start_time: string;
      end_time: string;
      days_of_week: number[];
    }>;
    taxes?: Array<any>;
    events?: Array<any>;
    event_pricing?: Record<string, number>;
    menu_products?: Array<any>;
  };
  onSuccess?: (itemId: string) => void;
}

export function ItemFormWizard({
  mode,
  itemId,
  zoneId,
  initialData,
  onSuccess
}: ItemFormWizardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("admin.glamping.items.form");
  const tc = useTranslations("admin.glamping.common");
  const tp = useTranslations("admin.glamping.parameters.form");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const shouldMoveToNextStepRef = useRef<boolean>(false);

  // Add new state to track incremental save
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);
  const [isIncrementalMode, setIsIncrementalMode] = useState(false);

  // State to track SKU editing
  const [isEditingSKU, setIsEditingSKU] = useState(false);
  const [editableSKU, setEditableSKU] = useState("");

  const STEPS = getSteps(t);

  // Data from Phase 7
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Pricing state (Phase 8.2)
  const [pricingRate, setPricingRate] = useState<string>('per_night');
  const [calendarStatus, setCalendarStatus] = useState<string>('available');

  // Media state (Phase 6.3)
  const [images, setImages] = useState<Array<{file?: File, url?: string, preview: string, caption: string}>>([]);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [youtubeStartTime, setYoutubeStartTime] = useState<number>(0);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Menu products state (Food/Beverages)
  const [menuProducts, setMenuProducts] = useState<Array<{
    menu_item_id: string;
    menu_item_name: string | { vi?: string; en?: string };
    menu_item_price?: number;
    menu_item_unit?: any;
    opt_in: 'optional' | 'required';
    display_order?: number;
  }>>([]);
  const [showMenuDialog, setShowMenuDialog] = useState<boolean>(false);
  const [availableMenuItems, setAvailableMenuItems] = useState<Array<{id: string; name: any; price: number; unit: any}>>([]);

  // Inline Category/Tag creation state
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [pendingCategories, setPendingCategories] = useState<Array<{id: string; name: string; isNew: boolean}>>([]);
  const [pendingTags, setPendingTags] = useState<Array<{id: string; name: string; isNew: boolean}>>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Allocation state
  const [timeInterval, setTimeInterval] = useState<string>('30'); // 10, 15, 20, 30, 60
  const [timeslots, setTimeslots] = useState<Array<{
    startTime: string;
    endTime: string;
    selectedDays: string[];
    showStartPicker?: boolean;
    showEndPicker?: boolean;
    showDayPicker?: boolean;
  }>>([
    {startTime: '', endTime: '', selectedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']}
  ]);
  const [fixedStartTime, setFixedStartTime] = useState<string>('');
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  // Generate time options based on selected interval
  const generateTimeOptions = (intervalMinutes: number) => {
    const times: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(timeString);
      }
    }
    return times;
  };
  const timeOptions = generateTimeOptions(parseInt(timeInterval));
  const timePickerRef = useRef<HTMLDivElement>(null);

  // Close time picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) {
        setShowTimePicker(false);
      }
    };

    if (showTimePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTimePicker]);

  // Reset fixed start time when interval changes
  useEffect(() => {
    setFixedStartTime('');
  }, [timeInterval]);

  // Get allocation time label based on selected interval
  const getAllocationTimeLabel = () => {
    switch (timeInterval) {
      case '10':
        return t('allocationPer10Minutes');
      case '15':
        return t('allocationPer15Minutes');
      case '20':
        return t('allocationPer20Minutes');
      case '30':
        return t('allocationPer30Minutes');
      case '60':
        return t('allocationPerHour');
      default:
        return t('allocationPerTime');
    }
  };

  // Generate timeslot start times (30-minute intervals)
  const generateTimeslotStartTimes = () => {
    const times: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        times.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return times;
  };

  // Calculate duration between start and end time in hours
  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    if (endMinutes <= startMinutes) endMinutes += 24 * 60; // Next day
    return (endMinutes - startMinutes) / 60;
  };

  // Generate end time options based on start time
  const generateEndTimeOptions = (startTime: string) => {
    if (!startTime) return [];
    const options: Array<{time: string; duration: number}> = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;

    // Generate options for next 12 hours in 30-minute intervals
    for (let i = 1; i <= 24; i++) {
      const totalMinutes = startMinutes + (i * 30);
      const hour = Math.floor(totalMinutes / 60) % 24;
      const minute = totalMinutes % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const duration = i * 0.5;
      options.push({time: timeString, duration});
    }
    return options;
  };

  // Get day abbreviation
  const getDayAbbreviation = (day: string) => {
    const abbr: Record<string, string> = {
      'monday': 'Th 2',
      'tuesday': 'Th 3',
      'wednesday': 'Th 4',
      'thursday': 'Th 5',
      'friday': 'Th 6',
      'saturday': 'Th 7',
      'sunday': 'CN'
    };
    return abbr[day] || day;
  };

  // Format selected days display
  const formatSelectedDays = (selectedDays: string[]) => {
    const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (selectedDays.length === 7 && allDays.every(day => selectedDays.includes(day))) {
      return t('everyDay');
    }
    return selectedDays.map(day => getDayAbbreviation(day)).join(', ');
  };

  // Group pricing state
  const [groupPricing, setGroupPricing] = useState<Record<string, Array<{min: number; max: number; price: number}>>>({});
  // Parameter base pricing state (for individual parameter prices without groups)
  const [parameterBasePrices, setParameterBasePrices] = useState<Record<string, number>>({});
  // Event pricing state
  const [eventPricing, setEventPricing] = useState<Record<string, any>>({});
  const [depositType, setDepositType] = useState<string>('system_default');
  const [depositValue, setDepositValue] = useState<number>(50);

  // Zone settings state (for deposit default display)
  const [zoneSettings, setZoneSettings] = useState<{
    deposit_type: string;
    deposit_value: number;
  } | null>(null);

  // Taxes state
  const [taxes, setTaxes] = useState<Array<{
    id: string;
    name: string;
    amount: number;
    amount_type: 'percent' | 'fixed';
    account_number: string;
    apply_to: 'all_customers' | 'specific';
    is_compound: boolean;
    is_inclusive: boolean;
    is_inclusive_hidden: boolean;
    apply_by_default: boolean;
    selected_items: string[];
    enabled: boolean;
  }>>([]);

  // Attached parameters state
  const [attachedParameters, setAttachedParameters] = useState<Array<{
    id: string;
    name: string;
    color_code: string;
    inventory: string;
    visibility: string;
    min_max: { min: number; max: number };
  }>>([]);
  const [showCreateParameterModal, setShowCreateParameterModal] = useState(false);
  const [creatingParameter, setCreatingParameter] = useState(false);
  const [showAttachParameterModal, setShowAttachParameterModal] = useState(false);
  const [selectedParameterIds, setSelectedParameterIds] = useState<string[]>([]);
  const [editingParameter, setEditingParameter] = useState<Parameter | null>(null);

  // Event management state
  const [attachedEvents, setAttachedEvents] = useState<Array<{
    id: string;
    name: string;
    type: string;
    start_date: string | null;
    end_date: string | null;
    recurrence: string;
    days_of_week: number[] | null;
    pricing_type: string;
    status: string;
    item_ids?: string[];
    dynamic_pricing_value?: number | null;
    dynamic_pricing_mode?: 'percent' | 'fixed' | null;
    yield_thresholds?: Array<{ stock: number; rate_adjustment: number }> | null;
  }>>([]);
  const [showCreateEventDropdown, setShowCreateEventDropdown] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [showAttachEventModal, setShowAttachEventModal] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    name: "",
    type: "seasonal" as 'seasonal' | 'special' | 'closure',
    start_date: "",
    end_date: null as string | null,
    recurrence: "one_time" as 'one_time' | 'weekly' | 'monthly' | 'yearly' | 'always',
    days_of_week: [] as number[],
    pricing_type: "base_price" as 'base_price' | 'new_price' | 'dynamic' | 'yield',
    status: "available" as 'available' | 'unavailable',
    active: true,
    applicable_times: "all",
    rules_id: null as string | null,
    dynamic_pricing: {
      value: 0,
      mode: 'percent' as 'percent' | 'fixed',
    },
    yield_thresholds: [
      { stock: 0, rate_adjustment: 0 }
    ],
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [availableEvents, setAvailableEvents] = useState<Array<{
    id: string;
    name: string;
    type: string;
    start_date: string | null;
    end_date: string | null;
    recurrence?: string;
    days_of_week?: number[] | null;
    pricing_type?: string;
    status?: string;
    item_count: number;
    dynamic_pricing_value?: number | null;
    dynamic_pricing_mode?: 'percent' | 'fixed' | null;
    yield_thresholds?: Array<{ stock: number; rate_adjustment: number }> | null;
  }>>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedItemsForEvent, setSelectedItemsForEvent] = useState<string[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      sku: "",
      summary: "",
      inventory_quantity: 1,
      unlimited_inventory: false,
      allocation_type: "per_night",
      visibility: "everyone",
      default_calendar_status: "available",
    },
  });

  // Initialize state from initialData when in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      // Set media state
      if (initialData.images) {
        setImages(initialData.images as any);
      }
      if (initialData.youtube_url) {
        setYoutubeUrl(initialData.youtube_url);
      }
      if (initialData.video_start_time !== undefined) {
        setYoutubeStartTime(initialData.video_start_time);
      }
      // Set tags - both IDs and objects
      if (initialData.tags && initialData.tags.length > 0) {
        // Extract tag IDs for selectedTags
        setSelectedTags(initialData.tags.map(t => t.id));

        // Add tag objects to tags array so UI can render immediately
        setTags(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newTags = initialData.tags!.filter(t => !existingIds.has(t.id));
          return [...prev, ...newTags];
        });
      }
      // Set pricing state
      if (initialData.pricing_rate) {
        setPricingRate(initialData.pricing_rate);
      }
      if (initialData.group_pricing) {
        setGroupPricing(initialData.group_pricing);
      }
      if (initialData.parameter_base_prices) {
        setParameterBasePrices(initialData.parameter_base_prices);
      }
      // Set event pricing state
      if (initialData.event_pricing) {
        setEventPricing(initialData.event_pricing);
      }
      // Set taxes state
      if (initialData.taxes) {
        setTaxes(initialData.taxes);
      }
      // Set events state
      if (initialData.events) {
        setAttachedEvents(initialData.events);
      }
      if (initialData.deposit_type) {
        setDepositType(initialData.deposit_type);
      }
      if (initialData.deposit_value !== undefined) {
        setDepositValue(initialData.deposit_value);
      }
      // Set parameters
      if (initialData.parameters) {
        setAttachedParameters(initialData.parameters);
      }
      // Set menu products
      if (initialData.menu_products) {
        setMenuProducts(initialData.menu_products);
      }
      // Set allocation settings
      if (initialData.allocation_type) {
        form.setValue('allocation_type', initialData.allocation_type);
      }
      if (initialData.fixed_length_value !== undefined) {
        form.setValue('fixed_length_value', initialData.fixed_length_value);
      }
      if (initialData.fixed_length_unit) {
        form.setValue('fixed_length_unit', initialData.fixed_length_unit);
      }
      if (initialData.fixed_start_time) {
        form.setValue('fixed_start_time', initialData.fixed_start_time);
        setFixedStartTime(initialData.fixed_start_time);
      }
      if (initialData.default_length_hours !== undefined) {
        form.setValue('default_length_hours', initialData.default_length_hours);
      }
      // Transform and set timeslots if allocation_type is 'timeslots'
      if (initialData.timeslots && initialData.timeslots.length > 0) {
        const numberToDayName: Record<number, string> = {
          0: 'sunday',
          1: 'monday',
          2: 'tuesday',
          3: 'wednesday',
          4: 'thursday',
          5: 'friday',
          6: 'saturday'
        };

        const transformedSlots = initialData.timeslots.map(slot => ({
          startTime: slot.start_time,
          endTime: slot.end_time,
          selectedDays: slot.days_of_week.map(num => numberToDayName[num] || 'monday'),
          showStartPicker: false,
          showEndPicker: false,
          showDayPicker: false
        }));

        setTimeslots(transformedSlots);
      }
    }
  }, [mode, initialData, form]);

  // Fetch categories, tags, and parameters
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, tagsRes, parametersRes] = await Promise.all([
          fetch(`/api/admin/glamping/categories?zone_id=${zoneId}`),
          fetch(`/api/admin/glamping/tags?zone_id=${zoneId}`),
          fetch(`/api/admin/glamping/parameters?zone_id=${zoneId}`),
        ]);

        const [categoriesData, tagsData, parametersData] = await Promise.all([
          categoriesRes.json(),
          tagsRes.json(),
          parametersRes.json(),
        ]);

        setCategories(categoriesData.categories || []);
        setTags(tagsData.tags || []);
        setParameters(parametersData.parameters || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast({
          title: "Error",
          description: "Failed to load categories, tags, and parameters",
          variant: "destructive",
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [toast]);

  // Initialize incremental mode from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined' && mode === 'create') {
      const params = new URLSearchParams(window.location.search);
      const itemIdFromUrl = params.get('item_id');

      if (itemIdFromUrl && !initialData) {
        // User refreshed page or navigated directly with item_id
        setCreatedItemId(itemIdFromUrl);
        setIsIncrementalMode(true);

        // Detect current step from hash
        const hash = window.location.hash.replace('#', '');
        const stepMap: Record<string, number> = {
          'description': 1,
          'media': 2,
          'attributes': 3,
          'pricing': 4,
          'menuProducts': 5,
        };

        if (hash && stepMap[hash]) {
          setCurrentStep(stepMap[hash]);
        }

        // Optionally: Fetch item data to populate form
        // (For now, user can just continue editing)
      }
    }
  }, [mode, initialData]);

  // Fetch categories and items for event item selector
  const fetchEventCategoriesAndItems = async () => {
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        fetch(`/api/admin/glamping/categories?zone_id=${zoneId}`),
        fetch(`/api/admin/glamping/items?zone_id=${zoneId}`)
      ]);

      const categoriesData = await categoriesRes.json();
      const itemsData = await itemsRes.json();

      // Group items by category
      const categoryMap = new Map<string, EventCategory>();

      categoriesData.categories.forEach((cat: any) => {
        categoryMap.set(cat.id, { ...cat, items: [] });
      });

      itemsData.items.forEach((item: any) => {
        const category = categoryMap.get(item.category_id);
        if (category) {
          category.items.push(item);
        }
      });

      setEventCategories(Array.from(categoryMap.values()));
    } catch (error) {
      console.error('Failed to fetch event categories:', error);
    }
  };

  // Fetch event categories when modal opens
  useEffect(() => {
    if (showCreateEventModal || showEditEventModal) {
      fetchEventCategoriesAndItems();
    }
  }, [showCreateEventModal, showEditEventModal]);

  // Fetch zone settings for deposit display
  useEffect(() => {
    const fetchZoneSettings = async () => {
      if (!zoneId) return;

      try {
        const response = await fetch(`/api/admin/glamping/zones/${zoneId}/settings`);
        if (response.ok) {
          const data = await response.json();
          setZoneSettings({
            deposit_type: data.zone.deposit_type,
            deposit_value: parseFloat(data.zone.deposit_value)
          });
        }
      } catch (error) {
        console.error('Error fetching zone settings:', error);
      }
    };

    fetchZoneSettings();
  }, [zoneId]);

  // Currency formatting helper
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Upload image to Cloudinary
  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return data.url; // Cloudinary URL
  };

  // Insert event pricing for a newly created event
  const insertEventPricing = async (
    itemId: string,
    eventId: string,
    pricingData: any
  ) => {
    try {
      const pricingInserts = [];

      // Inventory pricing - allow 0 for free pricing
      if (pricingData.inventory?.amount !== undefined && pricingData.inventory?.amount !== null) {
        pricingInserts.push({
          item_id: itemId,
          event_id: eventId,
          parameter_id: null,
          rate_type: pricingRate,
          group_min: null,
          group_max: null,
          amount: pricingData.inventory.amount
        });
      }

      // Parameter base pricing - allow 0 for free pricing
      if (pricingData.parameters) {
        for (const [paramId, paramData] of Object.entries(pricingData.parameters)) {
          const typed = paramData as any;
          if (typed.amount !== undefined && typed.amount !== null) {
            pricingInserts.push({
              item_id: itemId,
              event_id: eventId,
              parameter_id: paramId,
              rate_type: pricingRate,
              group_min: null,
              group_max: null,
              amount: typed.amount
            });
          }

          // Parameter group pricing - allow 0 for free pricing
          if (typed.groups?.length > 0) {
            typed.groups.forEach((group: any) => {
              if (group && group.price !== undefined && group.price !== null) {
                pricingInserts.push({
                  item_id: itemId,
                  event_id: eventId,
                  parameter_id: paramId,
                  rate_type: pricingRate,
                  group_min: group.min,
                  group_max: group.max,
                  amount: group.price
                });
              }
            });
          }
        }
      }

      // Inventory group pricing - allow 0 for free pricing
      if (pricingData.groupPricing?.inventory?.length > 0) {
        pricingData.groupPricing.inventory.forEach((group: any) => {
          if (group && group.price !== undefined && group.price !== null) {
            pricingInserts.push({
              item_id: itemId,
              event_id: eventId,
              parameter_id: null,
              rate_type: pricingRate,
              group_min: group.min,
              group_max: group.max,
              amount: group.price
            });
          }
        });
      }

      // Batch insert all pricing records in a single request
      if (pricingInserts.length > 0) {
        const response = await fetch('/api/admin/glamping/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pricingInserts)
        });

        if (!response.ok) {
          console.error('Failed to insert pricing records for event:', eventId);
        }
      }
    } catch (error) {
      console.error('Error inserting event pricing:', error);
      // Don't throw - we want to continue even if pricing insert fails
    }
  };

  const onSubmit = async (data: FormData) => {
    console.log('Form submitted with data:', data);
    setLoading(true);

    // DETECT MODE: If createdItemId exists, we're updating existing item
    const isUpdateMode = mode === 'edit' || (mode === 'create' && createdItemId);
    const targetItemId = mode === 'edit' ? itemId : createdItemId;

    try {

      // Generate unique SKU if not provided
      // In edit/update mode, keep existing SKU if not changed
      let finalSKU = data.sku;
      if (!finalSKU) {
        if (isUpdateMode && (initialData?.sku || data.sku)) {
          // Keep original SKU in edit/update mode
          finalSKU = initialData?.sku || data.sku;
        } else if (!isUpdateMode) {
          // Generate unique SKU for new items (non-incremental flow)
          finalSKU = await generateUniqueSKU(data.name);
        }
      }

      // Check if there are any new images that need uploading
      const hasNewImages = images.some(img => img.file && !img.url);

      let validImages: Array<{ url: string; caption: string }> = [];

      // Only upload if there are new images with file objects
      if (hasNewImages) {
        setUploadingImages(true);
        const uploadedImages = await Promise.all(
          images.map(async (img) => {
            // If image already has a valid URL (from database), keep it
            if (img.url && !img.url.startsWith('blob:')) {
              return { url: img.url, caption: img.caption };
            }

            // If it's a new image with a file, upload to Cloudinary
            if (img.file) {
              try {
                const cloudinaryUrl = await uploadToCloudinary(img.file);
                return { url: cloudinaryUrl, caption: img.caption };
              } catch (error) {
                console.error('Failed to upload image:', error);
                throw new Error(`Failed to upload image: ${img.file.name}`);
              }
            }

            // Skip invalid images
            return null;
          })
        );

        // Filter out nulls
        validImages = uploadedImages.filter(img => img !== null);
        setUploadingImages(false);

        // Update images state: clear file objects after successful upload
        // This prevents re-uploading on subsequent saves
        // Map uploaded images back to state by position
        let uploadedIndex = 0;
        setImages(prevImages =>
          prevImages.map((img) => {
            if (img.file && !img.url) {
              // This image was just uploaded
              const uploadedImg = validImages[uploadedIndex];
              uploadedIndex++;
              if (uploadedImg) {
                // Replace with uploaded URL, clear file object
                return {
                  url: uploadedImg.url,
                  preview: uploadedImg.url,
                  caption: uploadedImg.caption,
                };
              }
            }
            return img;
          })
        );
      } else {
        // No new images, just use existing URLs
        validImages = images
          .filter(img => img.url && !img.url.startsWith('blob:'))
          .map(img => ({ url: img.url!, caption: img.caption }));
      }

      // CREATE PENDING TAGS BEFORE ITEM CREATION (only for non-incremental create)
      const tempToRealIdMap: Record<string, string> = {};

      if (!isUpdateMode && pendingTags.length > 0) {
        for (const tag of pendingTags) {
          const response = await fetch('/api/admin/glamping/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: tag.name,
              weight: 0,
              visibility: "staff",
              zone_id: zoneId // Add zone_id for multi-zone support
            }),
          });

          if (response.ok) {
            const result = await response.json();
            // Map temp ID to real UUID
            tempToRealIdMap[tag.id] = result.tag.id;
          } else {
            // If any tag creation fails, throw error to stop item creation
            const errorResult = await response.json();
            throw new Error(errorResult.error || 'Failed to create tag');
          }
        }
      }

      // Map selectedTags: replace temp IDs with real UUIDs
      const mappedTags = selectedTags.map(tagId => tempToRealIdMap[tagId] || tagId);

      // Transform timeslots format for database (if allocation type is timeslots)
      const dayNameToNumber: Record<string, number> = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
      };

      const transformedTimeslots = data.allocation_type === 'timeslots'
        ? timeslots
            .filter(slot => slot.startTime && slot.endTime)
            .map(slot => ({
              start_time: slot.startTime,
              end_time: slot.endTime,
              days_of_week: slot.selectedDays.map(day => dayNameToNumber[day.toLowerCase()] ?? 0)
            }))
        : undefined;

      // Combine form data with additional state (media, pricing, packages)
      const submitData = {
        ...data,
        sku: finalSKU,
        zone_id: zoneId, // Add zone_id for multi-zone support
        // Tags (Step 1) - use mapped tags with real UUIDs
        tags: mappedTags,
        // Media (Step 2)
        images: validImages,
        youtube_url: youtubeUrl,
        video_start_time: youtubeStartTime,
        // Parameters (Step 3)
        parameters: attachedParameters.map((param, index) => ({
          parameter_id: param.id,
          min_quantity: param.min_max.min,
          max_quantity: param.min_max.max,
          display_order: index
        })),
        // Pricing (Step 4)
        pricing_rate: pricingRate,
        group_pricing: groupPricing,
        parameter_base_prices: parameterBasePrices,
        event_pricing: eventPricing,
        deposit_type: depositType,
        deposit_value: depositValue,
        // Menu Products (Step 5)
        menu_products: menuProducts,
        // Timeslots (Step 3 - Allocation)
        timeslots: transformedTimeslots,
        // Taxes (Step 6)
        taxes: taxes.filter(tax => tax.enabled), // Only send enabled taxes
      };

      // DETERMINE ENDPOINT AND METHOD
      const url = isUpdateMode
        ? `/api/admin/glamping/items/${targetItemId}`
        : '/api/admin/glamping/items';
      const method = isUpdateMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || (isUpdateMode ? 'Failed to update item' : 'Failed to create item'));
      }

      // Get the current item ID for event attachment
      const currentItemId = isUpdateMode
        ? targetItemId
        : (result.item?.id || result.id);

      // Save attached events if any
      if (attachedEvents.length > 0 && currentItemId) {
        for (const event of attachedEvents) {
          try {
            if (event.id.startsWith('temp_')) {
              // Create new event and attach to item
              const eventResponse = await fetch('/api/admin/glamping/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: event.name,
                  type: event.type,
                  start_date: event.start_date,
                  end_date: event.end_date,
                  recurrence: event.recurrence,
                  days_of_week: event.days_of_week,
                  pricing_type: event.pricing_type,
                  status: event.status,
                  zone_id: zoneId, // Add zone_id for multi-zone support
                  item_ids: [currentItemId],
                  // Add dynamic pricing configuration
                  dynamic_pricing: {
                    value: event.dynamic_pricing_value,
                    mode: event.dynamic_pricing_mode
                  },
                  yield_thresholds: event.yield_thresholds
                }),
              });

              if (!eventResponse.ok) {
                console.error('Failed to create event:', event.name);
              } else {
                // Event created successfully - now insert pricing with real event ID
                const eventResult = await eventResponse.json();
                const realEventId = eventResult.event_id;

                // Get pricing data for this temp event
                const tempEventPricing = eventPricing[event.id];
                if (tempEventPricing && realEventId) {
                  await insertEventPricing(currentItemId, realEventId, tempEventPricing);
                }
              }
            } else {
              // Attach existing event to item
              const updateResponse = await fetch(`/api/admin/glamping/events/${event.id}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  item_id: currentItemId,
                }),
              });

              if (!updateResponse.ok) {
                console.error('Failed to attach event:', event.name);
              }
            }
          } catch (eventError) {
            console.error('Error saving event:', event.name, eventError);
            // Continue with other events even if one fails
          }
        }
      }

      // Clear pending tags after successful submission
      setPendingTags([]);

      // Get the item ID based on mode
      const finalItemId = isUpdateMode
        ? targetItemId
        : (result.item?.id || result.id);

      // If moveToNextStep flag is set, move to next step instead of redirecting
      if (shouldMoveToNextStepRef.current) {
        shouldMoveToNextStepRef.current = false; // Reset flag
        toast({
          title: "Đã lưu",
          description: "Chuyển sang bước tiếp theo...",
        });

        // Move to next step
        if (currentStep < STEPS.length) {
          const nextStep = currentStep + 1;
          setCurrentStep(nextStep);

          // Update URL hash
          if (finalItemId) {
            const stepKey = STEPS[nextStep - 1]?.key;
            if (stepKey) {
              const urlPath = mode === 'edit'
                ? `/admin/zones/${zoneId}/items/${finalItemId}/edit#${stepKey}`
                : `/admin/zones/${zoneId}/items/new?item_id=${finalItemId}#${stepKey}`;
              router.replace(urlPath, { scroll: false });
            }
          }
        }
      } else {
        toast({
          title: "Thành công",
          description: isUpdateMode ? "Cập nhật item thành công" : "Tạo item thành công",
        });

        // Handle success callback or default redirect
        if (onSuccess && finalItemId) {
          onSuccess(finalItemId);
        } else {
          router.push(`/admin/zones/${zoneId}/items`);
        }
      }
    } catch (error: any) {
      console.error(isUpdateMode ? 'Update item error:' : 'Create item error:', error);
      toast({
        title: "Lỗi",
        description: error.message || (isUpdateMode ? "Không thể cập nhật item" : "Không thể tạo item"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const handleNext = async () => {
    // STEP 1 SPECIAL HANDLING: Save to DB before moving to Step 2
    if (currentStep === 1 && mode === 'create' && !createdItemId) {
      // 1. Validate Step 1 required fields
      const isValid = await form.trigger(['name', 'sku', 'category_id', 'summary']);
      if (!isValid) {
        toast({
          title: tc("error"),
          description: "Please fill in required fields",
          variant: "destructive"
        });
        return; // Don't proceed if validation fails
      }

      try {
        setLoading(true);

        // 2. Create pending categories first (existing logic)
        if (pendingCategories.length > 0) {
          for (const category of pendingCategories) {
            const response = await fetch('/api/admin/glamping/categories', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: category.name,
                weight: 1000,
                status: "active",
                zone_id: zoneId
              }),
            });

            const result = await response.json();
            if (response.ok) {
              // Update form value with real ID
              if (form.getValues('category_id') === category.id) {
                form.setValue('category_id', result.category.id);
              }
            }
          }

          // Clear pending categories
          setPendingCategories([]);

          // Refresh categories
          const catRes = await fetch(`/api/admin/glamping/categories?zone_id=${zoneId}`);
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }

        // 3. Generate SKU if not provided
        const formData = form.getValues();
        let finalSKU = formData.sku;
        if (!finalSKU) {
          finalSKU = await generateUniqueSKU(formData.name);
        }

        // 4. Create pending tags before item
        const tempToRealIdMap: Record<string, string> = {};
        if (pendingTags.length > 0) {
          for (const tag of pendingTags) {
            const response = await fetch('/api/admin/glamping/tags', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: tag.name,
                weight: 0,
                visibility: "staff",
                zone_id: zoneId
              }),
            });
            if (response.ok) {
              const result = await response.json();
              tempToRealIdMap[tag.id] = result.tag.id;
            }
          }
        }
        const mappedTags = selectedTags.map(tagId => tempToRealIdMap[tagId] || tagId);

        // 5. POST Step 1 data with defaults for required fields
        const step1Data = {
          name: formData.name,
          sku: finalSKU,
          zone_id: zoneId,
          category_id: formData.category_id || null,
          summary: formData.summary || null,
          tags: mappedTags,
          // Defaults for required DB fields
          inventory_quantity: 1,
          unlimited_inventory: false,
          allocation_type: 'per_night',
          visibility: 'everyone',
          default_calendar_status: 'available',
        };

        const response = await fetch('/api/admin/glamping/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(step1Data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create item');
        }

        // 6. Extract item ID and update state
        const newItemId = result.id || result.item?.id;
        setCreatedItemId(newItemId);
        setIsIncrementalMode(true);
        setPendingTags([]);

        // 7. Update form with saved SKU
        form.setValue('sku', result.sku || finalSKU);

        // 8. Update URL with item_id and hash
        const newUrl = `/admin/zones/${zoneId}/items/new?item_id=${newItemId}#media`;
        router.replace(newUrl, { scroll: false });

        toast({
          title: "Thành công",
          description: "Item đã được tạo. Tiếp tục chỉnh sửa...",
        });

        // 9. Move to Step 2
        setCurrentStep(2);

      } catch (error: any) {
        console.error('Step 1 save error:', error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể lưu Step 1",
          variant: "destructive",
        });
        return; // Don't advance if save failed
      } finally {
        setLoading(false);
      }
    }
    // STEPS 2-5: Auto-save before moving to next step
    else {
      // For edit mode or incremental create mode (item already exists), auto-save
      if (mode === 'edit' || (mode === 'create' && createdItemId)) {
        // Get current form data and submit with moveToNextStep flag
        const formData = form.getValues();
        shouldMoveToNextStepRef.current = true;
        await onSubmit(formData);
      } else {
        // Fallback: Just move to next step if no item ID yet
        if (currentStep < STEPS.length) {
          setCurrentStep(currentStep + 1);
        }
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);

      // Update URL hash if in incremental mode
      if (isIncrementalMode && createdItemId) {
        const stepKey = STEPS[prevStep - 1]?.key;
        if (stepKey) {
          router.replace(
            `/admin/zones/${zoneId}/items/new?item_id=${createdItemId}#${stepKey}`,
            { scroll: false }
          );
        }
      }
    } else {
      router.back();
    }
  };

  // Handle inline category creation
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: tc("error"),
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    const tempId = `temp-cat-${Date.now()}`;
    const newCategory = {
      id: tempId,
      name: newCategoryName.trim(),
      isNew: true
    };

    setPendingCategories([...pendingCategories, newCategory]);
    form.setValue('category_id', tempId);
    setNewCategoryName("");
    setShowCategoryInput(false);
  };

  // Handle inline tag creation
  const handleAddTag = () => {
    if (!newTagName.trim()) {
      toast({
        title: tc("error"),
        description: "Tag name is required",
        variant: "destructive",
      });
      return;
    }

    const tempId = `temp-tag-${Date.now()}`;
    const newTag = {
      id: tempId,
      name: newTagName.trim(),
      isNew: true
    };

    setPendingTags([...pendingTags, newTag]);
    setSelectedTags([...selectedTags, tempId]);
    setNewTagName("");
    setShowTagInput(false);
  };

  // Toggle tag selection from dropdown
  const handleToggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  // Remove tag
  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter(id => id !== tagId));
    // Also remove from pending if it's a new tag
    if (tagId.startsWith('temp-tag-')) {
      setPendingTags(pendingTags.filter(tag => tag.id !== tagId));
    }
  };

  // Handle create/update parameter
  const handleCreateParameter = async (formData: any) => {
    if (!formData.name) {
      toast({
        title: tc("error"),
        description: "Parameter name is required",
        variant: "destructive",
      });
      return;
    }

    setCreatingParameter(true);

    try {
      const isEditing = !!editingParameter;

      // Auto-generate random color for new parameters
      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#6b7280'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      // Prepare data
      const dataToSubmit = {
        ...formData,
        color_code: isEditing ? editingParameter.color_code : randomColor,
        zone_id: zoneId
      };

      // Determine endpoint and method
      const url = isEditing
        ? `/api/admin/glamping/parameters/${editingParameter.id}`
        : '/api/admin/glamping/parameters';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || (isEditing ? 'Failed to update parameter' : 'Failed to create parameter'));
      }

      toast({
        title: tc("success"),
        description: isEditing ? "Parameter updated successfully" : "Parameter created successfully",
      });

      // Refresh parameters list
      const parametersRes = await fetch(`/api/admin/glamping/parameters?zone_id=${zoneId}`);
      const parametersData = await parametersRes.json();
      setParameters(parametersData.parameters || []);

      // Update attached parameters if editing
      if (isEditing) {
        const updatedAttachedParams = attachedParameters.map(p =>
          p.id === editingParameter.id
            ? {
                ...p,
                name: result.parameter?.name || formData.name,
                color_code: result.parameter?.color_code || editingParameter.color_code,
                visibility: result.parameter?.visibility || formData.visibility,
                inventory: (result.parameter?.controls_inventory ?? formData.controls_inventory) ? 'Controlled' : 'Unlimited',
                // Keep existing min_max values as they're managed separately
              }
            : p
        );
        setAttachedParameters(updatedAttachedParams);
      }

      // Close modal and reset editing state
      setShowCreateParameterModal(false);
      setEditingParameter(null);
    } catch (error: any) {
      toast({
        title: tc("error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingParameter(false);
    }
  };

  // Handle attach parameters
  const handleAttachParameters = () => {
    const parametersToAttach = parameters.filter(param =>
      selectedParameterIds.includes(param.id) &&
      !attachedParameters.find(ap => ap.id === param.id)
    );

    const newAttachedParams = parametersToAttach.map(param => ({
      id: param.id,
      name: param.name,
      color_code: param.color_code,
      inventory: param.controls_inventory ? 'Controlled' : 'Unlimited',
      visibility: param.visibility || 'Everyone',
      min_max: { min: 0, max: 0 }
    }));

    setAttachedParameters([...attachedParameters, ...newAttachedParams]);
    setSelectedParameterIds([]);
    setShowAttachParameterModal(false);

    toast({
      title: tc("success"),
      description: `${newAttachedParams.length} parameter(s) attached successfully`,
    });
  };

  // Toggle parameter selection
  const toggleParameterSelection = (parameterId: string) => {
    if (selectedParameterIds.includes(parameterId)) {
      setSelectedParameterIds(selectedParameterIds.filter(id => id !== parameterId));
    } else {
      setSelectedParameterIds([...selectedParameterIds, parameterId]);
    }
  };

  // ===== Event Handler Functions (Stubs) =====

  // Handle event type selection from dropdown
  const handleEventTypeSelect = (type: string) => {
    setSelectedEventType(type);
    setEventFormData({
      ...eventFormData,
      type: type as 'seasonal' | 'special',
    });

    // Automatically select the current item being edited
    const currentItemId = mode === 'edit' ? itemId : createdItemId;
    if (currentItemId) {
      setSelectedItemsForEvent([currentItemId]);
    }

    setShowCreateEventDropdown(false);
    setShowCreateEventModal(true);
  };

  // Handle event field changes
  const handleEventFieldChange = (field: string, value: any) => {
    setEventFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle dynamic pricing changes
  const handleDynamicPricingChange = (data: { value: number; mode: 'percent' | 'fixed' }) => {
    setEventFormData(prev => ({
      ...prev,
      dynamic_pricing: data,
    }));
  };

  // Handle yield thresholds changes
  const handleYieldThresholdsChange = (thresholds: Array<{ stock: number; rate_adjustment: number }>) => {
    setEventFormData(prev => ({
      ...prev,
      yield_thresholds: thresholds,
    }));
  };

  // Handle item selection change for events
  const handleItemSelectionChange = (selectedIds: string[]) => {
    setSelectedItemsForEvent(selectedIds);
  };

  // Handle item toggle for events
  const toggleItemForEvent = (itemId: string) => {
    setSelectedItemsForEvent(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Handle category toggle for events
  const toggleCategoryForEvent = (categoryId: string) => {
    // Find all items in this category
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    // TODO: Need items data - for now just toggle category itself
    // This will need to be implemented when categories have items
  };

  // Handle select all items for event
  const handleSelectAllItemsForEvent = () => {
    // TODO: Select all items from all categories
  };

  // Handle select none items for event
  const handleSelectNoneItemsForEvent = () => {
    setSelectedItemsForEvent([]);
  };

  // Auto-populate event pricing with base prices
  const populateEventPricingDefaults = (eventId: string) => {
    setEventPricing(prev => {
      // Skip if already populated
      if (prev[eventId]) return prev;

      // Copy base pricing as defaults
      const defaultData: any = {
        inventory: { amount: 0 },
        parameters: {},
        groupPricing: {}
      };

      // Copy parameter base prices (only for parameters with base prices set)
      parameters.forEach(param => {
        // Only copy if this parameter has a base price set
        if (parameterBasePrices[param.id] !== undefined && parameterBasePrices[param.id] !== null) {
          defaultData.parameters[param.id] = {
            amount: parameterBasePrices[param.id] || 0,
            groups: groupPricing[param.id]?.map(g => ({ ...g })) || []
          };
        }
      });

      // Copy inventory group pricing if exists
      if (groupPricing.inventory && Array.isArray(groupPricing.inventory)) {
        defaultData.groupPricing.inventory = groupPricing.inventory.map(g => ({ ...g }));
      }

      return { ...prev, [eventId]: defaultData };
    });
  };

  // Handle create new event
  const handleCreateEvent = async () => {
    try {
      // Create temporary event ID for unsaved items
      const tempEventId = `temp_${Date.now()}`;

      const newEvent = {
        id: tempEventId,
        name: eventFormData.name,
        type: eventFormData.type,
        start_date: eventFormData.start_date,
        end_date: eventFormData.end_date || null,
        recurrence: eventFormData.recurrence,
        days_of_week: eventFormData.days_of_week.length > 0 ? eventFormData.days_of_week : null,
        pricing_type: eventFormData.pricing_type,
        status: eventFormData.status,
        applicable_times: eventFormData.applicable_times,
        rules_id: eventFormData.rules_id,
        dynamic_pricing_value: eventFormData.dynamic_pricing.value,
        dynamic_pricing_mode: eventFormData.dynamic_pricing.mode,
        yield_thresholds: eventFormData.yield_thresholds,
      };

      // Add to attached events
      setAttachedEvents([...attachedEvents, newEvent]);

      // Auto-populate event pricing with base prices
      populateEventPricingDefaults(tempEventId);

      // Reset form and close modal
      setEventFormData({
        name: '',
        type: 'seasonal',
        start_date: '',
        end_date: null,
        recurrence: 'one_time',
        days_of_week: [],
        pricing_type: 'base_price',
        status: 'available',
        active: true,
        applicable_times: 'all',
        rules_id: null,
        dynamic_pricing: {
          value: 0,
          mode: 'percent',
        },
        yield_thresholds: [
          { stock: 0, rate_adjustment: 0 }
        ],
      });
      setSelectedItemsForEvent([]);
      setShowCreateEventModal(false);

      toast({
        title: tc("success"),
        description: t('itemEvents.createSuccess'),
      });
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: tc("error"),
        description: t('itemEvents.createError'),
        variant: "destructive",
      });
    }
  };

  // Handle attach existing events
  const handleAttachExisting = async () => {
    try {
      // Fetch available events from API (filtered by zone)
      const response = await fetch(`/api/admin/glamping/events?zone_id=${zoneId}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch events');
      }

      const data = await response.json();

      if (data.events) {
        // Map events to expected format
        const formattedEvents = data.events.map((event: any) => ({
          id: event.id,
          name: event.name,
          type: event.type,
          start_date: event.start_date,
          end_date: event.end_date,
          item_count: parseInt(event.item_count) || 0,
          recurrence: event.recurrence || 'one_time',
          days_of_week: event.days_of_week,
          pricing_type: event.pricing_type || 'base_price',
          status: event.status || 'available',
        }));

        setAvailableEvents(formattedEvents);
        setShowAttachEventModal(true);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: tc("error"),
        description: t('itemEvents.fetchError'),
        variant: "destructive",
      });
    }
  };

  // Handle attach selected events
  const handleAttachExistingEvents = () => {
    try {
      const eventsToAttach = availableEvents.filter(event =>
        selectedEventIds.includes(event.id) &&
        !attachedEvents.find(e => e.id === event.id)
      );

      const newEvents = eventsToAttach.map(event => ({
        id: event.id,
        name: event.name,
        type: event.type,
        start_date: event.start_date,
        end_date: event.end_date,
        recurrence: event.recurrence || 'one_time',
        days_of_week: event.days_of_week || null,
        pricing_type: event.pricing_type || 'base_price',
        status: event.status || 'available',
        dynamic_pricing_value: event.dynamic_pricing_value,
        dynamic_pricing_mode: event.dynamic_pricing_mode,
        yield_thresholds: event.yield_thresholds,
      }));

      setAttachedEvents([...attachedEvents, ...newEvents]);

      // Auto-populate event pricing for each attached event
      newEvents.forEach(event => {
        populateEventPricingDefaults(event.id);
      });

      setSelectedEventIds([]);
      setShowAttachEventModal(false);

      toast({
        title: tc("success"),
        description: t('itemEvents.attachSuccess'),
      });
    } catch (error) {
      console.error('Error attaching events:', error);
      toast({
        title: tc("error"),
        description: t('itemEvents.attachError'),
        variant: "destructive",
      });
    }
  };

  // Handle edit event
  const handleEditEvent = (eventId: string) => {
    // TODO: Implement in Phase 3
    const event = attachedEvents.find(e => e.id === eventId);
    if (event) {
      setEventFormData({
        name: event.name,
        type: event.type as 'seasonal' | 'special' | 'closure',
        start_date: event.start_date || '',
        end_date: event.end_date || '',
        recurrence: (event.recurrence || 'one_time') as 'one_time' | 'weekly' | 'monthly' | 'yearly' | 'always',
        days_of_week: event.days_of_week || [],
        pricing_type: event.pricing_type as 'base_price' | 'new_price' | 'dynamic' | 'yield',
        status: event.status as 'available' | 'unavailable',
        active: true,
        applicable_times: "all",
        rules_id: null,
        dynamic_pricing: {
          value: event.dynamic_pricing_value || 0,
          mode: (event.dynamic_pricing_mode || 'percent') as 'percent' | 'fixed',
        },
        yield_thresholds: event.yield_thresholds || [
          { stock: 0, rate_adjustment: 0 }
        ],
      });
      setEditingEventId(eventId);
      setShowEditEventModal(true);
    }
  };

  // Handle update event
  const handleUpdateEvent = async () => {
    try {
      if (!editingEventId) return;

      // Update event in attachedEvents array
      setAttachedEvents(attachedEvents.map(event =>
        event.id === editingEventId
          ? {
              ...event,
              name: eventFormData.name,
              start_date: eventFormData.start_date,
              end_date: eventFormData.end_date || null,
              recurrence: eventFormData.recurrence,
              days_of_week: eventFormData.days_of_week.length > 0 ? eventFormData.days_of_week : null,
              pricing_type: eventFormData.pricing_type,
              status: eventFormData.status,
              applicable_times: eventFormData.applicable_times,
              rules_id: eventFormData.rules_id,
              dynamic_pricing_value: eventFormData.dynamic_pricing.value,
              dynamic_pricing_mode: eventFormData.dynamic_pricing.mode,
              yield_thresholds: eventFormData.yield_thresholds,
            }
          : event
      ));

      // Reset form and close modal
      setEventFormData({
        name: '',
        type: 'seasonal',
        start_date: '',
        end_date: null,
        recurrence: 'one_time',
        days_of_week: [],
        pricing_type: 'base_price',
        status: 'available',
        active: true,
        applicable_times: 'all',
        rules_id: null,
        dynamic_pricing: {
          value: 0,
          mode: 'percent',
        },
        yield_thresholds: [
          { stock: 0, rate_adjustment: 0 }
        ],
      });
      setEditingEventId(null);
      setShowEditEventModal(false);

      toast({
        title: tc("success"),
        description: t('itemEvents.updateSuccess'),
      });
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: tc("error"),
        description: t('itemEvents.updateError'),
        variant: "destructive",
      });
    }
  };

  // Handle detach event
  const handleDetachEvent = (eventId: string) => {
    setAttachedEvents(attachedEvents.filter(e => e.id !== eventId));
    toast({
      title: tc("success"),
      description: t('itemEvents.detachSuccess'),
    });
  };

  // Toggle event selection for attachment
  const toggleEventSelection = (eventId: string) => {
    if (selectedEventIds.includes(eventId)) {
      setSelectedEventIds(selectedEventIds.filter(id => id !== eventId));
    } else {
      setSelectedEventIds([...selectedEventIds, eventId]);
    }
  };

  // Toggle item selection for "Áp dụng cho"
  const toggleItemSelection = (itemId: string) => {
    if (selectedItemsForEvent.includes(itemId)) {
      setSelectedItemsForEvent(selectedItemsForEvent.filter(id => id !== itemId));
    } else {
      setSelectedItemsForEvent([...selectedItemsForEvent, itemId]);
    }
  };

  // Format date for display
  const formatEventDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';

    try {
      const date = new Date(dateString);
      // Format as DD/MM/YYYY
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  };

  // Format days of week for display
  const formatDaysOfWeek = (days: number[]): string => {
    // If all 7 days selected, return "Everyday"
    if (days.length === 7) {
      return 'Everyday';
    }

    // Map to abbreviated day names
    const dayAbbreviations = [
      'CN',   // Sunday (Chủ Nhật)
      'T2',   // Monday (Thứ Hai)
      'T3',   // Tuesday (Thứ Ba)
      'T4',   // Wednesday (Thứ Tư)
      'T5',   // Thursday (Thứ Năm)
      'T6',   // Friday (Thứ Sáu)
      'T7',   // Saturday (Thứ Bảy)
    ];

    // Sort days and map to abbreviations
    const sortedDays = [...days].sort((a, b) => a - b);
    return sortedDays.map(d => dayAbbreviations[d] || '').join(', ');
  };

  // ===== End Event Handler Functions =====

  // Get visibility translation
  const getVisibilityTranslation = (visibility: string | undefined) => {
    if (!visibility) return t('everyone');
    switch (visibility.toLowerCase()) {
      case 'everyone':
        return t('everyone');
      case 'staff_only':
      case 'staff only':
        return t('staffOnly');
      case 'packages_only':
      case 'packages only':
        return t('packagesOnly');
      default:
        return visibility;
    }
  };

  const unlimitedInventory = form.watch('unlimited_inventory');
  const itemName = form.watch('name') || 'New Item';
  const allocationType = form.watch('allocation_type');

  // Generate SKU from name
  const generateSKU = (name: string): string => {
    if (!name) return '';

    // Remove Vietnamese diacritics
    const vietnameseMap: Record<string, string> = {
      'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a', 'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
      'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
      'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e', 'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
      'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
      'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o', 'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
      'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
      'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u', 'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
      'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
      'đ': 'd',
      'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A', 'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
      'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
      'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E', 'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
      'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
      'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O', 'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
      'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
      'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U', 'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
      'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
      'Đ': 'D',
    };

    let result = name;

    // Replace Vietnamese characters
    for (const [key, value] of Object.entries(vietnameseMap)) {
      result = result.replace(new RegExp(key, 'g'), value);
    }

    // Convert to lowercase, replace spaces and special chars with hyphens
    result = result
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphen
      .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens

    return result;
  };

  // Check if SKU exists and generate unique SKU
  const generateUniqueSKU = async (name: string): Promise<string> => {
    const baseSKU = generateSKU(name);
    if (!baseSKU) return '';

    let currentSKU = baseSKU;
    let suffix = 1;
    let isUnique = false;

    // Check up to 100 times (safety limit)
    while (!isUnique && suffix <= 100) {
      try {
        // Check if SKU exists globally (SKU is unique across all zones)
        const response = await fetch(`/api/admin/glamping/items?sku=${currentSKU}`);
        const data = await response.json();

        // If no items found with this SKU, it's unique
        // OR if in edit mode and the only item found is the current item, it's also unique
        if (!data.items || data.items.length === 0) {
          isUnique = true;
        } else if (mode === 'edit' && itemId && data.items.length === 1 && data.items[0].id === itemId) {
          // The only item with this SKU is the current item being edited
          isUnique = true;
        } else {
          // SKU exists in another item, add suffix and try again
          currentSKU = `${baseSKU}-${suffix}`;
          suffix++;
        }
      } catch (error) {
        console.error('Error checking SKU:', error);
        // On error, use the current SKU
        isUnique = true;
      }
    }

    return currentSKU;
  };

  // Watch name and generate SKU
  const currentName = form.watch('name');
  const generatedSKU = currentName ? generateSKU(currentName) : '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b pb-4 px-6">
        <div className="flex items-center justify-between  mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? t('title') : 'Chỉnh sửa thông tin Lều'} - {STEPS[currentStep - 1].name}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {currentStep === 1 && t(mode === 'create' ? 'stepDesc.description' : 'stepDescEdit.description')}
              {currentStep === 2 && t(mode === 'create' ? 'stepDesc.media' : 'stepDescEdit.media')}
              {currentStep === 3 && t(mode === 'create' ? 'stepDesc.attributes' : 'stepDescEdit.attributes')}
              {currentStep === 4 && t(mode === 'create' ? 'stepDesc.pricing' : 'stepDescEdit.pricing')}
              {currentStep === 5 && t(mode === 'create' ? 'stepDesc.menuProducts' : 'stepDescEdit.menuProducts')}
            </p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.log('Form validation errors:', errors);

          // Find which step has errors and navigate to it
          const errorFields = Object.keys(errors);
          console.log('Error fields:', errorFields);

          // Map fields to steps
          const step1Fields = ['name', 'sku', 'category_id', 'summary'];
          const step2Fields = []; // media handled separately
          const step3Fields = ['inventory_quantity', 'unlimited_inventory', 'allocation_type', 'visibility', 'default_calendar_status', 'fixed_length_value', 'fixed_length_unit', 'fixed_start_time', 'default_length_hours'];

          let errorStep = 1;
          let errorFieldNames: string[] = [];

          if (errorFields.some(f => step1Fields.includes(f))) {
            errorStep = 1;
            errorFieldNames = errorFields.filter(f => step1Fields.includes(f));
          } else if (errorFields.some(f => step3Fields.includes(f))) {
            errorStep = 3;
            errorFieldNames = errorFields.filter(f => step3Fields.includes(f));
          }

          // Navigate to the step with error
          setCurrentStep(errorStep);

          // Build error message with field names
          const fieldLabels: Record<string, string> = {
            'name': 'Tên item',
            'sku': 'Mã SKU',
            'category_id': 'Danh mục',
            'summary': 'Mô tả',
            'inventory_quantity': 'Số lượng tồn kho',
            'allocation_type': 'Loại phân bổ',
            'visibility': 'Hiển thị',
            'default_calendar_status': 'Trạng thái lịch',
          };

          const errorMessages = errorFieldNames
            .map(field => `- ${fieldLabels[field] || field}: ${errors[field as keyof typeof errors]?.message || 'Bắt buộc'}`)
            .join('\n');

          toast({
            title: `Lỗi ở Bước ${errorStep}`,
            description: errorMessages || "Vui lòng kiểm tra lại các trường bắt buộc",
            variant: "destructive",
          });
        })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
              e.preventDefault();
            }
          }}
        >
          <div className="pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
              {/* Left: Form Fields (2/3) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Step 1: Description */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('category')}</FormLabel>
                          {!showCategoryInput ? (
                            <div className="flex gap-2">
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={loadingData}
                              >
                                <FormControl>
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder={loadingData ? tc('loading') : t('categoryPlaceholder')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories.length === 0 && pendingCategories.length === 0 ? (
                                    <div className="py-6 text-center text-sm text-gray-500">
                                      {t('noCategoriesAvailable')}
                                    </div>
                                  ) : (
                                    <>
                                      {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                          {category.name}
                                        </SelectItem>
                                      ))}
                                      {pendingCategories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                          <div className="flex items-center gap-2">
                                            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded">New Category</span>
                                            <span>{category.name}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                className="bg-primary hover:bg-primary/90 whitespace-nowrap"
                                style={{ minWidth: '200px' }}
                                onClick={() => setShowCategoryInput(true)}
                              >
                                {t('createNewCategory')}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                placeholder={t('newCategoryPlaceholder')}
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCategory();
                                  } else if (e.key === 'Escape') {
                                    setShowCategoryInput(false);
                                    setNewCategoryName("");
                                  }
                                }}
                                autoFocus
                              />
                              <Button
                                type="button"
                                size="icon"
                                className="bg-primary hover:bg-primary/90"
                                onClick={handleAddCategory}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={() => {
                                  setShowCategoryInput(false);
                                  setNewCategoryName("");
                                }}
                              >
                                <X className="w-5 h-5" />
                              </Button>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('tags')}
                      </label>

                      {/* Selected Tags Display */}
                      {selectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3 p-3 border rounded-lg bg-white">
                          {selectedTags.map((tagId) => {
                            const tag = [...tags, ...pendingTags].find(t => t.id === tagId);
                            if (!tag) return null;
                            const isNew = pendingTags.some(t => t.id === tagId);
                            return (
                              <div
                                key={tagId}
                                className="flex items-center gap-1 bg-blue-50 border rounded px-2 py-1"
                              >
                                {isNew && (
                                  <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                                    New
                                  </span>
                                )}
                                <span className="text-sm">{tag.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(tagId)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Tag Controls */}
                      {!showTagInput ? (
                        <div className="flex gap-2">
                          <Popover open={showTagDropdown} onOpenChange={setShowTagDropdown}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1 justify-between"
                                disabled={loadingData}
                              >
                                <span className="text-muted-foreground font-normal">{loadingData ? tc('loading') : t('selectTags')}</span>
                                <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                              <div className="max-h-64 overflow-y-auto p-2">
                                {tags.length === 0 && pendingTags.length === 0 ? (
                                  <p className="text-sm text-gray-500 p-2 text-center">{t('noTagsAvailable')}</p>
                                ) : (
                                  <div className="space-y-1">
                                    {/* Existing tags */}
                                    {tags.map((tag) => (
                                      <div
                                        key={tag.id}
                                        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                                        onClick={() => handleToggleTag(tag.id)}
                                      >
                                        <Checkbox
                                          checked={selectedTags.includes(tag.id)}
                                          onCheckedChange={() => handleToggleTag(tag.id)}
                                        />
                                        <span className="text-sm flex-1">{tag.name}</span>
                                      </div>
                                    ))}
                                    {/* Pending new tags */}
                                    {pendingTags.map((tag) => (
                                      <div
                                        key={tag.id}
                                        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                                        onClick={() => handleToggleTag(tag.id)}
                                      >
                                        <Checkbox
                                          checked={selectedTags.includes(tag.id)}
                                          onCheckedChange={() => handleToggleTag(tag.id)}
                                        />
                                        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                                          New Tag
                                        </span>
                                        <span className="text-sm flex-1">{tag.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button
                            type="button"
                            className="bg-primary hover:bg-primary/90 whitespace-nowrap"
                            style={{ minWidth: '200px' }}
                            onClick={() => setShowTagInput(true)}
                          >
                            {t('createNewTag')}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder={t('newTagPlaceholder')}
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                              } else if (e.key === 'Escape') {
                                setShowTagInput(false);
                                setNewTagName("");
                              }
                            }}
                            autoFocus
                          />
                          <Button
                            type="button"
                            size="icon"
                            className="bg-primary hover:bg-primary/90"
                            onClick={handleAddTag}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              setShowTagInput(false);
                              setNewTagName("");
                            }}
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('name')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('namePlaceholder')} {...field} />
                          </FormControl>
                          {field.value && (
                            <div className="text-sm text-gray-600 mt-1">
                              {!isEditingSKU ? (
                                <>
                                  {t('sku')}: <span className="text-blue-600">{form.watch('sku') || generatedSKU || 'auto-generated'}</span>{' '}
                                  <button
                                    type="button"
                                    className="text-blue-600 hover:underline"
                                    onClick={() => {
                                      setEditableSKU(form.watch('sku') || generatedSKU || '');
                                      setIsEditingSKU(true);
                                    }}
                                  >
                                    {t('edit')}
                                  </button>
                                </>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>{t('sku')}:</span>
                                  <Input
                                    value={editableSKU}
                                    onChange={(e) => setEditableSKU(e.target.value)}
                                    className="h-8 w-64"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        form.setValue('sku', editableSKU);
                                        setIsEditingSKU(false);
                                      } else if (e.key === 'Escape') {
                                        setIsEditingSKU(false);
                                      }
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => {
                                      form.setValue('sku', editableSKU);
                                      setIsEditingSKU(false);
                                      toast({
                                        title: tc("success"),
                                        description: t('skuUpdated'),
                                      });
                                    }}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8"
                                    onClick={() => setIsEditingSKU(false)}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="summary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('summary')}</FormLabel>
                          <FormControl>
                            <RichTextEditor
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder={t('summaryPlaceholder')}
                              maxWords={60}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 2: Media */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    {/* Images Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-4">
                        {t('steps.media')}
                      </label>

                      {/* Upload Button */}
                      <div className="mb-4">
                        <input
                          type="file"
                          id="image-upload"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (images.length + files.length > 5) {
                              toast({
                                title: tc("error"),
                                description: t("maxImagesError"),
                                variant: "destructive",
                              });
                              return;
                            }
                            const newImages = files.map(file => ({
                              file,
                              preview: URL.createObjectURL(file),
                              caption: ''
                            }));
                            setImages([...images, ...newImages]);
                            e.target.value = '';
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('image-upload')?.click()}
                          disabled={images.length >= 5}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {t('uploadImages')}
                        </Button>
                        <p className="text-sm text-muted-foreground mt-2">
                          {t('imageUploadHint')}
                        </p>
                      </div>

                      {/* Images Grid */}
                      {images.length > 0 && (
                        <div className="grid grid-cols-2 gap-4">
                          {images.map((image, index) => (
                            <div key={index} className="space-y-2">
                              <div className="relative border rounded-lg overflow-hidden group">
                                <img
                                  src={image.preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-40 object-cover"
                                />
                                {index === 0 ? (
                                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                                    {t('main')}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Move this image to the first position (set as main)
                                      const newImages = [...images];
                                      const [movedImage] = newImages.splice(index, 1);
                                      newImages.unshift(movedImage);
                                      setImages(newImages);
                                    }}
                                    className="absolute top-2 left-2 bg-gray-800/80 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    {t('setAsMain')}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    URL.revokeObjectURL(image.preview);
                                    setImages(images.filter((_, i) => i !== index));
                                  }}
                                  className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <Input
                                placeholder={t('captionPlaceholder')}
                                value={image.caption}
                                onChange={(e) => {
                                  const newImages = [...images];
                                  newImages[index].caption = e.target.value;
                                  setImages(newImages);
                                }}
                                className="text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* YouTube Video Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-24">
                      {/* Left: Inputs + Preview */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('youtubeVideo')}
                          </label>
                          <Input
                            placeholder={t('youtubeVideoPlaceholder')}
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                          />
                        </div>

                        

                        {youtubeUrl && (
                          <div className="aspect-video w-full rounded-lg overflow-hidden border">
                            <iframe
                              src={`https://www.youtube.com/embed/${youtubeUrl}${youtubeStartTime > 0 ? `?start=${youtubeStartTime}` : ''}`}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        {youtubeUrl && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('youtubeStartTime')}
                            </label>
                            <Input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={youtubeStartTime || ''}
                              onChange={(e) => setYoutubeStartTime(parseInt(e.target.value) || 0)}
                              className="w-32"
                            />
                          </div>
                        )}
                      </div>

                  
                    </div>
                  </div>
                )}

                {/* Step 3: Attributes */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-6">
                      <FormField
                        control={form.control}
                        name="inventory_quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              {t('inventoryQuantity')}
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs whitespace-pre-line">
                                    <p>{t('unlimitedInventoryTooltip')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </FormLabel>
                            <FormControl>
                              {unlimitedInventory ? (
                                <div className="w-48 h-9 px-3 py-2 rounded-md border border-input bg-gray-50 text-gray-500 flex items-center">
                                  {t('unlimitedInventory')}
                                </div>
                              ) : (
                                <Input
                                  type="number"
                                  min="0"
                                  className="w-48"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              )}
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="unlimited_inventory"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center gap-2 space-y-0 pt-8">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0 cursor-pointer">
                              {t('unlimitedInventory')}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">{t('parametersTitle')}</h3>

                      {attachedParameters.length === 0 ? (
                        // No parameters attached - show examples
                        <div className="space-y-6">
                          <p className="text-gray-600 font-medium">{t('noParametersYet')}</p>

                          {/* Examples */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Example 1: Kayak Rental */}
                            <div className="border rounded-lg p-4 bg-white">
                              <span className="inline-block px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded mb-3">
                                {t('parametersExample')}
                              </span>
                              <h4 className="font-semibold text-gray-800 mb-2">{t('kayakRental')}</h4>
                              <p className="text-sm text-gray-600">
                                {t('parametersLabel')} <span className="italic">Adult, Kid and/or Qty</span>
                              </p>
                            </div>

                            {/* Example 2: Bus Tour */}
                            <div className="border rounded-lg p-4 bg-white">
                              <span className="inline-block px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded mb-3">
                                {t('parametersExample')}
                              </span>
                              <h4 className="font-semibold text-gray-800 mb-2">{t('busTour')}</h4>
                              <p className="text-sm text-gray-600">
                                {t('parametersLabel')} <span className="italic">Adult, Child</span>
                              </p>
                            </div>

                            {/* Example 3: Cabin/Hotel Room */}
                            <div className="border rounded-lg p-4 bg-white">
                              <span className="inline-block px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded mb-3">
                                {t('parametersExample')}
                              </span>
                              <h4 className="font-semibold text-gray-800 mb-2">{t('cabinHotelRoom')}</h4>
                              <p className="text-sm text-gray-600">
                                {t('parametersLabel')} <span className="italic">Room, People</span>
                              </p>
                            </div>
                          </div>

                          <p className="text-gray-700">
                            <span className="font-semibold">Ghi chú:</span> {t('parametersNote')}
                          </p>
                        </div>
                      ) : (
                        // Parameters attached - show table
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('table.name')}</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('table.inventory')}</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('table.visibility')}</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('minMaxPerBooking')}</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('detailsColumn')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Controls Inventory Section */}
                              <tr className="border-b bg-white">
                                <td className="px-4 py-3 font-semibold text-gray-900" colSpan={5}>
                                  {t('controlsInventoryLabel')}
                                </td>
                              </tr>
                              {attachedParameters.filter(p => p.inventory === 'Controlled').map((param) => (
                                <tr key={param.id} className="border-b last:border-0 bg-white">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: param.color_code }}
                                      />
                                      <span className="text-sm">{param.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {param.inventory === 'Controlled' ? t('table.controlled') : ''}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {param.visibility === 'hidden' ? t('table.hidden') : t('table.everyone')}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        className="w-16 h-8 text-center"
                                        value={param.min_max.min}
                                        onChange={(e) => {
                                          const newParams = attachedParameters.map(p =>
                                            p.id === param.id
                                              ? { ...p, min_max: { ...p.min_max, min: parseInt(e.target.value) || 0 } }
                                              : p
                                          );
                                          setAttachedParameters(newParams);
                                        }}
                                      />
                                      <span>/</span>
                                      <Input
                                        type="number"
                                        className="w-16 h-8 text-center"
                                        value={param.min_max.max}
                                        onChange={(e) => {
                                          const newParams = attachedParameters.map(p =>
                                            p.id === param.id
                                              ? { ...p, min_max: { ...p.min_max, max: parseInt(e.target.value) || 0 } }
                                              : p
                                          );
                                          setAttachedParameters(newParams);
                                        }}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={async () => {
                                          // Fetch full parameter data from API
                                          try {
                                            const response = await fetch(`/api/admin/glamping/parameters/${param.id}`);
                                            if (response.ok) {
                                              const result = await response.json();
                                              setEditingParameter(result.parameter);
                                              setShowCreateParameterModal(true);
                                            } else {
                                              toast({
                                                title: tc("error"),
                                                description: "Failed to load parameter details",
                                                variant: "destructive",
                                              });
                                            }
                                          } catch (error) {
                                            toast({
                                              title: tc("error"),
                                              description: "Failed to load parameter",
                                              variant: "destructive",
                                            });
                                          }
                                        }}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setAttachedParameters(attachedParameters.filter(p => p.id !== param.id));
                                          toast({
                                            title: tc("success"),
                                            description: t('parameterRemoved'),
                                          });
                                        }}
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}

                              {/* Doesn't Control Inventory Section */}
                              <tr className="border-b bg-white">
                                <td className="px-4 py-3 font-semibold text-gray-900" colSpan={5}>
                                  {t('doesntControlInventory')}
                                </td>
                              </tr>
                              {attachedParameters.filter(p => p.inventory === 'Unlimited').map((param) => (
                                <tr key={param.id} className="border-b last:border-0 bg-white">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: param.color_code }}
                                      />
                                      <span className="text-sm">{param.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {param.inventory === 'Controlled' ? t('table.controlled') : ''}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {param.visibility === 'hidden' ? t('table.hidden') : t('table.everyone')}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        className="w-16 h-8 text-center"
                                        value={param.min_max.min}
                                        onChange={(e) => {
                                          const newParams = attachedParameters.map(p =>
                                            p.id === param.id
                                              ? { ...p, min_max: { ...p.min_max, min: parseInt(e.target.value) || 0 } }
                                              : p
                                          );
                                          setAttachedParameters(newParams);
                                        }}
                                      />
                                      <span>/</span>
                                      <Input
                                        type="number"
                                        className="w-16 h-8 text-center"
                                        value={param.min_max.max}
                                        onChange={(e) => {
                                          const newParams = attachedParameters.map(p =>
                                            p.id === param.id
                                              ? { ...p, min_max: { ...p.min_max, max: parseInt(e.target.value) || 0 } }
                                              : p
                                          );
                                          setAttachedParameters(newParams);
                                        }}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={async () => {
                                          // Fetch full parameter data from API
                                          try {
                                            const response = await fetch(`/api/admin/glamping/parameters/${param.id}`);
                                            if (response.ok) {
                                              const result = await response.json();
                                              setEditingParameter(result.parameter);
                                              setShowCreateParameterModal(true);
                                            } else {
                                              toast({
                                                title: tc("error"),
                                                description: "Failed to load parameter details",
                                                variant: "destructive",
                                              });
                                            }
                                          } catch (error) {
                                            toast({
                                              title: tc("error"),
                                              description: "Failed to load parameter",
                                              variant: "destructive",
                                            });
                                          }
                                        }}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setAttachedParameters(attachedParameters.filter(p => p.id !== param.id));
                                          toast({
                                            title: tc("success"),
                                            description: t('parameterRemoved'),
                                          });
                                        }}
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-4 flex gap-2">
                        <Button
                          type="button"
                          onClick={() => setShowCreateParameterModal(true)}
                        >
                          + {t('createParameter')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAttachParameterModal(true)}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          {t('attachParameter')}
                        </Button>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="allocation_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('allocationType')}</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-4 gap-4">
                              {/* per Day */}
                              <button
                                type="button"
                                onClick={() => field.onChange('per_day')}
                                className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg transition-colors ${
                                  field.value === 'per_day'
                                    ? 'border-primary bg-white'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <Sun className="w-12 h-12 text-gray-600 mb-3" />
                                <div className="text-base font-semibold text-gray-700 mb-2">
                                  {t('allocationPerDay')}
                                </div>
                                <div className="text-xs text-gray-500 text-center">
                                  {t('allocationPerDayDesc')}
                                </div>
                              </button>

                              {/* per Night */}
                              <button
                                type="button"
                                onClick={() => field.onChange('per_night')}
                                className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg transition-colors ${
                                  field.value === 'per_night'
                                    ? 'border-primary bg-white'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <Moon className="w-12 h-12 text-gray-600 mb-3" />
                                <div className="text-base font-semibold text-gray-700 mb-2">
                                  {t('allocationPerNight')}
                                </div>
                                <div className="text-xs text-gray-500 text-center">
                                  {t('allocationPerNightDesc')}
                                </div>
                              </button>

                              {/* per Time */}
                              <button
                                type="button"
                                onClick={() => field.onChange('per_hour')}
                                className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg transition-colors ${
                                  field.value === 'per_hour'
                                    ? 'border-primary bg-white'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <Clock className="w-12 h-12 text-gray-600 mb-3" />
                                <div className="text-base font-semibold text-gray-700 mb-2">
                                  {field.value === 'per_hour' ? getAllocationTimeLabel() : t('allocationPerTime')}
                                </div>
                                <div className="text-xs text-gray-500 text-center">
                                  {t('allocationPerTimeDesc')}
                                </div>
                              </button>

                              {/* Timeslots */}
                              <button
                                type="button"
                                onClick={() => field.onChange('timeslots')}
                                className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg transition-colors ${
                                  field.value === 'timeslots'
                                    ? 'border-primary bg-white'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <Calendar className="w-12 h-12 text-gray-600 mb-3" />
                                <div className="text-base font-semibold text-gray-700 mb-2">
                                  {t('allocationTimeslots')}
                                </div>
                                <div className="text-xs text-gray-500 text-center">
                                  {t('allocationTimeslotsDesc')}
                                </div>
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />

                          {/* Conditional fields based on allocation type */}
                          {field.value === 'per_day' && (
                            <div className="mt-4">
                              <FormField
                                control={form.control}
                                name="fixed_length_value"
                                render={({ field: fixedField }) => (
                                  <FormItem>
                                    <FormLabel>{t('fixedLengthDays')}</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...fixedField}
                                        type="number"
                                        placeholder="Eg. 2"
                                        className="mt-2"
                                        value={fixedField.value || ''}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value) || undefined;
                                          fixedField.onChange(value);
                                          form.setValue('fixed_length_unit', 'days');
                                        }}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}

                          {field.value === 'per_night' && (
                            <div className="mt-4">
                              <FormField
                                control={form.control}
                                name="fixed_length_value"
                                render={({ field: fixedField }) => (
                                  <FormItem>
                                    <FormLabel>{t('fixedLengthNights')}</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...fixedField}
                                        type="number"
                                        placeholder="Eg. 2"
                                        className="mt-2"
                                        value={fixedField.value || ''}
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value) || undefined;
                                          fixedField.onChange(value);
                                          form.setValue('fixed_length_unit', 'nights');
                                        }}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}

                          {field.value === 'per_hour' && (
                            <div className="mt-4 space-y-4">
                              {/* Time interval selector */}
                              <div className="grid grid-cols-5 gap-2">
                                {['10', '15', '20', '30', '60'].map((interval) => (
                                  <button
                                    key={interval}
                                    type="button"
                                    onClick={() => setTimeInterval(interval)}
                                    className={`py-3 text-sm font-medium border rounded transition-colors ${
                                      timeInterval === interval
                                        ? 'border-primary bg-white text-gray-900'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                                  >
                                    {interval === '60' ? 'Hour' : `${interval} Mins`}
                                  </button>
                                ))}
                              </div>

                              {/* Three inputs */}
                              <div className="grid grid-cols-3 gap-4">
                                <FormField
                                  control={form.control}
                                  name="fixed_start_time"
                                  render={({ field: timeField }) => (
                                    <FormItem>
                                      <div className="relative" ref={timePickerRef}>
                                        <FormLabel>{t('fixedStartTime')}</FormLabel>
                                        <FormControl>
                                          <Input
                                            {...timeField}
                                            placeholder="Eg. 8:00 AM"
                                            className="mt-2"
                                            value={timeField.value || fixedStartTime}
                                            onClick={() => setShowTimePicker(!showTimePicker)}
                                            readOnly
                                          />
                                        </FormControl>
                                        {showTimePicker && (
                                          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {timeOptions.map((time) => (
                                              <div
                                                key={time}
                                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900"
                                                onClick={() => {
                                                  timeField.onChange(time);
                                                  setFixedStartTime(time);
                                                  setShowTimePicker(false);
                                                }}
                                              >
                                                {time}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="default_length_hours"
                                  render={({ field: lengthField }) => (
                                    <FormItem>
                                      <FormLabel>{t('defaultLength')} (x {timeInterval} minutes)</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...lengthField}
                                          type="number"
                                          placeholder="Eg. 1"
                                          className="mt-2"
                                          value={lengthField.value || ''}
                                          onChange={(e) => lengthField.onChange(parseInt(e.target.value) || undefined)}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="fixed_length_value"
                                  render={({ field: fixedField }) => (
                                    <FormItem>
                                      <FormLabel>{t('fixedLength')} (x {timeInterval} minutes)</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...fixedField}
                                          type="number"
                                          placeholder="Eg. 2"
                                          className="mt-2"
                                          value={fixedField.value || ''}
                                          onChange={(e) => {
                                            const value = parseInt(e.target.value) || undefined;
                                            fixedField.onChange(value);
                                            form.setValue('fixed_length_unit', 'hours');
                                          }}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          )}

                          {field.value === 'timeslots' && (
                            <div className="mt-4 space-y-4">
                              <Label className="text-base font-semibold">{t('timeslotSetup')}</Label>

                              {/* Timeslot table */}
                              <div className="space-y-2">
                                <div className="grid grid-cols-[1fr,1fr,1fr,auto] gap-4 text-sm font-medium text-gray-600">
                                  <div>{t('startTime')}</div>
                                  <div>{t('endTime')}</div>
                                  <div>{t('dayOfWeek')}</div>
                                  <div>{t('remove')}</div>
                                </div>

                                {timeslots.map((slot, index) => (
                                  <div key={index} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-4">
                                    {/* Start Time Picker */}
                                    <div className="relative">
                                      <Input
                                        placeholder={t('enterStartTime')}
                                        value={slot.startTime}
                                        onClick={() => {
                                          const newSlots = [...timeslots];
                                          newSlots[index].showStartPicker = !newSlots[index].showStartPicker;
                                          newSlots[index].showEndPicker = false;
                                          newSlots[index].showDayPicker = false;
                                          setTimeslots(newSlots);
                                        }}
                                        readOnly
                                        className="cursor-pointer"
                                      />
                                      {slot.showStartPicker && (
                                        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                          {generateTimeslotStartTimes().map((time) => (
                                            <div
                                              key={time}
                                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                              onClick={() => {
                                                const newSlots = [...timeslots];
                                                newSlots[index].startTime = time;
                                                newSlots[index].endTime = ''; // Reset end time
                                                newSlots[index].showStartPicker = false;
                                                setTimeslots(newSlots);
                                              }}
                                            >
                                              {time}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* End Time Picker */}
                                    <div className="relative">
                                      <Input
                                        placeholder={t('enterEndTime')}
                                        value={slot.endTime}
                                        onClick={() => {
                                          if (!slot.startTime) return;
                                          const newSlots = [...timeslots];
                                          newSlots[index].showEndPicker = !newSlots[index].showEndPicker;
                                          newSlots[index].showStartPicker = false;
                                          newSlots[index].showDayPicker = false;
                                          setTimeslots(newSlots);
                                        }}
                                        readOnly
                                        className="cursor-pointer"
                                        disabled={!slot.startTime}
                                      />
                                      {slot.showEndPicker && slot.startTime && (
                                        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                          {generateEndTimeOptions(slot.startTime).map((option) => (
                                            <div
                                              key={option.time}
                                              className={`px-4 py-2 hover:bg-blue-500 hover:text-white cursor-pointer ${
                                                slot.endTime === option.time ? 'bg-blue-500 text-white' : ''
                                              }`}
                                              onClick={() => {
                                                const newSlots = [...timeslots];
                                                newSlots[index].endTime = option.time;
                                                newSlots[index].showEndPicker = false;
                                                setTimeslots(newSlots);
                                              }}
                                            >
                                              {option.time} ({option.duration} hrs)
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Day of Week Multi-Select */}
                                    <div className="relative">
                                      <Input
                                        value={formatSelectedDays(slot.selectedDays)}
                                        onClick={() => {
                                          const newSlots = [...timeslots];
                                          newSlots[index].showDayPicker = !newSlots[index].showDayPicker;
                                          newSlots[index].showStartPicker = false;
                                          newSlots[index].showEndPicker = false;
                                          setTimeslots(newSlots);
                                        }}
                                        readOnly
                                        className="cursor-pointer"
                                      />
                                      {slot.showDayPicker && (
                                        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg p-2">
                                          {[
                                            {key: 'monday', label: t('monday')},
                                            {key: 'tuesday', label: t('tuesday')},
                                            {key: 'wednesday', label: t('wednesday')},
                                            {key: 'thursday', label: t('thursday')},
                                            {key: 'friday', label: t('friday')},
                                            {key: 'saturday', label: t('saturday')},
                                            {key: 'sunday', label: t('sunday')}
                                          ].map((day) => (
                                            <div
                                              key={day.key}
                                              className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                              onClick={() => {
                                                const newSlots = [...timeslots];
                                                const currentDays = newSlots[index].selectedDays;
                                                if (currentDays.includes(day.key)) {
                                                  newSlots[index].selectedDays = currentDays.filter(d => d !== day.key);
                                                } else {
                                                  newSlots[index].selectedDays = [...currentDays, day.key];
                                                }
                                                setTimeslots(newSlots);
                                              }}
                                            >
                                              <span>{day.label}</span>
                                              {slot.selectedDays.includes(day.key) && (
                                                <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                                                  <Check className="w-3 h-3 text-white" />
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        if (timeslots.length > 1) {
                                          setTimeslots(timeslots.filter((_, i) => i !== index));
                                        }
                                      }}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setTimeslots([...timeslots, {
                                    startTime: '',
                                    endTime: '',
                                    selectedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                                  }]);
                                }}
                                className="w-auto"
                              >
                                {t('addTimeslot')}
                              </Button>
                            </div>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="visibility"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-4">
                            <FormLabel className="mb-0">{t('visibilityLabel')}</FormLabel>
                            <FormControl>
                              <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => field.onChange('everyone')}
                                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                                    field.value === 'everyone'
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-white text-gray-700 hover:bg-gray-50'
                                  } border-r border-gray-300`}
                                >
                                  {t('everyone')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => field.onChange('staff_only')}
                                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                                    field.value === 'staff_only'
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-white text-gray-700 hover:bg-gray-50'
                                  } border-r border-gray-300`}
                                >
                                  {t('staffOnly')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => field.onChange('packages_only')}
                                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                                    field.value === 'packages_only'
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-white text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  {t('packagesOnly')}
                                </button>
                              </div>
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 4: Pricing */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold mb-4">{t('pricing.title')}</h2>

                      {/* Pricing Type Toggle */}
                      <div className="inline-flex rounded-md shadow-sm mb-6" role="group">
                        {/* Always show per_booking option */}
                        <Button
                          type="button"
                          variant={pricingRate === 'per_booking' ? 'default' : 'outline'}
                          onClick={() => setPricingRate('per_booking')}
                          className="rounded-r-none"
                        >
                          {t('pricing.perBookingBtn')}
                        </Button>

                        {/* Show button based on allocation type */}
                        {allocationType === 'per_hour' && (
                          <Button
                            type="button"
                            variant={pricingRate === 'per_hour' ? 'default' : 'outline'}
                            onClick={() => setPricingRate('per_hour')}
                            className="rounded-l-none border-l-0"
                          >
                            {t('pricing.perHourBtn')}
                          </Button>
                        )}
                        {allocationType === 'per_day' && (
                          <Button
                            type="button"
                            variant={pricingRate === 'per_day' ? 'default' : 'outline'}
                            onClick={() => setPricingRate('per_day')}
                            className="rounded-l-none border-l-0"
                          >
                            {t('pricing.perDayBtn')}
                          </Button>
                        )}
                        {allocationType === 'per_night' && (
                          <Button
                            type="button"
                            variant={pricingRate === 'per_night' ? 'default' : 'outline'}
                            onClick={() => setPricingRate('per_night')}
                            className="rounded-l-none border-l-0"
                          >
                            {t('pricing.perNightBtn')}
                          </Button>
                        )}
                        {allocationType === 'timeslots' && timeslots.length > 0 && timeslots.map((slot, index) => (
                          <Button
                            key={index}
                            type="button"
                            variant={pricingRate === `timeslot_${index}` ? 'default' : 'outline'}
                            onClick={() => setPricingRate(`timeslot_${index}`)}
                            className="rounded-l-none border-l-0"
                          >
                            {slot.startTime && slot.endTime ? `${slot.startTime} - ${slot.endTime}` : t('pricing.perTimeslotBtn')}
                          </Button>
                        ))}
                      </div>

                      {/* Base Price Table */}
                      <div className="border rounded-lg overflow-hidden bg-white">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium">{t('table.parameter')}</th>
                              <th className="px-4 py-2 text-left text-xs font-medium">{t('table.amount')}</th>
                              <th className="px-4 py-2 text-left text-xs font-medium">{t('table.rate')}</th>
                              <th className="px-4 py-2 text-left text-xs font-medium">{t('table.groupPricing')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Parameter Rows */}
                            {attachedParameters.map((param) => (
                              <Fragment key={param.id}>
                                <tr className="border-l-4" style={{ borderLeftColor: param.color_code }}>
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-2 text-sm">
                                      <div
                                        className="w-3 h-3 rounded"
                                        style={{ backgroundColor: param.color_code }}
                                      ></div>
                                      {param.name}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <CurrencyInput
                                      value={parameterBasePrices[param.id] || 0}
                                      onValueChange={(value) => {
                                        setParameterBasePrices({
                                          ...parameterBasePrices,
                                          [param.id]: value || 0
                                        });
                                      }}
                                      className="w-32 text-sm"
                                    />
                                  </td>
                                  <td className="px-4 py-2 text-xs text-gray-600">
                                    {t('pricing.perParameter', { rate: pricingRate, param: param.name })}
                                  </td>
                                  <td className="px-4 py-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const existingGroups = groupPricing[param.id] || [];
                                        let newMin = param.min_max.min;
                                        let newMax = param.min_max.min;

                                        if (existingGroups.length > 0) {
                                          // Get the max value from the last group and add 1
                                          const lastGroup = existingGroups[existingGroups.length - 1];
                                          newMin = (lastGroup.max || 0) + 1;
                                          newMax = newMin;
                                        }

                                        setGroupPricing({
                                          ...groupPricing,
                                          [param.id]: [...existingGroups, { min: newMin, max: newMax, price: 0 }]
                                        });
                                      }}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                      </svg>
                                    </Button>
                                  </td>
                                </tr>

                                {/* Group Pricing Rows for this Parameter */}
                                {groupPricing[param.id]?.map((group, index) => (
                                  <tr key={`${param.id}-group-${index}`} className="bg-gray-50">
                                    <td className="px-4 py-2 pl-8">
                                      <div className="flex items-center gap-2 text-sm">
                                        <div className="w-3 h-3 rounded" style={{ backgroundColor: param.color_code }}></div>
                                        <span className="text-xs text-gray-600">Group</span>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={group.min}
                                          onChange={(e) => {
                                            const newGroups = [...(groupPricing[param.id] || [])];
                                            newGroups[index].min = parseInt(e.target.value) || 1;
                                            setGroupPricing({ ...groupPricing, [param.id]: newGroups });
                                          }}
                                          className="w-16 h-7 text-center text-sm"
                                        />
                                        <span className="text-xs text-gray-600">to</span>
                                        <Input
                                          type="number"
                                          min={group.min || 1}
                                          value={group.max}
                                          onChange={(e) => {
                                            const newGroups = [...(groupPricing[param.id] || [])];
                                            newGroups[index].max = parseInt(e.target.value) || group.min || 1;
                                            setGroupPricing({ ...groupPricing, [param.id]: newGroups });
                                          }}
                                          className="w-16 h-7 text-center text-sm"
                                        />
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">
                                      <CurrencyInput
                                        value={group.price}
                                        onValueChange={(value) => {
                                          const newGroups = [...(groupPricing[param.id] || [])];
                                          newGroups[index].price = value || 0;
                                          setGroupPricing({ ...groupPricing, [param.id]: newGroups });
                                        }}
                                        className="w-32 text-sm"
                                      />
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-600">
                                      {t('pricing.perGroup', { rate: pricingRate })}
                                    </td>
                                    <td className="px-4 py-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const newGroups = (groupPricing[param.id] || []).filter((_, i) => i !== index);
                                          if (newGroups.length === 0) {
                                            const { [param.id]: _, ...rest } = groupPricing;
                                            setGroupPricing(rest);
                                          } else {
                                            setGroupPricing({ ...groupPricing, [param.id]: newGroups });
                                          }
                                        }}
                                        className="text-red-600"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Default Calendar Status */}
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4">{t('calendarStatus.title')}</h3>

                      <div className="grid grid-cols-3 gap-4">
                        {/* Available */}
                        <div
                          className={`border rounded-lg p-4 cursor-pointer ${
                            calendarStatus === 'available' ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white'
                          }`}
                          onClick={() => setCalendarStatus('available')}
                        >
                          <div className="flex flex-col items-center text-center">
                            <svg className="w-12 h-12 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h4 className="font-medium mb-1">{t('available')}</h4>
                            <p className="text-xs text-gray-600">
                              {t('calendarStatus.availableDesc')}
                            </p>
                          </div>
                        </div>

                        {/* Unavailable */}
                        <div
                          className={`border rounded-lg p-4 cursor-pointer ${
                            calendarStatus === 'unavailable' ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white'
                          }`}
                          onClick={() => setCalendarStatus('unavailable')}
                        >
                          <div className="flex flex-col items-center text-center">
                            <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <h4 className="font-medium mb-1">{t('unavailable')}</h4>
                            <p className="text-xs text-gray-600">
                              {t('calendarStatus.unavailableDesc')}
                            </p>
                          </div>
                        </div>

                        {/* Disabled */}
                        <div
                          className={`border rounded-lg p-4 cursor-pointer ${
                            calendarStatus === 'disabled' ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white'
                          }`}
                          onClick={() => setCalendarStatus('disabled')}
                        >
                          <div className="flex flex-col items-center text-center">
                            <svg className="w-12 h-12 text-red-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <h4 className="font-medium mb-1">{t('disabled')}</h4>
                            <p className="text-xs text-gray-600">
                              {t('calendarStatus.disabledDesc')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Item Events Table */}
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4">{t('itemEvents.title')}</h3>

                      <div className="border rounded-lg overflow-hidden bg-white">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-medium">{t('table.name')}</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">{t('table.startDate')}</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">{t('table.endDate')}</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">{t('table.days')}</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">{t('table.type')}</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">{t('table.pricePoint')}</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">{t('table.actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attachedEvents.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="text-center text-gray-500 py-8 text-sm">
                                  {t('itemEvents.noEvents')}
                                </td>
                              </tr>
                            ) : (
                              attachedEvents.map((event) => (
                                <tr key={event.id} className="border-t hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm">{event.name}</td>
                                  <td className="px-4 py-3 text-sm">{formatEventDate(event.start_date)}</td>
                                  <td className="px-4 py-3 text-sm">{formatEventDate(event.end_date)}</td>
                                  <td className="px-4 py-3 text-sm">
                                    {event.days_of_week && event.days_of_week.length > 0
                                      ? formatDaysOfWeek(event.days_of_week)
                                      : t('itemEvents.allDays')}
                                  </td>
                                  <td className="px-4 py-3">
                                    {event.type === 'seasonal' && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                        <Sun className="w-3 h-3 mr-1" />
                                        {t('itemEvents.types.seasonal')}
                                      </span>
                                    )}
                                    {event.type === 'special_pricing' && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {t('itemEvents.types.specialPricing')}
                                      </span>
                                    )}
                                    {event.type === 'closure_dates' && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        <X className="w-3 h-3 mr-1" />
                                        {t('itemEvents.types.closureDates')}
                                      </span>
                                    )}
                                    {event.type === 'exclusive_date_span' && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {t('itemEvents.types.exclusiveDateSpan')}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm">{event.pricing_type || '-'}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditEvent(event.id)}
                                      >
                                        {t('itemEvents.edit')}
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDetachEvent(event.id)}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <DropdownMenu open={showCreateEventDropdown} onOpenChange={setShowCreateEventDropdown}>
                          <DropdownMenuTrigger asChild>
                            <Button type="button">
                              {t('itemEvents.createNew')}
                              <ChevronDown className="w-4 h-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-80">
                            <DropdownMenuItem onClick={() => handleEventTypeSelect('seasonal')}>
                              <Sun className="w-4 h-4 mr-2 text-orange-500" />
                              <div>
                                <div className="font-medium">{t('itemEvents.types.seasonal')}</div>
                                <div className="text-xs text-gray-500">{t('itemEvents.types.seasonalDesc')}</div>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEventTypeSelect('special_pricing')}>
                              <Calendar className="w-4 h-4 mr-2 text-primary" />
                              <div>
                                <div className="font-medium">{t('itemEvents.types.specialPricing')}</div>
                                <div className="text-xs text-gray-500">{t('itemEvents.types.specialPricingDesc')}</div>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEventTypeSelect('closure_dates')}>
                              <X className="w-4 h-4 mr-2 text-red-500" />
                              <div>
                                <div className="font-medium">{t('itemEvents.types.closureDates')}</div>
                                <div className="text-xs text-gray-500">{t('itemEvents.types.closureDatesDesc')}</div>
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button type="button" variant="outline" onClick={handleAttachExisting}>
                          <Paperclip className="w-4 h-4 mr-2" />
                          {t('itemEvents.attachExisting')}
                        </Button>
                      </div>
                    </div>

                    {/* Pricing Table */}
                    <PricingTable
                      parameters={parameters}
                      groupPricing={groupPricing}
                      basePrices={parameterBasePrices}
                      inventoryBasePrice={0}
                      events={attachedEvents}
                      eventPricing={eventPricing}
                      onEventPricingChange={(eventId, data) => {
                        setEventPricing(prev => ({ ...prev, [eventId]: data }));
                      }}
                      pricingRate={pricingRate}
                    />

                    {/* Taxes & Deposit */}
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4">{t('taxes.title')}</h3>

                      {/* Tax Management Component */}
                      <TaxManagement allItems={[]} taxes={taxes} setTaxes={setTaxes} />

                      {/* Deposit */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('taxes.depositLabel')}
                        </label>
                        <Select value={depositType} onValueChange={setDepositType}>
                          <SelectTrigger className="w-80">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system_default">
                              {zoneSettings
                                ? `${t('taxes.depositOptions.systemDefault')} (${
                                    zoneSettings.deposit_type === 'percentage'
                                      ? `${zoneSettings.deposit_value}%`
                                      : formatCurrency(zoneSettings.deposit_value)
                                  })`
                                : t('taxes.depositOptions.systemDefault')}
                            </SelectItem>
                            <SelectItem value="custom_percentage">
                              {t('taxes.depositOptions.customPercentage')}
                            </SelectItem>
                            <SelectItem value="fixed_amount">
                              {t('taxes.depositOptions.fixedAmount')}
                            </SelectItem>
                            <SelectItem value="per_hour">
                              {t('taxes.depositOptions.perHour')}
                            </SelectItem>
                            <SelectItem value="per_qty">
                              {t('taxes.depositOptions.perQty')}
                            </SelectItem>
                            <SelectItem value="no_deposit">
                              {t('taxes.depositOptions.noDeposit')}
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {depositType === 'custom_percentage' && (
                          <div className="mt-3">
                            <label className="block text-sm text-gray-600 mb-1">{t('taxes.percentageLabel')}</label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={depositValue}
                                onChange={(e) => setDepositValue(parseInt(e.target.value) || 0)}
                                className="w-32"
                              />
                              <span className="text-sm">%</span>
                            </div>
                          </div>
                        )}

                        {depositType === 'fixed_amount' && (
                          <div className="mt-3">
                            <label className="block text-sm text-gray-600 mb-1">{t('taxes.amountLabel')}</label>
                            <CurrencyInput
                              value={depositValue}
                              onValueChange={(value) => setDepositValue(value || 0)}
                              className="w-64"
                            />
                          </div>
                        )}

                        {depositType === 'per_hour' && (
                          <div className="mt-3">
                            <label className="block text-sm text-gray-600 mb-1">Amount per hour</label>
                            <CurrencyInput
                              value={depositValue}
                              onValueChange={(value) => setDepositValue(value || 0)}
                              className="w-64"
                            />
                          </div>
                        )}

                        {depositType === 'per_qty' && (
                          <div className="mt-3">
                            <label className="block text-sm text-gray-600 mb-1">Amount per quantity</label>
                            <CurrencyInput
                              value={depositValue}
                              onValueChange={(value) => setDepositValue(value || 0)}
                              className="w-64"
                            />
                          </div>
                        )}

                        <p className="text-sm text-muted-foreground mt-2">
                          {t('taxes.depositHint')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Menu Products */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    {/* Menu Products Section (Food/Beverages) */}
                    <div className="border-t pt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-4">
                        {t('menuProducts.title')}
                      </label>

                      {menuProducts.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.name')}</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.price')}</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.optIn')}</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.order')}</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('table.details')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {menuProducts.map((item, index) => (
                                <tr key={index} className="border-b last:border-0">
                                  <td className="px-4 py-3">
                                    {typeof item.menu_item_name === 'string'
                                      ? item.menu_item_name
                                      : (item.menu_item_name?.vi || item.menu_item_name?.en || '-')}
                                  </td>
                                  <td className="px-4 py-3">
                                    {item.menu_item_price ? new Intl.NumberFormat('vi-VN', {
                                      style: 'currency',
                                      currency: 'VND',
                                    }).format(item.menu_item_price) : '-'}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Select
                                      value={item.opt_in}
                                      onValueChange={(value: 'optional' | 'required') => {
                                        const newItems = [...menuProducts];
                                        newItems[index].opt_in = value;
                                        setMenuProducts(newItems);
                                      }}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="optional">{t('optional')}</SelectItem>
                                        <SelectItem value="required">{t('required')}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="px-4 py-3">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={item.display_order ?? index}
                                      onChange={(e) => {
                                        const newItems = [...menuProducts];
                                        newItems[index].display_order = parseInt(e.target.value) || 0;
                                        setMenuProducts(newItems);
                                      }}
                                      className="w-20"
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setMenuProducts(menuProducts.filter((_, i) => i !== index))}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      {t('remove')}
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                          <p className="text-gray-500">{t('noMenuProductsYet')}</p>
                          <p className="text-sm text-gray-400 mt-1">{t('clickToAttachMenuItem')}</p>
                        </div>
                      )}

                      {/* Attach Menu Item Button */}
                      <div className="mt-4">
                        <Button
                          type="button"
                          onClick={() => {
                            // Fetch available menu items when opening dialog (filtered by zone)
                            fetch(`/api/admin/glamping/menu?zone_id=${zoneId}`)
                              .then(res => res.json())
                              .then(data => {
                                setAvailableMenuItems(data.menuItems || []);
                                setShowMenuDialog(true);
                              })
                              .catch(err => {
                                toast({
                                  title: tc("error"),
                                  description: t("failedToLoadMenuItems"),
                                  variant: "destructive",
                                });
                              });
                          }}
                        >
                          <Paperclip className="w-4 h-4 mr-2" />
                          {t('attachMenuItem')}
                        </Button>
                      </div>
                    </div>

                    {/* Attach Menu Item Dialog */}
                    <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{t('menuProducts.dialogTitle')}</DialogTitle>
                          <DialogDescription>
                            {t('menuProducts.dialogDesc')}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="max-h-96 overflow-y-auto">
                          {availableMenuItems.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">{t('noMenuItemsAvailable')}</p>
                          ) : (
                            <div className="space-y-2">
                              {availableMenuItems.map((menuItem) => {
                                const isAttached = menuProducts.some(p => p.menu_item_id === menuItem.id);
                                return (
                                  <div
                                    key={menuItem.id}
                                    className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50"
                                  >
                                    <Checkbox
                                      checked={isAttached}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setMenuProducts([
                                            ...menuProducts,
                                            {
                                              menu_item_id: menuItem.id,
                                              menu_item_name: menuItem.name,
                                              menu_item_price: menuItem.price,
                                              menu_item_unit: menuItem.unit,
                                              opt_in: 'optional',
                                              display_order: menuProducts.length
                                            }
                                          ]);
                                        } else {
                                          setMenuProducts(menuProducts.filter(p => p.menu_item_id !== menuItem.id));
                                        }
                                      }}
                                    />
                                    <label className="text-sm cursor-pointer flex-1">
                                      {typeof menuItem.name === 'string'
                                        ? menuItem.name
                                        : (menuItem.name?.vi || menuItem.name?.en || '-')}
                                      {menuItem.price && (
                                        <span className="ml-2 text-xs text-gray-500">
                                          ({new Intl.NumberFormat('vi-VN', {
                                            style: 'currency',
                                            currency: 'VND',
                                          }).format(menuItem.price)})
                                        </span>
                                      )}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowMenuDialog(false)}
                          >
                            {tc('cancel')}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setShowMenuDialog(false)}
                          >
                            {t('done')}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>

              {/* Right: Help Text (1/3) */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-lg p-6 sticky top-6">
                  {currentStep === 2 && (
                    <>
                      <h3 className="font-semibold text-gray-900 mb-2">{t('sidebar.mediaTitle')}</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {t('sidebar.mediaDesc')}
                      </p>
                      <ul className="text-sm text-gray-600 mb-4 list-disc pl-4 space-y-1">
                        {t('sidebar.mediaPoints').split('\n').map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>

                      {/* Preview Placeholder */}
                      <div className="bg-gray-100 rounded-lg p-8 flex flex-col items-center justify-center" style={{ height: '200px' }}>
                        <ImageIcon className="w-16 h-16 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 text-center">{t('sidebar.mediaPreview')}</p>
                      </div>
                      <div className="bg-gray-200 text-center py-2 mt-2 rounded-b text-sm text-gray-600">
                        {t('sidebar.mediaCaptionHint')}
                      </div>

                      <div className="mt-6 pt-4 border-t">
                        <h3 className="font-semibold text-gray-900 mb-2">{t('sidebar.youtubeTitle')}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {t('sidebar.youtubeDesc')}
                        </p>
                        <p className="text-sm text-gray-500 italic">
                          {t('sidebar.youtubeHint')}
                        </p>
                      </div>
                    </>
                  )}

                  {currentStep === 1 && (
                    <>
                      <h3 className="font-semibold text-gray-900 mb-2">{t('sidebar.category')}</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {t('sidebar.categoryDesc')}
                      </p>
                      <p className="text-sm text-gray-500 italic mb-6">
                        {t('sidebar.categoryExamples')}
                      </p>

                      <h3 className="font-semibold text-gray-900 mb-2">{t('sidebar.tags')}</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {t('sidebar.tagsDesc')}
                      </p>
                      <p className="text-sm text-gray-500 italic mb-6">
                        {t('sidebar.tagsExamples')}
                      </p>

                      <h3 className="font-semibold text-gray-900 mb-2">{t('sidebar.itemName')}</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {t('sidebar.itemNameDesc')}
                      </p>
                      <p className="text-sm text-gray-500 italic mb-6">
                        {t('sidebar.itemNameExamples')}
                      </p>

                      <h3 className="font-semibold text-gray-900 mb-2">{t('sidebar.summaryTitle')}</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {t('sidebar.summaryDesc')}
                      </p>
                      <p className="text-sm text-gray-500 italic">
                        {t('sidebar.summaryExamples')}
                      </p>
                    </>
                  )}

                  {currentStep === 3 && (
                    <>
                      <h3 className="font-semibold text-gray-900 mb-2">{t('sidebar.inventoryTitle')}</h3>
                      <p className="text-sm text-gray-600 mb-6">
                        {t('sidebar.inventoryDesc')}
                      </p>
                      <p className="text-sm text-gray-500 italic mb-6">
                        {t('sidebar.inventoryExamples')}
                      </p>

                      <h3 className="font-semibold text-gray-900 mb-2">{t('sidebar.parametersTitle')}</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {t('sidebar.parametersDesc')}
                      </p>
                      <p className="text-sm text-gray-500 italic">
                        {t('sidebar.parametersExamples').split('\n').map((line, i) => (
                          <span key={i}>
                            {line}
                            {i < t('sidebar.parametersExamples').split('\n').length - 1 && <br />}
                          </span>
                        ))}
                      </p>
                    </>
                  )}

                  {currentStep === 5 && (
                    <>
                      <h3 className="font-semibold text-gray-900 mb-2">{t('sidebar.menuProductsTitle')}</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {t('sidebar.menuProductsDesc')}
                      </p>
                    </>
                  )}

                  {currentStep === 4 && (
                    <>
                      <h3 className="font-semibold text-gray-900 mb-2">{t('sidebar.groupPricingTitle')}</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {t('sidebar.groupPricingDesc')}
                      </p>

                      <div className="space-y-3 mb-6">
                        <div>
                          <p className="text-sm font-medium mb-1">{t('sidebar.pricedPerParameter')}</p>
                          <p className="text-xs text-gray-500">
                            {t('sidebar.pricedPerParameterExample')}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-1">{t('sidebar.pricedPerGroup')}</p>
                          <p className="text-xs text-gray-500">
                            {t('sidebar.pricedPerGroupExample')}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <h3 className="font-semibold text-gray-900 mb-3">{t('sidebar.itemEventsTitle')}</h3>

                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium mb-1">{t('sidebar.seasonalTitle')}</p>
                            <p className="text-xs text-gray-600">
                              {t('sidebar.seasonalDesc')}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {t('sidebar.seasonalExamples')}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-1">{t('sidebar.specialPricingTitle')}</p>
                            <p className="text-xs text-gray-600">
                              {t('sidebar.specialPricingDesc')}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {t('sidebar.specialPricingExamples')}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-1">{t('sidebar.closureDatesTitle')}</p>
                            <p className="text-xs text-gray-600">
                              {t('sidebar.closureDatesDesc')}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {t('sidebar.closureDatesExamples')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Navigation Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
            <div className="md:ml-[16rem] mx-auto px-6 py-3">
              <div className="flex items-center justify-between">
                

                {/* Step Navigation */}
                <div className="flex items-center gap-1">
                  {STEPS.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;
                    const isFuture = step.id > currentStep;

                    // Disable step navigation if in create mode and haven't created item yet (except for step 1)
                    const isDisabled = mode === 'create' && !createdItemId && step.id > 1;

                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => {
                          if (!isDisabled) {
                            setCurrentStep(step.id);
                          }
                        }}
                        disabled={isDisabled}
                        className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                          isDisabled
                            ? 'text-gray-400 cursor-not-allowed opacity-50'
                            : isCurrent
                            ? 'text-blue-600 font-medium'
                            : isCompleted
                            ? 'text-gray-900 font-medium'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          isDisabled
                            ? 'bg-gray-300'
                            : isCurrent
                            ? 'bg-primary'
                            : isCompleted
                            ? 'bg-green-600'
                            : 'bg-gray-400'
                        }`}></span>
                        {step.name}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  {/* STEP 1 IN CREATE MODE: Only "Tiếp theo" button */}
                  {currentStep === 1 && mode === 'create' && !createdItemId ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      size="sm"
                      disabled={loading}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      {loading ? tc('loading') : t('next')}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    /* STEPS 2+ OR EDIT MODE: Show all 3 buttons */
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        {t('preview')}
                      </Button>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        disabled={loading || uploadingImages}
                      >
                        {uploadingImages ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Đang tải hình ảnh lên...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-1" />
                            {loading ? tc('loading') : t('save')}
                          </>
                        )}
                      </Button>
                      {currentStep < STEPS.length && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleNext}
                          className="bg-primary hover:bg-primary/90 text-white"
                        >
                          {t('next')}
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </Form>

      {/* Create/Edit Parameter Modal */}
      <Dialog open={showCreateParameterModal} onOpenChange={(open) => {
        setShowCreateParameterModal(open);
        if (!open) setEditingParameter(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingParameter ? tp('editTitle') || 'Chỉnh sửa tham số' : tp('createTitle')}
            </DialogTitle>
            <DialogDescription>
              {editingParameter ? tp('editDescription') || 'Cập nhật thông tin tham số' : tp('createDescription')}
            </DialogDescription>
          </DialogHeader>
          <ParameterForm
            onSubmit={handleCreateParameter}
            onCancel={() => {
              setShowCreateParameterModal(false);
              setEditingParameter(null);
            }}
            loading={creatingParameter}
            showCard={false}
            isEditing={!!editingParameter}
            initialData={editingParameter ? {
              name: editingParameter.name,
              default_value: editingParameter.default_value,
              link_to_guests: editingParameter.link_to_guests,
              controls_inventory: editingParameter.controls_inventory,
              sets_pricing: editingParameter.sets_pricing,
              price_range: editingParameter.price_range,
              required: editingParameter.required,
              visibility: editingParameter.visibility as 'everyone' | 'staff' | 'hidden' | undefined,
            } : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Attach Parameter Modal */}
      <Dialog open={showAttachParameterModal} onOpenChange={setShowAttachParameterModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('attachParameterTitle')}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white border-b-2">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('parameterName')}</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">{t('controlsInventory')}</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">{t('setsPricing')}</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">{t('priceRange')}</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">{t('visibility')}</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((parameter) => {
                  const isAlreadyAttached = attachedParameters.find(ap => ap.id === parameter.id);
                  const isSelected = selectedParameterIds.includes(parameter.id);

                  return (
                    <tr
                      key={parameter.id}
                      className={`border-b hover:bg-gray-50 ${isAlreadyAttached ? 'opacity-40' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleParameterSelection(parameter.id)}
                            disabled={!!isAlreadyAttached}
                          />
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: parameter.color_code }}
                          />
                          <span className="font-medium">
                            {parameter.name}
                            {parameter.required && (
                              <span className="text-gray-500 ml-1">({t('required')})</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600">
                        {parameter.controls_inventory ? t('on') : t('off')}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600">
                        {parameter.sets_pricing ? t('on') : t('off')}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600">
                        {parameter.price_range ? t('on') : t('off')}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600">
                        {getVisibilityTranslation(parameter.visibility)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {parameters.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {t('noParametersAvailable')}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAttachParameterModal(false);
                setSelectedParameterIds([]);
              }}
            >
              {tc('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleAttachParameters}
              disabled={selectedParameterIds.length === 0}
            >
              {t('attach')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Event Modal */}
      <Dialog open={showCreateEventModal} onOpenChange={setShowCreateEventModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('itemEvents.createNewTitle')}</DialogTitle>
            <DialogDescription>
              {t('itemEvents.createNewDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Event Type Badge */}
            <div className="flex items-center gap-2 mb-6">
              {selectedEventType === 'seasonal' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                  <Sun className="w-4 h-4 mr-2" />
                  {t('itemEvents.types.seasonal')}
                </span>
              )}
              {selectedEventType === 'special_pricing' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/20 text-primary">
                  <Calendar className="w-4 h-4 mr-2" />
                  {t('itemEvents.types.specialPricing')}
                </span>
              )}
              {selectedEventType === 'closure_dates' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <X className="w-4 h-4 mr-2" />
                  {t('itemEvents.types.closureDates')}
                </span>
              )}
              {selectedEventType === 'exclusive_date_span' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  <Clock className="w-4 h-4 mr-2" />
                  {t('itemEvents.types.exclusiveDateSpan')}
                </span>
              )}
            </div>

            {/* Event Form Fields Component */}
            <EventFormFields
              formData={eventFormData}
              onChange={handleEventFieldChange}
              onDynamicPricingChange={handleDynamicPricingChange}
              onYieldThresholdsChange={handleYieldThresholdsChange}
              categories={eventCategories}
              selectedItems={selectedItemsForEvent}
              onSelectionChange={handleItemSelectionChange}
              onToggleItem={toggleItemForEvent}
              onToggleCategory={toggleCategoryForEvent}
              onSelectAll={handleSelectAllItemsForEvent}
              onSelectNone={handleSelectNoneItemsForEvent}
              hideTypeSelector={true}
              hideInventoryStatus={true}
              showItemSelector={true}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateEventModal(false);
                setEventFormData({
                  name: '',
                  type: 'seasonal',
                  start_date: '',
                  end_date: null,
                  recurrence: 'one_time',
                  days_of_week: [],
                  pricing_type: 'base_price',
                  status: 'available',
                  active: true,
                  applicable_times: 'all',
                  rules_id: null,
                  dynamic_pricing: {
                    value: 0,
                    mode: 'percent',
                  },
                  yield_thresholds: [
                    { stock: 0, rate_adjustment: 0 }
                  ],
                });
                setSelectedItemsForEvent([]);
              }}
            >
              {tc('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleCreateEvent}
              disabled={!eventFormData.name || !eventFormData.start_date}
            >
              {t('itemEvents.createAndAttach')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Modal */}
      <Dialog open={showEditEventModal} onOpenChange={setShowEditEventModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('itemEvents.editEventTitle')}</DialogTitle>
            <DialogDescription>
              {t('itemEvents.editEventDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Event Type Badge */}
            <div className="flex items-center gap-2 mb-6">
              {eventFormData.type === 'seasonal' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                  <Sun className="w-4 h-4 mr-2" />
                  {t('itemEvents.types.seasonal')}
                </span>
              )}
              {eventFormData.type === 'special' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  <Calendar className="w-4 h-4 mr-2" />
                  {t('itemEvents.types.special')}
                </span>
              )}
              {/* TODO: Add other event types if needed */}
              {/* {eventFormData.type === 'closure_dates' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <X className="w-4 h-4 mr-2" />
                  {t('itemEvents.types.closureDates')}
                </span>
              )}
              {eventFormData.type === 'exclusive_date_span' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  <Clock className="w-4 h-4 mr-2" />
                  {t('itemEvents.types.exclusiveDateSpan')}
                </span>
              )} */}
            </div>

            {/* Event Form Fields Component */}
            <EventFormFields
              formData={eventFormData}
              onChange={handleEventFieldChange}
              onDynamicPricingChange={handleDynamicPricingChange}
              onYieldThresholdsChange={handleYieldThresholdsChange}
              categories={eventCategories}
              selectedItems={selectedItemsForEvent}
              onSelectionChange={handleItemSelectionChange}
              onToggleItem={toggleItemForEvent}
              onToggleCategory={toggleCategoryForEvent}
              onSelectAll={handleSelectAllItemsForEvent}
              onSelectNone={handleSelectNoneItemsForEvent}
              hideTypeSelector={true}
              hideInventoryStatus={true}
              showItemSelector={true}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditEventModal(false);
                setEditingEventId(null);
                setEventFormData({
                  name: '',
                  type: 'seasonal',
                  start_date: '',
                  end_date: null,
                  recurrence: 'one_time',
                  days_of_week: [],
                  pricing_type: 'base_price',
                  status: 'available',
                  active: true,
                  applicable_times: 'all',
                  rules_id: null,
                  dynamic_pricing: {
                    value: 0,
                    mode: 'percent',
                  },
                  yield_thresholds: [
                    { stock: 0, rate_adjustment: 0 }
                  ],
                });
                setSelectedItemsForEvent([]);
              }}
            >
              {tc('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleUpdateEvent}
              disabled={!eventFormData.name || !eventFormData.start_date}
            >
              {t('itemEvents.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attach Existing Events Modal */}
      <Dialog open={showAttachEventModal} onOpenChange={setShowAttachEventModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('itemEvents.attachExistingTitle')}</DialogTitle>
            <DialogDescription>
              {t('itemEvents.attachExistingDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white border-b-2">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('table.name')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('table.startDate')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('table.endDate')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('table.type')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('table.pricePoint')}</th>
                </tr>
              </thead>
              <tbody>
                {availableEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      {t('itemEvents.noAvailableEvents')}
                    </td>
                  </tr>
                ) : (
                  availableEvents.map((event) => {
                    const isAlreadyAttached = attachedEvents.find(e => e.id === event.id);
                    const isSelected = selectedEventIds.includes(event.id);

                    return (
                      <tr
                        key={event.id}
                        className={`border-b hover:bg-gray-50 ${isAlreadyAttached ? 'opacity-40' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleEventSelection(event.id)}
                              disabled={!!isAlreadyAttached}
                            />
                            <span>{event.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{formatEventDate(event.start_date)}</td>
                        <td className="py-3 px-4 text-gray-600">{formatEventDate(event.end_date)}</td>
                        <td className="py-3 px-4">
                          {event.type === 'seasonal' ? 'Seasonal' :
                           event.type === 'special_pricing' ? 'Special' :
                           event.type === 'closure_dates' ? 'Closure' :
                           event.type === 'exclusive_date_span' ? 'Exclusive' : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {event.pricing_type === 'base_price' ? 'Base Price' :
                           event.pricing_type === 'new_price' ? 'New Price' :
                           event.pricing_type === 'dynamic' ? 'Dynamic' :
                           event.pricing_type === 'yield' ? 'Yield' : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAttachEventModal(false);
                setSelectedEventIds([]);
              }}
            >
              {tc('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleAttachExistingEvents}
              disabled={selectedEventIds.length === 0}
            >
              {t('itemEvents.attachSelected', { count: selectedEventIds.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
