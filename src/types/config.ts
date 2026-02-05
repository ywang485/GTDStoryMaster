/**
 * Shape of the adventurer.config.json file.
 * Both `profile` and `storyWorld` are optional — only provided fields
 * will pre-populate the setup wizard.
 */
export interface AdventurerConfig {
  profile?: {
    name?: string;
    description?: string;
  };
  storyWorld?:
    | {
        /** Use a built-in preset by ID */
        preset: string;
      }
    | {
        /** Define a custom world inline */
        name: string;
        description: string;
      };
}
