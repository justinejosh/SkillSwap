# My Skills: implemented behavior

My Skills uses authenticated backend APIs and preserves shared catalogue skills. Teaching assessments belong to an explicit user-offered-skill record; wanted skills have no assessment tier.

- Newly added teaching skills default to Not Assessed and remain eligible for reciprocal swaps.
- After a supported teaching skill is saved, the basic invitation offers Take Basic Assessment or Skip for Now. Skip requires confirmation and persists across reloads/devices.
- A validated basic bank supplies 10 questions, initially passing at 80%, awarding Amateur.
- Amateur unlocks a supported advanced assessment for the same skill. Passing awards Verified. Failure/postponement never removes an existing tier.
- Unsupported skills explain assessment unavailability. No questions or professional credentials are invented.
- Grading, prerequisites, attempt limits, randomization, versions, and tier awards are enforced by the backend.
- Removing a teaching skill retains its tier and assessment history; restoring it does not reset attempts.
- Complete public portfolios are available to other authenticated eligible students, without private assessment results.

See [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md) for APIs, migration safeguards, assessment limitations, institution configuration, and tests. UI proficiency selectors from the old standalone mock component are not assessment tiers.
