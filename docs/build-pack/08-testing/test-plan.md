# Test Plan

## Required tests
1) assembly-orchestrator: job completes, snapshot validates, configs populated
2) assembly-resume: failure mid-phase resumes without rerunning earlier phases
3) published-protection: cannot modify published agents
4) gaps-merge: dedupe keeps highest severity

## Test strategy
Mock engines using fixtures.
Avoid real network or LLM calls.
