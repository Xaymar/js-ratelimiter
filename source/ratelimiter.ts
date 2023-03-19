// Copyright (C) 2023, Michael Fabian Dirks <info@xaymar.com>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
//
// --------------------------------------------------------------------------------
// Also available under a commercial license, contact info@xaymar.com for more information.
// --------------------------------------------------------------------------------

import os from "node:os";

interface RateLimiterInstance {
    task?: Promise<any>,
    solver?: Promise<any>,
}

type RateLimiterAsyncExecutor = (...args: any[]) => Promise<any>;
type RateLimiterSyncExecutor = (...args: any[]) => any;
type RateLimiterExecutor = RateLimiterSyncExecutor | RateLimiterAsyncExecutor;

/** A simple but effective way to rate limit Tasks.
 *
 */
export class RateLimiter {
	private _maximum: number = 0;
	private _available: number = 0;
	private _instances: any[];

	/** Create a new instance of a RateLimiter.
	 *
	 * @param limit The maximum number of tasks that should run in parallel. The Default is 2/3rds of the available CPU threads.
	 */
	constructor(limit?: number) {
		if (!limit) {
			this._maximum = Math.ceil(Math.max(1, os.cpus().length / 3 * 2));
		} else {
			this._maximum = limit;
		}
		this._available = this._maximum;
		this._instances = [];
	}

	/** Queue up a new task.
	 *
	 * @param executor The function that should be run eventually.
	 * @param args Optional arguments to pass to the function.
	 * @returns A Promise that resolves with the result of the function.
	 */
	async queue(executor: RateLimiterExecutor, ...args: any[]) {
		// Use async/await to find a free slot.
		while (this._available == 0) {
			await Promise.race(this._instances);
		}

		// Decrement the number of available slots.
		--this._available;

		// Once we have a slot, properly enqueue the work.
		const data: RateLimiterInstance = {};
		data.task = new Promise((resolve, reject) => {
			try {
				if (executor.constructor.name == "AsyncFunction") {
					executor().then((res: any) => {
						resolve(res);
					}, (err: any) => {
						reject(err);
					});
				} else {
					resolve(executor(...args));
				}
			} catch (ex) {
				reject(ex);
			}
		});

		data.solver = data.task.finally(() => {
			// Remove this promise from the locks list.
			const taskIndex = this._instances.indexOf(data.task);
			if (taskIndex >= 0) {
				this._instances.splice(taskIndex, 1);
			}

			const solverIndex = this._instances.indexOf(data.solver);
			if (solverIndex >= 0) {
				this._instances.splice(solverIndex, 1);
			}

			// Increment the number of available slots again.
			++this._available;
		});

		// Push this instance to the known instance list.
		this._instances.push(data.solver);

		// And return the result gained from running the runner.
		return await data.solver;
	}
}
