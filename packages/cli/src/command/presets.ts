import { PackageType } from "../types";

export const presetsArray: Array<PackageType> = [
  {
    label: "@trezo/evm - Ethereum (EVM)",
    value: "ethereum",
    templates: [
      {
        label: "NextJs + Typescript",
        value: "nextjs-typescript",
        path: "../templates/example-1",
        postSetupCommands: ["pnpm install"],
      },
    ],
  },
];
