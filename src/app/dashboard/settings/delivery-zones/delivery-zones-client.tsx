/**
 * Delivery Zones Management Client Component
 * 
 * CRUD interface for managing delivery zones
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, PlusIcon, PencilIcon, TrashIcon, MapPinIcon, ArrowLeftIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/currency/currency-context';
import Link from 'next/link';

interface DeliveryZone {
  id: string;
  name: string;
  price: number;
  locations: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export default function DeliveryZonesClient() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [deletingZone, setDeletingZone] = useState<DeliveryZone | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    locations: '',
    is_active: true,
    sort_order: 0,
  });

  const fetchZones = async () => {
    try {
      const response = await fetch('/api/admin/delivery-zones');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setZones(data.zones);
        }
      } else {
        toast.error('Failed to load delivery zones');
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
      toast.error('Failed to load delivery zones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleOpenDialog = (zone?: DeliveryZone) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        name: zone.name,
        price: zone.price.toString(),
        locations: zone.locations.join(', '),
        is_active: zone.is_active ?? true,
        sort_order: zone.sort_order ?? 0,
      });
    } else {
      setEditingZone(null);
      setFormData({
        name: '',
        price: '',
        locations: '',
        is_active: true,
        sort_order: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingZone(null);
    setFormData({
      name: '',
      price: '',
      locations: '',
      is_active: true,
      sort_order: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const locations = formData.locations
        .split(',')
        .map((loc) => loc.trim())
        .filter((loc) => loc.length > 0);

      if (locations.length === 0) {
        toast.error('Please add at least one location');
        setIsSubmitting(false);
        return;
      }

      const price = parseFloat(formData.price);
      if (isNaN(price) || price < 0) {
        toast.error('Please enter a valid price');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        name: formData.name.trim(),
        price,
        locations,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
      };

      const url = editingZone
        ? `/api/admin/delivery-zones/${editingZone.id}`
        : '/api/admin/delivery-zones';
      const method = editingZone ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(editingZone ? 'Zone updated successfully' : 'Zone created successfully');
        handleCloseDialog();
        fetchZones();
      } else {
        toast.error(data.error || 'Failed to save zone');
      }
    } catch (error) {
      console.error('Error saving zone:', error);
      toast.error('Failed to save zone');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (zone: DeliveryZone) => {
    setDeletingZone(zone);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingZone) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/delivery-zones/${deletingZone.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Zone deleted successfully');
        setIsDeleteDialogOpen(false);
        setDeletingZone(null);
        fetchZones();
      } else {
        toast.error(data.error || 'Failed to delete zone');
      }
    } catch (error) {
      console.error('Error deleting zone:', error);
      toast.error('Failed to delete zone');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/settings">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Delivery Zones</h1>
          <p className="text-muted-foreground mt-2">
            Manage delivery zones and pricing for different locations
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Zone
        </Button>
      </div>

      {zones.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <MapPinIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No delivery zones</h3>
              <p className="text-muted-foreground mb-4">
                Create your first delivery zone to get started
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Zone
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {zones.map((zone) => (
            <Card key={zone.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {zone.name}
                        {!zone.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {formatCurrency(zone.price)} delivery fee
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(zone)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(zone)}
                    >
                      <TrashIcon className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm font-semibold">Locations Covered:</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {zone.locations.map((location, index) => (
                        <Badge key={index} variant="outline">
                          {location}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {zone.sort_order > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Sort Order: {zone.sort_order}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingZone ? 'Edit Delivery Zone' : 'Create Delivery Zone'}
            </DialogTitle>
            <DialogDescription>
              {editingZone
                ? 'Update the delivery zone details'
                : 'Add a new delivery zone with pricing and locations'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Zone Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ZONE A"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  e.g., ZONE A, ZONE B, OUT OF TOWN
                </p>
              </div>

              <div>
                <Label htmlFor="price">Delivery Fee *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="250.00"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Delivery fee for this zone
                </p>
              </div>

              <div>
                <Label htmlFor="locations">Locations *</Label>
                <Textarea
                  id="locations"
                  value={formData.locations}
                  onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
                  placeholder="Westlands, Parklands, Spring Valley"
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter locations separated by commas (e.g., Westlands, Parklands, Spring Valley)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked === true })}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive zones won&apos;t appear in checkout
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lower numbers appear first (0 = first)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingZone ? (
                  'Update Zone'
                ) : (
                  'Create Zone'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery Zone?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingZone?.name}</strong>? This action
              cannot be undone. If this zone is used in existing orders, you should deactivate it
              instead of deleting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
