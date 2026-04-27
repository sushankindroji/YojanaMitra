# System Architecture

Visual overview of the multi-agent welfare scheme recommendation system.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│                    User Interface & Forms                        │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend Server                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API Routers                            │  │
│  │  • /agents/analyze    • /agents/quick                    │  │
│  │  • /documents/extract • /documents/upload                │  │
│  │  • /schemes           • /profile                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                        │
│  ┌──────────────────────┴──────────────────────────────────┐  │
│  │              Multi-Agent Orchestrator                    │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │  │
│  │  │   Profile   │  │   Scheme     │  │  Eligibility   │ │  │
│  │  │   Agent     │→ │  Discovery   │→ │   Reasoning    │ │  │
│  │  │             │  │   Agent      │  │    Agent       │ │  │
│  │  └─────────────┘  └──────────────┘  └────────────────┘ │  │
│  │         ↑                                                │  │
│  │         │                                                │  │
│  │  ┌──────┴──────┐                                        │  │
│  │  │  Document   │                                        │  │
│  │  │ Intelligence│                                        │  │
│  │  │   Agent     │                                        │  │
│  │  └─────────────┘                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                        │
│  ┌──────────────────────┴──────────────────────────────────┐  │
│  │                  Core Services                           │  │
│  │  • Eligibility Engine  • OCR Processor                  │  │
│  │  • Storage Service     • Cache Service                  │  │
│  │  • Encryption Service  • Audit Logger                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                           │
│  • Users & Profiles    • Schemes & Rules                        │
│  • Documents           • Eligibility Results                    │
│  • Applications        • Audit Logs                             │
└─────────────────────────────────────────────────────────────────┘
```

## 🤖 Agent Architecture

### Full Pipeline Flow

```
User Input (Profile + Documents)
        │
        ▼
┌───────────────────────┐
│   1. Profile Agent    │  ← Validates fields, calculates categories
│   (profile_agent.py)  │    Returns: validated_profile, completeness_score
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 2. Document Agent     │  ← OCR extraction from uploaded images
│ (document_agent.py)   │    Returns: extracted_fields, confidence_score
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 3. Merge Profile      │  ← Form data takes priority over OCR
│    (orchestrator)     │    Returns: merged_profile
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 4. Scheme Discovery   │  ← Queries DB, runs eligibility checks
│ (scheme_discovery_    │    Returns: top 20 eligible, partial, counts
│  agent.py)            │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 5. Eligibility        │  ← Generates explanations & priorities
│    Reasoning Agent    │    Returns: priority, explanation, tips
│ (eligibility_agent.py)│
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 6. Return Results     │  ← Complete analysis with recommendations
│    (orchestrator)     │
└───────────────────────┘
```

### Quick Pipeline Flow (No Documents)

```
User Input (Basic Profile)
        │
        ▼
┌───────────────────────┐
│   1. Profile Agent    │  ← Validates fields
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 4. Scheme Discovery   │  ← Queries DB
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 5. Eligibility        │  ← Generates explanations
│    Reasoning          │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 6. Return Results     │  ← Fast response (<2 sec)
└───────────────────────┘
```

## 📄 OCR Pipeline Architecture

```
Document Image Upload
        │
        ▼
┌─────────────────────────────────────────┐
│     1. Image Preprocessing              │
│     (preprocess_image)                  │
│                                         │
│  PIL Image → RGB → cv2 Format          │
│       ↓                                 │
│  Grayscale Conversion                   │
│       ↓                                 │
│  Median Blur (kernel=3)                 │
│       ↓                                 │
│  OTSU Threshold                         │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     2. OCR Extraction                   │
│     (pytesseract)                       │
│                                         │
│  Tesseract OCR (eng+hin)                │
│       ↓                                 │
│  Raw Text Output                        │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     3. Document Type Detection          │
│     (detect_document_type)              │
│                                         │
│  Regex Pattern Matching:                │
│  • Aadhaar: 12-digit / "uidai"         │
│  • PAN: [A-Z]{5}[0-9]{4}[A-Z]          │
│  • Income: "income certificate"         │
│  • Caste: "caste certificate"           │
│  • Ration: "ration card" / "NFSA"      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     4. Field Extraction                 │
│     (extract_fields)                    │
│                                         │
│  Type-Specific Regex Patterns:          │
│  • Common: name, dob, gender            │
│  • Aadhaar: aadhaar_number, address    │
│  • Income: income_amount, FY            │
│  • Caste: caste_category, cert_no      │
│  • Ration: card_number, card_type      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     5. Confidence Calculation           │
│     (calculate_confidence)              │
│                                         │
│  Score = (filled_fields / total) × 100  │
│                                         │
│  If confidence < 50%:                   │
│    → LLM Fallback (optional)            │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     6. Auto-fill Generation             │
│                                         │
│  • Calculate age from DOB               │
│  • Normalize gender                     │
│  • Parse income amount                  │
│  • Determine BPL status                 │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     7. Return Results                   │
│                                         │
│  {                                      │
│    document_type,                       │
│    extracted_fields,                    │
│    confidence_score,                    │
│    raw_text,                            │
│    auto_fill                            │
│  }                                      │
└─────────────────────────────────────────┘
```

## 🗄️ Database Schema (Simplified)

```
┌─────────────┐         ┌──────────────┐
│    Users    │         │   Profiles   │
├─────────────┤         ├──────────────┤
│ id (PK)     │────────<│ user_id (FK) │
│ email       │         │ full_name    │
│ password    │         │ age          │
│ role        │         │ gender       │
└─────────────┘         │ state        │
                        │ annual_income│
                        │ caste_category│
                        │ ...          │
                        └──────────────┘
                               │
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│  Documents   │    │ Eligibility      │    │ Applications │
├──────────────┤    │ Results          │    ├──────────────┤
│ id (PK)      │    ├──────────────────┤    │ id (PK)      │
│ user_id (FK) │    │ id (PK)          │    │ user_id (FK) │
│ doc_type     │    │ user_id (FK)     │    │ scheme_id(FK)│
│ file_name    │    │ scheme_id (FK)   │    │ status       │
│ storage_path │    │ is_eligible      │    │ applied_at   │
│ extracted_   │    │ eligibility_score│    └──────────────┘
│   data       │    │ explanation      │
│ confidence   │    │ computed_at      │
└──────────────┘    └──────────────────┘
                               ▲
                               │
                               │
                        ┌──────────────┐
                        │   Schemes    │
                        ├──────────────┤
                        │ id (PK)      │
                        │ scheme_code  │
                        │ name_en      │
                        │ sector       │
                        │ state        │
                        │ eligibility_ │
                        │   rules      │
                        │ benefit_     │
                        │   amount     │
                        └──────────────┘
```

## 🔄 Data Flow

### Document Upload & Processing

```
User uploads document
        │
        ▼
┌─────────────────┐
│ File Validation │  Max 10MB, image types only
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AES-256         │  Encrypt file at rest
│ Encryption      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Storage Service │  Save to uploads/{user_id}/
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Document │  Insert record in DB
│ Record          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OCR Processing  │  Background task
│ (async)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Extract Fields  │  OCR pipeline
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update Profile  │  Auto-fill missing fields
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Clear Cache     │  Invalidate eligibility cache
└─────────────────┘
```

### Eligibility Check Flow

```
User profile data
        │
        ▼
┌─────────────────┐
│ Check Cache     │  Redis (if enabled)
└────────┬────────┘
         │ Cache miss
         ▼
┌─────────────────┐
│ Query Schemes   │  SELECT * FROM schemes WHERE is_active=1
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ For each scheme │
│   ↓             │
│ Parse rules     │  JSON → dict
│   ↓             │
│ Check           │  eligibility_engine.check_eligibility()
│ eligibility     │
│   ↓             │
│ Calculate score │  (passed / total) × 100
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sort by score   │  Descending order
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate        │  String templates
│ explanations    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Save results    │  eligibility_results table
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cache results   │  Redis (if enabled)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return to user  │  Top 20 + partial + counts
└─────────────────┘
```

## 🔐 Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Security Layers                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Authentication Layer                                 │
│     • JWT tokens (access + refresh)                     │
│     • Password hashing (bcrypt)                         │
│     • Token expiration & rotation                       │
│                                                          │
│  2. Authorization Layer                                  │
│     • Role-based access control (user/admin)            │
│     • Resource ownership validation                     │
│     • Endpoint-level permissions                        │
│                                                          │
│  3. Rate Limiting                                        │
│     • 100 requests/hour per user                        │
│     • Sliding window algorithm                          │
│     • IP-based fallback                                 │
│                                                          │
│  4. Input Validation                                     │
│     • Pydantic schemas                                  │
│     • File type validation                              │
│     • Size limits (10MB)                                │
│     • SQL injection prevention                          │
│                                                          │
│  5. Data Encryption                                      │
│     • AES-256 for files at rest                         │
│     • TLS 1.3 for data in transit                       │
│     • Encrypted database fields                         │
│                                                          │
│  6. Audit Logging                                        │
│     • All sensitive operations logged                   │
│     • User actions tracked                              │
│     • Compliance reporting                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 📊 Performance Optimization

```
┌─────────────────────────────────────────────────────────┐
│              Performance Optimization Stack              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Application Layer                                       │
│  ┌────────────────────────────────────────────────┐    │
│  │ • FastAPI async/await                          │    │
│  │ • Background tasks for OCR                     │    │
│  │ • Connection pooling (10-30 connections)       │    │
│  │ • Lazy loading of large objects                │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Caching Layer (Optional)                                │
│  ┌────────────────────────────────────────────────┐    │
│  │ • Redis for scheme data                        │    │
│  │ • In-memory cache for eligibility results      │    │
│  │ • TTL-based invalidation                       │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Database Layer                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ • Indexed columns (user_id, scheme_code, etc.) │    │
│  │ • Query optimization                           │    │
│  │ • Connection pooling                           │    │
│  │ • Read replicas (future)                       │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  File Storage                                            │
│  ┌────────────────────────────────────────────────┐    │
│  │ • Local filesystem (development)               │    │
│  │ • S3/Cloud storage (production)                │    │
│  │ • CDN for static assets                        │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Agent Responsibilities

```
┌──────────────────────────────────────────────────────────────┐
│                      Agent Responsibilities                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ProfileAgent                                                 │
│  • Input validation                                           │
│  • Type coercion (age, income, land)                         │
│  • Derived category calculation                              │
│  • Completeness scoring                                       │
│  • NO assumptions (missing = None)                           │
│                                                               │
│  SchemeDiscoveryAgent                                         │
│  • Database querying (all active schemes)                    │
│  • Eligibility engine invocation                             │
│  • Result aggregation & sorting                              │
│  • Top-N selection                                           │
│  • NO LLM calls                                              │
│                                                               │
│  EligibilityReasoningAgent                                    │
│  • Plain English explanation generation                       │
│  • Priority assignment (high/medium/low)                     │
│  • Improvement tip generation                                │
│  • String template-based (NO LLM)                            │
│                                                               │
│  DocumentIntelligenceAgent                                    │
│  • Image preprocessing (cv2)                                 │
│  • OCR execution (pytesseract)                               │
│  • Document type detection (regex)                           │
│  • Field extraction (regex)                                  │
│  • Confidence scoring                                        │
│  • LLM fallback (only if confidence < 50%)                   │
│                                                               │
│  Orchestrator                                                 │
│  • Agent coordination                                        │
│  • Data flow management                                      │
│  • Error handling                                            │
│  • Result aggregation                                        │
│  • Pipeline selection (full vs quick)                        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## 📈 Scalability Strategy

```
Current (Single Server)
┌─────────────────┐
│   FastAPI App   │
│   PostgreSQL    │
│   File Storage  │
└─────────────────┘

Future (Horizontal Scaling)
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                         │
└────────────┬────────────────────────────────────────────┘
             │
    ┌────────┼────────┐
    │        │        │
    ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐
│FastAPI │ │FastAPI │ │FastAPI │  Multiple workers
│Worker 1│ │Worker 2│ │Worker 3│
└───┬────┘ └───┬────┘ └───┬────┘
    │          │          │
    └──────────┼──────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Redis  │ │Postgres│ │   S3   │  Shared services
│ Cache  │ │   DB   │ │Storage │
└────────┘ └────────┘ └────────┘
```

---

**Architecture Version**: 1.0.0

**Last Updated**: 2026-04-22

**Status**: Production Ready
