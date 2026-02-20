import * as XLSX from 'xlsx'

export function downloadOrderExcel(rows: any[]) {
  const data = rows.map((r, idx) => ({
    No: idx + 1,
    공급사: r.provider_name ?? '',
    상품ID: r.goods_seq,
    상품명: r.goods_name,
    가용재고: r.available_stock,
    안전재고: r.safe_stock,
    부족수량: r.required_qty,
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '주문서')

  XLSX.writeFile(wb, `주문서_${new Date().toISOString().slice(0,10)}.xlsx`)
}
