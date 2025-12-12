import { useState, useEffect } from 'react'
import './TodoList.css'

interface Todo {
  _id?: string
  text: string
  completed: boolean
  createdAt: Date
  updatedAt: Date
}

const TodoList = () => {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodoText, setNewTodoText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTodos()
  }, [])

  const getApiUrl = () => {
    return window.location.hostname === 'localhost' 
      ? 'http://localhost:8888' 
      : window.location.origin
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
          text: newTodoText.trim(),
          completed: false
        })
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
          completed: !todo.completed
        })
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
          id: todo._id
        })
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
    if (!newTodoText.trim()) {
      setError('Todo text cannot be empty')
      return false
    }
    return true
  }

  const confirmDelete = () => {
    return window.confirm('Are you sure you want to delete this todo?')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo()
    }
  }

  return (
    <div className="todo-list">
      <h1>Todo List</h1>
      
      {error && <div className="error">{error}</div>}
      
      <div className="add-todo">
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter a new todo..."
          disabled={loading}
        />
        <button onClick={addTodo} disabled={loading || !newTodoText.trim()}>
          {loading ? 'Adding...' : 'Add Todo'}
        </button>
      </div>
      
      {loading && <div className="loading">Loading...</div>}
      
      <div className="todos">
        {todos.length === 0 ? (
          <p className="no-todos">No todos yet. Add one above!</p>
        ) : (
          todos.map((todo) => (
            <div key={todo._id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo)}
                disabled={loading}
              />
              <span className="todo-text">{todo.text}</span>
              <button 
                className="delete-btn"
                onClick={() => deleteTodo(todo)}
                disabled={loading}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default TodoList