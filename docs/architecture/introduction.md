# Introduction

This document outlines the architectural approach for enhancing the Arkan Alnumo system. Its primary goal is to serve as the guiding architectural blueprint for AI-driven development of new features while ensuring seamless and safe integration with the existing, production-ready system.

This document supplements the existing architecture by defining how new components and modules—such as the CRM, advanced scheduling, and a complete IEP system—will integrate with the current infrastructure.

## Existing Project Analysis

My analysis of the provided documentation confirms the following about your current system:

Primary Purpose: A comprehensive, bilingual (Arabic/English) therapy management system for the Saudi Arabian healthcare market, functioning as a medical-grade ERP.

Current Tech Stack: A modern stack composed of a React 18.2 + TypeScript 5.3 frontend and a Supabase (PostgreSQL 15) backend. Key technologies include Tailwind CSS, TanStack Query, React Hook Form, and n8n for automation.

Architecture Style: The backend is a serverless architecture utilizing Supabase for authentication, database, real-time subscriptions, and edge functions. The frontend is a modular, component-based structure.

Deployment Method: The frontend is deployed via Netlify with build optimization.

Identified Constraints:

Security: The system must maintain stringent security with Row Level Security (RLS) on all sensitive tables and adhere to Saudi PDPL compliance.

Bilingual Support: All new features must support the Arabic-first, RTL/LTR design.

Technical Debt: There is significant technical debt in testing, with a strong recommendation to increase coverage to over 80%.

Please confirm these observations are accurate before I proceed with architectural recommendations.

## Change Log

Date	Version	Description	Author
2025-08-30	1.0	Initial draft of the brownfield enhancement architecture.	Winston, Architect
