/**
 * User prompts for CLI interactions
 */

import inquirer from 'inquirer';

export type HooksLocation = 'global' | 'project';

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
