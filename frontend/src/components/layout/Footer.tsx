// frontend/src/components/layout/Footer.tsx

import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            <p>© {currentYear} AICC Operations Management Platform</p>
            <p className="text-xs mt-1">
              콜봇/콜센터 솔루션 운영 관리 시스템
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-xs">
              버전 1.0.0
            </span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-[#B8E6B8] rounded-full"></div>
              <span className="text-xs">정상 운영중</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
