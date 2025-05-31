import React, { useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  isOpen,
  onClose,
  title,
  description,
  type = 'info',
  duration = 5000
}) => {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          titleColor: 'text-green-800',
          textColor: 'text-green-700'
        };
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          titleColor: 'text-red-800',
          textColor: 'text-red-700'
        };
      case 'warning':
        return {
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          iconColor: 'text-amber-600',
          titleColor: 'text-amber-800',
          textColor: 'text-amber-700'
        };
      case 'info':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-800',
          textColor: 'text-blue-700'
        };
      default:
        return {
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-600',
          titleColor: 'text-gray-800',
          textColor: 'text-gray-700'
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = type === 'success' ? CheckCircleIcon : ExclamationTriangleIcon;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className={`max-w-sm w-full ${styles.bgColor} ${styles.borderColor} border rounded-lg shadow-lg`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Icon className={`h-5 w-5 ${styles.iconColor}`} />
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className={`text-sm font-medium ${styles.titleColor}`}>
                {title}
              </p>
              {description && (
                <p className={`mt-1 text-sm ${styles.textColor}`}>
                  {description}
                </p>
              )}
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={onClose}
                className={`rounded-md inline-flex ${styles.textColor} hover:${styles.titleColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600`}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 