# RateLimiter
Simple but effective way to rate limit Tasks in JavaScript. Anything can be rate limited,

## Features
- Rate limiting for anything!
- Looks nice I guess?
- That's about it.

## Usage
```js
var ratelimiter = require("@xaymar/ratelimiter");

let limitMany = new ratelimiter.RateLimiter(4);
let limitOne = new ratelimiter.RateLimiter(1);

for (let idx = 0; idx < 3; idx++) {
    limitOne.queue(async () => {
        console.log("Only 1 of this can occur every 1s.");
        await new Promise((resolve, reject) => {setTimeout(() => {resolve();}, 1000);});
    });
}

for (let idx = 0; idx < 10; idx++) {
    limitMany.queue(async () => {
        console.log("This however can occur many times.");
        await new Promise((resolve, reject) => {setTimeout(() => {resolve();}, 1000);});
    });
}
```

## FAQ
### Why did you create this?
Multiple reasons, but here's two of the biggest examples:

1. A script that was supposed to automatically help me generate the proper Copyright notice headers ended up deleting files, or creating empty headers. Limiting the numbers of sub-processes to 1 for the version control binary, and the number of parallel file handles to the number of CPUs significantly improved the stability. No more empty files, no more empty headers!
2. Some resources are only available in limited quantity, such as encoder instances on NVIDIA GPUs, or CPU cores. Often it makes sense to rate limit to that limit, instead of pushing as much data through as possible and then ending up slower than if you did everything sequentially. Especially when it comes to heavy and complex tasks, like encoding.

### Does this support WebWorkers?
No, but it is relatively easy to do without official support. See the example below:

```js
// main.js
var ratelimiter = require("@xaymar/ratelimiter");

let worker = new Worker("worker.js");
let workerRL = new ratelimiter.RateLimiter(1);

worker.onmessage = (event) => {
	worker.resolve(event);
}
workerRL.queue(async () => {
	return await new Promise((resolve, reject) => {
		worker.resolve = resolve;
		worker.reject = reject;
		worker.postMessage("Request");
	})
});

// worker.js
self.onmessage = (event) => {
	self.postMessage("Reply");
}
```

## License
Available under GPLv3 as well as a commercial license. Contact `info@xaymar.com` for more information.
