import { MoreHorizontal, Star, Clock, Calendar, Users, Eye, Edit, Copy, Trash2 } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TherapyPlan } from '@/types/plans'
import { formatCurrency } from '@/lib/utils'

interface PlanCardProps {
  plan: TherapyPlan
  onEdit?: (id: string) => void
  onView?: (id: string) => void
  onDuplicate?: (id: string) => void
  onDelete?: (id: string) => void
}

export const PlanCard = ({ plan, onEdit, onView, onDuplicate, onDelete }: PlanCardProps) => {
  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-lg" dir="rtl">
      {plan.is_featured && (
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            <Star className="w-3 h-3 ml-1 fill-current" />
            مميز
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: plan.category?.color_code || '#3B82F6' }}
            />
            <Badge variant="outline" className="text-xs">
              {plan.category?.name_ar || 'غير محدد'}
            </Badge>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onView?.(plan.id)} className="cursor-pointer">
                <Eye className="w-4 h-4 ml-2" />
                عرض التفاصيل
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(plan.id)} className="cursor-pointer">
                <Edit className="w-4 h-4 ml-2" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate?.(plan.id)} className="cursor-pointer">
                <Copy className="w-4 h-4 ml-2" />
                نسخ
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete?.(plan.id)}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="space-y-1">
          <h3 className="font-semibold text-lg leading-tight font-arabic line-clamp-2">
            {plan.name_ar}
          </h3>
          {plan.name_en && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {plan.name_en}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{plan.duration_weeks} أسابيع</span>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{plan.sessions_per_week} جلسة/أسبوع</span>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{plan.total_sessions} جلسة إجمالي</span>
          </div>
          
          {plan.target_age_min && plan.target_age_max && (
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="text-muted-foreground text-xs">العمر:</span>
              <span className="text-xs">{plan.target_age_min}-{plan.target_age_max} سنة</span>
            </div>
          )}
        </div>

        {plan.description_ar && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {plan.description_ar}
          </p>
        )}

        {/* Status indicator */}
        <div className="flex items-center space-x-2 space-x-reverse">
          <div className={`w-2 h-2 rounded-full ${plan.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-xs text-muted-foreground">
            {plan.is_active ? 'نشط' : 'غير نشط'}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-right">
              {plan.discount_percentage > 0 && (
                <div className="text-sm text-muted-foreground line-through">
                  {formatCurrency(plan.total_price)}
                </div>
              )}
              <div className="text-lg font-bold text-primary">
                {formatCurrency(plan.final_price)}
              </div>
              <div className="text-xs text-muted-foreground">
                ({formatCurrency(plan.price_per_session)} للجلسة)
              </div>
            </div>
            
            {plan.discount_percentage > 0 && (
              <Badge variant="destructive" className="text-xs">
                خصم {plan.discount_percentage}%
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onView?.(plan.id)}
            >
              عرض
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onEdit?.(plan.id)}
            >
              تعديل
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}