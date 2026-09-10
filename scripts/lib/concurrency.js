export function createSemaphore(limit = 5) {
  let active = 0;
  const queue = [];

  function acquire() {
    return new Promise((resolve) => {
      const tryRun = () => {
        if (active < limit) {
          active++;
          let released = false;
          resolve(() => {
            if (!released) {
              released = true;
              active--;
              if (queue.length > 0) {
                queue.shift()();
              }
            }
          });
        } else {
          queue.push(tryRun);
        }
      };
      tryRun();
    });
  }

  return { acquire };
}
