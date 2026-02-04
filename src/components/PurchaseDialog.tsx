import React from 'react'
import { useLanguage } from '../context/LanguageContext'
import './PurchaseDialog.css'

interface PurchaseDialogProps {
  episodeCost: number
  onPurchase: () => void
  onCancel: () => void
  loading?: boolean
}

const PurchaseDialog: React.FC<PurchaseDialogProps> = ({
  episodeCost,
  onPurchase,
  onCancel,
  loading = false,
}) => {
  const { t } = useLanguage()

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  const getMessage = () => {
    const message =
      t.player?.purchaseDialog?.message ||
      'You must purchase the episode in order to continue watching. It will cost {cost} GCash.'
    return message.replace('{cost}', String(episodeCost))
  }

  return (
    <div className="purchase-dialog-overlay" onClick={handleOverlayClick}>
      <div className="purchase-dialog">
        <h2 className="purchase-dialog-title">
          {t.player?.purchaseDialog?.title || 'Purchase Required'}
        </h2>

        <p className="purchase-dialog-message">{getMessage()}</p>

        <p className="purchase-dialog-confirm">
          {t.player?.purchaseDialog?.confirm || 'Do you want to purchase?'}
        </p>

        <div className="purchase-dialog-buttons">
          <button
            className="purchase-dialog-btn purchase-dialog-btn-purchase"
            onClick={onPurchase}
            disabled={loading}
          >
            {loading
              ? '...'
              : t.player?.purchaseDialog?.purchaseButton || 'Purchase'}
          </button>
          <button
            className="purchase-dialog-btn purchase-dialog-btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {t.player?.purchaseDialog?.cancelButton || 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PurchaseDialog
