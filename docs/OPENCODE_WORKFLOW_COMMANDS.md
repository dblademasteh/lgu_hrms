# OpenCode Workflow Commands

> **Source**: `farmage/opencode-skills` repository — 66 skills + 13 commands
> **Scope**: Jira/Confluence-integrated development workflow from assumption surfacing through sprint retrospectives
> **Last updated**: 2026-09-26

---

## Table of Contents

1. [Workflow Chain Overview](#1-workflow-chain-overview)
2. [Master Command Reference](#2-master-command-reference)
3. [Discovery Phase](#3-discovery-phase)
4. [Planning Phase](#4-planning-phase)
5. [Execution Phase](#5-execution-phase)
6. [Completion Phase](#6-completion-phase)
7. [Sprint Retrospective](#7-sprint-retrospective)
8. [Reference Documents](#8-reference-documents)
9. [Usage Examples](#9-usage-examples)

---

## 1. Workflow Chain Overview

The workflow commands form a linear pipeline that moves from **assumption surfacing** → **discovery research** → **planning** → **ticket execution** → **completion** → **retrospective**.

```mermaid
graph LR
    A[/common-ground/] --> B[/discovery/create/]
    B --> C["[Manual Research<br/>Interviews<br/>Experiments]"]
    C --> D[/discovery/synthesize/]
    D --> E[/discovery/approve/]
    E --> F[/planning/epic-plan/]
    F --> G[/planning/impl-plan/]
    G --> H[/execution/execute-ticket/]
    H --> I[/execution/complete-ticket/]
    I --> J[/retrospectives/complete-epic/]
    J --> K[/retrospectives/complete-sprint/]

    style A fill:#1d4ed8,color:#fff
    style B fill:#0f766e,color:#fff
    style D fill:#0f766e,color:#fff
    style E fill:#0f766e,color:#fff
    style F fill:#7c3aed,color:#fff
    style G fill:#7c3aed,color:#fff
    style H fill:#ea580c,color:#fff
    style I fill:#ea580c,color:#fff
    style J fill:#dc2626,color:#fff
    style K fill:#dc2626,color:#fff
```

### Phase Map

| Phase | Commands | Output |
|-------|----------|--------|
| **0. Foundation** | `/common-ground` | Validated assumptions file |
| **1. Discovery** | `/discovery/create`, `/discovery/synthesize`, `/discovery/approve` | Discovery doc → Synthesis → Jira tickets |
| **2. Planning** | `/planning/epic-plan`, `/planning/impl-plan` | Overview Document → Implementation Plan |
| **3. Execution** | `/execution/execute-ticket`, `/execution/complete-ticket` | Implementation + Verification |
| **4. Completion** | `/retrospectives/complete-epic`, `/retrospectives/complete-sprint` | Epic Report → Sprint Retrospective |

---

## 2. Master Command Reference

| Command | Arguments | Description | Agent |
|---------|-----------|-------------|-------|
| `/common-ground` | `--list \| --check \| --graph \| (none)` | Surface and validate hidden assumptions about the project | `build` |
| `/discovery/create` | `<epic-key>` | Create a discovery document for research/customer discovery epics | `build` |
| `/discovery/synthesize` | `<url-1> [<url-2> ...] [--target=CC-XX]` | Synthesize discovery findings into a consolidated analysis with proposed tickets | `build` |
| `/discovery/approve` | `<synthesis-url> [--decision=D1:OptionB]` | Approve synthesis findings and create implementation tickets | `build` |
| `/planning/epic-plan` | `<epic-key>` | Create a comprehensive planning document by analyzing Jira tickets and codebase | `build` |
| `/planning/impl-plan` | `<overview-doc-url>` | Generate an implementation plan with coordination dashboard and self-contained Jira tickets | `build` |
| `/execution/execute-ticket` | `<ticket-key>` | Execute a Jira ticket following its implementation plan | `build` |
| `/execution/complete-ticket` | `<ticket-key>` | Finalize a ticket after execution — transitions Jira to "In Review" | `build` |
| `/retrospectives/complete-epic` | `<epic-key>` | Complete an epic after all tickets are executed — generates report and closes in Jira | `build` |
| `/retrospectives/complete-sprint` | `<sprint-folder \| sprint-number>` | Generate comprehensive sprint retrospective from completed epics | `build` |

---

## 3. Discovery Phase

### 3.1 `/common-ground` — Surface Assumptions

**Purpose**: Claude often operates on hidden assumptions about project context, technology choices, coding standards, and user preferences. This command surfaces those assumptions for explicit user validation before proceeding with any work.

**Description**: `Surface and validate Claude's hidden assumptions about the project for user confirmation`

**Syntax**:
```bash
/common-ground            # Default: interactive two-phase surfacing
/common-ground --list     # Read-only view of all tracked assumptions
/common-ground --check    # Quick validation of current assumptions
/common-ground --graph    # Generate mermaid diagram of reasoning structure
```

**Outputs**:
- Assumptions file (`common-ground.md`) in the project root or a `.opencode/` directory
- Optionally generates a reasoning graph diagram (with `--graph` flag)

**Use Case**: Run this at the very start of any new feature or project to align Claude's mental model with the user's expectations.

---

### 3.2 `/discovery/create` — Create Discovery Document

**Purpose**: Create a structured discovery document for research and customer discovery epics.

**Description**: `Create a discovery document for research/customer discovery epics`

**Syntax**:
```bash
/discovery/create <epic-key>
```

**Arguments**:
- `{epic-key}` — Jira epic key (e.g., `CC-123`)

**Workflow Chain**:
```
/discovery/create <epic-key>  → Creates Discovery Document (YOU ARE HERE)
         ↓
[Manual research, interviews, experiments]
         ↓
/discovery/synthesize <doc-urls...>  → Synthesizes findings into actionable tickets
         ↓
Creates tickets in target implementation epics
```

**Outputs**:
- Confluence discovery document at `/Epics/Discovery/{epic-key}/`
- Template for research notes, customer interviews, and experiments

**Failure Conditions**:
- Epic cannot be found or has no linked tickets → stops and prompts user for Jira URL and Confluence location

---

### 3.3 `/discovery/synthesize` — Synthesize Findings

**Purpose**: Consolidate research findings from one or more sources into an actionable synthesis document with proposed implementation tickets.

**Description**: `Synthesize discovery findings into a consolidated analysis document with proposed tickets`

**Syntax**:
```bash
/discovery/synthesize <url-1> [<url-2> ...] [--target=CC-XX]
```

**Arguments**:
- `{source-urls}` — One or more Confluence document URLs (space-separated)
- `{target-epic}` — Optional target implementation epic via `--target=CC-XX`

**Examples**:
```bash
/discovery/synthesize https://confluence/doc1
/discovery/synthesize https://confluence/doc1 https://confluence/doc2
/discovery/synthesize https://confluence/doc1 --target=CC-62
/discovery/synthesize doc1-url doc2-url doc3-url --target=CC-62
```

**Supported Source Types**:
- Discovery Documents (from `/discovery/create`)
- Research findings documents
- Interview summaries
- Technical spike reports
- Competitive analysis documents
- Any Confluence page with structured findings

**Workflow Chain**:
```
/discovery/create <epic-key>  → Discovery Document
         ↓
[Manual research, interviews, experiments]
         ↓
/discovery/synthesize <doc-urls...>  → Synthesis Document (YOU ARE HERE)
         ↓
Creates tickets in target implementation epics
```

**Outputs**:
- Confluence synthesis document with consolidated findings
- Proposed Jira tickets with acceptance criteria

---

### 3.4 `/discovery/approve` — Approve & Create Tickets

**Purpose**: Review and approve the synthesis document, resolve decisions, and create implementation tickets in Jira.

**Description**: `Approve synthesis findings and create implementation tickets from discovery`

**Syntax**:
```bash
/discovery/approve <synthesis-url> [--decision=D1:OptionB]
```

**Arguments**:
- `{synthesis-url}` — Confluence synthesis document URL (required)
- `{decisions}` — Optional pre-resolved decisions via `--decision=D1:OptionB`

**Examples**:
```bash
/discovery/approve https://confluence/synthesis-doc
/discovery/approve https://confluence/synthesis-doc --decision=D1:B --decision=D2:Y
```

**Workflow Chain**:
```
/discovery/synthesize <doc-urls...>  → Synthesis Document
         ↓
/discovery/approve <synthesis-url>  → Creates Jira Tickets (YOU ARE HERE)
         ↓
/planning/impl-plan <overview-doc>  → Implementation planning continues
```

**Outputs**:
- Jira tickets created from approved synthesis (self-contained with implementation steps)
- Decisions log recorded

---

## 4. Planning Phase

### 4.1 `/planning/epic-plan` — Create Epic Planning Document

**Purpose**: Generate a comprehensive planning document (Overview Document) by analyzing Jira tickets and the codebase for an epic.

**Description**: `Create an epic planning document by analyzing Jira tickets and codebase`

**Syntax**:
```bash
/planning/epic-plan <epic-key>
```

**Arguments**:
- `{epic-key}` — Jira epic key (e.g., `CC-123`)

**Workflow Chain**:
```
/discovery/approve <synthesis-url>  → Creates Jira Tickets
         ↓
/planning/epic-plan <epic-key>     → Creates Overview Document (YOU ARE HERE)
         ↓
/planning/impl-plan <overview-doc>  → Creates Implementation Plan
         ↓
/execution/execute-ticket <ticket-key>  → Executes individual tickets
```

**Outputs**:
- Confluence overview document at `/Epics/In Progress/{epic-key}/`
- Analysis of codebase patterns, dependencies, and risks
- Epic scope definition

**Failure Conditions**:
- Epic cannot be found or has no linked tickets → stops and prompts user for Jira URL

---

### 4.2 `/planning/impl-plan` — Generate Implementation Plan

**Purpose**: Transform the overview document into a detailed implementation plan with a coordination dashboard and self-contained Jira tickets.

**Description**: `Generate an implementation plan from a planning document`

**Syntax**:
```bash
/planning/impl-plan <overview-doc-url>
```

**Arguments**:
- `{overview-doc-url}` — URL of the overview/planning document from `/planning/epic-plan`

**Workflow Chain**:
```
/planning/epic-plan <epic-key>     → Creates Overview Document
         ↓
/planning/impl-plan <overview-doc-url>  → Creates Implementation Plan (YOU ARE HERE)
         ↓
/execution/execute-ticket <ticket-key>     → Executes individual tickets
```

**Outputs**:
1. **Implementation Plan (Confluence)** — Coordination dashboard for tracking execution
2. **Updated Jira Tickets** — Self-contained with full implementation details

**Implementation Details Captured**:
- File lists to modify
- Implementation steps
- Test code requirements
- Acceptance criteria
- Parallel execution opportunities (waves)

---

## 5. Execution Phase

### 5.1 `/execution/execute-ticket` — Execute Ticket

**Purpose**: Execute a Jira ticket following its implementation plan — writes code, runs tests, and produces a completion summary.

**Description**: `Execute a Jira ticket following its implementation plan`

**Syntax**:
```bash
/execution/execute-ticket <ticket-key>
```

**Arguments**:
- `{ticket-key}` — Jira ticket key (e.g., `CC-456`)

**Workflow Chain**:
```
/planning/impl-plan <overview-doc-url>  → Creates Implementation Plan
         ↓
/execution/execute-ticket <ticket-key>     → Executes individual tickets (YOU ARE HERE)
         ↓
/execution/complete-ticket <ticket-key>   → Finalize ticket
```

**Phases**:
1. **Context Retrieval** — Fetch Jira ticket, verify self-contained with steps/files/test requirements
2. **Preparation** — Review implementation steps, read impl plan, explore codebase, check parallel opportunities
3. **Parallel Execution Check** — Identify current wave of tickets that can run in parallel
4. **Implementation** — Execute implementation steps, create/verify files, run tests
5. **Quality Check** — Run linter, type checker, tests
6. **Completion Summary** — Document changes made, files modified, tests run

---

### 5.2 `/execution/complete-ticket` — Complete Ticket

**Purpose**: Finalize a ticket after execution by transitioning Jira and updating the implementation plan dashboard.

**Description**: `Complete a ticket after execution - transitions Jira to "In Review" and updates the implementation plan`

**Syntax**:
```bash
/execution/complete-ticket <ticket-key>
```

**Arguments**:
- `{ticket-key}` — Jira ticket key (optional if following recent `/execution/execute-ticket`)

**Purpose**: Finalize a ticket after `/execution/execute-ticket` by transitioning Jira to "In Review" and updating the implementation plan.

**Steps**:
1. **Identify Ticket and Context** — Use argument or look back in conversation for most recently executed ticket
2. **Gather Completion Details** — Extract implementation plan URL, changes made, files modified from the execution summary
3. **Update Implementation Plan** — Mark ticket as complete in the coordination dashboard
4. **Transition Jira** — Move ticket to "In Review" status
5. **Report** — Summarize for user confirmation

**Failure Conditions**:
- Ticket cannot be identified from argument or conversation → prompts user

---

## 6. Completion Phase

### 6.1 `/retrospectives/complete-epic` — Complete Epic

**Purpose**: Complete an epic after all tickets are executed — generates a comprehensive completion report and closes the epic in Jira.

**Description**: `Complete an epic after all tickets are executed, generate report, and close in Jira`

**Syntax**:
```bash
/retrospectives/complete-epic <epic-key>
```

**Arguments**:
- `{epic-key}` — Jira epic key

**Workflow Chain**:
```
/execution/complete-ticket <ticket-key>  → Finalize ticket
         ↓
/retrospectives/complete-epic <epic-key>  → Completes epic (YOU ARE HERE)
         ↓
/retrospectives/complete-sprint <sprint-folder>  → Sprint retrospective
```

**Phase 0: Context Retrieval**:
1. Fetch the epic from Jira
2. Extract: epic title, Jira project URL, linked tickets, epic status
3. Locate documentation: overview document, implementation plan, all completed tickets
4. **Failure condition**: If epic not found or still has open tickets

**Outputs**:
- Epic completion report (Confluence)
- Jira transition to "Closed" or "Done"
- Summary of what was built, lessons learned, and remaining items

---

## 7. Sprint Retrospective

### 7.1 `/retrospectives/complete-sprint` — Sprint Retrospective

**Purpose**: Generate a comprehensive sprint retrospective report by analyzing all completed epics from the sprint.

**Description**: `Generate comprehensive sprint retrospective from completed epics`

**Syntax**:
```bash
/retrospectives/complete-sprint <sprint-folder>
```

**Arguments**:
- `{sprint-folder}` — A sprint number (e.g., `1`, `2`) or a Confluence folder path

**Workflow Chain**:
```
/planning/epic-plan <epic-key>     → Creates Overview Document
         ↓
/planning/impl-plan <overview-doc-url>  → Creates Implementation Plan
         ↓
/execution/execute-ticket <ticket-key>     → Executes individual tickets
         ↓
/retrospectives/complete-epic <epic-key>  → Completes epic
         ↓
/retrospectives/complete-sprint <sprint-folder> → Sprint retrospective (YOU ARE HERE)
```

**Phase 0: Context Retrieval**:
1. Determine sprint identifier:
   - If number: `Sprint [N]`
   - If path: Use as Confluence folder path
   - Default folder: `/Epics/Complete/Sprint [N]/`
2. Locate all epic documents in the sprint folder:
   - All Overview Documents
   - All Implementation Plans
   - All Completion Reports

**Phase 1: Analysis**:
- Aggregate all epic reports
- Analyze delivery metrics (velocity, throughput)
- Extract lessons learned across epics
- Identify cross-cutting themes
- Review team performance and blockers

**Phase 2: Retrospective Report**:
- Sprint summary with key metrics
- What went well
- What didn't go well
- Action items for next sprint
- Process improvement recommendations

**Outputs**:
- Sprint retrospective document (Confluence)
- Actionable improvement items

---

## 8. Reference Documents

These are internal reference files that support the workflow commands (loaded contextually):

| Reference | Purpose | Load When |
|-----------|---------|-----------|
| `references/assumption-classification.md` | Assumption types and tiers | Classifying assumptions, determining type or tier |
| `references/file-management.md` | Storage operations, project IDs, ground file format | Storage operations, project ID, ground file format |
| `references/reasoning-graph.md` | Using `--graph` flag, generating mermaid diagrams | Using --graph flag, generating mermaid diagrams |

---

## 9. Usage Examples

### Starting a New Feature Workflow

```bash
# 1. Surface assumptions first
/common-ground

# 2. Create discovery for an epic
/discovery/create CC-100

# ... conduct manual research, interviews, experiments ...

# 3. Synthesize findings
/discovery/synthesize https://confluence/dispo-1 https://confluence/intv-1

# 4. Approve and create tickets
/discovery/approve https://confluence/synth-1

# 5. Plan the epic
/planning/epic-plan CC-100

# 6. Generate implementation plan
/planning/impl-plan https://confluence/overview-1

# 7. Execute a ticket
/execution/execute-ticket CC-101

# 8. Complete the ticket
/execution/complete-ticket CC-101

# ... repeat 7-8 for all tickets in the epic ...

# 9. Complete the epic
/retrospectives/complete-epic CC-100

# 10. Complete sprint retrospective
/retrospectives/complete-sprint 5
```

### Pre-resolving Discovery Decisions

```bash
# Skip interactive decision prompts by pre-resolving
/discovery/approve https://confluence/synth-1 --decision=D1:B --decision=D2:Y
```

### Checking Assumptions (Read-Only)

```bash
# List current assumptions without modifying
/common-ground --list

# Quick check
/common-ground --check

# Generate reasoning graph
/common-ground --graph
```

---

## For LGU-HRMS Use

These workflow commands assume Jira + Confluence integration via the **Atlassian MCP server**. For the LGU-HRMS project (which is not currently Jira-integrated), the workflow can be adapted:

1. **`/common-ground`** — Still useful to surface assumptions before any work
2. **`/discovery/*`** — Replace Confluence URLs with local `docs/` files
3. **`/planning/*`** — Replace with `DESIGN.md` + `src/docs/` documents
4. **`/execution/execute-ticket`** — Adapt to use GitHub Issues instead of Jira
5. **`/retrospectives/*`** — Replace with `TODOS.md` + commit log analysis

