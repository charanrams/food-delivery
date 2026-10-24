import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, type SessionUser } from '@/auth/AuthContext';
import { CartProvider, priceCart } from '@/features/cart/CartContext';
import type { ProductDto } from '@a3/contracts';
import { routes } from './router';

function renderAt(path: string, user: SessionUser | null = null) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider initialUser={user}>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return router;
}

describe('role-based routing', () => {
  it('sends guests to login for admin pages', () => {
    const router = renderAt('/admin');
    expect(router.state.location.pathname).toBe('/login');
  });

  it('keeps a customer out of the admin area', () => {
    const router = renderAt('/admin', { id: '1', name: 'Ravi', role: 'CUSTOMER' });
    expect(router.state.location.pathname).toBe('/');
  });

  it('sends a delivery partner from the storefront to their dashboard', async () => {
    const router = renderAt('/', { id: '2', name: 'Suresh R.', role: 'DELIVERY_PARTNER' });
    expect(router.state.location.pathname).toBe('/delivery');
    expect(await screen.findByText(/Hi, Suresh/)).toBeInTheDocument();
  });

  it('lets an admin into the dashboard', async () => {
    renderAt('/admin', { id: '3', name: 'Anitha', role: 'ADMIN' });
    expect(await screen.findByRole('heading', { level: 1, name: /, Anitha$/ })).toBeInTheDocument();
  });

  it('keeps the live kitchen board at /admin/kitchen', async () => {
    renderAt('/admin/kitchen', { id: '3', name: 'Anitha', role: 'ADMIN' });
    expect(await screen.findByRole('heading', { name: 'Kitchen board' })).toBeInTheDocument();
  });

  it('lets guests browse the storefront', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Freshly Prepared/ })).toBeInTheDocument();
  });
});

const dish = (id: string, pricePaise: number, variants: ProductDto['variants'] = []): ProductDto => ({
  id, categoryId: 'c', name: id, slug: id, description: '', images: [], pricePaise, isAvailable: true, isArchived: false, variants,
});

describe('cart pricing', () => {
  it('prices the sample cart: ₹786 items, free delivery, 5% GST to the paisa', () => {
    const biryani = dish('biryani', 24900, [{ id: 'full', name: 'Full', pricePaise: 24900, isAvailable: true }]);
    const { totals } = priceCart([
      { product: biryani, variantId: 'full', quantity: 2 },
      { product: dish('paneer', 21900), quantity: 1 },
      { product: dish('jamun', 6900), quantity: 1 },
    ]);
    expect(totals).toEqual({ itemTotalPaise: 78600, discountPaise: 0, deliveryFeePaise: 0, taxPaise: 3930, totalPaise: 82530 });
  });

  it('charges delivery below the free-delivery threshold', () => {
    expect(priceCart([{ product: dish('dosa', 9900), quantity: 1 }]).totals.deliveryFeePaise).toBe(3900);
  });
});
