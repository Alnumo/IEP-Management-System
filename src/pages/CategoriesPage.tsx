import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Search, Grid, List } from 'lucide-react'
import { useAllCategories, useDeleteCategory } from '@/hooks/useCategories'
import { useLanguage } from '@/contexts/LanguageContext'
import { PlanCategory } from '@/types/categories'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const CategoriesPage = () => {
  const navigate = useNavigate()
  const { language, isRTL } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data: categories = [], isLoading, error } = useAllCategories()
  const deleteCategory = useDeleteCategory()

  // Filter categories based on search term
  const filteredCategories = categories.filter(category => {
    const searchLower = searchTerm.toLowerCase()
    return (
      category.name_ar.toLowerCase().includes(searchLower) ||
      (category.name_en && category.name_en.toLowerCase().includes(searchLower)) ||
      (category.description_ar && category.description_ar.toLowerCase().includes(searchLower)) ||
      (category.description_en && category.description_en.toLowerCase().includes(searchLower))
    )
  })

  const handleEdit = (category: PlanCategory) => {
    navigate(`/categories/edit/${category.id}`)
  }

  const handleDelete = async (category: PlanCategory) => {
    if (confirm(language === 'ar' 
      ? `هل أنت متأكد من حذف الفئة "${category.name_ar}"؟`
      : `Are you sure you want to delete "${category.name_ar}"?`
    )) {
      try {
        await deleteCategory.mutateAsync(category.id)
      } catch (error) {
        console.error('Failed to delete category:', error)
        // Error handled through console logging
      }
    }
  }

  const CategoryCard = ({ category }: { category: PlanCategory }) => (
    <Card key={category.id} className={`hover:shadow-md transition-shadow ${!category.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className={`pb-3 ${isRTL ? 'text-right' : ''}`}>
        <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: category.color_code }}
            />
            <CardTitle className={`text-lg ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? category.name_ar : category.name_en || category.name_ar}
            </CardTitle>
          </div>
          <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleDelete(category)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {((language === 'ar' && category.name_en) || (language === 'en' && category.name_ar)) && (
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? category.name_en : category.name_ar}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {(category.description_ar || category.description_en) && (
          <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? category.description_ar : category.description_en || category.description_ar}
          </p>
        )}
        
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Badge variant={category.is_active ? "default" : "secondary"}>
              {category.is_active 
                ? (language === 'ar' ? 'نشط' : 'Active')
                : (language === 'ar' ? 'غير نشط' : 'Inactive')
              }
            </Badge>
            
            <span className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الترتيب:' : 'Order:'} {category.sort_order}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const CategoryListItem = ({ category }: { category: PlanCategory }) => (
    <Card key={category.id} className={`${!category.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="py-4">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0" 
              style={{ backgroundColor: category.color_code }}
            />
            
            <div className={`${isRTL ? 'text-right' : ''}`}>
              <h3 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? category.name_ar : category.name_en || category.name_ar}
              </h3>
              {((language === 'ar' && category.name_en) || (language === 'en' && category.name_ar)) && (
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? category.name_en : category.name_ar}
                </p>
              )}
              {(category.description_ar || category.description_en) && (
                <p className={`text-sm text-muted-foreground mt-1 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? category.description_ar : category.description_en || category.description_ar}
                </p>
              )}
            </div>
          </div>
          
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Badge variant={category.is_active ? "default" : "secondary"}>
              {category.is_active 
                ? (language === 'ar' ? 'نشط' : 'Active')
                : (language === 'ar' ? 'غير نشط' : 'Inactive')
              }
            </Badge>
            
            <span className={`text-xs text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الترتيب:' : 'Order:'} {category.sort_order}
            </span>
            
            <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleDelete(category)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`${language === 'ar' ? 'font-arabic' : ''}`}>
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`text-red-500 ${language === 'ar' ? 'font-arabic' : ''}`}>
          {language === 'ar' ? 'خطأ في تحميل الفئات' : 'Error loading categories'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header - Forced Positioning */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4" style={{ direction: 'ltr' }}>
        {/* Button - Force to LEFT */}
        <div className="order-2 sm:order-1" style={{ textAlign: 'left' }}>
          <Button onClick={() => navigate('/categories/add')} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{language === 'ar' ? 'إضافة فئة' : 'Add Category'}</span>
            <span className="sm:hidden">{language === 'ar' ? 'إضافة' : 'Add'}</span>
          </Button>
        </div>
        
        {/* Heading - Force to RIGHT */}
        <div className="order-1 sm:order-2" style={{ textAlign: 'right' }}>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`} style={{ direction: 'rtl' }}>
            {language === 'ar' ? 'إدارة الفئات' : 'Category Management'}
          </h1>
        </div>
      </div>

      {/* Search and View Options */}
      <div className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4`} />
          <Input
            type="text"
            placeholder={language === 'ar' ? 'البحث في الفئات...' : 'Search categories...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${isRTL ? 'pr-10 font-arabic' : 'pl-10'}`}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>
        
        <div className={`flex gap-1 self-start sm:self-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Categories Grid/List */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''} text-sm sm:text-base`}>
            {searchTerm
              ? (language === 'ar' ? 'لا توجد فئات مطابقة للبحث' : 'No categories match your search')
              : (language === 'ar' ? 'لا توجد فئات. ابدأ بإضافة فئة جديدة' : 'No categories yet. Start by adding a new category')
            }
          </p>
          {!searchTerm && (
            <Button className="mt-4" onClick={() => navigate('/categories/add')}>
              <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'إضافة فئة' : 'Add Category'}
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          : "space-y-3 sm:space-y-4"
        }>
          {filteredCategories.map(category => (
            viewMode === 'grid' 
              ? <CategoryCard key={category.id} category={category} />
              : <CategoryListItem key={category.id} category={category} />
          ))}
        </div>
      )}

      {/* Summary */}
      <div className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
        {language === 'ar' 
          ? `إجمالي الفئات: ${categories.length} (نشط: ${categories.filter(c => c.is_active).length})`
          : `Total categories: ${categories.length} (Active: ${categories.filter(c => c.is_active).length})`
        }
      </div>
    </div>
  )
}