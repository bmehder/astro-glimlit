import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import javascript from 'shiki/langs/javascript.mjs'
import gleam from 'shiki/langs/gleam.mjs'
import githubDark from 'shiki/themes/github-dark.mjs'

const highlighter = createHighlighterCoreSync({
  langs: [javascript, gleam],
  themes: [githubDark],
  engine: createJavaScriptRegexEngine(),
})

/** @param {string} code @param {'javascript' | 'gleam'} language */
export function highlight(code, language) {
  return highlighter.codeToHtml(code, { lang: language, theme: 'github-dark' })
}
