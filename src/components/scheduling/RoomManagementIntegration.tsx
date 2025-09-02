import React, { useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { 
  MapPin, Settings, Users, Clock, AlertCircle, 
  CheckCircle, Search, Filter, Plus, Edit2, 
  Trash2, RotateCcw, Wifi, Monitor, Volume2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRoomIntegration } from '@/hooks/useSchedulingIntegration'
import { cn } from '@/lib/utils'
import type { 
  TherapyRoom, 
  RoomAvailability, 
  RoomEquipment, 
  RoomBooking,
  ScheduledSession 
} from '@/types/scheduling'

/**
 * Room Management Integration Component
 * 
 * Manages room availability, equipment booking, and facility optimization
 * with real-time conflict detection and resource allocation.
 */

interface RoomManagementIntegrationProps {
  rooms: TherapyRoom[]
  availability: RoomAvailability[]
  bookings: RoomBooking[]
  equipment: RoomEquipment[]
  selectedDate: Date
  dateRange: { start: Date; end: Date }
  onRoomUpdate?: (room: TherapyRoom) => void
  onBookingCreate?: (booking: RoomBooking) => void
  onBookingUpdate?: (booking: RoomBooking) => void
  readOnly?: boolean
}

interface RoomFilter {
  capacity?: number
  sessionTypes?: string[]
  equipment?: string[]
  availability?: 'available' | 'booked' | 'maintenance'
  search?: string
}

interface RoomUtilization {
  room_id: string
  utilization_rate: number
  total_bookings: number
  available_slots: number
  maintenance_slots: number
  peak_hours: string[]
  revenue_potential: number
}

export function RoomManagementIntegration({
  rooms,
  availability,
  bookings,
  equipment,
  selectedDate,
  dateRange,
  onRoomUpdate,
  onBookingCreate,
  onBookingUpdate,
  readOnly = false
}: RoomManagementIntegrationProps) {
  const { language, isRTL } = useLanguage()
  const locale = language === 'ar' ? ar : enUS
  const { mutate: updateRoomSystem, isPending } = useRoomIntegration()

  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('grid')
  const [filter, setFilter] = useState<RoomFilter>({})
  const [selectedRoom, setSelectedRoom] = useState<TherapyRoom | null>(null)
  const [editingBooking, setEditingBooking] = useState<RoomBooking | null>(null)
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false)
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false)

  // Calculate room utilization metrics
  const roomUtilization = useMemo(() => {
    const utilizationMap = new Map<string, RoomUtilization>()

    rooms.forEach(room => {
      const roomBookings = bookings.filter(b => b.room_id === room.id)
      const roomAvailability = availability.filter(a => a.room_id === room.id)
      
      const totalSlots = roomAvailability.length
      const bookedSlots = roomBookings.filter(b => b.booking_status === 'confirmed').length
      const maintenanceSlots = roomAvailability.filter(a => a.availability_status === 'maintenance').length
      
      const utilizationRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0

      // Calculate peak hours
      const hourCounts = new Map<string, number>()
      roomBookings.forEach(booking => {
        const hour = booking.start_time.split(':')[0]
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
      })

      const peakHours = Array.from(hourCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour]) => `${hour}:00`)

      utilizationMap.set(room.id, {
        room_id: room.id,
        utilization_rate: utilizationRate,
        total_bookings: bookedSlots,
        available_slots: totalSlots - bookedSlots - maintenanceSlots,
        maintenance_slots: maintenanceSlots,
        peak_hours: peakHours,
        revenue_potential: bookedSlots * (room.hourly_rate || 0)
      })
    })

    return utilizationMap
  }, [rooms, bookings, availability])

  // Filter rooms based on current filter settings
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      // Search filter
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase()
        const roomName = (room.name_ar || room.name_en || '').toLowerCase()
        const roomCode = (room.room_code || '').toLowerCase()
        if (!roomName.includes(searchTerm) && !roomCode.includes(searchTerm)) {
          return false
        }
      }

      // Capacity filter
      if (filter.capacity && room.capacity < filter.capacity) {
        return false
      }

      // Session types filter
      if (filter.sessionTypes?.length && !filter.sessionTypes.some(type => 
        room.supported_session_types?.includes(type)
      )) {
        return false
      }

      // Equipment filter
      if (filter.equipment?.length && !filter.equipment.every(eq => 
        room.available_equipment?.includes(eq)
      )) {
        return false
      }

      // Availability filter
      if (filter.availability) {
        const roomAvailability = availability.filter(a => a.room_id === room.id)
        const hasStatus = roomAvailability.some(a => a.availability_status === filter.availability)
        if (!hasStatus) return false
      }

      return true
    })
  }, [rooms, filter, availability])

  // Handle room booking
  const handleRoomBooking = useCallback(async (roomId: string, bookingData: Partial<RoomBooking>) => {
    try {
      const booking: RoomBooking = {
        id: `booking-${Date.now()}`,
        room_id: roomId,
        session_id: bookingData.session_id || '',
        booking_date: bookingData.booking_date || format(selectedDate, 'yyyy-MM-dd'),
        start_time: bookingData.start_time || '09:00',
        end_time: bookingData.end_time || '10:00',
        booking_status: 'pending',
        booked_by: bookingData.booked_by || '',
        booking_purpose: bookingData.booking_purpose || '',
        required_equipment: bookingData.required_equipment || [],
        setup_requirements: bookingData.setup_requirements || '',
        notes: bookingData.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await updateRoomSystem(booking)
      onBookingCreate?.(booking)

    } catch (error) {
      console.error('Failed to create room booking:', error)
    }
  }, [selectedDate, updateRoomSystem, onBookingCreate])

  // Handle room availability update
  const handleAvailabilityUpdate = useCallback(async (roomId: string, availabilityData: Partial<RoomAvailability>) => {
    try {
      const roomAvailability: RoomAvailability = {
        id: `availability-${Date.now()}`,
        room_id: roomId,
        available_date: availabilityData.available_date || format(selectedDate, 'yyyy-MM-dd'),
        start_time: availabilityData.start_time || '08:00',
        end_time: availabilityData.end_time || '18:00',
        availability_status: availabilityData.availability_status || 'available',
        booking_slots: availabilityData.booking_slots || 8,
        maintenance_notes: availabilityData.maintenance_notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await updateRoomSystem(roomAvailability)

    } catch (error) {
      console.error('Failed to update room availability:', error)
    }
  }, [selectedDate, updateRoomSystem])

  // Get room status color
  const getRoomStatusColor = (roomId: string) => {
    const utilization = roomUtilization.get(roomId)
    if (!utilization) return 'bg-gray-100 text-gray-800'

    if (utilization.utilization_rate >= 90) return 'bg-red-100 text-red-800'
    if (utilization.utilization_rate >= 70) return 'bg-yellow-100 text-yellow-800'
    if (utilization.utilization_rate >= 40) return 'bg-blue-100 text-blue-800'
    return 'bg-green-100 text-green-800'
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {language === 'ar' ? 'إدارة الغرف والموارد' : 'Room & Resource Management'}
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">{language === 'ar' ? 'شبكة' : 'Grid'}</SelectItem>
                  <SelectItem value="list">{language === 'ar' ? 'قائمة' : 'List'}</SelectItem>
                  <SelectItem value="calendar">{language === 'ar' ? 'تقويم' : 'Calendar'}</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={showEquipmentDialog} onOpenChange={setShowEquipmentDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-1" />
                    {language === 'ar' ? 'المعدات' : 'Equipment'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <EquipmentManagementPanel
                    equipment={equipment}
                    rooms={rooms}
                    onEquipmentUpdate={(eq) => console.log('Equipment update:', eq)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={language === 'ar' ? 'البحث عن غرفة...' : 'Search rooms...'}
                value={filter.search || ''}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className="w-48"
              />
            </div>

            <Select
              value={filter.capacity?.toString() || ''}
              onValueChange={(value) => setFilter({ ...filter, capacity: value ? parseInt(value) : undefined })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={language === 'ar' ? 'السعة' : 'Capacity'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{language === 'ar' ? 'أي سعة' : 'Any capacity'}</SelectItem>
                <SelectItem value="1">{language === 'ar' ? '1+' : '1+'}</SelectItem>
                <SelectItem value="5">{language === 'ar' ? '5+' : '5+'}</SelectItem>
                <SelectItem value="10">{language === 'ar' ? '10+' : '10+'}</SelectItem>
                <SelectItem value="20">{language === 'ar' ? '20+' : '20+'}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter.availability || ''}
              onValueChange={(value: any) => setFilter({ ...filter, availability: value || undefined })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{language === 'ar' ? 'أي حالة' : 'Any status'}</SelectItem>
                <SelectItem value="available">{language === 'ar' ? 'متاح' : 'Available'}</SelectItem>
                <SelectItem value="booked">{language === 'ar' ? 'محجوز' : 'Booked'}</SelectItem>
                <SelectItem value="maintenance">{language === 'ar' ? 'صيانة' : 'Maintenance'}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter({})}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
            </Button>
          </div>

          {/* Room Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <MapPin className="w-8 h-8 text-blue-500" />
              <div>
                <div className="font-semibold">{filteredRooms.length}</div>
                <div className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'إجمالي الغرف' : 'Total Rooms'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <div className="font-semibold">
                  {Array.from(roomUtilization.values()).reduce((sum, util) => sum + util.available_slots, 0)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'فترات متاحة' : 'Available Slots'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Users className="w-8 h-8 text-orange-500" />
              <div>
                <div className="font-semibold">
                  {Array.from(roomUtilization.values()).reduce((sum, util) => sum + util.total_bookings, 0)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'حجوزات نشطة' : 'Active Bookings'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Settings className="w-8 h-8 text-purple-500" />
              <div>
                <div className="font-semibold">
                  {Array.from(roomUtilization.values()).reduce((sum, util) => sum + util.maintenance_slots, 0)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'قيد الصيانة' : 'In Maintenance'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rooms Display */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map(room => {
            const utilization = roomUtilization.get(room.id)
            const roomBookings = bookings.filter(b => b.room_id === room.id)

            return (
              <Card key={room.id} className="relative overflow-hidden">
                <div className={cn(
                  'absolute top-0 right-0 w-2 h-full',
                  getRoomStatusColor(room.id)
                )} />

                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {room.name_ar || room.name_en}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {room.room_code}
                      </div>
                    </div>
                    
                    <Badge className={cn('text-xs', getRoomStatusColor(room.id))}>
                      {utilization ? `${utilization.utilization_rate.toFixed(0)}%` : '0%'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Room Details */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span>{room.capacity}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span>{room.floor_number}F</span>
                    </div>
                  </div>

                  {/* Equipment Icons */}
                  {room.available_equipment && room.available_equipment.length > 0 && (
                    <div className="flex items-center gap-2">
                      {room.available_equipment.slice(0, 4).map((eq, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {getEquipmentIcon(eq)}
                        </Badge>
                      ))}
                      {room.available_equipment.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{room.available_equipment.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Session Types */}
                  {room.supported_session_types && room.supported_session_types.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'يدعم:' : 'Supports:'} {room.supported_session_types.slice(0, 2).join(', ')}
                      {room.supported_session_types.length > 2 && '...'}
                    </div>
                  )}

                  {/* Utilization Bar */}
                  {utilization && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{language === 'ar' ? 'الاستغلال' : 'Utilization'}</span>
                        <span>{utilization.utilization_rate.toFixed(0)}%</span>
                      </div>
                      <Progress value={utilization.utilization_rate} className="h-1" />
                    </div>
                  )}

                  {/* Today's Bookings */}
                  <div className="space-y-1">
                    <div className="text-xs font-medium">
                      {language === 'ar' ? 'حجوزات اليوم' : "Today's Bookings"}
                    </div>
                    {roomBookings.length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'لا توجد حجوزات' : 'No bookings'}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {roomBookings.slice(0, 2).map(booking => (
                          <div key={booking.id} className="flex items-center justify-between text-xs">
                            <span>{booking.start_time} - {booking.end_time}</span>
                            <Badge 
                              variant={booking.booking_status === 'confirmed' ? 'default' : 'secondary'} 
                              className="text-xs"
                            >
                              {booking.booking_status}
                            </Badge>
                          </div>
                        ))}
                        {roomBookings.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{roomBookings.length - 2} {language === 'ar' ? 'أكثر' : 'more'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRoom(room)
                        setShowAvailabilityDialog(true)
                      }}
                      disabled={readOnly}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {language === 'ar' ? 'توفر' : 'Availability'}
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => handleRoomBooking(room.id, { booking_purpose: 'manual' })}
                      disabled={readOnly || (utilization?.available_slots || 0) === 0}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {language === 'ar' ? 'حجز' : 'Book'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredRooms.map(room => {
                const utilization = roomUtilization.get(room.id)
                return (
                  <div key={room.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-3 h-3 rounded-full',
                        getRoomStatusColor(room.id).replace('bg-', 'bg-').replace('text-', '')
                      )} />
                      
                      <div>
                        <div className="font-medium">
                          {room.name_ar || room.name_en}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {room.room_code} • {room.capacity} {language === 'ar' ? 'شخص' : 'people'} • 
                          {room.floor_number}F
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {utilization?.utilization_rate.toFixed(0) || 0}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'استغلال' : 'utilization'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button size="sm">
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Room Availability Dialog */}
      <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' ? 'إدارة توفر الغرفة' : 'Room Availability Management'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRoom && (
            <RoomAvailabilityManager
              room={selectedRoom}
              availability={availability.filter(a => a.room_id === selectedRoom.id)}
              bookings={bookings.filter(b => b.room_id === selectedRoom.id)}
              onAvailabilityUpdate={handleAvailabilityUpdate}
              onBookingUpdate={onBookingUpdate}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Equipment Management Panel Component
interface EquipmentManagementPanelProps {
  equipment: RoomEquipment[]
  rooms: TherapyRoom[]
  onEquipmentUpdate: (equipment: RoomEquipment) => void
}

function EquipmentManagementPanel({ 
  equipment, 
  rooms, 
  onEquipmentUpdate 
}: EquipmentManagementPanelProps) {
  const { language } = useLanguage()

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>
          {language === 'ar' ? 'إدارة المعدات' : 'Equipment Management'}
        </DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory">
            {language === 'ar' ? 'المخزون' : 'Inventory'}
          </TabsTrigger>
          <TabsTrigger value="assignments">
            {language === 'ar' ? 'التوزيع' : 'Assignments'}
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            {language === 'ar' ? 'الصيانة' : 'Maintenance'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {equipment.map(item => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getEquipmentIcon(item.name_en || item.name_ar)}
                      <span className="font-medium">
                        {item.name_ar || item.name_en}
                      </span>
                    </div>
                    <Badge variant={item.status === 'available' ? 'default' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Serial: {item.serial_number}</div>
                    <div>
                      {language === 'ar' ? 'الموقع:' : 'Location:'} {
                        rooms.find(r => r.id === item.room_id)?.name_ar || 
                        rooms.find(r => r.id === item.room_id)?.name_en || 
                        'Unassigned'
                      }
                    </div>
                    {item.last_maintenance && (
                      <div>
                        {language === 'ar' ? 'آخر صيانة:' : 'Last maintenance:'} {
                          format(new Date(item.last_maintenance), 'MMM dd, yyyy')
                        }
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <div className="text-center text-muted-foreground">
            {language === 'ar' ? 'إدارة توزيع المعدات على الغرف' : 'Manage equipment assignment to rooms'}
          </div>
        </TabsContent>

        <TabsContent value="maintenance">
          <div className="text-center text-muted-foreground">
            {language === 'ar' ? 'جدولة وتتبع صيانة المعدات' : 'Schedule and track equipment maintenance'}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Room Availability Manager Component
interface RoomAvailabilityManagerProps {
  room: TherapyRoom
  availability: RoomAvailability[]
  bookings: RoomBooking[]
  onAvailabilityUpdate: (roomId: string, data: Partial<RoomAvailability>) => void
  onBookingUpdate?: (booking: RoomBooking) => void
}

function RoomAvailabilityManager({ 
  room, 
  availability, 
  bookings, 
  onAvailabilityUpdate,
  onBookingUpdate 
}: RoomAvailabilityManagerProps) {
  const { language } = useLanguage()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <MapPin className="w-6 h-6" />
        <div>
          <div className="font-medium">{room.name_ar || room.name_en}</div>
          <div className="text-sm text-muted-foreground">
            {room.room_code} • {language === 'ar' ? 'سعة' : 'Capacity'}: {room.capacity}
          </div>
        </div>
      </div>

      <Tabs defaultValue="availability" className="w-full">
        <TabsList>
          <TabsTrigger value="availability">
            {language === 'ar' ? 'التوفر' : 'Availability'}
          </TabsTrigger>
          <TabsTrigger value="bookings">
            {language === 'ar' ? 'الحجوزات' : 'Bookings'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="availability">
          <div className="grid grid-cols-7 gap-2">
            {availability.map(slot => (
              <Card key={slot.id} className="p-3">
                <div className="text-xs text-center">
                  <div className="font-medium">{slot.start_time} - {slot.end_time}</div>
                  <Badge variant={slot.availability_status === 'available' ? 'default' : 'secondary'} className="text-xs">
                    {slot.availability_status}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bookings">
          <div className="space-y-2">
            {bookings.map(booking => (
              <div key={booking.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{booking.start_time} - {booking.end_time}</div>
                  <div className="text-sm text-muted-foreground">{booking.booking_purpose}</div>
                </div>
                <Badge variant={booking.booking_status === 'confirmed' ? 'default' : 'secondary'}>
                  {booking.booking_status}
                </Badge>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper function to get equipment icons
function getEquipmentIcon(equipmentName: string) {
  const name = equipmentName?.toLowerCase() || ''
  
  if (name.includes('computer') || name.includes('laptop')) {
    return <Monitor className="w-3 h-3" />
  }
  if (name.includes('wifi') || name.includes('internet')) {
    return <Wifi className="w-3 h-3" />
  }
  if (name.includes('sound') || name.includes('audio')) {
    return <Volume2 className="w-3 h-3" />
  }
  
  return <Settings className="w-3 h-3" />
}