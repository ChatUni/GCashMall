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

const MultiSelectTags = ({
  tags,
  selectedIds,
  onChange,
}: MultiSelectTagsProps) => {
  validateProps({ tags, selectedIds, onChange })

  const handleTagClick = (tagId: string) => {
    const newSelectedIds = toggleTagSelection(selectedIds, tagId)
    onChange(newSelectedIds)
  }

  return (
    <div className="multi-select-tags">
      {tags.map((tag) => (
        <TagItem
          key={tag._id}
          tag={tag}
          isSelected={selectedIds.includes(tag._id)}
          onClick={() => handleTagClick(tag._id)}
        />
      ))}
    </div>
  )
}

interface TagItemProps {
  tag: Tag
  isSelected: boolean
  onClick: () => void
}

const TagItem = ({ tag, isSelected, onClick }: TagItemProps) => {
  const className = buildTagClassName(isSelected)

  return (
    <button type="button" className={className} onClick={onClick}>
      {tag.name}
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

const validateProps = ({
  tags,
  selectedIds,
  onChange,
}: MultiSelectTagsProps) => {
  if (!tags) {
    throw new Error('tags prop is required')
  }
  if (!selectedIds) {
    throw new Error('selectedIds prop is required')
  }
  if (!onChange) {
    throw new Error('onChange prop is required')
  }
}

export default MultiSelectTags