/* eslint-disable no-console */
const { ServiceCreator } = require('../../index.js');

const wait = (ms) => new Promise((resolve) => {
  setTimeout(() => {
    resolve();
  }, ms);
}, ms);

(async () => {
  const service = await ServiceCreator('localhost', 'hebele-hubele-exchange');

  await service.simpleConsume('request.echo', 'worker-queue', async (msg) => {
    console.log('worker1 start');
    process.exit(1);
    await wait(1000);
    console.log(msg);
    console.log('worker1 end');

    return msg;
  });
})();
