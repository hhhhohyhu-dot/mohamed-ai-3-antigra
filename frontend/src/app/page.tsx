"use client";

import { useContext } from 'react';
import { Dashboard } from '@/components/Dashboard';
import Login from '@/components/Login';
import { AuthContext } from '@/context/AuthContext';

export default function Home() {
  const { user, token, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token || !user) {
    return <Login />;
  }

  return (
    <main>
      <Dashboard />
    </main>
  );
}
