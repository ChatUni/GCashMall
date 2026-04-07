import { createSignal, onMount, Show, For } from 'solid-js'
import './TodoList.css'

interface Todo {
  _id?: string
  text: string
  completed: boolean
  createdAt: Date
  updatedAt: Date
}

const TodoList = () => {
  const [todos, setTodos] = createSignal<Todo[]>([])
  const [newTodoText, setNewTodoText] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  onMount(() => {
    fetchTodos()
  })

  const getApiUrl = () => {
    return import.meta.env.VITE_LOCALHOST
    // return window.location.hostname === 'localhost'
    //   ? import.meta.env.VITE_LOCALHOST
    //   : window.location.origin
  }

  const fetchTodos = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${getApiUrl()}/.netlify/functions/api?type=todos`)
      const data = await response.json()

      if (data.success) {
        setTodos(data.data)
      } else {
        setError(data.error || 'Failed to fetch todos')
      }
    } catch (err) {
      setError('Failed to connect to server')
      console.error('Error fetching todos:', err)
    } finally {
      setLoading(false)
    }
  }

  const addTodo = async () => {
    if (!validateNewTodo()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${getApiUrl()}/.netlify/functions/api?type=todo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: newTodoText().trim(),
          completed: false,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setNewTodoText('')
        await fetchTodos() // Refresh the list
      } else {
        setError(data.error || 'Failed to add todo')
      }
    } catch (err) {
      setError('Failed to add todo')
      console.error('Error adding todo:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleTodo = async (todo: Todo) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${getApiUrl()}/.netlify/functions/api?type=todo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...todo,
          completed: !todo.completed,
        }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchTodos() // Refresh the list
      } else {
        setError(data.error || 'Failed to update todo')
      }
    } catch (err) {
      setError('Failed to update todo')
      console.error('Error updating todo:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteTodo = async (todo: Todo) => {
    if (!confirmDelete()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${getApiUrl()}/.netlify/functions/api?type=todo`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: todo._id,
        }),
      })

      const data = await response.json()

      if (data.success) {
        await fetchTodos() // Refresh the list
      } else {
        setError(data.error || 'Failed to delete todo')
      }
    } catch (err) {
      setError('Failed to delete todo')
      console.error('Error deleting todo:', err)
    } finally {
      setLoading(false)
    }
  }

  const validateNewTodo = () => {
    if (!newTodoText().trim()) {
      setError('Todo text cannot be empty')
      return false
    }
    return true
  }

  const confirmDelete = () => {
    return window.confirm('Are you sure you want to delete this todo?')
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo()
    }
  }

  return (
    <div class="todo-list">
      <h1>Todo List</h1>

      <Show when={error()}>
        <div class="error">{error()}</div>
      </Show>

      <div class="add-todo">
        <input
          type="text"
          value={newTodoText()}
          onInput={(e) => setNewTodoText(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a new todo..."
          disabled={loading()}
        />
        <button onClick={addTodo} disabled={loading() || !newTodoText().trim()}>
          {loading() ? 'Adding...' : 'Add Todo'}
        </button>
      </div>

      <Show when={loading()}>
        <div class="loading">Loading...</div>
      </Show>

      <div class="todos">
        <Show
          when={todos().length > 0}
          fallback={<p class="no-todos">No todos yet. Add one above!</p>}
        >
          <For each={todos()}>
            {(todo) => (
              <div class={`todo-item ${todo.completed ? 'completed' : ''}`}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo)}
                  disabled={loading()}
                />
                <span class="todo-text">{todo.text}</span>
                <button
                  class="delete-btn"
                  onClick={() => deleteTodo(todo)}
                  disabled={loading()}
                >
                  Delete
                </button>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}

export default TodoList
