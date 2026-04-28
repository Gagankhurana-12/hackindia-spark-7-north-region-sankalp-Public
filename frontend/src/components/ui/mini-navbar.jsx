import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronDown, Sparkles } from 'lucide-react';

const AnimatedNavLink = ({ to, children }) => {
  const defaultTextColor = 'text-gray-700';
  const hoverTextColor = 'text-[#6C3CE1]';
  const textSizeClass = 'text-sm font-semibold';

  return (
    <Link to={to} className={`group relative inline-block overflow-hidden h-5 flex items-center ${textSizeClass}`}>
      <div className="flex flex-col transition-transform duration-400 ease-out transform group-hover:-translate-y-1/2">
        <span className={defaultTextColor}>{children}</span>
        <span className={hoverTextColor}>{children}</span>
      </div>
    </Link>
  );
};

export function Navbar({ childAvatar, handleLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState('rounded-full');
  const shapeTimeoutRef = useRef(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (shapeTimeoutRef.current) {
      clearTimeout(shapeTimeoutRef.current);
    }

    if (isOpen) {
      setHeaderShapeClass('rounded-xl');
    } else {
      shapeTimeoutRef.current = setTimeout(() => {
        setHeaderShapeClass('rounded-full');
      }, 300);
    }

    return () => {
      if (shapeTimeoutRef.current) {
        clearTimeout(shapeTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const logoElement = (
    <Link to="/video-feed" className="flex items-center gap-2 cursor-pointer">
      <span className="font-khoj text-2xl text-[#6C3CE1] font-black tracking-tighter">KHOJ</span>
    </Link>
  );

  const navLinksData = [
    { label: 'Home', to: '/video-feed' },
    { label: 'Explore', to: '/video-feed' },
    { label: 'History', to: '/watch-history' },
    { label: (
      <span className="flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-yellow-400"/> Spark Chat
      </span>
    ), to: '/ai-mentor' },
  ];

  return (
    <header className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50
                       flex flex-col items-center
                       pl-6 pr-6 py-3 backdrop-blur-2xl backdrop-saturate-150
                       ${headerShapeClass}
                       border border-white/70 bg-white/55 shadow-[0_8px_32px_rgba(167,139,250,0.18),0_2px_8px_rgba(255,107,107,0.08)]
                       w-[calc(100%-2rem)] sm:w-auto
                       transition-[border-radius] duration-300 ease-in-out`}>

      <div className="flex items-center justify-between w-full gap-x-6 sm:gap-x-12">
        <div className="flex items-center">
           {logoElement}
        </div>

        <nav className="hidden sm:flex items-center space-x-4 sm:space-x-8 text-sm">
          {navLinksData.map((link, idx) => (
            <AnimatedNavLink key={idx} to={link.to}>
              {link.label}
            </AnimatedNavLink>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-4 sm:gap-6 text-gray-700">
          <Bell className="h-5 w-5 cursor-pointer hover:text-[#6C3CE1] transition-colors" />

          <div className="relative group cursor-pointer flex items-center gap-2">
            <img src={childAvatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover ring-2 ring-white/80" />
            <ChevronDown className="h-4 w-4 group-hover:rotate-180 transition-transform" />

            <div className="absolute top-full right-0 mt-4 w-48 bg-white/90 backdrop-blur-xl border border-white/60 rounded-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl">
              <Link to="/child-profile" className="flex items-center px-4 py-2 hover:bg-violet-50 text-sm text-gray-700">Profile</Link>
              <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 hover:bg-red-50 text-sm text-red-500">Sign out</button>
            </div>
          </div>
        </div>

        <button className="sm:hidden flex items-center justify-center w-8 h-8 text-gray-700 focus:outline-none" onClick={toggleMenu} aria-label={isOpen ? 'Close Menu' : 'Open Menu'}>
          {isOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          )}
        </button>
      </div>

      <div className={`sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden
                       ${isOpen ? 'max-h-[1000px] opacity-100 pt-4' : 'max-h-0 opacity-0 pt-0 pointer-events-none'}`}>
        <nav className="flex flex-col items-center space-y-4 text-base w-full">
          {navLinksData.map((link, idx) => (
            <Link key={idx} to={link.to} className="text-gray-700 hover:text-[#6C3CE1] transition-colors w-full text-center font-semibold">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col items-center space-y-4 mt-4 w-full border-t border-white/40 pt-4">
          <Link to="/child-profile" className="text-gray-700 hover:text-[#6C3CE1]">Profile</Link>
          <button onClick={handleLogout} className="text-red-500 hover:text-red-600">Sign out</button>
        </div>
      </div>
    </header>
  );
}
