// May require `npm link`.
const { RateLimiter } = require("../generated/ratelimiter");

async function asyncRunTest(fn, ...args) {
	try {
		await fn(...args);
		console.log(`✅ ${fn.name}(${args})`)
	} catch (ex) {
		console.log(`❌ ${fn.name}(${args})`)
		console.error(ex);
		process.exitCode++;
	}
}
function runTest(fn, ...args) {
	try {
		fn(...args);
		console.log(`✅ ${fn.name}(${args})`);
	} catch (ex) {
		console.log(`❌ ${fn.name}(${args})`);
		console.error(ex);
		process.exitCode++;
	}
}

function test_Construct(limit) {
	let rl = new RateLimiter(limit);
}

async function test_TaskLimit(tasks, limit) {
	let rl = new RateLimiter(limit);
	let p = new Array();
	for (let idx = 0; idx < tasks; idx++) {
		p.push(rl.queue(() => {
			return true;
		}));
	}

	let r = await Promise.all(p);
	for (res of r) {
		if (res !== true) {
			throw new Error("Result is unexpected.");
		}
	}
}

(async function() {
	process.exitCode = 0;
	for (let limit = 1; limit <= 64; limit *= 2) {
		runTest(test_Construct, limit);
	}
	for (let limit = 1; limit <= 10; limit++) {
		for (let tasks = 1; tasks <= 64; tasks *= 2) {
			await asyncRunTest(test_TaskLimit, tasks, limit);
		}
	}
})();
