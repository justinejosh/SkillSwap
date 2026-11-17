// Orchestration only. Callbacks retain all real ownership and credential checks.
// Keeping this pure permits exact orphan-state regression tests without moving,
// replacing or deleting any real private settings or Docker resources.
async function repairFlow({
  recoverOriginal, prepareReplacement, activateReplacement,
  startOriginal, relocateOriginal, needsRelocation,
}) {
  for (const operation of [recoverOriginal, prepareReplacement, activateReplacement, startOriginal, relocateOriginal, needsRelocation])
    if (typeof operation !== "function") throw new TypeError("Repair requires complete verified lifecycle operations.");
  const verified = await recoverOriginal();
  if (verified !== true && verified !== false)
    throw new TypeError("Recovery must explicitly establish whether the original instance is verified.");
  if (!verified) {
    const prepared = await prepareReplacement();
    if (prepared === undefined || prepared === null)
      throw new TypeError("Preparation must identify the verified replacement before activation.");
    // The preparation result identifies the reserved generation; activation must
    // consume exactly that value instead of running allocation a second time.
    await activateReplacement(prepared);
    return { outcome: "replacement", prepared };
  }
  const relocate = await needsRelocation();
  if (relocate !== true && relocate !== false)
    throw new TypeError("Relocation must be an explicit verified decision.");
  if (relocate) {
    await relocateOriginal();
    return { outcome: "relocated" };
  }
  await startOriginal();
  return { outcome: "original" };
}
module.exports = { repairFlow };
