/**
 * Blogs List Client Component
 * 
 * Client component for displaying and managing blogs
 */

'use client';

import { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { isMarketingBlog } from '@/lib/content/marketing';

interface Blog {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  image: string | null;
  status: string | null;
  category_id: string | null;
  tenant_id: string;
  created_at: Date | null;
  updated_at: Date | null;
  blog_categories: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
  tenants: {
    id: string;
    name: string;
    subdomain: string;
  } | null;
}

interface BlogsListClientProps {
  blogs: Blog[];
}

export default function BlogsListClient({ blogs }: Readonly<BlogsListClientProps>) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleDelete = async (blogId: string) => {
    if (!confirm('Are you sure you want to delete this blog? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(blogId);
    try {
      const response = await fetch(`/api/blogs/${blogId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete blog');
        setIsDeleting(null);
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      alert('An error occurred while deleting the blog');
      setIsDeleting(null);
    }
  };

  // Filter blogs based on search query and status
  const filteredBlogs = useMemo(() => {
    let filtered = blogs;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((blog) => blog.status === statusFilter);
    }

    // Filter by search query (title, excerpt)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((blog) => {
        const title = blog.title?.toLowerCase() || '';
        const excerpt = blog.excerpt?.toLowerCase() || '';
        return title.includes(query) || excerpt.includes(query);
      });
    }

    return filtered;
  }, [blogs, searchQuery, statusFilter]);

  // Count blogs by status
  const statusCounts = useMemo(() => {
    return {
      all: blogs.length,
      published: blogs.filter((b) => b.status === 'published').length,
      draft: blogs.filter((b) => b.status === 'draft').length,
      archived: blogs.filter((b) => b.status === 'archived').length,
    };
  }, [blogs]);

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search blogs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Link href="/admin/blogs/new">
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Blog
          </Button>
        </Link>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger 
            value="all"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            All ({statusCounts.all})
          </TabsTrigger>
          <TabsTrigger 
            value="published"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Published ({statusCounts.published})
          </TabsTrigger>
          <TabsTrigger 
            value="draft"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Draft ({statusCounts.draft})
          </TabsTrigger>
          <TabsTrigger 
            value="archived"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Archived ({statusCounts.archived})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Blogs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Blogs</CardTitle>
          <CardDescription>
            {filteredBlogs.length} blog{filteredBlogs.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBlogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No blogs found. {searchQuery && 'Try adjusting your search.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBlogs.map((blog) => (
                  <TableRow key={blog.id}>
                    <TableCell>
                      {blog.image ? (
                        <div className="relative w-16 h-16 rounded-md overflow-hidden">
                          <Image
                            src={blog.image}
                            alt={blog.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {blog.title}
                          {(!blog.tenants || isMarketingBlog(blog.tenants.id)) && (
                            <Badge variant="outline" className="text-xs">
                              Marketing
                            </Badge>
                          )}
                        </div>
                        {blog.excerpt && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {blog.excerpt}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {blog.blog_categories ? (
                        <Badge variant="outline">{blog.blog_categories.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Uncategorized</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isMarketingBlog(blog.tenant_id) ? (
                        <Badge variant="outline" className="bg-purple-100 text-purple-800">Marketing</Badge>
                      ) : blog.tenants ? (
                        <div className="text-sm">
                          <div className="font-medium">{blog.tenants.name}</div>
                          <div className="text-muted-foreground">{blog.tenants.subdomain}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(blog.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(blog.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/blogs/${blog.id}`}>
                          <Button variant="ghost" size="sm">
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(blog.id)}
                          disabled={isDeleting === blog.id}
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
    </div>
  );
}

