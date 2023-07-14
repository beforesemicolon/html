import {Executable, Template} from "../types";
import {jsonParse, isObjectLiteral} from "../utils";
import {handleTextExecutable} from "./handle-text-executable";
import {handleAttrDirectiveExecutable} from "./handle-attr-directive-executable";
import {extractExecutableValueFromRawValue} from "./extract-executable-value-from-raw-value";
import {isTemplate} from "../utils/is-template";

export const handleExecutable = (executable: Executable, values: unknown[]) => {
	
	if (executable.subExecutables.length) {
		executable.subExecutables.forEach(executable => {
			handleExecutable(executable, values);
		})
	}
	
	for (let val of executable.values) {
		const parts = extractExecutableValueFromRawValue(val.rawValue || "", values);
		let value: any = "";
		
		switch (val.type) {
			case "attr-dir":
				value = jsonParse(parts.map(p => typeof p === "function" ? p() : p).join(""));
				handleAttrDirectiveExecutable(val, value);
				break;
			case "event":
				let node = Array.isArray(val.renderedNode)
					? (val.renderedNode as Node[])[0]
					: val.renderedNode as Node;
				const eventHandler = parts[0] as EventListenerOrEventListenerObject;
				const eventName = val.prop as string;
				const option = parts.length > 1
					? parts[2]
					: jsonParse(val.rawValue.split(',')[1]);
				
				if (typeof eventHandler !== "function") {
					throw new Error(`handler for event "${val.name}" is not a function. Found "${eventHandler}".`)
				}
				
				if (val.value !== eventHandler) {
					val.value = eventHandler;
					const validOption = typeof option === "boolean" || isObjectLiteral(option);
					const eventOption = validOption ? option : undefined;
					
					if (typeof val.value === "function") {
						node.removeEventListener(eventName, eventHandler, eventOption)
					}
					
					node.addEventListener(eventName, eventHandler, eventOption)
				}
				break;
			case "attr-value":
				value = jsonParse(parts.map(p => typeof p === "function" ? p() : p).join(""));
				
				if (value !== val.value) {
					val.value = value;
					(executable.node as Element).setAttribute(val.name, value);
				}
				
				break;
			case "text":
				value = parts.flatMap(p => typeof p === "function" ? p() : p);
				const currValue = (val.value as unknown[])
				
				if (value.length !== currValue.length || currValue.some((v: unknown, k: number) => v !== value[k])) {
					val.value = value;
					
					const div = document.createElement("div");
					const nodes: Array<Node> = [];
					
					value.forEach((v: Node | Template | string) => {
						if (isTemplate(v)) {
							const renderedBefore = (v as Template).renderTarget !== null;
							
							if (renderedBefore) {
								(v as Template).update();
							} else {
								(v as Template).render(div);
							}
							
							nodes.push(...(v as Template).nodes);
							div.innerHTML = "";
						} else if (v instanceof Node) {
							nodes.push(v)
						} else {
							div.insertAdjacentHTML("beforeend", String(v));
							nodes.push(...Array.from(div.childNodes))
							div.innerHTML = ""
						}
					})
					
					handleTextExecutable(val, Array.from(nodes));
				}
				
				break;
		}
	}
}
