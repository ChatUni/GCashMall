// Genre picker — tag input with autocomplete. Selected genres show as removable chips.
// As the user types, matching genres (fetchGenres, filtered by the input text) appear
// below as clickable chips; click one to add it, or press Enter to add a custom genre.
// Capped at `max` (default 10). Controlled via `value` (string[]) + `onChange`.

import { For, Show, createSignal, onMount } from 'solid-js'
import { fetchGenres } from '../services/dataService'
import './GenrePicker.css'

const titleCase = (s: string) =>
  s.trim().replace(/\s+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const GenrePicker = (props: {
  value: string[]
  onChange: (tags: string[]) => void
  max?: number
  placeholder?: string
}) => {
  const [input, setInput] = createSignal('')
  const [allGenres, setAllGenres] = createSignal<string[]>([])
  const [suggestions, setSuggestions] = createSignal<string[]>([])
  const max = () => props.max ?? 10

  onMount(() => {
    fetchGenres()
      .then((gs) => setAllGenres(gs.map((g) => g.name)))
      .catch(() => {})
  })

  const isSelected = (name: string) => props.value.some((v) => v.toLowerCase() === name.toLowerCase())

  let debounce: ReturnType<typeof setTimeout> | undefined
  const onInput = (v: string) => {
    setInput(v)
    clearTimeout(debounce)
    debounce = setTimeout(() => {
      const q = v.trim().toLowerCase()
      if (!q) return setSuggestions([])
      setSuggestions(
        allGenres()
          .filter((n) => n.toLowerCase().includes(q) && !isSelected(n))
          .slice(0, 12),
      )
    }, 120)
  }

  const add = (value: string) => {
    const name = titleCase(value)
    if (name && props.value.length < max() && !isSelected(name)) {
      props.onChange([...props.value, name])
    }
    setInput('')
    setSuggestions([])
  }
  const remove = (tag: string) => props.onChange(props.value.filter((t) => t !== tag))

  return (
    <div class="genre-picker">
      <Show when={props.value.length > 0}>
        <div class="genre-picker-tags">
          <For each={props.value}>
            {(tag) => (
              <span class="genre-picker-tag">
                {tag}
                <button class="genre-picker-tag-x" onClick={() => remove(tag)}>
                  ✕
                </button>
              </span>
            )}
          </For>
        </div>
      </Show>
      <input
        class="genre-picker-input"
        type="text"
        placeholder={props.placeholder || 'Add a genre…'}
        value={input()}
        onInput={(e) => onInput(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (input().trim()) add(input())
          }
        }}
      />
      <Show when={suggestions().length > 0}>
        <div class="genre-picker-suggest">
          <For each={suggestions()}>
            {(name) => (
              <button
                type="button"
                class="genre-picker-suggest-chip"
                onMouseDown={(e) => {
                  e.preventDefault()
                  add(name)
                }}
              >
                {name}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

export default GenrePicker
