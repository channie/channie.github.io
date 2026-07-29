---
title: Early Lessons from Building an AI Podcast Workflow
date: 2026-05-23
category: AI & Process
read: 4 min
excerpt: Early notes from building an AI workflow for my French podcast — where the model wanted to summarize instead of tell stories, why taste was the hardest thing to hand over, and how fast iteration loops kept me honest.
hero: ./agents-folder.png
heroWidth: 300
heroAlt: A code editor’s file tree showing an "agents" folder full of Python files — one per role, including cultural_consultant.py, fact_checker.py, draft_quality_reviewer.py, and scriptwriter.py.
featured: true
---

I am still early in building my AI podcast workflow for my podcast, *French, One Curiosity at a Time*.

The original idea came from wanting a kind of podcast I could not quite find: something more curiosity- and story-driven than beginner French-learning podcasts, but more accessible than native French cultural content.

So I thought: maybe I could build an AI workflow that could research topics I was interested in, find good stories, write the script, and turn it into podcast episodes for me.

It is very much not one-click automation yet. But the process of building it has already taught me a few things.

## 1. AI wanted to summarize. I needed it to tell stories.

One thing that surprised me is how much of the work went against what AI is naturally good at. LLMs are very good at compression: summarizing, organizing, distilling, condensing. But a good podcast often needs the opposite. It needs expansion: turning a small curiosity into stories, scenes, characters, tension, and movement.

At one point, working against AI's instinct to summarize felt like a salmon swimming upstream. I kept prompting the model to "expand into interesting stories," which is funny to look back on because... of course I did. The result often sounded like expansion, but was really just stretched summary: fake reactions, inflated filler, and not much actual substance.

The big level-up came when I stopped treating research as one step. I broke it into smaller stages: source finding, source ranking, extraction, story mining, passage extraction, and human review. I also started using extraction tools like Tavily and seriously considered FireCrawl for similar reasons: pulling richer source material directly from articles and interviews instead of relying only on what the model already "knows." The workflow got much better once the model had real raw material to work with.

## 2. Human taste was much harder to hand over to AI than research.

At one point I redesigned the pipeline into a multi-agent workflow after taking Andrew Ng's agentic workflow course. I split the work into more specialized roles: materials research assistant, story miner, story curator, producer, scriptwriter, editor, quality reviewer, and so on. That helped. The producer agent was surprisingly useful, especially for episode arc design, pacing, and transitions. In some ways, it was better than I was at holding the structure when there was a lot of raw material to juggle.

But script voice was different. There, I could usually tell pretty quickly when something felt wrong. The harder part was getting the model to understand that taste and reproduce it reliably. I could get the model to critique a draft, repair a section, or run another pass, but more passes did not reliably mean better writing. One rewrite might make a section smoother while making another section flatter. Another might remove one AI-ish pattern and bring back a different one: fake reactions, polished essay, rhetorical repetition, empty conversational filler.

That was one of the more frustrating parts. It often felt less like steering the AI and more like continuously pulling it away from its natural instincts. The latest models were better at interpreting tone and taste, but they were also more expensive to use repeatedly, especially once I started chunking scripts into sections and running multiple rewrite passes.

## 3. Fast iteration loops became very real, very quickly.

One of the coolest parts of this project is that I kept seeing something I regularly preach at work play out in a much smaller, faster, more intense loop: test earlier, learn faster, and do not spend forever perfecting the plan before you know if the idea works.

At work, that feedback loop might be a sprint, or weeks, or months. In this project, it could be a few hours. Sometimes 15 minutes. That made the effect feel much more immediate. When I followed the principle, I got momentum. When I did not, I could feel myself falling into the void: chatting, refining, redesigning, and then realizing hours later that I still had not checked whether the idea actually improved the output.

One memorable example: I spent hours refining a "show voice DNA" document. I wanted to get the show voice DNA crisp enough that the model could actually use it, using not just instructions but transcript examples from shows I liked. The work was useful for clarifying what I wanted. But by the time I finished, I realized it would blow up the context input for the scriptwriter and likely distract the model from the actual story material.

I should have tested a smaller version first. A tiny experiment would have told me whether the idea actually improved the output before I invested so much time polishing it.

---

Still figuring this out. But I wanted to document these patterns while the failures and surprises are still fresh.
