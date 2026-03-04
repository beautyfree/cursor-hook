/**
 * User prompts for CLI interactions
 */

import inquirer from 'inquirer';

export type HooksLocation = 'global' | 'project';

export interface EnvVarSpec {
  name: string;
  description?: string;
}

export interface HooksLocationChoice {
  location: HooksLocation;
}

/**
 * Prompt user to choose where to install hooks
 */
export async function promptHooksLocation(): Promise<HooksLocation> {
  const answers = await inquirer.prompt<HooksLocationChoice>([
    {
      type: 'list',
      name: 'location',
      message: 'Where would you like to install the hooks?',
      choices: [
        {
          name: 'Project (.cursor/hooks.json) - applies to current project only',
          value: 'project',
        },
        {
          name: 'Global (~/.cursor/hooks.json) - applies to all projects',
          value: 'global',
        },
      ],
    },
  ]);

  return answers.location;
}

/**
 * Confirm action before proceeding
 * @param message - Prompt text
 * @param defaultYes - Default choice (true = Yes, false = No)
 */
export async function confirmAction(message: string, defaultYes: boolean = true): Promise<boolean> {
  const answers = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: defaultYes,
    },
  ]);

  return answers.confirmed;
}

/**
 * Prompt user for each required env var. Defaults come from existing (e.g. .env) and process.env.
 * Returns key-value map for the requested vars only.
 */
export async function promptEnvVars(
  vars: EnvVarSpec[],
  existing: Record<string, string>
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const spec of vars) {
    const current = existing[spec.name] ?? process.env[spec.name] ?? '';
    const message = spec.description
      ? `${spec.name} (${spec.description})`
      : spec.name;
    const answers = await inquirer.prompt<{ value: string }>([
      {
        type: 'input',
        name: 'value',
        message,
        default: current,
      },
    ]);
    result[spec.name] = answers.value;
  }
  return result;
}
