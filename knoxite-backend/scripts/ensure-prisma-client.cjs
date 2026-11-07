const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const normalize = (text) => text.replace(/\r\n/g, "\n").trim();
function clientMatchesSchema({
  schema,
  generatedSchema,
  installedVersion,
  generatedVersion,
  modelNames,
  constructorType,
}) {
  return (
    typeof schema === "string" &&
    typeof generatedSchema === "string" &&
    normalize(schema) === normalize(generatedSchema) &&
    typeof installedVersion === "string" &&
    installedVersion === generatedVersion &&
    !!modelNames?.User &&
    constructorType === "function"
  );
}

function main() {
  const backendRoot = path.resolve(__dirname, "..");
  let current = false;
  try {
    const clientEntry = require.resolve("@prisma/client");
    const generatedEntry = require.resolve(".prisma/client/default", {
      paths: [path.dirname(clientEntry)],
    });
    const client = require("@prisma/client");
    current = clientMatchesSchema({
      schema: fs.readFileSync(
        path.join(backendRoot, "prisma/schema.prisma"),
        "utf8",
      ),
      generatedSchema: fs.readFileSync(
        path.join(path.dirname(generatedEntry), "schema.prisma"),
        "utf8",
      ),
      installedVersion: require("@prisma/client/package.json").version,
      generatedVersion: client.Prisma?.prismaVersion?.client,
      modelNames: client.Prisma?.ModelName,
      constructorType: typeof client.PrismaClient,
    });
  } catch {
    /* A fresh install may contain only the ungenerated client placeholder. */
  }
  if (current) {
    console.log("Prisma Client matches the schema; generation is not needed.");
    return;
  }
  const result = spawnSync(
    process.execPath,
    [require.resolve("prisma/build/index.js"), "generate"],
    { cwd: backendRoot, stdio: "inherit" },
  );
  if (result.error || result.status !== 0) {
    console.error(
      "Prisma Client needs generation. On Windows, stop other Knoxite backend processes before running npm run db:generate if its engine DLL is locked.",
    );
    process.exitCode = result.status || 1;
  }
}

module.exports = { clientMatchesSchema };
if (require.main === module) main();
