/**
 * User Guide Client Component
 * 
 * Client component for managing user guide categories and articles
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, PencilIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { toast } from 'sonner';

interface Article {
  id: string;
  title: string;
  slug: string | null;
  content: string;
  image: string | null;
  image_alt: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  is_popular: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
}

interface Category {
  id: string;
  name: string;
  slug: string | null;
  icon: string | null;
  color: string | null;
  bg_color: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
  articles: Article[];
}

interface UserGuideClientProps {
  categories: Category[];
}

export default function UserGuideClient({ categories }: Readonly<UserGuideClientProps>) {
  const router = useRouter();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [deletingArticle, setDeletingArticle] = useState<string | null>(null);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This will also delete all articles in this category.`)) {
      return;
    }

    setDeletingCategory(categoryId);
    try {
      const response = await fetch(`/api/admin/user-guide/categories/${categoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Category deleted successfully');
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete category');
        setDeletingCategory(null);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('An error occurred while deleting the category');
      setDeletingCategory(null);
    }
  };

  const handleDeleteArticle = async (articleId: string, articleTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${articleTitle}"?`)) {
      return;
    }

    setDeletingArticle(articleId);
    try {
      const response = await fetch(`/api/admin/user-guide/articles/${articleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Article deleted successfully');
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete article');
        setDeletingArticle(null);
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('An error occurred while deleting the article');
      setDeletingArticle(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild>
            <Link href="/admin/user-guide/categories/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              New Category
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/user-guide/articles/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              New Article
            </Link>
          </Button>
        </div>
        <Button variant="outline" asChild>
          <Link href="/help" target="_blank">
            View Public Page
          </Link>
        </Button>
      </div>

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle>Categories & Articles</CardTitle>
          <CardDescription>
            Manage user guide categories and their articles. Click on a category to expand and see articles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No categories yet</p>
                <Button asChild>
                  <Link href="/admin/user-guide/categories/new">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Create First Category
                  </Link>
                </Button>
              </div>
            ) : (
              categories.map((category) => {
                const isExpanded = expandedCategories.has(category.id);
                return (
                  <div key={category.id} className="border rounded-lg">
                    {/* Category Header */}
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          {isExpanded ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{category.name}</h3>
                            {category.is_active === false && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                            <Badge variant="outline">{category.articles.length} articles</Badge>
                          </div>
                          {category.slug && (
                            <p className="text-sm text-muted-foreground">/{category.slug}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link href={`/admin/user-guide/categories/${category.id}/edit`}>
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          disabled={deletingCategory === category.id}
                        >
                          <TrashIcon className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Articles List */}
                    {isExpanded && (
                      <div className="border-t bg-muted/30">
                        {category.articles.length === 0 ? (
                          <div className="p-4 text-center">
                            <p className="text-sm text-muted-foreground mb-2">No articles in this category</p>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/admin/user-guide/articles/new?category_id=${category.id}`}>
                                <PlusIcon className="mr-2 h-3 w-3" />
                                Add Article
                              </Link>
                            </Button>
                          </div>
                        ) : (
                          <div className="divide-y">
                            {category.articles.map((article) => (
                              <div key={article.id} className="flex items-center justify-between p-4 hover:bg-background transition-colors">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{article.title}</h4>
                                    {article.is_active === false && (
                                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                                    )}
                                    {article.is_popular && (
                                      <Badge variant="default" className="text-xs">Popular</Badge>
                                    )}
                                  </div>
                                  {article.slug && (
                                    <p className="text-sm text-muted-foreground">/{article.slug}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                  >
                                    <Link href={`/admin/user-guide/articles/${article.id}/edit`}>
                                      <PencilIcon className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteArticle(article.id, article.title)}
                                    disabled={deletingArticle === article.id}
                                  >
                                    <TrashIcon className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
