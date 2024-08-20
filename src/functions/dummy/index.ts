import { writeFile } from 'node:fs/promises';

export const handler = async (message: string, sharedFile: string): Promise<void> => {
  await writeFile(sharedFile, `${message}\n`, { flag: 'a' });
  await new Promise(resolve => setTimeout(resolve, 5000));
};
