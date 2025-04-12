// cli.ts - all this code code go in a dedicated cli file. up to "main.ts"

const getBaseCLIContext = async (_args: string[]) => {
  const [_cmd, ...rest] = _args;
  const flags: Record<string, string> = {};
  const args: string[] = [];

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];

    if (/^--?/.test(arg)) {
      const [key, value = "true"] = arg.replace(/^--?/, "").split("=");
      flags[key] = value;
    } else {
      args.push(arg);
    }
  }

  return {
    args,
    flags,
    _args,
  };
};

export type BaseCLIContext = Awaited<ReturnType<typeof getBaseCLIContext>>;

const showHelp = (commands: Record<string, Function | { description: string; exec: Function }>) => {
  console.log(`
    Usage:
      $ cli <command> [options]

    Commands:`);

  for (const [k, v] of Object.entries(commands)) {
    if (typeof v === "function") {
      console.log(`      ${k}`);
    } else {
      console.log(`      ${k}: ${(v as any).description}`);
    }
  }
};

type CLIHandler<T> = (ctx: T) => any;
type CLIHandlerDefinition<T> = {
  description: string;
  exec: CLIHandler<T>;
};
export type CLICommandSPec<T> = Record<string, CLIHandler<T> | CLIHandlerDefinition<T>>;

export const runCommands = async <CtxType>({
  commands,
  getContext,
}: {
  commands: CLICommandSPec<Awaited<ReturnType<typeof getContext>>>;
  getContext: (baseCtx: BaseCLIContext) => Promise<CtxType> | CtxType;
}) => {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === undefined || command === "help") {
    showHelp(commands);
    return;
  }

  const handler = commands[command];

  // @ts-ignore Why does ts care? This checks for both things that I want to check for in one go
  if (typeof handler !== "function" && typeof handler?.exec !== "function") {
    showHelp(commands);
    return;
  }

  let fn: CLIHandler<Awaited<ReturnType<typeof getContext>>>;
  if (typeof handler === "function") {
    fn = handler;
  } else {
    fn = handler.exec;
  }

  const baseCtx = await getBaseCLIContext(args);
  const ctx = await getContext(baseCtx);

  await fn(ctx);
};
