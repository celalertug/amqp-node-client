const { ServiceCreator } = require('../index.js');

(async () => {
  const service = await ServiceCreator('localhost', 'hebele-hubele-exchange');

  await service.consume('log.request', 'x-logger', async (msg) => {
    console.log(msg.content.toString());
  });

  setInterval(async () => {
    await service.fireAndForget('log.request', 'this is a log');
  }, 1000);
})();
