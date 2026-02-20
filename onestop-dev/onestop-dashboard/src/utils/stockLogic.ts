export type StockRow = {
    goods_seq: number
    goods_name: string
    provider_seq?: number
    provider_name?: string
    available_stock: number
    safe_stock: number
    sales_qty?: number
    last_order_date?: string
  }
  
  export type StockDecision = StockRow & {
    required_qty: number
    is_low: boolean
    reason: string
  }
  
  // 관리자 로직(초안) - 나중에 여기만 바꾸면 됨
  export function decideLowStock(r: StockRow): StockDecision {
    const available = Number(r.available_stock || 0)
    const safe = Number(r.safe_stock || 0)
  
    const required = Math.max(safe - available, 0)
    const is_low = required > 0
  
    return {
      ...r,
      required_qty: required,
      is_low,
      reason: is_low ? `가용(${available}) < 안전(${safe})` : '',
    }
  }
  