import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

type Role = 'admin' | 'manager' | 'viewer';

export function canSeeUsers(user: { role: Role }) {
  const isManager = user.role === 'manager';
  return user.role === 'admin' || isManager;
}

export function canRead(user: { hasRole: (r: Role) => boolean }) {
  return user.hasRole('viewer');
}

export const nav = [
  { label: 'Orders', to: '/orders' },
  { label: 'Users', to: '/admin/users', roles: ['admin'] },
];

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/orders" element={<Orders />} />
      <ProtectedRoute roles={['admin']}>
        <Route path="/admin/users" element={<Users />} />
      </ProtectedRoute>
      <ProtectedRoute roles={['admin']}>
        <Route path="/reports" element={<Reports />} />
      </ProtectedRoute>
    </Routes>
  );
}
