import {is} from "./is.helper.ts";

describe('is', () => { // @ts-ignore

	it('should handle is', () => {
		expect(is(() => true, true)()).toBe(true)
		expect(is(() => true, () =>false)()).toBe(false)
	})
})
