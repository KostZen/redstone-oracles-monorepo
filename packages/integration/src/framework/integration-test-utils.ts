import { RedstoneCommon } from "@redstone-finance/utils";
import axios from "axios";
import { ChildProcess, spawn } from "child_process";
import fs from "fs";

export type PriceSet = { [token: string]: number };

const SLEEP_TIME_MILLISECONDS = 5000;

export const stopChild = (
  childProcess: ChildProcess | undefined,
  name: string
) => {
  if (!childProcess?.pid || childProcess.exitCode !== null) {
    debug(`process ${name} didn't start or already terminated.`);
    return;
  }
  debug(`terminate ${name}`);
  if (!childProcess.kill()) {
    debug(`failed to terminate ${name}`);
  }
};

export const printDotenv = (label: string, filePath: string) => {
  console.group(`${label} ${filePath}`);
  console.log(fs.readFileSync(filePath, "utf-8"));
  console.groupEnd();
};

export const printExtraEnv = (
  label: string,
  extraEnv: Record<string, string>
) => {
  console.group(`${label} extra env`);
  console.log(JSON.stringify(extraEnv, undefined, 2));
  console.groupEnd();
};

export const waitForFile = async (filePath: string, tries = 5) => {
  while (!fs.existsSync(filePath)) {
    if (--tries <= 0) {
      throw new Error(`path ${filePath} didn't become available, aborting...`);
    }
    debug(`${filePath} is not present, waiting, tries left ${tries}...`);
    await RedstoneCommon.sleep(SLEEP_TIME_MILLISECONDS);
  }
  debug(`${filePath} became available`);
};

export const waitForUrl = async (url: string, tries = 5) => {
  const customStatusValidation = (status: number) => {
    return status >= 200 && status < 500;
  };
  for (let i = 0; i < tries; i++) {
    try {
      await axios.get(url, {
        validateStatus: customStatusValidation,
      });
      debug(`${url} became available`);
      return;
    } catch (error) {
      debug(`${url} is not responding, waiting, tries left: ${tries - i}`);
    }
    await RedstoneCommon.sleep(SLEEP_TIME_MILLISECONDS);
  }
  throw new Error(`url ${url} didn't become available, aborting...`);
};

export const waitForSuccess = async (
  cond: () => Promise<boolean>,
  count: number,
  errorMessage: string
) => {
  let waitCounter = 0;
  while (!(await cond())) {
    if (++waitCounter < count) {
      await RedstoneCommon.sleep(SLEEP_TIME_MILLISECONDS);
    } else {
      throw new Error(errorMessage);
    }
  }
};

export const copyAndReplace = (
  regex: RegExp,
  replacement: string,
  srcFilePath: string,
  destFilePath: string
) => {
  const dotenvContents = fs.readFileSync(srcFilePath, "utf-8");
  const newDotenvContents = dotenvContents.replace(regex, replacement);
  fs.writeFileSync(destFilePath, newDotenvContents, "utf-8");
  return regex.test(dotenvContents);
};

const logPrefixLength = 25;
const normalizePrefix = (prefix: string): string =>
  (prefix + " ".repeat(logPrefixLength)).substring(0, logPrefixLength);

export const addPrefixToProcessLogs = (
  childProcess: ChildProcess,
  logPrefix: string
) => {
  const normalizedPrefix = normalizePrefix(logPrefix);
  const normalizedErrorPrefix = normalizePrefix(logPrefix + " (stderr)");
  if (!childProcess.stdout) {
    debug(`stdout for ${logPrefix} won't be displayed`);
  }
  if (!childProcess.stderr) {
    debug(`stderr for ${logPrefix} won't be displayed`);
  }
  childProcess.stdout?.on("data", (data: string) => {
    data
      .toString()
      .split("\n")
      .forEach((line) => console.log(`${normalizedPrefix}: ${line}`));
  });
  childProcess.stderr?.on("data", (data: string) =>
    data
      .toString()
      .split("\n")
      .forEach((line) => console.log(`${normalizedErrorPrefix}: ${line}`))
  );
};

export type ExtraEnv = { [varName: string]: string };

const extendEnv = (extraEnv?: ExtraEnv): NodeJS.ProcessEnv => {
  return { ...process.env, ...extraEnv };
};

export const runWithLogPrefix = async (
  cmd: string,
  args: string[],
  logPrefix: string,
  cwd: string,
  extraEnv?: ExtraEnv,
  throwOnError = true
) => {
  debug(`starting process in foreground '${cmd} ${args.join(" ")}'`);
  const childProcess = spawn(cmd, args, { env: extendEnv(extraEnv), cwd });
  addPrefixToProcessLogs(childProcess, logPrefix);
  childProcess.on("error", (e) =>
    debug(`error in process, ${cmd}: ${e.toString()}`)
  );
  await new Promise<void>((resolve) => {
    childProcess.on("exit", resolve);
  });
  if (throwOnError && childProcess.exitCode !== 0) {
    throw new Error(`command '${cmd} ${args.join(" ")}' failed`);
  }
  return childProcess.exitCode === 0;
};

export const runWithLogPrefixInBackground = (
  cmd: string,
  args: string[],
  logPrefix: string,
  cwd: string,
  extraEnv?: ExtraEnv
) => {
  const childProcess = spawn(cmd, args, {
    env: extendEnv(extraEnv),
    cwd: `${process.cwd()}/${cwd}`,
  });
  debug(
    `started process in background '${cmd} ${args.join(" ")}', pid ${
      childProcess.pid
    }`
  );
  childProcess.on("error", (e) =>
    debug(`error in process, ${cmd}: ${e.toString()}`)
  );
  addPrefixToProcessLogs(childProcess, logPrefix);
  return childProcess;
};

export const configureCleanup = (cleanUp: () => void) => {
  process.on("exit", (code) => {
    debug(`exiting with code ${code}`);
    cleanUp();
  });

  process.on("signal", (signal) => {
    debug(`exiting due to the signal ${signal}`);
    process.exit(-1);
  });

  process.on("uncaughtException", (error) => {
    debug(`exiting due to uncaught exception, ${error.toString()}`);
    debug(`stack trace ${error.stack ?? "(unavailable)"}`);
    process.exit(-1);
  });
};

export const debug = (message: string) => {
  console.log(`\nmain : ${message}`);
};
