import { Search, X, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PlanFilters } from '@/types/plans'
import { useCategories } from '@/hooks/useCategories'

interface SearchFilterProps {
  filters: PlanFilters
  onFiltersChange: (filters: PlanFilters) => void
  placeholder?: string
}

export const SearchFilter = ({ 
  filters, 
  onFiltersChange, 
  placeholder = "البحث..." 
}: SearchFilterProps) => {
  const { data: categories = [] } = useCategories()

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined })
  }

  const handleCategoryChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      category_id: value === 'all' ? undefined : value 
    })
  }

  const handleStatusChange = (value: string) => {
    let is_active: boolean | undefined
    if (value === 'active') is_active = true
    else if (value === 'inactive') is_active = false
    else is_active = undefined
    
    onFiltersChange({ ...filters, is_active })
  }

  const handleFeaturedChange = (value: string) => {
    let is_featured: boolean | undefined
    if (value === 'featured') is_featured = true
    else if (value === 'not_featured') is_featured = false
    else is_featured = undefined
    
    onFiltersChange({ ...filters, is_featured })
  }

  const handlePriceRangeChange = (min: number | undefined, max: number | undefined) => {
    onFiltersChange({ 
      ...filters, 
      price_min: min, 
      price_max: max 
    })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Main search bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pr-10 text-right"
            dir="rtl"
          />
        </div>
        
        {/* Quick filters */}
        <div className="flex gap-2">
          <Select
            value={filters.category_id || 'all'}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="جميع التصنيفات" />
            </SelectTrigger>
            <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
              <SelectItem value="all">جميع التصنيفات</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color_code }}
                    />
                    <span>{category.name_ar}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <SlidersHorizontal className="h-4 w-4 ml-2" />
                تصفية متقدمة
                {activeFiltersCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -left-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-4 space-y-4">
              <DropdownMenuLabel className="text-base font-arabic">
                التصفية المتقدمة
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Status filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">الحالة</label>
                <Select
                  value={
                    filters.is_active === true ? 'active' :
                    filters.is_active === false ? 'inactive' : 'all'
                  }
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الحالات" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Featured filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">البرامج المميزة</label>
                <Select
                  value={
                    filters.is_featured === true ? 'featured' :
                    filters.is_featured === false ? 'not_featured' : 'all'
                  }
                  onValueChange={handleFeaturedChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="جميع البرامج" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] bg-white border shadow-lg max-h-60 overflow-y-auto" position="popper" sideOffset={4}>
                    <SelectItem value="all">جميع البرامج</SelectItem>
                    <SelectItem value="featured">مميز فقط</SelectItem>
                    <SelectItem value="not_featured">غير مميز</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">النطاق السعري (ر.س)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="من"
                    value={filters.price_min || ''}
                    onChange={(e) => handlePriceRangeChange(
                      e.target.value ? Number(e.target.value) : undefined,
                      filters.price_max
                    )}
                    className="text-center"
                  />
                  <Input
                    type="number"
                    placeholder="إلى"
                    value={filters.price_max || ''}
                    onChange={(e) => handlePriceRangeChange(
                      filters.price_min,
                      e.target.value ? Number(e.target.value) : undefined
                    )}
                    className="text-center"
                  />
                </div>
              </div>

              {/* Clear filters */}
              {activeFiltersCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearFilters}
                    className="w-full"
                  >
                    <X className="h-4 w-4 ml-2" />
                    مسح جميع المرشحات
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              البحث: {filters.search}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleSearchChange('')}
              />
            </Badge>
          )}
          
          {filters.category_id && (
            <Badge variant="secondary" className="gap-1">
              التصنيف: {categories.find(c => c.id === filters.category_id)?.name_ar}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleCategoryChange('all')}
              />
            </Badge>
          )}
          
          {filters.is_active !== undefined && (
            <Badge variant="secondary" className="gap-1">
              الحالة: {filters.is_active ? 'نشط' : 'غير نشط'}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleStatusChange('all')}
              />
            </Badge>
          )}
          
          {filters.is_featured !== undefined && (
            <Badge variant="secondary" className="gap-1">
              {filters.is_featured ? 'مميز' : 'غير مميز'}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleFeaturedChange('all')}
              />
            </Badge>
          )}
          
          {(filters.price_min || filters.price_max) && (
            <Badge variant="secondary" className="gap-1">
              السعر: {filters.price_min || 0} - {filters.price_max || '∞'} ر.س
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handlePriceRangeChange(undefined, undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}