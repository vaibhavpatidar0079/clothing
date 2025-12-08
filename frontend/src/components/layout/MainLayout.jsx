import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const MainLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      {/* Add padding-top equal to Navbar height to prevent content jumping.
        Navbar is ~72px height (h-12 + py-4).
      */}
      <main className="flex-grow pt-[72px]">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;