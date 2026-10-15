
THE VIBE CODING BLUEPRINT
THE VIBE CODING BLUEPRINT
The Complete Documentation System for Building Apps With AI
15+ ready-to-use Markdown templates, AI prompts, workflows, checklists, and best practices

INTRODUCTION
Vibe coding makes it incredibly easy to go from an idea to working software.

You describe what you want.

AI writes the code.

You run it.

You fix something.

You ask AI to change it.

Repeat.

And this works surprisingly well for small experiments.

But as your application becomes more complex, a different problem appears:

Your AI coding agent starts guessing.

It guesses what a feature should do.

It guesses how the UI should look.

It guesses how your database should work.

It guesses how authentication should work.

It guesses where a file belongs.

It guesses how the API should behave.

And eventually, different parts of your application start following different assumptions.

That's where documentation becomes extremely powerful.

The goal of this guide is simple:

Give your AI coding agent enough context that it spends less time guessing and more time implementing.

This guide gives you the documentation structure, templates, prompts, workflows, and checklists you can use before and during AI-assisted development.


PART 1 — THE CORE IDEA
Don't just give AI a prompt.
Give AI:

Context + Rules + Constraints + Architecture + Examples + Validation

A useful mental model is:

YOUR IDEA

   ↓

PRODUCT REQUIREMENTS

   ↓

USER FLOWS

   ↓

DESIGN SYSTEM

   ↓

ARCHITECTURE

   ↓

DATABASE

   ↓

API CONTRACTS

   ↓

SECURITY

   ↓

CODE CONVENTIONS

   ↓

TESTING

   ↓

AI AGENT INSTRUCTIONS

   ↓

IMPLEMENTATION

   ↓

VALIDATION

The documentation becomes the shared source of truth for both you and your AI coding agent.


PART 2 — THE 8 CORE DOCUMENTS
Start with these eight:

docs/

├── PRD.md

├── DESIGN_SYSTEM.md

├── ARCHITECTURE.md

├── DATABASE.md

├── SECURITY.md

├── CODE_STYLE.md

├── TESTING.md

└── AGENTS.md

Each document answers a different question.

Document

Main Question

PRD.md

What are we building?

DESIGN_SYSTEM.md

What should it look and feel like?

ARCHITECTURE.md

How should the system work?

DATABASE.md

What data exists and how does it relate?

SECURITY.md

What must be protected and how?

CODE_STYLE.md

How should code be written?

TESTING.md

How will we know it works?

AGENTS.md

How should the AI coding agent behave?


01 — PRD.md
PRODUCT REQUIREMENTS DOCUMENT
Purpose
The PRD defines the product itself.

It should explain:

What you're building
Why you're building it
Who will use it
What the core features are
What is in scope
What is out of scope
What success looks like
Your AI should be able to read this document and understand the product without needing a 30-minute explanation from you.


When to create it
Create the PRD before implementation.

Update it when:

requirements change
features are added
features are removed
user flows change
the product scope changes

PRD TEMPLATE
# Product Requirements Document


## 1. Product Overview


Product Name:

[Name]


One-Line Description:

[Explain the product in one sentence.]


Product Type:

[SaaS / Mobile App / Marketplace / Internal Tool / etc.]


Primary Platform:

[Web / iOS / Android / Desktop]


---


## 2. Problem


What problem are we solving?


[Describe the problem.]


Why does this problem matter?


[Explain the importance.]


How are users solving this today?


[Current alternatives.]


---


## 3. Goal


Primary Goal:


[What should this product achieve?]


Secondary Goals:


- [Goal]

- [Goal]


---


## 4. Target Users


### User Type 1


Name:

[Persona]


Description:

[Who are they?]


Needs:

- [Need]

- [Need]


Pain Points:

- [Pain point]

- [Pain point]


---


## 5. User Stories


As a [user],


I want to [action]


so that [outcome].


Examples:


- As a user, I want to create an account so that I can save my data.

- As a user, I want to create a project so that I can organize my work.

- As a user, I want to invite teammates so that we can collaborate.


---


## 6. Core Features


### Feature 1 — [Feature Name]


Purpose:

[What does it do?]


User Flow:

[Describe the flow.]


Inputs:

[List inputs.]


Outputs:

[List outputs.]


Acceptance Criteria:


- [Requirement]

- [Requirement]

- [Requirement]


Edge Cases:


- [Edge case]

- [Edge case]


---


### Feature 2 — [Feature Name]


Purpose:

[What does it do?]


User Flow:

[Describe the flow.]


Acceptance Criteria:


- [Requirement]

- [Requirement]


---


## 7. Non-Goals


The following are intentionally NOT part of this version:


- [Feature]

- [Feature]

- [Feature]


---


## 8. MVP Scope


Must Have:


- [Feature]

- [Feature]


Nice to Have:


- [Feature]

- [Feature]


Future:


- [Feature]

- [Feature]


---


## 9. Success Metrics


Primary Metrics:


- [Metric]

- [Metric]


Secondary Metrics:


- [Metric]

- [Metric]


---


## 10. Constraints


Technical:


- [Constraint]


Business:


- [Constraint]


Design:


- [Constraint]


Timeline:


- [Constraint]


---


## 11. Assumptions


- [Assumption]

- [Assumption]


---


## 12. Open Questions


- [Question]

- [Question]


---


## 13. Definition of Done


The feature/product is considered complete when:


- [ ] Requirements are implemented

- [ ] Critical user flows work

- [ ] Tests pass

- [ ] Build succeeds

- [ ] Security requirements are satisfied

- [ ] Documentation is updated


02 — DESIGN_SYSTEM.md
DESIGN SYSTEM
Purpose
This document defines the visual language of your product.

Without one, AI can generate:

one screen with rounded cards
another with sharp cards
one page with a different font
another with completely different spacing
inconsistent buttons
inconsistent colors
The design system gives your coding agent a consistent visual vocabulary.


DESIGN SYSTEM TEMPLATE
# Design System


## 1. Design Direction


Style:

[Minimal / Editorial / Premium / Playful / Technical / etc.]


Mood:

[Describe the overall feeling.]


Design Principles:


- [Principle]

- [Principle]

- [Principle]


---


## 2. Brand


Brand Name:

[Name]


Logo:

[Rules]


Brand Voice:

[Description]


---


## 3. Color Palette


Primary:

#HEX


Secondary:

#HEX


Background:

#HEX


Surface:

#HEX


Text:

#HEX


Muted Text:

#HEX


Border:

#HEX


Success:

#HEX


Warning:

#HEX


Error:

#HEX


---


## 4. Typography


Font Family:

[Font]


Heading Font:

[Font]


Body Font:

[Font]


H1:

[Size / Weight / Line Height]


H2:

[Size / Weight / Line Height]


H3:

[Size / Weight / Line Height]


Body:

[Size / Weight / Line Height]


Small:

[Size / Weight / Line Height]


---


## 5. Spacing


Base Unit:

[Example: 4px]


Spacing Scale:


4px

8px

12px

16px

24px

32px

48px

64px

96px


---


## 6. Border Radius


Small:

[Value]


Medium:

[Value]


Large:

[Value]


Pill:

[Value]


---


## 7. Shadows


Small:

[Rule]


Medium:

[Rule]


Large:

[Rule]


---


## 8. Buttons


Primary Button:

[Rules]


Secondary Button:

[Rules]


Danger Button:

[Rules]


Disabled:

[Rules]


Loading:

[Rules]


---


## 9. Inputs


Default:

[Rules]


Focus:

[Rules]


Error:

[Rules]


Disabled:

[Rules]


Placeholder:

[Rules]


---


## 10. Cards


[Define card padding, border, radius, shadow.]


---


## 11. Navigation


Header:

[Rules]


Sidebar:

[Rules]


Mobile Navigation:

[Rules]


---


## 12. States


Loading:

[Rules]


Empty:

[Rules]


Error:

[Rules]


Success:

[Rules]


Disabled:

[Rules]


---


## 13. Icons


Icon Library:

[Library]


Default Size:

[Size]


Icon Style:

[Outline / Filled / Rounded]


---


## 14. Responsive Design


Mobile:

[Rules]


Tablet:

[Rules]


Desktop:

[Rules]


Breakpoints:


Mobile:

[Range]


Tablet:

[Range]


Desktop:

[Range]


---


## 15. Accessibility


- Use semantic HTML

- Maintain sufficient contrast

- Support keyboard navigation

- Provide visible focus states

- Provide accessible labels

- Do not rely only on color


03 — ARCHITECTURE.md
ARCHITECTURE
Purpose
This document defines how the application is technically structured.

It should answer:

Where does everything go, how does everything communicate, and why was this architecture chosen?


ARCHITECTURE TEMPLATE
# Architecture


## 1. System Overview


[Describe the system at a high level.]


---


## 2. Architecture Pattern


Pattern:

[Monolith / Modular Monolith / Microservices / Serverless / etc.]


Reason:

[Why?]


---


## 3. Technology Stack


Frontend:

[Technology]


Backend:

[Technology]


Database:

[Technology]


Authentication:

[Technology]


Storage:

[Technology]


Hosting:

[Technology]


Payments:

[Technology]


Email:

[Technology]


Analytics:

[Technology]


Other Services:

[List]


---


## 4. System Components


### Frontend


Responsibilities:


- [Responsibility]

- [Responsibility]


### Backend


Responsibilities:


- [Responsibility]


### Database


Responsibilities:


- [Responsibility]


---


## 5. Architecture Diagram


[Insert diagram here.]


Example:


User

 ↓

Frontend

 ↓

API

 ↓

Service Layer

 ↓

Database


---


## 6. Data Flow


Example:


1. User submits form

2. Frontend validates input

3. Request is sent to API

4. API authenticates user

5. Service validates business rules

6. Database is updated

7. Response is returned

8. UI updates


---


## 7. Project Structure


```text

src/

├── components/

├── pages/

├── services/

├── hooks/

├── utils/

├── types/

├── middleware/

└── config/


8. Dependency Rules
[Rule]
[Rule]
[Rule]
Example:

UI components should not directly access the database.


9. Key Technical Decisions
Decision:
[Decision]

Context:
[Why did we need to decide?]

Alternatives:
[Alternatives]

Reason:
[Why this approach?]


10. Performance Considerations
[Requirement]
[Requirement]

11. Scalability Considerations
[Requirement]
[Requirement]

12. Failure Scenarios
What happens if:

Database is unavailable?
API times out?
Third-party service fails?
Authentication fails?
Document expected behavior.


---


# 04 — DATABASE.md


# DATABASE


## Purpose


This document is the source of truth for your **data model**.


AI should not randomly invent tables, relationships, fields, or naming conventions.


---


## DATABASE TEMPLATE


```markdown

# Database


## 1. Database Engine


Database:

[PostgreSQL / MySQL / SQLite / MongoDB / etc.]


Hosting:

[Provider]


---


## 2. Naming Conventions


Tables:

[Convention]


Columns:

[Convention]


Primary Keys:

[Convention]


Foreign Keys:

[Convention]


Timestamps:

[Convention]


---


## 3. Tables


### users


Purpose:

[Description]


Columns:


- id

- email

- name

- created_at

- updated_at


---


### projects


Purpose:

[Description]


Columns:


- id

- user_id

- name

- description

- status

- created_at

- updated_at


---


## 4. Relationships


users → projects


One user can have many projects.


projects → tasks


One project can have many tasks.


---


## 5. Constraints


Required:


- [Field]


Unique:


- [Field]


Foreign Keys:


- [Relationship]


---


## 6. Indexes


Index:

[Column]


Reason:

[Reason]


---


## 7. Data Validation


- [Rule]

- [Rule]


---


## 8. Soft Delete


Does the system use soft deletion?


[Yes / No]


If yes:


[Explain implementation.]


---


## 9. Auditing


Do we record:


- Created by?

- Updated by?

- Deleted by?

- Activity history?


[Rules]


---


## 10. Sensitive Data


Sensitive fields:


- [Field]


Protection:


[Rules]


---


## 11. Migration Rules


Schema changes must:


1. Be documented

2. Have a migration

3. Be tested

4. Avoid breaking existing production data


---


## 12. Seed Data


[Describe development/demo seed data.]


05 — SECURITY.md
SECURITY
Purpose
Security should be treated as a project requirement, not a final polish step.

This document defines authentication, authorization, secrets, API protection, data security, and other important rules.


SECURITY TEMPLATE
# Security Guidelines


## 1. Authentication


Authentication Provider:

[Provider]


Methods:


- Email/password

- OAuth

- Magic link

- [Other]


---


## 2. Authorization


Roles:


- Admin

- User

- [Role]


Permissions:


### Admin


- [Permission]


### User


- [Permission]


Authorization must be enforced server-side.


---


## 3. Secrets


Rules:


- Never hard-code credentials

- Never commit production secrets

- Never expose private secrets to the client

- Use environment variables

- Rotate compromised credentials

- Use appropriate secret storage


---


## 4. Environment Variables


Public:


[Variables]


Private:


[Variables]


---


## 5. API Security


Input validation:

[Rules]


Rate limiting:

[Rules]


CORS:

[Rules]


Authentication:

[Rules]


Authorization:

[Rules]


---


## 6. Data Protection


Sensitive data:

[List]


Encryption:

[Rules]


Retention:

[Rules]


Deletion:

[Rules]


---


## 7. Logging


Never log:


- Passwords

- API keys

- Tokens

- Sensitive personal information


Log:


- Authentication events

- Important actions

- Errors

- Security events


---


## 8. File Uploads


Allowed file types:

[List]


Maximum size:

[Limit]


Validation:

[Rules]


Storage:

[Location]


---


## 9. Security Checklist


- [ ] Authentication implemented

- [ ] Authorization implemented

- [ ] Server-side validation

- [ ] Secrets protected

- [ ] Sensitive data protected

- [ ] Rate limiting considered

- [ ] File uploads validated

- [ ] Errors do not expose sensitive details

- [ ] Dependencies reviewed


06 — CODE_STYLE.md
CODE STYLE & CONVENTIONS
Purpose
This document keeps generated code consistent across your entire project.


CODE STYLE TEMPLATE
# Code Style & Conventions


## 1. General Principles


- Prefer readable code

- Keep functions focused

- Avoid unnecessary abstractions

- Reuse existing components

- Reuse existing utilities

- Prefer consistency over novelty


---


## 2. Naming


Components:

[Convention]


Functions:

[Convention]


Variables:

[Convention]


Constants:

[Convention]


Files:

[Convention]


Database fields:

[Convention]


API routes:

[Convention]


---


## 3. Folder Structure


[Describe rules.]


---


## 4. Imports


Rules:


- [Rule]

- [Rule]


---


## 5. Components


Components should:


- Have a single responsibility

- Prefer reusable patterns

- Avoid unnecessary duplication


---


## 6. Functions


Functions should:


- Do one logical thing

- Have clear names

- Avoid unnecessary complexity


---


## 7. Error Handling


Use:


[Pattern]


Do not:


[Pattern]


---


## 8. Comments


Comments should explain:


- Why something exists

- Important tradeoffs

- Non-obvious behavior


Avoid comments that simply repeat the code.


---


## 9. Logging


Use:


[Logging library]


Rules:


- [Rule]

- [Rule]


---


## 10. Formatting


Formatter:

[Tool]


Linter:

[Tool]


Type Checking:

[Tool]


---


## 11. Do


- Reuse existing patterns

- Keep changes focused

- Follow project conventions

- Remove dead code


---


## 12. Don't


- Create duplicate utilities

- Introduce unnecessary dependencies

- Ignore existing architecture

- Change unrelated files


07 — TESTING.md
TESTING STRATEGY
Purpose
This document defines how your application will be validated.

AI should not stop at:

“The code looks correct.”

The application should be tested.


TESTING TEMPLATE
# Testing


## 1. Testing Goals


Critical functionality:


- [Feature]

- [Feature]

- [Feature]


---


## 2. Test Types


### Unit Testing


Test:


- Utility functions

- Business logic

- Components where appropriate


---


### Integration Testing


Test:


- APIs

- Database interactions

- Authentication flows

- Service integrations


---


### End-to-End Testing


Test critical user journeys:


- Sign up

- Sign in

- Create project

- Complete checkout

- [Other critical flows]


---


## 3. Testing Tools


Unit:

[Tool]


Integration:

[Tool]


E2E:

[Tool]


---


## 4. Test File Structure


```text

tests/

├── unit/

├── integration/

└── e2e/


5. Critical User Flows
Flow:
[Name]

Steps:

[Step]
[Step]
[Step]
Expected result:

[Result]


6. Coverage
Target:
[Practical target]

Prioritize:

Critical business logic
Authentication
Payments
Data mutations
Important user journeys

7. Commands
Test:

[test command]

Lint:

[lint command]

Build:

[build command]

Type Check:

[typecheck command]


8. Definition of Done
Tests pass
Build passes
Lint passes
Type checking passes
Critical flow verified
No blocking errors

---


# 08 — AGENTS.md


# AI CODING AGENT INSTRUCTIONS


## Purpose


This is where you turn your project documentation into **operational instructions for your AI coding agent**.


Depending on your tool, you may also have tool-specific rule files or configuration conventions. Use the mechanism supported by your coding environment, and keep the principles below centralized.


---


## AGENTS TEMPLATE


```markdown

# AI Coding Agent Instructions


## 1. Project Context


Project:

[Name]


Purpose:

[Description]


Primary Users:

[Users]


---


## 2. Source of Truth


Before making significant changes, read the relevant documentation inside /docs.


Core documentation:


- PRD.md

- DESIGN_SYSTEM.md

- ARCHITECTURE.md

- DATABASE.md

- SECURITY.md

- CODE_STYLE.md

- TESTING.md


Do not contradict these documents without first identifying the conflict.


---


## 3. General Rules


- Understand existing code before modifying it

- Reuse existing components and utilities

- Follow the design system

- Follow the architecture

- Follow database conventions

- Follow security requirements

- Follow coding conventions

- Do not invent business requirements

- Do not expose secrets

- Avoid unnecessary dependencies

- Avoid unrelated changes


---


## 4. Planning


Before implementing a non-trivial task:


1. Inspect relevant documentation

2. Inspect relevant code

3. Identify affected files

4. Identify dependencies

5. Identify database/API changes

6. Identify tests required

7. Create a concise implementation plan


---


## 5. Implementation


During implementation:


- Make focused changes

- Reuse established patterns

- Preserve existing behavior

- Avoid unnecessary rewrites

- Keep code maintainable


---


## 6. Validation


After implementation:


1. Run tests

2. Run linting

3. Run type checking

4. Run the build

5. Review changed files

6. Check for unintended changes


---


## 7. Documentation


Update documentation when implementation changes:


- Product behavior

- Architecture

- Database schema

- API contracts

- Security rules

- Coding conventions


---


## 8. Conflict Handling


If requirements conflict:


Do not guess.


Identify the conflict and ask for clarification.


---


## 9. Completion Criteria


A task is complete only when:


- Requirements are satisfied

- Tests pass

- Build succeeds

- No unintended files changed

- Security rules are respected

- Documentation is updated when necessary


PART 3 — THE ADVANCED DOCUMENTATION LAYER
The eight documents above are your core foundation.

For larger or more serious projects, add these.


09 — UX_FLOWS.md
This documents the actual user journeys.

Example:

Landing Page

    ↓

Sign Up

    ↓

Onboarding

    ↓

Dashboard

    ↓

Create Project

    ↓

Project Details

    ↓

Invite Team

    ↓

Complete Project

Template:

# UX Flows


## Flow 1 — User Registration


1. User opens signup page

2. User enters email

3. User creates password

4. Validation runs

5. Account is created

6. User is redirected to onboarding


Success:

[Expected result]


Failure:

[Expected behavior]


---


## Flow 2 — Create Project


1. User clicks Create Project

2. Modal opens

3. User enters name

4. User submits

5. API validates data

6. Project is created

7. User is redirected


Loading State:

[Behavior]


Error State:

[Behavior]


Empty State:

[Behavior]


10 — API.md
This becomes the source of truth for your API contracts.

# API Documentation


## GET /projects


Authentication:

Required


Response:


```json

{

  "projects": []

}


POST /projects
Authentication:
Required

Request:

{

  "name": "My Project"

}

Validation:

name is required
name must be unique per user

Error Format
{

  "error": {

    "code": "PROJECT_NOT_FOUND",

    "message": "Project not found"

  }

}


API Rules
Validate all inputs
Authenticate protected endpoints
Authorize resource access
Return consistent error responses
Do not expose internal implementation details

---


# 11 — ENVIRONMENT.md


Document every environment variable.


```markdown

# Environment Configuration


## Public Variables


NEXT_PUBLIC_APP_URL=

NEXT_PUBLIC_API_URL=


---


## Private Variables


DATABASE_URL=

AUTH_SECRET=

STRIPE_SECRET_KEY=


---


## Rules


- Never commit real secrets

- Never expose private variables to client-side code

- Keep local and production configuration separate

- Document newly introduced variables


12 — DECISIONS.md
Use this to record important technical decisions.

# Architecture Decisions


## Decision 001


Title:

[Decision]


Date:

[Date]


Status:

Accepted


Context:

[What problem existed?]


Decision:

[What was decided?]


Alternatives:


- [Alternative]

- [Alternative]


Reason:

[Why?]


Consequences:


Positive:

[Benefit]


Tradeoff:

[Tradeoff]

This prevents you from repeatedly making the same architectural decision.


13 — ROADMAP.md
# Roadmap


## NOW


- [Feature]

- [Feature]


## NEXT


- [Feature]

- [Feature]


## LATER


- [Feature]

- [Feature]


## DEFERRED


- [Feature]


## NOT PLANNED


- [Feature]

This is particularly useful when AI starts suggesting features.


14 — ERROR_HANDLING.md
Document how your system handles failure.

Include:

validation errors
API failures
network errors
authentication errors
permission errors
database failures
third-party failures
timeouts
empty states
loading states
retry behavior
user-facing messages
Example:

# Error Handling


## API Errors


400:

Validation error


401:

Authentication required


403:

Permission denied


404:

Resource not found


429:

Rate limit exceeded


500:

Unexpected server error


15 — OBSERVABILITY.md
For production applications, document:

Logging
Metrics
Monitoring
Alerts
Performance tracking
Important business events
Error tracking
Example:

# Observability


## Logging


Log:


- Application errors

- Authentication events

- Important business events


Never log:


- Passwords

- Tokens

- API keys

- Sensitive personal data


---


## Monitoring


Monitor:


- Error rate

- API latency

- Database performance

- Availability


16 — DEPLOYMENT.md
# Deployment


## Environments


Development:

[URL]


Staging:

[URL]


Production:

[URL]


---


## Deployment Process


1. Run tests

2. Run lint

3. Run build

4. Deploy

5. Run smoke tests

6. Verify monitoring


---


## Rollback


[Rollback process]


---


## Production Checklist


- [ ] Build succeeds

- [ ] Environment variables configured

- [ ] Database migrations applied

- [ ] Monitoring enabled

- [ ] Smoke tests pass


17 — CHANGELOG.md
Track meaningful changes.

# Changelog


## [1.1.0]


### Added


- [Feature]


### Changed


- [Change]


### Fixed


- [Bug]


### Removed


- [Feature]


PART 4 — RECOMMENDED PROJECT STRUCTURE
For a serious AI-assisted project:

my-app/

│

├── src/

├── public/

├── tests/

├── scripts/

│

├── docs/

│   │

│   ├── PRD.md

│   ├── DESIGN_SYSTEM.md

│   ├── UX_FLOWS.md

│   ├── ARCHITECTURE.md

│   ├── DATABASE.md

│   ├── API.md

│   ├── SECURITY.md

│   ├── CODE_STYLE.md

│   ├── TESTING.md

│   ├── AGENTS.md

│   │

│   ├── ENVIRONMENT.md

│   ├── ERROR_HANDLING.md

│   ├── DEPLOYMENT.md

│   ├── OBSERVABILITY.md

│   ├── DECISIONS.md

│   ├── ROADMAP.md

│   └── CHANGELOG.md

│

├── .env.example

├── README.md

└── package.json


PART 5 — WHICH DOCUMENT SHOULD YOU CREATE FIRST?
You don't need to create 17 documents before building a simple project.

Use this progression.

For a small project
Start with:

PRD.md

DESIGN_SYSTEM.md

ARCHITECTURE.md

AGENTS.md


For a medium project
Add:

DATABASE.md

SECURITY.md

API.md

TESTING.md

UX_FLOWS.md


For a serious production project
Add:

ENVIRONMENT.md

ERROR_HANDLING.md

DEPLOYMENT.md

OBSERVABILITY.md

DECISIONS.md

ROADMAP.md

CHANGELOG.md


PART 6 — THE DOCUMENTATION WORKFLOW
Don't create documentation and then forget about it.

Use this lifecycle:

CREATE

   ↓

REVIEW

   ↓

BUILD

   ↓

VALIDATE

   ↓

UPDATE

   ↓

BUILD AGAIN

Whenever your implementation changes the original design, update the relevant document.

Example:

Database changes

      ↓

DATABASE.md updated


API changes

      ↓

API.md updated


Architecture changes

      ↓

ARCHITECTURE.md updated


New security rule

      ↓

SECURITY.md updated

Your documentation should evolve with the application.


PART 7 — HOW TO WORK WITH YOUR AI CODING AGENT
This is where most people make a mistake.

They immediately say:

"Build me a SaaS dashboard."

Instead, create a structured process.


STEP 1 — GIVE THE AGENT CONTEXT
Use:

Read the documentation inside /docs before making any code changes.


Understand the project requirements, UX flows, design system,

architecture, database, security requirements, coding conventions,

testing strategy, and agent instructions.


Do not modify code yet.


After reading the documentation, summarize your understanding

of the project and identify any conflicts or missing information.


STEP 2 — ASK FOR A PLAN
Based on the documentation and existing codebase,

create an implementation plan for this feature.


Do not modify code yet.


Include:


- Requirements affected

- Files likely to change

- Components affected

- API changes

- Database changes

- Security considerations

- Tests required

- Potential edge cases

- Potential risks


STEP 3 — REVIEW THE PLAN
This is where you stay in control.

You review what AI intends to change before allowing it to implement.


STEP 4 — IMPLEMENT
Implement the approved plan.


Follow the project documentation as the source of truth.


Reuse existing components, utilities, patterns, and conventions.


Do not introduce unnecessary dependencies.


Do not modify unrelated parts of the application.


STEP 5 — VALIDATE
Now validate the implementation.


Run:


- Tests

- Lint

- Type checking

- Build


Then inspect the final diff.


Identify:


1. What changed

2. What was validated

3. Any remaining issues

4. Any documentation that needs updating


STEP 6 — UPDATE THE DOCUMENTATION
Review whether this implementation changed any documented

requirements, architecture, API contracts, database rules,

security requirements, or coding conventions.


If yes, update the appropriate documentation.


PART 8 — THE MASTER AI CODING PROMPT
You can use this as a general starting prompt:

You are working inside an existing software project.


Before making any significant changes, inspect the project

documentation and relevant source code.


Treat the documentation as the source of truth for:


- Product requirements

- User experience

- Design system

- Architecture

- Database

- API contracts

- Security

- Code conventions

- Testing

- Agent behavior


Do not invent business requirements when they are already documented.


Do not invent database fields, APIs, components, or architectural

patterns when the project already defines them.


Before implementing a non-trivial change:


1. Read the relevant documentation.

2. Inspect the existing implementation.

3. Identify affected files.

4. Identify dependencies.

5. Identify database/API changes.

6. Identify security considerations.

7. Identify tests that should be added or updated.

8. Create an implementation plan.


After the plan is approved:


1. Implement the smallest correct change.

2. Reuse existing patterns.

3. Follow the design system.

4. Follow the architecture.

5. Preserve existing behavior.

6. Avoid unrelated changes.

7. Avoid unnecessary dependencies.


After implementation:


1. Run tests.

2. Run linting.

3. Run type checking.

4. Run the build.

5. Review the diff.

6. Look for regressions.

7. Look for security issues.

8. Check whether documentation needs updating.


If something important is undefined or requirements conflict,

do not guess.


Ask for clarification.


At the end, summarize:


- What changed

- Files changed

- Tests run

- Validation results

- Remaining issues

- Documentation updates required


PART 9 — HOW TO MAKE YOUR DOCUMENTATION AI-FRIENDLY
Good documentation isn't just about writing more.

It should be easy for an AI to parse.

Use clear headings
Good:

## Authentication

## Database Schema

## Error Handling

Avoid giant blocks of unstructured text.


Use explicit rules
Bad:

The app should generally use reusable components.

Better:

Reuse an existing component when one already satisfies

the requirement.


Create a new component only when existing components

cannot reasonably support the use case.


Use examples
Instead of:

Use consistent API responses.

Provide:

{

  "data": {},

  "error": null

}

and:

{

  "data": null,

  "error": {

    "code": "INVALID_REQUEST",

    "message": "Invalid request"

  }

}

Examples reduce ambiguity.


PART 10 — COMMON VIBE CODING MISTAKES
Mistake 1 — Starting with a giant prompt
You're asking AI to understand:

Product
Design
Architecture
Database
Authentication
APIs
Business rules
all from one paragraph.

That creates ambiguity.


Mistake 2 — No source of truth
If the rules exist only inside your chat history, they're easy to lose.

Put important decisions into files.


Mistake 3 — Letting AI invent requirements
If something isn't defined, the AI may make an assumption.

Not every assumption will match your intention.


Mistake 4 — Building UI before defining flows
This can produce screens that look correct individually but don't make sense as a complete user journey.


Mistake 5 — Letting AI redesign every screen
Without a design system, visual inconsistency accumulates quickly.


Mistake 6 — Letting AI create the database as it goes
This can lead to:

inconsistent naming
duplicate fields
incorrect relationships
unnecessary tables
difficult migrations

Mistake 7 — Treating security as a final step
Security requirements should influence architecture and implementation from the beginning.


Mistake 8 — No testing strategy
A successful build means more than:

"The page loaded."

Define what success means.


Mistake 9 — Never updating documentation
Stale documentation can become misleading.

Your documentation should evolve with your application.


PART 11 — BEFORE YOU WRITE YOUR FIRST LINE OF CODE
Use this checklist.

PRODUCT
Product idea is clearly defined
Problem is defined
Target user is defined
User stories are written
Core features are identified
Non-goals are defined
MVP scope is defined
UX
Major user flows are mapped
Loading states are defined
Empty states are defined
Error states are defined
Success states are defined
DESIGN
Colors are defined
Typography is defined
Spacing is defined
Components are defined
Responsive behavior is defined
Accessibility requirements are defined
TECHNICAL
Tech stack is defined
Architecture is documented
Project structure is documented
Data flow is documented
Database schema is planned
API contracts are defined
SECURITY
Authentication is defined
Authorization is defined
Secrets strategy is defined
Sensitive data is identified
API security requirements are documented
CODE
Naming conventions are defined
Folder conventions are defined
Formatting rules are defined
Error handling is defined
Logging rules are defined
TESTING
Critical user flows identified
Test strategy defined
Test tools selected
Definition of done defined
Build validation defined
AI
AGENTS.md exists
AI workflow defined
Source of truth defined
Validation process defined
Documentation update process defined

PART 12 — THE MINIMUM DOCUMENTATION STACK
Don't want to create everything?

Use this.

Absolute Minimum
PRD.md

DESIGN_SYSTEM.md

ARCHITECTURE.md

AGENTS.md

Recommended
PRD.md

DESIGN_SYSTEM.md

UX_FLOWS.md

ARCHITECTURE.md

DATABASE.md

API.md

SECURITY.md

CODE_STYLE.md

TESTING.md

AGENTS.md

Production-Ready Documentation
PRD.md

DESIGN_SYSTEM.md

UX_FLOWS.md

ARCHITECTURE.md

DATABASE.md

API.md

SECURITY.md

CODE_STYLE.md

TESTING.md

AGENTS.md

ENVIRONMENT.md

ERROR_HANDLING.md

DEPLOYMENT.md

OBSERVABILITY.md

DECISIONS.md

ROADMAP.md

CHANGELOG.md


PART 13 — THE GOLDEN RULES OF AI-ASSISTED DEVELOPMENT
Rule #1
Context before code.


Rule #2
Architecture before implementation.


Rule #3
Define important decisions instead of repeatedly re-deciding them.


Rule #4
Make requirements explicit.


Rule #5
Don't let AI guess when the answer can be documented.


Rule #6
Keep your documentation close to your code.


Rule #7
Validate AI-generated code instead of blindly trusting it.


Rule #8
Update your documentation when your system changes.


Rule #9
Use AI to accelerate implementation, not to replace product thinking.


PART 14 — THE COMPLETE FLOW
Here's the complete process:

                   YOUR IDEA

                        ↓

                     PRD.md

                        ↓

                  UX_FLOWS.md

                        ↓

               DESIGN_SYSTEM.md

                        ↓

                ARCHITECTURE.md

                        ↓

                  DATABASE.md

                        ↓

                     API.md

                        ↓

                  SECURITY.md

                        ↓

                CODE_STYLE.md

                        ↓

                  TESTING.md

                        ↓

                   AGENTS.md

                        ↓

                  AI CODING AGENT

                        ↓

                   IMPLEMENTATION

                        ↓

                    TESTING

                        ↓

                   CODE REVIEW

                        ↓

               DOCUMENTATION UPDATE

                        ↓

                    SHIP 🚀


PART 15 — COPY-PASTE PROJECT BOOTSTRAP PROMPT
Use this when starting a completely new project.

I want to build a new application.


Do not start coding yet.


First, help me create the project documentation.


Create the following documentation:


1. PRD.md

2. DESIGN_SYSTEM.md

3. UX_FLOWS.md

4. ARCHITECTURE.md

5. DATABASE.md

6. API.md

7. SECURITY.md

8. CODE_STYLE.md

9. TESTING.md

10. AGENTS.md


For each document:


- Clearly explain its purpose

- Identify assumptions

- Identify unresolved questions

- Keep requirements explicit

- Avoid inventing business decisions

- Reuse decisions consistently across documents


Start with PRD.md.


Ask me only the questions that are necessary to define

the product correctly.


Do not generate application code until the documentation

has been reviewed and approved.


PART 16 — COPY-PASTE FEATURE PROMPT
Whenever you want to add a feature:

I want to add this feature:


[FEATURE]


Before changing code:


1. Read the relevant documentation.

2. Identify which documents are affected.

3. Inspect the existing implementation.

4. Explain the current architecture relevant to this feature.

5. Identify affected frontend files.

6. Identify affected backend/API files.

7. Identify database changes.

8. Identify security considerations.

9. Identify tests required.

10. Create an implementation plan.


Do not modify unrelated parts of the project.


After implementation:


- Run tests

- Run lint

- Run type checking

- Run the build

- Review the final diff

- Update documentation if required


PART 17 — COPY-PASTE CODE REVIEW PROMPT
After AI finishes a feature:

Review the changes you just made as a senior engineer.


Check for:


- Incorrect requirements

- Architecture violations

- Duplicate logic

- Unnecessary abstractions

- Security issues

- Database issues

- API inconsistencies

- Accessibility issues

- Responsive UI issues

- Error handling issues

- Missing loading/empty/error states

- Missing tests

- Regressions

- Unnecessary dependencies

- Unintended file changes


Compare the implementation against /docs.


Do not modify anything yet.


First provide:


1. Findings

2. Severity

3. Recommended fixes

4. Documentation that should be updated


PART 18 — WHEN SHOULD YOU UPDATE EACH DOCUMENT?
Change

Update

Product requirement changes

PRD.md

User journey changes

UX_FLOWS.md

Visual changes

DESIGN_SYSTEM.md

New architecture

ARCHITECTURE.md

Database changes

DATABASE.md

API changes

API.md

Security changes

SECURITY.md

Coding convention changes

CODE_STYLE.md

Testing strategy changes

TESTING.md

AI behavior changes

AGENTS.md

Environment changes

ENVIRONMENT.md

Failure behavior changes

ERROR_HANDLING.md

Production process changes

DEPLOYMENT.md

Architecture decision

DECISIONS.md

Future priorities

ROADMAP.md

Release changes

CHANGELOG.md


PART 19 — THE MOST IMPORTANT PRINCIPLE
Documentation is not bureaucracy.

The purpose isn't to write hundreds of pages nobody reads.

The purpose is to eliminate ambiguity.

A good document should help answer:

What should happen?

Why should it happen?

How should it work?

What constraints exist?

What should the AI never assume?

How do we know it works?

That's the real value of documentation in AI-assisted development.


FINAL CHECKLIST
Before you tell your AI:

"Build the app."

Make sure you can answer these questions:

Product
What are we building?

Who is it for?

What problem does it solve?

UX
What does the user actually do?

Design
What should the application look like?

Architecture
How should the system work?

Data
What information does the system store?

API
How do different parts communicate?

Security
What needs to be protected?

Code
What conventions should the implementation follow?

Testing
How do we know the application works?

AI
What rules should the coding agent follow?

If those answers are documented, your AI has a much stronger foundation to work from.


THE FINAL RULE
Don't start with:
"Build me an app."

Start with:
"Here is everything you need to know about the app."

Then let AI build.


QUICK COPY-PASTE VERSION
For your actual project, the initial /docs folder can simply be:

docs/

├── PRD.md

├── DESIGN_SYSTEM.md

├── UX_FLOWS.md

├── ARCHITECTURE.md

├── DATABASE.md

├── API.md

├── SECURITY.md

├── CODE_STYLE.md

├── TESTING.md

└── AGENTS.md

Then expand it as the project becomes more complex.


THE VIBE CODING BLUEPRINT
Idea → Context → Documentation → Plan → Code → Validate → Ship
Build faster. Guess less.

— The Automation Guy

