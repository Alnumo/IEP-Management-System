// Assessment Tool Registry Component
import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { Search, Filter, Clock, Users, Star, BookOpen, Brain, Activity, Zap, Target, Volume2 } from 'lucide-react'

// Standardized Assessment Tools Database
const ASSESSMENT_TOOLS_DATABASE = {
  aba: [
    {
      id: 'vb-mapp',
      name: 'Verbal Behavior Milestones Assessment and Placement Program',
      acronym: 'VB-MAPP',
      version: '2.0',
      age_range: { minimum_months: 0, maximum_months: 192 },
      administration_time: 120,
      purpose: ['Language development assessment', 'Educational placement', 'Curriculum planning', 'Progress tracking'],
      areas_assessed: ['Mand', 'Tact', 'Listener', 'Visual Perceptual', 'Independent Play', 'Social Behavior', 'Motor Imitation'],
      reliability: 'High (r = .90-.98)',
      validity: 'Well-established',
      cost_category: 'moderate',
      training_required: 'Formal VB-MAPP training recommended',
      publisher: 'AVB Press',
      publication_year: 2008,
      description: 'Comprehensive language and social skills assessment for children with autism.',
      strengths: ['Comprehensive coverage', 'Clear placement guidelines', 'Strong psychometric properties'],
      limitations: ['Time-intensive', 'Requires specific training', 'ABA-focused approach'],
      cultural_considerations: ['English-Spanish versions available', 'Consider cultural communication patterns']
    },
    {
      id: 'ablls-r',
      name: 'Assessment of Basic Language and Learning Skills - Revised',
      acronym: 'ABLLS-R',
      version: 'Revised',
      age_range: { minimum_months: 0, maximum_months: 144 },
      administration_time: 90,
      purpose: ['Skill assessment', 'Program planning', 'Progress monitoring', 'Curriculum development'],
      areas_assessed: ['Basic Learner Skills', 'Academic Skills', 'Self-Help Skills', 'Motor Skills'],
      reliability: 'Good (r = .85-.92)',
      validity: 'Content validity established',
      cost_category: 'moderate',
      training_required: 'Basic ABA knowledge required',
      publisher: 'Behavior Analysts, Inc.',
      publication_year: 2006,
      description: 'Criterion-referenced assessment for individuals with developmental disabilities.',
      strengths: ['Detailed skill breakdown', 'Clear teaching objectives', 'Flexible administration'],
      limitations: ['Less comprehensive than VB-MAPP', 'Requires ABA background', 'Limited normative data'],
      cultural_considerations: ['Adaptation needed for different cultures', 'Consider language variants']
    },
    {
      id: 'afls',
      name: 'Assessment of Functional Living Skills',
      acronym: 'AFLS',
      version: '1.0',
      age_range: { minimum_months: 36, maximum_months: 1200 },
      administration_time: 150,
      purpose: ['Functional skills assessment', 'Independent living planning', 'Transition planning'],
      areas_assessed: ['Basic Living Skills', 'Home Skills', 'Community Participation', 'School Skills', 'Vocational Skills', 'Independent Living'],
      reliability: 'Good (r = .88-.95)',
      validity: 'Strong functional validity',
      cost_category: 'high',
      training_required: 'AFLS training certification required',
      publisher: 'AFLS LLC',
      publication_year: 2014,
      description: 'Comprehensive functional skills assessment for individuals with developmental disabilities.',
      strengths: ['Functional focus', 'Age-appropriate across lifespan', 'Detailed skill analysis'],
      limitations: ['Expensive', 'Time-intensive', 'Requires specialized training'],
      cultural_considerations: ['Consider cultural living standards', 'Adapt for local customs']
    },
    {
      id: 'm-chat-r',
      name: 'Modified Checklist for Autism in Toddlers - Revised',
      acronym: 'M-CHAT-R',
      version: 'Revised',
      age_range: { minimum_months: 16, maximum_months: 30 },
      administration_time: 10,
      purpose: ['Autism screening', 'Early detection', 'Risk identification', 'Developmental monitoring'],
      areas_assessed: ['Social Communication', 'Restricted/Repetitive Behaviors', 'Sensory Responses', 'Joint Attention', 'Imitation'],
      reliability: 'Good (r = .85-.94)',
      validity: 'Strong predictive validity for autism',
      cost_category: 'free',
      training_required: 'Basic training in autism screening',
      publisher: 'Diana Robins, Deborah Fein, Marianne Barton',
      publication_year: 2009,
      description: 'Free autism screening tool for toddlers 16-30 months with follow-up interview.',
      strengths: ['Free and widely available', 'Quick administration', 'Strong research base', 'High sensitivity'],
      limitations: ['Screening only, not diagnostic', 'False positives possible', 'Limited age range'],
      cultural_considerations: ['Available in multiple languages', 'Cultural adaptation may be needed', 'Consider cultural communication patterns']
    }
  ],
  speech: [
    {
      id: 'celf-5',
      name: 'Clinical Evaluation of Language Fundamentals - Fifth Edition',
      acronym: 'CELF-5',
      version: '5th Edition',
      age_range: { minimum_months: 60, maximum_months: 252 },
      administration_time: 60,
      purpose: ['Language disorder diagnosis', 'Educational planning', 'Progress monitoring', 'Research'],
      areas_assessed: ['Receptive Language', 'Expressive Language', 'Language Content', 'Language Structure', 'Working Memory'],
      reliability: 'Excellent (r = .87-.97)',
      validity: 'Strong construct validity',
      cost_category: 'high',
      training_required: 'Graduate-level training in speech-language pathology',
      publisher: 'Pearson',
      publication_year: 2013,
      description: 'Gold standard comprehensive language assessment for school-age children and young adults.',
      strengths: ['Excellent psychometrics', 'Comprehensive coverage', 'Strong normative sample'],
      limitations: ['Expensive', 'Requires SLP training', 'Time-intensive'],
      cultural_considerations: ['English and Spanish versions', 'Consider dialectal variations', 'Cultural bias in some subtests']
    },
    {
      id: 'pls-5',
      name: 'Preschool Language Scales - Fifth Edition',
      acronym: 'PLS-5',
      version: '5th Edition',
      age_range: { minimum_months: 0, maximum_months: 95 },
      administration_time: 45,
      purpose: ['Early language assessment', 'Developmental screening', 'Eligibility determination', 'Progress monitoring'],
      areas_assessed: ['Auditory Comprehension', 'Expressive Communication', 'Total Language'],
      reliability: 'Excellent (r = .90-.96)',
      validity: 'Well-established',
      cost_category: 'high',
      training_required: 'Graduate training in speech-language pathology or related field',
      publisher: 'Pearson',
      publication_year: 2011,
      description: 'Comprehensive developmental language assessment for birth to 7 years, 11 months.',
      strengths: ['Birth to school age', 'Strong psychometrics', 'Caregiver questionnaire included'],
      limitations: ['Expensive', 'Professional training required', 'Limited cultural adaptations'],
      cultural_considerations: ['English and Spanish versions', 'Consider cultural communication styles', 'Caregiver questionnaire culturally sensitive']
    },
    {
      id: 'ppvt-5',
      name: 'Peabody Picture Vocabulary Test - Fifth Edition',
      acronym: 'PPVT-5',
      version: '5th Edition',
      age_range: { minimum_months: 30, maximum_months: 1080 },
      administration_time: 15,
      purpose: ['Receptive vocabulary screening', 'Intellectual assessment support', 'Progress monitoring'],
      areas_assessed: ['Receptive Vocabulary'],
      reliability: 'Excellent (r = .94-.97)',
      validity: 'Strong concurrent validity',
      cost_category: 'moderate',
      training_required: 'Basic assessment training',
      publisher: 'Pearson',
      publication_year: 2019,
      description: 'Quick, efficient assessment of receptive vocabulary for individuals from 2.5 to 90+ years.',
      strengths: ['Quick administration', 'Wide age range', 'Non-verbal response', 'Strong psychometrics'],
      limitations: ['Only assesses receptive vocabulary', 'Cultural bias possible', 'Not diagnostic alone'],
      cultural_considerations: ['Consider cultural vocabulary exposure', 'Picture stimuli may be culturally biased', 'Spanish version available']
    }
  ],
  occupational: [
    {
      id: 'bot-2',
      name: 'Bruininks-Oseretsky Test of Motor Proficiency - Second Edition',
      acronym: 'BOT-2',
      version: '2nd Edition',
      age_range: { minimum_months: 48, maximum_months: 252 },
      administration_time: 90,
      purpose: ['Motor skills assessment', 'Educational planning', 'Research', 'Progress monitoring'],
      areas_assessed: ['Fine Motor Precision', 'Fine Motor Integration', 'Manual Dexterity', 'Bilateral Coordination', 'Balance', 'Running Speed & Agility', 'Upper-Limb Coordination', 'Strength'],
      reliability: 'Excellent (r = .90-.97)',
      validity: 'Strong construct validity',
      cost_category: 'high',
      training_required: 'Graduate training in occupational or physical therapy',
      publisher: 'Pearson',
      publication_year: 2005,
      description: 'Comprehensive motor skills assessment for children and youth.',
      strengths: ['Comprehensive motor assessment', 'Strong psychometrics', 'Multiple composite scores'],
      limitations: ['Time-intensive', 'Expensive', 'Requires professional training'],
      cultural_considerations: ['Consider cultural motor development patterns', 'Equipment familiarity may vary', 'Physical activity cultural norms']
    },
    {
      id: 'mvpt-4',
      name: 'Motor-Free Visual Perception Test - Fourth Edition',
      acronym: 'MVPT-4',
      version: '4th Edition',
      age_range: { minimum_months: 48, maximum_months: 1080 },
      administration_time: 25,
      purpose: ['Visual perception assessment', 'Learning disability evaluation', 'Neuropsychological assessment'],
      areas_assessed: ['Visual Perception (motor-free)'],
      reliability: 'Good (r = .86-.92)',
      validity: 'Well-established',
      cost_category: 'moderate',
      training_required: 'Basic assessment training',
      publisher: 'Academic Therapy Publications',
      publication_year: 2017,
      description: 'Motor-free visual perception test for individuals 4 to 95+ years.',
      strengths: ['Motor-free design', 'Wide age range', 'Quick administration', 'Good psychometrics'],
      limitations: ['Limited to visual perception', 'Not comprehensive', 'Cultural considerations in visual stimuli'],
      cultural_considerations: ['Visual stimuli may be culturally biased', 'Consider cultural visual experiences', 'Test format familiarity']
    },
    {
      id: 'spm-2',
      name: 'Sensory Processing Measure - Second Edition',
      acronym: 'SPM-2',
      version: '2nd Edition',
      age_range: { minimum_months: 24, maximum_months: 1560 },
      administration_time: 20,
      purpose: ['Sensory processing assessment', 'Intervention planning', 'Progress monitoring'],
      areas_assessed: ['Vision', 'Hearing', 'Touch', 'Body Awareness', 'Balance & Motion', 'Planning & Ideas', 'Social Participation'],
      reliability: 'Good (r = .85-.95)',
      validity: 'Strong content validity',
      cost_category: 'moderate',
      training_required: 'Occupational therapy or related professional training',
      publisher: 'Western Psychological Services',
      publication_year: 2021,
      description: 'Comprehensive sensory processing assessment across multiple environments.',
      strengths: ['Multi-environment assessment', 'Wide age range', 'Multiple informants', 'Good psychometrics'],
      limitations: ['Questionnaire format only', 'Professional interpretation required', 'Limited direct observation'],
      cultural_considerations: ['Consider cultural sensory experiences', 'Family participation styles', 'Environmental differences']
    },
    {
      id: 'sipt',
      name: 'Sensory Integration and Praxis Tests',
      acronym: 'SIPT',
      version: '1.0',
      age_range: { minimum_months: 48, maximum_months: 108 },
      administration_time: 120,
      purpose: ['Sensory integration assessment', 'Praxis evaluation', 'Neurological soft signs detection', 'Intervention planning'],
      areas_assessed: ['Tactile Processing', 'Vestibular-Proprioceptive Processing', 'Visual-Spatial Processing', 'Praxis', 'Bilateral Integration', 'Sequencing'],
      reliability: 'Good to Excellent (r = .71-.98)',
      validity: 'Strong construct and predictive validity',
      cost_category: 'high',
      training_required: 'SIPT certification required - extensive training program',
      publisher: 'Western Psychological Services',
      publication_year: 1989,
      description: 'Comprehensive battery of 17 tests assessing sensory integration and praxis in children.',
      strengths: ['Gold standard for SI assessment', 'Comprehensive coverage', 'Strong theoretical foundation', 'Computer scoring'],
      limitations: ['Expensive', 'Extensive training required', 'Time-intensive', 'Age-limited range'],
      cultural_considerations: ['Developed on predominantly Western sample', 'Consider cultural exposure to test materials', 'Motor pattern cultural variations']
    }
  ],
  physical: [
    {
      id: 'pdms-2',
      name: 'Peabody Developmental Motor Scales - Second Edition',
      acronym: 'PDMS-2',
      version: '2nd Edition',
      age_range: { minimum_months: 0, maximum_months: 71 },
      administration_time: 60,
      purpose: ['Motor development assessment', 'Early intervention planning', 'Progress monitoring', 'Research'],
      areas_assessed: ['Reflexes', 'Stationary', 'Locomotion', 'Object Manipulation', 'Grasping', 'Visual-Motor Integration'],
      reliability: 'Excellent (r = .89-.98)',
      validity: 'Strong construct validity',
      cost_category: 'high',
      training_required: 'Graduate training in physical or occupational therapy',
      publisher: 'Pro-Ed',
      publication_year: 2000,
      description: 'Comprehensive motor development assessment for birth to 5 years.',
      strengths: ['Birth to 5 years', 'Comprehensive motor assessment', 'Strong psychometrics', 'Activity cards included'],
      limitations: ['Limited to early childhood', 'Expensive', 'Time-intensive'],
      cultural_considerations: ['Consider cultural motor development expectations', 'Family interaction styles', 'Physical play patterns']
    },
    {
      id: 'pedi-cat',
      name: 'Pediatric Evaluation of Disability Inventory - Computer Adaptive Test',
      acronym: 'PEDI-CAT',
      version: '1.0',
      age_range: { minimum_months: 0, maximum_months: 252 },
      administration_time: 30,
      purpose: ['Functional assessment', 'Program planning', 'Outcome measurement', 'Research'],
      areas_assessed: ['Daily Activities', 'Mobility', 'Social/Cognitive', 'Responsibility'],
      reliability: 'Excellent (r = .96-.99)',
      validity: 'Strong construct validity',
      cost_category: 'high',
      training_required: 'Professional healthcare training',
      publisher: 'Pearson',
      publication_year: 2012,
      description: 'Computer adaptive functional assessment for children and youth.',
      strengths: ['Computer adaptive', 'Functional focus', 'Excellent psychometrics', 'Efficient administration'],
      limitations: ['Requires computer/tablet', 'Expensive', 'Professional training needed'],
      cultural_considerations: ['Consider cultural activity expectations', 'Family role definitions', 'Independence expectations']
    },
    {
      id: 'gmfm-88',
      name: 'Gross Motor Function Measure',
      acronym: 'GMFM-88',
      version: '88-item',
      age_range: { minimum_months: 6, maximum_months: 240 },
      administration_time: 90,
      purpose: ['Cerebral palsy motor assessment', 'Change detection', 'Intervention evaluation'],
      areas_assessed: ['Lying & Rolling', 'Sitting', 'Crawling & Kneeling', 'Standing', 'Walking, Running & Jumping'],
      reliability: 'Excellent (r = .87-.99)',
      validity: 'Well-established for CP population',
      cost_category: 'moderate',
      training_required: 'GMFM certification course',
      publisher: 'Mac Keith Press',
      publication_year: 2002,
      description: 'Standardized observational instrument for measuring gross motor function in children with cerebral palsy.',
      strengths: ['Gold standard for CP', 'Sensitive to change', 'Well-researched', 'Training available'],
      limitations: ['Specific to CP population', 'Time-intensive', 'Requires certification'],
      cultural_considerations: ['Consider cultural motor expectations', 'Family participation comfort', 'Physical activity norms']
    }
  ],
  multi_domain: [
    {
      id: 'bayley-4',
      name: 'Bayley Scales of Infant and Toddler Development - Fourth Edition',
      acronym: 'Bayley-4',
      version: '4th Edition',
      age_range: { minimum_months: 1, maximum_months: 42 },
      administration_time: 90,
      purpose: ['Developmental assessment', 'Early intervention planning', 'Progress monitoring', 'Research'],
      areas_assessed: ['Cognitive', 'Language', 'Motor', 'Social-Emotional', 'Adaptive Behavior'],
      reliability: 'Excellent (r = .91-.96)',
      validity: 'Strong construct validity',
      cost_category: 'high',
      training_required: 'Graduate training in psychology or related field',
      publisher: 'Pearson',
      publication_year: 2019,
      description: 'Gold standard comprehensive developmental assessment for infants and toddlers.',
      strengths: ['Gold standard for early development', 'Comprehensive domains', 'Strong psychometrics', 'Updated norms'],
      limitations: ['Very expensive', 'Extensive training required', 'Time-intensive'],
      cultural_considerations: ['English and Spanish versions', 'Consider cultural developmental expectations', 'Family interaction styles']
    },
    {
      id: 'vineland-3',
      name: 'Vineland Adaptive Behavior Scales - Third Edition',
      acronym: 'Vineland-3',
      version: '3rd Edition',
      age_range: { minimum_months: 0, maximum_months: 1080 },
      administration_time: 45,
      purpose: ['Adaptive behavior assessment', 'Developmental disability diagnosis', 'Program planning', 'Progress monitoring'],
      areas_assessed: ['Communication', 'Daily Living Skills', 'Socialization', 'Motor Skills', 'Maladaptive Behavior'],
      reliability: 'Excellent (r = .90-.98)',
      validity: 'Well-established',
      cost_category: 'high',
      training_required: 'Graduate training in psychology or related field',
      publisher: 'Pearson',
      publication_year: 2016,
      description: 'Comprehensive adaptive behavior assessment from birth to adulthood.',
      strengths: ['Birth to 90+ years', 'Multiple informant options', 'Strong psychometrics', 'Widely accepted'],
      limitations: ['Expensive', 'Professional training required', 'Interview can be lengthy'],
      cultural_considerations: ['Consider cultural adaptive expectations', 'Family role definitions', 'Independence expectations vary culturally']
    },
    {
      id: 'battelle-3',
      name: 'Battelle Developmental Inventory - Third Edition',
      acronym: 'Battelle-3',
      version: '3rd Edition',
      age_range: { minimum_months: 0, maximum_months: 95 },
      administration_time: 120,
      purpose: ['Comprehensive developmental assessment', 'Early intervention planning', 'Progress monitoring', 'Research'],
      areas_assessed: ['Adaptive', 'Personal-Social', 'Communication', 'Motor', 'Cognitive'],
      reliability: 'Excellent (r = .92-.98)',
      validity: 'Strong construct validity',
      cost_category: 'high',
      training_required: 'Graduate training in psychology or related field',
      publisher: 'Pearson',
      publication_year: 2019,
      description: 'Comprehensive developmental assessment for birth to 7 years, 11 months.',
      strengths: ['Birth to 8 years', 'Multiple assessment methods', 'Strong psychometrics', 'Flexible administration'],
      limitations: ['Expensive', 'Time-intensive', 'Requires professional training'],
      cultural_considerations: ['English and Spanish versions', 'Consider cultural developmental milestones', 'Family interaction patterns']
    }
  ]
}

const DOMAIN_ICONS = {
  aba: <Brain className="h-5 w-5" />,
  speech: <Volume2 className="h-5 w-5" />,
  occupational: <Activity className="h-5 w-5" />,
  physical: <Zap className="h-5 w-5" />,
  multi_domain: <Target className="h-5 w-5" />
}

const DOMAIN_COLORS = {
  aba: 'bg-purple-100 text-purple-800 border-purple-200',
  speech: 'bg-blue-100 text-blue-800 border-blue-200',
  occupational: 'bg-green-100 text-green-800 border-green-200',
  physical: 'bg-orange-100 text-orange-800 border-orange-200',
  multi_domain: 'bg-gray-100 text-gray-800 border-gray-200'
}

const COST_COLORS = {
  free: 'bg-green-100 text-green-800',
  low: 'bg-yellow-100 text-yellow-800',
  moderate: 'bg-orange-100 text-orange-800',
  high: 'bg-red-100 text-red-800'
}

interface AssessmentToolRegistryProps {
  onSelectTool?: (toolId: string, domain: string) => void
  selectedDomain?: string
  showFilters?: boolean
}

export const AssessmentToolRegistry = ({
  onSelectTool,
  selectedDomain = 'all',
  showFilters = true
}: AssessmentToolRegistryProps) => {
  const { language, isRTL } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [domainFilter, setDomainFilter] = useState(selectedDomain)
  const [ageFilter, setAgeFilter] = useState('')
  const [costFilter, setCostFilter] = useState('')
  const [timeFilter, setTimeFilter] = useState('')

  const filteredTools = useMemo(() => {
    let allTools: any[] = []
    
    // Combine all tools from all domains
    Object.entries(ASSESSMENT_TOOLS_DATABASE).forEach(([domain, tools]) => {
      tools.forEach(tool => {
        allTools.push({ ...tool, domain })
      })
    })

    // Apply filters
    return allTools.filter(tool => {
      const matchesSearch = searchQuery === '' || 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.acronym.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesDomain = domainFilter === 'all' || tool.domain === domainFilter
      
      const matchesAge = ageFilter === '' || (
        ageFilter === 'infant' && tool.age_range.minimum_months <= 12 ||
        ageFilter === 'toddler' && tool.age_range.minimum_months <= 36 && tool.age_range.maximum_months >= 12 ||
        ageFilter === 'preschool' && tool.age_range.minimum_months <= 60 && tool.age_range.maximum_months >= 36 ||
        ageFilter === 'school' && tool.age_range.minimum_months <= 180 && tool.age_range.maximum_months >= 60 ||
        ageFilter === 'adult' && tool.age_range.maximum_months >= 216
      )
      
      const matchesCost = costFilter === '' || tool.cost_category === costFilter
      
      const matchesTime = timeFilter === '' || (
        timeFilter === 'quick' && tool.administration_time <= 30 ||
        timeFilter === 'moderate' && tool.administration_time > 30 && tool.administration_time <= 90 ||
        timeFilter === 'lengthy' && tool.administration_time > 90
      )

      return matchesSearch && matchesDomain && matchesAge && matchesCost && matchesTime
    })
  }, [searchQuery, domainFilter, ageFilter, costFilter, timeFilter])

  const formatAgeRange = (ageRange: any) => {
    const minYears = Math.floor(ageRange.minimum_months / 12)
    const minMonths = ageRange.minimum_months % 12
    const maxYears = Math.floor(ageRange.maximum_months / 12)
    const maxMonths = ageRange.maximum_months % 12

    const formatAge = (years: number, months: number) => {
      if (years === 0) return `${months}m`
      if (months === 0) return `${years}y`
      return `${years}y${months}m`
    }

    return `${formatAge(minYears, minMonths)} - ${formatAge(maxYears, maxMonths)}`
  }

  return (
    <div className={`space-y-6 ${language === 'ar' ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {language === 'ar' ? 'مكتبة أدوات التقييم المعيارية' : 'Standardized Assessment Tools Registry'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'استكشف واختر من أدوات التقييم المعيارية المعتمدة لجميع مجالات العلاج'
              : 'Explore and select from evidence-based standardized assessment tools across all therapy domains'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {filteredTools.length} {language === 'ar' ? 'أداة' : 'tools'}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {language === 'ar' ? 'البحث والتصفية' : 'Search & Filter'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'ar' ? 'البحث في الأدوات...' : 'Search tools...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={domainFilter} onValueChange={setDomainFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'جميع المجالات' : 'All Domains'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'جميع المجالات' : 'All Domains'}</SelectItem>
                  <SelectItem value="aba">{language === 'ar' ? 'تحليل السلوك التطبيقي' : 'ABA'}</SelectItem>
                  <SelectItem value="speech">{language === 'ar' ? 'علاج النطق' : 'Speech Therapy'}</SelectItem>
                  <SelectItem value="occupational">{language === 'ar' ? 'العلاج المهني' : 'Occupational Therapy'}</SelectItem>
                  <SelectItem value="physical">{language === 'ar' ? 'العلاج الطبيعي' : 'Physical Therapy'}</SelectItem>
                  <SelectItem value="multi_domain">{language === 'ar' ? 'متعدد المجالات' : 'Multi-Domain'}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={ageFilter} onValueChange={setAgeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'جميع الأعمار' : 'All Ages'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{language === 'ar' ? 'جميع الأعمار' : 'All Ages'}</SelectItem>
                  <SelectItem value="infant">{language === 'ar' ? 'الرضع (0-1)' : 'Infant (0-1)'}</SelectItem>
                  <SelectItem value="toddler">{language === 'ar' ? 'الأطفال الصغار (1-3)' : 'Toddler (1-3)'}</SelectItem>
                  <SelectItem value="preschool">{language === 'ar' ? 'ما قبل المدرسة (3-5)' : 'Preschool (3-5)'}</SelectItem>
                  <SelectItem value="school">{language === 'ar' ? 'المدرسة (5-15)' : 'School Age (5-15)'}</SelectItem>
                  <SelectItem value="adult">{language === 'ar' ? 'البالغين (18+)' : 'Adult (18+)'}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={costFilter} onValueChange={setCostFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'جميع التكاليف' : 'All Costs'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{language === 'ar' ? 'جميع التكاليف' : 'All Costs'}</SelectItem>
                  <SelectItem value="free">{language === 'ar' ? 'مجاني' : 'Free'}</SelectItem>
                  <SelectItem value="low">{language === 'ar' ? 'منخفض' : 'Low Cost'}</SelectItem>
                  <SelectItem value="moderate">{language === 'ar' ? 'متوسط' : 'Moderate'}</SelectItem>
                  <SelectItem value="high">{language === 'ar' ? 'عالي' : 'High Cost'}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'جميع المدد' : 'All Duration'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{language === 'ar' ? 'جميع المدد' : 'All Duration'}</SelectItem>
                  <SelectItem value="quick">{language === 'ar' ? 'سريع (≤30 دقيقة)' : 'Quick (≤30 min)'}</SelectItem>
                  <SelectItem value="moderate">{language === 'ar' ? 'متوسط (30-90 دقيقة)' : 'Moderate (30-90 min)'}</SelectItem>
                  <SelectItem value="lengthy">{language === 'ar' ? 'طويل (>90 دقيقة)' : 'Lengthy (>90 min)'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => (
          <Card key={tool.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelectTool?.(tool.id, tool.domain)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-md ${DOMAIN_COLORS[tool.domain as keyof typeof DOMAIN_COLORS]}`}>
                    {DOMAIN_ICONS[tool.domain as keyof typeof DOMAIN_ICONS]}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm leading-tight">{tool.acronym}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{tool.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span className="text-xs text-muted-foreground">4.8</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <p className="text-xs text-muted-foreground line-clamp-2">
                {tool.description}
              </p>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {formatAgeRange(tool.age_range)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {tool.administration_time}min
                </Badge>
                <Badge className={`text-xs ${COST_COLORS[tool.cost_category as keyof typeof COST_COLORS]}`}>
                  {language === 'ar' 
                    ? tool.cost_category === 'free' ? 'مجاني' : 
                      tool.cost_category === 'low' ? 'منخفض' :
                      tool.cost_category === 'moderate' ? 'متوسط' : 'عالي'
                    : tool.cost_category.charAt(0).toUpperCase() + tool.cost_category.slice(1)
                  }
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="text-xs">
                  <span className="font-medium text-muted-foreground">
                    {language === 'ar' ? 'المجالات المقيمة:' : 'Areas Assessed:'}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tool.areas_assessed.slice(0, 3).map((area: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                        {area}
                      </Badge>
                    ))}
                    {tool.areas_assessed.length > 3 && (
                      <Badge variant="secondary" className="text-xs px-2 py-0">
                        +{tool.areas_assessed.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="text-xs">
                  <span className="font-medium text-muted-foreground">
                    {language === 'ar' ? 'الموثوقية:' : 'Reliability:'}
                  </span>
                  <span className="ml-1">{tool.reliability}</span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => onSelectTool?.(tool.id, tool.domain)}
                >
                  <BookOpen className="h-3 w-3 mr-2" />
                  {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">
              {language === 'ar' ? 'لم يتم العثور على أدوات تقييم' : 'No assessment tools found'}
            </p>
            <p className="text-sm mt-1">
              {language === 'ar' 
                ? 'جرب تعديل معايير البحث أو الفلترة'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssessmentToolRegistry