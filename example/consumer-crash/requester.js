const { range } = require('lodash');
const { ServiceCreator } = require('../../index.js');

(async () => {
  const s = await ServiceCreator('localhost', 'hebele-hubele-exchange');

  await Promise.all(range(10).map((i) => s.rpcRequest('request.echo', JSON.stringify({ value: i }))));

  // await s.purgeAndClose();
})();
