/**
 * HexFashion Theme Product Detail Component
 * 
 * Product detail page matching Figma design
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ShoppingCartIcon, PlusIcon, MinusIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/currency/currency-context';
import HexFashionProductCard from './ProductCard';
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

interface HexFashionProductDetailProps {
  product: Product;
  relatedProducts: RelatedProduct[];
}

export default function HexFashionProductDetail({
  product,
  relatedProducts,
}: Readonly<HexFashionProductDetailProps>) {
  const { formatCurrency } = useCurrency();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(product.image);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'faqs'>('reviews');

  const router = useRouter();
  const [addingToCart, setAddingToCart] = useState(false);

  // Get selected variant
  const selectedVariantData = selectedVariant
    ? product.product_variants.find((v) => v.id === selectedVariant)
    : null;

  // Use variant price if selected, otherwise use product price
  const basePrice = selectedVariantData?.price ?? product.price;
  const displayPrice = product.sale_price || basePrice;
  const hasDiscount = product.sale_price !== null && !selectedVariantData?.price;
  const discountPercent = hasDiscount && product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : 0;

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

  // Get gallery images
  const galleryImages = Array.isArray(product.gallery) ? product.gallery : [];
  const allImages = [
    product.image,
    ...galleryImages.filter((img: string) => img && img !== product.image),
  ].filter(Boolean) as string[];
  const safeProductDescription = product.description
    ? sanitizeHtmlForDisplay(product.description)
    : null;

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

  return (
    <div className="product-detail-page">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center gap-1.5 md:gap-2 text-[14px] md:text-[16px] text-[rgba(0,0,0,0.6)]" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-black transition-colors flex items-center gap-1">
            Home
            <ChevronRightIcon className="w-3.5 h-3.5 md:w-4 md:h-4 rotate-[-90deg]" />
          </Link>
          <Link href="/products" className="hover:text-black transition-colors flex items-center gap-1">
            Shop
            <ChevronRightIcon className="w-3.5 h-3.5 md:w-4 md:h-4 rotate-[-90deg]" />
          </Link>
          <span className="text-black">T-shirts</span>
        </nav>
      </div>

      {/* Product Section */}
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
          {/* Product Images */}
          <div className="product-images-section relative">
            {/* Thumbnail Images - Desktop Only */}
            {allImages.length > 1 && (
              <div className="hidden lg:flex flex-col gap-4 absolute left-0 top-0 z-10">
                {allImages.slice(0, 3).map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(img)}
                    className={`relative w-[152px] h-[167px] rounded-[20px] overflow-hidden border-2 transition-all ${
                      selectedImage === img
                        ? 'border-black'
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
            )}

            {/* Main Image */}
            <div className={`relative w-full h-[290px] md:aspect-square bg-[#f0eeed] rounded-[20px] overflow-hidden ${allImages.length > 1 ? 'lg:ml-[176px]' : ''}`}>
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[rgba(0,0,0,0.6)]">
                  No Image
                </div>
              )}
              {hasDiscount && discountPercent > 0 && (
                <div className="absolute top-4 left-4 bg-[rgba(255,51,51,0.1)] px-[12px] py-[6px] rounded-[62px]">
                  <span className="text-[#FF3333] text-[14px] md:text-[16px] font-medium">
                    -{discountPercent}%
                  </span>
                </div>
              )}
            </div>

            {/* Mobile Thumbnail Images - Below Main Image */}
            {allImages.length > 1 && (
              <div className="lg:hidden flex gap-3 mt-4">
                {allImages.slice(0, 3).map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(img)}
                    className={`relative w-[111px] h-[106px] md:w-[112px] md:h-[106px] rounded-[20px] overflow-hidden border-2 transition-all ${
                      selectedImage === img
                        ? 'border-black'
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
            )}
          </div>

          {/* Product Info */}
          <div className="product-info-section">
            <h1 className="text-[24px] md:text-[40px] font-bold text-black mb-4 leading-[28px] md:leading-normal">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 md:gap-3 mb-4">
              <div className="flex items-center gap-0.5 md:gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className="w-[18.67px] h-[18.67px] md:w-6 md:h-6"
                    fill={star <= Math.floor(rating) ? '#FFBA5C' : 'none'}
                    stroke={star <= Math.floor(rating) ? '#FFBA5C' : '#D1D5DB'}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                ))}
              </div>
              <span className="text-[14px] md:text-[16px] text-black">
                {rating.toFixed(1)}/<span className="text-[rgba(0,0,0,0.6)]">5</span>
              </span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <span className="text-[24px] md:text-[32px] font-bold text-black">
                {formatCurrency(displayPrice)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-[24px] md:text-[32px] font-bold text-[rgba(0,0,0,0.3)] line-through">
                    {formatCurrency(product.price)}
                  </span>
                  <div className="bg-[rgba(255,51,51,0.1)] px-[12px] py-[6px] rounded-[62px]">
                    <span className="text-[#FF3333] text-[14px] font-medium">
                      -{discountPercent}%
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Description */}
            {product.short_description && (
              <p className="text-[14px] md:text-[16px] text-[rgba(0,0,0,0.6)] mb-4 md:mb-6 leading-[20px] md:leading-[22px]">
                {product.short_description}
              </p>
            )}

            {/* Color Selector */}
            {colorAttributes.length > 0 && (
              <div className="mb-4 md:mb-6">
                <p className="text-[14px] md:text-[16px] text-[rgba(0,0,0,0.6)] mb-3">Select Colors</p>
                <div className="flex gap-2 md:gap-3 flex-wrap">
                  {colorAttributes.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color.id)}
                      className={`w-[32px] h-[32px] md:w-[37px] md:h-[37px] rounded-full border-2 transition-all ${
                        selectedColor === color.id
                          ? 'border-black scale-110'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                      style={{
                        backgroundColor: color.color_code || '#ccc',
                      }}
                      title={color.value}
                    />
                  ))}
                </div>
                <div className="h-px bg-[rgba(0,0,0,0.1)] mt-4" />
              </div>
            )}

            {/* Size Selector */}
            {sizeAttributes.length > 0 && (
              <div className="mb-4 md:mb-6">
                <p className="text-[14px] md:text-[16px] text-[rgba(0,0,0,0.6)] mb-3">Choose Size</p>
                <div className="flex gap-2 md:gap-3 flex-wrap">
                  {sizeAttributes.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSize(size.id)}
                      className={`px-5 py-[10px] md:px-6 md:py-3 rounded-[62px] text-[14px] md:text-[16px] font-medium transition-all ${
                        selectedSize === size.id
                          ? 'bg-black text-white'
                          : 'bg-[#f0f0f0] text-[rgba(0,0,0,0.6)] hover:bg-gray-200'
                      }`}
                    >
                      {size.value}
                    </button>
                  ))}
                </div>
                <div className="h-px bg-[rgba(0,0,0,0.1)] mt-4" />
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="flex items-center gap-3 md:gap-4 mb-6">
              {/* Quantity Selector */}
              <div className="bg-[#f0f0f0] flex items-center justify-between px-4 md:px-5 py-3 md:py-4 rounded-[62px] w-[170px] md:w-[170px]">
                <button
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                  className="p-1 hover:opacity-70 transition-opacity disabled:opacity-30"
                >
                  <MinusIcon className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <span className="text-[14px] md:text-[16px] font-medium text-black">{quantity}</span>
                <button
                  onClick={incrementQuantity}
                  disabled={isOutOfStock || (product.stock_quantity !== null && quantity >= product.stock_quantity)}
                  className="p-1 hover:opacity-70 transition-opacity disabled:opacity-30"
                >
                  <PlusIcon className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart}
                className="bg-black text-white hover:bg-gray-800 px-[54px] py-3 md:py-4 h-[44px] md:h-[52px] rounded-[62px] text-[14px] md:text-[16px] font-medium flex-1"
              >
                {addingToCart ? 'Adding...' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="border-b border-[rgba(0,0,0,0.1)] mb-6 md:mb-8">
          <div className="flex items-center justify-between md:justify-center gap-4 md:gap-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 md:pb-4 text-[16px] md:text-[20px] transition-colors relative ${
                activeTab === 'details'
                  ? 'text-black font-medium'
                  : 'text-[rgba(0,0,0,0.6)]'
              }`}
            >
              Product Details
              {activeTab === 'details' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 md:pb-4 text-[16px] md:text-[20px] transition-colors relative ${
                activeTab === 'reviews'
                  ? 'text-black font-medium'
                  : 'text-[rgba(0,0,0,0.6)]'
              }`}
            >
              Rating & Reviews
              {activeTab === 'reviews' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('faqs')}
              className={`pb-3 md:pb-4 text-[16px] md:text-[20px] transition-colors relative ${
                activeTab === 'faqs'
                  ? 'text-black font-medium'
                  : 'text-[rgba(0,0,0,0.6)]'
              }`}
            >
              FAQs
              {activeTab === 'faqs' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'details' && safeProductDescription && (
            <div className="prose max-w-none">
              <div
                className="text-[16px] text-[rgba(0,0,0,0.6)] leading-[22px]"
                dangerouslySetInnerHTML={{ __html: safeProductDescription }}
              />
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <h3 className="text-[20px] md:text-[24px] font-bold text-black">All Reviews</h3>
                <span className="text-[14px] md:text-[16px] text-[rgba(0,0,0,0.6)]">(451)</span>
              </div>

              {/* Review Actions */}
              <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
                <button className="bg-[#f0f0f0] w-10 h-10 md:w-12 md:h-12 rounded-[62px] flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button className="bg-[#f0f0f0] px-4 md:px-5 py-2 md:py-3 rounded-[62px] text-[14px] md:text-[16px] font-medium text-black hover:bg-gray-200 transition-colors flex items-center gap-2">
                  Latest
                  <ChevronRightIcon className="w-3 h-3 md:w-4 md:h-4 rotate-[-90deg]" />
                </button>
                <Button className="bg-black text-white px-4 md:px-5 py-2 md:py-3 h-10 md:h-12 rounded-[62px] text-[12px] md:text-[16px] font-medium">
                  Write a Review
                </Button>
              </div>

              {/* Reviews List */}
              <div className="space-y-4 md:space-y-6">
                {/* Mock reviews - in real app, these would come from product data */}
                {[1, 2, 3].map((review) => (
                  <div
                    key={review}
                    className="border border-[rgba(0,0,0,0.1)] rounded-[20px] p-6 md:p-8"
                  >
                    <div className="flex items-start justify-between mb-3 md:mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 md:mb-3">
                          <h4 className="text-[16px] md:text-[20px] font-bold text-black">Samantha D.</h4>
                          <svg className="w-[19px] h-[19px] md:w-6 md:h-6" fill="#10B981" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </div>
                        <p className="text-[14px] md:text-[16px] text-[rgba(0,0,0,0.6)] leading-[20px] md:leading-[22px]">
                          &ldquo;I absolutely love this t-shirt! The design is unique and the fabric feels so comfortable. As a fellow designer, I appreciate the attention to detail. It&apos;s become my favorite go-to shirt.&rdquo;
                        </p>
                      </div>
                    </div>
                    <p className="text-[14px] md:text-[16px] text-[rgba(0,0,0,0.6)] mt-3 md:mt-4">
                      Posted on August 14, 2023
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 md:mt-8 text-center">
                <Button
                  variant="outline"
                  className="border border-[rgba(0,0,0,0.1)] px-[36px] md:px-[54px] py-3 md:py-4 h-auto md:h-[52px] rounded-[62px] text-[14px] md:text-[16px] font-medium"
                >
                  Load More Reviews
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'faqs' && (
            <div>
              <p className="text-[16px] text-[rgba(0,0,0,0.6)]">
                FAQs content will be displayed here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="container mx-auto px-4 py-8 md:py-16">
          <h2 className="text-[32px] md:text-[48px] font-bold text-black text-center mb-6 md:mb-12 leading-[36px] md:leading-normal">
            You might also like
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {relatedProducts.map((p) => (
              <HexFashionProductCard
                key={p.id}
                product={{
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                  price: p.sale_price || p.price,
                  compareAtPrice: p.sale_price ? p.price : undefined,
                  image: p.image,
                  stock_quantity: p.stock_quantity,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

