/**
 * Declarative CLI argument parser shared across scripts.
 *
 * @param {string[]} argv - process.argv
 * @param {Object} spec
 * @param {Object<string, {type: 'string'|'number'|'boolean', alias?: string}>} spec.flags
 * @param {Object<string, *>} spec.defaults
 * @param {string} [spec.usage] - help text printed on unknown flags (when strict)
 * @param {boolean} [spec.strict] - exit on unknown flags (default true)
 * @param {Array<(opts: Object) => string|null>} [spec.validate] - post-parse validators
 * @returns {Object}
 */
export function parseArgs(argv, spec) {
  const args = argv.slice(2);
  const opts = { ...spec.defaults };
  const strict = spec.strict !== false;

  const flagMap = new Map();
  for (const [key, def] of Object.entries(spec.flags)) {
    flagMap.set(`--${key}`, { key: key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), ...def });
    if (def.alias) flagMap.set(def.alias, { key: key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), ...def });
  }

  for (let i = 0; i < args.length; i++) {
    const entry = flagMap.get(args[i]);
    if (!entry) {
      if (strict) {
        console.error(`Error: unknown flag "${args[i]}"${spec.usage ? `\n\n${spec.usage}` : ''}`);
        process.exit(2);
      }
      continue;
    }

    if (entry.type === 'boolean') {
      opts[entry.key] = true;
    } else {
      i++;
      const raw = args[i];
      if (raw === undefined) {
        console.error(`Error: ${args[i - 1]} requires a value`);
        process.exit(2);
      }
      if (entry.type === 'number') {
        const val = Number(raw);
        if (isNaN(val)) {
          console.error(`Error: ${args[i - 1]} must be a number`);
          process.exit(2);
        }
        opts[entry.key] = val;
      } else {
        opts[entry.key] = raw;
      }
    }
  }

  if (spec.validate) {
    for (const fn of spec.validate) {
      const err = fn(opts);
      if (err) {
        console.error(`Error: ${err}${spec.usage ? `\n\n${spec.usage}` : ''}`);
        process.exit(2);
      }
    }
  }

  return opts;
}
