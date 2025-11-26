/**
 * Product Detail Client Component
 * 
 * Client-side product detail with add to cart functionality
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCartIcon, PlusIcon, MinusIcon, ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface ProductVariant {
  id: string;
  price: number | null;
  stock_quantity: number | null;
  sku: string | null;
  image: string | null;
  variant_attributes: Array<{
    id: string;
    attribute_id: string;
    attribute_value_id: string;
    attributes: {
      id: string;
      name: string;
      type: string | null;
    };
    attribute_values: {
      id: string;
      value: string;
      color_code: string | null;
      image: string | null;
    };
  }>;
}

interface Product {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  short_description: string | null;
  price: number;
  sale_price: number | null;
  sku: string | null;
  stock_quantity: number | null;
  image: string | null;
  gallery: any;
  product_variants: ProductVariant[];
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  sale_price: number | null;
  image: string | null;
  stock_quantity: number | null;
}

interface ProductDetailClientProps {
  product: Product;
  relatedProducts: RelatedProduct[];
}

export default function ProductDetailClient({
  product,
  relatedProducts,
}: Readonly<ProductDetailClientProps>) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(product.image);
  const [hasInteractedWithQuantity, setHasInteractedWithQuantity] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  // Get selected variant
  const selectedVariantData = selectedVariant
    ? product.product_variants.find((v) => v.id === selectedVariant)
    : null;

  // Use variant price if selected, otherwise use product price
  const basePrice = selectedVariantData?.price ?? product.price;
  const displayPrice = product.sale_price || basePrice;
  const hasDiscount = product.sale_price !== null && !selectedVariantData?.price;

  const router = useRouter();
  const [addingToCart, setAddingToCart] = useState(false);

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          variant_id: selectedVariant,
          quantity,
        }),
      });

      if (response.ok) {
        // Notify header to update cart count
        window.dispatchEvent(new Event('cartUpdated'));
        
        toast.success('Item added to cart!', {
          description: `${product.name} (${quantity}x) has been added to your cart`,
          action: {
            label: 'View Cart',
            onClick: () => router.push('/cart'),
          },
          duration: 3000,
        });
      } else if (response.status === 401) {
        toast.error('Please login', {
          description: 'You need to be logged in to add items to cart',
          action: {
            label: 'Login',
            onClick: () => router.push(`/login?redirect=${window.location.pathname}`),
          },
        });
      } else {
        const error = await response.json();
        toast.error('Failed to add item', {
          description: error.error || 'Something went wrong',
        });
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item', {
        description: 'Please try again',
      });
    } finally {
      setAddingToCart(false);
    }
  };

  const incrementQuantity = () => {
    const maxQuantity = selectedVariant
      ? product.product_variants.find((v) => v.id === selectedVariant)?.stock_quantity || product.stock_quantity
      : product.stock_quantity;
    if (maxQuantity !== null && quantity < maxQuantity) {
      setQuantity(quantity + 1);
      setHasInteractedWithQuantity(true);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
      setHasInteractedWithQuantity(true);
    }
  };

  const isOutOfStock = product.stock_quantity !== null && product.stock_quantity === 0;

  // Get gallery images
  const galleryImages = Array.isArray(product.gallery) ? product.gallery : [];
  const allImages = [
    product.image,
    ...galleryImages.filter((img: string) => img && img !== product.image),
  ].filter(Boolean) as string[];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
          <HomeIcon className="h-4 w-4" />
          <span>Home</span>
        </Link>
        <ChevronRightIcon className="h-4 w-4" />
        <Link href="/products" className="hover:text-foreground transition-colors">
          Products
        </Link>
        <ChevronRightIcon className="h-4 w-4" />
        <span className="text-foreground font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Product Images */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
            {selectedImage ? (
              <Image
                src={selectedImage}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No Image
              </div>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {allImages.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {allImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(img)}
                  className={`relative aspect-square bg-muted rounded-md overflow-hidden border-2 transition-colors ${
                    selectedImage === img
                      ? 'border-primary'
                      : 'border-transparent hover:border-muted-foreground'
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} - Image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            {product.sku && (
              <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold">{formatPrice(displayPrice)}</span>
            {hasDiscount && (
              <>
                <span className="text-xl text-muted-foreground line-through">
                  {formatPrice(product.price)}
                </span>
                <span className="bg-destructive text-destructive-foreground px-2 py-1 rounded text-sm font-medium">
                  {Math.round(((product.price - product.sale_price!) / product.price) * 100)}% OFF
                </span>
              </>
            )}
            {selectedVariantData?.price && selectedVariantData.price !== product.price && (
              <span className="text-sm text-muted-foreground">
                (Base: {formatPrice(product.price)})
              </span>
            )}
          </div>

          {/* Stock Status */}
          {isOutOfStock ? (
            <div className="text-destructive font-medium">Out of Stock</div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {product.stock_quantity} in stock
            </div>
          )}

          {/* Description */}
          {product.short_description && (
            <div>
              <h2 className="font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground whitespace-pre-line">
                {product.short_description}
              </p>
            </div>
          )}

          {/* Variants */}
          {product.product_variants.length > 0 && (
            <div>
              <h2 className="font-semibold mb-4">Variants</h2>
              <div className="space-y-3">
                {product.product_variants.map((variant) => {
                  const variantImage = variant.image || 
                    variant.variant_attributes.find(va => va.attribute_values.image)?.attribute_values.image ||
                    product.image;
                  
                  const variantDetails = variant.variant_attributes
                    .map(va => `${va.attributes.name}: ${va.attribute_values.value}`)
                    .join(', ');

                  return (
                    <button
                      key={variant.id}
                      onClick={() => {
                        setSelectedVariant(variant.id);
                        if (variantImage) {
                          setSelectedImage(variantImage);
                        }
                      }}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                        selectedVariant === variant.id
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-muted hover:border-muted-foreground hover:shadow-sm'
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Variant Image */}
                        {variantImage && (
                          <div className="relative w-20 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0">
                            <Image
                              src={variantImage}
                              alt={variantDetails || `Variant ${variant.id.slice(0, 8)}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        
                        {/* Variant Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              {variantDetails ? (
                                <div className="space-y-1">
                                  {variant.variant_attributes.map((va) => (
                                    <div key={va.id} className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-muted-foreground">
                                        {va.attributes.name}:
                                      </span>
                                      {va.attributes.type === 'color' && va.attribute_values.color_code ? (
                                        <div className="flex items-center gap-2">
                                          <div
                                            className="w-4 h-4 rounded-full border border-muted-foreground/20"
                                            style={{ backgroundColor: va.attribute_values.color_code }}
                                          />
                                          <span className="text-sm font-semibold">
                                            {va.attribute_values.value}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-sm font-semibold">
                                          {va.attribute_values.value}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm font-medium">Variant {variant.id.slice(0, 8)}</span>
                              )}
                              {variant.sku && (
                                <p className="text-xs text-muted-foreground mt-1">SKU: {variant.sku}</p>
                              )}
                            </div>
                            {variant.price && (
                              <span className="font-bold text-lg ml-2">
                                {formatPrice(variant.price)}
                              </span>
                            )}
                          </div>
                          {variant.stock_quantity !== null && (
                            <p className="text-sm text-muted-foreground">
                              {variant.stock_quantity > 0 ? (
                                <span className="text-green-600">{variant.stock_quantity} in stock</span>
                              ) : (
                                <span className="text-destructive">Out of stock</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="font-semibold">Quantity:</label>
              <div className="flex items-center gap-2 border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                >
                  <MinusIcon className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={incrementQuantity}
                  disabled={isOutOfStock || (product.stock_quantity !== null && quantity >= product.stock_quantity)}
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Total Price Display - Only show after user interacts with quantity */}
            {hasInteractedWithQuantity && (
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-medium text-muted-foreground">Total:</span>
                <span className="text-sm font-medium text-muted-foreground">
                  {formatPrice(displayPrice * quantity)}
                </span>
              </div>
            )}
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            disabled={isOutOfStock || addingToCart}
            size="lg"
            className="w-full"
          >
            <ShoppingCartIcon className="mr-2 h-5 w-5" />
            {addingToCart ? 'Adding...' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </Button>

          {/* Full Description */}
          {product.description && (
            <div className="pt-6 border-t">
              <h2 className="font-semibold mb-2">Full Description</h2>
              <div
                className="text-muted-foreground prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Related Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((relatedProduct) => (
              <Link key={relatedProduct.id} href={`/products/${relatedProduct.slug}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="p-0">
                    <div className="relative aspect-square bg-muted rounded-t-lg overflow-hidden">
                      {relatedProduct.image ? (
                        <Image
                          src={relatedProduct.image}
                          alt={relatedProduct.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-2 line-clamp-2">{relatedProduct.name}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold">
                          {formatPrice(relatedProduct.sale_price || relatedProduct.price)}
                        </p>
                        {relatedProduct.sale_price && (
                          <p className="text-sm text-muted-foreground line-through">
                            {formatPrice(relatedProduct.price)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

