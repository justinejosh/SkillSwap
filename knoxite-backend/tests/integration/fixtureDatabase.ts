import { requireLocalDatabase } from "../../scripts/safeDatabase";
const fixture=require("../../../development/fourBlockersEnvironment.cjs");
export function requireOwnedFixtureDatabase(ddl=false){
  const manifest=process.env.KNOXITE_CI_FIXTURE_MANIFEST;
  if(!manifest)throw new Error("Use development/ciIntegration.cjs; an independently owned disposable fixture is required.");
  const m=fixture.open(manifest),url=requireLocalDatabase();
  if(url!==(ddl?m.url:m.appUrl))throw new Error("Test database does not match the independently owned fixture.");
  return url;
}
