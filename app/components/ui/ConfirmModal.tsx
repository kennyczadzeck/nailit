import React, { useState } from 'react';
import { Button } from './Button';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { 
  XMarkIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  requiresTextConfirmation?: boolean;
  confirmationText?: string;
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText = 'Cancel',
  type = 'warning',
  requiresTextConfirmation = false,
  confirmationText = '',
  loading = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isConfirmEnabled, setIsConfirmEnabled] = useState(!requiresTextConfirmation);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsConfirmEnabled(!requiresTextConfirmation || value === confirmationText);
  };

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
    }
  };

  const handleClose = () => {
    setInputValue('');
    setIsConfirmEnabled(!requiresTextConfirmation);
    onClose();
  };

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconColor: 'text-red-600',
          iconBg: 'bg-red-100',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
          titleColor: 'text-red-900'
        };
      case 'warning':
        return {
          iconColor: 'text-amber-600',
          iconBg: 'bg-amber-100',
          confirmButton: 'bg-amber-600 hover:bg-amber-700 text-white',
          titleColor: 'text-amber-900'
        };
      case 'info':
        return {
          iconColor: 'text-blue-600',
          iconBg: 'bg-blue-100',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
          titleColor: 'text-blue-900'
        };
      default:
        return {
          iconColor: 'text-amber-600',
          iconBg: 'bg-amber-100',
          confirmButton: 'bg-amber-600 hover:bg-amber-700 text-white',
          titleColor: 'text-amber-900'
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = type === 'danger' ? TrashIcon : type === 'warning' ? ArchiveBoxIcon : ExclamationTriangleIcon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md sm:max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <Card className="shadow-xl border-0">
          <CardHeader className="border-b border-gray-200 p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${styles.iconBg}`}>
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${styles.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className={`text-base sm:text-lg font-semibold ${styles.titleColor} pr-2`}>
                  {title}
                </CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClose}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 min-h-[40px] min-w-[40px] p-2"
              >
                <XMarkIcon className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-gray-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
              {description}
            </div>
          </CardContent>
          <div className="flex flex-col sm:flex-row gap-3 p-4 sm:p-6 pt-0 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="w-full sm:w-auto order-2 sm:order-1 min-h-[44px]"
            >
              {cancelText}
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={loading}
              className={`w-full sm:w-auto order-1 sm:order-2 min-h-[44px] ${
                type === 'danger' 
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                  : type === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                  : ''
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}; 