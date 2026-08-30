---
title: "Getting Out of the Loop: What I Learned Building an Autonomous Agent"
date: 2026-08-26
category: AI & Agents
read: 8 min
excerpt: I rebuilt my podcast's research workflow into an autonomous agent. These are the five things that helped me the most.
hero: ./hero.png
heroVideo: /video/getting-out-of-the-loop.mp4
heroWidth: 720
heroAlt: "Terminal recording of the material agent: it sets a research goal, dispatches lanes, pivots when a lane comes back empty, and weighs the signals to judge its own readiness before routing another round."
ogImage: /og/getting-out-of-the-loop.png
ogImageAlt: "A dark terminal titled 'material agent' listing five research dispatches and a readiness check, hand-annotated in red to show the agent choosing how to pivot and judging its own readiness."
featured: true
---

A few months ago I wrote about the AI workflow I was building for my podcast. Since then I rebuilt a large part of it, and the biggest change is that I'm no longer the bottleneck.

In that earlier version, I was the one gluing the whole research process together, even though I had a workflow of various agents doing various jobs. After a few rounds of searching and extracting, I would review what came back, pull in ChatGPT to read through the details and summarize them faster than I could, decide how to pivot or what to double down, and send it off for another round. I was the coordinator. It worked, but it was slow and heavy, and the research for a single episode could stretch over many hours and several sittings.

At some point I tried to categorize the decisions I was actually making, and they fell into 3 buckets:

1. coordinating the results, and the AI's summary and recommendation of how a pass had turned out
2. judgement calls on whether a story is good enough, or whether a material set is rich enough
3. taste: whether something is interesting, whether something is boring, whether something is meaningful for the type of podcast and episode I want to make

The first two seemed totally reasonable to hand to an agent. The third, taste, I knew would be difficult to outsource to AI, but I was hopeful that I could train it over time and gradually take less of the wheel.

## What I mean by "an autonomous agent"

It's worth saying what I mean by an agent, because the word gets used for almost everything right now.

What I had before was agentic, but not really an autonomous agent. It was a workflow: predefined steps, with different AI profiles doing different jobs at each stage. Anthropic's write-up on [building effective agents](https://www.anthropic.com/engineering/building-effective-agents) draws the line in a way I find useful: "Workflows are systems where LLMs and tools are orchestrated through predefined code paths," while <mark>"agents ... are systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks."</mark>

By that definition, my earlier version was a workflow. What I built after is closer to an agent: it makes its own decisions at runtime, handles forks and situations I didn't script for, and keeps going until it reaches its goal or hits a limit I set.

## The setup, quickly

A bit of context so the rest makes sense. The agent is built on [OpenAI's Agents SDK](https://openai.github.io/openai-agents-python/). Its job is narrow on purpose: prepare the raw research material for an episode by finding real sources and pulling out actual passages, not summarizing or synthesizing them. I want real quotes and real detail to work from later, not the model's paraphrase. It searches and extracts through tools like Tavily, Brave, and Exa, and I route model calls through [aisuite](https://github.com/andrewyng/aisuite) so I can test different models and providers behind a common interface.

<div class="brk-dots"><span></span><span></span><span></span></div>

Here are 5 things I found really helpful while building an autonomous agent.

## 1. Decision rights framework

The idea is pretty simple. <mark>We lay out exactly who owns which decision: code, the LLM, or human.</mark> Here's an example:

<div class="tbl" role="region" aria-label="Decision rights" tabindex="0">
<table>
<thead><tr><th scope="col">Decision</th><th scope="col">Owner</th></tr></thead>
<tbody>
<tr><td>Which research lanes to dispatch, with what focus / avoid</td><td>Lead agent (LLM)</td></tr>
<tr><td>Overall readiness</td><td>Lead agent (LLM); consults evaluator, bounded by a floor</td></tr>
<tr><td>A worker's own queries / search angles within a dispatch</td><td>Worker agent (LLM)</td></tr>
<tr><td>Which sources a worker extracts; its source-shape scoring</td><td>Worker agent (LLM)</td></tr>
<tr><td>Whether budgets and limits are exceeded</td><td>Code</td></tr>
<tr><td>Grounding and validation</td><td>Code</td></tr>
<tr><td>Escalation (when limits are exceeded)</td><td>Human</td></tr>
<tr><td>Define the episode goal</td><td>Human</td></tr>
</tbody>
</table>
</div>

Having these laid out clearly streamlines the implementation of the agent. As I collaborated extensively with AI coding agents on the build, <mark>the decision rights framework became a set of principles that many small implementation decisions were based on, which prevented drift.</mark>

With a new feature or change, the framework is also a clean way to express how a decision's ownership is shifting. For example, say the goal is to find a story with a main character. That decision explicitly moved from code to the LLM:

<div class="tbl" role="region" aria-label="Decision ownership, before" tabindex="0">
<table class="cmp">
<thead><tr><th scope="col">Decision</th><th scope="col">Owner</th><th scope="col">Approach</th></tr></thead>
<tbody><tr><td>Does the material have a real named person?</td><td>Code</td><td>Check for a person's name in the story</td></tr></tbody>
</table>
</div>

<p class="becomes" role="img" aria-label="becomes">↓</p>

<div class="tbl" role="region" aria-label="Decision ownership, after" tabindex="0">
<table class="cmp">
<thead><tr><th scope="col">Decision</th><th scope="col">Owner</th><th scope="col">Approach</th></tr></thead>
<tbody><tr><td>Does the story have a main character?</td><td>LLM</td><td>Reading comprehension to judge whether the named person is a character the story is built around, or just a name being quoted</td></tr></tbody>
</table>
</div>

## 2. Handle AI hallucinations: keep it honest, keep it grounded

AI will hallucinate. A spot check isn't enough; you need a mechanism built into the agent to keep it honest.

Here is mine. <mark>Every claim has to trace back to an extracted passage from a tool call.</mark> The model can reason over, organize, and characterize the material however it likes, but those passages are the ground truth, and anything that can't be traced to one gets dropped.

<div class="kd">
  <div class="card kept">
    <span class="tag">Kept</span>
    <div class="claim"><span lang="fr">«… les enquêtés feront souvent référence à « J'ai trop la pomme de terre »… leur façon de dire qu'ils vont bien. »</span><span class="gloss">"The people studied would often say 'j'ai trop la pomme de terre' to mean they were doing fine."</span></div>
    <div class="why">The dry line the tools actually returned.</div>
  </div>
  <div class="card dropped">
    <span class="tag">Dropped</span>
    <div class="claim"><span lang="fr">« Angela me tape sur le bras : Marion, Marion, tu sais quoi ? En ce moment, j'ai trop la pomme de terre. Elle affiche un large sourire. Un rire général retentit dans la cuisine… »</span><span class="gloss">"Angela taps my arm: 'Marion, Marion, you know what? Right now I've so got the potato.' A big smile. Laughter fills the kitchen."</span></div>
    <div class="why">Not grounded by an actual tool fetch that run.</div>
  </div>
</div>

For now, the system just drops what it can't trace. A more sophisticated version in the future might fact-check those pieces instead of discarding them.

An interesting trend I noticed: when the agent builds a story from a thin material group, more of its claims get dropped as ungrounded. With less real material to go on, the model makes more up to fill the gap.

## 3. Decide the core patterns up front

I made these architecture choices upfront:

- Orchestration style: handoffs, or manager-style
- How to keep memory across turns
- Which models and transport to use
- How to trace the agent's decisions
- The output contract
- Limits and boundaries

The model layer is the one I'm glad I set up with flexibility in mind from the start. Using aisuite, <mark>I can swap in and experiment with different LLM models with close to zero effort.</mark>

Another I'm glad I planned for early is traceability. To follow how the agent reasons and makes its decisions at each step, you have to leave breadcrumbs, logs or some structure you can go back and examine when you need to debug or evaluate.

But the choice that mattered most was defining the output contract as early as possible. It's really a way of defining the agent's goal, the exact shape of the work product it has to produce. <mark>It's a lot like managing people: the clearer you are about what success looks like, the more likely they can achieve it.</mark>

## 4. Start with your strongest model, then trade down

Early on, I read some best practices for building agents: start with the smartest model, and downgrade later if you need to. I wasn't totally convinced at first, because that material was published by the companies that make money from these API requests. And there were so many times during development where I was so tempted to use the lower-grade model for iterations, because it's so much cheaper than the latest.

But what I learned is that there's a good reason behind the advice. If you're not using the latest model while you're still developing the agent, it becomes much harder to tell whether your agent can't reach a certain quality or goal because of the model, or because of something else going wrong (prompt, context, tools, decision-making, etc.). <mark>Starting with your strongest model reduces the chance that model capability is the bottleneck, so you can focus first on whether the agent has the right mechanisms and is making the right decisions.</mark> After that's established, it's not very hard to A/B test different LLM models, evaluate how the results differ, and use that to make the cost-versus-quality decisions you're willing to accept.

And cost vs. quality isn't always an exact tradeoff. There are certain jobs where a cheaper, simpler model handles them just as well as a smarter one, and in those cases you get the cost savings without trading off quality. But for a lot of complex tasks, the reduced cost of an earlier or smaller model can mean lower-quality output.

## 5. Use evals so you're not playing whack-a-mole

<mark>Evals are the single most important lever I've found for improving an agent efficiently.</mark> And it's also the part I'm still very much working on.

An eval isn't just a pass/fail test. It's a way to score the agent's behavior objectively<sup class="fnref" id="fnref-obj"><a href="#fn-obj" aria-label="Footnote">&#42;</a></sup>, on the dimensions you care about, so you're measuring quality instead of eyeballing the outputs. That does a few things:

- Catch regressions
- Identify where to improve
- Validate a change worked

Here's the testing structure I set up around evals:

<div class="stairA">
  <div class="step s1">
    <div class="row"><span class="cost c-free">Free</span><span class="name">Static checks</span></div>
    <div class="desc">Unit and prompt-contract tests catch breakage or prompt drift. No model calls.</div>
  </div>
  <div class="step s2">
    <div class="row"><span class="cost c-cheap">Cheap</span><span class="name">Score outputs against frozen sources</span></div>
    <div class="desc">Score outputs from a step / prompt / sub-agent. Only model tokens, no live searches.</div>
  </div>
  <div class="step s3">
    <div class="row"><span class="cost c-dear" role="img" aria-label="Most expensive">$$</span><span class="name">A full live run</span></div>
    <div class="desc">Run evals on the final output.</div>
  </div>
</div>

That cheap tier once surfaced a regression I'd never have caught by eye, where a change quietly made the agent drop a worker's honest "this lane is empty" report. The lesson: an eval's overall score tells you how you're doing, but it's the rubric breakdown that tells you exactly what to fix next.

Where this has worked well for me is developing the lead agent's decision-making, where I used evals to see how well it was doing and where to push. Where it hasn't worked as well is on taste. I tried building a flywheel: capture labeled data on how each story or material group actually turned out in a finished episode, and use it to calibrate a judge. After collecting data from 10+ episodes, the judge's evaluation is still not good enough to be trusted to steer the research.

There's more room for improvement here. But I'm convinced evals are the tool to keep agent development disciplined and efficient. It was the heart of the DeepLearning.AI Agentic AI course I took, and the more I build, the more I understand why.

<p class="fn" id="fn-obj"><a class="fnmark" href="#fnref-obj" aria-label="Back to text">&#42;</a> "Objectively" is the aim more than a guarantee. Some checks really are objective, like whether a claim traces back to a fetched source, while eval techniques like LLM-as-judge, grading against a rubric, aren't entirely objective.</p>

<div class="brk-dots"><span></span><span></span><span></span></div>

The interesting thing is that getting myself out of the loop didn't mean handing the AI every decision. It meant getting much more explicit about which decisions belonged to the model, and which ones I still wasn't willing to let go. The more autonomous the agent became, the more those boundaries mattered.

Building this has been so much fun! These are the things that have helped me most so far, and I'd love to hear what's helped you.

## References

- Anthropic, [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- OpenAI, [Agents SDK documentation](https://openai.github.io/openai-agents-python/)
- DeepLearning.AI, [Agentic AI](https://www.deeplearning.ai/courses/agentic-ai)
