/**
 * Message Search Component
 * Advanced search and filtering functionality for parent messaging
 * مكون البحث في الرسائل مع وظائف التصفية المتقدمة
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Calendar,
  User,
  MessageSquare,
  X,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MessageThread, ParentMessage, Language } from '@/types/parent';

interface MessageSearchProps {
  threads: MessageThread[];
  onFilteredResults: (filteredThreads: MessageThread[]) => void;
  className?: string;
}

interface SearchFilters {
  query: string;
  therapist: string;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'quarter';
  messageType: 'all' | 'unread' | 'read' | 'attachments';
  specialization: string;
}

const MessageSearch: React.FC<MessageSearchProps> = ({
  threads,
  onFilteredResults,
  className
}) => {
  const { language, isRTL } = useLanguage();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    therapist: 'all',
    dateRange: 'all',
    messageType: 'all',
    specialization: 'all'
  });

  // Extract unique therapists and specializations for filter options
  const { therapists, specializations } = useMemo(() => {
    const therapistSet = new Set<string>();
    const specializationSet = new Set<string>();

    threads.forEach(thread => {
      const therapistName = language === 'ar' ? 
        thread.therapist_name_ar : 
        thread.therapist_name_en;
      const specialization = language === 'ar' ? 
        thread.specialization_ar : 
        thread.specialization_en;

      if (therapistName) therapistSet.add(therapistName);
      if (specialization) specializationSet.add(specialization);
    });

    return {
      therapists: Array.from(therapistSet).sort(),
      specializations: Array.from(specializationSet).sort()
    };
  }, [threads, language]);

  // Filter threads based on current filters
  const filteredThreads = useMemo(() => {
    let filtered = [...threads];

    // Text search filter
    if (filters.query.trim()) {
      const searchTerm = filters.query.toLowerCase();
      filtered = filtered.filter(thread => {
        const therapistName = language === 'ar' ? 
          thread.therapist_name_ar?.toLowerCase() : 
          thread.therapist_name_en?.toLowerCase();
        const specialization = language === 'ar' ? 
          thread.specialization_ar?.toLowerCase() : 
          thread.specialization_en?.toLowerCase();
        
        // Search in thread metadata
        const threadMatch = therapistName?.includes(searchTerm) || 
                           specialization?.includes(searchTerm);
        
        // Search in messages
        const messageMatch = thread.messages?.some(message => {
          const messageText = language === 'ar' ? 
            message.message_text_ar?.toLowerCase() : 
            message.message_text_en?.toLowerCase();
          return messageText?.includes(searchTerm);
        });

        return threadMatch || messageMatch;
      });
    }

    // Therapist filter
    if (filters.therapist !== 'all') {
      filtered = filtered.filter(thread => {
        const therapistName = language === 'ar' ? 
          thread.therapist_name_ar : 
          thread.therapist_name_en;
        return therapistName === filters.therapist;
      });
    }

    // Specialization filter
    if (filters.specialization !== 'all') {
      filtered = filtered.filter(thread => {
        const specialization = language === 'ar' ? 
          thread.specialization_ar : 
          thread.specialization_en;
        return specialization === filters.specialization;
      });
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const getDateThreshold = () => {
        switch (filters.dateRange) {
          case 'today':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
          case 'week':
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            return weekAgo;
          case 'month':
            const monthAgo = new Date(now);
            monthAgo.setMonth(now.getMonth() - 1);
            return monthAgo;
          case 'quarter':
            const quarterAgo = new Date(now);
            quarterAgo.setMonth(now.getMonth() - 3);
            return quarterAgo;
          default:
            return new Date(0);
        }
      };

      const threshold = getDateThreshold();
      filtered = filtered.filter(thread => {
        if (!thread.last_message_date) return false;
        return new Date(thread.last_message_date) >= threshold;
      });
    }

    // Message type filter
    if (filters.messageType !== 'all') {
      switch (filters.messageType) {
        case 'unread':
          filtered = filtered.filter(thread => thread.unread_count > 0);
          break;
        case 'read':
          filtered = filtered.filter(thread => thread.unread_count === 0);
          break;
        case 'attachments':
          filtered = filtered.filter(thread => 
            thread.messages?.some(message => 
              message.attachment_urls && message.attachment_urls.length > 0
            )
          );
          break;
      }
    }

    return filtered;
  }, [threads, filters, language]);

  // Update parent component with filtered results
  React.useEffect(() => {
    onFilteredResults(filteredThreads);
  }, [filteredThreads, onFilteredResults]);

  const updateFilter = useCallback((key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      query: '',
      therapist: 'all',
      dateRange: 'all',
      messageType: 'all',
      specialization: 'all'
    });
  }, []);

  const getActiveFilterCount = useMemo(() => {
    let count = 0;
    if (filters.query.trim()) count++;
    if (filters.therapist !== 'all') count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.messageType !== 'all') count++;
    if (filters.specialization !== 'all') count++;
    return count;
  }, [filters]);

  const getDateRangeLabel = (value: string) => {
    const labels = {
      ar: {
        all: 'جميع التواريخ',
        today: 'اليوم',
        week: 'آخر أسبوع',
        month: 'آخر شهر',
        quarter: 'آخر 3 أشهر'
      },
      en: {
        all: 'All dates',
        today: 'Today',
        week: 'Past week',
        month: 'Past month',
        quarter: 'Past 3 months'
      }
    };
    return labels[language][value as keyof typeof labels.ar] || value;
  };

  const getMessageTypeLabel = (value: string) => {
    const labels = {
      ar: {
        all: 'جميع الرسائل',
        unread: 'غير مقروءة',
        read: 'مقروءة',
        attachments: 'تحتوي على مرفقات'
      },
      en: {
        all: 'All messages',
        unread: 'Unread',
        read: 'Read',
        attachments: 'With attachments'
      }
    };
    return labels[language][value as keyof typeof labels.ar] || value;
  };

  return (
    <Card className={cn("w-full", className)} dir={isRTL ? 'rtl' : 'ltr'}>
      <CardContent className="p-4 space-y-4">
        {/* Basic Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={language === 'ar' ? 
                'البحث في الرسائل والمحادثات...' : 
                'Search messages and conversations...'}
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="shrink-0"
          >
            <Filter className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'تصفية' : 'Filter'}
            {getActiveFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                {getActiveFilterCount}
              </Badge>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 ml-2 transition-transform",
              showAdvanced && "rotate-180"
            )} />
          </Button>

          {getActiveFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <>
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Therapist Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  <User className="inline h-4 w-4 mr-1" />
                  {language === 'ar' ? 'المعالج' : 'Therapist'}
                </label>
                <Select 
                  value={filters.therapist} 
                  onValueChange={(value) => updateFilter('therapist', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر المعالج' : 'Select therapist'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {language === 'ar' ? 'جميع المعالجين' : 'All therapists'}
                    </SelectItem>
                    {therapists.map((therapist) => (
                      <SelectItem key={therapist} value={therapist}>
                        {therapist}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Specialization Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  <MessageSquare className="inline h-4 w-4 mr-1" />
                  {language === 'ar' ? 'التخصص' : 'Specialization'}
                </label>
                <Select 
                  value={filters.specialization} 
                  onValueChange={(value) => updateFilter('specialization', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر التخصص' : 'Select specialization'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {language === 'ar' ? 'جميع التخصصات' : 'All specializations'}
                    </SelectItem>
                    {specializations.map((specialization) => (
                      <SelectItem key={specialization} value={specialization}>
                        {specialization}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  {language === 'ar' ? 'الفترة الزمنية' : 'Date Range'}
                </label>
                <Select 
                  value={filters.dateRange} 
                  onValueChange={(value) => updateFilter('dateRange', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['all', 'today', 'week', 'month', 'quarter'] as const).map((range) => (
                      <SelectItem key={range} value={range}>
                        {getDateRangeLabel(range)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Message Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  <MessageSquare className="inline h-4 w-4 mr-1" />
                  {language === 'ar' ? 'نوع الرسالة' : 'Message Type'}
                </label>
                <Select 
                  value={filters.messageType} 
                  onValueChange={(value) => updateFilter('messageType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['all', 'unread', 'read', 'attachments'] as const).map((type) => (
                      <SelectItem key={type} value={type}>
                        {getMessageTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between pt-2 text-sm text-gray-600">
              <span>
                {language === 'ar' ? 
                  `${filteredThreads.length} محادثة من أصل ${threads.length}` :
                  `${filteredThreads.length} of ${threads.length} conversations`}
              </span>
              
              {getActiveFilterCount > 0 && (
                <div className="flex items-center gap-2">
                  {filters.therapist !== 'all' && (
                    <Badge variant="outline" className="text-xs">
                      {filters.therapist}
                    </Badge>
                  )}
                  {filters.specialization !== 'all' && (
                    <Badge variant="outline" className="text-xs">
                      {filters.specialization}
                    </Badge>
                  )}
                  {filters.dateRange !== 'all' && (
                    <Badge variant="outline" className="text-xs">
                      {getDateRangeLabel(filters.dateRange)}
                    </Badge>
                  )}
                  {filters.messageType !== 'all' && (
                    <Badge variant="outline" className="text-xs">
                      {getMessageTypeLabel(filters.messageType)}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MessageSearch;