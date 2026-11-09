import { t } from '../stores/languageStore'
import './NewBadge.css'

// Stands in for a view count that is still too small to be worth showing.
const NewBadge = () => <span class="new-badge">{t().player.newBadge}</span>

export default NewBadge
