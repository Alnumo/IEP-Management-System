/**
 * Lead Kanban Board Component
 * @description Kanban-style dashboard for managing leads with drag-and-drop status updates
 * @author James (Dev Agent)
 * @date 2025-09-03
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeads, useUpdateLeadStatus } from '@/hooks/useLeads';
import { LeadDetailsDialog } from './LeadDetailsDialog';
import type { Lead, LeadStatus, LeadFilterOptions, KanbanColumn } from '@/types/crm';

interface LeadKanbanBoardProps {
  className?: string;
}

// Define Kanban columns with bilingual support
const KANBAN_COLUMNS: Omit<KanbanColumn, 'leads' | 'count'>[] = [
  {
    id: 'new_booking',
    title: 'New Bookings',
    title_ar: 'حجوزات جديدة',
    color: 'bg-blue-50 border-blue-200 text-blue-700'
  },
  {
    id: 'confirmed',
    title: 'Confirmed',
    title_ar: 'مؤكدة',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700'
  },
  {
    id: 'evaluation_complete',
    title: 'Evaluation Complete',
    title_ar: 'تم التقييم',
    color: 'bg-purple-50 border-purple-200 text-purple-700'
  },
  {
    id: 'registered',
    title: 'Registered',
    title_ar: 'مسجل',
    color: 'bg-green-50 border-green-200 text-green-700'
  },
  {
    id: 'archived',
    title: 'Archived',
    title_ar: 'مؤرشف',
    color: 'bg-gray-50 border-gray-200 text-gray-700'
  }
];

export function LeadKanbanBoard({ className }: LeadKanbanBoardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<LeadFilterOptions>({});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // API hooks
  const { data: leads = [], isLoading, error } = useLeads({
    ...filters,
    search: searchTerm
  });
  const updateStatusMutation = useUpdateLeadStatus();

  // Organize leads into columns
  const kanbanData: KanbanColumn[] = useMemo(() => {
    return KANBAN_COLUMNS.map(column => {
      const columnLeads = leads.filter(lead => lead.status === column.id);
      return {
        ...column,
        leads: columnLeads,
        count: columnLeads.length
      };
    });
  }, [leads]);

  // Handle drag and drop
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Check if dropped outside valid droppable area
    if (!destination) return;

    // Check if position changed
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    const leadId = draggableId;
    const newStatus = destination.droppableId as LeadStatus;

    try {
      await updateStatusMutation.mutateAsync({
        leadId,
        status: newStatus,
        notes: `Status updated via Kanban board to ${newStatus}`
      });
    } catch (error) {
      console.error('Failed to update lead status:', error);
      // In a real app, show error notification
    }
  };

  // Handle lead card click
  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailsOpen(true);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-2">
            {t('crm.kanban.error', 'Failed to load leads')}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {t('crm.kanban.title', 'Lead Management')}
          </h1>
          <p className="text-muted-foreground">
            {t('crm.kanban.subtitle', 'Track and manage potential students through the conversion funnel')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            {t('common.filter', 'Filter')}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('common.export', 'Export')}
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('crm.kanban.addLead', 'Add Lead')}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('crm.kanban.search', 'Search leads...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
        />
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 pb-4" style={{ minWidth: '1200px' }}>
            {kanbanData.map((column) => (
              <div key={column.id} className="flex-1 min-w-[280px]">
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {isRTL ? column.title_ar : column.title}
                      </CardTitle>
                      <Badge variant="secondary" className="h-6 min-w-[24px]">
                        {column.count}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-3 min-h-[200px] transition-colors ${
                            snapshot.isDraggingOver ? 'bg-muted/50 rounded-lg' : ''
                          }`}
                        >
                          {isLoading ? (
                            // Loading skeletons
                            Array.from({ length: 3 }).map((_, index) => (
                              <Card key={index} className="p-3">
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-3/4" />
                                  <Skeleton className="h-3 w-1/2" />
                                  <Skeleton className="h-3 w-2/3" />
                                </div>
                              </Card>
                            ))
                          ) : (
                            column.leads.map((lead, index) => (
                              <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                {(provided, snapshot) => (
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`cursor-pointer transition-all hover:shadow-md ${
                                      snapshot.isDragging ? 'shadow-lg rotate-3' : ''
                                    }`}
                                    onClick={() => handleLeadClick(lead)}
                                  >
                                    <CardContent className="p-4">
                                      <div className="space-y-3">
                                        {/* Parent and Child Names */}
                                        <div>
                                          <h4 className="font-medium text-sm">
                                            {isRTL && lead.parent_name_ar 
                                              ? lead.parent_name_ar 
                                              : lead.parent_name}
                                          </h4>
                                          <p className="text-xs text-muted-foreground">
                                            {t('crm.lead.child', 'Child')}: {' '}
                                            {isRTL && lead.child_name_ar 
                                              ? lead.child_name_ar 
                                              : lead.child_name}
                                          </p>
                                        </div>

                                        {/* Contact Info */}
                                        <div className="text-xs text-muted-foreground">
                                          <p>{lead.parent_contact}</p>
                                          {lead.child_dob && (
                                            <p>
                                              {t('crm.lead.age', 'Age')}: {' '}
                                              {Math.floor((new Date().getTime() - new Date(lead.child_dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} {t('common.years', 'years')}
                                            </p>
                                          )}
                                        </div>

                                        {/* Evaluation Date */}
                                        {lead.evaluation_date && (
                                          <div className="text-xs">
                                            <Badge variant="outline" className="text-xs">
                                              {new Date(lead.evaluation_date).toLocaleDateString(
                                                isRTL ? 'ar-SA' : 'en-US',
                                                { 
                                                  month: 'short', 
                                                  day: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                }
                                              )}
                                            </Badge>
                                          </div>
                                        )}

                                        {/* Assigned User */}
                                        {lead.assigned_to && (
                                          <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                              <AvatarFallback className="text-xs">
                                                {lead.assigned_to.slice(0, 2).toUpperCase()}
                                              </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs text-muted-foreground">
                                              {t('crm.lead.assigned', 'Assigned')}
                                            </span>
                                          </div>
                                        )}

                                        {/* Source */}
                                        {lead.source && (
                                          <Badge variant="secondary" className="text-xs w-fit">
                                            {lead.source}
                                          </Badge>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                          
                          {/* Empty state */}
                          {!isLoading && column.leads.length === 0 && (
                            <div className="flex items-center justify-center h-32 text-muted-foreground">
                              <p className="text-sm text-center">
                                {t('crm.kanban.empty', 'No leads in this stage')}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Lead Details Dialog */}
      {selectedLead && (
        <LeadDetailsDialog
          lead={selectedLead}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
        />
      )}
    </div>
  );
}