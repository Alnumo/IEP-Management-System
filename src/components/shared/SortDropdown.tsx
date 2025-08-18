import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PlanSortOptions } from '@/types/plans'

interface SortDropdownProps {
  sortOptions: PlanSortOptions
  onSortChange: (sort: PlanSortOptions) => void
}

const sortFields = [
  { key: 'name_ar', label: 'الاسم' },
  { key: 'created_at', label: 'تاريخ الإنشاء' },
  { key: 'final_price', label: 'السعر' },
  { key: 'duration_weeks', label: 'المدة' },
] as const

export const SortDropdown = ({ sortOptions, onSortChange }: SortDropdownProps) => {
  const currentSort = sortFields.find(field => field.key === sortOptions.field)
  
  const handleSortChange = (field: PlanSortOptions['field']) => {
    if (field === sortOptions.field) {
      // Toggle direction if same field
      onSortChange({
        field,
        direction: sortOptions.direction === 'asc' ? 'desc' : 'asc'
      })
    } else {
      // Default to ascending for new field
      onSortChange({
        field,
        direction: 'asc'
      })
    }
  }

  const getSortIcon = () => {
    if (sortOptions.direction === 'asc') return <ArrowUp className="h-4 w-4" />
    if (sortOptions.direction === 'desc') return <ArrowDown className="h-4 w-4" />
    return <ArrowUpDown className="h-4 w-4" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {getSortIcon()}
          ترتيب: {currentSort?.label || 'الاسم'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {sortFields.map((field) => (
          <DropdownMenuItem
            key={field.key}
            onClick={() => handleSortChange(field.key)}
            className="cursor-pointer flex items-center justify-between"
          >
            <span>{field.label}</span>
            {field.key === sortOptions.field && getSortIcon()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}