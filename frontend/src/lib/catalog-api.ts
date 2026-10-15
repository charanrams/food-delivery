import { queryOptions } from '@tanstack/react-query';
import type { CategoryDto, OfferSectionDto, ProductDto, SpecialDto } from '@a3/contracts';
import { api, ApiError, qs } from './api';

export const categoriesQuery = queryOptions({
  queryKey: ['categories'],
  queryFn: () => api.get<CategoryDto[]>('/categories'),
});

export const productsQuery = (params: { categorySlug?: string; search?: string; limit?: number } = {}) =>
  queryOptions({
    queryKey: ['products', params],
    queryFn: async () => (await api.page<ProductDto>(`/products${qs({ limit: 50, ...params })}`)).items,
  });

/** Live specials for Home (and cart pricing). Refreshes every 5 min so expired deals drop off. */
export const specialsQuery = queryOptions({
  queryKey: ['specials'],
  queryFn: () => api.get<SpecialDto[]>('/specials'),
  staleTime: 60_000,
  refetchInterval: 5 * 60_000,
});

/** "Popular Near You": real best sellers (last 30 days), topped up from the menu. */
export const popularQuery = queryOptions({
  queryKey: ['products', 'popular'],
  queryFn: () => api.get<ProductDto[]>('/products/popular'),
  staleTime: 5 * 60_000,
});

/** Admin-made Home rows (e.g. Weekend deals); their dishes are the specials with that sectionId. */
export const offerSectionsQuery = queryOptions({
  queryKey: ['offer-sections'],
  queryFn: () => api.get<OfferSectionDto[]>('/offer-sections'),
  staleTime: 60_000,
  refetchInterval: 5 * 60_000,
});

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ['product', slug],
    queryFn: async () => {
      try {
        return await api.get<ProductDto>(`/products/${encodeURIComponent(slug)}`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });

/** Cloudinary URL when the admin uploaded one; otherwise a local photo named after the slug. */
export const productImage = (p: Pick<ProductDto, 'images' | 'slug'>) => p.images[0] ?? `/images/food/${p.slug}.jpg`;
export const categoryImage = (c: Pick<CategoryDto, 'imageUrl' | 'slug'>) => c.imageUrl ?? `/images/food/${c.slug}.jpg`;

/** Small Cloudinary transform for thumbnails (no-op for local files). */
export const sized = (url: string, width: number) =>
  url.includes('res.cloudinary.com') ? url.replace('/upload/', `/upload/f_auto,q_auto,c_fill,w_${width}/`) : url;
