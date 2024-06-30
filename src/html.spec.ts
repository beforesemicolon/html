import {html, HtmlTemplate} from './html'
import {state} from './state'
import {when, repeat, oneOf, is} from './helpers'
import { suspense } from './utils/suspense'
import { element } from './utils/element'

describe('html', () => {
	beforeEach(() => {
		jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
			const id = Math.random()
			cb(id);
			return id;
		});
		document.body.innerHTML = ''
	})
	
	afterEach(() => {
		(window.requestAnimationFrame as jest.Mock)?.mockRestore?.();
	});
	
	it('should render correctly', () => {
		const app = html`<h1>Todo Manager</h1>
			<div class="action-bar">
				<input type="search" placeholder="Search...">
			</div>
			<div class="todo-container">
				<div class="pending-todos"></div>
				<div class="in-progress-todos"></div>
				<div class="completed-todos"></div>
				<div class="archived-todos"></div>
			</div>`
		
		app.render(document.body)
		
		expect(document.body.innerHTML).toBe('<h1>Todo Manager</h1>\n' +
			'\t\t\t<div class="action-bar">\n' +
			'\t\t\t\t<input type="search" placeholder="Search...">\n' +
			'\t\t\t</div>\n' +
			'\t\t\t<div class="todo-container">\n' +
			'\t\t\t\t<div class="pending-todos"></div>\n' +
			'\t\t\t\t<div class="in-progress-todos"></div>\n' +
			'\t\t\t\t<div class="completed-todos"></div>\n' +
			'\t\t\t\t<div class="archived-todos"></div>\n' +
			'\t\t\t</div>')
		expect(app.nodes).toHaveLength(5)
	});
	
	it('should ignore html in comments', () => {
		html`<!--<input type="search" placeholder="Search...">-->`.render(document.body)
		
		expect(document.body.innerHTML).toBe('<!--<input type="search" placeholder="Search...">-->')
	});
	
	it('should parse text injected inside element', () => {
		const count = 12
		const temp = html`<h1>sample (${count})</h1>`
		
		temp.render(document.body)
		
		expect(document.body.innerHTML).toBe('<h1>sample (12)</h1>')
	})
	
	it('should render static text', () => {
		const temp = html`sample`
		
		temp.render(document.body)
		
		expect(document.body.innerHTML).toBe('sample')
	})
	
	it('should render static text from dynamic variable', () => {
		const s = () => 'sample'
		const temp = html`${s}`
		
		temp.render(document.body)
		
		expect(document.body.innerHTML).toBe('sample')
		expect(document.body.childNodes).toHaveLength(1)
		expect(Array.from(document.body.childNodes)).toEqual(temp.nodes)
	})
	
	it('should render html as text', () => {
		const htmlString = '<p>sample</p>'
		const temp = html`${htmlString}`
		
		temp.render(document.body)
		
		expect(document.body.innerHTML).toBe('&lt;p&gt;sample&lt;/p&gt;')
	})
	
	it('should render html as HTML', () => {
		// @ts-ignore
		const htmlString = html(['<p>sample</p>'])
		const temp = html`${htmlString}`
		
		temp.render(document.body)
		
		expect(document.body.innerHTML).toBe('<p>sample</p>')
	})
	
	it('should render dynamic text and update', () => {
		let [x, setX] = state(15)
		
		const temp = html`${() => (x() > 10 ? 'more than 10' : 'less than 10')}`
		
		temp.render(document.body)
		
		expect(document.body.innerHTML).toBe('more than 10')
		
		setX(5)
		
		expect(document.body.innerHTML).toBe('less than 10')
	})
	
	it('should render dynamic HTML and update', () => {
		let [x, setX] = state(15)
		const a = html`<p>more than 10</p>`
		const b = html`<p>less than 10</p>`
		
		const temp = html`total: ${() => (x() > 10 ? html`>${a}` : html`<${b}`)}`
		
		temp.render(document.body)
		
		expect(temp.nodes).toHaveLength(3)
		expect(temp.nodes.map(n => (n as Element).outerHTML || n.nodeValue)).toEqual([
			"total: ",
			">",
			"<p>more than 10</p>"
		])
		expect(a.isConnected).toBeTruthy()
		expect(a.nodes).toHaveLength(1)
		expect((a.nodes[0] as Element).outerHTML).toBe('<p>more than 10</p>')
		
		expect(b.isConnected).toBeFalsy()
		expect(b.nodes).toHaveLength(0)
		
		expect(document.body.innerHTML).toBe('total: &gt;<p>more than 10</p>')
		
		setX(5)

		expect(temp.nodes).toHaveLength(3)
		expect(temp.nodes.map(n => (n as Element).outerHTML || n.nodeValue)).toEqual([
			"total: ",
			"<",
			"<p>less than 10</p>"
		])

		expect(document.body.innerHTML).toBe('total: &lt;<p>less than 10</p>')
	})
	
	it('should handle deeply nested HTML', () => {
		html`${html`${html`${html`<p>sample</p>`}`}`}`.render(document.body)
		
		expect(document.body.innerHTML).toBe('<p>sample</p>')
	})
	
	it('should handle function that returns HTML', () => {
		html`${() => html`<p>sample</p>`}`.render(document.body)
		
		expect(document.body.innerHTML).toBe('<p>sample</p>')
	})
	
	it('should handle deeply nested function that returns HTML', () => {
		const x = html`<p>sample</p>`
		html`${() => html`${x}`}`.render(document.body)
		
		expect(document.body.innerHTML).toBe('<p>sample</p>')
	})
	
	it('should handle deeply nested txt Template', () => {
		const x = html`sample`
		html`${html`${html`${x}`}`}`.render(document.body)
		
		expect(document.body.innerHTML).toBe('sample')
	})
	
	it('should render a growing list of items', () => {
		const [list, updateList] = state<HtmlTemplate[]>([])
		
		html`${list}`.render(document.body)
		
		expect(document.body.innerHTML).toBe('')
		
		updateList([html`<div>one</div>`])
		
		expect(document.body.innerHTML).toBe('<div>one</div>')
		
		updateList(prev => [...prev, html`<div>two</div>`])
		
		expect(document.body.innerHTML).toBe('<div>one</div><div>two</div>')
	})
	
	it('should force to render in a different place', () => {
		const page = html`<h1>Page Title</h1><p>Page description</p><button>Page CTA Action</button>`
		
		page.render(document.body)
		
		expect(document.body.innerHTML).toBe(
			'<h1>Page Title</h1><p>Page description</p><button>Page CTA Action</button>'
		)
		
		const wrapper = document.createElement('div')
		wrapper.className = 'wrapper'
		document.body.appendChild(wrapper)
		
		page.render(wrapper)
		
		expect(document.body.innerHTML).toBe(
			'<h1>Page Title</h1><p>Page description</p><button>Page CTA Action</button><div class="wrapper"></div>'
		)
		
		page.render(wrapper, true)
		
		expect(document.body.innerHTML).toBe(
			'<div class="wrapper"><h1>Page Title</h1><p>Page description</p><button>Page CTA Action</button></div>'
		)
	})
	
	it('should replace dom element', () => {
		const btn = html`
			<button>Page CTA Action</button>`
		
		const span = document.createElement('span')
		document.body.appendChild(span)
		
		expect(document.body.innerHTML).toBe('<span></span>')
		
		btn.replace(span)
		
		expect(document.body.innerHTML).toBe('<button>Page CTA Action</button>')
	})
	
	it('should replace html template', () => {
		const btn = html`
			<button>Page CTA Action</button>`
		
		const span = html`sample text <span></span><div>x</div>`
		span.render(document.body)
		
		expect(document.body.innerHTML).toBe(
			'sample text <span></span><div>x</div>'
		)
		
		btn.replace(span)
		
		expect(document.body.innerHTML).toBe('<button>Page CTA Action</button>')
	})
	
	it('should render src', () => {
		const button = html`
			<button>click me</button>`
		
		button.render(document.body)
		
		expect(document.body.innerHTML).toBe('<button>click me</button>')
	})
	
	it('should render src with dynamic attr value', () => {
		let [type, setType] = state('button')
		const button = html`
			<button type="${type}">click me</button>`
		
		button.render(document.body)
		
		expect(document.body.innerHTML).toBe(
			'<button type="button">click me</button>'
		)
		
		setType('submit')
		
		expect(document.body.innerHTML).toBe(
			'<button type="submit">click me</button>'
		)
	})
	
	it('should render handle multiple attr value parts', () => {
		const cls1 = 'loading'
		const cls2 = 'disabled'
		const button = html`
			<button type="text" class="${cls1} ${cls2}">click me</button>`
		
		button.render(document.body)
		
		expect(document.body.innerHTML).toBe(
			'<button type="text" class="loading disabled">click me</button>'
		)
	})
	
	it('should render dynamic src', () => {
		const value = 'sample'
		let [edit, setEdit] = state(false)
		const val = html`${() =>
			edit()
				? html`<input type="text" value="${value}"/>`
				: html`<p>${value}</p>`}`
		
		val.render(document.body)
		
		expect(document.body.innerHTML).toBe('<p>sample</p>')
		
		setEdit(true)
		
		expect(document.body.innerHTML).toBe(
			'<input type="text" value="sample">'
		)
	})
	
	it('should render nested from values', () => {
		const button = html`<button>click me</button>`
		const app = html`<h2>App</h2>${button}`
		
		app.render(document.body)
		
		expect(document.body.innerHTML).toBe(
			'<h2>App</h2><button>click me</button>'
		)
	})
	
	it('should render nested src 2 levels with dynamic inner level', () => {
		let [items, updateItems] = state([1, 2, 3])
		const list = html`
			<ul>
				${() => items().map((i) => html`
					<li>item-${i}</li>`)}
			</ul>`
		
		list.render(document.body)
		
		expect(document.body.innerHTML).toBe(
			'<ul>\n' +
			'\t\t\t\t<li>item-1</li><li>item-2</li><li>item-3</li>\n' +
			'\t\t\t</ul>'
		)
		
		updateItems([1])
		
		expect(document.body.innerHTML).toBe('<ul>\n' +
			'\t\t\t\t<li>item-1</li>\n' +
			'\t\t\t</ul>')
		
		updateItems([1, 2])
		
		expect(document.body.innerHTML).toBe(
			'<ul>\n' +
			'\t\t\t\t<li>item-1</li><li>item-2</li>\n' +
			'\t\t\t</ul>'
		)
		
		updateItems([])
		
		expect(document.body.innerHTML).toBe('<ul>\n' +
			'\t\t\t\t\n' +
			'\t\t\t</ul>')
		
		updateItems([1, 2, 3])
		
		expect(document.body.innerHTML).toBe(
			'<ul>\n' +
			'\t\t\t\t<li>item-1</li><li>item-2</li><li>item-3</li>\n' +
			'\t\t\t</ul>'
		)
	})
	
	it('should render nested src 3 levels', () => {
		const deep = html`
			<ul>
				${html`
					<li>${html`<span>${html`sample`}</span>`}</li>`}
			</ul>`
		
		deep.render(document.body)
		
		expect(document.body.innerHTML).toBe(
			'<ul>\n' +
			'\t\t\t\t<li><span>sample</span></li>\n' +
			'\t\t\t</ul>'
		)
	})
	
	it('should handle event attribute with fn value and event options', () => {
		const clickMock = jest.fn()
		
		const btn = html`
			<button onclick="${clickMock}, true">click me</button>`
		
		btn.render(document.body)
		
		const btnElement = btn.nodes[0] as HTMLButtonElement
		
		expect(document.body.innerHTML).toBe('<button>click me</button>')
		
		btnElement.click()
		
		expect(clickMock).toHaveBeenCalled()
	})
	
	it('should handle custom events attribute with web components', () => {
		const clickMock = jest.fn()
		
		class MyButton extends HTMLElement {
			constructor() {
				super()
				
				this.addEventListener('click', () => {
					this.dispatchEvent(new CustomEvent('active'))
				})
			}
		}
		
		customElements.define('my-button', MyButton)
		
		const btn = html`
			<my-button onactive="${clickMock}">click me</my-button>`
		
		btn.render(document.body)
		
		const btnElement = btn.nodes[0] as HTMLButtonElement
		
		expect(document.body.innerHTML).toBe('<my-button>click me</my-button>')
		
		btnElement.click()
		
		expect(clickMock).toHaveBeenCalled()
	})
	
	it('should ignore event like prop for random tag', () => {
		html`
			<intl-plural zero="people" one="person" other="people" value="1"></intl-plural>`.render(document.body)
		
		expect(document.body.innerHTML).toBe('<intl-plural zero="people" one="person" other="people" value="1"></intl-plural>')
	});
	
	it('should handle non-primitive value for web components', () => {
		const updateMock = jest.fn();
		const updateValMock = jest.fn();
		
		class IntlList extends HTMLElement {
			static observedAttributes = ['items'];
			
			set items(val: any) {
				updateValMock(val)
			}
			
			attributeChangedCallback(...res: any[]) {
				updateMock(...res)
			}
		}
		
		customElements.define('intl-list', IntlList);
		
		html`<intl-list items="${["book", "car", "jet"]}"></intl-list>`
			.render(document.body)
		
		expect(document.body.innerHTML).toBe('<intl-list items="[&quot;book&quot;,&quot;car&quot;,&quot;jet&quot;]"></intl-list>')
		expect(updateMock).toHaveBeenCalledWith("items", null, '["book","car","jet"]', null)
		expect(updateValMock).toHaveBeenCalledWith(["book", "car", "jet"])
	});
	
	it('should trow error if handle event attribute is not a function',     () => {
		expect(
			() => html`
				<button onclick="${2}">click me</button>`.render(document.body)
		).toThrowError(
			'Handler for event "onclick" is not a function. Found "2".'
		)
	})

	it('should ignore inline event if its one of its prop', () => {
		class OneTestComp extends HTMLElement {
			static observedAttributes = ['one']
		}

		class TwoTestComp extends HTMLElement {
		}

		customElements.define('one-comp', OneTestComp)
		customElements.define('two-comp', TwoTestComp)

		expect(() => html`
			<one-comp one="${2}"></one-comp>`.render(document.body)).not.toThrowError()
		expect(() => html`
			<two-comp one="${2}"></two-comp>`.render(document.body)).toThrowError(
			'Handler for event "one" is not a function. Found "2".'
		)
	})
	
	it('should handle ref directive', () => {
		const btn = html`
			<button ref="btn">
				${html`
					<div ref="div">
						${html`<span ref="span">click me</span>`}
					</div>`}
			</button>`
		
		btn.render(document.body)
		
		const btnElement = btn.refs['btn'][0]
		const spanElement = btn.refs['span'][0]
		const divElement = btn.refs['div'][0]
		
		expect(btnElement).toBeInstanceOf(HTMLButtonElement)
		expect(spanElement).toBeInstanceOf(HTMLSpanElement)
		expect(divElement).toBeInstanceOf(HTMLDivElement)
	})
	
	it('should handle empty ref directive', () => {
		const btn = html`<button ref="">click me</button>`
		
		btn.render(document.body)
		
		expect(document.body.innerHTML).toBe('<button>click me</button>');
	})
	
	describe('should handle refs', () => {
		it('when anywhere inside own template', () => {
			const temp = html`<div ref="box">
				<p ref="paragraph">some text <span ref="value">value</span></p>
			</div>`.render(document.body)
			
			expect(temp.refs).toEqual({
				"box": [
					expect.any(HTMLDivElement)
				],
				"paragraph": [
					expect.any(HTMLParagraphElement)
				],
				"value": [
					expect.any(HTMLSpanElement)
				]
			})
		})
		
		it('when in a nested template', () => {
			const p = html`<p ref="paragraph">some text <span ref="value">value</span></p>`
			const temp = html`<div ref="box">
				${p}
			</div>`.render(document.body)
			
			expect(temp.refs).toEqual({
				"box": [
					expect.any(HTMLDivElement)
				],
				"paragraph": [
					expect.any(HTMLParagraphElement)
				],
				"value": [
					expect.any(HTMLSpanElement)
				]
			})
		})
		
		it('when dynamic', () => {
			let [x, setX] = state(15)
			const label = html`${when(
				() => x() > 10,
				html`<span ref="greater">greater than 10</span>`,
				html`<span ref="less">less than 10</span>`
			)}`
			const btn = html`<button ref="btn">${label}</button>`
			
			btn.render(document.body)
			
			expect(btn.refs).toEqual({
				"btn": [
					expect.any(HTMLButtonElement)
				],
				"greater": [
					expect.any(HTMLSpanElement)
				]
			})
			
			setX(5)

			expect(document.body.innerHTML).toBe('<button><span>less than 10</span></button>')
			
			expect(btn.refs).toEqual({
				"btn": [
					expect.any(HTMLButtonElement)
				],
				"less": [
					expect.any(HTMLSpanElement)
				]
			})
		})
	})
	
	describe('should handle attr directive', () => {
		it('class name as property', () => {
			let [loading, setLoading] = state(true)
			const btn = html`
				<button attr.class.btn="true" attr.class.loading="${loading}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button class="btn loading">click me</button>'
			)
			
			setLoading(false)

			expect(document.body.innerHTML).toBe(
				'<button class="btn">click me</button>'
			)
		})
		
		it('class name as property without attr.', () => {
			let [loading, setLoading] = state(true)
			const btn = html`
				<button class.btn="true" class.loading="${loading}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button class="btn loading">click me</button>'
			)
			
			setLoading(false)
			
			expect(document.body.innerHTML).toBe(
				'<button class="btn">click me</button>'
			)
		})
		
		it('class name as value', () => {
			let [loading, setLoading] = state(true)
			const btn = html`
				<button attr.class="loading | ${loading}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button class="loading">click me</button>'
			)
			
			setLoading(false)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>')
		})
		
		it('class name as value without attr.', () => {
			let [loading, setLoading] = state(true)
			const btn = html`
				<button class="loading | ${loading}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button class="loading">click me</button>'
			)
			
			setLoading(false)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>')
		})
		
		it('empty class should be ignored', () => {
			const btn = html`<button attr.class="" class.sample="">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>');
		})
		
		it('data name as property', () => {
			let [loading, setLoading] = state(true)
			const btn = html`
				<button attr.data.btn="true" attr.data.loading="${loading}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button data-btn="true" data-loading="true">click me</button>'
			)
			
			setLoading(false)
			
			expect(document.body.innerHTML).toBe(
				'<button data-btn="true">click me</button>'
			)
		})
		
		it('data name as property without attr.', () => {
			let [loading, setLoading] = state(true)
			const btn = html`
				<button data.btn="true" data.loading="${loading}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button data-btn="true" data-loading="true">click me</button>'
			)
			
			setLoading(false)
			
			expect(document.body.innerHTML).toBe(
				'<button data-btn="true">click me</button>'
			)
		})
		
		it('data name as property without dot notation', () => {
			let [loading, setLoading] = state(true)
			const btn = html`
				<button attr.data-btn="true" attr.data-loading="${loading}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button data-btn="true" data-loading="true">click me</button>'
			)
			
			setLoading(false)
			
			expect(document.body.innerHTML).toBe(
				'<button data-btn="true">click me</button>'
			)
		})
		
		it('data name as property without attr. and dot notation', () => {
			let [loading, setLoading] = state(true)
			const btn = html`
				<button data-btn="true" data-loading="${loading}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button data-btn="true" data-loading="true">click me</button>'
			)
			
			setLoading(false)
			
			expect(document.body.innerHTML).toBe(
				'<button data-btn="true">click me</button>'
			)
		})
		
		it('data name as value wont work', () => {
			const loading = true
			const btn = html`
				<button attr.data="loading, ${() => loading}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>')
		})
		
		it('data name as value wont work without attr.', () => {
			const loading = true
			const btn = html`
				<button data="loading, ${() => loading}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>')
		})
		
		it('empty data should be ignored', () => {
			const btn = html`<button attr.data="" data.sample="">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>');
		})
		
		it('style property without flag', () => {
			const btn = html`
				<button attr.style.cursor="pointer">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button style="cursor: pointer;">click me</button>'
			)
		})
		
		it('style property without flag without attr.', () => {
			const btn = html`
				<button style.cursor="pointer">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button style="cursor: pointer;">click me</button>'
			)
		})
		
		it('style value without flag', () => {
			const btn = html`
				<button attr.style="cursor: pointer">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button style="cursor: pointer;">click me</button>'
			)
		})
		
		it('style value without flag without attr.', () => {
			const btn = html`
				<button style="cursor: pointer">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button style="cursor: pointer;">click me</button>'
			)
		})
		
		it('style property with flag', () => {
			let [pointer, setPointer] = state(false)
			const btn = html`
				<button attr.style.cursor="pointer | ${pointer}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>')
			
			setPointer(true)
			
			expect(document.body.innerHTML).toBe(
				'<button style="cursor: pointer;">click me</button>'
			)
		})
		
		it('style property with flag without attr.', () => {
			let [pointer, setPointer] = state(false)
			const btn = html`
				<button style.cursor="pointer | ${pointer}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>')
			
			setPointer(true)
			
			expect(document.body.innerHTML).toBe(
				'<button style="cursor: pointer;">click me</button>'
			)
		})
		
		it('style value with flag', () => {
			let [pointer, setPointer] = state(false)
			const btn = html`
				<button attr.style="cursor: pointer | ${pointer}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>')
			
			setPointer(true)
			
			expect(document.body.innerHTML).toBe(
				'<button style="cursor: pointer;">click me</button>'
			)
		})
		
		it('style value with flag without attr.', () => {
			let [pointer, setPointer] = state(false)
			const btn = html`
				<button style="cursor: pointer | ${pointer}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>')
			
			setPointer(true)
			
			expect(document.body.innerHTML).toBe(
				'<button style="cursor: pointer;">click me</button>'
			)
		})
		
		it('empty style should be ignored', () => {
			const btn = html`<button attr.style="" style.color="">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>');
		})
		
		it('should accept style in a variable', () => {
			const bg = 'red'
			const style = `background: ${bg}`
			const btn = html`<button style="${style}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe('<button style="background: red;">click me</button>');
		})
		
		it('any boolean attr', () => {
			let [disabled, setDisabled] = state(true)
			const btn = html`
				<button attr.disabled="${disabled}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button disabled="true">click me</button>'
			)
			
			setDisabled(false)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>')
		})
		
		it('any boolean attr without attr.', () => {
			let [disabled, setDisabled] = state(false)
			const btn = html`
				<button disabled="${disabled}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button>click me</button>'
			)
			
			setDisabled(true)
			
			expect(document.body.innerHTML).toBe('<button disabled="true">click me</button>')
		})
		
		it('any boolean attr without attr. and no value', () => {
			let disabled = false
			const btn = html`
				<button disabled>click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button disabled="">click me</button>'
			)
		})
		
		it('any boolean attr with nil value', () => {
			const btn = html`
				<button attr.disabled="${undefined}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button>click me</button>'
			)
		})
		
		it('any boolean attr with nil value without attr.', () => {
			const btn = html`
				<button disabled="${undefined}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button>click me</button>'
			)
		})
		
		it('any boolean attr with possible values', () => {
			let [hidden, setHidden] = state(true)
			const btn = html`
				<button attr.hidden="until-found | ${hidden}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button hidden="until-found">click me</button>'
			)
			
			setHidden(false)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>')
		})
		
		it('any boolean attr with possible values without attr.', () => {
			let [hidden, setHidden] = state(true)
			const btn = html`
				<button hidden="until-found | ${hidden}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button hidden="until-found">click me</button>'
			)
			
			setHidden(false)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>')
		})
		
		it('any non-primitive-boolean attr', () => {
			let [disabled, setDisabled] = state(true)
			const btn = html`
				<button attr.aria-disabled="${disabled}">click me</button>`
			
			btn.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<button aria-disabled="true">click me</button>'
			)
			
			setDisabled(false)
			
			expect(document.body.innerHTML).toBe(
				'<button>click me</button>'
			)
		})
		
		it('any key-value pair', () => {
			let [pattern, setPattern] = state('')
			const field = html`<input attr.pattern="${pattern} | ${pattern}"/>`
			
			field.render(document.body)
			
			expect(document.body.innerHTML).toBe('<input>')
			
			setPattern('[a-z]')
			
			expect(document.body.innerHTML).toBe('<input pattern="[a-z]">')
		})
		
		it('any key-value pair without .attr', () => {
			let [pattern, setPattern] = state('')
			const field = html`<input pattern="${pattern} | ${pattern}"/>`
			
			field.render(document.body)
			
			expect(document.body.innerHTML).toBe('<input>')
			
			setPattern('[a-z]')
			
			expect(document.body.innerHTML).toBe('<input pattern="[a-z]">')
		})
		
		it('should work with helper value',  () => {
			const [disabled, setDisabled] = state(false);
			
			html`<button attr.disabled="${is(disabled, true)}" attr.class="disabled | ${is(disabled, true)}">click me</button>`.render(document.body)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>')
			
			setDisabled(true);
			
			expect(document.body.innerHTML).toBe('<button disabled="true" class="disabled">click me</button>')
		});
		
		it('should work with helper value without attr.',  () => {
			const [disabled, setDisabled] = state(false);
			
			html`<button disabled="${is(disabled, true)}" class="disabled | ${is(disabled, true)}">click me</button>`.render(document.body)
			
			expect(document.body.innerHTML).toBe('<button>click me</button>')
			
			setDisabled(true);
			
			expect(document.body.innerHTML).toBe('<button disabled="true" class="disabled">click me</button>')
		});
		
		it('should handle slot name', () => {
			const slotName = '123'
			
			html`<slot attr.name="${slotName} | ${false}"></slot><slot attr.name="${slotName} | ${true}"></slot>`.render(document.body)
			
			expect(document.body.innerHTML).toBe('<slot></slot><slot name="123"></slot>')
		});
		
		it('should handle slot name without attr.', () => {
			const slotName = '123'
			
			html`<slot name="${slotName} | ${false}"></slot><slot name="${slotName} | ${true}"></slot>`.render(document.body)
			
			expect(document.body.innerHTML).toBe('<slot></slot><slot name="123"></slot>')
		});
	})
	
	it('should handle primitive attribute value', () => {
		const val = 12
		const href = '/sample'
		const el = html`<a href="${href}" data-test-val="${val}"></a>`
		
		el.render(document.body)
		
		expect(document.body.innerHTML).toBe(
			'<a href="/sample" data-test-val="12"></a>'
		)
	})
	
	it('should handle non-primitive attribute value', () => {
		const val = {val: 12}
		const map = new Map()
		const el = html`
			<div
				data-test-map="${map}"
				data-test-val="${val}"
			></div>`
		
		el.render(document.body)
		
		expect(document.body.innerHTML).toBe(
			'<div data-test-map="{}" data-test-val="{&quot;val&quot;:12}"></div>'
		)
	})
	
	it('should handle non-primitive attribute value in WC', () => {
		const updateMock = jest.fn()
		const mapMock = jest.fn()
		const valMock = jest.fn()
		
		class SampleComp extends HTMLElement {
			static observedAttributes = ['map', 'val']
			
			set map(val: any) {
				mapMock(val)
			}
			
			set val(val: any) {
				valMock(val)
			}
			
			attributeChangedCallback(...args: any[]) {
				updateMock(...args)
			}
		}
		
		customElements.define('sample-comp', SampleComp)
		
		const val = {val: 12}
		const map = new Map()
		const el = html`
			<sample-comp map="${map}" val="${val}"></sample-comp>`
		
		el.render(document.body)
		
		expect(document.body.innerHTML).toBe(
			'<sample-comp map="{}" val="{&quot;val&quot;:12}"></sample-comp>'
		)
		expect(mapMock).toHaveBeenCalledWith(expect.any(Map))
		expect(valMock).toHaveBeenCalledWith({val: 12})
		
		expect(updateMock).toHaveBeenCalledTimes(2)
		expect(updateMock).toHaveBeenCalledWith('map', null, '{}', null)
		expect(updateMock).toHaveBeenCalledWith('val', null, '{"val":12}', null)
	})

	it('should handle non-primitive attribute value in conditionally rendered WC',  () => {
		jest.useFakeTimers()
		type obj = { sample: { x: 12} | null }

		class ObjValue extends HTMLElement {
			static observedAttributes = ['sample'];
			#sample = (() => {
				const [value, updateValue] = state<any>(null)
				
				return {value, updateValue}
			})();
			temp: HtmlTemplate | undefined;

			get sample() {
				return this.#sample.value;
			}

			set sample(val) {
				this.#sample.updateValue(val);
			}

			connectedCallback() {
				this.temp = html`${() => this.sample()?.x}`;

				this.temp.render(this)
			}
		}

		class MainApp extends HTMLElement {
			connectedCallback() {
				const [obj, setObj] = state<obj['sample']>(null);

				setTimeout(() => {
					setObj({x: 12})
				}, 1000)

				html`${when(obj, html`<obj-value sample="${obj}"></obj-value>`)}`
					.render(this)
			}
		}

		customElements.define('obj-value', ObjValue)
		customElements.define('main-app', MainApp)

		const el = html`<main-app></main-app>`

		el.render(document.body)
		
		expect(document.body.innerHTML).toBe('<main-app></main-app>')
		
		jest.advanceTimersByTime(1200);

		expect(document.body.innerHTML).toBe('<main-app><obj-value sample="{&quot;x&quot;:12}">12</obj-value></main-app>')
		
		jest.useRealTimers()
	})

	describe('should work with "repeat" helper', () => {
		it('with number value and primitive return', () => {
			const el = html`${repeat(2, (n) => n)}`
			
			el.render(document.body)
			
			expect(document.body.innerHTML).toBe('12')
		})
		
		it('with number value and node return', () => {
			let [count, setCount] = state(2)
			const el = html`${repeat(
				count,
				(n) => html`<span>${n}</span>`
			)}`
			
			el.render(document.body)
			
			expect(document.body.innerHTML).toBe('<span>1</span><span>2</span>')
			
			setCount(3)
			
			expect(document.body.innerHTML).toBe(
				'<span>1</span><span>2</span><span>3</span>'
			)
		})
		
		it('with object value and node return', () => {
			const [items, updateItems] = state([{name: 'one'}, {name: 'two'}])
			const el = html`${repeat(
				items,
				(n) => html`<span>${n.name}</span>`
			)}`
			
			el.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<span>one</span><span>two</span>'
			)
			const n1 = document.body.children[0]
			const n2 = document.body.children[1]
			
			
			updateItems(prev => [
				{name: 'first'},
				prev[1]
			])
			
			expect(document.body.innerHTML).toBe(
				'<span>first</span><span>two</span>'
			)
			expect(n1).not.toEqual(document.body.children[0])
			
			updateItems(prev => [
				...prev,
				{name: 'last'}
			])
			
			expect(document.body.innerHTML).toBe(
				'<span>first</span><span>two</span><span>last</span>'
			)
			expect(n2).toEqual(document.body.children[1])
		})
		
		it('with object value and WC return', () => {
			const valMock = jest.fn()
			
			class TestComponent extends HTMLElement {
				set val(newVal: any) {
					valMock(newVal)
				}
			}
			
			customElements.define('test-component', TestComponent)
			
			const [items, updateItems] = state([{name: 'one'}, {name: 'two'}])
			const el = html`${repeat(
				items,
				(n) => html`
					<test-component val="${n}"></test-component>`
			)}`
			
			el.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<test-component val="{&quot;name&quot;:&quot;one&quot;}"></test-component><test-component val="{&quot;name&quot;:&quot;two&quot;}"></test-component>'
			)
			
			expect(valMock).toHaveBeenCalledTimes(2)
			expect(valMock).toHaveBeenCalledWith({name: 'one'})
			expect(valMock).toHaveBeenCalledWith({name: 'two'})
			
			updateItems(prev => [
				{name: 'first'},
				prev[1]
			])
			
			expect(valMock).toHaveBeenCalledWith({name: 'first'})
			
			updateItems(prev => [
				...prev,
				{name: 'last'}
			])
			
			expect(valMock).toHaveBeenCalledWith({name: 'last'})
		})
		
		it('with array containing repeated values as string', () => {
			const items = html`${repeat([1, 3, 5, 3], (n) => `item ${n}`)}`
			
			items.render(document.body)
			
			expect(document.body.innerHTML).toBe('item 1item 3item 5item 3')
		})
		
		it('with array containing repeated values as html instance', () => {
			const items = html`${repeat(
				[1, 3, 5, 3],
				(n) => html`<span>item ${n}</span>`
			)}`
			
			items.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<span>item 1</span><span>item 3</span><span>item 5</span>'
			)
		})
		
		it('with array of values as html instance based on object', () => {
			
			class TodoItem extends HTMLElement {
				temp: any
				static observedAttributes = ['name', 'description', 'status']
				state = (() => {
					const [name, updateName] = state('');
					const [description, updateDescription] = state('');
					const [status, updateStatus] = state('pending');
					
					return {
						name, updateName,
						description, updateDescription,
						status, updateStatus
					}
				})()
				
				constructor() {
					super()
					
					this.attachShadow({mode: 'open'})
				}
				
				connectedCallback() {
					const deleteBtn = html`
						<button>delete</button>`
					
					const archiveBtn = html`
						<button>archive</button>`
					
					const editBtn = html`
						<button>edit</button>`
					
					const progressBtn = html`
						<button>move in progress</button>`
					
					const completeBtn = html`
						<button>complete</button>`
					
					this.temp = html`
						<div class="todo-item">
							<div class="details">
								<h3>${this.state.name}</h3>
								${when(
									this.state.description,
									() => html`<p>${this.state.description}</p>`
								)}
							</div>
							<div class="todo-actions">
								${when(
									is(this.state.status, 'pending'),
									html`${completeBtn}${editBtn}`
								)}
								${when(
									oneOf(this.state.status, ['completed', 'pending']),
									archiveBtn
								)}
								${when(
									is(this.state.status, 'archived'),
									html`${progressBtn}${deleteBtn}`
								)}
							</div>
						</div>`
					
					this.temp.render(this.shadowRoot)
				}
				
				attributeChangedCallback(
					name: string,
					oldValue: string,
					newValue: string
				) {
					switch (name) {
						case 'name':
							this.state.updateName(newValue)
							break
						case 'description':
							this.state.updateDescription(newValue)
							break
						case 'status':
							this.state.updateStatus(newValue)
							break
					}
				}
			}
			
			customElements.define('todo-item', TodoItem)
			
			const [todoList, updateTodoList] = state([
				{name: 'sample', description: '', status: 'pending'},
			])
			
			const todos = html`${repeat(
				todoList,
				(item) =>
					html`
						<todo-item
							name="${item.name}"
							description="${item.description}"
							status="${item.status}"
						></todo-item>`
			)}`
			
			todos.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<todo-item name="sample" description="" status="pending"></todo-item>'
			)
			
			let todo = document.querySelector('todo-item') as HTMLElement
			
			expect(todo.shadowRoot?.innerHTML).toBe('<div class="todo-item">\n' +
				'\t\t\t\t\t\t\t<div class="details">\n' +
				'\t\t\t\t\t\t\t\t<h3>sample</h3>\n' +
				'\t\t\t\t\t\t\t\t\n' +
				'\t\t\t\t\t\t\t</div>\n' +
				'\t\t\t\t\t\t\t<div class="todo-actions">\n' +
				'\t\t\t\t\t\t\t\t<button>complete</button><button>edit</button>\n' +
				'\t\t\t\t\t\t\t\t<button>archive</button>\n' +
				'\t\t\t\t\t\t\t\t\n' +
				'\t\t\t\t\t\t\t</div>\n' +
				'\t\t\t\t\t\t</div>')
			
			updateTodoList(prev => {
				prev[0] = {
					...prev[0],
					status: 'completed'
				}
				return [...prev];
			})
			
			expect(document.body.innerHTML).toBe(
				'<todo-item name="sample" description="" status="completed"></todo-item>'
			)
			
			// need to query the node again because a new instance will be created
			todo = document.querySelector('todo-item') as HTMLElement
			
			expect(todo.shadowRoot?.innerHTML).toBe('<div class="todo-item">\n' +
				'\t\t\t\t\t\t\t<div class="details">\n' +
				'\t\t\t\t\t\t\t\t<h3>sample</h3>\n' +
				'\t\t\t\t\t\t\t\t\n' +
				'\t\t\t\t\t\t\t</div>\n' +
				'\t\t\t\t\t\t\t<div class="todo-actions">\n' +
				'\t\t\t\t\t\t\t\t\n' +
				'\t\t\t\t\t\t\t\t<button>archive</button>\n' +
				'\t\t\t\t\t\t\t\t\n' +
				'\t\t\t\t\t\t\t</div>\n' +
				'\t\t\t\t\t\t</div>'
			)
		})
		
		it('should handle nested repeat by changing data in place', () => {
			const [data, setData] = state([{name: 'one', subs: [1, 2]}])
			const item = ({name, subs}: any) =>
				html`
					<li>${name}: ${repeat(() => subs, (sub: any) => html`<span>${sub}</span>`)}</li>`
			const list = html`${repeat(data, item)}`
			
			list.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<li>one: <span>1</span><span>2</span></li>'
			)
			
			
			setData(prev => {
				prev[0] = {
					...prev[0],
					subs: prev[0].subs.concat([3])
				}
				return [...prev];
			})
			
			expect(document.body.innerHTML).toBe(
				'<li>one: <span>1</span><span>2</span><span>3</span></li>'
			)
			
			setData(prev => {
				prev[0] = {
					...prev[0],
					subs: [prev[0].subs[0]]
				}
				return [...prev];
			})
			
			expect(document.body.innerHTML).toBe('<li>one: <span>1</span></li>')
		})
		
		it('with state',  () => {
			const [todos, setTodos] = state<Array<string>>([])
			
			const Todo = html`
				<ul>
					${repeat(todos, (todo: any) => html`
						<li>${todo}</li>`)}
				</ul>`
			
			Todo.render(document.body)
			
			expect(document.body.innerHTML).toBe('<ul>\n' +
				'\t\t\t\t\t\n' +
				'\t\t\t\t</ul>')
			
			setTodos((prev) => [...prev, 'first'])
			
			expect(document.body.innerHTML).toBe('<ul>\n' +
				'\t\t\t\t\t<li>first</li>\n' +
				'\t\t\t\t</ul>')
			
			setTodos([])
			
			expect(document.body.innerHTML).toBe('<ul>\n' +
				'\t\t\t\t\t\n' +
				'\t\t\t\t</ul>')
		})
		
		it('when item changes', async () => {
			const updateMock = jest.fn()
			const [todos, setTodos] = state<
				Array<{ name: string; status: string; id: number }>
			>([], updateMock)
			const todoItem = (todo: any) => html`
				<div id="${todo.id}">${todo.name} <span>${todo.status}</span></div>`
			const todoList = html`${repeat(todos, todoItem)}`;
			
			html`
				<div>${todoList}</div>`.render(document.body)
			
			expect(document.body.innerHTML).toBe('<div></div>')
			
			setTodos([{name: 'action 1', status: 'pending', id: 1}])
			
			expect(updateMock).toHaveBeenCalled()
			expect(todos()).toEqual([
				{
					id: 1,
					name: 'action 1',
					status: 'pending',
				},
			])
			expect(document.body.innerHTML).toBe('<div><div id="1">action 1 <span>pending</span></div></div>')
			
			setTodos(prev => prev.map(t =>
				t.id === 1 ? {...t, status: 'complete'} : t
			))
			
			expect(document.body.innerHTML).toBe('<div><div id="1">action 1 <span>complete</span></div></div>')
			
			setTodos(prev => [...prev, {name: 'action 2', status: 'pending', id: 2}])
			
			expect(document.body.innerHTML).toBe('<div>' +
				'<div id="1">action 1 <span>complete</span></div>' +
				'<div id="2">action 2 <span>pending</span></div>' +
				'</div>')
		})
		
		it('when nested', () => {
			let count = 2
			const el = html`${repeat<number>(
				() => count,
				(n) => html`
					<ul>${repeat(n, d => html`
						<li>${d}</li>`)}
					</ul>`
			)}`
			
			el.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<ul><li>1</li>\n' +
				'\t\t\t\t\t</ul><ul><li>1</li><li>2</li>\n' +
				'\t\t\t\t\t</ul>')
		})
		
		it('with helper list', () => {
			let even = (list: () => number[]) => list().filter(n => n % 2 === 0)
			const el = html`${repeat<number>(
				even(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
				(n) => html`<span>${n}</span>`
			)}`
			
			el.render(document.body)
			
			expect(document.body.innerHTML).toBe(
				'<span>2</span>' +
				'<span>4</span>' +
				'<span>6</span>' +
				'<span>8</span>' +
				'<span>10</span>')
		})
	})
	
	describe('should work with "when" helper', () => {
		it('when both sides provided as static', () => {
			let [shouldRender, updateShouldRender] = state(true)
			const yes = html`<span>true</span>`
			const no = html`<span>false</span>`
			
			html`${when(shouldRender, yes, no)}`.render(document.body)
			
			expect(document.body.innerHTML).toBe('<span>true</span>')
			const n = document.body.children[0]
			
			updateShouldRender(false)
			
			expect(document.body.innerHTML).toBe('<span>false</span>')
			
			updateShouldRender(true)
			
			expect(document.body.innerHTML).toBe('<span>true</span>')
			expect(document.body.children[0]).toEqual(n) // same node should be rendered
		})
		
		it('when both sides provided as static with dynamic values', () => {
			let [x, setX] = state(10)
			const total = () => x()
			const yes = html`<span>Non Zero: ${total}</span>`
			const no = html`<span>Zero: ${total}</span>`
			
			const el = html`${when(total, yes, no)}`
			
			el.render(document.body)
			
			expect(document.body.innerHTML).toBe('<span>Non Zero: 10</span>')
			const n = document.body.children[0]
			
			setX(0)
			
			expect(document.body.innerHTML).toBe('<span>Zero: 0</span>')
			
			setX(20)
			
			expect(document.body.innerHTML).toBe('<span>Non Zero: 20</span>')
			expect(document.body.children[0]).toEqual(n) // node should be kept
		})
		
		it('when nested', () => {
			const [list, updateList] = state<number[]>([]);
			const [loading, setLoading] = state(true);
			
			const el = html`${when(
				loading,
				html`<p>loading...</p>`,
				when(() => list().length, html`<p>${() => list().length} items</p>`, html`<p>no items</p>`)
			)}`;
			
			el.render(document.body)
			
			expect(document.body.innerHTML).toBe('<p>loading...</p>')
			
			setLoading(false)
			
			expect(document.body.innerHTML).toBe('<p>no items</p>')
			
			updateList([1])
			
			expect(document.body.innerHTML).toBe('<p>1 items</p>')
		})
		
		it('when helper as condition', () => {
			const list: any[] = [];
			
			const isEmpty = (lis: () => any[]) => lis().length === 0
			
			const el = html`${when(
				isEmpty(() => list),
				html`<p>no items</p>`
			)}`;
			
			el.render(document.body)
			
			expect(document.body.innerHTML).toBe('<p>no items</p>')
		});
		
		it('when nested with dependent logic',  () => {
			const [currentPlayer, setCurrentPlayer] = state("x")
			const [ended, setEnded] = state(false)
			
			html`
				${when(ended, html`
					${when(is(currentPlayer, 'xy'),
						html`tie`,
						html`${currentPlayer} won`
					)}
					<button type="button">reset</button>
				`)}
			`.render(document.body)
			
			expect(document.body.innerHTML).toBe('')
			
			setEnded(true)
			expect(document.body.innerHTML).toBe('x won\n' +
				'\t\t\t\t\t<button type="button">reset</button>')
			
			setCurrentPlayer('xy')
			expect(document.body.innerHTML).toBe('tie\n' +
				'\t\t\t\t\t<button type="button">reset</button>')
			
			setEnded(false)
			expect(document.body.innerHTML).toBe('')
			
			setCurrentPlayer('x')
			expect(document.body.innerHTML).toBe('')
			
			setEnded(true)
			expect(document.body.innerHTML).toBe('x won\n' +
				'\t\t\t\t\t<button type="button">reset</button>')
			
			setCurrentPlayer('x')
			setEnded(false)
			expect(document.body.innerHTML).toBe('')
		})
	})
	
	it('should work with state helper',  () => {
		const [count, setCount] = state<number>(0)
		const countUp = () => {
			setCount((prev: number) => prev + 1)
		}
		
		const counter = html`<span>${count}</span><button onclick="${countUp}">+</button>`
		
		counter.render(document.body)
		
		expect(document.body.innerHTML).toBe('<span>0</span><button>+</button>')
		
		const btn = document.querySelector('button') as HTMLButtonElement
		
		btn.click()
		
		expect(document.body.innerHTML).toBe('<span>1</span><button>+</button>')
		
		counter.unmount()
		
		btn.click()
		
		expect(document.body.innerHTML).toBe('')
	})
	
	describe('should handle lifecycles', () => {
		beforeEach(() => {
			jest.useFakeTimers()
		})
		
		afterEach(() => {
			jest.useRealTimers()
		})
		
		it('onMount', () => {
		
			const mountMock = jest.fn()
			
			html`<span>sample</span>`
				.onMount(mountMock)
				.render(document.body)
			
			jest.advanceTimersByTime(100);
			
			expect(mountMock).toHaveBeenCalledTimes(1)
		});
		
		it('onUnmount', () => {
			const unmountMock = jest.fn()
			
			const temp = html`<span>sample</span>`
				.onMount(() => unmountMock)
				.render(document.body)
			
			temp.unmount();
			
			jest.advanceTimersByTime(100);
			
			expect(unmountMock).toHaveBeenCalledTimes(1)
		});
		
		it('onUnmount on removed item', () => {
			const unmountMock = jest.fn();
			const [list, updateList] = state([
				html`one`.onMount(() => unmountMock),
				html`two`.onMount(() => unmountMock),
				html`three`.onMount(() => unmountMock),
			])

			const temp = html`${list}`
				.render(document.body)

			expect(document.body.innerHTML).toBe('onetwothree')
			
			const three =  list()[2]
			updateList([list()[0]])
			
			jest.advanceTimersByTime(100);

			expect(document.body.innerHTML).toBe('one')
			
			jest.advanceTimersByTime(100);

			expect(unmountMock).toHaveBeenCalledTimes(2)
			
			updateList([three, list()[0]])
			
			jest.advanceTimersByTime(100);

			expect(document.body.innerHTML).toBe('threeone')
		});
		
		it('unmount and resume on mount', () => {
			const mountMock = jest.fn();
			const [x, setX] = state(5);
			
			const temp = html`item ${x}`
				.onMount(mountMock)
				.render(document.body);
			
			expect(document.body.innerHTML).toBe("item 5")
			
			temp.unmount();
			
			setX(10);
			
			temp.render(document.body)
			
			expect(mountMock).toHaveBeenCalledTimes(2)
			
			expect(document.body.innerHTML).toBe("item 10")
			
			setX(20);
			
			expect(mountMock).toHaveBeenCalled()
			
			expect(document.body.innerHTML).toBe("item 20")
		})
	})
	
	it('should ignore values between tag and attribute', () => {
		const disabled = 'disabled'
		
		const btn = html`
			<button ${disabled}></button>`
		
		btn.render(document.body)
		
		expect(document.body.innerHTML).toBe('<button></button>')
	})
	
	it('should parse script injected value', () => {
		const total = 12;
		const sc = html`<script>const val = ${total};</script>`;
		
		sc.render(document.body)
		
		expect(document.body.innerHTML).toBe('<script>const val = 12;</script>')
	});
	
	it('should ignore dynamically set tag name', () => {
		const tag = 'button';
		const sc = html`<${tag}>click me</${tag}>`
		
		sc.render(document.body)
		
		expect(document.body.innerHTML).toBe('&lt;button&gt;click me&lt;/button&gt;')
	});
	
	it('should render array', () => {
		const reasons = [
			"sample 1",
			"sample 2"
		].map((reason) => html`<li>${reason}</li>`);
		
		html`<ul>${reasons}</ul>`
			.render(document.body)
		
		expect(document.body.innerHTML).toBe('<ul><li>sample 1</li><li>sample 2</li></ul>')
	})
    
    it('should render DOM element', () => {
        const btn = element('button', { attributes: { type: 'button' }, textContent: 'click me' })
        html`${btn}`
            .render(document.body)
        
        expect(document.body.innerHTML).toBe('<button type="button">click me</button>')
    })
	
})
