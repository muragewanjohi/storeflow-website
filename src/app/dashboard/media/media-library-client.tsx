/**
 * Media Library Client Component
 * 
 * Displays media gallery with upload, preview, and selection functionality
 * 
 * Day 28: Content Management - Media Library
 */

'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MediaFile {
  id: string;
  name: string;
  title: string | null;
  path: string;
  url: string;
  alt_text: string | null;
  size: number;
  type: string;
  created_at: string;
  updated_at: string;
}

export default function MediaLibraryClient() {
  const [isPending, startTransition] = useTransition();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingAltText, setEditingAltText] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [altTextValue, setAltTextValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<MediaFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch media files
  const fetchFiles = async (searchTerm = '') => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.set('search', searchTerm);
      queryParams.set('limit', '50');

      const response = await fetch(`/api/media?${queryParams.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch media files');
      }

      setFiles(data.files || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch media files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Load files on mount
  useEffect(() => {
    fetchFiles();
  }, []);

  // Handle search
  const handleSearch = (value: string) => {
    setSearch(value);
    fetchFiles(value);
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only images (JPEG, PNG, WebP, GIF) are allowed.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('File size exceeds 5MB limit');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload file');
      }

      // Refresh the file list
      await fetchFiles(search);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // Handle save title and alt text
  const handleSaveMetadata = async (field?: 'title' | 'alt_text') => {
    if (!selectedFile) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/media/${selectedFile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: field === 'alt_text' ? selectedFile.title : (titleValue || null),
          alt_text: field === 'title' ? selectedFile.alt_text : (altTextValue || null),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Failed to update media' };
        }
        throw new Error(errorData.error || 'Failed to update media');
      }

      const data = await response.json();

      // Update local state
      const updatedFile = { ...selectedFile, title: data.title, alt_text: data.alt_text };
      setFiles(files.map((f: any) => 
        f.id === selectedFile.id ? updatedFile : f
      ));
      
      setSelectedFile(updatedFile);
      if (field === 'title' || !field) setEditingTitle(false);
      if (field === 'alt_text' || !field) setEditingAltText(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update media');
    } finally {
      setSaving(false);
    }
  };

  // Open preview and set edit values
  const handleOpenPreview = (file: MediaFile) => {
    setSelectedFile(file);
    setTitleValue(file.title || '');
    setAltTextValue(file.alt_text || '');
    setEditingTitle(false);
    setEditingAltText(false);
    setPreviewOpen(true);
  };

  // Handle file deletion
  const handleDelete = async () => {
    if (!fileToDelete) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/media/${fileToDelete.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || 'Failed to delete file' };
          }
          throw new Error(errorData.error || 'Failed to delete file');
        }

        const data = await response.json();

        // Remove from UI
        setFiles(files.filter((f: any) => f.id !== fileToDelete.id));
        setDeleteDialogOpen(false);
        setFileToDelete(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete file');
      }
    });
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground">
            Manage your images and media files
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isPending}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload Image'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search media files..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Media Gallery */}
      {loading ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Loading media files...</p>
        </div>
      ) : files.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {search ? 'No media files found matching your search.' : 'No media files yet. Upload your first image!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {files.map((file: any) => (
            <Card
              key={file.id}
              className="group relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleOpenPreview(file)}
            >
              <div className="aspect-square relative bg-muted">
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileToDelete(file);
                      setDeleteDialogOpen(true);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate" title={file.title || file.name}>
                  {file.title || file.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatFileSize(file.size)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedFile?.title || selectedFile?.name}</DialogTitle>
            {selectedFile && (
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>Size: {formatFileSize(selectedFile.size)}</span>
                <span>Uploaded: {formatDate(selectedFile.created_at)}</span>
              </div>
            )}
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4">
              <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={selectedFile.url}
                  alt={selectedFile.alt_text || selectedFile.title || selectedFile.name}
                  className="w-full h-full object-contain"
                />
              </div>
              
              {/* Title Field */}
              <div className="space-y-2">
                <Label>Image Title</Label>
                {editingTitle ? (
                  <div className="space-y-2">
                    <Input
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      placeholder="Enter image title"
                      disabled={saving}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveMetadata('title')}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTitleValue(selectedFile.title || '');
                          setEditingTitle(false);
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {selectedFile.title || 'No title set'}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTitle(true)}
                    >
                      {selectedFile.title ? 'Edit' : 'Add Title'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Alt Text Field */}
              <div className="space-y-2">
                <Label>Alt Text (for accessibility)</Label>
                {editingAltText ? (
                  <div className="space-y-2">
                    <Textarea
                      value={altTextValue}
                      onChange={(e) => setAltTextValue(e.target.value)}
                      placeholder="Enter alt text for accessibility"
                      rows={2}
                      disabled={saving}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveMetadata('alt_text')}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAltTextValue(selectedFile.alt_text || '');
                          setEditingAltText(false);
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {selectedFile.alt_text || 'No alt text set'}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingAltText(true)}
                    >
                      {selectedFile.alt_text ? 'Edit' : 'Add Alt Text'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{fileToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

