## amqp-rpc-node-client

rabbitmq with management ui

```bash
docker run -d --rm --name rabbitmq -p 8080:15672 -p 5672:5672 rabbitmq:3-management
```

rabbitmq standalone

```bash
docker run -d --rm --name rabbitmq -p 5672:5672 rabbitmq:3
```

note : service won't work without rabbitmq

### usage 


`yarn add amqp-node-client`

simple rpc usage example

```js
const { ServiceCreator } = require('../index.js');

(async () => {
  const service = await ServiceCreator('localhost', 'hebele-hubele-exchange');

  await service.consume('request.echo', 'worker-queue', async (msg) => {
    const { replyTo, correlationId } = msg.properties;

    if (replyTo) {
      await service.sendToQueue(replyTo, msg.content.toString(), { correlationId });
    }
  });

  setInterval(async () => {
    const res = await service.rpcRequest('request.echo', `surprise ${Date()}`);
    console.log(res.content.toString());
  }, 1000);

  // await service.purgeAndClose();
})();
```

go example directory for further examples
