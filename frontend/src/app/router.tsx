import { createBrowserRouter, useRouteError, type RouteObject } from 'react-router';
import { Navigate } from 'react-router';
import { Construction } from 'lucide-react';
import { EmptyState, ButtonLink } from '@/components/ui';
import { RequireRole, CustomerOnlyArea } from '@/auth/RequireRole';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { AdminLayout, DeliveryLayout } from '@/layouts/StaffLayouts';
import { HomePage } from '@/features/catalog/HomePage';
import { CategoriesPage, FavoritesPage, MenuPage } from '@/features/catalog/MenuPage';
import { OfferSectionPage } from '@/features/catalog/SpecialsRow';
import { AccountPage, NotificationsPage } from '@/features/account/AccountPage';
import { AddressesPage } from '@/features/account/AddressesPage';
import { SearchPage } from '@/features/catalog/SearchPage';
import { CreditsPage } from '@/features/catalog/CreditsPage';
import { LegalPage } from '@/features/legal/LegalPage';
import { ProductPage } from '@/features/catalog/ProductPage';
import { CartPage } from '@/features/cart/CartPage';
import { CheckoutPage } from '@/features/checkout/CheckoutPage';
import { ConfirmationPage } from '@/features/orders/ConfirmationPage';
import { AdminBillPage, CustomerBillPage } from '@/features/orders/Bill';
import { OrdersPage, TrackingPage } from '@/features/orders/TrackingPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { AdminDeliveryPartnersPage } from '@/features/admin/AdminDeliveryPartnersPage';
import { AdminOverviewPage } from '@/features/admin/AdminOverviewPage';
import { AdminDashboardPage } from '@/features/admin/AdminDashboardPage';
import { AdminNotificationsPage } from '@/features/admin/AdminNotificationsPage';
import { AdminMenuPage } from '@/features/admin/AdminMenuPage';
import { AdminProductFormPage } from '@/features/admin/AdminProductFormPage';
import { AdminCategoriesPage } from '@/features/admin/AdminCategoriesPage';
import { AdminOrderPage, AdminOrdersPage } from '@/features/admin/AdminOrdersPage';
import { AdminCustomerPage, AdminPartnerPage } from '@/features/admin/AdminPeoplePages';
import { AdminOfferSectionPage } from '@/features/admin/AdminSpecialsPage';
import { AdminOfferSectionsPage } from '@/features/admin/AdminOfferSectionsPage';
import { AdminBannersPage } from '@/features/admin/AdminBannersPage';
import { AdminCustomersPage } from '@/features/admin/AdminCustomersPage';
import { AdminPaymentsPage } from '@/features/admin/AdminPaymentsPage';
import { AdminReportsPage } from '@/features/admin/AdminReportsPage';
import { AdminSettingsPage } from '@/features/admin/AdminSettingsPage';
import { DeliveryHistoryPage, DeliveryHomePage, DeliveryOrderPage, DeliveryProfilePage } from '@/features/delivery/DeliveryHomePage';

const ComingSoon = ({ what }: { what: string }) => (
  <EmptyState icon={<Construction className="size-9" />} title={what} body="This screen is planned in docs/ROADMAP.md and not built yet." />
);

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },

  // Customer storefront — public browsing, login required to order.
  {
    element: <CustomerOnlyArea />,
    children: [
      {
        element: <CustomerLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'menu/:categorySlug?', element: <MenuPage /> },
          { path: 'categories', element: <CategoriesPage /> },
          { path: 'favorites', element: <FavoritesPage /> },
          { path: 'offers/:sectionId', element: <OfferSectionPage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'product/:slug', element: <ProductPage /> },
          { path: 'cart', element: <CartPage /> },
          { path: 'offers', element: <ComingSoon what="Offers" /> },
          { path: 'credits', element: <CreditsPage /> },
          { path: 'terms', element: <LegalPage kind="terms" /> },
          { path: 'privacy', element: <LegalPage kind="privacy" /> },
          {
            element: <RequireRole roles={['CUSTOMER']} />,
            children: [
              { path: 'orders', element: <OrdersPage /> },
              { path: 'orders/:orderId', element: <TrackingPage /> },
              { path: 'orders/:orderId/confirmed', element: <ConfirmationPage /> },
              { path: 'checkout', element: <CheckoutPage /> },
              { path: 'addresses', element: <AddressesPage /> },
              { path: 'notifications', element: <NotificationsPage /> },
            ],
          },
          // Guests see a "log in" prompt here instead of a redirect, like the app's Profile tab.
          { path: 'account', element: <AccountPage /> },
        ],
      },
    ],
  },

  // Bills are full-page and printable (no store header, no admin sidebar).
  { path: '/orders/:orderId/bill', element: <RequireRole roles={['CUSTOMER']} />, children: [{ index: true, element: <CustomerBillPage /> }] },
  { path: '/admin/orders/:orderId/bill', element: <RequireRole roles={['ADMIN']} />, children: [{ index: true, element: <AdminBillPage /> }] },

  // Kitchen admin
  {
    path: '/admin',
    element: <RequireRole roles={['ADMIN']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'kitchen', element: <AdminOverviewPage /> },
          { path: 'notifications', element: <AdminNotificationsPage /> },
          { path: 'orders', element: <AdminOrdersPage /> },
          { path: 'orders/:orderId', element: <AdminOrderPage /> },
          { path: 'customers/:customerId', element: <AdminCustomerPage /> },
          { path: 'delivery-partners/:partnerId', element: <AdminPartnerPage /> },
          { path: 'customers', element: <AdminCustomersPage /> },
          { path: 'payments', element: <AdminPaymentsPage /> },
          { path: 'reports', element: <AdminReportsPage /> },
          { path: 'settings', element: <AdminSettingsPage /> },
          { path: 'categories', element: <AdminCategoriesPage /> },
          { path: 'menu', element: <AdminMenuPage /> },
          { path: 'specials', element: <Navigate to="/admin/offer-sections" replace /> },
          { path: 'offer-sections', element: <AdminOfferSectionsPage /> },
          { path: 'banners', element: <AdminBannersPage /> },
          { path: 'offer-sections/:sectionId', element: <AdminOfferSectionPage /> },
          { path: 'menu/new', element: <AdminProductFormPage /> },
          { path: 'menu/:id', element: <AdminProductFormPage /> },
          { path: 'delivery-partners', element: <AdminDeliveryPartnersPage /> },
          { path: '*', element: <ComingSoon what="Admin section" /> },
        ],
      },
    ],
  },

  // Delivery partner
  {
    path: '/delivery',
    element: <RequireRole roles={['DELIVERY_PARTNER']} />,
    children: [
      {
        element: <DeliveryLayout />,
        children: [
          { index: true, element: <DeliveryHomePage /> },
          { path: 'orders/:orderId', element: <DeliveryOrderPage /> },
          { path: 'history', element: <DeliveryHistoryPage /> },
          { path: 'profile', element: <DeliveryProfilePage /> },
          { path: '*', element: <ComingSoon what="Delivery section" /> },
        ],
      },
    ],
  },

  {
    path: '*',
    element: <EmptyState icon={<Construction className="size-9" />} title="Page not found" body="The page you’re looking for doesn’t exist." action={<ButtonLink to="/">Go home</ButtonLink>} />,
  },
];

/** Shown instead of the raw crash screen if a page throws. */
function RouteError() {
  const err = useRouteError();
  if (import.meta.env.DEV) console.error(err);
  return (
    <div className="grid min-h-dvh place-items-center bg-surface p-6">
      <EmptyState
        icon={<Construction className="size-9" />}
        title="Something went wrong"
        body="This page hit an unexpected problem. Reloading usually fixes it."
        action={
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="min-h-12 rounded-[10px] bg-primary px-5 font-semibold text-surface hover:bg-[#9a4508]">
              Reload page
            </button>
            <ButtonLink to="/" variant="secondary">
              Go home
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}

export const router = createBrowserRouter([{ errorElement: <RouteError />, children: routes }]);
