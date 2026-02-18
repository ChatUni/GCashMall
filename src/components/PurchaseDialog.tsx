import { t } from '../stores/languageStore'
import './PurchaseDialog.css'

interface PurchaseDialogProps {
  episodeCost: number
  onPurchase: () => void
  onCancel: () => void
  loading?: boolean
}

const PurchaseDialog = (props: PurchaseDialogProps) => {
  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onCancel()
    }
  }

  const getMessage = () => {
    const message =
      t().player?.purchaseDialog?.message ||
      'You must purchase the episode in order to continue watching. It will cost {cost} GCash.'
    return message.replace('{cost}', String(props.episodeCost))
  }

  return (
    <div class="purchase-dialog-overlay" onClick={handleOverlayClick}>
      <div class="purchase-dialog">
        <h2 class="purchase-dialog-title">
          {t().player?.purchaseDialog?.title || 'Purchase Required'}
        </h2>

        <p class="purchase-dialog-message">{getMessage()}</p>

        <p class="purchase-dialog-confirm">
          {t().player?.purchaseDialog?.confirm || 'Do you want to purchase?'}
        </p>

        <div class="purchase-dialog-buttons">
          <button
            class="purchase-dialog-btn purchase-dialog-btn-purchase"
            onClick={props.onPurchase}
            disabled={props.loading}
          >
            {props.loading
              ? '...'
              : t().player?.purchaseDialog?.purchaseButton || 'Purchase'}
          </button>
          <button
            class="purchase-dialog-btn purchase-dialog-btn-cancel"
            onClick={props.onCancel}
            disabled={props.loading}
          >
            {t().player?.purchaseDialog?.cancelButton || 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PurchaseDialog
