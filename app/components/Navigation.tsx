'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '../lib/utils';
import { useProject } from './ProjectContext';
import { 
  HomeIcon,
  ClockIcon,
  FlagIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  FolderIcon,
  ArchiveBoxIcon,
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Timeline', href: '/timeline', icon: ClockIcon },
  { name: 'Flagged Items', href: '/flagged', icon: FlagIcon },
  { name: 'Project Settings', href: '/settings', icon: Cog6ToothIcon },
];

export const Navigation: React.FC = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { currentProject, projects, loading, switchProject } = useProject();
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleProjectSwitch = (projectId: string) => {
    switchProject(projectId);
    setIsProjectDropdownOpen(false);
    setIsMobileMenuOpen(false);
    
    // Refresh the current page to load new project data
    window.location.reload();
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/welcome' });
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#34A853] rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                    <path d="M6 18l3-3 3 3"/>
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900">NailIt</span>
              </Link>
            </div>

            {/* Project Switcher - Desktop */}
            {session && projects.length > 0 && (
              <div className="ml-6 hidden sm:flex items-center relative">
                <button 
                  onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md border border-gray-200 min-h-[44px]"
                >
                  <FolderIcon className="w-4 h-4" />
                  <span className="text-sm font-medium max-w-32 truncate">
                    {loading ? 'Loading...' : currentProject?.name || 'Select Project'}
                  </span>
                  {currentProject?.status === 'ARCHIVED' && (
                    <ArchiveBoxIcon className="w-3 h-3 text-amber-500" />
                  )}
                  <ChevronDownIcon className="w-4 h-4" />
                </button>

                {/* Project Dropdown */}
                {isProjectDropdownOpen && (
                  <div className="absolute left-0 top-12 w-72 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      Switch Project
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleProjectSwitch(project.id)}
                          className={cn(
                            "block w-full text-left px-3 py-3 text-sm hover:bg-gray-100 min-h-[44px]",
                            currentProject?.id === project.id ? "bg-gray-50" : ""
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FolderIcon className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">{project.name}</span>
                              {project.status === 'ARCHIVED' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
                                  <ArchiveBoxIcon className="w-3 h-3" />
                                  Archived
                                </span>
                              )}
                            </div>
                            {currentProject?.id === project.id && (
                              <div className="w-2 h-2 bg-[#34A853] rounded-full"></div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Links - Desktop */}
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium min-h-[44px]',
                      isActive
                        ? 'border-[#34A853] text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden sm:flex items-center relative">
            <button 
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md min-h-[44px]"
            >
              {session?.user?.image ? (
                <img 
                  src={session.user.image} 
                  alt={session.user.name || 'User'} 
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <UserCircleIcon className="w-6 h-6" />
              )}
              <span className="text-sm font-medium hidden lg:block">
                {session?.user?.name || 'Account'}
              </span>
              <ChevronDownIcon className="w-4 h-4" />
            </button>

            {/* Desktop Dropdown Menu */}
            {isAccountDropdownOpen && (
              <div className="absolute right-0 top-12 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
                  {session?.user?.email}
                </div>
                <Link 
                  href="/account" 
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 min-h-[44px]"
                  onClick={() => setIsAccountDropdownOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <UserCircleIcon className="w-4 h-4" />
                    Account Settings
                  </div>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 min-h-[44px]"
                >
                  <div className="flex items-center gap-2">
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    Sign Out
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#34A853] min-h-[44px] min-w-[44px]"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" />
              ) : (
                <Bars3Icon className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden">
          <div className="fixed inset-0 z-40 bg-black bg-opacity-25" onClick={closeMobileMenu} />
          <div className="fixed inset-y-0 left-0 z-50 w-full max-w-sm bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#34A853] rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                    <path d="M6 18l3-3 3 3"/>
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900">NailIt</span>
              </div>
              <button
                onClick={closeMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px]"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile Project Switcher */}
            {session && projects.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Current Project
                </div>
                <button 
                  onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                  className="flex items-center justify-between w-full px-3 py-3 text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200 min-h-[44px]"
                >
                  <div className="flex items-center gap-2">
                    <FolderIcon className="w-4 h-4" />
                    <span className="text-sm font-medium truncate">
                      {loading ? 'Loading...' : currentProject?.name || 'Select Project'}
                    </span>
                    {currentProject?.status === 'ARCHIVED' && (
                      <ArchiveBoxIcon className="w-3 h-3 text-amber-500" />
                    )}
                  </div>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>

                {/* Mobile Project Dropdown */}
                {isProjectDropdownOpen && (
                  <div className="mt-2 bg-gray-50 rounded-md">
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleProjectSwitch(project.id)}
                        className={cn(
                          "block w-full text-left px-3 py-3 text-sm hover:bg-gray-100 first:rounded-t-md last:rounded-b-md min-h-[44px]",
                          currentProject?.id === project.id ? "bg-gray-100" : ""
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FolderIcon className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{project.name}</span>
                            {project.status === 'ARCHIVED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
                                <ArchiveBoxIcon className="w-3 h-3" />
                                Archived
                              </span>
                            )}
                          </div>
                          {currentProject?.id === project.id && (
                            <div className="w-2 h-2 bg-[#34A853] rounded-full"></div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mobile Navigation Links */}
            <div className="px-4 py-3 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={cn(
                      'flex items-center px-3 py-3 rounded-md text-base font-medium min-h-[44px]',
                      isActive
                        ? 'bg-[#34A853] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Mobile User Section */}
            {session && (
              <div className="border-t border-gray-200 px-4 py-3">
                <div className="flex items-center mb-3">
                  {session.user?.image ? (
                    <img 
                      src={session.user.image} 
                      alt={session.user.name || 'User'} 
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <UserCircleIcon className="w-10 h-10 text-gray-400" />
                  )}
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-900">
                      {session.user?.name || 'User'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {session.user?.email}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Link 
                    href="/account" 
                    onClick={closeMobileMenu}
                    className="flex items-center px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 min-h-[44px]"
                  >
                    <UserCircleIcon className="w-5 h-5 mr-3" />
                    Account Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 min-h-[44px]"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {(isAccountDropdownOpen || isProjectDropdownOpen) && !isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => {
            setIsAccountDropdownOpen(false);
            setIsProjectDropdownOpen(false);
          }}
        />
      )}
    </nav>
  );
}; 