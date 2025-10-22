// frontend/src/components/layout/Layout.tsx

import React, { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <Header />
      
      <div className="flex flex-1">
        <Sidebar />
        
        <main className="flex-1 flex flex-col">
          <div className="flex-1 p-6">
            {children}
          </div>
          
          <Footer />
        </main>
      </div>
    </div>
  );
};

export default Layout;
