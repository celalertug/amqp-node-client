/* eslint-disable no-console */
const assert = require('assert');

const { ServiceCreator } = require('../index.js');

(async () => {
  const service = await ServiceCreator('localhost', 'hebele-hubele-exchange');

  await service.simpleConsume('simple.math.square', 'worker-queue', async (msg) => {
    const { value } = JSON.parse(msg);
    return JSON.stringify({ result: value * value });
  });

  let res = await service.rpcRequest('simple.math.square', JSON.stringify({ value: 2 }));
  res = JSON.parse(res.content.toString());
  console.log(res);
  assert.deepStrictEqual(res, { result: 4 });

  await service.close();
})();
