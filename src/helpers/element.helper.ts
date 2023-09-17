import {isPrimitive, jsonStringify, turnCamelToKebabCasing} from "../utils";

export interface ElementOptions<A> {
	attributes?: A;
	textContent?: string;
	htmlContent?: string;
	ns?: 'http://www.w3.org/1999/xhtml' | 'http://www.w3.org/2000/svg';
}

export const element = <A>(tagName: string, {
	attributes = {} as A,
	htmlContent = '',
	textContent = '',
	ns = 'http://www.w3.org/1999/xhtml'
}: ElementOptions<A> = {})  => {
	if (tagName) {
		const el = document.createElementNS(ns, tagName) as HTMLElement;
		
		Object.entries(attributes as Record<string, any>).forEach(([key, val]) => {
			if (/^on[a-z]+/.test(key)) {
				typeof val === 'function' && el.addEventListener(key.slice(2).toLowerCase(), val);
			} else {
				el.setAttribute(turnCamelToKebabCasing(key), jsonStringify(val));
				
				if (tagName.includes("-") && !isPrimitive(val)) {
					const descriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(el));
					
					// make sure the property can be set
					if (descriptors.hasOwnProperty(key) && typeof descriptors[key].set === "function") {
						// @ts-ignore cant use string key for HTMLElement
						el[key] = val;
					}
				}
			}
		});
		
		if (textContent) {
			el.textContent = jsonStringify(textContent);
		} else if (htmlContent) {
			el.innerHTML = htmlContent;
		}
		
		return el;
	}
	
	throw new Error(`Invalid tagName => ${tagName}`)
}
