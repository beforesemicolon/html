import {Executable, ExecutableValue} from "../types";
import {jsonParse, isObjectLiteral, isPrimitive, jsonStringify, turnKebabToCamelCasing} from "../utils";
import {handleTextExecutable} from "./handle-text-executable";
import {handleAttrDirectiveExecutable} from "./handle-attr-directive-executable";
import {HtmlTemplate} from "../html";

export const handleExecutable = (node: Node, executable: Executable, refs: Record<string, Set<Element>>) => {
	executable.events.forEach(e => {
		handleEventExecutableValue(e);
	})
	executable.directives.forEach(d => {
		handleAttrDirectiveExecutableValue(d);
	})
	executable.attributes.forEach(a => {
		handleAttrExecutableValue(a, a.renderedNode as Element);
	})
	executable.content.forEach(t => {
		handleTextExecutableValue(t, refs, node);
	});
}

export function handleAttrDirectiveExecutableValue(val: ExecutableValue) {
	const value = jsonParse(val.parts.map(p => typeof p === "function" ? p() : p).join(""));
	
	if (val.value !== value) {
		handleAttrDirectiveExecutable(val, value);
	}
}

export function handleEventExecutableValue(val: ExecutableValue) {
	const eventHandler = val.parts[0] as EventListenerOrEventListenerObject;
	
	if (typeof eventHandler !== "function") {
		throw new Error(`handler for event "${val.name}" is not a function. Found "${eventHandler}".`)
	}
	
	if (val.value !== eventHandler) {
		val.value = eventHandler;
		const node = Array.isArray(val.renderedNode)
			? (val.renderedNode as Node[])[0]
			: val.renderedNode as Node;
		const eventName = val.prop as string;
		const option = val.parts.length > 1
			? val.parts[2]
			: jsonParse(val.rawValue.split(',')[1]);
		const validOption = typeof option === "boolean" || isObjectLiteral(option);
		const eventOption = validOption ? option : undefined;
		
		if (typeof val.value === "function") {
			node.removeEventListener(eventName, eventHandler, eventOption)
		}
		
		node.addEventListener(eventName, eventHandler, eventOption)
	}
}

export function handleAttrExecutableValue(val: ExecutableValue, node: Element) {
	const value = val.parts.length > 1
		? jsonParse(val.parts.map(p => typeof p === "function" ? p() : jsonStringify(p)).join(''))
		: jsonParse(typeof val.parts[0] === "function" ? val.parts[0]() : val.parts[0] as string)
	
	if (value !== val.value) {
		val.value = value;
		
		// always update the element attribute
		node.setAttribute(val.name, jsonStringify(value));
		// for WC we can also use the setter to set the value in case they
		// have correspondent camel case property version of the attribute
		// we do this only for non-primitive value because they are not handled properly
		// by elements and if in case they have such setters, we can use them to set it
		if (customElements.get(node.nodeName.toLowerCase()) && !isPrimitive(value)) {
			const propName = /-/.test(val.name) ? turnKebabToCamelCasing(val.name) : val.name;
			// @ts-ignore check if value is different from the new value
			if (node[propName] !== value) {
				try {
					// @ts-ignore in case the property is not writable and throws error
					node[propName] = value;
				} catch(e) {}
			}
		} else if(
			// @ts-ignore handle cases like input field which changing attribute does not
			// actually change the value of the input field, and we check this by
			// verifying that the matching property value remained different from the new value of the attribute
			node[val.name] !== undefined && node[val.name] !== value
		) {
			// @ts-ignore
			node[val.name] = value;
		}
	}
}

export function handleTextExecutableValue(val: ExecutableValue, refs: Record<string, Set<Element>>, el: Node) {
	
	const value = val.parts.flatMap(p => typeof p === "function" ? p() : p);
	
	const nodes: Array<Node> = [];
	
	let idx = 0;
	for (let v of (value as Array<Node | HtmlTemplate | string>)) {
		if (v instanceof HtmlTemplate) {
			const renderedBefore = v.renderTarget !== null;

			if (!renderedBefore) {
				v.render(document.createElement('div'));
				// need to disconnect these nodes because the div created above
				// is only used ,so we can get access to the nodes but not necessarily
				// where we want these nodes to be rendered at
				v.nodes.forEach(node => {
					node.parentNode?.removeChild(node);
				})
			}
			
			// could be that the component was sitting around while data changed
			// for that we need to update it, so it has the latest data
			v.update();
			
			// collect dynamic refs that could appear
			// after render/update
			Object.entries(v.refs).forEach(([name, els]) => {
				els.forEach(el => {
					if (!refs[name]) {
						refs[name] = new Set();
					}
					
					refs[name].add(el)
				});
			})
			
			nodes.push(...v.nodes);
		} else if (v instanceof Node) {
			nodes.push(v)
		} else {
			// need to make sure to grab the same text node that was already rendered
			// to avoid unnecessary DOM updates
			if (Array.isArray(val.value) && Array.isArray(el) && String(val.value[idx]) === String(v)) {
				nodes.push(el[idx])
			} else {
				nodes.push(document.createTextNode(String(v)))
			}
		}
		
		idx += 1;
	}
	
	val.value = value;
	
	// need to make sure nodes array does not have repeated nodes
	// which cannot be rendered in 2 places at once
	handleTextExecutable(val, Array.from(new Set(nodes)), el);
}
