/**
 * Attributes List Client Component
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
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

interface AttributeValue {
  id: string;
  value: string;
  color_code: string | null;
}

interface Attribute {
  id: string;
  name: string;
  type: string | null;
  attribute_values: AttributeValue[];
}

interface AttributesListClientProps {
  initialAttributes: Attribute[];
}

export default function AttributesListClient({
  initialAttributes,
}: Readonly<AttributesListClientProps>) {
  const router = useRouter();
  const [attributes, setAttributes] = useState(initialAttributes);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [attributeToDelete, setAttributeToDelete] = useState<Attribute | null>(null);

  const handleDelete = async (attribute: Attribute) => {
    setAttributeToDelete(attribute);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!attributeToDelete) return;

    setDeletingId(attributeToDelete.id);

    try {
      const response = await fetch(`/api/attributes/${attributeToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete attribute');
      }
    } catch (error) {
      console.error('Error deleting attribute:', error);
      alert('An error occurred while deleting the attribute');
    } finally {
      setDeletingId(null);
      setShowDeleteDialog(false);
      setAttributeToDelete(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attributes</h1>
          <p className="text-muted-foreground mt-2">
            Manage product attributes (Size, Color, Weight, etc.)
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/settings/attributes/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Attribute
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Attributes</CardTitle>
          <CardDescription>
            {attributes.length} attribute{attributes.length !== 1 ? 's' : ''} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attributes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No attributes found</p>
              <Button asChild>
                <Link href="/dashboard/settings/attributes/new">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create Your First Attribute
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Values</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributes.map((attribute) => (
                  <TableRow key={attribute.id}>
                    <TableCell className="font-medium">{attribute.name}</TableCell>
                    <TableCell>
                      {attribute.type ? (
                        <Badge variant="outline">{attribute.type}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {attribute.attribute_values.map((val) => (
                          <Badge key={val.id} variant="secondary" className="text-xs">
                            {val.color_code && (
                              <span
                                className="mr-1 inline-block h-3 w-3 rounded border"
                                style={{ backgroundColor: val.color_code }}
                              />
                            )}
                            {val.value}
                          </Badge>
                        ))}
                        {attribute.attribute_values.length === 0 && (
                          <span className="text-xs text-muted-foreground">No values</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/settings/attributes/${attribute.id}`}>
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(attribute)}
                          disabled={deletingId === attribute.id}
                        >
                          <TrashIcon className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attribute</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{attributeToDelete?.name}"? This action cannot be undone.
              All attribute values and variant associations will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

