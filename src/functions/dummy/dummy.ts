import { writeFile, access, constants } from 'node:fs/promises';
import lockfile from 'proper-lockfile';
import { sleep } from '../../utils';

type HandlerEvent = {
  pid: number;
  message: string;
};

const FILE_PATH = './shared_file.txt';

export const handler = async (event: HandlerEvent): Promise<void> => {
  let release;
  try {
    await sleep(5_000);

    try {
      await access(FILE_PATH, constants.F_OK);
    } catch (err) {
      await writeFile(FILE_PATH, '', { flag: 'a' });
    }

    release = await lockfile.lock(FILE_PATH, { retries: 5 });

    if (!event || !event.message || event.pid === undefined) {
      console.error('Event structure is invalid');
      return;
    }

    await writeFile(FILE_PATH, `pid (${event.pid}): ${event.message}\n`, { flag: 'a' });
  } catch (error) {
  } finally {
    if (release) {
      await release();
    }
  }
};
