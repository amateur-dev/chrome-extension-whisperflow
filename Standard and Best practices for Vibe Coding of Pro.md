<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Standard and Best practices for Vibe Coding of Production Applications.  What MD files must be there in the Repo?

**Vibe Coding** is a development philosophy popularized in early 2025 (notably by Andrej Karpathy) where the developer focuses on high-level intent ("the vibe") and delegates the actual syntax and implementation to AI models.

In this paradigm, you shift from being a "writer of code" to a "manager of context." Since you aren't manually writing every line, your repository structure must serve as the **long-term memory** for the AI.

### The "Memory Bank" Standard (Required MD Files)

For production applications, the current industry standard is to maintain a dedicated context folder (often called `.context/`, `docs/`, or `memory-bank/`) containing specific Markdown files. These files ensure the AI never "hallucinates" the state of your project.

You **must** have these files to keep the AI aligned:


| Filename | Purpose |
| :-- | :-- |
| **`PRD.md`** | **Product Requirements Document.** The source of truth. It describes *what* you are building, the user flows, and the "done" state. |
| **`TECH_STACK.md`** | **Technology decisions.** Explicitly lists frameworks, libraries, and versions (e.g., "Next.js 15, Tailwind, Supabase"). This prevents the AI from randomly swapping libraries mid-project. |
| **`ARCH.md`** | **Architecture \& File Structure.** Describes high-level patterns, data flow, and key directories. It helps the AI understand where new code should live. |
| **`PLAN.md`** | **Implementation Plan.** A step-by-step checklist of what has been done and what is next. You update this (or ask the AI to update it) after every major task. |
| **`RULES.md`** | **AI Behavior Rules.** (Also known as `.cursorrules` or `AGENTS.md`). Contains coding standards (e.g., "Always use TypeScript interfaces," "No `useEffect` without dependency checks"). |


***

### Best Practices for Production Vibe Coding

#### 1. The "10-Minute Rule" for Iterations

Never ask the AI to "build the dashboard." That is too vague and leads to spaghetti code.

* **Best Practice:** Break requests into 10-minute chunks. "Create the skeleton component for the sidebar," then "Add the navigation links," then "Style the active states."
* **Why:** If the AI messes up a small chunk, you can revert immediately. If it messes up a massive feature, you have to debug code you didn't write.


#### 2. Evals Over Syntax (Trust but Verify)

In Vibe Coding, you rarely read every line of code. Instead, you heavily audit the **output**.

* **Best Practice:** Maintain a `TESTING.md` or `EVALS.md` that lists manual "vibe checks" (e.g., "Click login -> see spinner -> redirect to dashboard").
* **Visual Verification:** Frequently take screenshots of errors or weird UI behaviors and paste them back into the chat. Visual feedback is often faster than text descriptions for fixing CSS "vibes."


#### 3. Commit "Checkpoints" Frequently

Since the AI generates code fast, it can also break things fast.

* **Best Practice:** Commit to Git after *every* successful step in your `PLAN.md`.
* **Commit Message Style:** Use descriptive messages like `feat: implemented sidebar skeleton (AI-generated)`. If a vibe coding session goes wrong, you simply `git reset --hard` to the last checkpoint rather than trying to "fix" the AI's mess.


#### 4. The "Context Refresh"

AI models have a limited context window. As your project grows, the AI might forget early instructions.

* **Best Practice:** Before starting a complex task, ask the AI to "Read `PRD.md` and `ARCH.md` and summarize the current constraints." This forces the model to reload the critical context into its active memory.


### Summary of Repository Structure

A robust Vibe Coding repo often looks like this:

```text
my-app/
├── .cursorrules          # Instructions for the AI editor (Cursor)
├── src/                  # Actual code
├── docs/                 # The AI's "Brain"
│   ├── PRD.md            # What we want
│   ├── TECH_STACK.md     # How we build it
│   ├── ARCH.md           # How it's organized
│   └── PLAN.md           # Progress tracker
└── README.md             # For human developers
```

<span style="display:none">[^1_1][^1_10][^1_11][^1_12][^1_13][^1_14][^1_15][^1_2][^1_3][^1_4][^1_5][^1_6][^1_7][^1_8][^1_9]</span>

<div align="center">⁂</div>

[^1_1]: https://www.producthunt.com/p/vibecoding/vibe-coding-best-practices-and-must-have-md-files

[^1_2]: https://dev.to/dumebii/the-ultimate-prompt-strategy-how-to-vibe-code-production-ready-websites-4e9

[^1_3]: https://github.com/cpjet64/vibecoding/blob/main/prd-guide.md

[^1_4]: https://www.builder.io/blog/agents-md

[^1_5]: https://leehanchung.github.io/blogs/2025/05/04/vibe-coding/

[^1_6]: https://en.wikipedia.org/wiki/Vibe_coding

[^1_7]: https://emergent.sh/learn/vibe-coding-best-practices

[^1_8]: https://learnhowtovibecode.com

[^1_9]: https://www.linkedin.com/pulse/vibe-coding-ai-fabian-best-practices-every-project-fabian-williams--hljke

[^1_10]: https://www.klover.ai/andrej-karpathy-vibe-coding/

[^1_11]: https://stack.convex.dev/vibe-coding-to-production

[^1_12]: https://www.reddit.com/r/vibecoding/comments/1l6x5f8/15_years_coding_never_seen_this_many_markdown/

[^1_13]: https://www.reddit.com/r/Anthropic/comments/1q43gsd/whats_the_best_way_to_vibe_code_for/

[^1_14]: https://lovable.dev/blog/what-is-vibe-coding

[^1_15]: https://kuberns.com/blogs/post/vibe-coding-best-practices/


---

# Can we get more detailed and technical or better at this?  Is this a generic answer?  are there docs like CLAUDE.md or GITHUBAGENT.md or something?

Yes, the previous answer was the "Level 1" generic version. Since you are asking for `CLAUDE.md`, you are likely looking for the **Level 2 (Tool-Specific Configs)** and **Level 3 (Autonomous Memory Banks)** protocols.

"Vibe Coding" in production has split into two distinct technical schools: **Assisted (Cursor/Copilot)** and **Autonomous (Cline/Roo/Claude Code)**. Each has strict file standards to manage the LLM's limited context window.

Here is the technical breakdown of the exact files you need for a production-grade setup.

### 1. The "Memory Bank" Standard (Level 3 - Autonomous Agents)

If you are using tools like **Cline**, **Roo Code**, or custom agents, the "Memory Bank" is the industry standard. It is not just a documentation folder; it is a **read/write database** for the AI.

The AI is instructed to *read* these files at the start of a task and *update* them before it runs out of context.

**Location:** `docs/memory-bank/` or `.roomodes/`


| Filename | Technical Purpose \& Content |
| :-- | :-- |
| **`productContext.md`** | **The "Why".** Contains the PRD, user stories, and "done" criteria. <br> *Critical for:* Preventing scope creep. The AI checks this to see if a requested feature aligns with the project goals. |
| **`activeContext.md`** | **The "RAM".** Tracks the *current* session's state. <br> *Structure:* <br> - `## Current Focus`: What we are doing *right now*.<br> - `## Recent Changes`: A log of the last 3-4 file edits.<br> - `## Next Steps`: Immediate to-do list for the next prompt. |
| **`systemPatterns.md`** | **The "Code DNA".** Captures architecture decisions to prevent spaghetti code.<br> *Example:* "All API calls must use the `useFetch` hook; never call `axios` directly in components."<br> *Auto-updated:* If the AI invents a new pattern, it must document it here. |
| **`techContext.md`** | **The "Constraints".** Hard technical limits.<br> *Content:* Library versions, database schema definitions, API keys (referenced, not values), and development environment quirks. |
| **`progress.md`** | **The "Status Bar".** A high-level checklist of the entire project status.<br> *Why:* When you come back after 2 weeks, the AI reads this to know if the project is 10% or 90% done. |


***

### 2. Tool-Specific Configuration Files (Level 2)

These are "Instruction Files" that configure the AI's behavior and system prompt. You typically need **one** of these depending on your primary tool.

#### A. For Anthropic / Claude Code: `CLAUDE.md`

This is a configuration file specifically for the **Claude Code CLI**. It is treated as authoritative system rules.

* **Location:** Root of repository.
* **Key Contents:**
    * **Commands:** Tell Claude how to run tests and build. (e.g., `test: npm test`, `lint: eslint .`).
    * **Style:** Coding conventions (e.g., "Use functional components").
    * **Architecture:** Brief map of key directories.
* **Pro Tip:** Run `claude /init` in your root to auto-generate a draft of this file based on your codebase.


#### B. For Cursor: `.cursorrules`

This file is injected into the system prompt of every chat in Cursor.

* **Location:** `.cursorrules` (Root) or `.cursor/rules/` (for modular rules).
* **Technical Best Practice:**
    * **Don't dump docs here.** It consumes token context on *every* request.
    * **Use it for Behavior:** "Always respond in concise code blocks," "Prefer arrow functions," "If I ask for a 'fix', show me a unified diff first."


#### C. For GitHub Copilot: `.github/copilot-instructions.md`

This is the standard context file for GitHub Copilot in VS Code.

* **Location:** `.github/copilot-instructions.md`
* **Usage:** Copilot reads this file to understand your specific repo standards.
* **New Feature:** You can also have path-specific instructions like `.github/instructions/react-components.instructions.md` that only trigger when you are editing a file that matches a specific pattern (e.g., `*.tsx`).

***

### 3. The "Context Refresh" Workflow (Technical)

In production, "Vibe Coding" fails when the context window (128k-200k tokens) fills up with chat history. The AI gets "dumber" and forgets the `PRD.md`.

**The Technical Fix:** Use a "Reset Protocol."

1. **Stop:** When the AI starts making circular errors or "hallucinating" imports.
2. **Update Memory:** Command the AI: *"Update `activeContext.md` and `progress.md` with our latest status, then stop."*
3. **Clear Context:** Delete the chat session / start a new thread.
4. **Bootstrap:** Start the new chat with: *"Read `docs/memory-bank/activeContext.md`. What were we working on?"*

### Summary Checklist for a "Pro" Repo

To be "better at this," your repo should look like this:

```text
my-production-app/
├── .cursorrules           # Behavior rules (if using Cursor)
├── .github/
│   └── copilot-instructions.md # If using Copilot
├── CLAUDE.md              # If using Claude Code
├── docs/
│   └── memory-bank/       # The BRAIN (for long-term state)
│       ├── activeContext.md
│       ├── productContext.md
│       ├── systemPatterns.md
│       └── techContext.md
└── src/
```

<span style="display:none">[^2_1][^2_10][^2_11][^2_12][^2_13][^2_14][^2_15][^2_16][^2_17][^2_18][^2_19][^2_2][^2_20][^2_21][^2_22][^2_23][^2_24][^2_25][^2_26][^2_27][^2_28][^2_29][^2_3][^2_30][^2_4][^2_5][^2_6][^2_7][^2_8][^2_9]</span>

<div align="center">⁂</div>

[^2_1]: https://claude.com/blog/using-claude-md-files

[^2_2]: https://www.anthropic.com/engineering/claude-code-best-practices

[^2_3]: https://www.reddit.com/r/ClaudeAI/comments/1mecx5t/how_we_structure_our_claudemd_file_and_why/

[^2_4]: https://apidog.com/blog/claude-md/

[^2_5]: https://claudelog.com/faqs/what-is-claude-md/

[^2_6]: https://appwrite.io/blog/post/comparing-vibe-coding-tools

[^2_7]: https://www.youtube.com/watch?v=a7nJeXk6VxU

[^2_8]: https://www.claude.com/blog/using-claude-md-files

[^2_9]: https://www.linkedin.com/posts/andrei-heliver_lets-continue-the-topic-so-if-vibe-coding-activity-7397276296537448448-Ytz5

[^2_10]: https://www.reddit.com/r/vibecoding/comments/1jrtj2w/stepbystep_process_for_structured_vibe_coding/

[^2_11]: https://stevekinney.com/courses/ai-development/claude-dot-md

[^2_12]: https://www.reddit.com/r/ClaudeAI/comments/1j5t1nh/my_cursor_claude_37t_method_the_opposite_of_vibe/

[^2_13]: https://wandb.ai/ai-team-articles/antigravity/reports/Advanced-context-engineering-guide-for-vibe-coding--VmlldzoxNTc3MTMxMg

[^2_14]: https://www.builder.io/blog/claude-md-guide

[^2_15]: https://www.youtube.com/watch?v=OSBo9qcpRfw

[^2_16]: https://www.youtube.com/watch?v=Jt3i1a5tSbM

[^2_17]: https://docs.github.com/en/copilot/tutorials/use-custom-instructions

[^2_18]: https://docs.github.com/en/copilot/tutorials/customization-library/custom-instructions/your-first-custom-instructions

[^2_19]: https://docs.github.com/en/copilot/how-tos/configure-custom-instructions

[^2_20]: https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions?tool=vscode

[^2_21]: https://www.npmjs.com/package/@automateeverything.cc/roo-code-memory-bank

[^2_22]: https://www.linkedin.com/posts/mariogiancini_claude-code-just-shipped-an-improved-memory-activity-7404662587814182913-n3dW

[^2_23]: https://devblogs.microsoft.com/java/customize-github-copilot-in-jetbrains-with-custom-instructions/

[^2_24]: https://github.com/dazeb/cline-mcp-memory-bank

[^2_25]: https://www.builder.io/blog/cursor-vs-claude-code

[^2_26]: https://code.visualstudio.com/docs/copilot/customization/custom-instructions

[^2_27]: https://www.youtube.com/watch?v=w6AJqZ5KpmI

[^2_28]: https://www.youtube.com/watch?v=ERp4jxDO22U

[^2_29]: https://github.blog/changelog/2025-09-03-copilot-code-review-path-scoped-custom-instruction-file-support/

[^2_30]: https://ai.rundatarun.io/Practical+Applications/cline-roo-code-quick-start

