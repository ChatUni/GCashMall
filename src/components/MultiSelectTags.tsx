import { For } from 'solid-js'
import './MultiSelectTags.css'

interface Tag {
  _id: string
  name: string
}

interface MultiSelectTagsProps {
  tags: Tag[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
}

const MultiSelectTags = (props: MultiSelectTagsProps) => {
  validateProps(props)

  const handleTagClick = (tagId: string) => {
    const newSelectedIds = toggleTagSelection(props.selectedIds, tagId)
    props.onChange(newSelectedIds)
  }

  return (
    <div class="multi-select-tags">
      <For each={props.tags}>
        {(tag) => (
          <TagItem
            tag={tag}
            isSelected={props.selectedIds.includes(tag._id)}
            onClick={() => handleTagClick(tag._id)}
          />
        )}
      </For>
    </div>
  )
}

interface TagItemProps {
  tag: Tag
  isSelected: boolean
  onClick: () => void
}

const TagItem = (props: TagItemProps) => {
  const className = () => buildTagClassName(props.isSelected)

  return (
    <button type="button" class={className()} onClick={props.onClick}>
      {props.tag.name}
    </button>
  )
}

const buildTagClassName = (isSelected: boolean): string => {
  const baseClass = 'multi-select-tag'
  return isSelected ? `${baseClass} selected` : baseClass
}

const toggleTagSelection = (
  selectedIds: string[],
  tagId: string,
): string[] => {
  if (selectedIds.includes(tagId)) {
    return selectedIds.filter((id) => id !== tagId)
  }
  return [...selectedIds, tagId]
}

const validateProps = (props: MultiSelectTagsProps) => {
  if (!props.tags) {
    throw new Error('tags prop is required')
  }
  if (!props.selectedIds) {
    throw new Error('selectedIds prop is required')
  }
  if (!props.onChange) {
    throw new Error('onChange prop is required')
  }
}

export default MultiSelectTags
