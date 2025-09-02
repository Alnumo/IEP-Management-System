import React, { createContext, useContext } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock LanguageContext for testing
interface MockLanguageContextType {
  language: 'ar' | 'en';
  isRTL: boolean;
  setLanguage: (lang: 'ar' | 'en') => void;
  toggleLanguage: () => void;
}

const MockLanguageContext = createContext<MockLanguageContextType | undefined>(undefined);

export const useMockLanguage = () => {
  const context = useContext(MockLanguageContext);
  if (context === undefined) {
    throw new Error('useMockLanguage must be used within MockLanguageProvider');
  }
  return context;
};

const MockLanguageProvider: React.FC<{ 
  children: React.ReactNode;
  language?: 'ar' | 'en';
}> = ({ children, language = 'en' }) => {
  const mockContextValue = {
    language,
    isRTL: language === 'ar',
    setLanguage: () => {},
    toggleLanguage: () => {},
  };

  return (
    <MockLanguageContext.Provider value={mockContextValue}>
      <div dir={language === 'ar' ? 'rtl' : 'ltr'} className={language === 'ar' ? 'font-arabic' : ''}>
        {children}
      </div>
    </MockLanguageContext.Provider>
  );
};

interface TestProvidersProps {
  children: React.ReactNode;
  language?: 'ar' | 'en';
  queryClient?: QueryClient;
}

export const TestProviders: React.FC<TestProvidersProps> = ({ 
  children, 
  language = 'en',
  queryClient 
}) => {
  const client = queryClient || new QueryClient({
    defaultOptions: {
      queries: { 
        retry: false,
        cacheTime: 0,
      },
      mutations: { 
        retry: false 
      },
    },
  });

  return (
    <QueryClientProvider client={client}>
      <MockLanguageProvider language={language}>
        {children}
      </MockLanguageProvider>
    </QueryClientProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  language?: 'ar' | 'en';
  queryClient?: QueryClient;
}

export const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { language, queryClient, ...renderOptions } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestProviders language={language} queryClient={queryClient}>
      {children}
    </TestProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };