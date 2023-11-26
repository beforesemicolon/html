import { ExecutableValue } from '../types'
import { extractExecutableValueFromRawValue } from './extract-executable-value-from-raw-value'
import {
    handleAttrDirectiveExecutableValue,
    handleAttrExecutableValue,
    handleEventExecutableValue,
    handleTextExecutableValue,
} from './handle-executable'
import { doc } from '../doc'

const node = (
    nodeName: string,
    ns = '',
    values: Array<unknown> = [],
    refs: Record<string, Set<Element>> = {},
    cb: (node: Node, e: ExecutableValue, type: string) => void = () => {}
) => {
    const node =
        nodeName === '#fragment'
            ? doc.createDocumentFragment()
            : doc.createElementNS(ns, nodeName)
    const comp = customElements.get(nodeName.toLowerCase())

    return {
        __self__: node,
        namespaceURI: (node as Element).namespaceURI as string,
        tagName: nodeName,
        childNodes: node.childNodes,
        attributes: 'attributes' in node ? node.attributes : null,
        textContent: node.textContent,
        setAttribute: (name: string, value: string = '') => {
            if (/^val[0-9]+$/.test(name)) {
                return
            }

            let e: ExecutableValue = {
                name,
                value,
                rawValue: value,
                renderedNodes: [node],
                parts: extractExecutableValueFromRawValue(value, values),
            }

            if (/^on[a-z]+/.test(name)) {
                // if the node happen to have
                if (comp) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    if (!comp?.observedAttributes?.includes(name)) {
                        e.prop = name.slice(2)
                    }
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                } else if (
                    doc.head &&
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    typeof doc.head[name] !== 'undefined'
                ) {
                    // ignore unknown events
                    e.prop = name.slice(2)
                }

                if (e.prop) {
                    handleEventExecutableValue(e)
                    cb(node, e, 'events')
                    return
                }
            }

            if (/^(attr|ref)/.test(name)) {
                // element.removeAttribute(name);

                if (name === 'ref') {
                    if (!refs[value]) {
                        refs[value] = new Set()
                    }

                    refs[value].add(node as Element)
                } else {
                    const isAttrOrBind = name.match(/(attr)\.([a-z0-9-.]+)/)
                    const prop = isAttrOrBind ? isAttrOrBind[2] : ''
                    e = {
                        ...e,
                        name: name.slice(0, name.indexOf('.')),
                        value: '',
                        prop,
                    }

                    handleAttrDirectiveExecutableValue(e)
                    cb(node, e, 'directives')
                }
            } else if (/{{val[0-9]+}}/.test(value)) {
                handleAttrExecutableValue(e, node as Element)
                cb(node, e, 'attributes')
            } else if ('setAttribute' in node) {
                node.setAttribute(name, value)
            }
        },
        appendChild: (n: DocumentFragment | Node) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (n.__self__) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                n = n.__self__
            }

            if (n.nodeType === 3) {
                // text node
                node.appendChild(n)

                if (n.nodeValue && /{{val([0-9]+)}}/.test(n.nodeValue)) {
                    const value = String(n.nodeValue)
                    const e: ExecutableValue = {
                        name: 'nodeValue',
                        rawValue: value,
                        value,
                        parts: extractExecutableValueFromRawValue(
                            value,
                            values
                        ),
                        renderedNodes: [n],
                    }

                    cb(n, e, 'content')
                    handleTextExecutableValue(e, refs, n)
                }
            } else {
                node.appendChild(n as Node)
            }
        },
    }
}

export const Doc = (
    values: Array<unknown>,
    refs: Record<string, Set<Element>>,
    cb: (node: Node, e: ExecutableValue, type: string) => void
) => {
    return {
        createTextNode: (text: string) => {
            return doc.createTextNode(text)
        },
        createComment: (text: string) => {
            return doc.createComment(text)
        },
        createDocumentFragment: () => {
            return node('#fragment', '', values, refs, cb)
        },
        createElementNS: (ns: string, tagName: string) => {
            return node(tagName, ns, values, refs, cb)
        },
    }
}
