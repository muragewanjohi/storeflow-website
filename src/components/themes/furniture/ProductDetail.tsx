/**
 * Furniture Theme Product Detail Component
 * 
 * Product detail page matching Figma design for Furniro furniture theme
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusIcon, MinusIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/currency/currency-context';
import FurnitureProductCard from './ProductCard';
import { ShareIcon } from '@heroicons/react/24/outline';
import { sanitizeHtmlForDisplay } from '@/lib/security/sanitize-html';

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

interface FurnitureProductDetailProps {
  product: Product;
  relatedProducts: RelatedProduct[];
}

export default function FurnitureProductDetail({
  product,
  relatedProducts,
}: Readonly<FurnitureProductDetailProps>) {
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const [addingToCart, setAddingToCart] = useState(false);

  // Get color and size attributes
  const colorAttributes = product.product_variants
    .flatMap((v) => v.variant_attributes)
    .filter((va) => va.attributes.type === 'color' || va.attributes.name.toLowerCase() === 'color')
    .map((va) => va.attribute_values)
    .filter((v, i, a) => a.findIndex((av) => av.id === v.id) === i);

  const sizeAttributes = product.product_variants
    .flatMap((v) => v.variant_attributes)
    .filter((va) => va.attributes.type === 'size' || va.attributes.name.toLowerCase() === 'size')
    .map((va) => va.attribute_values)
    .filter((v, i, a) => a.findIndex((av) => av.id === v.id) === i);

  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(product.image);
  const [selectedColor, setSelectedColor] = useState<string | null>(colorAttributes.length > 0 ? colorAttributes[0].id : null);
  const [selectedSize, setSelectedSize] = useState<string | null>(sizeAttributes.length > 0 ? sizeAttributes[0].id : null);
  const [activeTab, setActiveTab] = useState<'description' | 'additional' | 'reviews'>('description');

  // Get selected variant
  const selectedVariantData = selectedVariant
    ? product.product_variants.find((v) => v.id === selectedVariant)
    : null;

  // Use variant price if selected, otherwise use product price
  const basePrice = selectedVariantData?.price ?? product.price;
  const displayPrice = product.sale_price || basePrice;

  // Get gallery images
  const galleryImages = Array.isArray(product.gallery) ? product.gallery : [];
  const allImages = [
    product.image,
    ...galleryImages.filter((img: string) => img && img !== product.image),
  ].filter(Boolean) as string[];
  const safeProductDescription = product.description
    ? sanitizeHtmlForDisplay(product.description)
    : null;

  // Default to first 4 images for thumbnails
  const thumbnailImages = allImages.slice(0, 4);

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
            onClick: () => router.push(`/customer-login?redirect=${window.location.pathname}`),
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
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const isOutOfStock = product.stock_quantity !== null && product.stock_quantity === 0;
  const rating = 4.5; // Mock rating - in real app, this would come from product data

  // Get category name - default to "Sofas" if not available
  const categoryName = 'Sofas';

  return (
    <div className="furniture-product-detail bg-white">
      {/* Breadcrumb Section with Beige Background */}
      <div className="bg-[#f9f1e7] py-4">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-2 text-[16px]" aria-label="Breadcrumb" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <Link href="/" className="text-[#9f9f9f] hover:text-black transition-colors flex items-center gap-2">
              Home
              <ChevronRightIcon className="w-5 h-5 rotate-[-90deg]" />
            </Link>
            <Link href="/products" className="text-[#9f9f9f] hover:text-black transition-colors flex items-center gap-2">
              Shop
              <ChevronRightIcon className="w-5 h-5 rotate-[-90deg]" />
            </Link>
            <span className="text-black">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Product Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="flex gap-4">
            {/* Thumbnail Images - Left Side */}
            <div className="hidden lg:flex flex-col gap-4">
              {thumbnailImages.map((img: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(img)}
                  className={`relative w-[76px] h-[80px] rounded-[10px] overflow-hidden bg-[#f9f1e7] border-2 transition-all ${
                    selectedImage === img
                      ? 'border-[var(--color-primary)]'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} - Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div className="flex-1 relative">
              <div className="relative w-full h-[500px] bg-[#f9f1e7] rounded-[10px] overflow-hidden">
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#898989]">
                    No Image
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="product-info-section">
            <h1 className="text-[42px] font-normal text-black mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {product.name}
            </h1>

            {/* Price */}
            <p className="text-[24px] font-medium text-[#9f9f9f] mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {formatCurrency(displayPrice)}
            </p>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= Math.floor(rating);
                  const isHalf = star === Math.ceil(rating) && rating % 1 !== 0;
                  return (
                    <svg
                      key={star}
                      className="w-5 h-5"
                      fill={isFilled ? '#FFBA5C' : isHalf ? 'url(#half-star-gradient)' : 'none'}
                      stroke={isFilled ? '#FFBA5C' : '#D1D5DB'}
                      viewBox="0 0 24 24"
                    >
                      {isHalf && (
                        <defs>
                          <linearGradient id="half-star-gradient">
                            <stop offset="50%" stopColor="#FFBA5C" />
                            <stop offset="50%" stopColor="#D1D5DB" />
                          </linearGradient>
                        </defs>
                      )}
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  );
                })}
              </div>
              <div className="h-px w-[30px] bg-[#9f9f9f]"></div>
              <span className="text-[13px] text-[#9f9f9f]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                5 Customer Review
              </span>
            </div>

            {/* Description */}
            {product.short_description && (
              <p className="text-[13px] text-black mb-8 leading-normal" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {product.short_description}
              </p>
            )}

            {/* Size Selector */}
            {sizeAttributes.length > 0 && (
              <div className="mb-6">
                <p className="text-[14px] text-[#9f9f9f] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Size
                </p>
                <div className="flex gap-3">
                  {sizeAttributes.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSize(size.id)}
                      className={`w-[30px] h-[30px] rounded-[5px] text-[13px] font-normal transition-all ${
                        selectedSize === size.id
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[#f9f1e7] text-black hover:bg-[#e8dcc8]'
                      }`}
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      {size.value}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selector */}
            {colorAttributes.length > 0 && (
              <div className="mb-8">
                <p className="text-[14px] text-[#9f9f9f] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Color
                </p>
                <div className="flex gap-3">
                  {colorAttributes.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color.id)}
                      className={`w-[30px] h-[30px] rounded-full border-2 transition-all ${
                        selectedColor === color.id
                          ? 'border-[var(--color-primary)] scale-110'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                      style={{
                        backgroundColor: color.color_code || '#ccc',
                      }}
                      title={color.value}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="flex items-center gap-4 mb-8">
              {/* Quantity Selector */}
              <div className="bg-white border border-[#9f9f9f] flex items-center justify-between px-4 py-4 rounded-[10px] w-[123px]">
                <button
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                  className="p-1 hover:opacity-70 transition-opacity disabled:opacity-30"
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
                <span className="text-[16px] font-medium text-black">{quantity}</span>
                <button
                  onClick={incrementQuantity}
                  disabled={isOutOfStock || (product.stock_quantity !== null && quantity >= product.stock_quantity)}
                  className="p-1 hover:opacity-70 transition-opacity disabled:opacity-30"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart}
                className="bg-[var(--color-primary)] text-white border border-black h-[64px] px-8 rounded-[15px] text-[20px] font-normal hover:brightness-90 transition"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                {addingToCart ? 'Adding...' : isOutOfStock ? 'Out of Stock' : 'Add To Cart'}
              </Button>

              {/* Compare Button */}
              <Button
                variant="outline"
                className="border border-black h-[64px] px-8 rounded-[15px] text-[20px] font-normal hover:bg-gray-50"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                <PlusIcon className="w-6 h-6 mr-2" />
                Compare
              </Button>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#9f9f9f] mb-6"></div>

            {/* Product Info */}
            <div className="space-y-4">
              <div className="flex items-start">
                <span className="text-[16px] text-[#9f9f9f] w-24" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  SKU
                </span>
                <span className="text-[16px] text-[#9f9f9f]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  : {product.sku || 'N/A'}
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-[16px] text-[#9f9f9f] w-24" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Category
                </span>
                <span className="text-[16px] text-[#9f9f9f]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  : {categoryName}
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-[16px] text-[#9f9f9f] w-24" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Tags
                </span>
                <span className="text-[16px] text-[#9f9f9f]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  : Sofa, Chair, Home, Shop
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-[16px] text-[#9f9f9f] w-24" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Share
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[16px] text-[#9f9f9f]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    :
                  </span>
                  <button className="hover:opacity-70 transition-opacity">
                    <svg className="w-5 h-5 text-[#9f9f9f]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>
                  <button className="hover:opacity-70 transition-opacity">
                    <svg className="w-6 h-6 text-[#9f9f9f]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </button>
                  <button className="hover:opacity-70 transition-opacity">
                    <svg className="w-5 h-5 text-[#9f9f9f]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="border-b border-[#9f9f9f] mb-8">
          <div className="flex items-center gap-8">
            <button
              onClick={() => setActiveTab('description')}
              className={`pb-4 text-[24px] transition-colors ${
                activeTab === 'description'
                  ? 'text-black font-medium'
                  : 'text-[#9f9f9f] font-normal'
              }`}
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab('additional')}
              className={`pb-4 text-[24px] transition-colors ${
                activeTab === 'additional'
                  ? 'text-black font-medium'
                  : 'text-[#9f9f9f] font-normal'
              }`}
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Additional Information
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 text-[24px] transition-colors ${
                activeTab === 'reviews'
                  ? 'text-black font-medium'
                  : 'text-[#9f9f9f] font-normal'
              }`}
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Reviews [5]
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'description' && safeProductDescription && (
            <div className="prose max-w-none">
              <div
                className="text-[16px] text-[#9f9f9f] leading-normal text-justify"
                style={{ fontFamily: 'Poppins, sans-serif' }}
                dangerouslySetInnerHTML={{ __html: safeProductDescription }}
              />
            </div>
          )}

          {activeTab === 'additional' && (
            <div>
              <p className="text-[16px] text-[#9f9f9f]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Additional information will be displayed here.
              </p>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              <p className="text-[16px] text-[#9f9f9f]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Reviews will be displayed here.
              </p>
            </div>
          )}
        </div>

        {/* Additional Product Images */}
        {allImages.length > 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            {allImages.slice(1, 3).map((img: string, index: number) => (
              <div key={index} className="relative h-[348px] bg-[#f9f1e7] rounded-[10px] overflow-hidden">
                <img
                  src={img}
                  alt={`${product.name} - View ${index + 2}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="container mx-auto px-4">
        <div className="h-px bg-[#9f9f9f]"></div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-[36px] font-medium text-black mb-12" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Related Products
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {relatedProducts.map((p) => (
              <FurnitureProductCard
                key={p.id}
                product={{
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                  price: p.sale_price || p.price,
                  sale_price: p.sale_price ? p.price : undefined,
                  image: p.image,
                  stock_quantity: p.stock_quantity,
                }}
              />
            ))}
          </div>
          <div className="text-center">
            <Button
              variant="outline"
              className="border border-[var(--color-primary)] text-[var(--color-primary)] px-[72px] py-3 text-[16px] font-semibold hover:bg-[var(--color-primary)] hover:text-white transition-colors"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Show More
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

