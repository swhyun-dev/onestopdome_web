// src/utils/excel.ts
import ExcelJS from "exceljs";

export interface PurchaseOrderExcelRow {
  provider_seq: number | null;
  provider_name: string;
  goods_seq: number;
  goods_code: string | null;
  goods_name: string;
  order_qty: number;
  supply_price: number | null;
}

export async function createPurchaseOrderExcel(
  rows: PurchaseOrderExcelRow[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("발주서");

  // 컬럼 정의
  sheet.columns = [
    { header: "공급사코드", key: "provider_seq", width: 12 },
    { header: "공급사명", key: "provider_name", width: 24 },
    { header: "상품번호", key: "goods_seq", width: 10 },
    { header: "상품코드", key: "goods_code", width: 12 },
    { header: "상품명", key: "goods_name", width: 40 },
    { header: "주문수량", key: "order_qty", width: 10 },
    { header: "매입가", key: "supply_price", width: 10 },
    { header: "금액합계", key: "line_total", width: 12 }
  ];

  // 헤더 스타일
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: "center" };

  // 데이터 정렬: 공급사/상품코드 순으로 정렬해서 넣기
  const sorted = [...rows].sort((a, b) => {
    if (a.provider_seq !== b.provider_seq) {
      return (a.provider_seq || 0) - (b.provider_seq || 0);
    }
    if ((a.goods_code || "") < (b.goods_code || "")) return -1;
    if ((a.goods_code || "") > (b.goods_code || "")) return 1;
    return a.goods_seq - b.goods_seq;
  });

  let lastProvider: number | null = null;
  let groupStartRow = 2; // 공급사별 합계용

  for (const row of sorted) {
    // 공급사 구분선(옵션)
    if (lastProvider !== null && lastProvider !== row.provider_seq) {
      const currentRowIndex = sheet.rowCount + 1;
      const subtotalRow = sheet.getRow(currentRowIndex);
      subtotalRow.getCell(1).value = "";
      subtotalRow.getCell(2).value = `${lastProvider} 공급사 소계`;
      subtotalRow.getCell(8).value = {
        formula: `SUM(H${groupStartRow}:H${currentRowIndex - 1})`
      };
      subtotalRow.font = { bold: true };
      subtotalRow.getCell(8).numFmt = "#,##0";

      // 다음 그룹 시작 위치
      groupStartRow = currentRowIndex + 1;
    }

    const excelRow = sheet.addRow({
      provider_seq: row.provider_seq ?? "",
      provider_name: row.provider_name,
      goods_seq: row.goods_seq,
      goods_code: row.goods_code ?? "",
      goods_name: row.goods_name,
      order_qty: row.order_qty,
      supply_price: row.supply_price ?? null,
      line_total:
        row.supply_price != null
          ? row.supply_price * row.order_qty
          : null
    });

    // 숫자 형식
    excelRow.getCell("F").numFmt = "#,##0"; // 수량
    excelRow.getCell("G").numFmt = "#,##0"; // 매입가
    excelRow.getCell("H").numFmt = "#,##0"; // 합계

    lastProvider = row.provider_seq;
  }

  // 마지막 공급사 소계
  if (sorted.length > 0) {
    const currentRowIndex = sheet.rowCount + 1;
    const subtotalRow = sheet.getRow(currentRowIndex);
    subtotalRow.getCell(2).value = `${lastProvider} 공급사 소계`;
    subtotalRow.getCell(8).value = {
      formula: `SUM(H${groupStartRow}:H${currentRowIndex - 1})`
    };
    subtotalRow.font = { bold: true };
    subtotalRow.getCell(8).numFmt = "#,##0";
  }

  // 전체 합계 행
  if (sorted.length > 0) {
    const totalRowIndex = sheet.rowCount + 2;
    const totalRow = sheet.getRow(totalRowIndex);
    totalRow.getCell(2).value = "전체 합계";
    totalRow.getCell(8).value = {
      formula: `SUM(H2:H${sheet.rowCount})`
    };
    totalRow.font = { bold: true };
    totalRow.getCell(8).numFmt = "#,##0";
  }

  // 테두리(간단하게 전체 범위)
  const maxCol = sheet.columnCount;
  const maxRow = sheet.rowCount;
  for (let r = 1; r <= maxRow; r++) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= maxCol; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    }
  }

  // 버퍼로 반환
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
