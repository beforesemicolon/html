import { html } from '../../src'
import { DocPageLayout } from '../partials/doc-page-layout'
import { CodeSnippet } from '../partials/code-snippet'
import { Heading } from '../partials/heading'
import { DocPrevNextNav } from '../partials/doc-prev-next-nav'
import { PageComponentProps } from '../type'

export default ({ page, nextPage, prevPage, docsMenu }: PageComponentProps) =>
    DocPageLayout(
        page.title,
        page.path,
        docsMenu,
        html`
            ${Heading(page.name)}
            <p>
                The templating system is a plug-and-play package which means you
                can either use the CDN or npm to install it. There is no need to
                any additional setup or requirements.
            </p>
            ${Heading('Via CDN', 'h3')}
            <p>
                This method is the quickest loading option and can be placed in
                the
                <code>head</code> tag of the document.
            </p>
            ${CodeSnippet(
                '<script src="https://unpkg.com/@beforesemicolon/markup/dist/client.js" />',
                'html'
            )}
            <p>You may also specify a specific version you want.</p>
            ${CodeSnippet(
                ' <script src="https://unpkg.com/@beforesemicolon/markup@1.0.0/dist/client.js"/>',
                'html'
            )}
            <p>
                You can use various CDN providers like
                <a
                    href="https://unpkg.com/@beforesemicolon/markup/dist/client.js"
                    >unpkg</a
                >,
                <a
                    href="https://cdn.jsdelivr.net/npm/@beforesemicolon/markup/dist/client.js"
                    >jsDelivr</a
                >, and more.
            </p>
            ${Heading('Accessing content', 'h4')}
            <p>
                The client CDN link will create a global variable you can access
                for all the internal functions.
            </p>
            ${CodeSnippet('const {html} = BFS.MARKUP;', 'javascript')}
            ${Heading('Via npm', 'h3')}
            <p>
                This package is also available via <code>npm</code> which will
                allow you to use it in server JavaScript environments
            </p>
            ${CodeSnippet('npm install @beforesemicolon/markup', 'vim')}
            ${Heading('Accessing content', 'h4')}
            ${CodeSnippet(
                'import {html} from "@beforesemicolon/markup";',
                'javascript'
            )}
            ${Heading('Via yarn', 'h3')}
            ${CodeSnippet('yarn add @beforesemicolon/markup', 'vim')}
            ${Heading('Typescript', 'h3')}
            <p>
                This package was built using typescript. There is no need to
                install a separate type package for it. All types are exported
                with it.
            </p>
            ${DocPrevNextNav({
                prev: prevPage,
                next: nextPage,
            })}
        `
    )
