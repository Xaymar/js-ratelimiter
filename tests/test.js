// May require `npm link`.
const { RateLimiter } = require("../generated/ratelimiter");

async function asyncRunTest(fn, ...args) {
	try {
		let msg = await fn(...args);
		if (msg) {
			console.log(`✅ ${fn.name}(${args}): ${msg}`);
		} else {
			console.log(`✅ ${fn.name}(${args})`);
		}
	} catch (ex) {
		console.log(`❌ ${fn.name}(${args})`)
		console.error(ex);
		process.exitCode++;
	}
}
function runTest(fn, ...args) {
	try {
		let msg = fn(...args);
		if (msg) {
			console.log(`✅ ${fn.name}(${args}): ${msg}`);
		} else {
			console.log(`✅ ${fn.name}(${args})`);
		}
	} catch (ex) {
		console.log(`❌ ${fn.name}(${args})`);
		console.error(ex);
		process.exitCode++;
	}
}
async function delay(time) {
	await new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, time);
	});
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

async function test_LimitEnforcement(tasks, limit) {
	let rl = new RateLimiter(limit);
	let value = 0;
	let time = 50;

	let records = [];
	let t = setInterval(() => {
		records.push([
			value, Date.now()
		]);
	}, 25);

	let p = new Array();
	for (let idx = 0; idx < tasks; idx++) {
		p.push(rl.queue(async () => {
			await delay(time);
			value++;
		}));
	}
	await Promise.all(p);

	clearInterval(t);

	let totalTime = 0;
	let totalValue = 0;
	for (let n = 1; n < records.length; n++) {
		let pRecord = records[n - 1];
		let cRecord = records[n];

		let deltaTime = cRecord[1] - pRecord[1];
		let deltaValue = cRecord[0] - pRecord[0];

		totalTime += deltaTime;
		totalValue += deltaValue;
	}
	let averageChange = totalValue / totalTime;
	let normalizedChange = averageChange * time;
	// setTimeout loses accuracy over time, not sure what the solution is. Accepting +-1 for now.
	if ((normalizedChange < (limit - 1.)) || (normalizedChange > (limit + 1.))) {
		throw new Error(`Outside acceptable range (${normalizedChange} is not equal to ${limit}).`);
	} else {
		return `Within acceptable range (${normalizedChange} is roughly equal to ${limit}).`
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
	for (let limit = 1; limit <= 10; limit++) {
		await asyncRunTest(test_LimitEnforcement, 100, limit);
	}
})();
