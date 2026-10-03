// Whole-series unlock prices a creator can choose (credits). Mirrors SERIES_PRICE_OPTIONS on
// the server, which validates the choice and works out each viewer's actual price.
export const SERIES_PRICE_OPTIONS = [300, 600, 900]
export const DEFAULT_SERIES_PRICE = 600

export const seriesPriceOrDefault = (price: unknown): number =>
  SERIES_PRICE_OPTIONS.includes(Number(price)) ? Number(price) : DEFAULT_SERIES_PRICE
